/* ===================== 입시 정보 · 내 목표 대학 =====================
   UNIVERSITIES(62개 대학)의 정원·지원자·경쟁률을
   (모집단위는 대학마다 경쟁률 상위 30개까지만 수록되어 있습니다 — 합계 1,746개)
   학생의 학교별 정답률·취약 유형과 이어 붙여 보여줍니다.
   합격선은 실제 커트라인이 아니라 난이도·경쟁률로 낸 추정치입니다. */

var ADM_KINDS = [
  { k:'up',   name:'상향', color:'#ef4444', desc:'붙으면 가장 좋은 곳' },
  { k:'fit',  name:'적정', color:'#4f46e5', desc:'지금 실력으로 노려볼 곳' },
  { k:'safe', name:'안정', color:'#059669', desc:'안전하게 확보할 곳' }
];
function admKind(k){ for(var i=0;i<ADM_KINDS.length;i++) if(ADM_KINDS[i].k===k) return ADM_KINDS[i]; return ADM_KINDS[1]; }

/* ---------- 대학 찾기 ---------- */
function admUniv(name){
  if(typeof UNIVERSITIES==='undefined' || !name) return null;
  var n = String(name).trim();
  for(var i=0;i<UNIVERSITIES.length;i++) if(UNIVERSITIES[i].uni===n) return UNIVERSITIES[i];
  for(var j=0;j<UNIVERSITIES.length;j++){
    var u = UNIVERSITIES[j].uni;
    if(n.indexOf(u)===0 || u.indexOf(n)===0) return UNIVERSITIES[j];
  }
  return null;
}
/* 선택 목록 — 경쟁률이 높은 순 */
function admUnivList(){
  if(typeof UNIVERSITIES==='undefined') return [];
  return UNIVERSITIES.slice().sort(function(a,b){ return (b.avgRatio||0)-(a.avgRatio||0); });
}
/* 그 대학에 학교별 빈출 문항이 있는지 */
function admHasBank(name){
  return (typeof uniIndex==='function') && uniIndex(name) >= 0;
}

/* ---------- 목표 대학 저장 ---------- */
function admGoals(s){
  s = s || (typeof myStu==='function' ? myStu() : null);
  if(!s) return [];
  var g = s.goals;
  if(!g || !g.length){
    /* 기존 학생 정보의 목표 대학 한 곳을 적정으로 옮겨 둡니다 */
    g = s.goalSchool ? [{ k:'fit', uni:String(s.goalSchool).trim(), dept:s.goalDept||'' }] : [];
  }
  return g.filter(function(x){ return x && x.uni; });
}
function admGoalOf(kind, s){
  var g = admGoals(s);
  for(var i=0;i<g.length;i++) if(g[i].k===kind) return g[i];
  return null;
}
function admSetGoal(kind, uni, dept){
  var s = myStu(); if(!s) return;
  var g = admGoals(s).filter(function(x){ return x.k!==kind; });
  if(uni) g.push({ k:kind, uni:String(uni).trim(), dept:dept||'' });
  g.sort(function(a,b){
    var o={up:0,fit:1,safe:2};
    return (o[a.k]==null?9:o[a.k]) - (o[b.k]==null?9:o[b.k]);
  });
  s.goals = g;
  /* 적정 대학은 기존 목표 대학 필드에도 반영해 학교별 빈출·리포트와 맞춥니다 */
  var fit = g.filter(function(x){ return x.k==='fit'; })[0] || g[0];
  if(fit){ s.goalSchool = fit.uni; if(fit.dept) s.goalDept = fit.dept; }
  s._u = Date.now();
  save();
}
function admSetExamDate(d){
  var s = myStu(); if(!s) return;
  s.examDate = d || null; s._u = Date.now(); save();
}
/* 시험일까지 남은 날 */
function admDday(s){
  s = s || myStu();
  if(!s || !s.examDate) return null;
  var left = Math.ceil((new Date(s.examDate+'T23:59:59') - new Date())/86400000);
  return { date:s.examDate, left:left };
}

