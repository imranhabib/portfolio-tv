// Tuner: owns which Channel is on screen, the short blank between channels, and the CH overlay.
//
// A Channel is an adapter: { element?, enter(), leave(), update(time) }
//   element      section shown only while the channel is on screen (optional)
//   enter()      the channel is now on screen
//   leave()      the channel is going off screen (called when the screen blanks)
//   update(time) every animation frame while the channel is on screen and the TV is on
// Channel 1 starts on screen without an enter() call.
const switchDelay = 180;
const displayTime = 1000;

export function createTuner(screen, display, channels) {
  let current = 0;
  let requested = 0;
  let switching = false;
  let on = false;
  let switchTimer;
  let displayTimer;

  function showDisplay() {
    clearTimeout(displayTimer);
    display.textContent = `CH ${String(current + 1).padStart(2, '0')}`;
    display.hidden = false;
    displayTimer = setTimeout(() => { display.hidden = true; }, displayTime);
  }

  return {
    // Ends the start-up screen: show the overlay and start sending frames.
    turnOn() {
      on = true;
      showDisplay();
    },
    // Move `step` channels up (+) or down (-), wrapping around. Rapid presses add up.
    change(step) {
      requested = (((requested + step) % channels.length) + channels.length) % channels.length;
      if (!switching) {
        switching = true;
        channels[current].leave();
        screen.classList.add('channel-changing');
      }
      clearTimeout(switchTimer);
      switchTimer = setTimeout(() => {
        current = requested;
        switching = false;
        screen.dataset.channel = String(current + 1);
        showDisplay();
        channels.forEach((channel, index) => {
          if (channel.element) channel.element.hidden = index !== current;
        });
        channels[current].enter();
        screen.classList.remove('channel-changing');
      }, switchDelay);
    },
    update(time) {
      if (on && !switching) channels[current].update(time);
    },
  };
}
