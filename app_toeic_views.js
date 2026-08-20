/* ===================== 이룸토익 LMS · 학생 화면 ===================== */

function toMe(){
  if(!CURRENT) return null;
  return (DB.students||[]).find(function(s){ return s.id===CURRENT.id; }) || null;
}
function toScoreBadge(score){
  if(score==null) return '<span class="pill" style="--c:#94a3b8">기록 없음</span>';
  var lv = toLevel(toLevelOf(score));
  return '<span class="pill" style="--c:'+lv.color+'">'+score+'점 · '+lv.name+'</span>';
}
function toBar(rate, color){
  var r = rate==null ? 0 : rate;
  return '<div class="mini"><div style="width:'+r+'%'+(color?';background:'+color:'')+'"></div></div>';
}
function toRateColor(r){ return r==null ? '#cbd5e1' : (r>=80?'#059669': r>=65?'#0d9488': r>=50?'#d97706':'#ef4444'); }

/* ---------------- 홈 ---------------- */
function tsHome(){
  var sid = CURRENT.id, sum = toSummary(sid), g = sum.goal;
  var next = g.examDate ? {date:g.examDate, round:null} : toNextExam();
  var pred = toPredict(sid);

  var h = head('목표 점수까지, 오늘도 한 걸음', (toMe()?esc(toMe().name):'') + ' 님의 토익 학습 현황입니다');
  h += (typeof quoteHtml==='function' ? quoteHtml() : '');

  /* 핵심 숫자 */
  h += '<div class="stats">';
  h += '<div class="stat-go" data-goto="ts-goal">'+card('목표 점수', g.target+'점', esc(g.purpose||'취업'), '#0d9488')+'</div>';
  h += '<div class="stat-go" data-goto="ts-score">'+card('최근 예상 점수', sum.last!=null? sum.last+'점':'—', sum.mocks+'회 응시', '#0891b2')+'</div>';
  h += '<div class="stat-go" data-goto="ts-score">'+card('최고 점수', sum.best!=null? sum.best+'점':'—', sum.best!=null? toLevelName(toLevelOf(sum.best)) : '모의고사를 보면 표시됩니다', '#7c3aed')+'</div>';
  h += '<div class="stat-go" data-goto="ts-date">'+card('시험일까지', next? (toDdayText(next.date)) : '—', next? next.date : '시험일을 정해 보세요', '#d97706')+'</div>';
  h += '</div>';

  /* 목표까지 남은 거리 */
  h += '<div class="panel"><h3>목표까지</h3>';
  if(sum.last==null){
    h += '<p class="muted">아직 모의고사 기록이 없습니다. <b>실전 모의고사</b>를 한 번 보면 현재 위치와 목표까지 남은 정답 수를 계산해 드립니다.</p>'
      +  '<button class="btn" data-goto="ts-mock">모의고사 보러 가기</button>';
  }else{
    var gap = g.target - sum.last;
    var pctv = Math.max(0, Math.min(100, Math.round(sum.last/g.target*100)));
    h += '<div class="tex-goalbar"><div class="tex-goalbar-in" style="width:'+pctv+'%"></div>'
      +  '<span class="tex-goalbar-l">'+sum.last+'점</span><span class="tex-goalbar-r">'+g.target+'점</span></div>';
    if(gap<=0) h += '<p class="tex-ok">목표 점수를 이미 넘었습니다. 지금 실력을 유지하는 학습으로 넘어가세요.</p>';
    else{
      var need = pred.need;
      h += '<p>목표까지 <b>'+gap+'점</b> 남았습니다.';
      if(need) h += ' 지금 성적 기준으로 <b>LC '+need.lc+'문항 · RC '+need.rc+'문항</b>을 더 맞히면 도달합니다.';
      h += '</p>';
      if(pred.weeksToGoal) h += '<p class="muted">지금 속도(주당 '+pred.slope+'점)라면 약 <b>'+pred.weeksToGoal+'주</b> 뒤 '+pred.etaDate+' 무렵 도달합니다.</p>';
      else if(pred.msg) h += '<p class="muted">'+esc(pred.msg)+'</p>';
    }
  }
  h += '</div>';

  /* 파트별 현황 */
  h += '<div class="grid2"><div class="panel"><h3>파트별 정답률</h3>';
  var any = false;
  TO_PARTS.forEach(function(p){
    var a = sum.parts[p.p];
    if(!a.total) return;
    any = true;
    h += '<div class="srow"><span>'+p.name+' '+p.title+'</span>'+toBar(a.rate, toRateColor(a.rate))+'<b>'+a.rate+'%</b></div>';
  });
  if(!any) h += '<p class="muted">아직 푼 문항이 없습니다. 파트별 학습에서 10문항만 풀어 보세요.</p>';
  h += '<button class="btn ghost full" data-goto="ts-part">파트별 학습</button></div>';

  /* 오늘 할 일 */
  h += '<div class="panel"><h3>오늘 할 일</h3><ul class="tex-todo">';
  var todo = toTodayTodo(sid, sum);
  todo.forEach(function(t){ h += '<li><b>'+esc(t.t)+'</b><span>'+esc(t.s)+'</span>'
    + (t.go?'<button class="lnk" data-goto="'+t.go+'">바로가기</button>':'')+'</li>'; });
  h += '</ul></div></div>';

  /* 빠른 시작 */
  h += '<div class="panel"><h3>빠른 시작</h3><div class="tex-quick">'
    +  '<button class="btn" id="tqMock">실전 모의고사</button>'
    +  '<button class="btn ghost" id="tqWeak">약한 파트 10문항</button>'
    +  '<button class="btn ghost" id="tqWrong">오답 다시 풀기</button>'
    +  '<button class="btn ghost" data-goto="ts-plan">약점 공략 플랜</button>'
    +  '</div></div>';

  page(h);
  toBindGoto();
  var b1=$('#tqMock'); if(b1) b1.onclick=function(){ toRunMock('half'); };
  var b2=$('#tqWeak'); if(b2) b2.onclick=function(){
    var w = sum.weakest ? sum.weakest.p : 5;
    toRunPart(w, 10);
  };
  var b3=$('#tqWrong'); if(b3) b3.onclick=function(){ toRunWrong(sid, 20); };
}
function toTodayTodo(sid, sum){
  var out = [];
  if(!sum.mocks) out.push({t:'실전 모의고사 1회', s:'현재 위치를 알아야 계획이 나옵니다', go:'ts-mock'});
  if(sum.weakest) out.push({t:sum.weakest.name+' 집중 20문항', s:'정답률 '+sum.weakest.rate+'% — 가장 약한 파트입니다', go:'ts-part'});
  else out.push({t:'파트별 학습 20문항', s:'파트를 골라 유형 감각을 익히세요', go:'ts-part'});
  var w = toWrongList(sid).length;
  if(w) out.push({t:'오답 '+Math.min(w,20)+'문항 복습', s:'아직 고치지 못한 오답이 '+w+'개 있습니다', go:'ts-wrong'});
  var wp = (typeof toWordProgress==='function') ? toWordProgress(sid) : null;
  if(wp) out.push({t:'빈출 어휘 Day ' + wp.day + ' (' + toWordPerDay() + '개)', s:'외운 단어 ' + wp.known + ' / ' + wp.total + ' · 연속 ' + wp.streak + '일', go:'ts-word'});
  else out.push({t:'단어 · 표현 정리', s:'오답에서 모르는 어휘를 메모해 두세요', go:'ts-wrong'});
  return out.slice(0,4);
}
function toBindGoto(){
  $$('[data-goto]').forEach(function(b){ b.onclick=function(){ go(b.dataset.goto); }; });
}

