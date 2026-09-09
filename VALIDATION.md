# Validation

- Node pursuit simulations: 20 seeded mazes, 72,000 steps; collision clearance, speed bounds, occluded memory and safe-zone behavior.
- Headless scene tests with actual GLB parsing and real Three.js scene graphs: skin/bone loading, key and memory puzzle, evidence collection, four cinematic timelines, replay and preserved checkpoint. Renderer and browser/audio surfaces are stubbed; these are not a visual or listening browser test.
- Production build and embedded standalone bundle.
- Full starter lint includes existing errors in unused components/ui and hooks; validate game files separately. No browser visual QA was performed.
