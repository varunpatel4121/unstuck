# Unstuck

A local, responsive prototype of a guided reflection experience. The design uses deep olive, ivory, and warm bronze, with slowly orbiting organic shapes and five starting points.

## Run

From this folder, run `python3 -m http.server 8765 --bind 127.0.0.1`, then open http://127.0.0.1:8765.

## What works

- Five starting points with stable labels, personal hover text, a bronze rim highlight, and touch previews.
- The selected cell expands into an organic enclosure that continues through questions, writing, and exercises.
- Three distinct follow-up choices per starting point, plus an open writing path.
- Reflection prompts, an optional writing space, and prewritten exercises.
- Back navigation, reflection downloads, reduced-motion support, and an orbit that settles on hover or keyboard focus.
- Local typefaces; no external requests, analytics, accounts, or stored journal entries.

This version uses prestructured prompts and is not connected to an AI model. Writing is held only in memory in the current browser tab. Reloading or closing the tab clears it. Downloading a reflection saves a text file on the visitor's device.

`paths.js` contains the reflection copy. `style.css` controls the visual design and motion. `app.js` handles the experience. `experience.css` styles the expanded cell, and `cell-transition.js` handles the continuous surface transitions.

Fonts: Instrument Serif and DM Sans, from Google Fonts. They are distributed under the SIL Open Font License.

## Publishing

The website is published with GitHub Pages from the root of the `main` branch. Commit and push changes to update the live site.
