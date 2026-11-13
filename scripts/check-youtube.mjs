import assert from 'node:assert/strict';
import { createYouTubeChannel } from '../src/youtube.js';

const originals = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout, document: globalThis.document };
const timers = new Map();
let timerID = 0;
function fireTimer(delay) {
  const entry = [...timers].find(([, timer]) => timer.delay === delay);
  assert.ok(entry, `Expected a ${delay} ms timer`);
  timers.delete(entry[0]);
  entry[1].fn();
}

function createDom() {
  const classes = new Set();
  const listeners = {};
  const slot = { dataset: { videoId: 'ROboUHfPUrU' }, children: [], replaceChildren(...nodes) { this.children = nodes; } };
  const status = { hidden: false, textContent: '' };
  const tune = { hidden: true, addEventListener: (type, fn) => { listeners[type] = fn; }, click: () => listeners.click() };
  const element = {
    classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)), has: (name) => classes.has(name) },
    querySelector: (selector) => ({ '.youtube-player': slot, '.youtube-status': status, '.youtube-tune': tune })[selector],
  };
  return { element, slot, status, tune, tuning: () => classes.has('is-tuning') };
}

function createFakeApi() {
  const players = [];
  class Player {
    constructor(target, options) {
      Object.assign(this, { target, options, log: [] });
      players.push(this);
    }
    mute() { this.log.push('mute'); }
    playVideo() { this.log.push('play'); }
    destroy() { this.log.push('destroy'); }
    emit(name, data) { this.options.events[name]({ target: this, data }); }
  }
  return { players, YT: { Player, PlayerState: { PLAYING: 1, BUFFERING: 3 } } };
}

try {
  globalThis.setTimeout = (fn, delay) => { timers.set(++timerID, { fn, delay }); return timerID; };
  globalThis.clearTimeout = (id) => { timers.delete(id); };
  globalThis.document = { createElement: () => ({}) };

  // Tuning, then the picture fades in 2 s after playback starts.
  {
    const dom = createDom();
    const { players, YT } = createFakeApi();
    const channel = createYouTubeChannel(dom.element, async () => YT);
    assert.ok(dom.tuning(), 'Static covers the player before the channel is on');
    await channel.enter();
    const [player] = players;
    assert.equal(dom.status.textContent, 'TUNING…');
    assert.equal(player.options.videoId, 'ROboUHfPUrU');
    assert.equal(player.options.host, 'https://www.youtube-nocookie.com');
    assert.deepEqual(player.options.playerVars, { autoplay: 1, mute: 1, controls: 0, playsinline: 1, rel: 0 });
    assert.equal(dom.slot.children[0], player.target, 'Player is created inside the slot');
    player.emit('onReady');
    assert.deepEqual(player.log, ['mute', 'play'], 'Player starts muted');
    player.emit('onStateChange', YT.PlayerState.BUFFERING);
    player.emit('onStateChange', YT.PlayerState.PLAYING);
    assert.ok(dom.tuning(), 'Static stays while YouTube shows its title bar');
    fireTimer(2000);
    assert.ok(!dom.tuning(), 'Picture shows 2 s after playback starts');
    fireTimer(8000);
    assert.ok(!dom.tuning() && dom.tune.hidden, 'No tap prompt once playing');

    channel.leave();
    assert.deepEqual(player.log.at(-1), 'destroy', 'Stream stops when the channel is left');
    assert.deepEqual(dom.slot.children, []);
    assert.ok(dom.tuning(), 'Static is back for the next visit');
    assert.equal(timers.size, 0);
  }

  // Autoplay blocked: ask for a tap after 8 s, and ask again if the tap does not start it.
  {
    const dom = createDom();
    const { players, YT } = createFakeApi();
    const channel = createYouTubeChannel(dom.element, async () => YT);
    await channel.enter();
    fireTimer(8000);
    assert.ok(dom.tuning());
    assert.equal(dom.tune.hidden, false, 'Tap prompt shows when autoplay is blocked');
    assert.equal(dom.status.hidden, true);
    dom.tune.click();
    assert.equal(players[0].log.at(-1), 'play', 'Tap asks the player to play');
    assert.equal(dom.tune.hidden, true);
    assert.equal(dom.status.textContent, 'TUNING…');
    fireTimer(8000);
    assert.equal(dom.tune.hidden, false, 'Tap prompt returns if playback still does not start');
    channel.leave();
  }

  // Playback that starts just before 8 s does not flash the tap prompt.
  {
    const dom = createDom();
    const { players, YT } = createFakeApi();
    const channel = createYouTubeChannel(dom.element, async () => YT);
    await channel.enter();
    players[0].emit('onStateChange', YT.PlayerState.PLAYING);
    fireTimer(8000);
    assert.equal(dom.tune.hidden, true);
    fireTimer(2000);
    assert.ok(!dom.tuning());
    channel.leave();
  }

  // Player error (for example, the stream ended): NO SIGNAL, and no tap prompt.
  {
    const dom = createDom();
    const { players, YT } = createFakeApi();
    const channel = createYouTubeChannel(dom.element, async () => YT);
    await channel.enter();
    players[0].emit('onError', 100);
    assert.equal(dom.status.textContent, 'NO SIGNAL');
    fireTimer(8000);
    assert.equal(dom.tune.hidden, true);
    assert.equal(dom.status.textContent, 'NO SIGNAL');
    channel.leave();
    assert.equal(dom.status.textContent, 'TUNING…', 'Next visit tries again');
  }

  // API did not load: NO SIGNAL. Leaving before the API loads creates no player.
  {
    const dom = createDom();
    const failing = createYouTubeChannel(dom.element, async () => { throw new Error('blocked'); });
    await failing.enter();
    assert.equal(dom.status.textContent, 'NO SIGNAL');

    const late = createDom();
    const { players, YT } = createFakeApi();
    let release;
    const channel = createYouTubeChannel(late.element, () => new Promise((resolve) => { release = () => resolve(YT); }));
    const entering = channel.enter();
    channel.leave();
    release();
    await entering;
    assert.equal(players.length, 0, 'No player after the channel was left');
    assert.equal(timers.size, 0);
  }

  console.log('Passed: tuning static, 2 s reveal after playback, muted autoplay settings, stream stops on leave, tap prompt when autoplay is blocked, no late prompt, NO SIGNAL on errors, and no player after a fast channel change.');
} finally {
  Object.assign(globalThis, { setTimeout: originals.setTimeout, clearTimeout: originals.clearTimeout, document: originals.document });
}
