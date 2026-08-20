/* ===================== 이룸토익 LMS · 시험 엔진 =====================
   파트별 연습 · 유형 연습 · 오답 다시풀기 · 실전 모의고사
   LC 는 세트(또는 문항)마다 음원을 재생합니다. 실전 모드에서는 1회만 들을 수 있습니다.
   ==================================================================== */

var TEXAM = null;

const TO_MODE_NAME = { part:'파트별 연습', type:'유형 연습', mock:'실전 모의고사',
                       wrong:'오답 다시풀기', set:'세트 연습', level:'레벨 테스트' };
/* 기본 제한시간(분) */
function toLimitFor(mode, qs){
  if(mode==='mock'){
    var lc = qs.filter(function(q){ return toArea(q.part)==='LC'; }).length;
    var rc = qs.length - lc;
    /* 정식 기준 LC 45분 · RC 75분을 문항 수에 비례해 잡습니다 */
    return Math.max(10, Math.round(lc*0.45 + rc*0.75));
  }
  return Math.max(5, Math.ceil(qs.length * 0.75));
}

/* ---------------- 시작 ---------------- */
function toStartExam(questions, opt){
  opt = opt || {};
  questions = (questions||[]).filter(function(q){ return q && q.options && q.options.length; });
  if(!questions.length){ toast('출제할 문항이 없습니다. 다른 범위를 골라 주세요.'); return false; }

  try{ if(TEXAM && TEXAM.timerId) clearInterval(TEXAM.timerId); }catch(e){}
  toStopAudio();

  var real = opt.mode==='mock' || opt.real===true;      /* 실전: 음원 1회 · 해설 없음 */
  var limit = opt.limitMin || toLimitFor(opt.mode, questions);

  TEXAM = {
    questions: questions, idx:0,
    answers: new Array(questions.length).fill(null),
    mode: opt.mode || 'part', meta: opt, real: real,
    started: Date.now(), remaining: limit*60, limitMin: limit,
    timerId: null, submitted:false,
    played: {},                    /* 세트/문항별 재생 횟수 */
    showScript: !real && opt.showScript !== false
  };
  window.onbeforeunload = function(){ return '시험이 진행 중입니다. 최종 제출 전에 나가면 답안이 저장되지 않습니다.'; };
  try{ toRenderExam(); }
  catch(e){
    try{ console.error('[toRenderExam]', e && (e.stack||e.message)); }catch(_){}
    toCloseExamRoot(); window.onbeforeunload=null; TEXAM=null;
    toast('시험을 여는 중 문제가 생겼습니다. 다시 시도해 주세요.');
    return false;
  }
  TEXAM.timerId = setInterval(toExamTick, 1000);
  return true;
}
function toCloseExamRoot(){
  toStopAudio();
  try{ var r=document.getElementById('texamRoot'); if(r&&r.parentNode) r.parentNode.removeChild(r); }catch(e){}
}

