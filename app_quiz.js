/* ===================== 이룸편입 LMS · QUIZ ENGINE ===================== */
let QUIZ = null;
const EXAM_LIMITS = { level:60, mock:60, section:20, mix:30, school:20, adaptive:15, quick:10, daily:10 };
const EXAM_NAME = { level:'레벨테스트', mock:'정기 모의고사', section:'섹션별 테스트', mix:'종합 테스트', school:'학교별 테스트', adaptive:'적응형 추천 테스트', quick:'빠른 테스트', daily:'단어 테스트' };
function startQuiz(questions, opts){
 opts=opts||{};
 /* 출제할 문항이 없으면 시작하지 않습니다.
    (예전에는 빈 시험 화면이 앱 전체를 덮고 나갈 수도 없었습니다) */
 questions = (questions||[]).filter(function(q){ return q && q.options && q.options.length; });
 if(!questions.length){
   try{ toast('출제할 문항이 없습니다. 다른 범위를 골라 주세요.'); }catch(e){}
   return false;
 }
 /* 앞선 시험의 타이머가 남아 있으면 정리합니다 (남은 시간이 두 배로 줄던 문제) */
 try{ if(typeof QUIZ!=='undefined' && QUIZ && QUIZ.timerId) clearInterval(QUIZ.timerId); }catch(e){}
 const limitMin = opts.limitMin || EXAM_LIMITS[opts.mode] || 20;
 QUIZ = { questions:questions, idx:0, answers:new Array(questions.length).fill(null), mode:opts.mode, meta:opts, started:Date.now(), remaining:limitMin*60, limitMin:limitMin, timerId:null, submitted:false };
 window.onbeforeunload = function(){ return '시험이 진행 중입니다. 최종 제출 전에 나가면 답안이 저장되지 않습니다.'; };
 try{ renderExam(); }
 catch(e){
   /* 그리다 실패하면 오버레이와 이탈 경고를 반드시 걷어냅니다 */
   try{ console.error('[renderExam]', e && (e.stack||e.message)); }catch(_){}
   try{ var rt=document.getElementById('examRoot'); if(rt) rt.remove(); }catch(_){}
   window.onbeforeunload = null; QUIZ = null;
   try{ toast('시험을 여는 중 문제가 생겼습니다. 다시 시도해 주세요.'); }catch(_){}
   return false;
 }
 QUIZ.timerId = setInterval(examTick, 1000);
 return true;
}
function fmtClock(sec){ sec=Math.max(0,sec); const m=Math.floor(sec/60), s=sec%60; return (m<10?'0':'')+m+':'+(s<10?'0':'')+s; }
function renderExam(){
 let root=document.getElementById('examRoot');
 if(!root){ root=el('<div id="examRoot" class="exam-root"></div>'); document.body.appendChild(root); }
 const q=QUIZ.questions[QUIZ.idx]; const total=QUIZ.questions.length;
 const answered=QUIZ.answers.filter(function(a){return a!=null;}).length;
 let main='<div class="exam-main">';
  main+='<div class="exam-qhead"><span class="exam-no">문제 '+(QUIZ.idx+1)+' / '+total+'</span> <span class="badge sec-'+q.section+'">'+SECTIONS[q.section]+'</span><span class="q-src">'+esc(qSource(q))+'</span></div>';
 if(q.passage) main+='<div class="passage">'+esc(q.passage)+'</div>';
 if(q.hint) main+='<div class="q-hint">'+esc(q.hint)+'</div>';
 main+='<div class="stem">'+esc(q.stem)+'</div><div class="opts">';
 q.options.forEach(function(o,i){ const sel=QUIZ.answers[QUIZ.idx]===i?'sel':''; main+='<button class="opt '+sel+'" data-i="'+i+'"><span class="ol">'+'ABCD'[i]+'</span> '+esc(o)+'</button>'; });
 main+='</div>';
 main+='<div class="exam-pn"><button class="btn ghost" id="exPrev" '+(QUIZ.idx===0?'disabled':'')+'>← 이전</button><button class="btn ghost" id="exNext" '+(QUIZ.idx===total-1?'disabled':'')+'>다음 →</button></div></div>';
 let side='<aside class="exam-side">';
 side+='<div class="exam-test">'+(EXAM_NAME[QUIZ.mode]||'테스트')+'</div>';
 side+='<div class="exam-timer'+(QUIZ.remaining<=300?' warn':'')+'" id="examTimer">'+fmtClock(QUIZ.remaining)+'</div><div class="exam-timer-l">남은 시간 · 제한 '+QUIZ.limitMin+'분</div>';
 side+='<div class="exam-prog"><b>'+answered+'</b> / '+total+' 응답</div>';
 side+='<div class="exam-bubbles" id="examGrid">';
 QUIZ.questions.forEach(function(qq,i){ const cls=(i===QUIZ.idx?'cur':'')+(QUIZ.answers[i]!=null?' done':''); side+='<button class="bub '+cls+'" data-g="'+i+'">'+(i+1)+'</button>'; });
 side+='</div>';
 side+='<button class="btn big full" id="examSubmit">최종 제출</button>';
 side+='<p class="exam-warn-txt">시험 중에는 페이지를 벗어날 수 없습니다. 제한시간이 끝나면 자동 제출됩니다.</p>';
 side+='</aside>';
 root.innerHTML='<div class="exam-grid">'+main+side+'</div>';
 root.querySelectorAll('.opt').forEach(function(b){ b.onclick=function(){ QUIZ.answers[QUIZ.idx]=+b.dataset.i; renderExam(); }; });
 var pv=document.getElementById('exPrev'); if(pv) pv.onclick=function(){ if(QUIZ.idx>0){QUIZ.idx--; renderExam();} };
 var nx=document.getElementById('exNext'); if(nx) nx.onclick=function(){ if(QUIZ.answers[QUIZ.idx]==null){ toast('답을 선택해야 다음 문제로 넘어갈 수 있습니다'); return; } if(QUIZ.idx<total-1){QUIZ.idx++; renderExam();} };
 root.querySelectorAll('.bub').forEach(function(b){ b.onclick=function(){ QUIZ.idx=+b.dataset.g; renderExam(); }; });
 document.getElementById('examSubmit').onclick=function(){ confirmSubmit(); };
}
function examTick(){ if(!QUIZ||QUIZ.submitted) return; QUIZ.remaining--; var t=document.getElementById('examTimer'); if(t){ t.textContent=fmtClock(QUIZ.remaining); if(QUIZ.remaining<=300) t.classList.add('warn'); } if(QUIZ.remaining<=0){ toast('시간이 종료되어 자동 제출됩니다'); doSubmit(); } }
function confirmSubmit(){ const un=QUIZ.answers.filter(function(a){return a==null;}).length; const msg= un>0 ? ('아직 '+un+'문항이 미응답입니다. 최종 제출하시겠습니까? (미응답은 오답 처리됩니다)') : '최종 제출하시겠습니까?'; if(confirm(msg)) doSubmit(); }
function doSubmit(){ if(!QUIZ||QUIZ.submitted) return; QUIZ.submitted=true; if(QUIZ.timerId){ clearInterval(QUIZ.timerId); QUIZ.timerId=null; } window.onbeforeunload=null; var root=document.getElementById('examRoot'); if(root&&root.parentNode) root.parentNode.removeChild(root); finishQuiz(); }

