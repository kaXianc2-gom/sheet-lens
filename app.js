/* SheetLens — main app (extracted from index.html) */

"use strict";


// ═══════════════════════════════════════════════════════════════
//  GLOBAL FLAGS（必须在 STATE 之前声明，init 阶段要写）
// ═══════════════════════════════════════════════════════════════
let chinaGeoLoaded = false;


// ═══════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════
// 同步从 window 全局注册（china.geo.js 和 demo.js 在 index.html 同步加载）
if(typeof window.SHEETLENS_GEO!=="undefined"){try{echarts.registerMap("china",window.SHEETLENS_GEO);chinaGeoLoaded=true;}catch(e){console.warn("Inline GeoJSON failed, will try CDN fallback");}}
const STATE = {
  raw: [], filtered: [], provinceStats: {},
  provinceMap: {
    "北京":"北京市","上海":"上海市","天津":"天津市","重庆":"重庆市",
    "广东":"广东省","山东":"山东省","江苏":"江苏省","浙江":"浙江省",
    "河南":"河南省","河北":"河北省","湖南":"湖南省","湖北":"湖北省",
    "四川":"四川省","福建":"福建省","安徽":"安徽省","江西":"江西省",
    "辽宁":"辽宁省","陕西":"陕西省","云南":"云南省","贵州":"贵州省",
    "甘肃":"甘肃省","青海":"青海省","海南":"海南省","山西":"山西省",
    "吉林":"吉林省","黑龙江":"黑龙江省","广西":"广西壮族自治区",
    "内蒙古":"内蒙古自治区","宁夏":"宁夏回族自治区",
    "新疆":"新疆维吾尔自治区","西藏":"西藏自治区"
  },
  meta: { totalPositions:0, totalProvinces:0, dataYear:"", userDataLoaded:false },
  sort: { key:null, asc:true }, analytics: {},
  filters: { province:"", major:"", edu:"", party:"", exp:"" },
  page: 1, pageSize: 50, filterHistory: [], compareSet: []
};

// ── Demo data loader（从 window.SHEETLENS_DEMO 同步加载） ──
let DEMO_DATA = window.SHEETLENS_DEMO || null;
function loadDemoData() {
  if (!DEMO_DATA || !DEMO_DATA.length) {
    toast('示例数据不可用，请上传 Excel 文件', 'warn');
    return;
  }
  startDemoFlow();
}
function startDemoFlow() {
  let overlay = document.createElement('div');
  overlay.id = 'demoLoading';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;background:var(--bg);display:flex;align-items:center;justify-content:center;flex-direction:column;opacity:0;transition:opacity 0.35s ease';
  overlay.innerHTML = '<div style="margin-bottom:12px"><svg class="ico" aria-hidden="true" style="width:56px;height:56px;color:var(--primary)"><use href="#icon-shield"/></svg></div><div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px">正在加载示例数据…</div><div style="font-size:12px;color:var(--muted);margin-bottom:16px">13 个岗位 · 覆盖 9 省</div><div style="width:140px;height:4px;background:var(--border);border-radius:2px;overflow:hidden"><div id="demoLoaderBar" style="height:100%;width:0;background:var(--primary);border-radius:2px;transition:width 0.5s var(--spring)"></div></div>';
  document.body.appendChild(overlay);
  requestAnimationFrame(function() {
    overlay.style.opacity = '1';
    var bar = document.getElementById('demoLoaderBar');
    if (bar) requestAnimationFrame(function() { bar.style.width = '70%'; });
    setTimeout(function() {
      if (bar) bar.style.width = '100%';
      setTimeout(function() {
        finishUpload(DEMO_DATA.slice());
        toast('示例数据已加载 · 共 ' + formatNum(DEMO_DATA.length) + ' 个岗位 · 覆盖 ' + formatNum(Object.keys(STATE.provinceStats).length) + ' 省', 'success');
        overlay.style.opacity = '0';
        setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 400);
      }, 180);
    }, 450);
  });
}

// ═══════════════════════════════════════════════════════════════
//  FILTER
// ═══════════════════════════════════════════════════════════════
function applyFilters(positions, filters) {
  let p=filters.province, m=filters.major, e=filters.edu, py=filters.party, ex=filters.exp;
  let kw=m?m.split(/[,，\s]+/).filter(Boolean):[];
  return positions.filter(function(r){
    if(p&&r.r!==p)return false;
    if(kw.length&&!kw.some(function(k){return fuzzyMatch(r.m,k)}))return false;
    if(e){if(e==="仅限本科"){if(r.e.indexOf("仅限本科")===-1&&r.e.indexOf("限本科")===-1)return false}else if(e==="仅限硕士"){if(r.e.indexOf("仅限硕士")===-1&&r.e.indexOf("限硕士")===-1)return false}else{let b=e.replace("仅限","");if(r.e.indexOf(b)===-1)return false;if(r.e.indexOf("仅限")!==-1&&r.e.indexOf(e)===-1)return false}}
    if(py){if(py==="党员"){if(r.p.indexOf("党员")===-1)return false}else if(py==="不限"){if(r.p&&(r.p.indexOf("党员")!==-1||r.p.indexOf("团员")!==-1))return false}}
    if(ex){if(ex==="无限制"){if(r.x&&r.x!=="无限制"&&r.x.indexOf("不限")===-1)return false}else{if(r.x.indexOf(ex.replace("及以上",""))===-1)return false}}
    return true;
  });
}
// ── 模糊匹配：逐字跳跃匹配，「政法」→「政治学类、法学类」✅ ──
let _fzCache=new Map();
function fuzzyMatch(text, pattern) {
  if(!text||!pattern)return false;
  let key=text.toLowerCase()+"|"+pattern.toLowerCase();
  let cached=_fzCache.get(key);
  if(cached!==undefined)return cached;
  let ti=0,pi=0,t=text.toLowerCase(),p=pattern.toLowerCase();
  while(ti<t.length&&pi<p.length){if(t[ti]===p[pi])pi++;ti++;}
  let result=pi===p.length;
  _fzCache.set(key,result);
  return result;
}