/* ---------------- 파트별 학습 ---------------- */
function tsPart(){
  var sid = CURRENT.id, st = toPartStats(sid), stat = toBankStat();
  var h = head('파트별 학습', '파트와 유형을 골라 원하는 만큼 연습합니다');
  h += '<div class="tex-partgrid">';
  TO_PARTS.forEach(function(p){
    var a = st[p.p], n = stat[p.p]||0;
    h += '<div class="tex-partcard">'
      +  '<div class="tex-partcard-h"><b>'+p.name+'</b><span class="pill" style="--c:'+(p.area==='LC'?'#0891b2':'#7c3aed')+'">'+p.area+'</span></div>'
      +  '<div class="tex-partcard-t">'+esc(p.title)+'</div>'
      +  '<p class="muted">'+esc(p.desc)+'</p>'
      +  '<div class="tex-partcard-s">내 정답률 '+(a.total? '<b>'+a.rate+'%</b> ('+a.right+'/'+a.total+')' : '<b class="muted">기록 없음</b>')+'</div>'
      +  toBar(a.rate, toRateColor(a.rate))
      +  '<div class="tex-partcard-b">'
      +  '<button class="btn" data-p="'+p.p+'" data-n="10" '+(n?'':'disabled')+'>10문항</button>'
      +  '<button class="btn ghost" data-p="'+p.p+'" data-n="20" '+(n?'':'disabled')+'>20문항</button>'
      +  '<button class="lnk" data-tp="'+p.p+'" '+(n?'':'disabled')+'>유형 고르기</button>'
      +  '</div>'
      +  '<div class="muted tex-partcard-n">등록 문항 '+n+'개'+(n?'':' — 관리자 등록 대기')+'</div>'
      +  '</div>';
  });
  h += '</div>';
  page(h);
  $$('[data-p][data-n]').forEach(function(b){ b.onclick=function(){ toRunPart(+b.dataset.p, +b.dataset.n); }; });
  $$('[data-tp]').forEach(function(b){ b.onclick=function(){ toTypePicker(+b.dataset.tp); }; });
}
function toTypePicker(part){
  var sid = CURRENT.id;
  var types = toTypes(part);
  var stats = toTypeStats(sid, part);
  var byType = {}; stats.forEach(function(t){ byType[t.type]=t; });
  var node = el('<div class="form-card"></div>');
  var h = '<h3>'+toPart(part).name+' 유형 고르기</h3><div class="tex-typelist">';
  types.forEach(function(t){
    var n = toBank().filter(function(q){ return q.part===part && q.type===t; }).length;
    var s = byType[t];
    h += '<div class="tex-typerow"><span>'+esc(t)+'</span>'
      +  '<span class="muted">'+(s? s.rate+'% ('+s.right+'/'+s.total+')' : '기록 없음')+' · 문항 '+n+'개</span>'
      +  '<button class="btn '+(n?'':'ghost')+'" data-t="'+esc(t)+'" '+(n?'':'disabled')+'>10문항</button></div>';
  });
  h += '</div><button class="btn ghost full" id="tpClose">닫기</button>';
  node.innerHTML = h;
  openModal(node);
  node.querySelectorAll('[data-t]').forEach(function(b){
    b.onclick=function(){ closeModal(); toRunType(part, b.dataset.t, 10); };
  });
  node.querySelector('#tpClose').onclick = closeModal;
}