function gradeQuiz(){
 const detail = QUIZ.questions.map(function(q,i){
   var pi = QUIZ.answers[i];
   return { id:q.id, section:q.section, tag:q.tag||null, level:q.level||null,
            /* 변형 출제 때문에 원본과 달라질 수 있으므로 화면에 나온 그대로를 남긴다 */
            stem: q.stem, passage: q.passage || '',
            picked: pi, correct: pi===q.answer,
            /* 출제 당시 보기 순서를 그대로 남긴다 — 다시보기에서 학생이 고른 답을 정확히 표시하기 위함 */
            opts: (q.options||[]).slice(),
            ansIdx: q.answer,
            pickedText: (pi!=null && q.options) ? (q.options[pi]||'') : '',
            answerText: (q.options||[])[q.answer] || '' };
 });
 const total = detail.length;
 const right = detail.filter(function(d){return d.correct;}).length;
 const secAgg = {};
 for(const s of Object.keys(SECTIONS)){ const ds=detail.filter(function(d){return d.section===s;}); if(ds.length) secAgg[s]={right:ds.filter(function(d){return d.correct;}).length,total:ds.length}; }
 return { total:total, right:right, rate: Math.round(right/total*100), detail:detail, secAgg:secAgg };
}
function finishQuiz(){
 const g = gradeQuiz();
 const meta = QUIZ.meta;
 if(meta.mode==='level'){ finishLevelTest(g); return; }
 if(CURRENT && CURRENT.role==='student'){
 DB.sessions.push({ id:uid('se'), studentId:CURRENT.id, type:meta.mode, section:meta.section||'mix', uni:meta.uni||null, score:g.right, total:g.total, rate:g.rate, date:todayStr(), detail:g.detail });
 save();
 }
 openModal(renderQuizResult(g));
 /* 결과 화면에서 바로 문제 다시보기 */
 try{
   var last=(DB.sessions||[]).slice(-1)[0];
   var card=document.querySelector('#modal .result');
   if(card && last && last.studentId===CURRENT.id){
     var bar=document.createElement('div');
     bar.className='rv-after';
     bar.innerHTML='<button class="btn ghost" id="rvNow">문제·해설 다시보기</button>'
       + '<button class="btn ghost" id="rvPaperNow">시험지로 보기</button>'
       + '<span class="muted">이 기록은 [테스트 센터 > 지난 응시 기록]에서 언제든 다시 볼 수 있습니다.</span>';
     card.appendChild(bar);
     var b=document.getElementById('rvNow');
     if(b) b.onclick=function(){ sessionReview(last.id, false); };
     var b2=document.getElementById('rvPaperNow');
     if(b2) b2.onclick=function(){ paperReview(last.id); };
   }
 }catch(e){}
}
function renderQuizResult(g){
 const wrap = el('<div class="result"></div>');
 let secHtml = Object.entries(g.secAgg).map(function(e){ const s=e[0],v=e[1]; return '<div class="srow"><span>'+SECTIONS[s]+'</span><div class="mini"><div style="width:'+(v.right/v.total*100)+'%"></div></div><b>'+v.right+'/'+v.total+'</b></div>'; }).join('');
 const tagAgg={};
 g.detail.forEach(function(d){ const sub=elementOf(d.section, d.tag); const key=d.section+'|'+sub; tagAgg[key]=tagAgg[key]||{sec:d.section,sub:sub,r:0,t:0}; tagAgg[key].t++; if(d.correct)tagAgg[key].r++; });
 const tagRows=Object.values(tagAgg).map(function(x){ return Object.assign({},x,{rate:Math.round(x.r/x.t*100)}); }).sort(function(a,b){return a.rate-b.rate;});
 const tagHtml = tagRows.map(function(x){ const c=x.rate>=80?'#2563eb':x.rate>=60?'#7c3aed':'#ef4444';
   return '<div class="srow subrow"><span class="badge sec-'+x.sec+'">'+SECTIONS[x.sec]+'</span><span class="subname">'+esc(x.sub)+'</span>'
     +'<div class="mini"><div style="width:'+x.rate+'%;background:'+c+'"></div></div><b>'+x.r+'/'+x.t+' · '+pct(x.rate)+'</b>'
     +'<button class="btn ghost rptmini subgo" data-sub="'+esc(x.sec)+'|'+esc(x.sub)+'">이 유형 더 풀기</button></div>'; }).join('');
 const weakTag = tagRows.find(function(x){return x.rate<60;});
 const wrongs = g.detail.map(function(d,i){ return {d:d, q:QUIZ.questions[i]}; }).filter(function(x){return !x.d.correct;});
 const _llmOn = (typeof LLM!=='undefined' && LLM.enabled);
 let fb = wrongs.map(function(x){ const ai=AI.explain(x.q, x.d.picked); const qi=QUIZ.questions.indexOf(x.q);
 const btn = _llmOn ? '<button class="lnk aiexp" data-qi="'+qi+'">AI 상세 해설</button>' : '';
 return '<div class="fb"><div class="fbq">'+esc(x.q.stem)+'</div><div class="fba">정답 <b>'+'ABCD'[x.q.answer]+'. '+esc(x.q.options[x.q.answer])+'</b></div><div class="fbe">'+esc(ai.text)+'</div><div class="fbc">'+esc(ai.coach)+'</div>'+btn+'<div class="aiexp-out"></div></div>'; }).join('') || '<div class="muted">모두 정답입니다! </div>';
 wrap.innerHTML = '<div class="res-head"><div class="res-score" style="--c:'+(g.rate>=80?'#2563eb':g.rate>=60?'#7c3aed':'#059669')+'"><b>'+g.right+'</b><span>/ '+g.total+'</span></div>'
 + '<div><div class="res-rate">'+pct(g.rate)+'</div><div class="muted">정답률 · '+(g.rate>=80?'우수':g.rate>=60?'양호':'보강 필요')+'</div></div></div>'
 + '<h4>영역별 점수</h4>'+secHtml
 + '<h4>세부 유형별 결과</h4><div class="subtypes">'+tagHtml+'</div>'
  + '<h4>문항별 피드백 <span class="muted">(오답 '+wrongs.length+'문항 전체)</span></h4><div class="fbs">'+fb+'</div>'
 + (weakTag ? ('<div class="weak-cta"><b>' + SECTIONS[weakTag.sec] + ' · ' + esc(weakTag.sub) + '</b> 유형이 ' + pct(weakTag.rate) + '로 가장 약합니다.'
      + '<button class="btn" data-sub="' + esc(weakTag.sec) + '|' + esc(weakTag.sub) + '">이 유형 집중 훈련</button></div>') : '')
 + '<div class="quiz-nav"><button class="btn ghost" id="rAgain">다시</button><button class="btn ghost" id="rSub">세부유형 테스트</button><button class="btn" id="rClose">닫기</button></div>';
 $('#rClose',wrap).onclick=function(){ closeModal(); if(window._afterQuiz) window._afterQuiz(); };
 $('#rAgain',wrap).onclick=function(){ closeModal(); if(window._againQuiz) window._againQuiz(); };
 var rs=$('#rSub',wrap); if(rs) rs.onclick=function(){ closeModal(); if(typeof go==='function') go('s-center'); };
 $$('[data-sub]',wrap).forEach(function(b){ b.onclick=function(){
   var p2=b.dataset.sub.split('|'); var qs=(typeof pickBySub==='function')?pickBySub(p2[0],p2[1],10):[];
   if(!qs.length){ toast('해당 유형의 문제가 없습니다'); return; }
   closeModal();
   window._againQuiz=function(){ var q2=pickBySub(p2[0],p2[1],10); if(q2.length) startQuiz(q2,{mode:'section',section:p2[0]}); };
   startQuiz(qs,{mode:'section',section:p2[0]});
 }; });
 $$('.aiexp',wrap).forEach(function(b){ b.onclick=function(){ const qi=+b.dataset.qi; const out=b.nextElementSibling; out.textContent='AI 해설 생성 중…'; b.disabled=true;
 LLM.explainQ(QUIZ.questions[qi], QUIZ.answers[qi]).then(function(t){ out.textContent = t || 'AI 해설을 가져오지 못했습니다 (내장 해설을 참고하세요).'; b.style.display='none'; }); }; });
 return wrap;
}
function radar(canvas, labels, values, color){
 const ctx=canvas.getContext('2d'); const W=canvas.width, H=canvas.height, cx=W/2, cy=H/2, R=Math.min(W,H)/2-34;
 ctx.clearRect(0,0,W,H); const n=labels.length;
 ctx.strokeStyle='#e2e8f0'; ctx.fillStyle='#94a3b8'; ctx.font='12px sans-serif';
 for(let g=1;g<=4;g++){ ctx.beginPath(); for(let i=0;i<=n;i++){ const a=Math.PI*2*i/n-Math.PI/2; const r=R*g/4; const x=cx+r*Math.cos(a), y=cy+r*Math.sin(a); if(i)ctx.lineTo(x,y); else ctx.moveTo(x,y);} ctx.stroke(); }
 for(let i=0;i<n;i++){ const a=Math.PI*2*i/n-Math.PI/2; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+R*Math.cos(a),cy+R*Math.sin(a)); ctx.stroke();
 ctx.textAlign='center'; ctx.fillStyle='#475569'; ctx.fillText(labels[i], cx+(R+18)*Math.cos(a), cy+(R+18)*Math.sin(a)+4); }
 ctx.beginPath(); for(let i=0;i<=n;i++){ const idx=i%n; const a=Math.PI*2*idx/n-Math.PI/2; const r=R*(values[idx]/100); const x=cx+r*Math.cos(a), y=cy+r*Math.sin(a); if(i)ctx.lineTo(x,y); else ctx.moveTo(x,y);}
 ctx.closePath(); ctx.fillStyle=color+'33'; ctx.fill(); ctx.strokeStyle=color; ctx.lineWidth=2; ctx.stroke();
 for(let i=0;i<n;i++){ const a=Math.PI*2*i/n-Math.PI/2; const r=R*(values[i]/100); ctx.beginPath(); ctx.arc(cx+r*Math.cos(a),cy+r*Math.sin(a),3,0,7); ctx.fillStyle=color; ctx.fill(); }
}
function bars(canvas, labels, values, color){
 const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
 const pad=30, gap=(W-pad*2)/values.length, bw=gap*0.6; const max=100;
 ctx.font='11px sans-serif'; ctx.textAlign='center';
 values.forEach(function(v,i){ const x=pad+gap*i+gap/2; const h=(H-40)*(v/max); ctx.fillStyle=color; ctx.fillRect(x-bw/2,H-25-h,bw,h); ctx.fillStyle='#475569'; ctx.fillText(labels[i],x,H-8); ctx.fillText(v+'%',x,H-30-h); });
}

