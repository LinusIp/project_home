# Hovli Courtyard Villa

Single-page architectural presentation for a three-level minimalist high-tech villa built around a central courtyard pool on a walled 3,000 m² plot (50 × 60 m).

The page includes a master site plan, labelled floor plans for the basement, ground and first floors, a section, north and east elevations, live WebGL renders, a room-by-room breakdown, technical systems, a materials palette and an area schedule.

All drawings, areas and renders are generated from one data model in `data.js` (room rectangles in metres), so every figure on the page matches the plans.

## Files

- `index.html`: page layout, styles and written content
- `data.js`: plot, levels, rooms, glazing and external areas
- `draw-plans.js`: site plan and floor plans (SVG)
- `draw-sections.js`: section, elevations and systems diagrams (SVG)
- `render.js`: 3D renders built with three.js r147 (loaded from jsDelivr)
- `serve.js`: optional local static server

## Run locally

Open `index.html` through any static server, for example:

```bash
node serve.js
```

Then visit http://localhost:4817. GitHub Pages also works with no build step.
