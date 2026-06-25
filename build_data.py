"""
国考数据预处理脚本
读取所有 2025 年 Excel 岗位表，提取关键字段，输出紧凑 JSON。
用于嵌入单文件 HTML 工具。
"""
import json
import os
import re
from pathlib import Path

import openpyxl

DATA_DIR = Path(__file__).parent

# 关键列索引（0-based）
COL_MAP = {
    "dept": 1,       # 部门名称
    "office": 2,     # 用人司局
    "nature": 3,     # 机构性质
    "title": 4,      # 招考职位
    "attr": 5,       # 职位属性
    "level": 9,      # 机构层级
    "count": 11,     # 招考人数
    "major": 12,     # 专业
    "edu": 13,       # 学历
    "degree": 14,    # 学位
    "party": 15,     # 政治面貌
    "exp": 16,       # 基层工作最低年限
    "location": 20,  # 工作地点
    "hukou": 21,     # 落户地点
    "notes": 22,     # 备注
    "region": 28,    # 地区
}

# 输出字段（紧凑格式，用短键名）
OUT_KEYS = [
    "d",  # 部门名称 dept
    "t",  # 职位名称 title
    "l",  # 机构层级 level
    "a",  # 职位属性 attr
    "m",  # 专业要求 major
    "e",  # 学历要求 edu
    "p",  # 政治面貌 party
    "x",  # 基层经验 exp
    "c",  # 招考人数 count
    "r",  # 省份 region
]


def safe_str(val):
    """安全转字符串，None → "" """
    if val is None:
        return ""
    return str(val).strip()


def safe_int(val):
    """安全转整数"""
    try:
        return int(val)
    except (ValueError, TypeError):
        return 0


def read_excel(filepath):
    """读取一个 Excel 文件，返回岗位列表"""
    rows = []
    wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
    ws = wb.active
    it = iter(ws.iter_rows(min_row=2, values_only=True))  # 跳过表头
    for row in it:
        # 跳过空行
        if row[0] is None or str(row[0]).strip() == "":
            continue
        item = {
            "d": safe_str(row[1]),     # 部门名称
            "t": safe_str(row[4]),     # 职位名称
            "l": safe_str(row[9]),     # 机构层级
            "a": safe_str(row[5]),     # 职位属性
            "m": safe_str(row[12]),    # 专业要求
            "e": safe_str(row[13]),    # 学历要求
            "p": safe_str(row[15]),    # 政治面貌
            "x": safe_str(row[16]),    # 基层经验
            "c": safe_int(row[11]),    # 招考人数
            "r": safe_str(row[28]),    # 省份
        }
        # 如果省份为空，尝试从文件名推断
        if not item["r"]:
            item["r"] = _province_from_filename(filepath)
        rows.append(item)
    wb.close()
    return rows


def _province_from_filename(filepath):
    """从文件名推断省份"""
    name = os.path.basename(filepath)
    # 2025_国考_北京.xlsx → 北京
    # 2025_Q_四川.xlsx → 四川
    match = re.search(r"[_国考_Q_]+(.+)\.xlsx", name)
    if match:
        return match.group(1)
    return "未知"


def compute_province_stats(rows):
    """计算每省统计数据"""
    stats = {}
    for r in rows:
        prov = r["r"]
        if prov not in stats:
            stats[prov] = {"total": 0, "politic": 0, "recruits": 0}
        stats[prov]["total"] += 1
        stats[prov]["recruits"] += r["c"]
        # 检查是否包含政治学相关专业
        m = r["m"]
        if any(kw in m for kw in ["政治学", "国际政治", "国际关系", "外交学"]):
            stats[prov]["politic"] += 1
    return stats


def main():
    # 找到所有 Excel 文件
    excel_files = []
    for f in sorted(DATA_DIR.glob("2025_*.xlsx")):
        if f.stat().st_size < 5000:  # 跳过损坏/占位文件
            print(f"  ⏭ 跳过损坏: {f.name} ({f.stat().st_size} bytes)")
            continue
        excel_files.append(f)

    print(f"找到 {len(excel_files)} 个有效 Excel 文件")

    # 读取所有数据
    all_rows = []
    for f in excel_files:
        try:
            rows = read_excel(f)
            all_rows.extend(rows)
            print(f"  ✅ {f.name}: {len(rows)} 行")
        except Exception as e:
            print(f"  ❌ {f.name}: {e}")

    print(f"\n总计: {len(all_rows)} 个岗位")

    # 省份统计
    stats = compute_province_stats(all_rows)
    for prov, s in sorted(stats.items()):
        print(f"  {prov}: {s['total']}岗 / 政治学{s['politic']}岗 / 招{s['recruits']}人")

    # ===== 趋势数据（从 generate_all.py 提取） =====
    trends = {
        "national": {
            "years": [2019, 2020, 2021, 2022, 2023, 2024, 2025],
            "recruitment": [1.45, 2.41, 2.57, 3.12, 3.71, 3.96, 3.97],   # 万人
            "applicants": [137.75, 144.60, 156.77, 212.16, 259.77, 304.92, 341.42],  # 万人
            "competition": [95, 60, 61, 68, 70, 77, 86],  # :1
        },
        "salary": {
            "years": [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
            "monthly": [4860, 5480, 6120, 6890, 8130, 8900, 9760, 10230],  # 元/月
        },
        "graduate": {
            "years": [2020, 2021, 2022, 2023, 2024, 2025, 2026],
            "applicants": [341, 377, 457, 474, 438, 388, 343],  # 万人
        },
        "qinghai": {
            "years": [2022, 2023, 2024, 2025, 2026],
            "recruitment": [1154, 1082, 1086, 1202, 1356],
            "competition": [53, 63, 66, 63, 58],
        },
    }

    # ===== 输出 =====
    # 生成 JS 文件
    output = {
        "positions": all_rows,
        "provinceStats": stats,
        "trends": trends,
        "meta": {
            "totalPositions": len(all_rows),
            "totalProvinces": len(stats),
            "dataYear": "2025",
            "generatedAt": "2026-06-25",
        },
    }

    # 保存为紧凑 JSON（无缩进）
    json_str = json.dumps(output, ensure_ascii=False, separators=(",", ":"))
    out_path = DATA_DIR / "data.json"
    out_path.write_text(json_str, encoding="utf-8")
    print(f"\n📦 数据已保存: {out_path} ({out_path.stat().st_size / 1024:.0f} KB)")

    # 也保存一份格式化的便于查看
    pretty_path = DATA_DIR / "data_pretty.json"
    pretty_path.write_text(
        json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # 生成 data.js（直接赋值给变量，方便 HTML 引用）
    js_str = "const DATA = " + json_str + ";"
    js_path = DATA_DIR / "data.js"
    js_path.write_text(js_str, encoding="utf-8")
    print(f"📦 JS 数据已保存: {js_path} ({js_path.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
