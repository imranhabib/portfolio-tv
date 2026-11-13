const size = 20;

export function createSnakeGame(random = Math.random) {
  const game = { body: [], direction: [1, 0], turns: [], food: null, score: 0, ended: false };
  function placeFood() {
    const empty = [];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (!game.body.some(cell => cell[0] === x && cell[1] === y)) empty.push([x, y]);
    }
    game.food = empty.length ? empty[Math.floor(random() * empty.length)] : null;
    if (!game.food) game.ended = true;
  }
  game.reset = () => {
    game.body = [[9, 10], [8, 10], [7, 10]];
    game.direction = [1, 0];
    game.turns = [];
    game.score = 0;
    game.ended = false;
    placeFood();
  };
  game.turn = (dx, dy) => {
    const previous = game.turns.at(-1) || game.direction;
    if (game.turns.length < 2 && dx * previous[0] + dy * previous[1] === 0) game.turns.push([dx, dy]);
  };
  game.step = () => {
    if (game.ended) return;
    if (game.turns.length) game.direction = game.turns.shift();
    const head = [game.body[0][0] + game.direction[0], game.body[0][1] + game.direction[1]];
    const eating = game.food && head[0] === game.food[0] && head[1] === game.food[1];
    const occupied = eating ? game.body : game.body.slice(0, -1);
    if (head.some(value => value < 0 || value >= size) || occupied.some(cell => cell[0] === head[0] && cell[1] === head[1])) {
      game.ended = true;
      return;
    }
    game.body.unshift(head);
    if (eating) { game.score++; placeFood(); }
    else game.body.pop();
  };
  game.reset();
  return game;
}

export function createSnakeChannel(element) {
  const canvas = element.querySelector('canvas');
  const context = canvas.getContext('2d');
  const score = element.querySelector('.snake-score');
  const bestScore = element.querySelector('.snake-best');
  const overlay = element.querySelector('.snake-overlay');
  const heading = element.querySelector('.snake-message');
  const button = element.querySelector('.snake-start');
  const game = createSnakeGame();
  let best = 0;
  try { best = Math.max(0, Number(localStorage.getItem('crt-snake-best')) || 0); } catch { /* Storage may be disabled. */ }
  let active = false;
  let state = 'ready';
  let lastTime;
  let accumulated = 0;
  let gesture;

  function draw() {
    context.fillStyle = '#020b04';
    context.fillRect(0, 0, 480, 480);
    context.strokeStyle = '#12331a';
    context.lineWidth = 1;
    for (let n = 0; n <= size; n++) {
      context.beginPath();
      context.moveTo(n * 24, 0); context.lineTo(n * 24, 480);
      context.moveTo(0, n * 24); context.lineTo(480, n * 24); context.stroke();
    }
    if (game.food) {
      context.fillStyle = '#e9ffc6';
      context.fillRect(game.food[0] * 24 + 7, game.food[1] * 24 + 7, 10, 10);
    }
    game.body.forEach(([x, y], index) => {
      context.fillStyle = index === 0 ? '#bdff8d' : '#46e765';
      context.fillRect(x * 24 + 2, y * 24 + 2, 20, 20);
    });
    score.textContent = String(game.score).padStart(3, '0');
    bestScore.textContent = String(best).padStart(3, '0');
    overlay.hidden = state === 'running';
    heading.textContent = state === 'ready' ? 'SNAKE' : state === 'paused' ? 'PAUSED' : game.food ? 'GAME OVER' : 'YOU WIN';
    button.textContent = state === 'ready' ? 'START GAME' : state === 'paused' ? 'RESUME' : 'PLAY AGAIN';
  }

  function start() {
    if (!active) return;
    if (state === 'ready' || state === 'over') game.reset();
    state = 'running';
    lastTime = undefined;
    accumulated = 0;
    draw();
  }
  button.addEventListener('click', start);
  const keys = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
  window.addEventListener('keydown', event => {
    if (!active || event.ctrlKey || event.metaKey || event.altKey) return;
    const direction = keys[event.key] || keys[event.key.toLowerCase()];
    if (direction) {
      event.preventDefault();
      if (state === 'running') game.turn(...direction);
    } else if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
      event.preventDefault();
      if (state === 'running') { state = 'paused'; draw(); }
      else start();
    }
  });
  canvas.addEventListener('pointerdown', event => {
    gesture = [event.clientX, event.clientY];
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!gesture || !active || state !== 'running') return;
    const dx = event.clientX - gesture[0];
    const dy = event.clientY - gesture[1];
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    game.turn(...(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]));
    gesture = [event.clientX, event.clientY];
  });
  for (const type of ['pointerup', 'pointercancel']) canvas.addEventListener(type, () => { gesture = undefined; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'running') { state = 'paused'; draw(); }
  });

  return {
    element,
    enter() { active = true; lastTime = undefined; draw(); },
    leave() {
      active = false;
      gesture = undefined;
      lastTime = undefined;
      if (state === 'running') state = 'paused';
    },
    update(time) {
      if (!active || state !== 'running') return;
      if (lastTime === undefined) lastTime = time;
      accumulated += Math.min(time - lastTime, 250);
      lastTime = time;
      let interval = Math.max(75, 160 - game.score * 4);
      let changed = false;
      while (accumulated >= interval && state === 'running') {
        accumulated -= interval;
        game.step();
        if (game.score > best) {
          best = game.score;
          try { localStorage.setItem('crt-snake-best', String(best)); } catch { /* Keep the score for this visit. */ }
        }
        if (game.ended) state = 'over';
        interval = Math.max(75, 160 - game.score * 4);
        changed = true;
      }
      if (changed) draw();
    },
  };
}