/* ---------------- 실전 모의고사 ---------------- */
function tsMock(){
  var sid = CURRENT.id;
  var stat = toBankStat();
  var exams = acf(DB.toeicExams||[]);
  var mine = toMockSessions(sid);
  var h = head('실전 모의고사', '실제 시험과 같은 순서로 풀고 예상 점수를 확인합니다');

  h += '<div class="grid2">';
  h += '<div class="panel"><h3>바로 응시</h3>'
    +  '<div class="tex-mockcard"><b>전체 모의고사</b><span class="muted">LC 100 · RC 100 · 총 200문항 (약 120분)</span>'
    +  '<button class="btn big full" id="tmFull">전체 모의고사 시작</button></div>'
    +  '<div class="tex-mockcard"><b>하프 모의고사</b><span class="muted">약 100문항 · 시간이 부족할 때</span>'
    +  '<button class="btn ghost full" id="tmHalf">하프 모의고사 시작</button></div>'
    +  '<p class="muted">현재 문제은행 : LC '+stat.lc+'문항 · RC '+stat.rc+'문항 (총 '+stat.total+')<br>'
    +  '문항이 모자란 파트는 있는 만큼만 출제되고, 점수는 비례 추정으로 표시됩니다.</p></div>';

  h += '<div class="panel"><h3>등록된 회차</h3>';
  if(!exams.length) h += '<p class="muted">관리자가 등록한 정식 회차가 아직 없습니다.</p>';
  else{
    h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>회차</th><th>문항</th><th>제한</th><th></th></tr></thead><tbody>';
    exams.forEach(function(e){
      var n = (e.qids||[]).length;
      var done = mine.filter(function(s){ return s.examId===e.id; }).length;
      h += '<tr><td><b>'+esc(e.name||'회차')+'</b>'+(done?' <span class="pill" style="--c:#059669">'+done+'회 응시</span>':'')+'</td>'
        +  '<td>'+n+'</td><td>'+(e.limitMin? e.limitMin+'분':'자동')+'</td>'
        +  '<td><button class="btn" data-ex="'+e.id+'" '+(n?'':'disabled')+'>응시</button></td></tr>';
    });
    h += '</tbody></table></div>';
  }
  h += '</div></div>';

  /* 지난 응시 */
  h += '<div class="panel"><h3>지난 모의고사 기록</h3>';
  if(!mine.length) h += '<p class="muted">아직 응시 기록이 없습니다.</p>';
  else{
    h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>날짜</th><th>예상 점수</th><th>LC</th><th>RC</th><th>정답률</th><th></th></tr></thead><tbody>';
    mine.forEach(function(s){
      h += '<tr><td>'+esc(s.date)+'</td>'
        +  '<td><b>'+(s.score? s.score.total+'점':'—')+'</b></td>'
        +  '<td>'+(s.score? s.score.lc:'—')+' <span class="muted">('+s.lc.right+'/'+s.lc.total+')</span></td>'
        +  '<td>'+(s.score? s.score.rc:'—')+' <span class="muted">('+s.rc.right+'/'+s.rc.total+')</span></td>'
        +  '<td>'+s.rate+'%</td>'
        +  '<td><button class="lnk" data-rv="'+s.id+'">다시보기</button> <button class="lnk" data-rw="'+s.id+'">틀린 것만</button></td></tr>';
    });
    h += '</tbody></table></div>';
  }
  h += '</div>';

  page(h);
  $('#tmFull').onclick = function(){ toRunMock('full'); };
  $('#tmHalf').onclick = function(){ toRunMock('half'); };
  $$('[data-ex]').forEach(function(b){ b.onclick=function(){ toRunExam(b.dataset.ex); }; });
  $$('[data-rv]').forEach(function(b){ b.onclick=function(){ toSessionReview(b.dataset.rv, false); }; });
  $$('[data-rw]').forEach(function(b){ b.onclick=function(){ toSessionReview(b.dataset.rw, true); }; });
}

