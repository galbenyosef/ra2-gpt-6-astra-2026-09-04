# 谭雅骨骼与 SHP 对照实例

基线 `be3a333` 与匍匐试验的适配记录。路径相对仓库根；缓存不随 checkout 提供。

## 证据与复现入口

| 文件 | 用途 |
| --- | --- |
| `tools/tanya-motion/README.md` | 运行、输入与输出说明 |
| `catalog.mjs`（同目录） | TanyaSequence 帧表、固定方向、12 fps、一次性状态 |
| `poses.mjs` | 骨骼关键姿势、接触步态与双骨 IK |
| `build.mjs` | 保留共享几何，写多个 clips 和 manifest |
| `bake-atlas.mjs` | 蒙皮取样、打包 RGBA、随蒙皮的阵营 mask、水线 |
| `motion.test.mjs` | 骨骼、步态、泳姿／卧射、帧范围和权重检查 |
| `assets/hd/models/tanya/motion-manifest.json` | 真实输出 hash、大小、clips 与限制 |
| `tools/canvas-hd-preview/README.md` | 同地图原版对照、循环与帧检查器 |

依据 `art.ini` 的 `[TanyaSequence]` 与 SHP。本地 `.cache/` 下：转换素材在 `ra2-assets-rebuild-result/assets`，帧表在 `tanya-frame-rebuild`，rig 在 `prototype-3d/tanya/meshy-rig-v1`。这些原素材、截图和母版不入库。

从仓库根运行（使用自己的可用本地路径；若已有服务在运行，不重启它）：

```sh
RA2_ORIGINAL_ASSETS=/path/to/original/assets npm run viewer:motion
npm run motion:test
# 仅需重建时：会写入指定输出目录
node tools/tanya-motion/build.mjs /path/to/rig-trial .cache/tanya-motion-candidate
```

`build.mjs` 读取 `rigged.glb` 和 `running.glb`；当前选区脚本还需 Python + Pillow，可用 `RA2_PYTHON` 指定解释器。检查候选后再登记运行资产；查看器加载固定路径，不自动发现候选。4179 的 3D 页面可对照原帧，本地 bake 按钮写入 Tanya 图集与 manifest；`/canvas/` 在原地图显示。远端不能烘焙写文件。

**不要直接跑旧 `tools/canvas-hd-preview/bake.mjs` 重建谭雅**：它用静态 `30k.glb` 出图，会覆盖骨骼图集且无保护。用于其它样本前先限定输出范围。更新资产后核对 `assets/hd/inventory.json` 的 hash。

## 第一版基线与限制

`be3a333` 实测 **29,827 三角面、24 joints、3,450,396 bytes、26 clips**（含别名／占位），21 项展示动作；占位不算新表演。

619 个可见源槽中 515 个有命名覆盖；362–409、458–505、611–618 共 104 槽保留原版 fallback。阴影另计，水中死亡末段透明帧不算缺失。

基线跑步复用 Meshy gait，枪仍在身体网格中。重建不是原始骨骼恢复；12 fps 只是预览时钟。绑定未返回 normal／roughness 贴图，不声称完整保留 PBR。

## 匍匐小范围试验

详见 [原帧证据、实现与验证](../../../../tools/tanya-motion/crawl-reference.md)。`Crawl=86,6,6`，Prone 共用各方向第一帧。检查八方向，六组独立关键姿势保留错开的腿和交替前探／支撑的手臂，再插值。深度仍是推断。

与 W 向 FireProne 的枪口轮廓比较后，本试验仅在 Crawl／Prone 隐藏伸出的手枪；不证明所有方向都空手，也不外推游泳等动作。手仍是闭合握姿，没有新增手指绑定。`mesh-regions.py` 分离道具并写 `_TEAM_MASK`，`team-material.mjs` 共用服装换色与烘焙选区；阈值必须按新模型测量。

复用已有 rig，无新付费任务。该次 **29,827 三角面、24 joints、28 clips**，身体／道具共享属性、UV 和 skin。clip 数含此前水中转换；最新指标以文件和 manifest 为准。

`crawl-reference.test.mjs` 检查六帧不对称、持物和 mask，旧模型三项均失败；`verify-crawl.mjs` 检查浏览器源帧、道具切换、红蓝换色及 48 个 Crawl 区块。匍匐试验当时未覆盖其它动作；后续版本见 [全动作记录](../../../../tools/tanya-motion/action-reference.md)。

## 迁移到新单位

| 不能直接照搬的内容 | 新单位要确认的内容 |
| --- | --- |
| `catalog.mjs` 的 Tanya 帧表／619 槽 | 该单位 Sequence、别名、未命名区、阴影、事件计时 |
| `poses.mjs` 的骨骼名、绝对米制目标 | rig 角色映射、rest pose、比例、武器和动作关键姿势 |
| `crawl-keys.mjs`、选区与道具隐藏动作 | 逐帧左右姿势、实际持物证据、模型区域与手部限制 |
| baker 的 8 朝向／水线／mask 阈值 | 方向序、原图锚点、采样密度、制服区域与水线 |
| `build.mjs` 的来源 task、面数和 joints 常量 | 从新文件实际测量并填真实 provenance |
| 查看器、清单和预览中的 Tanya 路径与单位 ID | 新资产登记、状态映射和原版对照对象 |
| tests 中 Tanya 的固定数字与肢体名 | 该单位真实不变量、负对照与视觉验收 |

当前相机 `(10, 10*sqrt(2/3), 10)` 对应约 30°俯角；SHP 方向顺序 N、NW、W、SW、S、SE、E、NE，模型旋转 `-3π/4 + facing*π/4`。这些是本例已用约定：新单位需用原图和世界移动方向一起检查，不能从屏幕移动角度直接推模型朝向。
