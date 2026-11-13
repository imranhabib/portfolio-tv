import assert from 'node:assert/strict';
import { createPower } from '../src/power.js';

const originals = { setTimeout: globalThis.setTimeout };
const timers = [];
function fireTimer(delay) {
  const index = timers.findIndex((timer) => timer.delay === delay);
  assert.notEqual(index, -1, `Expected a ${delay} ms timer`);
  const [timer] = timers.splice(index, 1);
  timer.fn();
}

try {
  globalThis.setTimeout = (fn, delay) => { timers.push({ fn, delay }); return timers.length; };
  const log = [];
  const tuner = {
    turnOn() { log.push('tuner on'); },
    turnOff() { log.push('tuner off'); },
    update(time) { log.push(`tuner @${time}`); },
  };
  const classSet = () => { const set = new Set(); return { set, toggle: (name, on) => (on ? set.add(name) : set.delete(name)), add: (name) => set.add(name), remove: (name) => set.delete(name) }; };
  const standbyClasses = classSet();
  const standby = {
    element: { hidden: true, classList: standbyClasses },
    enter() { log.push('standby enter'); },
    leave() { log.push('standby leave'); },
    update(time) { log.push(`standby @${time}`); },
  };
  const classes = new Set(['is-starting']);
  const lightClasses = new Set();
  const attributes = {};
  const parts = {
    body: { classList: { remove: (name) => classes.delete(name) } },
    startup: { hidden: false, classList: classSet() },
    screen: { classList: classSet() },
    light: { classList: { toggle: (name, on) => (on ? lightClasses.add(name) : lightClasses.delete(name)) } },
    button: { setAttribute: (name, value) => { attributes[name] = value; } },
    standby,
  };
  const power = createPower(tuner, parts);

  // Page load: colour bars already showing, then the tuner turns on.
  power.start();
  assert.equal(attributes['aria-pressed'], 'true');
  power.press();
  assert.deepEqual(log, [], 'POWER is ignored during start-up');
  fireTimer(2100);
  assert.equal(parts.startup.hidden, true);
  assert.ok(!classes.has('is-starting'));
  assert.deepEqual(log, ['tuner on']);
  power.update(1);
  assert.equal(log.at(-1), 'tuner @1');

  // Press while on: colour bars collapse, plain black, then the standby screen turns on.
  log.length = 0;
  power.press();
  assert.deepEqual(log, ['tuner off']);
  assert.equal(parts.startup.hidden, false, 'Colour bars play again');
  assert.ok(parts.startup.classList.set.has('is-shutting-down'), 'Colour bars play in reverse with "SHUTTING DOWN"');
  assert.ok(lightClasses.has('is-standby'), 'Standby light turns red');
  assert.equal(attributes['aria-pressed'], 'false');
  power.press();
  assert.deepEqual(log, ['tuner off'], 'POWER is ignored while turning off');
  fireTimer(2100);
  assert.equal(parts.startup.hidden, true, 'Colour bars end on a black screen');
  assert.equal(standby.element.hidden, true, 'Screen stays black for a moment');
  assert.ok(parts.screen.classList.set.has('is-dark'), 'The black pause has no CRT effects');
  fireTimer(1000);
  assert.ok(!parts.screen.classList.set.has('is-dark'));
  assert.equal(standby.element.hidden, false);
  assert.ok(standbyClasses.set.has('is-powering-on'), 'The standby screen turns on like the TV, without colour bars');
  assert.deepEqual(log, ['tuner off', 'standby enter'], 'Standby screen shows one second later');
  power.update(2);
  assert.equal(log.at(-1), 'standby @2', 'Frames go to the standby screen while off');

  // Press while off: colour bars, then back on.
  log.length = 0;
  power.press();
  assert.deepEqual(log, ['standby leave']);
  assert.equal(standby.element.hidden, true);
  assert.ok(!standbyClasses.set.has('is-powering-on'), 'CH 04 does not replay the turn-on effect later');
  assert.equal(parts.startup.hidden, false);
  assert.ok(!parts.startup.classList.set.has('is-shutting-down'), 'Turning on plays forwards with "TUNING"');
  assert.ok(!lightClasses.has('is-standby'), 'Standby light turns green');
  assert.equal(attributes['aria-pressed'], 'true');
  power.press();
  assert.deepEqual(log, ['standby leave'], 'POWER is ignored while turning on');
  fireTimer(2100);
  assert.equal(parts.startup.hidden, true);
  assert.deepEqual(log, ['standby leave', 'tuner on']);
  assert.equal(timers.length, 0, 'No timers left over');
  console.log('Passed: start-up, power off (reversed colour bars, plain black, standby screen turning on), power on, standby light, aria-pressed, and presses ignored during animations.');
} finally {
  globalThis.setTimeout = originals.setTimeout;
}
