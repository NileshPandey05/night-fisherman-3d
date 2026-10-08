# 🏮 Night Fisherman & Ocean Simulation 3D

A studio-grade real-time 3D nocturnal ocean diorama and biological swarm simulation built with **Three.js**, **React Three Fiber**, and procedural GLSL shaders.

Inspired by Wawa Sensei's *"You can't prompt what you can't name"* series and physical oceanographic principles.

---

## ✨ Features

- **🏮 Night Fisherman Diorama**:
  - Traditional bamboo raft floating with 4-point hydrodynamic buoyancy on Gerstner waves.
  - Seated fisherman with conical straw hat and flexible bamboo rod.
  - Interactive click-to-cast fishing lure with dynamic catenary line and floating bobber.
  - Warm oil lantern with physical inverse-square lighting and downward volumetric god-ray shafts.
  - Silhouetted distant bamboo fishing boats with flickering lanterns bobbing on the horizon.
  - Luminous 3D moon with multi-layered atmospheric halos and ocean moon glade reflection.

- **🐟 Biological Swarm Dynamics (1,000 Fish)**:
  - Procedural multi-part baitfish (ellipsoid hull, forked tail, dorsal & pectoral fins) in a single `InstancedMesh` draw call.
  - Tail-wagging vertex shader and guanine scale anisotropic crystal glints.
  - **4 Swarm Behaviors**: Toroidal Milling Vortex (with direction flip), The Fountain Plume, Flash Expansion, and Free Flocking with banking roll.
  - Ballistic parabolic breaching into airborne leaps with splash droplet bursts.
  - Stalking predator creature triggering school evasion.

- **🌊 Physical Capillary Waves & Ocean Water**:
  - Spatial frequency decoupling: long Gerstner gravity swells in Vertex Shader, analytical capillary ripples in Fragment Shader.
  - Two-harmonic concentric wave train ($k_1=22, k_2=44$) with viscous damping envelope, completely free of mesh aliasing.
  - Procedural ambient wind micro-capillaries providing liquid satin sheen under moonlight.

- **✨ Wawa Sensei Level 3 Chromatic Caustics**:
  - Dual counter-scrolling Voronoi focal webs with RGB spectral dispersion.
  - Wave-coupled advection surging forward with the ocean swell and bunching up on wave crests.
  - Multi-surface illumination: water surface, fish scale light ribbons, and subterranean sand dunes.

- **⚡ Performance & Optimization**:
  - Clamped Device Pixel Ratio (`dpr={[1, 1.5]}`) and distance culling for locked 60 FPS in full-screen.
  - Half-resolution post-processing `UnrealBloomPass` glow.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone git@github.com:NileshPandey05/night-fisherman-3d.git
cd night-fisherman-3d

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173/#/fisherman` to explore the Night Fisherman diorama, or toggle between the Shoreline, Aquarium, and Pool caustics scenes.

### Build for Production

```bash
npm run build
```

---

## 🛠️ Tech Stack

- **Core**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/)
- **3D Engine**: [Three.js](https://threejs.org/), [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber), [@react-three/drei](https://github.com/pmndrs/drei)
- **Shaders**: Custom GLSL (Gerstner waves, Voronoi caustics, Guanine scale reflection)
- **Post-Processing**: Native `UnrealBloomPass` + `EffectComposer`

---

## 📜 License

MIT License © 2026 Nilesh Pandey