/* ---------- 난이도 · 합격선 추정 ---------- */
function admHard(name){
  var m = (typeof uniMetaOf==='function') ? uniMetaOf(name) : null;
  if(m && m.hard) return { n:m.hard, basis:(m.basis==='확인'?'출제 경향 확인':'출제 경향 추정') };
  var u = admUniv(name);
  if(!u) return { n:3, basis:'기본값' };
  var base = ({ A:4.5, B:3.5, C:2.5 })[u.tier] || 3;
  if((u.avgRatio||0) >= 20) base += 0.5;
  else if((u.avgRatio||0) < 6) base -= 0.5;
  return { n: Math.max(1, Math.min(5, Math.round(base))), basis:'대학군·경쟁률 추정' };
}
/* 합격선(영어 정답률) 추정 — 실제 커트라인이 아닙니다 */
function admCut(name){
  var h = admHard(name).n;
  var base = ({ 1:55, 2:62, 3:70, 4:77, 5:83 })[h] || 70;
  var u = admUniv(name);
  if(u){
    var r = u.avgRatio || 0;
    if(r >= 25) base += 4;
    else if(r >= 15) base += 2;
    else if(r < 5) base -= 3;
  }
  return Math.max(50, Math.min(92, Math.round(base)));
}

/* ---------- 내 성적 ---------- */
/* 그 학교 문항만 골라 정답률을 냅니다 */
function admMyRate(name, sid){
  sid = sid || (CURRENT && CURRENT.id);
  var ids = {}, has = false;
  if(typeof uniBank==='function' && admHasBank(name)){
    uniBank(name, 'all').forEach(function(q){ ids[q.id] = 1; has = true; });
  }
  var right = 0, n = 0;
  (DB.sessions||[]).forEach(function(s){
    if(s.studentId !== sid) return;
    (s.detail||[]).forEach(function(d){
      if(!has || !ids[d.id]) return;
      n++; if(d.correct) right++;
    });
  });
  if(n >= 10) return { rate: Math.round(right/n*100), n:n, from:'school' };
  var o = admOverall(sid);
  return { rate:o.rate, n:o.n, from:'all', schoolN:n };
}
function admOverall(sid){
  sid = sid || (CURRENT && CURRENT.id);
  var right = 0, n = 0;
  (DB.sessions||[]).forEach(function(s){
    if(s.studentId !== sid) return;
    (s.detail||[]).forEach(function(d){ n++; if(d.correct) right++; });
  });
  return { rate: n ? Math.round(right/n*100) : 0, n:n };
}
/* 약한 유형 — 영역 · 세부유형별 정답률 낮은 순 */
function admWeak(sid, k){
  sid = sid || (CURRENT && CURRENT.id);
  var by = {};
  (DB.sessions||[]).forEach(function(s){
    if(s.studentId !== sid) return;
    (s.detail||[]).forEach(function(d){
      var nm = (SECTIONS[d.section] || d.section || '기타') + (d.tag ? (' · ' + d.tag) : '');
      var e = by[nm] || (by[nm] = { name:nm, sec:d.section, tag:d.tag||'', n:0, r:0 });
      e.n++; if(d.correct) e.r++;
    });
  });
  return Object.keys(by).map(function(x){ return by[x]; })
    .filter(function(x){ return x.n >= 5; })
    .map(function(x){ x.rate = Math.round(x.r/x.n*100); return x; })
    .sort(function(a,b){ return a.rate - b.rate; })
    .slice(0, k || 2);
}

/* ---------- 학과 목록 ---------- */
function admDepts(u, q, track, sort){
  if(!u || !u.depts) return [];
  var list = u.depts.filter(function(d){
    if(track && track !== 'all' && d.track !== track) return false;
    if(q && String(d.unit||'').replace(/\s+/g,'').indexOf(String(q).replace(/\s+/g,'')) < 0) return false;
    return true;
  });
  if(sort === 'quota') list = list.slice().sort(function(a,b){ return (b.quota||0)-(a.quota||0); });
  else if(sort === 'easy') list = list.slice().sort(function(a,b){ return (a.ratio||0)-(b.ratio||0); });
  else list = list.slice().sort(function(a,b){ return (b.ratio||0)-(a.ratio||0); });
  return list;
}
function admDeptName(unit){ return String(unit||'').replace(/\s+/g, ' ').trim(); }

/* ===================== 화면 ===================== */
var ADM_SEL = '', ADM_TRACK = 'all', ADM_Q = '', ADM_SORT = 'hard', ADM_PAGE = 1, ADM_PER = 15;
var ADM_PICK = '';   /* 등록 중인 칸(up/fit/safe) */

