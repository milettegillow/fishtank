window.Tank = window.Tank || {};

// Wiring and init.
(function (T) {
  'use strict';

  const DEFAULTS = { water: 'salt', temp: 'tropical' };
  const state = T.state = { water: DEFAULTS.water, temp: DEFAULTS.temp, locked: false, result: null };
  let timers = [];

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function onSettings(change) {
    if (state.locked) return;
    if (change.water) state.water = change.water;
    if (change.temp) state.temp = change.temp;
    T.Water.setSettings(state.water, state.temp);
  }

  function onComplete() {
    if (state.locked || T.Swim.fishCount() === 0) return;
    state.locked = true;
    T.UI.closeFact();
    T.UI.lock(true);
    T.UI.showDrawer(false);
    const result = T.Rules.evaluate({ water: state.water, temp: state.temp, items: T.Swim.items() });
    state.result = result;
    later(() => {
      const ms = T.Swim.playOutcomes(result);
      later(() => T.UI.showResults(result, T.Swim.items()), ms);
    }, 450);
  }

  function unlock() {
    clearTimers();
    T.UI.hideResults();
    state.locked = false;
    state.result = null;
    T.UI.lock(false);
    T.UI.showDrawer(true);
  }

  // Revive everything in place and go back to editing the same tank.
  function onTryAgain() {
    T.Swim.revive();
    unlock();
  }

  // Empty the tank and go back to the default water settings.
  function onStartOver() {
    T.Swim.clear();
    state.water = DEFAULTS.water;
    state.temp = DEFAULTS.temp;
    T.Water.setSettings(state.water, state.temp);
    T.UI.setSettings(state.water, state.temp);
    T.UI.closeFact();
    unlock();
  }

  function init() {
    T.computeLayout();
    T.Water.init(document.getElementById('water'), document.getElementById('waterFallback'));
    T.Water.setSettings(state.water, state.temp, true);
    T.Bubbles.init(document.getElementById('bubbles'));
    T.Swim.init(document.getElementById('fishLayer'), document.getElementById('decorLayer'), document.getElementById('badgeLayer'), document.getElementById('foodLayer'));
    T.UI.init({ onSettings: onSettings, onComplete: onComplete, onTryAgain: onTryAgain, onStartOver: onStartOver });

    let pending = false;
    let lastW = T.layout.W;
    let lastH = T.layout.H;
    window.addEventListener('resize', () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        const ow = lastW;
        const oh = lastH;
        T.computeLayout();
        lastW = T.layout.W;
        lastH = T.layout.H;
        T.Water.resize();
        T.Swim.resize(ow, oh);
        T.UI.resize();
      });
    });

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => T.Swim.measureTopBar());
    document.body.classList.add('is-ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.Tank);
