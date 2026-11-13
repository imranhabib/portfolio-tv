import './style.css';
import { createWeatherBroadcast } from './weather.js';
import { createSnakeChannel } from './snake.js';

const screen = document.querySelector('.screen');
const firstLogo = document.querySelector('.dvd-logo');
const bio = document.querySelector('#bio');
const bioWords = [...bio.querySelectorAll('.bio-word')];
const bioWordText = bioWords.map((word) => word.textContent);
const bioTextLength = bioWordText.reduce((length, word) => length + word.length, 0);
let typingStartedAt;
let typedLetters = 0;
let isTuning = true;

bioWords.forEach((word) => { word.textContent = ''; });

function updateTypewriter(time) {
  if (typingStartedAt === undefined) typingStartedAt = time;
  const visibleLetters = Math.min(bioTextLength, Math.floor((time - typingStartedAt) / 35));
  if (visibleLetters === typedLetters) return;

  typedLetters = visibleLetters;
  let remaining = visibleLetters;
  bioWords.forEach((word, index) => {
    word.textContent = bioWordText[index].slice(0, Math.max(0, remaining));
    if (mobileScreen.matches) {
      const letters = [...word.textContent].map((letter) => {
        const span = document.createElement('span');
        span.className = 'bio-letter';
        span.textContent = letter;
        return span;
      });
      word.replaceChildren(...letters);
    }
    remaining -= bioWordText[index].length;
  });
  layoutBorderText();

  const activeWord = bioWords.findLast((word) => word.textContent.length > 0);
  if (activeWord) {
    const range = document.createRange();
    const textNode = mobileScreen.matches ? activeWord.lastChild.firstChild : activeWord.firstChild;
    range.setStart(textNode, textNode.length - 1);
    range.setEnd(textNode, textNode.length);
    const letterBounds = range.getBoundingClientRect();
    const screenBounds = screen.getBoundingClientRect();
    spawnBurst(
      letterBounds.left - screenBounds.left + letterBounds.width / 2,
      letterBounds.top - screenBounds.top + letterBounds.height / 2,
      colors[randomColorIndex()],
      8,
      0.48,
    );
  }
}
const profileTemplate = document.querySelector('.linkedin-logo.is-template');
const githubIcon = '<svg viewBox="0 0 24 24" role="presentation"><path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 5.1 18.3 5.4 18.3 5.4c.6 1.6.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z"/></svg>';

const colors = [
  '#bd4cff',
  '#4f8dff',
  '#55e889',
  '#ffd84a',
  '#ff6d9e',
  '#009b92',
  '#00b112',
  '#ffb07c',
  '#00d4ff',
  '#ff4d4d',
  '#ff8c00',
  '#d4ff45',
  '#ff52e5',
  '#9f8cff',
  '#40ffd0',
  '#ffcfec',
  '#ff6347',
  '#87cefa',
  '#c77dff',
  '#f5f5dc',
  '#ffffff',
  '#2455ff',
  '#c87941',
  '#c487a5',
];

const patterns = [
  [ 240, 176 ],
  [ -204, 252 ],
  [ 282, -138 ],
  [ -168, -264 ],
  [ 228, 216 ],
  [ -276, 156 ],
];

const logos = [];
let nextPattern = 1;
const mobileScreen = window.matchMedia('(max-width: 600px)');
let borderWordWidths;