/* ---------------- 음원 ---------------- */
var TO_AUDIO = null;
function toStopAudio(){
  try{ if(TO_AUDIO){ TO_AUDIO.pause(); TO_AUDIO.src=''; TO_AUDIO=null; } }catch(e){}
}
function toAudioKey(q){ return q.setId || q.id; }
function toPlayAudio(q){
  var url = toAudioOf(q);
  if(!url){ toast('등록된 음원이 없습니다. 스크립트로 연습해 주세요.'); return; }
  var key = toAudioKey(q);
  var cnt = TEXAM.played[key] || 0;
  if(TEXAM.real && cnt >= 1){ toast('실전 모드에서는 한 번만 들을 수 있습니다.'); return; }
  toStopAudio();
  TEXAM.played[key] = cnt + 1;
  TO_AUDIO = new Audio(url);
  TO_AUDIO.onended = function(){ toPaintAudioBar(q); };
  TO_AUDIO.onerror = function(){ toast('음원을 재생할 수 없습니다. 파일을 다시 등록해 주세요.'); toPaintAudioBar(q); };
  TO_AUDIO.play().catch(function(){ toast('브라우저가 자동 재생을 막았습니다. 재생 버튼을 눌러 주세요.'); });
  toPaintAudioBar(q);
}
function toPaintAudioBar(q){
  var el2 = document.getElementById('texAudioBar');
  if(el2) el2.innerHTML = toAudioBarHtml(q);
  var b = document.getElementById('texPlay');
  if(b) b.onclick = function(){ toPlayAudio(q); };
  var s = document.getElementById('texScriptBtn');
  if(s) s.onclick = function(){ TEXAM.showScript = !TEXAM.showScript; toRenderExam(); };
}
function toAudioBarHtml(q){
  var url = toAudioOf(q), key = toAudioKey(q), cnt = TEXAM.played[key]||0;
  var can = !(TEXAM.real && cnt>=1);
  var h = '<div class="tex-audio">';
  if(url){
    h += '<button class="btn '+(can?'':'ghost')+'" id="texPlay" '+(can?'':'disabled')+'>'
      +  (cnt? '다시 듣기' : '음원 재생') + '</button>';
    h += '<span class="muted">'+(TEXAM.real ? ('실전 모드 · 1회만 재생 ('+cnt+'/1)') : ('재생 '+cnt+'회 · 연습 모드는 제한 없음'))+'</span>';
  }else{
    h += '<span class="tex-noaudio">음원 미등록 — 스크립트로 연습합니다</span>';
  }
  if(!TEXAM.real && toScriptOf(q)){
    h += '<button class="lnk" id="texScriptBtn">'+(TEXAM.showScript?'스크립트 숨기기':'스크립트 보기')+'</button>';
  }
  h += '</div>';
  return h;
}

