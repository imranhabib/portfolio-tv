import './style.css';
import { createTuner } from './tuner.js';
import { createPower } from './power.js';
import { createDvdChannel } from './dvd.js';
import { createExperienceChannel } from './experience.js';
import { createWebcamChannel } from './webcam.js';
import { createMatrixChannel } from './matrix.js';
import { createWeatherBroadcast } from './weather.js';
import { createSnakeChannel } from './snake.js';

const screen = document.querySelector('.screen');
const matrix = createMatrixChannel(document.querySelector('#matrix-channel'));
// Channel numbers follow this order: CH 01 is the first entry.
const tuner = createTuner(screen, document.querySelector('#channel-display'), [
  createDvdChannel(screen),
  createExperienceChannel(document.querySelector('#profile-channel')),
  createWebcamChannel(document.querySelector('#webcam-channel')),
  matrix,
  createWeatherBroadcast(document.querySelector('#weather-channel')),
  createWebcamChannel(document.querySelector('#iss-channel')),
  createSnakeChannel(document.querySelector('#snake-channel')),
]);

document.querySelector('#channel-down').addEventListener('click', () => tuner.change(-1));
document.querySelector('#channel-up').addEventListener('click', () => tuner.change(1));
// When the TV is off, the Matrix message shows as the standby screen.
const powerButton = document.querySelector('#power');
const power = createPower(tuner, {
  body: document.body,
  screen,
  startup: document.querySelector('.tv-startup'),
  light: document.querySelector('.tv-power-light'),
  button: powerButton,
  standby: matrix,
});
powerButton.addEventListener('click', () => power.press());
power.start();

function animate(time) {
  power.update(time);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
