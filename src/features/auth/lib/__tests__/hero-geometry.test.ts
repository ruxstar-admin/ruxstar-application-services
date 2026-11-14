import { depthOf, ellipsePerimeter, ICON_START_ANGLES, orbitPoint, STAR_PATH } from '../hero-geometry';

describe('hero geometry', () => {
  it('builds a closed 10-vertex star path', () => {
    expect(STAR_PATH.startsWith('M')).toBe(true);
    expect(STAR_PATH.endsWith('Z')).toBe(true);
    expect(STAR_PATH.split('L')).toHaveLength(10);
  });

  it('places orbit points on the flattened ellipse', () => {
    const { x, y } = orbitPoint(Math.PI / 2, 100, 30);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(30);
  });

  it('puts the front of the ring at depth 1 and the back at 0', () => {
    expect(depthOf(Math.PI / 2)).toBeCloseTo(1);
    expect(depthOf(-Math.PI / 2)).toBeCloseTo(0);
  });

  it('matches the circle perimeter when the ellipse is round', () => {
    expect(ellipsePerimeter(10, 10)).toBeCloseTo(2 * Math.PI * 10, 5);
  });

  it('starts the four icons at distinct quarter turns', () => {
    expect(new Set(ICON_START_ANGLES.map((a) => a.toFixed(3))).size).toBe(4);
  });
});
