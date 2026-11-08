import {
  ACTIVITY_EFFECT,
  FAT_EFFECT,
  FRAME_FACTOR,
  POPULATION_SD,
  PROPORTIONS,
  REFERENCE,
  SHAPE_COPY,
  STATE_EFFECT,
} from './reference';
import type {
  BodyGeometry,
  BodyInput,
  BodyMetrics,
  BodyShapeKey,
  MeasurementKey,
  PercentileResult,
  SourceKind,
} from './types';

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round1 = (value: number) => Math.round(value * 10) / 10;

function normalCdf(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z >= 0 ? 1 - p : p;
}

export function toPercentile(value: number, mean: number, sd: number) {
  const p = normalCdf((value - mean) / Math.max(sd, 0.1)) * 100;
  return clamp(Math.round(p), 1, 99);
}

function percentile(
  value: number,
  mean: number,
  sd: number,
  label: string,
): PercentileResult {
  return {
    value,
    mean,
    sd,
    percentile: toPercentile(value, mean, sd),
    label,
  };
}

export function heightMeanForAge(age: number) {
  const points: [number, number][] = [
    [18, 160.6],
    [24, 160.6],
    [30, 159.1],
    [35, 158.6],
    [40, 158.2],
    [45, 157.8],
    [50, 157.4],
    [55, 157.0],
    [60, 156.7],
  ];
  if (age <= points[0][0]) return points[0][1];
  if (age >= points[points.length - 1][0]) {
    return points[points.length - 1][1];
  }
  for (let i = 1; i < points.length; i += 1) {
    const [aAge, aHeight] = points[i - 1];
    const [bAge, bHeight] = points[i];
    if (age <= bAge) {
      const t = (age - aAge) / (bAge - aAge);
      return aHeight + (bHeight - aHeight) * t;
    }
  }
  return 158;
}

export function weightMeanForAge(age: number) {
  const points: [number, number][] = [
    [18, 56.5],
    [24, 57.5],
    [30, 58.7],
    [35, 60.0],
    [40, 61.0],
    [45, 61.5],
    [50, 61.8],
    [60, 61.2],
  ];
  if (age <= points[0][0]) return points[0][1];
  if (age >= points[points.length - 1][0]) {
    return points[points.length - 1][1];
  }
  for (let i = 1; i < points.length; i += 1) {
    const [aAge, aWeight] = points[i - 1];
    const [bAge, bWeight] = points[i];
    if (age <= bAge) {
      const t = (age - aAge) / (bAge - aAge);
      return aWeight + (bWeight - aWeight) * t;
    }
  }
  return 59;
}

function classifyBmi(bmi: number): {
  label: string;
  tone: BodyMetrics['bmiTone'];
} {
  if (bmi < 18.5) return { label: '偏低', tone: 'low' };
  if (bmi < 24) return { label: '正常范围', tone: 'normal' };
  if (bmi < 28) return { label: '超重', tone: 'high' };
  return { label: '肥胖', tone: 'very-high' };
}

function estimateShape(metrics: {
  bust: number;
  waist: number;
  hip: number;
  shoulder: number;
}): BodyShapeKey {
  const { bust, waist, hip, shoulder } = metrics;
  const bustHipDiff = bust - hip;
  const shoulderHipDiff = shoulder - hip;

  if (waist >= hip - 3.5) return 'O';
  if (hip - bust >= 5.5) return 'A';
  if (bustHipDiff >= 5 || shoulderHipDiff >= 8) return 'Y';
  if (bust - waist >= 16 && hip - waist >= 16 && Math.abs(bustHipDiff) < 5.5) {
    return 'X';
  }
  return 'H';
}

function makeSources(input: BodyInput): Record<MeasurementKey, SourceKind> {
  const keys: MeasurementKey[] = [
    'bust',
    'underbust',
    'waist',
    'hip',
    'shoulder',
    'thigh',
    'calf',
    'arm',
    'wrist',
  ];
  return keys.reduce(
    (acc, key) => {
      acc[key] = input[key] !== null ? 'input' : 'estimate';
      return acc;
    },
    {} as Record<MeasurementKey, SourceKind>,
  );
}

