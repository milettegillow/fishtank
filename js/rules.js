window.Tank = window.Tank || {};

// Compatibility engine. Pure functions: no DOM access.
(function (T) {
  'use strict';

  const RANK = { ok: 0, stressed: 1, damaged: 2, dead: 3, eaten: 3 };
  const NUM = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
  const SEV = { dead: 0, stressed: 1, note: 2 };
  const DEG = '°C';

  const numWord = (n) => (n < NUM.length ? NUM[n] : String(n));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const label = (d, n) => (n === 1 ? d.short : d.plural);

  function listJoin(arr) {
    if (arr.length <= 1) return arr.join('');
    return arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
  }

  function groupBy(recs) {
    const map = {};
    const keys = [];
    recs.forEach((r) => {
      if (!map[r.id]) { map[r.id] = []; keys.push(r.id); }
      map[r.id].push(r);
    });
    return keys.map((k) => map[k]);
  }

  // Negative when too cold, positive when too hot, 0 when in range.
  function tempOff(range, t) {
    if (!range) return 0;
    if (t < range[0]) return t - range[0];
    if (t > range[1]) return t - range[1];
    return 0;
  }

  function evaluate(state) {
    const tempC = typeof state.temp === 'number' ? state.temp : T.TEMPS[state.temp];
    const water = state.water;
    const outcomes = {};
    const issues = [];
    const positives = [];
    const fish = [];
    const decor = [];

    (state.items || []).forEach((it) => {
      const data = it.kind === 'fish' ? T.speciesById[it.id] : T.decorById[it.id];
      if (!data) return;
      outcomes[it.uid] = { status: 'ok' };
      (it.kind === 'fish' ? fish : decor).push({ uid: it.uid, id: it.id, kind: it.kind, data: data });
    });

    const status = (r) => outcomes[r.uid].status;
    const alive = (r) => status(r) !== 'dead' && status(r) !== 'eaten';

    function mark(recs, s, extra) {
      recs.forEach((r) => {
        const o = outcomes[r.uid];
        if (RANK[s] > RANK[o.status]) {
          o.status = s;
          if (extra) Object.assign(o, extra);
        }
      });
    }

    function issue(severity, headline, body, recs) {
      issues.push({ severity: severity, headline: headline, body: body, itemIds: recs.map((r) => r.uid) });
    }

    // 1. Environment: fish
    groupBy(fish).forEach((recs) => {
      const d = recs[0].data;
      const n = recs.length;
      const who = label(d, n);
      if (d.water !== water) {
        mark(recs, 'dead');
        if (d.water === 'fresh') {
          issue('dead', cap(who) + ' in salt water? That’s a pickle',
            cap(d.plural) + ' are freshwater fish. In salt water their bodies lose water faster than they can replace it, and they quickly dehydrate.', recs);
        } else {
          issue('dead', cap(who) + ' in fresh water? No ocean, no chance',
            cap(d.plural) + ' are marine fish. In fresh water their bodies soak up too much water and their cells can’t cope.', recs);
        }
        return;
      }
      const off = tempOff(d.temp, tempC);
      if (off === 0) return;
      const range = d.temp[0] + '–' + d.temp[1] + DEG;
      if (Math.abs(off) > 2) {
        mark(recs, 'dead');
        if (off < 0) {
          issue('dead', 'Brr. Far too cold for the ' + who,
            cap(d.plural) + ' need ' + range + ' and your tank is ' + tempC + DEG + '. Fish are cold-blooded, so cold water slows their bodies until they can’t feed or fight off disease.', recs);
        } else {
          issue('dead', 'Way too hot for the ' + who,
            cap(d.plural) + ' need ' + range + ' and your tank is ' + tempC + DEG + '. Warm water holds less oxygen while speeding up a fish’s metabolism, so they slowly suffocate.', recs);
        }
      } else {
        mark(recs, 'stressed');
        const verb = n === 1 ? 'is' : 'are';
        issue('stressed', off < 0 ? 'The ' + who + ' ' + verb + ' a bit chilly' : 'The ' + who + ' ' + verb + ' feeling the heat',
          cap(d.plural) + ' prefer ' + range + '. At ' + tempC + DEG + ' they survive, but they’re stressed and more likely to get sick.', recs);
      }
    });

    // 1. Environment: decor
    groupBy(decor).forEach((recs) => {
      const d = recs[0].data;
      const n = recs.length;
      const who = label(d, n);
      const living = d.type === 'coral' || d.type === 'anemone';
      if (d.type === 'hardscape') {
        if (d.water !== water) {
          issue('note', 'Driftwood on a reef?',
            'Driftwood is harmless, but it slowly leaks tannins that tint water like tea. Reef keepers use rock instead to keep salt water crystal clear.', recs);
        }
        return;
      }
      if (d.water !== water) {
        mark(recs, 'dead');
        if (living) {
          issue('dead', 'Your ' + who + ' can’t do fresh water',
            'Corals and anemones are marine animals. Without salt their cells swell with water and they die within hours.', recs);
        } else {
          issue('dead', 'Your ' + who + ' got pickled',
            'Freshwater plants can’t draw water in from salty surroundings, so they shrivel and turn brown.', recs);
        }
        return;
      }
      const off = tempOff(d.temp, tempC);
      if (off === 0) return;
      const range = d.temp[0] + '–' + d.temp[1] + DEG;
      if (Math.abs(off) > 2) {
        mark(recs, 'dead');
        if (living) {
          issue('dead', 'Your ' + who + ' bleached',
            'At ' + tempC + DEG + ', far outside their ' + range + ', corals spit out the tiny algae that live in them and give them food and colour. What’s left is a white skeleton.', recs);
        } else {
          issue('dead', 'The ' + who + ' wilted',
            cap(d.plural) + ' grow at ' + range + '. At ' + tempC + DEG + ' their leaves yellow, brown and melt away.', recs);
        }
      } else {
        mark(recs, 'stressed');
        const why = d.id === 'moss-ball'
          ? 'marimo come from cool lakes, so in warm water they slowly turn brown and fall apart.'
          : 'they hang on, but lose colour and stop growing.';
        issue('stressed', d.id === 'moss-ball' && off > 0 ? 'The moss ball is sweating' : 'The ' + who + (n === 1 ? ' is' : ' are') + ' struggling',
          cap(d.plural) + ' prefer ' + range + '. At ' + tempC + DEG + ' ' + why, recs);
      }
    });

    // 2–3. Predation among survivors
    const live = fish.filter(alive);
    const preds = live.filter((r) => r.data.mouthSize > 0);
    if (preds.length) {
      const pairs = {};
      const pairKeys = [];
      let rr = 0;
      live.forEach((prey) => {
        const able = preds.filter((p) => p.id !== prey.id && prey.data.size <= p.data.mouthSize);
        if (!able.length) return;
        const p = able[rr++ % able.length];
        mark([prey], 'eaten', { eatenBy: p.uid });
        const key = p.id + '>' + prey.id;
        if (!pairs[key]) { pairs[key] = { pred: p.data, prey: prey.data, recs: [], preds: [] }; pairKeys.push(key); }
        pairs[key].recs.push(prey);
        if (pairs[key].preds.indexOf(p) === -1) pairs[key].preds.push(p);
      });
      pairKeys.forEach((k) => {
        const g = pairs[k];
        const preyName = label(g.prey, g.recs.length);
        let head;
        if (g.pred.id === 'lionfish') head = 'The lionfish had your ' + preyName + ' for lunch';
        else if (g.pred.id === 'angelfish' && g.prey.id === 'neon-tetra') head = 'The angelfish ate the neons. Classic.';
        else head = 'The ' + g.pred.short + ' ate your ' + preyName;
        issue('dead', head, g.pred.predationBody || ('The ' + g.pred.short + ' eats any fish small enough to fit in its mouth.'), g.recs.concat(g.preds));
      });
    }

    // 4. Territorial
    groupBy(fish.filter(alive)).forEach((recs) => {
      const d = recs[0].data;
      const n = recs.length;
      if (!d.maxSameSpecies || n <= d.maxSameSpecies) return;
      const extras = recs.slice(d.maxSameSpecies);
      const sev = d.overLimit || 'stressed';
      mark(extras, sev);
      let head;
      let body;
      if (d.id === 'clownfish') {
        head = n === 3 ? 'Three’s a crowd for clownfish' : numWord(n) + ' clownfish, room for one pair';
        body = 'Clownfish live as a single pair, and that pair will chase and fight other clownfish until they die.';
      } else if (d.id === 'betta') {
        head = numWord(n) + ' bettas, one winner';
        body = 'Male bettas are bred to fight, which is why they’re called Siamese fighting fish. Put two together and they battle until one dies.';
      } else if (d.id === 'royal-gramma') {
        head = numWord(n) + ' royal grammas, one cave';
        body = 'Royal grammas fiercely guard a cave or ledge against their own kind. In a typical home tank, keep just one.';
      } else {
        head = 'Too many ' + d.plural;
        body = cap(d.plural) + ' don’t tolerate more than ' + d.maxSameSpecies + ' of their own kind.';
      }
      issue(sev, head, body, sev === 'dead' ? extras : recs);
    });

    const tangs = fish.filter((r) => alive(r) && r.data.isTang);
    if (tangs.length > 1) {
      mark(tangs, 'stressed');
      const ids = groupBy(tangs);
      const head = ids.length === 1 ? numWord(tangs.length) + ' ' + tangs[0].data.plural + ', zero chill' : 'Tang versus tang';
      issue('stressed', head,
        'Tangs are fiercely territorial with other tangs and fight with the scalpel-sharp spine by their tail. A home aquarium has room for one tang at most.', tangs);
    }

    // 5. Schooling
    groupBy(fish.filter(alive)).forEach((recs) => {
      const d = recs[0].data;
      const n = recs.length;
      if (!d.schoolMin) return;
      if (n < d.schoolMin) {
        mark(recs, 'stressed');
        issue('stressed', n === 1 ? 'One lonely ' + d.short : numWord(n) + ' ' + d.plural + ' is not a school',
          cap(d.plural) + ' are schooling fish and only feel safe in a crowd. With fewer than ' + d.schoolMin + ' they hide, lose colour and stay stressed.', recs);
      } else {
        positives.push({ headline: 'A proper school of ' + d.plural,
          body: 'With ' + n + ' together, they feel safe enough to swim out in the open and show off their colours.',
          itemIds: recs.map((r) => r.uid) });
      }
    });

    // 6. Fin nipping
    const nippers = fish.filter((r) => alive(r) && r.data.finNipper);
    const longs = fish.filter((r) => alive(r) && r.data.longFins);
    if (nippers.length && longs.length) {
      mark(longs, 'stressed');
      const names = listJoin(groupBy(longs).map((g) => g[0].data.short));
      if (nippers.length < 6) {
        issue('stressed', 'Fewer tiger barbs, more nipped fins',
          'Tiger barbs nip long, flowing fins like those of the ' + names + '. In a group under six it gets worse: with no school to chase, they turn on their tankmates.', longs.concat(nippers));
      } else {
        issue('stressed', 'The tiger barbs can’t resist those fins',
          'Even in a proper group, tiger barbs nip slow fish with long, flowing fins like the ' + names + '. Keep them with fast, short-finned tankmates.', longs.concat(nippers));
      }
    }

    // 7. Not reef-safe
    const pickers = fish.filter((r) => alive(r) && r.data.reefSafe === false);
    const reef = decor.filter((r) => (r.data.type === 'coral' || r.data.type === 'anemone') && status(r) !== 'dead');
    if (pickers.length && reef.length) {
      mark(reef, 'damaged');
      issue('stressed', 'The ' + pickers[0].data.short + ' is eating your reef',
        'Copperband butterflyfish pick at coral polyps and anemones. Reef keepers sometimes add one to clear out pest anemones, then regret it when it starts on the corals.', reef.concat(pickers));
    }

    // 8. Overstocking
    const stocked = fish.filter(alive);
    const load = stocked.reduce((sum, r) => sum + r.data.bioload, 0);
    if (load > T.CAPACITY) {
      mark(stocked, 'stressed');
      const pct = Math.round((load / T.CAPACITY) * 100);
      const goldfish = stocked.filter((r) => r.id === 'goldfish').length;
      const big = stocked.filter((r) => r.data.size >= 20).length;
      const extra = goldfish >= 2 ? ', and goldfish are famously messy' : big ? ', and big fish make big messes' : '';
      issue('stressed', 'Standing room only',
        'Fish waste breaks down into toxic ammonia. This tank holds about ' + pct + '% of what a typical 200-litre aquarium can handle' + extra + ', so the water turns bad for everyone.', stocked);
    }

    // 9. Notes
    const blue = fish.filter((r) => r.id === 'blue-tang');
    if (blue.length) {
      issue('note', 'Just keep swimming… somewhere bigger',
        'Blue tangs grow to 30 cm and cruise long stretches of reef every day, so experts recommend tanks of well over 500 litres. After Finding Dory, conservationists worried about demand for wild-caught blue tangs, which are rarely bred in captivity.', blue);
    }
    const clowns = fish.filter((r) => r.id === 'clownfish' && alive(r));
    const anemones = decor.filter((r) => r.id === 'anemone' && status(r) === 'ok');
    if (clowns.length) {
      if (anemones.length) {
        positives.push({ headline: 'Home sweet anemone',
          body: 'A protective slime coat lets clownfish hide among stinging tentacles, and in return they clean the anemone and feed it scraps.',
          itemIds: clowns.concat(anemones).map((r) => r.uid) });
      } else {
        issue('note', 'No anemone for Nemo',
          'Clownfish cope without one in an aquarium, but in the wild they never live without a host anemone to hide in.', clowns);
      }
    }

    issues.sort((a, b) => SEV[a.severity] - SEV[b.severity]);

    let celebration = null;
    const anyBad = fish.concat(decor).some((r) => status(r) !== 'ok');
    if (!anyBad && fish.length) {
      const schools = fish.some((r) => r.data.schoolMin);
      const heads = ['Everyone made it!', 'A thriving tank', 'Happy fish, happy tank'];
      celebration = {
        headline: heads[fish.length % heads.length],
        body: 'Every fish here is at home in ' + water + ' water at ' + tempC + DEG + ', nobody fits in anyone else’s mouth, ' +
          (schools ? 'the schooling fish have the numbers they need, ' : '') + 'and there’s enough room and filtration for everyone.'
      };
    }

    const lost = fish.filter((r) => !alive(r)).length;
    const survived = fish.length - lost;
    let text;
    if (lost === 0) text = fish.length === 1 ? 'Your fish survived' : 'All ' + fish.length + ' survived';
    else if (survived === 0) text = fish.length === 1 ? 'Your fish didn’t make it' : 'None of your ' + fish.length + ' fish made it';
    else text = survived + ' survived, ' + lost + ' didn’t';

    return {
      outcomes: outcomes,
      issues: issues,
      positives: positives,
      celebration: celebration,
      summary: { total: fish.length, survived: survived, lost: lost, text: text },
      tempC: tempC,
      bioload: load,
      capacity: T.CAPACITY
    };
  }

  T.Rules = { evaluate: evaluate };
})(window.Tank);
