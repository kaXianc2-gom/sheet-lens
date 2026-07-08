# Contributing to SheetLens

感谢你的关注！欢迎任何形式的贡献。

## 如何贡献

### 报告 Bug
- 在 [Issues](https://github.com/kaXianc2-gom/sheet-lens/issues) 中提交
- 描述复现步骤、预期行为和实际行为
- 附上浏览器控制台（F12）的错误信息

### 功能建议
- 先在 Issues 中讨论，避免重复工作
- 说明使用场景和期望效果

### 提交 PR
1. Fork 本仓库
2. 创建 feature 分支：`git checkout -b feature/your-feature`
3. 修改 `index.html`（单文件项目，所有代码在此）
4. 用真实 Excel 文件测试功能正常
5. 提交 PR，描述中说明改动内容和测试结果

## 本地开发

```bash
git clone https://github.com/kaXianc2-gom/sheet-lens.git
cd sheet-lens
# 直接用浏览器打开 index.html 即可
# 无需 npm install / 构建步骤
```

### 测试数据
`examples/sample_data.xlsx` 提供了脱敏样例，也可使用国考/省考公开职位表。

## 技术栈
- 纯 HTML + 原生 JavaScript（**单文件，零构建、零服务器、零外部 CDN 请求**）
- ECharts 5.5（图表，已内联）
- SheetJS 0.18.5（Excel 解析，已内联）
- 中国地图：DataV GeoJSON 已内联
- 仅在地图 GeoJSON 失败时回退到 CDN：`geo.datav.aliyun.com`

### `build_data.py` 说明

`build_data.py` 是 **离线数据预处理工具**（不参与页面运行），用于把 2025 年国考 Excel 原始数据预处理成 `data.json` / `data.js` 嵌入单文件。

- **前提**：需要在仓库本地放 `2025_国考_XX.xlsx` 等原始文件（**当前仓库未包含**，因体积较大）
- **运行**：`pip install openpyxl && python build_data.py`
- **输出**：`data.json`（紧凑）、`data_pretty.json`（格式化）、`data.js`（JS 变量赋值）
- **页面默认使用**：`index.html` 里 `<script id="demoData" type="application/json">` 内嵌的 13 条脱敏示例（公开版），无需运行 `build_data.py` 就能开箱即用
- **正式数据**：`build_data.py` 适合在私有 fork 上把内部数据脱敏后嵌入到 `demoData` 脚本块

## AI 辅助声明
本项目开发过程中使用了 AI 辅助（Claude / Anthropic Claude Code；Mavis/mavis）。
如果你也使用 AI 参与了贡献，请在 PR 描述中注明。

## AI 辅助声明
本项目开发过程中使用了 AI 辅助。如果你也使用 AI 参与了贡献，请在 PR 描述中注明。

## 行为准则
请保持友善和建设性。我们遵循 [Contributor Covenant](https://www.contributor-covenant.org/)。
