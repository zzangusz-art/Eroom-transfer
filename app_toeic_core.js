/* ===================== 이룸토익 LMS · CORE =====================
   Part 정의 · 환산점수 · 반 편성 · 목표 달성 예측 · 시험 일정 · 목표 기준
   ================================================================ */

/* ---------- 시험 구성 ---------- */
const TO_PARTS = [
  {p:1, area:'LC', name:'Part 1', title:'사진 묘사', n:6,  opt:4, set:false, audio:true,  img:true,
   desc:'사진을 보고 가장 알맞게 묘사한 문장을 고릅니다'},
  {p:2, area:'LC', name:'Part 2', title:'질의 응답', n:25, opt:3, set:false, audio:true,  img:false,
   desc:'질문을 듣고 가장 알맞은 응답을 고릅니다'},
  {p:3, area:'LC', name:'Part 3', title:'짧은 대화', n:39, opt:4, set:true,  audio:true,  img:false, per:3,
   desc:'2~3인의 대화를 듣고 3문항에 답합니다'},
  {p:4, area:'LC', name:'Part 4', title:'짧은 담화', n:30, opt:4, set:true,  audio:true,  img:false, per:3,
   desc:'안내·공지 등 1인 담화를 듣고 3문항에 답합니다'},
  {p:5, area:'RC', name:'Part 5', title:'단문 공란', n:30, opt:4, set:false, audio:false, img:false,
   desc:'문법·어휘 지식으로 빈칸에 알맞은 말을 고릅니다'},
  {p:6, area:'RC', name:'Part 6', title:'장문 공란', n:16, opt:4, set:true,  audio:false, img:false, per:4,
   desc:'지문 흐름에 맞게 빈칸 4곳을 채웁니다'},
  {p:7, area:'RC', name:'Part 7', title:'독해',      n:54, opt:4, set:true,  audio:false, img:false, per:3,
   desc:'단일·다중 지문을 읽고 세부 정보와 추론 문제에 답합니다'}
];
function toPart(p){ return TO_PARTS.find(function(x){ return x.p===+p; }) || TO_PARTS[0]; }
function toPartName(p){ var t=toPart(p); return t.name+' · '+t.title; }
function toArea(p){ return toPart(p).area; }
const TO_AREAS = { LC:'듣기(LC)', RC:'독해(RC)' };

/* 파트별 세부 유형 — 약점 분석의 최소 단위 */
const TO_TYPES = {
  1:['1인 사진','2인 이상','사물·풍경'],
  2:['의문사 의문문','일반 의문문','평서문·제안','부정·부가 의문문','선택 의문문'],
  3:['주제·목적','화자·장소','세부 사항','의도 파악','다음 행동','시각 정보'],
  4:['주제·목적','화자·청자','세부 사항','의도 파악','다음 행동','시각 정보'],
  5:['품사 자리','동사 시제·태','수 일치','전치사','접속사·관계사','대명사','어휘'],
  6:['문법·어형','어휘','접속부사','문장 삽입'],
  7:['주제·목적','세부 사항','추론','동의어','문장 삽입','다중 지문 연계','Not/True']
};
function toTypes(p){ return TO_TYPES[+p] || []; }

/* ---------- 환산 점수 ----------
   ETS 는 회차별 환산표를 공개하지 않습니다. 아래 표는 공개된 기준점
   (LC 27개=60, 33개=110, 56개=275, 75개=390, 89개=470, 93개 이상=495 /
    RC 39개=110, 63개=275, 88개=390, 95개=470, 100개=495) 사이를
   직선 보간해 5점 단위로 만든 「예상 환산표」입니다.
   실제 점수와는 차이가 있을 수 있어 화면에도 «예상»이라고 표시합니다.
   관리자 화면에서 학원 기준표로 바꿀 수 있습니다. */
