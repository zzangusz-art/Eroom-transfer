/* ===================== 이룸토익 LMS · 관리자 · 강사 화면 ===================== */

function toMyStudents(){
  var list = acf(DB.students||[]).filter(function(s){ return !s.testOnly; });
  if(CURRENT && CURRENT.role==='instructor') list = list.filter(function(s){ return s.instructorId===CURRENT.id; });
  return list;
}

/* ---------------- 대시보드 ---------------- */
function taDash(){
  var st = toMyStudents(), stat = toBankStat();
  var scored = st.map(function(s){ return {s:s, sc:toBestScore(s.id)}; }).filter(function(x){ return x.sc!=null; });
  var avg = scored.length ? Math.round(scored.reduce(function(a,x){ return a+x.sc; },0)/scored.length) : null;
  var noMock = st.filter(function(s){ return !toMockSessions(s.id).length; });
  var next = toNextExam();

  var h = head('토익 관리자 대시보드', '이룸토익 학원의 오늘 현황입니다');
  h += (typeof quoteHtml==='function' ? quoteHtml() : '');
  h += '<div class="stats">'
    +  '<div class="stat-go" data-goto="a-students">'+card('전체 학생', st.length+'명', '이룸토익 소속')+'</div>'
    +  card('평균 예상 점수', avg!=null? avg+'점':'—', scored.length+'명 기록 기준', '#0891b2')
    +  '<div class="stat-go" data-goto="ta-bank">'+card('문제은행', stat.total+'문항', 'LC '+stat.lc+' · RC '+stat.rc, '#7c3aed')+'</div>'
    +  '<div class="stat-go" data-goto="ta-dates">'+card('다음 시험', next? toDdayText(next.date):'—', next? next.date:'일정 등록 필요', '#d97706')+'</div>'
    +  '</div>';

  /* 반 분포 */
  h += '<div class="grid2"><div class="panel"><h3>반 분포 (최고 예상 점수 기준)</h3>';
  TO_LEVELS.forEach(function(lv){
    var n = scored.filter(function(x){ return toLevelOf(x.sc)===lv.id; }).length;
    var r = st.length ? Math.round(n/st.length*100) : 0;
    h += '<div class="srow"><span>'+lv.name+' <span class="muted">'+esc(lv.sub)+'</span></span>'+toBar(r, lv.color)+'<b>'+n+'명</b></div>';
  });
  if(noMock.length) h += '<div class="srow"><span>미응시</span>'+toBar(Math.round(noMock.length/Math.max(1,st.length)*100), '#94a3b8')+'<b>'+noMock.length+'명</b></div>';
  h += '</div>';

  /* 파트별 학원 평균 */
  h += '<div class="panel"><h3>학원 평균 파트별 정답률</h3>';
  var agg = {};
  TO_PARTS.forEach(function(p){ agg[p.p]={right:0,total:0}; });
  st.forEach(function(s){
    var ps = toPartStats(s.id);
    TO_PARTS.forEach(function(p){ agg[p.p].right += ps[p.p].right; agg[p.p].total += ps[p.p].total; });
  });
  var anyp=false;
  TO_PARTS.forEach(function(p){
    var a=agg[p.p]; if(!a.total) return; anyp=true;
    var r=Math.round(a.right/a.total*100);
    h += '<div class="srow"><span>'+p.name+' '+p.title+'</span>'+toBar(r,toRateColor(r))+'<b>'+r+'%</b></div>';
  });
  if(!anyp) h += '<p class="muted">아직 응시 기록이 없습니다.</p>';
  h += '</div></div>';

  /* 관리가 필요한 학생 */
  h += '<div class="panel"><h3>먼저 챙겨야 할 학생</h3>';
  var care = st.map(function(s){
    var sum = toSummary(s.id), pred = toPredict(s.id);
    var reason = '';
    if(!sum.mocks) reason = '모의고사 미응시';
    else if(pred.reachable===false) reason = '점수 정체 — ' + (pred.slope!=null? '주당 '+pred.slope+'점':'추세 없음');
    else if(sum.last!=null && sum.goal.target-sum.last>150) reason = '목표까지 '+(sum.goal.target-sum.last)+'점 남음';
    return reason ? {s:s, sum:sum, reason:reason} : null;
  }).filter(Boolean).slice(0,12);
  if(!care.length) h += '<p class="muted">특별히 관리가 필요한 학생이 없습니다.</p>';
  else{
    h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>학생</th><th>목표</th><th>최근</th><th>사유</th><th></th></tr></thead><tbody>';
    care.forEach(function(c){
      h += '<tr><td><b>'+esc(c.s.name)+'</b></td><td>'+c.sum.goal.target+'점</td>'
        +  '<td>'+(c.sum.last!=null? c.sum.last+'점':'—')+'</td>'
        +  '<td>'+esc(c.reason)+'</td>'
        +  '<td><button class="lnk" data-stu="'+c.s.id+'">분석 보기</button></td></tr>';
    });
    h += '</tbody></table></div>';
  }
  h += '</div>';
  page(h);
  toBindGoto();
  $$('[data-stu]').forEach(function(b){ b.onclick=function(){ TA_STU=b.dataset.stu; go('ta-stuan'); }; });
}

