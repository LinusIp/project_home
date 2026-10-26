# Hovli Courtyard Villa

Architectural presentation for a three-level minimalist high-tech villa built around a central courtyard pool. The land (plot) is 3,000 m², 50 × 60 m, enclosed by a 3 m wall. Floor areas are counted separately for each level.

The villa has flat roofs with 1.2 m overhangs, a dark stone ground floor and a travertine upper floor, following the client's reference images. Set ROOF_STYLE in data.js to 'gable' to return to the earlier three-gable design.

## What the page shows

- **Concept boards**: an overview sheet plus one sheet per level (basement, 1st floor, 2nd floor). Each floor sheet has the staged plan in its walled site, a numbered room list with areas, plot / footprint / open-area figures, an exploded axonometric with that level highlighted, and renders of the key rooms.
- The 1st floor (ground floor) contains every room of the reference Drafted.ai plan. The basement contains every room of the engineering-lab basement board (4-car garage, engineering workshop, electronics lab, server room, gym, cinema, sauna, shower, wine cellar, electrical and water tank rooms, storage, staff room, bathroom).
- Precise CAD floor plans and staged plans, section A–A, four elevations, master site plan
- Room-by-room breakdown, technical systems, materials and area schedule

Every drawing, area, board and render is generated from one data model (`data.js` and `plan-data.js`), so the figures always match the plans.

## Files

- `drawings.html`: layout, styles and written content of the technical drawing set
- `data.js`: plot, levels, rooms, roofs, glazing and external areas
- `plan-data.js`: doors, windows, open-plan edges, furniture, trees
- `draw-plans.js`, `draw-sections.js`, `draw-cad.js`, `draw-elev.js`, `draw-boards.js`: SVG and board generators
- `images/`: renders (`c01`–`c13`) and exploded axonometrics (`axo-*`)
- `bake.html`, `bake.js`: regenerate the renders and axonometrics from the data (needs `serve.js`)
- `serve.js`: local static server that also saves baked images and the Blender export
- `blender/`: the villa as a Blender scene, rendered in Cycles (see below)

## Run locally

```bash
node serve.js
```

Open http://localhost:4817 for the showcase, http://localhost:4817/drawings.html for the drawings, or http://localhost:4817/bake.html to re-bake the images after changing the design.

The renders are computed from the design model in the browser (three.js). They are concept visualisations, not photographs.

## Blender model

The same model, furnished and dressed as in the explorer, can be rebuilt as a Blender scene (tested with Blender 5.2) and rendered in Cycles with procedural materials, a dusk sky, downlights, lamps, garden lights and trees:

```bash
node serve.js
```

1. Open http://localhost:4817/explore.html?export. It writes `blender/villa.glb` and `blender/villa-extras.json`.
2. Build the scene, which saves `blender/hovli.blend`:

   ```bash
   blender -b -P blender/build_scene.py
   ```

3. Render the concept-board views (exterior, pool, living, kitchen, workshop, cinema, bedroom and an exploded axonometric) to `blender/renders/`. Add `--quick` for half-size previews.

   ```bash
   blender -b blender/hovli.blend -P blender/render.py
   ```

The export, the `.blend` file and preview renders are not committed: they are rebuilt from the data.

## Pages

- `explore.html` is the interactive 3D explorer: a dusk view of the whole villa, and a furnished cutaway of each level floating on a dark studio backdrop (walls cut at 2.0 m), with water, daylight, electricity, gas and AC overlays, room focus and a cost calculator. It is built live in the browser from the same data (three.js r147). `explore-look.js` holds the procedural materials, the furniture and the 3D-only room dressing (fireplace walls, lamps, pendants, art, the workshop tool wall and the cinema risers); `explore.js` places that dressing per level in `DRESS`.
- `index.html` is the showcase landing page, built from the concept pictures and sheets (images in `img/`) and the Blender renders (`blender/renders/`).
- `drawings.html` is the technical drawing set: concept boards, CAD and staged plans, section, elevations, systems and area schedule (images in `images/`).

Both are published with GitHub Pages from the repository root. `.nojekyll` makes Pages serve the files as they are.
