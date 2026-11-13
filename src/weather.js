const seattle = { city: 'Seattle', latitude: 47.6062, longitude: -122.3321, country: 'US', fallback: true };

async function fetchJSON(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(5000), credentials: 'omit', referrerPolicy: 'no-referrer',
  });
  if (!response.ok) throw new Error('Weather service unavailable');
  return response.json();
}

export async function getWeatherLocation() {
  try {
    const data = await fetchJSON('https://ipapi.co/json/');
    if (data.error || !data.city || !Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) return seattle;
    return { city: data.city, latitude: data.latitude, longitude: data.longitude, country: data.country_code, fallback: false };
  } catch {
    return seattle;
  }
}

async function getNWSForecast(location) {
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
  if (complete.length !== 3) throw new Error('Incomplete forecast');
  const codes = complete.map(day => {
    if (/thunder/i.test(day.label)) return 95;
    if (/snow|sleet|ice/i.test(day.label)) return 73;
    if (/rain|shower|drizzle/i.test(day.label)) return 61;
    if (/fog/i.test(day.label)) return 45;
    if (/partly|mostly sunny/i.test(day.label)) return 2;
    if (/cloud|overcast/i.test(day.label)) return 3;
    return /sunny|clear/i.test(day.label) ? 0 : -1;
  });
  const result = {
    timezone: point.properties.timeZone, source: 'NWS', current: {},
    daily: { time: complete.map(day => day.date), weather_code: codes, temperature_2m_min: complete.map(day => day.low), temperature_2m_max: complete.map(day => day.high) },
  };
  // Pressure is optional; an unavailable observation must not hide the forecast.
  try {
    const stations = await fetchJSON(point.properties.observationStations);
    const observation = await fetchJSON(`${stations.features[0].id}/observations/latest`);
    const pressure = observation.properties.seaLevelPressure?.value ?? observation.properties.barometricPressure?.value;
    if (Number.isFinite(pressure)) result.current.pressure_msl = pressure / 100;
  } catch { /* Keep the three-day forecast if observations are unavailable. */ }
  return result;
}

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
  const sun = '<g fill="#ffe260" stroke="#705212" stroke-width="2"><circle cx="64" cy="31" r="19"/><path d="M64 4v7m0 40v7M37 31h7m40 0h7M45 12l5 5m28 28 5 5m0-38-5 5M50 45l-5 5" stroke="#ffe260" stroke-width="4"/></g>';
  const cloud = '<path d="M22 68C7 68 6 47 22 43c-2-20 26-29 37-12 17-8 34 5 29 22 17 6 12 23-4 23H25Z" fill="#b6b9b1" stroke="#26264c" stroke-width="3"/>';
  const rain = '<path d="m28 79-8 13m30-13-8 13m30-13-8 13" stroke="#8ed8ff" stroke-width="5"/>';
  const bolt = '<path d="M54 57 37 83h14l-8 20 30-33H59l10-13Z" fill="#ffe964" stroke="#5e591b" stroke-width="2"/>';
  const snow = '<g fill="#fff"><circle cx="25" cy="87" r="3"/><circle cx="49" cy="92" r="3"/><circle cx="73" cy="85" r="3"/></g>';
  const fog = '<path d="M12 82h77M20 91h65" stroke="#c7cbcd" stroke-width="4"/>';
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
    const location = await getWeatherLocation();
    city.textContent = `${location.city} Metro`;
    status.textContent = location.fallback ? 'SEATTLE DEFAULT FORECAST' : 'LOCAL FORECAST · IP-BASED CITY';
    try {
      const params = new URLSearchParams({
        latitude: location.latitude, longitude: location.longitude,
        daily: 'weather_code,temperature_2m_max,temperature_2m_min',
        current: 'pressure_msl', temperature_unit: 'fahrenheit', timezone: 'auto', forecast_days: '3',
      });
      let data;
      if (location.country === 'US') {
        try {
          data = await getNWSForecast(location);
        } catch {
          data = await fetchJSON(`https://api.open-meteo.com/v1/forecast?${params}`);
        }
      } else data = await fetchJSON(`https://api.open-meteo.com/v1/forecast?${params}`);
      const daily = data.daily;
      if (!daily || daily.time?.length !== 3 || !['weather_code', 'temperature_2m_max', 'temperature_2m_min'].every(key => daily[key]?.length === 3 && daily[key].every(Number.isFinite))) throw new Error('Incomplete forecast');
      timezone = data.timezone || timezone;
      lastClockSecond = undefined;
      [...grid.children].forEach((card, index) => {
        const condition = weatherCondition(daily.weather_code[index]);
        card.querySelector('h3').textContent = new Date(`${daily.time[index]}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase();
        card.querySelector('.weather-icon').innerHTML = weatherIcon(condition.type);
        card.querySelector('.weather-condition').textContent = condition.label;
        const temperatures = card.querySelectorAll('strong');
        temperatures[0].textContent = Math.round(daily.temperature_2m_min[index]);
        temperatures[1].textContent = Math.round(daily.temperature_2m_max[index]);
      });
      pressure.textContent = Number.isFinite(data.current?.pressure_msl)
        ? `BAROMETRIC PRESSURE: ${(data.current.pressure_msl / 33.8639).toFixed(2)} IN.`
        : 'BAROMETRIC PRESSURE: UNAVAILABLE';
      if (data.source === 'NWS') {
        const source = element.querySelector('.weather-credits a');
        source.textContent = 'NATIONAL WEATHER SERVICE · °F';
        source.href = 'https://www.weather.gov/';
      }
    } catch {
      status.textContent = 'FORECAST TEMPORARILY UNAVAILABLE';
      [...grid.querySelectorAll('.weather-condition')].forEach(label => { label.textContent = 'No signal'; });
    }
  }

  return { updateClock, load: () => { loading ??= load(); return loading; } };
}