function layoutBorderText() {
  if (!mobileScreen.matches) return;
  if (!borderWordWidths) {
    const measure = document.createElement('span');
    measure.className = 'bio-letter';
    measure.style.visibility = 'hidden';
    bio.appendChild(measure);
    const widths = new Map();
    for (const letter of new Set(bioWordText.join(''))) {
      measure.textContent = letter;
      widths.set(letter, measure.offsetWidth);
    }
    borderWordWidths = bioWordText.map((word) => [...word].reduce((width, letter) => width + widths.get(letter), 0));
    measure.remove();
  }
  const space = 4;
  const totalWidth = borderWordWidths.reduce((sum, width) => sum + width + space, 0);
  const lineHeight = parseFloat(getComputedStyle(bio).lineHeight);
  const topWordCount = bioWordText.indexOf('engineer') + 1;
  const topWidth = borderWordWidths.slice(0, topWordCount).reduce((sum, width) => sum + width, 0) + (topWordCount - 1) * space;
  const sideWidth = totalWidth - topWidth - space;
  const radius = 44;
  const cornerStart = bio.clientWidth - radius;
  const arcLength = Math.PI * radius / 2;
  const curveSpacing = 2;
  const scale = Math.min(1, cornerStart / topWidth, (bio.clientHeight - radius + arcLength - lineHeight - 24) / (sideWidth + space));
  let distance = Math.max(0, cornerStart - topWidth * scale);
  for (const word of bioWords) {
    if (!word.textContent.length) continue;
    for (const letter of word.querySelectorAll('.bio-letter')) {
      const width = letter.offsetWidth * scale;
      const center = distance + width / 2;
      let x = center;
      let y = 0;
      let angle = 0;
      if (center > cornerStart + arcLength) {
        x = bio.clientWidth;
        y = radius + center - cornerStart - arcLength;
        angle = 90;
      } else if (center > cornerStart) {
        const radians = (center - cornerStart) / radius;
        x = cornerStart + Math.sin(radians) * radius;
        y = radius - Math.cos(radians) * radius;
        angle = radians * 180 / Math.PI;
      }
      letter.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg) scale(${scale}) translateX(${-letter.offsetWidth / 2}px)`;
      distance += width;
      if (angle > 0 && angle < 90) distance += curveSpacing * scale;
    }
    distance += space * scale;
  }
}

function refreshTextLayout() {
  borderWordWidths = undefined;
  bioWords.forEach((word) => {
    const text = word.textContent;
    word.textContent = text;
    if (mobileScreen.matches) {
      word.replaceChildren(...[...text].map((letter) => {
        const span = document.createElement('span');
        span.className = 'bio-letter';
        span.textContent = letter;
        return span;
      }));
    }
  });
  layoutBorderText();
}

function getLogoInsets(element) {
  if (element.classList.contains('profile-icon')) return { x: 0, y: 0 };
  return { x: element.offsetWidth * 34 / 190, y: element.offsetHeight * 7 / 78 };
}

function getBounds(element) {
  const screenBounds = screen.getBoundingClientRect();
  const logoBounds = element.getBoundingClientRect();
  const inset = getLogoInsets(element);

  return {
    left: -inset.x,
    right: screenBounds.width - logoBounds.width + inset.x,
    top: -inset.y,
    bottom: screenBounds.height - logoBounds.height + inset.y,
  };
}

function getHitRect(state) {
  const inset = getLogoInsets(state.element);
  return {
    x: state.x + inset.x,
    y: state.y + inset.y,
    width: state.element.offsetWidth - inset.x * 2,
    height: state.element.offsetHeight - inset.y * 2,
  };
}

function getBioRects() {
  const screenBounds = screen.getBoundingClientRect();
  const targets = mobileScreen.matches ? [...bio.querySelectorAll('.bio-letter')] : bioWords;

  return targets.filter((word) => word.textContent.length > 0).flatMap((word) =>
    [...word.getClientRects()].map((wordBounds) => ({
      x: wordBounds.left - screenBounds.left,
      y: wordBounds.top - screenBounds.top,
      width: wordBounds.width,
      height: wordBounds.height,
    })),
  );
}

function setColor(state) {
  state.element.style.color = colors[state.colorIndex];
}

function randomColorIndex(...excluded) {
  const choices = colors.map((_, index) => index).filter((index) => !excluded.includes(index));
  return choices[Math.floor(Math.random() * choices.length)];
}

function randomIconColor(state, ...excluded) {
  if (state.profile !== 'linkedin') return randomColorIndex(...excluded);
  const blues = ['#2455ff', '#4f8dff'].map((color) => colors.indexOf(color));
  let choices = blues.filter((index) => !excluded.includes(index));
  // With only two blues, preserve distinct colors when two LinkedIn icons collide.
  if (!choices.length) choices = blues.filter((index) => index !== excluded.at(-1));
  return choices[Math.floor(Math.random() * choices.length)];
}

function bounce(state) {
  if (state.profile === 'linkedin') {
    state.profile = 'github';
    state.element.innerHTML = githubIcon;
    state.element.href = 'https://github.com/imranhabib';
    state.element.setAttribute('aria-label', 'Open Imran Habib on GitHub');
  } else if (state.profile === 'github') {
    state.profile = 'linkedin';
    state.element.innerHTML = profileTemplate.innerHTML;
    state.element.href = 'https://www.linkedin.com/in/imranhabibb/';
    state.element.setAttribute('aria-label', 'Open Imran Habib on LinkedIn');
  }
  state.colorIndex = randomIconColor(state, state.colorIndex);
  setColor(state);
}

function render(state) {
  state.element.style.transform = `translate3d(${Math.round(state.x)}px, ${Math.round(state.y)}px, 0)`;
}

function spawnBurst(x, y, color, bubbleCount = 52, scale = 1) {
  const burst = document.createElement('div');
  burst.className = 'burst';
  burst.style.left = `${x}px`;
  burst.style.top = `${y}px`;

  for (let i = 0; i < bubbleCount; i += 1) {
    const bubble = document.createElement('span');
    const angle = (Math.PI * 2 * i) / bubbleCount + Math.random() * 0.3;
    const distance = (26 + Math.random() * 58) * 1.44 * scale;
    const size = (4 + Math.random() * 6) * 1.44 * scale;
    bubble.className = 'burst-bubble';
    bubble.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    bubble.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
    bubble.style.setProperty('--size', `${size}px`);
    bubble.style.setProperty('--color', color);
    bubble.style.animationDelay = `${Math.random() * 40}ms`;
    burst.appendChild(bubble);
  }

  screen.appendChild(burst);
  window.setTimeout(() => burst.remove(), 1000);
}

function createState(element, x, y, dx, dy, colorIndex = 0) {
  const state = { element, x, y, dx, dy, colorIndex, lastTime: 0, collisionCooldown: 0, bioCooldown: 0 };
  logos.push(state);
  setColor(state);
  render(state);
  return state;
}

function spawnLogo(x, y) {
  const element = firstLogo.cloneNode(true);
  element.removeAttribute('aria-hidden');
  element.setAttribute('aria-label', 'DVD Video logo');
  screen.appendChild(element);

  const [dx, dy] = patterns[nextPattern % patterns.length];
  nextPattern += 1;
  const area = getBounds(element);
  createState(
    element,
    Math.max(area.left, Math.min(area.right, x)),
    Math.max(area.top, Math.min(area.bottom, y)),
    dx,
    dy,
    randomColorIndex(),
  );
}

function removeLogo(state) {
  state.element.remove();
  const index = logos.indexOf(state);
  if (index !== -1) logos.splice(index, 1);
}

function spawnProfile() {
  const profile = Math.random() < 0.5 ? 'linkedin' : 'github';
  const element = document.createElement('a');
  element.className = 'linkedin-logo profile-icon';
  element.innerHTML = profile === 'linkedin' ? profileTemplate.innerHTML : githubIcon;
  element.href = profile === 'linkedin' ? 'https://www.linkedin.com/in/imranhabibb/' : 'https://github.com/imranhabib';
  element.target = '_blank';
  element.rel = 'noopener noreferrer';
  element.setAttribute('aria-label', profile === 'linkedin' ? 'Open Imran Habib on LinkedIn' : 'Open Imran Habib on GitHub');
  screen.appendChild(element);

  const [dx, dy] = patterns[nextPattern % patterns.length];
  nextPattern += 1;
  const area = getBounds(element);
  const textBounds = bio.getBoundingClientRect();
  const screenBounds = screen.getBoundingClientRect();
  const x = Math.max(area.left, Math.min(area.right, screen.clientWidth / 2 - element.offsetWidth / 2));
  const aboveText = textBounds.top - screenBounds.top - element.offsetHeight - 10;
  const spawnBelow = aboveText < area.top;
  const y = Math.max(area.top, Math.min(area.bottom, spawnBelow ? textBounds.bottom - screenBounds.top + 10 : aboveText));
  const state = createState(element, x, y, dx, spawnBelow ? Math.abs(dy) : -Math.abs(dy), 1);
  state.profile = profile;
}

function animate(time) {
  if (isTuning || channel !== 1) {
    for (const state of logos) state.lastTime = 0;
    if (!isTuning && channel === 2) updateProfileScroll(time);
    if (!isTuning && channel === 5) updateMatrix(time);
    if (!isTuning && channel === 4) weatherBroadcast.updateClock(time);
    if (!isTuning && channel === 6) snakeGame.update(time);
    requestAnimationFrame(animate);
    return;
  }
  updateTypewriter(time);
  const speedScale = mobileScreen.matches ? 0.7 : 1;
  for (const state of logos) {
    if (!state.lastTime) state.lastTime = time;

    const delta = Math.min((time - state.lastTime) / 1000, 0.05);
    state.lastTime = time;
    state.collisionCooldown = Math.max(0, state.collisionCooldown - delta);
    state.bioCooldown = Math.max(0, state.bioCooldown - delta);

    const area = getBounds(state.element);
    const inset = getLogoInsets(state.element);
    let nextX = state.x + state.dx * delta * speedScale;
    let nextY = state.y + state.dy * delta * speedScale;
    let impactX = nextX + state.element.offsetWidth / 2;
    let impactY = nextY + state.element.offsetHeight / 2;
    let bounced = false;

    if (nextX < area.left || nextX > area.right) {
      state.dx *= -1;
      nextX = Math.max(area.left, Math.min(area.right, nextX));
      impactX = nextX + (state.dx > 0 ? inset.x : state.element.offsetWidth - inset.x);
      bounced = true;
    }

    if (nextY < area.top || nextY > area.bottom) {
      state.dy *= -1;
      nextY = Math.max(area.top, Math.min(area.bottom, nextY));
      impactY = nextY + (state.dy > 0 ? inset.y : state.element.offsetHeight - inset.y);
      bounced = true;
    }

    state.x = nextX;
    state.y = nextY;

    if (bounced) {
      const impactColor = colors[state.colorIndex];
      bounce(state);
      spawnBurst(impactX, impactY, impactColor);
    }
    render(state);
  }

  // Resolve chains of contacts before drawing the next frame.
  for (let pass = 0; pass < 12; pass += 1) {
    if (!detectLogoCollisions()) break;
  }
  detectBioCollisions();

  requestAnimationFrame(animate);
}

function detectBioCollisions() {
  const bioRects = getBioRects();

  for (const state of logos) {
    const logoRect = getHitRect(state);
    const overlaps = bioRects.some((bioRect) => logoRect.x < bioRect.x + bioRect.width
      && logoRect.x + logoRect.width > bioRect.x
      && logoRect.y < bioRect.y + bioRect.height
      && logoRect.y + logoRect.height > bioRect.y);

    if (!overlaps) continue;

    const hitWord = bioRects.find((bioRect) => logoRect.x < bioRect.x + bioRect.width
      && logoRect.x + logoRect.width > bioRect.x
      && logoRect.y < bioRect.y + bioRect.height
      && logoRect.y + logoRect.height > bioRect.y);
    const area = getBounds(state.element);
    const corrections = bioRects.flatMap((rect) => [
      { x: rect.x - logoRect.x - logoRect.width - 1, y: 0 },
      { x: rect.x + rect.width - logoRect.x + 1, y: 0 },
      { x: 0, y: rect.y - logoRect.y - logoRect.height - 1 },
      { x: 0, y: rect.y + rect.height - logoRect.y + 1 },
    ]).filter((correction) => {
      const x = state.x + correction.x;
      const y = state.y + correction.y;
      if (x < area.left || x > area.right || y < area.top || y > area.bottom) return false;

      const movedRect = { ...logoRect, x: logoRect.x + correction.x, y: logoRect.y + correction.y };
      return !bioRects.some((rect) => movedRect.x < rect.x + rect.width
        && movedRect.x + movedRect.width > rect.x
        && movedRect.y < rect.y + rect.height
        && movedRect.y + movedRect.height > rect.y);
    }).sort((a, b) => Math.abs(a.x) + Math.abs(a.y) - Math.abs(b.x) - Math.abs(b.y));

    const correction = corrections[0];
    if (correction) {
      state.x += correction.x;
      state.y += correction.y;
      if (correction.x) state.dx = Math.sign(correction.x) * Math.abs(state.dx);
      if (correction.y) state.dy = Math.sign(correction.y) * Math.abs(state.dy);
      render(state);
    }

    // Always separate overlaps; only the visual effect has a cooldown.
    if (state.bioCooldown > 0) continue;
    state.bioCooldown = 0.35;
    const impactX = (Math.max(logoRect.x, hitWord.x) + Math.min(logoRect.x + logoRect.width, hitWord.x + hitWord.width)) / 2;
    const impactY = (Math.max(logoRect.y, hitWord.y) + Math.min(logoRect.y + logoRect.height, hitWord.y + hitWord.height)) / 2;
    spawnBurst(impactX, impactY, colors[state.colorIndex]);
    bio.style.color = colors[state.colorIndex];
  }
}

function detectLogoCollisions() {
  let hadOverlap = false;
  for (let i = 0; i < logos.length; i += 1) {
    for (let j = i + 1; j < logos.length; j += 1) {
      const first = logos[i];
      const second = logos[j];
      const firstRect = getHitRect(first);
      const secondRect = getHitRect(second);
      const overlaps = firstRect.x < secondRect.x + secondRect.width
        && firstRect.x + firstRect.width > secondRect.x
        && firstRect.y < secondRect.y + secondRect.height
        && firstRect.y + firstRect.height > secondRect.y;

      if (!overlaps) continue;
      hadOverlap = true;
      const showEffect = first.collisionCooldown <= 0 && second.collisionCooldown <= 0;

      const overlapX = Math.min(firstRect.x + firstRect.width - secondRect.x, secondRect.x + secondRect.width - firstRect.x);
      const overlapY = Math.min(firstRect.y + firstRect.height - secondRect.y, secondRect.y + secondRect.height - firstRect.y);
      const impactX = (Math.max(firstRect.x, secondRect.x) + Math.min(firstRect.x + firstRect.width, secondRect.x + secondRect.width)) / 2;
      const impactY = (Math.max(firstRect.y, secondRect.y) + Math.min(firstRect.y + firstRect.height, secondRect.y + secondRect.height)) / 2;
      const impactColor = colors[first.colorIndex];

      if (showEffect && first.colorIndex === second.colorIndex) {
        const previousColor = first.colorIndex;
        first.colorIndex = randomIconColor(first, previousColor);
        second.colorIndex = randomIconColor(second, previousColor, first.colorIndex);
        setColor(first);
        setColor(second);
      }

      const firstArea = getBounds(first.element);
      const secondArea = getBounds(second.element);
      for (const axis of overlapX < overlapY ? ['x', 'y'] : ['y', 'x']) {
        const firstBefore = axis === 'x'
          ? firstRect.x + firstRect.width / 2 <= secondRect.x + secondRect.width / 2
          : firstRect.y + firstRect.height / 2 <= secondRect.y + secondRect.height / 2;
        const direction = firstBefore ? -1 : 1;
        const min = axis === 'x' ? 'left' : 'top';
        const max = axis === 'x' ? 'right' : 'bottom';
        const firstRoom = direction < 0 ? first[axis] - firstArea[min] : firstArea[max] - first[axis];
        const secondRoom = direction < 0 ? secondArea[max] - second[axis] : second[axis] - secondArea[min];
        const depth = (axis === 'x' ? overlapX : overlapY) + 0.5;
        if (firstRoom + secondRoom < depth) continue;

        const firstMove = Math.max(0, depth - secondRoom);
        first[axis] += direction * firstMove;
        second[axis] -= direction * (depth - firstMove);
        const velocity = axis === 'x' ? 'dx' : 'dy';
        first[velocity] = direction * Math.abs(first[velocity]);
        second[velocity] = -direction * Math.abs(second[velocity]);
        break;
      }
      render(first);
      render(second);

      if (showEffect) {
        first.collisionCooldown = 0.35;
        second.collisionCooldown = 0.35;
        spawnBurst(impactX, impactY, impactColor);
      }
    }
  }
  return hadOverlap;
}

function resize() {
  refreshTextLayout();
  for (const state of logos) {
    const area = getBounds(state.element);
    state.x = Math.max(area.left, Math.min(area.right, state.x));
    state.y = Math.max(area.top, Math.min(area.bottom, state.y));
    render(state);
  }

}

let pressedProfileHref = null;

screen.addEventListener('pointerdown', (event) => {
  pressedProfileHref = event.target.closest('.profile-icon')?.href ?? null;
});

screen.addEventListener('pointercancel', () => {
  pressedProfileHref = null;
});

screen.addEventListener('click', (event) => {
  if (channel !== 1) return;
  const profileHref = pressedProfileHref ?? event.target.closest('.profile-icon')?.href;
  pressedProfileHref = null;
  if (profileHref) {
    event.preventDefault();
    event.stopPropagation();
    window.open(profileHref, '_blank', 'noopener,noreferrer');
    return;
  }

  if (event.target.closest('#bio')) {
    spawnProfile();
    return;
  }

  const clickedElement = event.target.closest('.dvd-logo');

  if (clickedElement) {
    const state = logos.find((item) => item.element === clickedElement);
    if (state) removeLogo(state);
    return;
  }

  const screenBounds = screen.getBoundingClientRect();
  const logoBounds = firstLogo.getBoundingClientRect();
  const area = getBounds(firstLogo);
  spawnLogo(
    Math.max(area.left, Math.min(area.right, event.clientX - screenBounds.left - logoBounds.width / 2)),
    Math.max(area.top, Math.min(area.bottom, event.clientY - screenBounds.top - logoBounds.height / 2)),
  );
});

createState(firstLogo, 0, 0, ...patterns[0]);
window.addEventListener('resize', resize);
document.fonts.ready.then(refreshTextLayout);
let channel = 1;
const startup = document.querySelector('.tv-startup');
const channelDisplay = document.querySelector('#channel-display');
const matrixChannel = document.querySelector('#matrix-channel');
const matrixText = document.querySelector('#matrix-text');
const profileChannel = document.querySelector('#profile-channel');
const profileScroll = document.querySelector('.profile-scroll');
const weatherChannel = document.querySelector('#weather-channel');
const weatherBroadcast = createWeatherBroadcast(weatherChannel);
const webcamChannel = document.querySelector('#webcam-channel');
const webcamFrame = webcamChannel.querySelector('iframe');
const snakeChannel = document.querySelector('#snake-channel');
const snakeGame = createSnakeChannel(snakeChannel);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let profileScrollStartedAt;
let profileScrollManualUntil = 0;
let profilePointerHeld = false;
let profileTouchHeld = false;
function pauseProfileScroll() {
  profileScrollManualUntil = performance.now() + 2000;
  profileScrollStartedAt = undefined;
}
profileScroll.addEventListener('wheel', pauseProfileScroll, { passive: true });
profileScroll.addEventListener('pointerdown', () => { profilePointerHeld = true; pauseProfileScroll(); }, { passive: true });
profileScroll.addEventListener('touchstart', () => { profileTouchHeld = true; pauseProfileScroll(); }, { passive: true });
for (const type of ['pointerup', 'pointercancel']) {
  window.addEventListener(type, () => {
    if (profilePointerHeld) { profilePointerHeld = false; pauseProfileScroll(); }
  }, { passive: true });
}
for (const type of ['touchend', 'touchcancel']) {
  window.addEventListener(type, () => {
    if (profileTouchHeld) { profileTouchHeld = false; pauseProfileScroll(); }
  }, { passive: true });
}
profileScroll.addEventListener('scroll', () => {
  if (profileScrollManualUntil > 0) pauseProfileScroll();
}, { passive: true });
profileScroll.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) pauseProfileScroll();
});
let identityPromise;
let matrixMessage = '';
let matrixStartedAt;
let transitionTimer;
let requestedChannel = 1;
let channelDisplayTimer;

function showChannelDisplay() {
  window.clearTimeout(channelDisplayTimer);
  channelDisplay.textContent = `CH ${String(channel).padStart(2, '0')}`;
  channelDisplay.hidden = false;
  channelDisplayTimer = window.setTimeout(() => { channelDisplay.hidden = true; }, 1000);
}

async function prepareMatrix() {
  matrixMessage = '';
  matrixText.textContent = '';
  matrixStartedAt = undefined;
  if (!identityPromise) {
    identityPromise = fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(3000),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    }).then((response) => {
      if (!response.ok) throw new Error('IP lookup failed');
      return response.json();
    }).then((data) => typeof data.ip === 'string' && /^[\d.a-f:]+$/i.test(data.ip) ? data.ip : 'visitor')
      .catch(() => 'visitor');
  }
  const identity = await identityPromise;
  if (channel !== 5) return;
  const localTime = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date());
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  matrixMessage = `Connection established.\nLocal time: ${localTime}\nTimezone: ${timezone}\n\nWake up, ${identity}...\nThe Matrix has you...\nFollow the white rabbit.\nKnock, knock, ${identity}.`;
  matrixStartedAt = undefined;
}

function updateMatrix(time) {
  if (!matrixMessage) return;
  if (matrixStartedAt === undefined) matrixStartedAt = time;
  const count = Math.floor((time - matrixStartedAt) / 45);
  const text = matrixMessage.slice(0, count);
  if (matrixText.textContent !== text) matrixText.textContent = text;
}

function updateProfileScroll(time) {
  if (reducedMotion.matches || profilePointerHeld || profileTouchHeld || time < profileScrollManualUntil) return;
  const distance = profileScroll.scrollHeight - profileScroll.clientHeight;
  if (distance <= 0) return;
  profileScrollManualUntil = 0;
  if (profileScrollStartedAt === undefined) profileScrollStartedAt = time - profileScroll.scrollTop / 36 * 1000;
  const elapsed = (time - profileScrollStartedAt) / 1000;
  const phase = elapsed % (distance / 36 + 5);
  profileScroll.scrollTop = Math.max(0, Math.min(distance, phase * 36));
}

function changeChannel(step) {
  requestedChannel = ((requestedChannel - 1 + step + 6) % 6) + 1;
  snakeGame.pause();
  window.clearTimeout(transitionTimer);
  screen.classList.add('channel-changing');
  pressedProfileHref = null;
  transitionTimer = window.setTimeout(() => {
    channel = requestedChannel;
    screen.dataset.channel = String(channel);
    showChannelDisplay();
    matrixChannel.hidden = channel !== 5;
    profileChannel.hidden = channel !== 2;
    weatherChannel.hidden = channel !== 4;
    webcamChannel.hidden = channel !== 3;
    snakeChannel.hidden = channel !== 6;
    if (channel === 3) {
      if (!webcamFrame.hasAttribute('src')) webcamFrame.src = webcamFrame.dataset.src;
    } else webcamFrame.removeAttribute('src');
    if (channel === 6) snakeGame.activate();
    else if (channel === 5) prepareMatrix();
    else if (channel === 2) {
      profileScroll.scrollTop = 0;
      profileScrollStartedAt = undefined;
      profileScrollManualUntil = 0;
      profilePointerHeld = false;
      profileTouchHeld = false;
    } else if (channel === 4) weatherBroadcast.load();
    else if (channel === 1) {
      typingStartedAt = performance.now() - typedLetters * 35;
      refreshTextLayout();
    }
    screen.classList.remove('channel-changing');
  }, 180);
}

document.querySelector('#channel-down').addEventListener('click', () => changeChannel(-1));
document.querySelector('#channel-up').addEventListener('click', () => changeChannel(1));
window.setTimeout(() => {
  startup.hidden = true;
  document.body.classList.remove('is-starting');
  isTuning = false;
  showChannelDisplay();
}, 2100);
requestAnimationFrame(animate);
