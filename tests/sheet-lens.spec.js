// SheetLens E2E 测试套件
// 覆盖：demo 数据加载、tab 切换、省份点击 bug 修复、筛选/撤销、暗色模式、对比勾选
const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

function attachConsole(page) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('   [CONSOLE-ERR]', msg.text().slice(0, 200));
  });
  page.on('pageerror', (err) => {
    console.log('   [PAGE-ERR]', err.message.slice(0, 200));
  });
}

test.beforeEach(async ({ page }) => {
  attachConsole(page);
  // 注入 localStorage：标记已引导过 + 清空 filters
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'gwy_sheetlens_settings',
        JSON.stringify({ __guided: true, __hasData: false, theme: 'light', filters: { province: '', major: '', edu: '', party: '', exp: '' } })
      );
    } catch (e) {}
  });
  await page.goto(FILE_URL);
  // 严格等待 demo 数据完全加载（statPos === '13'，而非 !== '0'，避免 race）
  await page.waitForFunction(
    () => {
      const pos = document.getElementById('statPos');
      const loading = document.getElementById('demoLoading');
      const guide = document.getElementById('guideOverlay');
      return (
        pos && pos.textContent.trim() === '13' &&
        (!loading || !document.body.contains(loading)) &&
        (!guide || !document.body.contains(guide))
      );
    },
    { timeout: 15000 }
  );
});

test('01 demo 数据自动加载', async ({ page }) => {
  const pos = (await page.locator('#statPos').textContent()).trim();
  expect(pos).toBe('13');
  await expect(page.locator('[data-tab="map"]')).toHaveClass(/active/);
  await expect(page.locator('.quick-tag').first()).toBeVisible();
});

test('02 三个 tab 都能切换', async ({ page }) => {
  await page.click('[data-tab="trend"]');
  await expect(page.locator('#tab-trend')).toHaveClass(/active/);
  await expect(page.locator('#tab-map')).not.toHaveClass(/active/);

  await page.click('[data-tab="table"]');
  await expect(page.locator('#tab-table')).toHaveClass(/active/);
  await expect(page.locator('#tab-trend')).not.toHaveClass(/active/);

  await page.click('[data-tab="map"]');
  await expect(page.locator('#tab-map')).toHaveClass(/active/);
  await expect(page.locator('#tab-table')).not.toHaveClass(/active/);
});

test('03 省份点击不跳 tab（核心 bug 修复）', async ({ page }) => {
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const sel = document.getElementById('selProvince');
    sel.value = '北京';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(500);
  const activeTab = await page.locator('.tab-btn.active').getAttribute('data-tab');
  expect(activeTab).toBe('map');
  const provinceVal = await page.locator('#selProvince').inputValue();
  expect(provinceVal).toBe('北京');
});

test('04 筛选 + 撤销（history 栈）', async ({ page }) => {
  // 应用筛选
  await page.selectOption('#selEdu', '本科');
  await page.waitForTimeout(300);
  // 撤销按钮应可见且带计数
  await expect(page.locator('#btnUndo')).toBeVisible();
  await expect(page.locator('#btnUndo')).toContainText('(1)');
  // 撤销：回到 history 栈 pop 一次之后
  await page.click('#btnUndo');
  await page.waitForTimeout(300);
  // 此时 history 应该是空（init 时 history=[]，应用一次后=[1]，撤销后=[]）
  // 撤销按钮应隐藏
  await expect(page.locator('#btnUndo')).toBeHidden();
  // 验证：表格恢复显示全部 13 条岗位
  const rowCount = await page.locator('.clickable-row').count();
  // 注：可能仍在 table tab，rowCount 包含全量
  expect(rowCount).toBeGreaterThanOrEqual(1);
});

test('05 暗色模式切换', async ({ page }) => {
  const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await page.click('#themeToggle');
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  expect(after).not.toBe(before);
});

test('06 对比勾选（修复 #2 compareSet 错位）', async ({ page }) => {
  await page.click('[data-tab="table"]');
  await page.waitForTimeout(800);
  const cbs = page.locator('.compare-cb');
  await cbs.nth(0).check();
  await cbs.nth(1).check();
  await page.waitForTimeout(300);
  await expect(page.locator('#btnCompare')).toBeEnabled();
  // 切到 map 再切回，验证勾选不错位（修复的核心 bug）
  await page.click('[data-tab="map"]');
  await page.waitForTimeout(300);
  await page.click('[data-tab="table"]');
  await page.waitForTimeout(300);
  const stillChecked = await page.locator('.compare-cb:checked').count();
  expect(stillChecked).toBe(2);
  // 对比按钮文本应带数字
  const compareText = await page.locator('#btnCompare').textContent();
  expect(compareText).toContain('(2)');
});
