/** Pure geometry for the welcome hero (unit coordinates; components scale them to the screen). */

const STAR_POINTS = 5;
const STAR_INNER_RATIO = 0.5;
/** The logo star leans slightly, like the brand artwork. */
const STAR_TILT_DEG = -8;

/** Rounded-looking 5-point star of outer radius 1 centred on the origin (round the corners with a same-colour stroke). */
export const STAR_PATH = (() => {
  const tilt = (STAR_TILT_DEG * Math.PI) / 180;
  const points = Array.from({ length: STAR_POINTS * 2 }, (_, i) => {
    const radius = i % 2 === 0 ? 1 : STAR_INNER_RATIO;
    const angle = -Math.PI / 2 + tilt + (i * Math.PI) / STAR_POINTS;
    return `${(radius * Math.cos(angle)).toFixed(4)},${(radius * Math.sin(angle)).toFixed(4)}`;
  });
  return `M${points.join('L')}Z`;
})();

/** Jagged diagonal that splits the star into its yellow (left) and cyan (right) halves. */
const SPLIT = '0.38,-1.4 0.06,-0.3 0.3,-0.12 -0.3,1.4';
export const YELLOW_HALF = `${SPLIT} -2,1.4 -2,-1.4`;
export const CYAN_HALF = `${SPLIT} 2,1.4 2,-1.4`;

export interface OrbitPoint {
  x: number;
  y: number;
}

/** Position on the flattened orbit; `angle` 0 is right, +π/2 is the front (bottom) of the ring. */
export const orbitPoint = (angle: number, rx: number, ry: number): OrbitPoint => ({
  x: rx * Math.cos(angle),
  y: ry * Math.sin(angle),
});

/** 0 at the back of the ring, 1 at the front — drives scale, brightness and stacking order. */
export const depthOf = (angle: number) => (Math.sin(angle) + 1) / 2;

/** Ramanujan's approximation; the ring uses it to draw itself with a dash offset. */
export const ellipsePerimeter = (rx: number, ry: number) =>
  Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));

/** Where each orbiting icon starts: chat top-left, ticket top-right, cap bottom-right, photo bottom-left. */
export const ICON_START_ANGLES = [
  (5 * Math.PI) / 4,
  (7 * Math.PI) / 4,
  Math.PI / 4,
  (3 * Math.PI) / 4,
] as const;
