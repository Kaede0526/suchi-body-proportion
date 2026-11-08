import type {
  ActivityKey,
  FatKey,
  FrameKey,
  LifeStateKey,
  ProportionKey,
  RegionKey,
} from './types';

export const DEFAULT_INPUT = {
  height: 162,
  weight: 55,
  age: 28,
  weightUnit: 'kg' as const,
  shoulder: null,
  bust: null,
  underbust: null,
  waist: null,
  hip: null,
  thigh: null,
  calf: null,
  arm: null,
  wrist: null,
  legLength: null,
  headHeight: null,
  bodyFat: null,
  region: 'east' as RegionKey,
  activity: 'light' as ActivityKey,
  fat: 'balanced' as FatKey,
  frame: 'medium' as FrameKey,
  lifeState: 'daily' as LifeStateKey,
  proportion: 'auto' as ProportionKey,
};

export const REGIONS: { value: RegionKey; label: string; note: string }[] = [
  { value: 'north', label: '华北', note: '区域基线待核验' },
  { value: 'northeast', label: '东北', note: '区域基线待核验' },
  { value: 'east', label: '华东', note: '区域基线待核验' },
  { value: 'central', label: '华中', note: '区域基线待核验' },
  { value: 'south', label: '华南', note: '区域基线待核验' },
  { value: 'southwest', label: '西南', note: '区域基线待核验' },
  { value: 'northwest', label: '西北', note: '区域基线待核验' },
];

export const ACTIVITIES: {
  value: ActivityKey;
  label: string;
  description: string;
}[] = [
  { value: 'sedentary', label: '久坐', description: '日常以坐姿为主，较少运动' },
  { value: 'light', label: '轻度', description: '偶尔散步或每周 1–2 次活动' },
  { value: 'active', label: '规律', description: '每周 3–4 次中等强度运动' },
  { value: 'athletic', label: '高强度', description: '每周 5 次以上系统训练' },
];

export const FAT_DISTRIBUTIONS: {
  value: FatKey;
  label: string;
  description: string;
}[] = [
  { value: 'balanced', label: '均匀', description: '脂肪分布相对平均' },
  { value: 'gynoid', label: '臀腿', description: '腰腹较细，臀腿更有量感' },
  { value: 'android', label: '腰腹', description: '脂肪更倾向腰腹与上背' },
];

export const FRAMES: {
  value: FrameKey;
  label: string;
  description: string;
}[] = [
  { value: 'small', label: '小骨架', description: '肩窄、腕围偏细' },
  { value: 'medium', label: '中等', description: '常见骨架比例' },
  { value: 'large', label: '大骨架', description: '肩宽、腕围偏大' },
];

export const LIFE_STATES: {
  value: LifeStateKey;
  label: string;
  short: string;
  description: string;
}[] = [
  {
    value: 'daily',
    label: '日常',
    short: '基准',
    description: '普通成年女性的日常状态，不做短期修正。',
  },
  {
    value: 'exercise',
    label: '运动后',
    short: '短期',
    description: '肌肉充血与体表水分带来的短时围度变化，几小时内回落。',
  },
  {
    value: 'sedentary',
    label: '久坐日',
    short: '短期',
    description: '长时间坐姿后腰腹与下肢的轻度胀感，不代表脂肪增加。',
  },
  {
    value: 'period',
    label: '经期',
    short: '短期',
    description: '激素波动可能带来水潴留和腹部胀感，围度变化通常短暂。',
  },
  {
    value: 'postpartum',
    label: '产后恢复',
    short: '阶段',
    description: '腹壁张力与骨盆稳定性的恢复存在个体差异，不是“恢复原样”的承诺。',
  },
  {
    value: 'menopause',
    label: '围绝经期',
    short: '阶段',
    description: '雌激素变化可能使脂肪更倾向腰腹分布，围度变化因人而异。',
  },
];

export const PROPORTIONS: {
  value: ProportionKey;
  label: string;
  ratio: number;
}[] = [
  { value: 'short', label: '上身较长', ratio: 0.458 },
  { value: 'auto', label: '自动估算', ratio: 0.475 },
  { value: 'balanced', label: '均衡', ratio: 0.478 },
  { value: 'long', label: '下身较长', ratio: 0.495 },
];

