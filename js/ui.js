window.Tank = window.Tank || {};

// Palette, drag and drop, controls, fact cards and the results panel.
(function (T) {
  'use strict';

  const UI = T.UI = {};
  const STORE_KEY = 'build-a-fish-tank:revealed';
  const DEG = '°C';
  const TYPE_NAMES = { coral: 'Coral', anemone: 'Anemone (an animal)', plant: 'Plant', hardscape: 'Hardscape' };
  let handlers = {};
  let els = {};
  let locked = false;
  let drag = null;
  let factFor = null;
  let postResults = false;
  let waterSeg = null;
  let tempSeg = null;
  const segs = [];
  const revealed = loadRevealed();

  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const dataFor = (kind, id) => (kind === 'fish' ? T.speciesById[id] : T.decorById[id]);

  function loadRevealed() {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      return (raw && JSON.parse(raw)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveRevealed() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(revealed)); } catch (e) { /* storage unavailable */ }
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  UI.init = function (h) {
    handlers = h || {};
    els = {
      tank: $('tank'), drawer: $('drawer'), palette: $('palette'), fx: $('fxLayer'),
      complete: $('completeBtn'), waterSeg: $('waterSeg'), tempSeg: $('tempSeg'), tempReadout: $('tempReadout'),
      results: $('results'), resultsScroll: $('resultsScroll'), summary: $('resultsSummary'),
      issues: $('resultsIssues'), meet: $('resultsMeet'), tryAgain: $('tryAgainBtn'), startOver: $('startOverBtn'),
      factPop: $('factPop'), resultsTab: $('resultsTab'), topTryAgain: $('topTryAgainBtn')
    };
    els.resultsTab.addEventListener('click', () => setCollapsed(!els.results.classList.contains('is-collapsed')));
    buildPalette();
    setupTabs();
    waterSeg = setupSeg(els.waterSeg, T.state.water, (v) => handlers.onSettings && handlers.onSettings({ water: v }));
    tempSeg = setupSeg(els.tempSeg, T.state.temp, (v) => {
      setTempReadout(v);
      if (handlers.onSettings) handlers.onSettings({ temp: v });
    });
    segs.push(waterSeg, tempSeg);
    setTempReadout(T.state.temp);

    els.complete.addEventListener('click', () => handlers.onComplete && handlers.onComplete());
    els.tryAgain.addEventListener('click', () => handlers.onTryAgain && handlers.onTryAgain());
    els.topTryAgain.addEventListener('click', () => handlers.onTryAgain && handlers.onTryAgain());
    els.startOver.addEventListener('click', () => handlers.onStartOver && handlers.onStartOver());
    els.tank.addEventListener('pointerdown', onTankDown);

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') UI.closeFact(); });
    document.addEventListener('pointerdown', (e) => {
      if (!els.factPop.classList.contains('is-open')) return;
      if (els.factPop.contains(e.target)) return;
      if (e.target.closest && (e.target.closest('.pal-item') || e.target.closest('[data-uid]'))) return;
      UI.closeFact();
    }, true);

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(UI.resize);
    UI.setFishCount(0);
  };

  // ---- Controls -------------------------------------------------------------

  function setTempReadout(v) {
    els.tempReadout.textContent = T.TEMPS[v] + DEG;
  }

  function setupSeg(root, value, onChange) {
    const thumb = el('span', 'seg-thumb');
    root.appendChild(thumb);
    const buttons = Array.prototype.slice.call(root.querySelectorAll('button'));
    let current = value;
    function measure() {
      buttons.forEach((b) => {
        if (b.dataset.value !== current) return;
        thumb.style.width = b.offsetWidth + 'px';
        thumb.style.transform = 'translateX(' + b.offsetLeft + 'px)';
      });
    }
    function select(v, silent) {
      current = v;
      buttons.forEach((b) => {
        const on = b.dataset.value === v;
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.classList.toggle('is-on', on);
      });
      measure();
      if (!silent) onChange(v);
    }
    buttons.forEach((b) => {
      b.addEventListener('click', () => {
        if (locked || b.dataset.value === current) return;
        select(b.dataset.value);
      });
    });
    select(value, true);
    return { buttons: buttons, measure: measure, select: select };
  }

  // Sets the toggles without firing change handlers (used by "Start over").
  UI.setSettings = function (water, temp) {
    waterSeg.select(water, true);
    tempSeg.select(temp, true);
    setTempReadout(temp);
  };

  function setupTabs() {
    const tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
    tabs.forEach((t) => {
      t.addEventListener('click', () => {
        tabs.forEach((o) => o.setAttribute('aria-selected', o === t ? 'true' : 'false'));
        els.palette.querySelectorAll('.pal-list').forEach((list) => { list.hidden = list.dataset.kind !== t.dataset.tab; });
        UI.closeFact();
      });
    });
  }

  UI.resize = function () {
    segs.forEach((s) => s.measure());
  };

  UI.lock = function (on) {
    locked = on;
    document.body.classList.toggle('is-locked', on);
    segs.forEach((s) => s.buttons.forEach((b) => { b.disabled = on; }));
    UI.setFishCount(T.Swim.fishCount());
  };

  UI.setFishCount = function (n) {
    els.complete.disabled = locked || n === 0;
  };

  UI.showDrawer = function (show) {
    els.drawer.classList.toggle('is-hidden', !show);
  };

  // ---- Palette & drag and drop ------------------------------------------------

  function buildPalette() {
    ['fish', 'decor'].forEach((kind) => {
      const list = el('div', 'pal-list');
      list.dataset.kind = kind;
      list.hidden = kind !== 'fish';
      (kind === 'fish' ? T.SPECIES : T.DECOR).forEach((d) => {
        const b = el('button', 'pal-item');
        b.type = 'button';
        b.dataset.kind = kind;
        b.dataset.id = d.id;
        b.innerHTML = '<span class="pal-art">' + T.Art.render(kind, d.id).svg + '</span>';
        b.appendChild(el('span', 'pal-name', d.name));
        b.addEventListener('pointerdown', onPalDown);
        // Keyboard activation drops the item into the middle of the tank.
        b.addEventListener('click', (e) => {
          if (e.detail !== 0 || locked) return;
          const L = T.layout;
          const x = L.W * (0.25 + Math.random() * 0.5);
          const y = L.surfaceY + (L.floorTopY - L.surfaceY) * (0.3 + Math.random() * 0.4);
          place(kind, d.id, x, y);
        });
        list.appendChild(b);
      });
      els.palette.appendChild(list);
    });
  }

  function inTank(x, y) {
    // After results, fish can be moved but never dragged out of the tank.
    if (postResults) return true;
    const r = els.drawer.getBoundingClientRect();
    return x >= 0 && y >= 0 && x <= window.innerWidth && y <= window.innerHeight && y < r.top - 4;
  }

  function place(kind, id, x, y) {
    if (kind === 'fish') T.Swim.addFish(id, x, y);
    else T.Swim.addDecor(id, x, y);
    UI.ripple(x, y);
    changed();
  }

  function changed() {
    UI.setFishCount(T.Swim.fishCount());
    if (handlers.onTankChange) handlers.onTankChange();
  }

  function onPalDown(ev) {
    if (locked || drag || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    const item = ev.currentTarget;
    beginPointer(ev, { type: 'new', kind: item.dataset.kind, id: item.dataset.id, src: item });
  }

  function onTankDown(ev) {
    if ((locked && !postResults) || drag || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    const hit = ev.target.closest ? ev.target.closest('[data-uid]') : null;
    if (!hit) {
      // Empty water: a tap here sprinkles food.
      beginPointer(ev, { type: 'feed' });
      return;
    }
    const ent = T.Swim.get(hit.dataset.uid);
    const c = ent && T.Swim.center(ent.uid);
    if (!c) return;
    // While results show, only fish still in the tank (alive or dead) can be moved.
    if (postResults && (ent.kind !== 'fish' || ent.mode === 'gone')) return;
    ev.preventDefault();
    beginPointer(ev, { type: 'move', uid: ent.uid, kind: ent.kind, id: ent.id, offX: c.x - ev.clientX, offY: c.y - ev.clientY });
  }

  function beginPointer(ev, d) {
    d.pointerId = ev.pointerId;
    d.pointerType = ev.pointerType;
    d.sx = ev.clientX;
    d.sy = ev.clientY;
    d.t0 = performance.now();
    d.active = false;
    drag = d;
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  }

  function endPointer() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    document.body.classList.remove('is-dragging');
    drag = null;
  }

  function activate() {
    drag.active = true;
    document.body.classList.add('is-dragging');
    UI.closeFact();
    if (drag.type === 'new') {
      const d = dataFor(drag.kind, drag.id);
      const art = T.Art.render(drag.kind, drag.id);
      const w = d.display * T.layout.scale;
      const h = (w * art.h) / art.w;
      const g = el('div', 'ghost');
      g.style.width = w + 'px';
      g.style.height = h + 'px';
      g.innerHTML = art.svg;
      document.body.appendChild(g);
      drag.ghost = g;
      drag.w = w;
      drag.h = h;
      drag.src.classList.add('is-source');
    } else {
      T.Swim.beginDrag(drag.uid);
    }
  }

  function moveTo(x, y) {
    const inside = inTank(x, y);
    if (drag.type === 'new') {
      drag.ghost.style.transform = 'translate3d(' + (x - drag.w / 2).toFixed(1) + 'px,' + (y - drag.h / 2).toFixed(1) + 'px,0)';
      drag.ghost.classList.toggle('will-remove', !inside);
    } else {
      T.Swim.dragTo(drag.uid, x + drag.offX, y + drag.offY);
      T.Swim.setRemoveHint(drag.uid, !inside && !postResults);
    }
  }

  function onMove(ev) {
    if (!drag || ev.pointerId !== drag.pointerId) return;
    const x = ev.clientX;
    const y = ev.clientY;
    if (!drag.active) {
      const dx = x - drag.sx;
      const dy = y - drag.sy;
      if (dx * dx + dy * dy < 36) return;
      if (drag.type === 'feed') {
        endPointer();
        return;
      }
      if (drag.type === 'new' && drag.pointerType !== 'mouse' && Math.abs(dx) > Math.abs(dy) * 1.3) {
        endPointer();
        return;
      }
      activate();
    }
    ev.preventDefault();
    moveTo(x, y);
  }

  function onUp(ev) {
    if (!drag || ev.pointerId !== drag.pointerId) return;
    const d = drag;
    const x = ev.clientX;
    const y = ev.clientY;
    endPointer();
    if (!d.active) {
      if (d.type === 'feed') {
        T.Swim.feed(x);
        return;
      }
      if (d.type === 'move' && d.kind === 'fish') {
        // A quick tap (under ~250ms, barely moved) makes the fish talk.
        if (performance.now() - d.t0 <= 250) T.Swim.speak(d.uid);
        return;
      }
      if (revealed[d.kind + ':' + d.id]) {
        if (factFor === d.kind + ':' + d.id) UI.closeFact();
        else {
          const rect = d.type === 'new' ? d.src.getBoundingClientRect() : { left: x - 1, top: y - 30, width: 2, height: 2 };
          showFact(d.kind, d.id, rect);
        }
      }
      return;
    }
    const inside = inTank(x, y);
    if (d.type === 'new') {
      d.src.classList.remove('is-source');
      d.ghost.remove();
      if (inside) place(d.kind, d.id, x, y);
    } else {
      if (inside) {
        T.Swim.endDrag(d.uid);
        UI.ripple(x, y);
      } else {
        T.Swim.remove(d.uid, true);
      }
      changed();
    }
  }

  function onCancel(ev) {
    if (!drag || ev.pointerId !== drag.pointerId) return;
    const d = drag;
    endPointer();
    if (!d.active) return;
    if (d.type === 'new') {
      d.src.classList.remove('is-source');
      d.ghost.remove();
    } else {
      T.Swim.endDrag(d.uid);
    }
  }

  UI.ripple = function (x, y) {
    [0, 140].forEach((delay) => {
      const r = el('span', 'ripple');
      r.style.left = x + 'px';
      r.style.top = y + 'px';
      r.style.animationDelay = delay + 'ms';
      r.addEventListener('animationend', () => r.remove());
      els.fx.appendChild(r);
    });
  };

  // ---- Fact cards -------------------------------------------------------------

  function row(dl, term, value) {
    const wrap = el('div', 'fact-row');
    wrap.appendChild(el('dt', null, term));
    wrap.appendChild(el('dd', null, value));
    dl.appendChild(wrap);
  }

  function buildFact(kind, id) {
    const d = dataFor(kind, id);
    const card = el('article', 'fact');
    const art = el('div', 'fact-art');
    art.innerHTML = T.Art.render(kind, id).svg;
    card.appendChild(art);
    const head = el('div', 'fact-head');
    head.appendChild(el('h3', 'fact-name', d.name));
    if (d.latin) head.appendChild(el('p', 'fact-latin', d.latin));
    card.appendChild(head);
    const dl = el('dl', 'fact-list');
    row(dl, 'Water', d.water === 'salt' ? 'Salt' : 'Fresh');
    row(dl, 'Temperature', d.temp ? d.temp[0] + '–' + d.temp[1] + DEG : 'Any');
    if (kind === 'fish') {
      row(dl, 'Adult size', d.size + ' cm');
      row(dl, 'Temperament', d.temperament);
      row(dl, 'Group needs', d.groupNeeds);
      row(dl, 'Diet', d.diet);
    } else {
      row(dl, 'Type', TYPE_NAMES[d.type]);
    }
    card.appendChild(dl);
    card.appendChild(el('p', 'fact-fun', d.fact));
    return card;
  }

  function showFact(kind, id, rect) {
    const pop = els.factPop;
    pop.innerHTML = '';
    const close = el('button', 'factpop-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', UI.closeFact);
    pop.appendChild(close);
    pop.appendChild(buildFact(kind, id));
    pop.classList.add('is-open');
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    const left = clamp(rect.left + rect.width / 2 - pw / 2, 12, window.innerWidth - pw - 12);
    const top = Math.max(12, rect.top - ph - 14);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    factFor = kind + ':' + id;
  }

  UI.closeFact = function () {
    if (!els.factPop) return;
    els.factPop.classList.remove('is-open');
    factFor = null;
  };

  // ---- Results ----------------------------------------------------------------

  function card(kind, headline, body) {
    const c = el('article', 'card card--' + kind);
    c.appendChild(el('h3', 'card-headline', headline));
    c.appendChild(el('p', 'card-body', body));
    return c;
  }

  function setCollapsed(on) {
    els.results.classList.toggle('is-collapsed', on);
    els.resultsTab.setAttribute('aria-expanded', on ? 'false' : 'true');
    els.resultsTab.setAttribute('aria-label', on ? 'Show results' : 'Hide results');
    // While collapsed, "Try again" takes the place of "Complete tank" in the top bar.
    els.complete.hidden = on;
    els.topTryAgain.hidden = !on;
  }

  UI.showResults = function (result, items) {
    setCollapsed(false);
    postResults = true;
    document.body.classList.add('has-results');
    els.summary.textContent = result.summary.text;
    els.issues.innerHTML = '';
    if (result.celebration) els.issues.appendChild(card('good card--hero', result.celebration.headline, result.celebration.body));
    result.issues.forEach((i) => els.issues.appendChild(card(i.severity, i.headline, i.body)));
    result.positives.forEach((p) => els.issues.appendChild(card('good', p.headline, p.body)));

    els.meet.innerHTML = '';
    const seen = {};
    const fishIds = [];
    const decorIds = [];
    items.forEach((it) => {
      const k = it.kind + ':' + it.id;
      if (seen[k]) return;
      seen[k] = true;
      revealed[k] = true;
      (it.kind === 'fish' ? fishIds : decorIds).push(it.id);
    });
    saveRevealed();
    if (fishIds.length) {
      els.meet.appendChild(el('h2', 'results-title', 'Meet your fish'));
      fishIds.forEach((id) => els.meet.appendChild(buildFact('fish', id)));
    }
    if (decorIds.length) {
      els.meet.appendChild(el('h2', 'results-title', 'Your decor'));
      decorIds.forEach((id) => els.meet.appendChild(buildFact('decor', id)));
    }
    els.resultsScroll.scrollTop = 0;
    els.results.classList.add('is-open', 'is-entering');
    setTimeout(() => els.results.classList.remove('is-entering'), 750);
    setTimeout(() => {
      try { els.summary.focus({ preventScroll: true }); } catch (e) { els.summary.focus(); }
    }, 80);
  };

  UI.hideResults = function () {
    els.results.classList.remove('is-open');
    setCollapsed(false);
    postResults = false;
    document.body.classList.remove('has-results');
  };
})(window.Tank);
