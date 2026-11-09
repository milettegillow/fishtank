window.Tank = window.Tank || {};

// Full-tank WebGL water: caustics, god rays, surface band, sand/gravel floor. Plus DOM bubbles.
(function (T) {
  'use strict';

  const PALETTE = {
    cold: { top: [0.22, 0.45, 0.68], deep: [0.03, 0.09, 0.22] },
    warm: { top: [0.20, 0.62, 0.72], deep: [0.03, 0.18, 0.30] },
    tropical: { top: [0.26, 0.84, 0.86], deep: [0.02, 0.30, 0.44] }
  };

  const VS = 'attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }';

  const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uTop;
uniform vec3 uDeep;
uniform float uSalt;
uniform float uFloor;
uniform float uSurface;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Tileable water caustic: iterated sin/cos domain distortion.
float caustic(vec2 uv, float time, float sharp) {
  vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 5; n++) {
    float t = time * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
  }
  c /= 5.0;
  c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), sharp), 0.0, 1.0);
}

vec3 waterAt(float y, float fresh) {
  vec3 w = mix(uDeep, uTop, pow(clamp(y, 0.0, 1.0), 1.3));
  vec3 g = w * vec3(0.80, 1.03, 0.70) + vec3(0.015, 0.035, 0.0);
  return mix(w, g, fresh * 0.85);
}

