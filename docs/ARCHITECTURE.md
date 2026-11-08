# 架构与实现

本文说明素尺的数据流、3D 拟合方式和构建产物。数据口径见 [DATA.md](DATA.md)，贡献规范见 [../CONTRIBUTING.md](../CONTRIBUTING.md)。

## 总览

素尺是纯前端应用，没有后端和数据库：

```text
React 表单
  → src/domain/anthropometry.ts
  → 2D SVG（ProportionChart）
  → 3D 人台（anatomicalFigure + BodyStage）
  → PNG / JSON 导出
```

所有数值和几何都在浏览器内计算，刷新即清空。

## 技术栈

| 层 | 实现 |
|---|---|
| UI | React 19 + TypeScript |
| 构建 | Vite 7 + `vite-plugin-singlefile` |
| 3D | Three.js，OrthographicCamera、MeshPhysicalMaterial、程序化测量环 |
| 2D | 原生 SVG |
| 测试 | Vitest |
| 样式 | 单份 `src/styles.css`，无 UI 框架 |

## 目录

```text
src/
├─ domain/
│  ├─ anthropometry.ts    # 输入校验、围度估算、比例、体型、百分位、2D 几何
│  ├─ reference.ts        # 选项、锚点、情境修正、来源说明
│  └─ types.ts            # BodyInput / BodyMetrics / PoseKey
├─ three/
│  ├─ anatomicalFigure.ts # 形态拟合、姿态、体脂/低 BMI 修正、测量环、材质
│  └─ bodyData.ts         # 由脚本生成的紧凑二进制资产（base64）
├─ components/
│  ├─ BodyStage.tsx       # Three.js 场景、相机、光照、标签投影
│  ├─ ProportionChart.tsx # 2D 正交视图
│  ├─ InputPanel.tsx      # 身体数据与情境
│  ├─ MetricsPanel.tsx    # BMI、围度、比例、百分位
│  ├─ DataDialog.tsx      # 数据来源与建模说明
│  └─ Controls.tsx        # RangeField / MeasureField
├─ App.tsx                # 全局状态、视图切换、导出
└─ styles.css
```

## 数据流

1. `InputPanel` 产生 `BodyInput`；
2. `calculateMetrics` 校验输入、估算缺失围度、应用情境修正，得到 `BodyMetrics`；
3. `proportionGeometry` 生成同一比例尺下的 2D 轮廓与测量线；
4. `createAnatomicalFigure` 用身高、围度、体脂与姿态生成 3D 人台；
5. `App` 负责 PNG / JSON 导出。

### 估算与实测

- 没有填写的围度由身高、体重、年龄、骨架、活动量和脂肪分布估算；
- 填写的围度覆盖估算，UI 标记为“实测”；
- 百分位是近似分布，不是官方百分位表；
- 地域选择不改变几何，因为缺少可核验的地区 × 性别 × 年龄围度表。

## 3D 资产

`assets/parametric-base.glb` 是 MakeHuman hm08 / MPFB2 基础人体（CC0），经 `scripts/build_body_asset.py` 转成 `src/three/bodyData.ts`。

脚本只保留应用需要的部分：

- 基础顶点位置（`bodyFeminine = 0.7` 烘焙）；
- 三角形索引；
- 躯干/骨盆 mask；
- 22 个稀疏形态目标；
- 用于姿态的左右手臂/腿/脚权重；
- 邻接表、地标高度、基础围度。

数据以 **base64 编码的紧凑二进制** 内联到 TS 模块中，避免运行时网络请求。生成后的 `bodyData.ts` 已提交，普通构建不需要 Python。

### 拟合流程

`fitBody` 大致执行：

1. 按身高缩放；
2. 用胸、腰、臀目标做初始形态拟合；
3. 实时截面测量、迭代校正；
4. 肩、腿、手臂、小腿的辅助形态；
5. 腿长比例校正；
6. 体脂/低 BMI 的视觉修正；
7. 姿态变形（自然站姿 / 踮脚）；
8. 骨盆平滑和测量环。

**重要**：围度数字和 3D 体表是两套东西。体脂、低 BMI 精瘦、姿态只改变 3D 呈现，不改变 `BodyMetrics` 中的读数。

### 姿态

- 自然站姿：用原始蒙皮权重旋转肩、髋，让手臂下垂、双腿并拢；
- 踮脚：在自然站姿上旋转脚部、抬升到脚尖接触地面；
- 站立姿态不影响胸腰臀测量环。

### 材质与非写实边界

- 无衣物、无毛发、无性征细节；
- 胸部、骨盆用局部法线和几何平滑隐藏乳头/生殖器细节；
- 不提供写实裸露或性化渲染；
- 所有光影和姿态都是风格化示意。

## 2D 几何

`proportionGeometry` 不依赖 3D 数据，使用统一比例尺生成：

- 正面轮廓；
- 胸、腰、臀测量线；
- 身高尺、腿长、头高；
- 图像导出所需的坐标。

因此 2D 和 3D 的读数保持一致，但 2D 不受 3D 姿态影响。

## 构建与部署

```bash
npm run build
```

`vite-plugin-singlefile` 将 JS、CSS 和内联资产打包为一个 `dist/index.html`。GitHub Actions（`.github/workflows/deploy.yml`）在推送到 `main` 后运行测试和构建，并发布到 GitHub Pages。

## 测试

```bash
npm test
```

- `src/domain/anthropometry.test.ts`：估算、覆盖、比例、体脂、边界；
- `src/three/bodyData.test.ts`：生成资产元数据。

3D 渲染本身不做像素级快照测试；修改人台、姿态或材质时，需要手动检查标准 / 自然 / 踮脚三种视图和 45° 视角。

## 隐私

没有网络请求、没有分析脚本、没有远程字体。所有输入和导出都在本机完成。