/* ---------------- 문제 관리 ---------------- */
var TA_BANK_PART = 5;
function taBank(){
  var part = TA_BANK_PART;
  function draw(){
    var stat = toBankStat();
    var mine = (DB.toeicQ||[]).filter(function(q){ return q.part===part; });
    var seed = TO_Q_SEED.filter(function(q){ return q.part===part; });
    var sets = toSetsAll().filter(function(s){ return s.part===part; });
    var h = head('토익 문제 관리', '파트별 문항과 지문·음원을 등록합니다');

    h += '<div class="bar"><div class="filters" id="tbFilt">'
      +  TO_PARTS.map(function(p){ return '<button class="chip '+(p.p===part?'on':'')+'" data-p="'+p.p+'">'+p.name+' ('+(stat[p.p]||0)+')</button>'; }).join('')
      +  '</div><div class="inl">'
      +  '<button class="btn" id="tbAdd">문항 추가</button> '
      +  (toPart(part).set? '<button class="btn ghost" id="tbSetAdd">지문·담화 세트 추가</button> ':'')
      +  '<button class="btn ghost" id="tbImport">일괄 등록</button></div></div>';

    /* 세트 목록 */
    if(toPart(part).set){
      h += '<div class="panel"><h3>지문 · 담화 세트 ('+sets.length+')</h3>';
      if(!sets.length) h += '<p class="muted">등록된 세트가 없습니다.</p>';
      else{
        h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>제목</th><th>종류</th><th>음원</th><th>문항</th><th></th></tr></thead><tbody>';
        sets.forEach(function(s){
          var qn = toBank().filter(function(q){ return q.setId===s.id; }).length;
          var own = (DB.toeicSets||[]).some(function(x){ return x.id===s.id; });
          h += '<tr><td><b>'+esc(s.title||s.id)+'</b></td><td>'+esc(s.kind||'-')+'</td>'
            +  '<td>'+(s.audio? '<span class="pill" style="--c:#059669">등록됨</span>' : '<span class="muted">없음</span>')+'</td>'
            +  '<td>'+qn+'문항</td>'
            +  '<td>'+(own? '<button class="lnk" data-es="'+s.id+'">수정</button> <button class="lnk del" data-ds="'+s.id+'">삭제</button>'
                          : '<button class="lnk" data-cs="'+s.id+'">복사해 수정</button> <span class="muted">기본 제공</span>')+'</td></tr>';
        });
        h += '</tbody></table></div>';
      }
      h += '</div>';
    }

    /* 문항 목록 */
    h += '<div class="panel"><h3>'+toPart(part).name+' 문항 ('+(seed.length+mine.length)+')</h3>'
      +  '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>유형</th><th>난이도</th><th>문항</th><th>정답</th><th>세트</th><th></th></tr></thead><tbody>';
    seed.concat(mine).forEach(function(q){
      var own = mine.indexOf(q)>=0;
      h += '<tr><td>'+esc(q.type||'-')+'</td><td>'+(q.level||1)+'</td>'
        +  '<td class="tex-stemcell">'+esc(String(q.stem||'').slice(0,70))+'</td>'
        +  '<td>'+'ABCD'[q.answer]+'</td>'
        +  '<td>'+(q.setId? esc((toSetById(q.setId)||{}).title||q.setId) : '-')+'</td>'
        +  '<td>'+(own? '<button class="lnk" data-eq="'+q.id+'">수정</button> <button class="lnk del" data-dq="'+q.id+'">삭제</button>'
                      : '<button class="lnk" data-cq="'+q.id+'">복사해 수정</button> <span class="muted">기본 제공</span>')+'</td></tr>';
    });
    h += '</tbody></table></div>'
      +  '<p class="muted">「기본 제공」 문항은 이룸토익이 미리 넣어 둔 예시입니다. 지우지 않고 복사해 학원 문항으로 만들 수 있습니다.</p></div>';
    page(h);

    $$('#tbFilt .chip').forEach(function(b){ b.onclick=function(){ TA_BANK_PART = part = +b.dataset.p; draw(); }; });
    $('#tbAdd').onclick = function(){ taQForm(null, part, draw); };
    var sa=$('#tbSetAdd'); if(sa) sa.onclick = function(){ taSetForm(null, part, draw); };
    $('#tbImport').onclick = function(){ taImportForm(part, draw); };
    $$('[data-eq]').forEach(function(b){ b.onclick=function(){ taQForm(toQById(b.dataset.eq), part, draw); }; });
    $$('[data-cq]').forEach(function(b){ b.onclick=function(){
      var src=toQById(b.dataset.cq); if(!src) return;
      var copy=JSON.parse(JSON.stringify(src)); copy.id=null; taQForm(copy, part, draw); }; });
    $$('[data-dq]').forEach(function(b){ b.onclick=function(){
      if(!confirm('이 문항을 삭제하시겠습니까?')) return;
      DB.toeicQ = (DB.toeicQ||[]).filter(function(q){ return q.id!==b.dataset.dq; }); save(); draw(); }; });
    $$('[data-es]').forEach(function(b){ b.onclick=function(){ taSetForm(toSetById(b.dataset.es), part, draw); }; });
    $$('[data-cs]').forEach(function(b){ b.onclick=function(){
      var src=toSetById(b.dataset.cs); if(!src) return;
      var copy=JSON.parse(JSON.stringify(src)); copy.id=null; copy.title=(copy.title||'')+' (복사)'; taSetForm(copy, part, draw); }; });
    $$('[data-ds]').forEach(function(b){ b.onclick=function(){
      var used = toBank().filter(function(q){ return q.setId===b.dataset.ds; }).length;
      if(used){ alert('이 세트를 쓰는 문항이 '+used+'개 있습니다. 문항을 먼저 정리해 주세요.'); return; }
      if(!confirm('이 세트를 삭제하시겠습니까?')) return;
      DB.toeicSets = (DB.toeicSets||[]).filter(function(s){ return s.id!==b.dataset.ds; }); save(); draw(); }; });
  }
  draw();
}

/* 문항 등록 · 수정 */
function taQForm(q, part, onDone){
  var isNew = !q || !q.id;
  q = q || { part:part, type:toTypes(part)[0], level:1, options:[], answer:0 };
  var p = toPart(q.part || part);
  var optN = p.opt;
  var sets = toSetsAll().filter(function(s){ return s.part===p.p; });
  var node = el('<div class="form-card"></div>');
  var h = '<h3>'+(isNew?'문항 추가':'문항 수정')+' — '+p.name+' '+esc(p.title)+'</h3>';
  h += '<div class="grid2">'
    +  '<label>유형<select id="qType">'+toTypes(p.p).map(function(t){ return '<option '+(q.type===t?'selected':'')+'>'+esc(t)+'</option>'; }).join('')+'</select></label>'
    +  '<label>난이도<select id="qLevel">'+[1,2,3].map(function(v){ return '<option value="'+v+'" '+((q.level||1)===v?'selected':'')+'>'+v+' ('+(v===1?'기초':v===2?'중급':'고급')+')</option>'; }).join('')+'</select></label>'
    +  '</div>';
  if(p.set){
    h += '<label>지문 · 담화 세트<select id="qSet"><option value="">(단독 문항)</option>'
      +  sets.map(function(s){ return '<option value="'+s.id+'" '+(q.setId===s.id?'selected':'')+'>'+esc(s.title||s.id)+'</option>'; }).join('')
      +  '</select></label>';
  }
  if(p.img){
    h += '<label>사진 (Part 1)<input type="file" id="qImgF" accept="image/*"></label>'
      +  '<div class="muted" id="qImgS">'+(q.img? '등록됨' : '미등록')+'</div>'
      +  '<button class="btn ghost" id="qImgUp">사진 업로드</button>'
      +  '<label>사진 설명 (음원·사진이 없을 때 화면에 보여 줍니다)<input id="qPhoto" value="'+esc(q.photo||'')+'"></label>';
  }
  if(p.audio){
    h += '<label>문항 개별 음원 (세트 음원이 있으면 비워 두세요)<input type="file" id="qAudF" accept="audio/*"></label>'
      +  '<div class="muted" id="qAudS">'+(q.audio? '등록됨' : '미등록')+'</div>'
      +  '<button class="btn ghost" id="qAudUp">음원 업로드</button>'
      +  '<label>스크립트<textarea id="qScript">'+esc(q.script||'')+'</textarea></label>';
  }
  h += '<label>문항(질문)<textarea id="qStem">'+esc(q.stem||'')+'</textarea></label>';
  h += '<div class="tex-opts-form">';
  for(var i=0;i<optN;i++){
    h += '<label>보기 '+'ABCD'[i]+'<input id="qOpt'+i+'" value="'+esc((q.options||[])[i]||'')+'"></label>';
  }
  h += '</div>';
  h += '<label>정답<select id="qAns">'+Array.from({length:optN}).map(function(_,i){ return '<option value="'+i+'" '+(q.answer===i?'selected':'')+'>'+'ABCD'[i]+'</option>'; }).join('')+'</select></label>';
  h += '<label>해설<textarea id="qExp">'+esc(q.explanation||'')+'</textarea></label>';
  h += '<div class="form-b"><button class="btn" id="qSave">저장</button><button class="btn ghost" id="qCancel">취소</button></div>';
  node.innerHTML = h;
  openModal(node);

  var imgUrl = q.img||'', audUrl = q.audio||'';
  var iu = node.querySelector('#qImgUp');
  if(iu) iu.onclick = function(){ uploadPick('qImgF','qImgS', function(url){ imgUrl=url; }, {maxMB:10}); };
  var au = node.querySelector('#qAudUp');
  if(au) au.onclick = function(){ uploadPick('qAudF','qAudS', function(url){ audUrl=url; }, {maxMB:60}); };

  node.querySelector('#qCancel').onclick = closeModal;
  node.querySelector('#qSave').onclick = function(){
    var opts=[], empty=false;
    for(var i=0;i<optN;i++){ var v=(node.querySelector('#qOpt'+i).value||'').trim(); if(!v) empty=true; opts.push(v); }
    var stem=(node.querySelector('#qStem').value||'').trim();
    if(!stem) return alert('문항(질문)을 입력해 주세요.');
    if(empty) return alert('보기 '+optN+'개를 모두 입력해 주세요.');
    var rec = {
      id: q.id || uid('tq'), ac:'toeic', part:p.p,
      type: node.querySelector('#qType').value,
      level: +node.querySelector('#qLevel').value,
      setId: (node.querySelector('#qSet')||{}).value || null,
      img: imgUrl, audio: audUrl,
      photo: (node.querySelector('#qPhoto')||{}).value || '',
      script: (node.querySelector('#qScript')||{}).value || '',
      stem: stem, options: opts, answer: +node.querySelector('#qAns').value,
      explanation: (node.querySelector('#qExp').value||'').trim(),
      src: '이룸토익 · 학원 등록'
    };
    DB.toeicQ = DB.toeicQ || [];
    var ix = DB.toeicQ.findIndex(function(x){ return x.id===rec.id; });
    if(ix>=0) DB.toeicQ[ix]=rec; else DB.toeicQ.push(rec);
    save(); closeModal(); toast('저장했습니다'); onDone && onDone();
  };
}

