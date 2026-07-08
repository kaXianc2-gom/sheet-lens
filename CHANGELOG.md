# Changelog

## [2.1.0] - 2026-07-08

### 重构
- 单文件 2.6MB → 拆为多文件工程（HTML / CSS / JS / vendor / data）
- index.html 瘦身 2.34MB → 24KB
- vendor 库本地内联：ECharts / SheetJS / DataV GeoJSON
- 60+ CSS 设计 token（颜色 / 间距 / 字号 / 动效 / 层级）
- ECharts `var()` 渲染失败 bug 修复（`cssv()` helper）

### 修复
- race bug：`chinaGeoLoaded` TDZ + `mapChart` 异步守卫
- `file://` 协议 fetch 受限（用 `.js` wrapper 解决）

### 新增
- 暗色 mode 自发光 / 暖色光晕 / 星空感光斑 / 金色金属边光
- 亮色 mode 对称暗色视觉增强
- 响应式 3 断点（1024 / 768 / 480）
- 键盘快捷键（`/` 搜索 / `1/2/3` 切 tab / `Ctrl+Z` 撤销 / `Ctrl+E` 导出 / `T` 切主题 / `?` 帮助）
- 分享 URL（filter 序列化到 hash，可分享可恢复）
- Loading skeleton（30+ 行时显示）
- PDF 导出（`window.print` + `@media print` 增强）
- Ripple 波纹（按钮点击反馈）
- 快捷键 onboarding 第 5 步

### 测试
- 6 个 Playwright E2E 测试
- demo 加载 / 3 tab 切换 / 省份点击 / 筛选撤销 / 暗色 / 对比
- 6/6 通过，0 PAGE-ERR

## [2.0.0] - 2026-06-30

### Added
- 键盘可访问性（focus-visible outline）
- 自定义滚动条样式（webkit-scrollbar）
- 减弱动画支持（prefers-reduced-motion）
- 响应式布局优化（768px / 480px 断点）
- 打印样式（print media query）

### Fixed
- 多项 Bug 修复和功能增强
- UI 一致性和交互体验优化

## [1.5.0] - 2026-06-27

### Added
- Demo 模式：内嵌 13 条示例数据
- 布局骨架屏 + shimmer 闪烁动画（暗色模式适配）
- 页眉 / 主内容 stagger 入场动画
- 标签切换 0.3s 上滑过渡
- 筛选结果卡片脉冲反馈
- 按钮弹簧效果（scale 0.97）
- Toast 入场微缩放
- 上传区脉冲光环暗示
- 评分条 reveal 展开动画
- Issue / PR 模板

### Fixed
- CSS `--spring` 变量未定义（11 处过渡修复）
- 页面入场动画 `.container` 选择器错误
- 重复 `#exitOverlay`

## [1.4.0] - 2026-06-26 (v2.2)

### Added
- 🌙 暗色模式：一键切换，图表自适应，偏好记忆
- 📄 表格分页：50 条/页，无硬限制
- ⚖ 岗位对比：勾选 2-3 个岗位并排对比
- ↩ 筛选撤销：20 步历史栈
- 🔍 模糊搜索：逐字跳跃匹配，支持简称
- 💬 专业自动补全：实时下拉提示
- 🎬 新手引导：4 步遮罩
- 📊 7 套独立图表配色
- 🔢 统计数字滚动动画
- 🏷 筛选标签条
- 💬 Toast 消息系统
- 💾 localStorage 筛选记忆
- 🫁 上传区呼吸动画
- 📝 数字千分位格式化

### Fixed
- 新手引导遮罩残留导致卡死
- 文件选择器仅接受 .xlsx，现支持 .xls
- 列名匹配扩充至 40+ 关键词，兼容 2026 新表头
- 多 Sheet 自动遍历
- `alert()` 统一替换为 Toast

### Verified
- 2026 年国考真实数据交叉验证通过（20,714 岗 / 38,119 人 / 31 省）

## [1.3.0] - 2026-06 (v2.1)

### Added
- 填写即评分：筛选与评分合并，消除新用户困惑
- 暖橙 UI 重设计
- 8 张图表（地图 + 7 张分析图）
- 5 维 100 分自动评分系统

## [1.0.0] - 2026-06 (v2.0)

### Added
- 首次发布
- 拖拽上传 Excel
- 智能表头检测
- 多维度筛选
- 中国地图热力图