const TO_SCALE_LC = [5,5,10,10,15,15,15,20,20,25,25,25,30,30,35,35,40,40,40,45,45,50,50,50,55,55,60,60,70,75,85,95,100,110,115,125,130,140,145,155,160,165,175,180,190,195,205,210,220,225,230,240,245,255,260,270,275,280,285,295,300,305,310,315,325,330,335,340,350,355,360,365,370,380,385,390,395,400,405,415,420,425,430,435,440,445,455,460,465,470,475,480,490,495,495,495,495,495,495,495,495];
const TO_SCALE_RC = [5,5,10,10,10,15,15,20,20,20,25,25,25,30,30,30,35,35,40,40,40,45,45,45,50,50,55,55,55,60,60,65,70,75,80,90,95,100,105,110,115,125,130,140,145,150,160,165,170,180,185,190,200,205,215,220,225,235,240,250,255,260,270,275,280,285,290,295,300,305,305,310,315,320,325,330,335,340,345,350,355,360,360,365,370,375,380,385,390,400,415,425,435,445,460,470,475,480,485,490,495];

function toConf(){ DB.toeicConf = DB.toeicConf || {}; return DB.toeicConf; }
function toScaleTable(area){
  var c=toConf();
  var t = area==='LC' ? c.scaleLC : c.scaleRC;
  if(Array.isArray(t) && t.length===101) return t;
  return area==='LC' ? TO_SCALE_LC : TO_SCALE_RC;
}
/* 맞은 개수 → 환산 점수 (0~100개 기준). 문항 수가 100개가 아니면 비례 환산합니다. */
function toScale(right, total, area){
  total = total || 100;
  right = Math.max(0, Math.min(total, right||0));
  var n = total===100 ? right : Math.round(right/total*100);
  var tb = toScaleTable(area==='LC'?'LC':'RC');
  return tb[Math.max(0,Math.min(100,n))];
}
/* LC/RC 맞은 개수 → 총점 */
function toTotalScore(lcRight, lcTotal, rcRight, rcTotal){
  var lc = toScale(lcRight, lcTotal, 'LC');
  var rc = toScale(rcRight, rcTotal, 'RC');
  return { lc:lc, rc:rc, total:lc+rc,
           partial: (lcTotal!==100 || rcTotal!==100) };   /* 정식 200문항이 아니면 추정폭이 큽니다 */
}
/* 목표 점수를 받으려면 몇 개를 맞아야 하는가 */
function toNeedRight(targetScore, area){
  var tb = toScaleTable(area);
  for(var i=0;i<=100;i++){ if(tb[i] >= targetScore) return i; }
  return 100;
}

/* ---------- 환산표 프리셋 ----------
   ETS 는 공식 환산표를 공개하지 않습니다. 아래 표들은 각각 출처가 다른 «추정표»이며,
   학원이 쓰던 기준표가 있으면 관리자 화면에서 그대로 붙여 넣어 바꿀 수 있습니다.

   1) 이룸 기본 — 공개된 기준점(LC 27개=60 … RC 100개=495)을 직선 보간한 표
   2) 상세 추정표 — 개수마다 값이 다른 표 (출처: 990prep 공개 자료, 오차 5~20점이라 밝힘)
   3) 선형(5점) — 한 문항당 5점으로 단순 계산 (Oxford 연습문제 환산 구간과 거의 같음)
   ------------------------------------ */
