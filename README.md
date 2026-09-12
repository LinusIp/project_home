# Hovli Courtyard Villa

Architectural presentation for a three-level minimalist high-tech villa built around a central courtyard pool, with three black gabled wings and white fin screens in the direction of SoNo arhitekti's Mountain Villa. The page design follows the light, rounded UnCabin style. The land (plot) is 3,000 m², 50 × 60 m, enclosed by a 3 m wall. Floor areas are counted separately for each level.

The ground floor (the 1st floor) contains every room of the reference Drafted.ai plan (six bedrooms, primary suite, three bathrooms, seven closets, garage, office, den, living, dining, kitchen, nook, sunroom, family room, storage and circulation), rearranged around the pool.

## What the page shows

- Ink-and-watercolour concept images (static JPGs in `images/`)
- Master site plan
- Precise CAD floor plans for the basement, ground and first floors, with walls, door swings, glazing, grid axes, dimensions and room areas
- Staged, furnished colour plans for each level
- Section A–A and four elevations (front, back, left, right)
- Room-by-room breakdown, technical systems, materials and area schedule

Every drawing, area and concept image is generated from one data model (`data.js` and `plan-data.js`), so the figures always match the plans.

## Files

- `index.html`: layout, styles and written content
- `data.js`: plot, levels, rooms, glazing and external areas
- `plan-data.js`: doors, windows, open-plan edges and furniture
- `draw-plans.js`, `draw-sections.js`, `draw-cad.js`, `draw-elev.js`: SVG drawing generators
- `images/`: the concept images
- `bake.html`, `bake.js`: regenerate the concept images from the data (needs `serve.js`)
- `serve.js`: local static server that also saves baked images

## Run locally

```bash
node serve.js
```

Then open http://localhost:4817 for the page, or http://localhost:4817/bake.html to re-bake the images after changing the design.