/* ---------- 지난 응시 문제 다시보기 (오답노트) ---------- */

/* 문제 해설 얻기 — 데이터 필드명이 explanation / explain 혼재하므로 통일하고, 없으면 자동 생성 */
function qExplain(q, picked){
  if(!q) return '';
  var t = q.explanation || q.explain || '';
  if(t) return t;
  try{ if(typeof AI!=='undefined' && AI.explain) return AI.explain(q, picked); }catch(e){}
  var L=['A','B','C','D','E'];
  var ans = (q.options||[])[q.answer];
  return '정답은 ' + L[q.answer] + '번' + (ans ? (' (' + ans + ')') : '') + '입니다.';
}
/* 문제 출처·유형 라벨 */
function qSource(q){
  if(!q) return '';
  var parts = [];
  if(q.section && typeof SECTIONS!=='undefined' && SECTIONS[q.section]) parts.push('편입 ' + SECTIONS[q.section]);
  if(typeof elementOf==='function'){ var el = elementOf(q.section, q.tag); if(el) parts.push(el); }
  else if(q.tag) parts.push(q.tag);
  if(q.level) parts.push(q.level + '단계');
  return parts.join(' · ');
}
function qById(id){ return QUESTIONS.find(function(q){ return q.id===id; }) || null; }
function sessionTypeName(t){
  return {level:'레벨테스트',mock:'모의고사',section:'섹션별 테스트',mix:'종합 테스트',
          school:'학교별 테스트',adaptive:'적응형 추천',quick:'빠른 테스트',daily:'단어 테스트'}[t] || t;
}
function sessionReview(sid, onlyWrong){
  /* onlyWrong: false=전체 / true=오답만 / 'paper'=시험지 */
  var se = (DB.sessions||[]).find(function(x){ return x.id===sid; });
  if(!se){ toast('기록을 찾을 수 없습니다'); return; }
  if(onlyWrong === 'paper'){ return paperReview(sid); }
  var det = se.detail || [];
  var rows = det.map(function(d,i){ return {d:d, q:qById(d.id), n:i+1}; }).filter(function(x){ return x.q; });
  var wrongN = rows.filter(function(x){ return !x.d.correct; }).length;
  var show = onlyWrong ? rows.filter(function(x){ return !x.d.correct; }) : rows;
  var LT = ['A','B','C','D'];
  var body = show.length ? show.map(function(x){
    var q=x.q, d=x.d;
    /* 출제 당시 보기 배열이 있으면 그것을 사용한다 (보기 순서 변형 대응) */
    var useOpts = (d.opts && d.opts.length) ? d.opts : (q.options||[]);
    var ansIdx  = (d.ansIdx!=null) ? d.ansIdx : q.answer;
    var pickIdx = d.picked;
    /* 텍스트로 재확인해 인덱스가 어긋나도 정확히 표시 */
    if(d.answerText){ var ai = useOpts.indexOf(d.answerText); if(ai>=0) ansIdx = ai; }
    if(d.pickedText){ var pi2 = useOpts.indexOf(d.pickedText); if(pi2>=0) pickIdx = pi2; }
    var opts = useOpts.map(function(o,oi){
      var isAns = (oi===ansIdx), isPick = (pickIdx!=null && oi===pickIdx);
      var cls = isAns ? (isPick ? 'rv-o ok pick' : 'rv-o ok') : (isPick ? 'rv-o bad' : 'rv-o');
      var tag = '';
      if(isAns && isPick) tag = '<span class="rv-tag ok">정답</span><span class="rv-tag mine">내 답</span>';
      else if(isAns)      tag = '<span class="rv-tag ok">정답</span>';
      else if(isPick)     tag = '<span class="rv-tag bad">내 답</span>';
      return '<div class="'+cls+'"><b>'+LT[oi]+'</b><span>'+esc(o)+'</span>'+tag+'</div>';
    }).join('');
    var noPick = (pickIdx==null);
    return '<div class="rv-q'+(d.correct?' correct':'')+'">'
      + '<div class="rv-h"><span class="badge sec-'+q.section+'">'+SECTIONS[q.section]+'</span>'
      + '<b>'+x.n+'번</b><span class="q-src">'+esc(qSource(q))+'</span>'
      + '<span class="rv-res '+(d.correct?'ok':'bad')+'">'+(d.correct?'정답':'오답')+'</span></div>'
      + (noPick ? '<div class="rv-nopick">이 문항은 답을 선택하지 않았습니다 (미응답)</div>' : '')
      + (q.passage?('<div class="rv-p">'+esc(q.passage)+'</div>'):'')
      + '<div class="rv-s">'+esc(q.stem)+'</div>'
      + '<div class="rv-os">'+opts+'</div>'
      + (typeof qExplainHtml==='function' ? qExplainHtml(q, d.picked) : ('<div class="rv-e"><b>해설</b>'+esc(qExplain(q, d.picked))+'</div>'))
      + '</div>';
  }).join('') : '<p class="muted">표시할 문항이 없습니다.</p>';

  openModal(el('<div class="form rvwrap"><h3>'+sessionTypeName(se.type)+' 다시보기</h3>'
    + '<div class="rv-meta">'+esc(se.date)+' · '+se.score+'/'+se.total+'문항 정답 · 정답률 '+se.rate+'% · 오답 '+wrongN+'문항</div>'
    + '<div class="tabs rv-tabs"><button class="tab'+(onlyWrong?'':' on')+'" id="rvAll">전체 '+rows.length+'문항</button>'
    + '<button class="tab'+(onlyWrong?' on':'')+'" id="rvWrong">오답만 '+wrongN+'문항</button>'
    + '<button class="tab" id="rvPaper">시험지로 보기</button></div>'
    + '<div class="rv-list">'+body+'</div>'
    + '<div class="modal-actions"><button class="btn ghost" id="rvBack">← 목록으로</button>'
    + '<button class="btn" id="rvX">닫기</button></div></div>'));
  document.getElementById('rvX').onclick = closeModal;
  document.getElementById('rvBack').onclick = function(){
    closeModal();
    if(typeof ROUTE!=='undefined' && ROUTE!=='s-center' && ROUTE!=='s-wrong' && ROUTE!=='s-grade') go('s-center');
    else renderPage();
  };
  document.getElementById('rvAll').onclick = function(){ sessionReview(sid, false); };
  document.getElementById('rvWrong').onclick = function(){ sessionReview(sid, true); };
  document.getElementById('rvPaper').onclick = function(){ paperReview(sid); };
}

