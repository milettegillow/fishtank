window.Tank = window.Tank || {};

(function (T) {
  'use strict';

  // Tank temperature settings in °C.
  T.TEMPS = { cold: 18, warm: 22, tropical: 26 };

  // Total bioload a typical ~200 litre home aquarium can carry.
  T.CAPACITY = 80;

  T.SPECIES = [
    {
      id: 'clownfish', name: 'Clownfish', short: 'clownfish', plural: 'clownfish',
      latin: 'Amphiprion ocellaris', water: 'salt', temp: [24, 28], size: 8, mouthSize: 0,
      temperament: 'Peaceful, but defends its anemone',
      maxSameSpecies: 2, overLimit: 'dead', schoolMin: null, longFins: false, finNipper: false,
      reefSafe: true, isTang: false, bioload: 5, swim: ['normal'],
      diet: 'Omnivore: plankton, small crustaceans and algae',
      groupNeeds: 'A single pair at most',
      fact: 'Clownfish are all born male. If the female of a pair dies, her mate changes sex and takes her place.',
      display: 66, speed: 55, anim: { wag: 9, tail: 9, fin: 14 }
    },
    {
      id: 'blue-tang', name: 'Blue tang', short: 'blue tang', plural: 'blue tangs',
      latin: 'Paracanthurus hepatus', water: 'salt', temp: [24, 27], size: 30, mouthSize: 0,
      temperament: 'Peaceful, but fights other tangs',
      maxSameSpecies: null, schoolMin: null, longFins: false, finNipper: false,
      reefSafe: true, isTang: true, bioload: 25, swim: ['dart'],
      diet: 'Mostly algae, plus some plankton',
      groupNeeds: 'One tang per tank, and a very large tank',
      fact: 'Dory from Finding Nemo is a blue tang. Tangs are nicknamed surgeonfish for the scalpel-sharp spine on each side of the tail.',
      display: 140, speed: 75, anim: { wag: 7, tail: 7, fin: 12 }
    },
    {
      id: 'yellow-tang', name: 'Yellow tang', short: 'yellow tang', plural: 'yellow tangs',
      latin: 'Zebrasoma flavescens', water: 'salt', temp: [24, 27], size: 20, mouthSize: 0,
      temperament: 'Semi-aggressive, fights other tangs',
      maxSameSpecies: null, schoolMin: null, longFins: false, finNipper: false,
      reefSafe: true, isTang: true, bioload: 15, swim: ['dart'],
      diet: 'Herbivore: grazes algae all day',
      groupNeeds: 'One tang per tank',
      fact: 'At night a yellow tang fades and a pale stripe appears along its side. By morning its full yellow is back.',
      display: 108, speed: 70, anim: { wag: 7, tail: 7, fin: 12 }
    },
    {
      id: 'lionfish', name: 'Lionfish', short: 'lionfish', plural: 'lionfish',
      latin: 'Pterois volitans', water: 'salt', temp: [24, 28], size: 38, mouthSize: 12,
      temperament: 'Predatory; venomous spines',
      maxSameSpecies: null, schoolMin: null, longFins: false, finNipper: false,
      reefSafe: true, isTang: false, bioload: 30, swim: ['hover'],
      diet: 'Carnivore: small fish and crustaceans',
      groupNeeds: 'Fine alone; only with fish too big to swallow',
      predationBody: 'Lionfish are ambush hunters that swallow whole any fish that fits in their mouth. Anything under about 12 cm is food, not a tankmate.',
      fact: 'Lionfish spines carry a venom that is very painful to people. In the Atlantic and Caribbean, where they were introduced, they are one of the worst invasive species on reefs.',
      display: 150, speed: 16, anim: { wag: 3, tail: 6, fin: 8 }
    },
    {
      id: 'copperband', name: 'Copperband butterflyfish', short: 'copperband', plural: 'copperbands',
      latin: 'Chelmon rostratus', water: 'salt', temp: [24, 27], size: 20, mouthSize: 0,
      temperament: 'Peaceful with fish',
      maxSameSpecies: null, schoolMin: null, longFins: false, finNipper: false,
      reefSafe: false, isTang: false, bioload: 12, swim: ['normal'],
      diet: 'Small invertebrates picked from rock and coral',
      groupNeeds: 'Fine alone; not with corals or anemones',
      fact: 'The black eyespot near its tail makes predators guess the wrong end. Its long snout plucks food out of narrow cracks in rock and coral.',
      display: 104, speed: 40, anim: { wag: 6, tail: 7, fin: 10 }
    },
    {
      id: 'royal-gramma', name: 'Royal gramma', short: 'royal gramma', plural: 'royal grammas',
      latin: 'Gramma loreto', water: 'salt', temp: [24, 27], size: 8, mouthSize: 0,
      temperament: 'Peaceful, territorial with its own kind',
      maxSameSpecies: 1, overLimit: 'stressed', schoolMin: null, longFins: false, finNipper: false,
      reefSafe: true, isTang: false, bioload: 5, swim: ['normal'],
      diet: 'Carnivore: zooplankton',
      groupNeeds: 'Keep just one',
      fact: 'Royal grammas often swim upside down under ledges, keeping their belly towards the nearest surface. Males build nests from bits of algae.',
      display: 62, speed: 45, anim: { wag: 8, tail: 9, fin: 12 }
    },
    {
      id: 'neon-tetra', name: 'Neon tetra', short: 'neon tetra', plural: 'neon tetras',
      latin: 'Paracheirodon innesi', water: 'fresh', temp: [20, 26], size: 3, mouthSize: 0,
      temperament: 'Peaceful',
      maxSameSpecies: null, schoolMin: 6, longFins: false, finNipper: false,
      reefSafe: null, isTang: false, bioload: 2, swim: ['school'],
      diet: 'Omnivore: tiny insects, larvae and plant matter',
      groupNeeds: 'A school of 6 or more',
      fact: 'Its blue stripe is not pigment but light bouncing off tiny crystal-like plates in the skin. At night the stripe dims while the fish rests.',
      display: 36, speed: 60, anim: { wag: 12, tail: 10, fin: 0 }
    },
    {
      id: 'betta', name: 'Betta', short: 'betta', plural: 'bettas',
      latin: 'Betta splendens', water: 'fresh', temp: [24, 30], size: 7, mouthSize: 0,
      temperament: 'Aggressive to other male bettas',
      maxSameSpecies: 1, overLimit: 'dead', schoolMin: null, longFins: true, finNipper: false,
      reefSafe: null, isTang: false, bioload: 4, swim: ['normal'],
      diet: 'Carnivore: insects and their larvae',
      groupNeeds: 'One male per tank',
      fact: 'Bettas have a labyrinth organ that lets them gulp air at the surface, which helps them survive in shallow, oxygen-poor rice paddies.',
      display: 86, speed: 30, anim: { wag: 3.5, tail: 6, fin: 8 }
    },
    {
      id: 'angelfish', name: 'Angelfish', short: 'angelfish', plural: 'angelfish',
      latin: 'Pterophyllum scalare', water: 'fresh', temp: [24, 30], size: 15, mouthSize: 4,
      temperament: 'Semi-aggressive; eats very small fish',
      maxSameSpecies: null, schoolMin: null, longFins: true, finNipper: false,
      reefSafe: null, isTang: false, bioload: 8, swim: ['normal'],
      diet: 'Omnivore: small fish, insects and crustaceans',
      groupNeeds: 'Fine alone or in a small group; not with tiny fish',
      predationBody: 'Angelfish are cichlids that hunt small fish in the wild. A grown angelfish picks off neon tetras one by one, even though both come from South American rivers.',
      fact: 'Wild angelfish live among flooded roots and reeds in the Amazon, where their tall, flat bodies and dark bars help them disappear.',
      display: 92, speed: 32, anim: { wag: 4, tail: 6, fin: 6 }
    },
    {
      id: 'tiger-barb', name: 'Tiger barb', short: 'tiger barb', plural: 'tiger barbs',
      latin: 'Puntigrus tetrazona', water: 'fresh', temp: [23, 27], size: 7, mouthSize: 0,
      temperament: 'Semi-aggressive fin nipper',
      maxSameSpecies: null, schoolMin: 6, longFins: false, finNipper: true,
      reefSafe: null, isTang: false, bioload: 4, swim: ['school'],
      diet: 'Omnivore: insects, worms and plants',
      groupNeeds: 'A school of 6 or more; not with long-finned fish',
      fact: 'Tiger barbs come from Sumatra and Borneo. In a group of six or more they mostly chase each other, which keeps them off their tankmates.',
      display: 54, speed: 70, anim: { wag: 11, tail: 10, fin: 12 }
    },
    {
      id: 'corydoras', name: 'Corydoras', short: 'corydoras', plural: 'corydoras',
      latin: 'Corydoras aeneus', water: 'fresh', temp: [22, 26], size: 6, mouthSize: 0,
      temperament: 'Peaceful',
      maxSameSpecies: null, schoolMin: 6, longFins: false, finNipper: false,
      reefSafe: null, isTang: false, bioload: 3, swim: ['school', 'bottom'],
      diet: 'Omnivore: scavenges worms and larvae from the bottom',
      groupNeeds: 'A group of 6 or more',
      fact: 'Corydoras can dart to the surface for a gulp of air and absorb the oxygen through their gut. They sometimes seem to wink by rolling their eyes downwards.',
      display: 52, speed: 34, anim: { wag: 9, tail: 9, fin: 14 }
    },
    {
      id: 'goldfish', name: 'Goldfish', short: 'goldfish', plural: 'goldfish',
      latin: 'Carassius auratus', water: 'fresh', temp: [10, 22], size: 20, mouthSize: 0,
      temperament: 'Peaceful',
      maxSameSpecies: null, schoolMin: null, longFins: false, finNipper: false,
      reefSafe: null, isTang: false, bioload: 25, swim: ['normal'],
      diet: 'Omnivore: plants, insects and almost anything else',
      groupNeeds: 'Fine in groups, given plenty of space',
      fact: 'Goldfish were bred from wild carp in China more than a thousand years ago. With good care they can live for over 20 years.',
      display: 96, speed: 34, anim: { wag: 4.5, tail: 8, fin: 12 }
    }
  ];

  T.DECOR = [
    {
      id: 'anemone', name: 'Anemone', short: 'anemone', plural: 'anemones',
      latin: 'Heteractis magnifica', water: 'salt', temp: [24, 28], type: 'anemone', display: 128,
      fact: 'An anemone is an animal, not a plant: its tentacles fire tiny stinging cells to catch food. Clownfish build up a slime coat that stops the stings.'
    },
    {
      id: 'brain-coral', name: 'Brain coral', short: 'brain coral', plural: 'brain corals',
      latin: 'Diploria labyrinthiformis', water: 'salt', temp: [24, 28], type: 'coral', display: 116,
      fact: 'Each brain coral is a colony of thousands of tiny polyps, and large ones can be several hundred years old.'
    },
    {
      id: 'staghorn-coral', name: 'Staghorn coral', short: 'staghorn coral', plural: 'staghorn corals',
      latin: 'Acropora cervicornis', water: 'salt', temp: [24, 28], type: 'coral', display: 140,
      fact: 'Staghorn is one of the fastest-growing corals, adding 10 to 20 cm a year, yet it is now critically endangered in the Caribbean.'
    },
    {
      id: 'sea-fan', name: 'Sea fan', short: 'sea fan', plural: 'sea fans',
      latin: 'Gorgonia ventalina', water: 'salt', temp: [24, 28], type: 'coral', display: 124,
      fact: 'Sea fans grow across the current so their lattice can catch as much drifting plankton as possible.'
    },
    {
      id: 'java-fern', name: 'Java fern', short: 'java fern', plural: 'java ferns',
      latin: 'Microsorum pteropus', water: 'fresh', temp: [20, 28], type: 'plant', display: 110,
      fact: 'Java fern grows on rocks and wood rather than in gravel. Bury its creeping stem and it rots.'
    },
    {
      id: 'amazon-sword', name: 'Amazon sword', short: 'Amazon sword', plural: 'Amazon swords',
      latin: 'Echinodorus grisebachii', water: 'fresh', temp: [22, 28], type: 'plant', display: 140,
      fact: 'Amazon swords are heavy root feeders, so they grow best with plenty of nutrients in the gravel.'
    },
    {
      id: 'driftwood', name: 'Driftwood', short: 'driftwood', plural: 'driftwood',
      latin: null, water: 'fresh', temp: null, type: 'hardscape', display: 220,
      fact: 'Driftwood slowly releases tannins that tint the water like tea and gently lower the pH, much like a blackwater river.'
    },
    {
      id: 'moss-ball', name: 'Moss ball', short: 'moss ball', plural: 'moss balls',
      latin: 'Aegagropila linnaei', water: 'fresh', temp: [18, 24], type: 'plant', display: 54,
      fact: 'Marimo moss balls are not moss at all but a rare form of algae that rolls along cool lake beds, such as Lake Akan in Japan.'
    }
  ];

  T.speciesById = {};
  T.SPECIES.forEach(function (s) { T.speciesById[s.id] = s; });
  T.decorById = {};
  T.DECOR.forEach(function (d) { T.decorById[d.id] = d; });
})(window.Tank);