/* ---------------- 오답노트 ---------------- */
function tsWrong(){
  var sid = CURRENT.id;
  var filt = null;
  function draw(){
    var list = toWrongList(sid, {part:filt, includeFixed:false});
    var fixed = toWrongList(sid, {includeFixed:true}).filter(function(w){ return w.fixed; });
    var h = head('오답노트', '두 번 이상 틀린 문항부터 다시 풀어 보세요');
    h += '<div class="stats">'
      +  card('아직 못 고친 오답', toWrongList(sid).length+'개', '한 번이라도 틀린 뒤 아직 못 맞힌 문항')
      +  card('반복 오답', toWrongList(sid).filter(function(w){return w.miss>=2;}).length+'개', '두 번 이상 틀린 문항', '#ef4444')
      +  card('고친 오답', fixed.length+'개', '틀린 뒤 다시 맞힌 문항', '#059669')
      +  '</div>';
    h += '<div class="bar"><div class="filters" id="twFilt">'
      +  '<button class="chip '+(filt===null?'on':'')+'" data-f="">전체</button>'
      +  TO_PARTS.map(function(p){ return '<button class="chip '+(filt===p.p?'on':'')+'" data-f="'+p.p+'">'+p.name+'</button>'; }).join('')
      +  '</div><button class="btn" id="twRun" '+(list.length?'':'disabled')+'>오답 '+Math.min(list.length,20)+'문항 다시 풀기</button></div>';
    h += '<div class="panel">';
    if(!list.length) h += '<p class="muted">해당 조건의 오답이 없습니다.</p>';
    else{
      h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>파트</th><th>유형</th><th>문항</th><th>틀린 횟수</th><th>마지막</th><th></th></tr></thead><tbody>';
      list.forEach(function(w){
        var q = toQById(w.id);
        h += '<tr><td>'+toPart(w.part).name+'</td><td>'+esc(w.type||'-')+'</td>'
          +  '<td class="tex-stemcell">'+esc((q&&q.stem||'').slice(0,60))+'</td>'
          +  '<td>'+(w.miss>=2?'<b style="color:#ef4444">'+w.miss+'회</b>':w.miss+'회')+'</td>'
          +  '<td>'+esc(w.last||'-')+'</td>'
          +  '<td><button class="lnk" data-q="'+w.id+'">문제 보기</button></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';
    page(h);
    $$('#twFilt .chip').forEach(function(b){ b.onclick=function(){ filt = b.dataset.f ? +b.dataset.f : null; draw(); }; });
    var r=$('#twRun'); if(r) r.onclick=function(){
      var ids = toWrongList(sid,{part:filt}).slice(0,20).map(function(w){return w.id;});
      var qs = ids.map(toQById).filter(Boolean);
      if(!qs.length) return toast('다시 풀 오답이 없습니다.');
      toStartExam(qs, {mode:'wrong', real:false});
    };
    $$('[data-q]').forEach(function(b){ b.onclick=function(){ toShowQuestion(b.dataset.q); }; });
  }
  draw();
}
function toShowQuestion(qid){
  var q = toQById(qid);
  if(!q) return toast('문항을 찾을 수 없습니다.');
  var d = { id:q.id, part:q.part, type:q.type, stem:q.stem, opts:q.options.slice(),
            ansIdx:q.answer, picked:null, correct:false };
  toReview([d], false);
}

/* ---------------- 내 점수 ---------------- */
function tsScore(){
  var sid = CURRENT.id, sum = toSummary(sid);
  var ms = toMockSessions(sid).slice().reverse();
  var h = head('내 점수', '모의고사 예상 점수와 파트별 성적을 봅니다');
  h += '<div class="stats">'
    +  card('최근 예상 점수', sum.last!=null? sum.last+'점':'—', sum.mocks+'회 응시', '#0891b2')
    +  card('최고 점수', sum.best!=null? sum.best+'점':'—', sum.best!=null?toLevelName(toLevelOf(sum.best)):'', '#7c3aed')
    +  card('푼 문항', fmtNum(sum.solved)+'문항', '전체 응시 '+sum.sessions+'회')
    +  card('반', sum.level? toLevelName(sum.level):'미배정', sum.level? toLevel(sum.level).sub:'모의고사 응시 후 배정', toLevelColor(sum.level))
    +  '</div>';

  h += '<div class="panel"><h3>점수 변화</h3>';
  if(ms.length<1) h += '<p class="muted">모의고사를 보면 점수 변화 그래프가 그려집니다.</p>';
  else h += '<canvas id="tsChart" height="200"></canvas>';
  h += '</div>';

  h += '<div class="grid2"><div class="panel"><h3>파트별 정답률</h3>';
  var any=false;
  TO_PARTS.forEach(function(p){
    var a = sum.parts[p.p]; if(!a.total) return; any=true;
    h += '<div class="srow"><span>'+p.name+' '+p.title+'</span>'+toBar(a.rate,toRateColor(a.rate))+'<b>'+a.right+'/'+a.total+'</b></div>';
  });
  if(!any) h += '<p class="muted">아직 기록이 없습니다.</p>';
  h += '</div>';

  h += '<div class="panel"><h3>약한 유형 10개</h3>';
  var ts = toTypeStats(sid).filter(function(t){ return t.total>=2; }).slice(0,10);
  if(!ts.length) h += '<p class="muted">문항을 더 풀면 유형별 약점이 보입니다.</p>';
  else ts.forEach(function(t){
    h += '<div class="srow"><span>'+toPart(t.part).name+' · '+esc(t.type)+'</span>'+toBar(t.rate,toRateColor(t.rate))+'<b>'+t.rate+'%</b></div>';
  });
  h += '</div></div>';

  h += '<div class="panel"><h3>전체 응시 기록</h3>';
  var all = toSessions(sid);
  if(!all.length) h += '<p class="muted">응시 기록이 없습니다.</p>';
  else{
    h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>날짜</th><th>종류</th><th>문항</th><th>정답률</th><th>예상 점수</th><th></th></tr></thead><tbody>';
    all.slice(0,40).forEach(function(s){
      h += '<tr><td>'+esc(s.date)+'</td>'
        +  '<td>'+(TO_MODE_NAME[s.mode]||s.mode)+(s.part?' · '+toPart(s.part).name:'')+'</td>'
        +  '<td>'+s.right+'/'+s.total+'</td><td>'+s.rate+'%</td>'
        +  '<td>'+(s.score? '<b>'+s.score.total+'점</b>':'—')+'</td>'
        +  '<td><button class="lnk" data-rv="'+s.id+'">다시보기</button></td></tr>';
    });
    h += '</tbody></table></div>';
  }
  h += '</div>';
  page(h);
  $$('[data-rv]').forEach(function(b){ b.onclick=function(){ toSessionReview(b.dataset.rv,false); }; });
  if(ms.length) setTimeout(function(){ toDrawScoreChart('tsChart', ms); },0);
}
function toDrawScoreChart(id, ms){
  var cv = document.getElementById(id); if(!cv || !cv.getContext) return;
  var w = cv.width = cv.clientWidth || 600, hgt = cv.height;
  var ctx = cv.getContext('2d');
  ctx.clearRect(0,0,w,hgt);
  var pad = 36, x0=pad+14, x1=w-pad, y0=hgt-26, y1=14;
  var min = 200, max = 990;
  function X(i){ return ms.length<2 ? (x0+x1)/2 : x0 + (x1-x0)*i/(ms.length-1); }
  function Y(v){ return y0 - (y0-y1)*(Math.max(min,Math.min(max,v))-min)/(max-min); }
  /* 눈금 */
  ctx.strokeStyle='#e2e8f0'; ctx.fillStyle='#94a3b8'; ctx.font='11px sans-serif'; ctx.textAlign='right';
  [300,500,700,900].forEach(function(v){
    ctx.beginPath(); ctx.moveTo(x0-6,Y(v)); ctx.lineTo(x1,Y(v)); ctx.stroke();
    ctx.fillText(String(v), x0-10, Y(v)+4);
  });
  /* 목표선 */
  var g = toGoal(CURRENT.id);
  if(g && g.target){
    ctx.save(); ctx.setLineDash([4,4]); ctx.strokeStyle='#0d9488';
    ctx.beginPath(); ctx.moveTo(x0,Y(g.target)); ctx.lineTo(x1,Y(g.target)); ctx.stroke(); ctx.restore();
    ctx.fillStyle='#0d9488'; ctx.textAlign='left'; ctx.fillText('목표 '+g.target, x0+4, Y(g.target)-5);
  }
  /* 선 */
  ctx.strokeStyle='#0891b2'; ctx.lineWidth=2; ctx.beginPath();
  ms.forEach(function(s,i){ var v=s.score?s.score.total:0; if(i===0) ctx.moveTo(X(i),Y(v)); else ctx.lineTo(X(i),Y(v)); });
  ctx.stroke();
  ctx.fillStyle='#0891b2'; ctx.textAlign='center';
  ms.forEach(function(s,i){
    var v=s.score?s.score.total:0;
    ctx.beginPath(); ctx.arc(X(i),Y(v),4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#0f172a'; ctx.fillText(String(v), X(i), Y(v)-10);
    ctx.fillStyle='#94a3b8'; ctx.fillText(String(s.date||'').slice(5), X(i), y0+16);
    ctx.fillStyle='#0891b2';
  });
}

/* ---------------- 약점 공략 플랜 ---------------- */
function tsPlan(){
  var sid = CURRENT.id;
  var wp = toWeakPlan(sid, 4);
  var h = head('파트별 약점 공략 플랜', '정답률과 배점 비중을 함께 보고 4주 계획을 만듭니다');

  h += '<div class="panel"><h3>지금 어디를 고쳐야 하나</h3>';
  h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>파트</th><th>정답률</th><th>푼 문항</th><th>실제 시험 문항수</th><th>우선순위</th></tr></thead><tbody>';
  wp.rows.forEach(function(r,i){
    h += '<tr><td><b>'+r.name+'</b> '+esc(r.title)+'</td>'
      +  '<td>'+(r.rate!=null? r.rate+'%':'<span class="muted">기록 없음</span>')+'</td>'
      +  '<td>'+r.total+'</td><td>'+r.n+'</td>'
      +  '<td>'+(i===0?'<span class="pill" style="--c:#ef4444">1순위</span>': i===1?'<span class="pill" style="--c:#d97706">2순위</span>': '<span class="muted">'+(i+1)+'</span>')+'</td></tr>';
  });
  h += '</tbody></table></div>';
  h += '<p class="muted">우선순위는 «틀리는 비율 × 실제 시험 문항 비중»으로 계산합니다. 푼 문항이 10개 미만이면 신뢰도를 낮춰 반영합니다.</p></div>';

  h += '<div class="tex-plan">';
  wp.plan.forEach(function(w){
    h += '<div class="panel tex-week"><h3>'+w.week+'주차 <span class="muted">'+w.from+' ~ '+w.to+'</span></h3>'
      +  '<div class="tex-week-main"><span class="pill" style="--c:#0d9488">주력 '+w.main.name+'</span> '
      +  '<span class="pill" style="--c:#94a3b8">유지 '+w.sub.name+'</span></div>';
    if(w.focus.length) h += '<p class="tex-focus">집중 유형 : '+esc(w.focus.join(' · '))+'</p>';
    h += '<ul class="tex-todo2">'+w.todo.map(function(t){ return '<li>'+esc(t)+'</li>'; }).join('')+'</ul>'
      +  '<button class="btn ghost" data-p="'+w.main.p+'">'+w.main.name+' 20문항 풀기</button></div>';
  });
  h += '</div>';
  page(h);
  $$('[data-p]').forEach(function(b){ b.onclick=function(){ toRunPart(+b.dataset.p, 20); }; });
}

/* ---------------- 목표 달성 예측 ---------------- */
function tsGoal(){
  var sid = CURRENT.id, g = toGoal(sid), pred = toPredict(sid);
  var h = head('목표 점수 달성 예측', '지금 속도로 언제 목표에 닿는지 계산합니다');

  h += '<div class="panel"><h3>내 목표</h3><div class="tex-goalform">'
    +  '<label>목표 점수<select id="tgTarget">'
    +  TO_GOAL_PRESETS.map(function(v){ return '<option value="'+v+'" '+(g.target===v?'selected':'')+'>'+v+'점</option>'; }).join('')
    +  '</select></label>'
    +  '<label>목표 시험일<input type="date" id="tgDate" value="'+esc(g.examDate||'')+'"></label>'
    +  '<label>목적<select id="tgPurpose">'
    +  TO_PURPOSES.map(function(v){ return '<option '+(g.purpose===v?'selected':'')+'>'+v+'</option>'; }).join('')
    +  '</select></label>'
    +  '<button class="btn" id="tgSave">저장</button></div></div>';

  h += '<div class="stats">'
    +  card('현재 예상 점수', pred.cur!=null? pred.cur+'점':'—', '최근 모의고사', '#0891b2')
    +  card('목표 점수', g.target+'점', esc(g.purpose||''), '#0d9488')
    +  card('주당 상승폭', pred.slope!=null? (pred.slope>0?'+':'')+pred.slope+'점':'—', pred.n+'회 기록 기준', '#7c3aed')
    +  card('예상 도달', pred.weeksToGoal!=null? (pred.weeksToGoal===0?'달성':pred.weeksToGoal+'주 뒤'):'—', pred.etaDate||'', '#d97706')
    +  '</div>';

  h += '<div class="panel"><h3>진단</h3>';
  if(pred.msg) h += '<p class="tex-diag">'+esc(pred.msg)+'</p>';
  if(pred.need && pred.need.gap>0){
    h += '<p>목표까지 <b>'+pred.need.gap+'점</b>. 파트 배분으로는 <b>LC '+pred.need.lc+'문항 · RC '+pred.need.rc+'문항</b>을 더 맞히면 됩니다 '
      +  '<span class="muted">(LC '+pred.need.lcTarget+'점 + RC '+pred.need.rcTarget+'점 기준)</span></p>';
  }
  if(pred.etaDate && g.examDate){
    h += pred.beforeExam
      ? '<p class="tex-ok">목표 시험일('+esc(g.examDate)+') 전에 도달할 것으로 보입니다.</p>'
      : '<p class="tex-bad">지금 속도로는 목표 시험일('+esc(g.examDate)+')까지 도달이 어렵습니다. 주당 학습량을 늘리거나 시험 회차를 미루는 것을 고려하세요.</p>';
  }
  h += '<p class="muted">예측은 모의고사 점수의 추세를 직선으로 이은 추정입니다. 응시 횟수가 적으면 오차가 큽니다.</p></div>';

  /* 목표까지 필요한 정답 수 표 */
  h += '<div class="panel"><h3>점수대별 필요 정답 수 (100문항 기준)</h3><div class="tbl-wrap"><table class="tbl">'
    +  '<thead><tr><th>영역 점수</th><th>LC 필요 정답</th><th>RC 필요 정답</th></tr></thead><tbody>';
  [300,350,400,450,470,495].forEach(function(v){
    h += '<tr><td>'+v+'점</td><td>'+toNeedRight(v,'LC')+'개</td><td>'+toNeedRight(v,'RC')+'개</td></tr>';
  });
  h += '</tbody></table></div><p class="muted">같은 점수라도 RC 가 더 많이 맞아야 합니다. 이 표는 예상 환산표 기준입니다.</p></div>';

  page(h);
  $('#tgSave').onclick = function(){
    toGoalSet(CURRENT.id, { target:+$('#tgTarget').value, examDate:$('#tgDate').value||'', purpose:$('#tgPurpose').value });
    toast('목표를 저장했습니다'); tsGoal();
  };
}

/* ---------------- 지원 가능 기준 (커트라인) ---------------- */
function tsCut(){
  var sid = CURRENT.id, sum = toSummary(sid);
  var score = sum.best!=null ? sum.best : sum.last;
  var m = toCutMatch(score);
  var h = head('지원 가능 기준', '내 예상 점수로 어디까지 지원할 수 있는지 봅니다');
  h += '<div class="stats">'
    +  card('기준 점수', score!=null? score+'점':'—', score!=null?'최고 예상 점수 기준':'모의고사 응시 후 표시', '#0891b2')
    +  card('지원 가능', m.ok.length+'곳', '기준을 넘은 항목', '#059669')
    +  card('조금만 더', m.near.length+'곳', '70점 이내로 가까운 항목', '#d97706')
    +  card('아직 부족', m.far.length+'곳', '', '#94a3b8')
    +  '</div>';

  function block(title, list, color, note){
    var s = '<div class="panel"><h3>'+title+'</h3>';
    if(!list.length) s += '<p class="muted">해당 항목이 없습니다.</p>';
    else{
      s += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>기준</th><th>분류</th><th>요구 점수</th><th>차이</th><th>비고</th></tr></thead><tbody>';
      list.forEach(function(c){
        var diff = score==null ? null : score - c.score;
        s += '<tr><td><b>'+esc(c.name)+'</b></td><td>'+esc(c.cat||'')+'</td><td>'+c.score+'점</td>'
          +  '<td>'+(diff==null?'—':(diff>=0?'<span style="color:#059669">+'+diff+'</span>':'<span style="color:#ef4444">'+diff+'</span>'))+'</td>'
          +  '<td class="muted">'+esc(c.note||'')+'</td></tr>';
      });
      s += '</tbody></table></div>';
    }
    if(note) s += '<p class="muted">'+note+'</p>';
    return s + '</div>';
  }
  h += block('지원 가능', m.ok, '#059669');
  h += block('조금만 더 하면', m.near, '#d97706', '70점 이내 — 한두 달 집중하면 닿는 구간입니다.');
  h += block('아직 부족', m.far, '#94a3b8');
  h += '<div class="note-b"><div class="nb-t"><b>이 기준은 학원이 관리하는 참고 값입니다</b>'
    +  '기업·기관이 요구 점수를 공식적으로 밝히지 않는 경우가 많아, 실제 채용 공고와 학교 규정을 반드시 함께 확인하세요. '
    +  '기준 값은 관리자가 수정할 수 있습니다.</div></div>';
  page(h);
}

/* ---------------- 시험 일정 ---------------- */
function tsDate(){
  var sid = CURRENT.id, g = toGoal(sid);
  var list = toDates();
  var next = toNextExam();
  var h = head('토익 시험 일정', '정기시험 일정과 D-day 를 확인합니다');
  h += '<div class="stats">'
    +  card('다음 시험', next? next.date : '—', next? ('제'+next.round+'회') : '등록된 일정 없음', '#0891b2')
    +  card('D-day', next? toDdayText(next.date) : '—', '', '#d97706')
    +  card('내 목표 시험일', g.examDate||'미정', g.examDate? toDdayText(g.examDate):'목표 화면에서 정할 수 있습니다', '#0d9488')
    +  card('응시료', fmtNum(TO_FEE.regular)+'원', '특별추가 '+fmtNum(TO_FEE.late)+'원', '#7c3aed')
    +  '</div>';
  h += '<div class="panel"><h3>정기시험 일정</h3>';
  if(!list.length) h += '<p class="muted">등록된 일정이 없습니다.</p>';
  else{
    h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>회차</th><th>시험일</th><th>접수 시작</th><th>접수 마감</th><th>성적 발표</th><th>D-day</th><th></th></tr></thead><tbody>';
    list.forEach(function(d){
      var past = toDday(d.date) < 0;
      h += '<tr class="'+(past?'tex-past':'')+'"><td>제'+d.round+'회</td><td><b>'+esc(d.date)+'</b></td>'
        +  '<td>'+esc(d.open||'-')+'</td><td>'+esc(d.close||'-')+'</td><td>'+esc(d.result||'-')+'</td>'
        +  '<td>'+toDdayText(d.date)+'</td>'
        +  '<td>'+(past?'':'<button class="lnk" data-set="'+esc(d.date)+'">내 목표로</button>')+'</td></tr>';
    });
    h += '</tbody></table></div>';
  }
  h += '<p class="muted">2026년 정기시험은 제560회~제585회, 모두 26회입니다. 성적 발표는 보통 시험일로부터 9~10일 뒤 화요일 낮 12시입니다. '
    +  '표에 「회차 번호는 추정」이라고 적힌 줄은 시험일은 확인했지만 회차 번호는 앞뒤 회차로 미루어 넣은 값입니다. '
    +  '접수·응시 전에는 TOEIC 공식 사이트에서 반드시 다시 확인해 주세요.</p></div>';
  page(h);
  $$('[data-set]').forEach(function(b){ b.onclick=function(){
    toGoalSet(CURRENT.id, {examDate:b.dataset.set}); toast('목표 시험일을 '+b.dataset.set+'로 정했습니다'); tsDate();
  }; });
}