function stuAdm(){
  var s = myStu();
  if(typeof uniInit === 'function') uniInit();
  var goals = admGoals(s);
  var dd = admDday(s);
  var ov = admOverall(s.id);

  var html = head('입시 정보', '목표 대학의 경쟁률과 지금 내 위치를 한 화면에서 확인합니다');

  /* --- 시험일 --- */
  html += '<div class="adm-dday">'
    + '<div class="adm-dd-l">'
      + (dd
        ? '<b class="' + (dd.left <= 30 ? 'hot' : '') + '">' + (dd.left >= 0 ? ('D-' + dd.left) : ('시험일 지남 (' + (-dd.left) + '일)')) + '</b>'
          + '<span>편입 시험일 ' + esc(dd.date) + '</span>'
        : '<b class="none">D-?</b><span>시험일을 정하면 남은 기간이 매일 표시됩니다</span>')
    + '</div>'
    + '<div class="adm-dd-r"><input type="date" id="admExam" value="' + esc((s.examDate||'')) + '">'
      + '<button class="btn ghost rptmini" id="admExamSave">저장</button></div>'
    + '</div>';

  /* --- 목표 대학 3칸 --- */
  html += '<div class="panel"><h3>내 목표 대학 <small class="muted">(상향 · 적정 · 안정)</small></h3>'
    + '<div class="adm-goals">'
    + ADM_KINDS.map(function(kd){
        var g = admGoalOf(kd.k, s);
        if(!g) return admEmptyCard(kd);
        return admGoalCard(kd, g, s);
      }).join('')
    + '</div></div>';

  /* --- 합격선까지 남은 거리 --- */
  var fit = admGoalOf('fit', s) || goals[0];
  if(fit){
    html += admGaugePanel(fit, s);
  } else {
    html += '<div class="panel"><div class="muted">목표 대학을 등록하면 합격선까지 남은 거리를 계산해 드립니다.</div></div>';
  }

  /* --- 대학 고르기 / 학과 표 --- */
  if(!ADM_SEL) ADM_SEL = (fit && fit.uni) || (admUnivList()[0] || {}).uni || '';
  html += admBrowsePanel(s);

  page(html);
  admBind(s);
}

/* 비어 있는 칸 */
function admEmptyCard(kd){
  return '<div class="adm-goal empty" style="--c:' + kd.color + '">'
    + '<div class="adm-g-k">' + kd.name + '</div>'
    + '<div class="adm-g-empty"><b>아직 없습니다</b><span>' + kd.desc + '</span></div>'
    + '<button class="btn ghost rptmini adm-add" data-k="' + kd.k + '">대학 고르기</button>'
    + '</div>';
}
/* 등록된 칸 */
function admGoalCard(kd, g, s){
  var u = admUniv(g.uni);
  var cut = admCut(g.uni);
  var my = admMyRate(g.uni, s.id);
  var gap = my.rate - cut;
  var hd = admHard(g.uni);
  return '<div class="adm-goal" style="--c:' + kd.color + '">'
    + '<div class="adm-g-k">' + kd.name + '</div>'
    + '<div class="adm-g-uni"><b>' + esc(g.uni) + '</b>'
      + (g.dept ? ('<span>' + esc(g.dept) + '</span>') : '<span class="muted">학과 미정</span>') + '</div>'
    + '<div class="adm-g-nums">'
      + '<div><span>경쟁률</span><b>' + (u ? (u.avgRatio + ' : 1') : '-') + '</b></div>'
      + '<div><span>모집 정원</span><b>' + (u ? (u.totalQuota + '명') : '-') + '</b></div>'
      + '<div><span>난이도</span><b>' + (typeof uniFire === 'function' ? uniFire(hd.n) : hd.n) + '</b></div>'
    + '</div>'
    + '<div class="adm-g-gap ' + (gap >= 0 ? 'ok' : 'no') + '">'
      + (gap >= 0
        ? ('합격선 추정 ' + cut + '% 도달 <b>+' + gap + '%p</b>')
        : ('합격선 추정 ' + cut + '%까지 <b>' + Math.abs(gap) + '%p</b> 남음'))
    + '</div>'
    + '<div class="adm-g-btns">'
      + (admHasBank(g.uni) ? ('<button class="btn rptmini adm-go" data-uni="' + esc(g.uni) + '">이 학교 문제 풀기</button>') : '')
      + '<button class="lnk adm-add" data-k="' + kd.k + '">변경</button>'
      + '<button class="lnk del adm-del" data-k="' + kd.k + '">삭제</button>'
    + '</div></div>';
}