const TO_SCALE_PRESETS = [
  { k:'eroom',  name:'이룸 기본 (보간)',  desc:'공개된 기준점 사이를 직선으로 이은 표',
    lc:null, rc:null },
  { k:'detail', name:'상세 추정표',        desc:'개수마다 값이 다른 표 · 오차 5~20점',
    lc:[5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,10,15,20,25,30,35,40,45,50,55,60,70,80,85,90,95,100,105,115,125,135,140,150,160,170,175,180,190,200,205,215,220,225,230,235,245,255,260,265,275,285,290,295,300,310,320,325,330,335,340,345,350,355,360,365,370,375,385,395,400,405,415,420,425,430,435,440,445,450,455,460,465,475,480,485,490,495,495,495,495,495,495,495,495],
    rc:[5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,10,15,20,25,30,35,40,45,55,60,65,70,75,80,85,90,95,105,115,120,125,130,135,140,145,155,160,170,175,185,195,205,210,215,220,230,240,245,250,255,260,270,275,280,285,290,295,295,300,310,315,320,325,330,335,340,345,355,360,370,375,385,390,395,400,405,415,420,425,435,440,450,455,460,470,475,485,485,490,495] },
  { k:'linear', name:'선형 (5점 단위)',    desc:'한 문항당 5점으로 단순 계산',
    lc:[5,5,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100,105,110,115,120,125,130,135,140,145,150,155,160,165,170,175,180,185,190,195,200,205,210,215,220,225,230,235,240,245,250,255,260,265,270,275,280,285,290,295,300,305,310,315,320,325,330,335,340,345,350,355,360,365,370,375,380,385,390,395,400,405,410,415,420,425,430,435,440,445,450,455,460,465,470,475,480,485,490,495],
    rc:[5,5,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100,105,110,115,120,125,130,135,140,145,150,155,160,165,170,175,180,185,190,195,200,205,210,215,220,225,230,235,240,245,250,255,260,265,270,275,280,285,290,295,300,305,310,315,320,325,330,335,340,345,350,355,360,365,370,375,380,385,390,395,400,405,410,415,420,425,430,435,440,445,450,455,460,465,470,475,480,485,490,495] }
];
function toScalePreset(k){ return TO_SCALE_PRESETS.find(function(p){ return p.k===k; }) || TO_SCALE_PRESETS[0]; }
/* 프리셋의 실제 표 (이룸 기본은 코드에 든 기본표를 씁니다) */
function toScalePresetTable(k, area){
  var p = toScalePreset(k);
  if(p.k==='eroom' || !p[area==='LC'?'lc':'rc']) return (area==='LC' ? TO_SCALE_LC : TO_SCALE_RC).slice();
  return p[area==='LC'?'lc':'rc'].slice();
}
/* 표 검증 — 101칸 · 5~495 · 5점 단위 · 단조 증가 */
function toScaleCheck(arr){
  var errs = [];
  if(!Array.isArray(arr) || arr.length!==101) return ['칸 수가 101개가 아닙니다 (현재 ' + (arr?arr.length:0) + '개)'];
  for(var i=0;i<101;i++){
    var v = arr[i];
    if(typeof v!=='number' || isNaN(v)) { errs.push(i + '개 자리에 숫자가 아닌 값이 있습니다'); continue; }
    if(v<5 || v>495) errs.push(i + '개 → ' + v + ' (5~495 범위를 벗어남)');
    if(v % 5 !== 0) errs.push(i + '개 → ' + v + ' (5점 단위가 아님)');
    if(i>0 && v < arr[i-1]) errs.push(i + '개 → ' + v + ' (앞칸 ' + arr[i-1] + '보다 낮음)');
  }
  return errs.slice(0, 12);
}
/* 자동 보정 — 5점 단위로 반올림하고 범위·단조 증가를 맞춥니다 */
function toScaleFix(arr){
  var out = [];
  for(var i=0;i<101;i++){
    var v = +arr[i];
    if(isNaN(v)) v = i>0 ? out[i-1] : 5;
    v = Math.round(v/5)*5;
    v = Math.max(5, Math.min(495, v));
    if(i>0 && v < out[i-1]) v = out[i-1];
    out.push(v);
  }
  return out;
}
/* 기준점만 입력받아 직선 보간으로 101칸을 만듭니다.
   pairs 예: [[27,60],[33,110],[56,275],[75,390],[89,470],[93,495]] */
