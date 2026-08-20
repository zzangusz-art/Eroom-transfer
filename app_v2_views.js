/* ===================== 이룸편입 LMS v2 · VIEWS ===================== */
function radarOverlay(canvas, labels, seriesArr){
 const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height,cx=W/2,cy=H/2,R=Math.min(W,H)/2-30;
 ctx.clearRect(0,0,W,H); const n=labels.length;
 for(let g=1;g<=4;g++){ ctx.strokeStyle='#e2e8f0'; ctx.beginPath(); for(let i=0;i<=n;i++){ const a=Math.PI*2*i/n-Math.PI/2; const r=R*g/4; const x=cx+r*Math.cos(a),y=cy+r*Math.sin(a); if(i)ctx.lineTo(x,y); else ctx.moveTo(x,y);} ctx.stroke(); }
 ctx.font='11px sans-serif'; ctx.textAlign='center';
 for(let i=0;i<n;i++){ const a=Math.PI*2*i/n-Math.PI/2; ctx.strokeStyle='#e2e8f0'; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+R*Math.cos(a),cy+R*Math.sin(a)); ctx.stroke(); ctx.fillStyle='#475569'; ctx.fillText(labels[i],cx+(R+15)*Math.cos(a),cy+(R+15)*Math.sin(a)+4); }
 seriesArr.forEach(function(s){ ctx.beginPath(); for(let i=0;i<=n;i++){ const idx=i%n; const a=Math.PI*2*idx/n-Math.PI/2; const r=R*((s.values[idx]||0)/100); const x=cx+r*Math.cos(a),y=cy+r*Math.sin(a); if(i)ctx.lineTo(x,y); else ctx.moveTo(x,y);} ctx.closePath(); ctx.fillStyle=s.color+'2e'; ctx.fill(); ctx.strokeStyle=s.color; ctx.lineWidth=s.dash?1.5:2.4; if(s.dash)ctx.setLineDash([4,3]); else ctx.setLineDash([]); ctx.stroke(); ctx.setLineDash([]); });
}
function lvBar(studentId){
 const j=levelup(studentId); if(!j) return '';
 const pctv=j.progress; const col=levelObj(j.lv).color;
 return '<div class="lvbar"><div class="lvbar-h"><b>현재 단계 · '+j.levelName+' <span class="lvgrp">'+j.grp+'반</span></b>'
 +(j.next?'<span class="lvnext">다음: '+j.next.name+(j.cut<=100?(' (커트 '+j.cut+'점)'):'')+'</span>':'<span class="lvnext">최종 단계</span>')+'</div>'
 +'<div class="lvtrack"><div class="lvfill" style="width:'+pctv+'%;background:'+col+'"></div><span class="lvpctt">'+pctv+'%</span></div>'
 +'<div class="lvmsg">'+(j.cut>100?'최상위 단계입니다. 합격까지 실전 마무리!':(j.can?'승급 기준 달성! 모의고사 응시 후 즉시 승급 가능':('레벨업까지 평균 '+j.gap+'점 남음 (최근 2회 평균 '+j.avg2+'점)')))+'</div></div>';
}
function certBadge(st){ const c= st==='approved'?'#059669': st==='pending'?'#d97706': st==='rejected'?'#ef4444':'#94a3b8'; return '<span class="pill" style="--c:'+c+'">'+certLabel(st)+'</span>'; }

/* ---------- Phase2: 학생 홈 (합격까지 최선을!) ----------
   「오늘 뭘 해야 하는지」를 한 화면에 모읍니다.
   ① 남은 기간  ② 놓친 것 경고 + 만회 버튼  ③ 오늘 숫자 3개  ④ 지금 이 순서대로 */

/* 오늘 해야 할 일을 급한 순서로 만듭니다 */
function homeTodo(s){
  var today = todayStr(), out = [];

  /* 1. 수강기한이 오늘·내일인 미이수 강의 */
  var risk = (typeof OPS !== 'undefined') ? OPS.atRisk([s]) : [];
  risk.slice(0, 2).forEach(function(r){
    out.push({
      pri: r.over ? 0 : 1,
      kind: r.over ? 'over' : 'urgent',
      title: '밀린 강의 「' + r.lecture + '」 ' + (VOD.REQ - r.count) + '회독',
      sub: r.over ? ('수강기한 ' + r.due + ' 지남') : ('수강기한 ' + r.due + ' · 오늘 안에'),
      dd: r.over ? '기한 지남' : ('D-' + Math.max(0, r.left)),
      btn: '지금 보기', go: 's-vod', lec: r.sid ? null : null
    });
  });

  /* 2. 마감이 코앞인 평가 */
  var asDue = (acf(DB.assessments) || []).filter(function(a){
    if(!a.dueDate || (a.openDate || today) > today) return false;
    if(typeof assessVisible === 'function' && !assessVisible(a, s)) return false;
    var r = ((DB.scores || {})[a.id] || {})[s.id];
    if(r && r.score != null) return false;
    var left = Math.ceil((new Date(a.dueDate + 'T23:59:59') - new Date()) / 86400000);
    return left >= 0 && left <= 2;
  }).sort(function(a, b){ return (a.dueDate || '').localeCompare(b.dueDate || ''); });
  asDue.slice(0, 2).forEach(function(a){
    var left = Math.ceil((new Date(a.dueDate + 'T23:59:59') - new Date()) / 86400000);
    out.push({
      pri: left <= 0 ? 0 : 2, kind: 'assess',
      title: '「' + a.title + '」 제출',
      sub: '마감 ' + a.dueDate + (left <= 0 ? ' · 오늘까지' : ''),
      dd: 'D-' + Math.max(0, left), btn: '응시하기', go: 's-hw'
    });
  });

  /* 3. 오늘 단어 */
  if(typeof wdTodayList === 'function'){
    var wlist = wdTodayList(today, s.id) || [];
    var done = (typeof wdKnownToday === 'function') ? (wdKnownToday(today) || []).length : 0;
    var left = Math.max(0, wlist.length - done);
    if(left > 0){
      out.push({
        pri: 3, kind: 'word',
        title: '오늘 단어 ' + left + '개 남음',
        sub: '전체 ' + wlist.length + '개 중 ' + done + '개 완료',
        dd: '오늘', btn: '외우러 가기', go: 's-word'
      });
    }
  }

  /* 4. 오늘 봐야 할 강의 (기한이 급하지 않은 것) */
  var lecs = (typeof VOD !== 'undefined') ? VOD.list(s) : [];
  var todo = lecs.filter(function(l){
    return !VOD.notOpen(l) && VOD.rec(s.id, l.id).count < VOD.REQ && !VOD.overdue(l) && VOD.daysLeft(l) > 1;
  });
  if(todo.length){
    out.push({
      pri: 4, kind: 'lec',
      title: '강의 ' + todo.length + '강 수강',
      sub: (todo[0].title || '') + (todo.length > 1 ? (' 외 ' + (todo.length - 1) + '강') : ''),
      dd: 'D-' + VOD.daysLeft(todo[0]), btn: '이어서 보기', go: 's-vod', lec: todo[0].id
    });
  }

  /* 5. 목표 대학 약한 유형 */
  if(typeof admGoals === 'function'){
    var g = (typeof admGoalOf === 'function' && admGoalOf('fit', s)) || admGoals(s)[0];
    var weak = (typeof admWeak === 'function') ? admWeak(s.id, 1)[0] : null;
    if(g && weak && weak.rate < 70){
      out.push({
        pri: 5, kind: 'weak',
        title: esc(g.uni) + ' 대비 — ' + esc(weak.name) + ' 훈련',
        sub: '이 유형 정답률 ' + weak.rate + '% · 가장 약한 곳입니다',
        dd: '', btn: '문제 풀기', go: 's-center', act: weak.sec + '|' + (weak.tag || '')
      });
    }
  }

  /* 6. 오답 */
  var wrong = (typeof allWrongQuestions === 'function') ? (allWrongQuestions(s.id) || []) : [];
  if(wrong.length >= 5){
    out.push({
      pri: 6, kind: 'wrong',
      title: '틀린 문항 ' + wrong.length + '개 다시 풀기',
      sub: '한 번 틀린 문항은 시험에서도 틀립니다',
      dd: '', btn: '오답노트', go: 's-wrong'
    });
  }

  out.sort(function(a, b){ return a.pri - b.pri; });
  return out.slice(0, 4);
}