/* ---------- 시험지로 보기 ----------
   푼 문항을 실제 시험지처럼 나열합니다. 지문은 한 번만 싣고 딸린 문항을 아래에 묶습니다.
   내 답 / 정답 표시는 켜고 끌 수 있고, 그대로 인쇄할 수 있습니다. */
var PAPER_MY = true, PAPER_ANS = false, PAPER_EXP = false;
function paperReview(sid){
  var se = (DB.sessions||[]).find(function(x){ return x.id===sid; });
  if(!se){ toast('기록을 찾을 수 없습니다'); return; }
  var det = se.detail || [];
  var rows = det.map(function(d,i){ return { d:d, q:qById(d.id), n:i+1 }; }).filter(function(x){ return x.q; });
  if(!rows.length){ toast('표시할 문항이 없습니다'); return; }

  var title = (se.uni ? (se.uni + ' ') : '') + sessionTypeName(se.type);
  var wrongN = rows.filter(function(x){ return !x.d.correct; }).length;
  var mins = (typeof uniMetaOf==='function' && se.uni) ? ((uniMetaOf(se.uni)||{}).min || null) : null;

  openModal(el('<div class="form paperwrap"><h3>'+esc(title)+' 시험지</h3>'
    + '<div class="rv-meta">'+esc(se.date)+' · '+rows.length+'문항 · 정답 '+se.score+'개 · 정답률 '+se.rate+'%'
      + (mins ? (' · 실제 제한시간 '+mins+'분') : '') + '</div>'
    + '<div class="paper-bar">'
      + '<label class="paper-ck"><input type="checkbox" id="pkMy"'+(PAPER_MY?' checked':'')+'> 내가 고른 답 표시</label>'
      + '<label class="paper-ck"><input type="checkbox" id="pkAns"'+(PAPER_ANS?' checked':'')+'> 정답 표시</label>'
      + '<label class="paper-ck"><input type="checkbox" id="pkExp"'+(PAPER_EXP?' checked':'')+'> 해설 함께 보기</label>'
      + '<span class="paper-sp"></span>'
      + '<button class="btn ghost rptmini" id="pkPrint">인쇄 · PDF 저장</button>'
      + '<button class="btn ghost rptmini" id="pkBack">해설 보기</button>'
    + '</div>'
    + '<div class="paper-sheet" id="paperSheet">'+paperSheetHtml(rows, title, se)+'</div>'
    + '<div class="modal-actions"><button class="btn ghost" id="pkList">← 목록으로</button>'
    + '<button class="btn" id="pkX">닫기</button></div></div>'));

  function redraw(){ var el2=document.getElementById('paperSheet'); if(el2) el2.innerHTML = paperSheetHtml(rows, title, se); }
  document.getElementById('pkMy').onchange  = function(){ PAPER_MY  = this.checked; redraw(); };
  document.getElementById('pkAns').onchange = function(){ PAPER_ANS = this.checked; redraw(); };
  document.getElementById('pkExp').onchange = function(){ PAPER_EXP = this.checked; if(this.checked) PAPER_ANS = true;
    var a=document.getElementById('pkAns'); if(a) a.checked = PAPER_ANS; redraw(); };
  document.getElementById('pkPrint').onclick = function(){ paperPrint(rows, title, se); };
  document.getElementById('pkBack').onclick  = function(){ sessionReview(sid, false); };
  document.getElementById('pkX').onclick     = closeModal;
  document.getElementById('pkList').onclick  = function(){
    closeModal();
    if(typeof ROUTE!=='undefined' && ROUTE!=='s-center' && ROUTE!=='s-wrong' && ROUTE!=='s-grade') go('s-center');
    else renderPage();
  };
}
/* 시험지 본문 — 같은 지문끼리 묶습니다 */
function paperSheetHtml(rows, title, se){
  var NUM = ['①','②','③','④','⑤'];
  var html = '<div class="pp-head"><h4>'+esc(title)+'</h4>'
    + '<div class="pp-sub">응시일 '+esc(se.date)+' · 총 '+rows.length+'문항</div></div>';
  var lastP = null, open = false;
  rows.forEach(function(x){
    var q = x.q, d = x.d;
    var psg = (d.passage !== undefined && d.passage !== null) ? d.passage : (q.passage || '');
    var stem = d.stem || q.stem;
    if(psg !== lastP){
      if(open){ html += '</div>'; open = false; }
      if(psg){
        var group = rows.filter(function(y){ return (y.q.passage||'') === psg; });
        var ns = group.map(function(y){ return y.n; });
        html += '<div class="pp-block"><div class="pp-plabel">['+ns[0]+(ns.length>1?('~'+ns[ns.length-1]):'')+'] 다음 글을 읽고 물음에 답하시오.</div>'
          + '<div class="pp-passage">'+esc(psg)+'</div>';
        open = true;
      }
      lastP = psg;
    }
    var useOpts = (d.opts && d.opts.length) ? d.opts : (q.options||[]);
    var ansIdx  = (d.ansIdx!=null) ? d.ansIdx : q.answer;
    var pickIdx = d.picked;
    if(d.answerText){ var ai = useOpts.indexOf(d.answerText); if(ai>=0) ansIdx = ai; }
    if(d.pickedText){ var pi = useOpts.indexOf(d.pickedText); if(pi>=0) pickIdx = pi; }

    var mark = '';
    if(PAPER_MY){
      if(pickIdx == null) mark = '<span class="pp-mk none">미응답</span>';
      else mark = '<span class="pp-mk '+(d.correct?'ok':'bad')+'">'+(d.correct?'정답':'오답')+'</span>';
    }
    html += '<div class="pp-q'+(PAPER_MY && !d.correct ? ' wrong':'')+'">'
      + '<div class="pp-stem"><b>'+x.n+'.</b> <span class="pp-st">'+esc(stem)+'</span>'+mark+'</div>'
      + '<ol class="pp-opts">'
      + useOpts.map(function(o, oi){
          var cls = '';
          if(PAPER_ANS && oi === ansIdx) cls += ' ans';
          if(PAPER_MY && pickIdx != null && oi === pickIdx) cls += ' my';
          return '<li class="pp-o'+cls+'"><i>'+(NUM[oi]||(oi+1))+'</i><span>'+esc(o)+'</span>'
            + (PAPER_MY && pickIdx===oi ? '<em class="pp-tag my">내 답</em>' : '')
            + (PAPER_ANS && oi===ansIdx ? '<em class="pp-tag ans">정답</em>' : '')
            + '</li>';
        }).join('')
      + '</ol>'
      + (PAPER_EXP ? ('<div class="pp-exp">'
          + (typeof qExplainHtml==='function' ? qExplainHtml(q, d.picked)
             : ('<b>해설</b> ' + esc(typeof qExplain==='function' ? qExplain(q, d.picked) : (q.explanation||''))))
          + '</div>') : '')
      + '</div>';
  });
  if(open) html += '</div>';
  return html;
}
/* 인쇄 — 새 창에 시험지만 담아 띄웁니다 */
function paperPrint(rows, title, se){
  var css = ''
    + 'body{font-family:"Malgun Gothic","맑은 고딕",sans-serif;color:#111;margin:26px;line-height:1.7}'
    + '.pp-head{text-align:center;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:18px}'
    + '.pp-head h4{margin:0 0 4px;font-size:19px}'
    + '.pp-sub{font-size:12px;color:#555}'
    + '.pp-block{border-left:3px solid #bbb;padding-left:12px;margin:16px 0}'
    + '.pp-plabel{font-size:12.5px;font-weight:700;margin-bottom:6px}'
    + '.pp-passage{font-size:13px;line-height:1.9;white-space:pre-wrap;text-align:justify;margin-bottom:10px}'
    + '.pp-q{margin:0 0 14px;page-break-inside:avoid}'
    + '.pp-stem{font-size:13.5px;margin-bottom:5px}'
    + '.pp-opts{list-style:none;margin:0;padding:0 0 0 14px}'
    + '.pp-o{font-size:13px;padding:2px 0;display:flex;gap:6px}'
    + '.pp-o i{font-style:normal;flex:0 0 16px}'
    + '.pp-o.ans{font-weight:700}'
    + '.pp-o.my span{text-decoration:underline}'
    + '.pp-tag{font-style:normal;font-size:11px;border:1px solid #888;border-radius:3px;padding:0 4px;margin-left:5px}'
    + '.pp-mk{font-size:11px;border:1px solid #888;border-radius:3px;padding:0 5px;margin-left:6px}'
    + '.pp-exp{margin-top:6px;padding:7px 9px;border:1px solid #ccc;border-radius:4px;font-size:12px;line-height:1.75}'
    + '@page{margin:14mm}';
  var w = window.open('', '_blank');
  if(!w){ toast('팝업이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요'); return; }
  w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>'
    + esc(title) + ' 시험지</title><style>' + css + '</style></head><body>'
    + paperSheetHtml(rows, title, se)
    + '</body></html>');
  w.document.close();
  setTimeout(function(){ try{ w.focus(); w.print(); }catch(e){} }, 400);
}
/* 지난 응시 기록 목록 HTML */
function sessionHistoryHtml(limit){
  var mine = (DB.sessions||[]).filter(function(s){ return s.studentId===CURRENT.id && (s.detail||[]).length; })
              .slice().reverse().slice(0, limit||20);
  if(!mine.length) return '<div class="muted">아직 응시 기록이 없습니다. 테스트를 풀면 여기에 쌓입니다.</div>';
  return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>날짜</th><th>구분</th><th>영역</th><th>점수</th><th>정답률</th><th></th></tr></thead><tbody>'
    + mine.map(function(s){
        var col = s.rate>=80?'#059669':(s.rate>=60?'#d97706':'#ef4444');
        return '<tr><td>'+esc(s.date)+'</td><td><b>'+sessionTypeName(s.type)+'</b></td>'
          + '<td>'+(SECTIONS[s.section]||'종합')+'</td><td>'+s.score+'/'+s.total+'</td>'
          + '<td><b style="color:'+col+'">'+s.rate+'%</b></td>'
          + '<td><button class="btn rptmini" data-rv="'+s.id+'">문제 다시보기</button> '
          + '<button class="btn ghost rptmini" data-rvp="'+s.id+'">시험지</button></td></tr>';
      }).join('')
    + '</tbody></table></div>';
}
function bindSessionHistory(){
  $$('#page [data-rv]').forEach(function(b){ b.onclick=function(){ sessionReview(b.dataset.rv, false); }; });
  $$('#page [data-rvp]').forEach(function(b){ b.onclick=function(){ paperReview(b.dataset.rvp); }; });
}

