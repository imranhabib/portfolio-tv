import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
function fixture() {
  const nodes = new Map();
  const timers = new Map();
  let timerID = 0;
  function fireTimer(delay) {
    const [id, timer] = [...timers].find(([, timer]) => timer.delay === delay);
    timers.delete(id);
    timer.fn();
  }
  const windowListeners = {};
  let now = 0;
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {
      hidden: true, textContent: '', scrollTop: 0, scrollHeight: 2000, clientHeight: 500,
      dataset: { src: 'https://portofcams.com/embed/banzai-pipeline/' },
      querySelector: key => node(`${selector} ${key}`),
      hasAttribute(name) { return this[name] !== undefined; },
      removeAttribute(name) { delete this[name]; },
      listeners: {}, addEventListener(type, handler) { this.listeners[type] = handler; },
    });
    return nodes.get(selector);
  };
  const context = vm.createContext({
    document: { querySelector: node },
    window: { matchMedia: () => ({ matches: false }), addEventListener(type, handler) { windowListeners[type] = handler; }, clearTimeout(id) { timers.delete(id); }, setTimeout(fn, delay) { timers.set(++timerID, { fn, delay }); return timerID; } },
    screen: { dataset: {}, classList: { add() {}, remove() {} } },
    createWeatherBroadcast: () => ({ load() {} }),
    createSnakeChannel: () => ({ activate() {}, pause() {}, update() {} }),
    pressedProfileHref: null, typedLetters: 0, refreshTextLayout() {}, performance: { now: () => now },
    fetch: async () => ({ ok: true, json: async () => ({ ip: '127.0.0.1' }) }), AbortSignal, Intl,
  });
  vm.runInContext(source.slice(source.indexOf('let channel = 1;'), source.indexOf('window.setTimeout(() => {\n  startup.hidden')), context);
  return { context, node, timers, fireTimer, windowListeners, tick(time) { now = time; context.updateProfileScroll(time); }, enter(step) { context.changeChannel(step); fireTimer(180); } };
}

for (const input of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
  const { node, tick, windowListeners } = fixture();
  const scroll = node('.profile-scroll');
  tick(0);
  tick(5000);
  scroll.listeners[input]?.({ key: 'ArrowDown' });
  scroll.scrollTop = 600;
  tick(6000);
  assert.equal(scroll.scrollTop, 600, `${input}: auto-scroll must not override manual scrolling`);
  if (input === 'pointerdown' || input === 'touchstart') {
    tick(9000);
    assert.equal(scroll.scrollTop, 600, 'Do not resume while a drag is held');
    windowListeners[input === 'pointerdown' ? 'pointerup' : 'touchend']();
  }
  tick(12000);
  assert.equal(scroll.scrollTop, 600, 'Resume from the current position without jumping');
  tick(13000);
  assert.equal(scroll.scrollTop, 636, `${input}: auto-scroll should resume after inactivity`);
}
{
  const { node, tick } = fixture();
  const scroll = node('.profile-scroll');
  tick(0);
  tick(1000);
  scroll.listeners.wheel();
  tick(2500);
  scroll.scrollTop = 400;
  scroll.listeners.scroll();
  tick(4400);
  assert.equal(scroll.scrollTop, 400, 'Momentum scrolling should extend the inactivity pause');
  tick(4500);
  tick(5500);
  assert.equal(scroll.scrollTop, 436, 'Auto-scroll should resume two seconds after the final scroll');
  scroll.listeners.scroll();
  tick(6500);
  assert.equal(scroll.scrollTop, 472, 'Automatic scroll events must not pause auto-scroll');
}
const { context, node, enter, fireTimer, timers } = fixture();
context.showChannelDisplay();
assert.equal(node('#channel-display').textContent, 'CH 01');
assert.equal(node('#channel-display').hidden, false);
fireTimer(1000);
assert.equal(node('#channel-display').hidden, true, 'Channel overlay should disappear after one second');
enter(1);
assert.equal(node('#channel-display').textContent, 'CH 02');
assert.equal(node('#channel-display').hidden, false);
assert.equal(node('#profile-channel').hidden, false);
assert.equal(node('#matrix-channel').hidden, true);
context.updateProfileScroll(0);
context.updateProfileScroll(1000);
assert.equal(node('.profile-scroll').scrollTop, 36, 'Auto-scroll should start immediately at 36 px/s');
node('.profile-scroll').listeners.wheel({});
enter(1);
assert.equal(node('#channel-display').textContent, 'CH 03');
assert.equal(timers.size, 1, 'Changing channels must replace the previous hide timer');
assert.equal(node('#webcam-channel').hidden, false);
assert.equal(node('#webcam-channel iframe').src, node('#webcam-channel iframe').dataset.src);
assert.equal(node('#matrix-channel').hidden, true);
for (const number of ['04', '05', '06', '01']) {
  enter(1);
  assert.equal(node('#channel-display').textContent, `CH ${number}`);
  const frame = node('#webcam-channel iframe');
  assert.equal(frame.src, undefined, 'Camera must only stream while its channel is active');
  assert.equal(node('#snake-channel').hidden, number !== '06');
  if (number === '05') {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(node('#matrix-channel').hidden, false);
    context.updateMatrix(0);
    context.updateMatrix(10000);
    assert.match(node('#matrix-text').textContent, /Wake up, 127.0.0.1/);
  }
}
enter(1);
context.updateProfileScroll(0);
context.updateProfileScroll(1000);
assert.equal(node('.profile-scroll').scrollTop, 36, 'Returning to Experience should restore immediate auto-scroll');
enter(-2);
assert.equal(node('#channel-display').textContent, 'CH 06');
assert.equal(node('#snake-channel').hidden, false);
console.log('Passed: immediate auto-scroll, manual takeover, inactivity resume, numbered channel overlays, one-second hide, timer reset, and re-entry.');
