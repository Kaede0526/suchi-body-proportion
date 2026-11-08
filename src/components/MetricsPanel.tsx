import type { BodyMetrics, PercentileResult } from '../domain/types';

interface MetricsPanelProps {
  metrics: BodyMetrics;
  lifeState: string;
  onOpenData: () => void;
}

function PercentileBar({
  label,
  result,
  accent,
}: {
  label: string;
  result: PercentileResult;
  accent?: boolean;
}) {
  return (
    <div className="percentile-row">
      <span className="percentile-row__label">{label}</span>
      <div className="percentile-row__track" aria-hidden="true">
        <span className="percentile-row__mid" />
        <span
          className={`percentile-row__fill ${accent ? 'is-accent' : ''}`}
          style={{ width: `${result.percentile}%` }}
        />
        <i
          className={`percentile-row__marker ${accent ? 'is-accent' : ''}`}
          style={{ left: `${result.percentile}%` }}
        />
      </div>
      <span className="percentile-row__value">
        {result.percentile}
        <em>%</em>
      </span>
    </div>
  );
}

function MetricStat({
  label,
  value,
  unit,
  meta,
}: {
  label: string;
  value: string;
  unit?: string;
  meta?: string;
}) {
  return (
    <div className="ratio-stat">
      <span>{label}</span>
      <strong>
        {value}
        {unit ? <em>{unit}</em> : null}
      </strong>
      {meta ? <small>{meta}</small> : null}
    </div>
  );
}

