# Skimmer Visualization

An interactive paper-skimmer construction model for Design & Modeling. This is the teacher-approved R5 version, copied unchanged from the lesson packet.

## Publish the student link

1. Open [Settings → Pages](https://github.com/AbbyUsesAIThatCodes/SkimmerVisualization/settings/pages).
2. Set **Source** to **Deploy from a branch**.
3. Select **main** and **/ (root)**, then **Save**.
4. Wait for GitHub to show the successful deployment and live address.

Expected student address after deployment:

**https://abbyusesaithatcodes.github.io/SkimmerVisualization/**

Add the live address as a link in Google Classroom. This README does not by itself confirm that Pages has been activated.

## Use it

The page starts paused. Students can play/pause, move between eleven construction steps, use half speed, pause at each step, restart, and drag to rotate the model. It opens independently of the classroom's other activities.

The model shows one body, two fins, and one air scoop. The scoop goes under the FRONT, opposite the rear fins. Its narrow end aligns with the nose, and its tabs attach inside the rails. Paper thickness and fold angles are illustrative; match the teacher's physical model and demonstrate the actual launcher separately.

## School-device check

Open the published link on a student device using school Wi-Fi. Check that the pieces appear, Next step advances, Play moves the model, and dragging rotates it. The browser needs JavaScript and WebGL.

For an allow-list request, provide the full student URL above and the hostname **abbyusesaithatcodes.github.io**. The page loads no external libraries, fonts, scripts, images, or media.

## Files and privacy

- `index.html`: the complete standalone interactive, including its styling and 3D code.
- `.nojekyll`: serves the static files without Jekyll processing.

No install or build is needed. No student account, name collection, shared state, analytics code, answer submission, or saved progress is included. GitHub may keep ordinary hosting access logs.

## Verification

The uploaded page matches the approved R5 HTML exactly: Git blob `890cb190a897ad049984836b366a182a8f5bd268`. Programmatic checks covered finite geometry, all stages, seeking, step navigation, automatic pause, and orbit handlers. The teacher has successfully tried the R5 interactive; a school-network test is still required.

Original classroom illustration; not an official PLTW publication. No curriculum PDFs or teacher answer keys are included in this repository.
