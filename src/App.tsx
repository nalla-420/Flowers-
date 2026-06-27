import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Volume2, VolumeX, RotateCcw, Wind, Flower } from "lucide-react";

// --- AUDIO SYNTH ENGINE ---
// Built from scratch using native Web Audio API for zero-loading, high-fidelity,
// and interactive procedural audio that creates a G-Major Pentatonic harp chime on tap,
// a warm analog ambient pad, and responsive white-noise wind.
class SoundEngine {
  ctx: AudioContext | null = null;
  isMuted: boolean = false;
  volume: number = 0.5;
  masterGain: GainNode | null = null;
  padGain: GainNode | null = null;
  windGain: GainNode | null = null;
  padOscs: OscillatorNode[] = [];
  sequencerTimer: any = null;

  constructor() {}

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume * 0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.startAmbientPad();
      this.startWindSynth();
      this.startAmbientSequencer();
    } catch (e) {
      console.error("Web Audio API failed to initialize:", e);
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const targetGain = muted ? 0 : this.volume * 0.8;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
    }
  }

  setVolume(vol: number) {
    this.volume = vol;
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(vol * 0.8, this.ctx.currentTime, 0.1);
    }
  }

  // A very warm, deep low-frequency drone to provide cozy backdrop atmosphere.
  // We use two warm triangle oscillators slightly detuned.
  startAmbientPad() {
    if (!this.ctx || !this.masterGain) return;

    this.padGain = this.ctx.createGain();
    this.padGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.padGain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 3.0); // fade in pad
    this.padGain.connect(this.masterGain);

    const freqs = [98.0, 146.83]; // G2 and D3
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq + (idx === 0 ? -0.2 : 0.3), this.ctx!.currentTime);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(250, this.ctx!.currentTime);

      osc.connect(filter);
      filter.connect(this.padGain!);
      osc.start();
      this.padOscs.push(osc);
    });
  }

  // Synthesizes a soft procedural wind sound using bandpass-filtered noise.
  startWindSynth() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.setValueAtTime(350, this.ctx.currentTime);
    windFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.02, this.ctx.currentTime);

    whiteNoise.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    whiteNoise.start();

    // Modulate wind pitch and volume slowly to mimic outdoor gusts
    const modulateWind = () => {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const wave = Math.sin(t * 0.15) * 0.4 + Math.cos(t * 0.07) * 0.6;
      const freq = 300 + wave * 150;
      const vol = 0.015 + (wave + 1) * 0.01;

      windFilter.frequency.setTargetAtTime(freq, t, 1.5);
      this.windGain!.gain.setTargetAtTime(vol, t, 1.5);

      setTimeout(modulateWind, 2000);
    };
    modulateWind();
  }

  // Slow, beautiful, generative melody sequencer that plucks notes from a gorgeous pentatonic scale
  startAmbientSequencer() {
    const scale = [195.99, 220.00, 246.94, 293.66, 329.63, 392.00, 440.00, 493.88, 587.33, 659.25]; // G pentatonic
    
    const playNext = () => {
      if (!this.ctx) return;
      
      // Pluck a beautiful random note
      if (!this.isMuted && Math.random() > 0.15) {
        const index = Math.floor(Math.random() * scale.length);
        const freq = scale[index];
        this.playPianoNote(freq, 0);
      }

      // Schedule next note with a organic tempo
      const nextDelay = 3000 + Math.random() * 4500;
      this.sequencerTimer = setTimeout(playNext, nextDelay);
    };
    
    // Start after a tiny delay
    this.sequencerTimer = setTimeout(playNext, 4000);
  }

  // Synthesizes a warm acoustic resonant pluck
  playPianoNote(frequency: number, delay = 0) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const time = this.ctx.currentTime + delay;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gainNode = this.ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(frequency, time);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(frequency * 1.002, time); // detune

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(120, time + 2.5);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.08, time + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 3.0);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc1.start(time);
    osc2.start(time);

    osc1.stop(time + 3.1);
    osc2.stop(time + 3.1);
  }

  // Glistening harp chime triggered when user taps to make a flower bloom.
  // Notes scale up and pan according to tap position!
  playChimeArpeggio(worldX: number, worldY: number) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    // Stereo panning
    const panValue = Math.max(-1, Math.min(1, (worldX / window.innerWidth) * 2 - 1));
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    // Map vertical height to pitch (higher tap = higher pitch)
    const yRatio = 1 - Math.max(0, Math.min(1, worldY / window.innerHeight));
    const pentatonicScale = [195.99, 220.00, 246.94, 293.66, 329.63, 392.00, 440.00, 493.88, 587.33, 659.25, 783.99, 880.00, 987.77, 1174.66];
    
    // Choose base index and form a chords / arpeggio
    const baseIndex = Math.floor(yRatio * (pentatonicScale.length - 4));
    const notes = [
      pentatonicScale[baseIndex],
      pentatonicScale[baseIndex + 1],
      pentatonicScale[baseIndex + 2],
      pentatonicScale[baseIndex + 3],
    ];

    notes.forEach((freq, idx) => {
      const delay = idx * 0.06;
      this.playSingleChime(freq, delay, panner, panValue);
    });
  }

  playSingleChime(freq: number, delay: number, panner: StereoPannerNode | null, panValue: number) {
    if (!this.ctx || !this.masterGain) return;
    const time = this.ctx.currentTime + delay;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gainNode = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq, time);
    filter.Q.setValueAtTime(15, time);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.045, time + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 1.5);

    if (panner) {
      panner.pan.setValueAtTime(panValue, time);
      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(panner);
      panner.connect(this.masterGain);
    } else {
      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.masterGain);
    }

    osc.start(time);
    osc.stop(time + 1.6);
  }

  destroy() {
    if (this.sequencerTimer) clearTimeout(this.sequencerTimer);
    this.padOscs.forEach(osc => {
      try { osc.stop(); } catch(e) {}
    });
    if (this.ctx) this.ctx.close();
  }
}

// --- COLOR PALETTES FOR FLOWERS ---
const FLOWER_PALETTES = [
  {
    name: "pink",
    primary: "#EC4899", // Pink
    secondary: "#F472B6", // Soft Pink
    center: "#FDE047", // Yellow center
    glow: "rgba(236, 72, 153, 0.4)"
  },
  {
    name: "purple",
    primary: "#8B5CF6", // Purple
    secondary: "#A78BFA", // Lavender Light
    center: "#FCD34D", // Gold center
    glow: "rgba(139, 92, 246, 0.4)"
  },
  {
    name: "lavender",
    primary: "#7C3AED", // Violet
    secondary: "#C4B5FD", // Pale lavender
    center: "#34D399", // Emerald center
    glow: "rgba(124, 58, 237, 0.35)"
  },
  {
    name: "white",
    primary: "#F3F4F6", // Cool White
    secondary: "#FFFFFF", // Warm White
    center: "#F59E0B", // Amber center
    glow: "rgba(255, 255, 255, 0.45)"
  },
  {
    name: "soft-yellow",
    primary: "#F59E0B", // Amber
    secondary: "#FDE047", // Bright yellow
    center: "#EC4899", // Hot pink center
    glow: "rgba(245, 158, 11, 0.35)"
  }
];

const FLOWER_TYPES = ["rose", "tulip", "lotus", "tulip", "cosmos", "tulip", "orchid", "tulip", "rose", "tulip"] as const;

interface Leaf {
  side: -1 | 1;
  yRatio: number; // position along stem
  scale: number;
}

interface FlowerPoint {
  x: number;
  y: number;
}

interface Flower {
  id: string;
  x: number;
  y: number;
  rootX: number;
  rootY: number;
  type: typeof FLOWER_TYPES[number];
  color: typeof FLOWER_PALETTES[0];
  size: number;
  rotation: number;
  swayAmount: number;
  phase: number;
  stemProgress: number;
  bloomProgress: number;
  leaves: Leaf[];
  points: FlowerPoint[];
  parallaxFactor: number; // 0.4, 1.0, or 1.4 for deep 3D cinematic layout
}

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
  spin: number;
  spinSpeed: number;
  type: "sparkle" | "petal" | "pollen";
}

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  speed: number;
  color: string;
}

interface Butterfly {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  phase: number;
  flapSpeed: number;
  targetFlowerId: string | null;
  hoverTimer: number;
  state: "seeking" | "hovering";
}

