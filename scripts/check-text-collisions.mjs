import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const detect = source.slice(source.indexOf('function detectBioCollisions()'), source.indexOf('function detectLogoCollisions()'));
const rects = [
  { x: 100, y: 100, width: 100, height: 20 },
  { x: 110, y: 130, width: 80, height: 20 },
];
const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x
  && a.y < b.y + b.height && a.y + a.height > b.y;

for (const cooldown of [0, 0.2]) {
  for (const position of [{ x: 120, y: 90 }, { x: 90, y: 105 }, { x: 120, y: 125 }]) {
    const state = { ...position, dx: 240, dy: 176, bioCooldown: cooldown, colorIndex: 0, element: {} };
    const getHitRect = state => ({ x: state.x, y: state.y, width: 40, height: 40 });
    let bursts = 0;
    const context = vm.createContext({
      mobileScreen: { matches: false },
      logos: [state], getBioRects: () => rects, getHitRect,
      getBounds: () => ({ left: 0, top: 0, right: 460, bottom: 460 }),
      spawnBurst: () => { bursts += 1; }, render: () => {},
      colors: ['#bd4cff'], bio: { style: {} },
    });
    vm.runInContext(detect + '\ndetectBioCollisions();', context);
    assert.ok(!rects.some(rect => overlaps(getHitRect(state), rect)), `Overlap remains with cooldown ${cooldown} at ${JSON.stringify(position)}`);
    assert.equal(bursts, cooldown === 0 ? 1 : 0);
    const resolved = { x: state.x, y: state.y, dx: state.dx, dy: state.dy };
    vm.runInContext('detectBioCollisions();', context);
    assert.deepEqual({ x: state.x, y: state.y, dx: state.dx, dy: state.dy }, resolved);
  }
}
console.log('Passed: text separation from all sides, stacked lines, cooldown, and repeated checks.');
