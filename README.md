# portfolio-tv

A personal portfolio homepage styled as a retro CRT television. The page "turns on" with
static and colour bars, then shows a bouncing DVD logo while a short bio types itself onto
the screen. Use the channel buttons below the screen to change channels.

## Channels

| Channel | Content |
|---|---|
| 1 | Bouncing DVD logo with a typewriter bio |
| 2 | Scrolling LinkedIn profile broadcast |
| 3 | Live webcam feed |
| 4 | Local weather forecast (based on the visitor's approximate location) |
| 5 | Matrix-style terminal |
| 6 | Playable Snake game |

The weather channel gets the visitor's approximate location from `ipapi.co`. It gets the
forecast from `api.weather.gov` and falls back to `open-meteo.com`.

## Tech

Plain JavaScript, HTML and CSS, built with [Vite](https://vite.dev/). It has no framework and
no runtime dependencies.

```
index.html        TV markup and channel sections
src/main.js       Startup, DVD logo, typewriter bio, channel switching
src/weather.js    Weather channel
src/snake.js      Snake game channel
src/style.css     TV cabinet, CRT effects and channel styles
public/assets/    Static images
scripts/          Node check scripts for channel, layout and game logic
```

## Run locally

Requires Node.js 20.19+ or 22.12+ (needed by Vite 7).

```bash
npm install
npm run dev       # start the dev server
npm run build     # build to dist/
npm run preview   # serve the built site
```

## Checks

Each check script is a standalone Node script:

```bash
for f in scripts/*.mjs; do node "$f"; done
```

## Deploy

This is a static site. On Vercel, import the repo and use the Vite preset:
build command `npm run build`, output directory `dist`.
