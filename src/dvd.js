// DVD channel: bouncing DVD logos and Profile icons around the typewriter Bio.
// Click the screen to add a DVD, click a DVD to remove it, click the Bio to add a Profile icon,
// click a Profile icon to open it.
import { createBio } from './bio.js';
import * as physics from './physics.js';

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

// At most this many DVD logos at once, whether added by clicks or on returning to the channel.
const maxDvdLogos = 20;

const patterns = [
  [ 240, 176 ],
  [ -204, 252 ],
  [ 282, -138 ],
  [ -168, -264 ],
  [ 228, 216 ],
  [ -276, 156 ],
];

export function createDvdChannel(screen) {
  const firstLogo = screen.querySelector('.dvd-logo');
  const bioElement = screen.querySelector('#bio');
  const mobileScreen = window.matchMedia('(max-width: 600px)');
  const bio = createBio(bioElement, screen, mobileScreen);
  const profileTemplate = screen.querySelector('.linkedin-logo.is-template');
  const profiles = {
    linkedin: { href: 'https://www.linkedin.com/in/imranhabibb/', label: 'Open Imran Habib on LinkedIn', icon: profileTemplate.innerHTML, palette: ['#2455ff', '#4f8dff'], next: 'github' },
    github: { href: 'https://github.com/imranhabib', label: 'Open Imran Habib on GitHub', icon: githubIcon, next: 'linkedin' },
  };

  function showProfile(element, name) {
    const profile = profiles[name];
    element.innerHTML = profile.icon;
    element.href = profile.href;
    element.setAttribute('aria-label', profile.label);
  }

  const logos = [];
  let nextPattern = 1;

  function getLogoInsets(element) {
    if (element.classList.contains('profile-icon')) return { x: 0, y: 0 };
    return { x: element.offsetWidth * 34 / 190, y: element.offsetHeight * 7 / 78 };
  }

  function measure(element) {
    return { width: element.offsetWidth, height: element.offsetHeight, inset: getLogoInsets(element) };
  }

  function getWorld() {
    const screenBounds = screen.getBoundingClientRect();
    return { width: screenBounds.width, height: screenBounds.height };
  }

  function getBounds(element) {
    return physics.bounds(measure(element), getWorld());
  }

  function clampToArea(area, x, y) {
    return {
      x: Math.max(area.left, Math.min(area.right, x)),
      y: Math.max(area.top, Math.min(area.bottom, y)),
    };
  }

  function nextVelocity() {
    const velocity = patterns[nextPattern % patterns.length];
    nextPattern += 1;
    return velocity;
  }

  function setColor(state) {
    state.element.style.color = colors[state.colorIndex];
  }

  function randomColorIndex(...excluded) {
    const choices = colors.map((_, index) => index).filter((index) => !excluded.includes(index));
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function randomIconColor(state, ...excluded) {
    const palette = profiles[state.profile]?.palette;
    if (!palette) return randomColorIndex(...excluded);
    const allowed = palette.map((color) => colors.indexOf(color));
    let choices = allowed.filter((index) => !excluded.includes(index));
    // With a two-colour palette, preserve distinct colors when two matching icons collide.
    if (!choices.length) choices = allowed.filter((index) => index !== excluded.at(-1));
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function bounce(state) {
    if (state.profile) {
      state.profile = profiles[state.profile].next;
      showProfile(state.element, state.profile);
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
    if (logos.filter((state) => !state.profile).length >= maxDvdLogos) return;
    const element = firstLogo.cloneNode(true);
    element.removeAttribute('aria-hidden');
    element.setAttribute('aria-label', 'DVD Video logo');
    screen.appendChild(element);

    const [dx, dy] = nextVelocity();
    const position = clampToArea(getBounds(element), x, y);
    createState(element, position.x, position.y, dx, dy, randomColorIndex());
  }

  function spawnLogoAnywhere() {
    const world = getWorld();
    spawnLogo(Math.random() * world.width, Math.random() * world.height);
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
    showProfile(element, profile);
    element.target = '_blank';
    element.rel = 'noopener noreferrer';
    screen.appendChild(element);

    const [dx, dy] = nextVelocity();
    const area = getBounds(element);
    const textBounds = bioElement.getBoundingClientRect();
    const screenBounds = screen.getBoundingClientRect();
    const aboveText = textBounds.top - screenBounds.top - element.offsetHeight - 10;
    const spawnBelow = aboveText < area.top;
    const position = clampToArea(
      area,
      screen.clientWidth / 2 - element.offsetWidth / 2,
      spawnBelow ? textBounds.bottom - screenBounds.top + 10 : aboveText,
    );
    const state = createState(element, position.x, position.y, dx, spawnBelow ? Math.abs(dy) : -Math.abs(dy), 1);
    state.profile = profile;
  }

  function playImpact(impact) {
    if (impact.kind === 'wall') {
      const impactColor = colors[impact.icon.colorIndex];
      bounce(impact.icon);
      spawnBurst(impact.x, impact.y, impactColor);
    } else if (impact.kind === 'pair') {
      const [first, second] = impact.icons;
      const impactColor = colors[first.colorIndex];
      if (first.colorIndex === second.colorIndex) {
        const previousColor = first.colorIndex;
        first.colorIndex = randomIconColor(first, previousColor);
        second.colorIndex = randomIconColor(second, previousColor, first.colorIndex);
        setColor(first);
        setColor(second);
      }
      spawnBurst(impact.x, impact.y, impactColor);
    } else {
      spawnBurst(impact.x, impact.y, colors[impact.icon.colorIndex]);
      bio.setColor(colors[impact.icon.colorIndex]);
    }
  }

  function resize() {
    bio.relayout();
    for (const state of logos) {
      Object.assign(state, clampToArea(getBounds(state.element), state.x, state.y));
      render(state);
    }
  }

  let active = true;
  // True after reset(), so the next showing does not count as a return.
  let fresh = false;
  let pressedProfileHref = null;

  screen.addEventListener('pointerdown', (event) => {
    pressedProfileHref = event.target.closest('.profile-icon')?.href ?? null;
  });

  screen.addEventListener('pointercancel', () => {
    pressedProfileHref = null;
  });

  screen.addEventListener('click', (event) => {
    if (!active) return;
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
    const position = clampToArea(
      getBounds(firstLogo),
      event.clientX - screenBounds.left - logoBounds.width / 2,
      event.clientY - screenBounds.top - logoBounds.height / 2,
    );
    spawnLogo(position.x, position.y);
  });

  createState(firstLogo, 0, 0, ...patterns[0]);
  window.addEventListener('resize', resize);
  document.fonts.ready.then(() => bio.relayout());

  return {
    enter() {
      active = true;
      bio.resume(performance.now());
      // Each return to the channel adds a DVD logo, except the first showing after a reset.
      if (fresh) fresh = false;
      else spawnLogoAnywhere();
    },
    // Back to the start: only the original DVD logo, and the bio types again from the beginning.
    reset() {
      [...logos].forEach(removeLogo);
      nextPattern = 1;
      screen.appendChild(firstLogo);
      createState(firstLogo, 0, 0, ...patterns[0]);
      bio.restart();
      fresh = true;
    },
    leave() {
      active = false;
      pressedProfileHref = null;
      physics.pause(logos);
    },
    update(time) {
      const letter = bio.advance(time);
      if (letter) spawnBurst(letter.x, letter.y, colors[randomColorIndex()], 8, 0.48);
      for (const state of logos) Object.assign(state, measure(state.element));
      const impacts = physics.step(logos, {
        time, world: getWorld(), obstacles: bio.rects(), speed: mobileScreen.matches ? 0.7 : 1,
      });
      impacts.forEach(playImpact);
      logos.forEach(render);
    },
  };
}
