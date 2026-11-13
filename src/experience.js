// Experience channel: the captured LinkedIn profile scrolls itself at 36 px/s. Any manual
// scroll, drag, touch or key press hands control to the visitor; auto-scroll resumes
// from the current position two seconds after the last input.
const pixelsPerSecond = 36;
const manualPause = 2000;
const restAtEnd = 5;

export function createExperienceChannel(element) {
  const scroll = element.querySelector('.profile-scroll');
  let startedAt;
  let manualUntil = 0;
  let pointerHeld = false;
  let touchHeld = false;

  function pause() {
    manualUntil = performance.now() + manualPause;
    startedAt = undefined;
  }

  scroll.addEventListener('wheel', pause, { passive: true });
  scroll.addEventListener('pointerdown', () => { pointerHeld = true; pause(); }, { passive: true });
  scroll.addEventListener('touchstart', () => { touchHeld = true; pause(); }, { passive: true });
  for (const type of ['pointerup', 'pointercancel']) {
    window.addEventListener(type, () => {
      if (pointerHeld) { pointerHeld = false; pause(); }
    }, { passive: true });
  }
  for (const type of ['touchend', 'touchcancel']) {
    window.addEventListener(type, () => {
      if (touchHeld) { touchHeld = false; pause(); }
    }, { passive: true });
  }
  scroll.addEventListener('scroll', () => {
    if (manualUntil > 0) pause();
  }, { passive: true });
  scroll.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) pause();
  });

  return {
    element,
    enter() {
      scroll.scrollTop = 0;
      startedAt = undefined;
      manualUntil = 0;
      pointerHeld = false;
      touchHeld = false;
    },
    leave() {},
    update(time) {
      if (pointerHeld || touchHeld || time < manualUntil) return;
      const distance = scroll.scrollHeight - scroll.clientHeight;
      if (distance <= 0) return;
      manualUntil = 0;
      if (startedAt === undefined) startedAt = time - scroll.scrollTop / pixelsPerSecond * 1000;
      const elapsed = (time - startedAt) / 1000;
      const phase = elapsed % (distance / pixelsPerSecond + restAtEnd);
      scroll.scrollTop = Math.max(0, Math.min(distance, phase * pixelsPerSecond));
    },
  };
}
