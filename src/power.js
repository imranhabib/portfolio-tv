// Power: the start-up screen, the POWER button and the status light.
//   start-up    colour bars open up from a line ("TUNING"), then the tuner turns on
//   press (on)  colour bars collapse to a line ("SHUTTING DOWN"), one second of plain black,
//               then the standby Channel turns on (no colour bars, no CH number); light turns red
//   press (off) colour bars open up again, then the tuner returns to the last channel; light turns green
// Presses during an animation are ignored.
// Matches the 1600 ms power-on animation in style.css, plus a short hold on the loader.
const colourBarsTime = 2100;
const blackTime = 1000;

export function createPower(tuner, { body, screen, startup, light, button, standby }) {
  let state = 'starting'; // 'starting' | 'on' | 'stopping' | 'off'

  function showColourBars({ shuttingDown }, then) {
    startup.classList.toggle('is-shutting-down', shuttingDown);
    // Showing the hidden element again restarts its CSS animations.
    startup.hidden = false;
    setTimeout(() => {
      startup.hidden = true;
      then();
    }, colourBarsTime);
  }

  function setOn(isOn) {
    light.classList.toggle('is-standby', !isOn);
    button.setAttribute('aria-pressed', String(isOn));
  }

  function turnOn() {
    state = 'on';
    tuner.turnOn();
  }

  return {
    // The page loads with the colour bars already showing.
    start() {
      setOn(true);
      setTimeout(() => {
        startup.hidden = true;
        body.classList.remove('is-starting');
        turnOn();
      }, colourBarsTime);
    },
    press() {
      if (state === 'on') {
        state = 'stopping';
        setOn(false);
        tuner.turnOff();
        showColourBars({ shuttingDown: true }, () => {
          screen.classList.add('is-dark');
          setTimeout(() => {
            screen.classList.remove('is-dark');
            standby.element.classList.add('is-powering-on');
            standby.element.hidden = false;
            standby.enter();
            state = 'off';
          }, blackTime);
        });
      } else if (state === 'off') {
        state = 'starting';
        setOn(true);
        standby.leave();
        standby.element.hidden = true;
        standby.element.classList.remove('is-powering-on');
        showColourBars({ shuttingDown: false }, turnOn);
      }
    },
    update(time) {
      if (state === 'off') standby.update(time);
      else tuner.update(time);
    },
  };
}
