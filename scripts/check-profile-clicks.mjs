import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const handlers = {};
const opened = [];
let spawned = 0;
const background = { closest: () => null };
const context = vm.createContext({
  channel: 1,
  screen: { addEventListener: (type, fn) => { handlers[type] = fn; }, getBoundingClientRect: () => ({left: 0, top: 0}) },
  window: { open: (...args) => opened.push(args) },
  firstLogo: {getBoundingClientRect: () => ({width: 190, height: 78})},
  getBounds: () => ({left: 0, right: 800, top: 0, bottom: 600}),
  spawnLogo: () => { spawned += 1; },
});
const start = source.includes('let pressedProfileHref') ? source.indexOf('let pressedProfileHref') : source.indexOf("screen.addEventListener('click'");
vm.runInContext(source.slice(start, source.lastIndexOf('createState(firstLogo')), context);
assert.equal(typeof handlers.pointerdown, 'function', 'Profile press must survive a moving click target');
for (const href of ['https://www.linkedin.com/in/imranhabibb/', 'https://github.com/imranhabib']) {
  const icon = {href};
  const target = {closest: selector => selector === '.profile-icon' ? icon : null};
  handlers.pointerdown({target});
  handlers.click({target: background, clientX: 200, clientY: 200, preventDefault() {}, stopPropagation() {}});
  assert.deepEqual(opened.at(-1), [href, '_blank', 'noopener,noreferrer']);
  handlers.click({target, preventDefault() {}, stopPropagation() {}});
  assert.equal(opened.at(-1)[0], href);
}
assert.equal(spawned, 0, 'Profile clicks must never spawn DVDs');
handlers.pointerdown({target: background});
handlers.click({target: background, clientX: 200, clientY: 200});
assert.equal(spawned, 1, 'Background clicks still spawn DVDs');
console.log('Passed: moving-target and direct profile clicks open correct links without spawning DVDs.');
