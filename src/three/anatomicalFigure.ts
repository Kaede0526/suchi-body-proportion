import * as THREE from 'three';
import type { BodyMetrics, PoseKey } from '../domain/types';
import { BODY_BINARY_BASE64, BODY_META } from './bodyData';

interface MorphData {
  name: string;
  deltaScale: number;
  indices: Uint16Array;
  deltas: Int16Array;
}

interface BodyData {
  positions: Float32Array;
  indices: Uint16Array;
  suitMask: Uint8Array;
  morphs: MorphData[];
  suitTriangles: Uint16Array;
  neighbors: number[][];
  armLeft: Uint8Array;
  armRight: Uint8Array;
  legLeft: Uint8Array;
  legRight: Uint8Array;
  footLeft: Uint8Array;
  footRight: Uint8Array;
}

export interface FigureAnchors {
  top: THREE.Vector3;
  bust: THREE.Vector3;
  waist: THREE.Vector3;
  hip: THREE.Vector3;
}

export interface AnatomicalFigure {
  group: THREE.Group;
  anchors: FigureAnchors;
  height: number;
  dispose: () => void;
}

const META = BODY_META;
const BODY_COLOR = 0xc69d84;

let cachedData: BodyData | null = null;

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function readBodyData(): BodyData {
  if (cachedData) return cachedData;
  const bytes = decodeBase64(BODY_BINARY_BASE64);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  const magic = String.fromCharCode(
    bytes[0],
    bytes[1],
    bytes[2],
    bytes[3],
  );
  if (magic !== 'SCHB') throw new Error('Unsupported body asset');
  offset = 4;
  const version = view.getUint32(offset, true);
  offset += 4;
  if (version !== 1) throw new Error('Unsupported body asset version');
  const vertexCount = view.getUint32(offset, true);
  offset += 4;
  const indexCount = view.getUint32(offset, true);
  offset += 4;
  const morphCount = view.getUint16(offset, true);
  offset += 4;
  offset += 4; // baseHeight
  offset += 32; // landmarks
  offset += 28; // base measures
  const positionScale = view.getFloat32(offset, true);
  offset += 4;

  const positions = new Float32Array(vertexCount * 3);
  for (let i = 0; i < positions.length; i += 1) {
    positions[i] = view.getInt16(offset, true) / positionScale;
    offset += 2;
  }
  const indices = new Uint16Array(indexCount);
  for (let i = 0; i < indexCount; i += 1) {
    indices[i] = view.getUint16(offset, true);
    offset += 2;
  }
  const suitMask = new Uint8Array(vertexCount);
  for (let i = 0; i < vertexCount; i += 1) {
    suitMask[i] = view.getUint8(offset);
    offset += 1;
  }
  const readByteArray = () => {
    const array = new Uint8Array(vertexCount);
    for (let i = 0; i < vertexCount; i += 1) {
      array[i] = view.getUint8(offset);
      offset += 1;
    }
    return array;
  };
  const armLeft = readByteArray();
  const armRight = readByteArray();
  const legLeft = readByteArray();
  const legRight = readByteArray();
  const footLeft = readByteArray();
  const footRight = readByteArray();
  const morphs: MorphData[] = [];
  for (let m = 0; m < morphCount; m += 1) {
    const nameLength = view.getUint8(offset);
    offset += 1;
    const name = new TextDecoder().decode(bytes.subarray(offset, offset + nameLength));
    offset += nameLength;
    const deltaScale = view.getFloat32(offset, true);
    offset += 4;
    const count = view.getUint16(offset, true);
    offset += 2;
    const morphIndices = new Uint16Array(count);
    const deltas = new Int16Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      morphIndices[i] = view.getUint16(offset, true);
      offset += 2;
      deltas[i * 3] = view.getInt16(offset, true);
      offset += 2;
      deltas[i * 3 + 1] = view.getInt16(offset, true);
      offset += 2;
      deltas[i * 3 + 2] = view.getInt16(offset, true);
      offset += 2;
    }
    morphs.push({ name, deltaScale, indices: morphIndices, deltas });
  }

  const suitTriangleList: number[] = [];
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i];
    const b = indices[i + 1];
    const c = indices[i + 2];
    if (suitMask[a] && suitMask[b] && suitMask[c]) {
      suitTriangleList.push(a, b, c);
    }
  }

  const neighborSets = Array.from({ length: vertexCount }, () => new Set<number>());
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i];
    const b = indices[i + 1];
    const c = indices[i + 2];
    neighborSets[a].add(b);
    neighborSets[a].add(c);
    neighborSets[b].add(a);
    neighborSets[b].add(c);
    neighborSets[c].add(a);
    neighborSets[c].add(b);
  }

  cachedData = {
    positions,
    indices,
    suitMask,
    morphs,
    suitTriangles: new Uint16Array(suitTriangleList),
    neighbors: neighborSets.map((set) => Array.from(set)),
    armLeft,
    armRight,
    legLeft,
    legRight,
    footLeft,
    footRight,
  };
  return cachedData;
}