/* ---------------- 화면 ---------------- */
function toRenderExam(){
  var root = document.getElementById('texamRoot');
  if(!root){ root = el('<div id="texamRoot" class="exam-root"></div>'); document.body.appendChild(root); }
  var Q = TEXAM.questions, q = Q[TEXAM.idx], total = Q.length;
  var answered = TEXAM.answers.filter(function(a){ return a!=null; }).length;
  var part = toPart(q.part), area = part.area;

  var main = '<div class="exam-main tex-main">';
  main += '<div class="exam-qhead"><span class="exam-no">문제 '+(TEXAM.idx+1)+' / '+total+'</span>'
       +  '<span class="badge tex-p'+q.part+'">'+esc(part.name)+' · '+esc(part.title)+'</span>'
       +  (q.type?'<span class="q-src">'+esc(q.type)+'</span>':'')+'</div>';

  /* 사진 (Part 1) */
  if(q.part===1){
    if(q.img) main += '<div class="tex-photo"><img src="'+esc(q.img)+'" alt="사진"></div>';
    else if(q.photo) main += '<div class="tex-photo-desc"><b>사진 설명</b>'+esc(q.photo)
      + '<small>실제 사진은 관리자가 문제 관리에서 등록할 수 있습니다</small></div>';
  }
  /* 음원 */
  if(area==='LC'){
    main += '<div id="texAudioBar">'+toAudioBarHtml(q)+'</div>';
    if(TEXAM.showScript && toScriptOf(q)) main += '<div class="tex-script">'+esc(toScriptOf(q)).replace(/\n/g,'<br>')+'</div>';
  }
  /* 지문 (Part 6·7) */
  var pas = toPassageOf(q);
  if(pas && area==='RC'){
    var st = q.setId ? toSetById(q.setId) : null;
    main += '<div class="tex-passage">'+(st&&st.title?'<b>'+esc(st.title)+'</b>':'')
         +  esc(pas).replace(/\n/g,'<br>')+'</div>';
  }
  /* 세트 안 몇 번째 문항인지 */
  if(q.setId){
    var sib = Q.filter(function(x){ return x.setId===q.setId; });
    var pos = sib.indexOf(q)+1;
    if(sib.length>1) main += '<div class="tex-setpos">이 지문의 '+pos+'번째 문항 (전체 '+sib.length+'문항)</div>';
  }

  main += '<div class="stem">'+esc(q.stem)+'</div><div class="opts">';
  var LT = 'ABCD';
  q.options.forEach(function(o,i){
    var sel = TEXAM.answers[TEXAM.idx]===i ? 'sel':'';
    /* Part 2 실전은 보기가 음원으로만 나옵니다 */
    var text = (q.part===2 && TEXAM.real) ? '' : esc(o);
    main += '<button class="opt '+sel+'" data-i="'+i+'"><span class="ol">'+LT[i]+'</span> '+text+'</button>';
  });
  main += '</div>';
  main += '<div class="exam-pn">'
       +  '<button class="btn ghost" id="texPrev" '+(TEXAM.idx===0?'disabled':'')+'>← 이전</button>'
       +  '<button class="btn ghost" id="texNext" '+(TEXAM.idx===total-1?'disabled':'')+'>다음 →</button></div></div>';

  /* 오른쪽 패널 */
  var side = '<aside class="exam-side">';
  side += '<div class="exam-test">'+(TO_MODE_NAME[TEXAM.mode]||'테스트')+(TEXAM.real?' · 실전':'')+'</div>';
  side += '<div class="exam-timer'+(TEXAM.remaining<=300?' warn':'')+'" id="texTimer">'+fmtClock(TEXAM.remaining)+'</div>'
       +  '<div class="exam-timer-l">남은 시간 · 제한 '+TEXAM.limitMin+'분</div>';
  side += '<div class="exam-prog"><b>'+answered+'</b> / '+total+' 응답</div>';
  /* 파트별로 구분된 번호판 */
  side += '<div class="exam-bubbles tex-bubbles" id="texGrid">';
  var lastPart = null;
  Q.forEach(function(qq,i){
    if(qq.part!==lastPart){ side += '<div class="tex-pdiv">'+toPart(qq.part).name+'</div>'; lastPart=qq.part; }
    var cls = (i===TEXAM.idx?'cur':'') + (TEXAM.answers[i]!=null?' done':'');
    side += '<button class="bub '+cls+'" data-g="'+i+'">'+(i+1)+'</button>';
  });
  side += '</div>';
  side += '<button class="btn big full" id="texSubmit">최종 제출</button>';
  side += '<button class="btn ghost full" id="texQuit">시험 중단</button>';
  side += '<p class="exam-warn-txt">제한시간이 끝나면 자동 제출됩니다.</p>';
  side += '</aside>';

  root.innerHTML = '<div class="exam-grid">'+main+side+'</div>';

  root.querySelectorAll('.opt').forEach(function(b){
    b.onclick=function(){ TEXAM.answers[TEXAM.idx]=+b.dataset.i; toRenderExam(); };
  });
  var pv=document.getElementById('texPrev'); if(pv) pv.onclick=function(){ if(TEXAM.idx>0){ TEXAM.idx--; toRenderExam(); } };
  var nx=document.getElementById('texNext'); if(nx) nx.onclick=function(){ if(TEXAM.idx<total-1){ TEXAM.idx++; toRenderExam(); } };
  root.querySelectorAll('.bub').forEach(function(b){ b.onclick=function(){ TEXAM.idx=+b.dataset.g; toRenderExam(); }; });
  document.getElementById('texSubmit').onclick = toConfirmSubmit;
  document.getElementById('texQuit').onclick = function(){
    if(confirm('시험을 중단하시겠습니까? 지금까지의 답안은 저장되지 않습니다.')){
      if(TEXAM.timerId) clearInterval(TEXAM.timerId);
      window.onbeforeunload=null; toCloseExamRoot(); TEXAM=null;
    }
  };
  toPaintAudioBar(q);
  /* 세트가 바뀌면 음원을 자동으로 한 번 재생합니다 (실전 모드) */
  if(TEXAM.real && area==='LC'){
    var key = toAudioKey(q);
    if(!TEXAM.played[key] && toAudioOf(q)) toPlayAudio(q);
  }
}
function toExamTick(){
  if(!TEXAM || TEXAM.submitted) return;
  TEXAM.remaining--;
  var t=document.getElementById('texTimer');
  if(t){ t.textContent=fmtClock(TEXAM.remaining); if(TEXAM.remaining<=300) t.classList.add('warn'); }
  if(TEXAM.remaining<=0){ toast('시간이 종료되어 자동 제출됩니다'); toDoSubmit(); }
}
function toConfirmSubmit(){
  var un = TEXAM.answers.filter(function(a){ return a==null; }).length;
  var msg = un>0 ? ('아직 '+un+'문항이 미응답입니다. 최종 제출하시겠습니까? (미응답은 오답 처리됩니다)') : '최종 제출하시겠습니까?';
  if(confirm(msg)) toDoSubmit();
}
function toDoSubmit(){
  if(!TEXAM || TEXAM.submitted) return;
  TEXAM.submitted = true;
  if(TEXAM.timerId){ clearInterval(TEXAM.timerId); TEXAM.timerId=null; }
  window.onbeforeunload = null;
  toCloseExamRoot();
  toFinishExam();
}

