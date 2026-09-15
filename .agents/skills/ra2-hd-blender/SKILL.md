---
name: ra2-hd-blender
description: 为 RA2 兵种、载具、船只和建筑制作约 3 万三角面的高清游戏 GLB；按原版 SHP/VXL/HVA 参考适配骨骼或机械动作，烘焙到现有 Canvas 2D，验证同地图对比与阵营换色。
---

# RA2 高清模型与动作

将认可的参考图或已有模型做成轻量游戏资产；需要动态时再制作可编辑动作并烘焙精灵。当前谭雅流程可作适配范例，尚非任意单位的一键动画生成器。

## 先识别资产与交付范围

核对显示名、INI `Image` / `Sequence`、实际资源名和用户要的状态，区分：

| 类型 | 原始证据 | 动作方式 |
| --- | --- | --- |
| 双足步兵 | SHP 帧、序列配置、阴影 | 可用 rig / clips；必要时绑定，再按参考摆姿或重定向 |
| 车辆、船只 | VXL/HVA、炮塔炮管、已有几何与规则 | 独立部件轴、层级、机械运动；不套人形绑定 |
| 建筑 | 底座、工作、建造、受损层 | 对应层与机械状态；不以整物缩放充当建造动画 |

按实际状态列出动作、方向、帧段、事件和缺失项。已有模型直接复用，不为动作重跑外形生成。只做用户范围内的状态；仅要求静态模型时不强制制作全部动画。

## 1. 参考与生成

读 [原素材与参考提示词](references/source-to-hd.md)。默认用内置 ImageGen，按当前 imagegen skill 操作；输入真实源图，保持轮廓、比例、配色和组件身份，沿用用户认可图。被遮挡部分是推断，不当作原厂设计。动画参考另保留原分辨率帧，

需要新模型时读 [Meshy 调用与恢复](references/meshy-generation.md)。按授权提交一次、保存 task ID；结果不明先找回任务，避免重复付费。凭据统一按 [GuestSafe skill](~/.agents/skills/guestsafe/SKILL.md) 存取，仅注入目标进程，不进入参数、日志和提交。

## 2. 轻量与可恢复性

读 [优化与 Canvas 烘焙](references/runtime-optimization.md)。默认约 **30,000 三角面是整个资产的预算**，不是每个 mesh 或顶点数。以游戏显示大小检查轮廓、细杆和肢体；有证据再调整预算。几何简化与纹理压缩分别比较，验证实际解码、UV、法线、材质、蒙皮及部件结构。

默认入库认可的高清参考图、真实生成记录、经验证的轻量 GLB；需要 Canvas 时再入库选定图集和遮罩。同图按 hash 去重，保留实际提交的裁切／多视角输入，不降质唯一输入。记录 prompt、参数、模型版本、task ID、路径与 hash；未知字段如实标注。

同一模型重新减面需保留一份自包含原始模型，可留在忽略的本地归档；无需同时堆入高清 GLB、FBX、Blend、ZIP 和重复贴图。参考＋记录只能支持再次生成，可能付费且不保证相同结果；30k 不能恢复丢失细节，task ID 和临时 URL 不是永久备份。记录原件实际留存位置，不自动删除既有归档。

## 3. 动作制作与原版对照

动态任务读 [动作、交互与阵营色](references/animation-and-team-colors.md)。双足骨骼工作继续读 [骨骼适配](references/skeletal-motion.md)，脚本与限制见 [谭雅实例](references/tanya-motion-example.md)。

优先保留已有 rig、clips 与部件，按源动作的关键姿势制作和检查。帧号对应不等于动作精确恢复；静态朝向、空间分区变形和战斗特效不等于骨骼动画。炮塔能转也不代表游戏允许行进射击，不借资产升级改变规则。

## 4. 现有 Canvas 验收

主游戏是 `src/renderer.ts` 的 Canvas 2D `BattlefieldRenderer`。Three.js／Blender 用于离线模型检查与烘焙；将透明 PNG 和阵营色 mask 交给现有 `Assets`、`GameEngine` 和渲染器。

按原投影、方向、逻辑尺寸、锚点和源帧槽映射，不放大地格迁就高清图。地图、水面、坡道和其它未升级部分沿用原版素材；缺少原素材时说明地图验收未完成。原版／HD 在同地图并排同步，提供适用状态循环、暂停、慢放、逐帧和方向检查。

`npm run viewer:glb` 是通用模型查看入口；`npm run viewer:motion` 是当前谭雅骨骼／SHP 对照及 `/canvas/` 入口。旧 `tools/canvas-hd-preview/bake.mjs` 可能覆盖新谭雅图集，使用实例中对应版本的烘焙流程。

## 交付

提供实际面数、字节数、纹理／压缩、骨骼／clips、帧覆盖、配方与 hash，以及明确的已验证与缺失项。可编辑模型与多个 clips 共享几何和贴图，不逐动作复制母版。原版 SHP/VXL/TMP、转换图集、地图、截图和缓存不入库；提交不代表推送授权。

用户要求打开 Blender 时导入指定 GLB、打包贴图并另存审阅文件；手工重建才读 [历史 Blender 流程](references/blender-reconstruction.md) 和 [电厂实例](references/powerplant-example.md)。执行约束见历史流程的“执行方式与版本”。
