window.Tank = window.Tank || {};

// Placed items, layout and the swimming animation loop.
(function (T) {
  'use strict';

  const Swim = T.Swim = {};
  const L = T.layout = T.layout || {};
  let fishLayer = null;
  let decorLayer = null;
  let badgeLayer = null;
  let foodLayer = null;
  const fish = [];
  const decor = [];
  const flakes = [];
  const looseBadges = [];
  const MAX_FLAKES = 60;
  const FLAKE_COLOURS = ['#e2563b', '#f2a33a', '#c9b458', '#7fa34a', '#b5532f', '#e8c76a'];
  const BUBBLE_TIME = 3;
  // Status badge per outcome reason (see Rules: outcome.badge).
  const EMOJI = {
    dead: '💀',
    cold: '🥶',
    hot: '🥵',
    territorial: '😠',
    lonely: '😢',
    finNipped: '🩹',
    overstock: '😵‍💫',
    stressed: '😰',
    happy: '💚',
    ok: '🙂'
  };
  const BADGE_SIZE = 34;
  let seq = 0;
  let order = 0;
  let schools = {};
  let timers = [];
  let last = 0;
  let time = 0;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rand = (a, b) => a + Math.random() * (b - a);
  const has = (sp, b) => sp.swim.indexOf(b) !== -1;

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  // ---- Status badges ------------------------------------------------------

  function makeBadge(key, x, y) {
    const b = document.createElement('div');
    b.className = 'badge';
    const s = document.createElement('span');
    s.textContent = EMOJI[key] || EMOJI.stressed;
    s.style.animationDelay = '0s, ' + (0.45 + Math.random() * 0.8).toFixed(2) + 's';
    b.appendChild(s);
    moveBadge(b, x, y);
    badgeLayer.appendChild(b);
    return b;
  }

  function moveBadge(b, x, y) {
    b.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + Math.max(BADGE_SIZE / 2 + 4, y).toFixed(1) + 'px,0)';
  }

  // Badges on fish follow them every frame; replacing a fish's badge swaps the emoji.
  function setFishBadge(e, key) {
    if (e.badge) {
      if (e.badgeKey === key) return;
      e.badge.remove();
    }
    e.badge = makeBadge(key, e.x, fishBadgeY(e));
    e.badgeKey = key;
  }

  function fadeFishBadge(e) {
    const b = e.badge;
    if (!b) return;
    b.classList.add('is-fading');
    later(() => {
      b.remove();
      if (e.badge === b) { e.badge = null; e.badgeKey = null; }
    }, 650);
  }

  function clearBadges() {
    fish.concat(decor).forEach((e) => {
      if (e.badge) e.badge.remove();
      e.badge = null;
      e.badgeKey = null;
    });
    looseBadges.forEach((b) => b.remove());
    looseBadges.length = 0;
  }

  const fishBadgeY = (e) => e.y - e.h * 0.5 - BADGE_SIZE * 0.55;
  const decorBadgeY = (d) => L.decorBaseY - d.h - BADGE_SIZE * 0.45;

  // Height of the heading and top controls, so floating fish settle below them.
  function measureTopBar() {
    const bar = document.querySelector('.topbar');
    let bottom = 0;
    if (bar) {
      Array.prototype.forEach.call(bar.children, (c) => {
        if (c.offsetParent === null) return;
        bottom = Math.max(bottom, c.getBoundingClientRect().bottom);
      });
    }
    L.topBarBottom = bottom;
  }
  Swim.measureTopBar = measureTopBar;

  T.computeLayout = function () {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const compact = W < 760 || H < 640;
    const drawerH = compact ? 128 : 144;
    const band = Math.max(48, (H - drawerH) * 0.14);
    L.W = W;
    L.H = H;
    L.drawerH = drawerH;
    L.floorTopY = H - drawerH - band;
    L.decorBaseY = L.floorTopY + band * 0.62;
    L.surfaceY = Math.max(30, H * 0.045);
    L.floorFrac = (H - L.floorTopY) / H;
    L.surfaceFrac = 1 - (L.surfaceY * 0.45) / H;
    L.scale = clamp(Math.min(H / 900, W / 1280), 0.6, 1.3);
    document.documentElement.style.setProperty('--drawer-h', drawerH + 'px');
    measureTopBar();
  };

  function get(uid) {
    for (let i = 0; i < fish.length; i++) if (fish[i].uid === uid) return fish[i];
    for (let i = 0; i < decor.length; i++) if (decor[i].uid === uid) return decor[i];
    return null;
  }
  Swim.get = get;

  // ---- Fish ---------------------------------------------------------------

  function sizeFish(e) {
    e.w = e.sp.display * L.scale;
    e.h = (e.w * e.art.h) / e.art.w;
    e.el.style.width = e.w.toFixed(1) + 'px';
    e.el.style.height = e.h.toFixed(1) + 'px';
  }

  function bounds(e) {
    const hw = e.w * 0.5;
    const hh = e.h * 0.5;
    const minY = L.surfaceY + hh * 0.8;
    const maxY = has(e.sp, 'bottom')
      ? L.floorTopY + (L.decorBaseY - L.floorTopY) * 0.5 - hh * 0.75
      : L.floorTopY - hh * 0.35;
    return { minX: hw + 6, maxX: Math.max(hw + 6, L.W - hw - 6), minY: minY, maxY: Math.max(minY, maxY) };
  }

  function nearestAnemone(e) {
    let best = null;
    let bd = Infinity;
    decor.forEach((d) => {
      if (d.id !== 'anemone' || d.dead) return;
      const dist = Math.abs(d.x - e.homeX);
      if (dist < bd) { bd = dist; best = d; }
    });
    if (!best) return null;
    return { x: best.x, y: L.decorBaseY - best.h * 0.6, w: best.w };
  }

  // Roams widely, loosely favouring the drop point; now and then heads anywhere in the tank.
  // Stressed fish pick new targets much more often, at any height, which reads as erratic.
  function pickTarget(e) {
    const b = bounds(e);
    const sp = e.sp;
    const s = L.scale;
    const spanX = b.maxX - b.minX;
    const spanY = b.maxY - b.minY;
    let hx = e.homeX;
    let hy = e.homeY;
    let R = Math.max((160 + sp.display * 1.2) * s, spanX * 0.3);
    let Ry = Math.max(R * 0.5, spanY * 0.35);
    let anywhere = Math.random() < (e.stressed ? 0.45 : 0.22);
    if (sp.id === 'clownfish') {
      const an = nearestAnemone(e);
      if (an) {
        hx = an.x; hy = an.y;
        R = Math.max(40 * s, an.w * 0.35); Ry = R * 0.5;
        anywhere = e.stressed && Math.random() < 0.3;
      }
    }
    let tx;
    let ty;
    if (anywhere) {
      tx = rand(b.minX, b.maxX);
      ty = rand(b.minY, b.maxY);
    } else {
      e.side = -e.side;
      tx = hx + e.side * R * rand(0.35, 1);
      ty = hy + rand(-1, 1) * Ry + e.depthBias * spanY * 0.12;
      if (tx < b.minX || tx > b.maxX) { e.side = -e.side; tx = hx + e.side * R * rand(0.35, 1); }
    }
    if (has(sp, 'bottom')) ty = b.maxY - rand(0, 4 * s);
    e.tx = clamp(tx, b.minX, b.maxX);
    e.ty = clamp(ty, b.minY, b.maxY);
    e.timer = e.stressed ? rand(0.25, 0.8) : has(sp, 'hover') ? rand(6, 11) : rand(3, 7);
  }

  Swim.addFish = function (id, x, y) {
    const sp = T.speciesById[id];
    if (!sp) return null;
    const art = T.Art.render('fish', id);
    const el = document.createElement('div');
    const uid = 'f' + (++seq);
    el.className = 'fish';
    el.dataset.uid = uid;
    el.innerHTML = '<div class="fish-body">' + art.svg + '</div>';
    const facing = Math.random() < 0.5 ? 1 : -1;
    const e = {
      uid: uid, kind: 'fish', id: id, sp: sp, el: el, art: art, order: ++order,
      x: x, y: y, homeX: x, homeY: y, vx: 0, vy: 0, tx: x, ty: y,
      facing: facing, face: facing, side: facing, tilt: 0,
      timer: 0, tailPhase: rand(0, 6.28), bob: rand(0, 6.28), finPhase: rand(0, 6.28),
      speedMul: rand(0.85, 1.15), burst: 0, hang: 0, snuffle: 0, freeze: 0, depthBias: rand(-1, 1),
      offX: 0, offY: 0, offTimer: 0,
      food: null, foodT: 0, foodScan: rand(0, 0.3), nibble: 0,
      bubble: null, bubbleT: 0, bubbleW: 0, lastLine: null, outcomeKey: null,
      mode: 'swim', stressed: false, roll: 1, puff: 0, wagAmp: 1, dragging: false,
      huntQueue: null, huntT: 0, huntSpeed: 0, pause: 0
    };
    e.tail = el.querySelector('.tail');
    e.fins = el.querySelectorAll('.fin');
    sizeFish(e);
    const b = bounds(e);
    e.x = e.homeX = clamp(x, b.minX, b.maxX);
    e.y = e.homeY = clamp(y, b.minY, b.maxY);
    if (has(sp, 'bottom')) e.homeY = b.maxY;
    pickTarget(e);
    fishLayer.appendChild(el);
    fish.push(e);
    render(e, 0);
    return uid;
  };

  function updateSchools(dt) {
    const groups = {};
    fish.forEach((e) => {
      if (e.mode === 'swim' && !e.stressed && !e.dragging && has(e.sp, 'school')) (groups[e.id] = groups[e.id] || []).push(e);
    });
    Object.keys(schools).forEach((id) => { if (!groups[id]) delete schools[id]; });
    Object.keys(groups).forEach((id) => {
      const list = groups[id];
      const g = schools[id] || (schools[id] = { tx: list[0].x, ty: list[0].y, timer: 0, side: 1, n: 0 });
      g.n = list.length;
      if (list.length < 2) return;
      let mx = 0, my = 0, cx = 0, cy = 0;
      list.forEach((e) => { mx += e.homeX; my += e.homeY; cx += e.x; cy += e.y; });
      mx /= list.length; my /= list.length; cx /= list.length; cy /= list.length;
      g.timer -= dt;
      const s = L.scale;
      if (g.timer <= 0 || Math.hypot(cx - g.tx, cy - g.ty) < 30 * s) {
        const b = bounds(list[0]);
        const spanX = b.maxX - b.minX;
        const spanY = b.maxY - b.minY;
        const R = Math.max((160 + 12 * list.length) * s, spanX * 0.28);
        g.side = -g.side;
        if (Math.random() < 0.2) {
          g.tx = rand(b.minX, b.maxX);
          g.ty = rand(b.minY, b.maxY);
        } else {
          g.tx = clamp(mx + g.side * R * rand(0.4, 1), b.minX, b.maxX);
          g.ty = clamp(my + rand(-1, 1) * Math.max(R * 0.4, spanY * 0.3), b.minY, b.maxY);
        }
        if (has(list[0].sp, 'bottom')) g.ty = b.maxY;
        g.timer = rand(4, 8);
      }
    });
  }

  function separate(dt) {
    for (let i = 0; i < fish.length; i++) {
      const a = fish[i];
      if (a.mode !== 'swim' || a.dragging) continue;
      for (let j = i + 1; j < fish.length; j++) {
        const b = fish[j];
        if (b.mode !== 'swim' || b.dragging) continue;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const min = Math.max((a.w + b.w) * 0.3, (a.h + b.h) * 0.45);
        let d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        if (d2 < 0.01) { dx = rand(-1, 1); dy = rand(-1, 1); d2 = dx * dx + dy * dy + 0.01; }
        const d = Math.sqrt(d2);
        const push = ((min - d) / min) * 110 * L.scale * dt;
        const ux = dx / d;
        // Bias the push vertically so fish spread into layers instead of a neat line.
        const uy = dy / d + (dy >= 0 ? 0.35 : -0.35);
        a.x -= ux * push * 0.6; a.y -= uy * push;
        b.x += ux * push * 0.6; b.y += uy * push;
      }
    }
  }

  function steer(e, dt) {
    const sp = e.sp;
    const s = L.scale;
    const b = bounds(e);
    const g = schools[e.id];
    let food = e.food;
    if (food) {
      e.foodT += dt;
      const reachable = has(sp, 'bottom') || food.y <= b.maxY + e.h * 0.3;
      if (food.gone || !reachable || e.foodT > 6) { food = e.food = null; e.timer = 0; }
    }
    const school = !food && !e.stressed && has(sp, 'school') && g && g.n > 1;
    if (food) {
      const dir = food.x >= e.x ? 1 : -1;
      e.tx = clamp(food.x - dir * e.w * 0.36, b.minX, b.maxX);
      e.ty = clamp(food.y, b.minY, b.maxY);
    } else if (school) {
      e.offTimer -= dt;
      if (e.offTimer <= 0) {
        e.offX = rand(-1, 1) * (36 + g.n * 6) * s;
        e.offY = rand(-1, 1) * (20 + g.n * 3) * s;
        e.offTimer = rand(2, 5);
      }
      e.tx = clamp(g.tx + e.offX, b.minX, b.maxX);
      e.ty = has(sp, 'bottom') ? b.maxY : clamp(g.ty + e.offY, b.minY, b.maxY);
    } else {
      e.timer -= dt;
    }
    let dx = e.tx - e.x;
    let dy = e.ty - e.y;
    let dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
    if (!food && !school && (dist < 10 * s || e.timer <= 0)) {
      pickTarget(e);
      dx = e.tx - e.x;
      dy = e.ty - e.y;
      dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
    }
    let speed = sp.speed * s * e.speedMul;
    if (food) {
      speed *= 1.5;
    } else {
      if (has(sp, 'dart')) {
        if (e.burst > 0) { e.burst -= dt; speed *= 2.4; } else if (Math.random() < dt * 0.15) e.burst = rand(0.35, 0.7);
      }
      if (has(sp, 'hover')) {
        if (e.hang > 0) { e.hang -= dt; speed *= 0.08; } else if (Math.random() < dt * 0.12) e.hang = rand(1.5, 4);
      }
      if (has(sp, 'bottom')) {
        if (e.snuffle > 0) { e.snuffle -= dt; speed *= 0.15; } else if (Math.random() < dt * 0.2) e.snuffle = rand(0.6, 1.6);
      }
    }
    if (e.stressed) {
      // Jerky: surges, sudden short pauses and frequent new targets (see pickTarget).
      speed *= 1.4 + Math.sin(time * 9 + e.bob) * 0.6;
      if (e.freeze > 0) { e.freeze -= dt; speed *= 0.05; } else if (!food && Math.random() < dt * 0.35) e.freeze = rand(0.25, 0.7);
    }
    let arrive = school ? clamp(dist / (30 * s), 0.25, 1.3) : clamp(dist / (50 * s), 0.15, 1);
    if (food) arrive = clamp(dist / (20 * s), 0.35, 1);
    const dvx = (dx / dist) * speed * arrive;
    const dvy = (dy / dist) * speed * arrive * 0.65;
    const k = Math.min(1, dt * (e.stressed ? 4 : 1.8));
    e.vx += (dvx - e.vx) * k;
    e.vy += (dvy - e.vy) * k;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.x = clamp(e.x, b.minX, b.maxX);
    e.y = clamp(e.y, b.minY, b.maxY);
    if (e.vx > 3) e.facing = 1;
    else if (e.vx < -3) e.facing = -1;
    if (food) {
      // Eat on contact with the mouth.
      const mx = e.x + e.facing * e.w * 0.38;
      // Bottom dwellers snuffle across the whole sand band, so they reach further down.
      const yTol = has(sp, 'bottom') ? Math.max(e.h * 0.4, (L.decorBaseY - L.floorTopY) * 0.8) : Math.max(10, e.h * 0.4);
      if (Math.abs(mx - food.x) < Math.max(9, e.w * 0.14) && Math.abs(e.y - food.y) < yTol) {
        eatFlake(food);
        e.food = null;
        e.nibble = 0.25;
        e.timer = 0;
        e.foodScan = rand(0.2, 0.5);
      }
    }
    e.roll += (1 - e.roll) * Math.min(1, dt * 3);
    e.wagAmp += (1 - e.wagAmp) * Math.min(1, dt * 2);
  }

  function kill(e) {
    e.mode = 'dead';
    e.food = null;
    e.el.classList.add('is-dead');
    setFishBadge(e, 'dead');
  }

  // Where a dead fish comes to rest: just below the heading and top controls,
  // with room for its badge, and never above the water surface.
  const deadRestY = (e) => Math.max(L.surfaceY + e.h * 0.2, (L.topBarBottom || 0) + 8 + BADGE_SIZE + e.h * 0.5);

  // Belly-up and floating: quick at first, easing to rest near the top.
  function updateDead(e, dt) {
    const b = bounds(e);
    const rest = Math.min(deadRestY(e), b.maxY);
    e.vx *= 1 - Math.min(1, dt * 2);
    e.x += e.vx * dt;
    if (e.y < rest) {
      // Dropped above the resting line: sink gently back down to it.
      e.vy = 0;
      e.y += (rest - e.y) * Math.min(1, dt * 2.5);
    } else {
      const dist = e.y - rest;
      e.vy += (-Math.min(90 * L.scale, dist * 0.9) - e.vy) * Math.min(1, dt * 2.5);
      e.y = Math.max(rest, e.y + e.vy * dt);
    }
    e.x = clamp(e.x, b.minX, b.maxX);
    e.roll += (-1 - e.roll) * Math.min(1, dt * 2.2);
    e.wagAmp *= 1 - Math.min(1, dt * 3);
  }

  function updateStunned(e, dt) {
    e.vx *= 1 - Math.min(1, dt * 3);
    e.vy *= 1 - Math.min(1, dt * 3);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.wagAmp += (0.4 - e.wagAmp) * Math.min(1, dt * 3);
  }

  function eat(prey) {
    prey.mode = 'gone';
    prey.food = null;
    removeBubble(prey);
    prey.el.classList.add('is-eaten');
    const b = makeBadge('dead', prey.x, prey.y - prey.h * 0.3 - 14);
    looseBadges.push(b);
    later(() => b.classList.add('is-fading'), 900);
    later(() => b.remove(), 1600);
  }

  function updateHunt(e, dt) {
    if (e.pause > 0) {
      e.pause -= dt;
      e.vx *= 0.9;
      e.vy *= 0.9;
      return;
    }
    const q = e.huntQueue || [];
    while (q.length && q[0].mode === 'gone') q.shift();
    const prey = q[0];
    if (!prey) {
      e.mode = 'swim';
      e.huntQueue = null;
      pickTarget(e);
      return;
    }
    const dir = prey.x >= e.x ? 1 : -1;
    const tx = prey.x - dir * e.w * 0.36;
    const ty = prey.y;
    const dx = tx - e.x;
    const dy = ty - e.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
    if (!e.huntSpeed) e.huntSpeed = Math.max(320 * L.scale, d / 0.55);
    e.huntT += dt;
    e.facing = dir;
    if (d < 8 || e.huntT > 1.2) {
      eat(prey);
      q.shift();
      e.puff = 0.55;
      e.pause = 0.35;
      e.huntSpeed = 0;
      e.huntT = 0;
      return;
    }
    const step = Math.min(d, e.huntSpeed * dt);
    e.vx = (dx / d) * e.huntSpeed;
    e.vy = (dy / d) * e.huntSpeed * 0.3;
    e.x += (dx / d) * step;
    e.y += (dy / d) * step;
  }

  function render(e, dt) {
    const sp = e.sp;
    const s = L.scale;
    const step = dt * 4.2;
    e.face += clamp(e.facing - e.face, -step, step);
    let fx = e.face;
    if (Math.abs(fx) < 0.06) fx = fx < 0 ? -0.06 : 0.06;
    const sgn = e.face >= 0 ? 1 : -1;
    let tilt = 0;
    if (e.mode !== 'dead') tilt = clamp(Math.atan2(e.vy, Math.abs(e.vx) + 25) * 57.3 * 0.75, -20, 20) * sgn;
    if (e.snuffle > 0 && e.mode === 'swim') tilt += 9 * sgn;
    e.tilt += (tilt - e.tilt) * Math.min(1, dt * 5);
    e.bob += dt * 1.7;
    const bobY = e.mode === 'swim' ? Math.sin(e.bob) * 2.6 * s : 0;
    let p = 1;
    if (e.puff > 0) {
      e.puff -= dt;
      p = 1 + 0.14 * Math.sin(Math.PI * (1 - Math.max(0, e.puff) / 0.55));
    }
    if (e.nibble > 0) {
      e.nibble -= dt;
      p *= 1 + 0.07 * Math.sin(Math.PI * (1 - Math.max(0, e.nibble) / 0.25));
    }
    const tx = e.x - e.w / 2;
    const ty = e.y - e.h / 2 + bobY;
    e.el.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) rotate(' + e.tilt.toFixed(2) +
      'deg) scale(' + (fx * p).toFixed(3) + ',' + (e.roll * p).toFixed(3) + ')';

    const v = Math.sqrt(e.vx * e.vx + e.vy * e.vy) / (sp.speed * s + 1);
    const struggle = e.dragging ? 2.2 : 1;
    if (e.tail) {
      e.tailPhase += dt * sp.anim.wag * (0.55 + Math.min(2.6, v) * 0.75) * struggle;
      const a = Math.sin(e.tailPhase) * sp.anim.tail * e.wagAmp;
      const sx = 1 - 0.16 * e.wagAmp * (0.5 - 0.5 * Math.cos(2 * e.tailPhase));
      e.tail.style.transform = 'rotate(' + a.toFixed(2) + 'deg) scaleX(' + sx.toFixed(3) + ')';
    }
    if (e.badge) moveBadge(e.badge, e.x, fishBadgeY(e));
    if (e.bubble) {
      e.bubbleT -= dt;
      if (e.bubbleT <= 0) removeBubble(e);
      else {
        if (e.bubbleT < 0.35) e.bubble.classList.add('is-fading');
        placeBubble(e);
      }
    }
    if (e.fins.length && sp.anim.fin) {
      e.finPhase += dt * (has(sp, 'hover') ? 3.2 : 2.4) * struggle;
      for (let i = 0; i < e.fins.length; i++) {
        e.fins[i].style.transform = 'rotate(' + (Math.sin(e.finPhase + i * 1.3) * sp.anim.fin * e.wagAmp).toFixed(2) + 'deg)';
      }
    }
  }

  // ---- Food ---------------------------------------------------------------

  function removeFlake(f) {
    f.gone = true;
    f.el.remove();
    const i = flakes.indexOf(f);
    if (i !== -1) flakes.splice(i, 1);
  }

  function eatFlake(f) {
    if (f.gone) return;
    f.gone = true;
    f.el.classList.add('is-eaten');
    const i = flakes.indexOf(f);
    if (i !== -1) flakes.splice(i, 1);
    setTimeout(() => f.el.remove(), 200);
  }

  // A pinch of 6–10 flakes near the surface at x.
  Swim.feed = function (x) {
    const n = 6 + Math.floor(Math.random() * 5);
    while (flakes.length + n > MAX_FLAKES && flakes.length) removeFlake(flakes[0]);
    const s = L.scale;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('i');
      el.className = 'flake';
      const w = rand(3.5, 6.5) * Math.max(0.8, s);
      el.style.width = w.toFixed(1) + 'px';
      el.style.height = (w * rand(0.55, 0.9)).toFixed(1) + 'px';
      el.style.background = FLAKE_COLOURS[Math.floor(Math.random() * FLAKE_COLOURS.length)];
      el.style.borderRadius = [0, 0, 0, 0].map(() => Math.round(rand(20, 60)) + '%').join(' ');
      const y0 = L.surfaceY + rand(0, 16 * s);
      const floorY = L.floorTopY + (L.decorBaseY - L.floorTopY) * rand(0.15, 0.7);
      const f = {
        el: el, x0: clamp(x + rand(-20, 20) * s, 4, L.W - 4), y: y0, x: x, floorY: floorY,
        vy: (floorY - y0) / rand(6.5, 8.5), amp: rand(4, 12) * s, wf: rand(1.2, 2.4), ph: rand(0, 6.28),
        rot: rand(0, 360), vr: rand(-90, 90), age: 0, landed: false, landT: 0, gone: false
      };
      f.x = f.x0;
      foodLayer.appendChild(el);
      flakes.push(f);
    }
  };

  function updateFlakes(dt) {
    for (let i = flakes.length - 1; i >= 0; i--) {
      const f = flakes[i];
      f.age += dt;
      if (!f.landed) {
        f.y += f.vy * dt;
        f.x = f.x0 + Math.sin(f.age * f.wf + f.ph) * f.amp;
        f.rot += f.vr * dt;
        if (f.y >= f.floorY) { f.y = f.floorY; f.landed = true; }
      } else {
        f.landT += dt;
      }
      const left = Math.min(10 - f.age, 2.5 - f.landT);
      if (left <= 0) { removeFlake(f); continue; }
      f.el.style.opacity = left < 0.6 ? (left / 0.6).toFixed(2) : '';
      f.el.style.transform = 'translate3d(' + f.x.toFixed(1) + 'px,' + f.y.toFixed(1) + 'px,0) rotate(' + f.rot.toFixed(0) + 'deg)';
    }
  }

  // Living, free-swimming fish notice nearby food. Stressed fish react more slowly;
  // bottom dwellers only take flakes that have reached the floor.
  function lookForFood(e, dt) {
    if (e.food || !flakes.length) return;
    e.foodScan -= dt;
    if (e.foodScan > 0) return;
    e.foodScan = e.stressed ? rand(0.9, 1.6) : 0.3;
    const b = bounds(e);
    const bottom = has(e.sp, 'bottom');
    const R = 320 * L.scale;
    let best = null;
    let bd = R * R;
    for (let i = 0; i < flakes.length; i++) {
      const f = flakes[i];
      if (bottom ? f.y < L.floorTopY - 8 : f.y > b.maxY + e.h * 0.3) continue;
      const d2 = (f.x - e.x) * (f.x - e.x) + (f.y - e.y) * (f.y - e.y);
      if (d2 < bd) { bd = d2; best = f; }
    }
    if (best) { e.food = best; e.foodT = 0; }
  }

  // ---- Speech bubbles -------------------------------------------------------

  function removeBubble(e) {
    if (e.bubble) e.bubble.remove();
    e.bubble = null;
    e.bubbleT = 0;
  }

  function placeBubble(e) {
    const top = e.y - e.h * 0.5 - (e.badge ? BADGE_SIZE + 2 : 4);
    const below = top - 70 < (L.topBarBottom || 0) + 6;
    const y = below ? e.y + e.h * 0.5 + 4 : top;
    const half = e.bubbleW / 2;
    const bx = clamp(e.x, half + 8, Math.max(half + 8, L.W - half - 8));
    const tail = clamp(e.x - bx, -half + 18, half - 18);
    e.bubble.classList.toggle('is-below', below);
    e.bubble.style.transform = 'translate3d(' + bx.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    if (Math.abs(tail - (e.bubbleTail || 0)) > 0.5) {
      e.bubbleTail = tail;
      e.bubble.style.setProperty('--tail', tail.toFixed(1) + 'px');
    }
  }

  // A tap on a fish: one short line in its own voice. Before results it's personality;
  // after results it matches the fish's outcome.
  Swim.speak = function (uid) {
    const e = get(uid);
    if (!e || e.kind !== 'fish' || e.mode === 'gone') return;
    let emoji;
    let pool;
    if (e.outcomeKey) {
      emoji = EMOJI[e.outcomeKey];
      pool = T.VOICE.outcome[e.outcomeKey].map((text) => [emoji, text]);
    } else {
      pool = T.VOICE.species[e.id];
    }
    const options = pool.filter((l) => l[1] !== e.lastLine);
    const line = (options.length ? options : pool)[Math.floor(Math.random() * (options.length || pool.length))];
    e.lastLine = line[1];
    removeBubble(e);
    const b = document.createElement('div');
    b.className = 'speech';
    const box = document.createElement('div');
    box.className = 'speech-box';
    const em = document.createElement('span');
    em.className = 'speech-emoji';
    em.textContent = line[0];
    const tx = document.createElement('span');
    tx.className = 'speech-text';
    tx.textContent = line[1];
    box.appendChild(em);
    box.appendChild(tx);
    b.appendChild(box);
    badgeLayer.appendChild(b);
    e.bubble = b;
    e.bubbleW = box.offsetWidth;
    e.bubbleTail = null;
    e.bubbleT = BUBBLE_TIME;
    placeBubble(e);
  };

  // ---- Decor --------------------------------------------------------------

  function sizeDecor(e) {
    e.w = e.d.display * L.scale;
    e.h = (e.w * e.art.h) / e.art.w;
    e.el.style.width = e.w.toFixed(1) + 'px';
    e.el.style.height = e.h.toFixed(1) + 'px';
  }

  function placeDecor(e) {
    const top = e.dragY != null ? e.dragY - e.h * 0.5 : L.decorBaseY - e.h;
    e.el.style.transform = 'translate3d(' + (e.x - e.w / 2).toFixed(1) + 'px,' + top.toFixed(1) + 'px,0)';
    e.el.style.zIndex = String(10 + e.order);
    if (e.badge) moveBadge(e.badge, e.x, decorBadgeY(e));
  }

  Swim.addDecor = function (id, x, y) {
    const d = T.decorById[id];
    if (!d) return null;
    const art = T.Art.render('decor', id);
    const el = document.createElement('div');
    const uid = 'd' + (++seq);
    el.className = 'decor decor--' + d.type + ' no-anim';
    el.dataset.uid = uid;
    el.innerHTML = '<div class="decor-body">' + art.svg + '</div>';
    const e = { uid: uid, kind: 'decor', id: id, d: d, el: el, art: art, order: ++order, x: x, dragY: y, dead: false, dragging: false };
    sizeDecor(e);
    e.x = clamp(x, e.w * 0.3, L.W - e.w * 0.3);
    decorLayer.appendChild(el);
    decor.push(e);
    placeDecor(e);
    void el.offsetWidth;
    el.classList.remove('no-anim');
    e.dragY = null;
    placeDecor(e);
    return uid;
  };

  // ---- Shared API ---------------------------------------------------------

  Swim.init = function (fl, dl, bl, food) {
    fishLayer = fl;
    decorLayer = dl;
    badgeLayer = bl;
    foodLayer = food;
    requestAnimationFrame(frame);
  };

  Swim.items = function () {
    return fish.concat(decor).sort((a, b) => a.order - b.order).map((e) => ({ uid: e.uid, kind: e.kind, id: e.id }));
  };

  Swim.fishCount = function () { return fish.length; };

  Swim.center = function (uid) {
    const e = get(uid);
    if (!e) return null;
    if (e.kind === 'fish') return { x: e.x, y: e.y };
    return { x: e.x, y: e.dragY != null ? e.dragY : L.decorBaseY - e.h / 2 };
  };

  Swim.remove = function (uid, animate) {
    const list = uid.charAt(0) === 'f' ? fish : decor;
    const i = list.findIndex((e) => e.uid === uid);
    if (i === -1) return;
    const e = list[i];
    list.splice(i, 1);
    if (e.kind === 'fish') removeBubble(e);
    if (e.badge) { e.badge.remove(); e.badge = null; }
    if (animate) {
      e.el.classList.add('is-removing');
      setTimeout(() => e.el.remove(), 350);
    } else {
      e.el.remove();
    }
  };

  Swim.clear = function () {
    clearTimers();
    clearBadges();
    fish.forEach(removeBubble);
    while (flakes.length) removeFlake(flakes[0]);
    fish.concat(decor).forEach((e) => e.el.remove());
    fish.length = 0;
    decor.length = 0;
    schools = {};
  };

  Swim.beginDrag = function (uid) {
    const e = get(uid);
    if (!e) return;
    e.dragging = true;
    e.el.classList.add('is-dragging');
  };

  Swim.dragTo = function (uid, x, y) {
    const e = get(uid);
    if (!e) return;
    if (e.kind === 'fish') {
      e.x = clamp(x, 0, L.W);
      e.y = clamp(y, 0, L.H);
      e.vx = 0;
      e.vy = 0;
    } else {
      e.x = x;
      e.dragY = y;
      placeDecor(e);
    }
  };

  Swim.setRemoveHint = function (uid, on) {
    const e = get(uid);
    if (e) e.el.classList.toggle('will-remove', on);
  };

  Swim.endDrag = function (uid) {
    const e = get(uid);
    if (!e) return;
    e.dragging = false;
    e.el.classList.remove('is-dragging', 'will-remove');
    if (e.kind === 'fish') {
      const b = bounds(e);
      e.x = e.homeX = clamp(e.x, b.minX, b.maxX);
      e.y = e.homeY = clamp(e.y, b.minY, b.maxY);
      if (has(e.sp, 'bottom')) e.homeY = b.maxY;
      pickTarget(e);
    } else {
      e.dragY = null;
      e.x = clamp(e.x, e.w * 0.3, L.W - e.w * 0.3);
      e.order = ++order;
      placeDecor(e);
    }
  };

  // Animates rule outcomes. Returns roughly how long the sequence takes, in ms.
  Swim.playOutcomes = function (result) {
    clearTimers();
    const out = result.outcomes;
    const hunts = {};
    let end = 1800;
    fish.forEach((e) => {
      const o = out[e.uid];
      if (!o) return;
      e.outcomeKey = o.badge || (result.celebration ? 'happy' : 'ok');
      removeBubble(e);
      if (o.status === 'eaten') {
        const pred = o.eatenBy ? get(o.eatenBy) : null;
        if (pred && pred.kind === 'fish') (hunts[pred.uid] = hunts[pred.uid] || []).push(e);
        else later(() => eat(e), rand(200, 900));
      } else if (o.status === 'dead') {
        kill(e);
      } else if (o.status === 'stressed') {
        later(() => {
          e.stressed = true;
          e.timer = 0;
          e.el.classList.add('is-stressed');
          setFishBadge(e, o.badge || 'stressed');
        }, rand(150, 1100));
      }
    });
    if (result.celebration) {
      fish.forEach((e) => {
        later(() => {
          setFishBadge(e, 'happy');
          later(() => fadeFishBadge(e), 3500);
        }, rand(200, 700));
      });
    }
    Object.keys(hunts).forEach((pid) => {
      const pred = get(pid);
      const prey = hunts[pid];
      prey.forEach((p) => { p.mode = 'stunned'; });
      later(() => {
        pred.mode = 'hunt';
        pred.food = null;
        pred.huntQueue = prey.slice();
        pred.huntT = 0;
        pred.huntSpeed = 0;
        pred.pause = 0;
      }, 250);
      end = Math.max(end, 250 + prey.length * 950);
    });
    decor.forEach((d) => {
      const o = out[d.uid];
      if (!o || o.status === 'ok') return;
      later(() => {
        if (o.status === 'stressed') { d.el.classList.add('is-pale'); return; }
        d.dead = true;
        if (o.status === 'dead' && !d.badge) d.badge = makeBadge('dead', d.x, decorBadgeY(d));
        if (d.d.type === 'plant') d.el.classList.add('is-wilted');
        else if (d.d.type !== 'hardscape') d.el.classList.add('is-bleached');
      }, rand(100, 900));
    });
    return end + 400;
  };

  Swim.revive = function () {
    clearTimers();
    clearBadges();
    fish.forEach((e) => {
      // Back to where it was placed, the right way up and at full health.
      e.x = e.homeX;
      e.y = e.homeY;
      e.roll = 1;
      e.tilt = 0;
      e.wagAmp = 1;
      e.dragging = false;
      e.mode = 'swim';
      e.stressed = false;
      e.freeze = 0;
      e.food = null;
      e.outcomeKey = null;
      removeBubble(e);
      e.puff = 0;
      e.pause = 0;
      e.huntQueue = null;
      e.vx = 0;
      e.vy = 0;
      e.el.classList.remove('is-dead', 'is-stressed', 'is-eaten', 'is-dragging', 'will-remove');
      pickTarget(e);
    });
    decor.forEach((d) => {
      d.dead = false;
      d.el.classList.remove('is-bleached', 'is-wilted', 'is-pale');
    });
  };

  Swim.resize = function (ow, oh) {
    const rx = ow ? L.W / ow : 1;
    const ry = oh ? L.H / oh : 1;
    fish.forEach((e) => {
      sizeFish(e);
      e.x *= rx; e.homeX *= rx; e.tx *= rx;
      e.y *= ry; e.homeY *= ry; e.ty *= ry;
      const b = bounds(e);
      e.x = clamp(e.x, b.minX, b.maxX);
      e.y = clamp(e.y, b.minY, b.maxY);
      e.homeX = clamp(e.homeX, b.minX, b.maxX);
      e.homeY = has(e.sp, 'bottom') ? b.maxY : clamp(e.homeY, b.minY, b.maxY);
    });
    decor.forEach((d) => {
      sizeDecor(d);
      d.x = clamp(d.x * rx, d.w * 0.3, L.W - d.w * 0.3);
      placeDecor(d);
    });
    schools = {};
  };

  function frame(now) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    time += dt;
    updateFlakes(dt);
    updateSchools(dt);
    separate(dt);
    for (let i = 0; i < fish.length; i++) {
      const e = fish[i];
      if (e.mode === 'gone') continue;
      if (!e.dragging) {
        if (e.mode === 'swim') {
          lookForFood(e, dt);
          steer(e, dt);
        }
        else if (e.mode === 'dead') updateDead(e, dt);
        else if (e.mode === 'stunned') updateStunned(e, dt);
        else if (e.mode === 'hunt') updateHunt(e, dt);
      }
      render(e, dt);
    }
    requestAnimationFrame(frame);
  }
})(window.Tank);
