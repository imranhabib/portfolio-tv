// Weather channel: renders the three-day forecast from forecast.js as a retro TV broadcast.
import { getForecast } from './forecast.js';

const hectopascalsPerInchOfMercury = 33.8639;

export function weatherCondition(code) {
  if (code === 0) return { label: 'Sunny', type: 'sun' };
  if (code === 1 || code === 2) return { label: 'Partly Cloudy', type: 'partly' };
  if (code === 3) return { label: 'Cloudy', type: 'cloud' };
  if (code === 45 || code === 48) return { label: 'Fog', type: 'fog' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Snow Showers', type: 'snow' };
  if ([95, 96, 99].includes(code)) return { label: 'Scattered T’storms', type: 'storm' };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: 'Rain Showers', type: 'rain' };
  return { label: 'Unavailable', type: 'cloud' };
}

function weatherIcon(type) {
  // The wx-* classes animate each part (see style.css): rays turn, clouds drift, rain and snow fall.
  const sun = '<g fill="#ffe260" stroke="#705212" stroke-width="2"><circle cx="64" cy="31" r="19"/><path class="wx-rays" d="M64 4v7m0 40v7M37 31h7m40 0h7M45 12l5 5m28 28 5 5m0-38-5 5M50 45l-5 5" stroke="#ffe260" stroke-width="4"/></g>';
  const cloud = '<path class="wx-cloud" d="M22 68C7 68 6 47 22 43c-2-20 26-29 37-12 17-8 34 5 29 22 17 6 12 23-4 23H25Z" fill="#b6b9b1" stroke="#26264c" stroke-width="3"/>';
  const rain = '<g class="wx-rain" stroke="#8ed8ff" stroke-width="5"><path d="m28 79-8 13"/><path d="m50 79-8 13"/><path d="m72 79-8 13"/></g>';
  const bolt = '<path class="wx-bolt" d="M54 57 37 83h14l-8 20 30-33H59l10-13Z" fill="#ffe964" stroke="#5e591b" stroke-width="2"/>';
  const snow = '<g class="wx-snow" fill="#fff"><circle cx="25" cy="87" r="3"/><circle cx="49" cy="92" r="3"/><circle cx="73" cy="85" r="3"/></g>';
  const fog = '<g class="wx-fog" stroke="#c7cbcd" stroke-width="4"><path d="M12 82h77"/><path d="M20 91h65"/></g>';
  return `<svg viewBox="0 0 110 110" aria-hidden="true">${type === 'sun' || type === 'partly' ? sun : ''}${type !== 'sun' ? cloud : ''}${type === 'rain' || type === 'storm' ? rain : ''}${type === 'storm' ? bolt : ''}${type === 'snow' ? snow : ''}${type === 'fog' ? fog : ''}</svg>`;
}

export function createWeatherBroadcast(element) {
  const city = element.querySelector('.weather-city');
  const clock = element.querySelector('.weather-clock');
  const grid = element.querySelector('.weather-grid');
  const pressure = element.querySelector('.weather-pressure');
  const status = element.querySelector('.weather-status');
  let timezone = 'America/Los_Angeles';
  let lastClockSecond;
  let loading;

  grid.innerHTML = Array.from({ length: 3 }, () => '<article class="weather-day"><h3>—</h3><div class="weather-icon"></div><p class="weather-condition">Loading…</p><div class="weather-temperatures"><span>Lo<strong>—</strong></span><span>Hi<strong>—</strong></span></div></article>').join('');

  function updateClock(time) {
    const second = Math.floor(time / 1000);
    if (second === lastClockSecond) return;
    lastClockSecond = second;
    const now = new Date();
    clock.textContent = `${now.toLocaleTimeString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', second: '2-digit' })}\n${now.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}`;
  }

  async function load() {
    const { location, forecast } = await getForecast();
    city.textContent = `${location.city} Metro`;
    status.textContent = location.fallback ? 'SEATTLE DEFAULT FORECAST' : 'LOCAL FORECAST · IP-BASED CITY';
    if (!forecast) {
      status.textContent = 'FORECAST TEMPORARILY UNAVAILABLE';
      [...grid.querySelectorAll('.weather-condition')].forEach(label => { label.textContent = 'No signal'; });
      return;
    }
    timezone = forecast.timezone || timezone;
    lastClockSecond = undefined;
    [...grid.children].forEach((card, index) => {
      const day = forecast.days[index];
      const condition = weatherCondition(day.code);
      card.querySelector('h3').textContent = new Date(`${day.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase();
      card.querySelector('.weather-icon').innerHTML = weatherIcon(condition.type);
      card.querySelector('.weather-condition').textContent = condition.label;
      const temperatures = card.querySelectorAll('strong');
      temperatures[0].textContent = Math.round(day.low);
      temperatures[1].textContent = Math.round(day.high);
    });
    pressure.textContent = Number.isFinite(forecast.pressure)
      ? `BAROMETRIC PRESSURE: ${(forecast.pressure / hectopascalsPerInchOfMercury).toFixed(2)} IN.`
      : 'BAROMETRIC PRESSURE: UNAVAILABLE';
    if (forecast.source === 'NWS') {
      const source = element.querySelector('.weather-credits a');
      source.textContent = 'NATIONAL WEATHER SERVICE · °F';
      source.href = 'https://www.weather.gov/';
    }
  }

  return {
    element,
    enter: () => { loading ??= load(); return loading; },
    leave() {},
    update: updateClock,
  };
}
