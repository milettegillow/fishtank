# Build a fish tank: notes

Plain HTML/CSS/JS. Open `index.html` directly. Scripts load as classic `<script>` tags in this order and share `window.Tank`:
`species.js → art.js → rules.js → caustics.js → swim.js → ui.js → main.js`. Nothing runs until `main.js` calls `init()`.

## Decisions

- **Layout and the floor.** The water canvas fills the whole viewport. The palette drawer floats over the bottom of it, so the shader's floor spans the drawer area plus about 14% of the tank above it. Decor sits on a baseline inside the visible strip of sand. When the drawer slides away on "Complete tank", more of the sand shows. All of this geometry comes from `T.computeLayout()` in `swim.js`, which also sets `--drawer-h`.
- **Temperature readout.** The temperature pill shows the current value (for example "26°C") next to Cold / Warm / Tropical. That way the °C ranges on fact cards make sense. There is no other label text in the controls.
- **Tail wag.** Tails wag with `rotate()` plus a slight `scaleX()`, applied via CSS `transform` on `<g class="tail">`. That group uses `transform-box: view-box` and an inline `transform-origin` at the tail base. Pectoral, dorsal and anal fins work the same way with `.fin` (lionfish fins ripple, betta fins flow).
- **Unique SVG ids.** Each `Tank.Art.render()` call gets unique gradient and clip ids, so palette thumbnails hidden with `display: none` can't break the gradients of fish in the tank. Decor art is lightly randomised per instance, so no two staghorns or sea fans are identical.
- **Driftwood in salt water** isn't killed: it's wood. It produces a "note" about tannins instead. Driftwood has no temperature requirement, as specified.
- **Decor in the results.** After "Meet your fish" there is a "Your decor" section with fact cards. Revealing decor also unlocks its palette fact card.
- **Revealed species persist** in `localStorage`, wrapped in try/catch. Revealed palette items get a faint gold ring, which is a visual cue, not text. Clicking a revealed fish already in the tank also opens its fact card.
- **Bioload.** Capacity is 80. Neon 2, cory 3, barb/betta 4, clownfish/gramma 5, angelfish 8, copperband 12, yellow tang 15, blue tang 25, goldfish 25, lionfish 30. Ten to fifteen small fish come to about 30–60. Four goldfish (100) or two lionfish plus a blue tang (85) fail.
- **Predation** assigns each prey to one able predator, round-robin. Predators never eat their own species. The eat animation runs one prey at a time per predator, so a lionfish with many small fish takes longer than about 2 seconds. The results panel waits for it.
- **Territorial extras** are the most recently placed individuals. The earliest-placed ones survive.
- **Severity.** "Eaten" issues have severity `dead`. Copperband coral damage is reported as `stressed`, and the coral or anemone outcome is `damaged`, shown as bleached.
- **Keyboard.** Pressing Enter or Space on a palette item drops it at a random spot in the middle of the tank. A pointer click opens the fact card, but only for revealed items.
- **Performance.** The shader caps DPR at 2 as specified. If frames average over about 24 ms, it steps the render resolution down (to a minimum of 0.6×) to stay smooth on weaker GPUs.
- **Open Graph.** Title, description and type are set. There is no `og:image` because there's no raster image in the project. Add a 1200×630 screenshot if link previews matter.
- No shell commands were run apart from the final git commit, so nothing has been executed or tested.

## Results update

- **Collapsible panel.** The results panel has an arrow tab on its left edge. Clicking it collapses the panel off-screen to the right in 300ms and leaves only the tab showing. On narrow screens the panel is a bottom sheet, so the tab sits on its top edge and the panel collapses downwards. The panel always opens expanded. Its first slide-in still takes 0.7s; only collapse and expand take 300ms.
- **Dead fish.** When the outcome animation starts, dead fish flip and float up straight away. They slow down as they near the top and stop just under the surface, low enough that the skull badge above them stays on screen.
- **Skull badges.** Skulls are DOM elements in `#badgeLayer`, positioned every frame for fish. Decor gets a skull only when its status is `dead`. Coral bleached by the copperband (`damaged`) doesn't get one. Eaten fish get a skull where they were eaten, which fades after about 1s. "Try again" and "Start over" clear every skull.
- **Grouped cards.** Issues are grouped by rule and cause. For example, all freshwater fish in salt water share one card, and all prey of one predator species share one card. Territorial cards stay one per species, because each species has its own reason. Each issue now has a `rule` field.
- **Headline pools.** The pools live in `Tank.Rules.HEADLINES`, with 4–5 templates per rule. Headlines are picked at random without repeating a template within one panel. Passing `state.random` makes the choice deterministic. "That's a pickle" appears exactly once across all pools.

## Unsure about

- Exact visual tuning of the caustic shader (brightness, scale, gravel size) can only be judged in a browser. The constants live near the top of `main()` in the `FS` string in `js/caustics.js`.
- Some fish proportions in the SVG art (for example the blue tang's palette marking, and how big the lionfish fins are) may need a nudge once seen at size.
- `transform-box: view-box` with a pixel `transform-origin` on SVG `<g>` elements is well supported in current Chrome, Firefox and Safari, but it's worth checking that tails pivot at their base in each.
- Fun facts and species values follow the brief. The facts are written to be accurate, but they're worth a second read by someone with fish-keeping expertise.

## Check in the browser

1. No console errors on load, including when opened via `file://`.
2. Water: caustics on the floor and lower water, god rays, a bright surface band, bubbles. Switch Salt ↔ Fresh and Cold/Warm/Tropical and check for a smooth ~1 s transition, green tint, gravel and specks in fresh water.
3. Drag every fish and decor item in. Fish should land exactly under the pointer and decor should slide down onto the sand. Drag placed items around, and drag them onto the drawer to remove them.
4. Schooling (neons, barbs, corys), corys staying on the floor, the lionfish hovering, tangs darting, clownfish circling an anemone.
5. "Complete tank" scenarios:
   - Lionfish + clownfish: the eat animation and the "lunch" headline.
   - Neons in salt water: dead fish flip belly-up and float.
   - Goldfish on Tropical.
   - Two bettas.
   - Three neons: "not a school".
   - Betta + 3 tiger barbs.
   - Copperband + corals: bleaching.
   - Four goldfish on Cold: overstocked.
   - Six neons + six corys + a java fern on Fresh/Tropical: celebration.
6. "Try again" revives everything in place. "Start over" empties the tank. After a run, clicking a revealed palette item shows its fact card.
7. Touch: dragging upward from the palette on a phone or tablet, and horizontal scrolling of the palette.
8. Resize the window, including the narrow mobile layout. The results panel becomes a bottom sheet under 760px.
9. Check the WebGL fallback by disabling WebGL: you should get a gradient background with a sand band.
