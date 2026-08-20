/* ===================== 이룸편입 LMS · INSTRUCTOR + STUDENT VIEWS ===================== */
function instDash(){
 const my=acf(DB.students).filter(function(s){return s.instructorId===CURRENT.id;});
 const today=todayStr();
 const lecCount=(acf(DB.lectures)||[]).length;
 const asOpen=(acf(DB.assessments)||[]).filter(function(a){return (a.openDate||today)<=today;}).length;
 var ungraded=0; (acf(DB.assessments)||[]).forEach(function(a){ var sc=(DB.scores||{})[a.id]||{}; my.forEach(function(s){ var r=sc[s.id]; if(typeof isCleared==='function'&&isCleared(r)) r=null; if(r&&r.submittedAt&&r.score==null) ungraded++; }); });
 var qn=(DB.questionsToTeacher||[]).filter(function(q){ return !q.answer && my.some(function(s){return s.id===q.studentId;}); }).length;
 var avgRate=my.length?Math.round(my.reduce(function(a,s){ return a+((typeof VOD!=='undefined')?VOD.summary(s.id).rate:0); },0)/my.length):0;
 let html=head('강사 대시보드','담당 학생의 강의 이수와 평가 현황을 확인합니다');
 html+=(typeof quoteHtml==='function' ? quoteHtml() : '');
 html+='<div class="stats">'+card('내 학생',my.length+'명','담당 수강생')
  +card('평균 이수율',pct(avgRate),'2회독 인정',avgRate>=70?'var(--ok)':'var(--warn)')
  +card('채점 대기',ungraded+'건','점수 입력 필요',ungraded?'var(--warn)':'var(--ok)')
  +card('미답변 질문',qn+'건','학생 질문',qn?'var(--bad)':'var(--dim)')+'</div>';
 var _fbN=(DB.submissions||[]).filter(function(x){return my.some(function(s){return s.id===x.studentId;}) && x.status!=='graded';}).length;
 html+='<div class="grid2"><div class="panel"><h3>오늘 할 일</h3>'
  +[['채점 대기',ungraded,'t-grade'],['과제 첨삭 대기',_fbN,'t-grading'],['학생 질문',qn,'t-qna'],['등록 강의',lecCount,'t-vod']]
    .map(function(r){ var on=r[1]>0;
      return '<div class="chk-row" data-goto="'+r[2]+'"><span class="chk-dot" style="background:'+(on?'var(--warn)':'var(--dim)')+'"></span>'
        +'<b>'+r[0]+'</b><span class="chk-n" style="color:'+(on?'var(--warn)':'var(--dim)')+'">'+r[1]+'</span>'
        +'<button class="lnk" data-goto="'+r[2]+'">이동</button></div>'; }).join('')
  +'</div>'
  +'<div class="panel"><h3>오늘 학생 점검</h3>'
  +'<div class="bar-actions" style="margin-bottom:10px"><button class="btn ghost rptmini" onclick="go(\'t-cal\')">루틴 · 일정</button>'
  +'<button class="btn ghost rptmini" onclick="go(\'t-control\')">실시간 관제</button></div>'
  +'<div class="tbl-wrap"><table class="tbl"><thead><tr><th>학생</th><th>오늘 루틴</th><th>2회독</th><th>과제</th><th>평가</th></tr></thead><tbody>'
  +(my.length?my.map(function(st){
      var pr=(typeof dailyProgress==='function')?dailyProgress(st.id,today):{done:0,total:0};
      var sm=(typeof VOD!=='undefined')?VOD.summary(st.id):{twice:0,total:0};
      var hw=DB.submissions.some(function(x){return x.studentId===st.id&&x.date===today;});
      var asDone=0,asAll=0;
      (acf(DB.assessments)||[]).forEach(function(a){ if((a.openDate||today)<=today){ asAll++; var r=((DB.scores||{})[a.id]||{})[st.id]; if(typeof isCleared==='function'&&isCleared(r)) r=null; if(r&&r.submittedAt) asDone++; } });
      var prCol = (pr.total && pr.done>=pr.total)?'#059669':(pr.done?'#d97706':'#ef4444');
      return '<tr><td><b>'+esc(st.name)+'</b></td>'
        +'<td><b style="color:'+prCol+'">'+pr.done+'/'+pr.total+'</b></td>'
        +'<td>'+sm.twice+'/'+sm.total+'</td>'
        +'<td>'+(hw?'제출':'<span class="muted">미제출</span>')+'</td>'
        +'<td>'+asDone+'/'+asAll+'</td></tr>';
    }).join(''):'<tr><td colspan="5" class="muted">담당 학생이 없습니다.</td></tr>')
  +'</tbody></table></div></div>'
  +'<div class="panel"><h3>내 학생 현황 <small class="muted">(2회독 진행)</small></h3>'+(my.length?my.map(function(s){ var sm=(typeof VOD!=='undefined')?VOD.summary(s.id):{rate:0,twice:0,total:0};
      return '<div class="srow"><span>'+esc(s.name)+'</span><div class="mini"><div style="width:'+sm.rate+'%;background:'+(sm.rate>=80?'#059669':sm.rate>=50?'#d97706':'#ef4444')+'"></div></div><b>'+sm.twice+'/'+sm.total+'</b></div>';
    }).join(''):'<div class="muted">담당 학생이 없습니다.</div>')+'</div></div>';
 page(html);
}