// ── 专业关键词索引 ──
function buildMajorIndex(){
  let seen={};STATE.majorIndex=[];
  STATE.raw.forEach(function(r){
    (r.m||"").split(/[,，、\s]+/).forEach(function(m){m=m.trim();if(m&&m.length>=2&&!seen[m]){seen[m]=true;STATE.majorIndex.push(m);}});
  });
  STATE.majorIndex.sort();
}
// ── 自动补全 ──
let acIdx=-1;
function showAC(query){
  let dd=document.getElementById("acDropdown");if(!dd)return;
  if(!query||!STATE.majorIndex||!STATE.majorIndex.length){dd.style.display="none";acIdx=-1;return;}
  let parts=query.split(/[,，\s]+/),last=(parts[parts.length-1]||"").trim();
  if(!last||last.length<1){dd.style.display="none";acIdx=-1;return;}
  let matches=STATE.majorIndex.filter(function(m){return fuzzyMatch(m,last);}).slice(0,15);
  if(!matches.length){dd.style.display="none";acIdx=-1;return;}
  acIdx=-1;
  dd.innerHTML='<div class="ac-hint"><svg class="ico" aria-hidden="true" style="vertical-align:-2px"><use href="#icon-book"/></svg>匹配的专业（点击填入，↑↓选择）</div>'+matches.map(function(m,i){return'<div class="autocomplete-item" data-idx="'+i+'" data-val="'+m.replace(/"/g,"&quot;")+'">'+highlightAC(m,last)+'</div>';}).join("");
  dd.style.display="block";
  dd.querySelectorAll(".autocomplete-item").forEach(function(item){item.addEventListener("mousedown",function(e){e.preventDefault();parts[parts.length-1]=this.getAttribute("data-val");document.getElementById("selMajor").value=parts.join("、");dd.style.display="none";acIdx=-1;saveFiltersToStorage();handleFilterApply();});});
}
function highlightAC(text,q){
  let r="",ti=0,qi=0;text=text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  while(ti<text.length&&qi<q.length){if(text[ti].toLowerCase()===q[qi].toLowerCase()){r+="<b style='color:var(--primary)'>"+text[ti]+"</b>";qi++;}else{r+=text[ti];}ti++;}
  return r+text.slice(ti);
}
function hideAC(){setTimeout(function(){let dd=document.getElementById("acDropdown");if(dd)dd.style.display="none";acIdx=-1;},200);}
function navAC(dir){
  let dd=document.getElementById("acDropdown");if(!dd||dd.style.display==="none")return;
  let items=dd.querySelectorAll(".autocomplete-item");if(!items.length)return;
  items.forEach(function(item,i){item.classList.toggle("active",i===acIdx+dir);});
  acIdx+=dir;if(acIdx<0)acIdx=items.length-1;if(acIdx>=items.length)acIdx=0;
  items.forEach(function(item,i){item.classList.toggle("active",i===acIdx);if(i===acIdx)item.scrollIntoView({block:"nearest"});});
}
function selAC(){
  let dd=document.getElementById("acDropdown");if(!dd||dd.style.display==="none"||acIdx<0)return;
  let active=dd.querySelector(".autocomplete-item.active");if(!active)return;
  let val=active.getAttribute("data-val"),input=document.getElementById("selMajor");
  let parts=input.value.split(/[,，\s]+/);parts[parts.length-1]=val;
  input.value=parts.join("、");dd.style.display="none";acIdx=-1;
  saveFiltersToStorage();handleFilterApply();
}

// ═══════════════════════════════════════════════════════════════
//  SCORE
// ═══════════════════════════════════════════════════════════════
let EDU_LEVELS={"大专":1,"大专及以上":2,"本科":3,"本科及以上":3,"仅限本科":3,"硕士":5,"硕士研究生及以上":5,"仅限硕士":5,"博士":7,"博士研究生":7};
function getEduLevel(t){if(!t)return 0;for(let k in EDU_LEVELS){if(t.indexOf(k)!==-1)return EDU_LEVELS[k];}return 0;}
function eduMatches(ue,pe){if(!ue)return true;let ul=getEduLevel(ue);if(ul===0)return true;if(pe.indexOf("仅限")!==-1)return pe.indexOf(ue.replace("及以上",""))!==-1;return ul>=getEduLevel(pe);}
// ── 词边界匹配：防止「法学」误匹配到「法医学」──
	function wordBoundaryMatch(text, keyword){
	  if(!text||!keyword)return false;
	  if(!fuzzyMatch(text,keyword))return false;
	  let idx=text.indexOf(keyword);
	  if(idx===-1)return true;
	  let before=idx>0?text[idx-1]:'';
	  let after=idx+keyword.length<text.length?text[idx+keyword.length]:'';
	  let sepBefore=/[,，、\s(（【〔]/.test(before)||idx===0;
	  let sepAfter=/[,，、\s)）】〕]/.test(after)||idx+keyword.length===text.length;
	  if(sepBefore&&sepAfter)return true;
	  if(keyword.length>=text.length*0.7)return true;
	  if(/[一-鿿]/.test(before)||/[一-鿿]/.test(after)){
	    if(sepBefore||sepAfter)return true;
	    if(keyword.length<=2)return false;
	  }
	  return true;
	}

	function scoreOne(pos,profile){
	  if(!profile||!profile.enabled)return null;
	  let s=0,details=[];
	  if(profile.major){let kw=profile.major.split(/[,，\s]+/).filter(Boolean);if(kw.length){if(pos.m.indexOf("不限")!==-1||pos.m===""){s+=12;details.push({d:"专业",p:12,m:25,n:"不限专业"});}else{let mc=0;kw.forEach(function(k){if(wordBoundaryMatch(pos.m,k))mc++;});let mp=Math.min(Math.round(mc/kw.length*25),25);s+=mp;details.push({d:"专业",p:mp,m:25,n:"匹配"+mc+"/"+kw.length+"词"});}}}
	  if(profile.edu){if(eduMatches(profile.edu,pos.e)){s+=20;details.push({d:"学历",p:20,m:20,n:"满足"});}else{details.push({d:"学历",p:0,m:20,n:"要求"+pos.e});}}
	  let cp=Math.round(Math.log2(pos.c+1)*7);cp=Math.min(cp,15);s+=cp;details.push({d:"招录",p:cp,m:15,n:pos.c+"人"});
	  if(profile.party){if(profile.party==="党员"){if(!pos.p||pos.p.indexOf("党员")!==-1||pos.p.indexOf("不限")!==-1){s+=15;details.push({d:"政治",p:15,m:15,n:"党员匹配"});}else{details.push({d:"政治",p:0,m:15,n:"岗位限非党员"});}}else{if(pos.p.indexOf("党员")!==-1&&pos.p.indexOf("不限")===-1){details.push({d:"政治",p:0,m:15,n:"要求党员"});}else{s+=15;details.push({d:"政治",p:15,m:15,n:"满足"});}}}
	  if(profile.exp){if(profile.exp==="无"){if(!pos.x||pos.x==="无限制"||pos.x.indexOf("不限")!==-1){s+=15;details.push({d:"经验",p:15,m:15,n:"无限制"});}else{details.push({d:"经验",p:0,m:15,n:"要求"+pos.x});}}else{if(!pos.x||pos.x==="无限制"||pos.x.indexOf("不限")!==-1){s+=15;details.push({d:"经验",p:15,m:15,n:"满足"});}else if(pos.x.indexOf(profile.exp.replace("及以上",""))!==-1){s+=15;details.push({d:"经验",p:15,m:15,n:"匹配"});}else{details.push({d:"经验",p:0,m:15,n:"不匹配"});}}}
	  if(profile.province&&pos.r){
	    if(pos.r.indexOf(profile.province)!==-1||profile.province.indexOf(pos.r)!==-1){
	      s+=10;details.push({d:"地区",p:10,m:10,n:"匹配"+profile.province});
	    }
	  }
	  return{total:s,pct:Math.round(s/100*100),details:details};
	}
function scoreAll(positions,profile){if(!profile||!profile.enabled)return positions;return positions.map(function(p){let r=scoreOne(p,profile);let out=Object.assign({},p);out._score=r?r.total:null;out._detail=r?r.details:null;return out;});}
function scoreGrade(pts){if(pts===null||pts===undefined)return"";if(pts>=80)return"score-a";if(pts>=60)return"score-b";if(pts>=40)return"score-c";return"score-d";}
function scoreLabel(pts){if(pts===null||pts===undefined)return"";if(pts>=80)return"强烈推荐";if(pts>=60)return"推荐";if(pts>=40)return"可考虑";return"竞争激烈";}

// ═══════════════════════════════════════════════════════════════
//  ANALYTICS
// ═══════════════════════════════════════════════════════════════
function groupCount(d,k){let r={};d.forEach(function(x){let v=x[k]||"未知";r[v]=(r[v]||0)+1;});return r;}
function rebuildProvinceStats(){let ps={};STATE.raw.forEach(function(r){let p=r.r;if(!ps[p])ps[p]={total:0,politic:0};ps[p].total++;if(/政治学|国际政治|国际关系|外交学/.test(r.m))ps[p].politic++;});STATE.provinceStats=ps;}
function buildAnalytics(f){return{provinceCounts:groupCount(f,"r"),topProvinces:getTopN(f,"r",10),levelCounts:groupCount(f,"l"),attrCounts:groupCount(f,"a"),eduCounts:normalizeEdu(f),partyCounts:normalizeParty(f),expCounts:normalizeExp(f),deptTop10:getTopN(f,"d",10)};}
function getTopN(d,k,n){let c=groupCount(d,k);return Object.keys(c).map(function(x){return{name:x,value:c[x]};}).sort(function(a,b){return b.value-a.value;}).slice(0,n);}
function normalizeEdu(d){let ec={};d.forEach(function(r){let e=r.e||"其他";if(e.indexOf("本科")!==-1&&e.indexOf("硕士")===-1&&e.indexOf("博士")===-1)e="本科";else if(e.indexOf("硕士")!==-1&&e.indexOf("博士")===-1)e="硕士及以上";else if(e.indexOf("博士")!==-1)e="博士";else if(e.indexOf("大专")!==-1)e="大专";ec[e]=(ec[e]||0)+1;});return ec;}
function normalizeParty(d){let pc={};d.forEach(function(r){let p=r.p||"不限";if(p.indexOf("党员")!==-1&&p.indexOf("团员")!==-1)p="党员/团员";else if(p.indexOf("党员")!==-1)p="中共党员";else if(p.indexOf("团员")!==-1)p="共青团员";else p="不限";pc[p]=(pc[p]||0)+1;});return pc;}
function normalizeExp(d){let xc={};d.forEach(function(r){let x=r.x||"无限制";if(x.indexOf("不限")!==-1||x==="无限制")x="无限制";else if(x.indexOf("二年")!==-1)x="二年及以上";else if(x.indexOf("三年")!==-1)x="三年及以上";else if(x.indexOf("一年")!==-1)x="一年及以上";else if(x.indexOf("五年")!==-1)x="五年及以上";xc[x]=(xc[x]||0)+1;});return xc;}
function computeStats(f){return{totalPositions:f.length,totalRecruits:f.reduce(function(s,r){return s+r.c;},0),totalProvinces:new Set(f.map(function(r){return r.r;})).size};}
function computeScoreStats(f){let hasProfile=STATE.filters.major||STATE.filters.edu||STATE.filters.party||STATE.filters.exp;if(!hasProfile)return null;let s=f.filter(function(r){return r._score!==null&&r._score!==undefined;});if(!s.length)return null;let sum=s.reduce(function(a,r){return a+r._score;},0);let avg=Math.round(sum/s.length);let d={"强烈推荐":0,"推荐":0,"可考虑":0,"竞争激烈":0};s.forEach(function(r){if(r._score>=80)d["强烈推荐"]++;else if(r._score>=60)d["推荐"]++;else if(r._score>=40)d["可考虑"]++;else d["竞争激烈"]++;});return{avg:avg,dist:d,scored:s.length};}

// ═══════════════════════════════════════════════════════════════
//  RECOMPUTE
// ═══════════════════════════════════════════════════════════════
function recompute(){STATE.filtered=applyFilters(STATE.raw,STATE.filters);scoreIfNeeded();STATE.analytics=buildAnalytics(STATE.filtered);}
function scoreIfNeeded(){let hasProfile=STATE.filters.major||STATE.filters.edu||STATE.filters.party||STATE.filters.exp;if(hasProfile){let p={enabled:true,major:STATE.filters.major,edu:STATE.filters.edu,party:STATE.filters.party,exp:STATE.filters.exp,province:STATE.filters.province};STATE.filtered=scoreAll(STATE.filtered,p);}}
function dataChanged(){rebuildProvinceStats();rebuildDropdown();STATE.meta.totalPositions=STATE.raw.length;STATE.meta.totalProvinces=Object.keys(STATE.provinceStats).length;updateStatsUI();renderAll();}
function filterChanged(){recompute();updateStatsUI();renderAll();var cc=document.querySelector('.content-card');if(cc){cc.classList.remove('filter-pulse');void cc.offsetWidth;cc.classList.add('filter-pulse');setTimeout(function(){cc.classList.remove('filter-pulse')},600)}}
function rebuildDropdown(){let sel=document.getElementById("selProvince");sel.innerHTML='<option value="">全部省份</option>';Object.keys(STATE.provinceStats).sort().forEach(function(p){let o=document.createElement("option");o.value=p;o.textContent=p+" ("+STATE.provinceStats[p].total+"岗)";sel.appendChild(o);});}
function updateStatsUI(){
  let f=STATE.filtered,st=computeStats(f);
  let prev=STATE._prevStats||{pos:0,rec:0,prov:0};
  // 数字滚动动画
  _animNum(document.getElementById("statPos"),prev.pos,st.totalPositions,"");
  _animNum(document.getElementById("statRec"),prev.rec,st.totalRecruits,"人");
  _animNum(document.getElementById("statProv"),prev.prov,st.totalProvinces,"");
  STATE._prevStats={pos:st.totalPositions,rec:st.totalRecruits,prov:st.totalProvinces};
  // 筛选标签
  renderFilterBadges();
  let si=document.getElementById("statScoreItem");
  let hasProfile=STATE.filters.major||STATE.filters.edu||STATE.filters.party||STATE.filters.exp;
  let ss=hasProfile?computeScoreStats(f):null;
  let bar=document.getElementById("scoreBar");
  if(ss){si.style.display="flex";requestAnimationFrame(function(){si.classList.add('stat-score-reveal')});document.getElementById("statScore").textContent=ss.avg+"分";
    bar.style.display="flex";requestAnimationFrame(function(){bar.classList.add('stat-score-reveal')});
    document.getElementById("scoreBarInner").innerHTML='<span class="score-bar-item"><span class="n green">'+ss.dist["强烈推荐"]+'</span> <span class="l">强烈推荐</span></span> <span class="score-bar-item"><span class="n blue">'+ss.dist["推荐"]+'</span> <span class="l">推荐</span></span> <span class="score-bar-item"><span class="n orange">'+ss.dist["可考虑"]+'</span> <span class="l">可考虑</span></span> <span class="score-bar-item"><span class="n red">'+ss.dist["竞争激烈"]+'</span> <span class="l">竞争激烈</span></span>';
  }else{si.classList.remove('stat-score-reveal');si.style.display="none";
    bar.classList.remove('stat-score-reveal');bar.style.display="none";
  }
}
// 数字滚动核心（支持后缀单位如「人」）
function _animNum(el,from,to,unit){
  if(!el)return;if(from===to){el.textContent=formatNum(to)+(unit||"");return;}
  let start=performance.now(),dur=420;
  function step(ts){let p=Math.min((ts-start)/dur,1);let e=1-Math.pow(1-p,3);el.textContent=formatNum(Math.round(from+(to-from)*e))+(unit||"");if(p<1)requestAnimationFrame(step);else el.textContent=formatNum(to)+(unit||"");}
  requestAnimationFrame(step);
}
function getProvinceDistribution(){let dist={},fm={},mm={};let mk=STATE.filters.major?STATE.filters.major.split(/[,，\s]+/).filter(Boolean):[];STATE.filtered.forEach(function(r){fm[r.r]=(fm[r.r]||0)+1;});if(mk.length){STATE.raw.forEach(function(r){if(mk.some(function(k){return r.m.indexOf(k)!==-1;}))mm[r.r]=(mm[r.r]||0)+1;});}Object.keys(STATE.provinceStats).forEach(function(s){let fn=STATE.provinceMap[s]||s;dist[s]={name:fn,shortName:s,filtered:fm[s]||0,total:STATE.provinceStats[s].total,majorMatch:mm[s]||0,majorLabel:mk.length?mk.join("/"):""};});return dist;}

// ═══════════════════════════════════════════════════════════════
//  CHART UTILS
// ═══════════════════════════════════════════════════════════════
function echartsReady(){return typeof echarts!=="undefined";}
function destroyAllCharts(){if(typeof destroyMapChart==="function")destroyMapChart();if(typeof destroyTrendCharts==="function")destroyTrendCharts();}

// ═══════════════════════════════════════════════════════════════
//  UPLOAD
// ═══════════════════════════════════════════════════════════════
(function(){let uz=document.getElementById("uploadZone"),fi=document.getElementById("fileInput");uz.addEventListener("click",function(){fi.click();uz.classList.remove("idle");});fi.addEventListener("change",function(){handleFiles(this.files);});uz.addEventListener("dragover",function(e){e.preventDefault();uz.classList.add("dragover");uz.classList.remove("idle");});uz.addEventListener("dragleave",function(){uz.classList.remove("dragover");});uz.addEventListener("drop",function(e){e.preventDefault();uz.classList.remove("dragover");handleFiles(e.dataTransfer.files);});})();
function handleFiles(files){
  if(!files||!files.length)return;
  let MAX=30*1024*1024,ALLOWED=['.xlsx','.xls'],valid=[],rejected=[],oversized=[];
  Array.from(files).forEach(function(f){
    let ext=f.name.toLowerCase().slice(f.name.lastIndexOf('.'));
    if(ALLOWED.indexOf(ext)===-1){rejected.push(f.name);return;}
    if(f.size>MAX){oversized.push(f.name);return;}
    valid.push(f);
  });
  if(rejected.length)toast('⚠ 不支持的文件格式: '+rejected.join(', '),'warn');
  if(oversized.length)toast('⚠ 文件过大(>30MB): '+oversized.join(', '),'warn');
  if(!valid.length){if(rejected.length||oversized.length)return;return;}
  files=valid;if(typeof XLSX==="undefined"){toast("⚠️ 组件加载中，请稍后重试","warn");return;}let allRows=[],totalFiles=files.length,loaded=0;Array.from(files).forEach(function(file){let reader=new FileReader();reader.onload=function(e){try{allRows=allRows.concat(parseExcelFile(e.target.result,file.name));}catch(err){console.error(file.name+":解析失败",err);}loaded++;if(loaded===totalFiles)finishUpload(allRows);};reader.readAsArrayBuffer(file);});}
function parseExcelFile(data,fileName){let wb=XLSX.read(data,{type:"array"});let allResults=[];wb.SheetNames.forEach(function(sn){let ws=wb.Sheets[sn];if(!ws)return;let rows=XLSX.utils.sheet_to_json(ws,{defval:""});if(!rows.length)return;let headers=Object.keys(rows[0]);let testKws=["部门名称","招考职位","职位名称","专业","学历","工作地点","地区","省份"];let matched={},uniqueCols={};testKws.forEach(function(kw){for(let i=0;i<headers.length;i++){if(headers[i].indexOf(kw)!==-1){matched[kw]=headers[i];break;}}});Object.values(matched).forEach(function(v){uniqueCols[v]=true;});if(Object.keys(matched).length<3||Object.keys(uniqueCols).length<3){let rawRows=XLSX.utils.sheet_to_json(ws,{defval:"",header:1});if(rawRows.length>=2){let newHeaders=rawRows[1];rows=[];for(let r=2;r<rawRows.length;r++){let obj={};for(let c=0;c<newHeaders.length;c++)obj[String(newHeaders[c]||"")]=rawRows[r][c]!==undefined?rawRows[r][c]:"";rows.push(obj);}if(rows.length>0){headers=Object.keys(rows[0]);console.warn(fileName+"/"+sn+":自动跳过说明行");}}}function findCol(keywords){for(let i=0;i<headers.length;i++){let h=headers[i];for(let k=0;k<keywords.length;k++){if(h.indexOf(keywords[k])!==-1)return h;}}return null;}let mDept=findCol(["部门名称","招录机关","用人司局","招录单位","单位名称"]),mTitle=findCol(["招考职位","职位名称","招录职位","岗位名称","职位"]),mLevel=findCol(["机构层级","机构性质","单位层级","层级"]),mAttr=findCol(["职位属性","职位类别","岗位属性","考试类别"]),mMajor=findCol(["专业","学科"]),mEdu=findCol(["学历","文化程度","学位"]),mParty=findCol(["政治面貌"]),mExp=findCol(["基层工作最低年限","基层经验","基层工作年限","工作年限"]),mCount=findCol(["招考人数","招录人数","计划招录","招录计划","招录"]),mRegion=findCol(["地区","省份","所属地区","所在省份","工作所在地"]),mLocation=findCol(["工作地点","工作地址","地点","所在地"]);console.log(fileName+"/"+sn+":检测到表头",JSON.stringify(headers.slice(0,15)));if(!mMajor){console.warn(fileName+"/"+sn+":无「专业」列，跳过。表头="+JSON.stringify(headers));return;}let result=[];rows.forEach(function(row){let region=String(row[mRegion]||"");if(!region&&mLocation){let loc=String(row[mLocation]||"");for(let s in STATE.provinceMap){if(loc.indexOf(s)!==-1){region=s;break;}}}if(!region)return;let count=parseInt(row[mCount])||1;result.push({d:String(row[mDept]||""),t:String(row[mTitle]||""),l:String(row[mLevel]||""),a:String(row[mAttr]||""),m:String(row[mMajor]||""),e:String(row[mEdu]||""),p:String(row[mParty]||""),x:String(row[mExp]||""),c:count,r:region});});if(result.length){console.log(fileName+"/"+sn+":解析"+result.length+"行");allResults=allResults.concat(result);}});console.log(fileName+":共"+wb.SheetNames.length+"个Sheet，有效数据"+allResults.length+"行");return allResults;}
function finishUpload(allRows){if(!allRows.length){toast("⚠️ 未能解析有效数据，请检查文件格式","warn");return;}STATE.raw=allRows;STATE.meta.userDataLoaded=true;STATE.meta.dataYear=new Date().toISOString().slice(0,10);try{let s=loadSettings();s.__hasData=true;saveSettings(s);}catch(e){}document.getElementById("dataBadge").innerHTML='<svg class="ico" aria-hidden="true"><use href="#icon-upload-cloud"/></svg>用户数据 ('+formatNum(allRows.length)+"岗)";document.getElementById("dataBadge").className="data-badge user";document.getElementById("statYear").textContent="上传";STATE.sort.key=null;STATE.sort.asc=true;STATE.filters={province:"",major:"",edu:"",party:"",exp:""};STATE.filterHistory=[];updateUndoBtn();document.getElementById("selProvince").value="";document.getElementById("selMajor").value="";document.getElementById("selEdu").value="";document.getElementById("selParty").value="";document.getElementById("selExp").value="";STATE.filtered=STATE.raw.slice();buildMajorIndex();saveFiltersToStorage();document.getElementById("uploadZone").classList.remove("idle");STATE._prevStats=null;dataChanged();renderTable();if(typeof destroyAllCharts==="function")destroyAllCharts();hideEmptyStates();toast("✅ 成功解析 "+formatNum(allRows.length)+" 个岗位","success");}

// ═══════════════════════════════════════════════════════════════
//  TABLE VIEW
// ═══════════════════════════════════════════════════════════════
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function hideEmptyStates(){document.getElementById("trendEmpty").style.display="none";document.getElementById("trendCharts").style.display="block";document.getElementById("tableEmpty").style.display="none";document.getElementById("tableContent").style.display="block";}
function renderTable(){
  let data=STATE.filtered,tbody=document.getElementById("tableBody"),info=document.getElementById("tableInfo");
  // ── Loading skeleton（大数据集或首次渲染时显示一帧） ──
  if(data.length > 30 || (tbody && !tbody.children.length)){
    if(tbody){
      let skeletonHTML = '<tr><td colspan="11" style="padding:0"><div style="padding:8px 0">';
      for(let i=0; i<6; i++){
        skeletonHTML += '<div class="skeleton-row">' +
          '<div class="skeleton skeleton-cell short"></div>' +
          '<div class="skeleton skeleton-cell"></div>' +
          '<div class="skeleton skeleton-cell"></div>' +
          '<div class="skeleton skeleton-cell short"></div>' +
          '<div class="skeleton skeleton-cell short"></div>' +
          '</div>';
      }
      skeletonHTML += '</div></td></tr>';
      tbody.innerHTML = skeletonHTML;
    }
  }
  let scoring=hasProfile();
  document.getElementById("thScore").style.display=scoring?"":"none";
  let colSpan=scoring?11:10;
  if(!data.length){info.textContent="暂无匹配岗位";tbody.innerHTML='<tr><td colspan="'+colSpan+'" style="text-align:center;padding:40px;color:var(--muted)">没有岗位匹配当前筛选条件<br><small>试试调整专业关键词或放宽学历要求</small></td></tr>';return;}
  let d=data.slice();
  if(STATE.sort.key){d.sort(function(a,b){let key=STATE.sort.key,va,vb;if(key==="_score"){va=a._score!==null?a._score:-1;vb=b._score!==null?b._score:-1;}else if(key==="c"){va=Number(a[key]);vb=Number(b[key]);}else{va=String(a[key]||"");vb=String(b[key]||"");}if(va<vb)return STATE.sort.asc?-1:1;if(va>vb)return STATE.sort.asc?1:-1;let da=String(a.d||""),db=String(b.d||"");if(da<db)return -1;if(da>db)return 1;let ta=String(a.t||""),tb=String(b.t||"");if(ta<tb)return -1;if(ta>tb)return 1;return 0;});}
  STATE._displayed=d;
  let totalPages=Math.ceil(d.length/STATE.pageSize)||1;
  if(STATE.page>totalPages)STATE.page=totalPages;
  let start=(STATE.page-1)*STATE.pageSize,disp=d.slice(start,start+STATE.pageSize);
  info.textContent="共 "+formatNum(data.length)+" 条 · 第 "+STATE.page+"/"+totalPages+" 页 · 点击行查看详情";
  if(scoring){let ss=computeScoreStats(data);document.getElementById("scoreSummary").innerHTML=ss?"均分 "+ss.avg+"分 | <svg class=\"ico\" aria-hidden=\"true\" style=\"vertical-align:-2px;color:var(--primary)\"><use href=\"#icon-star\"/></svg>"+(ss.dist["强烈推荐"]+ss.dist["推荐"])+" 个推荐":"";}else{document.getElementById("scoreSummary").textContent="";}
  tbody.innerHTML=disp.map(function(r,i){let idx=start+i;let row="";if(scoring){let g=scoreGrade(r._score),l=scoreLabel(r._score);row+='<td><span class="score-cell '+g+'">'+(r._score!==null?l:"—")+'</span></td>';}row+="<td>"+esc(r.d)+"</td><td>"+esc(r.t)+"</td><td>"+esc(r.l)+"</td><td>"+esc(r.e)+"</td><td>"+(esc(r.p)||"不限")+"</td><td>"+(esc(r.x)||"无限制")+"</td><td>"+r.c+"</td><td>"+esc(r.r)+"</td>";let checked=STATE.compareSet.indexOf(r)!==-1?" checked":"";return'<tr class="clickable-row" data-idx="'+idx+'"><td style="text-align:center"><input type="checkbox" class="compare-cb" data-idx="'+idx+'"'+checked+'></td>'+row+"</tr>";}).join("");
  updatePagination();
}
function updatePagination(){
  let d=STATE._displayed||[],tp=Math.ceil(d.length/STATE.pageSize)||1;
  let pg=document.getElementById("pagination");
  if(tp<=1){pg.style.display="none";return;}
  pg.style.display="flex";
  document.getElementById("pageInfo").textContent="第 "+STATE.page+"/"+tp+" 页（共 "+formatNum(d.length)+" 条）";
  document.getElementById("btnPagePrev").disabled=STATE.page<=1;
  document.getElementById("btnPageNext").disabled=STATE.page>=tp;
}
function goPage(dir){
  let d=STATE._displayed||[],tp=Math.ceil(d.length/STATE.pageSize)||1;
  STATE.page=Math.max(1,Math.min(tp,STATE.page+dir));
  renderTable();updatePagination();
}
function setSort(key){if(STATE.sort.key===key)STATE.sort.asc=!STATE.sort.asc;else{STATE.sort.key=key;STATE.sort.asc=hasProfile()&&key==="_score"?false:true;}renderTable();updateSortArrows();}
function updateSortArrows(){document.querySelectorAll(".table-wrap th").forEach(function(th){let key=th.getAttribute("data-sort");if(!key)return;th.textContent=th.textContent.replace(/ [▴▾]/g,"");});if(STATE.sort.key){let at=document.querySelector('.table-wrap th[data-sort="'+STATE.sort.key+'"]');if(at)at.textContent+=STATE.sort.asc?" ▴":" ▾";}}
document.addEventListener("DOMContentLoaded",function(){let thead=document.querySelector(".table-wrap thead");if(thead){thead.addEventListener("click",function(e){let th=e.target.closest("th");if(!th)return;let key=th.getAttribute("data-sort");if(key)setSort(key);});}});
// 表格行点击 → 详情弹窗（点复选框不触发弹窗）
document.addEventListener("click",function(e){if(e.target.closest("input.compare-cb"))return;if(e.target.closest("#cbSelectAll"))return;let tr=e.target.closest("tr.clickable-row");if(!tr)return;let idx=parseInt(tr.getAttribute("data-idx"));let row=STATE._displayed&&STATE._displayed[idx];if(row)openModal(row);});
// 复选框变更 → 更新对比集
document.addEventListener("change",function(e){
  if(!e.target.classList.contains("compare-cb")&&e.target.id!=="cbSelectAll")return;
  let cb=e.target,idx=parseInt(cb.getAttribute("data-idx"));
  let d=STATE._displayed||[];
  if(cb.id==="cbSelectAll"){
    STATE.compareSet=[];
    if(cb.checked){for(let i=0;i<Math.min(d.length,3);i++)STATE.compareSet.push(d[i]);}
    document.querySelectorAll(".compare-cb").forEach(function(c,i){c.checked=cb.checked&&i<3;});
  }else{
    let row=d[idx];
    if(cb.checked){
      if(STATE.compareSet.length>=3){cb.checked=false;toast("最多对比3个岗位","warn");return;}
      STATE.compareSet.push(row);
    }else{
      STATE.compareSet=STATE.compareSet.filter(function(v){return v!==row;});
    }
    document.getElementById("cbSelectAll").checked=STATE.compareSet.length===Math.min(d.length,3);
  }
  updateCompareBtn();
});
function updateCompareBtn(){let b=document.getElementById("btnCompare"),n=STATE.compareSet.length;b.disabled=n<2;b.innerHTML=n?"<svg class=\"ico\" aria-hidden=\"true\"><use href=\"#icon-scale\"/></svg>对比选中 ("+n+")":"<svg class=\"ico\" aria-hidden=\"true\"><use href=\"#icon-scale\"/></svg>对比选中";}
function openCompare(){
  let d=STATE._displayed||[],items=STATE.compareSet.filter(Boolean);
  if(items.length<2)return;
  let fields=[{k:"d",l:"部门名称"},{k:"t",l:"职位名称"},{k:"l",l:"机构层级"},{k:"a",l:"职位属性"},{k:"m",l:"专业要求"},{k:"e",l:"学历要求"},{k:"p",l:"政治面貌"},{k:"x",l:"基层经验"},{k:"c",l:"招考人数"},{k:"r",l:"省份"}];
  let html='<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr><th style="padding:8px;background:var(--border);text-align:left">字段</th>';
  items.forEach(function(it,i){html+='<th style="padding:8px;background:var(--accent-light);text-align:left;color:var(--primary)">岗位'+(i+1)+'</th>';});
  html+='</tr></thead><tbody>';
  fields.forEach(function(f){html+='<tr><td style="padding:8px;border-bottom:1px solid var(--border);font-weight:600;color:var(--muted);white-space:nowrap">'+esc(f.l)+'</td>';items.forEach(function(it){let v=it[f.k]||"—";if(f.k==="c")v=v+" 人";if(f.k==="p"&&!v)v="不限";if(f.k==="x"&&!v)v="无限制";html+='<td style="padding:8px;border-bottom:1px solid var(--border)">'+esc(v)+'</td>';});html+='</tr>';});
  // 评分对比
  if(items[0]._score!==null&&items[0]._score!==undefined){
    html+='<tr><td style="padding:8px;border-bottom:1px solid var(--border);font-weight:600;color:var(--muted)"><svg class="ico" aria-hidden="true" style="vertical-align:-2px;color:var(--primary)"><use href="#icon-star"/></svg>匹配评分</td>';
    items.forEach(function(it){let s=it._score,l=scoreLabel(it._score);html+='<td style="padding:8px;border-bottom:1px solid var(--border);font-weight:700;color:var(--primary)">'+esc(s)+'分 <span style="font-size:11px">'+esc(l)+'</span></td>';});
    html+='</tr>';
  }
  html+='</tbody></table>';
  document.getElementById("modalTitle").innerHTML='<svg class="ico" aria-hidden="true"><use href="#icon-scale"/></svg>岗位对比（'+items.length+"个）";
  document.getElementById("modalBody").innerHTML=html;
  document.getElementById("modalOverlay").style.display="flex";
}
function exportCSV(){let data=STATE.filtered;if(!data.length){toast("⚠️ 没有数据可导出","warn");return;}let scoring=hasProfile();let headers=scoring?["评分","部门名称","职位名称","机构层级","学历要求","政治面貌","基层经验","招考人数","省份"]:["部门名称","职位名称","机构层级","学历要求","政治面貌","基层经验","招考人数","省份"];let keys=scoring?["_score","d","t","l","e","p","x","c","r"]:["d","t","l","e","p","x","c","r"];let csv="﻿"+headers.join(",")+"\n";data.forEach(function(r){csv+=keys.map(function(k){let v=(k==="_score")?(r._score!==null?scoreLabel(r._score):""):(r[k]||"");let s=String(v);if(/^[=+\-@]/.test(s))s="'"+s;return'"'+s.replace(/"/g,'""')+'"';}).join(",")+"\n";});  let blob=new Blob([csv],{type:"text/csv;charset=utf-8"});let url=URL.createObjectURL(blob);let a=document.createElement("a");a.href=url;a.download="SheetLens筛选结果_"+new Date().toISOString().slice(0,10)+".csv";a.click();URL.revokeObjectURL(url);toast("📥 已导出 "+formatNum(data.length)+" 条数据","success");}
function exportPDF(){
  if(!STATE.filtered.length){ toast("⚠️ 没有数据可导出","warn"); return; }
  // 切到 table tab（打印时只显示表格视图）
  if(typeof switchTab === 'function'){ switchTab('table'); } else { document.querySelector('[data-tab="table"]')?.click(); }
  setTimeout(function(){
    toast("🖨️ 正在打开打印对话框，选择「另存为 PDF」即可导出", "info", 3000);
    setTimeout(function(){ window.print(); }, 300);
  }, 200);
}

// ── 图表暗色适配 ──
function themeTC(){return document.documentElement.getAttribute("data-theme")==="dark"?"#d5d0c8":"#2d2a26";}
function themeMC(){return document.documentElement.getAttribute("data-theme")==="dark"?"#8899aa":"#8b7e74";}
function themeLabelC(){return document.documentElement.getAttribute("data-theme")==="dark"?"#aaa":"#555";}
// 从 :root 读 CSS var 的实际值（ECharts 走 Canvas 渲染、不解析 var()，必须给具体色值）
function cssv(name){return getComputedStyle(document.documentElement).getPropertyValue(name).trim();}
// ═══════════════════════════════════════════════════════════════
//  MAP
// ═══════════════════════════════════════════════════════════════
let mapChart=null;
// chinaGeoLoaded 已在文件顶部声明（init 阶段要写）
function loadChinaGeo(){
  // 1) 优先 localStorage 缓存
  let _g=localStorage.getItem('gwy_sheetlens_geojson') || localStorage.getItem('sheetlens_geojson');
  if(_g){try{echarts.registerMap('china',JSON.parse(_g));chinaGeoLoaded=true;return Promise.resolve();}catch(e){localStorage.removeItem('gwy_sheetlens_geojson');}}
  // 2) localStorage 没有则用 CDN（vendor/china.geo.js 已在 init 阶段同步注册，这里只是兜底）
  return fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
    .then(function(r){return r.json();})
    .then(function(geo){try{localStorage.setItem('gwy_sheetlens_geojson',JSON.stringify(geo));}catch(e){}echarts.registerMap('china',geo);chinaGeoLoaded=true;});
}
function destroyMapChart(){if(mapChart&&!mapChart.isDisposed()){mapChart.dispose();mapChart=null;}}
function renderMap(){
  let el=document.getElementById("chartMap");if(!el)return;
  if(!echartsReady())return;
  if(!STATE.raw.length){
    if(mapChart&&!mapChart.isDisposed())mapChart.dispose();mapChart=null;
    el.innerHTML='<div class="empty-state" style="padding:60px 20px"><div class="empty-icon"><svg class="ico" aria-hidden="true" style="width:48px;height:48px"><use href="#icon-map"/></svg></div><div class="empty-title">加载数据后显示地图</div><div class="empty-desc">上传职位表或点击下方按钮加载示例数据</div><button class="btn btn-success btn-sm demo-cta-btn" style="margin-top:16px"><svg class="ico" aria-hidden="true"><use href="#icon-target"/></svg>试玩示例数据</button></div>';
    return;
  }
  if(!mapChart||mapChart.isDisposed()){if(el.children.length&&!el.querySelector("canvas"))el.innerHTML="";mapChart=echarts.init(el);}
  let provDist=getProvinceDistribution();
  let mapData=Object.keys(provDist).map(function(s){let d=provDist[s];return{name:d.name,value:d.filtered,total:d.total,majorMatch:d.majorMatch,majorLabel:d.majorLabel,shortName:d.shortName};});
  let maxVal=Math.max.apply(null,mapData.map(function(d){return d.value;}).concat([1]));
  let tc=themeTC(),tcL=themeLabelC(),tcM=themeMC(),primaryC=cssv("--primary"),primaryDarkC=cssv("--primary-dark"),primary50C=cssv("--primary-50"),cardC=cssv("--card"),borderC=cssv("--border"),textC=cssv("--text"),mapColors=[cssv("--map-1"),cssv("--map-2"),cssv("--map-3"),cssv("--map-4"),cssv("--map-5")],opt={title:{text:"各省岗位分布",subtext:"点击省份筛选 · 拖拽漫游 · 滚轮缩放",left:"center",top:8,textStyle:{fontSize:18,color:tc,fontWeight:"bold"},subtextStyle:{color:tcM,fontSize:12}},tooltip:{trigger:"item",backgroundColor:cardC,borderColor:borderC,borderWidth:1,textStyle:{color:textC,fontSize:13},extraCssText:"box-shadow:0 8px 24px rgba(0,0,0,0.15);border-radius:12px;padding:10px 14px;",formatter:function(p){if(!p.data||!p.data.total)return'<span style="color:'+tcM+'">'+p.name+"</span><br/>暂无数据";let tip='<b style="font-size:14px;color:'+tc+'">'+(p.data.shortName||p.name)+'</b><br/>当前筛选: <b style="color:'+primaryC+'">'+(p.data.value||0)+'</b> 岗<br/>全省总数: '+p.data.total+" 岗";if(p.data.majorLabel)tip+='<br/><span style="color:'+tcM+';font-size:12px">「'+p.data.majorLabel+"」相关: "+p.data.majorMatch+" 岗</span>";return tip;}},  visualMap:{min:0,max:maxVal,text:["岗位多","岗位少"],calculable:true,left:10,bottom:30,orient:"vertical",itemWidth:14,itemHeight:140,inRange:{color:mapColors},textStyle:{color:tcL,fontSize:11}},  series:[{type:"map",map:"china",roam:true,zoom:1.15,top:60,selectedMode:"single",select:{itemStyle:{areaColor:primaryC,borderColor:primaryDarkC,borderWidth:2,shadowBlur:12,shadowColor:"rgba(230,126,34,0.5)"},label:{show:true,color:"#fff",fontWeight:"bold",fontSize:13,formatter:function(p){return p.name+(p.data&&p.data.value?" · "+p.data.value+"岗":"")}}},label:{show:true,fontSize:10,color:tcL},emphasis:{label:{show:true,fontSize:14,fontWeight:"bold",color:primaryDarkC},itemStyle:{areaColor:primary50C,borderColor:primaryC,borderWidth:1.5,shadowBlur:6,shadowColor:"rgba(230,126,34,0.3)"}},data:mapData}]};
  function applyMapOption(opt){
    mapChart.setOption(opt);
    // 同步持久高亮：与 STATE.filters.province 对齐（覆盖之前的高亮）
    let curFull=STATE.filters.province && provDist[STATE.filters.province] ? provDist[STATE.filters.province].name : null;
    if(STATE._mapSelectedName && STATE._mapSelectedName!==curFull){
      try{mapChart.dispatchAction({type:'unselect',name:STATE._mapSelectedName});}catch(e){}
    }
    if(curFull){
      try{mapChart.dispatchAction({type:'select',name:curFull});}catch(e){}
    }
    STATE._mapSelectedName=curFull;
    mapChart.off("click");
    mapChart.on("click",function(p){
      if(p.data && p.data.shortName){
        let sel=document.getElementById("selProvince");
        let isCancel=sel.value===p.data.shortName;
        sel.value=isCancel?"":p.data.shortName;
        // 持久高亮：单选模式切换（先清旧的、再选新的）
        try{
          let newFull=isCancel?null:p.name;
          let oldFull=STATE._mapSelectedName;
          if(oldFull && oldFull!==newFull) mapChart.dispatchAction({type:'unselect',name:oldFull});
          if(newFull) mapChart.dispatchAction({type:'select',name:newFull});
        }catch(e){}
        STATE._mapSelectedName=isCancel?null:p.name;
        handleFilterApply();
        toast(isCancel?"已取消「"+p.data.shortName+"」省份筛选":"已筛选「"+p.data.shortName+"」共 "+formatNum(p.data.value||0)+" 岗",isCancel?"info":"success");
      }
    });
  }
  if(!chinaGeoLoaded){
    mapChart.showLoading({text:"加载地图数据..."});
    loadChinaGeo().then(function(){
      // race 守卫：用户可能切了 tab，mapChart 已被 dispose
      if(!mapChart || mapChart.isDisposed()) return;
      mapChart.hideLoading();
      applyMapOption(opt);
    }).catch(function(){
      // race 守卫：同上
      if(!mapChart || mapChart.isDisposed()) return;
      mapChart.hideLoading();
      mapChart.setOption({title:{text:"地图加载失败，请检查网络连接",left:"center",top:"center",textStyle:{color:"#999",fontSize:16}}});
    });
    return;
  }
  applyMapOption(opt);
}
window.addEventListener("resize",function(){if(mapChart&&!mapChart.isDisposed()&&document.getElementById("tab-map")&&document.getElementById("tab-map").classList.contains("active"))mapChart.resize();});

// ═══════════════════════════════════════════════════════════════
//  TREND — 7 charts
// ═══════════════════════════════════════════════════════════════
let trendCharts={};
function destroyTrendCharts(){Object.keys(trendCharts).forEach(function(k){if(trendCharts[k]&&!trendCharts[k].isDisposed())trendCharts[k].dispose();});trendCharts={};}
function getChart(id){if(!trendCharts[id]||trendCharts[id].isDisposed()){let el=document.getElementById(id);if(!el)return null;trendCharts[id]=echarts.init(el);}return trendCharts[id];}
// 7套独立配色，每张图有自己的视觉辨识度
let CP={
  warm:["#e67e22","#f39c12","#f5b041","#fad7a0","#fdebd0"],
  sunset:["#e74c3c","#c0392b","#ec7063","#f1948a","#f5b7b1"],
  ocean:["#2980b9","#2471a3","#5dade2","#85c1e9","#aed6f1"],
  forest:["#27ae60","#1e8449","#58d68d","#82e0aa","#abebc6"],
  plum:["#8e44ad","#7d3c98","#af7ac5","#c39bd3","#d7bde2"],
  slate:["#2c3e50","#34495e","#5d6d7e","#85929e","#aeb6bf"],
  amber:["#d35400","#e67e22","#f39c12","#f5b041","#f8c471"]
};
function renderTrend(){
  if(!echartsReady())return;
  if(!STATE.filtered.length){
    let ec=themeMC();
    ["chartBar1","chartPie1","chartPie2","chartPie3","chartPie4","chartBar2","chartPie5"].forEach(function(id){
      let c=getChart(id);if(c)c.setOption({title:{text:"",left:"center"},series:[],xAxis:{show:false},yAxis:{show:false}},true);
    });
    let c0=getChart("chartBar1");
    if(c0)c0.setOption({title:{text:"当前筛选无匹配岗位",subtext:"试试调整专业关键词或放宽条件",left:"center",top:"center",textStyle:{color:ec,fontSize:16},subtextStyle:{color:ec,fontSize:12}},xAxis:{show:false},yAxis:{show:false},series:[]});
    return;
  }
  let tc=themeTC(),A=STATE.analytics;
  let c1=getChart("chartBar1");if(c1)c1.setOption({title:{text:"岗位数量 Top10 省份",left:"center",textStyle:{fontSize:14,color:tc}},tooltip:{trigger:"axis"},grid:{left:70,right:30,top:50,bottom:70},xAxis:{type:"category",data:A.topProvinces.map(function(d){return d.name;}),axisLabel:{rotate:45,fontSize:11}},yAxis:{type:"value",name:"岗位数"},series:[{type:"bar",data:A.topProvinces.map(function(d){return{value:d.value,itemStyle:{color:CP.warm[0]}};}),barWidth:"50%"}]});
  let c2=getChart("chartPie1");if(c2)c2.setOption({title:{text:"机构层级分布",left:"center",textStyle:{fontSize:14,color:tc}},tooltip:{trigger:"item",formatter:"{b}:{c}({d}%)"},series:[{type:"pie",radius:"60%",center:["50%","50%"],data:Object.keys(A.levelCounts).map(function(k){return{name:k,value:A.levelCounts[k]};}),label:{formatter:"{b}\n{d}%"},color:CP.sunset}]});
  let c3=getChart("chartPie2");if(c3)c3.setOption({title:{text:"学历要求分布",left:"center",textStyle:{fontSize:14,color:tc}},tooltip:{trigger:"item",formatter:"{b}:{c}({d}%)"},legend:{bottom:0},series:[{type:"pie",radius:["35%","60%"],center:["50%","45%"],data:Object.keys(A.eduCounts).map(function(k){return{name:k,value:A.eduCounts[k]};}),label:{formatter:"{b}\n{d}%"},color:CP.ocean}]});
  let c4=getChart("chartPie3");if(c4)c4.setOption({title:{text:"政治面貌要求",left:"center",textStyle:{fontSize:14,color:tc}},tooltip:{trigger:"item",formatter:"{b}:{c}({d}%)"},legend:{bottom:0},series:[{type:"pie",radius:["35%","60%"],center:["50%","45%"],data:Object.keys(A.partyCounts).map(function(k){return{name:k,value:A.partyCounts[k]};}),label:{formatter:"{b}\n{d}%"},color:CP.plum}]});
  let c5=getChart("chartPie4");if(c5)c5.setOption({title:{text:"职位属性分布",left:"center",textStyle:{fontSize:14,color:tc}},tooltip:{trigger:"item",formatter:"{b}:{c}({d}%)"},legend:{bottom:0},series:[{type:"pie",radius:["35%","60%"],center:["50%","45%"],data:Object.keys(A.attrCounts).map(function(k){return{name:k||"未分类",value:A.attrCounts[k]};}),label:{formatter:"{b}\n{d}%"},color:CP.forest}]});
  let c6=getChart("chartBar2");if(c6)c6.setOption({title:{text:"招录部门 Top10",left:"center",textStyle:{fontSize:14,color:tc}},tooltip:{trigger:"axis"},grid:{left:120,right:30,top:40,bottom:70},xAxis:{type:"value",name:"岗位数"},yAxis:{type:"category",data:A.deptTop10.map(function(d){return d.name;}).reverse(),axisLabel:{fontSize:11},inverse:true},series:[{type:"bar",data:A.deptTop10.map(function(d){return{value:d.value,itemStyle:{color:CP.slate[0]}};}).reverse(),barWidth:"60%"}]});
  let c7=getChart("chartPie5");if(c7)c7.setOption({title:{text:"基层经验要求",left:"center",textStyle:{fontSize:14,color:tc}},tooltip:{trigger:"item",formatter:"{b}:{c}({d}%)"},legend:{bottom:0},series:[{type:"pie",radius:["35%","60%"],center:["50%","45%"],data:Object.keys(A.expCounts).map(function(k){return{name:k,value:A.expCounts[k]};}),label:{formatter:"{b}\n{d}%"},color:CP.amber}]});
}
window.addEventListener("resize",function(){if(!document.getElementById("tab-trend")||!document.getElementById("tab-trend").classList.contains("active"))return;Object.keys(trendCharts).forEach(function(k){let c=trendCharts[k];if(c&&!c.isDisposed())c.resize();});});

// ═══════════════════════════════════════════════════════════════
//  APP CONTROLLER
// ═══════════════════════════════════════════════════════════════
let currentTab="map";
function switchTab(tab){currentTab=tab;document.querySelectorAll(".tab-btn").forEach(function(b){b.classList.remove("active");if(b.getAttribute("data-tab")===tab)b.classList.add("active");});document.querySelectorAll(".tab-content").forEach(function(c){c.classList.remove("active");});let el=document.getElementById("tab-"+tab);if(el)el.classList.add("active");onTabChanged(tab);}
function onTabChanged(tab){if(tab==="trend")setTimeout(function(){if(STATE.raw.length)renderTrend();},200);if(tab==="map")setTimeout(function(){if(STATE.raw.length)renderMap();else if(echartsReady()&&mapChart&&!mapChart.isDisposed())mapChart.resize();},200);if(tab==="table"){if(STATE.raw.length)renderTable();}}
function renderAll(){if(currentTab==="map")renderMap();else if(currentTab==="trend"&&STATE.raw.length)renderTrend();else if(currentTab==="table")renderTable();}

// 标签
document.querySelectorAll(".tab-btn").forEach(function(btn){btn.addEventListener("click",function(){let t=btn.getAttribute("data-tab");if(t)switchTab(t);});});

// 快捷标签
document.querySelectorAll(".quick-tag").forEach(function(tag){tag.addEventListener("click",function(){let action=tag.getAttribute("data-action");let val=tag.getAttribute("data-val");tag.classList.toggle("active");if(tag.classList.contains("active")){document.querySelectorAll(".quick-tag[data-action='"+action+"']").forEach(function(t){if(t!==tag)t.classList.remove("active");});if(action==="major"){document.getElementById("selMajor").value=val||"";}else if(action==="edu"){document.getElementById("selEdu").value=val;}else if(action==="party"){document.getElementById("selParty").value=val;}else if(action==="exp"){document.getElementById("selExp").value=val;}}else{if(action==="major"){document.getElementById("selMajor").value="";}else if(action==="edu"){document.getElementById("selEdu").value="";}else if(action==="party"){document.getElementById("selParty").value="";}else if(action==="exp"){document.getElementById("selExp").value="";}}handleFilterApply();});});

// 筛选/重置
document.getElementById("btnFilter").addEventListener("click",handleFilterApply);
document.getElementById("btnReset").addEventListener("click",handleFilterReset);
document.getElementById("btnExport").addEventListener("click",exportCSV);
  document.getElementById("btnExportPdf").addEventListener("click",exportPDF);
  // ── Ripple 波纹（按钮点击反馈） ──
  document.body.addEventListener('click', function(e){
    const btn = e.target.closest && e.target.closest('.btn, .tab-btn, .quick-tag');
    if(!btn) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height) * 0.6;
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(ripple);
    setTimeout(function(){ if(ripple.parentNode) ripple.parentNode.removeChild(ripple); }, 600);
  });
function handleFilterApply(){readFilters();STATE.filterHistory.push({province:STATE.filters.province,major:STATE.filters.major,edu:STATE.filters.edu,party:STATE.filters.party,exp:STATE.filters.exp});if(STATE.filterHistory.length>20)STATE.filterHistory.shift();updateUndoBtn();saveFiltersToStorage();STATE.page=1;STATE.sort.key=null;STATE.sort.asc=autoSort();filterChanged();if(typeof window.sheetlensSyncHash==="function")window.sheetlensSyncHash();}
function handleFilterReset(){document.getElementById("selProvince").value="";document.getElementById("selMajor").value="";document.getElementById("selEdu").value="";document.getElementById("selParty").value="";document.getElementById("selExp").value="";document.querySelectorAll(".quick-tag").forEach(function(t){t.classList.remove("active");});STATE.filters={province:"",major:"",edu:"",party:"",exp:""};STATE.sort.key=null;STATE.sort.asc=true;STATE.filtered=STATE.raw.slice();saveFiltersToStorage();STATE._prevStats=null;STATE.filterHistory=[];updateUndoBtn();recompute();updateStatsUI();renderAll();}
function undoFilter(){
  if(!STATE.filterHistory.length)return;
  let prev=STATE.filterHistory.pop();updateUndoBtn();
  STATE.filters=prev;
  document.getElementById("selProvince").value=prev.province||"";
  document.getElementById("selMajor").value=prev.major||"";
  document.getElementById("selEdu").value=prev.edu||"";
  document.getElementById("selParty").value=prev.party||"";
  document.getElementById("selExp").value=prev.exp||"";
  document.querySelectorAll(".quick-tag").forEach(function(t){
    let a=t.getAttribute("data-action"),v=t.getAttribute("data-val");
    t.classList.remove("active");
    if(a==="major"&&prev.major===v)t.classList.add("active");
    else if(a==="edu"&&prev.edu===v)t.classList.add("active");
    else if(a==="party"&&prev.party===v)t.classList.add("active");
    else if(a==="exp"&&prev.exp===v)t.classList.add("active");
  });
  saveFiltersToStorage();STATE.page=1;STATE.sort.key=null;STATE.sort.asc=autoSort();filterChanged();
}
function updateUndoBtn(){let b=document.getElementById("btnUndo"),n=STATE.filterHistory.length;b.style.display=n?"inline-flex":"none";b.disabled=!n;if(n)b.textContent="↩ 撤销 ("+n+")";}
function readFilters(){STATE.filters.province=document.getElementById("selProvince").value;STATE.filters.major=document.getElementById("selMajor").value.trim();STATE.filters.edu=document.getElementById("selEdu").value;STATE.filters.party=document.getElementById("selParty").value;STATE.filters.exp=document.getElementById("selExp").value;}
function autoSort(){let hasProfile=STATE.filters.major||STATE.filters.edu||STATE.filters.party||STATE.filters.exp;return hasProfile?false:true;}
function hasProfile(){return !!(STATE.filters.major||STATE.filters.edu||STATE.filters.party||STATE.filters.exp);}

// ═══════════════════════════════════════════════════════════════
//  UX & VISUALS — 计数滚动 / Toast / 筛选标签 / 数字格式化
// ═══════════════════════════════════════════════════════════════
function formatNum(n){return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g,",");}
function toast(msg,type){
  let el=document.createElement("div");el.className="toast"+(type?" "+type:"");el.textContent=msg;
  document.body.appendChild(el);setTimeout(function(){el.remove();},2300);
}
function renderFilterBadges(){
  let f=STATE.filters,badges=[];
  if(f.major)badges.push({l:'<svg class="ico" aria-hidden="true"><use href="#icon-book"/></svg>',v:f.major,k:"major"});
  if(f.edu)badges.push({l:'<svg class="ico" aria-hidden="true"><use href="#icon-graduation"/></svg>',v:f.edu,k:"edu"});
  if(f.party)badges.push({l:'<svg class="ico" aria-hidden="true"><use href="#icon-shield"/></svg>',v:f.party==="党员"?"中共党员":"无限制",k:"party"});
  if(f.exp)badges.push({l:'<svg class="ico" aria-hidden="true"><use href="#icon-calendar"/></svg>',v:f.exp==="无限制"?"无限制":f.exp+"及以上",k:"exp"});
  if(f.province)badges.push({l:'<svg class="ico" aria-hidden="true"><use href="#icon-pin"/></svg>',v:f.province,k:"province"});
  let c=document.getElementById("activeFilters"),b=document.getElementById("afBadges");
  if(!c||!b)return;
  if(!badges.length){c.style.display="none";return;}
  c.style.display="flex";
  b.innerHTML=badges.map(function(x){return'<span class="af-badge">'+x.l+' '+x.v+' <button class="af-remove" data-key="'+x.k+'" title="移除此筛选">×</button></span>';}).join("");
  b.querySelectorAll(".af-remove").forEach(function(btn){btn.addEventListener("click",function(){clearOneFilter(this.getAttribute("data-key"));});});
}
function clearOneFilter(key){
  if(key==="major")document.getElementById("selMajor").value="";
  else if(key==="edu")document.getElementById("selEdu").value="";
  else if(key==="party")document.getElementById("selParty").value="";
  else if(key==="exp")document.getElementById("selExp").value="";
  else if(key==="province")document.getElementById("selProvince").value="";
  document.querySelectorAll(".quick-tag[data-action='"+key+"']").forEach(function(t){t.classList.remove("active");});
  handleFilterApply();
}
// 初始化
function init(){
  // Hide loading skeleton when CDN ready
  (function hideLoader(){
    let loader=document.getElementById("appLoader"),bar=document.getElementById("loaderBar");
    if(!loader)return;
    bar.style.width="30%";
    let iv=setInterval(function(){
      bar.style.width=bar.style.width==="30%"?"70%":"30%";
      if(echartsReady()&&typeof XLSX!=="undefined"){
        bar.style.width="100%";
        setTimeout(function(){loader.style.opacity="0";setTimeout(function(){if(loader.parentNode)loader.parentNode.removeChild(loader);},300);},200);
        clearInterval(iv);
      }
    },300);
    setTimeout(function(){clearInterval(iv);if(loader.parentNode)loader.parentNode.removeChild(loader);},12000);
  })();
  // Embedded test mode: ?test=1
  if(window.location.search.indexOf("test=1")!==-1)setTimeout(runTests,500);
  document.getElementById("chartStatus").textContent=echartsReady()?"图表就绪":"图表组件加载中...";
  // ── URL hash 恢复筛选（先于 localStorage，覆盖生效） ──
  if(typeof window.sheetlensLoadFromHash==="function") window.sheetlensLoadFromHash();
  STATE.filtered=STATE.raw.slice();updateStatsUI();
  // ── 上传区呼吸动画 ──
  document.getElementById("uploadZone").classList.add("idle");
  // ── 清除全部筛选 ──
  document.getElementById("btnClearFilters").addEventListener("click",handleFilterReset);
  document.getElementById("btnUndo").addEventListener("click",undoFilter);
  document.getElementById("btnCompare").addEventListener("click",openCompare);
  // ── Demo buttons ──
  var btnDemo = document.getElementById("btnDemo");
  if (btnDemo) btnDemo.addEventListener("click", loadDemoData);
  document.addEventListener("click", function(e){if(e.target.closest && e.target.closest(".demo-cta-btn"))loadDemoData();});
  // ── 分页 ──
  document.getElementById("btnPagePrev").addEventListener("click",function(){goPage(-1);});
  document.getElementById("btnPageNext").addEventListener("click",function(){goPage(1);});
  // ── 主题恢复 ──
  let saved=loadSettings();
  if(saved.theme){document.documentElement.setAttribute("data-theme",saved.theme);}
  updateThemeIcon();
  document.getElementById("themeToggle").addEventListener("click",toggleTheme);
  // ── 筛选恢复 ──
  if(saved.filters&&STATE.raw.length===0)restoreFilters(saved.filters);
  // ── 首次访问自动加载示例数据（无用户数据时）──
  if(!saved.filters||saved.__hasData!==true)setTimeout(loadDemoData,400);
  // ── 自动筛选：输入/选择变更 300ms 防抖触发 ──
  let dt;function df(){clearTimeout(dt);dt=setTimeout(function(){saveFiltersToStorage();handleFilterApply();},150);}
  ["selMajor","selEdu","selParty","selExp","selProvince"].forEach(function(id){
    let el=document.getElementById(id);if(!el)return;
    el.addEventListener("input",df);el.addEventListener("change",df);
  });
  // ── 自动补全：selMajor 额外事件 ──
  (function(){let ac=document.getElementById("selMajor");if(!ac)return;
    ac.addEventListener("input",function(){showAC(this.value);});
    ac.addEventListener("focus",function(){if(this.value)showAC(this.value);});
    ac.addEventListener("blur",hideAC);
    ac.addEventListener("keydown",function(e){
      if(e.key==="ArrowDown"){e.preventDefault();navAC(1);}
      else if(e.key==="ArrowUp"){e.preventDefault();navAC(-1);}
      else if(e.key==="Enter"){if(document.getElementById("acDropdown").style.display!=="none"){e.preventDefault();selAC();}}
      else if(e.key==="Escape"){document.getElementById("acDropdown").style.display="none";acIdx=-1;}
    });
  })();
  // ── 弹窗关闭 ──
  document.getElementById("modalClose").addEventListener("click",closeModal);
  document.getElementById("modalOverlay").addEventListener("click",function(e){if(e.target===this)closeModal();});
  document.addEventListener("keydown",function(e){if(e.key==="Escape")closeModal();});
  if(!echartsReady()){let iv=setInterval(function(){if(echartsReady()){clearInterval(iv);document.getElementById("chartStatus").textContent="图表就绪";if(STATE.raw.length)renderMap();}},500);setTimeout(function(){clearInterval(iv);},10000);}
}
// ── 主题切换 ──
function toggleTheme(){
  let cur=document.documentElement.getAttribute("data-theme");
  let next=cur==="dark"?"light":"dark";
  document.documentElement.setAttribute("data-theme",next);
  updateThemeIcon();
  let s=loadSettings();s.theme=next;saveSettings(s);
  // 图表重绘以适配新主题
  if(currentTab==="map")renderMap();else if(currentTab==="trend")renderTrend();
}
function updateThemeIcon(){
  let isDark=document.documentElement.getAttribute("data-theme")==="dark";
  document.getElementById("themeToggle").innerHTML=isDark?'<svg class="ico" aria-hidden="true"><use href="#icon-sun"/></svg>':'<svg class="ico" aria-hidden="true"><use href="#icon-moon"/></svg>';
}
// ── localStorage ──
function loadSettings(){try{let d=localStorage.getItem("gwy_sheetlens_settings") || localStorage.getItem("sheetlens_settings");return d?JSON.parse(d):{};}catch(e){return{};}}
function saveSettings(s){try{localStorage.setItem("gwy_sheetlens_settings",JSON.stringify(s));}catch(e){}}
function saveFiltersToStorage(){
  let s=loadSettings();s.filters={major:document.getElementById("selMajor").value,edu:document.getElementById("selEdu").value,party:document.getElementById("selParty").value,exp:document.getElementById("selExp").value,province:document.getElementById("selProvince").value};saveSettings(s);
}
function restoreFilters(f){
  if(f.major)document.getElementById("selMajor").value=f.major;
  if(f.edu)document.getElementById("selEdu").value=f.edu;
  if(f.party)document.getElementById("selParty").value=f.party;
  if(f.exp)document.getElementById("selExp").value=f.exp;
  if(f.province)document.getElementById("selProvince").value=f.province;
  // 同步快捷标签状态
  document.querySelectorAll(".quick-tag").forEach(function(t){
    let a=t.getAttribute("data-action"),v=t.getAttribute("data-val");
    t.classList.remove("active");
    if(a==="major"&&f.major===v)t.classList.add("active");
    else if(a==="edu"&&f.edu===v)t.classList.add("active");
    else if(a==="party"&&f.party===v)t.classList.add("active");
    else if(a==="exp"&&f.exp===v)t.classList.add("active");
  });
  readFilters();STATE.sort.key=null;STATE.sort.asc=autoSort();filterChanged();
}
// ── 详情弹窗 ──
function openModal(row){
  let labels={d:"部门名称",t:"职位名称",l:"机构层级",a:"职位属性",m:"专业要求",e:"学历要求",p:"政治面貌",x:"基层经验",c:"招考人数",r:"省份"};
  document.getElementById("modalTitle").textContent=row.t||"岗位详情";
  let html="";
  ["d","l","a","m","e","p","x","c","r"].forEach(function(k){
    let v=row[k]||"";
    if(k==="c")v=v+" 人";
    html+='<div class="modal-field"><div class="mf-label">'+esc(labels[k])+'</div><div class="mf-value">'+(v?esc(v):"—")+'</div></div>';
  });
  // 评分明细
  if(row._detail&&row._detail.length){
    html+='<div class="modal-score-detail"><div class="msd-title"><svg class="ico" aria-hidden="true" style="vertical-align:-2px;color:var(--primary)"><use href="#icon-star"/></svg>匹配度分析（总分 '+row._score+' 分 · '+scoreLabel(row._score)+'）</div>';
    row._detail.forEach(function(d){
      let pct=Math.round(d.p/d.m*100);
      html+='<div class="modal-score-row"><span class="msr-dim">'+d.d+'</span><div class="msr-bar"><div class="msr-fill" style="width:'+pct+'%"></div></div><span class="msr-num">'+d.p+'/'+d.m+'分 '+d.n+'</span></div>';
    });
    html+='</div>';
  }
  document.getElementById("modalBody").innerHTML=html;
  document.getElementById("modalOverlay").style.display="flex";
}
function closeModal(){document.getElementById("modalOverlay").style.display="none";}
// ── 新手引导 ──
let GUIDE_STEPS=[
  {icon:'<svg class="ico" aria-hidden="true" style="width:32px;height:32px"><use href="#icon-upload-cloud"/></svg>',title:"上传职位表",desc:"拖拽或点击上传国考/省考 Excel 文件<br>支持 .xlsx / .xls，多文件自动合并",sel:"#uploadZone"},
  {icon:'<svg class="ico" aria-hidden="true" style="width:32px;height:32px"><use href="#icon-filter"/></svg>',title:"填写你的条件",desc:"输入专业关键词（支持模糊匹配+自动补全）<br>选择学历、政治面貌等，自动筛选并评分",sel:".card:first-of-type"},
  {icon:'<svg class="ico" aria-hidden="true" style="width:32px;height:32px"><use href="#icon-chart"/></svg>',title:"数据分析可视化",desc:"8张图表：地图热力图 · 省份排名 · 学历分布<br>机构层级 · 政治面貌 · 职位属性 · 部门排名",sel:".tabs"},
  {icon:'<svg class="ico" aria-hidden="true" style="width:32px;height:32px"><use href="#icon-scale"/></svg>',title:"对比与导出",desc:"勾选岗位对比优劣 · 点击行查看详情<br>排序筛选后一键导出 CSV",sel:"#tab-table"},
  {icon:'<svg class="ico" aria-hidden="true" style="width:32px;height:32px"><use href="#icon-target"/></svg>',title:"键盘快捷键",desc:"按 <kbd>/</kbd> 快速搜索专业 · <kbd>1/2/3</kbd> 切换 tab<br><kbd>Ctrl+Z</kbd> 撤销 · <kbd>Ctrl+E</kbd> 导出 · <kbd>T</kbd> 切主题<br><small style='opacity:0.7'>随时按 <kbd>?</kbd> 查看完整列表</small>",sel:null}
];
let gStep=0,gEl=null;
function startGuide(){
  if(loadSettings().__guided)return;
  gStep=0;showGuideStep();
}
function showGuideStep(){
  let s=GUIDE_STEPS[gStep];
  if(gEl){gEl.remove();document.querySelectorAll(".guide-zone-highlight").forEach(function(e){e.classList.remove("guide-zone-highlight");});}
  let tgt=s.sel?document.querySelector(s.sel):null;
  if(tgt)tgt.classList.add("guide-zone-highlight");
  let dots="";for(let i=0;i<GUIDE_STEPS.length;i++)dots+='<span'+(i===gStep?' class="active"':'')+'></span>';
  let isLast=gStep===GUIDE_STEPS.length-1;
  let html='<div class="guide-overlay" id="guideOverlay"><div class="guide-card"><div class="g-icon">'+s.icon+'</div><h2>'+s.title+'</h2><p>'+s.desc+'</p><div class="guide-steps">'+dots+'</div><div class="guide-btns"><button class="btn btn-ghost btn-sm" id="btnGuideSkip">跳过</button>'+(isLast?'<button class="btn btn-primary" id="btnGuideDone"><svg class="ico" aria-hidden="true"><use href="#icon-check"/></svg>开始使用</button>':'<button class="btn btn-primary" id="btnGuideNext">下一步 →</button>')+'</div></div></div>';
  let wrapper=document.createElement("div");wrapper.innerHTML=html;gEl=wrapper.firstElementChild;document.body.appendChild(gEl);
  document.getElementById(isLast?"btnGuideDone":"btnGuideNext").addEventListener("click",function(){if(isLast){finishGuide();}else{gStep++;showGuideStep();}});
  document.getElementById("btnGuideSkip").addEventListener("click",finishGuide);
}
function finishGuide(){
  if(gEl){gEl.remove();gEl=null;}
  document.querySelectorAll(".guide-zone-highlight").forEach(function(e){e.classList.remove("guide-zone-highlight");});
  let s=loadSettings();s.__guided=true;saveSettings(s);
}

function runTests(){
  let results=[];
  function t(name,fn){try{results.push({name:name,pass:!!fn()});}catch(e){results.push({name:name,pass:false,error:e.message});}}
  // fuzzyMatch tests
  t('fuzzyMatch exact',function(){return fuzzyMatch('political','political');});
  t('fuzzyMatch skip chars',function(){return fuzzyMatch('政治学类、法学类','政法');});
  t('fuzzyMatch no match',function(){return !fuzzyMatch('计算机','政法');});
  t('fuzzyMatch empty',function(){return !fuzzyMatch('','test');});
  // fuzzyMatch tests
  t('fuzzyMatch returns same',function(){let a=fuzzyMatch('test','t');let b=fuzzyMatch('test','t');return a===b&&_fzCache.size>0;});
  // scoreOne tests (basic)
  t('scoreOne defined',function(){return typeof scoreOne==="function";});
  // applyFilters defined
  t('applyFilters defined',function(){return typeof applyFilters==="function";});
  // STATE defined
  t('STATE exists',function(){return typeof STATE!=="undefined"&&STATE!==null;});
  // Output
  let passed=results.filter(function(r){return r.pass;}).length;
  let total=results.length;
  let color=passed===total?'green':passed>=total*0.7?'orange':'red';
  console.log('%c📋 SheetLens Tests: '+passed+'/'+total+' passed','font-size:16px;font-weight:bold;color:'+color);
  results.forEach(function(r){console.log(r.pass?'  ✅':'  ❌',r.name,r.error?'('+r.error+')':'');});
  if(passed<total)console.warn('⚠ '+(total-passed)+' tests failed');
  else console.log('✅ All tests passed!');
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
setTimeout(startGuide,800);

// Page exit animation on back navigation
window.addEventListener('pageshow',function(e){
  if(e.persisted){ document.getElementById('exitOverlay').classList.remove('go'); }
});
window.addEventListener('beforeunload',function(){
  document.getElementById('exitOverlay').classList.add('go');
});

// ═══════════════════════════════════════════════════════════════
//  KEYBOARD SHORTCUTS（生产力的关键体验）
// ═══════════════════════════════════════════════════════════════
(function(){
  let lastShift = 0;  // 防 ? 误触（连续两次 shift = ?）
  window.addEventListener('keydown', function(e){
    const tag = (e.target.tagName || '').toLowerCase();
    const inForm = tag === 'input' || tag === 'select' || tag === 'textarea' || e.target.isContentEditable;
    const cmd = e.ctrlKey || e.metaKey;

    // 表单内只处理 Esc
    if(inForm){
      if(e.key === 'Escape'){ e.target.blur(); toast('已退出输入','info',1200); }
      return;
    }

    // Ctrl/Cmd + Z = 撤销
    if(cmd && (e.key === 'z' || e.key === 'Z') && !e.shiftKey){
      e.preventDefault();
      const btn = document.getElementById('btnUndo');
      if(btn && btn.style.display !== 'none' && !btn.disabled){ btn.click(); toast('已撤销','info',1000); }
      return;
    }
    // Ctrl/Cmd + E = 导出 CSV
    if(cmd && (e.key === 'e' || e.key === 'E')){
      e.preventDefault();
      const btn = document.getElementById('btnExport');
      if(btn){ btn.click(); toast('正在导出 CSV...','success',1500); }
      return;
    }
    // / = 聚焦专业搜索
    if(e.key === '/'){
      e.preventDefault();
      const input = document.getElementById('selMajor');
      if(input){ input.focus(); input.select && input.select(); }
      return;
    }
    // ? (Shift+/) = 快捷键帮助
    if(e.key === '?' || (e.shiftKey && lastShift && Date.now()-lastShift<500 && e.key === '/')){
      e.preventDefault();
      showShortcutsHelp();
      lastShift = 0;
      return;
    }
    if(e.shiftKey) lastShift = Date.now();
    // 1/2/3 = 切 tab
    if(e.key === '1'){ document.querySelector('[data-tab="map"]')?.click(); return; }
    if(e.key === '2'){ document.querySelector('[data-tab="trend"]')?.click(); return; }
    if(e.key === '3'){ document.querySelector('[data-tab="table"]')?.click(); return; }
    // t = 主题切换
    if(e.key === 't' || e.key === 'T'){ document.querySelector('.theme-toggle')?.click(); return; }
    // Esc = 关 modal
    if(e.key === 'Escape'){
      const modal = document.querySelector('.modal-overlay.show, .modal-overlay[style*="display: flex"], .modal-overlay[style*="display:block"]');
      if(modal){ const close = modal.querySelector('.modal-close'); if(close) close.click(); }
      return;
    }
  });
})();

// 快捷键帮助弹层
function showShortcutsHelp(){
  let old = document.getElementById('shortcutsHelp');
  if(old) old.remove();
  const help = document.createElement('div');
  help.id = 'shortcutsHelp';
  help.className = 'modal-overlay show';
  help.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:5000;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease';
  help.innerHTML = '<div class="modal-card" style="max-width:480px;animation:scaleIn 0.2s ease">' +
    '<div class="modal-header"><h2>⌨️ 键盘快捷键</h2><button class="modal-close" aria-label="关闭">×</button></div>' +
    '<div class="modal-body" style="padding:8px 24px 20px">' +
    shortcutsList().map(function(s){return '<div class="shortcut-row"><span class="sc-key">'+s.k+'</span><span class="sc-desc">'+s.d+'</span></div>';}).join('') +
    '<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border);font-size:12px;color:var(--muted);text-align:center">按 <kbd>?</kbd> 任意时候重新打开 · <kbd>Esc</kbd> 关闭</div>' +
    '</div></div>';
  document.body.appendChild(help);
  help.querySelector('.modal-close').addEventListener('click', function(){ help.remove(); });
  help.addEventListener('click', function(e){ if(e.target === help) help.remove(); });
}
function shortcutsList(){
  return [
    {k:'/', d:'聚焦专业搜索'},
    {k:'1 / 2 / 3', d:'切换 地图 / 趋势 / 表格 tab'},
    {k:'Ctrl + Z', d:'撤销上一步筛选'},
    {k:'Ctrl + E', d:'导出 CSV'},
    {k:'T', d:'切换明暗主题'},
    {k:'Esc', d:'关闭弹窗 / 退出输入'}
  ];
}

// ═══════════════════════════════════════════════════════════════
//  SHARE URL（filter 序列化到 hash，刷新不丢、可分享）
// ═══════════════════════════════════════════════════════════════
(function(){
  // 启动时从 hash 读 filter（覆盖 localStorage）
  function loadFromHash(){
    if(!location.hash || location.hash.length < 2) return false;
    try{
      const f = JSON.parse(decodeURIComponent(location.hash.slice(1)));
      if(!f || typeof f !== 'object') return false;
      // 应用到 UI
      if(f.province !== undefined){ const el=document.getElementById('selProvince'); if(el) el.value=f.province; }
      if(f.major !== undefined){ const el=document.getElementById('selMajor'); if(el) el.value=f.major; }
      if(f.edu !== undefined){ const el=document.getElementById('selEdu'); if(el) el.value=f.edu; }
      if(f.party !== undefined){ const el=document.getElementById('selParty'); if(el) el.value=f.party; }
      if(f.exp !== undefined){ const el=document.getElementById('selExp'); if(el) el.value=f.exp; }
      return true;
    }catch(e){ return false; }
  }
  // 每次 filter 变化时写 hash
  let hashTimer = null;
  function syncHash(){
    if(hashTimer) clearTimeout(hashTimer);
    hashTimer = setTimeout(function(){
      try{
        const f = STATE.filters || {};
        // 移除默认值以保持 URL 干净
        const compact = {};
        Object.keys(f).forEach(function(k){ if(f[k]) compact[k] = f[k]; });
        const json = JSON.stringify(compact);
        const newHash = Object.keys(compact).length ? '#'+encodeURIComponent(json) : '';
        if(location.hash !== newHash){
          history.replaceState(null, '', location.pathname + location.search + newHash);
        }
      }catch(e){}
    }, 500);
  }
  // 暴露到 window
  window.sheetlensLoadFromHash = loadFromHash;
  window.sheetlensSyncHash = syncHash;
  // 监听 hashchange（用户手动改 URL）
  window.addEventListener('hashchange', function(){
    if(loadFromHash() && typeof readFilters === 'function'){
      readFilters();
      if(typeof handleFilterApply === 'function') handleFilterApply();
    }
  });
})();
