import { useEffect, useMemo, useRef, useState } from 'react';
import { BodyStage, type BodyStageHandle, type CameraPreset } from './components/BodyStage';
import { DataDialog } from './components/DataDialog';
import { InputPanel } from './components/InputPanel';
import { MetricsPanel } from './components/MetricsPanel';
import { ProportionChart } from './components/ProportionChart';
import {
  calculateMetrics,
  buildGeometry,
} from './domain/anthropometry';
import { DEFAULT_INPUT, LIFE_STATES } from './domain/reference';
import type { BodyInput, PoseKey, ViewMode } from './domain/types';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function trimTransparent(image: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const alpha = data[(y * canvas.width + x) * 4 + 3];
      if (alpha > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return canvas;
  const padding = 12;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(canvas.width - 1, maxX + padding);
  maxY = Math.min(canvas.height - 1, maxY + padding);
  const cropped = document.createElement('canvas');
  cropped.width = maxX - minX + 1;
  cropped.height = maxY - minY + 1;
  const croppedCtx = cropped.getContext('2d');
  if (!croppedCtx) return canvas;
  croppedCtx.drawImage(
    canvas,
    minX,
    minY,
    cropped.width,
    cropped.height,
    0,
    0,
    cropped.width,
    cropped.height,
  );
  return cropped;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export default function App() {
  const [input, setInput] = useState<BodyInput>(DEFAULT_INPUT);
  const [view, setView] = useState<ViewMode>('three');
  const [preset, setPreset] = useState<CameraPreset>('front');
  const [pose, setPose] = useState<PoseKey>('standard');
  const [dataOpen, setDataOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const bodyStageRef = useRef<BodyStageHandle>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  const metrics = useMemo(() => calculateMetrics(input), [input]);
  const geometry = useMemo(() => buildGeometry(metrics), [metrics]);
  const currentState = LIFE_STATES.find(
    (state) => state.value === input.lifeState,
  );

  const update = <K extends keyof BodyInput>(
    key: K,
    value: BodyInput[K],
  ) => {
    setInput((previous) => ({ ...previous, [key]: value }));
  };

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!exportOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [exportOpen]);

  const exportJson = () => {
    const payload = {
      app: '素尺 · 中国女性比例参照',
      exportedAt: new Date().toISOString(),
      profile: input,
      metrics,
      disclaimer:
        '本数据由本地模型计算；估算围度不是实测，不构成医学诊断。数据来源见应用内“数据说明”。',
    };
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json;charset=utf-8',
      }),
      `素尺-身体档案-${metrics.height.toFixed(0)}cm.json`,
    );
    setExportOpen(false);
    setToast('身体档案已导出');
  };

  const exportImage = async () => {
    const snapshot = bodyStageRef.current?.capture();
    if (!snapshot) {
      setToast('请切换到 3D 人台后导出图像');
      return;
    }
    const rawImage = await loadImage(snapshot);
    const trimmed = trimTransparent(rawImage);
    const image = await loadImage(trimmed.toDataURL('image/png'));
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const paper = '#f3efe6';
    const ink = '#1f1d19';
    const muted = '#746d61';
    const accent = '#b4553c';
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createRadialGradient(1100, 520, 100, 1100, 520, 650);
    gradient.addColorStop(0, 'rgba(255,255,255,0.58)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(120,108,92,0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(120,108,92,0.28)';
    ctx.beginPath();
    ctx.arc(1120, 535, 390, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(1120, 535, 300, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.font = '500 17px "PingFang SC", sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('SUCHI / 中国女性比例参照', 92, 86);
    ctx.fillStyle = ink;
    ctx.font = '600 72px "Songti SC", "STSong", serif';
    ctx.fillText('素尺', 88, 168);
    ctx.font = '400 25px "PingFang SC", sans-serif';
    ctx.fillStyle = muted;
    ctx.fillText('把身体，放回真实的尺度。', 92, 212);

    ctx.strokeStyle = 'rgba(70,62,52,0.25)';
    ctx.beginPath();
    ctx.moveTo(92, 255);
    ctx.lineTo(700, 255);
    ctx.stroke();

    const drawMetric = (
      label: string,
      value: string,
      unit: string,
      x: number,
      y: number,
    ) => {
      ctx.fillStyle = muted;
      ctx.font = '400 16px "PingFang SC", sans-serif';
      ctx.fillText(label, x, y);
      ctx.fillStyle = ink;
      ctx.font = '500 44px "Songti SC", "STSong", serif';
      ctx.fillText(value, x, y + 50);
      ctx.fillStyle = muted;
      ctx.font = '400 15px "PingFang SC", sans-serif';
      ctx.fillText(unit, x, y + 74);
    };

    drawMetric('身高', metrics.height.toFixed(1), 'cm', 92, 315);
    drawMetric('体重', metrics.weight.toFixed(1), 'kg', 270, 315);
    drawMetric('BMI', metrics.bmi.toFixed(1), metrics.bmiLabel, 448, 315);
    drawMetric('胸围', metrics.bust.toFixed(1), 'cm', 92, 445);
    drawMetric('腰围', metrics.waist.toFixed(1), 'cm', 270, 445);
    drawMetric('臀围', metrics.hip.toFixed(1), 'cm', 448, 445);

    ctx.fillStyle = accent;
    ctx.font = '500 14px "PingFang SC", sans-serif';
    ctx.fillText('BODY SHAPE', 92, 570);
    ctx.fillStyle = ink;
    ctx.font = '500 38px "Songti SC", "STSong", serif';
    ctx.fillText(`${metrics.shape} · ${metrics.shapeName}`, 92, 615);
    ctx.fillStyle = muted;
    ctx.font = '400 16px "PingFang SC", sans-serif';
    ctx.fillText(
      `腰臀比 ${metrics.whr.toFixed(2)}  ·  腰高比 ${metrics.whtr.toFixed(2)}  ·  腿身比 ${(
        metrics.legRatio * 100
      ).toFixed(1)}%`,
      92,
      650,
    );
    ctx.fillText(
      `体脂率 ${metrics.bodyFat.toFixed(1)}%  ·  ${
        metrics.bodyFatSource === 'input' ? '自填值' : 'Deurenberg 估算'
      }`,
      92,
      678,
    );

    ctx.strokeStyle = 'rgba(70,62,52,0.2)';
    ctx.beginPath();
    ctx.moveTo(92, 710);
    ctx.lineTo(700, 710);
    ctx.stroke();

    ctx.fillStyle = muted;
    ctx.font = '400 15px "PingFang SC", sans-serif';
    const noteLines = [
      '根据身高、体重、可选围度与情境参数生成参数化比例人台。',
      '未做拉腿、瘦腰或丰胸处理；估算项不等同于实测。',
      '数据仅作比例观察，不构成医学诊断，也不定义“标准身材”。',
    ];
    noteLines.forEach((line, index) => {
      ctx.fillText(line, 92, 752 + index * 26);
    });

    const frameX = 820;
    const frameY = 90;
    const frameW = 690;
    const frameH = 910;
    drawRoundedRect(ctx, frameX, frameY, frameW, frameH, 24);
    ctx.fillStyle = 'rgba(232,226,215,0.62)';
    ctx.fill();

    const maxW = frameW - 48;
    const maxH = frameH - 64;
    const ratio = Math.min(maxW / image.width, maxH / image.height);
    const drawW = image.width * ratio;
    const drawH = image.height * ratio;
    ctx.drawImage(
      image,
      frameX + (frameW - drawW) / 2,
      frameY + (frameH - drawH) / 2,
      drawW,
      drawH,
    );

    ctx.fillStyle = ink;
    ctx.font = '500 15px "PingFang SC", sans-serif';
    ctx.fillText(`${metrics.height.toFixed(1)} cm`, 1440, 76);

    ctx.fillStyle = muted;
    ctx.font = '400 13px "PingFang SC", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(
      `素尺 · ${new Date().toLocaleDateString('zh-CN')} · 本地生成`,
      1510,
      1058,
    );
    ctx.textAlign = 'left';

    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(
          blob,
          `素尺-比例画像-${metrics.height.toFixed(0)}cm.png`,
        );
        setToast('比例画像已导出');
      }
    }, 'image/png');
    setExportOpen(false);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 38 38">
              <circle cx="19" cy="19" r="17.5" fill="none" stroke="currentColor" strokeWidth="1" />
              <path
                d="M12 12.5h14M12 19h10M12 25.5h14"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <circle cx="27" cy="19" r="1.6" fill="currentColor" />
            </svg>
          </div>
          <div className="brand-copy">
            <strong>素尺</strong>
            <span>SUCHI · 中国女性比例参照</span>
          </div>
        </div>

        <div className="topbar-note">
          <span className="live-dot" />
          本地实时建模
          <i />
          无美颜
          <i />
          无拉腿
        </div>

        <div className="topbar-actions">
          <button
            className="text-button text-button--top"
            type="button"
            onClick={() => setDataOpen(true)}
          >
            数据说明
          </button>
          <div className="export-wrap" ref={exportMenuRef}>
            <button
              className="primary-button primary-button--small"
              type="button"
              onClick={() => setExportOpen((open) => !open)}
              aria-expanded={exportOpen}
            >
              <svg viewBox="0 0 18 18" aria-hidden="true">
                <path
                  d="M9 2.5v8.2m0 0L5.9 7.6M9 10.7l3.1-3.1M3.2 12.2v2.4h11.6v-2.4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              导出
            </button>
            {exportOpen ? (
              <div className="export-menu">
                <button type="button" onClick={exportImage} disabled={view !== 'three'}>
                  <span>
                    <strong>导出比例画像</strong>
                    <em>
                      {view === 'three'
                        ? 'PNG · 含身体数据与比例'
                        : '请切换到 3D 人台'}
                    </em>
                  </span>
                  <b>PNG</b>
                </button>
                <button type="button" onClick={exportJson}>
                  <span>
                    <strong>导出身体档案</strong>
                    <em>JSON · 含输入、指标与来源说明</em>
                  </span>
                  <b>JSON</b>
                </button>
                <p>文件在本机生成，不会上传。</p>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="workspace">
        <InputPanel
          input={input}
          metrics={metrics}
          update={update}
          onReset={() => setInput(DEFAULT_INPUT)}
        />

        <section className="stage-panel">
          <div className="stage-head">
            <div className="stage-heading">
              <span className="eyebrow">02 · LIVE MODEL</span>
              <h1>{view === 'three' ? '参数化比例人台' : '二维正交比例'}</h1>
              <p>
                {view === 'three'
                  ? '按实测围度拟合成熟人体网格，镜头不做广角拉伸'
                  : '正视图按统一比例尺绘制，适合核对纵向关系'}
              </p>
            </div>
            <div className="stage-actions">
              <div className="view-tabs" role="tablist" aria-label="视图类型">
                <button
                  type="button"
                  className={view === 'three' ? 'is-active' : ''}
                  onClick={() => setView('three')}
                  role="tab"
                  aria-selected={view === 'three'}
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path
                      d="M8 1.8l5.3 3v6.4L8 14.2l-5.3-3V4.8L8 1.8zM8 8l5.3-3.2M8 8L2.7 4.8M8 8v6.2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinejoin="round"
                    />
                  </svg>
                  3D 人台
                </button>
                <button
                  type="button"
                  className={view === 'two' ? 'is-active' : ''}
                  onClick={() => setView('two')}
                  role="tab"
                  aria-selected={view === 'two'}
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path
                      d="M4 2.2h8M4 13.8h8M8 2.2v11.6M4 5.2h8M4 10.8h8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                    />
                  </svg>
                  二维比例
                </button>
              </div>
              {view === 'three' ? (
                <div className="camera-tabs" aria-label="相机视角">
                  {(
                    [
                      ['front', '正视'],
                      ['side', '侧视'],
                      ['angle', '45°'],
                    ] as [CameraPreset, string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={preset === value ? 'is-active' : ''}
                      onClick={() => setPreset(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
              {view === 'three' ? (
                <div className="pose-tabs" aria-label="人台姿态">
                  <span>姿态</span>
                  {(
                    [
                      ['standard', '标准'],
                      ['natural', '自然'],
                      ['tiptoe', '踮脚'],
                    ] as [PoseKey, string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={pose === value ? 'is-active' : ''}
                      onClick={() => setPose(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className={`stage-viewport stage-viewport--${view}`}>
            {view === 'three' ? (
              <div className="stage-head-meta">
                <div className="stage-stat">
                  <span>身高</span>
                  <strong>{metrics.height.toFixed(1)}</strong>
                  <em>cm</em>
                </div>
                <div className="stage-stat">
                  <span>体重</span>
                  <strong>{metrics.weight.toFixed(1)}</strong>
                  <em>kg</em>
                </div>
                <div className="stage-stat stage-stat--muted">
                  <span>状态</span>
                  <strong>{currentState?.label}</strong>
                  <em>{currentState?.short}</em>
                </div>
              </div>
            ) : null}

            {view === 'three' ? (
              <BodyStage
                ref={bodyStageRef}
                metrics={metrics}
                preset={preset}
                pose={pose}
              />
            ) : (
              <ProportionChart geometry={geometry} metrics={metrics} />
            )}

            <div className="stage-caption">
              <span className="stage-caption__index">FIG. 01</span>
              <span>
                {view === 'three'
                  ? `${
                      pose === 'standard'
                        ? '标准 A 姿 · 自然呼吸 · 正交参照'
                        : pose === 'natural'
                          ? '自然站姿 · 双臂下垂 · 双腿并拢'
                          : '踮脚站姿 · 脚尖着地 · 视觉抬升'
                    }${metrics.bmi < 18.5 ? ' · 低 BMI 视觉精瘦' : ''}`
                  : '二维正视图 · 同一比例尺'}
              </span>
            </div>
            <div className="stage-watermark" aria-hidden="true">
              SUCHI / 素尺
            </div>
          </div>

          <div className="stage-footer">
            <div className="stage-footer__group">
              <span className="footer-label">参照人群</span>
              <strong>18–60 岁中国女性参照</strong>
              <span className="footer-divider" />
              <span className="footer-label">视图</span>
              <strong>{view === 'three' ? '参数化人台' : '正交比例图'}</strong>
            </div>
            <div className="stage-footer__group stage-footer__group--right">
              <span className="footer-label">当前体型</span>
              <span className={`footer-shape footer-shape--${metrics.shape}`}>
                {metrics.shape} · {metrics.shapeName}
              </span>
            </div>
          </div>
        </section>

        <MetricsPanel
          metrics={metrics}
          lifeState={input.lifeState}
          onOpenData={() => setDataOpen(true)}
        />
      </main>

      <DataDialog open={dataOpen} onClose={() => setDataOpen(false)} />
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