export const OPTION_NOTES = {
  region:
    '当前版本使用全国参考基线。区域样本正在核验，未启用未经证实的地区修正。',
  fat: '这是外观倾向描述，不是医学检查；模型会把它转换为腰臀比例的较小修正。',
  lifeState: '状态修正用于呈现短时或阶段性差异，不是预测，也不构成医学建议。',
  proportion: '腿长指裆点至地面的垂直距离；可选实测值覆盖估算。',
};

/** Population anchors. See docs/DATA.md for provenance and caveats. */
export const REFERENCE = {
  height: 158,
  weight: 59,
  bmi: 23.64,
  bust: 86,
  underbust: 76.5,
  waist: 79,
  hip: 92.5,
  shoulder: 38.8,
  thigh: 53.5,
  calf: 34,
  arm: 27.5,
  wrist: 15.5,
  headHeight: 21.5,
};

export const POPULATION_SD = {
  height: 5.8,
  weight: 9.8,
  bmi: 4.1,
  bust: 6.3,
  waist: 9.4,
  hip: 6.4,
};

export const FRAME_FACTOR: Record<FrameKey, number> = {
  small: 0.95,
  medium: 1,
  large: 1.055,
};

export const ACTIVITY_EFFECT: Record<
  ActivityKey,
  { waist: number; hip: number; shoulder: number; thigh: number; arm: number }
> = {
  sedentary: { waist: 0.8, hip: 0.15, shoulder: -0.1, thigh: 0.2, arm: 0 },
  light: { waist: 0, hip: 0, shoulder: 0, thigh: 0, arm: 0 },
  active: { waist: -0.7, hip: 0.3, shoulder: 0.3, thigh: 0.4, arm: 0.3 },
  athletic: { waist: -1.2, hip: 0.5, shoulder: 0.6, thigh: 0.7, arm: 0.6 },
};

export const FAT_EFFECT: Record<
  FatKey,
  { waist: number; hip: number; bust: number; thigh: number }
> = {
  balanced: { waist: 0, hip: 0, bust: 0, thigh: 0 },
  gynoid: { waist: -1.8, hip: 1.7, bust: 0.2, thigh: 1.0 },
  android: { waist: 2.6, hip: -0.8, bust: 0.7, thigh: -0.4 },
};

export const STATE_EFFECT: Record<
  LifeStateKey,
  {
    waist: number;
    hip: number;
    bust: number;
    weight: number;
    label: string;
  }
> = {
  daily: { waist: 0, hip: 0, bust: 0, weight: 0, label: '日常基准' },
  exercise: { waist: -0.5, hip: 0.4, bust: 0.3, weight: 0.15, label: '短时充血' },
  sedentary: { waist: 1.0, hip: 0.35, bust: 0.1, weight: 0.2, label: '久坐胀感' },
  period: { waist: 1.6, hip: 0.5, bust: 0.4, weight: 0.7, label: '经期水潴留' },
  postpartum: { waist: 2.0, hip: 0.8, bust: 0.4, weight: 0, label: '恢复期参考' },
  menopause: { waist: 2.2, hip: -0.4, bust: 0.3, weight: 0.2, label: '阶段参考' },
};

export const SHAPE_COPY = {
  X: {
    name: '沙漏型',
    subtitle: 'X SHAPE',
    description: '肩胸与臀部接近，腰线内收明显。轮廓的曲线差较清晰。',
  },
  A: {
    name: '梨型',
    subtitle: 'A SHAPE',
    description: '臀部与大腿相对肩胸更有量感，腰线通常仍然清楚。',
  },
  H: {
    name: '直筒型',
    subtitle: 'H SHAPE',
    description: '肩、腰、臀的宽度差较小，整体线条更接近直线。',
  },
  Y: {
    name: '倒三角型',
    subtitle: 'Y SHAPE',
    description: '肩胸宽度相对臀部更突出，纵向线条更强。',
  },
  O: {
    name: '苹果型',
    subtitle: 'O SHAPE',
    description: '腰腹相对突出，腰线不明显。围度变化常随年龄和激素阶段出现。',
  },
} as const;
