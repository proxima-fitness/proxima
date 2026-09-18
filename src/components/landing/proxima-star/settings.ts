/**
 * @module proxima-star/settings
 * Camera, disk, bloom, and starfield uniforms for the adapted Optimized Black Hole pipeline.
 * Depends on: nothing. Used by: renderer.ts, pipeline.ts.
 */

export interface IDiskLook {
  brightness: number;
  speed: number;
  stretch: number;
  detail: number;
  turbulence: number;
  density: number;
  doppler: number;
  cloudScale: number;
  cloudSpeed: number;
  cloudStrength: number;
  spare0: number;
  spare1: number;
  spare2: number;
  spare3: number;
}

export interface IStarLook {
  brightness: number;
  density: number;
  contrast: number;
  warmth: number;
  twinkle: number;
}

export interface IBloomLook {
  strength: number;
  threshold: number;
  knee: number;
  radius: number;
}

export interface IHeroSettings {
  cameraY: number;
  distance: number;
  diskRadius: number;
  fov: number;
  centerX: number;
  centerY: number;
  cameraRoll: number;
  mouseYaw: number;
  centerFade: number;
  bloom: IBloomLook;
  disk: IDiskLook;
  stars: IStarLook;
}

/** Shared deterministic production defaults for the browser and headless renderer. */
export function defaultHeroSettings(): IHeroSettings {
  return {
    cameraY: 0.14,
    distance: 22,
    diskRadius: 6.6,
    fov: 2.15,
    centerX: 0.78,
    centerY: 0.62,
    cameraRoll: -0.2,
    mouseYaw: 0.12,
    centerFade: 1,
    bloom: { strength: 1.18, threshold: 0, knee: 0.16, radius: 1.45 },
    disk: {
      brightness: 0.88,
      speed: 0.42,
      stretch: 4.8,
      detail: 3.44,
      turbulence: 3.6,
      density: 1.22,
      doppler: 0.38,
      cloudScale: 20,
      cloudSpeed: 0.22,
      cloudStrength: 0.16,
      spare0: 0.43,
      spare1: -0.25,
      spare2: -0.67,
      spare3: 0.69,
    },
    stars: { brightness: 1.08, density: 1, contrast: 13, warmth: 0.72, twinkle: 0.32 },
  };
}