export function calculateMetrics(input: BodyInput): BodyMetrics {
  const h = clamp(input.height, 135, 200);
  const w = clamp(input.weight, 35, 150);
  const age = clamp(input.age, 18, 60);
  const bmi = w / (h / 100) ** 2;
  const frame = FRAME_FACTOR[input.frame];
  const heightFactor = (h / REFERENCE.height) ** 0.72;
  const weightFactor = w / REFERENCE.weight;
  const ageDelta = age - 30;
  const effectScale = clamp((bmi - 16) / 8, 0.25, 1.45);

  let bust =
    REFERENCE.bust *
    heightFactor *
    weightFactor ** 0.3 *
    (1 + clamp(ageDelta, -12, 30) * 0.0004);
  let underbust =
    REFERENCE.underbust *
    heightFactor *
    weightFactor ** 0.25 *
    (1 + frame * 0.006);
  let waist =
    REFERENCE.waist *
    heightFactor *
    weightFactor ** 0.52 *
    (1 + clamp(ageDelta, -12, 30) * 0.0018) *
    (0.995 + frame * 0.004);
  let hip =
    REFERENCE.hip *
    heightFactor *
    weightFactor ** 0.35 *
    (1 + clamp(ageDelta, -12, 30) * 0.0007);
  let shoulder =
    REFERENCE.shoulder *
    (h / REFERENCE.height) ** 0.8 *
    weightFactor ** 0.1 *
    frame;
  let thigh =
    REFERENCE.thigh *
    heightFactor *
    weightFactor ** 0.3 *
    (0.985 + frame * 0.012);
  let calf =
    REFERENCE.calf *
    heightFactor *
    weightFactor ** 0.18 *
    (0.98 + frame * 0.016);
  let arm =
    REFERENCE.arm *
    heightFactor *
    weightFactor ** 0.2 *
    (0.97 + frame * 0.024);
  let wrist =
    REFERENCE.wrist * (h / REFERENCE.height) ** 0.6 * frame * 0.55 +
    REFERENCE.wrist * 0.45;

  const activity = ACTIVITY_EFFECT[input.activity];
  const fat = FAT_EFFECT[input.fat];
  waist += (activity.waist + fat.waist) * effectScale;
  hip += (activity.hip + fat.hip) * effectScale;
  bust += fat.bust * effectScale;
  thigh += (activity.thigh + fat.thigh) * effectScale;
  shoulder += activity.shoulder * effectScale;
  arm += activity.arm * effectScale;

  const measurementKeys: MeasurementKey[] = [
    'bust',
    'underbust',
    'waist',
    'hip',
    'shoulder',
    'thigh',
    'calf',
    'arm',
    'wrist',
  ];
  for (const key of measurementKeys) {
    const value = input[key];
    if (value !== null && Number.isFinite(value)) {
      if (key === 'bust') bust = value;
      if (key === 'underbust') underbust = value;
      if (key === 'waist') waist = value;
      if (key === 'hip') hip = value;
      if (key === 'shoulder') shoulder = value;
      if (key === 'thigh') thigh = value;
      if (key === 'calf') calf = value;
      if (key === 'arm') arm = value;
      if (key === 'wrist') wrist = value;
    }
  }

  const state = STATE_EFFECT[input.lifeState];
  waist += state.waist * effectScale;
  hip += state.hip * effectScale;
  bust += state.bust * effectScale;

  bust = clamp(bust, 68, 135);
  underbust = clamp(underbust, 58, 120);
  waist = clamp(waist, 52, 140);
  hip = clamp(hip, 70, 148);
  shoulder = clamp(shoulder, 30, 52);
  thigh = clamp(thigh, 38, 86);
  calf = clamp(calf, 24, 54);
  arm = clamp(arm, 18, 46);
  wrist = clamp(wrist, 11, 23);

  if (underbust >= bust) {
    underbust = Math.max(58, bust - 6);
  }

  const headHeight = clamp(
    input.headHeight ?? REFERENCE.headHeight * (h / REFERENCE.height),
    16,
    28,
  );

  const proportionalRatio =
    PROPORTIONS.find((item) => item.value === input.proportion)?.ratio ?? 0.475;
  const legLength = clamp(
    input.legLength ?? proportionalRatio * h,
    h * 0.41,
    h * 0.56,
  );
  const legRatio = legLength / h;
  const shape = estimateShape({ bust, waist, hip, shoulder });
  const shapeCopy = SHAPE_COPY[shape];
  const bmiClass = classifyBmi(bmi);
  const estimatedBodyFat = clamp(
    1.2 * bmi + 0.23 * age - 5.4,
    8,
    55,
  );
  const bodyFat =
    input.bodyFat !== null
      ? clamp(input.bodyFat, 5, 60)
      : estimatedBodyFat;
  const bodyFatSource: 'input' | 'estimate' =
    input.bodyFat !== null ? 'input' : 'estimate';

  const heightMean = heightMeanForAge(age);
  const weightMean = weightMeanForAge(age);
  const girthHeightFactor = (h / REFERENCE.height) ** 0.7;

  const percentiles = {
    height: percentile(
      h,
      heightMean,
      POPULATION_SD.height,
      '同年龄段成年女性',
    ),
    weight: percentile(
      w,
      weightMean,
      POPULATION_SD.weight,
      '同年龄段成年女性',
    ),
    bmi: percentile(bmi, 23.6, POPULATION_SD.bmi, '全国成年女性估算'),
    bust: percentile(
      bust,
      REFERENCE.bust * girthHeightFactor,
      POPULATION_SD.bust * girthHeightFactor,
      '按身高校准的估算参考',
    ),
    waist: percentile(
      waist,
      REFERENCE.waist * girthHeightFactor,
      POPULATION_SD.waist * girthHeightFactor,
      '按身高校准的估算参考',
    ),
    hip: percentile(
      hip,
      REFERENCE.hip * girthHeightFactor,
      POPULATION_SD.hip * girthHeightFactor,
      '按身高校准的估算参考',
    ),
  };

  const warnings: string[] = [];
  if (bmi < 17 || bmi >= 32) {
    warnings.push('BMI 位于较极端区间，模型比例仅供视觉参考，请以医学评估为准。');
  }
  if (input.bust !== null && input.underbust !== null && input.underbust >= input.bust) {
    warnings.push('下胸围不小于胸围，请检查测量位置。');
  }
  if (waist > hip) {
    warnings.push('腰围大于臀围，已按真实输入保留，但可能影响体型分类的直观性。');
  }
  if (
    input.waist !== null &&
    Math.abs(input.waist - REFERENCE.waist * heightFactor * weightFactor ** 0.52) >
      16
  ) {
    warnings.push('输入腰围与身高体重推算值差异较大，建议复核测量或体重数据。');
  }
  if (input.legLength !== null && (legRatio < 0.43 || legRatio > 0.545)) {
    warnings.push('腿长比例超出常见范围，已限制在模型可呈现的区间内。');
  }

  return {
    height: h,
    weight: w,
    age,
    bmi: round1(bmi),
    bmiLabel: bmiClass.label,
    bmiTone: bmiClass.tone,
    bodyFat: round1(bodyFat),
    bodyFatSource,
    bust: round2(bust),
    underbust: round2(underbust),
    waist: round2(waist),
    hip: round2(hip),
    shoulder: round2(shoulder),
    thigh: round2(thigh),
    calf: round2(calf),
    arm: round2(arm),
    wrist: round2(wrist),
    legLength: round1(legLength),
    headHeight: round1(headHeight),
    whr: round3(waist / hip),
    whtr: round3(waist / h),
    bustWaistDiff: round1(bust - waist),
    waistHipDiff: round1(hip - waist),
    shoulderHipRatio: round3(shoulder / hip),
    legRatio: round3(legRatio),
    headToBody: round2(h / headHeight),
    shape,
    shapeName: shapeCopy.name,
    shapeSubtitle: shapeCopy.subtitle,
    shapeDescription: shapeCopy.description,
    sources: makeSources(input),
    percentiles,
    warnings,
    stateDelta: {
      waist: round1(state.waist * effectScale),
      hip: round1(state.hip * effectScale),
      bust: round1(state.bust * effectScale),
      weight: state.weight,
      label: state.label,
    },
  };
}