/* 놓친 것 — 경고 스트립에 쓸 항목 */
function homeAlerts(s){
  var today = todayStr(), a = [];
  var over = ((typeof OPS !== 'undefined') ? OPS.atRisk([s]) : []).filter(function(r){ return r.over; });
  if(over.length) a.push({ t: '수강기한 지난 강의 ' + over.length + '강', go: 's-vod' });

  var missed = (acf(DB.assessments) || []).filter(function(x){
    if(!x.dueDate || x.dueDate >= today) return false;
    if((x.openDate || today) > today) return false;
    if(typeof assessVisible === 'function' && !assessVisible(x, s)) return false;
    var r = ((DB.scores || {})[x.id] || {})[s.id];
    return !(r && r.score != null);
  });
  if(missed.length) a.push({ t: '기한 지난 미제출 과제 ' + missed.length + '건', go: 's-hw' });

  /* 단어 진도 — 어제까지 이틀 연속 기록이 없으면 */
  if(typeof wdStore === 'function'){
    var v = wdStore(s.id), gap = 0;
    var d = new Date(); d.setDate(d.getDate() - 1);
    for(var i = 0; i < 3; i++){
      var ds = todayStr(d);
      if(((v.days[ds] || {}).done || []).length) break;
      gap++; d.setDate(d.getDate() - 1);
    }
    if(gap >= 2) a.push({ t: '단어 진도 ' + gap + '일째 없음', go: 's-word' });
  }
  return a;
}