function applyMorphs(
  base: Float32Array,
  morphs: MorphData[],
  weights: Record<string, number>,
) {
  const result = new Float32Array(base);
  for (const morph of morphs) {
    const weight = weights[morph.name] ?? 0;
    if (weight <= 0.0001) continue;
    for (let i = 0; i < morph.indices.length; i += 1) {
      const vertex = morph.indices[i] * 3;
      result[vertex] += (morph.deltas[i * 3] / morph.deltaScale) * weight;
      result[vertex + 1] +=
        (morph.deltas[i * 3 + 1] / morph.deltaScale) * weight;
      result[vertex + 2] +=
        (morph.deltas[i * 3 + 2] / morph.deltaScale) * weight;
    }
  }
  return result;
}

function cross(o: [number, number], a: [number, number], b: [number, number]) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function convexHull(points: [number, number][]) {
  const unique = Array.from(new Map(points.map((p) => [`${p[0]},${p[1]}`, p])).values()).sort(
    (a, b) => a[0] - b[0] || a[1] - b[1],
  );
  if (unique.length <= 2) return unique;
  const lower: [number, number][] = [];
  for (const p of unique) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (let i = unique.length - 1; i >= 0; i -= 1) {
    const p = unique[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

function perimeter(points: [number, number][]) {
  const hull = convexHull(points);
  if (hull.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < hull.length; i += 1) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    total += Math.hypot(a[0] - b[0], a[1] - b[1]);
  }
  return total;
}

function sliceHull(
  positions: Float32Array,
  triangles: Uint16Array,
  y: number,
): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i < triangles.length; i += 3) {
    const ia = triangles[i] * 3;
    const ib = triangles[i + 1] * 3;
    const ic = triangles[i + 2] * 3;
    const ax = positions[ia];
    const ay = positions[ia + 1];
    const az = positions[ia + 2];
    const bx = positions[ib];
    const by = positions[ib + 1];
    const bz = positions[ib + 2];
    const cx = positions[ic];
    const cy = positions[ic + 1];
    const cz = positions[ic + 2];
    const aboveA = ay >= y;
    const aboveB = by >= y;
    const aboveC = cy >= y;
    if ((aboveA && aboveB && aboveC) || (!aboveA && !aboveB && !aboveC)) continue;
    const edges: [
      number,
      number,
      number,
      number,
      number,
      number,
      boolean,
      boolean,
    ][] = [
      [ax, az, ay, bx, bz, by, aboveA, aboveB],
      [bx, bz, by, cx, cz, cy, aboveB, aboveC],
      [cx, cz, cy, ax, az, ay, aboveC, aboveA],
    ];
    for (const [x1, z1, y1, x2, z2, y2, s1, s2] of edges) {
      if (s1 === s2) continue;
      const t = (y - y1) / (y2 - y1);
      points.push([x1 + (x2 - x1) * t, z1 + (z2 - z1) * t]);
    }
  }
  return points;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

function gains(name: string, field: 'bust' | 'waist' | 'hip') {
  return (META.gains as Record<string, Record<string, number>>)[name]?.[field] ?? 0;
}

function findMorph(data: BodyData, name: string) {
  return data.morphs.find((m) => m.name === name);
}


function applyBodyFatVisual(
  positions: Float32Array,
  metrics: BodyMetrics,
  height: number,
) {
  const reference = clamp(
    1.2 * metrics.bmi + 0.23 * metrics.age - 5.4,
    8,
    55,
  );
  const delta = metrics.bodyFat - reference;
  const lowBmiLean = clamp((19 - metrics.bmi) / 4, 0, 1);
  const autoLeanScale = 1 - lowBmiLean * 0.05;
  const reportedScale = 1 + delta * 0.0045;
  const widthScale = clamp(
    metrics.bodyFatSource === 'input'
      ? Math.min(reportedScale, autoLeanScale)
      : autoLeanScale,
    0.94,
    1.04,
  );
  if (Math.abs(widthScale - 1) < 0.0005) return;
  const transitionStart = height * 0.8;
  const transitionEnd = height * 0.88;
  for (let i = 0; i < positions.length; i += 3) {
    const y = positions[i + 1];
    const t = clamp(
      (y - transitionStart) / Math.max(0.001, transitionEnd - transitionStart),
      0,
      1,
    );
    const scale = widthScale + (1 - widthScale) * t;
    positions[i] *= scale;
    positions[i + 2] *= scale;
  }
}

function applyNaturalPose(
  positions: Float32Array,
  data: BodyData,
  height: number,
) {
  const armAngle = 0.24;
  const legAngle = 0.13;
  const shoulderY = height * 0.833;
  const shoulderX = height * 0.104;
  const hipY = height * 0.537;
  const hipX = height * 0.068;

  for (let i = 0; i < positions.length / 3; i += 1) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const side = x >= 0 ? 1 : -1;
    const armWeight =
      (side > 0 ? data.armLeft[i] : data.armRight[i]) / 255;
    if (armWeight > 0.002) {
      const pivotX = side * shoulderX;
      const theta = -side * armAngle * armWeight;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const dx = positions[i * 3] - pivotX;
      const dy = y - shoulderY;
      positions[i * 3] = pivotX + cos * dx - sin * dy;
      positions[i * 3 + 1] = shoulderY + sin * dx + cos * dy;
      positions[i * 3] += side * 0.014 * armWeight;
    }
    const legWeight =
      (side > 0 ? data.legLeft[i] : data.legRight[i]) / 255;
    if (legWeight > 0.002) {
      const pivotX = side * hipX;
      const theta = -side * legAngle * legWeight;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const dx = positions[i * 3] - pivotX;
      const dy = positions[i * 3 + 1] - hipY;
      positions[i * 3] = pivotX + cos * dx - sin * dy;
      positions[i * 3 + 1] = hipY + sin * dx + cos * dy;
    }
  }
}