const round2 = (value: number) => Math.round(value * 100) / 100;
const round3 = (value: number) => Math.round(value * 1000) / 1000;

export function buildGeometry(metrics: BodyMetrics): BodyGeometry {
  const h = metrics.height;
  const legRatio = clamp(
    metrics.legLength / h,
    0.43,
    0.545,
  );
  const hip = clamp(legRatio + 0.045, 0.48, 0.57);
  const waist = hip + 0.105;
  const underbust = waist + 0.064;
  const bust = waist + 0.095;
  const armpit = bust + 0.025;
  const shoulder = bust + 0.085;
  const neck = shoulder + 0.034;
  const chin = 1 - metrics.headHeight / h;
  const headCenter = (1 + chin) / 2;

  const halfShoulder = (metrics.shoulder / 2) * 0.84;
  const halfBust = metrics.bust * 0.18;
  const halfWaist = metrics.waist * 0.163;
  const halfHip = metrics.hip * 0.182;
  const headWidth = metrics.headHeight * 0.66;
  const headDepth = metrics.headHeight * 0.76;
  const neckHalf = 4.9 * (h / 158) ** 0.4;

  const thighRadius = (metrics.thigh / (Math.PI * 2)) * 1.03;
  const calfRadius = (metrics.calf / (Math.PI * 2)) * 1.06;
  const ankleRadius = 3.1 * (h / 158) ** 0.5;
  const armRadius = (metrics.arm / (Math.PI * 2)) * 0.98;
  const elbowRadius = armRadius * 0.79;
  const wristRadius = (metrics.wrist / (Math.PI * 2)) * 0.92;
  const legCenterX = Math.min(halfHip * 0.51, thighRadius * 0.95);
  const armCenterX = Math.min(halfShoulder * 0.99, metrics.shoulder * 0.425);

  return {
    heightCm: h,
    heightM: h / 100,
    legRatio,
    landmarks: {
      crotch: legRatio,
      hip,
      waist,
      underbust,
      bust,
      armpit,
      shoulder,
      neck,
      chin,
      headCenter,
      top: 1,
    },
    half: {
      shoulder: halfShoulder,
      bust: halfBust,
      waist: halfWaist,
      hip: halfHip,
      headWidth: headWidth / 2,
      headDepth: headDepth / 2,
      headHeight: metrics.headHeight / 2,
      neck: neckHalf,
    },
    depth: {
      bust: metrics.bust * 0.145,
      waist: metrics.waist * 0.128,
      hip: metrics.hip * 0.145,
      underbust: metrics.underbust * 0.128,
    },
    limbs: {
      thighRadius,
      calfRadius,
      ankleRadius,
      armRadius,
      elbowRadius,
      wristRadius,
      legCenterX,
      armCenterX,
      footLength: h * 0.145,
    },
  };
}