function v2Home(){
  const s = myStu(); const today = todayStr();
  const lecs = (typeof VOD !== 'undefined') ? VOD.list(s) : [];
  const openLec = lecs.filter(function(l){ return !VOD.notOpen(l); });
  const todo = openLec.filter(function(l){ return VOD.rec(s.id, l.id).count < VOD.REQ && !VOD.overdue(l); });
  const sm = (typeof VOD !== 'undefined') ? VOD.summary(s.id) : { rate:0, twice:0, total:0, done:0 };
  const asAll = (acf(DB.assessments) || []).filter(function(a){ return (a.openDate || today) <= today && (typeof assessVisible !== 'function' || assessVisible(a, s)); });
  const asDue = asAll.filter(function(a){ return a.dueDate && a.dueDate >= today; }).sort(function(a, b){ return a.dueDate.localeCompare(b.dueDate); });
  const streak = (typeof OPS !== 'undefined') ? OPS.streak(s.id) : 0;

  const dd = (typeof admDday === 'function') ? admDday(s) : null;
  const goal = (typeof admGoals === 'function')
    ? ((typeof admGoalOf === 'function' && admGoalOf('fit', s)) || admGoals(s)[0]) : null;
  const list = homeTodo(s);
  const alerts = homeAlerts(s);

  /* ---- 머리말 + D-day ---- */
  let html = '<div class="hm-top">'
    + '<div class="hm-hi"><h1>' + esc(s.name || '학생') + '님, 오늘 할 일입니다</h1>'
      + '<p>' + (list.length ? ('아래 ' + list.length + '가지만 하면 오늘은 끝입니다') : '밀린 것이 없습니다. 오늘 분량만 채우면 됩니다') + '</p></div>'
    + '<div class="hm-dd' + (dd && dd.left <= 30 ? ' hot' : '') + '">'
      + (dd
        ? '<b>' + (dd.left >= 0 ? ('D-' + dd.left) : '시험일 지남') + '</b><span>' + esc(dd.date) + ' 시험</span>'
        : '<b class="none">D-?</b><span><button class="lnk" id="hmSetExam">시험일 설정</button></span>')
    + '</div></div>';

  /* ---- 경고 ---- */
  if(alerts.length){
    html += '<div class="hm-warn"><div class="hm-warn-t">'
      + '<b>놓친 것이 있습니다</b>'
      + '<span>' + alerts.map(function(x){ return esc(x.t); }).join(' · ') + '</span></div>'
      + '<button class="btn hm-warn-b" data-go="' + alerts[0].go + '">지금 만회하기</button></div>';
  }

  /* ---- 오늘 숫자 3개 ---- */
  var wlist = (typeof wdTodayList === 'function') ? (wdTodayList(today, s.id) || []) : [];
  var wdone = (typeof wdKnownToday === 'function') ? (wdKnownToday(today) || []).length : 0;
  var gRate = goal ? admMyRate(goal.uni, s.id) : null;
  var gCut = goal ? admCut(goal.uni) : 0;

  html += '<div class="hm-nums">'
    + homeNum('오늘 단어', wdone + ' / ' + (wlist.length || 50),
        (wlist.length && wdone >= wlist.length) ? '오늘 분량 완료' : ('남은 ' + Math.max(0, wlist.length - wdone) + '개'),
        (wlist.length && wdone >= wlist.length) ? '#059669' : '#4f46e5',
        wlist.length ? Math.round(wdone / wlist.length * 100) : 0, 's-word')
    + homeNum('오늘 강의', (openLec.length - todo.length) + ' / ' + openLec.length + '강',
        todo.length ? (todo.length + '강 남음') : '모두 이수',
        todo.length ? '#d97706' : '#059669',
        openLec.length ? Math.round((openLec.length - todo.length) / openLec.length * 100) : 0, 's-vod')
    + (goal
        ? homeNum(esc(goal.uni) + ' 대비', (gRate.n ? (gRate.rate + '%') : '기록 없음'),
            gRate.n ? ('합격선 추정 ' + gCut + '%' + (gRate.rate >= gCut ? ' 도달' : (' · ' + (gCut - gRate.rate) + '%p 남음'))) : '테스트를 한 번 보세요',
            (gRate.n && gRate.rate >= gCut) ? '#059669' : '#7c3aed',
            gCut ? Math.min(100, Math.round(gRate.rate / gCut * 100)) : 0, 's-adm')
        : homeNum('목표 대학', '미등록', '경쟁률·합격선을 보려면 등록하세요', '#94a3b8', 0, 's-adm'))
    + '</div>';

  /* ---- 지금 이 순서대로 ---- */
  html += '<div class="panel hm-order"><h3>지금 이 순서대로</h3>'
    + (list.length
      ? '<ol class="hm-list">' + list.map(function(x, i){
          return '<li class="hm-it hm-' + x.kind + '">'
            + '<span class="hm-no">' + (i + 1) + '</span>'
            + '<div class="hm-txt"><b>' + x.title + '</b><span>' + esc(x.sub || '') + '</span></div>'
            + (x.dd ? ('<span class="hm-dday' + (/지남|오늘|D-0|D-1/.test(x.dd) ? ' hot' : '') + '">' + esc(x.dd) + '</span>') : '')
            + '<button class="btn rptmini hm-go" data-go="' + x.go + '" data-act="' + esc(x.act || '') + '" data-lec="' + esc(x.lec || '') + '">' + esc(x.btn) + '</button>'
            + '</li>';
        }).join('') + '</ol>'
      : '<div class="hm-clear">오늘 몫을 모두 끝냈습니다. 여유가 있다면 오답노트나 학교별 빈출을 한 세트 더 보세요.'
        + '<div class="bar-actions" style="margin-top:10px"><button class="btn ghost rptmini hm-go" data-go="s-wrong">오답노트</button>'
        + '<button class="btn ghost rptmini hm-go" data-go="s-uni">학교별 빈출</button></div></div>')
    + '<div class="hm-foot"><span>연속 학습 <b>' + streak + '일</b></span><span>강의 이수율 <b>' + pct(sm.rate) + '</b></span>'
      + '<span>마감 임박 평가 <b>' + asDue.length + '건</b></span></div>'
    + '</div>';

  /* ---- 이용 기간 ---- */
  if(s.validUntil){
    var vleft = Math.ceil((new Date(s.validUntil + 'T23:59:59') - new Date()) / 86400000);
    if(vleft <= 7) html += '<div class="cta" style="border-color:#fde68a;background:#fffbeb"><div><b style="color:#92400e">이용 기간 ' + (vleft < 0 ? '만료됨' : 'D-' + vleft) + ' (' + s.validUntil + ')</b><p>계속 학습하려면 이룸편입에 재등록을 문의해 주세요.</p></div></div>';
  }

  html += (typeof quoteHtml === 'function' ? quoteHtml() : '');

  /* ---- 오늘의 학습 루틴 ---- */
  if(typeof dailyFor === 'function'){
    var dl = dailyFor(today), pr = dailyProgress(s.id, today);
    var dow = ['일','월','화','수','목','금','토'][dowOf(today)];
    html += '<div class="panel rt-panel"><h3>오늘의 학습 루틴 <small class="muted">(' + dow + '요일)</small>'
      + '<span class="rt-prog">' + pr.done + '/' + pr.total + ' 완료</span></h3>'
      + '<div class="rt-bar"><div style="width:' + pr.rate + '%"></div></div>'
      + (dl.length
        ? '<div class="rt-list">' + dl.map(function(x){
            var auto = (typeof dailyAutoDone==='function') && dailyAutoDone(s.id, today, x.key);
            var req  = (typeof rtReqStatus==='function') ? rtReqStatus(s.id, today, x.key) : '';
            var done = auto || (req==='approved') || dailyDone(s.id, today, x.key);
            var mark = auto ? '자동 확인' : (req==='approved' ? '선생님 확인 완료' : '');
            return '<div class="rt-item' + (done ? ' done' : '') + (auto ? ' auto' : '') + '">'
              + '<span class="rt-chk' + (done ? ' on' : '') + '">' + (done ? '✓' : '') + '</span>'
              + '<div class="rt-txt"><b>' + esc(x.title) + '</b>'
                + (mark ? '<span class="rt-auto">' + mark + '</span>' : '<span>' + esc(x.desc || '') + '</span>') + '</div>'
              + (done ? ''
                 : (req==='pending'
                    ? '<span class="rt-wait">확인 요청함</span>'
                    : '<button class="btn ghost rptmini rt-ask" data-rtq="' + x.key + '" data-rtt="' + esc(x.title) + '">'
                      + (req==='rejected' ? '다시 요청' : '확인 요청') + '</button>'))
              + (x.to && !done ? '<button class="btn ghost rptmini rt-go" data-rtgo="' + x.to + '" data-rtact="' + (x.act || '') + '">시작</button>' : '')
              + '</div>'; }).join('') + '</div>'
        : '<div class="muted">오늘은 쉬어가는 날입니다. 밀린 강의가 있다면 정리해 두세요.</div>')
      + (pr.total && pr.done === pr.total ? '<div class="rt-done">오늘 루틴을 모두 마쳤습니다. 이 페이스를 유지하세요.</div>' : '')
      + '</div>';
  }

  /* ---- 오늘 봐야 할 강의 ---- */
  html += '<div class="panel"><h3>오늘 봐야 할 강의</h3>'
    + (todo.length ? '<div class="vodgrid">' + todo.slice(0, 6).map(function(l){
        var r = VOD.rec(s.id, l.id); var dl2 = VOD.daysLeft(l);
        return '<div class="vcard vst-' + (dl2 <= 1 ? 'over' : 'ing') + '"><div class="vc-top"><span class="as-chip as-' + (l.category || 'etc') + '">' + lecCatName(l.category || l.section) + '</span><span class="vc-dd">' + (dl2 >= 0 ? ('D-' + dl2) : '기한 지남') + '</span></div>'
          + '<div class="vc-title">' + (l.day ? ('<span class="daytag">Day ' + l.day + '</span> ') : '') + esc(l.title) + '</div>'
          + '<div class="vc-foot"><b>' + r.count + '/' + VOD.REQ + '회독</b><span class="muted">기한 ' + VOD.deadline(l) + '</span></div>'
          + '<button class="btn vplay" data-lec="' + l.id + '">이어서 보기</button></div>'; }).join('') + '</div>'
      : '<div class="muted">오늘 수강할 강의를 모두 마쳤습니다. 잘하고 있어요.</div>')
    + '<button class="btn ghost rptmini" style="margin-top:10px" onclick="go(\'s-vod\')">전체 강의 보기</button></div>';

  /* ---- 마감 임박 평가 ---- */
  html += '<div class="panel"><h3>마감 임박 평가</h3>'
    + (asDue.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>유형</th><th>평가</th><th>마감</th><th>남은일</th><th>응시</th></tr></thead><tbody>'
      + asDue.slice(0, 6).map(function(a){
          var d = Math.ceil((new Date(a.dueDate + 'T23:59:59') - new Date()) / 86400000);
          return '<tr><td><span class="as-chip as-' + a.type + '">' + (typeof assessTypeName === "function" ? assessTypeName(a.type) : a.type) + '</span></td><td>' + esc(a.title) + '</td><td>' + a.dueDate + '</td>'
            + '<td><span class="pill" style="--c:' + (d <= 1 ? '#ef4444' : '#4f46e5') + '">D-' + d + '</span></td>'
            + '<td>' + ((typeof myScore === 'function' && myScore(a.id, s.id) && myScore(a.id, s.id).score != null)
                  ? '<button class="btn ghost rptmini" data-asv="' + a.id + '">결과 보기</button>'
                  : '<button class="btn rptmini" data-hwgo="1">응시하러 가기</button>') + '</td></tr>'; }).join('')
      + '</tbody></table></div>' : '<div class="muted">마감 임박 평가가 없습니다.</div>')
    + '<button class="btn ghost rptmini" style="margin-top:10px" onclick="go(\'s-hw\')">과제·평가 보기</button></div>';

  page(html);

  if(typeof bindAssessStudent === 'function') bindAssessStudent();
  $$('.vplay').forEach(function(b){ b.onclick = function(){ vodPlayer(b.dataset.lec); }; });
  $$('#page [data-hwgo]').forEach(function(b){ b.onclick = function(){ go('s-hw'); }; });
  /* 오늘 할 일 · 경고 버튼 */
  $$('#page [data-go]').forEach(function(b){
    b.onclick = function(){
      if(b.dataset.act) window._centerAct = b.dataset.act;
      if(b.dataset.lec && typeof vodPlayer === 'function'){ vodPlayer(b.dataset.lec); return; }
      go(b.dataset.go);
    };
  });
  if($('#hmSetExam')) $('#hmSetExam').onclick = function(){ go('s-adm'); };
  /* 루틴 — 학생은 직접 체크하지 않고 선생님 확인을 요청합니다 */
  $$('#page [data-rtq]').forEach(function(b){
    b.onclick = function(ev){
      if(ev){ ev.preventDefault(); ev.stopPropagation(); }
      var key = b.dataset.rtq, title = b.dataset.rtt || '';
      var note = prompt('「' + title + '」을 마쳤다고 선생님께 확인을 요청합니다.\n남길 말이 있으면 적어 주세요 (비워도 됩니다)', '');
      if(note === null) return;
      rtRequest(s.id, today, key, title, note);
      toast('확인을 요청했습니다. 선생님이 확인하면 완료로 바뀝니다.');
      v2Home();
    };
  });
  $$('#page [data-rtgo]').forEach(function(b){ b.onclick = function(){ window._centerAct = b.dataset.rtact || ''; go(b.dataset.rtgo); }; });
}

