// Screen physics for the bouncing icons on the DVD channel. No DOM: callers measure, this moves.
//
// icon:  { x, y, dx, dy, width, height, inset: { x, y }, lastTime, collisionCooldown, bioCooldown }
//        x/y is the element's top-left corner in px; dx/dy is velocity in px per second.
//        inset trims transparent padding from the icon's hit box and lets it overhang the walls.
// world: { width, height } of the screen in px.
// Extra fields on an icon (element, colour, ...) are left alone.
const maxDelta = 0.05;
const effectCooldown = 0.35;
const maxPasses = 12;

export function bounds(icon, world) {
  return {
    left: -icon.inset.x,
    right: world.width - icon.width + icon.inset.x,
    top: -icon.inset.y,
    bottom: world.height - icon.height + icon.inset.y,
  };
}

// Forget each icon's last frame time, so the next step does not jump over the time away.
export function pause(icons) {
  for (const icon of icons) icon.lastTime = 0;
}

// Advances every icon to `time` (ms) and resolves all overlaps.
// Returns the impacts in the order they happened, each with an impact point in px:
//   { kind: 'wall', icon, x, y }          the icon bounced off a screen edge
//   { kind: 'pair', icons: [a, b], x, y } two icons hit each other
//   { kind: 'text', icon, x, y }          the icon hit one of the obstacle rects
// Overlaps are always separated; 'pair' and 'text' impacts are only reported outside an icon's cooldown.
export function step(icons, { time, world, obstacles = [], speed = 1 }) {
  const impacts = [];
  for (const icon of icons) move(icon, time, world, speed, impacts);
  // Resolve chains of contacts before drawing the next frame.
  for (let pass = 0; pass < maxPasses; pass += 1) {
    if (!separatePairs(icons, world, impacts)) break;
  }
  separateFromObstacles(icons, world, obstacles, impacts);
  return impacts;
}

function hitRect(icon) {
  return {
    x: icon.x + icon.inset.x,
    y: icon.y + icon.inset.y,
    width: icon.width - icon.inset.x * 2,
    height: icon.height - icon.inset.y * 2,
  };
}

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function move(icon, time, world, speed, impacts) {
  if (!icon.lastTime) icon.lastTime = time;
  const delta = Math.min((time - icon.lastTime) / 1000, maxDelta);
  icon.lastTime = time;
  icon.collisionCooldown = Math.max(0, icon.collisionCooldown - delta);
  icon.bioCooldown = Math.max(0, icon.bioCooldown - delta);

  const area = bounds(icon, world);
  let nextX = icon.x + icon.dx * delta * speed;
  let nextY = icon.y + icon.dy * delta * speed;
  let impactX = nextX + icon.width / 2;
  let impactY = nextY + icon.height / 2;
  let bounced = false;

  if (nextX < area.left || nextX > area.right) {
    icon.dx *= -1;
    nextX = clamp(nextX, area.left, area.right);
    impactX = nextX + (icon.dx > 0 ? icon.inset.x : icon.width - icon.inset.x);
    bounced = true;
  }
  if (nextY < area.top || nextY > area.bottom) {
    icon.dy *= -1;
    nextY = clamp(nextY, area.top, area.bottom);
    impactY = nextY + (icon.dy > 0 ? icon.inset.y : icon.height - icon.inset.y);
    bounced = true;
  }

  icon.x = nextX;
  icon.y = nextY;
  if (bounced) impacts.push({ kind: 'wall', icon, x: impactX, y: impactY });
}

function separatePairs(icons, world, impacts) {
  let hadOverlap = false;
  for (let i = 0; i < icons.length; i += 1) {
    for (let j = i + 1; j < icons.length; j += 1) {
      const first = icons[i];
      const second = icons[j];
      const firstRect = hitRect(first);
      const secondRect = hitRect(second);
      if (!overlaps(firstRect, secondRect)) continue;
      hadOverlap = true;
      const showEffect = first.collisionCooldown <= 0 && second.collisionCooldown <= 0;

      const overlapX = Math.min(firstRect.x + firstRect.width - secondRect.x, secondRect.x + secondRect.width - firstRect.x);
      const overlapY = Math.min(firstRect.y + firstRect.height - secondRect.y, secondRect.y + secondRect.height - firstRect.y);
      const impactX = (Math.max(firstRect.x, secondRect.x) + Math.min(firstRect.x + firstRect.width, secondRect.x + secondRect.width)) / 2;
      const impactY = (Math.max(firstRect.y, secondRect.y) + Math.min(firstRect.y + firstRect.height, secondRect.y + secondRect.height)) / 2;

      const firstArea = bounds(first, world);
      const secondArea = bounds(second, world);
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

      if (showEffect) {
        first.collisionCooldown = effectCooldown;
        second.collisionCooldown = effectCooldown;
        impacts.push({ kind: 'pair', icons: [first, second], x: impactX, y: impactY });
      }
    }
  }
  return hadOverlap;
}

function separateFromObstacles(icons, world, obstacles, impacts) {
  for (const icon of icons) {
    const rect = hitRect(icon);
    const hit = obstacles.find((obstacle) => overlaps(rect, obstacle));
    if (!hit) continue;

    const area = bounds(icon, world);
    const correction = obstacles.flatMap((obstacle) => [
      { x: obstacle.x - rect.x - rect.width - 1, y: 0 },
      { x: obstacle.x + obstacle.width - rect.x + 1, y: 0 },
      { x: 0, y: obstacle.y - rect.y - rect.height - 1 },
      { x: 0, y: obstacle.y + obstacle.height - rect.y + 1 },
    ]).filter((move) => {
      const x = icon.x + move.x;
      const y = icon.y + move.y;
      if (x < area.left || x > area.right || y < area.top || y > area.bottom) return false;
      const moved = { ...rect, x: rect.x + move.x, y: rect.y + move.y };
      return !obstacles.some((obstacle) => overlaps(moved, obstacle));
    }).sort((a, b) => Math.abs(a.x) + Math.abs(a.y) - Math.abs(b.x) - Math.abs(b.y))[0];

    if (correction) {
      icon.x += correction.x;
      icon.y += correction.y;
      if (correction.x) icon.dx = Math.sign(correction.x) * Math.abs(icon.dx);
      if (correction.y) icon.dy = Math.sign(correction.y) * Math.abs(icon.dy);
    }

    // Always separate overlaps; only the visual effect has a cooldown.
    if (icon.bioCooldown > 0) continue;
    icon.bioCooldown = effectCooldown;
    impacts.push({
      kind: 'text',
      icon,
      x: (Math.max(rect.x, hit.x) + Math.min(rect.x + rect.width, hit.x + hit.width)) / 2,
      y: (Math.max(rect.y, hit.y) + Math.min(rect.y + rect.height, hit.y + hit.height)) / 2,
    });
  }
}