function toScaleInterpolate(pairs){
  var pts = (pairs||[]).map(function(p){ return [Math.max(0,Math.min(100,+p[0])), +p[1]]; })
    .filter(function(p){ return !isNaN(p[0]) && !isNaN(p[1]); })
    .sort(function(a,b){ return a[0]-b[0]; });
  if(!pts.length) return null;
  if(pts[0][0] !== 0) pts.unshift([0,5]);
  if(pts[pts.length-1][0] !== 100) pts.push([100, pts[pts.length-1][1]]);
  var out = [];
  for(var n=0;n<=100;n++){
    var y = pts[pts.length-1][1];
    for(var i=0;i<pts.length-1;i++){
      var x0=pts[i][0], y0=pts[i][1], x1=pts[i+1][0], y1=pts[i+1][1];
      if(n>=x0 && n<=x1){ y = (x1===x0) ? y0 : y0 + (y1-y0)*(n-x0)/(x1-x0); break; }
    }
    out.push(y);
  }
  return toScaleFix(out);
}
/* 저장 · 초기화 */
function toScaleSave(area, arr){
  var c = toConf();
  if(area==='LC') c.scaleLC = arr; else c.scaleRC = arr;
  c.scaleUpdated = todayStr();
  save();
}
function toScaleReset(area){
  var c = toConf();
  /* 값을 지우기만 하면 서버 병합에서 되살아납니다 (없는 항목은 「바뀐 것 없음」으로 봅니다).
     그래서 지우지 않고 null 을 넣어 「기본 표를 쓴다」는 뜻을 분명히 남깁니다. */
  if(area==='LC') c.scaleLC = null; else c.scaleRC = null;
  c.scaleUpdated = todayStr();
  save();
}
function toScaleIsCustom(area){
  var c = toConf();
  var t = area==='LC' ? c.scaleLC : c.scaleRC;
  return Array.isArray(t) && t.length===101;
}

/* ---------- 등급 · 반 편성 ---------- */
const TO_LEVELS = [
  {id:'S', name:'S반', sub:'900+ 고득점 완성',   min:860, color:'#7c3aed'},
  {id:'A', name:'A반', sub:'800점 목표 실전',    min:730, color:'#2563eb'},
  {id:'B', name:'B반', sub:'700점 목표 유형',    min:600, color:'#0d9488'},
  {id:'C', name:'C반', sub:'600점 목표 기본기',  min:470, color:'#d97706'},
  {id:'D', name:'D반', sub:'기초 · 입문',        min:0,   color:'#64748b'}
];
function toLevelOf(score){
  if(score==null) return null;
  for(var i=0;i<TO_LEVELS.length;i++){ if(score>=TO_LEVELS[i].min) return TO_LEVELS[i].id; }
  return 'D';
}
function toLevel(id){ return TO_LEVELS.find(function(x){ return x.id===id; }) || {id:null,name:'미배정',sub:'',min:0,color:'#94a3b8'}; }
function toLevelName(id){ return toLevel(id).name; }
function toLevelColor(id){ return toLevel(id).color; }

/* ---------- 학생 설정 (목표 점수 · 목표 시험일) ---------- */
const TO_GOAL_PRESETS = [600,700,750,800,850,900,950,990];
function toGoal(sid){
  DB.toeicGoal = DB.toeicGoal || {};
  var g = DB.toeicGoal[sid];
  if(!g){ g = DB.toeicGoal[sid] = { target:800, examDate:'', purpose:'취업' }; }
  if(!g.target) g.target = 800;
  return g;
}
function toGoalSet(sid, patch){ var g=toGoal(sid); Object.assign(g, patch||{}); save(); return g; }
const TO_PURPOSES = ['취업','졸업 인증','편입·대학원','승진·인사고과','공무원·공기업','자기계발'];

/* ---------- 응시 기록 ---------- */
/* DB.toeicSessions: {id, studentId, mode:'part'|'mock'|'set'|'level', part, examId,
                      lc:{right,total}, rc:{right,total}, score:{lc,rc,total},
                      total, right, rate, date, sec, detail:[...] } */
function toSessions(sid){
  return (DB.toeicSessions||[]).filter(function(s){ return !sid || s.studentId===sid; })
    .sort(function(a,b){ return String(b.date||'').localeCompare(String(a.date||'')) || String(b.id).localeCompare(String(a.id)); });
}
function toMockSessions(sid){ return toSessions(sid).filter(function(s){ return s.mode==='mock'; }); }
function toLastScore(sid){
  var m = toMockSessions(sid);
  return m.length && m[0].score ? m[0].score.total : null;
}
function toBestScore(sid){
  var m = toMockSessions(sid).filter(function(s){ return s.score; });
  if(!m.length) return null;
  return Math.max.apply(null, m.map(function(s){ return s.score.total; }));
}