function applyTiptoe(
  positions: Float32Array,
  data: BodyData,
  height: number,
): number {
  const angle = 0.42;
  const pivotFor = (weights: Uint8Array) => {
    let maxY = -Infinity;
    for (let i = 0; i < weights.length; i += 1) {
      if (weights[i] < 80) continue;
      maxY = Math.max(maxY, positions[i * 3 + 1]);
    }
    let sx = 0;
    let sz = 0;
    let count = 0;
    for (let i = 0; i < weights.length; i += 1) {
      if (weights[i] < 40) continue;
      const y = positions[i * 3 + 1];
      if (Math.abs(y - maxY) > 0.018 * (height / 1.6)) continue;
      sx += positions[i * 3];
      sz += positions[i * 3 + 2];
      count += 1;
    }
    return count
      ? ([sx / count, maxY - 0.008, sz / count] as [number, number, number])
      : ([0, 0.065, 0] as [number, number, number]);
  };

  for (const weights of [data.footLeft, data.footRight]) {
    const [pivotX, pivotY, pivotZ] = pivotFor(weights);
    for (let i = 0; i < weights.length; i += 1) {
      const weight = weights[i] / 255;
      if (weight < 0.002) continue;
      const theta = angle * weight;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const dy = positions[i * 3 + 1] - pivotY;
      const dz = positions[i * 3 + 2] - pivotZ;
      positions[i * 3 + 1] = pivotY + cos * dy - sin * dz;
      positions[i * 3 + 2] = pivotZ + sin * dy + cos * dz;
    }
  }

  let minY = Infinity;
  for (let i = 1; i < positions.length; i += 3) {
    minY = Math.min(minY, positions[i]);
  }
  const lift = Math.max(0, -minY);
  if (lift > 0) {
    for (let i = 1; i < positions.length; i += 3) positions[i] += lift;
  }
  return lift;
}

