// Forecast: finds the visitor's city and returns one normalised three-day forecast.
// NWS (US only) and Open-Meteo are the two provider adapters behind getForecast().
const seattle = { city: 'Seattle', latitude: 47.6062, longitude: -122.3321, country: 'US', fallback: true };

function createFetchJSON(fetch) {
  return async (url) => {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000), credentials: 'omit', referrerPolicy: 'no-referrer',
    });
    if (!response.ok) throw new Error('Weather service unavailable');
    return response.json();
  };
}

async function getLocation(fetchJSON) {
  try {
    const data = await fetchJSON('https://ipapi.co/json/');
    if (data.error || !data.city || !Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) return seattle;
    return { city: data.city, latitude: data.latitude, longitude: data.longitude, country: data.country_code, fallback: false };
  } catch {
    return seattle;
  }
}

function conditionCode(label) {
  if (/thunder/i.test(label)) return 95;
  if (/snow|sleet|ice/i.test(label)) return 73;
  if (/rain|shower|drizzle/i.test(label)) return 61;
  if (/fog/i.test(label)) return 45;
  if (/partly|mostly sunny/i.test(label)) return 2;
  if (/cloud|overcast/i.test(label)) return 3;
  return /sunny|clear/i.test(label) ? 0 : -1;
}

async function fromNWS(fetchJSON, location) {
  const point = await fetchJSON(`https://api.weather.gov/points/${location.latitude},${location.longitude}`);
  const forecast = await fetchJSON(point.properties.forecast);
  const days = new Map();
  for (const period of forecast.properties.periods) {
    const date = period.startTime.slice(0, 10);
    const day = days.get(date) || { date };
    const temperature = period.temperatureUnit === 'C' ? period.temperature * 9 / 5 + 32 : period.temperature;
    if (period.isDaytime) { day.high = temperature; day.label = period.shortForecast; }
    else day.low = temperature;
    days.set(date, day);
  }
  const complete = [...days.values()].filter(day => Number.isFinite(day.high) && Number.isFinite(day.low)).slice(0, 3);
  const result = {
    source: 'NWS',
    timezone: point.properties.timeZone,
    days: complete.map(day => ({ date: day.date, code: conditionCode(day.label), low: day.low, high: day.high })),
  };
  // Pressure is optional; an unavailable observation must not hide the forecast.
  try {
    const stations = await fetchJSON(point.properties.observationStations);
    const observation = await fetchJSON(`${stations.features[0].id}/observations/latest`);
    const pressure = observation.properties.seaLevelPressure?.value ?? observation.properties.barometricPressure?.value;
    if (Number.isFinite(pressure)) result.pressure = pressure / 100;
  } catch { /* Keep the three-day forecast if observations are unavailable. */ }
  return result;
}

async function fromOpenMeteo(fetchJSON, location) {
  const params = new URLSearchParams({
    latitude: location.latitude, longitude: location.longitude,
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    current: 'pressure_msl', temperature_unit: 'fahrenheit', timezone: 'auto', forecast_days: '3',
  });
  const data = await fetchJSON(`https://api.open-meteo.com/v1/forecast?${params}`);
  const daily = data.daily || {};
  return {
    source: 'Open-Meteo',
    timezone: data.timezone,
    pressure: data.current?.pressure_msl,
    days: (daily.time || []).map((date, index) => ({
      date, code: daily.weather_code?.[index], low: daily.temperature_2m_min?.[index], high: daily.temperature_2m_max?.[index],
    })),
  };
}

function isComplete(forecast) {
  return forecast.days.length === 3
    && forecast.days.every(day => ['code', 'low', 'high'].every(key => Number.isFinite(day[key])));
}

// Always resolves. `forecast` is null when no provider returned three complete days.
// forecast: { source: 'NWS' | 'Open-Meteo', timezone?, pressure? (hPa), days: [{ date, code, low, high }] (°F) }
export async function getForecast(fetch = globalThis.fetch) {
  const fetchJSON = createFetchJSON(fetch);
  const location = await getLocation(fetchJSON);
  const providers = location.country === 'US' ? [fromNWS, fromOpenMeteo] : [fromOpenMeteo];
  for (const provider of providers) {
    try {
      const forecast = await provider(fetchJSON, location);
      if (isComplete(forecast)) return { location, forecast };
    } catch { /* Try the next provider. */ }
  }
  return { location, forecast: null };
}
