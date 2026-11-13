import assert from 'node:assert/strict';
import { createTuner } from '../src/tuner.js';
import { createExperienceChannel } from '../src/experience.js';
import { createWebcamChannel } from '../src/webcam.js';
import { createMatrixChannel } from '../src/matrix.js';

const originals = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout, window: globalThis.window, fetch: globalThis.fetch, now: performance.now };
const timers = new Map();
let timerID = 0;
function fireTimer(delay) {
  const [id, timer] = [...timers].find(([, timer]) => timer.delay === delay);
  timers.delete(id);
  timer.fn();
}

try {
  globalThis.setTimeout = (fn, delay) => { timers.set(++timerID, { fn, delay }); return timerID; };
  globalThis.clearTimeout = (id) => { timers.delete(id); };

  // ── Tuner ──────────────────────────────────────────────
  {
    const log = [];
    const channels = Array.from({ length: 6 }, (_, index) => ({
      element: index === 0 ? undefined : { hidden: true },
      enter() { log.push(`enter ${index + 1}`); },
      leave() { log.push(`leave ${index + 1}`); },
      update(time) { log.push(`update ${index + 1} @${time}`); },
    }));
    const classes = new Set();
    const screen = { dataset: {}, classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) } };
    const display = { hidden: true, textContent: '' };
    const tuner = createTuner(screen, display, channels);
    const change = (step) => { tuner.change(step); fireTimer(180); };

    tuner.update(1);
    assert.deepEqual(log, [], 'No frames before the TV turns on');
    tuner.turnOn();
    assert.equal(display.textContent, 'CH 01');
    assert.equal(display.hidden, false);
    fireTimer(1000);
    assert.equal(display.hidden, true, 'Channel overlay should disappear after one second');
    tuner.update(2);
    assert.deepEqual(log, ['update 1 @2'], 'Channel 1 starts on screen without enter()');

    log.length = 0;
    tuner.change(1);
    assert.deepEqual(log, ['leave 1'], 'Leaving happens as soon as the screen blanks');
    assert.ok(classes.has('channel-changing'));
    tuner.update(3);
    assert.deepEqual(log, ['leave 1'], 'No frames while switching');
    fireTimer(180);
    assert.deepEqual(log, ['leave 1', 'enter 2']);
    assert.equal(display.textContent, 'CH 02');
    assert.equal(display.hidden, false);
    assert.equal(screen.dataset.channel, '2');
    assert.ok(!classes.has('channel-changing'));
    assert.deepEqual(channels.slice(1).map((channel) => channel.element.hidden), [false, true, true, true, true]);
    tuner.update(4);
    assert.equal(log.at(-1), 'update 2 @4');

    change(1);
    assert.equal(display.textContent, 'CH 03');
    assert.equal(timers.size, 1, 'Changing channels must replace the previous hide timer');

    log.length = 0;
    tuner.change(1);
    tuner.change(1);
    tuner.change(1);
    fireTimer(180);
    assert.deepEqual(log, ['leave 3', 'enter 6'], 'Rapid presses add up to one switch');
    assert.equal(display.textContent, 'CH 06');

    change(1);
    assert.equal(display.textContent, 'CH 01', 'Up wraps from 6 to 1');
    change(-2);
    assert.equal(display.textContent, 'CH 05', 'Down wraps from 1 to 6 and on');
    assert.deepEqual(channels.slice(1).map((channel) => channel.element.hidden), [true, true, true, false, true]);

    log.length = 0;
    tuner.change(1);
    tuner.change(-1);
    fireTimer(180);
    assert.deepEqual(log, ['leave 5', 'enter 5'], 'Switching away and back re-enters the same channel');
  }

  // ── Tuner: power off and on ───────────────────────────
  {
    const log = [];
    const channels = Array.from({ length: 6 }, (_, index) => ({
      element: index === 0 ? undefined : { hidden: true },
      enter() { log.push(`enter ${index + 1}`); },
      leave() { log.push(`leave ${index + 1}`); },
      update(time) { log.push(`update ${index + 1} @${time}`); },
      ...(index === 0 && { reset() { log.push('reset 1'); } }),
    }));
    const classes = new Set();
    const screen = { dataset: {}, classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) } };
    const display = { hidden: true, textContent: '' };
    const tuner = createTuner(screen, display, channels);
    tuner.turnOn();
    tuner.change(2);
    fireTimer(180);
    assert.equal(display.textContent, 'CH 03');
    log.length = 0;

    tuner.turnOff();
    assert.deepEqual(log, ['leave 3', 'reset 1'], 'Turning off leaves the current channel and resets channels that can be reset');
    assert.equal(display.hidden, true, 'No CH number while off');
    assert.equal(screen.dataset.channel, 'off');
    assert.ok(channels.slice(1).every((channel) => channel.element.hidden), 'Nothing is shown while off');
    tuner.update(1);
    tuner.change(1);
    assert.equal([...timers.values()].filter((timer) => timer.delay === 180).length, 0, 'CH buttons do nothing while off');
    assert.deepEqual(log, ['leave 3', 'reset 1'], 'No frames while off');

    tuner.turnOn();
    assert.deepEqual(log, ['leave 3', 'reset 1', 'enter 3'], 'Turning on returns to the last channel');
    assert.equal(display.textContent, 'CH 03');
    assert.equal(display.hidden, false);
    assert.equal(screen.dataset.channel, '3');
    assert.equal(channels[2].element.hidden, false);
    tuner.update(2);
    assert.equal(log.at(-1), 'update 3 @2');

    log.length = 0;
    tuner.change(1);
    tuner.turnOff();
    assert.deepEqual(log, ['leave 3', 'reset 1'], 'Turning off mid-switch does not leave twice');
    assert.ok(!classes.has('channel-changing'));
    assert.equal([...timers.values()].filter((timer) => timer.delay === 180).length, 0, 'A pending switch is cancelled');
    tuner.turnOn();
    assert.deepEqual(log, ['leave 3', 'reset 1', 'enter 4'], 'The channel that was being switched to comes on');
    assert.equal(display.textContent, 'CH 04');
  }

  // ── Experience channel ─────────────────────────────────
  let now = 0;
  performance.now = () => now;
  function experience() {
    const windowListeners = {};
    // Reduce Motion is on: auto-scroll must still run.
    globalThis.window = { matchMedia: () => ({ matches: true }), addEventListener(type, handler) { windowListeners[type] = handler; } };
    const scroll = { scrollTop: 0, scrollHeight: 2000, clientHeight: 500, listeners: {}, addEventListener(type, handler) { this.listeners[type] = handler; } };
    const channel = createExperienceChannel({ querySelector: () => scroll });
    return { channel, scroll, windowListeners, tick(time) { now = time; channel.update(time); } };
  }

  for (const input of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
    const { scroll, tick, windowListeners } = experience();
    tick(0);
    tick(5000);
    scroll.listeners[input]({ key: 'ArrowDown' });
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
    const { scroll, tick } = experience();
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
  {
    const { channel, scroll, tick } = experience();
    channel.enter();
    tick(0);
    tick(1000);
    assert.equal(scroll.scrollTop, 36, 'Auto-scroll should start immediately at 36 px/s');
    scroll.listeners.wheel();
    channel.enter();
    assert.equal(scroll.scrollTop, 0);
    tick(1000);
    tick(2000);
    assert.equal(scroll.scrollTop, 36, 'Returning to Experience should restore immediate auto-scroll');
  }

  // ── Webcam channel ─────────────────────────────────────
  {
    const frame = { dataset: { src: 'https://portofcams.com/embed/banzai-pipeline/' }, hasAttribute(name) { return this[name] !== undefined; }, removeAttribute(name) { delete this[name]; } };
    const webcam = createWebcamChannel({ querySelector: () => frame });
    assert.equal(frame.src, undefined);
    webcam.enter();
    assert.equal(frame.src, frame.dataset.src);
    webcam.leave();
    assert.equal(frame.src, undefined, 'Camera must only stream while its channel is active');
  }

  // ── Matrix channel ─────────────────────────────────────
  {
    const text = { textContent: '' };
    let lookups = 0;
    globalThis.fetch = async () => { lookups += 1; return { ok: true, json: async () => ({ ip: '127.0.0.1' }) }; };
    const matrix = createMatrixChannel({ querySelector: () => text });
    await matrix.enter();
    matrix.update(0);
    matrix.update(10000);
    assert.match(text.textContent, /Wake up, 127.0.0.1/);
    assert.match(text.textContent, /Knock, knock, 127.0.0.1\.$/);
    const leaving = matrix.enter();
    assert.equal(text.textContent, '', 'Entering again starts a fresh message');
    matrix.leave();
    await leaving;
    matrix.update(20000);
    assert.equal(text.textContent, '', 'A lookup that finishes after leaving shows nothing');
    assert.equal(lookups, 1, 'The IP lookup is cached');

    globalThis.fetch = async () => ({ ok: true, json: async () => ({ ip: '<script>' }) });
    const unsafe = createMatrixChannel({ querySelector: () => text });
    await unsafe.enter();
    unsafe.update(0);
    unsafe.update(10000);
    assert.match(text.textContent, /Wake up, visitor/, 'Unexpected IP values fall back to "visitor"');
  }
  console.log('Passed: tuner overlay, power off/on, one-second hide, timer reset, leave/enter order, no frames while switching, rapid presses, wrap-around, re-entry; Experience auto-scroll, manual takeover, inactivity resume; webcam streaming; Matrix message, caching and late lookups.');
} finally {
  globalThis.setTimeout = originals.setTimeout;
  globalThis.clearTimeout = originals.clearTimeout;
  globalThis.window = originals.window;
  globalThis.fetch = originals.fetch;
  performance.now = originals.now;
}