/* 합격선 게이지 */
function admGaugePanel(g, s){
  var cut = admCut(g.uni);
  var my = admMyRate(g.uni, s.id);
  var weak = admWeak(s.id, 2);
  var hd = admHard(g.uni);
  var u = admUniv(g.uni);
  var gap = cut - my.rate;
  var h = '<div class="panel"><h3>' + esc(g.uni) + '까지 남은 거리</h3>'
    + '<div class="adm-gauge">'
      + '<div class="adm-ga-bar">'
        + '<div class="adm-ga-fill" style="width:' + Math.max(2, Math.min(100, my.rate)) + '%"></div>'
        + '<div class="adm-ga-cut" style="left:' + Math.min(98, cut) + '%"><i></i><span>합격선 추정 ' + cut + '%</span></div>'
      + '</div>'
      + '<div class="adm-ga-lab"><b>내 정답률 ' + my.rate + '%</b>'
        + '<span class="muted">' + (my.from === 'school'
            ? (esc(g.uni) + ' 문항 ' + my.n + '개 기준')
            : ('전체 응시 ' + my.n + '문항 기준' + (my.schoolN ? (' · ' + esc(g.uni) + ' 문항은 ' + my.schoolN + '개뿐') : ''))) + '</span></div>'
    + '</div>';

  if(!my.n){
    h += '<div class="adm-msg">아직 푼 문항이 없습니다. 테스트를 한 번 보면 여기에 내 위치가 표시됩니다.</div>';
  } else if(gap > 0){
    h += '<div class="adm-msg">남은 <b>' + gap + '%p</b>'
      + (weak.length
        ? (' — 가장 약한 곳은 ' + weak.map(function(w){ return '<b>' + esc(w.name) + '(' + w.rate + '%)</b>'; }).join('와 ') + ' 입니다. 여기부터 올리는 것이 가장 빠릅니다.')
        : ' 입니다.')
      + '</div>';
  } else {
    h += '<div class="adm-msg ok">합격선 추정치를 넘었습니다. 이 정답률을 실전 시간 안에 유지하는 연습으로 넘어가세요.</div>';
  }
  h += '<div class="adm-basis">합격선은 실제 커트라인이 아니라 <b>' + hd.basis + '</b>(난이도 ' + hd.n + '단계)와 '
    + (u ? ('평균 경쟁률 ' + u.avgRatio + ':1') : '경쟁률') + '로 낸 <b>추정치</b>입니다. 학교 공식 발표가 아닙니다.</div>';
  h += '<div class="bar-actions" style="margin-top:10px">'
    + (admHasBank(g.uni) ? ('<button class="btn adm-go" data-uni="' + esc(g.uni) + '">' + esc(g.uni) + ' 실전 모의 보기</button>') : '')
    + (weak.length ? ('<button class="btn ghost" id="admWeakGo">약한 유형 훈련하기</button>') : '')
    + '<button class="btn ghost" onclick="go(\'s-growth\')">성장 리포트</button>'
    + '</div>';
  return h + '</div>';
}