/* 오늘 숫자 카드 */
function homeNum(label, val, sub, color, rate, to){
  return '<div class="hm-num" style="--c:' + color + '" data-go="' + to + '">'
    + '<div class="hm-n-l">' + label + '</div>'
    + '<div class="hm-n-v">' + val + '</div>'
    + '<div class="hm-n-bar"><div style="width:' + Math.max(0, Math.min(100, rate)) + '%"></div></div>'
    + '<div class="hm-n-s">' + sub + '</div></div>';
}

function runDailyTest(studentId){
 const qs=pickQuestions('vocab',10);
 window._afterQuiz=function(){ const sess=DB.sessions.filter(function(x){return x.studentId===studentId;}); const last=sess[sess.length-1]; const rate=last?last.rate:0; const passed=rate>=90;
 DB.dailyTests[studentId]=DB.dailyTests[studentId]||{}; DB.dailyTests[studentId][todayStr()]={score:Math.round(rate/10),total:10,passed:passed}; save();
 toast(passed?'단어테스트 통과':'미통과 — 다시 도전해 보세요'); go('s-home'); };
 window._againQuiz=function(){ runDailyTest(studentId); };
 startQuiz(qs,{mode:'daily',section:'vocab'});
}

/* ---------- Phase2: 과제 + 평가 + 인증 요청 ---------- */
function v2Assignments(){
 const s=myStu(); const today=todayStr(); const st=dailyStatus(s.id);
 if(typeof ensureTodayAssignment==='function') ensureTodayAssignment();
 const todays=acf(DB.assignments).filter(function(a){return a.date===today;});
 let html=head('과제 · 평가','오늘 낼 과제와 응시할 평가입니다');
 html+= (typeof assessStudentPanel==='function'?assessStudentPanel():'');
 html+='<div class="panel"><h3>오늘의 과제 <small class="muted">손으로 쓴 뒤 사진으로 제출</small></h3>'
 + (todays.length?todays.map(function(a){ const sub=DB.submissions.find(function(x){return x.assignmentId===a.id&&x.studentId===s.id;});
 var subBox = sub
   ? ('<div class="aibox '+(sub.status==='redo'?'hw-redo':'')+'"><b>'+(sub.status==='graded'?'첨삭 완료':(sub.status==='redo'?'다시 제출 요청':'제출 완료 · 확인 대기'))+'</b>'
      +'<p>'+esc(sub.text||'')+'</p>'
      +(sub.feedback?'<div class="hw-fb"><b>선생님 피드백</b><p>'+esc(sub.feedback)+'</p>'+(sub.by?('<span class="muted">'+esc(sub.by)+' · '+esc(sub.gradedAt||'')+'</span>'):'')+'</div>':'')
      +(sub.fileUrl?'<p style="margin-top:6px">내가 제출한 사진 · <a class="lnk" href="'+esc(sub.fileUrl)+'" target="_blank" rel="noopener">'+esc(sub.fileName||'파일 보기')+'</a></p>':'')
      +(sub.status==='redo'?'<button class="btn rptmini" data-redoas="'+a.id+'" data-subid="'+sub.id+'">다시 제출하기</button>':'')
      +'</div>')
   : ('<textarea id="hw_'+a.id+'" placeholder="제출 내용(또는 인증 메모)"></textarea>'
      +'<div class="hw-up"><label class="hw-up-l">과제 사진 <b class="req">필수</b></label>'
      +'<div class="upl-row"><input type="file" id="hwf_'+a.id+'" accept="image/*,.pdf,.doc,.docx,.hwp,.hwpx" capture="environment">'
      +'<button class="btn ghost rptmini" data-hwup="'+a.id+'">첨부 올리기</button></div>'
      +'<div class="muted hw-up-s" id="hws_'+a.id+'">JPG · PNG · PDF · 최대 50MB · 밝은 곳에서 글씨가 보이게 찍어 주세요</div></div>'
      +'<button class="btn" data-as="'+a.id+'">제출</button>');
 return '<div class="hwitem"><b>'+esc(a.title)+'</b><p class="muted">'+esc(a.desc)+'</p>'+subBox+'</div>'; }).join(''):'<div class="muted">오늘 과제가 없습니다.</div>')
 +'</div>'
 // 인증 요청 카드
 const reqs=[
 {kind:'homework', title:'과제 마감 인증', desc:'제출한 과제를 강사가 확인하면 오늘 학습이 인정됩니다', ready:st.homeworkDone, hint:'과제를 먼저 제출하세요'} ];
 html+='<div class="panel"><h3>과제 제출 인증</h3><div class="certgrid">'
 + reqs.map(function(r){ const stt=st.cert[r.kind];
 const btn = stt==='approved' ? '<span class="muted">승인 완료</span>' : stt==='pending' ? '<span class="muted">승인 대기 중…</span>' : ('<button class="btn rptmini '+(r.ready?'':'disabled')+'" data-cert="'+r.kind+'">'+(stt==='rejected'?'재요청':'인증 요청')+'</button>'+(r.ready?'':'<div class="muted" style="margin-top:5px">'+r.hint+'</div>'));
 return '<div class="certcard"><div class="certcard-h"><b>'+r.title+'</b>'+certBadge(stt)+'</div><p class="muted">'+r.desc+'</p>'+btn+'</div>'; }).join('')
 + '</div>' + (st.certified?'<div class="note-b ok" style="margin:12px 0 0"><div class="nb-t"><b>오늘 과제 인증 완료</b></div></div>':'') + '</div>';
 page(html);
 if(typeof bindAssessStudent==='function') bindAssessStudent();
 window._hwFiles=window._hwFiles||{};
 $$('[data-hwup]').forEach(function(b){ b.onclick=function(){ var aid=b.dataset.hwup;
   uploadPick('hwf_'+aid,'hws_'+aid,function(url,name,size){ window._hwFiles[aid]={url:url,name:name,size:size}; }, {maxMB:50}); }; });
 $$('#page [data-redoas]').forEach(function(b){ b.onclick=function(){
   var sid2=b.dataset.subid;
   DB.submissions=(DB.submissions||[]).filter(function(x){ return x.id!==sid2; });
   (DB._deletedIds=DB._deletedIds||[]).push(sid2);
   save(); toast('다시 제출할 수 있습니다'); v2Assignments(); }; });
 $$('[data-as]').forEach(function(b){ b.onclick=function(){ const aid=b.dataset.as; const txt=($('#hw_'+aid)||{}).value||'';
   var att=(window._hwFiles||{})[aid];
   if(!att){ toast('손으로 작성한 과제 사진을 첨부해야 제출할 수 있습니다'); return; }
   DB.submissions.push({id:uid('sub'),assignmentId:aid,studentId:s.id,date:today,text:txt||'(사진 제출)',fileUrl:att?att.url:'',fileName:att?att.name:'',status:'submitted',feedback:''});
   if(att) delete window._hwFiles[aid];
   save(); toast('과제를 제출했습니다'); v2Assignments(); }; });
 $$('[data-cert]').forEach(function(b){ b.onclick=function(){ if(b.classList.contains('disabled')){ toast('선행 조건을 먼저 완료하세요'); return; } submitCert(s.id,b.dataset.cert); toast('인증을 요청했습니다 — 강사/관리자 승인 대기'); v2Assignments(); }; });
}
function setDili(studentId,key,val){ DB.diligence[studentId]=DB.diligence[studentId]||{}; const d=DB.diligence[studentId][todayStr()]||{}; d[key]=val; DB.diligence[studentId][todayStr()]=d; save(); }