/* ---------------- 채점 ---------------- */
function toGradeExam(){
  var detail = TEXAM.questions.map(function(q,i){
    var pi = TEXAM.answers[i];
    return { id:q.id, part:q.part, area:toArea(q.part), type:q.type||'', level:q.level||1,
             setId:q.setId||null, stem:q.stem,
             picked:pi, correct: pi===q.answer,
             opts:(q.options||[]).slice(), ansIdx:q.answer,
             pickedText: (pi!=null && q.options) ? (q.options[pi]||'') : '',
             answerText: (q.options||[])[q.answer] || '' };
  });
  var lc = detail.filter(function(d){ return d.area==='LC'; });
  var rc = detail.filter(function(d){ return d.area==='RC'; });
  var lcR = lc.filter(function(d){ return d.correct; }).length;
  var rcR = rc.filter(function(d){ return d.correct; }).length;
  var right = lcR + rcR, total = detail.length;

  var partAgg = {};
  TO_PARTS.forEach(function(p){
    var ds = detail.filter(function(d){ return d.part===p.p; });
    if(ds.length) partAgg[p.p] = { right: ds.filter(function(d){return d.correct;}).length, total: ds.length };
  });
  var typeAgg = {};
  detail.forEach(function(d){
    var k = d.part+'|'+(d.type||'기타');
    var a = typeAgg[k] || (typeAgg[k]={part:d.part, type:d.type||'기타', right:0, total:0});
    a.total++; if(d.correct) a.right++;
  });

  var score = null;
  /* 환산 점수는 LC·RC 가 모두 있을 때만 의미가 있습니다 */
  if(lc.length && rc.length) score = toTotalScore(lcR, lc.length, rcR, rc.length);

  return { detail:detail, total:total, right:right, rate: total?Math.round(right/total*100):0,
           lc:{right:lcR,total:lc.length}, rc:{right:rcR,total:rc.length},
           score:score, partAgg:partAgg,
           typeAgg: Object.keys(typeAgg).map(function(k){ var a=typeAgg[k]; a.rate=Math.round(a.right/a.total*100); return a; })
                      .sort(function(x,y){ return x.rate-y.rate; }) };
}
function toFinishExam(){
  var g = toGradeExam();
  var meta = TEXAM.meta || {};
  var sec = Math.max(0, Math.round((Date.now()-TEXAM.started)/1000));
  var rec = null;
  if(CURRENT && (CURRENT.role==='student' || CURRENT.role==='test')){
    rec = { id:uid('ts'), studentId:CURRENT.id, mode:TEXAM.mode,
            part: meta.part||null, examId: meta.examId||null, typeName: meta.type||null,
            lc:g.lc, rc:g.rc, score:g.score, total:g.total, right:g.right, rate:g.rate,
            sec:sec, date:todayStr(), detail:g.detail };
    DB.toeicSessions = DB.toeicSessions || [];
    DB.toeicSessions.push(rec);
    toRecordWrong(CURRENT.id, g.detail);
    save();
  }
  openModal(toResultCard(g, rec));
}
/* 오답 보관함 */
function toRecordWrong(sid, detail){
  DB.toeicWrong = DB.toeicWrong || {};
  var box = DB.toeicWrong[sid] = DB.toeicWrong[sid] || {};
  detail.forEach(function(d){
    var w = box[d.id] || (box[d.id] = { id:d.id, part:d.part, type:d.type, miss:0, hit:0, last:'', fixed:false });
    if(d.correct){ w.hit++; if(w.miss>0) w.fixed = true; }
    else { w.miss++; w.fixed = false; }
    w.last = todayStr();
  });
}
function toWrongList(sid, opt){
  opt = opt || {};
  var box = (DB.toeicWrong||{})[sid] || {};
  var out = Object.keys(box).map(function(k){ return box[k]; })
    .filter(function(w){ return w.miss>0 && (opt.includeFixed ? true : !w.fixed); });
  if(opt.part) out = out.filter(function(w){ return w.part===+opt.part; });
  return out.sort(function(a,b){ return b.miss-a.miss || String(b.last).localeCompare(String(a.last)); });
}

