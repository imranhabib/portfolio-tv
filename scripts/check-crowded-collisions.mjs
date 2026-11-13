import assert from 'node:assert/strict';
import * as physics from '../src/physics.js';

const world = { width: 1000, height: 600 };
const icon = (fields) => ({ width: 40, height: 40, inset: { x: 0, y: 0 }, lastTime: 0, collisionCooldown: 0, bioCooldown: 0, ...fields });

for (const count of [2, 4, 8, 12, 24]) {
  const logos = Array.from({ length: count }, (_, i) => icon({ x: i * 30, y: 100, dx: i % 2 ? -240 : 240, dy: 100, collisionCooldown: 0.2 }));
  // First step has no elapsed time, so only separation runs.
  const impacts = physics.step(logos, { time: 1000, world });
  assert.equal(impacts.length, 0, 'Cooldown must suppress effects, not separation');
  for (let i = 0; i < count; i++) {
    const a = logos[i];
    assert.ok(a.x >= 0 && a.x <= 960 && a.y >= 0 && a.y <= 560);
    for (let j = i + 1; j < count; j++) {
      const b = logos[j];
      assert.ok(!(a.x < b.x + 40 && a.x + 40 > b.x && a.y < b.y + 40 && a.y + 40 > b.y), `${count} icons: pair ${i},${j} overlaps`);
    }
  }
}
{
  const [a, b] = [icon({ x: 100, y: 100, dx: 240, dy: 0 }), icon({ x: 130, y: 100, dx: -240, dy: 0 })];
  const impacts = physics.step([a, b], { time: 1000, world });
  assert.equal(impacts.length, 1);
  assert.equal(impacts[0].kind, 'pair');
  assert.deepEqual(impacts[0].icons, [a, b]);
  assert.ok(a.dx < 0 && b.dx > 0, 'Colliding icons move apart');
  assert.equal(a.collisionCooldown, 0.35);
}
{
  const wall = icon({ x: 955, y: 100, dx: 240, dy: 0, inset: { x: 5, y: 0 } });
  physics.step([wall], { time: 1000, world });
  const impacts = physics.step([wall], { time: 1050, world });
  assert.deepEqual(impacts.map(impact => impact.kind), ['wall']);
  assert.equal(wall.dx, -240, 'Walls reverse velocity');
  assert.equal(wall.x, 965, 'Inset lets the icon overhang the wall');
  assert.equal(impacts[0].x, 1000, 'Impact is at the visible edge');
}
{
  const slow = icon({ x: 100, y: 100, dx: 100, dy: 0 });
  physics.step([slow], { time: 1000, world });
  physics.step([slow], { time: 1010, world, speed: 0.5 });
  assert.equal(slow.x, 100.5, 'Speed scales movement');
  physics.pause([slow]);
  physics.step([slow], { time: 60000, world });
  assert.equal(slow.x, 100.5, 'After a pause the next step does not jump');
  physics.step([slow], { time: 70000, world });
  assert.equal(slow.x, 105.5, 'A long frame moves at most 50 ms');
}
console.log('Passed: crowded collision groups up to 24 icons, cooldowns, pair impacts, walls, insets, speed, pause, and frame cap.');
