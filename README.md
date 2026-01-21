# 3D Scene Editor (Lite)

A lightweight React + Vite + Maplibre + Three.js app that renders vector-tile 3D models, supports picking, gizmo transforms, and outline highlight.

## Setup

- Install deps: `npm install`
- Run dev: `npm run dev`

## Required env

Create `.env`:

```
VITE_STYLE_PATH=<maplibre-style-url-or-path>
VITE_MAP4D_TILE_URL=<vector-tile-url-template>
VITE_ROOT_MODEL_URL=<root-url-for-models>
```

Example tile URL template: `https://example.com/tiles/{z}/{x}/{y}.pbf`

## Structure

- `src/components/map/MapView.tsx`: map bootstrapping and layer wiring
- `src/components/map/layers/ModelLayer.ts`: custom 3D model layer + picking
- `src/components/map/layers/OverlayLayer.ts`: transform gizmo and tooltip
- `src/components/map/layers/OutlineLayer.ts`: outline highlight
- `src/components/map/controls/MaplibreTransformControls.ts`: map-aware transform controls
- `src/components/map/data/*`: tile parsing, conversions, and loaders
