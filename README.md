# DM · Skimmer Studio

An interactive paper-skimmer drawing and assembly guide. Start with whole, blank paper; draw one measured line at a time; identify the colored parts; then cut, fold, and assemble in the same 3D view.

## Student controls

- **Next / Previous:** show a completed step immediately.
- **Play:** animate forward. **Pause each step** is on initially.
- **Replay step:** watch just the selected action again.
- **Step selector:** jump directly to the main body, either of the two air fins, the air scoop, or any assembly action.
- **Draw / Assemble:** jump to the blank sheet or the check-before-cutting stop.
- **Drag:** rotate freely using a spherical trackball, including over the poles and underneath the model.
- **Wheel / two-finger pinch:** zoom. Reset view restores the default framing; Paper view looks straight down.
- **Inches / Millimeters:** switch all drawing instructions and dimension annotations. Metric values are exact conversions at 25.4 mm per inch, including 3.175 mm for 1/8 inch. Switching units never rescales the parts.
- **Keyboard:** focus the picture and use arrow keys to rotate, +/− to zoom, and R to reset. Space plays or pauses when not operating another control.

Every drawing step shows measurements on both paper axes, with labels explaining each value. Both rail folds explicitly show their 8 in (203.2 mm) length alongside the inset and rear gap. Sloping air scoop tabs show both offsets and the center length. Drawn cuts and dashed folds are heavier than the thin, pale paper boundary. Measurement arrows use bright purple, thicker lines, and a pale outline to stay visible across drawn lines and paper edges.

The rail inset measurement sits outside the rear edge of the paper, with room reserved for its label on small screens. Dimension guides leave a gap at the paper. The active drawing stroke appears above those guides, and its moving pencil dot has a pale outline and stays on top, including on the tiny air scoop tabs.

There are 29 individual drawing strokes and 42 total steps. The normal-speed assembly is 18 seconds, four times faster than R5. Quarter, half, and double speed are available. Playback always stops at the measurement check before cutting, even with continuous play selected. It starts paused and resets to blank paper.

The rails are the folded sides of the main body. Labels are ink-like lettering attached to the paper surfaces, including both rails. WebGL depth testing hides letters behind other parts. The air scoop travels around the nose, lowers below the body, and slides into the channel with its tabs inside the rails.

Fold angles and thickness remain illustrative. Follow the teacher's working model for attachments, drying, and launcher setup.

## Run or publish

No build, installation, account, or external runtime is needed. Open `index.html` locally with the other files beside it, or serve the repository as a static website.

The existing Pages setup uses `main` and `/ (root)`. Review and merge the pull request to update the student link:

https://abbyusesaithatcodes.github.io/SkimmerVisualization/

## Files

- `index.html` — accessible controls and page layout.
- `style.css` — responsive DM visual theme.
- `model.js` — measured drawing, assembly geometry, timing, unit formatting, and rotation math.
- `app.js` — controls, animation, WebGL rendering, and paper lettering; includes a basic Canvas fallback.
- `assets/dm-cube.svg` — vector cube emblem extracted from the existing DM bellringer artwork, without surrounding text.
- `tests/model.test.cjs` — independent checks for dimensions, stroke progression, collision clearance, label planes, and rotation.

The app makes no external library, font, image, or analytics requests. It collects no student data and saves no progress. No curriculum documents or answer keys are included.

## Verification

Run `node --test tests/model.test.cjs` for the geometry and timing checks. See `QA.md` for the browser checks and their limits. Confirm the merged student link once on a school device and school Wi-Fi before class.
