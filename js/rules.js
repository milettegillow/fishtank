window.Tank = window.Tank || {};

// Compatibility engine. Pure functions: no DOM access.
// Pass state.random to make headline choice deterministic; defaults to Math.random.
(function (T) {
  'use strict';

  const RANK = { ok: 0, stressed: 1, damaged: 2, dead: 3, eaten: 3 };
  const NUM = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
  const SEV = { dead: 0, stressed: 1, note: 2 };
  const DEG = '°C';
  // Stress reasons, most severe first.
  const BADGE_PRIORITY = ['territorial', 'finNipped', 'cold', 'hot', 'lonely', 'overstock'];

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

  const range = (d) => d.temp[0] + '–' + d.temp[1] + DEG;

  // Wording context for a set of records: names them as a natural list with plural-correct verbs.
  function ctxFor(recs, opts) {
    opts = opts || {};
    const groups = groupBy(recs);
    const names = groups.map((g) => {
      const n = g.length;
      const name = opts.plural ? g[0].data.plural : label(g[0].data, n);
      return opts.counts ? numWord(n).toLowerCase() + ' ' + name : name;
    });
    const who = listJoin(names);
    const pl = opts.plural || recs.length > 1;
    const c = { who: who, Who: cap(who), pl: pl, n: recs.length, groups: groups, v: (s, p) => (pl ? p : s) };
    // "neon tetras need 20–26°C and the betta needs 24–30°C"
    c.needs = (verb) => listJoin(groups.map((g) => {
      const n = g.length;
      return (n === 1 ? 'the ' + g[0].data.short + ' ' + verb + 's' : g[0].data.plural + ' ' + verb) + ' ' + range(g[0].data);
    }));
    return Object.assign(c, opts.extra || {});
  }

  // ---- Headline pools ---------------------------------------------------------

  const H = {
    freshInSalt: [
      (c) => c.Who + ' in salt water? That’s a pickle',
      (c) => c.Who + ' took one sip of the sea. Bad idea',
      (c) => 'Salt water 1, ' + c.who + ' 0',
      (c) => 'Turns out ' + c.who + ' ' + c.v('isn’t', 'aren’t') + ' seasoned for this',
      (c) => c.Who + ' ' + c.v('was', 'were') + ' not built for brine'
    ],
    saltInFresh: [
      (c) => c.Who + ' in fresh water? No ocean, no chance',
      (c) => c.Who + ' went looking for a reef and found a pond',
      (c) => 'Fresh water and ' + c.who + ': a tragic misunderstanding',
      (c) => c.Who + ' ' + c.v('needs', 'need') + ' salt. ' + c.v('It', 'They') + ' got none',
      (c) => 'Lost at sea? Worse. ' + c.Who + ' ' + c.v('was', 'were') + ' lost at lake'
    ],
    tooCold: [
      (c) => 'Brr. Far too cold for the ' + c.who,
      (c) => c.Who + ' ' + c.v('has', 'have') + ' been put on ice',
      (c) => 'The ' + c.who + ' froze up. Permanently',
      (c) => 'Cold water, colder ending for the ' + c.who,
      (c) => c.Who + ': chilled, then chilled some more'
    ],
    tooHot: [
      (c) => 'Way too hot for the ' + c.who,
      (c) => 'The ' + c.who + ' ' + c.v('was', 'were') + ' poached. Gently, but still',
      (c) => c.Who + ' in a hot tub. It did not go well',
      (c) => 'Someone left the ' + c.who + ' on the stove',
      (c) => c.Who + ' + ' + c.t + DEG + ' = soup'
    ],
    chilly: [
      (c) => 'The ' + c.who + ' ' + c.v('is', 'are') + ' a bit chilly',
      (c) => c.Who + ' would like a jumper, please',
      (c) => c.Who + ': surviving, shivering',
      (c) => 'Somebody turn the heater up for the ' + c.who,
      (c) => 'The ' + c.who + ' ' + c.v('is', 'are') + ' sulking in the cold'
    ],
    warmish: [
      (c) => 'The ' + c.who + ' ' + c.v('is', 'are') + ' feeling the heat',
      (c) => c.Who + ' ' + c.v('is', 'are') + ' sweating it out',
      (c) => 'Bit tropical for the ' + c.who + ', isn’t it?',
      (c) => c.Who + ' ' + c.v('wants', 'want') + ' a window open',
      (c) => 'Mild heatstroke, ' + c.who + ' edition'
    ],
    reefInFresh: [
      (c) => 'Your ' + c.who + ' can’t do fresh water',
      (c) => 'No salt, no ' + c.who,
      (c) => 'The ' + c.who + ' dissolved into regret',
      (c) => c.Who + ' ' + c.v('was', 'were') + ' expecting an ocean',
      (c) => 'Fresh water ended the ' + c.who + '. Quietly'
    ],
    plantInSalt: [
      (c) => 'Your ' + c.who + ' shrivelled in the brine',
      (c) => c.Who + ' ' + c.v('has', 'have') + ' been salted. Not in a good way',
      (c) => 'Seasoned to death: ' + c.who,
      (c) => 'The ' + c.who + ' turned into seaweed jerky',
      (c) => c.Who + ' ' + c.v('is', 'are') + ' a lot crispier than before'
    ],
    bleached: [
      (c) => 'Your ' + c.who + ' bleached',
      (c) => c.Who + ' went white with shock',
      (c) => c.Who + ': from technicolour to ghost',
      (c) => 'The ' + c.who + ' lost ' + c.v('its', 'their') + ' colour, then ' + c.v('its', 'their') + ' life',
      (c) => 'A reef in mourning: ' + c.who
    ],
    wilted: [
      (c) => 'The ' + c.who + ' wilted',
      (c) => c.Who + ' ' + c.v('has', 'have') + ' given up and gone brown',
      (c) => 'Brown is not the new green, ' + c.who,
      (c) => 'The ' + c.who + ' melted into the gravel',
      (c) => c.Who + ': wilted, wistful, gone'
    ],
    decorWarm: [
      (c) => 'The ' + c.who + ' ' + c.v('is', 'are') + ' sweating',
      (c) => 'Too toasty for the ' + c.who,
      (c) => 'Not dead, just overheated: ' + c.who,
      (c) => c.Who + ' ' + c.v('is', 'are') + ' wilting in the warmth'
    ],
    decorCold: [
      (c) => 'The ' + c.who + ' ' + c.v('is', 'are') + ' struggling in the cold',
      (c) => 'Bit nippy for the ' + c.who,
      (c) => 'Not dead, just chilly: ' + c.who,
      (c) => c.Who + ' ' + c.v('has', 'have') + ' gone dormant and grumpy'
    ],
    driftwood: [
      () => 'Driftwood on a reef?',
      () => 'Driftwood: still wood, wrong tank',
      () => 'The driftwood is fine. The water clarity isn’t',
      () => 'The driftwood brewed your reef a cup of tea'
    ],
    eaten: [
      (c) => 'The ' + c.pred + ' had your ' + c.who + ' for lunch',
      (c) => c.Who + ': now part of the ' + c.pred,
      (c) => 'Where did the ' + c.who + ' go? Ask the ' + c.pred,
      (c) => 'The ' + c.pred + ' is suspiciously full of ' + c.who,
      (c) => 'The ' + c.pred + ' would like to thank the ' + c.who + ' for dinner'
    ],
    clownfish: [
      (c) => c.Num + '’s a crowd for clownfish',
      (c) => c.Num + ' clownfish, room for one pair',
      () => 'The clownfish pair voted the others off the anemone',
      (c) => 'Found Nemo. Lost ' + c.extra,
      () => 'Clownfish: strictly a couples’ thing'
    ],
    betta: [
      (c) => c.Num + ' bettas, one winner',
      () => 'Betta fight club had one rule',
      () => 'The bettas settled it the old-fashioned way',
      () => 'There can be only one betta',
      () => 'Siamese fighting fish did exactly what it says on the tin'
    ],
    gramma: [
      (c) => c.Num + ' royal grammas, one cave',
      () => 'Royal grammas don’t do flatmates',
      () => 'A royal feud over one rocky ledge',
      () => 'The royal grammas are squabbling over the throne'
    ],
    crowdedGeneric: [
      (c) => 'Too many ' + c.who,
      (c) => c.Who + ' can’t share'
    ],
    tangs: [
      () => 'Tang versus tang',
      (c) => c.Who + ', zero chill',
      () => 'Tangs out, scalpels out',
      () => 'It’s a tang-gle',
      () => 'Surgeonfish, meet surgeonfish'
    ],
    lonely: [
      (c) => c.Who + ' ' + c.v('is', 'are') + ' not a school',
      (c) => c.Who + ': not a school, barely a meeting',
      (c) => 'Safety in numbers? Not for ' + c.who,
      (c) => c.Who + ' ' + c.v('feels', 'feel') + ' very exposed right now',
      (c) => 'Table for six? Only ' + c.who + ' showed up'
    ],
    school: [
      (c) => 'A proper school of ' + c.who,
      (c) => c.Who + ': safety in numbers',
      (c) => 'Squad goals: ' + c.who,
      (c) => 'The ' + c.who + ' are schooling beautifully'
    ],
    nipFew: [
      () => 'Fewer tiger barbs, more nipped fins',
      (c) => 'Under six tiger barbs means more nipping for the ' + c.who,
      (c) => 'Too few barbs to chase each other, so they chased the ' + c.who,
      (c) => 'A tiny barb gang is the worst kind. Ask the ' + c.who
    ],
    nipMany: [
      () => 'The tiger barbs can’t resist those fins',
      () => 'Long fins, meet tiger barbs',
      (c) => 'Tiger barbs think the ' + c.who + ' ' + c.v('is', 'are') + ' a snack bar',
      (c) => 'Fin-nipping o’clock for the ' + c.who
    ],
    reef: [
      (c) => 'The ' + c.pred + ' is eating your reef',
      (c) => 'The ' + c.pred + ' treated the ' + c.who + ' like a buffet',
      (c) => 'Reef? More like lunch, says the ' + c.pred,
      (c) => 'Your ' + c.who + ' ' + c.v('has', 'have') + ' a ' + c.pred + ' problem',
      (c) => 'The ' + c.pred + ' is redecorating with its mouth'
    ],
    overstock: [
      () => 'Standing room only',
      () => 'It’s rush hour in here',
      () => 'Too many fish, not enough tank',
      () => 'The filter has filed a complaint',
      () => 'Sardines would find this cramped'
    ],
    blueTang: [
      () => 'Just keep swimming… somewhere bigger',
      () => 'Dory needs a bigger tank. Much bigger',
      () => 'Blue tangs dream of open reef',
      () => 'Finding Dory a bigger home'
    ],
    noAnemone: [
      () => 'No anemone for Nemo',
      () => 'Nemo is house-hunting',
      () => 'Clownfish without an anemone: possible, but sad',
      (c) => 'The ' + c.who + ' ' + c.v('has', 'have') + ' nowhere to hide'
    ],
    anemone: [
      () => 'Home sweet anemone',
      () => 'Nemo has moved in',
      () => 'Clownfish and anemone: a love story',
      () => 'The clownfish found a sting-proof sofa'
    ],
    celebrate: [
      () => 'Everyone made it!',
      () => 'A thriving tank',
      () => 'Happy fish, happy tank',
      () => 'Not a single floater',
      () => 'Nailed it. The fish agree'
    ]
  };

  function evaluate(state) {
    const tempC = typeof state.temp === 'number' ? state.temp : T.TEMPS[state.temp];
    const water = state.water;
    const random = state.random || Math.random;
    const outcomes = {};
    const issues = [];
    const positives = [];
    const fish = [];
    const decor = [];
    const used = [];

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

    // Records why a fish is stressed, so the tank can show the right status badge.
    function why(recs, reason) {
      recs.forEach((r) => {
        const o = outcomes[r.uid];
        (o.reasons = o.reasons || []).push(reason);
      });
    }

    // Random template from a pool, never repeating a template within one results panel.
    function pick(pool, c) {
      let avail = pool.filter((f) => used.indexOf(f) === -1);
      if (!avail.length) avail = pool;
      const f = avail[Math.floor(random() * avail.length)];
      used.push(f);
      return f(c);
    }

    function issue(rule, severity, pool, c, body, recs) {
      issues.push({ rule: rule, severity: severity, headline: pick(pool, c), body: body, itemIds: recs.map((r) => r.uid) });
    }

    // 1. Environment: fish, grouped by cause.
    const freshInSalt = [];
    const saltInFresh = [];
    const tooCold = [];
    const tooHot = [];
    const chilly = [];
    const warmish = [];
    fish.forEach((r) => {
      const d = r.data;
      if (d.water !== water) { (d.water === 'fresh' ? freshInSalt : saltInFresh).push(r); return; }
      const off = tempOff(d.temp, tempC);
      if (off < -2) tooCold.push(r);
      else if (off > 2) tooHot.push(r);
      else if (off < 0) chilly.push(r);
      else if (off > 0) warmish.push(r);
    });

    if (freshInSalt.length) {
      mark(freshInSalt, 'dead');
      const c = ctxFor(freshInSalt);
      issue('water', 'dead', H.freshInSalt, c,
        c.Who + ' ' + c.v('is a freshwater fish', 'are freshwater fish') + '. In salt water a freshwater fish loses water through its skin and gills faster than it can replace it, and quickly dehydrates.', freshInSalt);
    }
    if (saltInFresh.length) {
      mark(saltInFresh, 'dead');
      const c = ctxFor(saltInFresh);
      issue('water', 'dead', H.saltInFresh, c,
        c.Who + ' ' + c.v('is a marine fish', 'are marine fish') + '. In fresh water a marine fish soaks up more water than its body can pump out, and its cells can’t cope.', saltInFresh);
    }
    if (tooCold.length) {
      mark(tooCold, 'dead');
      const c = ctxFor(tooCold, { extra: { t: tempC } });
      issue('temperature', 'dead', H.tooCold, c,
        'Your tank is ' + tempC + DEG + ', but ' + c.needs('need') + '. Fish are cold-blooded, so cold water slows their bodies until they can’t feed or fight off disease.', tooCold);
    }
    if (tooHot.length) {
      mark(tooHot, 'dead');
      const c = ctxFor(tooHot, { extra: { t: tempC } });
      issue('temperature', 'dead', H.tooHot, c,
        'Your tank is ' + tempC + DEG + ', but ' + c.needs('need') + '. Warm water holds less oxygen while speeding up a fish’s metabolism, so they slowly suffocate.', tooHot);
    }
    if (chilly.length) {
      mark(chilly, 'stressed');
      why(chilly, 'cold');
      const c = ctxFor(chilly, { extra: { t: tempC } });
      issue('temperature', 'stressed', H.chilly, c,
        cap(c.needs('prefer')) + '. At ' + tempC + DEG + ' they survive, but they’re sluggish, stressed and more likely to get sick.', chilly);
    }
    if (warmish.length) {
      mark(warmish, 'stressed');
      why(warmish, 'hot');
      const c = ctxFor(warmish, { extra: { t: tempC } });
      issue('temperature', 'stressed', H.warmish, c,
        cap(c.needs('prefer')) + '. At ' + tempC + DEG + ' they survive, but warm water carries less oxygen, so they’re stressed and more likely to get sick.', warmish);
    }

    // 1. Environment: decor, grouped by cause.
    const driftInSalt = [];
    const reefInFresh = [];
    const plantInSalt = [];
    const bleached = [];
    const wilted = [];
    const decorWarm = [];
    const decorCold = [];
    decor.forEach((r) => {
      const d = r.data;
      const living = d.type === 'coral' || d.type === 'anemone';
      if (d.type === 'hardscape') { if (d.water !== water) driftInSalt.push(r); return; }
      if (d.water !== water) { (living ? reefInFresh : plantInSalt).push(r); return; }
      const off = tempOff(d.temp, tempC);
      if (Math.abs(off) > 2) (living ? bleached : wilted).push(r);
      else if (off > 0) decorWarm.push(r);
      else if (off < 0) decorCold.push(r);
    });

    if (driftInSalt.length) {
      issue('water', 'note', H.driftwood, ctxFor(driftInSalt),
        'Driftwood is harmless, but it slowly leaks tannins that tint water like tea. Reef keepers use rock instead to keep salt water crystal clear.', driftInSalt);
    }
    if (reefInFresh.length) {
      mark(reefInFresh, 'dead');
      issue('water', 'dead', H.reefInFresh, ctxFor(reefInFresh),
        'Corals and anemones are marine animals. Without salt their cells swell with water and they die within hours.', reefInFresh);
    }
    if (plantInSalt.length) {
      mark(plantInSalt, 'dead');
      issue('water', 'dead', H.plantInSalt, ctxFor(plantInSalt),
        'Freshwater plants can’t draw water in from salty surroundings, so they shrivel and turn brown.', plantInSalt);
    }
    if (bleached.length) {
      mark(bleached, 'dead');
      const c = ctxFor(bleached);
      issue('temperature', 'dead', H.bleached, c,
        'Your tank is ' + tempC + DEG + ', but ' + c.needs('need') + '. Under that stress corals spit out the tiny algae that live in them and give them food and colour, leaving a white skeleton.', bleached);
    }
    if (wilted.length) {
      mark(wilted, 'dead');
      const c = ctxFor(wilted);
      issue('temperature', 'dead', H.wilted, c,
        'Your tank is ' + tempC + DEG + ', but ' + c.needs('need') + '. Too far outside that range, the leaves yellow, brown and melt away.', wilted);
    }
    if (decorWarm.length) {
      mark(decorWarm, 'stressed');
      const c = ctxFor(decorWarm);
      const marimo = decorWarm.some((r) => r.id === 'moss-ball') ? ' Marimo come from cool lakes, so in warm water they slowly turn brown and fall apart.' : '';
      issue('temperature', 'stressed', H.decorWarm, c,
        cap(c.needs('prefer')) + '. At ' + tempC + DEG + ' they hang on, but lose colour and stop growing.' + marimo, decorWarm);
    }
    if (decorCold.length) {
      mark(decorCold, 'stressed');
      const c = ctxFor(decorCold);
      issue('temperature', 'stressed', H.decorCold, c,
        cap(c.needs('prefer')) + '. At ' + tempC + DEG + ' they hang on, but growth stalls and older leaves die back.', decorCold);
    }

    // 2–3. Predation among survivors, one card per predator species.
    const live = fish.filter(alive);
    const preds = live.filter((r) => r.data.mouthSize > 0);
    if (preds.length) {
      const byPred = {};
      const predKeys = [];
      let rr = 0;
      live.forEach((prey) => {
        const able = preds.filter((p) => p.id !== prey.id && prey.data.size <= p.data.mouthSize);
        if (!able.length) return;
        const p = able[rr++ % able.length];
        mark([prey], 'eaten', { eatenBy: p.uid });
        if (!byPred[p.id]) { byPred[p.id] = { pred: p.data, prey: [], preds: [] }; predKeys.push(p.id); }
        byPred[p.id].prey.push(prey);
        if (byPred[p.id].preds.indexOf(p) === -1) byPred[p.id].preds.push(p);
      });
      predKeys.forEach((k) => {
        const g = byPred[k];
        const c = ctxFor(g.prey, { extra: { pred: g.pred.short } });
        issue('predation', 'dead', H.eaten, c,
          g.pred.predationBody || ('The ' + g.pred.short + ' eats any fish small enough to fit in its mouth.'), g.prey.concat(g.preds));
      });
    }

    // 4. Territorial: each species has its own reason, so one card per species.
    groupBy(fish.filter(alive)).forEach((recs) => {
      const d = recs[0].data;
      const n = recs.length;
      if (!d.maxSameSpecies || n <= d.maxSameSpecies) return;
      const extras = recs.slice(d.maxSameSpecies);
      const sev = d.overLimit || 'stressed';
      mark(extras, sev);
      why(extras, 'territorial');
      const c = ctxFor(recs, { plural: true, extra: { Num: numWord(n), extra: extras.length === 1 ? 'one other' : numWord(extras.length).toLowerCase() + ' others' } });
      let pool = H.crowdedGeneric;
      let body = cap(d.plural) + ' don’t tolerate more than ' + d.maxSameSpecies + ' of their own kind.';
      if (d.id === 'clownfish') {
        pool = H.clownfish;
        body = 'Clownfish live as a single pair, and that pair will chase and fight other clownfish until they die.';
      } else if (d.id === 'betta') {
        pool = H.betta;
        body = 'Male bettas are bred to fight, which is why they’re called Siamese fighting fish. Put two together and they battle until one dies.';
      } else if (d.id === 'royal-gramma') {
        pool = H.gramma;
        body = 'Royal grammas fiercely guard a cave or ledge against their own kind. In a typical home tank, keep just one.';
      }
      issue('territorial', sev, pool, c, body, sev === 'dead' ? extras : recs);
    });

    const tangs = fish.filter((r) => alive(r) && r.data.isTang);
    if (tangs.length > 1) {
      mark(tangs, 'stressed');
      why(tangs, 'territorial');
      issue('territorial', 'stressed', H.tangs, ctxFor(tangs, { counts: true }),
        'Tangs are fiercely territorial with other tangs and fight with the scalpel-sharp spine by their tail. A home aquarium has room for one tang at most.', tangs);
    }

    // 5. Schooling: every under-sized school shares one card.
    const lonely = [];
    const schools = [];
    groupBy(fish.filter(alive)).forEach((recs) => {
      const d = recs[0].data;
      if (!d.schoolMin) return;
      if (recs.length < d.schoolMin) { mark(recs, 'stressed'); why(recs, 'lonely'); lonely.push.apply(lonely, recs); }
      else schools.push.apply(schools, recs);
    });
    if (lonely.length) {
      const c = ctxFor(lonely, { counts: true });
      const species = ctxFor(lonely, { plural: true });
      const min = Math.max.apply(null, c.groups.map((g) => g[0].data.schoolMin));
      issue('schooling', 'stressed', H.lonely, c,
        species.Who + ' are schooling fish and only feel safe in a crowd. With fewer than ' + min + ' they hide, lose colour and stay stressed.', lonely);
    }
    if (schools.length) {
      positives.push({ rule: 'schooling', headline: pick(H.school, ctxFor(schools, { plural: true })),
        body: 'In a big enough group, schooling fish feel safe enough to swim out in the open and show off their colours.',
        itemIds: schools.map((r) => r.uid) });
    }

    // 6. Fin nipping
    const nippers = fish.filter((r) => alive(r) && r.data.finNipper);
    const longs = fish.filter((r) => alive(r) && r.data.longFins);
    if (nippers.length && longs.length) {
      mark(longs, 'stressed');
      why(longs, 'finNipped');
      const c = ctxFor(longs);
      if (nippers.length < 6) {
        issue('finNipping', 'stressed', H.nipFew, c,
          'Tiger barbs nip long, flowing fins like those of the ' + c.who + '. In a group under six it gets worse: with no school to chase, they turn on their tankmates.', longs.concat(nippers));
      } else {
        issue('finNipping', 'stressed', H.nipMany, c,
          'Even in a proper group, tiger barbs nip slow fish with long, flowing fins like the ' + c.who + '. Keep them with fast, short-finned tankmates.', longs.concat(nippers));
      }
    }

    // 7. Not reef-safe
    const pickers = fish.filter((r) => alive(r) && r.data.reefSafe === false);
    const reef = decor.filter((r) => (r.data.type === 'coral' || r.data.type === 'anemone') && status(r) !== 'dead');
    if (pickers.length && reef.length) {
      mark(reef, 'damaged');
      issue('reefSafe', 'stressed', H.reef, ctxFor(reef, { extra: { pred: pickers[0].data.short } }),
        'Copperband butterflyfish pick at coral polyps and anemones. Reef keepers sometimes add one to clear out pest anemones, then regret it when it starts on the corals.', reef.concat(pickers));
    }

    // 8. Overstocking
    const stocked = fish.filter(alive);
    const load = stocked.reduce((sum, r) => sum + r.data.bioload, 0);
    if (load > T.CAPACITY) {
      mark(stocked, 'stressed');
      why(stocked, 'overstock');
      const pct = Math.round((load / T.CAPACITY) * 100);
      const goldfish = stocked.filter((r) => r.id === 'goldfish').length;
      const big = stocked.filter((r) => r.data.size >= 20).length;
      const extra = goldfish >= 2 ? ', and goldfish are famously messy' : big ? ', and big fish make big messes' : '';
      issue('overstock', 'stressed', H.overstock, ctxFor(stocked),
        'Fish waste breaks down into toxic ammonia. This tank holds about ' + pct + '% of what a typical 200-litre aquarium can handle' + extra + ', so the water turns bad for everyone.', stocked);
    }

    // 9. Notes
    const blue = fish.filter((r) => r.id === 'blue-tang');
    if (blue.length) {
      issue('tankSize', 'note', H.blueTang, ctxFor(blue),
        'Blue tangs grow to 30 cm and cruise long stretches of reef every day, so experts recommend tanks of well over 500 litres. After Finding Dory, conservationists worried about demand for wild-caught blue tangs, which are rarely bred in captivity.', blue);
    }
    const clowns = fish.filter((r) => r.id === 'clownfish' && alive(r));
    const anemones = decor.filter((r) => r.id === 'anemone' && status(r) === 'ok');
    if (clowns.length) {
      if (anemones.length) {
        positives.push({ rule: 'anemone', headline: pick(H.anemone, ctxFor(clowns)),
          body: 'A protective slime coat lets clownfish hide among stinging tentacles, and in return they clean the anemone and feed it scraps.',
          itemIds: clowns.concat(anemones).map((r) => r.uid) });
      } else {
        issue('anemone', 'note', H.noAnemone, ctxFor(clowns),
          'Clownfish cope without one in an aquarium, but in the wild they never live without a host anemone to hide in.', clowns);
      }
    }

    issues.sort((a, b) => SEV[a.severity] - SEV[b.severity]);

    // One status badge per fish: the most severe of its problems.
    fish.forEach((r) => {
      const o = outcomes[r.uid];
      const rs = o.reasons || [];
      if (o.status === 'dead' || o.status === 'eaten') o.badge = 'dead';
      else if (o.status === 'stressed') o.badge = BADGE_PRIORITY.find((p) => rs.indexOf(p) !== -1) || 'stressed';
      else o.badge = null;
    });

    let celebration = null;
    const anyBad = fish.concat(decor).some((r) => status(r) !== 'ok');
    if (!anyBad && fish.length) {
      const schooling = fish.some((r) => r.data.schoolMin);
      celebration = {
        headline: pick(H.celebrate, {}),
        body: 'Every fish here is at home in ' + water + ' water at ' + tempC + DEG + ', nobody fits in anyone else’s mouth, ' +
          (schooling ? 'the schooling fish have the numbers they need, ' : '') + 'and there’s enough room and filtration for everyone.'
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

  T.Rules = { evaluate: evaluate, HEADLINES: H };
})(window.Tank);
