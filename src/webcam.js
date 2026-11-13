// Webcam channel: the live camera only streams while the channel is on screen.
export function createWebcamChannel(element) {
  const frame = element.querySelector('iframe');
  return {
    element,
    enter() {
      if (!frame.hasAttribute('src')) frame.src = frame.dataset.src;
    },
    leave() {
      frame.removeAttribute('src');
    },
    update() {},
  };
}
