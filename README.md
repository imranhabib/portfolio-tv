# portfolio-tv

A personal portfolio homepage styled as a retro CRT television. The page "turns on" with
static and colour bars, then shows a bouncing DVD logo while a short bio types itself onto
the screen. Use the channel buttons below the screen to change channels. The POWER button
turns the TV off: the picture collapses to a line ("SHUTTING DOWN"), the screen stays black
for a second, then it comes back on with a Matrix-style message. The STATUS light is red
while the TV is off. Press POWER again to return to the last channel.

## Channels

| Channel | Content |
|---|---|
| 1 | Bouncing DVD logo with a typewriter bio. Click the screen to add a DVD logo, click a logo to remove it, and click the bio to add a LinkedIn or GitHub icon. Each return to the channel adds a DVD logo. There are never more than 20 DVD logos. Turning the TV off and on starts the channel fresh. |
| 2 | LinkedIn profile that scrolls by itself. Scroll or drag to take over; auto-scroll starts again 2 seconds later. |
| 3 | Banzai Pipeline live webcam from Port of Cams. It is view-only: clicks do not reach the player. |
| 4 | Matrix-style terminal that greets the visitor by IP address |
| 5 | Local weather forecast (based on the visitor's approximate location) |
| 6 | Live view of Earth from the International Space Station, from NASA's official YouTube stream. View-only, like channel 3. |
| 7 | Snake. Use the arrow keys, WASD or swipes to turn, and Space to pause. The best score is kept in the browser. |

The site calls these external services from the visitor's browser:

| Service | Used by | Purpose |
|---|---|---|
| `ipapi.co` | Weather | Approximate city and coordinates |
| `api.weather.gov` | Weather | US forecast (first choice for US visitors) |
| `open-meteo.com` | Weather | Forecast outside the US, and fallback |
| `api.ipify.org` | Matrix | Visitor's IP address |
| `portofcams.com` | Webcam | Live camera embed (loads only while channel 3 is on) |
| `youtube-nocookie.com` | ISS | NASA's live ISS stream (loads only while channel 6 is on) |

If a service fails, the channel still works: weather falls back to Seattle or shows
"No signal", and Matrix uses "visitor" in place of the IP address.

## Tech

Plain JavaScript, HTML and CSS, built with [Vite](https://vite.dev/). It has no framework and
no runtime dependencies.

```
index.html        TV markup and channel sections
src/main.js       Startup and wiring: builds the channels and hands them to the tuner
src/tuner.js      Channel switching, the blank between channels, and the CH overlay
src/power.js      Start-up screen, POWER button and standby light
src/dvd.js        Channel 1: bouncing DVD logos and profile icons
src/bio.js        Typewriter bio text and its mobile corner layout
src/physics.js    Movement and collisions for the bouncing icons (no DOM)
src/experience.js Channel 2: auto-scrolling LinkedIn profile
src/webcam.js     Channels 3 and 6: live cameras (waves and ISS)
src/weather.js    Channel 5: weather broadcast (rendering)
src/forecast.js   Location and forecast providers (NWS, Open-Meteo)
src/matrix.js     Channel 4: Matrix terminal
src/snake.js      Channel 6: Snake game
src/style.css     TV cabinet, CRT effects and channel styles
public/           Favicon and static images
scripts/          Node check scripts for channel, layout and game logic
.github/CODEOWNERS Default code owner for the repo
```

Each channel is an object with `enter()`, `leave()` and `update(time)`, plus an optional
`element` that is shown only while the channel is on screen. To add a channel, create it
in its own file and add it to the list in `src/main.js`. The list order sets the channel
numbers.

## Run locally

Requires Node.js 20.19+ or 22.12+ (needed by Vite 7).

```bash
npm install
npm run dev       # start the dev server
npm run build     # build to dist/
npm run preview   # serve the built site
```

## Checks

Each check script is a standalone Node script. Run them all with:

```bash
npm test
```

## Contributing

`main` is protected by a ruleset. Make changes on a branch and open a pull request.
A pull request needs one approval from a code owner (see `.github/CODEOWNERS`) before it
can be merged. Run `npm test` and `npm run build` before you open it.

## Deploy

This is a static site. On Vercel, import the repo; `vercel.json` sets everything else:

- The build command is `npm test && npm run build`, so a failing check stops the deploy.
- The output directory is `dist`.
- The hashed JS and CSS files in `/assets/` are cached for a year. Their names change
  when their content changes. Other files, such as images, keep Vercel's default caching.
