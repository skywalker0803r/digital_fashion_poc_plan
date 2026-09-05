# Digital Fashion Cloth Simulation PoC

Real-time layered garment study built with Vite, Three.js, `dat.gui`, and `onnxruntime-web`.

## Run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` creates the production bundle.

## Architecture

- `src/clothSimulation.js` contains the lightweight Verlet-style cloth solver. The top edge is pinned, gravity and wind are applied per frame, and stretch constraints are relaxed over three passes.
- `src/shaders/ClothMaterialShader.js` contains the custom GLSL material. It combines a fine weave signal, animated stress wrinkles, wind displacement, grazing-angle sheen, and layer offsets.
- `src/main.js` owns the WebGL scene, avatar proxy, three cloth layers, lighting, camera controls, animation loop, and GUI wiring. The ONNX Runtime Web import is initialized here so an inference model can be connected at the same boundary later.
- `src/style.css` provides the presentation layer and responsive HUD around the full-screen canvas.

## Live controls

The GUI exposes Gravity, Wind Speed, and independent Shell, Lining, and Trim SDF offsets. Reset returns the simulated cloth to its pinned rest state.