/* ---------- Phase2: 강사/관리자 인증 승인 ---------- */

/* ---------- Phase3: 모의고사 ---------- */
function v2Mock(){
 const s=myStu(); const mocks=DB.mockExams.filter(function(m){return m.studentId===s.id;}).sort(function(a,b){return a.round-b.round;});
 let html=head('정기 모의고사','2주마다 응시 · 최근 2회 합산으로 레벨업이 결정됩니다');
 html+=lvBar(s.id);
 html+='<div class="grid2"><div class="panel"><h3>회차별 성적 추이</h3><canvas id="mkLine" width="380" height="240"></canvas><p class="muted">내 점수 · 반 평균(점선) · 레벨업 타겟</p></div>'
 +'<div class="panel"><h3>모의고사 응시</h3><p class="muted">40문항(어휘·문법·독해·논리 각 10). 응시 결과가 '+(mocks.length+1)+'회차로 기록되고 레벨업이 자동 판정됩니다.</p>'
 +'<table class="tbl"><thead><tr><th>회차</th><th>내 점수</th><th>반 평균</th><th>타겟</th></tr></thead><tbody>'+(mocks.length?mocks.slice(-5).map(function(m){return '<tr><td>'+m.round+'회</td><td><b>'+m.score+'</b></td><td>'+m.classAvg+'</td><td>'+(m.target<=100?m.target:'-')+'</td></tr>';}).join(''):'<tr><td colspan="4" class="muted">기록 없음</td></tr>')+'</tbody></table>'
 +'<button class="btn big full" id="mockStart">모의고사 시작 →</button></div></div>';
 page(html);
 const cv=$('#mkLine');
 if(cv){ const labels=mocks.map(function(m){return m.round+'회';}); lineChart(cv,labels.length?labels:['1회'],[ {color:'#4f46e5',data:mocks.map(function(m){return m.score;})}, {color:'#94a3b8',dash:true,data:mocks.map(function(m){return m.classAvg;})}, {color:'#ef4444',dash:true,data:mocks.map(function(m){return m.target<=100?m.target:null;})} ]); }
 $('#mockStart').onclick=function(){ runMock(s.id); };
}
function runMock(studentId){
 window._afterQuiz=function(){ const sess=DB.sessions.filter(function(x){return x.studentId===studentId;}); const last=sess[sess.length-1]; const score=last?last.rate:0;
 const prev=DB.mockExams.filter(function(m){return m.studentId===studentId;}); const round=prev.length+1; const s=acf(DB.students).find(function(x){return x.id===studentId;});
 DB.mockExams.push({id:uid('mk'),studentId:studentId,round:round,score:score,classAvg:Math.round(score-5+Math.random()*6),target:GROUPS[studentGroup(s)].cut,date:todayStr()}); save();
 const res=applyLevelup(studentId);
 toast(res==='승급'?('레벨업! '+levelObj(studentLevel(s)).name+' 단계로 승급했습니다'):res==='강등'?'기준 미달로 한 단계 조정되었습니다':'모의고사 '+round+'회차 기록 완료'); go('s-mock'); };
 window._againQuiz=function(){ runMock(studentId); };
 let qs=[]; ['vocab','grammar','reading','logic'].forEach(function(sec){ qs=qs.concat(pickQuestions(sec,10)); });
 startQuiz(qs,{mode:'mock',section:'mix'});
}

/* ---------- Phase4: 성장 리포트 ---------- */
function v2Growth(){
 const s=myStu(); const tw=diligenceWeek(s.id,0); const lw=diligenceWeek(s.id,1);
 let html=head('성장 리포트','학습 성실도와 성적이 어떻게 변해왔는지 보여줍니다');
 html+=lvBar(s.id);
 var _dgap = tw.score - lw.score;
 html+='<div class="panel"><h3>공부 체력 <small class="muted">이번 주 '+tw.score+'% · 지난주 대비 '+(_dgap>=0?'+':'')+_dgap+'%p</small></h3>'
 +'<div class="gr-two"><div class="gr-bars">'
 + DILI_AXES.map(function(a){ var v=tw[a[0]], c = v>=80?'var(--ok)':v>=60?'var(--warn)':'var(--bad)';
     return '<div class="srow"><span>'+a[1]+'</span><div class="mini"><div style="width:'+v+'%;background:'+c+'"></div></div><b>'+v+'%</b></div>'; }).join('')
 +'</div><div class="gr-radar"><canvas id="g5" width="330" height="280"></canvas>'
 +'<div class="muted" style="text-align:center;margin-top:4px">진한 선 이번 주 · 점선 지난 주</div></div></div></div>';
 const mocks=DB.mockExams.filter(function(m){return m.studentId===s.id;}).sort(function(a,b){return a.round-b.round;});
 html+='<div class="panel"><h3>성장 곡선 <small class="muted">누적 정답률</small></h3>'
   + (typeof growthHtml==='function' ? growthHtml(s.id,'gGrow') : '') + '</div>';
 html+='<div class="grid2"><div class="panel"><h3>모의고사 추이</h3><canvas id="gLine" width="380" height="240"></canvas>'
 +'<div class="muted">내 점수 · 반 평균(점선) · 목표(빨강)</div></div>'
 +'<div class="panel"><h3>영역별 오답 비율</h3><canvas id="gPie" width="360" height="220"></canvas>'
 +'<div class="muted">가장 큰 조각이 다음 공략 대상입니다</div></div></div>';
 /* 카카오 리포트: 오픈 전까지 비표시 (KAKAO_REPORT_ON=true 로 복구) */
 if(typeof KAKAO_REPORT_ON!=='undefined' && KAKAO_REPORT_ON){
 html+='<div class="panel"><h3>카카오톡 격주 리포트 (미리보기)</h3><div class="kakao"><div class="kk-head">[CORE TRANSFER] 주간 학습 리포트</div>'
 +'<div class="kk-body"><b>'+esc(s.name)+'</b>님, 이번 주 공부체력 <b>'+tw.score+'%</b> ('+(tw.score-lw.score>=0?'▲':'▼')+Math.abs(tw.score-lw.score)+'). '
 +(mocks.length?('최근 모의 '+mocks[mocks.length-1].score+'점, '):'')+'레벨업까지 '+(levelup(s.id).cut<=100?levelup(s.id).gap+'점':'최종단계')+'. 상세 리포트를 확인하세요 →</div></div>'
 +'<button class="btn" id="kkSend">카카오 리포트 발송(미리보기)</button> <span class="muted">실제 발송은 카카오 알림톡 API 키 연동 시 활성화</span></div>';
 }
 page(html);
 if(typeof drawGrowth==='function') drawGrowth(s.id,'gGrow');
 if($('#g5')) radarOverlay($('#g5'),DILI_AXES.map(function(a){return a[1];}),[ {color:'#94a3b8',dash:true,values:DILI_AXES.map(function(a){return lw[a[0]];})}, {color:'#4f46e5',values:DILI_AXES.map(function(a){return tw[a[0]];})} ]);
 if($('#gLine')){ const labels=mocks.map(function(m){return m.round+'회';}); lineChart($('#gLine'),labels.length?labels:['-'],[ {color:'#4f46e5',data:mocks.map(function(m){return m.score;})},{color:'#94a3b8',dash:true,data:mocks.map(function(m){return m.classAvg;})},{color:'#ef4444',dash:true,data:mocks.map(function(m){return m.target<=100?m.target:null;})} ]); }
 if($('#gPie')){ const da=AI.detailAnalysis(s.id); const cols={vocab:'#2563eb',grammar:'#7c3aed',reading:'#0891b2',logic:'#db2777'}; const slices=Object.keys(SECTIONS).map(function(k){ const dd=da[k]; const wrong=dd?dd.rows.reduce(function(a,r){return a+(r.total-r.right);},0):0; return {label:SECTIONS[k],v:wrong,color:cols[k]}; }).filter(function(x){return x.v>0;}); if(slices.length) pieChart($('#gPie'),slices); else $('#gPie').replaceWith(el('<div class="muted">오답 데이터가 쌓이면 표시됩니다.</div>')); }
 if($('#kkSend'))$('#kkSend').onclick=function(){ DB.kakaoLog.push({sid:s.id,date:todayStr(),score:tw.score}); save(); toast('카카오 리포트가 발송되었습니다 (미리보기 — 실제 발송은 알림톡 연동 필요)'); };
}