export function MetricsPanel({
  metrics,
  lifeState,
  onOpenData,
}: MetricsPanelProps) {
  const bmiPosition = Math.min(98, Math.max(2, ((metrics.bmi - 15) / 20) * 100));
  const measuredCount = Object.values(metrics.sources).filter(
    (source) => source === 'input',
  ).length;
  const estimatedCount = Object.values(metrics.sources).filter(
    (source) => source === 'estimate',
  ).length;
  const waistHigh = metrics.waist >= 85;
  const waistRatioHigh = metrics.whtr >= 0.5;
  const whrHigh = metrics.whr >= 0.85;

  return (
    <aside className="panel panel--metrics">
      <div className="panel__top">
        <div className="panel__heading">
          <span className="panel__index">03</span>
          <div>
            <h2>身体档案</h2>
            <p>数据、比例与参照位置</p>
          </div>
        </div>
        <button className="text-button" type="button" onClick={onOpenData}>
          数据说明
          <span>↗</span>
        </button>
      </div>

      <div className="panel__scroll metrics-scroll">
        {lifeState !== 'daily' ? (
          <div className="state-banner">
            <span className="state-banner__dot" />
            <div>
              <strong>情境预览 · {metrics.stateDelta.label}</strong>
              <p>
                腰围 {metrics.stateDelta.waist >= 0 ? '+' : ''}
                {metrics.stateDelta.waist} cm · 臀围{' '}
                {metrics.stateDelta.hip >= 0 ? '+' : ''}
                {metrics.stateDelta.hip} cm
              </p>
            </div>
            <span className="state-banner__tag">非预测</span>
          </div>
        ) : null}

        <section className="bmi-card">
          <div className="bmi-card__head">
            <div>
              <span className="card-kicker">BMI · 体重指数</span>
              <div className="bmi-value">
                <strong>{metrics.bmi.toFixed(1)}</strong>
                <span className={`bmi-badge bmi-badge--${metrics.bmiTone}`}>
                  {metrics.bmiLabel}
                </span>
              </div>
            </div>
            <div className="bmi-card__meta">
              <span>{metrics.height.toFixed(1)} cm</span>
              <i />
              <span>{metrics.weight.toFixed(1)} kg</span>
            </div>
          </div>
          <div className="bmi-scale" aria-hidden="true">
            <span className="bmi-scale__seg bmi-scale__seg--low" />
            <span className="bmi-scale__seg bmi-scale__seg--normal" />
            <span className="bmi-scale__seg bmi-scale__seg--high" />
            <span className="bmi-scale__seg bmi-scale__seg--very" />
            <i className="bmi-scale__marker" style={{ left: `${bmiPosition}%` }}>
              <b />
            </i>
          </div>
          <div className="bmi-scale__labels">
            <span>18.5</span>
            <span>24</span>
            <span>28</span>
            <span>35+</span>
          </div>
          <div className="bmi-bodyfat">
            <span className="bmi-bodyfat__label">
              体脂率 <em>BODY FAT</em>
            </span>
            <strong>
              {metrics.bodyFat.toFixed(1)}
              <em>%</em>
            </strong>
            <i
              className={
                metrics.bodyFatSource === 'input' ? 'is-input' : 'is-estimate'
              }
            >
              {metrics.bodyFatSource === 'input'
                ? '自填值'
                : '公式估算 ±4%'}
            </i>
          </div>
          <p className="bmi-card__note">
            依据 WS/T 428-2013 中国成人体重判定。BMI 不区分肌肉与脂肪；体脂率可在左侧“更多实测”自填覆盖，自填值会轻微影响体表厚度：低体脂略收窄，高体脂略丰满；不改围度数字。
          </p>
        </section>

        <section className="girth-section">
          <div className="section-caption">
            <span>核心围度</span>
            <small>cm</small>
          </div>
          <div className="girth-cards">
            {[
              {
                label: '胸围',
                key: 'bust' as const,
                value: metrics.bust,
              },
              {
                label: '腰围',
                key: 'waist' as const,
                value: metrics.waist,
              },
              {
                label: '臀围',
                key: 'hip' as const,
                value: metrics.hip,
              },
            ].map((item) => (
              <div className="girth-card" key={item.key}>
                <span>{item.label}</span>
                <strong>{item.value.toFixed(1)}</strong>
                <em
                  className={
                    metrics.sources[item.key] === 'input'
                      ? 'is-measured'
                      : 'is-estimated'
                  }
                >
                  {metrics.sources[item.key] === 'input' ? '实测' : '估算'}
                </em>
              </div>
            ))}
          </div>
          <div className="girth-extra">
            <span>肩宽 {metrics.shoulder.toFixed(1)}</span>
            <span>大腿 {metrics.thigh.toFixed(1)}</span>
            <span>小腿 {metrics.calf.toFixed(1)}</span>
            <span>上臂 {metrics.arm.toFixed(1)}</span>
          </div>
          <p className="girth-note">
            未填写的围度由模型推算；输入实测后替换。
          </p>
        </section>

        <section className={`shape-card shape-card--${metrics.shape}`}>
          <div className="shape-card__glyph" aria-hidden="true">
            <span>{metrics.shape}</span>
          </div>
          <div className="shape-card__copy">
            <span className="card-kicker">{metrics.shapeSubtitle}</span>
            <h3>{metrics.shapeName}</h3>
            <p>{metrics.shapeDescription}</p>
          </div>
        </section>

        <section className="ratio-section">
          <div className="section-caption">
            <span>比例读数</span>
            <small>RATIO</small>
          </div>
          <div className="ratio-grid">
            <MetricStat
              label="腰臀比"
              value={metrics.whr.toFixed(2)}
              meta={whrHigh ? '高于 0.85 参考线' : '低于 0.85 参考线'}
            />
            <MetricStat
              label="腰高比"
              value={metrics.whtr.toFixed(2)}
              meta={waistRatioHigh ? '高于 0.50 参考线' : '低于 0.50 参考线'}
            />
            <MetricStat
              label="腿身比"
              value={(metrics.legRatio * 100).toFixed(1)}
              unit="%"
              meta={`腿长 ${metrics.legLength.toFixed(1)} cm`}
            />
            <MetricStat
              label="头身比"
              value={metrics.headToBody.toFixed(1)}
              unit="头"
              meta="全身高度 / 头高"
            />
          </div>
        </section>

        <section className="percentile-section">
          <div className="section-caption">
            <span>人群参照</span>
            <small>P0 — P100</small>
          </div>
          <div className="percentile-list">
            <PercentileBar label="身高" result={metrics.percentiles.height} />
            <PercentileBar label="体重" result={metrics.percentiles.weight} />
            <PercentileBar
              label="BMI"
              result={metrics.percentiles.bmi}
              accent
            />
            <PercentileBar
              label="腰围"
              result={metrics.percentiles.waist}
              accent
            />
          </div>
          <p className="percentile-note">
            身高与体重按同年龄段女性参照；围度百分位为估算参考，不是官方百分位表。
          </p>
        </section>

        <section className="reference-note">
          <div className="reference-note__head">
            <span className="reference-note__mark">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M8 2.2v6.2M8 11.4v.8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.1"
                />
              </svg>
            </span>
            <strong>健康参考，不是诊断</strong>
          </div>
          <ul>
            <li
              className={
                waistHigh ? 'is-above' : 'is-below'
              }
            >
              腰围 {metrics.waist.toFixed(1)} cm，
              {waistHigh ? '已达到' : '低于'}中国女性中心性肥胖参考阈值 85 cm
            </li>
            <li className={waistRatioHigh ? 'is-above' : 'is-below'}>
              腰高比 {metrics.whtr.toFixed(2)}，
              {waistRatioHigh ? '高于' : '低于'} 0.50 风险参考线
            </li>
          </ul>
          {metrics.warnings.length > 0 ? (
            <div className="warning-list">
              {metrics.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
        </section>

        <section className="source-summary">
          <div>
            <span className="source-summary__dot" />
            <span>
              {measuredCount} 项实测 · {estimatedCount} 项估算
            </span>
          </div>
          <button type="button" onClick={onOpenData}>
            查看依据与误差
          </button>
        </section>
      </div>
    </aside>
  );
}