function instStudents(){
 const my=acf(DB.students).filter(function(s){return s.instructorId===CURRENT.id;});
 let html=head('내 학생','담당 학생의 현황입니다');
 html+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>이름</th><th>반</th><th>목표</th><th>누적 정답률</th><th>세션</th><th></th></tr></thead><tbody>'+(my.map(function(s){ const sess=DB.sessions.filter(function(x){return x.studentId===s.id;}); const avg=sess.length?Math.round(sess.reduce(function(a,b){return a+b.rate;},0)/sess.length):0;
 return '<tr><td><b>'+esc(s.name)+'</b></td><td><span class="pill" style="--c:'+(s.cls?tierColor(s.cls):'#94a3b8')+'">'+(s.cls?tierName(s.cls):'미배정')+'</span></td><td>'+esc(s.goalSchool||'-')+'</td><td>'+(sess.length?pct(avg):'-')+'</td><td>'+sess.length+'</td><td><button class="btn rptmini" data-r="'+s.id+'">리포트</button> <button class="lnk" data-v="'+s.id+'">상세</button></td></tr>'; }).join('')||'<tr><td colspan="6" class="muted">담당 학생이 없습니다.</td></tr>')+'</tbody></table></div>';
 page(html); $$('#page [data-v]').forEach(function(b){b.onclick=function(){studentDetail(b.dataset.v);};}); $$('#page [data-r]').forEach(function(b){b.onclick=function(){downloadReport(b.dataset.r);};});
}
var IQ_SEC='all';
function instQuestions(){
 let html=head('문제 관리','문제은행을 조회하고 새 문제를 추가합니다');
 html+='<div class="bar"><div class="filters">'+['all','vocab','grammar','reading','logic'].map(function(s){return '<button class="chip '+(s===IQ_SEC?'on':'')+'" data-s="'+s+'">'+(s==='all'?'전체':SECTIONS[s])+'</button>';}).join('')+'</div><button class="btn" id="addQ">+ 문제 추가</button></div>';
 html+='<div class="muted" id="qcount"></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>섹션</th><th>단계</th><th>유형</th><th>문제</th><th>정답</th></tr></thead><tbody id="qBody"></tbody></table></div>';
 page(html);
 let sec=IQ_SEC||'all';
 function draw(){ const rows=QUESTIONS.filter(function(q){return sec==='all'||q.section===sec;});
 $('#qcount').textContent='총 '+fmtNum(rows.length)+'문항 (표시: 200)';
 $('#qBody').innerHTML=rows.slice(0,200).map(function(q){return '<tr><td><span class="badge sec-'+q.section+'">'+SECTIONS[q.section]+'</span></td><td>'+q.level+'단계</td><td>'+esc(q.tag||'-')+'</td><td class="qcell">'+esc(q.stem.slice(0,70))+'</td><td><b>'+'ABCD'[q.answer]+'</b></td></tr>';}).join(''); }
 draw();
 $$('.chip').forEach(function(c){c.onclick=function(){ $$('.chip').forEach(function(x){x.classList.remove('on');}); c.classList.add('on'); sec=IQ_SEC=c.dataset.s; draw(); };});
 $('#addQ').onclick=function(){ openModal(el('<div class="form"><h3>문제 추가</h3>'
 + '<label>섹션<select id="q_sec">'+Object.entries(SECTIONS).map(function(e){return '<option value="'+e[0]+'">'+e[1]+'</option>';}).join('')+'</select></label>'
 + '<div class="frow"><label>단계<select id="q_lvl"><option>1</option><option selected>2</option><option>3</option></select></label><label>유형<input id="q_tag" placeholder="예: 수일치"></label></div>'
 + '<label>지문(선택)<textarea id="q_pass"></textarea></label><label>문제 *<textarea id="q_stem"></textarea></label>'
 + ['A','B','C','D'].map(function(x){return '<label>보기 '+x+' *<input id="q_o'+x+'"></label>';}).join('')
 + '<label>정답<select id="q_ans"><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select></label>'
 + '<label>해설<textarea id="q_exp"></textarea></label>'
 + '<div class="quiz-nav"><button class="btn ghost" id="q_cancel">취소</button><button class="btn" id="q_save">저장</button></div></div>'));
 $('#q_cancel').onclick=closeModal;
 $('#q_save').onclick=function(){ const stem=$('#q_stem').value.trim(); const opts=['A','B','C','D'].map(function(x){return $('#q_o'+x).value.trim();}); if(!stem||opts.some(function(o){return !o;}))return alert('문제/보기는 필수입니다');
 QUESTIONS.push({id:Math.max.apply(null,QUESTIONS.map(function(q){return q.id;}))+1,section:$('#q_sec').value,level:+$('#q_lvl').value,tag:$('#q_tag').value||null,passage:$('#q_pass').value||undefined,stem:stem,options:opts,answer:+$('#q_ans').value,explanation:$('#q_exp').value}); closeModal(); draw(); toast('문제가 추가되었습니다 (세션 내 유지)'); }; };
}

/* 내 학생 기록. 관리자가 계정을 지웠거나 아직 동기화되지 않아 못 찾는 경우에도
   화면이 백지가 되지 않도록 최소한의 임시 기록을 돌려줍니다. */
function myStu(){
  var id = (typeof CURRENT!=='undefined' && CURRENT) ? CURRENT.id : '';
  var f = (acf(DB.students)||[]).filter(function(s){ return s && s.id===id; })[0];
  if(f) return f;
  return { id:id, name:(CURRENT&&CURRENT.name)||'학생', cls:null, instructorId:null,
           cohortId:null, goalSchool:'', goalDept:'', _missing:true };
}
function myLevel(){ return acf(DB.levelTests).filter(function(t){return t.studentId===CURRENT.id;}).slice(-1)[0]; }
function mySessions(){ return DB.sessions.filter(function(s){return s.studentId===CURRENT.id;}); }