/* 세트(지문·담화) 등록 · 수정 */
function taSetForm(s, part, onDone){
  var isNew = !s || !s.id;
  s = s || { part:part, title:'', kind:'', audio:'', script:'', passage:'' };
  var p = toPart(s.part || part);
  var node = el('<div class="form-card"></div>');
  var h = '<h3>'+(isNew?'세트 추가':'세트 수정')+' — '+p.name+'</h3>'
    +  '<label>제목<input id="sTitle" value="'+esc(s.title||'')+'"></label>'
    +  '<label>종류 (예: 2인 대화 · 안내 방송 · 이메일)<input id="sKind" value="'+esc(s.kind||'')+'"></label>';
  if(p.audio){
    h += '<label>음원 파일<input type="file" id="sAudF" accept="audio/*"></label>'
      +  '<div class="muted" id="sAudS">'+(s.audio?'등록됨':'미등록')+'</div>'
      +  '<button class="btn ghost" id="sAudUp">음원 업로드</button>'
      +  '<label>스크립트<textarea id="sScript" style="min-height:140px">'+esc(s.script||'')+'</textarea></label>';
  }else{
    h += '<label>지문<textarea id="sPassage" style="min-height:200px">'+esc(s.passage||'')+'</textarea></label>';
  }
  h += '<div class="form-b"><button class="btn" id="sSave">저장</button><button class="btn ghost" id="sCancel">취소</button></div>';
  node.innerHTML = h;
  openModal(node);
  var audUrl = s.audio||'';
  var au = node.querySelector('#sAudUp');
  if(au) au.onclick = function(){ uploadPick('sAudF','sAudS', function(url){ audUrl=url; }, {maxMB:60}); };
  node.querySelector('#sCancel').onclick = closeModal;
  node.querySelector('#sSave').onclick = function(){
    var title=(node.querySelector('#sTitle').value||'').trim();
    if(!title) return alert('제목을 입력해 주세요.');
    var rec = { id: s.id || uid('tset'), ac:'toeic', part:p.p, title:title,
                kind:(node.querySelector('#sKind').value||'').trim(),
                audio: audUrl,
                script: (node.querySelector('#sScript')||{}).value || '',
                passage: (node.querySelector('#sPassage')||{}).value || '' };
    DB.toeicSets = DB.toeicSets || [];
    var ix = DB.toeicSets.findIndex(function(x){ return x.id===rec.id; });
    if(ix>=0) DB.toeicSets[ix]=rec; else DB.toeicSets.push(rec);
    save(); closeModal(); toast('저장했습니다'); onDone && onDone();
  };
}

/* 일괄 등록 — 한 줄에 한 문항 */
function taImportForm(part, onDone){
  var p = toPart(part);
  var node = el('<div class="form-card"></div>');
  node.innerHTML = '<h3>'+p.name+' 문항 일괄 등록</h3>'
    + '<p class="muted">한 줄에 한 문항씩, 탭이나 <b>|</b> 로 칸을 나눠 붙여 넣습니다.<br>'
    + '순서 : 유형 | 난이도(1~3) | 문항 | 보기A | 보기B | 보기C'+(p.opt===4?' | 보기D':'')+' | 정답(A~'+'ABCD'[p.opt-1]+') | 해설</p>'
    + '<textarea id="imTxt" style="min-height:220px" placeholder="'+esc(toTypes(part)[0])+' | 1 | The report was ______ yesterday. | submit | submitted | submitting | to submit | B | 수동태이므로 submitted"></textarea>'
    + '<div class="form-b"><button class="btn" id="imGo">등록</button><button class="btn ghost" id="imCancel">취소</button></div>';
  openModal(node);
  node.querySelector('#imCancel').onclick = closeModal;
  node.querySelector('#imGo').onclick = function(){
    var txt = node.querySelector('#imTxt').value||'';
    var lines = txt.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
    var need = 5 + p.opt;   /* 유형·난이도·문항 + 보기 + 정답 + 해설(선택) */
    var ok=0, fail=[];
    DB.toeicQ = DB.toeicQ || [];
    lines.forEach(function(l, i){
      var c = l.split(/\t|\|/).map(function(x){ return x.trim(); });
      if(c.length < need-1){ fail.push((i+1)+'행: 칸 수 부족 ('+c.length+')'); return; }
      var type=c[0], lv=+c[1]||1, stem=c[2];
      var opts=c.slice(3, 3+p.opt);
      var ansCh=(c[3+p.opt]||'').toUpperCase();
      var ansIx='ABCD'.indexOf(ansCh);
      var exp=c[4+p.opt]||'';
      if(opts.some(function(o){ return !o; })){ fail.push((i+1)+'행: 보기 누락'); return; }
      if(ansIx<0 || ansIx>=p.opt){ fail.push((i+1)+'행: 정답 표기 오류 ('+ansCh+')'); return; }
      if(toTypes(part).indexOf(type)<0) type = toTypes(part)[0];
      DB.toeicQ.push({ id:uid('tq'), ac:'toeic', part:p.p, type:type, level:lv, setId:null,
                       img:'', audio:'', photo:'', script:'',
                       stem:stem, options:opts, answer:ansIx, explanation:exp, src:'이룸토익 · 일괄 등록' });
      ok++;
    });
    save(); closeModal();
    alert(ok+'문항을 등록했습니다.' + (fail.length? '\n\n등록하지 못한 줄:\n'+fail.slice(0,10).join('\n') + (fail.length>10?'\n… 외 '+(fail.length-10)+'건':'') : ''));
    onDone && onDone();
  };
}

