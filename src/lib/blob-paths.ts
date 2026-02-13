/**
 * Blob animation configs — 8-point keyframe arrays with prime-number durations.
 * When x cycles at 29s and y at 37s, the combined path doesn't visually repeat
 * for ~18 minutes. Color is handled reactively by AnimatedBlob (maps x → hue).
 */

interface PropertyConfig {
  values: number[];
  duration: number;
}

export interface BlobConfig {
  x: PropertyConfig;
  y: PropertyConfig;
  scale: PropertyConfig;
}

// ── Landing page blobs ──

export const landingPrimary: BlobConfig = {
  x: { values: [0, 45, -20, 60, -35, 25, -50, 0], duration: 29 },
  y: { values: [0, -30, 40, -15, 50, -40, 20, 0], duration: 37 },
  scale: { values: [1, 1.06, 0.96, 1.04, 0.97, 1.05, 0.98, 1], duration: 23 },
};

export const landingSecondary: BlobConfig = {
  x: { values: [0, -35, 50, -25, 40, -45, 20, 0], duration: 31 },
  y: { values: [0, 35, -20, 45, -30, 15, -40, 0], duration: 41 },
  scale: { values: [1, 0.97, 1.05, 0.96, 1.04, 0.98, 1.03, 1], duration: 19 },
};

export const landingAccent: BlobConfig = {
  x: { values: [0, 20, -15, 25, -20, 15, -10, 0], duration: 23 },
  y: { values: [0, -15, 25, -20, 30, -10, 20, 0], duration: 29 },
  scale: { values: [1, 1.04, 0.97, 1.03, 0.98, 1.02, 0.99, 1], duration: 17 },
};

// ── Services page blobs ──

export const servicesPrimary: BlobConfig = {
  x: { values: [0, 35, -25, 45, -30, 20, -40, 0], duration: 37 },
  y: { values: [0, -25, 35, -20, 40, -30, 15, 0], duration: 29 },
  scale: { values: [1, 1.04, 0.97, 1.05, 0.96, 1.03, 0.98, 1], duration: 23 },
};

export const servicesSecondary: BlobConfig = {
  x: { values: [0, -30, 40, -20, 35, -40, 25, 0], duration: 31 },
  y: { values: [0, 25, -30, 40, -20, 30, -35, 0], duration: 43 },
  scale: { values: [1, 0.98, 1.04, 0.97, 1.03, 0.98, 1.05, 1], duration: 19 },
};

// ── About page blobs ──

export const aboutPrimary: BlobConfig = {
  x: { values: [0, 40, -30, 50, -25, 35, -45, 0], duration: 29 },
  y: { values: [0, -35, 30, -20, 45, -25, 15, 0], duration: 37 },
  scale: { values: [1, 1.05, 0.97, 1.04, 0.96, 1.03, 0.99, 1], duration: 23 },
};

export const aboutSecondary: BlobConfig = {
  x: { values: [0, -40, 30, -25, 45, -35, 20, 0], duration: 41 },
  y: { values: [0, 30, -25, 35, -15, 40, -30, 0], duration: 31 },
  scale: { values: [1, 0.97, 1.04, 0.98, 1.05, 0.96, 1.03, 1], duration: 19 },
};

// ── Contact page blobs ──

export const contactPrimary: BlobConfig = {
  x: { values: [0, 25, -20, 30, -15, 20, -25, 0], duration: 31 },
  y: { values: [0, -20, 15, -25, 20, -10, 15, 0], duration: 37 },
  scale: { values: [1, 1.03, 0.98, 1.04, 0.97, 1.02, 0.99, 1], duration: 23 },
};

export const contactSecondary: BlobConfig = {
  x: { values: [0, -20, 15, -25, 20, -15, 10, 0], duration: 37 },
  y: { values: [0, 15, -20, 10, -15, 25, -10, 0], duration: 29 },
  scale: { values: [1, 0.98, 1.03, 0.97, 1.04, 0.99, 1.02, 1], duration: 19 },
};

export const contactAccentRight: BlobConfig = {
  x: { values: [0, -25, 12, -20, 15, -10, 8, 0], duration: 29 },
  y: { values: [0, -12, 20, -8, 15, -18, 10, 0], duration: 41 },
  scale: { values: [1, 1.05, 0.97, 1.03, 0.98, 1.04, 0.99, 1], duration: 17 },
};

export const contactAccentSmall: BlobConfig = {
  x: { values: [0, 15, -18, 20, -12, 10, -15, 0], duration: 23 },
  y: { values: [0, 15, -10, 18, -8, 12, -14, 0], duration: 31 },
  scale: { values: [1, 0.97, 1.04, 0.98, 1.03, 0.99, 1.02, 1], duration: 29 },
};
