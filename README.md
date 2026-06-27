# Aura Garden — Every Flower Awaits Your Touch 🌸

An ultra-premium, cinematic, interactive single-page digital garden experience with a luxurious purple aesthetic. Built with HTML5 Canvas, React, TypeScript, Tailwind CSS, GSAP, and native Web Audio synthesis.

## 🌟 The Experience

Welcome to **Aura Garden**, a mystical sanctuary designed to respond to your touch. There are no buttons or forced inputs. You are invited to interact with the canvas directly to sprout, bloom, and expand a living, breathing floral ecosystem.

### Features
1. **Interactive Tap-to-Bloom**:
   - Tapping anywhere on the screen sprouts a flower exactly where your touch landed.
   - Stems grow organically upwards from the rolling landscape to your tap position.
   - Leaves emerge and scale dynamically as the stem grows.
   - Blossoms unfold with a satisfying fluid motion powered by GSAP spring physics.
   - Petals and glowing golden pollen scatter outwards on bloom, accompanied by a soft, radiant halo.

2. **Five Custom Procedural Flowers**:
   - **The Dreamy Rose**: Concentric swirling layers of deep pink, soft white, and magenta petals.
   - **The Cosmic Lotus**: Multi-layered pointed petals opening with a gradient extending from deep violet to pearlescent white.
   - **The Midnight Star (Cosmos)**: Radiant, slender loops orbiting a massive glowing golden central seed pistil.
   - **The Celestial Tulip**: Three vertical overlapping petals forming a vertical chalice of soft white and purple.
   - **The Golden Orchid**: A rare, luxurious structure featuring broad lateral wings, upper sepals, and a glowing lower lip.

3. **Generative Sound Architecture**:
   - Uses **native Web Audio API** for real-time procedural sound. Zero external asset load times and no licensing issues.
   - **Interactive Laser-Harp Chimes**: Each flower bloom triggers a shimmering chord arpeggiated on a **G-Major Pentatonic Scale**. The pitch corresponds directly to the height of your tap (higher tap = higher pitch) and pans dynamically in stereo (left/right speaker) relative to your horizontal touch position!
   - **Analog Ambient Pad**: A deep, slow, breathing base drone (triangle oscillators running through 250Hz low-pass filters) establishes a meditative aura.
   - **Acoustic Piano Sequence**: A slow, random background sequencer plucks soft notes from the pentatonic scale at organic intervals.
   - **Procedural Wind**: Generates custom wind-rustle ambient noise with bandpass-filtered noise. The pitch and volume of the wind gusts rise and fall, perfectly synced with the visual sway of the garden.

4. **Multi-Phase Garden Progression**:
   - **Phase 1: Sprouting (0 - 49 Blooms)**: Quiet, meditative backdrop with gentle light rays, soft floating fireflies, and slow wind.
   - **Phase 2: Blooming (50 - 99 Blooms)**: Fireflies multiply. Butterflies emerge, seeking out and hovering around your fully-bloomed flowers to pollinate them, releasing trails of gold dust. Wind speeds and lighting glows pick up.
   - **Phase 3: Elysium (100+ Blooms)**: The camera slowly zooms out (scale 0.65) and pans up to reveal a breathtaking, dense rolling meadow of flowers. The final poetic surprise fades in elegantly: *"These flowers are all for you ❤️. Every bloom began with your touch."*

5. **Cinematic Post-Processing & Parallax**:
   - Core drawing is rendered on HTML5 Canvas running at solid **60 FPS** with hardware acceleration.
   - Depth is modeled via three distinct parallax planes (far backdrop, main garden, foreground lens petals) to create a rich 3D layout.
   - Continuous subtle **Cinematic Camera Drift** simulates a floating cinematic lens.
   - Features animated shifting sunlight rays (crepuscular rays), glowing moving light blobs, and a deep purple vignette overlay.

## 🛠️ Technology Stack

- **Framework**: React 19 + TypeScript + Vite
- **Physics & Motion**: GSAP (GreenSock Animation Platform)
- **Styling**: Tailwind CSS
- **Graphics**: HTML5 Canvas API (High-DPI / Retina-ready)
- **Audio**: Custom Web Audio Synth (oscillators, filters, biquad damping, stereo panners)

## 🚀 How to Run locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

## 🎻 Interaction Guidelines
- **Tap or Click** anywhere to sprout flowers.
- **Adjust Volume** or **Mute** using the glassmorphic control bar in the top-right corner.
- **Check Progress** of the garden phase in the bottom-left.
- **Reset the Garden** anytime using the "Reset Garden" button in the top-left (visible after 1 bloom is planted) to see all flowers disintegrate into a beautiful blizzard of floating petals.