/* 최근 N일 오답 문제 모으기 (지난주 오답 다시 풀기) */
function recentWrongQuestions(sid, days, limit){
  days = days || 7; limit = limit || 20;
  var from = addDays(-days, todayStr());
  var ids = [], seen = {};
  (DB.sessions||[]).filter(function(s){ return s.studentId===sid && (s.date||'') >= from; })
    .forEach(function(s){ (s.detail||[]).forEach(function(d){ if(!d.correct && !seen[d.id]){ seen[d.id]=1; ids.push(d.id); } }); });
  var qs = ids.map(qById).filter(Boolean);
  return qs.slice(0, limit);
}
function allWrongQuestions(sid, limit){  /* limit 없으면 전체 반환 */
  var ids = [], seen = {};
  (DB.sessions||[]).filter(function(s){ return s.studentId===sid; })
    .forEach(function(s){ (s.detail||[]).forEach(function(d){ if(!d.correct && !seen[d.id]){ seen[d.id]=1; ids.push(d.id); } }); });
  var out = ids.map(qById).filter(Boolean);
  return limit ? out.slice(0, limit) : out;   /* limit 미지정 시 전체 */
}

/* ===================== 오답노트 ===================== */
/* 응시 기록 전체를 훑어 문항별 오답 이력을 만든다 */
function wrongBook(sid){
  var byQ = {};
  (DB.sessions||[]).filter(function(s){ return s.studentId===sid && (s.detail||[]).length; })
    .forEach(function(s){
      (s.detail||[]).forEach(function(d){
        var e = byQ[d.id] || (byQ[d.id] = {id:d.id, wrong:0, right:0, first:s.date, last:s.date,
                                           lastCorrect:null, lastPicked:null, section:d.section, tag:d.tag||null});
        if(d.correct) e.right++; else e.wrong++;
        if((s.date||'') >= (e.last||'')){
          e.last = s.date; e.lastCorrect = !!d.correct; e.lastPicked = d.picked;
          e.lastOpts = d.opts || null; e.lastAnsIdx = (d.ansIdx!=null) ? d.ansIdx : null;
          e.lastPickedText = d.pickedText || ''; e.lastAnswerText = d.answerText || '';
        }
        if((s.date||'') < (e.first||'')) e.first = s.date;
      });
    });
  var out = [];
  Object.keys(byQ).forEach(function(k){
    var e = byQ[k]; if(!e.wrong) return;              /* 한 번도 틀린 적 없으면 제외 */
    var q = qById(e.id); if(!q) return;
    e.q = q;
    e.solved = e.lastCorrect === true;                /* 마지막 응시에서 맞혔으면 해결 */
    out.push(e);
  });
  out.sort(function(a,b){
    if(a.solved !== b.solved) return a.solved ? 1 : -1;   /* 미해결 먼저 */
    if(b.wrong !== a.wrong) return b.wrong - a.wrong;     /* 많이 틀린 순 */
    return (b.last||'').localeCompare(a.last||'');
  });
  return out;
}
function wrongMemo(sid, qid, val){
  DB.wrongMemo = DB.wrongMemo || {};
  DB.wrongMemo[sid] = DB.wrongMemo[sid] || {};
  if(val === undefined) return DB.wrongMemo[sid][qid] || '';
  DB.wrongMemo[sid][qid] = val; save(); return val;
}

