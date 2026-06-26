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
- 纯 HTML + 原生 JavaScript
- CDN：ECharts 5.5（图表）+ SheetJS 0.18.5（Excel 解析）
- 零构建工具，零服务器

## AI 辅助声明
本项目开发过程中使用了 AI 辅助。如果你也使用 AI 参与了贡献，请在 PR 描述中注明。

## 行为准则
请保持友善和建设性。我们遵循 [Contributor Covenant](https://www.contributor-covenant.org/)。