function fitBody(metrics: BodyMetrics, pose: PoseKey) {
  const data = readBodyData();
  const targetHeight = metrics.height / 100;
  const initialScale = targetHeight / META.baseHeight;
  const base = META.baseMeasures;
  const target = {
    bust: metrics.bust / initialScale,
    waist: metrics.waist / initialScale,
    hip: metrics.hip / initialScale,
  };
  const weights: Record<string, number> = {};

  // Shoulder and limb sliders respond to the optional measurements. Their
  // absolute calibration is less exact than the torso fitting below, so they
  // are intentionally kept gentle.
  const shoulderTarget = metrics.shoulder / initialScale;
  const shoulderDiff = shoulderTarget - base.shoulder;
  weights[
    shoulderDiff >= 0 ? 'shouldersWider' : 'shouldersNarrower'
  ] = clamp(Math.abs(shoulderDiff) / 4.2, 0, 0.8);

  const thighTarget = metrics.thigh / initialScale;
  const thighDiff = thighTarget - base.thigh;
  weights[thighDiff >= 0 ? 'thighsThicker' : 'thighsThinner'] = clamp(
    Math.abs(thighDiff) / 8.5,
    0,
    0.9,
  );
  const calfTarget = metrics.calf / initialScale;
  const calfDiff = calfTarget - base.calf;
  weights[calfDiff >= 0 ? 'calvesThicker' : 'calvesThinner'] = clamp(
    Math.abs(calfDiff) / 6.4,
    0,
    0.9,
  );
  const armTarget = metrics.arm / initialScale;
  const armDiff = armTarget - base.arm;
  weights[armDiff >= 0 ? 'armsThicker' : 'armsThinner'] = clamp(
    Math.abs(armDiff) / 6.0,
    0,
    0.9,
  );

  // Body fat is not a circumference. A self-reported value only nudges the
  // soft-tissue / muscular appearance; the girth fit below still keeps the
  // measured or target circumferences authoritative.
  const referenceBodyFat = clamp(
    1.2 * metrics.bmi + 0.23 * metrics.age - 5.4,
    8,
    55,
  );
  const bodyFatDelta = metrics.bodyFat - referenceBodyFat;
  if (metrics.bodyFatSource === 'input' && bodyFatDelta < -0.5) {
    weights.bodyMuscular = clamp(-bodyFatDelta / 40, 0, 0.22);
  } else if (metrics.bodyFatSource === 'input' && bodyFatDelta > 0.5) {
    weights.bodySofter = clamp(bodyFatDelta / 45, 0, 0.22);
  }

  const lowBmiLean = clamp((19 - metrics.bmi) / 4, 0, 1);
  weights.bodyThinner = lowBmiLean * 0.28;

  // A first analytic fit. Waist widening can need both the waist and belly
  // targets; hip correction is applied after the waist because it couples.
  const initialBust = clamp(
    Math.abs(target.bust - base.bust) / Math.abs(gains('bustBigger', 'bust') || 16.4),
    0,
    1,
  );
  weights[target.bust >= base.bust ? 'bustBigger' : 'bustSmaller'] = initialBust;

  if (target.waist >= base.waist) {
    let w = clamp(
      (target.waist - base.waist) /
        Math.max(1, gains('waistWider', 'waist')),
      0,
      1,
    );
    weights.waistWider = w;
    const waistAfter = base.waist + gains('waistWider', 'waist') * w;
    const remainder = target.waist - waistAfter;
    if (remainder > 0.6) {
      weights.bellyBigger = clamp(
        remainder / Math.max(1, gains('bellyBigger', 'waist')),
        0,
        0.85,
      );
    }
  } else {
    weights.waistNarrower = clamp(
      (base.waist - target.waist) /
        Math.max(1, Math.abs(gains('waistNarrower', 'waist'))),
      0,
      1,
    );
  }

  const waistHipCoupling =
    gains('waistWider', 'hip') * (weights.waistWider ?? 0) +
    gains('bellyBigger', 'hip') * (weights.bellyBigger ?? 0) +
    gains('waistNarrower', 'hip') * (weights.waistNarrower ?? 0);
  const estimatedHip = base.hip + waistHipCoupling;
  const hipDiff = target.hip - estimatedHip;
  if (hipDiff >= 0) {
    weights.hipsCircWider = clamp(
      hipDiff / Math.max(1, gains('hipsCircWider', 'hip')),
      0,
      1,
    );
    const after = estimatedHip + gains('hipsCircWider', 'hip') * weights.hipsCircWider;
    if (target.hip - after > 0.8) {
      weights.gluteusBigger = clamp(
        (target.hip - after) / Math.max(1, gains('gluteusBigger', 'hip')),
        0,
        0.7,
      );
    }
  } else {
    weights.hipsCircNarrower = clamp(
      -hipDiff / Math.max(1, Math.abs(gains('hipsCircNarrower', 'hip'))),
      0,
      1,
    );
  }

  let positions = applyMorphs(data.positions, data.morphs, weights);
  const bustY = META.landmarks.bust;
  const waistY = META.landmarks.waist;
  const hipY = META.landmarks.hip;
  const getGirths = (verts: Float32Array) => ({
    bust: perimeter(sliceHull(verts, data.suitTriangles, bustY)) * 100,
    waist: perimeter(sliceHull(verts, data.suitTriangles, waistY)) * 100,
    hip: perimeter(sliceHull(verts, data.suitTriangles, hipY)) * 100,
  });

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const measured = getGirths(positions);
    const bustError = target.bust - measured.bust;
    if (target.bust >= base.bust) {
      weights.bustBigger = clamp(
        (weights.bustBigger ?? 0) +
          bustError / Math.max(1, gains('bustBigger', 'bust')),
        0,
        1,
      );
      weights.bustSmaller = 0;
    } else {
      weights.bustSmaller = clamp(
        (weights.bustSmaller ?? 0) +
          -bustError / Math.max(1, Math.abs(gains('bustSmaller', 'bust'))),
        0,
        1,
      );
      weights.bustBigger = 0;
    }

    const waistError = target.waist - measured.waist;
    if (target.waist >= base.waist) {
      const room =
        1 - (weights.waistWider ?? 0);
      const add = clamp(
        waistError / Math.max(1, gains('waistWider', 'waist')),
        0,
        room,
      );
      weights.waistWider = (weights.waistWider ?? 0) + add;
      let rest = waistError - add * gains('waistWider', 'waist');
      if (rest > 0.4) {
        weights.bellyBigger = clamp(
          (weights.bellyBigger ?? 0) +
            rest / Math.max(1, gains('bellyBigger', 'waist')),
          0,
          0.9,
        );
      }
      weights.waistNarrower = 0;
    } else {
      weights.waistNarrower = clamp(
        (weights.waistNarrower ?? 0) +
          -waistError / Math.max(1, Math.abs(gains('waistNarrower', 'waist'))),
        0,
        1,
      );
      weights.waistWider = 0;
      weights.bellyBigger = 0;
    }

    const hipError = target.hip - measured.hip;
    if (target.hip >= base.hip) {
      weights.hipsCircWider = clamp(
        (weights.hipsCircWider ?? 0) +
          hipError / Math.max(1, gains('hipsCircWider', 'hip')),
        0,
        1,
      );
      weights.hipsCircNarrower = 0;
    } else {
      weights.hipsCircNarrower = clamp(
        (weights.hipsCircNarrower ?? 0) +
          -hipError / Math.max(1, Math.abs(gains('hipsCircNarrower', 'hip'))),
        0,
        1,
      );
      weights.hipsCircWider = 0;
    }

    positions = applyMorphs(data.positions, data.morphs, weights);
  }

  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 1; i < positions.length; i += 3) {
    if (positions[i] < minY) minY = positions[i];
    if (positions[i] > maxY) maxY = positions[i];
  }
  const finalScale = targetHeight / Math.max(0.001, maxY - minY);
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] *= finalScale;
    positions[i + 1] = (positions[i + 1] - minY) * finalScale;
    positions[i + 2] *= finalScale;
  }

  const baseCrotch = (META.landmarks.crotch - minY) * finalScale;
  const targetCrotch = clamp(
    metrics.legLength / 100,
    baseCrotch * 0.94,
    baseCrotch * 1.06,
  );
  const upperSpan = Math.max(0.001, targetHeight - baseCrotch);
  const targetUpperSpan = Math.max(0.001, targetHeight - targetCrotch);
  const warpY = (y: number) =>
    y <= baseCrotch
      ? (y / baseCrotch) * targetCrotch
      : targetCrotch + ((y - baseCrotch) / upperSpan) * targetUpperSpan;

  if (Math.abs(targetCrotch - baseCrotch) > 0.0005) {
    for (let i = 1; i < positions.length; i += 3) {
      positions[i] = warpY(positions[i]);
    }
  }

  const scaledLandmarks = {
    bust: warpY((bustY - minY) * finalScale),
    waist: warpY((waistY - minY) * finalScale),
    hip: warpY((hipY - minY) * finalScale),
    crotch: warpY((META.landmarks.crotch - minY) * finalScale),
  };
  smoothPelvis(positions, data.neighbors, scaledLandmarks.crotch, finalScale);
  applyBodyFatVisual(positions, metrics, targetHeight);
  if (pose !== 'standard') {
    applyNaturalPose(positions, data, targetHeight);
  }
  let tiptoeLift = 0;
  if (pose === 'tiptoe') {
    tiptoeLift = applyTiptoe(positions, data, targetHeight);
    if (tiptoeLift > 0) {
      scaledLandmarks.bust += tiptoeLift;
      scaledLandmarks.waist += tiptoeLift;
      scaledLandmarks.hip += tiptoeLift;
      scaledLandmarks.crotch += tiptoeLift;
    }
  }
  return {
    data,
    positions,
    landmarks: scaledLandmarks,
    height: targetHeight + tiptoeLift,
  };
}