/* 오답노트 화면 */
var WB_SEC = 'all', WB_ST = 'todo';
function stuWrongBook(){
  var sid = CURRENT.id;
  var all = wrongBook(sid);
  var todo = all.filter(function(x){ return !x.solved; });
  var done = all.filter(function(x){ return x.solved; });
  var list = (WB_ST === 'todo') ? todo : (WB_ST === 'done' ? done : all);
  if(WB_SEC !== 'all') list = list.filter(function(x){ return x.section === WB_SEC; });

  var html = head('오답노트', '틀렸던 문제를 모아 다시 보고, 다시 풀어 완전히 내 것으로 만드세요');
  html += '<div class="stats">'
    + card('전체 오답', all.length, '누적 문항')
    + card('아직 못 맞힌 문제', todo.length, '복습 필요', todo.length ? '#ef4444' : '#059669')
    + card('다시 풀어 맞힌 문제', done.length, '해결 완료', '#059669')
    + card('해결률', pct(all.length ? Math.round(done.length / all.length * 100) : 100), done.length + '/' + all.length, '#4f46e5')
    + '</div>';

  var secAgg = {};
  all.forEach(function(x){ secAgg[x.section] = secAgg[x.section] || {t:0, todo:0}; secAgg[x.section].t++; if(!x.solved) secAgg[x.section].todo++; });
  html += '<div class="panel"><h3>영역별 오답 분포</h3>'
    + (all.length ? Object.keys(SECTIONS).map(function(k){
        var v = secAgg[k] || {t:0, todo:0};
        var w = all.length ? Math.round(v.t / all.length * 100) : 0;
        return '<div class="srow"><span class="badge sec-' + k + '">' + SECTIONS[k] + '</span>'
          + '<div class="mini"><div style="width:' + w + '%;background:' + (v.todo ? '#ef4444' : '#059669') + '"></div></div>'
          + '<b>' + v.t + '문항</b><span class="muted" style="font-size:11.5px">미해결 ' + v.todo + '</span></div>';
      }).join('') : '<div class="muted">아직 오답이 없습니다. 테스트를 풀면 여기에 쌓입니다.</div>')
    + '</div>';

  html += '<div class="bar"><div class="filters" id="wbSec">'
    + '<button class="chip' + (WB_SEC==='all'?' on':'') + '" data-ws="all">전체 영역</button>'
    + Object.keys(SECTIONS).map(function(k){ return '<button class="chip' + (WB_SEC===k?' on':'') + '" data-ws="' + k + '">' + SECTIONS[k] + '</button>'; }).join('')
    + '</div><div class="bar-actions">'
    + '<button class="btn ghost" id="wbBack">← 테스트 센터</button>'
    + '<button class="btn ghost" id="wbRetry">이 목록 다시 풀기</button>'
    + '<button class="btn" id="wbPrint">오답노트 저장(인쇄)</button></div></div>';

  html += '<div class="tabs wb-tabs">'
    + '<button class="tab' + (WB_ST==='todo'?' on':'') + '" data-wt="todo">복습 필요 ' + todo.length + '</button>'
    + '<button class="tab' + (WB_ST==='done'?' on':'') + '" data-wt="done">해결 완료 ' + done.length + '</button>'
    + '<button class="tab' + (WB_ST==='all'?' on':'') + '" data-wt="all">전체 ' + all.length + '</button></div>';

  html += '<div class="rv-list wb-list" id="wbList">' + wbItems(list, sid) + '</div>';
  page(html);

  $$('#wbSec [data-ws]').forEach(function(b){ b.onclick = function(){ WB_SEC = b.dataset.ws; stuWrongBook(); }; });
  $$('#page [data-wt]').forEach(function(b){ b.onclick = function(){ WB_ST = b.dataset.wt; stuWrongBook(); }; });
  $('#wbRetry').onclick = function(){
    var qs = list.map(function(x){ return x.q; });
    if(!qs.length){ toast('다시 풀 문제가 없습니다'); return; }
    window._afterQuiz = function(){ go('s-wrong'); };
    var set = shuffle(qs);   /* 전체 오답을 모두 출제 */
    window._againQuiz = function(){ startQuiz(shuffle(qs), {mode:'section', section:'mix'}); };
    startQuiz(set, {mode:'section', section:'mix'});
  };
  $('#wbPrint').onclick = function(){ window.print(); };
  if($('#wbBack')) $('#wbBack').onclick = function(){ go('s-center'); };
  bindWbItems(sid);
}

