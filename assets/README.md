# 3D 基础资产

## 文件

- `parametric-base.glb`：MakeHuman hm08 基础人体 + MPFB2 形态目标，经 naver/anny 与 three.ws 整理。原始资产以 **CC0 1.0** 发布。
- `LICENSE-CC0.md`：原始 CC0 许可文本。

## 用途

`scripts/build_body_asset.py` 读取该 GLB，筛选应用需要的形态目标，生成：

```text
src/three/bodyData.ts
```

生成文件包含基础顶点、索引、躯干 mask、22 个稀疏形态目标、姿态权重、邻接表和地标尺寸。普通开发与构建不需要重新生成它。

重新生成：

```bash
npm run build:body
```

## 许可

- 3D 基础资产：CC0 1.0，见 `LICENSE-CC0.md`。
- 生成代码与项目代码：MIT，见项目根目录 `LICENSE`。
- CC0 不要求署名；本项目仍主动标注 MakeHuman / MPFB2、naver/anny、three.ws 的来源。
