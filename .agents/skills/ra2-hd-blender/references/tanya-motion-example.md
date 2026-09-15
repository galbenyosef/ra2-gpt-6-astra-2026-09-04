# 谭雅：已验证的骨骼与 SHP 对照实例

基线 commit `be3a333` 的第一版动作重建，用于说明适配方式及边界。下列路径相对仓库根目录；缓存需另行定位，不随 checkout 提供。

## 证据与复现入口

| 文件 | 用途 |
| --- | --- |
| `tools/tanya-motion/README.md` | 运行、输入与输出说明 |
| `catalog.mjs`（同目录） | TanyaSequence 帧表、固定方向、12 fps、一次性状态 |
| `poses.mjs` | 复用跑步 clip，按参考设骨骼目标／双骨 IK |
| `build.mjs` | 保留共享几何，写多个 clips 和 manifest |
| `bake-atlas.mjs` | 蒙皮取样、打包 RGBA、随蒙皮的阵营 mask、水线 |
| `motion.test.mjs` | 骨骼、步态、泳姿／卧射、帧范围和权重检查 |
| `assets/hd/models/tanya/motion-manifest.json` | 真实输出 hash、大小、clips 与限制 |
| `tools/canvas-hd-preview/README.md` | 同地图原版对照、循环与帧检查器 |

原 `art.ini` 的 `[TanyaSequence]` 与 SHP 是参考依据。现有本地转换目录为 `.cache/ra2-assets-rebuild-result/assets`，接触表在 `.cache/tanya-frame-rebuild`，输入 rig trial 在 `.cache/prototype-3d/tanya/meshy-rig-v1`。不提交这些原素材、截图、缓存或下载母版。

从仓库根运行（使用自己的可用本地路径；若已有服务在运行，不重启它）：

```sh
RA2_ORIGINAL_ASSETS=/path/to/original/assets npm run viewer:motion
npm run motion:test
# 仅需重建时：会写入指定输出目录
node tools/tanya-motion/build.mjs /path/to/rig-trial .cache/tanya-motion-candidate
```

`build.mjs` 读取 `rigged.glb` 和 `running.glb`。检查候选后再登记／替换运行资产；当前查看器加载固定的 Tanya 运行路径，不自动发现候选目录。4179 的 3D 页面可对照原帧，本地 bake 按钮写入 `assets/hd/sprites/` 的 Tanya 图与 manifest；`/canvas/` 在原地图显示。远端页面不能烘焙写文件。

**不要直接跑旧 `tools/canvas-hd-preview/bake.mjs` 重建谭雅**：它仍按静态 `30k.glb` 和程序变形出图，会覆盖当前骨骼图集；目前没有防覆盖保护。旧烘焙器可研究其它历史样本，修改输出范围后才用于选定资产。更新运行文件后核对 `assets/hd/inventory.json` 的实际 hash。

## 已交付与限制

实测 GLB 为 **29,827 三角面、24 joints、3,450,396 bytes**，单套共享网格／纹理，26 clips 含别名／占位，21 项独立展示动作。支持站射、卧射、匍匐、卧倒／起身、游泳、踩水、水中射击、待机、陆／水死亡、伞降和欢呼；占位不应计为新死亡表演。

619 个可见源槽中 515 个有命名覆盖；362–409、458–505、611–618 共 104 槽保持原版检查 fallback。原 SHP 另有对应阴影帧，不混入可见槽计数。水中死亡末段沉水后的透明帧不是缺失动作。

姿势为 SHP 参照重建，跑步复用 Meshy gait，不是原始骨骼恢复或像素精确拟合。12 fps 是预览时钟；手指和武器掉落未单独绑定，枪仍在蒙皮网格中。绑定输出仅一张纹理，原 normal／roughness 贴图未返回，不声称 PBR 完整保留。

该基线记录五项 motion 检查通过；旧静态 GLB 负对照使其中四项失败，图集项仍通过。测试剥离材质加载几何，因此不证明贴图外观；基线另做过 3D 与真实 Canvas 地图视觉检查。本次重建复用了已有 Meshy rig，没有新付费生成。

## 迁移到新单位

| 不能直接照搬的内容 | 新单位要确认的内容 |
| --- | --- |
| `catalog.mjs` 的 Tanya 帧表／619 槽 | 该单位 Sequence、别名、未命名区、阴影、事件计时 |
| `poses.mjs` 的骨骼名、绝对米制目标 | rig 角色映射、rest pose、比例、武器和动作关键姿势 |
| baker 的 8 朝向／水线／mask 阈值 | 实际方向序、原图锚点、采样密度、制服区域与水线 |
| `build.mjs` 的来源 task、面数和 joints 常量 | 从新文件实际测量并填真实 provenance |
| 查看器、清单和预览中的 Tanya 路径与单位 ID | 新资产登记、状态映射和原版对照对象 |
| tests 中 Tanya 的固定数字与肢体名 | 该单位真实不变量、负对照与视觉验收 |

当前相机 `(10, 10*sqrt(2/3), 10)` 对应约 30°俯角；SHP 方向顺序 N、NW、W、SW、S、SE、E、NE，模型旋转 `-3π/4 + facing*π/4`。这些是本例已用约定：新单位需用原图和世界移动方向一起检查，不能从屏幕移动角度直接推模型朝向。
