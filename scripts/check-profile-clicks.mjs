import assert from 'node:assert/strict';
import { createDvdChannel } from '../src/dvd.js';

// A small fake DOM: just enough for the DVD channel's click handling.
function fakeElement(className, size = { width: 190, height: 78 }) {
  return {
    className, style: { setProperty() {} }, attributes: {}, children: [],
    offsetWidth: size.width, offsetHeight: size.height,
    classList: { contains(name) { return this.owner.className.split(' ').includes(name); } },
    getBoundingClientRect() { return { left: 0, top: 0, width: this.offsetWidth, height: this.offsetHeight, right: this.offsetWidth, bottom: this.offsetHeight }; },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    cloneNode() { return element(this.className); },
    remove() { this.removed = true; },
    closest(selector) { return selector === `.${this.className.split(' ').at(-1)}` ? this : null; },
  };
}
function element(className, size) {
  const node = fakeElement(className, size);
  node.classList.owner = node;
  return node;
}

const originals = { window: globalThis.window, document: globalThis.document };
try {
  const opened = [];
  globalThis.window = {
    matchMedia: () => ({ matches: false }), addEventListener() {}, setTimeout() {},
    open: (...args) => opened.push(args),
  };
  globalThis.document = {
    fonts: { ready: new Promise(() => {}) },
    createElement: () => element('', { width: 54, height: 54 }),
  };
  const firstLogo = element('dvd-logo');
  const bio = { querySelectorAll: () => [], getBoundingClientRect: () => ({ top: 250, bottom: 300 }) };
  const handlers = {};
  const added = [];
  const screen = {
    clientWidth: 800,
    querySelector: (selector) => ({ '.dvd-logo': firstLogo, '#bio': bio, '.linkedin-logo.is-template': { innerHTML: '<svg></svg>' } })[selector],
    addEventListener: (type, fn) => { handlers[type] = fn; },
    appendChild: (node) => added.push(node),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  };
  const dvd = createDvdChannel(screen);
  const background = { closest: () => null };
  const spawnedLogos = () => added.filter((node) => node.className === 'dvd-logo');
  const spawnedIcons = () => added.filter((node) => node.className === 'linkedin-logo profile-icon');

  for (const href of ['https://www.linkedin.com/in/imranhabibb/', 'https://github.com/imranhabib']) {
    const icon = { href };
    const target = { closest: (selector) => selector === '.profile-icon' ? icon : null };
    handlers.pointerdown({ target });
    handlers.click({ target: background, clientX: 200, clientY: 200, preventDefault() {}, stopPropagation() {} });
    assert.deepEqual(opened.at(-1), [href, '_blank', 'noopener,noreferrer'], 'Profile press must survive a moving click target');
    handlers.click({ target, preventDefault() {}, stopPropagation() {} });
    assert.equal(opened.at(-1)[0], href);
  }
  assert.equal(spawnedLogos().length, 0, 'Profile clicks must never spawn DVDs');

  handlers.pointerdown({ target: background });
  handlers.click({ target: background, clientX: 200, clientY: 200 });
  assert.equal(spawnedLogos().length, 1, 'Background clicks still spawn DVDs');

  const logo = spawnedLogos()[0];
  handlers.pointerdown({ target: logo });
  handlers.click({ target: logo });
  assert.ok(logo.removed, 'Clicking a DVD removes it');

  const bioTarget = { closest: (selector) => selector === '#bio' ? bio : null };
  handlers.pointerdown({ target: bioTarget });
  handlers.click({ target: bioTarget });
  const [icon] = spawnedIcons();
  assert.ok(icon, 'Clicking the Bio spawns a Profile icon');
  assert.ok(/linkedin|github/.test(icon.href));
  assert.equal(icon.attributes['aria-label'], icon.href.includes('github') ? 'Open Imran Habib on GitHub' : 'Open Imran Habib on LinkedIn');

  const pressed = { closest: (selector) => selector === '.profile-icon' ? { href: 'https://github.com/imranhabib' } : null };
  handlers.pointerdown({ target: pressed });
  dvd.leave();
  const openedBefore = opened.length;
  handlers.click({ target: background, clientX: 200, clientY: 200 });
  assert.equal(opened.length, openedBefore, 'Clicks do nothing while the DVD channel is off screen');
  assert.equal(spawnedLogos().length, 1);
  dvd.enter();
  handlers.click({ target: background, clientX: 200, clientY: 200 });
  assert.equal(opened.length, openedBefore, 'Leaving the channel forgets a pending profile press');
  assert.equal(spawnedLogos().length, 2);
  console.log('Passed: moving-target and direct profile clicks open correct links without spawning DVDs; DVD add/remove, Bio click, and off-screen clicks.');
} finally {
  globalThis.window = originals.window;
  globalThis.document = originals.document;
}
