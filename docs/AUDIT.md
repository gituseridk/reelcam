# Per-moment content audit of the README videos

Every beat of every video, and everything on screen at that beat: KEEP, CUT or IMPROVE, with the
reason. One idea per video. The contact sheets (`out/*.sheet.png`, made by `scripts/hero.sh` and
`scripts/gallery.sh`) were checked frame by frame.

## Hero (16:9), `examples/hero.yml`, 10.5 s. Idea: "ship a release from the command bar"

| t (s) | Shot | On screen | Verdict |
|---|---|---|---|
| 0.0-1.85 | wide, fills the frame, breathing | Orbit release page: 3 of 5 checks, 60% ring, changelog, rollout at 0 | KEEP: the "before" state the payoff changes. |
| 0.2-1.5 | wide | Pointer travels to the search pill and clicks it, then eases off | KEEP: the motivated action that opens the palette. |
| 1.85-3.55 | dolly in on the palette (the move starts 0.35 s ahead) | Palette over the blurred page; "ship 2.0" typed; the list narrows to "Ship Orbit 2.0" | KEEP: the hook, a zoom into a typed input within 2 s. The blurred background is the app's own, not noise. |
| 3.55-6.25 | pull back to the release card | Checks tick one by one, ring 60 to 100%, headline becomes "Orbit 2.0 is live", confetti | KEEP: the payoff and the surprise. The nav bar at the top edge is context and is not cropped mid-word. |
| 6.25-7.75 | wide while the page scrolls | Release card scrolls up, changelog and rollout come in; the rollout counts to 12,400 | KEEP: the vertical move; scrolling is shown wide (camera rule 3). |
| 7.75-10.5 | dolly in on the changelog | "2.0 · Orbit 2.0 · Today" on top; caption "Recorded from 17 lines of YAML" below the card | KEEP: second payoff and the pitch. The caption sits on the page background and never covers the card. |
| removed | | Title pill over the opening | CUT: it covered the lower half of the opening frame; the hook states the idea. |
| removed | | Rollout card sliver at the right edge of the last shot | CUT: the gap between the cards is wider than the camera's air now. |

## Hero (9:16), `examples/hero-vertical.yml`, 10.7 s. Same idea on a phone

| t (s) | Shot | On screen | Verdict |
|---|---|---|---|
| 0.0-1.95 | wide | Phone layout of the page on the stage | KEEP: phone pages keep the stage (filling would crop 18% of the page). |
| 1.95-3.65 | dolly in on the palette | "ship 2.0" typed | KEEP: the hook. |
| 3.65-6.35 | release card | Checks tick, 100%, confetti | KEEP. |
| 6.35-7.95 | wide while scrolling | Changelog and rollout | KEEP. |
| 7.95-10.7 | rollout card, the view passes onto the stage | "12,400 teams on 2.0"; the caption sits on the stage below the page | KEEP: the caption covers nothing. IMPROVED from the first take, where the caption covered "Rolling out to every team". |

## Gallery: Excalidraw, `examples/gallery/excalidraw/excalidraw.yml`, 13.6 s. Idea: "sketch a two-step flow in seconds"

| t (s) | Shot | On screen | Verdict |
|---|---|---|---|
| 0.0-1.25 | wide | Excalidraw's empty canvas with its toolbar | KEEP: establishes the real app. IMPROVE later: a shorter opening (the shot must hold 1.2 s). |
| 1.25-13.6 | dolly in on the drawing area | Rectangle "Write", arrow, ellipse "Ship", drawn with R, A and O | KEEP. The style panel that Excalidraw opens on the left stays out of frame. The area was moved right so no sliver of it shows. |
| about 12.3 | same | A click on empty canvas | KEEP: it clears the selection box, so the last frame shows only the drawing. |
| about 12-13.6 | same | Caption "Excalidraw, filmed by a 22-line script" | KEEP: on empty canvas, below the drawing. |
| removed | | Toolbar clicks with long pointer travel (17.6 s take) | CUT: keyboard tools keep it under 15 s and let the camera stay on the drawing. |

Excalidraw is MIT-licensed and runs locally, built from the npm package. Its name and look
appear only as the subject of the video, not as an endorsement.
