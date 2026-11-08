import { useEffect } from 'react';

interface DataDialogProps {
  open: boolean;
  onClose: () => void;
}

export function DataDialog({ open, onClose }: DataDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="data-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="data-dialog__top">
          <div>
            <span className="eyebrow">DATA & METHOD</span>
            <h2 id="data-dialog-title">数字从哪里来</h2>
          </div>
          <button
            className="dialog-close"
            type="button"
            onClick={onClose}
            aria-label="关闭数据说明"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M4.5 4.5l11 11m0-11l-11 11"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="data-dialog__intro">
          <p>
            素尺把“已公布的人群统计”和“模型估算”分开呈现。身高、体重与健康阈值有公开来源；
            胸腰臀和四肢围度则是模型估算，不是官方公布的全国均值。所有围度都可以被实测值覆盖，
            没有被覆盖的数字，不会被包装成精确测量。
          </p>
          <div className="legend-row">
            <span>
              <i className="legend-dot legend-dot--input" />
              实测
            </span>
            <span>
              <i className="legend-dot legend-dot--estimate" />
              模型估算
            </span>
            <span>
              <i className="legend-dot legend-dot--ref" />
              标准 / 文献参照
            </span>
          </div>
        </div>

        <div className="data-dialog__grid">
          <section className="source-block">
            <span className="eyebrow">VERIFIED ANCHORS</span>
            <h3>人群锚点</h3>
            <div className="source-item">
              <span className="source-item__index">01</span>
              <div>
                <strong>《中国居民营养与慢性病状况报告（2020年）》</strong>
                <p>
                  国家卫生健康委员会发布。18–44 岁中国女性平均身高 158.0 cm；
                  18 岁及以上女性平均体重 59 kg。用于身高、体重参照锚点。
                </p>
                <em>官方报告 · 2020</em>
              </div>
            </div>
            <div className="source-item">
              <span className="source-item__index">02</span>
              <div>
                <strong>《第五次国民体质监测公报》</strong>
                <p>
                  国家体育总局发布。20–24 岁女性平均身高 160.6 cm；
                  成年女性身高随年龄增长呈下降趋势。用于按年龄平滑的参照均值。
                </p>
                <em>官方监测 · 2021</em>
              </div>
            </div>
            <div className="source-item">
              <span className="source-item__index">03</span>
              <div>
                <strong>WS/T 428-2013《成人体重判定》</strong>
                <p>
                  BMI 分类：18.5 / 24 / 28；中国女性腰围 85 cm
                  作为中心性肥胖参考阈值。用于健康参考提示，不用于诊断。
                </p>
                <em>卫生行业标准 · 2013</em>
              </div>
            </div>
            <div className="source-item">
              <span className="source-item__index">04</span>
              <div>
                <strong>Deurenberg 体脂估算公式</strong>
                <p>
                  由 BMI、年龄和性别推算体脂率。个体误差通常较大，页面标注约
                  ±4%，只用于趋势参考。可在“更多实测”中填写体脂秤 / BIA / DEXA
                  结果覆盖估算；自填值会轻微改变 3D 体表厚度（低体脂略收窄、高体脂略丰满），但不改变胸腰臀或 BMI 数字。
                </p>
                <em>British Journal of Nutrition · 1991</em>
              </div>
            </div>
            <div className="source-item">
              <span className="source-item__index">05</span>
              <div>
                <strong>MakeHuman hm08 / MPFB2 基础人体</strong>
                <p>
                  CC0 公共领域人体网格与形态目标，经 naver/anny 与 three.ws
                  整理后使用。仅用于离线参数化比例人台；原始文件与许可见项目 assets 目录。
                </p>
                <em>CC0 1.0 · MakeHuman / MPFB2</em>
              </div>
            </div>
          </section>

          <section className="source-block">
            <span className="eyebrow">MODEL ESTIMATES</span>
            <h3>模型估算</h3>
            <div className="source-callout">
              <strong>三围、肩宽与四肢围度</strong>
              <p>
                基础锚点采用公开人体测量文献的常见区间，并按身高、体重、年龄与骨架进行
                回归式缩放。它们不是官方公布的全国均值，也不是你的实测数据。
              </p>
            </div>
            <div className="source-callout">
              <strong>区域选项暂不参与几何修正</strong>
              <p>
                当前没有足够可靠、可公开核验的“性别 × 年龄段 × 地区”围度表。
                因此地域只作为档案标签，避免虚构地区差异。这是刻意的数据缺口，不是遗漏。
              </p>
            </div>
            <div className="source-callout">
              <strong>生活状态是情境预览</strong>
              <p>
                经期、久坐、运动后等状态使用小幅度的方向性修正，表达短时或阶段性差异。
                它们不是对个人未来围度的预测，也不构成医学建议。
              </p>
            </div>
            <div className="source-callout">
              <strong>三维人台是测量拟合，不是扫描</strong>
              <p>
                基础人体来自 MakeHuman hm08 / MPFB2（CC0）。应用用胸、腰、臀、四肢与身高
                目标驱动一组形态参数，再按你的腿长做轻度比例校正。人台采用无衣物、无毛发的
                平滑体表，不渲染乳头或生殖器细节；它不具备人体扫描精度。
                3D 支持标准 A 姿、自然站姿和踮脚站姿；踮脚只改变视觉高度，不计入身高数据。
                当 BMI 低于 18.5 时，3D 会自动启用低体重视觉精瘦，不改变任何读数。
              </p>
            </div>
          </section>
        </div>

        <div className="data-dialog__footer">
          <p>
            身体数据只在浏览器内计算，不上传服务器。素尺不提供诊断、治疗方案或体重目标。
          </p>
          <button type="button" className="primary-button" onClick={onClose}>
            我了解了
          </button>
        </div>
      </div>
    </div>
  );
}