/* 대학 탐색 + 학과 표 */
function admBrowsePanel(s){
  var list = admUnivList();
  var u = admUniv(ADM_SEL) || list[0];
  if(!u) return '';
  ADM_SEL = u.uni;
  var tracks = ['all'].concat(u.tracks || []);
  var depts = admDepts(u, ADM_Q, ADM_TRACK, ADM_SORT);
  var pages = Math.max(1, Math.ceil(depts.length / ADM_PER));
  if(ADM_PAGE > pages) ADM_PAGE = pages;
  if(ADM_PAGE < 1) ADM_PAGE = 1;
  var from = (ADM_PAGE - 1) * ADM_PER;
  var view = depts.slice(from, from + ADM_PER);
  var cut = admCut(u.uni), hd = admHard(u.uni);

  var h = '<div class="panel"><h3>대학별 경쟁률 <small class="muted">(' + list.length + '개 대학)</small></h3>'
    + '<div class="wg-opts">'
      + '<label>대학<select id="admUni">'
        + list.map(function(x){
            return '<option value="' + esc(x.uni) + '"' + (x.uni === ADM_SEL ? ' selected' : '') + '>'
              + esc(x.uni) + ' (' + x.avgRatio + ':1)' + (admHasBank(x.uni) ? ' ★' : '') + '</option>';
          }).join('') + '</select></label>'
      + '<label>계열<select id="admTrack">'
        + tracks.map(function(t){
            return '<option value="' + esc(t) + '"' + (t === ADM_TRACK ? ' selected' : '') + '>' + (t === 'all' ? '전체 계열' : esc(t)) + '</option>';
          }).join('') + '</select></label>'
      + '<label>정렬<select id="admSort">'
        + [['hard','경쟁률 높은 순'],['easy','경쟁률 낮은 순'],['quota','모집 인원 많은 순']].map(function(x){
            return '<option value="' + x[0] + '"' + (x[0] === ADM_SORT ? ' selected' : '') + '>' + x[1] + '</option>';
          }).join('') + '</select></label>'
      + '<label>학과 검색<input id="admQ" placeholder="학과명" value="' + esc(ADM_Q) + '" style="max-width:180px"></label>'
    + '</div>';

  h += '<div class="adm-usum">'
    + '<div><span>모집 정원</span><b>' + u.totalQuota.toLocaleString() + '명</b></div>'
    + '<div><span>지원자</span><b>' + u.totalApps.toLocaleString() + '명</b></div>'
    + '<div><span>평균 경쟁률</span><b>' + u.avgRatio + ' : 1</b></div>'
    + '<div><span>모집 단위</span><b>' + u.deptCount + '개</b></div>'
    + '<div><span>영어 난이도</span><b>' + (typeof uniFire === 'function' ? uniFire(hd.n) : hd.n) + '</b></div>'
    + '<div><span>합격선 추정</span><b>' + cut + '%</b></div>'
    + '</div>';

  h += '<div class="bar-actions" style="margin:8px 0 12px">'
    + ADM_KINDS.map(function(kd){
        var g = admGoalOf(kd.k, s);
        var on = g && g.uni === u.uni;
        return '<button class="btn ' + (on ? '' : 'ghost') + ' rptmini adm-set" data-k="' + kd.k + '" data-uni="' + esc(u.uni) + '">'
          + (on ? '✓ ' : '') + kd.name + '으로 등록</button>';
      }).join('')
    + (admHasBank(u.uni) ? ('<button class="btn ghost rptmini adm-go" data-uni="' + esc(u.uni) + '">출제 경향 보기</button>')
        : '<span class="muted" style="align-self:center;font-size:12.5px">이 대학은 아직 기출 문항이 없습니다</span>')
    + '</div>';

  h += '<div class="adm-scope">아래 표는 ' + esc(u.uni) + '의 모집단위 ' + u.deptCount + '개 가운데 '
    + '<b>경쟁률이 가장 높았던 ' + (u.depts||[]).length + '개</b>입니다. 정렬·검색도 이 범위 안에서만 적용됩니다.</div>';
  h += '<div class="tbl-wrap"><table class="tbl adm-tbl"><thead><tr>'
    + '<th>모집 단위</th><th>계열</th><th>정원</th><th>지원</th><th>경쟁률</th><th></th></tr></thead><tbody>'
    + (view.length ? view.map(function(d){
        var g = admGoalOf('fit', s);
        var mine = g && g.uni === u.uni && g.dept && admDeptName(d.unit).indexOf(g.dept) >= 0;
        var col = d.ratio >= 20 ? '#ef4444' : (d.ratio >= 10 ? '#d97706' : '#059669');
        return '<tr' + (mine ? ' class="mine"' : '') + '>'
          + '<td><b>' + esc(admDeptName(d.unit)) + '</b></td>'
          + '<td><span class="pill" style="--c:#64748b">' + esc(d.track || '-') + '</span></td>'
          + '<td>' + d.quota + '명</td>'
          + '<td>' + (d.apps||0).toLocaleString() + '명</td>'
          + '<td><b style="color:' + col + '">' + d.ratio + ' : 1</b></td>'
          + '<td><button class="lnk adm-dept" data-dept="' + esc(admDeptName(d.unit)) + '" data-uni="' + esc(u.uni) + '">내 학과로</button></td>'
          + '</tr>';
      }).join('') : '<tr><td colspan="6" class="muted">조건에 맞는 학과가 없습니다.</td></tr>')
    + '</tbody></table></div>';

  if(pages > 1){
    h += '<div class="pager">'
      + '<button class="btn ghost rptmini" id="admPrev"' + (ADM_PAGE <= 1 ? ' disabled' : '') + '>이전</button>'
      + '<span>' + ADM_PAGE + ' / ' + pages + ' 쪽 · 전체 ' + depts.length + '개</span>'
      + '<button class="btn ghost rptmini" id="admNext"' + (ADM_PAGE >= pages ? ' disabled' : '') + '>다음</button>'
      + '</div>';
  }
  h += '<div class="adm-basis">경쟁률·정원은 최근 편입 모집 결과 기준이며, 모집단위 전체가 아니라 <b>경쟁률 상위 일부</b>만 수록되어 있습니다. '
    + '해마다 달라지므로 지원 전 반드시 각 대학 모집요강을 확인하세요.</div>';
  return h + '</div>';
}