/* ---------- Phase5: 실시간 관제 ---------- */
function v2Control(){
 const role=CURRENT.role; const today=todayStr();
 const mine= role==='instructor'? acf(DB.students).filter(function(s){return s.instructorId===CURRENT.id;}) : acf(DB.students);
 const enrolled=mine.filter(function(s){return s.cls;});
 function pctOf(n){ return enrolled.length?Math.round(n/enrolled.length*100):0; }
 var rows=enrolled.map(function(s){
   var sm=(typeof VOD!=='undefined')?VOD.summary(s.id):{total:0,once:0,twice:0,done:0,rate:0};
   var dt=(DB.dailyTests[s.id]||{})[today]||null;
   var hw=DB.submissions.some(function(x){return x.studentId===s.id&&x.date===today;});
   var asDone=0, asAll=0;
   (acf(DB.assessments)||[]).forEach(function(a){ if((a.openDate||today)<=today){ asAll++; var r=((DB.scores||{})[a.id]||{})[s.id]; if(typeof isCleared==='function'&&isCleared(r)) r=null; if(r&&r.submittedAt) asDone++; } });
   return {id:s.id,name:s.name,cls:s.cls,dt:dt,once:sm.once||0,twice:sm.twice||0,total:sm.total,done:sm.done,rate:sm.rate,hw:hw,asDone:asDone,asAll:asAll};
 });
 var nDt=rows.filter(function(r){return !!r.dt;}).length;
 var nDtPass=rows.filter(function(r){return r.dt&&r.dt.passed;}).length;
 var nOnce=rows.filter(function(r){return r.total>0 && r.once>=r.total;}).length;
 var nTwice=rows.filter(function(r){return r.total>0 && r.twice>=r.total;}).length;
 var avgRate=rows.length?Math.round(rows.reduce(function(a,b){return a+b.rate;},0)/rows.length):0;
 var _open=((acf(DB.assessments)||[]).filter(function(a){return (a.openDate||today)<=today;}));
 var _due=_open.filter(function(a){return a.dueDate&&a.dueDate>=today;});
 var _risk=(typeof OPS!=='undefined')?OPS.atRisk(enrolled):[];
 const comps=complaints().filter(function(c){return mine.some(function(s){return s.id===c.sid;});});

 let html=head('실시간 관제','학생별 진행 상황을 실시간으로 확인합니다');
 var onlineN = enrolled.filter(function(s2){ return (typeof presenceOf==='function') && presenceOf(s2.id).on; }).length;
 html+='<div class="stats">'
  +card('재원생',enrolled.length+'명','관리 대상')
  +card('접속 중',onlineN+'명',(enrolled.length? Math.round(onlineN/enrolled.length*100):0)+'% 온라인',onlineN?'var(--ok)':'var(--dim)','pz-card')
  +card('2회독 완료',nTwice+'명',pct(pctOf(nTwice))+' 전강 완료',nTwice?'var(--ok)':'var(--warn)')
  +card('평균 이수율',pct(avgRate),'2회독 인정 기준',avgRate>=70?'var(--ok)':'var(--warn)')
  +'</div>';

 if(_risk.length) html+='<div class="note-b bad"><div class="nb-t"><b>미이수 위험 '+_risk.length+'건</b>'
   + esc(_risk.slice(0,5).map(function(r){return r.name;}).join(', ')) + (_risk.length>5?(' 외 '+(_risk.length-5)+'명'):'')
   + '</div><button class="btn" onclick="go(\''+(role==='instructor'?'t-ops':'a-ops')+'\')">운영 알림</button></div>';

 html+='<div class="panel"><h3>학생별 진행 현황</h3>'
  +'<div class="tbl-wrap"><table class="tbl"><thead><tr><th>학생</th><th>접속</th><th>반</th><th>단어테스트</th><th>수업 1회독</th><th>수업 2회독</th><th>이수율</th><th>오늘 과제</th><th>평가 제출</th></tr></thead><tbody>'
  +(rows.length?rows.sort(function(a,b){return a.rate-b.rate;}).map(function(r){
      var dtTxt = r.dt? (r.dt.passed?'<span class="pill" style="--c:var(--ok)">통과</span>':'<span class="pill" style="--c:var(--bad)">미통과</span>') : '<span class="pill" style="--c:var(--dim)">미실시</span>';
      var pz = (typeof presenceOf==='function') ? presenceOf(r.id) : {on:false};
      var ptx = (typeof presenceText==='function') ? presenceText(r.id) : '-';
      return '<tr><td><b>'+esc(r.name)+'</b></td>'
        +'<td><span class="pz '+(pz.on?'on':'off')+'" data-pz="'+esc(r.id)+'"><i></i>'+esc(ptx)+'</span></td>'
        +'<td><span class="pill" style="--c:'+(r.cls?tierColor(r.cls):'#94a3b8')+'">'+(r.cls?tierName(r.cls):'미배정')+'</span></td>'
        +'<td>'+dtTxt+'</td>'
        +'<td>'+r.once+'/'+r.total+'</td>'
        +'<td><b>'+r.twice+'/'+r.total+'</b></td>'
        +'<td><div class="mini" style="display:inline-block;width:70px;vertical-align:middle"><div style="width:'+r.rate+'%;background:'+(r.rate>=80?'#059669':r.rate>=50?'#d97706':'#ef4444')+'"></div></div> '+pct(r.rate)+'</td>'
        +'<td>'+(r.hw?'제출':'<span class="muted">미제출</span>')+'</td>'
        +'<td>'+r.asDone+'/'+r.asAll+'</td></tr>';
    }).join(''):'<tr><td colspan="9" class="muted">재원생이 없습니다.</td></tr>')
  +'</tbody></table></div></div>';

 html+='<div class="grid2"><div class="panel"><h3>개입 대기 신호</h3>'
  +(comps.length?'<div class="tbl-wrap"><table class="tbl"><thead><tr><th>학생</th><th>신호</th><th>내용</th></tr></thead><tbody>'
    +comps.slice(0,10).map(function(c){ return '<tr><td><b>'+esc(c.name)+'</b></td><td><span class="pill" style="--c:'+(c.sev>=3?'#ef4444':c.sev===2?'#d97706':'#64748b')+'">'+esc(c.type)+'</span></td><td>'+esc(c.msg)+'</td></tr>'; }).join('')
    +'</tbody></table></div>':'<div class="muted">현재 개입이 필요한 신호가 없습니다.</div>')+'</div>'
  +'<div class="panel"><h3>평가 현황 <small class="muted">공개 '+_open.length+'개 · 마감 전 '+_due.length+'개</small></h3>'
  +(_open.length?'<div class="tbl-wrap"><table class="tbl"><thead><tr><th>유형</th><th>제목</th><th>마감</th><th>제출</th></tr></thead><tbody>'
    +_open.slice(0,8).map(function(a){ var sc=((DB.scores||{})[a.id]||{}); var n=Object.keys(sc).filter(function(k){return sc[k]&&!(typeof isCleared==='function'&&isCleared(sc[k]))&&sc[k].submittedAt;}).length;
      return '<tr><td><span class="as-chip as-'+a.type+'">'+(typeof assessTypeName==='function'?assessTypeName(a.type):a.type)+'</span></td><td>'+esc(a.title)+'</td><td>'+(a.dueDate||'-')+'</td><td>'+n+'/'+enrolled.length+'</td></tr>';
    }).join('')+'</tbody></table></div>':'<div class="muted">공개된 평가가 없습니다.</div>')
  +'<button class="btn ghost rptmini" style="margin-top:10px" onclick="go(\''+(role==='instructor'?'t-grade':'a-grade')+'\')">시험 채점으로 →</button></div></div>';
 page(html);
 $$('#page [data-r]').forEach(function(b){ b.onclick=function(){ downloadReport(b.dataset.r); }; });
}