function wbItems(list, sid){
  if(!list.length) return '<div class="panel"><div class="muted">해당하는 문항이 없습니다.</div></div>';
  var LT = ['A','B','C','D'];
  return list.map(function(x){
    var q = x.q;
    var useOpts = (x.lastOpts && x.lastOpts.length) ? x.lastOpts : (q.options||[]);
    var ansIdx = (x.lastAnsIdx!=null) ? x.lastAnsIdx : q.answer;
    var pickIdx = x.lastPicked;
    if(x.lastAnswerText){ var ai2 = useOpts.indexOf(x.lastAnswerText); if(ai2>=0) ansIdx = ai2; }
    if(x.lastPickedText){ var pi3 = useOpts.indexOf(x.lastPickedText); if(pi3>=0) pickIdx = pi3; }
    var opts = useOpts.map(function(o, oi){
      var isAns = (oi === ansIdx), isPick = (pickIdx!=null && oi === pickIdx);
      var cls = isAns ? (isPick ? 'rv-o ok pick' : 'rv-o ok') : (isPick ? 'rv-o bad' : 'rv-o');
      var tag = '';
      if(isAns && isPick) tag = '<span class="rv-tag ok">정답</span><span class="rv-tag mine">내 답</span>';
      else if(isAns)      tag = '<span class="rv-tag ok">정답</span>';
      else if(isPick)     tag = '<span class="rv-tag bad">내 답</span>';
      return '<div class="' + cls + '"><b>' + LT[oi] + '</b><span>' + esc(o) + '</span>' + tag + '</div>';
    }).join('');
    var memo = wrongMemo(sid, q.id);
    return '<div class="rv-q wb-q' + (x.solved ? ' correct' : '') + '" data-wq="' + q.id + '">'
      + '<div class="rv-h"><span class="badge sec-' + q.section + '">' + SECTIONS[q.section] + '</span>'
      + (q.tag ? '<span class="muted">' + esc(q.tag) + '</span>' : '')
      + '<span class="muted">' + (q.level || 1) + '단계</span>'
      + '<span class="wb-cnt">' + x.wrong + '회 틀림</span>'
      + '<span class="rv-res ' + (x.solved ? 'ok' : 'bad') + '">' + (x.solved ? '해결' : '복습 필요') + '</span></div>'
      + (q.passage ? '<div class="rv-p">' + esc(q.passage) + '</div>' : '')
      + '<div class="rv-s">' + esc(q.stem) + '</div>'
      + '<div class="rv-os">' + opts + '</div>'
      + (typeof qExplainHtml==='function' ? qExplainHtml(q, x.lastPicked) : ('<div class="rv-e"><b>해설</b>' + esc(qExplain(q, x.lastPicked)) + '</div>'))
      + '<div class="wb-memo"><textarea data-wm="' + q.id + '" placeholder="내 메모 — 왜 틀렸는지, 무엇을 외울지 적어두세요">' + esc(memo) + '</textarea>'
      + '<button class="btn ghost rptmini" data-wms="' + q.id + '">메모 저장</button>'
      + '<span class="muted wb-last">최근 응시 ' + esc(x.last || '-') + '</span></div>'
      + '</div>';
  }).join('');
}
function bindWbItems(sid){
  $$('#page [data-wms]').forEach(function(b){
    b.onclick = function(){
      var qid = b.dataset.wms;
      var ta = document.querySelector('[data-wm="' + qid + '"]');
      wrongMemo(sid, qid, ta ? ta.value : '');
      toast('메모를 저장했습니다');
    };
  });
}

