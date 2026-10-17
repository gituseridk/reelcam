---
name: showreel
description: Make a short cinematic MP4 demo video of a web app feature with the Showreel CLI. Use when asked to record, show off, or demo a UI change, make a product video, a PR demo clip, or a README hero video of a web app.
---

# Showreel: demo videos of web apps

Showreel records a YAML script in headless Chromium and renders a 1080p MP4 with a camera that
frames UI elements, a smooth pointer, click ripples and captions. You write the script; Showreel
does the filming.

## 1. Check the tools

```sh
showreel --help || npx showreel --help
```
If Chromium is missing, run `showreel setup` (on Linux CI: `showreel setup --with-deps`).
ffmpeg must be on PATH.

## 2. Decide the ONE idea

One video shows one small thing, understood on first watch: "add a task", "filter by tag",
"dark mode". Write it as the `title`. 6 to 15 seconds. If you have three ideas, make three videos.

## 3. Write the script

```yaml
title: Add a task, finish it
url: http://localhost:5173/        # the app must already run locally; or `serve: ./dist`
viewport: { width: 1280, height: 720 }
steps:
  - focus: { on: "#composer", why: "typing stays inside the composer" }
  - type: { into: "#new-task", text: "Record the launch video" }
  - press: Enter
  - focus: { on: "#today", why: "the payoff: the list and the progress" }
  - click: "li:has-text('Record the launch video') .check"
  - caption: Done in one click
  - wait: 1500
```

Steps: `visit`, `click` (a selector, or `{ at: [x, y] }` page fractions), `hover`, `type`,
`press`, `scroll`, `drag` (`{ from, to, on }`), `wait`, `waitFor`, `focus` (camera frames an
element, or `{ area: [left, top, right, bottom] }` for canvas apps), `zoom` (focus with a set
level), `wide` (whole page), `caption`. `setup:` holds steps played before filming (sign in,
dismiss a banner, give a canvas app keyboard focus). Selectors are Playwright selectors (CSS,
`:has-text()`, `>> nth=1`).

Camera rules (the check enforces the first three):
- A `focus` frames a whole ELEMENT, never a point. Pick the smallest element that contains
  every following action and its result.
- Hold every shot at least 1.2 s.
- Every click must be inside the current frame. If the result appears elsewhere, `focus` on
  a container that holds both, or go `wide`.
- Start on the view that matters (set `url` to it); do not film navigation you are not demoing.
- End right after the payoff with a short `wait` (about 1 to 1.5 s).
- Use seed data that only contains what the idea needs. Add `forbid: ["lorem", "TODO"]` to fail
  on placeholder text, and `redact: [".email"]` to blur private data.

## 4. Render and look

```sh
showreel check demo.yml
showreel render demo.yml -o out/demo.mp4
```
Exit code 1 means the video was written but failed a check (cropped subject, flicker shot,
click outside the frame, caption over the subject, forbidden text): read the warnings and fix
the script.

Then OPEN `out/demo.sheet.png` (the contact sheet: four stills per shot) and judge every
still: is the subject whole and readable, is anything on screen that does not serve the idea,
does the end show the payoff? Fix and render again until it is clean. Report the MP4 path and
what the video shows in one sentence.