const drawSunlightRays = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  intensity: number
) => {
  ctx.save();
  // Sun source in top right corner
  const sunX = width * 0.85;
  const sunY = -50;
  
  // Multiple wide transparent wedges
  const rayCount = 6;
  ctx.globalCompositeOperation = "screen";
  
  for (let i = 0; i < rayCount; i++) {
    const angleOffset = Math.sin(time * 0.0005 + i * 2.3) * 0.05;
    const baseAngle = Math.PI * 0.65 + (i * 0.08) + angleOffset;
    const widthAngle = 0.05 + Math.sin(time * 0.0003 + i * 1.5) * 0.01;
    
    const startAngle = baseAngle - widthAngle;
    const endAngle = baseAngle + widthAngle;
    
    // Draw ray as wedge
    const maxDist = Math.max(width, height) * 1.5;
    const x1 = sunX + Math.cos(startAngle) * maxDist;
    const y1 = sunY + Math.sin(startAngle) * maxDist;
    const x2 = sunX + Math.cos(endAngle) * maxDist;
    const y2 = sunY + Math.sin(endAngle) * maxDist;
    
    const grad = ctx.createRadialGradient(sunX, sunY, 100, sunX, sunY, maxDist);
    grad.addColorStop(0, `rgba(253, 224, 71, ${0.1 * intensity})`); // soft yellow
    grad.addColorStop(0.3, `rgba(236, 72, 153, ${0.05 * intensity})`); // soft pink
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(sunX, sunY);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const finalMessageRef = useRef<HTMLDivElement>(null);
  const progressContainerRef = useRef<HTMLDivElement>(null);

  const [flowerCount, setFlowerCount] = useState(0);
  const [gardenPhase, setGardenPhase] = useState<"Blooming" | "Elysium">("Blooming");
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.55);
  const [showFinalMessage, setShowFinalMessage] = useState(false);

  // Sound Engine Instance
  const audioEngine = useRef<SoundEngine | null>(null);

  // We keep animation variables in high-performance refs to run seamlessly inside 60FPS canvas loop
  const stateRef = useRef({
    flowers: [] as Flower[],
    particles: [] as Particle[],
    fireflies: [] as Firefly[],
    butterflies: [] as Butterfly[],
    camera: { x: 0, y: 0, scale: 1.0, targetScale: 1.0, targetY: 0, currentY: 0 },
    wind: { base: 0.15, current: 0.15, target: 0.15, time: 0 },
    bloomIntensity: 0.1,
    time: 0,
    width: window.innerWidth,
    height: window.innerHeight
  });

  // --- INITIALIZE SOUND ---
  const handleInteraction = () => {
    if (!audioEngine.current) {
      audioEngine.current = new SoundEngine();
    }
    audioEngine.current.init();
    audioEngine.current.setMuted(isMuted);
    audioEngine.current.setVolume(volume);
  };

  useEffect(() => {
    if (audioEngine.current) {
      audioEngine.current.setMuted(isMuted);
    }
  }, [isMuted]);

  useEffect(() => {
    if (audioEngine.current) {
      audioEngine.current.setVolume(volume);
    }
  }, [volume]);

  // Clean up audio
  useEffect(() => {
    return () => {
      if (audioEngine.current) {
        audioEngine.current.destroy();
      }
    };
  }, []);

  // --- GSAP REVEALS & SUBTITLE PULSING ---
  useEffect(() => {
    // Pulse landing subtitle
    gsap.fromTo(
      subtitleRef.current,
      { scale: 0.96, opacity: 0.75 },
      {
        scale: 1.04,
        opacity: 1,
        duration: 1.8,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut"
      }
    );

    // Fade in text elements at start
    gsap.fromTo(
      headingRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.6, ease: "power3.out" }
    );
  }, []);

  // --- MONITORS PROGRESSION TO TRIGGER LANDING/FINAL TEXT TRANSITIONS ---
  useEffect(() => {
    // Determine the phase
    if (flowerCount >= 100) {
      setGardenPhase("Elysium");
    } else {
      setGardenPhase("Blooming");
    }

    // Fade and instantly remove landing text when user starts growing garden
    if (flowerCount > 0 && headingRef.current && subtitleRef.current) {
      gsap.to([headingRef.current, subtitleRef.current], {
        opacity: 0,
        scale: 0.9,
        y: -30,
        filter: "blur(10px)",
        duration: 1.0,
        ease: "power3.inOut",
        pointerEvents: "none"
      });
    }

    // Trigger butterfly theme at 10 blooms — garden comes alive early!
    if (flowerCount === 10) {
      // Gentle wind begins & subtle bloom glow
      gsap.to(stateRef.current, {
        bloomIntensity: 0.4,
        duration: 4,
        ease: "power2.out"
      });
      stateRef.current.wind.target = 0.3;

      // First wave of butterflies & fireflies
      spawnButterflies(4);
      spawnFireflies(10);
    }

    // Intensify at 25 blooms — more butterflies join
    if (flowerCount === 25) {
      gsap.to(stateRef.current, {
        bloomIntensity: 0.6,
        duration: 5,
        ease: "power2.out"
      });
      stateRef.current.wind.target = 0.4;

      spawnButterflies(4);
      spawnFireflies(10);
    }

    // Trigger full enchantment at 50 flowers
    if (flowerCount === 50) {
      // Wind pick up, bloom lighting glow amplifies
      gsap.to(stateRef.current, {
        bloomIntensity: 0.8,
        duration: 6,
        ease: "power2.out"
      });
      stateRef.current.wind.target = 0.55;

      // Large wave of fireflies & butterflies
      spawnFireflies(25);
      spawnButterflies(8);
    }

    // Trigger full garden zoom-out and final surprise at 100 flowers
    if (flowerCount === 100) {
      gsap.to(stateRef.current.camera, {
        targetScale: 0.65,
        targetY: 90, // Pushes camera upwards to reveal lower, lush valley ground
        duration: 10,
        ease: "power2.inOut"
      });

      gsap.to(stateRef.current, {
        bloomIntensity: 1.4,
        duration: 10,
        ease: "power2.inOut"
      });

      stateRef.current.wind.target = 0.95;
      spawnFireflies(30);
      spawnButterflies(10);

      // Display final surprise
      setShowFinalMessage(true);
    }
  }, [flowerCount]);

  // Handle final surprise fade in
  useEffect(() => {
    if (showFinalMessage && finalMessageRef.current) {
      gsap.killTweensOf(finalMessageRef.current);
      // Animate the text in elegantly
      gsap.fromTo(
        finalMessageRef.current,
        { opacity: 0, scale: 0.95, filter: "blur(10px)" },
        { opacity: 1, scale: 1, filter: "blur(0px)", duration: 4.5, delay: 2.5, ease: "power3.out" }
      );
    }
  }, [showFinalMessage]);

  // --- SPAWNING FUNCTIONS (FIREFLIES & BUTTERFLIES) ---
  const spawnFireflies = (num: number) => {
    const { width, height, fireflies } = stateRef.current;
    for (let i = 0; i < num; i++) {
      fireflies.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        size: 1.5 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.04,
        color: Math.random() > 0.3 ? "#A78BFA" : "#34D399" // green/lavender
      });
    }
  };

  const spawnButterflies = (num: number) => {
    const { width, height, butterflies, flowers } = stateRef.current;
    const colors = ["#EC4899", "#8B5CF6", "#F59E0B", "#C4B5FD", "#38BDF8"];
    for (let i = 0; i < num; i++) {
      // Choose target flower if any exist
      let targetId: string | null = null;
      if (flowers.length > 0) {
        targetId = flowers[Math.floor(Math.random() * flowers.length)].id;
      }

      butterflies.push({
        id: Math.random().toString(),
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: 8 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2,
        flapSpeed: 0.15 + Math.random() * 0.1,
        targetFlowerId: targetId,
        hoverTimer: 0,
        state: targetId ? "seeking" : "seeking"
      });
    }
  };

  // Helper to generate S-Curve Bezier points for flower stem
  const getBezierPoints = (
    p0: FlowerPoint,
    p1: FlowerPoint,
    p2: FlowerPoint,
    p3: FlowerPoint,
    count = 60
  ): FlowerPoint[] => {
    const pts: FlowerPoint[] = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const mt = 1 - t;
      // Cubic Bezier interpolation formula
      const x = mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
      const y = mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
      pts.push({ x, y });
    }
    return pts;
  };

  // --- CLICK / TAP EVENT HANDLER ---
  const handleTap = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    // Resume sound engine on interaction
    handleInteraction();

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get client click coordinates
    let clickX = 0;
    let clickY = 0;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clickX = e.touches[0].clientX;
      clickY = e.touches[0].clientY;
    } else {
      clickX = e.clientX;
      clickY = e.clientY;
    }

    const { width, height, camera } = stateRef.current;

    // Reverse map coordinates back to "World Space" based on active camera translation & scale
    const cx = width / 2;
    const cy = height / 2;
    const worldX = (clickX - cx) / camera.scale + cx - camera.x;
    const worldY = (clickY - cy) / camera.scale + cy - camera.currentY;

    // Reject taps that are too high or too far outside of screen margins
    if (worldY < 50 || worldY > height + 200) return;

    createFlowerAt(worldX, worldY);
  };

  // --- CORE FLOWER CREATION (shared by tap and bloom button) ---
  const createFlowerAt = (worldX: number, worldY: number) => {
    const { height, flowers } = stateRef.current;

    // --- PREVENT OVERLAPPING UNNATURALLY ---
    // Look at existing flowers in proximity and gently nudge the tap coordinate if too crowded!
    let targetX = worldX;
    let targetY = worldY;
    let overlapping = true;
    let attempts = 0;

    while (overlapping && attempts < 15) {
      overlapping = false;
      for (const flower of flowers) {
        const dx = targetX - flower.x;
        const dy = targetY - flower.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 45) {
          overlapping = true;
          // Nudge position radially outward
          const angle = Math.random() * Math.PI * 2;
          targetX += Math.cos(angle) * 35;
          targetY += Math.sin(angle) * 35;
          break;
        }
      }
      attempts++;
    }

    // Set roots and stem endpoint curves
    // The roots anchor into a rolling ground hill (around canvas base)
    const rootY = height + 120;
    const rootX = targetX + (Math.random() - 0.5) * 80;

    // Build unique organic S-Curve handle offsets for stem
    const p0 = { x: rootX, y: rootY };
    const p3 = { x: targetX, y: targetY };
    const p1 = { x: rootX + (targetX - rootX) * 0.15 + (Math.random() - 0.5) * 50, y: rootY - (rootY - targetY) * 0.4 };
    const p2 = { x: targetX - (targetX - rootX) * 0.15 + (Math.random() - 0.5) * 50, y: targetY + (rootY - targetY) * 0.4 };

    const stemPoints = getBezierPoints(p0, p1, p2, p3, 60);

    // Randomize flower profile
    const type = FLOWER_TYPES[Math.floor(Math.random() * FLOWER_TYPES.length)];
    const color = FLOWER_PALETTES[Math.floor(Math.random() * FLOWER_PALETTES.length)];
    const size = 20 + Math.random() * 22;

    // Determine 3D cinematic depth layer (Back, Mid, Foreground)
    // 85% Midground, 10% Background (further away/smaller), 5% Foreground (large/blurry)
    const layerRoll = Math.random();
    let parallaxFactor = 1.0;
    let actualSize = size;
    if (layerRoll < 0.12) {
      parallaxFactor = 0.5; // Far away backdrop
      actualSize = size * 0.65;
    } else if (layerRoll > 0.94) {
      parallaxFactor = 1.35; // Foreground blade
      actualSize = size * 1.4;
    }

    // Sprout Leaves along the stem (typically 2 leaves at random heights)
    const leaves: Leaf[] = [
      { side: Math.random() > 0.5 ? 1 : -1, yRatio: 0.25 + Math.random() * 0.2, scale: 0 },
      { side: Math.random() > 0.5 ? 1 : -1, yRatio: 0.55 + Math.random() * 0.25, scale: 0 }
    ];

    const newFlower: Flower = {
      id: Math.random().toString(),
      x: targetX,
      y: targetY,
      rootX,
      rootY,
      type,
      color,
      size: actualSize,
      rotation: (Math.random() - 0.5) * 0.6,
      swayAmount: 0.35 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      stemProgress: 0,
      bloomProgress: 0,
      leaves,
      points: stemPoints,
      parallaxFactor
    };

    // Push new flower to state reference
    stateRef.current.flowers.push(newFlower);

    // Trigger GSAP tween for STEM growth
    // This drives stemProgress 0 -> 1 smoothly, then immediately initiates petal BLOOM.
    gsap.to(newFlower, {
      stemProgress: 1,
      duration: 1.2 + Math.random() * 1.0,
      ease: "power2.out",
      onComplete: () => {
        // Play glistening chiming harp arpeggio synced with tap world coordinate
        if (audioEngine.current) {
          audioEngine.current.playChimeArpeggio(targetX, targetY);
        }

        // Bloom petals & grow leaves naturally
        gsap.to(newFlower, {
          bloomProgress: 1,
          duration: 1.5 + Math.random() * 1.2,
          ease: "back.out(1.5)",
          onStart: () => {
            // Trigger beautiful particle blast right as petals burst open!
            createPetalBlast(targetX, targetY, color);
          }
        });

        newFlower.leaves.forEach(leaf => {
          gsap.to(leaf, {
            scale: 1,
            duration: 1.5 + Math.random() * 0.8,
            ease: "power3.out"
          });
        });
      }
    });

    // Sprout additional miniature background foliage occasionally for visual lush density
    if (Math.random() > 0.6) {
      setTimeout(() => {
        spawnExtraFoliage(targetX, targetY);
      }, 400);
    }

    // Update react counter
    setFlowerCount(prev => prev + 1);
  };

  // --- BLOOM BUTTON: Plant a flower at a pleasing random location ---
  const bloomRandomFlower = () => {
    handleInteraction();
    const { width, height } = stateRef.current;
    // Choose a natural spot across the lower 2/3 of the canvas with horizontal margins
    const worldX = width * 0.12 + Math.random() * (width * 0.76);
    const worldY = height * 0.32 + Math.random() * (height * 0.5);
    createFlowerAt(worldX, worldY);
  };

  // Spawns decorative extra visual foliage / tiny flowers nearby to enrich garden depth
  const spawnExtraFoliage = (baseX: number, baseY: number) => {
    const { flowers, height } = stateRef.current;
    const fX = baseX + (Math.random() - 0.5) * 120;
    const fY = baseY + (Math.random() - 0.5) * 60;
    
    // Safety boundaries
    if (fY < 100 || fY > height + 100) return;

    const rY = height + 120;
    const rX = fX + (Math.random() - 0.5) * 40;
    const stemPoints = getBezierPoints(
      { x: rX, y: rY },
      { x: rX + (fX - rX) * 0.1, y: rY - (rY - fY) * 0.4 },
      { x: fX - (fX - rX) * 0.1, y: fY + (rY - fY) * 0.4 },
      { x: fX, y: fY },
      50
    );

    const extra: Flower = {
      id: Math.random().toString(),
      x: fX,
      y: fY,
      rootX: rX,
      rootY: rY,
      type: FLOWER_TYPES[Math.floor(Math.random() * FLOWER_TYPES.length)],
      color: FLOWER_PALETTES[Math.floor(Math.random() * FLOWER_PALETTES.length)],
      size: 12 + Math.random() * 14,
      rotation: (Math.random() - 0.5) * 0.5,
      swayAmount: 0.2 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      stemProgress: 0,
      bloomProgress: 0,
      leaves: [{ side: 1, yRatio: 0.5, scale: 0 }],
      points: stemPoints,
      parallaxFactor: 0.45 // placed deep background
    };

    flowers.push(extra);

    gsap.to(extra, {
      stemProgress: 1,
      duration: 2.0,
      ease: "power1.out",
      onComplete: () => {
        gsap.to(extra, { bloomProgress: 1, duration: 1.8, ease: "power2.out" });
        gsap.to(extra.leaves[0], { scale: 1, duration: 1.2 });
      }
    });
  };

  // Creates the physical petal scattering & sparkly magic dust upon bloom
  const createPetalBlast = (x: number, y: number, color: typeof FLOWER_PALETTES[0]) => {
    const { particles } = stateRef.current;
    
    // Sparkles radiating in all directions
    const sparkleCount = 18 + Math.floor(Math.random() * 12);
    for (let i = 0; i < sparkleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4.5;
      const maxLife = 40 + Math.random() * 45;
      
      particles.push({
        id: Math.random().toString(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 1.5), // slight upward kick
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.3 ? "#FDE047" : "#FFFFFF", // sparkling gold or silver
        alpha: 1.0,
        life: maxLife,
        maxLife,
        gravity: 0.02,
        drag: 0.95,
        spin: Math.random() * Math.PI,
        spinSpeed: (Math.random() - 0.5) * 0.1,
        type: "sparkle"
      });
    }

    // Floating large petals drifting gently
    const petalCount = 8 + Math.floor(Math.random() * 6);
    for (let i = 0; i < petalCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.5;
      const maxLife = 80 + Math.random() * 100;

      particles.push({
        id: Math.random().toString(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.0,
        size: 5 + Math.random() * 6,
        color: Math.random() > 0.5 ? color.primary : color.secondary,
        alpha: 1.0,
        life: maxLife,
        maxLife,
        gravity: 0.03,
        drag: 0.96,
        spin: Math.random() * Math.PI,
        spinSpeed: (Math.random() - 0.5) * 0.06,
        type: "petal"
      });
    }
  };

  // --- RENDERING LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animFrameId: number;
    let lastTime = performance.now();

    // Responsive Resizer
    const resizeCanvas = () => {
      const parent = containerRef.current;
      if (!parent) return;
      
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      
      stateRef.current.width = width;
      stateRef.current.height = height;
      
      // Retina display handling
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Main Draw Function called every frame (60 FPS)
    const render = (timestamp: number) => {
      const dt = Math.min(50, timestamp - lastTime); // clamp dt to protect against huge frame skips
      lastTime = timestamp;
      
      const { width, height, flowers, particles, fireflies, butterflies, camera, wind, bloomIntensity } = stateRef.current;
      stateRef.current.time = timestamp;

      // --- PHYSICS UPDATES ---
      // Update camera smooth movement values
      camera.scale += (camera.targetScale - camera.scale) * 0.02; // camera zoom out
      camera.currentY += (camera.targetY - camera.currentY) * 0.02; // camera pan displacement
      
      // Cinematic slow-drifting panning (simulates delicate camera drift)
      camera.x = Math.sin(timestamp * 0.0003) * 22;
      camera.y = Math.cos(timestamp * 0.0002) * 14 + camera.currentY;

      // Update wind dynamics
      wind.current += (wind.target - wind.current) * 0.01;
      wind.time += 0.001 * dt;

      // 1. CLEAR CANVAS & DRAW DEEP SOLID BACKGROUND
      ctx.fillStyle = "#1E0B36";
      ctx.fillRect(0, 0, width, height);

      // Draw beautiful luxury radial color gradients on canvas (Light Blobs)
      // Blob 1: Deep Violet/Purple
      const blob1X = width * 0.2 + Math.sin(timestamp * 0.0002) * 100;
      const blob1Y = height * 0.3 + Math.cos(timestamp * 0.00015) * 80;
      const grad1 = ctx.createRadialGradient(blob1X, blob1Y, 50, blob1X, blob1Y, 450);
      grad1.addColorStop(0, "rgba(76, 29, 149, 0.45)"); // #4C1D95
      grad1.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      // Blob 2: Vibrant Purple
      const blob2X = width * 0.75 + Math.cos(timestamp * 0.0001) * 120;
      const blob2Y = height * 0.6 + Math.sin(timestamp * 0.00025) * 100;
      const grad2 = ctx.createRadialGradient(blob2X, blob2Y, 80, blob2X, blob2Y, 500);
      grad2.addColorStop(0, "rgba(109, 40, 217, 0.4)"); // #6D28D9
      grad2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // Blob 3: Vibrant Pink
      const blob3X = width * 0.45 + Math.sin(timestamp * 0.00018) * 150;
      const blob3Y = height * 0.8 + Math.cos(timestamp * 0.00012) * 100;
      const grad3 = ctx.createRadialGradient(blob3X, blob3Y, 100, blob3X, blob3Y, 400);
      grad3.addColorStop(0, "rgba(236, 72, 153, 0.28)"); // #EC4899
      grad3.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad3;
      ctx.fillRect(0, 0, width, height);

      // --- SUNLIGHT Shafts / Crepuscular Rays ---
      drawSunlightRays(ctx, width, height, timestamp, bloomIntensity);

      // --- BEGIN PARALLAX LAYER RENDERING ---
      // We partition flowers and elements into background, midground, and foreground lists.
      // Flowers are sorted from deep background (parallax = 0.5) to main (1.0) to foreground (1.35)
      // and within layers they are sorted by y coordinate so they overlap naturally!
      const sortedFlowers = [...flowers].sort((a, b) => {
        if (a.parallaxFactor !== b.parallaxFactor) {
          return a.parallaxFactor - b.parallaxFactor;
        }
        return a.y - b.y; // Standard Y sorting
      });

      // Render Parallax Layers
      const renderLayers = [0.5, 1.0, 1.35];

      renderLayers.forEach(layerParallax => {
        // --- DRAW HILLS (for specific layers) ---
        if (layerParallax === 0.5) {
          drawRollingHills(ctx, width, height, timestamp, 0.4, "#290c4a", height * 0.82, camera);
          drawRollingHills(ctx, width, height, timestamp, 0.7, "#1d0536", height * 0.88, camera);
        } else if (layerParallax === 1.0) {
          drawRollingHills(ctx, width, height, timestamp, 1.0, "#100121", height * 0.94, camera);
        }

        // Apply Camera Transformation Matrix
        ctx.save();
        // Set focal point to center, scale, then offset camera pan
        ctx.translate(width / 2, height / 2);
        ctx.scale(camera.scale, camera.scale);
        
        // Parallax scaling on cameras
        const camX = camera.x * layerParallax;
        const camY = camera.y * layerParallax;
        ctx.translate(-width / 2 + camX, -height / 2 + camY);

        // --- DRAW FLOWERS ON THIS LAYER ---
        const layerFlowers = sortedFlowers.filter(f => f.parallaxFactor === layerParallax);
        
        layerFlowers.forEach(flower => {
          // Dynamic wind sway based on global time, wind speed, and individual flower attributes
          const swayFreq = timestamp * 0.0018 + flower.phase;
          const swayAngle = Math.sin(swayFreq) * 0.07 * wind.current * flower.swayAmount;

          // 1. Draw Stem
          if (flower.stemProgress > 0) {
            const stemDrawCount = Math.floor(flower.stemProgress * (flower.points.length - 1));
            const stemWidth = Math.max(1.8, flower.size * 0.08);

            if (stemDrawCount > 0) {
              // Draw 3D Stem with dynamic shadows and highlights using gradients
              ctx.save();
              ctx.lineCap = "round";
              ctx.lineWidth = stemWidth;

              // Build precise path coordinate list with sway factored in
              const sPoints: FlowerPoint[] = [];
              for (let i = 0; i <= stemDrawCount; i++) {
                const pt = flower.points[i];
                const heightRatio = i / (flower.points.length - 1);
                const swayDisplacement = Math.sin(swayFreq + heightRatio) * 15 * wind.current * flower.swayAmount * heightRatio;
                sPoints.push({ x: pt.x + swayDisplacement, y: pt.y });
              }

              // Background Shadow Stem
              ctx.strokeStyle = "#1E2903"; // dark backdrop outline
              ctx.lineWidth = stemWidth + 1.2;
              ctx.beginPath();
              ctx.moveTo(sPoints[0].x, sPoints[0].y);
              for (let i = 1; i < sPoints.length; i++) {
                ctx.lineTo(sPoints[i].x, sPoints[i].y);
              }
              ctx.stroke();

              // Main green body stem
              ctx.strokeStyle = "#4D7C0F"; // organic green
              ctx.lineWidth = stemWidth;
              ctx.beginPath();
              ctx.moveTo(sPoints[0].x, sPoints[0].y);
              for (let i = 1; i < sPoints.length; i++) {
                ctx.lineTo(sPoints[i].x, sPoints[i].y);
              }
              ctx.stroke();

              // 3D Inner cylinder highlights
              ctx.strokeStyle = "#A3E635"; // light neon green highlight
              ctx.lineWidth = stemWidth * 0.35;
              ctx.beginPath();
              ctx.moveTo(sPoints[0].x - stemWidth * 0.15, sPoints[0].y);
              for (let i = 1; i < sPoints.length; i++) {
                ctx.lineTo(sPoints[i].x - stemWidth * 0.15, sPoints[i].y);
              }
              ctx.stroke();

              ctx.restore();
            }

            // 2. Draw Leaves along the stem
            flower.leaves.forEach(leaf => {
              const leafIndex = Math.floor(leaf.yRatio * (flower.points.length - 1));
              if (stemDrawCount >= leafIndex && leaf.scale > 0) {
                const leafBase = flower.points[leafIndex];
                const heightRatio = leafIndex / (flower.points.length - 1);
                const swayDisplacement = Math.sin(swayFreq + heightRatio) * 15 * wind.current * flower.swayAmount * heightRatio;

                ctx.save();
                ctx.translate(leafBase.x + swayDisplacement, leafBase.y);
                ctx.rotate((leaf.side * Math.PI / 4) + swayAngle);
                ctx.scale(leaf.scale * (flower.size * 0.012), leaf.scale * (flower.size * 0.012));

                // 3D shaded leaf with depth shadows
                const leafGrad = ctx.createLinearGradient(0, 0, 20 * leaf.side, -10);
                leafGrad.addColorStop(0, "#4D7C0F"); // Dark core shadow
                leafGrad.addColorStop(0.3, "#65A30D"); // Rich green
                leafGrad.addColorStop(0.85, "#A3E635"); // Light border
                leafGrad.addColorStop(1, "#F4FBF0"); // Highlight tip
                ctx.fillStyle = leafGrad;
                
                // Back leaf shadow outline
                ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
                ctx.shadowBlur = 4;

                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(15 * leaf.side, -15, 30 * leaf.side, 0);
                ctx.quadraticCurveTo(15 * leaf.side, 15, 0, 0);
                ctx.closePath();
                ctx.fill();

                // Leaf center rib vein
                ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(15 * leaf.side, -3, 28 * leaf.side, 0);
                ctx.stroke();

                ctx.restore();
              }
            });
          }

          // 3. Draw Flower Head (only if blooming started)
          if (flower.bloomProgress > 0) {
            const headIdx = flower.points.length - 1;
            const headBase = flower.points[headIdx];
            const swayDisplacement = Math.sin(swayFreq + 1.0) * 15 * wind.current * flower.swayAmount;

            ctx.save();
            // Align canvas coordinate to flower head center
            ctx.translate(headBase.x + swayDisplacement, headBase.y);
            ctx.rotate(swayAngle + flower.rotation);
            
            // Render glowing halo behind the flower head for extra magical bloom lighting
            const glowSize = flower.size * 1.5 * flower.bloomProgress;
            const radGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, glowSize);
            radGrad.addColorStop(0, flower.color.glow);
            radGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = radGrad;
            ctx.beginPath();
            ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
            ctx.fill();

            // Dynamic squash-and-stretch natural breathing scale (3D realistic animation vibe)
            const breathFreq = timestamp * 0.0016 + flower.phase;
            const breathScaleX = flower.bloomProgress * (1.0 + Math.sin(breathFreq) * 0.045);
            const breathScaleY = flower.bloomProgress * (1.0 + Math.cos(breathFreq + Math.PI / 2) * 0.03);
            ctx.scale(breathScaleX, breathScaleY);

            // Trigger beautiful procedural flower renderer based on style
            drawProceduralFlower(ctx, flower);

            ctx.restore();
          }
        });

        // --- DRAW PARTICLES ON THIS PARALLAX LAYER ---
        // Helps petals blend into appropriate visual depth!
        if (layerParallax === 1.0) {
          // Update and draw sparkles/petals particles
          for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= dt;
            if (p.life <= 0) {
              particles.splice(i, 1);
              continue;
            }

            // Physics step
            p.vx *= p.drag;
            p.vy *= p.drag;
            p.vy += p.gravity * dt;
            
            // Wind drift
            p.vx += wind.current * 0.08 * (Math.sin(timestamp * 0.002 + p.y * 0.01) + 1.2);

            p.x += p.vx * (dt * 0.06);
            p.y += p.vy * (dt * 0.06);
            p.spin += p.spinSpeed;
            p.alpha = Math.max(0, p.life / p.maxLife);

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.spin);
            ctx.globalAlpha = p.alpha;

            if (p.type === "sparkle") {
              // High gloss glowing diamond-like sparkles
              ctx.shadowColor = "#FDE047";
              ctx.shadowBlur = 8;
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.moveTo(0, -p.size);
              ctx.lineTo(p.size * 0.5, 0);
              ctx.lineTo(0, p.size);
              ctx.lineTo(-p.size * 0.5, 0);
              ctx.closePath();
              ctx.fill();
            } else if (p.type === "petal") {
              // Drifting rounded organic petal
              const grad = ctx.createLinearGradient(0, 0, p.size, p.size);
              grad.addColorStop(0, p.color);
              grad.addColorStop(1, "#F472B6");
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.quadraticCurveTo(-p.size, -p.size, 0, -p.size * 1.8);
              ctx.quadraticCurveTo(p.size, -p.size, 0, 0);
              ctx.closePath();
              ctx.fill();
            } else {
              // Pollen / generic glow particles
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.arc(0, 0, p.size, 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.restore();
          }

          // --- FIREFLIES UPDATE & RENDER ---
          fireflies.forEach(f => {
            // Apply slight organic motion
            f.vx += (Math.random() - 0.5) * 0.15;
            f.vy += (Math.random() - 0.5) * 0.15;
            
            // Dampen velocity to prevent runaway speed
            f.vx *= 0.95;
            f.vy *= 0.95;

            // Wind drift
            f.vx += wind.current * 0.04;

            f.x += f.vx;
            f.y += f.vy;

            // Screen borders wrap-around seamlessly
            if (f.x < -20) f.x = width + 10;
            if (f.x > width + 20) f.x = -10;
            if (f.y < -20) f.y = height + 10;
            if (f.y > height + 20) f.y = -10;

            // Flashing light glow animation
            const pulse = 0.35 + 0.65 * Math.sin(timestamp * f.speed + f.phase);
            
            ctx.save();
            ctx.globalAlpha = pulse;
            const glowGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * 3.5);
            glowGrad.addColorStop(0, f.color);
            glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.size * 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });

          // --- BUTTERFLIES UPDATE & RENDER (Target Seeking AI) ---
          butterflies.forEach(b => {
            if (flowers.length > 0) {
              // Find active flower target object
              let flowerTarget = flowers.find(f => f.id === b.targetFlowerId);

              // If no target flower or target was destroyed, select a new one
              if (!flowerTarget) {
                const bloomed = flowers.filter(f => f.bloomProgress > 0.8);
                if (bloomed.length > 0) {
                  flowerTarget = bloomed[Math.floor(Math.random() * bloomed.length)];
                  b.targetFlowerId = flowerTarget.id;
                  b.state = "seeking";
                }
              }

              if (flowerTarget) {
                const targetX = flowerTarget.x;
                const targetY = flowerTarget.y - flowerTarget.size * 0.2; // Hover slightly above flower head

                if (b.state === "seeking") {
                  // Direct heading with soft sway offsets
                  const dx = targetX - b.x;
                  const dy = targetY - b.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);

                  if (dist < 15) {
                    b.state = "hovering";
                    b.hoverTimer = timestamp + 2500 + Math.random() * 3500; // Hover duration
                  } else {
                    // Accelerate towards flower
                    b.vx += (dx / dist) * 0.15;
                    b.vy += (dy / dist) * 0.15;
                  }
                } else if (b.state === "hovering") {
                  // Gentle circular path around the target flower head
                  const hoverAngle = timestamp * 0.003 + b.phase;
                  const hoverTargetX = targetX + Math.sin(hoverAngle) * 12;
                  const hoverTargetY = targetY + Math.cos(hoverAngle * 0.5) * 8;

                  b.vx += (hoverTargetX - b.x) * 0.08;
                  b.vy += (hoverTargetY - b.y) * 0.08;

                  // Release glowing golden pollen trail during pollination!
                  if (Math.random() > 0.82) {
                    particles.push({
                      id: Math.random().toString(),
                      x: b.x,
                      y: b.y,
                      vx: (Math.random() - 0.5) * 0.4,
                      vy: Math.random() * 0.3 + 0.1,
                      size: 1 + Math.random() * 1.5,
                      color: "#FDE047", // yellow pollen dust
                      alpha: 0.9,
                      life: 30 + Math.random() * 30,
                      maxLife: 60,
                      gravity: 0.01,
                      drag: 0.98,
                      spin: 0,
                      spinSpeed: 0,
                      type: "pollen"
                    });
                  }

                  if (timestamp > b.hoverTimer) {
                    // Hover completed, seek a new flower next frame!
                    b.targetFlowerId = null;
                    b.state = "seeking";
                  }
                }
              }
            } else {
              // Roam screen boundaries randomly
              b.vx += (Math.random() - 0.5) * 0.3;
              b.vy += (Math.random() - 0.5) * 0.3;
            }

            // Wind drift
            b.vx += wind.current * 0.06;

            // Velocity clamping
            const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            const maxSpeed = b.state === "hovering" ? 1.5 : 3.5;
            if (speed > maxSpeed) {
              b.vx = (b.vx / speed) * maxSpeed;
              b.vy = (b.vy / speed) * maxSpeed;
            }

            b.x += b.vx;
            b.y += b.vy;

            // Boundary wrapping
            if (b.x < -30) b.x = width + 20;
            if (b.x > width + 30) b.x = -20;
            if (b.y < -30) b.y = height + 20;
            if (b.y > height + 30) b.y = -20;

            // Render butterfly wings
            // Width of wings fluctuates in a sine wave to emulate realistic 3D flapping motion!
            const flap = Math.abs(Math.sin(timestamp * b.flapSpeed + b.phase));
            const wingWidth = b.size * 0.8 * flap;
            const wingHeight = b.size * 1.2;

            ctx.save();
            ctx.translate(b.x, b.y);
            // Rotate facing velocity vector
            const angle = Math.atan2(b.vy, b.vx);
            ctx.rotate(angle + Math.PI / 2);

            // Left wing
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.ellipse(-wingWidth * 0.5, -wingHeight * 0.2, wingWidth * 0.5, wingHeight * 0.5, -Math.PI / 12, 0, Math.PI * 2);
            ctx.fill();

            // Right wing
            ctx.beginPath();
            ctx.ellipse(wingWidth * 0.5, -wingHeight * 0.2, wingWidth * 0.5, wingHeight * 0.5, Math.PI / 12, 0, Math.PI * 2);
            ctx.fill();

            // Tiny black body lines
            ctx.fillStyle = "#100121";
            ctx.beginPath();
            ctx.ellipse(0, 0, 1.5, b.size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          });
        }

        ctx.restore(); // Restore Camera Transformation matrix
      });

      // --- 15. FRONT SCREEN OVERLAY EFFECTS (VIGNETTE & SCREEN GLARE) ---
      // Cinematic subtle camera lens bloom vignette frame
      const centerGrad = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.75);
      centerGrad.addColorStop(0, "rgba(0,0,0,0)");
      centerGrad.addColorStop(0.7, "rgba(26, 4, 54, 0.25)");
      centerGrad.addColorStop(1, "rgba(10, 1, 22, 0.72)"); // #100121
      ctx.fillStyle = centerGrad;
      ctx.fillRect(0, 0, width, height);

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    // Cleanups
    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  // --- DRAW ROLLING GROUND HILLS (DENSE PARALLAX DEPTH) ---
  const drawRollingHills = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    speed: number,
    color: string,
    yOffset: number,
    camera: any
  ) => {
    ctx.save();
    
    // Apply camera scale and pan factor
    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.scale, camera.scale);
    ctx.translate(-width / 2 + camera.x * speed, -height / 2 + camera.y * speed);

    ctx.fillStyle = color;
    ctx.beginPath();
    
    // Left boundary start point
    const step = 25;
    const padding = 150;
    ctx.moveTo(-padding, height + padding);

    // Compute hill curves using periodic wave functions
    for (let x = -padding; x <= width + padding; x += step) {
      const waveFreq1 = x * 0.0018 + time * 0.00003;
      const waveFreq2 = x * 0.004 + time * 0.00007;
      const wave = Math.sin(waveFreq1) * 38 + Math.cos(waveFreq2) * 14;
      ctx.lineTo(x, yOffset + wave);
    }

    ctx.lineTo(width + padding, height + padding);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // --- ULTRA-REALISTIC PROCEDURAL FLOWER RENDERING ENGINE ---
  const drawProceduralFlower = (ctx: CanvasRenderingContext2D, flower: Flower) => {
    const size = flower.size;
    const col = flower.color;
    const bloom = flower.bloomProgress;

    switch (flower.type) {
      case "rose": {
        // Ultra-realistic layered rose with organic structure
        const layerCount = 7;
        
        for (let l = layerCount; l >= 1; l--) {
          const progressMultiplier = Math.min(1.0, bloom * (1.15 - l * 0.12));
          if (progressMultiplier <= 0) continue;

          ctx.save();
          const layerSize = size * (l / layerCount) * progressMultiplier;
          ctx.rotate((l * Math.PI) / 5.5);

          // More petals in outer layers for realistic rose structure
          const petalCount = 4 + (layerCount - l) * 1.5;
          
          for (let p = 0; p < petalCount; p++) {
            const angle = (p * Math.PI * 2) / petalCount;
            const yOffset = (Math.random() - 0.5) * layerSize * 0.15; // Natural offset
            
            // Realistic rose petal with curves
            ctx.save();
            ctx.rotate(angle);
            
            // Multi-stop gradient for realistic depth
            const petalGrad = ctx.createLinearGradient(0, 0, 0, -layerSize);
            petalGrad.addColorStop(0, col.primary);
            petalGrad.addColorStop(0.3, col.secondary);
            petalGrad.addColorStop(0.7, col.primary);
            petalGrad.addColorStop(1, "#FFFFFF");
            ctx.fillStyle = petalGrad;
            
            // Organic curved petal shape
            ctx.beginPath();
            ctx.moveTo(0, yOffset);
            ctx.bezierCurveTo(
              -layerSize * 0.35, -layerSize * 0.25,
              -layerSize * 0.45, -layerSize * 0.7,
              -layerSize * 0.25, -layerSize * 0.95
            );
            ctx.bezierCurveTo(
              0, -layerSize * 0.8,
              layerSize * 0.25, -layerSize * 0.95,
              layerSize * 0.45, -layerSize * 0.7
            );
            ctx.bezierCurveTo(
              layerSize * 0.35, -layerSize * 0.25,
              0, yOffset,
              0, yOffset
            );
            ctx.closePath();
            ctx.fill();
            
            // Petal veins
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 - l * 0.03})`;
            ctx.lineWidth = 0.8;
            for (let v = 0; v < 3; v++) {
              const offsetX = (v - 1) * layerSize * 0.12;
              ctx.beginPath();
              ctx.moveTo(offsetX, yOffset);
              ctx.quadraticCurveTo(
                offsetX - layerSize * 0.1, -layerSize * 0.5,
                offsetX + (Math.random() - 0.5) * layerSize * 0.15, -layerSize * 0.95
              );
              ctx.stroke();
            }
            
            ctx.restore();
          }
          ctx.restore();
        }

        // Realistic rose center (carpel + stamens)
        const centerSize = size * 0.2 * bloom;
        const centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, centerSize);
        centerGrad.addColorStop(0, "#FFFFFF");
        centerGrad.addColorStop(0.4, col.center);
        centerGrad.addColorStop(1, "#8B4513"); // dark brown edge
        ctx.fillStyle = centerGrad;
        ctx.beginPath();
        ctx.arc(0, 0, centerSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Stamen details
        ctx.fillStyle = "#FDE047";
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI * 2) / 8;
          const radius = centerSize * 0.6;
          ctx.beginPath();
          ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case "lotus": {
        // Ultra-realistic sacred lotus with layered pointed petals
        const layerCount = 4;
        
        for (let l = layerCount; l >= 1; l--) {
          const progressMultiplier = Math.min(1.0, bloom * (1.25 - l * 0.15));
          if (progressMultiplier <= 0) continue;

          ctx.save();
          const layerSize = size * (1.0 - (l - 1) * 0.18) * progressMultiplier;
          ctx.rotate((l * Math.PI) / 3.5);

          const petalCount = 8;
          for (let p = 0; p < petalCount; p++) {
            const angle = (p * Math.PI * 2) / petalCount;
            ctx.save();
            ctx.rotate(angle);

            // Realistic lotus petal with natural curve and surface texture
            const petalGrad = ctx.createLinearGradient(0, 0, 0, -layerSize);
            petalGrad.addColorStop(0, col.primary);
            petalGrad.addColorStop(0.35, col.secondary);
            petalGrad.addColorStop(0.75, col.primary);
            petalGrad.addColorStop(1, "#F5F5DC"); // off-white translucent tip

            ctx.fillStyle = petalGrad;
            ctx.beginPath();
            // Pointed lotus petal with elegant curves
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(
              -layerSize * 0.25, -layerSize * 0.2,
              -layerSize * 0.3, -layerSize * 0.65,
              -layerSize * 0.15, -layerSize * 0.98
            );
            ctx.bezierCurveTo(
              0, -layerSize * 0.88,
              layerSize * 0.15, -layerSize * 0.98,
              layerSize * 0.3, -layerSize * 0.65
            );
            ctx.bezierCurveTo(
              layerSize * 0.25, -layerSize * 0.2,
              0, 0,
              0, 0
            );
            ctx.closePath();
            ctx.fill();

            // Ultra-fine vein structure
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * (1 - l / layerCount)})`;
            ctx.lineWidth = 0.5;
            for (let v = -2; v <= 2; v++) {
              const startX = v * layerSize * 0.08;
              ctx.beginPath();
              ctx.moveTo(startX, 0);
              ctx.quadraticCurveTo(
                startX - layerSize * 0.08, -layerSize * 0.5,
                startX + (Math.sin(v) * layerSize * 0.1), -layerSize * 0.95
              );
              ctx.stroke();
            }

            // Subtle shadow on petal edge
            ctx.strokeStyle = `rgba(0, 0, 0, ${0.1 * (1 - l / layerCount)})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(
              layerSize * 0.25, -layerSize * 0.2,
              layerSize * 0.3, -layerSize * 0.65,
              layerSize * 0.15, -layerSize * 0.98
            );
            ctx.stroke();

            ctx.restore();
          }
          ctx.restore();
        }

        // Realistic lotus seed pod (receptacle) center
        ctx.save();
        const podSize = size * 0.24 * bloom;
        const podGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, podSize);
        podGrad.addColorStop(0, "#F4D03F");
        podGrad.addColorStop(0.4, col.center);
        podGrad.addColorStop(1, "#8B7500");
        ctx.fillStyle = podGrad;
        ctx.beginPath();
        ctx.arc(0, 0, podSize, 0, Math.PI * 2);
        ctx.fill();

        // Seed pod holes (characteristic of lotus)
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        for (let i = 0; i < 12; i++) {
          const angle = (i * Math.PI * 2) / 12;
          const radius = podSize * 0.65;
          ctx.beginPath();
          ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, podSize * 0.12, 0, Math.PI * 2);
          ctx.fill();
        }

        // Stamens radiating from pod
        for (let s = 0; s < 12; s++) {
          const angle = (s * Math.PI * 2) / 12;
          const stamenX = Math.cos(angle) * podSize * 0.8;
          const stamenY = Math.sin(angle) * podSize * 0.8;
          
          ctx.strokeStyle = "#FDE047";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(stamenX * 1.4, stamenY * 1.4);
          ctx.stroke();

          // Pollen anther at stamen tip
          ctx.fillStyle = "#FFEB3B";
          ctx.beginPath();
          ctx.arc(stamenX * 1.4, stamenY * 1.4, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.restore();
        break;
      }

      case "cosmos": {
        // Ultra-realistic delicate cosmos with fine detailed petals
        const petalCount = 12;
        ctx.save();
        
        for (let p = 0; p < petalCount; p++) {
          const angle = (p * Math.PI * 2) / petalCount;
          const petalLength = size * 0.95;
          const petalWidth = size * 0.14;
          
          ctx.save();
          ctx.rotate(angle);

          // Multi-stop gradient for realistic light interaction
          const petalGrad = ctx.createLinearGradient(0, 0, 0, -petalLength);
          petalGrad.addColorStop(0, col.primary);
          petalGrad.addColorStop(0.15, col.secondary);
          petalGrad.addColorStop(0.6, col.primary);
          petalGrad.addColorStop(0.85, col.secondary);
          petalGrad.addColorStop(1, "#FFFACD"); // pale cream at tip

          ctx.fillStyle = petalGrad;
          
          // Organic wavy petal shape for cosmos delicacy
          ctx.beginPath();
          ctx.moveTo(-petalWidth / 2, 0);
          
          // Left edge with slight wave
          for (let i = 0; i <= petalLength; i += petalLength / 10) {
            const waveX = Math.sin((i / petalLength) * Math.PI * 4) * (petalWidth * 0.1);
            ctx.lineTo(-petalWidth / 2 + waveX, i);
          }
          
          // Pointed tip
          ctx.lineTo(0, petalLength + 2);
          
          // Right edge with opposite wave
          for (let i = petalLength; i >= 0; i -= petalLength / 10) {
            const waveX = Math.sin((i / petalLength) * Math.PI * 4 + Math.PI) * (petalWidth * 0.1);
            ctx.lineTo(petalWidth / 2 + waveX, i);
          }
          
          ctx.closePath();
          ctx.fill();

          // Fine vein texture detail
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 * bloom})`;
          ctx.lineWidth = 0.5;
          for (let v = 0; v < 3; v++) {
            const offsetX = (v - 1) * petalWidth * 0.25;
            ctx.beginPath();
            ctx.moveTo(offsetX, 0);
            ctx.quadraticCurveTo(
              offsetX - petalWidth * 0.08, petalLength / 2,
              offsetX + (Math.sin(v) * petalWidth * 0.05), petalLength * 0.95
            );
            ctx.stroke();
          }

          // Subtle edge highlight
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * bloom})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(-petalWidth / 2, 0);
          for (let i = 0; i <= petalLength; i += petalLength / 8) {
            const waveX = Math.sin((i / petalLength) * Math.PI * 4) * (petalWidth * 0.1);
            ctx.lineTo(-petalWidth / 2 + waveX, i);
          }
          ctx.stroke();

          ctx.restore();
        }

        // Realistic cosmos center disk (disk florets)
        const centerSize = size * 0.28 * bloom;
        const diskGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, centerSize);
        diskGrad.addColorStop(0, "#FFFACD"); // cream center
        diskGrad.addColorStop(0.3, col.center); // golden middle
        diskGrad.addColorStop(1, "#B8860B"); // dark golden edge

        ctx.fillStyle = diskGrad;
        ctx.beginPath();
        ctx.arc(0, 0, centerSize, 0, Math.PI * 2);
        ctx.fill();

        // Disk floret texture (tiny flowers in the disk)
        ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * centerSize * 0.8;
          ctx.beginPath();
          ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Subtle shadow ring
        ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, centerSize * 1.05, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
        break;
      }

      case "tulip": {
        // Ultra-realistic botanical tulip with natural cup structure
        ctx.save();

        // 1. Inner Shadow Backdrop Sepal
        ctx.save();
        const backGrad = ctx.createLinearGradient(0, 0, 0, -size * 0.88);
        backGrad.addColorStop(0, "rgba(0, 0, 0, 0.3)");
        backGrad.addColorStop(0.5, col.primary);
        backGrad.addColorStop(1, col.primary);
        ctx.fillStyle = backGrad;
        ctx.beginPath();
        ctx.moveTo(-size * 0.16, 0);
        ctx.bezierCurveTo(-size * 0.25, -size * 0.35, -size * 0.22, -size * 0.75, 0, -size * 0.88);
        ctx.bezierCurveTo(size * 0.22, -size * 0.75, size * 0.25, -size * 0.35, size * 0.16, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // 2. Central Reproductive Organs (Stamen & Pistil)
        ctx.save();
        ctx.translate(0, -size * 0.2);
        
        // Central pistil (female organ)
        const pistilGrad = ctx.createLinearGradient(0, -size * 0.08, 0, size * 0.08);
        pistilGrad.addColorStop(0, "#A3E635");
        pistilGrad.addColorStop(1, "#4D7C0F");
        ctx.fillStyle = pistilGrad;
        ctx.beginPath();
        ctx.moveTo(-size * 0.04, 0);
        ctx.quadraticCurveTo(-size * 0.05, -size * 0.12, 0, -size * 0.18);
        ctx.quadraticCurveTo(size * 0.05, -size * 0.12, size * 0.04, 0);
        ctx.closePath();
        ctx.fill();

        // Stigma (pollen receptor) at pistil tip
        ctx.fillStyle = "#F4D03F";
        ctx.beginPath();
        ctx.arc(0, -size * 0.18, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Three stamens radiating (male organs)
        for (let i = 0; i < 3; i++) {
          const angle = (i * Math.PI * 2 / 3) - Math.PI / 2;
          const stamenX = Math.cos(angle) * size * 0.08;
          const stamenY = Math.sin(angle) * size * 0.08;

          // Filament (stamen stalk)
          ctx.strokeStyle = "#84CC16";
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(stamenX, stamenY);
          ctx.lineTo(stamenX * 1.6, stamenY * 1.6 - size * 0.05);
          ctx.stroke();

          // Anther (pollen sac)
          ctx.fillStyle = "#FDE047";
          ctx.beginPath();
          ctx.arc(stamenX * 1.6, stamenY * 1.6 - size * 0.05, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // 3. Left Petal (Back right from observer view)
        ctx.save();
        ctx.rotate(-0.12);
        const leftPetalGrad = ctx.createLinearGradient(-size * 0.2, 0, -size * 0.35, -size * 0.92);
        leftPetalGrad.addColorStop(0, col.primary);
        leftPetalGrad.addColorStop(0.25, col.secondary);
        leftPetalGrad.addColorStop(0.65, col.primary);
        leftPetalGrad.addColorStop(1, "#FFFACD");
        ctx.fillStyle = leftPetalGrad;
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          -size * 0.45, -size * 0.25,
          -size * 0.5, -size * 0.6,
          -size * 0.3, -size * 0.95
        );
        ctx.bezierCurveTo(
          -size * 0.1, -size * 0.75,
          0, 0,
          0, 0
        );
        ctx.closePath();
        ctx.fill();

        // Left petal veining (prominent characteristic)
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * bloom})`;
        ctx.lineWidth = 0.7;
        for (let v = -1; v <= 1; v++) {
          const offsetX = v * size * 0.1;
          ctx.beginPath();
          ctx.moveTo(offsetX, 0);
          ctx.quadraticCurveTo(offsetX - size * 0.12, -size * 0.5, offsetX - size * 0.15, -size * 0.88);
          ctx.stroke();
        }

        // Left petal edge shadow
        ctx.strokeStyle = `rgba(0, 0, 0, ${0.12 * bloom})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-size * 0.45, -size * 0.25, -size * 0.5, -size * 0.6, -size * 0.3, -size * 0.95);
        ctx.stroke();
        ctx.restore();

        // 4. Right Petal
        ctx.save();
        ctx.rotate(0.12);
        const rightPetalGrad = ctx.createLinearGradient(size * 0.2, 0, size * 0.35, -size * 0.92);
        rightPetalGrad.addColorStop(0, col.primary);
        rightPetalGrad.addColorStop(0.25, col.secondary);
        rightPetalGrad.addColorStop(0.65, col.primary);
        rightPetalGrad.addColorStop(1, "#FFFACD");
        ctx.fillStyle = rightPetalGrad;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          size * 0.45, -size * 0.25,
          size * 0.5, -size * 0.6,
          size * 0.3, -size * 0.95
        );
        ctx.bezierCurveTo(
          size * 0.1, -size * 0.75,
          0, 0,
          0, 0
        );
        ctx.closePath();
        ctx.fill();

        // Right petal veining
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * bloom})`;
        ctx.lineWidth = 0.7;
        for (let v = -1; v <= 1; v++) {
          const offsetX = v * size * 0.1;
          ctx.beginPath();
          ctx.moveTo(offsetX, 0);
          ctx.quadraticCurveTo(offsetX + size * 0.12, -size * 0.5, offsetX + size * 0.15, -size * 0.88);
          ctx.stroke();
        }

        // Right petal edge shadow
        ctx.strokeStyle = `rgba(0, 0, 0, ${0.12 * bloom})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(size * 0.45, -size * 0.25, size * 0.5, -size * 0.6, size * 0.3, -size * 0.95);
        ctx.stroke();
        ctx.restore();

        // 5. Center Front-Facing Petal (most prominent)
        ctx.save();
        const centerPetalGrad = ctx.createLinearGradient(0, 0, 0, -size * 0.92);
        centerPetalGrad.addColorStop(0, col.primary);
        centerPetalGrad.addColorStop(0.35, col.secondary);
        centerPetalGrad.addColorStop(0.7, col.primary);
        centerPetalGrad.addColorStop(1, "#FFFFFF");
        ctx.fillStyle = centerPetalGrad;

        ctx.beginPath();
        ctx.moveTo(-size * 0.18, 0);
        ctx.bezierCurveTo(
          -size * 0.3, -size * 0.3,
          -size * 0.28, -size * 0.68,
          0, -size * 0.92
        );
        ctx.bezierCurveTo(
          size * 0.28, -size * 0.68,
          size * 0.3, -size * 0.3,
          size * 0.18, 0
        );
        ctx.closePath();
        ctx.fill();

        // Center petal detailed veining (main attraction)
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * bloom})`;
        ctx.lineWidth = 0.6;
        for (let v = -2; v <= 2; v++) {
          const offsetX = v * size * 0.08;
          ctx.beginPath();
          ctx.moveTo(offsetX, 0);
          ctx.quadraticCurveTo(
            offsetX + (Math.sin(v) * size * 0.05), -size * 0.45,
            offsetX + (Math.sin(v * 0.5) * size * 0.08), -size * 0.88
          );
          ctx.stroke();
        }

        // Glossy highlight on center petal
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 * bloom})`;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(-size * 0.1, -size * 0.1);
        ctx.quadraticCurveTo(0, -size * 0.35, 0, -size * 0.7);
        ctx.stroke();

        ctx.restore();
        ctx.restore();
        break;
      }

      case "orchid": {
        // Highly asymmetrical premium structural orchid
        ctx.save();

        // 1. Three outer narrow sepals pointing at 120-degree angles
        for (let s = 0; s < 3; s++) {
          ctx.save();
          ctx.rotate((s * Math.PI * 2) / 3);

          const sepalSize = size * 0.85;
          const sGrad = ctx.createLinearGradient(0, 0, 0, -sepalSize);
          sGrad.addColorStop(0, col.primary);
          sGrad.addColorStop(1, "rgba(255, 255, 255, 0.45)"); // translucent sepals
          ctx.fillStyle = sGrad;

          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(-sepalSize * 0.18, -sepalSize * 0.4, 0, -sepalSize);
          ctx.quadraticCurveTo(sepalSize * 0.18, -sepalSize * 0.4, 0, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // 2. Two broad, horizontal upper wings
        const wingSize = size * 0.75;
        const wingWidth = size * 0.55;
        const wGrad = ctx.createLinearGradient(0, 0, 0, -wingSize);
        wGrad.addColorStop(0, col.primary);
        wGrad.addColorStop(0.85, col.secondary);
        wGrad.addColorStop(1, col.center);
        ctx.fillStyle = wGrad;

        // Left wing
        ctx.save();
        ctx.rotate(-Math.PI * 0.32);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-wingWidth, -wingSize * 0.3, -wingWidth, -wingSize, 0, -wingSize);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Right wing
        ctx.save();
        ctx.rotate(Math.PI * 0.32);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(wingWidth, -wingSize * 0.3, wingWidth, -wingSize, 0, -wingSize);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // 3. One vibrant lower crown / lip
        ctx.save();
        ctx.translate(0, size * 0.25);
        const lipSize = size * 0.6;
        const lipGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, lipSize);
        lipGrad.addColorStop(0, "#F59E0B"); // Gold
        lipGrad.addColorStop(0.55, "#EC4899"); // Vibrant Pink
        lipGrad.addColorStop(1, "#7C3AED"); // Deep purple margins
        ctx.fillStyle = lipGrad;
        ctx.beginPath();
        ctx.moveTo(0, -lipSize * 0.2);
        ctx.bezierCurveTo(-lipSize * 0.75, lipSize * 0.1, -lipSize * 0.4, lipSize * 0.9, 0, lipSize);
        ctx.bezierCurveTo(lipSize * 0.4, lipSize * 0.9, lipSize * 0.75, lipSize * 0.1, 0, -lipSize * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Small yellow column right in the core
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = col.center;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.07, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        break;
      }
    }
  };

  // Resets the entire garden state with dynamic petal burst transitions
  const pruneGarden = () => {
    // Generate massive particle burst on clear
    const { flowers, particles } = stateRef.current;
    
    flowers.forEach(f => {
      createPetalBlast(f.x, f.y, f.color);
    });

    // Clear list
    stateRef.current.flowers = [];
    stateRef.current.particles = particles.slice(0, 50); // retain a few flying sparkles
    stateRef.current.butterflies = [];
    stateRef.current.fireflies = [];
    setFlowerCount(0);
    setShowFinalMessage(false);

    // Reset Camera
    gsap.to(stateRef.current.camera, {
      targetScale: 1.0,
      targetY: 0,
      duration: 3,
      ease: "power2.out"
    });

    gsap.to(stateRef.current, {
      bloomIntensity: 0.1,
      duration: 3,
      ease: "power2.out"
    });

    stateRef.current.wind.target = 0.15;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden select-none bg-[#110426] touch-none cursor-pointer"
      onClick={handleTap}
      onTouchStart={handleTap}
    >
      {/* 60 FPS Core Graphics Renderer */}
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      {/* --- ULTRA-PREMIUM LUXURY UI SUITE --- */}

      {/* 1. ELEGANT TOP NAVIGATION BAR */}
      <header className="absolute top-0 inset-x-0 h-20 flex items-center justify-between px-8 pointer-events-none z-50">
        {/* Left: Premium Logo/Brand */}
        <div className="flex items-center gap-3 pointer-events-auto group">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 rounded-xl blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative bg-[#110426] rounded-xl p-2.5">
              <Flower className="w-6 h-6 text-pink-400" />
            </div>
          </div>
          <span className="text-sm font-light tracking-widest text-white uppercase hidden sm:inline opacity-0 group-hover:opacity-100 transition duration-300">Aura Garden</span>
        </div>

        {/* Center: Bloom Counter Badge */}
        {flowerCount > 0 && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 backdrop-blur-xl rounded-full pointer-events-auto">
            <div className="relative flex h-2 w-2">
              <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></div>
              <div className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></div>
            </div>
            <span className="text-xs font-light tracking-widest text-pink-100 uppercase">
              {gardenPhase === "Elysium" ? "✨ Elysium" : `${flowerCount} Blooms`}
            </span>
          </div>
        )}

        {/* Right: Audio Controls */}
        <div 
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-4 pointer-events-auto"
        >
          {/* Mute Button */}
          <button
            onClick={() => {
              handleInteraction();
              setIsMuted(!isMuted);
            }}
            className="group relative p-2.5 text-purple-300 hover:text-white transition-all duration-300"
            title={isMuted ? "Unmute garden" : "Mute garden"}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur opacity-0 group-hover:opacity-20 transition duration-300"></div>
            <div className="relative">
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </div>
          </button>

          {/* Volume Slider */}
          <div className="relative hidden md:flex items-center gap-2.5 px-4 py-2.5 bg-white/5 border border-white/10 backdrop-blur-xl rounded-full">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => {
                handleInteraction();
                setVolume(parseFloat(e.target.value));
              }}
              className="w-24 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg appearance-none cursor-pointer accent-pink-500 focus:outline-none"
              title="Adjust volume"
            />
          </div>

        </div>
      </header>

      {/* 2. BOTTOM CENTER ACTION BUTTONS */}
      <div 
        ref={progressContainerRef}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-10 inset-x-0 flex items-center justify-center gap-4 px-6 pointer-events-none z-40"
      >
        {/* Bloom Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            bloomRandomFlower();
          }}
          className="group relative flex items-center gap-2.5 px-7 py-4 rounded-full pointer-events-auto overflow-hidden transition-all duration-300 active:scale-95"
          title="Make a flower bloom"
        >
          {/* Gradient glow background */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 opacity-90 group-hover:opacity-100 transition duration-300"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 blur-lg opacity-50 group-hover:opacity-80 transition duration-300"></div>
          <div className="relative flex items-center gap-2.5">
            <Flower className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-500" />
            <span className="text-sm font-medium tracking-widest text-white uppercase">Bloom</span>
          </div>
        </button>

        {/* Clear Garden Button */}
        {flowerCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              pruneGarden();
            }}
            className="group relative flex items-center gap-2.5 px-7 py-4 rounded-full pointer-events-auto border border-white/20 hover:border-pink-400/60 bg-white/5 hover:bg-white/10 backdrop-blur-xl transition-all duration-300 active:scale-95"
            title="Clear the garden"
          >
            <div className="relative flex items-center gap-2.5">
              <RotateCcw className="w-5 h-5 text-purple-200 group-hover:text-white group-hover:rotate-180 transition-all duration-500" />
              <span className="text-sm font-medium tracking-widest text-purple-200 group-hover:text-white uppercase transition-colors duration-300">Clear</span>
            </div>
          </button>
        )}
      </div>

      {/* 3. PREMIUM LANDING TEXT OVERLAY */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none z-20 select-none">
        <div className="max-w-3xl">
          <h1
            ref={headingRef}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-purple-200 to-purple-400 opacity-0 leading-none select-none"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Every Flower Awaits Your Touch
          </h1>
          <p
            ref={subtitleRef}
            className="mt-6 text-base sm:text-lg md:text-xl font-light tracking-widest text-purple-200 opacity-0 select-none uppercase"
          >
            🌸 Tap to Bloom 🌸
          </p>
        </div>
      </div>

      {/* 4. ELYSIUM FINAL REVEAL */}
      {showFinalMessage && (
        <div
          ref={finalMessageRef}
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none z-30 select-none opacity-0 backdrop-blur-sm"
        >
          <div className="max-w-4xl">
            <h2 
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-pink-200 to-pink-400 leading-none select-none"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              All For You ❤️
            </h2>
            <p className="mt-6 text-base sm:text-lg md:text-xl font-light tracking-widest text-purple-200 select-none uppercase">
              Every bloom began with your touch
            </p>
          </div>
        </div>
      )}

      {/* 5. AMBIENT HINTS (Desktop Only) */}
      <div className="absolute top-32 right-8 hidden lg:flex flex-col items-end gap-2 text-xs font-light text-purple-300/60 pointer-events-none z-30 select-none">
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 animate-pulse" />
          <span>Garden responds to wind</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span>Camera drifts gently</span>
        </div>
      </div>
    </div>
  );
}
