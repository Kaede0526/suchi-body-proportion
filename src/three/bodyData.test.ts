import { describe, expect, it } from 'vitest';
import { BODY_META } from './bodyData';

describe('anatomical body asset', () => {
  it('contains the baked MakeHuman base mesh', () => {
    expect(BODY_META.vertexCount).toBeGreaterThan(14000);
    expect(BODY_META.indexCount).toBeGreaterThan(79000);
    expect(BODY_META.baseHeight).toBeGreaterThan(1.5);
    expect(BODY_META.baseHeight).toBeLessThan(1.7);
  });

  it('keeps the curated morph set and fitting gains', () => {
    const names = Object.keys(BODY_META.gains);
    expect(names).toContain('bustBigger');
    expect(names).toContain('waistWider');
    expect(names).toContain('hipsCircWider');
    expect(names.length).toBeGreaterThanOrEqual(20);
    expect(BODY_META.gains.waistWider.waist).toBeGreaterThan(5);
  });

  it('records torso baseline measurements in centimetres', () => {
    expect(BODY_META.baseMeasures.bust).toBeGreaterThan(70);
    expect(BODY_META.baseMeasures.waist).toBeGreaterThan(55);
    expect(BODY_META.baseMeasures.hip).toBeGreaterThan(80);
  });
});
