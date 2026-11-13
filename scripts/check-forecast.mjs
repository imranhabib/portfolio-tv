import assert from 'node:assert/strict';
import { getForecast } from '../src/forecast.js';

const dates = ['2026-11-12', '2026-11-13', '2026-11-14'];
const openMeteo = {
  timezone: 'America/Toronto', current: { pressure_msl: 1013.25 },
  daily: { time: dates, weather_code: [95, 0, 73], temperature_2m_min: [40, 42, 39], temperature_2m_max: [54, 56, 48] },
};
const nwsPeriods = (unit = 'F', count = 3) => dates.slice(0, count).flatMap((date, i) => [
  { startTime: `${date}T06:00:00-08:00`, isDaytime: true, temperature: 10 + i, temperatureUnit: unit, shortForecast: 'Light Snow' },
  { startTime: `${date}T18:00:00-08:00`, isDaytime: false, temperature: i, temperatureUnit: unit },
]);

// A fake network: each route is a URL substring -> JSON body, or an Error to fail.
function network(routes) {
  const calls = [];
  const fetch = async (url) => {
    calls.push(String(url));
    const key = Object.keys(routes).find(part => String(url).includes(part));
    const body = key ? routes[key] : new Error(`No route for ${url}`);
    if (body instanceof Error) throw body;
    return { ok: true, json: async () => body };
  };
  return { fetch, calls };
}
const nwsPoint = { properties: { forecast: 'https://api.weather.gov/f/forecast', observationStations: 'https://api.weather.gov/f/stations', timeZone: 'America/Los_Angeles' } };
const us = { city: 'Tukwila', latitude: 47.47, longitude: -122.26, country_code: 'US' };

{
  const net = network({ 'ipapi.co': { city: 'Toronto', latitude: 43.65, longitude: -79.38, country_code: 'CA' }, 'open-meteo': openMeteo });
  const { location, forecast } = await getForecast(net.fetch);
  assert.equal(location.city, 'Toronto');
  assert.equal(location.fallback, false);
  assert.equal(forecast.source, 'Open-Meteo');
  assert.ok(net.calls.every(url => !url.includes('weather.gov')), 'Non-US visitors skip NWS');
  assert.deepEqual(forecast.days[0], { date: '2026-11-12', code: 95, low: 40, high: 54 });
  assert.equal(forecast.pressure, 1013.25);
  assert.equal(forecast.timezone, 'America/Toronto');
}
{
  const net = network({ 'ipapi.co': new Error('blocked'), 'open-meteo': openMeteo });
  const { location } = await getForecast(net.fetch);
  assert.equal(location.city, 'Seattle');
  assert.equal(location.fallback, true, 'Location failure falls back to Seattle');
}
{
  const net = network({ 'ipapi.co': us, '/points/': nwsPoint, '/f/forecast': { properties: { periods: nwsPeriods('C') } }, '/f/stations': { features: [{ id: 'https://api.weather.gov/st/X' }] }, '/observations/latest': { properties: { seaLevelPressure: { value: 101325 } } } });
  const { forecast } = await getForecast(net.fetch);
  assert.equal(forecast.source, 'NWS');
  assert.equal(forecast.timezone, 'America/Los_Angeles');
  assert.deepEqual(forecast.days[0], { date: '2026-11-12', code: 73, low: 32, high: 50 }, 'Celsius periods convert to °F');
  assert.equal(forecast.pressure, 1013.25);
  assert.ok(net.calls.every(url => !url.includes('open-meteo')), 'A working NWS forecast skips Open-Meteo');
}
{
  const net = network({ 'ipapi.co': us, '/points/': nwsPoint, '/f/forecast': { properties: { periods: nwsPeriods() } } });
  const { forecast } = await getForecast(net.fetch);
  assert.equal(forecast.source, 'NWS');
  assert.equal(forecast.pressure, undefined, 'Missing observations keep the forecast');
}
{
  const net = network({ 'ipapi.co': us, '/points/': nwsPoint, '/f/forecast': { properties: { periods: nwsPeriods('F', 2) } }, 'open-meteo': openMeteo });
  assert.equal((await getForecast(net.fetch)).forecast.source, 'Open-Meteo', 'An incomplete NWS forecast falls back to Open-Meteo');
}
{
  const net = network({ 'ipapi.co': us, '/points/': new Error('down'), 'open-meteo': openMeteo });
  assert.equal((await getForecast(net.fetch)).forecast.source, 'Open-Meteo', 'A failing NWS falls back to Open-Meteo');
}
{
  const net = network({ 'ipapi.co': us, 'open-meteo': { daily: { ...openMeteo.daily, weather_code: [95, 0] } } });
  assert.equal((await getForecast(net.fetch)).forecast, null, 'Incomplete data from every provider gives no forecast');
}
{
  const net = network({});
  const { location, forecast } = await getForecast(net.fetch);
  assert.equal(location.city, 'Seattle');
  assert.equal(forecast, null, 'Offline gives no forecast');
}
console.log('Passed: location and Seattle fallback, NWS for US, Celsius conversion, optional pressure, Open-Meteo fallback, incomplete data, and offline.');
