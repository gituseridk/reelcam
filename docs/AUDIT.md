# Per-moment content audit of the README videos

Every beat of every video, and everything on screen at that beat: KEEP, CUT or IMPROVE, with the
reason. One idea per video. The contact sheets (`out/*.sheet.png`, made by `scripts/hero.sh` and
`scripts/gallery.sh`) were checked frame by frame.

## Hero (16:9), `examples/hero.yml`, 10.1 s. Idea: "ship a release from the command bar"

Cuts are fixed 0.7 s moves that land exactly on the next shot; no shot shows a partly visible neighbour.

| t (s) | Shot | On screen | Verdict |
|---|---|---|---|
| 0.0-1.6 | wide, the whole page fits 720 px | Orbit release page: 3 of 5 checks, 60% ring, changelog, rollout at 0. The pointer goes to the search pill and clicks it | KEEP: the "before" state and the motivated action that opens the palette. |
| 1.9-3.4 | in on the palette | Palette over the blurred page; "ship 2.0" typed; the list narrows to "Ship Orbit 2.0" | KEEP: the hook, a typed input within 2 s. |
| 3.7-6.8 | wide | Checks tick one by one, ring 60 to 100%, "Orbit 2.0 is live", confetti, the changelog gains 2.0, the rollout counts up | KEEP: the payoff, all on one page (no scroll). |
| 7.1-10.1 | in on the changelog | "2.0 · Orbit 2.0 · Today" over 1.9; caption "Recorded from 14 lines of YAML" below the card | KEEP: second payoff and the pitch. The caption sits on the page background and never covers the card. |
| removed | | Scroll to the changelog; title pill over the opening | CUT: the page fits without scrolling; the pill covered the opening frame. |

## Hero (9:16), `examples/hero-vertical.yml`, 10.1 s. Same idea on a phone

| t (s) | Shot | On screen | Verdict |
|---|---|---|---|
| 0.0-1.7 | wide | Phone layout of the page on the stage; the pointer clicks Search | KEEP: phone pages keep the stage (filling would crop the page). |
| 2.0-3.5 | in on the palette | "ship 2.0" typed | KEEP: the hook. |
| 3.8-10.1 | wide | Checks tick, 100%, "Orbit 2.0 is live", "Shipped to 12,400 teams"; caption "Recorded from 15 lines of YAML" | KEEP: the payoff; the caption covers nothing. |

## Gallery: Excalidraw, `examples/gallery/excalidraw/excalidraw.yml`, 9.4 s. Idea: "sketch a flow in seconds"

| t (s) | Shot | On screen | Verdict |
|---|---|---|---|
| 0.0-9.4 | one area shot on the drawing, symmetric margins | Opens mid-stroke; rectangle "Idea", arrow, diamond "Test", arrow, ellipse "Ship", drawn with the keyboard tools; caption "Excalidraw, filmed by a 28-line script" | KEEP. The toolbar and style panel stay out of frame. |
| removed | | Opening wide on the empty canvas; toolbar clicks with long pointer travel | CUT: the drawing is the subject; keyboard tools keep it under 10 s. |

Excalidraw is MIT-licensed and runs locally, built from the npm package. Its name and look
appear only as the subject of the video, not as an endorsement.