/* 파트별 누적 정답률 */
function toPartStats(sid, days){
  var lim = days ? addDays(-days) : null;
  var agg = {};
  TO_PARTS.forEach(function(p){ agg[p.p] = {right:0,total:0,rate:null}; });
  (DB.toeicSessions||[]).forEach(function(s){
    if(s.studentId!==sid) return;
    if(lim && String(s.date||'') < lim) return;
    (s.detail||[]).forEach(function(d){
      var a = agg[d.part]; if(!a) return;
      a.total++; if(d.correct) a.right++;
    });
  });
  Object.keys(agg).forEach(function(k){ var a=agg[k]; a.rate = a.total ? Math.round(a.right/a.total*100) : null; });
  return agg;
}
/* 세부 유형별 정답률 — 약점 공략 플랜의 근거 */
function toTypeStats(sid, part){
  var agg = {};
  (DB.toeicSessions||[]).forEach(function(s){
    if(s.studentId!==sid) return;
    (s.detail||[]).forEach(function(d){
      if(part && d.part!==+part) return;
      var k = d.part+'|'+(d.type||'기타');
      var a = agg[k] || (agg[k]={part:d.part, type:d.type||'기타', right:0, total:0});
      a.total++; if(d.correct) a.right++;
    });
  });
  return Object.keys(agg).map(function(k){ var a=agg[k]; a.rate=Math.round(a.right/a.total*100); return a; })
    .sort(function(x,y){ return x.rate-y.rate || y.total-x.total; });
}

/* ---------- 목표 점수 달성 예측 ----------
   최근 모의고사 점수의 추세(회귀)로 목표 도달 시점을 추정합니다.
   기록이 2회 미만이면 추세를 낼 수 없어 «자료 부족»으로 알려 줍니다. */
