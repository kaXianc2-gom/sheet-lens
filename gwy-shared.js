/* ═══════════════════════════════════════════════
   gwy-shared.js — 公考工具箱共享库
   所有工具引用同一份，消除重复 + 统一行为
   使用方式: <script src="gwy-shared.js"></script>
   ═══════════════════════════════════════════════ */
"use strict";

// ── 共享偏好 KEY ──
var GWY_SHARED_KEY = 'gwy_shared_prefs';

// ── HTML 转义（完整 5 字符版）──
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Toast 提示（支持自定义时长）──
function toast(msg, type, duration) {
  var el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function() { el.remove(); }, typeof duration === 'number' ? duration : 2300);
}

// ── 数字格式化 ──
function formatNum(n) {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ── 主题切换（同步到共享偏好）──
function toggleThemeShared() {
  var cur = document.documentElement.getAttribute('data-theme');
  var next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  var btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
  // 同步到共享偏好
  try {
    var p = JSON.parse(localStorage.getItem(GWY_SHARED_KEY) || '{}');
    p.theme = next;
    localStorage.setItem(GWY_SHARED_KEY, JSON.stringify(p));
  } catch(e) {}
  return next;
}

// ── 加载共享偏好 ──
function loadSharedPrefs() {
  try {
    return JSON.parse(localStorage.getItem(GWY_SHARED_KEY) || '{}');
  } catch(e) { return {}; }
}

// ── 保存共享偏好（合并写入）──
function saveSharedPrefs(partial) {
  try {
    var p = JSON.parse(localStorage.getItem(GWY_SHARED_KEY) || '{}');
    for (var k in partial) if (partial.hasOwnProperty(k)) p[k] = partial[k];
    localStorage.setItem(GWY_SHARED_KEY, JSON.stringify(p));
    return true;
  } catch(e) { return false; }
}

// ── 从 URL 参数加载筛选条件 ──
function filtersFromURL() {
  var q = new URLSearchParams(window.location.search);
  var f = {};
  if (q.get('major')) f.major = q.get('major');
  if (q.get('edu')) f.edu = q.get('edu');
  if (q.get('province')) f.province = q.get('province');
  if (q.get('party')) f.party = q.get('party');
  if (q.get('exp')) f.exp = q.get('exp');
  return f;
}

// ── 应用共享主题（优先读取共享偏好）──
function applySharedTheme() {
  var prefs = loadSharedPrefs();
  if (prefs.theme) {
    document.documentElement.setAttribute('data-theme', prefs.theme);
    var btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = prefs.theme === 'dark' ? '☀️' : '🌙';
  }
}