/* ---------------- 모의고사 회차 관리 ---------------- */
function taExam(){
  function draw(){
    var list = acf(DB.toeicExams||[]);
    var h = head('모의고사 회차 관리', '문제은행에서 문항을 골라 정식 회차를 만듭니다');
    h += '<div class="bar"><span class="muted">등록된 회차 '+list.length+'개</span><button class="btn" id="teAdd">회차 추가</button></div>';
    h += '<div class="panel">';
    if(!list.length) h += '<p class="muted">등록된 회차가 없습니다. 학생은 그동안 자동 구성 모의고사를 이용합니다.</p>';
    else{
      h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>회차명</th><th>문항</th><th>LC/RC</th><th>제한</th><th>응시</th><th></th></tr></thead><tbody>';
      list.forEach(function(e){
        var qs = toExamQuestions(e);
        var lc = qs.filter(function(q){ return toArea(q.part)==='LC'; }).length;
        var n = (DB.toeicSessions||[]).filter(function(s){ return s.examId===e.id; }).length;
        h += '<tr><td><b>'+esc(e.name||'-')+'</b></td><td>'+qs.length+'</td>'
          +  '<td>'+lc+' / '+(qs.length-lc)+'</td><td>'+(e.limitMin?e.limitMin+'분':'자동')+'</td><td>'+n+'회</td>'
          +  '<td><button class="lnk" data-ee="'+e.id+'">수정</button> <button class="lnk del" data-de="'+e.id+'">삭제</button></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';
    page(h);
    $('#teAdd').onclick = function(){ taExamForm(null, draw); };
    $$('[data-ee]').forEach(function(b){ b.onclick=function(){ taExamForm(toExamById(b.dataset.ee), draw); }; });
    $$('[data-de]').forEach(function(b){ b.onclick=function(){
      if(!confirm('이 회차를 삭제하시겠습니까? 응시 기록은 남습니다.')) return;
      DB.toeicExams = (DB.toeicExams||[]).filter(function(e){ return e.id!==b.dataset.de; }); save(); draw(); }; });
  }
  draw();
}
function taExamForm(e, onDone){
  var isNew = !e;
  e = e || { name:'', limitMin:0, qids:[] };
  var picked = {}; (e.qids||[]).forEach(function(id){ picked[id]=1; });
  var node = el('<div class="form-card wide"></div>');
  function body(){
    var h = '<h3>'+(isNew?'회차 추가':'회차 수정')+'</h3>'
      + '<div class="grid2"><label>회차명<input id="eName" value="'+esc(e.name||'')+'"></label>'
      + '<label>제한시간(분) · 0이면 자동<input id="eLimit" type="number" value="'+(+e.limitMin||0)+'"></label></div>';
    h += '<div class="bar"><b>문항 선택</b><span class="muted" id="eCnt">'+Object.keys(picked).length+'문항 선택됨</span>'
      +  '<button class="btn ghost" id="eAuto">파트 비율대로 자동 채우기</button></div>';
    h += '<div class="tex-pick">';
    TO_PARTS.forEach(function(p){
      var qs = toQByPart(p.p);
      if(!qs.length) return;
      var sel = qs.filter(function(q){ return picked[q.id]; }).length;
      h += '<details><summary>'+p.name+' '+esc(p.title)+' <span class="muted">'+sel+' / '+qs.length+'</span></summary>';
      qs.forEach(function(q){
        h += '<label class="tex-pickrow"><input type="checkbox" data-q="'+q.id+'" '+(picked[q.id]?'checked':'')+'> '
          +  '<span class="muted">'+esc(q.type||'')+'</span> '+esc(String(q.stem||'').slice(0,70))+'</label>';
      });
      h += '</details>';
    });
    h += '</div><div class="form-b"><button class="btn" id="eSave">저장</button><button class="btn ghost" id="eCancel">취소</button></div>';
    node.innerHTML = h;
    node.querySelectorAll('[data-q]').forEach(function(c){
      c.onchange=function(){ if(c.checked) picked[c.dataset.q]=1; else delete picked[c.dataset.q];
        var el2=node.querySelector('#eCnt'); if(el2) el2.textContent=Object.keys(picked).length+'문항 선택됨'; };
    });
    node.querySelector('#eAuto').onclick = function(){
      picked = {};
      toBuildMock('full').questions.forEach(function(q){ picked[q.id]=1; });
      body();
    };
    node.querySelector('#eCancel').onclick = closeModal;
    node.querySelector('#eSave').onclick = function(){
      var name=(node.querySelector('#eName').value||'').trim();
      if(!name) return alert('회차명을 입력해 주세요.');
      var ids = toBank().filter(function(q){ return picked[q.id]; }).map(function(q){ return q.id; });  /* 파트 순서 유지 */
      if(!ids.length) return alert('문항을 한 개 이상 선택해 주세요.');
      var rec = { id: e.id||uid('tex'), ac:'toeic', name:name, limitMin:+node.querySelector('#eLimit').value||0, qids:ids };
      DB.toeicExams = DB.toeicExams || [];
      var ix = DB.toeicExams.findIndex(function(x){ return x.id===rec.id; });
      if(ix>=0) DB.toeicExams[ix]=rec; else DB.toeicExams.push(rec);
      save(); closeModal(); toast('저장했습니다'); onDone && onDone();
    };
  }
  body();
  openModal(node);
}

/* ---------------- 시험 일정 관리 ---------------- */
function taDates(){
  function draw(){
    var list = toDates();
    var h = head('토익 시험 일정 관리', '정기시험 회차와 접수·발표일을 등록합니다');
    h += '<div class="bar"><span class="muted">등록 '+list.length+'회</span>'
      +  '<div class="inl"><button class="btn" id="tdAdd">회차 추가</button> <button class="btn ghost" id="tdBulk">일괄 붙여넣기</button></div></div>';
    h += '<div class="panel"><div class="tbl-wrap"><table class="tbl">'
      +  '<thead><tr><th>회차</th><th>시험일</th><th>접수 시작</th><th>접수 마감</th><th>성적 발표</th><th>비고</th><th></th></tr></thead><tbody>';
    list.forEach(function(d){
      h += '<tr><td>제'+d.round+'회</td><td>'+esc(d.date)+'</td><td>'+esc(d.open||'-')+'</td>'
        +  '<td>'+esc(d.close||'-')+'</td><td>'+esc(d.result||'-')+'</td><td class="muted">'+esc(d.note||'')+'</td>'
        +  '<td><button class="lnk" data-ed="'+d.id+'">수정</button> <button class="lnk del" data-dd="'+d.id+'">삭제</button></td></tr>';
    });
    h += '</tbody></table></div>'
      +  '<p class="muted">2026년 정기시험은 제560회~제585회(26회)입니다. 성적 발표는 보통 시험일 9~10일 뒤 화요일입니다. '
      +  '공식 일정은 TOEIC 홈페이지에서 확인한 뒤 등록해 주세요.</p></div>';
    page(h);
    $('#tdAdd').onclick = function(){ taDateForm(null, draw); };
    $('#tdBulk').onclick = function(){ taDateBulk(draw); };
    $$('[data-ed]').forEach(function(b){ b.onclick=function(){
      taDateForm((DB.toeicDates||[]).find(function(x){ return x.id===b.dataset.ed; }), draw); }; });
    $$('[data-dd]').forEach(function(b){ b.onclick=function(){
      if(!confirm('삭제하시겠습니까?')) return;
      DB.toeicDates = (DB.toeicDates||[]).filter(function(x){ return x.id!==b.dataset.dd; }); save(); draw(); }; });
  }
  draw();
}
function taDateForm(d, onDone){
  var isNew = !d;
  d = d || { round:'', date:'', open:'', close:'', result:'', note:'' };
  var node = el('<div class="form-card"></div>');
  node.innerHTML = '<h3>'+(isNew?'회차 추가':'회차 수정')+'</h3>'
    + '<div class="grid2"><label>회차 번호<input id="dRound" type="number" value="'+esc(d.round||'')+'"></label>'
    + '<label>시험일<input id="dDate" type="date" value="'+esc(d.date||'')+'"></label></div>'
    + '<div class="grid2"><label>접수 시작<input id="dOpen" type="date" value="'+esc(d.open||'')+'"></label>'
    + '<label>접수 마감<input id="dClose" type="date" value="'+esc(d.close||'')+'"></label></div>'
    + '<div class="grid2"><label>성적 발표<input id="dResult" type="date" value="'+esc(d.result||'')+'"></label>'
    + '<label>비고<input id="dNote" value="'+esc(d.note||'')+'"></label></div>'
    + '<div class="form-b"><button class="btn" id="dSave">저장</button><button class="btn ghost" id="dCancel">취소</button></div>';
  openModal(node);
  node.querySelector('#dCancel').onclick = closeModal;
  node.querySelector('#dSave').onclick = function(){
    var date=node.querySelector('#dDate').value;
    if(!date) return alert('시험일을 입력해 주세요.');
    var rec = { id:d.id||uid('td'), ac:'toeic', round:+node.querySelector('#dRound').value||0, date:date,
                open:node.querySelector('#dOpen').value, close:node.querySelector('#dClose').value,
                result:node.querySelector('#dResult').value, note:node.querySelector('#dNote').value };
    DB.toeicDates = DB.toeicDates || [];
    var ix = DB.toeicDates.findIndex(function(x){ return x.id===rec.id; });
    if(ix>=0) DB.toeicDates[ix]=rec; else DB.toeicDates.push(rec);
    save(); closeModal(); toast('저장했습니다'); onDone && onDone();
  };
}
function taDateBulk(onDone){
  var node = el('<div class="form-card"></div>');
  node.innerHTML = '<h3>시험 일정 일괄 등록</h3>'
    + '<p class="muted">한 줄에 한 회차씩, 탭이나 <b>|</b> 로 나눠 붙여 넣습니다.<br>'
    + '순서 : 회차 | 시험일 | 접수시작 | 접수마감 | 성적발표<br>날짜는 2026-01-11 형식으로 씁니다. 뒤쪽 칸은 비워도 됩니다.</p>'
    + '<textarea id="bTxt" style="min-height:200px" placeholder="560 | 2026-01-11 | 2025-11-24 | 2025-12-19 | 2026-01-20"></textarea>'
    + '<div class="form-b"><button class="btn" id="bGo">등록</button><button class="btn ghost" id="bCancel">취소</button></div>';
  openModal(node);
  node.querySelector('#bCancel').onclick = closeModal;
  node.querySelector('#bGo').onclick = function(){
    var lines = (node.querySelector('#bTxt').value||'').split('\n').map(function(l){return l.trim();}).filter(Boolean);
    var ok=0, fail=[];
    DB.toeicDates = DB.toeicDates || [];
    lines.forEach(function(l,i){
      var c = l.split(/\t|\|/).map(function(x){ return x.trim(); });
      var round=+c[0]||0, date=c[1]||'';
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){ fail.push((i+1)+'행: 시험일 형식 오류'); return; }
      var ex = DB.toeicDates.find(function(x){ return x.date===date; });
      var rec = { id: ex? ex.id : uid('td'), ac:'toeic', round:round, date:date,
                  open:c[2]||'', close:c[3]||'', result:c[4]||'', note:'' };
      if(ex) Object.assign(ex, rec); else DB.toeicDates.push(rec);
      ok++;
    });
    save(); closeModal();
    alert(ok+'개 회차를 등록했습니다.'+(fail.length? '\n\n실패:\n'+fail.join('\n'):''));
    onDone && onDone();
  };
}

/* ---------------- 목표 기준(커트라인) 관리 ---------------- */
function taCuts(){
  function draw(){
    var list = toCuts();
    var h = head('목표 기준 관리', '학생 화면 「지원 가능 기준」에 표시되는 참고 점수입니다');
    h += '<div class="bar"><span class="muted">'+list.length+'개</span><button class="btn" id="tcAdd">기준 추가</button></div>';
    h += '<div class="panel"><div class="tbl-wrap"><table class="tbl">'
      +  '<thead><tr><th>기준명</th><th>분류</th><th>요구 점수</th><th>비고</th><th></th></tr></thead><tbody>';
    list.forEach(function(c){
      h += '<tr><td><b>'+esc(c.name)+'</b></td><td>'+esc(c.cat||'')+'</td><td>'+c.score+'점</td>'
        +  '<td class="muted">'+esc(c.note||'')+'</td>'
        +  '<td><button class="lnk" data-ec="'+c.id+'">수정</button> <button class="lnk del" data-dc="'+c.id+'">삭제</button></td></tr>';
    });
    h += '</tbody></table></div>'
      +  '<p class="muted">기업·기관이 요구 점수를 공식적으로 밝히지 않는 경우가 많습니다. 학원이 확인한 값으로 관리해 주세요.</p></div>';
    page(h);
    $('#tcAdd').onclick = function(){ taCutForm(null, draw); };
    $$('[data-ec]').forEach(function(b){ b.onclick=function(){
      taCutForm((DB.toeicCuts||[]).find(function(x){ return x.id===b.dataset.ec; }), draw); }; });
    $$('[data-dc]').forEach(function(b){ b.onclick=function(){
      if(!confirm('삭제하시겠습니까?')) return;
      DB.toeicCuts = (DB.toeicCuts||[]).filter(function(x){ return x.id!==b.dataset.dc; }); save(); draw(); }; });
  }
  draw();
}
function taCutForm(c, onDone){
  var isNew=!c;
  c = c || { name:'', cat:'취업', score:700, note:'' };
  var cats = ['취업','공기업','졸업','진학','승진','기타'];
  var node = el('<div class="form-card"></div>');
  node.innerHTML = '<h3>'+(isNew?'기준 추가':'기준 수정')+'</h3>'
    + '<label>기준명<input id="cName" value="'+esc(c.name||'')+'"></label>'
    + '<div class="grid2"><label>분류<select id="cCat">'+cats.map(function(v){ return '<option '+(c.cat===v?'selected':'')+'>'+v+'</option>'; }).join('')+'</select></label>'
    + '<label>요구 점수<input id="cScore" type="number" value="'+(+c.score||700)+'"></label></div>'
    + '<label>비고<input id="cNote" value="'+esc(c.note||'')+'"></label>'
    + '<div class="form-b"><button class="btn" id="cSave">저장</button><button class="btn ghost" id="cCancel">취소</button></div>';
  openModal(node);
  node.querySelector('#cCancel').onclick = closeModal;
  node.querySelector('#cSave').onclick = function(){
    var name=(node.querySelector('#cName').value||'').trim();
    if(!name) return alert('기준명을 입력해 주세요.');
    var rec = { id:c.id||uid('tc'), ac:'toeic', name:name, cat:node.querySelector('#cCat').value,
                score:+node.querySelector('#cScore').value||0, note:node.querySelector('#cNote').value };
    DB.toeicCuts = DB.toeicCuts || [];
    var ix = DB.toeicCuts.findIndex(function(x){ return x.id===rec.id; });
    if(ix>=0) DB.toeicCuts[ix]=rec; else DB.toeicCuts.push(rec);
    save(); closeModal(); toast('저장했습니다'); onDone && onDone();
  };
}

/* ---------------- 전체 분석 ---------------- */
function taAnalytics(){
  var st = toMyStudents();
  var rows = st.map(function(s){
    var sum = toSummary(s.id), pred = toPredict(s.id);
    return { s:s, sum:sum, pred:pred };
  });
  var scored = rows.filter(function(r){ return r.sum.last!=null; });
  var h = head('토익 전체 분석', '학원 전체의 점수 분포와 파트별 강약을 봅니다');

  h += '<div class="stats">'
    +  card('학생', st.length+'명', '이룸토익 소속')
    +  card('평균 예상 점수', scored.length? Math.round(scored.reduce(function(a,r){return a+r.sum.last;},0)/scored.length)+'점':'—', scored.length+'명 기준', '#0891b2')
    +  card('목표 달성', scored.filter(function(r){ return r.sum.last>=r.sum.goal.target; }).length+'명', '목표 점수 이상', '#059669')
    +  card('정체 학생', rows.filter(function(r){ return r.pred.reachable===false; }).length+'명', '최근 점수가 오르지 않음', '#ef4444')
    +  '</div>';

  /* 점수 분포 */
  h += '<div class="grid2"><div class="panel"><h3>점수 분포</h3>';
  var bands = [[900,990],[800,899],[700,799],[600,699],[500,599],[0,499]];
  bands.forEach(function(b){
    var n = scored.filter(function(r){ return r.sum.last>=b[0] && r.sum.last<=b[1]; }).length;
    var r = scored.length? Math.round(n/scored.length*100):0;
    h += '<div class="srow"><span>'+b[0]+' ~ '+b[1]+'</span>'+toBar(r,'#0891b2')+'<b>'+n+'명</b></div>';
  });
  if(!scored.length) h += '<p class="muted">모의고사 응시 기록이 없습니다.</p>';
  h += '</div>';

  /* 파트별 학원 평균 */
  h += '<div class="panel"><h3>파트별 학원 평균</h3>';
  var agg={}; TO_PARTS.forEach(function(p){ agg[p.p]={right:0,total:0}; });
  st.forEach(function(s){ var ps=toPartStats(s.id); TO_PARTS.forEach(function(p){ agg[p.p].right+=ps[p.p].right; agg[p.p].total+=ps[p.p].total; }); });
  var anyp=false;
  TO_PARTS.forEach(function(p){ var a=agg[p.p]; if(!a.total) return; anyp=true;
    var r=Math.round(a.right/a.total*100);
    h += '<div class="srow"><span>'+p.name+' '+p.title+'</span>'+toBar(r,toRateColor(r))+'<b>'+r+'% ('+a.total+'문항)</b></div>'; });
  if(!anyp) h += '<p class="muted">응시 기록이 없습니다.</p>';
  h += '</div></div>';

  /* 학생 목록 */
  h += '<div class="panel"><h3>학생별 현황</h3><div class="tbl-wrap"><table class="tbl">'
    +  '<thead><tr><th>학생</th><th>반</th><th>목표</th><th>최근</th><th>최고</th><th>주당 상승</th><th>모의고사</th><th>약한 파트</th><th></th></tr></thead><tbody>';
  rows.sort(function(a,b){ return (b.sum.last||0)-(a.sum.last||0); }).forEach(function(r){
    h += '<tr><td><b>'+esc(r.s.name)+'</b></td>'
      +  '<td>'+(r.sum.level? '<span class="pill" style="--c:'+toLevelColor(r.sum.level)+'">'+toLevelName(r.sum.level)+'</span>':'<span class="muted">미배정</span>')+'</td>'
      +  '<td>'+r.sum.goal.target+'</td>'
      +  '<td><b>'+(r.sum.last!=null?r.sum.last:'—')+'</b></td>'
      +  '<td>'+(r.sum.best!=null?r.sum.best:'—')+'</td>'
      +  '<td>'+(r.pred.slope!=null? (r.pred.slope>0?'+':'')+r.pred.slope : '—')+'</td>'
      +  '<td>'+r.sum.mocks+'회</td>'
      +  '<td>'+(r.sum.weakest? r.sum.weakest.name+' '+r.sum.weakest.rate+'%' : '—')+'</td>'
      +  '<td><button class="lnk" data-stu="'+r.s.id+'">분석</button></td></tr>';
  });
  h += '</tbody></table></div></div>';
  page(h);
  $$('[data-stu]').forEach(function(b){ b.onclick=function(){ TA_STU=b.dataset.stu; go('ta-stuan'); }; });
}

/* ---------------- 학생별 분석 ---------------- */
var TA_STU = null;
function taStuan(){
  var st = toMyStudents();
  if(!st.length){ page(head('학생별 분석')+'<div class="panel"><p class="muted">등록된 토익 학생이 없습니다.</p></div>'); return; }
  if(!TA_STU || !st.some(function(s){ return s.id===TA_STU; })) TA_STU = st[0].id;

  function draw(){
    var s = st.find(function(x){ return x.id===TA_STU; });
    var sum = toSummary(s.id), pred = toPredict(s.id), wp = toWeakPlan(s.id, 4);
    var h = head('학생별 토익 분석', '한 학생의 점수 · 파트 · 유형을 한 화면에서 봅니다');
    h += '<div class="bar"><label class="inl">학생 <select id="taStuSel">'
      +  st.map(function(x){ return '<option value="'+x.id+'" '+(x.id===TA_STU?'selected':'')+'>'+esc(x.name)+'</option>'; }).join('')
      +  '</select></label><button class="btn ghost" id="taGoal">목표 설정</button></div>';

    h += '<div class="stats">'
      +  card('목표', sum.goal.target+'점', esc(sum.goal.purpose||''), '#0d9488')
      +  card('최근 예상', sum.last!=null? sum.last+'점':'—', sum.mocks+'회 응시', '#0891b2')
      +  card('최고', sum.best!=null? sum.best+'점':'—', sum.level? toLevelName(sum.level):'', '#7c3aed')
      +  card('주당 상승', pred.slope!=null? (pred.slope>0?'+':'')+pred.slope+'점':'—', pred.weeksToGoal!=null? '도달까지 '+pred.weeksToGoal+'주':'', '#d97706')
      +  '</div>';

    h += '<div class="panel"><h3>진단</h3><p class="tex-diag">'+esc(toStuDiag(s, sum, pred))+'</p></div>';

    h += '<div class="grid2"><div class="panel"><h3>파트별</h3>';
    var any=false;
    TO_PARTS.forEach(function(p){ var a=sum.parts[p.p]; if(!a.total) return; any=true;
      h += '<div class="srow"><span>'+p.name+' '+p.title+'</span>'+toBar(a.rate,toRateColor(a.rate))+'<b>'+a.right+'/'+a.total+' ('+a.rate+'%)</b></div>'; });
    if(!any) h += '<p class="muted">기록이 없습니다.</p>';
    h += '</div><div class="panel"><h3>약한 유형</h3>';
    var ts = toTypeStats(s.id).filter(function(t){ return t.total>=2; }).slice(0,10);
    if(!ts.length) h += '<p class="muted">기록이 부족합니다.</p>';
    else ts.forEach(function(t){ h += '<div class="srow"><span>'+toPart(t.part).name+' · '+esc(t.type)+'</span>'+toBar(t.rate,toRateColor(t.rate))+'<b>'+t.rate+'% ('+t.total+')</b></div>'; });
    h += '</div></div>';

    h += '<div class="panel"><h3>추천 학습 순서</h3><ol class="tex-todo2">';
    wp.plan.slice(0,3).forEach(function(w){ h += '<li><b>'+w.week+'주차</b> — '+w.main.name+' 집중'+(w.focus.length? ' ('+esc(w.focus.join(' · '))+')':'')+'</li>'; });
    h += '</ol></div>';

    h += '<div class="panel"><h3>응시 기록</h3>';
    var sess = toSessions(s.id);
    if(!sess.length) h += '<p class="muted">응시 기록이 없습니다.</p>';
    else{
      h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>날짜</th><th>종류</th><th>문항</th><th>정답률</th><th>예상 점수</th><th></th></tr></thead><tbody>';
      sess.slice(0,30).forEach(function(x){
        h += '<tr><td>'+esc(x.date)+'</td><td>'+(TO_MODE_NAME[x.mode]||x.mode)+(x.part?' · '+toPart(x.part).name:'')+'</td>'
          +  '<td>'+x.right+'/'+x.total+'</td><td>'+x.rate+'%</td><td>'+(x.score? x.score.total+'점':'—')+'</td>'
          +  '<td><button class="lnk" data-rv="'+x.id+'">답안 보기</button></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';
    page(h);
    $('#taStuSel').onchange = function(){ TA_STU = $('#taStuSel').value; draw(); };
    $('#taGoal').onclick = function(){ taGoalForm(TA_STU, draw); };
    $$('[data-rv]').forEach(function(b){ b.onclick=function(){ toSessionReview(b.dataset.rv, false); }; });
  }
  draw();
}
function toStuDiag(s, sum, pred){
  var t = [];
  if(!sum.mocks) t.push(s.name+' 학생은 아직 모의고사를 보지 않았습니다. 현재 위치를 알아야 계획을 세울 수 있으니 하프 모의고사부터 권해 주세요.');
  else{
    t.push('최근 예상 점수는 '+sum.last+'점, 최고 '+sum.best+'점입니다(모의고사 '+sum.mocks+'회).');
    var gap = sum.goal.target - sum.last;
    if(gap<=0) t.push('목표 '+sum.goal.target+'점을 이미 넘었습니다. 유지 학습으로 전환하세요.');
    else t.push('목표 '+sum.goal.target+'점까지 '+gap+'점 남았습니다.');
    if(pred.slope!=null){
      if(pred.slope<=0.5) t.push('최근 추세가 주당 '+pred.slope+'점으로 사실상 멈춰 있습니다. 학습 방법을 바꿀 시점입니다.');
      else t.push('주당 '+pred.slope+'점씩 오르고 있어 지금 속도라면 약 '+pred.weeksToGoal+'주 뒤 도달합니다.');
    }
  }
  if(sum.weakest && sum.strongest && sum.weakest.p!==sum.strongest.p){
    t.push(sum.strongest.name+'('+sum.strongest.rate+'%)은 잘하지만 '+sum.weakest.name+'('+sum.weakest.rate+'%)이 발목을 잡고 있습니다.');
  }
  var w = toWrongList(s.id).length;
  if(w>=10) t.push('아직 고치지 못한 오답이 '+w+'개입니다. 새 문제보다 오답 복습이 먼저입니다.');
  return t.join(' ');
}
function taGoalForm(sid, onDone){
  var g = toGoal(sid);
  var node = el('<div class="form-card"></div>');
  node.innerHTML = '<h3>목표 설정</h3>'
    + '<label>목표 점수<select id="gTarget">'+TO_GOAL_PRESETS.map(function(v){ return '<option value="'+v+'" '+(g.target===v?'selected':'')+'>'+v+'점</option>'; }).join('')+'</select></label>'
    + '<label>목표 시험일<input type="date" id="gDate" value="'+esc(g.examDate||'')+'"></label>'
    + '<label>목적<select id="gPurpose">'+TO_PURPOSES.map(function(v){ return '<option '+(g.purpose===v?'selected':'')+'>'+v+'</option>'; }).join('')+'</select></label>'
    + '<div class="form-b"><button class="btn" id="gSave">저장</button><button class="btn ghost" id="gCancel">취소</button></div>';
  openModal(node);
  node.querySelector('#gCancel').onclick = closeModal;
  node.querySelector('#gSave').onclick = function(){
    toGoalSet(sid, { target:+node.querySelector('#gTarget').value,
                     examDate:node.querySelector('#gDate').value||'',
                     purpose:node.querySelector('#gPurpose').value });
    closeModal(); toast('저장했습니다'); onDone && onDone();
  };
}

/* ---------------- 환산표 편집 ----------------
   ETS 는 공식 환산표를 공개하지 않습니다. 학원이 쓰는 기준표로 바꿔 두면
   학생 화면의 「예상 점수」가 모두 그 표를 따릅니다. */
var TA_SCALE_AREA = 'LC';
var TA_SCALE_BUF = null;     /* 편집 중인 101칸 (저장 전) */

function taScaleBuf(){
  if(!TA_SCALE_BUF || TA_SCALE_BUF.length!==101) TA_SCALE_BUF = toScaleTable(TA_SCALE_AREA).slice();
  return TA_SCALE_BUF;
}
function taScale(){
  function load(area){ TA_SCALE_AREA = area; TA_SCALE_BUF = toScaleTable(area).slice(); draw(); }
  function draw(){
    var area = TA_SCALE_AREA, buf = taScaleBuf();
    var errs = toScaleCheck(buf);
    var saved = toScaleTable(area);
    var dirty = buf.some(function(v,i){ return v!==saved[i]; });
    var conf = toConf();

    var h = head('환산 점수표 관리', '맞은 개수를 점수로 바꾸는 표입니다. 학생 화면의 예상 점수가 이 표를 따릅니다');

    h += '<div class="stats">'
      +  card('듣기(LC) 표', toScaleIsCustom('LC') ? '학원 표' : '기본 표', toScaleIsCustom('LC')?'직접 등록한 표를 씁니다':'이룸 기본 보간표', toScaleIsCustom('LC')?'#0d9488':'#94a3b8')
      +  card('독해(RC) 표', toScaleIsCustom('RC') ? '학원 표' : '기본 표', toScaleIsCustom('RC')?'직접 등록한 표를 씁니다':'이룸 기본 보간표', toScaleIsCustom('RC')?'#0d9488':'#94a3b8')
      +  card('만점 확인', toScale(100,100,'LC') + ' + ' + toScale(100,100,'RC'), '= ' + (toScale(100,100,'LC')+toScale(100,100,'RC')) + '점 (990이어야 정상)',
              (toScale(100,100,'LC')+toScale(100,100,'RC'))===990 ? '#059669' : '#ef4444')
      +  card('마지막 수정', conf.scaleUpdated || '없음', '표를 바꾼 날', '#7c3aed')
      +  '</div>';

    h += '<div class="bar"><div class="filters" id="tscArea">'
      +  '<button class="chip ' + (area==='LC'?'on':'') + '" data-a="LC">듣기 (LC)</button>'
      +  '<button class="chip ' + (area==='RC'?'on':'') + '" data-a="RC">독해 (RC)</button>'
      +  '</div><div class="inl">'
      +  '<button class="btn ghost" id="tscFix">자동 보정</button>'
      +  '<button class="btn ghost del" id="tscReset">기본 표로 되돌리기</button>'
      +  '<button class="btn" id="tscSave" ' + (dirty && !errs.length ? '' : 'disabled') + '>'
      +  (dirty ? '저장' : '변경 없음') + '</button></div></div>';

    /* 프리셋 */
    h += '<div class="panel"><h3>표 불러오기</h3><div class="tsc-preset">';
    TO_SCALE_PRESETS.forEach(function(p){
      h += '<button class="tsc-pbtn" data-p="' + p.k + '"><b>' + esc(p.name) + '</b><span>' + esc(p.desc) + '</span></button>';
    });
    h += '</div><p class="muted">불러오면 아래 표에 채워집니다. <b>저장</b>을 눌러야 실제로 반영됩니다.</p></div>';

    /* 입력 도구 */
    h += '<div class="grid2"><div class="panel"><h3>기준점으로 만들기</h3>'
      +  '<p class="muted">아는 지점만 «개수=점수» 로 적으면 사이를 직선으로 채웁니다. 쉼표나 줄바꿈으로 나눠 주세요.</p>'
      +  '<textarea id="tscAnchor" style="min-height:90px" placeholder="27=60, 33=110, 56=275, 75=390, 89=470, 93=495"></textarea>'
      +  '<button class="btn ghost full" id="tscInterp">기준점으로 표 만들기</button></div>';
    h += '<div class="panel"><h3>표 붙여넣기</h3>'
      +  '<p class="muted">0개부터 100개까지 <b>101개</b> 숫자를 순서대로 붙여 넣습니다 (쉼표·공백·줄바꿈 모두 가능).</p>'
      +  '<textarea id="tscPaste" style="min-height:90px" placeholder="5, 5, 10, 10, ... , 495"></textarea>'
      +  '<button class="btn ghost full" id="tscApply">붙여넣은 값으로 채우기</button></div></div>';

    /* 검증 */
    if(errs.length){
      h += '<div class="note-b bad"><div class="nb-t"><b>표에 이런 문제가 있습니다 (' + errs.length + '건 표시)</b>'
        +  errs.map(function(e){ return esc(e); }).join('<br>')
        +  '</div><button class="btn" id="tscFix2">자동 보정하기</button></div>';
    }else{
      h += '<div class="note-b ok"><div class="nb-t"><b>표 상태 정상</b>'
        +  '101칸 · 5~495 범위 · 5점 단위 · 뒤로 갈수록 점수가 낮아지지 않음을 모두 만족합니다.</div></div>';
    }

    /* 표 */
    h += '<div class="panel"><h3>' + (area==='LC'?'듣기(LC)':'독해(RC)') + ' 표 — 맞은 개수별 점수</h3>'
      +  '<div class="tsc-grid">';
    for(var row=0; row<=10; row++){
      h += '<div class="tsc-row"><div class="tsc-rl">' + (row*10) + '~' + Math.min(100,row*10+9) + '개</div>';
      for(var c=0;c<10;c++){
        var n = row*10 + c;
        if(n>100) break;
        var prev = n>0 ? buf[n-1] : null;
        var badCell = (buf[n]%5!==0) || buf[n]<5 || buf[n]>495 || (prev!=null && buf[n]<prev);
        h += '<label class="tsc-cell ' + (badCell?'bad':'') + '"><span>' + n + '</span>'
          +  '<input type="number" step="5" min="5" max="495" data-n="' + n + '" value="' + buf[n] + '"></label>';
      }
      h += '</div>';
    }
    h += '</div></div>';

    /* 미리보기 */
    h += '<div class="grid2"><div class="panel"><h3>이 표로 계산한 예상 점수</h3>'
      +  '<canvas id="tscChart" height="200"></canvas>'
      +  '<p class="muted">가로축은 맞은 개수, 세로축은 환산 점수입니다. 파란 선이 지금 편집 중인 표입니다.</p></div>';
    h += '<div class="panel"><h3>대표 지점</h3><div class="tbl-wrap"><table class="tbl">'
      +  '<thead><tr><th>맞은 개수</th><th>저장된 표</th><th>편집 중인 표</th><th>차이</th></tr></thead><tbody>';
    [40,50,60,70,75,80,85,90,95,100].forEach(function(n){
      var d = buf[n]-saved[n];
      h += '<tr><td>' + n + '개</td><td>' + saved[n] + '</td><td><b>' + buf[n] + '</b></td>'
        +  '<td>' + (d===0?'<span class="muted">-</span>':(d>0?'<span style="color:#059669">+'+d+'</span>':'<span style="color:#ef4444">'+d+'</span>')) + '</td></tr>';
    });
    h += '</tbody></table></div>'
      +  '<p class="muted">목표 점수 계산, 모의고사 예상 점수, 학생 리포트가 모두 이 표를 씁니다.</p></div></div>';

    h += '<div class="note-b"><div class="nb-t"><b>왜 표를 바꿔야 할 수도 있나</b>'
      +  'ETS 는 회차별 환산표를 공개하지 않습니다. 기본으로 넣어 둔 표는 공개 자료를 바탕으로 한 «추정»이라 '
      +  '실제 성적과 5~20점 차이가 날 수 있습니다. 학원이 기출 성적과 대조해 만든 표가 있다면 여기에 넣어 두세요. '
      +  '학생 화면에는 언제나 «예상 점수»라고 표시됩니다.</div></div>';

    page(h);

    $$('#tscArea .chip').forEach(function(b){ b.onclick=function(){ load(b.dataset.a); }; });
    $$('.tsc-pbtn').forEach(function(b){ b.onclick=function(){
      TA_SCALE_BUF = toScalePresetTable(b.dataset.p, TA_SCALE_AREA);
      toast(toScalePreset(b.dataset.p).name + ' 을(를) 불러왔습니다. 저장을 눌러 반영하세요'); draw(); }; });
    $$('.tsc-cell input').forEach(function(inp){
      inp.onchange = function(){
        var n = +inp.dataset.n, v = parseInt(inp.value,10);
        TA_SCALE_BUF[n] = isNaN(v) ? 0 : v;
        draw();
      };
    });
    function doFix(){ TA_SCALE_BUF = toScaleFix(taScaleBuf()); toast('5점 단위·범위·순서를 맞춰 보정했습니다'); draw(); }
    $('#tscFix').onclick = doFix;
    var f2 = $('#tscFix2'); if(f2) f2.onclick = doFix;
    $('#tscInterp').onclick = function(){
      var txt = $('#tscAnchor').value || '';
      var pairs = txt.split(/[,\n;]+/).map(function(x){ return x.trim(); }).filter(Boolean)
        .map(function(x){ var m = x.split(/[=:\s]+/); return [parseInt(m[0],10), parseInt(m[1],10)]; })
        .filter(function(p){ return !isNaN(p[0]) && !isNaN(p[1]); });
      if(pairs.length < 2) return alert('기준점을 두 개 이상 «개수=점수» 형태로 적어 주세요.\n예: 27=60, 56=275, 89=470');
      var made = toScaleInterpolate(pairs);
      if(!made) return alert('기준점을 읽지 못했습니다.');
      TA_SCALE_BUF = made;
      toast(pairs.length + '개 기준점으로 표를 만들었습니다. 저장을 눌러 반영하세요'); draw();
    };
    $('#tscApply').onclick = function(){
      var nums = ($('#tscPaste').value || '').split(/[^0-9]+/).filter(Boolean).map(Number);
      if(nums.length !== 101) return alert('숫자가 101개여야 합니다. 지금은 ' + nums.length + '개입니다.');
      TA_SCALE_BUF = nums;
      toast('붙여넣은 값으로 채웠습니다. 문제가 있으면 자동 보정을 눌러 주세요'); draw();
    };
    $('#tscSave').onclick = function(){
      var errs2 = toScaleCheck(taScaleBuf());
      if(errs2.length) return alert('표에 문제가 있어 저장할 수 없습니다. 자동 보정을 먼저 눌러 주세요.');
      toScaleSave(TA_SCALE_AREA, taScaleBuf().slice());
      toast((TA_SCALE_AREA==='LC'?'듣기':'독해') + ' 환산표를 저장했습니다'); draw();
    };
    $('#tscReset').onclick = function(){
      if(!confirm((TA_SCALE_AREA==='LC'?'듣기':'독해') + ' 환산표를 이룸 기본 표로 되돌릴까요?')) return;
      toScaleReset(TA_SCALE_AREA);
      TA_SCALE_BUF = toScaleTable(TA_SCALE_AREA).slice();
      toast('기본 표로 되돌렸습니다'); draw();
    };
    setTimeout(function(){ taScaleChart('tscChart', saved, taScaleBuf()); }, 0);
  }
  draw();
}
function taScaleChart(id, saved, buf){
  var cv = document.getElementById(id); if(!cv || !cv.getContext) return;
  var w = cv.width = cv.clientWidth || 600, hgt = cv.height;
  var ctx = cv.getContext('2d');
  ctx.clearRect(0,0,w,hgt);
  var pad = 34, x0 = pad+8, x1 = w-10, y0 = hgt-22, y1 = 12;
  function X(n){ return x0 + (x1-x0)*n/100; }
  function Y(v){ return y0 - (y0-y1)*v/495; }
  ctx.strokeStyle = '#e2e8f0'; ctx.fillStyle = '#94a3b8'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
  [100,200,300,400,495].forEach(function(v){
    ctx.beginPath(); ctx.moveTo(x0-5, Y(v)); ctx.lineTo(x1, Y(v)); ctx.stroke();
    ctx.fillText(String(v), x0-8, Y(v)+3);
  });
  ctx.textAlign = 'center';
  [0,25,50,75,100].forEach(function(n){ ctx.fillText(n+'개', X(n), y0+14); });
  function line(arr, color, dash){
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2;
    if(dash) ctx.setLineDash([4,4]);
    ctx.beginPath();
    for(var n=0;n<=100;n++){ if(n===0) ctx.moveTo(X(n), Y(arr[n])); else ctx.lineTo(X(n), Y(arr[n])); }
    ctx.stroke(); ctx.restore();
  }
  line(saved, '#cbd5e1', true);
  line(buf, '#0891b2', false);
  ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'left'; ctx.font = '11px sans-serif';
  ctx.fillText('점선 = 저장된 표', x0+4, y1+10);
  ctx.fillStyle = '#0891b2';
  ctx.fillText('실선 = 편집 중', x0+100, y1+10);
}