function toPredict(sid){
  var g = toGoal(sid);
  var ms = toMockSessions(sid).filter(function(s){ return s.score; }).slice().reverse();  /* 오래된 → 최신 */
  var out = { target:g.target, examDate:g.examDate||'', n:ms.length, cur:null, best:null,
              slope:null, weeksToGoal:null, etaDate:null, reachable:null, need:null, msg:'' };
  if(!ms.length){ out.msg='모의고사 응시 기록이 없습니다. 실전 모의고사를 한 번 보면 예측이 시작됩니다.'; return out; }
  out.cur  = ms[ms.length-1].score.total;
  out.best = Math.max.apply(null, ms.map(function(s){ return s.score.total; }));

  /* 목표까지 파트별로 몇 개를 더 맞아야 하는지 */
  var last = ms[ms.length-1];
  out.need = toNeedForTarget(last, g.target);

  if(ms.length < 2){ out.msg='추세를 내려면 모의고사가 2회 이상 필요합니다. 지금은 현재 점수만 보여 드립니다.'; return out; }

  /* 날짜(일) 기준 최소제곱 직선 */
  var t0 = new Date(String(ms[0].date||todayStr())+'T00:00:00').getTime();
  var xs=[], ys=[];
  ms.forEach(function(s){
    var t = new Date(String(s.date||todayStr())+'T00:00:00').getTime();
    xs.push((t-t0)/86400000); ys.push(s.score.total);
  });
  var n=xs.length, sx=0, sy=0, sxx=0, sxy=0;
  for(var i=0;i<n;i++){ sx+=xs[i]; sy+=ys[i]; sxx+=xs[i]*xs[i]; sxy+=xs[i]*ys[i]; }
  var den = n*sxx - sx*sx;
  var slope = den ? (n*sxy - sx*sy)/den : 0;        /* 하루당 점수 상승 */
  out.slope = Math.round(slope*70)/10;              /* 주당 상승폭 (소수 1자리) */

  if(out.cur >= g.target){ out.reachable=true; out.weeksToGoal=0; out.msg='이미 목표 점수를 넘었습니다. 유지 학습으로 전환하세요.'; return out; }
  if(slope <= 0.05){
    out.reachable=false;
    out.msg='최근 점수가 오르지 않고 있습니다. 학습량이나 방법을 바꿔야 목표에 닿습니다.';
    return out;
  }
  var days = (g.target - out.cur)/slope;
  if(days > 400){ out.reachable=false; out.msg='지금 속도로는 1년 안에 목표에 닿기 어렵습니다. 주간 학습량을 늘려야 합니다.'; return out; }
  out.reachable = true;
  out.weeksToGoal = Math.max(1, Math.round(days/7));
  out.etaDate = addDays(Math.ceil(days));
  if(g.examDate){
    out.beforeExam = out.etaDate <= g.examDate;
  }
  return out;
}
/* 목표 점수까지 LC/RC 각각 몇 개를 더 맞아야 하는가 */
function toNeedForTarget(sess, target){
  if(!sess || !sess.score) return null;
  var lcNow = sess.lc ? sess.lc.right : 0, lcTot = (sess.lc&&sess.lc.total)||100;
  var rcNow = sess.rc ? sess.rc.right : 0, rcTot = (sess.rc&&sess.rc.total)||100;
  var gap = target - sess.score.total;
  if(gap <= 0) return { gap:0, lc:0, rc:0 };
  /* 부족분을 LC/RC 에 반씩 나눠 목표 환산점수를 만든 뒤 필요한 정답 수를 역산합니다 */
  var tLc = Math.min(495, sess.score.lc + Math.ceil(gap/2/5)*5);
  var tRc = Math.min(495, target - tLc);
  var needLc100 = toNeedRight(tLc,'LC'), needRc100 = toNeedRight(tRc,'RC');
  var needLc = Math.round(needLc100/100*lcTot), needRc = Math.round(needRc100/100*rcTot);
  return { gap:gap,
           lc: Math.max(0, needLc - lcNow), rc: Math.max(0, needRc - rcNow),
           lcTarget:tLc, rcTarget:tRc };
}

/* ---------- 파트별 약점 공략 플랜 ----------
   정답률이 낮고 배점 비중이 큰 파트부터 주차별로 배치합니다. */
function toWeakPlan(sid, weeks){
  weeks = weeks || 4;
  var st = toPartStats(sid);
  var rows = TO_PARTS.map(function(p){
    var a = st[p.p];
    return { p:p.p, name:p.name, title:p.title, area:p.area, n:p.n,
             rate: a.total ? a.rate : null, total:a.total,
             /* 우선순위 = (100 - 정답률) × 문항 비중 — 표본이 적으면 신뢰도를 낮춥니다 */
             gain: a.total ? (100 - a.rate) * (p.n/200) * (a.total>=10?1:0.6) : (100-60)*(p.n/200)*0.4 };
  }).sort(function(x,y){ return y.gain - x.gain; });

  var plan = [];
  for(var w=0; w<weeks; w++){
    var main = rows[w % rows.length];
    var sub  = rows[(w+1) % rows.length];
    var weak = toTypeStats(sid, main.p).filter(function(t){ return t.total>=3; }).slice(0,2);
    plan.push({
      week: w+1,
      from: addDays(w*7), to: addDays(w*7+6),
      main: main, sub: sub,
      focus: weak.map(function(t){ return t.type + ' (' + t.rate + '%)'; }),
      todo: toPlanTodo(main, sub, weak)
    });
  }
  return { rows:rows, plan:plan };
}
function toPlanTodo(main, sub, weak){
  var t = [];
  t.push(main.name + ' 집중 — 유형별 연습 하루 ' + (main.area==='LC'?'20문항':'25문항'));
  if(weak.length) t.push('약한 유형 먼저: ' + weak.map(function(x){return x.type;}).join(' · '));
  t.push(sub.name + ' 유지 — 이틀에 한 번 10문항');
  if(main.area==='LC') t.push('받아쓰기(딕테이션) 주 3회 · 틀린 문항 스크립트 소리 내어 읽기');
  else t.push('오답 문항 근거 문장 표시하기 · 모르는 어휘 단어장 등록');
  t.push('주말에 해당 파트 미니 테스트로 점검');
  return t;
}

