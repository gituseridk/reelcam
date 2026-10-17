# Showreel

**Cinematic demo videos of your web app, from 12 lines of YAML.** A camera that frames what
matters, a pointer that moves like a person, captions, and a check that fails the video when the
camera crops its subject. Runs headless, in CI, or by your coding agent.

[![The hero video, made by Showreel](docs/hero.png)](docs/hero.mp4)

<sub>The video above (click for the MP4) was recorded by Showreel from [`examples/hero.yml`](examples/hero.yml):</sub>

```yaml
title: Add a task, finish it
serve: app
viewport: { width: 1280, height: 720 }
steps:
  - wait: 1400
  - focus: { on: "#composer", why: "typing stays inside the composer" }
  - type: { into: "#new-task", text: "Record the launch video" }
  - press: Enter
  - focus: { on: "#today", why: "the payoff: the list and the progress ring" }
  - click: "li:has-text('Record the launch video') .check"
  - caption: Made with Showreel from 12 lines of YAML
  - wait: 1800
```

## Quickstart

Needs Node.js 22.12+ and ffmpeg.

<!-- quickstart:start -->
```sh
npm install --global showreel
showreel setup --with-deps
showreel init --demo showreel-demo
showreel render showreel-demo/demo.yml
```
<!-- quickstart:end -->

That records the bundled demo app and writes `out/demo.mp4` and `out/demo.sheet.png`, a
contact sheet with four stills per shot. (`--with-deps` also installs Chromium's system
libraries on Linux and may need `sudo`; on macOS and Windows plain `showreel setup` is enough.)

For your own app: `showreel init` writes a starter `showreel.yml`. Point `url` at your app running
locally, or `serve` at a built folder, then `showreel render showreel.yml`.

## Why

- **Every move has a reason.** A shot frames a whole UI element, read from the DOM while it
  records. The camera cuts between shots on a critically damped spring, and it never chases the cursor.
- **It checks itself.** The render fails (exit 1) when a settled frame crops its subject, a shot
  flickers past in under 1.2 s, a click happens off camera, a caption covers the subject, or
  forbidden text (say `lorem` or `TODO`) appears on screen.
- **It is repeatable.** A script is code: review it in a PR, re-record it after every UI change,
  and render it in CI. The pointer's jitter is seeded.
- **It suits agents.** The [agent skill](skills/showreel/SKILL.md) teaches a coding agent to film the
  feature it just built and check the contact sheet before reporting.
- **It is private by default.** It opens local URLs only unless you opt in, and `redact` blurs
  selectors before the first frame.

## Script format

| Key | Default | Meaning |
|---|---|---|
| `url` | | The page to open (local by default). Paths in `visit` resolve against it. |
| `serve` | | A folder to serve on 127.0.0.1, relative to the script. Use it instead of `url`, or with `url` as a path. |
| `title` | | A pill shown for the first 2 s. State the one idea of the video. |
| `viewport` | `{ width: 1440, height: 810 }` | The browser size in CSS px. |
| `scale` | `2` | Device pixel ratio of the recording (1 to 3). |
| `preset` | `studio` | The look (see Presets). |
| `colorScheme` | `light` | `light` or `dark`. |
| `redact` | `[]` | Selectors to blur in every frame. |
| `forbid` | `[]` | Regular expressions (case-insensitive) that fail the video if visible. |
| `allowRemote` | `false` | Allow non-local URLs. |
| `output` | `out/<name>.mp4` | Where to write the MP4, relative to the script. |
| `gif` | `false` | Also write a GIF. |
| `seed` | `1` | Seed for the pointer's human jitter. |
| `steps` | | The list below. |