void main() {
  vec2 st = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  float t = uTime;
  float fresh = 1.0 - uSalt;
  float sharp = mix(4.0, 8.5, uSalt);
  float ct = t * 0.3 + 23.0;
  vec3 lightTint = uTop * 0.6 + vec3(0.45);

  vec3 col = waterAt(st.y, fresh);

  // Caustics on the water volume, strongest low down.
  vec2 wuv = vec2(st.x * aspect, st.y) * 1.15;
  wuv += 0.07 * vec2(noise(wuv * 1.3 + t * 0.05), noise(wuv * 1.3 - t * 0.04 + 5.0));
  float cw = caustic(wuv, ct * 0.9, sharp);
  float low = 1.0 - smoothstep(0.05, 0.95, st.y);
  col += cw * mix(0.02, 0.28, low) * mix(0.55, 1.0, uSalt) * lightTint;

  // Floor.
  float fl = uFloor + 0.008 * sin(st.x * 5.0 + 1.3) + 0.005 * sin(st.x * 13.0 + 4.0);
  float fm = 1.0 - smoothstep(fl - 0.004, fl + 0.004, st.y);
  if (fm > 0.0) {
    float fy = clamp((fl - st.y) / max(fl, 0.001), 0.0, 1.0);
    float z = 1.0 / (0.35 + fy);
    vec2 fuv = vec2((st.x - 0.5) * aspect * z, z * 1.5);
    vec2 cuv = fuv * 1.3 + 0.05 * vec2(noise(fuv * 2.0 + t * 0.04), noise(fuv * 2.0 - t * 0.05 + 9.0));
    float cf = caustic(cuv, ct, sharp);

    float m = noise(fuv * 7.0) * 0.6 + noise(fuv * 23.0) * 0.4;
    float grain = hash(floor(gl_FragCoord.xy));
    vec3 sand = mix(vec3(0.80, 0.77, 0.68), vec3(0.97, 0.95, 0.88), m);
    sand *= 0.95 + 0.05 * sin(fuv.x * 12.0 + noise(fuv * 2.5) * 6.0);
    sand *= 0.94 + grain * 0.08;

    vec2 gp = fuv * 26.0;
    vec2 gi = floor(gp);
    vec2 gf = fract(gp);
    float d1 = 8.0;
    float d2 = 8.0;
    vec2 cell = gi;
    for (int yy = -1; yy <= 1; yy++) {
      for (int xx = -1; xx <= 1; xx++) {
        vec2 o = vec2(float(xx), float(yy));
        vec2 r = o + vec2(hash(gi + o), hash(gi + o + 17.0)) * 0.8 + 0.1 - gf;
        float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; cell = gi + o; }
        else if (d < d2) { d2 = d; }
      }
    }
    float edge = smoothstep(0.0, 0.3, sqrt(d2) - sqrt(d1));
    float hc = hash(cell + 3.7);
    vec3 pebble = hc < 0.33 ? vec3(0.45, 0.38, 0.30) : (hc < 0.66 ? vec3(0.32, 0.31, 0.29) : vec3(0.58, 0.50, 0.39));
    pebble *= 0.7 + 0.45 * hash(cell + 9.1);
    pebble *= mix(0.3, 1.0, edge);
    pebble += 0.07 * (1.0 - sqrt(d1));

    vec3 ground = mix(pebble, sand, uSalt);
    ground *= mix(vec3(1.0), uTop * 0.8 + 0.45, 0.35);
    vec3 fcol = ground * (mix(0.50, 0.58, uSalt) + cf * mix(0.55, 1.35, uSalt) * lightTint);
    fcol = mix(fcol, waterAt(fl, fresh), (1.0 - fy) * (1.0 - fy) * 0.65);
    fcol *= 1.0 - fy * 0.15;
    col = mix(col, fcol, fm);
  }

  // God rays.
  float rx = st.x + (1.0 - st.y) * 0.38;
  float ray = pow(0.5 + 0.5 * sin(rx * 10.0 + t * 0.12 + sin(rx * 2.7 - t * 0.07) * 1.8), 6.0);
  ray += 0.7 * pow(0.5 + 0.5 * sin(rx * 21.0 - t * 0.09 + 1.7), 9.0);
  ray *= 0.55 + 0.45 * noise(vec2(rx * 3.0, t * 0.06));
  ray *= smoothstep(0.2, 1.0, st.y);
  col += ray * mix(0.06, 0.10, uSalt) * lightTint;

  // Surface band.
  float sw = 0.004 * sin(st.x * 17.0 + t * 0.8) + 0.003 * sin(st.x * 39.0 - t * 1.2);
  float band = smoothstep(uSurface - 0.07, uSurface, st.y + sw);
  col = mix(col, col * 1.12 + uTop * 0.18 + vec3(0.06), band * 0.8);
  col += band * cw * 0.12;
  float sline = exp(-pow((st.y + sw - uSurface) * uRes.y / 2.5, 2.0));
  col += sline * 0.22;
  col = mix(col, uTop * 0.9 + vec3(0.25), smoothstep(uSurface, uSurface + 0.02, st.y + sw) * 0.5);

  // Fresh water: tiny drifting specks.
  if (fresh > 0.01) {
    float specks = 0.0;
    for (int k = 0; k < 2; k++) {
      float fk = float(k);
      float scale = 8.0 + fk * 5.0;
      vec2 g = vec2(st.x * aspect, st.y) * scale + vec2(t * (0.015 + fk * 0.01), t * 0.02);
      vec2 cgi = floor(g);
      vec2 cgf = fract(g);
      float h = hash(cgi + fk * 13.0);
      if (h > 0.72) {
        vec2 pos = 0.2 + 0.6 * vec2(hash(cgi + 1.3 + fk), hash(cgi + 7.1 + fk));
        pos += 0.12 * vec2(sin(t * 0.3 + h * 20.0), cos(t * 0.25 + h * 13.0));
        float d = length(cgf - pos) * uRes.y / scale;
        specks += (1.0 - smoothstep(0.6, 2.0 - fk * 0.6, d)) * (0.4 + 0.6 * h);
      }
    }
    col += specks * fresh * (1.0 - fm) * 0.28 * vec3(0.92, 0.95, 0.8);
  }

  vec2 q = st - 0.5;
  col *= 1.0 - 0.45 * dot(q, q);
  col += (hash(gl_FragCoord.xy + fract(t)) - 0.5) / 255.0;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

  const Water = T.Water = {};
  let canvas = null;
  let fallback = null;
  let gl = null;
  let prog = null;
  let loc = {};
  let ok = false;
  let time = 0;
  let last = 0;
  let quality = 1;
  let frames = 0;
  let frameSum = 0;
  let lastFallback = '';
  const cur = { top: PALETTE.tropical.top.slice(), deep: PALETTE.tropical.deep.slice(), salt: 1 };
  const target = { top: PALETTE.tropical.top.slice(), deep: PALETTE.tropical.deep.slice(), salt: 1 };

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('Water shader failed to compile:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function setup() {
    const vs = compile(gl.VERTEX_SHADER, VS);
    const fs = compile(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return false;
    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('Water shader failed to link:', gl.getProgramInfoLog(prog));
      return false;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    ['uRes', 'uTime', 'uTop', 'uDeep', 'uSalt', 'uFloor', 'uSurface'].forEach((n) => { loc[n] = gl.getUniformLocation(prog, n); });
    return true;
  }

  function useFallback() {
    ok = false;
    document.body.classList.add('no-webgl');
  }

  Water.init = function (cv, fb) {
    canvas = cv;
    fallback = fb;
    const opts = { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: false };
    try {
      gl = cv.getContext('webgl', opts) || cv.getContext('experimental-webgl', opts);
    } catch (e) {
      gl = null;
    }
    if (gl && setup()) ok = true;
    else useFallback();

    cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); useFallback(); });
    cv.addEventListener('webglcontextrestored', () => {
      loc = {};
      if (setup()) {
        ok = true;
        document.body.classList.remove('no-webgl');
        Water.resize();
      }
    });

    Water.resize();
    requestAnimationFrame(loop);
  };

  Water.setSettings = function (water, temp, instant) {
    const p = PALETTE[temp] || PALETTE.tropical;
    target.top = p.top.slice();
    target.deep = p.deep.slice();
    target.salt = water === 'salt' ? 1 : 0;
    if (instant) {
      cur.top = target.top.slice();
      cur.deep = target.deep.slice();
      cur.salt = target.salt;
    }
  };

  Water.resize = function () {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * quality;
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    if (gl && ok) gl.viewport(0, 0, w, h);
  };

  const lerp = (a, b, k) => a + (b - a) * k;

  function rgb(c) {
    return 'rgb(' + c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255)).join(',') + ')';
  }

  function tintFresh(c, fresh) {
    const g = [c[0] * 0.80 + 0.015, c[1] * 1.03 + 0.035, c[2] * 0.70];
    return c.map((v, i) => lerp(v, g[i], fresh * 0.85));
  }

  function paintFallback() {
    const fresh = 1 - cur.salt;
    const top = tintFresh(cur.top, fresh);
    const deep = tintFresh(cur.deep, fresh);
    const mid = top.map((v, i) => lerp(v, deep[i], 0.45));
    const sandA = [lerp(0.42, 0.90, cur.salt), lerp(0.37, 0.87, cur.salt), lerp(0.30, 0.78, cur.salt)];
    const sandB = sandA.map((v) => v * 0.8);
    const floorPct = ((1 - ((T.layout && T.layout.floorFrac) || 0.25)) * 100).toFixed(1);
    const bg = 'linear-gradient(180deg,' + rgb(top) + ' 0%,' + rgb(mid) + ' 40%,' + rgb(deep) + ' ' + floorPct + '%,' +
      rgb(sandA) + ' ' + floorPct + '%,' + rgb(sandB) + ' 100%)';
    if (bg !== lastFallback) {
      fallback.style.background = bg;
      lastFallback = bg;
    }
  }

  function adapt(dt) {
    if (dt > 0.1) return;
    frames += 1;
    frameSum += dt;
    if (frames < 90) return;
    const avg = frameSum / frames;
    frames = 0;
    frameSum = 0;
    if (avg > 0.024 && quality > 0.6) {
      quality = Math.max(0.6, quality - 0.2);
      Water.resize();
    }
  }

  function loop(now) {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
    last = now;
    time += dt;
    const k = 1 - Math.exp(-dt * 4);
    for (let i = 0; i < 3; i++) {
      cur.top[i] = lerp(cur.top[i], target.top[i], k);
      cur.deep[i] = lerp(cur.deep[i], target.deep[i], k);
    }
    cur.salt = lerp(cur.salt, target.salt, k);

    const L = T.layout || {};
    if (ok && gl) {
      adapt(dt);
      gl.uniform2f(loc.uRes, canvas.width, canvas.height);
      gl.uniform1f(loc.uTime, time);
      gl.uniform3fv(loc.uTop, cur.top);
      gl.uniform3fv(loc.uDeep, cur.deep);
      gl.uniform1f(loc.uSalt, cur.salt);
      gl.uniform1f(loc.uFloor, L.floorFrac || 0.25);
      gl.uniform1f(loc.uSurface, L.surfaceFrac || 0.975);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else if (fallback) {
      paintFallback();
    }
    requestAnimationFrame(loop);
  }

  // Rising bubble streams from two air stones on the floor.
  const Bubbles = T.Bubbles = {};
  const SOURCES = [0.075, 0.915];
  let layer = null;

  function spawn(src) {
    if (!layer || document.hidden || layer.childElementCount > 70) return;
    const L = T.layout;
    if (!L || !L.W) return;
    const size = 3 + Math.random() * 7;
    const x = src * L.W + (Math.random() - 0.5) * 12;
    const y0 = L.floorTopY + 4;
    const y1 = L.surfaceY * 0.45;
    const dur = (y0 - y1) / (70 + Math.random() * 60 + size * 4);
    const b = document.createElement('span');
    b.className = 'bubble';
    b.style.setProperty('--x', x.toFixed(1) + 'px');
    b.style.setProperty('--y0', y0.toFixed(1) + 'px');
    b.style.setProperty('--y1', y1.toFixed(1) + 'px');
    b.style.animationDuration = dur.toFixed(2) + 's';
    const i = document.createElement('i');
    i.style.width = i.style.height = size.toFixed(1) + 'px';
    i.style.animationDuration = (0.9 + Math.random() * 0.9).toFixed(2) + 's';
    b.appendChild(i);
    b.addEventListener('animationend', (e) => { if (e.target === b) b.remove(); });
    layer.appendChild(b);
  }

  function stream(src) {
    spawn(src);
    const burst = Math.random() < 0.15;
    setTimeout(() => stream(src), burst ? 60 + Math.random() * 80 : 180 + Math.random() * 520);
  }

  Bubbles.init = function (el) {
    layer = el;
    SOURCES.forEach((s, i) => setTimeout(() => stream(s), i * 400));
  };
})(window.Tank);