/* ---------- 세부영역(유형)별 무한 테스트 ---------- */
/* 각 영역의 세부유형 목록과 보유 문항 수 */
function subElements(section){
  var m = {};
  QUESTIONS.forEach(function(q){
    if(q.section !== section) return;
    var el = (typeof elementOf==='function') ? elementOf(q.section, q.tag) : (q.tag||'기타');
    m[el] = (m[el]||0) + 1;
  });
  return Object.keys(m).map(function(k){ return {name:k, n:m[k]}; }).sort(function(a,b){ return b.n-a.n; });
}
function pickBySub(section, sub, n, level){  /* 보기 순서 자동 변형 */
  var pool = QUESTIONS.filter(function(q){
    if(q.section !== section) return false;
    if(level && Math.abs((q.level||2)-level) > 1) return false;
    var el = (typeof elementOf==='function') ? elementOf(q.section, q.tag) : (q.tag||'기타');
    return el === sub;
  });
  if(!pool.length) return [];
  return (typeof varySet==='function'?varySet(shuffle(pool).slice(0, n || 10)):shuffle(pool).slice(0, n || 10));
}
/* 내 약점 세부유형 (최근 응시 기준) */
function myWeakSubs(sid, limit){
  var agg = {};
  (DB.sessions||[]).filter(function(s){ return s.studentId===sid; }).forEach(function(s){
    (s.detail||[]).forEach(function(d){
      var q = qById(d.id); if(!q) return;
      var el = (typeof elementOf==='function') ? elementOf(q.section, q.tag) : (q.tag||'기타');
      var k = q.section + '|' + el;
      agg[k] = agg[k] || {section:q.section, sub:el, r:0, t:0};
      agg[k].t++; if(d.correct) agg[k].r++;
    });
  });
  return Object.keys(agg).map(function(k){
    var x = agg[k]; return {section:x.section, sub:x.sub, rate:Math.round(x.r/x.t*100), t:x.t};
  }).filter(function(x){ return x.t >= 2; })
    .sort(function(a,b){ return a.rate - b.rate; })
    .slice(0, limit || 6);
}

/* ---------- 학생 성장 곡선 (누적 정답률 추이) ---------- */
function growthSeries(sid){
  var sess = (DB.sessions||[]).filter(function(s){ return s.studentId===sid && s.total; })
             .slice().sort(function(a,b){ return (a.date||'').localeCompare(b.date||''); });
  if(!sess.length) return {labels:[], mine:[], cum:[], byDate:[]};
  var byDate = {};
  sess.forEach(function(s){
    var d = s.date || '';
    byDate[d] = byDate[d] || {r:0, t:0};
    byDate[d].r += (s.score||0); byDate[d].t += (s.total||0);
  });
  var dates = Object.keys(byDate).sort();
  var mine = dates.map(function(d){ return Math.round(byDate[d].r / byDate[d].t * 100); });
  var cum = [], ar = 0, at = 0;
  dates.forEach(function(d){ ar += byDate[d].r; at += byDate[d].t; cum.push(Math.round(ar/at*100)); });
  return {labels: dates.map(function(d){ return d.slice(5).replace('-','/'); }), mine:mine, cum:cum, dates:dates};
}
function growthHtml(sid, canvasId){
  var g = growthSeries(sid);
  if(!g.labels.length) return '<div class="muted">응시 기록이 쌓이면 성장 곡선이 표시됩니다.</div>';
  var first = g.cum[0], last = g.cum[g.cum.length-1], diff = last - first;
  return '<canvas id="' + (canvasId||'gGrow') + '" width="560" height="240"></canvas>'
    + '<div class="grow-meta"><span>첫 응시 <b>' + first + '%</b></span>'
    + '<span>현재 누적 <b>' + last + '%</b></span>'
    + '<span class="' + (diff>=0?'up':'down') + '">' + (diff>=0?'▲ ':'▼ ') + Math.abs(diff) + '%p</span>'
    + '<span class="muted">' + g.labels.length + '회 응시</span></div>'
    + '<p class="muted" style="font-size:11.5px;margin-top:6px">보라색 = 누적 정답률(성장 곡선) · 회색 점선 = 그날의 정답률</p>';
}
function drawGrowth(sid, canvasId){
  var g = growthSeries(sid);
  var cv = document.getElementById(canvasId||'gGrow');
  if(!cv || !g.labels.length) return;
  if(typeof lineChart === 'function'){
    lineChart(cv, g.labels, [
      {color:'#94a3b8', dash:true, data:g.mine},
      {color:'#7c3aed', data:g.cum}
    ]);
  }
}