/* ---------- 이벤트 ---------- */
function admBind(s){
  var re = function(){ stuAdm(); };

  if($('#admExamSave')) $('#admExamSave').onclick = function(){
    admSetExamDate($('#admExam').value || null);
    toast($('#admExam').value ? '시험일을 저장했습니다' : '시험일을 지웠습니다');
    re();
  };
  if($('#admUni')) $('#admUni').onchange = function(){ ADM_SEL = this.value; ADM_PAGE = 1; ADM_TRACK = 'all'; re(); };
  if($('#admTrack')) $('#admTrack').onchange = function(){ ADM_TRACK = this.value; ADM_PAGE = 1; re(); };
  if($('#admSort')) $('#admSort').onchange = function(){ ADM_SORT = this.value; ADM_PAGE = 1; re(); };
  if($('#admQ')) $('#admQ').oninput = function(){ ADM_Q = this.value; ADM_PAGE = 1; re(); };
  if($('#admPrev')) $('#admPrev').onclick = function(){ ADM_PAGE--; re(); };
  if($('#admNext')) $('#admNext').onclick = function(){ ADM_PAGE++; re(); };

  /* 상향·적정·안정 등록 */
  $$('#page .adm-set').forEach(function(b){
    b.onclick = function(){
      var k = b.dataset.k, uni = b.dataset.uni;
      var cur = admGoalOf(k, myStu());
      if(cur && cur.uni === uni){ admSetGoal(k, '', ''); toast(admKind(k).name + ' 등록을 해제했습니다'); }
      else { admSetGoal(k, uni, (cur && cur.uni === uni) ? cur.dept : ''); toast(uni + '을(를) ' + admKind(k).name + '으로 등록했습니다'); }
      re();
    };
  });
  /* 학과 지정 */
  $$('#page .adm-dept').forEach(function(b){
    b.onclick = function(){
      var uni = b.dataset.uni, dept = b.dataset.dept;
      var st = myStu();
      var k = ['fit','up','safe'].filter(function(x){ var g = admGoalOf(x, st); return g && g.uni === uni; })[0] || 'fit';
      admSetGoal(k, uni, dept);
      toast(uni + ' ' + dept + ' — ' + admKind(k).name + '으로 등록했습니다');
      re();
    };
  });
  /* 비어 있는 칸에서 대학 고르기 — 아래 표로 이동 */
  $$('#page .adm-add').forEach(function(b){
    b.onclick = function(){
      ADM_PICK = b.dataset.k;
      var sel = $('#admUni');
      if(sel){ sel.focus(); sel.scrollIntoView({ behavior:'smooth', block:'center' }); }
      toast('아래에서 대학을 고른 뒤 「' + admKind(b.dataset.k).name + '으로 등록」을 누르세요');
    };
  });
  $$('#page .adm-del').forEach(function(b){
    b.onclick = function(){ admSetGoal(b.dataset.k, '', ''); toast('삭제했습니다'); re(); };
  });
  /* 학교별 빈출로 이동 */
  $$('#page .adm-go').forEach(function(b){
    b.onclick = function(){
      if(typeof UNI_SEL !== 'undefined') UNI_SEL = b.dataset.uni;
      go('s-uni');
    };
  });
  if($('#admWeakGo')){
    $('#admWeakGo').onclick = function(){
      var w = admWeak(s.id, 1)[0];
      if(!w){ go('s-center'); return; }
      window._centerAct = w.sec + '|' + (w.tag || '');
      go('s-center');
    };
  }
}
