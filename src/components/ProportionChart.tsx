import type { BodyGeometry, BodyMetrics } from '../domain/types';

interface ProportionChartProps {
  geometry: BodyGeometry;
  metrics: BodyMetrics;
}

type Point = { x: number; y: number };

function smoothPath(points: Point[], closed = false) {
  if (points.length < 2) return '';
  const list = closed ? [...points, points[0]] : points;
  let d = `M ${list[0].x.toFixed(2)} ${list[0].y.toFixed(2)}`;
  for (let i = 0; i < list.length - 1; i += 1) {
    const p0 = list[Math.max(0, i - 1)];
    const p1 = list[i];
    const p2 = list[i + 1];
    const p3 = list[Math.min(list.length - 1, i + 2)];
    const cp1 = {
      x: p1.x + (p2.x - p0.x) / 6,
      y: p1.y + (p2.y - p0.y) / 6,
    };
    const cp2 = {
      x: p2.x - (p3.x - p1.x) / 6,
      y: p2.y - (p3.y - p1.y) / 6,
    };
    d += ` C ${cp1.x.toFixed(2)} ${cp1.y.toFixed(2)} ${cp2.x.toFixed(
      2,
    )} ${cp2.y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  if (closed) d += ' Z';
  return d;
}

function limbPath(
  centerline: Point[],
  radii: number[],
  side: 1 | -1,
  fold: number,
) {
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i < centerline.length; i += 1) {
    const prev = centerline[Math.max(0, i - 1)];
    const next = centerline[Math.min(centerline.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = (-dy / length) * radii[i];
    const ny = (dx / length) * radii[i];
    left.push({
      x: centerline[i].x + nx * side * fold,
      y: centerline[i].y + ny * side * fold,
    });
    right.push({
      x: centerline[i].x - nx * side,
      y: centerline[i].y - ny * side,
    });
  }
  return smoothPath([...left, ...right.reverse()], true);
}

export function ProportionChart({
  geometry,
  metrics,
}: ProportionChartProps) {
  const width = 620;
  const height = 760;
  const floorY = 700;
  const topY = 52;
  const scale = (floorY - topY) / geometry.heightCm;
  const cx = 308;
  const cm = (value: number) => value * scale;
  const yAt = (fraction: number) => floorY - fraction * geometry.heightCm * scale;
  const l = geometry.landmarks;
  const half = geometry.half;

  const headY = yAt(l.headCenter);
  const headRx = cm(half.headWidth);
  const headRy = cm(half.headHeight);
  const shoulderY = yAt(l.shoulder);
  const armpitY = yAt(l.armpit);
  const bustY = yAt(l.bust);
  const underbustY = yAt(l.underbust);
  const waistY = yAt(l.waist);
  const hipY = yAt(l.hip);
  const crotchY = yAt(l.crotch);
  const neckY = yAt(l.neck);

  const torsoPoints: Point[] = [
    { x: cx + cm(half.shoulder), y: shoulderY + 4 },
    { x: cx + cm(half.bust * 1.035), y: armpitY + 8 },
    { x: cx + cm(half.bust), y: bustY },
    { x: cx + cm(half.waist * 1.09), y: underbustY + 4 },
    { x: cx + cm(half.waist), y: waistY },
    { x: cx + cm(half.hip * 0.995), y: hipY },
    { x: cx + cm(half.hip * 0.79), y: crotchY - 2 },
    { x: cx + 9, y: crotchY + 12 },
    { x: cx, y: crotchY + 17 },
    { x: cx - 9, y: crotchY + 12 },
    { x: cx - cm(half.hip * 0.79), y: crotchY - 2 },
    { x: cx - cm(half.hip * 0.995), y: hipY },
    { x: cx - cm(half.waist), y: waistY },
    { x: cx - cm(half.waist * 1.09), y: underbustY + 4 },
    { x: cx - cm(half.bust), y: bustY },
    { x: cx - cm(half.bust * 1.035), y: armpitY + 8 },
    { x: cx - cm(half.shoulder), y: shoulderY + 4 },
    { x: cx - cm(half.neck * 1.16), y: neckY + 1 },
    { x: cx, y: neckY - 10 },
    { x: cx + cm(half.neck * 1.16), y: neckY + 1 },
  ];

  const legTop = hipY + 18;
  const legPoints: Point[] = [
    { x: cx + cm(geometry.limbs.legCenterX), y: legTop },
    { x: cx + cm(geometry.limbs.legCenterX * 0.99), y: yAt(0.365) },
    { x: cx + cm(geometry.limbs.legCenterX * 0.96), y: yAt(0.285) },
    { x: cx + cm(geometry.limbs.legCenterX * 0.935), y: yAt(0.2) },
    { x: cx + cm(geometry.limbs.legCenterX * 0.9), y: yAt(0.1) },
    { x: cx + cm(geometry.limbs.legCenterX * 0.88), y: yAt(0.055) },
  ];
  const legRadii = [
    cm(geometry.limbs.thighRadius * 0.9),
    cm(geometry.limbs.thighRadius * 0.78),
    cm(geometry.limbs.thighRadius * 0.62),
    cm(geometry.limbs.calfRadius * 0.86),
    cm(geometry.limbs.calfRadius * 0.62),
    cm(geometry.limbs.ankleRadius),
  ];
  const leftLegPoints = legPoints.map((point) => ({
    x: cx - (point.x - cx),
    y: point.y,
  }));

  const armTop = shoulderY + 8;
  const armX = geometry.limbs.armCenterX * scale;
  const armCenter = [
    { x: cx + armX, y: armTop },
    { x: cx + armX + 5, y: (armTop + yAt(l.hip + 0.15)) / 2 },
    { x: cx + armX + 13, y: yAt(l.hip + 0.148) },
    { x: cx + armX + 23, y: yAt(l.hip + 0.06) },
  ];
  const armRadii = [
    cm(geometry.limbs.armRadius * 0.9),
    cm(geometry.limbs.armRadius),
    cm(geometry.limbs.elbowRadius),
    cm(geometry.limbs.wristRadius),
  ];
  const leftArmCenter = armCenter.map((point) => ({
    x: cx - (point.x - cx),
    y: point.y,
  }));

  const labelLeft = 62;
  const labelRight = 522;

  return (
    <div className="proportion-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`中国女性比例人台二维正视图，身高 ${metrics.height} 厘米，胸围 ${metrics.bust} 厘米，腰围 ${metrics.waist} 厘米，臀围 ${metrics.hip} 厘米`}
      >
        <defs>
          <linearGradient id="bodyFill" x1="0" y1="0" x2="1" y2="0.3">
            <stop offset="0%" stopColor="#d7b59f" />
            <stop offset="46%" stopColor="#cba78f" />
            <stop offset="100%" stopColor="#b99078" />
          </linearGradient>
          <linearGradient id="bodyEdge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#956e59" stopOpacity="0.48" />
            <stop offset="52%" stopColor="#8f6752" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#8f6752" stopOpacity="0.4" />
          </linearGradient>
          <radialGradient id="floorShadow">
            <stop offset="0%" stopColor="#62564a" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#62564a" stopOpacity="0" />
          </radialGradient>
          <filter id="softShadow" x="-40%" y="-20%" width="180%" height="160%">
            <feDropShadow
              dx="0"
              dy="7"
              stdDeviation="12"
              floodColor="#5e4e40"
              floodOpacity="0.16"
            />
          </filter>
        </defs>

        <g className="chart-grid">
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line
              key={fraction}
              x1="48"
              y1={topY + (floorY - topY) * fraction}
              x2="574"
              y2={topY + (floorY - topY) * fraction}
              stroke="#cfc7b8"
              strokeWidth="1"
              strokeDasharray="1 7"
              opacity="0.5"
            />
          ))}
          <line
            x1="48"
            y1={floorY + 2}
            x2="574"
            y2={floorY + 2}
            stroke="#aaa091"
            strokeWidth="1"
          />
          <text x="48" y={floorY + 24} className="chart-axis-label">
            FLOOR / 0
          </text>
          <text x="574" y={floorY + 24} textAnchor="end" className="chart-axis-label">
            UNIT · CM
          </text>
        </g>

        <g className="height-ruler">
          <line
            x1={labelLeft - 12}
            y1={topY}
            x2={labelLeft - 12}
            y2={floorY}
            stroke="#b6ad9e"
            strokeWidth="1"
          />
          {[0, 50, 100, 150].map((value) => {
            if (value > metrics.height) return null;
            const y = floorY - cm(value);
            return (
              <g key={value}>
                <line
                  x1={labelLeft - 17}
                  y1={y}
                  x2={labelLeft - 12}
                  y2={y}
                  stroke="#b6ad9e"
                />
                <text
                  x={labelLeft - 22}
                  y={y + 4}
                  textAnchor="end"
                  className="chart-ruler-label"
                >
                  {value}
                </text>
              </g>
            );
          })}
          <line
            x1={labelLeft - 21}
            y1={topY}
            x2={labelLeft - 3}
            y2={topY}
            stroke="#8f8374"
          />
        </g>

        <ellipse
          cx={cx}
          cy={floorY + 2}
          rx={cm(half.hip) * 1.45}
          ry="16"
          fill="url(#floorShadow)"
        />

        <g filter="url(#softShadow)">
          <path
            d={limbPath(leftArmCenter, armRadii, -1, 0.95)}
            fill="url(#bodyFill)"
            stroke="url(#bodyEdge)"
            strokeWidth="1"
          />
          <path
            d={limbPath(armCenter, armRadii, 1, 0.95)}
            fill="url(#bodyFill)"
            stroke="url(#bodyEdge)"
            strokeWidth="1"
          />
          <ellipse
            cx={armCenter[armCenter.length - 1].x + 2}
            cy={armCenter[armCenter.length - 1].y + 16}
            rx={cm(geometry.limbs.wristRadius) * 1.28}
            ry={cm(geometry.limbs.wristRadius) * 2.12}
            fill="url(#bodyFill)"
            stroke="url(#bodyEdge)"
            strokeWidth="1"
          />
          <ellipse
            cx={leftArmCenter[leftArmCenter.length - 1].x - 2}
            cy={leftArmCenter[leftArmCenter.length - 1].y + 16}
            rx={cm(geometry.limbs.wristRadius) * 1.28}
            ry={cm(geometry.limbs.wristRadius) * 2.12}
            fill="url(#bodyFill)"
            stroke="url(#bodyEdge)"
            strokeWidth="1"
          />

          <path
            d={limbPath(legPoints, legRadii, 1, 0.94)}
            fill="url(#bodyFill)"
            stroke="url(#bodyEdge)"
            strokeWidth="1"
          />
          <path
            d={limbPath(leftLegPoints, legRadii, -1, 0.94)}
            fill="url(#bodyFill)"
            stroke="url(#bodyEdge)"
            strokeWidth="1"
          />
          <path
            d={`M ${cx + cm(geometry.limbs.legCenterX) - cm(5.6)} ${yAt(
              0.045,
            )} Q ${cx + cm(geometry.limbs.legCenterX) - cm(4)} ${
              floorY - 1
            } ${cx + cm(geometry.limbs.legCenterX) + cm(1)} ${floorY - 1} L ${
              cx + cm(geometry.limbs.legCenterX) + cm(6.8)
            } ${floorY - 5} Q ${cx + cm(geometry.limbs.legCenterX) + cm(7)} ${
              yAt(0.05) - 9
            } ${cx + cm(geometry.limbs.legCenterX) + cm(2)} ${yAt(0.05)} Z`}
            fill="url(#bodyFill)"
            stroke="url(#bodyEdge)"
            strokeWidth="1"
          />
          <path
            d={`M ${cx - cm(geometry.limbs.legCenterX) + cm(5.6)} ${yAt(
              0.045,
            )} Q ${cx - cm(geometry.limbs.legCenterX) + cm(4)} ${
              floorY - 1
            } ${cx - cm(geometry.limbs.legCenterX) - cm(1)} ${floorY - 1} L ${
              cx - cm(geometry.limbs.legCenterX) - cm(6.8)
            } ${floorY - 5} Q ${cx - cm(geometry.limbs.legCenterX) - cm(7)} ${
              yAt(0.05) - 9
            } ${cx - cm(geometry.limbs.legCenterX) - cm(2)} ${yAt(0.05)} Z`}
            fill="url(#bodyFill)"
            stroke="url(#bodyEdge)"
            strokeWidth="1"
          />

          <path
            d={`M ${cx - cm(half.neck * 1.12)} ${neckY + 10} L ${cx - cm(
              half.neck * 1.08,
            )} ${headY + headRy * 0.52} Q ${cx} ${
              headY + headRy * 0.9
            } ${cx + cm(half.neck * 1.08)} ${headY + headRy * 0.52} L ${cx + cm(
              half.neck * 1.12,
            )} ${neckY + 10} Z`}
            fill="url(#bodyFill)"
            stroke="url(#bodyEdge)"
            strokeWidth="1"
          />

          <path
            d={smoothPath(torsoPoints, true)}
            fill="url(#bodyFill)"
            stroke="url(#bodyEdge)"
            strokeWidth="1.1"
          />

          <ellipse
            cx={cx}
            cy={headY + headRy * 0.015}
            rx={headRx * 1.08}
            ry={headRy * 1.03}
            fill="#5b4e45"
          />
          <ellipse
            cx={cx}
            cy={headY}
            rx={headRx}
            ry={headRy}
            fill="url(#bodyFill)"
            stroke="url(#bodyEdge)"
            strokeWidth="1"
          />
          <path
            d={`M ${cx - headRx * 1.03} ${headY - headRy * 0.13} Q ${
              cx - headRx * 0.95
            } ${headY - headRy * 0.64} ${cx - headRx * 0.48} ${
              headY - headRy * 0.88
            } Q ${cx} ${headY - headRy * 1.04} ${cx + headRx * 0.48} ${
              headY - headRy * 0.88
            } Q ${cx + headRx * 0.95} ${headY - headRy * 0.64} ${
              cx + headRx * 1.03
            } ${headY - headRy * 0.13} Q ${cx + headRx * 0.72} ${
              headY - headRy * 0.52
            } ${cx} ${headY - headRy * 0.58} Q ${cx - headRx * 0.72} ${
              headY - headRy * 0.52
            } ${cx - headRx * 1.03} ${headY - headRy * 0.13} Z`}
            fill="#5b4e45"
          />
        </g>

        <g className="measurement-lines">
          <line
            x1={cx - cm(half.waist) - 20}
            y1={waistY}
            x2={cx + cm(half.waist) + 24}
            y2={waistY}
            stroke="#5c7467"
            strokeWidth="1.25"
          />
          <circle cx={cx - cm(half.waist) - 20} cy={waistY} r="2.6" fill="#5c7467" />
          <circle cx={cx + cm(half.waist) + 24} cy={waistY} r="2.6" fill="#5c7467" />
          <text
            x={labelLeft}
            y={waistY + 4}
            className="chart-measure-label"
            fill="#5c7467"
          >
            腰 {metrics.waist.toFixed(1)}
          </text>

          <line
            x1={cx + cm(half.bust) + 18}
            y1={bustY}
            x2={labelRight}
            y2={bustY}
            stroke="#b4553c"
            strokeWidth="1.25"
            strokeDasharray="2 5"
          />
          <circle cx={cx + cm(half.bust) + 18} cy={bustY} r="2.6" fill="#b4553c" />
          <text
            x={labelRight + 8}
            y={bustY + 4}
            className="chart-measure-label"
            fill="#b4553c"
          >
            胸 {metrics.bust.toFixed(1)}
          </text>

          <line
            x1={cx + cm(half.hip) + 18}
            y1={hipY}
            x2={labelRight}
            y2={hipY}
            stroke="#ae8548"
            strokeWidth="1.25"
            strokeDasharray="2 5"
          />
          <circle cx={cx + cm(half.hip) + 18} cy={hipY} r="2.6" fill="#ae8548" />
          <text
            x={labelRight + 8}
            y={hipY + 4}
            className="chart-measure-label"
            fill="#ae8548"
          >
            臀 {metrics.hip.toFixed(1)}
          </text>

          <line
            x1={cx - cm(half.shoulder) - 28}
            y1={shoulderY}
            x2={cx + cm(half.shoulder) + 22}
            y2={shoulderY}
            stroke="#8f8374"
            strokeWidth="1"
            strokeDasharray="2 6"
          />
          <text
            x={labelLeft}
            y={shoulderY - 10}
            className="chart-measure-label chart-measure-label--muted"
          >
            肩 {metrics.shoulder.toFixed(1)}
          </text>

          <line
            x1={cx - cm(half.hip) - 68}
            y1={crotchY}
            x2={cx + cm(half.hip) + 58}
            y2={crotchY}
            stroke="#8f8374"
            strokeWidth="1"
            strokeDasharray="2 5"
          />
          <text
            x={labelLeft}
            y={crotchY - 9}
            className="chart-measure-label chart-measure-label--muted"
          >
            腿长 {metrics.legLength.toFixed(1)}
          </text>
        </g>

        <g className="chart-tag">
          <text x="48" y="36" className="chart-eyebrow">
            FRONT ELEVATION
          </text>
          <text x="574" y="36" textAnchor="end" className="chart-eyebrow">
            1 : {(100 / scale).toFixed(0)}
          </text>
          <text x="48" y="54" className="chart-title-small">
            二维正交比例图
          </text>
        </g>

        <text x={cx} y={floorY + 58} textAnchor="middle" className="chart-caption">
          {metrics.shapeName} · 腿身比 {(metrics.legRatio * 100).toFixed(1)}% ·
          头身比 {metrics.headToBody.toFixed(1)}
        </text>
      </svg>
      <div className="chart-note">
        <span className="chart-note-mark" />
        轮廓按输入围度与腿长生成，未做美化拉伸
      </div>
    </div>
  );
}