/* ---------- 토익 시험 일정 ----------
   2026년 정기시험은 제560회~제585회, 모두 26회입니다.
   공식 발표가 확인된 회차만 넣어 두었고, 나머지는 관리자가 등록합니다.
   (성적 발표는 보통 시험일로부터 9~10일 뒤 화요일 낮 12시입니다) */
const TO_DATES_SEED = [
  {id:'td560', round:560, date:'2026-01-11', open:'2025-11-24', close:'', result:'2026-01-20', note:'공식 발표 확인'},
  {id:'td561', round:561, date:'2026-01-25', open:'', close:'', result:'', note:''},
  {id:'td562', round:562, date:'2026-02-01', open:'', close:'', result:'', note:''},
  {id:'td575', round:575, date:'2026-08-09', open:'', close:'', result:'2026-08-18', note:'회차 번호는 추정'},
  {id:'td576', round:576, date:'2026-08-23', open:'2026-07-06', close:'2026-08-10', result:'2026-09-03', note:''},
  {id:'td577', round:577, date:'2026-08-30', open:'2026-07-13', close:'2026-08-17', result:'2026-09-08', note:''},
  {id:'td578', round:578, date:'2026-09-06', open:'', close:'', result:'2026-09-15', note:'회차 번호는 추정'},
  {id:'td579', round:579, date:'2026-09-20', open:'', close:'', result:'2026-09-29', note:'회차 번호는 추정'},
  {id:'td580', round:580, date:'2026-10-11', open:'', close:'', result:'2026-10-20', note:'회차 번호는 추정'},
  {id:'td581', round:581, date:'2026-10-31', open:'', close:'', result:'2026-11-10', note:'회차 번호는 추정'},
  {id:'td582', round:582, date:'2026-11-15', open:'', close:'', result:'2026-11-24', note:'회차 번호는 추정'},
  {id:'td583', round:583, date:'2026-11-29', open:'', close:'', result:'2026-12-08', note:'회차 번호는 추정'},
  {id:'td584', round:584, date:'2026-12-13', open:'', close:'', result:'2026-12-22', note:'회차 번호는 추정'},
  {id:'td585', round:585, date:'2026-12-27', open:'', close:'', result:'2027-01-06', note:'회차 번호는 추정'}
];
const TO_FEE = { regular:52500, late:57750 };
function toDates(){
  if(!Array.isArray(DB.toeicDates)) DB.toeicDates = [];
  if(!DB.toeicDates.length){ DB.toeicDates = TO_DATES_SEED.map(function(d){ return Object.assign({},d); }); }
  return DB.toeicDates.slice().sort(function(a,b){ return String(a.date).localeCompare(String(b.date)); });
}
function toNextExam(from){
  var t = from || todayStr();
  return toDates().find(function(d){ return String(d.date) >= t; }) || null;
}
function toDday(dateStr){
  if(!dateStr) return null;
  var a = new Date(todayStr()+'T00:00:00').getTime();
  var b = new Date(String(dateStr).slice(0,10)+'T00:00:00').getTime();
  if(isNaN(b)) return null;
  return Math.round((b-a)/86400000);
}
function toDdayText(dateStr){
  var d = toDday(dateStr);
  if(d==null) return '';
  if(d===0) return 'D-DAY';
  return d>0 ? ('D-'+d) : ('D+'+(-d));
}

/* ---------- 목표 기준(커트라인) ----------
   기업·기관이 공식 발표하지 않는 경우가 많아, 학원이 관리하는 «참고 기준»입니다.
   관리자 화면에서 자유롭게 추가·수정할 수 있습니다. */
