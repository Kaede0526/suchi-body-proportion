export type RegionKey =
  | 'north'
  | 'northeast'
  | 'east'
  | 'central'
  | 'south'
  | 'southwest'
  | 'northwest';

export type ActivityKey = 'sedentary' | 'light' | 'active' | 'athletic';
export type FatKey = 'balanced' | 'gynoid' | 'android';
export type FrameKey = 'small' | 'medium' | 'large';
export type LifeStateKey =
  | 'daily'
  | 'exercise'
  | 'sedentary'
  | 'period'
  | 'postpartum'
  | 'menopause';
export type ProportionKey = 'auto' | 'short' | 'balanced' | 'long';
export type WeightUnit = 'kg' | 'jin';
export type ViewMode = 'three' | 'two';
export type PoseKey = 'standard' | 'natural' | 'tiptoe';

export interface BodyInput {
  height: number;
  weight: number;
  age: number;
  weightUnit: WeightUnit;
  shoulder: number | null;
  bust: number | null;
  underbust: number | null;
  waist: number | null;
  hip: number | null;
  thigh: number | null;
  calf: number | null;
  arm: number | null;
  wrist: number | null;
  legLength: number | null;
  headHeight: number | null;
  bodyFat: number | null;
  region: RegionKey;
  activity: ActivityKey;
  fat: FatKey;
  frame: FrameKey;
  lifeState: LifeStateKey;
  proportion: ProportionKey;
}

export type MeasurementKey =
  | 'bust'
  | 'underbust'
  | 'waist'
  | 'hip'
  | 'shoulder'
  | 'thigh'
  | 'calf'
  | 'arm'
  | 'wrist';

export type SourceKind = 'input' | 'estimate' | 'reference';

export type BodyShapeKey = 'X' | 'A' | 'H' | 'Y' | 'O';

export interface PercentileResult {
  value: number;
  percentile: number;
  mean: number;
  sd: number;
  label: string;
}

export interface BodyMetrics {
  height: number;
  weight: number;
  age: number;
  bmi: number;
  bmiLabel: string;
  bmiTone: 'low' | 'normal' | 'high' | 'very-high';
  bodyFat: number;
  bodyFatSource: 'input' | 'estimate';
  bust: number;
  underbust: number;
  waist: number;
  hip: number;
  shoulder: number;
  thigh: number;
  calf: number;
  arm: number;
  wrist: number;
  legLength: number;
  headHeight: number;
  whr: number;
  whtr: number;
  bustWaistDiff: number;
  waistHipDiff: number;
  shoulderHipRatio: number;
  legRatio: number;
  headToBody: number;
  shape: BodyShapeKey;
  shapeName: string;
  shapeSubtitle: string;
  shapeDescription: string;
  sources: Record<MeasurementKey, SourceKind>;
  percentiles: {
    height: PercentileResult;
    weight: PercentileResult;
    bmi: PercentileResult;
    bust: PercentileResult;
    waist: PercentileResult;
    hip: PercentileResult;
  };
  warnings: string[];
  stateDelta: {
    waist: number;
    hip: number;
    bust: number;
    weight: number;
    label: string;
  };
}

export interface BodyGeometry {
  heightCm: number;
  heightM: number;
  legRatio: number;
  landmarks: {
    crotch: number;
    hip: number;
    waist: number;
    underbust: number;
    bust: number;
    armpit: number;
    shoulder: number;
    neck: number;
    chin: number;
    headCenter: number;
    top: number;
  };
  half: {
    shoulder: number;
    bust: number;
    waist: number;
    hip: number;
    headWidth: number;
    headDepth: number;
    headHeight: number;
    neck: number;
  };
  depth: {
    bust: number;
    waist: number;
    hip: number;
    underbust: number;
  };
  limbs: {
    thighRadius: number;
    calfRadius: number;
    ankleRadius: number;
    armRadius: number;
    elbowRadius: number;
    wristRadius: number;
    legCenterX: number;
    armCenterX: number;
    footLength: number;
  };
}
