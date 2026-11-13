import './style.css';
import { createTuner } from './tuner.js';
import { createDvdChannel } from './dvd.js';
import { createExperienceChannel } from './experience.js';
import { createWebcamChannel } from './webcam.js';
import { createWeatherBroadcast } from './weather.js';
import { createMatrixChannel } from './matrix.js';
import { createSnakeChannel } from './snake.js';

const screen = document.querySelector('.screen');
// Channel numbers follow this order: CH 01 is the first entry.
const tuner = createTuner(screen, document.querySelector('#channel-display'), [
  createDvdChannel(screen),
  createExperienceChannel(document.querySelector('#profile-channel')),
  createWebcamChannel(document.querySelector('#webcam-channel')),
  createWeatherBroadcast(document.querySelector('#weather-channel')),
  createMatrixChannel(document.querySelector('#matrix-channel')),
  createSnakeChannel(document.querySelector('#snake-channel')),
]);

document.querySelector('#channel-down').addEventListener('click', () => tuner.change(-1));
document.querySelector('#channel-up').addEventListener('click', () => tuner.change(1));
window.setTimeout(() => {
  document.querySelector('.tv-startup').hidden = true;
  document.body.classList.remove('is-starting');
  tuner.turnOn();
}, 2100);

function animate(time) {
  tuner.update(time);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
