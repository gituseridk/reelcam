/** The script `init` writes: a working outline to edit, with the common step kinds shown. */
import { DISPLAY_NAME } from './brand.js';

export const STARTER = `# A ${DISPLAY_NAME} script. Docs: README "Script format".
# One idea per video. Start on the view, end right after the payoff.
# The camera moves 0.7 s ahead of each camera step, so a shot holds still for the time until the
# next camera step minus 0.7 s: give a shot 1900 ms or more to show it still for 1.2 s.
title: Create a project          # a pill shown for the first 2 s (optional)
url: http://localhost:3000/       # your app, running locally (or use "serve: ./dist")
preset: studio                    # studio, daylight, bare, vertical, square
steps:
  - focus: { on: "form", why: "typing stays inside the form" }   # camera frames this element
  - type: { into: "input[name=name]", text: "Moonshot" }
  - press: Enter
  - wide: "the new project appears in the list"                 # camera back to the whole page
  - caption: Projects are created instantly
  - wait: 1500
`;