/* ---------- Phase2: 강사 과제 첨삭 ---------- */
var HWG_FILT = 'todo', HWG_DATE = '';
function v2Grading(){
  var role = CURRENT.role;
  var mineS = (role==='instructor') ? acf(DB.students).filter(function(s){return s.instructorId===CURRENT.id;}) : acf(DB.students).filter(function(s){return !s.testOnly;});
  var mineIds = mineS.map(function(s){ return s.id; });
  HWG_DATE = HWG_DATE || todayStr();

  var all = (DB.submissions||[]).filter(function(x){ return mineIds.indexOf(x.studentId) >= 0; });
  var byDate = all.filter(function(x){ return x.date === HWG_DATE; });
  var todo = all.filter(function(x){ return x.status !== 'graded'; });
  var list = (HWG_FILT === 'todo') ? todo : (HWG_FILT === 'date' ? byDate : all);
  list = list.slice().sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });

  /* 오늘 과제 제출 현황 */
  var todayAssign = (acf(DB.assignments)||[]).filter(function(a){ return a.date === HWG_DATE; });
  var submittedIds = {};
  all.filter(function(x){ return x.date === HWG_DATE; }).forEach(function(x){ submittedIds[x.studentId] = 1; });
  var notYet = mineS.filter(function(s){ return s.cls && !submittedIds[s.id]; });

  var html = head('과제 확인 · 첨삭', '제출된 과제에 피드백을 남깁니다');
  /* 첨삭 대기·미제출 건수는 아래 필터 칩과 명단에 이미 있으므로 카드로 겹치지 않습니다 */
  html += '<div class="stats">'
    + card('오늘 제출', Object.keys(submittedIds).length + ' / ' + mineS.filter(function(s){return s.cls;}).length, esc(HWG_DATE))
    + card('첨삭 대기', todo.length + '건', todo.length ? '확인이 필요합니다' : '모두 처리했습니다', todo.length ? 'var(--warn)' : 'var(--ok)')
    + '</div>';

  /* 루틴 확인 요청 */
  var rtReqs=(DB.certs||[]).filter(function(c){
    return c && String(c.kind||'').indexOf('rt:')===0 && c.status==='pending' && mineIds.indexOf(c.studentId)>=0;
  }).sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });
  if(rtReqs.length){
    html += '<div class="panel"><h3>루틴 확인 요청 <small class="muted">'+rtReqs.length+'건</small></h3>'
      + '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>학생</th><th>날짜</th><th>항목</th><th>남긴 말</th><th></th></tr></thead><tbody>'
      + rtReqs.map(function(c){
          var st=(acf(DB.students)||[]).filter(function(x){return x.id===c.studentId;})[0]||{};
          return '<tr><td><b>'+esc(st.name||'-')+'</b></td><td>'+esc(c.date)+'</td>'
            + '<td>'+esc(c.rtTitle||String(c.kind).slice(3))+'</td>'
            + '<td class="muted">'+esc(c.note||'-')+'</td>'
            + '<td><button class="btn rptmini" data-rtok="'+c.id+'">이수 인정</button> '
            + '<button class="lnk del" data-rtno="'+c.id+'">반려</button></td></tr>';
        }).join('')
      + '</tbody></table></div></div>';
  }
  if(todayAssign.length){
    html += '<div class="panel"><h3>' + esc(HWG_DATE) + ' 과제</h3>'
      + todayAssign.map(function(a){
          return '<div class="hwitem"><b>' + esc(a.title) + '</b><p class="muted">' + esc(a.desc||'') + '</p></div>'; }).join('')
      + '</div>';
  }

  html += '<div class="bar"><div class="filters" id="hwgF">'
    + '<button class="chip' + (HWG_FILT==='todo'?' on':'') + '" data-hf="todo">첨삭 대기 ' + todo.length + '</button>'
    + '<button class="chip' + (HWG_FILT==='date'?' on':'') + '" data-hf="date">날짜별 ' + byDate.length + '</button>'
    + '<button class="chip' + (HWG_FILT==='all'?' on':'') + '" data-hf="all">전체 ' + all.length + '</button>'
    + '</div><div class="bar-actions"><label class="inl">날짜 <input type="date" id="hwgD" value="' + esc(HWG_DATE) + '"></label></div></div>';

  if(notYet.length){
    html += '<div class="note-b bad"><div class="nb-t"><b>' + esc(HWG_DATE) + ' 미제출 ' + notYet.length + '명</b>'
      + esc(notYet.slice(0,10).map(function(s){ return s.name; }).join(', ')) + (notYet.length>10 ? (' 외 ' + (notYet.length-10) + '명') : '') + '</div></div>';
  }

  html += '<div class="hwg-list">' + (list.length ? list.map(function(x){
      var s = acf(DB.students).find(function(y){ return y.id === x.studentId; });
      var a = (acf(DB.assignments)||[]).find(function(y){ return y.id === x.assignmentId; });
      var isImg = /\.(png|jpe?g|gif|webp)$/i.test(x.fileUrl||'');
      return '<div class="hwg-card' + (x.status==='graded' ? ' done' : '') + '">'
        + '<div class="hwg-h"><b>' + esc(s ? s.name : '학생') + '</b>'
        + '<span class="muted">' + esc(a ? a.title : '과제') + '</span>'
        + '<span class="hwg-date">' + esc(x.date||'') + '</span>'
        + (x.status==='graded' ? '<span class="vstat vstat-ok">첨삭 완료</span>' : '<span class="vstat vstat-ing">첨삭 대기</span>')
        + '</div>'
        + (x.fileUrl
            ? (isImg
                ? '<div class="hwg-img"><img src="' + esc(x.fileUrl) + '" alt="제출 사진" loading="lazy" data-zoom="' + esc(x.fileUrl) + '"></div>'
                : '<div class="hwg-file"><a class="btn ghost rptmini" href="' + esc(x.fileUrl) + '" target="_blank" rel="noopener">첨부 파일 열기 (' + esc(x.fileName||'파일') + ')</a></div>')
            : '<div class="muted hwg-nofile">첨부 파일 없음</div>')
        + (x.text && x.text !== '(사진 제출)' ? '<p class="hwg-text">' + esc(x.text) + '</p>' : '')
        + (x.status==='graded'
            ? '<div class="aibox hwg-fb"><b>내 피드백</b><p>' + esc(x.feedback||'') + '</p>'
              + '<button class="lnk" data-refb="' + x.id + '">피드백 수정</button></div>'
            : '<div class="hwg-fbbox">'
              + '<div class="hwg-quick">' + ['잘했어요. 이대로 유지하세요.','정리는 좋습니다. 오답 이유를 한 줄씩 더 적어 보세요.','글씨가 흐립니다. 다음엔 밝은 곳에서 촬영해 주세요.','분량이 부족합니다. 배운 내용을 더 채워 주세요.']
                  .map(function(q){ return '<button class="qbtn2" data-q="' + x.id + '" data-t="' + esc(q) + '">' + esc(q) + '</button>'; }).join('') + '</div>'
              + '<textarea id="fb_' + x.id + '" placeholder="피드백을 입력하세요">' + esc(x.feedback||'') + '</textarea>'
              + '<div class="hwg-acts"><button class="btn rptmini" data-fb="' + x.id + '">피드백 저장</button>'
              + '<button class="btn ghost rptmini" data-redo="' + x.id + '">다시 제출 요청</button></div></div>')
        + '</div>';
    }).join('') : '<div class="panel"><div class="muted">해당 조건의 제출물이 없습니다.</div></div>') + '</div>';

  page(html);
  $$('#page [data-rtok]').forEach(function(b){ b.onclick=function(){
    approveCert(b.dataset.rtok, true, CURRENT.id, CURRENT.name);
    toast('이수로 인정했습니다'); v2Grading(); }; });
  $$('#page [data-rtno]').forEach(function(b){ b.onclick=function(){
    if(!confirm('이 요청을 반려할까요?')) return;
    approveCert(b.dataset.rtno, false, CURRENT.id, CURRENT.name);
    toast('반려했습니다'); v2Grading(); }; });
  $$('#hwgF [data-hf]').forEach(function(b){ b.onclick=function(){ HWG_FILT=b.dataset.hf; v2Grading(); }; });
  if($('#hwgD')) $('#hwgD').onchange=function(){ HWG_DATE=$('#hwgD').value; HWG_FILT='date'; v2Grading(); };
  $$('#page [data-q]').forEach(function(b){ b.onclick=function(){
    var ta=$('#fb_'+b.dataset.q); if(ta){ ta.value = (ta.value ? (ta.value+' ') : '') + b.dataset.t; ta.focus(); } }; });
  $$('#page [data-fb]').forEach(function(b){ b.onclick=function(){
    var id=b.dataset.fb, fb=($('#fb_'+id)||{}).value||'';
    if(!fb.trim()){ toast('피드백 내용을 입력해 주세요'); return; }
    var sub=(DB.submissions||[]).find(function(x){ return x.id===id; });
    if(sub){ sub.feedback=fb; sub.status='graded'; sub.by=CURRENT.name; sub.gradedAt=todayStr(); save(); toast('피드백을 저장했습니다'); v2Grading(); } }; });
  $$('#page [data-refb]').forEach(function(b){ b.onclick=function(){
    var sub=(DB.submissions||[]).find(function(x){ return x.id===b.dataset.refb; });
    if(sub){ sub.status='submitted'; save(); v2Grading(); } }; });
  $$('#page [data-redo]').forEach(function(b){ b.onclick=function(){
    if(!confirm('이 제출물을 반려하고 다시 제출하도록 요청할까요?')) return;
    var sub=(DB.submissions||[]).find(function(x){ return x.id===b.dataset.redo; });
    if(sub){ sub.feedback=(($('#fb_'+sub.id)||{}).value||'다시 작성해 제출해 주세요.'); sub.status='redo'; sub.by=CURRENT.name; sub.gradedAt=todayStr(); save(); toast('다시 제출을 요청했습니다'); v2Grading(); } }; });
  $$('#page [data-zoom]').forEach(function(img){ img.onclick=function(){
    openModal(el('<div class="form hwg-zoom"><h3>제출 사진</h3><img src="' + esc(img.dataset.zoom) + '" alt="제출 사진">'
      + '<div class="modal-actions"><a class="btn ghost" href="' + esc(img.dataset.zoom) + '" target="_blank" rel="noopener">새 창에서 크게 보기</a>'
      + '<button class="btn" id="hz_x">닫기</button></div></div>'));
    document.getElementById('hz_x').onclick=closeModal; }; });
}

