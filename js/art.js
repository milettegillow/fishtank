window.Tank = window.Tank || {};

// Inline SVG art. Every fish faces right; its tail is a <g class="tail"> pivoting at the tail base.
// Each render gets unique gradient/clip ids so many copies can share the page.
(function (T) {
  'use strict';

  let seq = 0;
  const r1 = (v) => Math.round(v * 10) / 10;
  const pt = (p) => r1(p[0]) + ',' + r1(p[1]);

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function stops(list) {
    return list.map((s) => '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : '') + '/>').join('');
  }
  function lin(id, x1, y1, x2, y2, list, user) {
    return '<linearGradient id="' + id + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' +
      (user ? ' gradientUnits="userSpaceOnUse"' : '') + '>' + stops(list) + '</linearGradient>';
  }
  const vg = (id, list) => lin(id, 0, 0, 0, 1, list);
  function rad(id, cx, cy, r, list) {
    return '<radialGradient id="' + id + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '">' + stops(list) + '</radialGradient>';
  }
  function eye(x, y, r, iris) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + (iris || '#f1ede2') + '"/>' +
      '<circle cx="' + r1(x + r * 0.12) + '" cy="' + y + '" r="' + r1(r * 0.62) + '" fill="#101820"/>' +
      '<circle cx="' + r1(x + r * 0.34) + '" cy="' + r1(y - r * 0.3) + '" r="' + r1(r * 0.22) + '" fill="#fff" opacity=".9"/>';
  }
  const tail = (x, y, inner) => '<g class="tail" style="transform-origin:' + x + 'px ' + y + 'px">' + inner + '</g>';
  const fin = (x, y, inner) => '<g class="fin" style="transform-origin:' + x + 'px ' + y + 'px">' + inner + '</g>';
  function sway(x, y, inner, dur, delay, cls) {
    return '<g class="sway' + (cls ? ' ' + cls : '') + '" style="transform-origin:' + r1(x) + 'px ' + r1(y) + 'px;animation-duration:' +
      dur.toFixed(2) + 's;animation-delay:-' + delay.toFixed(2) + 's">' + inner + '</g>';
  }
  function striped(x1, y1, x2, y2, w, light, dark) {
    const d = 'M' + r1(x1) + ',' + r1(y1) + ' L' + r1(x2) + ',' + r1(y2);
    return '<path d="' + d + '" stroke="' + light + '" stroke-width="' + w + '" stroke-linecap="round"/>' +
      '<path d="' + d + '" stroke="' + dark + '" stroke-width="' + w + '" stroke-dasharray="5 5"/>';
  }

  const FISH = {};
  const DECOR = {};

  FISH.clownfish = (u) => {
    const B = 'M52,55 C60,26 108,16 150,20 C180,23 196,40 197,56 C196,72 180,88 150,90 C108,94 60,84 52,55Z';
    const ink = '#1b1714';
    const wh = '#fbfaf6';
    return { w: 200, h: 110, body:
      '<defs>' + vg('g' + u, [[0, '#ffa04a'], [0.55, '#f46a14'], [1, '#d6500b']]) + '<clipPath id="c' + u + '"><path d="' + B + '"/></clipPath></defs>' +
      tail(54, 55,
        '<path d="M56,55 C44,42 30,32 12,28 C19,44 19,66 12,82 C30,78 44,68 56,55Z" fill="url(#g' + u + ')"/>' +
        '<path d="M12,28 C19,44 19,66 12,82 L18,80 C24,64 24,46 18,30Z" fill="' + ink + '"/>') +
      '<path d="M82,32 C88,10 106,6 118,20 C126,8 146,6 160,24 L150,32 L86,38Z" fill="url(#g' + u + ')" stroke="' + ink + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M100,84 C104,100 122,104 132,88Z" fill="url(#g' + u + ')" stroke="' + ink + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M146,84 C146,98 154,106 162,92Z" fill="#f46a14" stroke="' + ink + '" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="' + B + '" fill="url(#g' + u + ')"/>' +
      '<g clip-path="url(#c' + u + ')">' +
        '<path d="M141,10 C133,40 133,72 141,100 L165,100 C157,72 157,40 165,10Z" fill="' + ink + '"/>' +
        '<path d="M145,10 C137,40 137,72 145,100 L161,100 C153,72 153,40 161,10Z" fill="' + wh + '"/>' +
        '<path d="M96,8 C104,40 104,72 96,102 L120,102 C128,72 128,40 120,8Z" fill="' + ink + '"/>' +
        '<path d="M100,8 C108,40 108,72 100,102 L116,102 C124,72 124,40 116,8Z" fill="' + wh + '"/>' +
        '<path d="M56,28 C61,44 61,66 56,82 L73,82 C78,66 78,44 73,28Z" fill="' + ink + '"/>' +
        '<path d="M59,28 C64,44 64,66 59,82 L70,82 C75,66 75,44 70,28Z" fill="' + wh + '"/>' +
        '<ellipse cx="128" cy="94" rx="76" ry="16" fill="#8a3006" opacity=".16"/>' +
        '<ellipse cx="138" cy="28" rx="52" ry="8" fill="#fff" opacity=".16"/>' +
      '</g>' +
      fin(152, 62, '<path d="M152,60 C140,64 134,76 138,86 C148,84 158,74 160,64Z" fill="#ff8a33" stroke="' + ink + '" stroke-width="2"/>') +
      eye(177, 47, 6.5) +
      '<path d="M191,63 Q195,64 197,60" stroke="#8a3208" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
    };
  };

  FISH['blue-tang'] = (u) => {
    const B = 'M56,72 C66,34 112,18 160,24 C196,29 216,52 219,72 C216,92 196,114 160,120 C112,126 66,110 56,72Z';
    const ink = '#11152a';
    return { w: 230, h: 140, body:
      '<defs>' + vg('g' + u, [[0, '#4282f2'], [0.55, '#2258d2'], [1, '#163c9a']]) + '<clipPath id="c' + u + '"><path d="' + B + '"/></clipPath></defs>' +
      tail(58, 72,
        '<path d="M60,72 C50,58 36,44 14,38 C23,58 23,86 14,106 C36,100 50,86 60,72Z" fill="#ffd23a"/>' +
        '<path d="M60,72 C50,58 36,44 14,38 L21,37 C40,44 52,57 63,70Z" fill="' + ink + '"/>' +
        '<path d="M60,72 C50,86 36,100 14,106 L21,107 C40,100 52,87 63,74Z" fill="' + ink + '"/>') +
      '<path d="M66,52 C84,22 136,8 192,30 L186,40 C138,24 96,32 70,60Z" fill="#1b3f9a" stroke="#0c1530" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M70,92 C90,118 140,130 182,114 L176,106 C138,118 98,112 76,86Z" fill="#1b3f9a" stroke="#0c1530" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="' + B + '" fill="url(#g' + u + ')"/>' +
      '<g clip-path="url(#c' + u + ')">' +
        '<path d="M206,60 C190,42 152,34 118,42 C92,48 74,58 56,72 C80,66 96,63 110,64 C100,74 106,90 124,93 C142,96 158,88 163,76 C154,82 140,84 132,78 C122,70 128,57 148,53 C168,49 190,54 206,64Z" fill="' + ink + '"/>' +
        '<ellipse cx="150" cy="110" rx="62" ry="10" fill="#6aa4ff" opacity=".25"/>' +
        '<ellipse cx="160" cy="32" rx="40" ry="6" fill="#fff" opacity=".14"/>' +
      '</g>' +
      fin(172, 82, '<path d="M172,80 C158,86 152,98 156,108 C166,104 176,94 178,82Z" fill="#ffd23a"/>') +
      eye(196, 60, 7) +
      '<path d="M212,78 Q217,77 219,73" stroke="#0c1530" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
    };
  };

  FISH['yellow-tang'] = (u) => {
    const B = 'M52,90 C56,52 92,30 128,32 C150,34 166,50 176,66 L195,82 C197,86 195,90 191,92 L176,102 C166,126 146,146 120,148 C88,150 56,128 52,90Z';
    return { w: 200, h: 180, body:
      '<defs>' + vg('g' + u, [[0, '#ffe54d'], [0.5, '#ffd21a'], [1, '#f0b305']]) + '<clipPath id="c' + u + '"><path d="' + B + '"/></clipPath></defs>' +
      tail(54, 90,
        '<path d="M56,90 C46,76 32,66 12,62 C20,80 20,100 12,118 C32,114 46,104 56,90Z" fill="#ffd21a"/>' +
        '<path d="M50,90 C42,80 32,74 20,72 C24,84 24,96 20,108 C32,106 42,100 50,90Z" fill="#ffe36a" opacity=".6"/>') +
      '<path d="M58,86 C58,46 88,8 126,8 C146,10 158,24 160,44 L118,62Z" fill="#ffda2e"/>' +
      '<path d="M58,94 C58,134 88,172 124,172 C144,170 154,158 154,138 L118,120Z" fill="#ffda2e"/>' +
      '<path d="M74,60 C90,30 110,18 130,16 M84,122 C98,150 116,162 134,164" stroke="#f0b305" stroke-width="1.4" fill="none" opacity=".6"/>' +
      '<path d="' + B + '" fill="url(#g' + u + ')"/>' +
      '<g clip-path="url(#c' + u + ')">' +
        '<ellipse cx="118" cy="56" rx="46" ry="14" fill="#fff" opacity=".2"/>' +
        '<ellipse cx="110" cy="146" rx="60" ry="14" fill="#c98a00" opacity=".18"/>' +
      '</g>' +
      '<path d="M62,88 L78,85 L64,93Z" fill="#fffbe8"/>' +
      fin(150, 98, '<path d="M152,96 C140,100 134,112 138,120 C148,116 156,106 158,98Z" fill="#ffe874" opacity=".9"/>') +
      eye(162, 64, 6.5) +
      '<path d="M190,90 Q194,90 196,86" stroke="#a87800" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
    };
  };

  FISH.lionfish = (u) => {
    const B = 'M60,100 C70,74 118,62 168,66 C200,69 224,86 230,100 C224,114 202,126 170,130 C120,134 72,124 60,100Z';
    const red = '#9a1f1c';
    const cream = '#f8eadf';
    function fan(bx, by, a0, a1, n, len, op, col) {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const a = (a0 + ((a1 - a0) * i) / (n - 1)) * Math.PI / 180;
        const L = len * (0.82 + 0.18 * Math.sin((Math.PI * i) / (n - 1)));
        pts.push([bx + Math.cos(a) * L, by + Math.sin(a) * L]);
      }
      let edge = 'M' + bx + ',' + by;
      let rays = '';
      pts.forEach((p, i) => {
        if (i === 0) edge += ' L' + pt(p);
        else {
          const q = pts[i - 1];
          const c = [bx + ((p[0] + q[0]) / 2 - bx) * 0.86, by + ((p[1] + q[1]) / 2 - by) * 0.86];
          edge += ' Q' + pt(c) + ' ' + pt(p);
        }
        rays += striped(bx, by, p[0], p[1], 2.6, cream, red);
      });
      return '<path d="' + edge + 'Z" fill="' + col + '" opacity="' + op + '"/>' + rays;
    }
    let spines = '';
    let membrane = 'M92,76';
    for (let i = 0; i < 12; i++) {
      const x = 92 + i * 8.5;
      const by = 74 - Math.sin((i / 11) * Math.PI) * 6;
      const tx = x - 10 - i * 0.6;
      const ty = 12 + Math.abs(i - 3.5) * 3.2 + (i % 2) * 5;
      spines += striped(x, by, tx, ty, 3.6, cream, red);
      membrane += ' L' + r1(x + (tx - x) * 0.45) + ',' + r1(by + (ty - by) * 0.45);
    }
    membrane += ' L190,74Z';
    let stripes = '';
    for (let i = 0; i < 13; i++) {
      const x = 66 + i * 13;
      const w = i % 2 ? 4 : 7;
      stripes += '<path d="M' + x + ',56 L' + (x + w) + ',56 L' + (x + w - 8) + ',146 L' + (x - 8) + ',146Z" fill="' + (i % 2 ? '#d77a66' : red) + '"/>';
    }
    let dots = '';
    [20, 32, 44].forEach((r) => {
      for (let k = -2; k <= 2; k++) {
        const a = (180 + k * 15) * Math.PI / 180;
        dots += '<circle cx="' + r1(64 + Math.cos(a) * r) + '" cy="' + r1(100 + Math.sin(a) * r) + '" r="2.2" fill="' + red + '" opacity=".8"/>';
      }
    });
    return { w: 240, h: 200, body:
      '<defs>' + vg('g' + u, [[0, '#fbefe6'], [1, '#e9d2c4']]) + '<clipPath id="c' + u + '"><path d="' + B + '"/></clipPath></defs>' +
      fin(150, 100, fan(150, 100, 185, 240, 9, 82, 0.5, '#f0c9b8')) +
      '<path d="' + membrane + '" fill="#e9c6b8" opacity=".55"/>' + spines +
      '<path d="M70,92 C72,74 86,68 96,74 L92,88Z" fill="#f0c9b8" opacity=".75"/>' +
      '<path d="M86,118 C88,136 100,144 112,142 L110,124Z" fill="#f0c9b8" opacity=".8"/>' +
      tail(62, 100, '<path d="M64,100 C54,84 38,74 16,72 C10,90 10,110 16,128 C38,126 54,116 64,100Z" fill="' + cream + '" opacity=".85"/>' + dots) +
      '<path d="' + B + '" fill="url(#g' + u + ')"/>' +
      '<g clip-path="url(#c' + u + ')">' + stripes +
        '<ellipse cx="150" cy="128" rx="80" ry="12" fill="#5a0e0e" opacity=".18"/></g>' +
      '<path d="M200,84 C198,72 202,64 207,60" stroke="' + red + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      eye(206, 92, 7, '#d84a3a') +
      '<path d="M224,106 Q229,104 230,100" stroke="#5a0e0e" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
      '<path d="M140,124 C136,146 124,160 108,168 C118,152 124,140 126,126Z" fill="#c2392d" opacity=".85"/>' +
      fin(152, 108, fan(152, 108, 105, 185, 11, 90, 0.6, '#f3d3c4'))
    };
  };

  FISH.copperband = (u) => {
    const B = 'M56,86 C58,46 94,26 130,30 C156,33 172,52 180,72 L221,82 C224,84 224,88 221,90 L180,98 C172,120 156,138 130,142 C94,146 58,126 56,86Z';
    const D = 'M60,80 C56,52 74,24 104,18 C120,16 136,22 146,34 L120,60Z';
    const A = 'M60,92 C58,120 76,146 104,152 C120,154 134,148 142,136 L120,116Z';
    const dark = '#2b221c';
    const cu = '#e07b2c';
    function band(x0, x1, slant) {
      return '<path d="M' + (x0 - 3) + ',0 L' + (x1 + 3) + ',0 L' + (x1 + 3 + slant) + ',170 L' + (x0 - 3 + slant) + ',170Z" fill="' + dark + '"/>' +
        '<path d="M' + x0 + ',0 L' + x1 + ',0 L' + (x1 + slant) + ',170 L' + (x0 + slant) + ',170Z" fill="' + cu + '"/>';
    }
    return { w: 230, h: 170, body:
      '<defs>' + vg('g' + u, [[0, '#ffffff'], [0.7, '#f1efe8'], [1, '#d9d6cc']]) +
      '<clipPath id="c' + u + '"><path d="' + B + '"/><path d="' + D + '"/><path d="' + A + '"/></clipPath></defs>' +
      tail(58, 86,
        '<path d="M60,86 C50,74 40,66 24,64 C28,78 28,94 24,108 C40,106 50,98 60,86Z" fill="#f3f0e4" opacity=".92"/>' +
        '<path d="M31,68 C34,80 34,92 31,104" stroke="' + dark + '" stroke-width="2" fill="none"/>' +
        '<path d="M42,74 C44,82 44,90 42,98" stroke="#f2c640" stroke-width="3" fill="none"/>') +
      '<path d="' + D + '" fill="#f6f3ea"/>' +
      '<path d="' + A + '" fill="#f6f3ea"/>' +
      '<path d="' + B + '" fill="url(#g' + u + ')"/>' +
      '<g clip-path="url(#c' + u + ')">' +
        '<path d="M56,0 L62,0 L62,170 L56,170Z" fill="' + dark + '"/>' +
        band(70, 82, 4) + band(100, 114, 2) + band(132, 146, 0) + band(162, 172, 6) +
        '<ellipse cx="130" cy="140" rx="70" ry="10" fill="#8c8678" opacity=".18"/>' +
      '</g>' +
      '<circle cx="84" cy="40" r="8.5" fill="#fff"/><circle cx="84" cy="40" r="6" fill="#121212"/>' +
      fin(160, 98, '<path d="M162,96 C152,100 148,110 152,116 C160,112 166,104 166,98Z" fill="#f4f1e6" opacity=".85"/>') +
      eye(168, 72, 5, '#5a4030') +
      '<circle cx="222" cy="86" r="1.6" fill="' + dark + '"/>'
    };
  };

  FISH['royal-gramma'] = (u) => {
    const B = 'M48,50 C60,28 110,22 150,26 C178,30 194,42 196,50 C194,60 178,70 150,74 C110,78 60,72 48,50Z';
    return { w: 200, h: 96, body:
      '<defs>' + lin('g' + u, 48, 0, 196, 0, [[0, '#ffc61f'], [0.38, '#ffb30f'], [0.56, '#b53fe0'], [1, '#7420c8']], true) +
      '<clipPath id="c' + u + '"><path d="' + B + '"/></clipPath></defs>' +
      tail(50, 50, '<path d="M52,50 C42,38 30,30 12,28 C18,42 18,58 12,72 C30,70 42,62 52,50Z" fill="#ffc21a"/>') +
      '<path d="M64,32 C80,12 146,8 176,28 C150,24 100,26 70,40Z" fill="url(#g' + u + ')"/>' +
      '<circle cx="166" cy="24" r="4" fill="#1a0a2a"/>' +
      '<path d="M70,66 C88,86 130,88 150,72Z" fill="url(#g' + u + ')"/>' +
      '<path d="' + B + '" fill="url(#g' + u + ')"/>' +
      '<g clip-path="url(#c' + u + ')">' +
        '<ellipse cx="130" cy="30" rx="56" ry="7" fill="#fff" opacity=".18"/>' +
        '<ellipse cx="120" cy="76" rx="70" ry="8" fill="#3a0a5a" opacity=".2"/>' +
      '</g>' +
      fin(150, 70, '<path d="M150,70 C152,84 146,92 138,96 C142,86 144,78 142,70Z" fill="#8b2bd6"/>') +
      '<path d="M196,49 L168,40" stroke="#2a0a3a" stroke-width="2.4" stroke-linecap="round"/>' +
      eye(178, 43, 5.5, '#e9dcf5')
    };
  };

  FISH['neon-tetra'] = (u) => {
    const B = 'M40,36 C54,20 100,15 130,20 C148,24 156,30 158,36 C156,43 146,48 128,51 C98,54 54,52 40,36Z';
    return { w: 160, h: 70, body:
      '<defs>' + vg('g' + u, [[0, '#c4d0d8'], [0.5, '#e6edf0'], [1, '#f5f5f0']]) +
      lin('s' + u, 0, 0, 1, 0, [[0, '#2ad4ff'], [0.5, '#1f7bff'], [1, '#46e6ff']]) +
      '<clipPath id="c' + u + '"><path d="' + B + '"/></clipPath></defs>' +
      tail(42, 36,
        '<path d="M44,36 C36,28 26,22 12,20 C16,30 16,42 12,52 C26,50 36,44 44,36Z" fill="#dfe7ea" opacity=".6"/>' +
        '<path d="M44,36 C40,33 35,33 32,36 C35,39 40,39 44,36Z" fill="#ec2b42"/>') +
      '<path d="M92,19 C96,8 104,6 110,18Z" fill="#e7eef0" opacity=".7"/>' +
      '<path d="M80,50 C88,60 104,60 112,48Z" fill="#e7eef0" opacity=".6"/>' +
      '<path d="' + B + '" fill="url(#g' + u + ')" opacity=".95"/>' +
      '<g clip-path="url(#c' + u + ')">' +
        '<path d="M38,37 C58,42 90,45 114,43 C114,49 108,54 98,54 C74,56 50,50 38,37Z" fill="#ec2b42"/>' +
        '<path d="M46,32 C70,25 112,23 152,28 L152,38 C112,35 72,38 48,41Z" fill="#5df2ff" opacity=".28"/>' +
        '<path d="M48,33.5 C72,28 112,26.5 150,30.5 L150,35 C112,32.5 74,35 50,37.5Z" fill="url(#s' + u + ')"/>' +
      '</g>' +
      eye(146, 32, 4.2, '#c7d3da')
    };
  };

  FISH.betta = (u) => {
    const B = 'M98,86 C108,70 140,64 170,68 C192,71 206,80 208,88 C206,96 192,104 170,106 C140,108 108,100 98,86Z';
    let rays = '';
    [[40, 20], [22, 44], [10, 70], [6, 92], [12, 118], [26, 142], [42, 162]].forEach((p) => {
      rays += 'M100,88 L' + p[0] + ',' + p[1] + ' ';
    });
    return { w: 220, h: 180, body:
      '<defs>' + rad('t' + u, 1, 0.5, 1, [[0, '#c8102e'], [0.55, '#8e0f3a'], [0.85, '#3a2b8f'], [1, '#2a5bd7']]) +
      vg('g' + u, [[0, '#d01a36'], [0.6, '#9e0f2e'], [1, '#6c0c2a']]) + '</defs>' +
      fin(124, 72, '<path d="M128,70 C120,48 100,28 70,16 C76,40 88,62 108,82Z" fill="url(#t' + u + ')"/>') +
      tail(100, 88,
        '<path d="M102,88 C88,66 66,34 38,16 C26,38 10,58 4,90 C10,122 28,146 42,168 C68,140 88,110 102,88Z" fill="url(#t' + u + ')"/>' +
        '<path d="' + rays + '" stroke="#5a0a2a" stroke-opacity=".35" stroke-width="1.5" fill="none"/>' +
        '<path d="M38,16 C26,38 10,58 4,90 C10,122 28,146 42,168" stroke="#6f8bff" stroke-opacity=".5" stroke-width="3" fill="none"/>') +
      fin(150, 104, '<path d="M156,102 C146,130 120,156 86,170 C94,146 110,120 124,100Z" fill="url(#t' + u + ')"/>') +
      '<path d="' + B + '" fill="url(#g' + u + ')"/>' +
      '<path d="M108,84 C126,74 160,72 190,78 C170,80 140,82 112,90Z" fill="#4a6bff" opacity=".45"/>' +
      '<path d="M162,102 C162,124 156,140 148,154 C150,136 152,120 154,104Z" fill="#c8102e"/>' +
      '<path d="M176,90 C168,94 166,102 170,106 C176,102 180,96 180,90Z" fill="#ff8fa6" opacity=".5"/>' +
      eye(192, 82, 5)
    };
  };

  FISH.angelfish = (u) => {
    const B = 'M62,120 C70,88 108,70 150,80 C174,88 188,106 194,120 C188,134 174,152 150,160 C108,170 70,152 62,120Z';
    const D = 'M74,106 C78,70 72,38 56,8 C90,30 124,62 152,82Z';
    const A = 'M74,134 C78,170 72,202 56,232 C90,210 124,178 152,158Z';
    const bar = '#1d2326';
    return { w: 200, h: 240, body:
      '<defs>' + vg('g' + u, [[0, '#f7f8f4'], [0.5, '#dfe4e1'], [1, '#b9c2c2']]) +
      '<clipPath id="c' + u + '"><path d="' + B + '"/><path d="' + D + '"/><path d="' + A + '"/></clipPath></defs>' +
      tail(64, 120,
        '<path d="M66,120 C56,104 44,94 18,84 C28,104 30,136 18,156 C44,146 56,136 66,120Z" fill="#e3e8e6" opacity=".85"/>' +
        '<path d="M32,98 C38,110 38,130 32,142" stroke="' + bar + '" stroke-opacity=".5" stroke-width="3" fill="none"/>') +
      '<path d="M146,154 C146,182 140,208 126,236 M152,152 C154,180 150,204 140,230" stroke="#dfe4e1" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '<path d="' + D + '" fill="#e9eeec" opacity=".9"/>' +
      '<path d="' + A + '" fill="#e9eeec" opacity=".9"/>' +
      '<path d="' + B + '" fill="url(#g' + u + ')"/>' +
      '<g clip-path="url(#c' + u + ')">' +
        '<path d="M178,80 C171,104 171,136 178,160 L167,160 C160,136 160,104 167,80Z" fill="' + bar + '" opacity=".9"/>' +
        '<path d="M122,0 C130,80 130,160 122,240 L138,240 C146,160 146,80 138,0Z" fill="' + bar + '" opacity=".9"/>' +
        '<path d="M104,0 C108,80 108,160 104,240 L110,240 C114,160 114,80 110,0Z" fill="' + bar + '" opacity=".3"/>' +
        '<path d="M84,0 C90,80 90,160 84,240 L96,240 C102,160 102,80 96,0Z" fill="' + bar + '" opacity=".9"/>' +
        '<ellipse cx="140" cy="92" rx="40" ry="8" fill="#fff" opacity=".3"/>' +
      '</g>' +
      fin(160, 124, '<path d="M162,122 C152,126 148,136 152,142 C160,138 166,130 166,124Z" fill="#f2f5f3" opacity=".8"/>') +
      eye(174, 108, 6, '#c43a32') +
      '<path d="M189,124 Q193,123 194,120" stroke="#6d7676" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
    };
  };

  FISH['tiger-barb'] = (u) => {
    const B = 'M42,56 C54,26 100,16 134,22 C160,27 174,44 176,56 C174,68 160,84 134,90 C100,96 54,86 42,56Z';
    const ink = '#1b1b1b';
    const red = '#e1322b';
    return { w: 180, h: 110, body:
      '<defs>' + vg('g' + u, [[0, '#f7c454'], [0.5, '#f3b23f'], [1, '#f1dcb0']]) + '<clipPath id="c' + u + '"><path d="' + B + '"/></clipPath></defs>' +
      tail(44, 56,
        '<path d="M46,56 C38,44 28,34 10,28 C18,42 22,50 22,56 C22,62 18,70 10,84 C28,78 38,68 46,56Z" fill="#f6c25a" opacity=".92"/>' +
        '<path d="M10,28 C18,42 22,50 22,56 C22,62 18,70 10,84" stroke="' + red + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>') +
      '<path d="M92,26 C96,6 114,2 126,22Z" fill="' + ink + '"/>' +
      '<path d="M93,22 C97,6 114,2 124,18" stroke="' + red + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M78,84 C80,98 92,102 100,90Z" fill="#f2b23f"/>' +
      '<path d="M80,92 C84,99 92,101 98,94" stroke="' + red + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<path d="' + B + '" fill="url(#g' + u + ')"/>' +
      '<g clip-path="url(#c' + u + ')">' +
        '<path d="M150,14 C144,40 144,72 150,96 L160,96 C154,72 154,40 160,14Z" fill="' + ink + '"/>' +
        '<path d="M118,10 C126,40 126,72 118,100 L132,100 C140,72 140,40 132,10Z" fill="' + ink + '"/>' +
        '<path d="M88,10 C96,40 96,72 88,100 L102,100 C110,72 110,40 102,10Z" fill="' + ink + '"/>' +
        '<path d="M54,30 C58,44 58,68 54,82 L62,82 C66,68 66,44 62,30Z" fill="' + ink + '"/>' +
        '<ellipse cx="120" cy="30" rx="40" ry="6" fill="#fff" opacity=".2"/>' +
      '</g>' +
      fin(118, 86, '<path d="M118,86 C118,98 112,104 104,106 C108,98 110,92 110,86Z" fill="' + red + '"/>') +
      '<path d="M168,48 C174,50 177,54 176,58 C172,59 168,58 166,54Z" fill="' + red + '"/>' +
      eye(161, 48, 5, '#f2b23f')
    };
  };

  FISH.corydoras = (u) => {
    const B = 'M42,58 C54,30 100,22 134,28 C156,32 170,46 177,62 C174,68 166,72 150,72 L64,72 C52,70 44,66 42,58Z';
    const R = rng(11);
    let specks = '';
    for (let i = 0; i < 30; i++) {
      specks += '<circle cx="' + r1(56 + R() * 108) + '" cy="' + r1(32 + R() * 34) + '" r="' + r1(1.4 + R() * 1.5) + '" fill="#5a4532" opacity=".7"/>';
    }
    let tailSpots = '';
    for (let i = 0; i < 8; i++) {
      tailSpots += '<circle cx="' + r1(22 + (i % 4) * 5) + '" cy="' + r1(46 + Math.floor(i / 4) * 22 + (i % 2) * 3) + '" r="1.5" fill="#6a5440" opacity=".7"/>';
    }
    return { w: 180, h: 100, body:
      '<defs>' + vg('g' + u, [[0, '#c9a77a'], [0.45, '#e2c9a2'], [1, '#f2e6d2']]) + '<clipPath id="c' + u + '"><path d="' + B + '"/></clipPath></defs>' +
      tail(44, 58,
        '<path d="M46,58 C38,46 28,38 14,34 C20,46 22,52 22,58 C22,64 20,70 14,82 C28,78 38,70 46,58Z" fill="#e5d3b6" opacity=".9"/>' + tailSpots) +
      '<path d="M96,30 C98,10 110,4 120,8 C118,16 116,24 116,32Z" fill="#e2c9a2"/>' +
      '<circle cx="108" cy="16" r="3.5" fill="#4b3a2c"/>' +
      '<path d="M60,40 C62,34 68,32 70,36Z" fill="#cfae80"/>' +
      '<path d="M110,72 C108,80 102,84 96,84 C100,80 102,76 102,72Z" fill="#d9bf98"/>' +
      '<path d="' + B + '" fill="url(#g' + u + ')"/>' +
      '<g clip-path="url(#c' + u + ')">' + specks +
        '<path d="M60,54 C90,50 130,48 166,52" stroke="#a88a62" stroke-width="1.6" fill="none" opacity=".6"/>' +
        '<ellipse cx="110" cy="72" rx="56" ry="6" fill="#fffaf0" opacity=".35"/>' +
      '</g>' +
      fin(140, 68, '<path d="M142,66 C136,78 128,84 118,86 C126,78 132,72 136,64Z" fill="#d9bf98"/>') +
      eye(156, 46, 5) +
      '<path d="M175,64 Q182,66 186,72 M173,67 Q178,72 180,78" stroke="#b8956a" stroke-width="2" fill="none" stroke-linecap="round"/>'
    };
  };

  FISH.goldfish = (u) => {
    const B = 'M84,82 C86,48 124,32 160,38 C190,44 206,64 207,82 C206,100 190,120 160,124 C124,128 86,114 84,82Z';
    let scales = '';
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 9; col++) {
        scales += 'M' + (100 + col * 11 + (row % 2) * 5.5) + ',' + (46 + row * 10) + ' q-5,5 0,10 ';
      }
    }
    return { w: 220, h: 160, body:
      '<defs>' + vg('g' + u, [[0, '#ffb04a'], [0.55, '#ff7f1e'], [1, '#f26812']]) + '<clipPath id="c' + u + '"><path d="' + B + '"/></clipPath></defs>' +
      tail(88, 80,
        '<path d="M90,80 C72,62 52,32 22,22 C30,44 36,62 42,78 C36,94 28,116 18,140 C48,132 74,104 90,80Z" fill="#f47a20" opacity=".55"/>' +
        '<path d="M90,80 C76,66 58,48 34,40 C40,56 48,68 52,80 C48,94 40,110 32,124 C56,116 76,98 90,80Z" fill="#ff9a3c" opacity=".85"/>' +
        '<path d="M88,80 L40,46 M88,80 L46,78 M88,80 L40,114" stroke="#c85a10" stroke-opacity=".3" stroke-width="1.4" fill="none"/>') +
      '<path d="M122,42 C124,18 146,8 170,18 C156,24 150,32 150,42Z" fill="#ff9636" opacity=".9"/>' +
      '<path d="M124,118 C122,134 110,146 96,150 C106,140 110,128 112,118Z" fill="#ff9636" opacity=".85"/>' +
      '<path d="' + B + '" fill="url(#g' + u + ')"/>' +
      '<g clip-path="url(#c' + u + ')">' +
        '<path d="' + scales + '" stroke="#ffd59a" stroke-opacity=".35" stroke-width="1.2" fill="none"/>' +
        '<ellipse cx="150" cy="48" rx="44" ry="9" fill="#fff" opacity=".2"/>' +
        '<ellipse cx="150" cy="122" rx="60" ry="10" fill="#a8400a" opacity=".2"/>' +
      '</g>' +
      '<path d="M156,120 C156,134 150,142 142,146 C146,136 148,128 146,120Z" fill="#ff9636"/>' +
      fin(170, 96, '<path d="M172,94 C162,98 158,108 162,114 C170,110 176,102 176,94Z" fill="#ffb45e" opacity=".85"/>') +
      eye(182, 70, 6.5) +
      '<path d="M203,88 Q207,86 206,82" stroke="#a8400a" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
    };
  };

  // Lens-shaped leaf from (bx,by). ang is radians from vertical; bend droops the leaf sideways.
  function leaf(bx, by, ang, len, w, bend) {
    const dx = Math.sin(ang);
    const dy = -Math.cos(ang);
    const nx = -dy;
    const ny = dx;
    const P = (t, off) => [bx + dx * len * t + nx * (off + bend * t * t), by + dy * len * t + ny * (off + bend * t * t)];
    const tip = P(1, 0);
    return {
      d: 'M' + pt([bx, by]) + ' C' + pt(P(0.25, w)) + ' ' + pt(P(0.75, w * 0.8)) + ' ' + pt(tip) +
        ' C' + pt(P(0.75, -w * 0.8)) + ' ' + pt(P(0.25, -w)) + ' ' + pt([bx, by]) + 'Z',
      rib: 'M' + pt([bx, by]) + ' Q' + pt(P(0.5, 0)) + ' ' + pt(tip)
    };
  }

  DECOR.anemone = (u, R) => {
    let back = '';
    let front = '';
    [0, 1].forEach((row) => {
      const n = 12;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const bx = 86 + (t - 0.5) * (row ? 48 : 40) + (row ? 0 : 2);
        const by = row ? 98 : 94;
        const a = ((t - 0.5) * 150 + (R() - 0.5) * 16) * Math.PI / 180;
        const L = (row ? 36 : 44) + R() * 20;
        const tip = [bx + Math.sin(a) * L, by - Math.cos(a) * L];
        const c = [bx + Math.sin(a) * L * 0.35 + (R() - 0.5) * 16, by - Math.cos(a) * L * 0.75];
        const g = '<path d="M' + pt([bx, by]) + ' Q' + pt(c) + ' ' + pt(tip) + '" stroke="url(#a' + u + ')" stroke-width="' + (row ? 8.5 : 7.5) +
          '" fill="none" stroke-linecap="round"' + (row ? '' : ' opacity=".8"') + '/>' +
          '<circle cx="' + r1(tip[0]) + '" cy="' + r1(tip[1]) + '" r="' + (row ? 4.4 : 3.8) + '" fill="' + (row ? '#ffd0ef' : '#e3a0f0') + '"/>';
        const s = sway(bx, by, g, 3.5 + R() * 2.5, R() * 4);
        if (row) front += s; else back += s;
      }
    });
    return { w: 170, h: 140, body:
      '<defs>' + lin('a' + u, 0, 130, 0, 30, [[0, '#ff9ccf'], [0.6, '#f27bd0'], [1, '#a65ae0']], true) +
      vg('c' + u, [[0, '#d27ae0'], [1, '#7d3aa6']]) + '</defs>' +
      back +
      '<path d="M58,140 C60,120 64,106 68,98 L104,98 C108,106 112,120 114,140Z" fill="url(#c' + u + ')"/>' +
      '<ellipse cx="86" cy="98" rx="27" ry="6" fill="#e97dd0"/>' +
      front
    };
  };

  DECOR['brain-coral'] = (u, R) => {
    const DOME = 'M6,100 C8,44 46,12 80,12 C114,12 152,44 154,100Z';
    let d = '';
    for (let row = 0, y = 18; y < 104; y += 8, row++) {
      let pen = false;
      for (let x = 0; x <= 160; x += 5) {
        const yy = y + Math.sin(x * 0.21 + row * 1.9) * 2.6 + Math.sin(x * 0.07 + row) * 1.5;
        if (!pen || R() < 0.08) { d += 'M' + x + ',' + r1(yy) + ' '; pen = true; } else d += 'L' + x + ',' + r1(yy) + ' ';
        if (R() < 0.07) { d += 'M' + x + ',' + r1(yy) + ' l' + r1(R() * 4 - 2) + ',8 '; pen = false; }
      }
    }
    return { w: 160, h: 100, body:
      '<defs>' + rad('g' + u, 0.4, 0.3, 0.8, [[0, '#ecd99c'], [0.6, '#cbaf62'], [1, '#8e7438']]) +
      '<clipPath id="c' + u + '"><path d="' + DOME + '"/></clipPath></defs>' +
      '<path d="' + DOME + '" fill="url(#g' + u + ')"/>' +
      '<g clip-path="url(#c' + u + ')">' +
        '<path d="' + d + '" stroke="#7c6230" stroke-width="2.3" stroke-opacity=".65" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="' + d + '" transform="translate(0 1.8)" stroke="#f6eab8" stroke-width="1.1" stroke-opacity=".35" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="64" cy="34" rx="36" ry="12" fill="#fff" opacity=".18"/>' +
        '<ellipse cx="80" cy="100" rx="80" ry="14" fill="#4a3a18" opacity=".25"/>' +
      '</g>'
    };
  };

  DECOR['staghorn-coral'] = (u, R) => {
    const segs = [];
    const tips = [];
    function br(x, y, ang, len, w, depth) {
      ang = Math.max(-1.2, Math.min(1.2, ang));
      const x2 = x + Math.sin(ang) * len;
      const y2 = y - Math.cos(ang) * len;
      const m = [(x + x2) / 2 + (R() - 0.5) * len * 0.25, (y + y2) / 2];
      segs.push({ d: 'M' + pt([x, y]) + ' Q' + pt(m) + ' ' + pt([x2, y2]), w: w });
      if (depth <= 0) { tips.push([x2, y2, w]); return; }
      const spread = 0.3 + R() * 0.2;
      br(x2, y2, ang * 0.85 - spread, len * (0.68 + R() * 0.12), w * 0.72, depth - 1);
      br(x2, y2, ang * 0.85 + spread, len * (0.68 + R() * 0.12), w * 0.72, depth - 1);
      if (depth > 1 && R() < 0.25) br(x2, y2, ang + (R() - 0.5) * 0.3, len * 0.6, w * 0.65, depth - 2);
    }
    br(85, 170, -0.38, 40, 13, 3);
    br(85, 170, 0.05, 46, 14, 3);
    br(85, 170, 0.42, 38, 12, 3);
    segs.sort((a, b) => b.w - a.w);
    let body = '';
    segs.forEach((s) => {
      body += '<path d="' + s.d + '" stroke="#c9a173" stroke-width="' + r1(s.w) + '" fill="none" stroke-linecap="round"/>';
    });
    segs.forEach((s) => {
      body += '<path d="' + s.d + '" transform="translate(' + r1(-s.w * 0.15) + ' 0)" stroke="#f0d9b6" stroke-width="' + r1(s.w * 0.4) + '" stroke-opacity=".7" fill="none" stroke-linecap="round"/>';
    });
    tips.forEach((t) => {
      body += '<circle cx="' + r1(t[0]) + '" cy="' + r1(t[1]) + '" r="' + r1(t[2] * 0.55) + '" fill="#b9a6ff" opacity=".95"/>';
    });
    return { w: 170, h: 170, body: body };
  };

  DECOR['sea-fan'] = (u, R) => {
    const bx = 85;
    const by = 150;
    const N = 13;
    const rays = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      rays.push({ a: (t - 0.5) * 2.2, L: 104 + R() * 14 - Math.abs(t - 0.5) * 30, bend: (R() - 0.5) * 14 });
    }
    const at = (ray, r) => {
      const k = Math.sin(Math.PI * Math.min(1, r / ray.L));
      return [bx + Math.sin(ray.a) * r + Math.cos(ray.a) * ray.bend * k, by - Math.cos(ray.a) * r + Math.sin(ray.a) * ray.bend * k];
    };
    let membrane = 'M' + bx + ',' + by;
    rays.forEach((ray) => { membrane += ' L' + pt(at(ray, ray.L)); });
    membrane += 'Z';
    let rayPath = '';
    rays.forEach((ray) => {
      rayPath += 'M' + bx + ',' + by;
      for (let s = 1; s <= 8; s++) rayPath += ' L' + pt(at(ray, (ray.L * s) / 8));
      rayPath += ' ';
    });
    let lattice = '';
    for (let r = 20; r < 118; r += 11) {
      let pen = false;
      rays.forEach((ray) => {
        if (ray.L <= r) { pen = false; return; }
        const p = at(ray, r + (R() - 0.5) * 4);
        lattice += (pen ? ' L' : ' M') + pt(p);
        pen = true;
      });
    }
    return { w: 170, h: 180, body: sway(85, 176,
      '<path d="' + membrane + '" fill="#a14fd0" opacity=".22"/>' +
      '<path d="' + lattice + '" stroke="#c070e6" stroke-width="1.3" fill="none" stroke-linejoin="round"/>' +
      '<path d="' + rayPath + '" stroke="#8d3cc0" stroke-width="2.6" fill="none" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<path d="M85,176 L85,148" stroke="#7a2fa8" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M74,180 C76,170 80,166 85,164 C90,166 94,170 96,180Z" fill="#6e2c96"/>',
      7 + R() * 2, R() * 6, 'sway-slow') };
  };

  DECOR['java-fern'] = (u, R) => {
    let leaves = '';
    const n = 7;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const bx = 36 + t * 70;
      const by = 164;
      const ang = (t - 0.5) * 1.3 + (R() - 0.5) * 0.25;
      const L = 95 + R() * 55 - Math.abs(t - 0.5) * 30;
      const lf = leaf(bx, by, ang, L, 9 + R() * 4, ang * 18);
      const shade = i % 2 ? 'url(#g' + u + ')' : 'url(#h' + u + ')';
      leaves += sway(bx, by, '<path d="' + lf.d + '" fill="' + shade + '"/><path d="' + lf.rib + '" stroke="#86c07c" stroke-width="1.3" stroke-opacity=".6" fill="none"/>', 5 + R() * 3, R() * 6);
    }
    return { w: 140, h: 170, body:
      '<defs>' + lin('g' + u, 0, 170, 0, 20, [[0, '#1f4d2a'], [1, '#3f8a4a']], true) +
      lin('h' + u, 0, 170, 0, 20, [[0, '#183f22'], [1, '#2f7340']], true) + '</defs>' +
      leaves +
      '<path d="M28,166 C50,160 90,162 114,166" stroke="#5b4630" stroke-width="7" fill="none" stroke-linecap="round"/>'
    };
  };

  DECOR['amazon-sword'] = (u, R) => {
    const bx = 80;
    const by = 166;
    const list = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      list.push((t - 0.5) * 2.1 + (R() - 0.5) * 0.15);
    }
    list.sort((a, b) => Math.abs(b) - Math.abs(a));
    let leaves = '';
    list.forEach((ang) => {
      const stem = 24 + R() * 14;
      const sx = bx + Math.sin(ang) * stem;
      const sy = by - Math.cos(ang) * stem;
      const lf = leaf(sx, sy, ang * 1.05, 70 + R() * 30 - Math.abs(ang) * 10, 16 + R() * 6, ang * 14);
      leaves += sway(bx, by,
        '<path d="M' + bx + ',' + by + ' L' + pt([sx, sy]) + '" stroke="#4f9e3c" stroke-width="3.2" stroke-linecap="round"/>' +
        '<path d="' + lf.d + '" fill="url(#g' + u + ')"/>' +
        '<path d="' + lf.rib + '" stroke="#b4eb9a" stroke-width="1.5" stroke-opacity=".7" fill="none"/>', 5.5 + R() * 3, R() * 6);
    });
    return { w: 160, h: 170, body:
      '<defs>' + lin('g' + u, 0, 170, 0, 20, [[0, '#3c9a35'], [1, '#6ed058']], true) + '</defs>' + leaves +
      '<ellipse cx="80" cy="166" rx="12" ry="4" fill="#3d6a2a"/>'
    };
  };

  DECOR.driftwood = (u) => {
    const branches = [
      ['M8,124 C40,118 70,112 100,100 C130,88 160,70 190,46', 20],
      ['M120,92 C126,70 124,48 132,24', 10],
      ['M160,70 C182,64 204,66 228,58', 9],
      ['M190,46 C196,32 206,22 214,10', 7],
      ['M70,112 C62,94 50,82 36,74', 9],
      ['M30,122 C24,112 14,108 6,108', 8]
    ];
    let body = '';
    branches.forEach((b) => { body += '<path d="' + b[0] + '" stroke="url(#g' + u + ')" stroke-width="' + b[1] + '" fill="none" stroke-linecap="round"/>'; });
    branches.forEach((b) => { body += '<path d="' + b[0] + '" transform="translate(0 ' + r1(-b[1] * 0.22) + ')" stroke="#c4a07a" stroke-width="' + r1(b[1] * 0.18) + '" stroke-opacity=".55" fill="none" stroke-linecap="round"/>'; });
    return { w: 240, h: 130, body:
      '<defs>' + lin('g' + u, 0, 0, 1, 1, [[0, '#8a6845'], [1, '#55402a']]) + '</defs>' + body +
      '<path d="M30,120 C60,114 90,106 112,96 M130,84 C150,72 166,62 182,50" stroke="#3e2b1a" stroke-width="1.2" stroke-opacity=".45" fill="none"/>' +
      '<ellipse cx="104" cy="99" rx="4" ry="2.4" fill="#3e2b1a" opacity=".6"/>' +
      '<ellipse cx="160" cy="70" rx="3" ry="2" fill="#3e2b1a" opacity=".6"/>'
    };
  };

  DECOR['moss-ball'] = (u, R) => {
    let fuzz = '';
    for (let i = 0; i < 90; i++) {
      const a = R() * Math.PI * 2;
      const rr = Math.sqrt(R()) * 26;
      const x = 35 + Math.cos(a) * rr;
      const y = 33 + Math.sin(a) * rr;
      const b = R() * Math.PI * 2;
      const l = 1.6 + R() * 1.6;
      fuzz += '<path d="M' + pt([x, y]) + ' l' + r1(Math.cos(b) * l) + ',' + r1(Math.sin(b) * l) + '" stroke="' + (R() < 0.5 ? '#c4f0a2' : '#2c6a2c') + '" stroke-opacity=".45"/>';
    }
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2 + R() * 0.1;
      fuzz += '<path d="M' + pt([35 + Math.cos(a) * 26.5, 33 + Math.sin(a) * 26.5]) + ' L' + pt([35 + Math.cos(a) * 29.5, 33 + Math.sin(a) * 29.5]) + '" stroke="#3f8a37"/>';
    }
    return { w: 70, h: 64, body:
      '<defs>' + rad('g' + u, 0.38, 0.32, 0.75, [[0, '#9be07f'], [0.55, '#4f9d3f'], [1, '#22582a']]) + '</defs>' +
      '<ellipse cx="35" cy="61" rx="22" ry="3" fill="#000" opacity=".25"/>' +
      '<circle cx="35" cy="33" r="28" fill="url(#g' + u + ')"/>' +
      '<g stroke-width="1.1" stroke-linecap="round">' + fuzz + '</g>'
    };
  };

  T.Art = {
    // Returns { svg, w, h } where w/h are the viewBox dimensions.
    render: function (kind, id) {
      const fn = (kind === 'fish' ? FISH : DECOR)[id];
      if (!fn) return { svg: '', w: 1, h: 1 };
      seq += 1;
      const u = 'k' + seq;
      const a = fn(u, rng(seq * 9973 + 17));
      return {
        w: a.w,
        h: a.h,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + a.w + ' ' + a.h + '" aria-hidden="true" focusable="false">' + a.body + '</svg>'
      };
    }
  };
})(window.Tank);