const TO_CUTS_SEED = [
  {id:'tc1', name:'대기업 공채 (일반)',       score:800, cat:'취업',      note:'서류 통과 기준으로 흔히 제시되는 구간'},
  {id:'tc2', name:'대기업 공채 (지원 자격)',  score:700, cat:'취업',      note:'최소 지원 자격으로 두는 곳이 많음'},
  {id:'tc3', name:'공기업 · 공공기관',        score:700, cat:'공기업',    note:'기관별 어학 환산표를 별도 확인'},
  {id:'tc4', name:'금융권 · 증권',            score:850, cat:'취업',      note:'경쟁이 높아 실질 커트라인이 더 높음'},
  {id:'tc5', name:'항공 승무원',              score:800, cat:'취업',      note:'회화 자격을 함께 보는 경우가 많음'},
  {id:'tc6', name:'대학 졸업 인증',           score:700, cat:'졸업',      note:'학교·학과마다 600~800 사이로 다름'},
  {id:'tc7', name:'편입 · 대학원 지원',       score:800, cat:'진학',      note:'상위권일수록 900 이상을 요구'},
  {id:'tc8', name:'사내 승진 · 인사고과',     score:700, cat:'승진',      note:'회사 규정 확인 필요'},
  {id:'tc9', name:'외국계 기업',              score:900, cat:'취업',      note:'회화 능력을 함께 평가'}
];
function toCuts(){
  if(!Array.isArray(DB.toeicCuts)) DB.toeicCuts = [];
  if(!DB.toeicCuts.length){ DB.toeicCuts = TO_CUTS_SEED.map(function(c){ return Object.assign({},c); }); }
  return DB.toeicCuts.slice().sort(function(a,b){ return b.score-a.score; });
}
/* 예상 점수로 지원 가능 여부를 갈라 줍니다 */
function toCutMatch(score){
  var cuts = toCuts();
  return {
    ok:    cuts.filter(function(c){ return score!=null && score >= c.score; }),
    near:  cuts.filter(function(c){ return score!=null && score < c.score && score >= c.score-70; }),
    far:   cuts.filter(function(c){ return score==null || score < c.score-70; })
  };
}

/* ---------- 학생 요약 (여러 화면에서 재사용) ---------- */
function toSummary(sid){
  var g = toGoal(sid);
  var last = toLastScore(sid), best = toBestScore(sid);
  var st = toPartStats(sid);
  var weakest = null, strongest = null;
  TO_PARTS.forEach(function(p){
    var a=st[p.p]; if(!a.total || a.total<5) return;
    if(!weakest || a.rate < weakest.rate) weakest = {p:p.p, name:p.name, rate:a.rate};
    if(!strongest || a.rate > strongest.rate) strongest = {p:p.p, name:p.name, rate:a.rate};
  });
  var sess = toSessions(sid);
  var solved = sess.reduce(function(a,s){ return a + (s.total||0); }, 0);
  return { goal:g, last:last, best:best, level:toLevelOf(best!=null?best:last),
           parts:st, weakest:weakest, strongest:strongest,
           mocks:toMockSessions(sid).length, sessions:sess.length, solved:solved,
           nextExam: g.examDate ? {date:g.examDate} : toNextExam() };
}

/* ---------- 초기화 ---------- */
function toeicInit(){
  DB.toeicQ        = DB.toeicQ || [];
  DB.toeicVoca     = DB.toeicVoca || [];
  DB.toeicSets     = DB.toeicSets || [];
  DB.toeicSessions = DB.toeicSessions || [];
  DB.toeicExams    = DB.toeicExams || [];
  DB.toeicConf     = DB.toeicConf || {};
  DB.toeicGoal     = DB.toeicGoal || {};
  DB.toeicWrong    = DB.toeicWrong || {};
  DB.toeicWord     = DB.toeicWord || {};
  if(!Array.isArray(DB.toeicDates) || !DB.toeicDates.length) DB.toeicDates = TO_DATES_SEED.map(function(d){ return Object.assign({},d); });
  if(!Array.isArray(DB.toeicCuts)  || !DB.toeicCuts.length)  DB.toeicCuts  = TO_CUTS_SEED.map(function(c){ return Object.assign({},c); });
}
