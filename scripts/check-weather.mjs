import assert from 'node:assert/strict';
import { createWeatherBroadcast, weatherCondition } from '../src/weather.js';

const forecast = {
  timezone: 'America/Los_Angeles', current: { pressure_msl: 1013.25 },
  daily: { time: ['2026-11-12', '2026-11-13', '2026-11-14'], weather_code: [95, 0, 73], temperature_2m_min: [40.2, 42.8, 39.1], temperature_2m_max: [54.3, 56.8, 48.1] },
};

function fixture() {
  const nodes = Object.fromEntries(['.weather-city', '.weather-clock', '.weather-pressure', '.weather-status', '.weather-credits a'].map(key => [key, { textContent: '' }]));
  const cards = Array.from({ length: 3 }, () => {
    const parts = { h3: {}, '.weather-icon': {}, '.weather-condition': {} };
    return { parts, temperatures: [{}, {}], querySelector: key => parts[key], querySelectorAll() { return this.temperatures; } };
  });
  nodes['.weather-grid'] = { children: cards, querySelectorAll: () => cards.map(card => card.parts['.weather-condition']) };
  return { nodes, cards, root: { querySelector: key => nodes[key] } };
}

const originalFetch = globalThis.fetch;
try {
  for (const fallback of [false, true]) {
    const calls = [];
    globalThis.fetch = async url => {
      calls.push(String(url));
      if (String(url).includes('ipapi.co')) {
        if (fallback) throw new Error('Location blocked');
        return { ok: true, json: async () => ({ city: 'Toronto', latitude: 43.65, longitude: -79.38, country_code: 'CA' }) };
      }
      if (String(url).includes('api.weather.gov')) throw new Error('NWS unavailable');
      return { ok: true, json: async () => forecast };
    };
    const { nodes, cards, root } = fixture();
    const weather = createWeatherBroadcast(root);
    await weather.load();
    await weather.load();
    assert.equal(calls.length, fallback ? 3 : 2, 'Forecast should be cached between channel changes');
    assert.equal(nodes['.weather-city'].textContent, fallback ? 'Seattle Metro' : 'Toronto Metro');
    assert.ok(calls.at(-1).includes(fallback ? 'latitude=47.6062' : 'latitude=43.65'));
    assert.deepEqual(cards.map(card => card.parts.h3.textContent), ['THU', 'FRI', 'SAT']);
    assert.deepEqual(cards.map(card => card.temperatures.map(node => node.textContent)), [[40, 54], [43, 57], [39, 48]]);
    assert.equal(nodes['.weather-pressure'].textContent, 'BAROMETRIC PRESSURE: 29.92 IN.');
    assert.match(cards[0].parts['.weather-icon'].innerHTML, /<svg/);
    weather.updateClock(0);
    assert.ok(nodes['.weather-clock'].textContent.includes('\n'));
  }
  const usCalls = [];
  globalThis.fetch = async url => {
    usCalls.push(String(url));
    if (String(url).includes('ipapi.co')) return { ok: true, json: async () => ({ city: 'Tukwila', latitude: 47.474046, longitude: -122.260966, country_code: 'US' }) };
    if (String(url).includes('/points/')) return { ok: true, json: async () => ({ properties: { forecast: 'https://api.weather.gov/fixture/forecast', observationStations: 'https://api.weather.gov/fixture/stations', timeZone: 'America/Los_Angeles' } }) };
    if (String(url).endsWith('/forecast')) return { ok: true, json: async () => ({ properties: { periods: forecast.daily.time.flatMap((date, index) => [
      { startTime: `${date}T06:00:00-08:00`, isDaytime: true, temperature: 50 + index, temperatureUnit: 'F', shortForecast: 'Rain Showers' },
      { startTime: `${date}T18:00:00-08:00`, isDaytime: false, temperature: 40 + index, temperatureUnit: 'F' },
    ]) } }) };
    throw new Error('Observations unavailable');
  };
  const backup = fixture();
  await createWeatherBroadcast(backup.root).load();
  assert.ok(usCalls[1].includes('api.weather.gov/points/47.474046,-122.260966'), 'US forecasts should go directly to NWS');
  assert.ok(usCalls.every(url => !url.includes('api.open-meteo.com')), 'Working NWS forecasts must not call the failing Open-Meteo endpoint');
  assert.equal(backup.nodes['.weather-credits a'].textContent, 'NATIONAL WEATHER SERVICE · °F');
  assert.deepEqual(backup.cards[0].temperatures.map(node => node.textContent), [40, 50]);
  assert.equal(backup.cards[0].parts['.weather-condition'].textContent, 'Rain Showers');
  assert.equal(backup.nodes['.weather-pressure'].textContent, 'BAROMETRIC PRESSURE: UNAVAILABLE');

  globalThis.fetch = async () => { throw new Error('Offline'); };
  const { root, nodes, cards } = fixture();
  await createWeatherBroadcast(root).load();
  assert.equal(nodes['.weather-city'].textContent, 'Seattle Metro');
  assert.equal(nodes['.weather-status'].textContent, 'FORECAST TEMPORARILY UNAVAILABLE');
  assert.ok(cards.every(card => card.parts['.weather-condition'].textContent === 'No signal'));
  assert.equal(weatherCondition(95).type, 'storm');
  assert.equal(weatherCondition(73).type, 'snow');
  assert.equal(weatherCondition(0).type, 'sun');
  console.log('Passed: detected city, Seattle fallback, NWS-first US routing, Open-Meteo fallback, forecast, pressure, clock, caching, and offline handling.');
} finally {
  globalThis.fetch = originalFetch;
}