function stuLevel(){
 const lt=myLevel();
 let html=head('레벨테스트','40문제를 풀고 나의 수준에 맞는 반(A/B/C)을 배정받습니다');
 html+=(typeof quoteHtml==='function' ? quoteHtml() : '');
 if(CURRENT.role==='test'){ html+='<div class="bar"><div class="muted">체험 진단 계정 — 레벨테스트(40문항) 응시 후 [진단 리포트]에서 분석 결과를 확인/다운로드할 수 있습니다.</div><button class="btn ghost" id="demoReset">체험 초기화</button></div>'; }
 html+='<div class="panel"><h3>영어 6단계 로드맵</h3><p class="muted" style="margin:2px 0 14px">진단 결과에 따라 6단계 중 적절한 단계로 배정되며, 단계별로 아래 A·B·C반과 연결됩니다.</p>'+roadmapHtml(studentLevel(myStu()))+'<div class="lv-map">'+'<div class="lv-map-i"><b>1~2단계</b><span>Beginner · Lower-Int</span><i style="--c:'+TIERS.C.color+'">C반 · 일반 대학</i></div>'+'<div class="lv-map-i"><b>3~4단계</b><span>Intermediate · Upper-Int</span><i style="--c:'+TIERS.B.color+'">B반 · 서울권 상위</i></div>'+'<div class="lv-map-i"><b>5~6단계</b><span>Pre-Final · Final</span><i style="--c:'+TIERS.A.color+'">A반 · SKY</i></div>'+'</div></div>';
 html+='<div class="tiers">'+['A','B','C'].map(function(c){return '<div class="tier" style="--c:'+tierColor(c)+'"><div class="tdot"></div><b>'+tierName(c)+'</b><small>'+tierOf(c).sub+'</small><span>정답률 '+(c==='A'?'80%↑':c==='B'?'60~79%':'60%↓')+'</span></div>';}).join('')+'</div>';
 html+='<div class="panel"><h3>안내</h3><p style="margin:2px 0 18px">어휘·문법·독해·논리 4개 영역 각 10문제 · 총 40문제 · 제한시간 60분 · 즉시 결과 확인 후 반 자동 배정.</p>'
 + (CURRENT.role==='test'?('<div class="frow"><label>이름 *<input id="lt_name" value="'+esc((myStu().name==='체험 진단'||/^테스트\(/.test(myStu().name||''))?'':myStu().name)+'" placeholder="응시자 이름" required></label><label>연락처 *<input id="lt_phone" value="'+esc(myStu().phone||'')+'" placeholder="010-0000-0000" required></label></div>'):'')
 + '<div class="frow"><label>희망 학교<input id="lt_gs" value="'+esc(myStu().goalSchool||'')+'"></label><label>희망 학과<input id="lt_gd" value="'+esc(myStu().goalDept||'')+'"></label></div>'
 + (function(){ var al=ltAllowed(myStu(), CURRENT.role);
     if(al.ok) return '<button class="btn big" id="ltStart">레벨테스트 시작</button>'
       + (al.grant?'<div class="lt-open-msg">관리자가 개별 응시를 허용했습니다. 지금 응시할 수 있습니다.</div>'
         : (CURRENT.role==='student' && ltCfg().open ? '<div class="lt-open-msg">'+esc(ltCfg().note||'정기 레벨테스트 응시 기간입니다.')+(ltWindowText()?(' ('+ltWindowText()+')'):'')+'</div>' : ''));
     return '<button class="btn big" id="ltStart" disabled>레벨테스트 시작</button>'
       + '<div class="lt-lock"><b>지금은 응시할 수 없습니다</b>'
       + '<p>'+esc(al.why)+'. 레벨테스트는 <b>월 1회 정기 시행</b>되며, 시행일에 이룸편입에서 응시를 개방합니다.</p>'
       + (ltCfg().note?('<p class="lt-note">'+esc(ltCfg().note)+'</p>'):'')
       + '<p class="muted">응시가 필요하면 담당 선생님께 문의해 주세요.</p></div>'; })()
 + '</div>';
 if(lt){ html+='<div class="panel"><h3>최근 결과</h3>'+levelTableHtml([lt])+'<button class="btn ghost" onclick="go(\'s-grade\')">상세 분석 보기 →</button></div>'; }
 page(html);
 if($('#ltStart')) $('#ltStart').onclick=function(){ const gs=$('#lt_gs').value, gd=$('#lt_gd').value; const s=myStu();
 var al=ltAllowed(s, CURRENT.role); if(!al.ok){ toast('지금은 레벨테스트를 응시할 수 없습니다'); return; }
 if(al.grant) ltUseGrant(s.id);
 if(CURRENT.role==='test'){ var nm=(($('#lt_name')||{}).value||'').trim(); if(!nm){ alert('응시자 이름을 입력해 주세요'); return; } var ph=(($('#lt_phone')||{}).value||'').trim(); if(!ph){ alert('연락처를 입력해 주세요'); return; } s.name=nm; s.phone=ph; CURRENT.name=nm; sessionStorage.setItem('eroom_cur', JSON.stringify(CURRENT)); }
 s.goalSchool=gs; s.goalDept=gd; save();
 startQuiz(levelTestSet(),{mode:'level',gs:gs,gd:gd}); };
 if($('#demoReset')) $('#demoReset').onclick=function(){ if(!confirm('이 체험 계정의 이전 응시·진단 기록을 모두 초기화할까요?')) return; const id=CURRENT.id; DB.sessions=DB.sessions.filter(function(x){return x.studentId!==id;}); DB.levelTests=DB.levelTests.filter(function(x){return x.studentId!==id;}); const s=DB.students.find(function(x){return x.id===id;}); if(s){ s.cls=null; s.level=null; s.goalSchool=''; s.goalDept=''; } save(); toast('체험 계정이 초기화되었습니다'); stuLevel(); };
}
function finishLevelTest(g){
 const s=myStu(); const place=AI.placeClass(g.rate);
 s.cls=place.cls; save();
 const sections={}; for(const k of Object.keys(SECTIONS)) sections[k]=g.secAgg[k]?g.secAgg[k].right:0;
 const rec={id:uid('lt'),studentId:s.id,name:s.name,score:g.right,rate:g.rate,cls:place.cls,sections:sections,goalSchool:s.goalSchool,goalDept:s.goalDept,date:todayStr()};
 DB.levelTests.push(rec); save();
 DB.sessions.push({id:uid('se'),studentId:s.id,type:'level',section:'mix',score:g.right,total:g.total,rate:g.rate,date:todayStr(),detail:g.detail}); save();
 const match=AI.schoolMatch(g.rate, s.goalSchool);
 let html='<div class="result"><div class="res-head"><div class="res-score" style="--c:'+place.color+'"><b>'+place.cls+'</b><span>반 배정</span></div>'
 + '<div><div class="res-rate">'+pct(g.rate)+'</div><div class="muted">'+g.right+'/40 · '+place.name+'</div></div></div>'
 + '<div class="aibox"><b>배정 분석</b><p>'+esc(place.reason)+'</p></div>'
 + '<h4>영역별 점수</h4>'+Object.entries(sections).map(function(e){return '<div class="srow"><span>'+SECTIONS[e[0]]+'</span><div class="mini"><div style="width:'+(e[1]*10)+'%"></div></div><b>'+e[1]+'/10</b></div>';}).join('')
 + '<h4>지원 가능 대학 분석</h4><div class="schools">'+match.list.slice(0,9).map(function(u){return '<div class="sch band-'+u.band+'"><b>'+esc(u.uni)+'</b><span class="pill" style="--c:'+tierColor(u.tier)+'">'+u.band+'</span><small>경쟁률 '+u.ratio+' · 모집 '+u.quota+'</small></div>';}).join('')+'</div>'
 + (match.goalNote?'<div class="aibox"><b>목표: '+esc(match.goalNote.uni)+'</b><p>'+esc(match.goalNote.msg)+'</p></div>':'')
 + '<div class="aibox"><b>상세 진단 리포트</b><p>세부 요소별 분석을 포함한 PDF 리포트는 담당 강사·관리자가 발급합니다.</p></div>'
 + '<div class="quiz-nav"><button class="btn" id="ltDone">진단 리포트 보기 →</button></div></div>';
 openModal(el('<div></div>')); $('#modal .modal-card').innerHTML=html;
 $('#ltDone').onclick=function(){ closeModal(); go('s-grade'); };
}

/* ---------- 테스트 센터 ----------
   ① 바로 시작  ② 훈련 코스  ③ 다시 풀기  ④ 지난 기록
   설명 문장은 구역마다 한 줄까지만 둡니다. */
function ctWeakChips(){
  var wk = (typeof myWeakSubs==='function') ? myWeakSubs(CURRENT.id, 6) : [];
  if(!wk.length) return '';
  return '<div class="sec"><h2>내 약점 유형</h2><span>눌러서 바로 풀기</span></div>'
    + '<div class="tchips">'
    + wk.map(function(x){
        var c = x.rate>=80?'c-ok':(x.rate>=60?'c-warn':'c-bad');
        return '<button class="tchip '+c+'" data-ws2="'+x.section+'|'+esc(x.sub)+'">'
          + SECTIONS[x.section] + ' · ' + esc(x.sub) + ' <b>' + x.rate + '%</b></button>';
      }).join('')
    + '</div>';
}
function ctCourse(o){
  return '<div class="course" style="--c:'+o.color+'">'
    + '<b>'+o.title+'</b><div class="c-sub">'+o.sub+'</div>'
    + '<div class="c-num">'+o.nums+'</div>'
    + '<div class="c-go">'+o.btns+'</div></div>';
}
var CT_SEC='vocab', CT_SUB='', CT_N=10;
function stuCenter(){
  var html = head('테스트 센터', '바로 풀거나, 코스를 골라 훈련하세요');

  /* ── ① 바로 시작 ── */
  html += '<div class="sec"><h2>바로 시작</h2><span>누르면 곧바로 출제됩니다</span></div>'
    + '<div class="tiles">'
    + Object.keys(SECTIONS).map(function(k){
        return '<button class="tile" data-mode="sec" data-s="'+k+'">'
          + '<b>'+SECTIONS[k]+'</b><span>10문제</span></button>';
      }).join('')
    + '<button class="tile" data-mode="mix"><b>종합</b><span>전 영역 20문제</span></button>'
    + '<button class="tile" id="adaptive"><b>맞춤 추천</b><span>약한 유형 위주 10문제</span></button>'
    + '</div>';

  /* ── ② 훈련 코스 ── */
  var courses = [];

  /* 빈출 숙어 */
  var idN = (typeof IDIOMS!=='undefined') ? IDIOMS.length : 0;
  var idKn = 0, idMs = 0;
  if(typeof idStore==='function'){ var iv=idStore(); idKn=Object.keys(iv.known).length; idMs=Object.keys(iv.miss).length; }
  courses.push(ctCourse({
    color:'var(--pri)', title:'빈출 숙어', sub:'구동사 · 전치사구 · 관용표현',
    nums:'<span>전체 <b>'+idN+'</b></span><span>외움 <b>'+idKn+'</b></span>'
       + (idMs?('<span>복습 <b>'+idMs+'</b></span>'):''),
    btns:'<button class="btn rptmini" id="idmGo">열기</button>'
       + '<button class="btn ghost rptmini" id="idmQuick">10문제</button>'
       + (idMs?'<button class="btn ghost rptmini" id="idmMiss">틀린 것만</button>':'')
  }));

  /* 학교별 빈출 */
  if(typeof uniList==='function'){
    var L=uniList(), goal=(typeof uniMyGoal==='function')?uniMyGoal():'';
    var uN=QUESTIONS.filter(function(q){return q.unis;}).length;
    courses.push(ctCourse({
      color:'var(--info)', title:'학교별 빈출', sub: goal ? ('내 목표 대학 '+esc(goal)) : '목표 대학을 정하면 자동으로 골라줍니다',
      nums:'<span>대학 <b>'+L.length+'</b></span><span>문항 <b>'+uN+'</b></span>',
      btns:'<button class="btn rptmini" id="unmGo">열기</button>'
         + (goal?'<button class="btn ghost rptmini" id="unmMy">목표교 20문제</button>':'')
         + '<button class="btn ghost rptmini" id="unmCom">공통 빈출</button>'
    }));
  }

  /* 독해 약점공략 */
  if(typeof rdStats==='function'){
    var st=rdStats();
    var done=st.filter(function(x){ return x.rate!=null; });
    var worst=done.slice().sort(function(a,b){ return a.rate-b.rate; })[0];
    courses.push(ctCourse({
      color:'var(--ok)', title:'독해 약점공략', sub:'주제 · 세부내용 · 추론 · 문맥어휘',
      nums: worst ? ('<span>가장 약한 유형 <b>'+esc(worst.key)+' '+worst.rate+'%</b></span>')
                  : '<span>아직 진단 전</span>',
      btns:'<button class="btn rptmini" id="rdmGo">열기</button>'
         + '<button class="btn ghost rptmini" id="rdmWeak">약한 유형 10문제</button>'
    }));
  }

  /* 세부유형 집중 */
  courses.push(ctCourse({
    color:'var(--warn)', title:'세부유형 집중', sub:'원하는 유형만 반복해서 풀기',
    nums:'<label class="ct-pick">영역<select id="subSec">'
       + Object.keys(SECTIONS).map(function(k){ return '<option value="'+k+'"'+(CT_SEC===k?' selected':'')+'>'+SECTIONS[k]+'</option>'; }).join('')
       + '</select></label>'
       + '<label class="ct-pick">유형<select id="subEl"></select></label>'
       + '<label class="ct-pick">문항<select id="subN">'
       + [10,15,20,30].map(function(n){ return '<option'+(CT_N===n?' selected':'')+'>'+n+'</option>'; }).join('')
       + '</select></label>',
    btns:'<button class="btn rptmini" id="subStart">이 유형만 풀기</button>'
  }));

  html += '<div class="sec"><h2>훈련 코스</h2><span>들어가서 이어서 훈련합니다</span></div>'
    + '<div class="courses">' + courses.join('') + '</div>';

  /* ── 내 약점 유형 ── */
  html += ctWeakChips();

  /* ── ③ 다시 풀기 ── */
  var wrongN = (typeof allWrongQuestions==='function') ? (allWrongQuestions(CURRENT.id)||[]).length : 0;
  html += '<div class="sec"><h2>다시 풀기</h2><span>같은 문제를 두 번 맞히면 내 것이 됩니다</span></div>'
    + '<div class="row-act">'
    + '<button class="btn" id="wrong7">지난주 오답</button>'
    + '<button class="btn ghost" id="wrongAll">전체 오답'+(wrongN?(' '+wrongN+'문항'):'')+'</button>'
    + '<button class="btn ghost" onclick="go(\'s-wrong\')">오답노트</button>'
    + '</div>';

  /* ── ④ 지난 기록 ── */
  html += '<div class="sec"><h2>지난 응시 기록</h2><span>문제 · 해설 · 시험지 다시보기</span></div>'
    + (typeof sessionHistoryHtml==='function' ? sessionHistoryHtml(20) : '');

  /* 학교별(반 수준) 테스트는 학교별 빈출로 대체되어 숨은 진입점만 남깁니다 */
  html += '<div style="display:none"><select id="schoolSel">'
    + ['A','B','C'].map(function(c){ return '<option value="'+c+'">'+tierName(c)+'</option>'; }).join('')
    + '</select><button id="schoolTest"></button></div>';

 page(html);
 if(typeof bindSessionHistory==='function') bindSessionHistory();
 /* 세부유형 선택 */
 function fillSubs(){
   var sec=$('#subSec').value, list=(typeof subElements==='function')?subElements(sec):[];
   $('#subEl').innerHTML = list.length
     ? list.map(function(x){ return '<option value="'+esc(x.name)+'"'+(CT_SUB===x.name?' selected':'')+'>'+esc(x.name)+'</option>'; }).join('')
     : '<option value="">문항 없음</option>';
   if(CT_SUB && list.some(function(x){ return x.name===CT_SUB; })) $('#subEl').value = CT_SUB;
 }
 if($('#subSec')){
   fillSubs();
   $('#subSec').onchange=function(){ CT_SEC=$('#subSec').value; CT_SUB=''; fillSubs(); CT_SUB=$('#subEl').value; };
 }
 if($('#subEl')) $('#subEl').onchange=function(){ CT_SUB=$('#subEl').value; };
 if($('#subN')) $('#subN').onchange=function(){ CT_N=+$('#subN').value||10; };
 if($('#subStart')) $('#subStart').onclick=function(){
   var sec=$('#subSec').value, sub=$('#subEl').value, n=+$('#subN').value||10;
   var qs=(typeof pickBySub==='function')?pickBySub(sec,sub,n):[];
   if(!qs.length){ toast('해당 유형의 문제가 없습니다'); return; }
   run(qs,'section',sec);
 };
 $$('#page [data-ws2]').forEach(function(b){ b.onclick=function(){
   var p=b.dataset.ws2.split('|'), qs=(typeof pickBySub==='function')?pickBySub(p[0],p[1],10):[];
   if(!qs.length){ toast('해당 유형의 문제가 없습니다'); return; }
   run(qs,'section',p[0]); }; });
 if($('#unmGo'))  $('#unmGo').onclick=function(){ go('s-uni'); };
 if($('#unmMy'))  $('#unmMy').onclick=function(){
   var g=(typeof uniMyGoal==='function')?uniMyGoal():'';
   if(!g){ toast('학생 정보에 목표 대학이 없습니다 — 학교별 빈출에서 직접 고르세요'); go('s-uni'); return; }
   var qs=uniBank(g); if(!qs.length){ toast('해당 대학 문항이 없습니다'); return; }
   uniRun(shuffle(qs.slice()).slice(0,20), g); };
 if($('#unmCom')) $('#unmCom').onclick=function(){
   var qs=(typeof uniCommon==='function')?uniCommon(2):[];
   if(!qs.length){ toast('공통 빈출 문항이 없습니다'); return; }
   uniRun(shuffle(qs).slice(0,20), '공통 빈출'); };
 if($('#idmGo'))   $('#idmGo').onclick=function(){ go('s-idiom'); };
 if($('#idmQuick')) $('#idmQuick').onclick=function(){
   var qs=(typeof idBuildTest==='function')?idBuildTest(10,'all','all','mix'):[];
   if(!qs.length){ toast('출제할 숙어가 없습니다'); return; }
   window._afterQuiz=function(){ if(typeof idAfter==='function') idAfter(); go('s-center'); };
   window._againQuiz=function(){ startQuiz(qs,{mode:'section',section:'vocab'}); };
   startQuiz(qs,{mode:'section',section:'vocab'}); };
 if($('#idmMiss')) $('#idmMiss').onclick=function(){
   var v=(typeof idStore==='function')?idStore():{miss:{}};
   if(!Object.keys(v.miss||{}).length){ toast('틀린 숙어가 없습니다. 잘하고 있어요.'); return; }
   var qs=idBuildTest(10,'all','miss','mix');
   window._afterQuiz=function(){ if(typeof idAfter==='function') idAfter(); go('s-center'); };
   window._againQuiz=function(){ startQuiz(qs,{mode:'section',section:'vocab'}); };
   startQuiz(qs,{mode:'section',section:'vocab'}); };
 if($('#rdmGo'))   $('#rdmGo').onclick=function(){ go('s-read'); };
 if($('#rdmWeak')) $('#rdmWeak').onclick=function(){
   var w=(typeof rdWeakest==='function')?rdWeakest():null;
   if(!w){ toast('독해 문제를 몇 개 풀면 약한 유형을 찾아드립니다'); if(typeof rdRun==='function') rdRun('all',0,10); return; }
   rdRun(w.key,0,10); };
 $$('#page [data-rdq]').forEach(function(b){ b.onclick=function(){ if(typeof rdRun==='function') rdRun(b.dataset.rdq,0,10); }; });
 if($('#wrong7')) $('#wrong7').onclick=function(){
   var qs=recentWrongQuestions(CURRENT.id,7,20);
   if(!qs.length){ toast('지난주 오답이 없습니다. 잘하고 있어요.'); return; }
   run(typeof varySet==='function'?varySet(shuffle(qs)):shuffle(qs),'section','mix'); };
 if($('#wrongAll')) $('#wrongAll').onclick=function(){
   var qs=allWrongQuestions(CURRENT.id);
   if(!qs.length){ toast('아직 오답 기록이 없습니다.'); return; }
   toast('오답 '+qs.length+'문항을 모두 출제합니다');
   run(typeof varySet==='function'?varySet(shuffle(qs)):shuffle(qs),'section','mix'); };
 /* 달력·홈에서 넘어온 실행 요청 처리 */
 (function(){
   var act = window._centerAct; window._centerAct='';
   if(!act) return;
   setTimeout(function(){
     if(act==='vocab')      run(pickQuestions('vocab',10),'section','vocab');
     else if(act==='daily') run(pickQuestions('vocab',10),'daily','vocab');
     else if(act==='mix'){ var qs=[]; Object.keys(SECTIONS).forEach(function(x){qs=qs.concat(pickQuestions(x,5));}); run(shuffle(qs),'mix'); }
     else if(act==='adaptive') run(AI.recommend(CURRENT.id,10),'adaptive');
     else if(act==='school'){ var st=myStu(); var lvl=st&&st.cls==='A'?3:(st&&st.cls==='B'?2:1); var q2=[]; Object.keys(SECTIONS).forEach(function(x){q2=q2.concat(pickQuestions(x,3,lvl));}); run(shuffle(q2),'school'); }
     else if(act==='wrong'){ var w=recentWrongQuestions(CURRENT.id,7,20); if(w.length) run(shuffle(w),'section','mix'); else toast('지난주 오답이 없습니다.'); }
     else if(act==='review'){ var last=(DB.sessions||[]).filter(function(x){return x.studentId===CURRENT.id&&(x.detail||[]).length;}).slice(-1)[0]; if(last) sessionReview(last.id,true); else toast('응시 기록이 없습니다.'); }
   }, 60);
 })();
 function run(qs,mode,sec){ window._afterQuiz=function(){go('s-center');}; window._againQuiz=function(){run(qs,mode,sec);}; startQuiz(qs,{mode:mode,section:sec}); }
 $$('[data-mode="sec"]').forEach(function(b){b.onclick=function(){run(pickQuestions(b.dataset.s,10),'section',b.dataset.s);};});
 $('[data-mode="mix"]').onclick=function(){ let qs=[]; Object.keys(SECTIONS).forEach(function(s){qs=qs.concat(pickQuestions(s,5));}); run(shuffle(qs),'mix'); };
 $('#adaptive').onclick=function(){ run(AI.recommend(CURRENT.id,10),'adaptive'); };
 $('#schoolTest').onclick=function(){ const c=$('#schoolSel').value; const lvl=c==='A'?3:c==='B'?2:1; let qs=[]; Object.keys(SECTIONS).forEach(function(s){qs=qs.concat(pickQuestions(s,3,lvl));}); run(shuffle(qs).slice(0,10),'school'); };
}

/* ---------- 내 성적 ----------
   지표는 위에 3개만 두고, 같은 값을 카드와 표에 겹쳐 쓰지 않습니다. */
function stuGrade(){
 const s=myStu(); const sess=mySessions(); const lt=myLevel();
 const secRates={}; for(const k of Object.keys(SECTIONS)){ let r=0,t=0; sess.forEach(function(se){(se.detail||[]).forEach(function(d){ if(d.section===k){t++; if(d.correct)r++;} });}); if(lt&&t===0&&lt.sections&&lt.sections[k]!=null){ r=lt.sections[k]; t=10; } secRates[k]= t?Math.round(r/t*100):0; }
 const overall=sess.length?Math.round(sess.reduce(function(a,b){return a+b.rate;},0)/sess.length):(lt?lt.rate:0);
 const wk=AI.weakness(secRates);
 const att=attitude(CURRENT.id);
 const _isTest=(CURRENT.role==='test');

 let html=head('내 성적','영역별 강약점과 다음에 무엇을 보강할지 알려드립니다');

 /* 지표 3개 — 나머지는 아래 표와 막대에 이미 있습니다 */
 html+='<div class="stats">'
  + card('전체 정답률', pct(overall), sess.length? (sess.length+'회 평균') : '레벨테스트 기준')
  + card('가장 약한 영역', SECTIONS[wk.weakest.sec], pct(wk.weakest.rate), 'var(--bad)')
  + (_isTest ? card('가장 강한 영역', wk.strong.length?SECTIONS[wk.strongest.sec]:'-', pct(wk.strongest.rate), 'var(--ok)')
             : card('태도(출결)', att.score==null?'-':pct(att.score), att.label,
                    att.score>=75?'var(--ok)':att.score>=60?'var(--warn)':'var(--bad)'))
  + '</div>';

 /* 영역별 — 레이더와 막대를 한 묶음으로 (따로 두면 같은 값을 두 번 읽게 됩니다) */
 html+='<div class="panel"><h3>영역별 정답률</h3><div class="gr-two">'
  + '<div class="gr-bars">'
  + Object.entries(secRates).map(function(e){ const k=e[0],v=e[1];
      const c = v>=80?'var(--ok)':v>=60?'var(--warn)':'var(--bad)';
      return '<div class="srow"><span>'+SECTIONS[k]+'</span><div class="mini"><div style="width:'+v+'%;background:'+c+'"></div></div><b>'+pct(v)+'</b></div>'; }).join('')
  + (_isTest?'':'<div class="srow"><span>태도</span><div class="mini"><div style="width:'+(att.score||0)+'%;background:var(--info)"></div></div><b>'+(att.score==null?'-':pct(att.score))+'</b></div>')
  + '</div>'
  + '<div class="gr-radar"><canvas id="gRadar" width="330" height="280"></canvas></div>'
  + '</div></div>';

 if(_isTest) html+='<div class="lockwrap">';

 /* 다음에 할 일 */
 const plan=AI.studyPlan(secRates, s.cls||'C');
 html+='<div class="panel ai"><h3>맞춤 학습플랜 <small class="muted">'+esc(plan.stage)+'</small></h3>'
 + '<p>'+esc(plan.headline)+'</p>'
 + '<div class="plan">'+plan.plan.map(function(p){return '<div class="pday"><b>'+p.day+'</b><span class="badge sec-'+p.sec+'">'+SECTIONS[p.sec]+'</span><small>'+esc(p.focus)+' '+p.qty+'문제</small></div>';}).join('')+'</div>'
 + '<div class="row-act" style="margin-top:12px"><button class="btn" onclick="go(\'s-center\')">테스트 센터에서 풀기</button></div></div>';

 /* 세부 요소별 */
 const da=AI.detailAnalysis(CURRENT.id);
 html+='<div class="panel"><h3>세부 요소별 분석</h3>';
 for(const sec of Object.keys(SECTIONS)){
 const dd=da[sec];
 html+='<div class="dgrp"><div class="dgrp-h"><span class="dgrp-t sec-t-'+sec+'">'+SECTIONS[sec]+'</span>'+(dd&&dd.total?'<span class="dgrp-r">'+pct(dd.rate)+' · '+dd.total+'문항</span>':'<span class="dgrp-r">미응시</span>')+'</div>';
 html+= dd.rows.map(function(r){
 const empty=r.total===0;
 const c= empty?'#cbd5e1': r.rate>=80?'var(--ok)': r.rate>=60?'var(--warn)':'var(--bad)';
 const tc= empty?'var(--dim)': r.rate>=80?'var(--ok)': r.rate>=60?'var(--warn)':'var(--bad)';
 return '<div class="erow"><span class="elabel">'+esc(r.sub)+'</span><div class="ebar"><div class="efill" style="width:'+(empty?0:r.rate)+'%;background:'+c+'"></div></div><span class="epct" style="color:'+tc+'">'+pct(r.rate)+'</span></div>';
 }).join('');
 if(dd&&dd.total) html+='<div class="dgrp-c">'+esc(AI.detailComment(sec,dd))+'</div>';
 html+='</div>';
 }
 html+='</div>';

 if(!_isTest){
   /* 태도 — 위 지표에 이미 점수가 있으니 여기서는 내역과 코칭만 */
   html+='<div class="panel"><h3>출결 내역</h3>'
   + '<div class="row-act" style="margin-bottom:10px">'
     + '<span class="tchip c-ok">출석 <b>'+att.present+'</b></span>'
     + '<span class="tchip c-warn">지각 <b>'+att.late+'</b></span>'
     + '<span class="tchip c-bad">결석 <b>'+att.absent+'</b></span></div>'
   + '<div class="aibox"><p>'+(att.score==null?'출결 데이터가 아직 없습니다.':att.score>=90?'출결이 매우 성실합니다. 지금 리듬을 유지하세요.':att.score>=75?'대체로 성실합니다. 지각을 줄이면 상위 등급에 도달합니다.':att.score>=60?'출결 관리가 필요합니다. 결석·지각이 성적 향상의 발목을 잡을 수 있습니다.':'출결이 불안정합니다. 규칙적인 수업 참석이 가장 시급한 과제입니다.')+'</p></div></div>';
 }

 /* 선생님 질문 */
 var _qs=(DB.questionsToTeacher||[]).filter(function(q){return q.studentId===CURRENT.id;}).slice().reverse();
 html+='<div class="panel"><h3>선생님에게 질문하기</h3>'
  +'<textarea id="qtText" rows="3" placeholder="예: 논리 파트에서 연결어 문제가 계속 틀립니다. 어떻게 접근해야 할까요?"></textarea>'
  +'<div class="row-act" style="margin-top:8px"><button class="btn" id="qtSend">질문 남기기</button></div>'
  +'<div class="qt-list">'+(_qs.length?_qs.map(function(q){
      return '<div class="qt-item"><div class="qt-q"><b>Q</b><span>'+esc(q.text)+'</span><i>'+q.date+'</i></div>'
        +(q.answer?('<div class="qt-a"><b>A</b><span>'+esc(q.answer)+'</span><i>'+esc(q.answerBy||'')+'</i></div>'):'<div class="qt-wait muted">답변 대기 중</div>')+'</div>';
    }).join(''):'<div class="muted" style="margin-top:10px">아직 남긴 질문이 없습니다.</div>')+'</div></div>';

 /* 최근 이력 — 상세 다시보기는 테스트 센터에 모아 두었습니다 */
 html+='<div class="panel"><h3>최근 테스트 이력</h3>'
  +(sess.length?'<div class="tbl-wrap"><table class="tbl"><thead><tr><th>날짜</th><th>유형</th><th>점수</th><th>정답률</th></tr></thead><tbody>'
    +sess.slice(-12).reverse().map(function(se){
      var c = se.rate>=80?'var(--ok)':se.rate>=60?'var(--warn)':'var(--bad)';
      return '<tr><td>'+se.date+'</td><td>'+({quick:'빠른',section:'섹션',mix:'종합',adaptive:'맞춤추천',school:'학교별',level:'레벨'}[se.type]||se.type)+'</td><td>'+se.score+'/'+se.total+'</td><td><b style="color:'+c+'">'+pct(se.rate)+'</b></td></tr>';}).join('')
    +'</tbody></table></div>':'<div class="muted">아직 테스트 기록이 없습니다.</div>')
  +'<div class="row-act" style="margin-top:12px">'
    +'<button class="btn ghost" onclick="go(\'s-center\')">문제 다시보기</button>'
    +(_isTest?'':'<button class="btn ghost" onclick="go(\'s-adm\')">목표 대학 · 합격선 보기</button>')
    +'</div></div>';

 if(_isTest) html+='<div class="lockveil"><div class="lockmsg">전체 진단 리포트는 정식 등록 후 제공됩니다<span>무료 체험에서는 영역별 정답률까지 확인할 수 있어요. 정식 등록 시 세부 요소 분석·학습 코칭·목표 대학 진단까지 제공됩니다.</span></div></div></div>';

 page(html);
 const radarLabels=Object.values(SECTIONS).concat(_isTest?[]:['태도']);
 const radarVals=Object.keys(SECTIONS).map(function(k){return secRates[k];}).concat(_isTest?[]:[att.score||0]);
 radar($('#gRadar'),radarLabels,radarVals,'#4f46e5');
 var _qb=document.getElementById('qtSend');
 if(_qb) _qb.onclick=function(){ var tx=(document.getElementById('qtText').value||'').trim();
   if(!tx){ alert('질문 내용을 입력해 주세요'); return; }
   DB.questionsToTeacher=DB.questionsToTeacher||[];
   DB.questionsToTeacher.push({id:uid('qt'),studentId:CURRENT.id,studentName:CURRENT.name,text:tx,date:todayStr(),answer:'',answerBy:''});
   save(); toast('질문이 등록되었습니다'); stuGrade(); };
 if(typeof bindSessionHistory==='function') bindSessionHistory();
}
