import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const detector = source.slice(source.indexOf('function detectLogoCollisions()'), source.indexOf('function resize()'));
for (const count of [2, 4, 8, 12, 24]) {
  const logos = Array.from({ length: count }, (_, i) => ({
    x: i * 30, y: 100, dx: i % 2 ? -240 : 240, dy: 100,
    colorIndex: i % 2, collisionCooldown: 0.2, element: {},
  }));
  const context = vm.createContext({
    logos, getHitRect: s => ({ x: s.x, y: s.y, width: 40, height: 40 }),
    getBounds: () => ({ left: 0, right: 960, top: 0, bottom: 560 }),
    render() {}, colors: ['red', 'blue'],
    spawnBurst() { assert.fail('Cooldown must suppress effects, not separation'); },
  });
  vm.runInContext(detector + '\nfor (let pass = 0; pass < 12; pass++) { if (!detectLogoCollisions()) break; }', context);
  for (let i = 0; i < count; i++) {
    const a = logos[i];
    assert.ok(a.x >= 0 && a.x <= 960 && a.y >= 0 && a.y <= 560);
    for (let j = i + 1; j < count; j++) {
      const b = logos[j];
      assert.ok(!(a.x < b.x + 40 && a.x + 40 > b.x && a.y < b.y + 40 && a.y + 40 > b.y), `${count} icons: pair ${i},${j} overlaps`);
    }
  }
}
console.log('Passed: crowded collision groups up to 24 icons, cooldowns, and wall boundaries.');