| Step | Example | Does |
|---|---|---|
| `focus` | `focus: { on: "#form", why: "..." }` or `focus: "#form"` | Camera frames this element, whole, until the next camera step. |
| `zoom` | `zoom: { on: ".chart", level: 1.5 }` | Like `focus`, at most this zoom. |
| `wide` | `wide` or `wide: "why"` | Camera back to the whole page. |
| `click` | `click: "button:has-text('Save')"` | Moves the pointer there and clicks. |
| `hover` | `hover: ".menu"` | Moves the pointer there. |
| `type` | `type: { into: "#name", text: "Ada", delay: 45 }` | Clicks the field (if `into`) and types like a person. |
| `press` | `press: Enter` | Presses a key or chord (`Control+K`). |
| `scroll` | `scroll: 400` or `scroll: { to: "#pricing", ms: 900 }` | Eased wheel scroll. |
| `wait` | `wait: 1200` | Holds, in ms. |
| `waitFor` | `waitFor: ".toast"` | Waits until the element is visible (up to 10 s). |
| `visit` | `visit: /settings` | Opens another page. |
| `caption` | `caption: "Saved"` or `caption: { text: "Saved", ms: 2500 }` | A caption at the bottom; the camera leaves room for it. |

Selectors are [Playwright selectors](https://playwright.dev/docs/locators): CSS plus
`:has-text()`, `>> nth=1` and more. `showreel check script.yml` validates a script and lists every
problem with its path, such as `steps[3].type.text: expected string`.

## Camera rules

1. A shot frames a **subject**, a whole element, with air on every side (it fills at most 88%).
   If the subject grows during the shot, the frame grows with it and never shrinks back.
2. Zoom in only when the subject is small and every beat that follows stays inside it. A zoom
   that gains less than 12% is skipped.
3. Lists, feeds, scrolling and search are shown wide: both the source and the result must be seen.
4. Every shot is held at least 1.2 s.
5. One idea per video: 6 to 15 s. Start on the view and end right after the payoff.

## Presets

| Name | Size | Look |
|---|---|---|
| `studio` | 1920x1080 | Dark indigo stage, rounded page with a soft shadow. |
| `daylight` | 1920x1080 | Light stage for light apps. |
| `bare` | 1920x1080 | No stage: the page fills the frame. |
| `vertical` | 1080x1920 | 9:16 for phone viewports (e.g. 390x844). |
| `square` | 1080x1080 | 1:1 for social feeds. |

A preset is a plain object in [`src/presets/index.ts`](src/presets/index.ts). It sets the canvas,
background, margin, radius, shadow, pointer, ripple colour, spring half-life, zoom limits and
caption style. New presets are welcome.

## GitHub Action

```yaml
- uses: actions/checkout@v4
- run: npm ci && (npm start &) && npx wait-on http://localhost:3000
- uses: showreel/showreel@v0        # placeholder: set to the published repository
  with:
    script: demos/signup.yml
```

It installs Chromium and ffmpeg, renders, fails the job when the video fails its checks, and
uploads the MP4 and contact sheet as an artifact. Inputs: `script`, `output`, `preset`, `gif`,
`allow-remote`, `upload`, `artifact-name`, `node-version`. Outputs: `video`, `sheet`, `gif`.

## CLI

```
showreel render <script.yml> [-o out.mp4] [-p preset] [--gif] [--no-sheet] [--no-check] [--allow-remote] [--keep dir]
showreel check <script.yml>
showreel init [file] | showreel init --demo [dir]
showreel setup [--with-deps]
showreel presets
```

Exit codes: 0 ok, 1 written but failed a check, 2 usage, 3 error. Logs go to stderr and the
written file paths to stdout.

## API

```ts
import { render } from 'showreel';

const result = await render('demo.yml', { output: 'out/demo.mp4', gif: false });
if (result.problems.length > 0) console.error(result.problems);
```

## How it works

1. **Record.** Playwright opens the page in headless Chromium. A CDP screencast captures frames at
   device scale, with timestamps. A scripted actor moves a real mouse along eased, slightly curved
   paths. Every pointer position, click and shot is logged on the same clock, and each shot's
   subject box is re-measured every 100 ms.
2. **Render.** For each output frame the virtual camera springs toward the current shot's framing.
   The page is drawn onto the stage at that crop, and the pointer, ripples and captions are drawn
   crisp on top. Raw frames go to ffmpeg (H.264, `yuv420p`, fast start).
3. **Check.** Every settled frame is tested against the subject boxes, and a contact sheet is written.

## Development

```sh
npm ci
npx playwright install chromium
npm run check        # eslint (strict, type-checked) + tsc + vitest, including real renders
./scripts/hero.sh    # re-render the README hero
./scripts/fresh-install.sh   # run the Quickstart above in a clean container
```

## License

[Apache-2.0](LICENSE)
