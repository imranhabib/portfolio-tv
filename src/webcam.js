// Webcam channel: the live camera only streams while the channel is on screen.
// Used for both live cameras: the Banzai Pipeline waves and the ISS view of Earth.
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
