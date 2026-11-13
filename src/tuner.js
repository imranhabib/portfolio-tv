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
  let off = false;
  let switchTimer;
  let displayTimer;

  function showDisplay() {
    clearTimeout(displayTimer);
    display.textContent = `CH ${String(current + 1).padStart(2, '0')}`;
    display.hidden = false;
    displayTimer = setTimeout(() => { display.hidden = true; }, displayTime);
  }

  function show(index) {
    screen.dataset.channel = String(index + 1);
    channels.forEach((channel, i) => {
      if (channel.element) channel.element.hidden = i !== index;
    });
  }

  return {
    // Show the overlay and start sending frames. After turnOff(), the last channel comes back first.
    turnOn() {
      if (off) {
        off = false;
        show(current);
        channels[current].enter();
      }
      on = true;
      showDisplay();
    },
    // Blank the screen: the channel leaves, nothing is shown, and channel changes are ignored.
    turnOff() {
      clearTimeout(switchTimer);
      if (switching) current = requested;
      else channels[current].leave();
      switching = false;
      requested = current;
      on = false;
      off = true;
      clearTimeout(displayTimer);
      display.hidden = true;
      screen.classList.remove('channel-changing');
      screen.dataset.channel = 'off';
      channels.forEach((channel) => {
        if (channel.element) channel.element.hidden = true;
      });
    },
    // Move `step` channels up (+) or down (-), wrapping around. Rapid presses add up.
    change(step) {
      if (off) return;
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
        show(current);
        showDisplay();
        channels[current].enter();
        screen.classList.remove('channel-changing');
      }, switchDelay);
    },
    update(time) {
      if (on && !switching) channels[current].update(time);
    },
  };
}
