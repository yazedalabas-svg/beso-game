# Validation

- Node pursuit simulations: 20 seeded mazes, 72,000 steps; collision clearance, speed bounds, occluded memory and safe-zone behavior.
- Headless scene tests with actual GLB parsing and real Three.js scene graphs: skin/bone loading, key and memory puzzle, evidence collection, four cinematic timelines, replay and preserved checkpoint. Renderer and browser/audio surfaces are stubbed; these complement the browser checks below.
- Production build and embedded standalone bundle.
- Full starter lint includes existing errors in unused components/ui and hooks; validate game files separately. Browser visual QA completed on September 10: introduction skip, pointer-lock start, room props, corrected wall materials, walking pursuer, capture and retry. Controlled camera positions were used to inspect the models. Screenshots are in the parent outputs directory.