function createPlatform() {
  const group = new THREE.Group();
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(0.64, 0.66, 0.016, 120),
    new THREE.MeshStandardMaterial({ color: 0xe6e0d4, roughness: 0.9 }),
  );
  platform.position.y = -0.008;
  platform.receiveShadow = true;
  group.add(platform);

  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.545, 0.545, 0.002, 120),
    new THREE.MeshStandardMaterial({ color: 0xeee9df, roughness: 1 }),
  );
  inner.position.y = 0.001;
  inner.receiveShadow = true;
  group.add(inner);

  const ringMat = new THREE.LineBasicMaterial({
    color: 0xb7ada0,
    transparent: true,
    opacity: 0.62,
  });
  for (const radius of [0.43, 0.545, 0.625]) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i += 1) {
      const theta = (i / 160) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * radius, 0.005, Math.sin(theta) * radius));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), ringMat));
  }

  const ticks: number[] = [];
  for (let i = 0; i < 48; i += 1) {
    const theta = (i / 48) * Math.PI * 2;
    const innerR = i % 4 === 0 ? 0.595 : 0.615;
    ticks.push(
      Math.cos(theta) * innerR,
      0.006,
      Math.sin(theta) * innerR,
      Math.cos(theta) * 0.64,
      0.006,
      Math.sin(theta) * 0.64,
    );
  }
  const tickGeo = new THREE.BufferGeometry();
  tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(ticks, 3));
  group.add(
    new THREE.LineSegments(
      tickGeo,
      new THREE.LineBasicMaterial({
        color: 0xb4aa9c,
        transparent: true,
        opacity: 0.55,
      }),
    ),
  );

  const grid = new THREE.GridHelper(0.9, 8, 0xc9c0b2, 0xd8d1c5);
  grid.position.y = 0.003;
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.18;
  group.add(grid);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const shadowCtx = shadowCanvas.getContext('2d');
  if (shadowCtx) {
    const gradient = shadowCtx.createRadialGradient(128, 128, 8, 128, 128, 126);
    gradient.addColorStop(0, 'rgba(66, 53, 42, 0.32)');
    gradient.addColorStop(0.45, 'rgba(66, 53, 42, 0.14)');
    gradient.addColorStop(1, 'rgba(66, 53, 42, 0)');
    shadowCtx.fillStyle = gradient;
    shadowCtx.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(shadowCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.3),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0.9,
    }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.013;
  group.add(contact);

  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 4),
    new THREE.ShadowMaterial({ color: 0x57493e, opacity: 0.16 }),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.012;
  shadowPlane.receiveShadow = true;
  group.add(shadowPlane);
  return group;
}