/* ---------- 6단계 로드맵 + 시간표 ---------- */
function roadmapHtml(curLevel){
 return '<div class="road">'+LEVELS.map(function(l){return '<div class="road-step '+(l.id===curLevel?'on':'')+'" style="--c:'+l.color+'"><b>'+l.id+'단계</b><span>'+l.name+'</span><small>'+l.ko+'</small></div>';}).join('')+'</div>';
}
function timetableHtml(grp){
 /* 온라인(녹화) 학습: 교시·시간 구분 없이 요일별 학습 구성만 표시 */
 const tt=TIMETABLE[grp]||TIMETABLE['하']; const days=['월','화','수','목','금'];
 const byDay=days.map(function(d,i){
   var items=[]; tt.forEach(function(r){ var v=r[i]; if(v && items.indexOf(v)<0) items.push(v); });
   return {day:d, items:items};
 });
 return '<div class="wkgrid">'+byDay.map(function(c){
   return '<div class="wkday"><div class="wkday-h">'+c.day+'</div>'
     + c.items.map(function(v){ return '<div class="wkitem">'+esc(v)+'</div>'; }).join('')
     + '</div>';
 }).join('')+'</div><p class="muted" style="margin-top:10px">녹화 강의는 정해진 시간 없이 수강 기한 내 자유롭게 시청하면 됩니다. (각 강의 2회독 완료 시 학습 인정)</p>';
}


/* 실시간 관제: 화면을 다시 그리지 않고 접속 표시만 새로 고친다 */
function refreshPresenceCells(){
  var cells = $$('#page .pz[data-pz]');
  if(!cells || !cells.length) return;
  var on = 0;
  cells.forEach(function(c){
    var id = c.dataset.pz;
    var pz = (typeof presenceOf==='function') ? presenceOf(id) : {on:false};
    var tx = (typeof presenceText==='function') ? presenceText(id) : '-';
    c.className = 'pz ' + (pz.on ? 'on' : 'off');
    c.innerHTML = '<i></i>' + esc(tx);
    if(pz.on) on++;
  });
  var card = document.querySelector('#page .stat.pz-card');
  if(card){
    var v = card.querySelector('.stat-v'), sb = card.querySelector('.stat-s');
    if(v) v.textContent = on + '명';
    if(sb) sb.textContent = (cells.length ? Math.round(on/cells.length*100) : 0) + '% 온라인';
    card.style.setProperty('--c', on ? '#059669' : '#94a3b8');
  }
}