/* ---------------- 결과 화면 ---------------- */
function toResultCard(g, rec){
  var wrap = el('<div class="result tex-result"></div>');
  var h = '';
  if(g.score){
    h += '<div class="tex-score">'
      +  '<div class="tex-score-main"><small>예상 총점</small><b>'+g.score.total+'</b><span>/ 990</span></div>'
      +  '<div class="tex-score-sub"><div><small>LC</small><b>'+g.score.lc+'</b><span>'+g.lc.right+'/'+g.lc.total+'</span></div>'
      +  '<div><small>RC</small><b>'+g.score.rc+'</b><span>'+g.rc.right+'/'+g.rc.total+'</span></div></div></div>';
    if(g.score.partial) h += '<p class="tex-warn">정식 200문항(LC 100 · RC 100)이 아니어서 점수는 비례 추정값입니다. 실제 점수와 차이가 클 수 있습니다.</p>';
    else h += '<p class="tex-warn">공개된 기준점을 이어 만든 예상 환산표입니다. 실제 시험 점수와는 차이가 있을 수 있습니다.</p>';
  }else{
    h += '<div class="tex-score"><div class="tex-score-main"><small>정답률</small><b>'+g.rate+'</b><span>%</span></div>'
      +  '<div class="tex-score-sub"><div><small>맞은 문항</small><b>'+g.right+'</b><span>/ '+g.total+'</span></div></div></div>';
    h += '<p class="tex-warn">한 영역만 풀어 환산 점수는 내지 않습니다. LC·RC 를 모두 포함한 모의고사에서 예상 점수를 확인하세요.</p>';
  }
  /* 파트별 */
  h += '<h4 class="tex-h">파트별 정답률</h4><div class="tex-parts">';
  TO_PARTS.forEach(function(p){
    var a = g.partAgg[p.p]; if(!a) return;
    var r = Math.round(a.right/a.total*100);
    h += '<div class="srow"><span>'+p.name+'</span><div class="mini"><div style="width:'+r+'%"></div></div><b>'+a.right+'/'+a.total+'</b></div>';
  });
  h += '</div>';
  /* 유형별 약점 */
  var weak = g.typeAgg.filter(function(t){ return t.total>=2 && t.rate<70; }).slice(0,5);
  if(weak.length){
    h += '<h4 class="tex-h">더 봐야 할 유형</h4><div class="tex-types">';
    weak.forEach(function(t){
      h += '<span class="pill" style="--c:#ef4444">'+toPart(t.part).name+' '+esc(t.type)+' '+t.rate+'%</span>';
    });
    h += '</div>';
  }
  h += '<div class="rv-after">'
    +  '<button class="btn ghost" id="texReview">문제 · 해설 다시보기</button>'
    +  '<button class="btn ghost" id="texWrongOnly">틀린 문제만 보기</button>'
    +  '<span class="muted">이 기록은 [내 점수]에서 언제든 다시 볼 수 있습니다.</span></div>';
  wrap.innerHTML = h;
  setTimeout(function(){
    var b1=document.getElementById('texReview'); if(b1) b1.onclick=function(){ toReview(g.detail, false); };
    var b2=document.getElementById('texWrongOnly'); if(b2) b2.onclick=function(){ toReview(g.detail, true); };
  },0);
  return wrap;
}