function makeMeasurementRing(
  points: [number, number][],
  y: number,
  color: number,
) {
  const hull = convexHull(points);
  if (hull.length < 3) return null;
  const centerX = hull.reduce((sum, p) => sum + p[0], 0) / hull.length;
  const centerZ = hull.reduce((sum, p) => sum + p[1], 0) / hull.length;
  const ringPoints = hull.map((p) => {
    const dx = p[0] - centerX;
    const dz = p[1] - centerZ;
    const length = Math.hypot(dx, dz) || 1;
    return new THREE.Vector3(
      p[0] + (dx / length) * 0.004,
      y,
      p[1] + (dz / length) * 0.004,
    );
  });
  const curve = new THREE.CatmullRomCurve3(ringPoints, true);
  const geometry = new THREE.TubeGeometry(curve, 180, 0.00115, 5, true);
  const material = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 3;
  return { mesh, geometry, material, hull };
}

function smoothPelvis(
  positions: Float32Array,
  neighbors: number[][],
  crotchY: number,
  scale: number,
) {
  const yMin = crotchY - 0.03 * scale;
  const yMax = crotchY + 0.12 * scale;
  const xMax = 0.12 * scale;
  const affected: number[] = [];
  for (let i = 0; i < positions.length / 3; i += 1) {
    const x = Math.abs(positions[i * 3]);
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    if (x < xMax && y > yMin && y < yMax && z > -0.02) {
      affected.push(i);
    }
  }
  if (!affected.length) return;
  for (let iteration = 0; iteration < 6; iteration += 1) {
    const updates = new Map<number, [number, number, number]>();
    for (const index of affected) {
      const list = neighbors[index];
      if (!list.length) continue;
      let ax = 0;
      let ay = 0;
      let az = 0;
      for (const neighbor of list) {
        ax += positions[neighbor * 3];
        ay += positions[neighbor * 3 + 1];
        az += positions[neighbor * 3 + 2];
      }
      const inv = 1 / list.length;
      const blend = 0.9;
      updates.set(index, [
        positions[index * 3] * (1 - blend) + ax * inv * blend,
        positions[index * 3 + 1] * (1 - blend) + ay * inv * blend,
        positions[index * 3 + 2] * (1 - blend) + az * inv * blend,
      ]);
    }
    for (const [index, value] of updates) {
      positions[index * 3] = value[0];
      positions[index * 3 + 1] = value[1];
      positions[index * 3 + 2] = value[2];
    }
  }

  // A soft, featureless mons contour keeps the mannequin from looking
  // inverted or pinched at the centre line. No anatomical opening or
  // internal detail is added.
  const monsY = crotchY + 0.045 * scale;
  const monsX = 0.075 * scale;
  const monsZ = 0.06 * scale;
  for (let i = 0; i < positions.length / 3; i += 1) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    if (z < 0.02) continue;
    const nx = x / Math.max(0.001, monsX);
    const ny = (y - monsY) / Math.max(0.001, monsZ);
    const weight = 1 - nx * nx - ny * ny;
    if (weight <= 0) continue;
    positions[i * 3 + 2] += 0.008 * scale * weight * weight;
  }
}

