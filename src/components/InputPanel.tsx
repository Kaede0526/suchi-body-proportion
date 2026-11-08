import { useState } from 'react';
import {
  ACTIVITIES,
  FAT_DISTRIBUTIONS,
  FRAMES,
  LIFE_STATES,
  OPTION_NOTES,
  PROPORTIONS,
  REGIONS,
} from '../domain/reference';
import type {
  ActivityKey,
  BodyInput,
  BodyMetrics,
  FatKey,
  FrameKey,
  LifeStateKey,
  ProportionKey,
  RegionKey,
} from '../domain/types';
import {
  MeasureField,
  RangeField,
  Segmented,
  SelectField,
} from './Controls';

interface InputPanelProps {
  input: BodyInput;
  metrics: BodyMetrics;
  update: <K extends keyof BodyInput>(key: K, value: BodyInput[K]) => void;
  onReset: () => void;
}

export function InputPanel({
  input,
  metrics,
  update,
  onReset,
}: InputPanelProps) {
  const [tab, setTab] = useState<'data' | 'context'>('data');
  const [moreOpen, setMoreOpen] = useState(false);
  const [proportionOpen, setProportionOpen] = useState(false);
  const isJin = input.weightUnit === 'jin';
  const displayWeight = isJin ? input.weight * 2 : input.weight;

  return (
    <aside className="panel panel--input">
      <div className="panel__top">
        <div className="panel__heading">
          <span className="panel__index">01</span>
          <div>
            <h2>身体数据</h2>
            <p>测量的每一项，都会改变比例</p>
          </div>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onReset}
          title="恢复示例数据"
          aria-label="恢复示例数据"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M4.3 7.4A6.2 6.2 0 1 1 3.8 11M4.3 7.4V3.8M4.3 7.4h3.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="panel-tabs" role="tablist" aria-label="输入分类">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'data'}
          className={tab === 'data' ? 'is-active' : ''}
          onClick={() => setTab('data')}
        >
          基础与围度
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'context'}
          className={tab === 'context' ? 'is-active' : ''}
          onClick={() => setTab('context')}
        >
          情境参考
          <span className="tab-dot" />
        </button>
      </div>

      <div className="panel__scroll">
        {tab === 'data' ? (
          <>
            <section className="input-section">
              <div className="input-section__title">
                <span>核心数据</span>
                <small>必填</small>
              </div>
              <RangeField
                label="身高"
                en="HEIGHT"
                value={input.height}
                displayValue={input.height}
                min={140}
                max={190}
                step={0.5}
                unit="cm"
                onChange={(value) => update('height', value)}
              />
              <div className="weight-unit-row">
                <span>体重单位</span>
                <div className="unit-switch">
                  <button
                    type="button"
                    className={!isJin ? 'is-active' : ''}
                    onClick={() => update('weightUnit', 'kg')}
                  >
                    kg
                  </button>
                  <button
                    type="button"
                    className={isJin ? 'is-active' : ''}
                    onClick={() => update('weightUnit', 'jin')}
                  >
                    斤
                  </button>
                </div>
              </div>
              <RangeField
                label="体重"
                en="WEIGHT"
                value={input.weight}
                displayValue={displayWeight}
                min={isJin ? 70 : 35}
                max={isJin ? 260 : 130}
                step={isJin ? 1 : 0.5}
                unit={isJin ? '斤' : 'kg'}
                onChange={(value) =>
                  update('weight', isJin ? value / 2 : value)
                }
              />
              <RangeField
                label="年龄"
                en="AGE"
                value={input.age}
                displayValue={input.age}
                min={18}
                max={60}
                step={1}
                unit="岁"
                onChange={(value) => update('age', value)}
              />
            </section>

            <section className="input-section">
              <div className="input-section__title">
                <span>关键围度</span>
                <small>留空则估算</small>
              </div>
              <div className="measure-list">
                <MeasureField
                  label="胸围"
                  en="BUST"
                  value={input.bust}
                  estimate={metrics.bust}
                  min={68}
                  max={135}
                  onChange={(value) => update('bust', value)}
                  hint="经过乳头点的水平围度，自然呼吸，不刻意挺胸。"
                />
                <MeasureField
                  label="腰围"
                  en="WAIST"
                  value={input.waist}
                  estimate={metrics.waist}
                  min={52}
                  max={140}
                  onChange={(value) => update('waist', value)}
                  hint="肋骨下缘与髂嵴之间的最细处，不要收腹。"
                />
                <MeasureField
                  label="臀围"
                  en="HIP"
                  value={input.hip}
                  estimate={metrics.hip}
                  min={70}
                  max={148}
                  onChange={(value) => update('hip', value)}
                  hint="臀部最丰满处的水平围度，双脚并拢。"
                />
              </div>
              <button
                className={`disclosure ${moreOpen ? 'is-open' : ''}`}
                type="button"
                onClick={() => setMoreOpen((value) => !value)}
                aria-expanded={moreOpen}
              >
                <span>更多实测</span>
                <small>肩宽 · 四肢 · 体脂率</small>
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <path
                    d="M2.5 4.5L6 8l3.5-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              {moreOpen ? (
                <div className="measure-list measure-list--compact">
                  <MeasureField
                    label="肩宽"
                    en="SHOULDER"
                    value={input.shoulder}
                    estimate={metrics.shoulder}
                    min={30}
                    max={52}
                    onChange={(value) => update('shoulder', value)}
                    hint="两侧肩峰点之间的直线距离。"
                  />
                  <MeasureField
                    label="下胸围"
                    en="UNDERBUST"
                    value={input.underbust}
                    estimate={metrics.underbust}
                    min={58}
                    max={120}
                    onChange={(value) => update('underbust', value)}
                  />
                  <MeasureField
                    label="大腿围"
                    en="THIGH"
                    value={input.thigh}
                    estimate={metrics.thigh}
                    min={38}
                    max={86}
                    onChange={(value) => update('thigh', value)}
                    hint="大腿根部最粗处的水平围度。"
                  />
                  <MeasureField
                    label="小腿围"
                    en="CALF"
                    value={input.calf}
                    estimate={metrics.calf}
                    min={24}
                    max={54}
                    onChange={(value) => update('calf', value)}
                  />
                  <MeasureField
                    label="上臂围"
                    en="ARM"
                    value={input.arm}
                    estimate={metrics.arm}
                    min={18}
                    max={46}
                    onChange={(value) => update('arm', value)}
                  />
                  <MeasureField
                    label="腕围"
                    en="WRIST"
                    value={input.wrist}
                    estimate={metrics.wrist}
                    min={11}
                    max={23}
                    onChange={(value) => update('wrist', value)}
                    hint="腕骨处的围度，可用于校准骨架大小。"
                  />
                  <MeasureField
                    label="体脂率"
                    en="BODY FAT"
                    value={input.bodyFat}
                    estimate={metrics.bodyFat}
                    min={5}
                    max={60}
                    unit="%"
                    statusLabel="自填"
                    onChange={(value) => update('bodyFat', value)}
                    hint="可填体脂秤、BIA 或 DEXA 的结果；不同测量方式差异较大。"
                  />
                </div>
              ) : null}
            </section>

            <section className="input-section">
              <button
                className={`disclosure ${proportionOpen ? 'is-open' : ''}`}
                type="button"
                onClick={() => setProportionOpen((value) => !value)}
                aria-expanded={proportionOpen}
              >
                <span>比例实测</span>
                <small>腿长 · 头高</small>
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <path
                    d="M2.5 4.5L6 8l3.5-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              {proportionOpen ? (
                <div className="measure-list measure-list--compact">
                  <MeasureField
                    label="腿长"
                    en="LEG"
                    value={input.legLength}
                    estimate={metrics.legLength}
                    min={60}
                    max={110}
                    onChange={(value) => update('legLength', value)}
                    hint="裆点至地面的垂直距离。"
                  />
                  <MeasureField
                    label="头高"
                    en="HEAD"
                    value={input.headHeight}
                    estimate={metrics.headHeight}
                    min={16}
                    max={28}
                    onChange={(value) => update('headHeight', value)}
                    hint="下巴至头顶的垂直距离。"
                  />
                </div>
              ) : null}
            </section>

            <div className="input-hint">
              <span className="input-hint__mark">i</span>
              空白项由身高、体重、年龄和情境共同估算，并用“估算”标记。实测值会锁定基准；若选择生活状态，会叠加该情境的方向性修正。
            </div>
          </>
        ) : (
          <>
            <section className="input-section">
              <div className="input-section__title">
                <span>人群参照</span>
                <small>不改变真实测量</small>
              </div>
              <SelectField<RegionKey>
                label="地域"
                value={input.region}
                options={REGIONS.map((region) => ({
                  value: region.value,
                  label: region.label,
                  note: region.note,
                }))}
                onChange={(value) => update('region', value)}
                note={OPTION_NOTES.region}
              />
              <Segmented<FrameKey>
                label="骨架大小"
                options={FRAMES}
                value={input.frame}
                onChange={(value) => update('frame', value)}
              />
            </section>

            <section className="input-section">
              <div className="input-section__title">
                <span>日常状态</span>
                <small>长期倾向</small>
              </div>
              <Segmented<ActivityKey>
                label="活动量"
                options={ACTIVITIES}
                value={input.activity}
                onChange={(value) => update('activity', value)}
                columns={2}
              />
              <Segmented<FatKey>
                label="脂肪分布倾向"
                options={FAT_DISTRIBUTIONS}
                value={input.fat}
                onChange={(value) => update('fat', value)}
              />
              <p className="field-note">{OPTION_NOTES.fat}</p>
            </section>

            <section className="input-section">
              <div className="input-section__title">
                <span>比例倾向</span>
                <small>可由实测覆盖</small>
              </div>
              <Segmented<ProportionKey>
                options={PROPORTIONS.map(({ value, label }) => ({
                  value,
                  label,
                }))}
                value={input.proportion}
                onChange={(value) => update('proportion', value)}
                columns={2}
              />
              <p className="field-note">{OPTION_NOTES.proportion}</p>
            </section>

            <section className="input-section">
              <div className="input-section__title">
                <span>生活状态</span>
                <small>短时 / 阶段</small>
              </div>
              <div className="state-grid">
                {LIFE_STATES.map((state) => (
                  <button
                    key={state.value}
                    type="button"
                    className={`state-card ${
                      input.lifeState === state.value ? 'is-active' : ''
                    }`}
                    onClick={() =>
                      update('lifeState', state.value as LifeStateKey)
                    }
                    aria-pressed={input.lifeState === state.value}
                  >
                    <span>{state.label}</span>
                    <em>{state.short}</em>
                  </button>
                ))}
              </div>
              <p className="state-description">
                {
                  LIFE_STATES.find((state) => state.value === input.lifeState)
                    ?.description
                }
              </p>
              <p className="field-note">{OPTION_NOTES.lifeState}</p>
            </section>
          </>
        )}
      </div>

      <div className="panel__footer">
        <span className="local-dot" />
        数据只在本机计算
        <span className="panel__footer-sep">·</span>
        <span>不用于医学诊断</span>
      </div>
    </aside>
  );
}
