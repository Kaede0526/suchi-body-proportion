import { describe, expect, it } from 'vitest';
import { buildGeometry, calculateMetrics } from './anthropometry';
import { DEFAULT_INPUT } from './reference';
import type { BodyInput } from './types';

const makeInput = (overrides: Partial<BodyInput> = {}): BodyInput => ({
  ...DEFAULT_INPUT,
  ...overrides,
});

describe('calculateMetrics', () => {
  it('calculates BMI from height and weight', () => {
    const metrics = calculateMetrics(
      makeInput({ height: 160, weight: 51.2 }),
    );
    expect(metrics.bmi).toBe(20);
    expect(metrics.bmiLabel).toBe('正常范围');
  });

  it('uses Chinese BMI categories', () => {
    expect(
      calculateMetrics(makeInput({ height: 160, weight: 45 })).bmiLabel,
    ).toBe('偏低');
    expect(
      calculateMetrics(makeInput({ height: 160, weight: 64 })).bmiLabel,
    ).toBe('超重');
    expect(
      calculateMetrics(makeInput({ height: 160, weight: 75 })).bmiLabel,
    ).toBe('肥胖');
  });

  it('locks measured circumferences instead of estimates', () => {
    const metrics = calculateMetrics(
      makeInput({
        bust: 92,
        waist: 68,
        hip: 96,
        shoulder: 40,
        thigh: 56,
        calf: 35,
        arm: 28,
        wrist: 16,
      }),
    );
    expect(metrics.bust).toBe(92);
    expect(metrics.waist).toBe(68);
    expect(metrics.hip).toBe(96);
    expect(metrics.shoulder).toBe(40);
    expect(metrics.sources.bust).toBe('input');
  });

  it('never allows a measured underbust greater than the bust', () => {
    const metrics = calculateMetrics(
      makeInput({ bust: 80, underbust: 90 }),
    );
    expect(metrics.underbust).toBeLessThan(metrics.bust);
  });

  it('changes girths when a life state is selected', () => {
    const daily = calculateMetrics(makeInput({ lifeState: 'daily' }));
    const period = calculateMetrics(makeInput({ lifeState: 'period' }));
    expect(period.waist).toBeGreaterThan(daily.waist);
    expect(period.stateDelta.waist).toBeGreaterThan(0);
  });

  it('estimates body fat when no measured value is given', () => {
    const metrics = calculateMetrics(makeInput({ bodyFat: null }));
    expect(metrics.bodyFatSource).toBe('estimate');
    expect(metrics.bodyFat).toBeGreaterThan(15);
    expect(metrics.bodyFat).toBeLessThan(40);
  });

  it('uses a self-reported body fat value without changing girths', () => {
    const base = calculateMetrics(makeInput({ bodyFat: null }));
    const measured = calculateMetrics(makeInput({ bodyFat: 22.4 }));
    expect(measured.bodyFat).toBe(22.4);
    expect(measured.bodyFatSource).toBe('input');
    expect(measured.bust).toBe(base.bust);
    expect(measured.waist).toBe(base.waist);
    expect(measured.hip).toBe(base.hip);
  });

  it('keeps percentile values inside the display range', () => {
    const metrics = calculateMetrics(makeInput());
    for (const result of Object.values(metrics.percentiles)) {
      expect(result.percentile).toBeGreaterThanOrEqual(1);
      expect(result.percentile).toBeLessThanOrEqual(99);
    }
  });

  it('returns a body shape and a leg ratio in a plausible range', () => {
    const metrics = calculateMetrics(makeInput());
    expect(['X', 'A', 'H', 'Y', 'O']).toContain(metrics.shape);
    expect(metrics.legRatio).toBeGreaterThan(0.4);
    expect(metrics.legRatio).toBeLessThan(0.56);
  });
});

describe('buildGeometry', () => {
  it('keeps landmarks ordered from floor to head', () => {
    const metrics = calculateMetrics(makeInput());
    const geometry = buildGeometry(metrics);
    const { landmarks } = geometry;
    expect(landmarks.crotch).toBeLessThan(landmarks.hip);
    expect(landmarks.hip).toBeLessThan(landmarks.waist);
    expect(landmarks.waist).toBeLessThan(landmarks.bust);
    expect(landmarks.bust).toBeLessThan(landmarks.shoulder);
    expect(landmarks.shoulder).toBeLessThan(landmarks.neck);
    expect(landmarks.neck).toBeLessThan(landmarks.chin);
    expect(landmarks.chin).toBeLessThan(landmarks.headCenter);
    expect(landmarks.headCenter).toBeLessThanOrEqual(1);
  });

  it('produces a positive and ordered silhouette', () => {
    const metrics = calculateMetrics(makeInput());
    const geometry = buildGeometry(metrics);
    expect(geometry.half.waist).toBeLessThan(geometry.half.hip);
    expect(geometry.half.waist).toBeLessThan(geometry.half.bust);
    expect(geometry.half.neck).toBeGreaterThan(2);
    expect(geometry.limbs.thighRadius).toBeGreaterThan(
      geometry.limbs.calfRadius,
    );
    expect(geometry.limbs.calfRadius).toBeGreaterThan(
      geometry.limbs.ankleRadius,
    );
  });

  it('moves the hip line when the measured leg length changes', () => {
    const short = buildGeometry(
      calculateMetrics(
        makeInput({ height: 170, legLength: 75, proportion: 'auto' }),
      ),
    );
    const long = buildGeometry(
      calculateMetrics(
        makeInput({ height: 170, legLength: 88, proportion: 'auto' }),
      ),
    );
    expect(long.legRatio).toBeGreaterThan(short.legRatio);
    expect(long.landmarks.hip).toBeGreaterThan(short.landmarks.hip);
  });
});
