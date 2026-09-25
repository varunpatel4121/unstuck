# Unstuck

Two homepages for a guided reflection prototype, built with plain HTML, CSS, and ES-module JavaScript. No build step is needed.

## Open a version

- `index.html`: the original Dusk homepage and reflection experience.
- `dawn.html`: the Dawn alternative. Light rises as someone interacts and scrolls, with a response demo and a board below the reflection flow.
- `compare.html`: interactive previews of both homepages.
- `typography.html`: three font pairings and separate controls for the Dawn headline and bubble text, shown in a live preview.

## Run

From this folder, run `python3 -m http.server 8765 --bind 127.0.0.1`, then open http://127.0.0.1:8765/compare.html.

## What works

Both versions have five starting points, hover and touch previews, a cell that opens into the reflection space, follow-up questions, optional writing, reflection downloads, keyboard navigation, and reduced-motion support.

Dawn adds changing light, fillable sentence starters included in downloads, four authored response examples, a board of moments, and a poll. The original Dusk homepage keeps its existing design and flow.

This is a prototype with prewritten prompts, not a connected AI conversation. Private reflection writing stays in memory in the current tab; reloading or closing the tab clears it. Downloading a reflection saves a text file on the visitor’s device.

## Board storage

The Dawn board starts in local mode: new cards and a visitor’s vote are saved in that browser’s localStorage. If browser storage is unavailable, they last only for the current visit. Six example cards signed Varun appear for everyone.

To share cards and vote totals across visitors, follow [BOARD_SETUP.md](./BOARD_SETUP.md), deploy `apps-script.gs` to Google Apps Script, and set `SHEET_URL` in `board.js`. The interface explains whether a submission goes to the shared board or stays in the browser. Private reflection writing is never sent to the board automatically.

## Files

`paths.js` contains the original reflection copy. `app.js` handles both reflection experiences, `orbit.js` positions the home cells, and `cell-transition.js` handles the expanding surface. `style.css` and `experience.css` define the original design.

Dawn’s additions are isolated in `dawn.css`, `dawn.js`, `dawn-demo.css`, `dawn-demo.js`, `board.css`, and `board.js`. Its response demo uses authored examples and sends no text to a model.

Dusk uses local Instrument Serif and DM Sans files. Dawn uses a lowercase Loose Thread wordmark in Fraunces, with a bronze loop that opens once on arrival. The center headline uses Newsreader for “I’m feeling” and matching Fraunces Italic for “stuck”; bubble text uses DM Sans. The wordmark settles immediately when reduced motion is enabled. The typography preview also includes Source Sans 3, Cormorant Garamond, and Manrope. The Loose Thread assets and their font license are in `assets/brand/`. All fonts come from Google Fonts and are distributed under the SIL Open Font License; licenses and source links are included with the assets. There are no analytics or accounts. The optional Google Sheet is the only external data service.

## Publishing

GitHub Pages publishes the root of the `main` branch. Commit and push changes to update the live site. The original homepage remains at `/`; Dawn is at `/dawn.html`, the homepage comparison is at `/compare.html`, and font options are at `/typography.html`.
