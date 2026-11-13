// YouTube channel: plays a YouTube live stream behind a tuning screen of CRT static.
// The player stays hidden until the stream has played for a moment, so YouTube's title bar,
// spinner and play button never show. Uses YouTube's IFrame Player API (no API key).
//   tuning   static and "TUNING…" while the player loads
//   playing  the picture fades in `revealDelay` ms after playback starts
//   blocked  no playback after `blockedDelay` ms (autoplay blocked): ask for a tap
//   failed   the API did not load or the player reported an error: "NO SIGNAL"
const revealDelay = 2000;
const blockedDelay = 8000;

let api;

export function loadYouTubeApi() {
  api ??= new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previous?.(); resolve(window.YT); };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => { api = undefined; reject(new Error('YouTube API did not load')); };
    document.head.append(script);
  });
  return api;
}

export function createYouTubeChannel(element, loadApi = loadYouTubeApi) {
  const slot = element.querySelector('.youtube-player');
  const status = element.querySelector('.youtube-status');
  const tune = element.querySelector('.youtube-tune');
  let player;
  let state;
  let started = false;
  let timers = [];
  let visit = 0;

  function setState(next) {
    state = next;
    element.classList.toggle('is-tuning', state !== 'playing');
    status.textContent = state === 'failed' ? 'NO SIGNAL' : 'TUNING…';
    status.hidden = state === 'blocked';
    tune.hidden = state !== 'blocked';
  }

  function later(fn, delay) {
    timers.push(setTimeout(fn, delay));
  }

  function waitForPlayback() {
    later(() => { if (state === 'tuning' && !started) setState('blocked'); }, blockedDelay);
  }

  tune.addEventListener('click', () => {
    setState('tuning');
    player?.playVideo();
    waitForPlayback();
  });
  setState('tuning');

  return {
    element,
    async enter() {
      const current = ++visit;
      setState('tuning');
      let YT;
      try {
        YT = await loadApi();
      } catch {
        if (current === visit) setState('failed');
        return;
      }
      if (current !== visit) return;

      started = false;
      const target = document.createElement('div');
      slot.replaceChildren(target);
      player = new YT.Player(target, {
        videoId: slot.dataset.videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: { autoplay: 1, mute: 1, controls: 0, playsinline: 1, rel: 0 },
        events: {
          onReady: (event) => { event.target.mute(); event.target.playVideo(); },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING && !started) {
              started = true;
              later(() => setState('playing'), revealDelay);
            }
          },
          onError: () => setState('failed'),
        },
      });
      waitForPlayback();
    },
    leave() {
      visit += 1;
      timers.forEach(clearTimeout);
      timers = [];
      player?.destroy();
      player = undefined;
      slot.replaceChildren();
      setState('tuning');
    },
    update() {},
  };
}
