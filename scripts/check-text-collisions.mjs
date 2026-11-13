import assert from 'node:assert/strict';
import * as physics from '../src/physics.js';

const obstacles = [
  { x: 100, y: 100, width: 100, height: 20 },
  { x: 110, y: 130, width: 80, height: 20 },
];
const world = { width: 500, height: 500 };
const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x
  && a.y < b.y + b.height && a.y + a.height > b.y;

for (const cooldown of [0, 0.2]) {
  for (const position of [{ x: 120, y: 90 }, { x: 90, y: 105 }, { x: 120, y: 125 }]) {
    const icon = { ...position, dx: 240, dy: 176, width: 40, height: 40, inset: { x: 0, y: 0 }, lastTime: 0, collisionCooldown: 0, bioCooldown: cooldown };
    const impacts = physics.step([icon], { time: 1000, world, obstacles });
    assert.ok(!obstacles.some(rect => overlaps({ x: icon.x, y: icon.y, width: 40, height: 40 }, rect)), `Overlap remains with cooldown ${cooldown} at ${JSON.stringify(position)}`);
    assert.equal(impacts.filter(impact => impact.kind === 'text').length, cooldown === 0 ? 1 : 0);
    const resolved = { x: icon.x, y: icon.y, dx: icon.dx, dy: icon.dy };
    physics.step([icon], { time: 1000, world, obstacles });
    assert.deepEqual({ x: icon.x, y: icon.y, dx: icon.dx, dy: icon.dy }, resolved);
  }
}
console.log('Passed: text separation from all sides, stacked lines, cooldown, and repeated checks.');
