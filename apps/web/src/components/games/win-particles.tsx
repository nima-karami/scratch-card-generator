import { useCallback, useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import type { Container, ISourceOptions } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";
import { loadImageShape } from "@tsparticles/shape-image";
import { loadEmittersPlugin } from "@tsparticles/plugin-emitters";
import { loadEmittersShapeSquare } from "@tsparticles/plugin-emitters-shape-square";

export interface WinParticlesProps {
  spriteSheetUrl: string;
  cols: number;
  rows: number;
  particleCount?: number;
  className?: string;
}

interface SlicedImage {
  src: string;
  width: number;
  height: number;
}

const MAX_PARTICLES = 36;

let engineReady = false;
let enginePromise: Promise<void> | null = null;

function ensureEngine(): Promise<void> {
  if (engineReady) return Promise.resolve();
  if (!enginePromise) {
    enginePromise = initParticlesEngine(async (engine) => {
      await loadSlim(engine);
      await loadImageShape(engine);
      await loadEmittersPlugin(engine);
      await loadEmittersShapeSquare(engine);
    }).then(() => {
      engineReady = true;
    });
  }
  return enginePromise;
}

async function sliceSpritesheet(url: string, cols: number, rows: number): Promise<SlicedImage[]> {
  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load particle spritesheet"));
    img.src = url;
  });

  if (!img.naturalWidth || !img.naturalHeight) return [];

  const cellW = img.naturalWidth / cols;
  const cellH = img.naturalHeight / rows;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  canvas.width = cellW;
  canvas.height = cellH;

  const results: SlicedImage[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.clearRect(0, 0, cellW, cellH);
      ctx.drawImage(img, c * cellW, r * cellH, cellW, cellH, 0, 0, cellW, cellH);
      results.push({ src: canvas.toDataURL("image/png"), width: cellW, height: cellH });
    }
  }
  return results;
}

export function WinParticles({
  spriteSheetUrl,
  cols,
  rows,
  particleCount = MAX_PARTICLES,
  className = "",
}: WinParticlesProps) {
  const [ready, setReady] = useState(false);
  const [images, setImages] = useState<SlicedImage[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([ensureEngine(), sliceSpritesheet(spriteSheetUrl, cols, rows)])
      .then(([, sliced]) => {
        if (!cancelled) {
          setImages(sliced);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setImages(null);
      });

    return () => {
      cancelled = true;
    };
  }, [spriteSheetUrl, cols, rows]);

  const handleLoaded = useCallback(async (_container?: Container) => {
    /* no-op */
  }, []);

  const limit = Math.max(10, particleCount);

  const options: ISourceOptions = useMemo(() => {
    if (!images || images.length === 0) return {} as ISourceOptions;

    return {
      fullScreen: { enable: false },
      fpsLimit: 45,
      detectRetina: true,
      background: { color: "transparent" },
      particles: {
        number: {
          value: 0,
          limit: { value: 0 }, // 0 means no limit. outModes "out" handles cleanup
        },
        shape: {
          type: "image",
          options: {
            image: images.map((img) => ({
              src: img.src,
              width: img.width,
              height: img.height,
              replaceColor: false,
            })),
          },
        },
        size: {
          value: { min: 10, max: 24 },
          animation: {
            enable: true,
            speed: 1.2,
            minimumValue: 8,
            sync: false,
          },
        },
        opacity: {
          value: { min: 0.45, max: 0.9 },
          animation: {
            enable: true,
            speed: 0.5,
            minimumValue: 0.25,
            sync: false,
          },
        },
        move: {
          enable: true,
          direction: "bottom" as const,
          speed: { min: 1, max: 3 },
          random: false,
          straight: false,
          outModes: {
            default: "destroy" as const,
            top: "none" as const, // Don't destroy particles when they are just spawning above the screen
          },
          drift: { min: -0.5, max: 0.5 },
          gravity: {
            enable: false,
          },
        },
        rotate: {
          value: { min: 0, max: 360 },
          direction: "random" as const,
          animation: {
            enable: true,
            speed: 15, // Leaf tumbling speed
          },
        },
        wobble: {
          enable: true,
          distance: { min: 20, max: 50 }, // Wider swing
          speed: { min: -2, max: 2 }, // Slower sway speed
        },
        tilt: {
          value: { min: 0, max: 360 },
          direction: "random",
          enable: true,
          animation: {
            enable: true,
            speed: 8,
          },
        },
      },
      emitters: [
        {
          autoPlay: true,
          fill: true,
          startCount: 0,
          life: {
            count: 0,
            wait: false,
          },
          shape: {
            type: "square", // Emit in a rectangle along the top edge
          },
          direction: "bottom" as const,
          rate: {
            delay: 0.25, // Adjusted to prevent hitting particle limit too quickly
            quantity: 1,
          },
          size: {
            width: 100, // 100% of the screen width
            height: 0,
            mode: "percent",
          },
          position: {
            x: 50, // Centered horizontally
            y: -5, // Start slightly above the top edge
          },
        },
      ],
    };
  }, [images, limit]);

  if (!ready || !images || images.length === 0) {
    return null;
  }

  return (
    <div
      className={className}
      style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit" }}
    >
      <Particles
        id="win-particles"
        particlesLoaded={handleLoaded}
        options={options}
        className="absolute inset-0 w-full h-full rounded-inherit pointer-events-none"
      />
    </div>
  );
}