/* ---------------- 다시보기 ---------------- */
function toReview(detail, onlyWrong){
  var list = onlyWrong ? detail.filter(function(d){ return !d.correct; }) : detail;
  if(!list.length){ toast('틀린 문제가 없습니다. 훌륭합니다!'); return; }
  var h = '<div class="rv-wrap"><div class="rv-head"><b>'+(onlyWrong?'틀린 문제':'전체 문제')+' 다시보기</b>'
        + '<span class="muted">'+list.length+'문항</span></div><div class="rv-body">';
  list.forEach(function(d,i){
    var q = toQById(d.id);
    var pas = q ? toPassageOf(q) : '';
    var scr = q ? toScriptOf(q) : '';
    h += '<div class="rv-item '+(d.correct?'ok':'no')+'">';
    h += '<div class="rv-t"><span class="badge tex-p'+d.part+'">'+toPart(d.part).name+'</span> '
      +  '<span class="q-src">'+esc(d.type||'')+'</span> '
      +  '<b>'+(d.correct?'정답':'오답')+'</b></div>';
    if(pas) h += '<div class="rv-passage">'+esc(pas).replace(/\n/g,'<br>')+'</div>';
    if(scr) h += '<div class="rv-script"><b>스크립트</b><br>'+esc(scr).replace(/\n/g,'<br>')+'</div>';
    h += '<div class="rv-stem">'+esc(d.stem)+'</div><div class="rv-opts">';
    (d.opts||[]).forEach(function(o,oi){
      var cls = oi===d.ansIdx ? 'ans' : (oi===d.picked ? 'pick' : '');
      h += '<div class="rv-o '+cls+'"><span>'+'ABCD'[oi]+'</span> '+esc(o)+'</div>';
    });
    h += '</div>';
    if(q && q.explanation) h += '<div class="rv-ex"><b>해설</b> '+esc(q.explanation)+'</div>';
    h += '</div>';
  });
  h += '</div></div>';
  var node = el('<div class="rv-modal"></div>'); node.innerHTML = h;
  openModal(node);
}
/* 지난 응시 기록에서 다시보기 */
function toSessionReview(sessId, onlyWrong){
  var s = (DB.toeicSessions||[]).find(function(x){ return x.id===sessId; });
  if(!s){ toast('기록을 찾을 수 없습니다.'); return; }
  toReview(s.detail||[], !!onlyWrong);
}

/* ---------------- 실행 도우미 (화면에서 호출) ---------------- */
function toRunPart(part, n, level){
  var qs = toPick({part:part, n:n||10, level:level||null});
  return toStartExam(qs, {mode:'part', part:part, real:false});
}
function toRunType(part, type, n){
  var qs = toPick({part:part, type:type, n:n||10});
  return toStartExam(qs, {mode:'type', part:part, type:type, real:false});
}
function toRunWrong(sid, n){
  var ids = toWrongList(sid).slice(0, n||20).map(function(w){ return w.id; });
  var qs = ids.map(toQById).filter(Boolean);
  if(!qs.length){ toast('다시 풀 오답이 없습니다.'); return false; }
  return toStartExam(qs, {mode:'wrong', real:false});
}
function toRunMock(kind){
  var built = toBuildMock(kind);
  if(!built.questions.length){ toast('문제은행에 문항이 없습니다. 관리자에게 문의해 주세요.'); return false; }
  if(built.short.length){
    var msg = '문제은행 문항이 부족해 아래 파트는 실제보다 적게 출제됩니다.\n'
      + built.short.map(function(s){ return toPart(s.part).name+' : '+s.got+' / '+s.want+'문항'; }).join('\n')
      + '\n\n그래도 시작하시겠습니까? (예상 점수는 비례 추정으로 표시됩니다)';
    if(!confirm(msg)) return false;
  }
  return toStartExam(built.questions, {mode:'mock', real:true, kind:kind||'full'});
}
function toRunExam(examId){
  var ex = toExamById(examId);
  if(!ex){ toast('회차를 찾을 수 없습니다.'); return false; }
  var qs = toExamQuestions(ex);
  if(!qs.length){ toast('이 회차에 등록된 문항이 없습니다.'); return false; }
  return toStartExam(qs, {mode:'mock', real:true, examId:examId, limitMin:ex.limitMin||0});
}