function findNippleCenter(
  positions: Float32Array,
  side: 1 | -1,
  bustY: number,
  scale: number,
): [number, number] {
  let best = -1;
  let bestZ = -Infinity;
  for (let i = 0; i < positions.length / 3; i += 1) {
    const x = positions[i * 3] * side;
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    if (
      x > 0.075 * scale &&
      x < 0.17 * scale &&
      y > bustY - 0.15 * scale &&
      y < bustY - 0.01 * scale &&
      z > 0.02
    ) {
      if (z > bestZ) {
        bestZ = z;
        best = i;
      }
    }
  }
  if (best >= 0) return [positions[best * 3], positions[best * 3 + 1]];
  return [side * 0.085 * scale, bustY - 0.05 * scale];
}

export function createAnatomicalFigure(
  metrics: BodyMetrics,
  pose: PoseKey = 'standard',
): AnatomicalFigure {
  const fitted = fitBody(metrics, pose);
  const data = fitted.data;
  const group = new THREE.Group();

  const material = new THREE.MeshPhysicalMaterial({
    color: BODY_COLOR,
    roughness: 0.58,
    metalness: 0.01,
    clearcoat: 0.08,
    clearcoatRoughness: 0.5,
    sheen: 0.12,
    sheenColor: new THREE.Color(0xe8d2c1),
    side: THREE.FrontSide,
  });
  const scale = metrics.height / 100 / META.baseHeight;
  const nippleLeft = findNippleCenter(
    fitted.positions,
    -1,
    fitted.landmarks.bust,
    scale,
  );
  const nippleRight = findNippleCenter(
    fitted.positions,
    1,
    fitted.landmarks.bust,
    scale,
  );
  const pelvisCenterY = fitted.landmarks.crotch + 0.04 * scale;
  const leanStrength = clamp((19 - metrics.bmi) / 4, 0, 1);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uNips = {
      value: new THREE.Vector4(
        nippleLeft[0],
        nippleLeft[1],
        nippleRight[0],
        nippleRight[1],
      ),
    };
    shader.uniforms.uPelvis = { value: new THREE.Vector2(0, pelvisCenterY) };
    shader.uniforms.uBone = {
      value: new THREE.Vector4(
        fitted.landmarks.bust,
        fitted.landmarks.hip,
        fitted.height,
        leanStrength,
      ),
    };
    shader.vertexShader =
      'varying vec3 vBodyPosition;\nvarying vec3 vSmoothNormal;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vBodyPosition = position;\n  vSmoothNormal = normalize(normalMatrix * normalize(vec3(position.x, 0.0, position.z + 0.001)));',
      );
    shader.fragmentShader =
      'uniform vec4 uNips;\nuniform vec2 uPelvis;\nuniform vec4 uBone;\nvarying vec3 vBodyPosition;\nvarying vec3 vSmoothNormal;\n' +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
  float front = smoothstep(-0.012, 0.04, vBodyPosition.z);
  float absX = abs(vBodyPosition.x);
  float lean = uBone.w;
  float clavicleY = uBone.z * 0.817;
  float clavicle = (1.0 - smoothstep(0.004, 0.022, abs(vBodyPosition.y - clavicleY - 0.015 * absX)))
    * smoothstep(0.02, 0.055, absX)
    * (1.0 - smoothstep(0.10, 0.15, absX))
    * front * lean;
  diffuseColor.rgb *= 1.0 - clavicle * 0.065;
  float hipBandY = uBone.y + 0.006;
  float hipBand = (1.0 - smoothstep(0.0, 0.026, abs(vBodyPosition.y - hipBandY + 0.018 * absX)))
    * smoothstep(0.045, 0.08, absX)
    * (1.0 - smoothstep(0.13, 0.17, absX))
    * front * lean;
  diffuseColor.rgb *= 1.0 - hipBand * 0.045;
  float underBustY = uBone.x - 0.075;
  float underBust = (1.0 - smoothstep(0.0, 0.032, abs(vBodyPosition.y - underBustY)))
    * smoothstep(0.02, 0.05, absX)
    * (1.0 - smoothstep(0.10, 0.14, absX))
    * front * lean;
  diffuseColor.rgb *= 1.0 - underBust * 0.03;`,
        )
        .replace(
          '#include <normal_fragment_begin>',
          `#include <normal_fragment_begin>
  float nipDistance = min(
    length(vec2(vBodyPosition.x - uNips.x, vBodyPosition.y - uNips.y)),
    length(vec2(vBodyPosition.x - uNips.z, vBodyPosition.y - uNips.w))
  );
  float nippleMask = (1.0 - smoothstep(0.022, 0.072, nipDistance)) * step(0.0, vBodyPosition.z);
  float pelvisDistance = length(vec2(vBodyPosition.x - uPelvis.x, vBodyPosition.y - uPelvis.y));
  float pelvisMask = (1.0 - smoothstep(0.025, 0.105, pelvisDistance)) * step(0.0, vBodyPosition.z);
  normal = normalize(mix(normal, normalize(vSmoothNormal), max(nippleMask, pelvisMask) * 0.92));`,
      );
  };
  material.customProgramCacheKey = () => 'suchi-body-smooth-v5';

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(fitted.positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const bustPoints = sliceHull(
    fitted.positions,
    data.suitTriangles,
    fitted.landmarks.bust,
  );
  const waistPoints = sliceHull(
    fitted.positions,
    data.suitTriangles,
    fitted.landmarks.waist,
  );
  const hipPoints = sliceHull(
    fitted.positions,
    data.suitTriangles,
    fitted.landmarks.hip,
  );

  const rings = [
    makeMeasurementRing(
      bustPoints,
      fitted.landmarks.bust + 0.003,
      0xb4553c,
    ),
    makeMeasurementRing(
      waistPoints,
      fitted.landmarks.waist + 0.003,
      0x5c7467,
    ),
    makeMeasurementRing(
      hipPoints,
      fitted.landmarks.hip + 0.003,
      0xae8548,
    ),
  ];
  const bustRing = rings[0];
  const waistRing = rings[1];
  const hipRing = rings[2];
  for (const ring of rings) {
    if (ring) group.add(ring.mesh);
  }

  const bustHull = convexHull(bustPoints);
  const waistHull = convexHull(waistPoints);
  const hipHull = convexHull(hipPoints);
  const maxBy = (hull: [number, number][]) =>
    hull.reduce((a, b) => (b[0] > a[0] ? b : a), hull[0] ?? [0, 0]);
  const minBy = (hull: [number, number][]) =>
    hull.reduce((a, b) => (b[0] < a[0] ? b : a), hull[0] ?? [0, 0]);

  const anchors: FigureAnchors = {
    top: new THREE.Vector3(0, fitted.height * 0.997, 0),
    bust: new THREE.Vector3(
      (maxBy(bustHull)[0] ?? 0) + 0.012,
      fitted.landmarks.bust,
      0.02,
    ),
    waist: new THREE.Vector3(
      (minBy(waistHull)[0] ?? 0) - 0.012,
      fitted.landmarks.waist,
      0.02,
    ),
    hip: new THREE.Vector3(
      (maxBy(hipHull)[0] ?? 0) + 0.012,
      fitted.landmarks.hip,
      -0.015,
    ),
  };

  const platform = createPlatform();
  group.add(platform);

  const disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [
    geometry,
    material,
  ];
  for (const ring of rings) {
    if (!ring) continue;
    disposables.push(ring.geometry, ring.material);
  }
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = object !== mesh;
    }
  });

  return {
    group,
    anchors,
    height: fitted.height,
    dispose: () => {
      group.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry?.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material?.dispose();
        }
      });
      for (const item of disposables) item.dispose();
    },
  };
}

export const BODY_ASSET_INFO = {
  source: META.source,
  baseHeight: META.baseHeight,
  feminine: META.feminine,
};
