# Contributing

Thanks for helping. Good first contributions: a new preset, a new step, an example script for a
well-known open-source app, or a sharper error message.

## Setup

```sh
npm ci
npx playwright install chromium   # and ffmpeg on your PATH
npm run check                     # lint + typecheck + tests (the tests record real videos)
```

## The bar

- `npm run check` passes with zero warnings. ESLint runs the strict, type-checked rule sets.
- No non-null assertions, no `any`, and no empty or silent `catch`. A user-facing failure is a
  `ShowreelError` with a message and a hint.
- Functions stay at 50 lines or fewer, and files at 200 or fewer.
- Every feature has a test. Anything visual also gets a render: open the contact sheet
  (`out/<name>.sheet.png`) and look at it before you open the PR.
- A camera change must keep the camera rules in the README true.

## Adding a preset

Copy a block in `src/presets/index.ts`, give it a name and a one-line description, add it to
`PRESETS` and to the README table, and attach a contact sheet rendered with it to the PR.
