/* ===================== 이룸편입 LMS · VIEWS / ROUTER ===================== */
const NAV = {
 admin:[ {g:'메인'},{id:'a-dash',ic:'',t:'대시보드'},{id:'a-control',ic:'',t:'실시간 관제'},{id:'a-ops',ic:'',t:'운영 알림'},{id:'a-qna',ic:'',t:'학생 질문'},{id:'a-grade',ic:'',t:'시험 채점'},{id:'a-grading',ic:'',t:'과제 확인'},{g:'운영'},{id:'a-cal',ic:'',t:'학습 달력'},{id:'a-board',ic:'',t:'공지 · 교안'},{id:'a-talk',ic:'',t:'알림톡'},{g:'관리'},{id:'a-students',ic:'',t:'학생 관리'},{id:'a-vod',ic:'',t:'강의 관리'},{id:'a-instructors',ic:'',t:'강사 관리'},{id:'a-data',ic:'',t:'데이터 관리'},{id:'a-assess',ic:'',t:'평가 관리'},{g:'분석'},{id:'a-level',ic:'',t:'레벨테스트 결과'},{id:'a-analytics',ic:'',t:'전체 분석'},{id:'a-stuan',ic:'',t:'학생별 분석'} ],
 instructor:[ {g:'메인'},{id:'t-dash',ic:'',t:'대시보드'},{id:'t-control',ic:'',t:'실시간 관제'},{id:'t-ops',ic:'',t:'운영 알림'},{id:'t-qna',ic:'',t:'학생 질문'},{g:'운영'},{id:'t-cal',ic:'',t:'학습 달력'},{id:'t-board',ic:'',t:'공지 · 교안'},{g:'강의 관리'},{id:'t-vod',ic:'',t:'강의 관리'},{id:'t-assess',ic:'',t:'평가 관리'},{g:'학생'},{id:'t-students',ic:'',t:'내 학생'},{id:'t-grading',ic:'',t:'과제 확인'},{id:'t-grade',ic:'',t:'시험 채점'},{id:'t-stuan',ic:'',t:'학생별 분석'},{g:'문제'},{id:'t-questions',ic:'',t:'문제 관리'} ],
 test:[ {g:'진단'},{id:'s-level',ic:'',t:'레벨테스트'},{id:'s-grade',ic:'',t:'진단 리포트'} ],
 student:[ {g:'학습'},{id:'s-home',ic:'',t:'합격까지 최선을!'},{id:'s-cal',ic:'',t:'학습 달력'},{id:'s-word',ic:'',t:'데일리 단어'},{id:'s-hw',ic:'',t:'과제·평가'},{id:'s-vod',ic:'',t:'강의 수강'},{id:'s-board',ic:'',t:'공지 · 교안'},{g:'테스트'},{id:'s-level',ic:'',t:'레벨테스트'},{id:'s-center',ic:'',t:'테스트 센터'},{id:'s-idiom',ic:'',t:'빈출 숙어'},{id:'s-read',ic:'',t:'독해 약점공략'},{id:'s-uni',ic:'',t:'학교별 빈출'},{id:'s-mock',ic:'',t:'모의고사'},{id:'s-wrong',ic:'',t:'오답노트'},{g:'분석'},{id:'s-grade',ic:'',t:'내 성적'},{id:'s-growth',ic:'',t:'성장 리포트'},{id:'s-adm',ic:'',t:'입시 정보'} ]
};
/* ===== 이룸토익 학원 메뉴 ===== */
const NAV_TOEIC = {
 admin:[ {g:'메인'},{id:'ta-dash',ic:'',t:'대시보드'},{id:'a-control',ic:'',t:'실시간 관제'},{id:'a-ops',ic:'',t:'운영 알림'},{id:'a-qna',ic:'',t:'학생 질문'},{id:'a-grading',ic:'',t:'과제 확인'},
   {g:'토익'},{id:'ta-bank',ic:'',t:'문제 관리'},{id:'ta-word',ic:'',t:'어휘 관리'},{id:'ta-exam',ic:'',t:'모의고사 회차'},{id:'ta-dates',ic:'',t:'시험 일정'},{id:'ta-cuts',ic:'',t:'목표 기준'},{id:'ta-scale',ic:'',t:'환산표 관리'},
   {g:'운영'},{id:'a-cal',ic:'',t:'학습 달력'},{id:'a-board',ic:'',t:'공지 · 교안'},{id:'a-talk',ic:'',t:'알림톡'},
   {g:'관리'},{id:'a-students',ic:'',t:'학생 관리'},{id:'a-vod',ic:'',t:'강의 관리'},{id:'a-instructors',ic:'',t:'강사 관리'},{id:'a-assess',ic:'',t:'평가 관리'},{id:'a-data',ic:'',t:'데이터 관리'},
   {g:'분석'},{id:'ta-analytics',ic:'',t:'전체 분석'},{id:'ta-stuan',ic:'',t:'학생별 분석'} ],
 instructor:[ {g:'메인'},{id:'ta-dash',ic:'',t:'대시보드'},{id:'t-control',ic:'',t:'실시간 관제'},{id:'t-ops',ic:'',t:'운영 알림'},{id:'t-qna',ic:'',t:'학생 질문'},{id:'t-grading',ic:'',t:'과제 확인'},
   {g:'토익'},{id:'ta-bank',ic:'',t:'문제 관리'},{id:'ta-word',ic:'',t:'어휘 관리'},{id:'ta-exam',ic:'',t:'모의고사 회차'},
   {g:'운영'},{id:'t-cal',ic:'',t:'학습 달력'},{id:'t-board',ic:'',t:'공지 · 교안'},
   {g:'학생'},{id:'t-students',ic:'',t:'내 학생'},{id:'ta-stuan',ic:'',t:'학생별 분석'},
   {g:'강의'},{id:'t-vod',ic:'',t:'강의 관리'},{id:'t-assess',ic:'',t:'평가 관리'} ],
 test:[ {g:'체험'},{id:'ts-mock',ic:'',t:'실전 모의고사'},{id:'ts-score',ic:'',t:'내 점수'} ],
 student:[ {g:'학습'},{id:'ts-home',ic:'',t:'목표까지 한 걸음!'},{id:'ts-word',ic:'',t:'빈출 어휘'},{id:'s-cal',ic:'',t:'학습 달력'},{id:'s-hw',ic:'',t:'과제 · 평가'},{id:'s-vod',ic:'',t:'강의 수강'},{id:'s-board',ic:'',t:'공지 · 교안'},
   {g:'토익'},{id:'ts-part',ic:'',t:'파트별 학습'},{id:'ts-mock',ic:'',t:'실전 모의고사'},{id:'ts-wrong',ic:'',t:'오답노트'},
   {g:'분석'},{id:'ts-score',ic:'',t:'내 점수'},{id:'ts-plan',ic:'',t:'약점 공략 플랜'},{id:'ts-goal',ic:'',t:'목표 달성 예측'},{id:'ts-cut',ic:'',t:'지원 가능 기준'},{id:'ts-date',ic:'',t:'시험 일정'} ]
};
/* 현재 학원에 맞는 메뉴 */
function navOf(role){
  var t = (typeof AC!=='undefined' && AC==='toeic') ? NAV_TOEIC : NAV;
  return t[role] || NAV[role] || NAV.student;
}

const ROLEMETA = { admin:{ic:'',t:'관리자',s:'Administrator'}, instructor:{ic:'',t:'강사',s:'Instructor'}, student:{ic:'',t:'학생',s:'Student'}, test:{ic:'',t:'체험',s:'레벨테스트 체험'} };
let ROUTE = null;

function app(){ return $('#app'); }
function saveRoute(r){ try{ sessionStorage.setItem('eroom_route',r); localStorage.setItem('eroom_route',r); }catch(e){}
  try{ if(location.hash.slice(1)!==r) history.replaceState(null,'','#'+r); }catch(e){} }
function readRoute(){ var h=''; try{ h=decodeURIComponent(location.hash.slice(1)||''); }catch(e){}
  if(h) return h;
  try{ return sessionStorage.getItem('eroom_route') || localStorage.getItem('eroom_route') || ''; }catch(e){ return ''; } }
function go(route){ ROUTE=route; saveRoute(route); renderShell(); }

function renderShell(){
 const role=CURRENT.role, meta=ROLEMETA[role];
 const nav = navOf(role);
 try{ acPaint(); }catch(e){}
 if(!ROUTE){ var sr=readRoute();
   ROUTE = (sr && nav.some(n=>n.id===sr)) ? sr : nav.find(n=>n.id).id; }
 if(!nav.some(n=>n.id===ROUTE)) ROUTE = nav.find(n=>n.id).id;
 saveRoute(ROUTE);
 let stu = role==='student'? acf(DB.students).find(s=>s.id===CURRENT.id): null;
 var subtitle;
 if(role!=='student') subtitle = meta.s;
 else if(typeof AC!=='undefined' && AC==='toeic'){
   var _b = (typeof toBestScore==='function') ? toBestScore(CURRENT.id) : null;
   subtitle = _b!=null ? (toLevelName(toLevelOf(_b))+' · '+_b+'점') : '모의고사 응시 전';
 } else subtitle = (stu&&stu.cls?tierName(stu.cls):'반 미배정');
 const navHtml = nav.map(n=> n.g?`<div class="nav-g">${n.g}</div>`:`<a class="nav-i ${ROUTE===n.id?'on':''}" data-nav="${n.id}"><span>${n.ic}</span>${n.t}</a>`).join('');
 app().innerHTML = `<div class="layout">
 <aside class="side">
 <div class="brand"><img class="logo-img" src="${LOGO_SRC}" alt=""><div><b>${esc(acMeta().name)}</b><small>${esc(acMeta().sub)}</small></div></div>
 ${acSwitchHtml()}
 <div class="me"><div><b>${esc(CURRENT.name)}</b><small>${esc(subtitle)}</small></div></div>
 <nav>${navHtml}</nav>
 <button class="logout" id="logout">← 로그아웃</button>
 </aside>
 <main class="main"><div id="page"></div></main></div>`;
 $$('.nav-i').forEach(a=> a.onclick=()=>go(a.dataset.nav));
 try{ acBindSwitch(); }catch(e){}
 $('#logout').onclick=logout;
 renderPage();
}

function page(html){ $('#page').innerHTML = html; }
function head(title, sub){ return `<div class="ph"><h1>${title}</h1>${sub?`<p>${sub}</p>`:''}</div>`; }
function card(label, val, sub, color, cls){ return `<div class="stat ${cls||''}" ${color?`style="--c:${color}"`:''}><div class="stat-l">${label}</div><div class="stat-v">${val}</div><div class="stat-s">${sub||''}</div></div>`; }

function renderPage(){
 const r=ROUTE;
 var map={ 'a-dash':adminDash,'a-control':v2Control,'a-ops':opsCenter,'a-qna':qnaCenter,'a-data':dataCenter,'a-grade':examGrading,'a-students':adminStudents,'a-instructors':adminInstructors,'a-assess':assessManage,'a-cal':calendarView,'a-board':boardView,'a-talk':talkCenter,'a-grading':v2Grading,'a-level':levelResults,'a-analytics':adminAnalytics,'a-stuan':studentAnalytics,
 't-dash':instDash,'t-control':v2Control,'t-ops':opsCenter,'t-qna':qnaCenter,'t-assess':assessManage,'t-students':instStudents,'t-grading':v2Grading,'t-grade':examGrading,'t-stuan':studentAnalytics,'t-questions':instQuestions,'t-cal':calendarView,'t-board':boardView,
 's-home':v2Home,'s-cal':calendarView,'s-word':stuWords,'s-wrong':stuWrongBook,'s-board':boardView,'s-hw':v2Assignments,'s-level':stuLevel,'s-center':stuCenter,'s-idiom':stuIdiom,'s-read':stuReading,'s-uni':stuUni,'s-mock':v2Mock,'s-grade':stuGrade,'s-growth':v2Growth,'s-adm':stuAdm,'s-vod':stuVod,'a-vod':vodManage,'t-vod':vodManage };

 /* 이룸토익 학원 화면 */
 const tmap={ 'ta-dash':taDash,'ta-bank':taBank,'ta-exam':taExam,'ta-dates':taDates,'ta-cuts':taCuts,
   'ta-analytics':taAnalytics,'ta-stuan':taStuan,'ta-word':taWord,'ta-scale':taScale,
   'ts-home':tsHome,'ts-part':tsPart,'ts-mock':tsMock,'ts-wrong':tsWrong,'ts-score':tsScore,
   'ts-plan':tsPlan,'ts-goal':tsGoal,'ts-cut':tsCut,'ts-date':tsDate,'ts-word':tsWord };
 for(var _k in tmap) map[_k]=tmap[_k];
 var _fallback = (typeof AC!=='undefined' && AC==='toeic')
   ? (CURRENT.role==='student'||CURRENT.role==='test' ? tsHome : taDash) : adminDash;
 /* 화면 하나가 오류를 내도 앱 전체가 백지가 되지 않게 합니다 */
 try{ (map[r]||_fallback)(); }
 catch(e){
   try{ console.error('[renderPage]', r, e && (e.stack||e.message)); }catch(_){}
   try{
     page('<div class="ph"><h1>화면을 여는 중 문제가 생겼습니다</h1>'
       + '<p>이 화면만 일시적으로 열리지 않습니다. 다른 메뉴는 정상 이용하실 수 있습니다.</p></div>'
       + '<div class="note-b bad"><div class="nb-t"><b>' + esc(String((e&&e.message)||e)) + '</b>'
       + '문제가 계속되면 이 문구를 그대로 알려 주세요.</div>'
       + '<button class="btn" onclick="location.reload()">새로고침</button></div>');
   }catch(_){}
 }
}

/* ============== ADMIN ============== */
function adminDash(){
 const st=acf(DB.students), byc=c=>st.filter(s=>s.cls===c).length;
 let html = head('관리자 대시보드','오늘 처리할 일과 학생 현황입니다');
 html += (typeof quoteHtml==='function' ? quoteHtml() : '');
 const gostat=(route,inner)=>`<div class="stat-go" data-goto="${route}">${inner}</div>`;
 html += `<div class="stats">
 ${gostat('a-students',card('전체 학생', st.length+'명', '등록된 수강생'))}
 ${gostat('a-level',card('반 미배정', byc(null)+'명', '레벨테스트 대기', byc(null)?'var(--warn)':'var(--dim)'))}
 ${gostat('a-instructors',card('강사', acf(DB.instructors).length+'명', '등록 강사'))}
 ${gostat('a-vod',card('등록 강의', (acf(DB.lectures)||[]).length+'강', '전체 강의'))}</div>`;
 const dist = ['A','B','C'].map(c=>byc(c)); const maxd=Math.max(1,...dist);
 html += `<div class="grid2">
 <div class="panel"><h3>반별 학생 분포</h3>${['A','B','C'].map((c,i)=>`<div class="srow"><span style="color:${tierColor(c)}">${tierName(c)}</span><div class="mini"><div style="width:${dist[i]/maxd*100}%;background:${tierColor(c)}"></div></div><b>${dist[i]}명</b></div>`).join('')}</div>
 <div class="panel"><h3>오늘 체크사항</h3>${(function(){
    const enr=acf(DB.students).filter(s=>!s.testOnly);
    const risk=(typeof OPS!=='undefined')?OPS.atRisk(enr).length:0;
    const exp=(typeof OPS!=='undefined')?OPS.expiring(enr,7).length:0;
    const opened=(acf(DB.assessments)||[]).filter(a=>(a.openDate||todayStr())<=todayStr());
    let ungraded=0; opened.forEach(a=>{ const sc=(DB.scores||{})[a.id]||{}; enr.forEach(s=>{ let r=sc[s.id]; if(typeof isCleared==='function'&&isCleared(r)) r=null; if(r&&r.submittedAt&&r.score==null) ungraded++; }); });
    const qs=(DB.questionsToTeacher||[]).filter(q=>!q.answer).length;
    const hwTodo=(DB.submissions||[]).filter(x=>x.status!=='graded').length;
    /* 색은 '급한 것 빨강 · 처리할 것 주황 · 없으면 회색' 세 가지만 씁니다 */
    const rows=[['미이수 위험',risk,'a-ops','bad'],['이용기간 만료 임박',exp,'a-ops','bad'],
                ['채점 대기',ungraded,'a-grade','warn'],['과제 첨삭 대기',hwTodo,'a-grading','warn'],
                ['미답변 질문',qs,'a-qna','warn']];
    return rows.map(r=>{ const c = r[1]>0 ? `var(--${r[3]})` : 'var(--dim)';
      return `<div class="chk-row" data-goto="${r[2]}"><span class="chk-dot" style="background:${c}"></span><b>${r[0]}</b><span class="chk-n" style="color:${c}">${r[1]}</span><button class="lnk" data-goto="${r[2]}">이동</button></div>`; }).join('');
  })()}</div></div>`;
 html += `<div class="panel"><h3>최근 레벨테스트 결과</h3>${levelTableHtml(acf(DB.levelTests).slice(-6).reverse())}</div>`;
 page(html);
 $$('#page [data-goto]').forEach(function(elm){ elm.style.cursor='pointer';
   elm.onclick=function(ev){ ev.stopPropagation(); go(elm.dataset.goto); }; });
}

var AS_FILT='전체', AC_TAB='ins';
function adminStudents(){
 let filt=(typeof AS_FILT!=='undefined'&&AS_FILT)||'전체';
 let html = head('학생 관리','수강생 정보와 반 배정을 관리합니다');
 html += `<div class="bar"><div class="filters">${['전체','A','B','C','미배정'].map(f=>`<button class="chip ${f===filt?'on':''}" data-f="${f}">${f==='전체'?'전체 반':f==='미배정'?'미배정':tierName(f)}</button>`).join('')}</div><div class="bar-actions"><button class="btn ghost" id="ltOpen">레벨테스트 개방</button><button class="btn ghost" id="addTest">테스트 계정 생성</button><button class="btn" id="addStu">+ 학생 추가</button></div></div>`;
 html += `<div class="lt-state ${ltCfg().open?'on':''}"><b>레벨테스트 ${ltCfg().open?'개방 중':'잠김'}</b>${ltCfg().open?`<span class="muted"> · ${ltWindowText()} · 대상 ${ltCfg().target==='all'?'전체 학생':ltCfg().target==='class'?('특정 반('+(ltCfg().classes||[]).join(', ')+')'):'개별 선택 '+(ltCfg().studentIds||[]).length+'명'}</span>`:`<span class="muted"> · 학생 화면에서 응시 버튼이 비활성화됩니다</span>`}<button class="lnk" id="ltOpen2">설정</button></div>`;
 html += `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>이름</th><th>아이디</th><th>반</th><th>개강 기수</th><th>담당강사</th><th>희망대학</th><th>연락처</th><th>등록일</th><th>이용기한</th><th>생성자</th><th>관리</th></tr></thead><tbody id="stuBody"></tbody></table></div>`;
 page(html);
 const draw=()=>{ const rows=acf(DB.students).filter(s=> filt==='전체'||(filt==='미배정'?!s.cls:s.cls===filt));
 $('#stuBody').innerHTML = rows.map(s=>{ const ins=acf(DB.instructors).find(i=>i.id===s.instructorId);
 return `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.username)}</td><td>${s.cls?`<span class="pill" style="--c:${tierColor(s.cls)}">${tierName(s.cls)}</span>`:'<span class="pill" style="--c:#94a3b8">미배정</span>'}</td><td><select class="co-sel" data-co="${s.id}"><option value="">미지정</option>${(typeof VOD!=='undefined'?VOD.cohorts():[]).map(c=>`<option value="${c.id}" ${s.cohortId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></td><td>${ins?esc(ins.name):'-'}</td><td>${esc(s.goalSchool||'-')}${s.goalDept?' '+esc(s.goalDept):''}</td><td>${esc(s.phone||'-')}${s.note?' <span class="pill" style="--c:#d97706" title="특이사항 있음">!</span>':''}</td><td>${esc(s.createdAt)}</td><td>${s.validUntil?`${s.validUntil} ${acctExpired(s)?'<span class="pill" style="--c:#ef4444">만료</span>':''} <button class="lnk" data-x="${s.id}">+30일</button>`:`무제한 <button class="lnk" data-x="${s.id}">기한설정</button>`}</td><td><input class="creator-inp" data-c="${s.id}" value="${esc(s.creator||'')}" placeholder="기입"></td><td><button class="btn rptmini" data-r="${s.id}">리포트</button> <button class="lnk" data-pwr="${s.id}">계정 재발급</button> <button class="lnk ${(DB.ltGrants||{})[s.id]&&!(DB.ltGrants||{})[s.id].usedAt?'on':''}" data-lg="${s.id}">${(DB.ltGrants||{})[s.id]&&!(DB.ltGrants||{})[s.id].usedAt?'응시허용중':'레벨테스트 허용'}</button> <button class="lnk" data-v="${s.id}">상세</button> <button class="lnk del" data-d="${s.id}">삭제</button></td></tr>`; }).join('') || '<tr><td colspan="12" class="muted">학생이 없습니다.</td></tr>';
 $$('#stuBody [data-v]').forEach(b=>b.onclick=()=>studentDetail(b.dataset.v));
 $$('#stuBody [data-r]').forEach(b=>b.onclick=()=>downloadReport(b.dataset.r));
 $$('#stuBody [data-d]').forEach(b=>b.onclick=()=>{ if(confirm('삭제하시겠습니까?')){ DB.students=DB.students.filter(x=>x.id!==b.dataset.d); (DB._deletedIds=DB._deletedIds||[]).push(b.dataset.d); save(); draw(); } });
 $$('#stuBody [data-c]').forEach(inp=>inp.onchange=()=>{ const st=acf(DB.students).find(x=>x.id===inp.dataset.c); if(st){ st.creator=inp.value; save(); } });
 $$('#stuBody [data-lg]').forEach(b=>b.onclick=()=>{ const st=acf(DB.students).find(x=>x.id===b.dataset.lg); if(!st) return; ltGrant(st.id, st.name); draw(); });
 $$('#stuBody [data-pwr]').forEach(b=>b.onclick=()=>{ const st=acf(DB.students).find(x=>x.id===b.dataset.pwr); if(st) reissueAccount(st); });
    $$('#stuBody [data-co]').forEach(sel=>sel.onchange=()=>{ const st=acf(DB.students).find(x=>x.id===sel.dataset.co); if(st){ st.cohortId=sel.value||null; save(); const c=(typeof VOD!=='undefined')?VOD.cohort(sel.value):null; toast(st.name+' → '+(c?c.name:'미지정')); } });
    $$('#stuBody [data-x]').forEach(b=>b.onclick=()=>{ const st=acf(DB.students).find(x=>x.id===b.dataset.x); if(!st) return; const base=(st.validUntil && st.validUntil>=todayStr())?st.validUntil:todayStr(); st.validUntil=addDays(30,base); save(); toast(st.name+' 이용기한 → '+st.validUntil); draw(); });
 };
 draw();
 $$('.chip').forEach(c=>c.onclick=()=>{ $$('.chip').forEach(x=>x.classList.remove('on')); c.classList.add('on'); filt=AS_FILT=c.dataset.f; draw(); });
 $('#addStu').onclick=studentForm;
 const _ltOpen=function(){ ltOpenForm(function(){ adminStudents(); }); };
 if($('#ltOpen')) $('#ltOpen').onclick=_ltOpen;
 if($('#ltOpen2')) $('#ltOpen2').onclick=_ltOpen;
 $('#addTest').onclick=function(){
 function rid(n,set){ var s=''; for(var i=0;i<n;i++) s+=set.charAt(Math.floor(Math.random()*set.length)); return s; }
 var UP='ABCDEFGHJKLMNPQRSTUVWXYZ', NUM='23456789', LO='abcdefghijkmnpqrstuvwxyz';
 var username, tries=0; do{ username='TEST-'+rid(4,UP+NUM); tries++; } while(acf(DB.students).some(function(s){return s.username===username;}) && tries<60);
 var pw=rid(8, UP+LO+NUM);
 openModal(el('<div class="form"><h3>테스트 계정 생성</h3>'
 +'<p class="muted">아래 정보로 레벨테스트 체험 계정을 생성합니다. 생성자를 확인·수정한 뒤 \'생성\'을 누르세요.</p>'
 +'<div class="credbox"><div><span>아이디</span><b>'+esc(username)+'</b></div><div><span>비밀번호</span><b>'+esc(pw)+'</b></div><div><span>이용 기간</span><select id="tDur" class="cred-inp"><option value="7">7일</option><option value="30" selected>30일</option><option value="90">90일</option><option value="">무제한</option></select></div><div><span>생성자</span><input id="tCreator" class="cred-inp" value="'+esc((CURRENT&&CURRENT.name)||'')+'" placeholder="작성자"></div></div>'
 +'<div class="modal-actions"><button class="btn ghost" id="cancelCred">취소</button><button class="btn ghost" id="cpCred">복사</button><button class="btn" id="okCred">생성</button></div></div>'));
 var info='아이디 '+username+' / 비밀번호 '+pw;
 var cp=document.getElementById('cpCred'); if(cp) cp.onclick=function(){ if(navigator.clipboard) navigator.clipboard.writeText(info); toast('계정 정보를 복사했습니다'); };
 var cc=document.getElementById('cancelCred'); if(cc) cc.onclick=function(){ closeModal(); };
 var ok=document.getElementById('okCred'); if(ok) ok.onclick=function(){
 var creator=((document.getElementById('tCreator')||{}).value||'').trim();
 var acc={id:uid('demo'),name:'테스트('+username.slice(5)+')',username:username,pw:pw,cls:null,instructorId:null,testOnly:true,goalSchool:'',goalDept:'',email:'',phone:'',memo:'관리자 생성 · 레벨테스트 체험 계정',creator:creator,createdAt:todayStr()};
      var du=((document.getElementById('tDur')||{}).value||''); if(du){ acc.validFrom=todayStr(); acc.validUntil=addDays(parseInt(du,10)); }
 DB.students.push(acc); save();
 closeModal(); draw();
 if(typeof Auth!=='undefined'){
   Auth.register(acc,'test').then(function(ok){
     draw();
     toast(ok ? ('테스트 계정 생성 완료 · ' + username + ' (바로 로그인 가능)')
              : ('테스트 계정을 만들었습니다 · ' + username + ' — 서버 등록은 잠시 후 자동 재시도됩니다'));
   });
 } else toast('테스트 계정이 생성되었습니다 ('+username+')');
 };
 };
}

function studentForm(s){
 s=s||{};
 const insOpts = acf(DB.instructors).map(i=>`<option value="${i.id}" ${s.instructorId===i.id?'selected':''}>${esc(i.name)}</option>`).join('');
 openModal(el(`<div class="form"><h3>${s.id?'학생 수정':'학생 추가'}</h3>
 <label>이름 *<input id="f_name" value="${esc(s.name||'')}"></label>
 <label>아이디 *<input id="f_user" value="${esc(s.username||'')}"></label>
 ${s.id
   ? `<label>비밀번호 <small class="muted">(비워 두면 지금 비밀번호를 그대로 씁니다)</small><input id="f_pw" value="" placeholder="바꿀 때만 입력하세요"></label>`
   : `<label>비밀번호 *<input id="f_pw" value="1234"></label>`}
 <label>반 배정<select id="f_cls"><option value="">미배정 (레벨테스트 후)</option><option value="A" ${s.cls==='A'?'selected':''}>A반 — SKY</option><option value="B" ${s.cls==='B'?'selected':''}>B반 — 서울권</option><option value="C" ${s.cls==='C'?'selected':''}>C반 — 일반</option></select></label>
 <label>담당 강사<select id="f_ins"><option value="">강사 선택</option>${insOpts}</select></label>
 <label>개강 기수 <small class="muted">(설정하면 해당 기수의 강의만 보입니다)</small><select id="f_co"><option value="">미지정 (현재 진행 기수 자동 적용)</option>${(typeof VOD!=='undefined'?VOD.cohorts():[]).map(c=>`<option value="${c.id}" ${s.cohortId===c.id?'selected':''}>${esc(c.name)} · 개강 ${c.startDate}</option>`).join('')}</select></label>
 ${s.id&&s.testOnly?`<div class="note-b warn"><div class="nb-t"><b>지금은 체험(TEST) 계정입니다</b>
   체험 계정은 레벨테스트만 볼 수 있고, 체험을 다시 진행하면 여기 적은 내용이 지워질 수 있습니다.
   정식 수강생으로 바꾸려면 아래를 체크하고 저장하세요.</div>
   <label class="lt-sw" style="margin:0"><input type="checkbox" id="f_conv"> <b>정식 학생으로 전환</b></label></div>`:''}
 <div class="frow"><label>목표 대학<input id="f_gs" value="${esc(s.goalSchool||'')}"></label><label>목표 학과<input id="f_gd" value="${esc(s.goalDept||'')}"></label></div>
 <div class="frow"><label>편입 시험일 <small class="muted">(홈 화면에 D-day로 표시됩니다)</small><input id="f_ex" type="date" value="${esc(s.examDate||'')}"></label><label></label></div>
 <div class="frow"><label>이메일<input id="f_email" value="${esc(s.email||'')}"></label><label>연락처<input id="f_phone" value="${esc(s.phone||'')}"></label></div>
 <div class="frow"><label>이용 시작일<input id="f_vf" type="date" value="${esc(s.validFrom||'')}"></label><label>이용 만료일 <small class="muted">(비우면 무제한)</small><input id="f_vu" type="date" value="${esc(s.validUntil||'')}"></label></div>
    <div class="frow"><label>학부모 연락처<input id="f_pphone" value="${esc(s.parentPhone||'')}" placeholder="010-0000-0000"></label><label>학교/학년<input id="f_school" value="${esc(s.school||'')}" placeholder="예: OO대 2학년"></label></div>
    <label>메모<textarea id="f_memo">${esc(s.memo||'')}</textarea></label>
    <label>특이사항 <small class="muted">(상담 내역·주의사항 등)</small><textarea id="f_note" placeholder="예: 논리 취약, 야간 수강 선호, 3월 재등록 예정">${esc(s.note||'')}</textarea></label>
 <div class="quiz-nav"><button class="btn ghost" id="f_cancel">취소</button><button class="btn" id="f_save">저장</button></div></div>`));
 $('#f_cancel').onclick=closeModal;
 const _prevUser = s.id ? String(s.username||'') : '';
 $('#f_save').onclick=()=>{ const name=$('#f_name').value.trim(), user=$('#f_user').value.trim(); if(!name||!user)return alert('이름/아이디는 필수입니다');
 if(s.id){
   var _conv = !!($('#f_conv') && $('#f_conv').checked);
   var _newPw = ($('#f_pw').value||'').trim();
   Object.assign(s,{name,username:user,cls:$('#f_cls').value||null,instructorId:$('#f_ins').value||null,cohortId:$('#f_co').value||null,goalSchool:$('#f_gs').value,goalDept:$('#f_gd').value,examDate:$('#f_ex').value||null,email:$('#f_email').value,phone:$('#f_phone').value,memo:$('#f_memo').value,note:$('#f_note').value,parentPhone:$('#f_pphone').value,school:$('#f_school').value,validFrom:$('#f_vf').value||null,validUntil:$('#f_vu').value||null});
   if(_newPw) s.pw = _newPw;                             /* 입력했을 때만 바꿉니다 */
   if(_conv){
     /* 지우지 않고 false 로 둡니다. 항목을 지우면 서버 병합에서 예전 값이 되살아납니다. */
     s.testOnly = false;
     if(/체험 계정|체험 진단|레벨테스트 체험/.test(s.memo||'')) s.memo='';
     s.convertedAt = todayStr();
     s.convertedBy = (CURRENT&&CURRENT.name)||'관리자';
   }
   s._u = Date.now();
 }
 else { DB.students.push({id:uid('s'),name,username:user,pw:$('#f_pw').value,cls:$('#f_cls').value||null,instructorId:$('#f_ins').value||null,cohortId:$('#f_co').value||null,goalSchool:$('#f_gs').value,goalDept:$('#f_gd').value,examDate:$('#f_ex').value||null,email:$('#f_email').value,phone:$('#f_phone').value,memo:$('#f_memo').value,note:$('#f_note').value,parentPhone:$('#f_pphone').value,school:$('#f_school').value,validFrom:$('#f_vf').value||null,validUntil:$('#f_vu').value||null,createdAt:todayStr()}); }
 save();
 if(typeof Auth!=='undefined'&&Auth.online){
   var _u=acf(DB.students).find(function(x){return x.username===user;});
   if(_u){
     var _role = _u.testOnly ? 'test' : 'student';
     if(_u.pw) Auth.register(_u, _role);                 /* 새 비밀번호가 있으면 그대로 등록 */
     else if(typeof Auth.setRole==='function') Auth.setRole(_u, _role, _prevUser);   /* 없으면 역할·아이디만 갱신 */
   }
 }
 if(s.id && s.convertedAt===todayStr() && !s.testOnly) toast(name+' 님을 정식 학생으로 전환했습니다');
 try{ var _t=acf(DB.students).find(function(x){return x.username===user;}); if(_t) saveVerify('students', _t.id); }catch(e){}
 toast('저장했습니다'); closeModal(); renderPage(); };
}

function studentDetail(id){
 const s=acf(DB.students).find(x=>x.id===id); const lt=acf(DB.levelTests).filter(t=>t.studentId===id).slice(-1)[0];
 const sess=DB.sessions.filter(x=>x.studentId===id);
 const avg=sess.length?Math.round(sess.reduce((a,b)=>a+b.rate,0)/sess.length):(lt?lt.rate:0);
 openModal(el(`<div class="detail"><h3>${esc(s.name)} 상세</h3>
 <div class="dgrid">${card('현재 반', s.cls?tierName(s.cls):'미배정','',s.cls?tierColor(s.cls):'#94a3b8')}${card('누적 정답률',pct(avg),sess.length+' 세션')}${card('레벨점수',lt?lt.score+'/40':'-','')}</div>
 <div class="info-grid">
   <div class="info-item"><span>희망 대학 · 학과</span><b>${esc(s.goalSchool||'-')} ${esc(s.goalDept||'')}</b></div>
   <div class="info-item"><span>연락처</span><b>${esc(s.phone||'-')}</b></div>
   <div class="info-item"><span>학부모 연락처</span><b>${esc(s.parentPhone||'-')}</b></div>
   <div class="info-item"><span>이메일</span><b>${esc(s.email||'-')}</b></div>
   <div class="info-item"><span>학교/학년</span><b>${esc(s.school||'-')}</b></div>
   <div class="info-item"><span>담당 강사</span><b>${esc((acf(DB.instructors).find(i=>i.id===s.instructorId)||{}).name||'-')}</b></div>
   <div class="info-item"><span>이용 기간</span><b>${s.validUntil?(esc(s.validFrom||'-')+' ~ '+esc(s.validUntil)+(acctExpired(s)?' (만료)':'')):'무제한'}</b></div>
   <div class="info-item"><span>등록일</span><b>${esc(s.createdAt||'-')}</b></div>
 </div>
 ${s.memo?`<p class="muted">${esc(s.memo)}</p>`:''}
 ${s.note?`<div class="note-box"><b>특이사항</b><br>${esc(s.note)}</div>`:''}
 ${lt?`<h4>영역별</h4>${Object.entries(lt.sections).map(([k,v])=>`<div class="srow"><span>${SECTIONS[k]}</span><div class="mini"><div style="width:${v*10}%"></div></div><b>${v}/10</b></div>`).join('')}`:''}
 <div class="quiz-nav"><button class="btn ghost" id="d_report">리포트</button><button class="btn ghost" id="d_edit">수정</button><button class="btn" id="d_close">닫기</button></div></div>`));
 $('#d_close').onclick=closeModal; $('#d_edit').onclick=()=>{ closeModal(); studentForm(s); };
 $('#d_report').onclick=()=>downloadReport(id);
}

function adminInstructors(){
 let html=head('강사 · 관리자 계정','계정을 등록하고 정보를 수정합니다');
 html+=`<div class="bar"><div class="filters" id="acTabs">
   <button class="chip${AC_TAB==='ins'?' on':''}" data-ac="ins">강사</button><button class="chip${AC_TAB==='adm'?' on':''}" data-ac="adm">관리자</button></div>
   <div class="bar-actions"><button class="btn" id="acAdd">+ 계정 추가</button></div></div><div class="cards" id="insCards"></div>`;
 page(html);
 if(typeof AC_TAB==='undefined' || (AC_TAB!=='ins' && AC_TAB!=='adm')) AC_TAB='ins';
 var TAB=AC_TAB;
 function listOf(){ return TAB==='ins' ? (DB.instructors=DB.instructors||[]) : (DB.admins=DB.admins||[]); }
 function roleOf(){ return TAB==='ins' ? 'instructor' : 'admin'; }
 const draw=()=>{
   const arr=listOf();
   $('#insCards').innerHTML = arr.length ? arr.map(i=>{
     const cnt = TAB==='ins' ? acf(DB.students).filter(s=>s.instructorId===i.id).length : 0;
     return `<div class="icard"><div class="ic-h"><div class="ic-av">${esc((i.name||"?").slice(0,1))}</div>
       <div><b>${esc(i.name||'')}</b><small>${esc(i.username||'')}</small></div></div>
       ${TAB==='ins'?`<p>담당 학생 <b>${cnt}명</b></p>`:'<p class="muted">관리자 권한</p>'}
       <p class="muted">${esc(i.email||'')} ${esc(i.phone||'')}</p>
       <div class="row-act"><button class="lnk" data-e="${i.id}">수정</button>
       <button class="lnk" data-pw="${i.id}">비밀번호 변경</button>
       <button class="lnk del" data-d="${i.id}">삭제</button></div></div>`; }).join('')
     : '<div class="muted">등록된 계정이 없습니다.</div>';
   $$('#insCards [data-d]').forEach(b=>b.onclick=()=>{
     const arr2=listOf();
     if(arr2.length<=1){ alert('마지막 계정은 삭제할 수 없습니다.'); return; }
     if(!confirm('이 계정을 삭제할까요?')) return;
     if(TAB==='ins') DB.instructors=arr2.filter(x=>x.id!==b.dataset.d);
     else DB.admins=arr2.filter(x=>x.id!==b.dataset.d);
     (DB._deletedIds=DB._deletedIds||[]).push(b.dataset.d); save(); draw(); });
   $$('#insCards [data-e]').forEach(b=>b.onclick=()=>{ acForm(listOf().filter(x=>x.id===b.dataset.e)[0], draw); });
   $$('#insCards [data-pw]').forEach(b=>b.onclick=()=>{ acPwForm(listOf().filter(x=>x.id===b.dataset.pw)[0], roleOf()); });
 };
 draw();
 $$('#acTabs .chip').forEach(t=>t.onclick=()=>{ $$('#acTabs .chip').forEach(x=>x.classList.remove('on')); t.classList.add('on'); TAB=AC_TAB=t.dataset.ac; draw(); });
 $('#acAdd').onclick=()=> acForm(null, draw);

 /* 등록 · 수정 */
 function acForm(rec, onDone){
   const isNew=!rec; rec=rec||{};
   const role=roleOf();
   openModal(el(`<div class="form"><h3>${isNew?(role==='admin'?'관리자 추가':'강사 추가'):'계정 수정'}</h3>
     <div class="frow"><label>이름 *<input id="i_name" value="${esc(rec.name||'')}"></label>
     <label>아이디 *<input id="i_user" value="${esc(rec.username||'')}"></label></div>
     ${isNew?'<label>비밀번호 *<input id="i_pw" value="1234"></label>':'<div class="muted" style="margin:2px 0 10px">비밀번호는 [비밀번호 변경]에서 따로 바꿉니다.</div>'}
     <div class="frow"><label>이메일<input id="i_email" value="${esc(rec.email||'')}"></label>
     <label>연락처<input id="i_phone" value="${esc(rec.phone||'')}"></label></div>
     <label>메모<input id="i_memo" value="${esc(rec.memo||'')}"></label>
     <div class="modal-actions"><button class="btn ghost" id="i_cancel">취소</button><button class="btn" id="i_save">저장</button></div></div>`));
   $('#i_cancel').onclick=closeModal;
   $('#i_save').onclick=()=>{
     const n=$('#i_name').value.trim(), u=$('#i_user').value.trim();
     if(!n||!u){ alert('이름과 아이디는 필수입니다'); return; }
     const dup=(acf(DB.instructors)||[]).concat(DB.admins||[]).filter(x=>x && x.id!==rec.id && String(x.username||'').toLowerCase()===u.toLowerCase());
     if(dup.length){ alert('이미 쓰고 있는 아이디입니다'); return; }
     if(isNew){
       const ni={id:uid(role==='admin'?'a':'i'), name:n, username:u, pw:$('#i_pw').value||'1234',
                 email:$('#i_email').value, phone:$('#i_phone').value, memo:$('#i_memo').value, _u:Date.now()};
       listOf().push(ni); save();
       if(typeof Auth!=='undefined'&&Auth.online) Auth.register(ni, role);
     } else {
       Object.assign(rec,{name:n, username:u, email:$('#i_email').value, phone:$('#i_phone').value,
                          memo:$('#i_memo').value, _u:Date.now()});
       save();
       if(typeof Auth!=='undefined'&&Auth.online && rec.pw) Auth.register(rec, role);
     }
     saveVerify(role==='admin'?'admins':'instructors', rec.id||u);
     closeModal(); if(onDone) onDone();
   };
 }
 /* 비밀번호 변경 */
 function acPwForm(rec, role){
   if(!rec) return;
   openModal(el(`<div class="form"><h3>비밀번호 변경 · ${esc(rec.name||'')}</h3>
     <label>새 비밀번호 *<input id="pw_v" placeholder="6자 이상 권장"></label>
     <div class="muted" style="margin-top:6px">저장하면 즉시 서버에 반영되어 다음 로그인부터 적용됩니다.</div>
     <div class="modal-actions"><button class="btn ghost" id="pw_c">취소</button><button class="btn" id="pw_ok">변경</button></div></div>`));
   $('#pw_c').onclick=closeModal;
   $('#pw_ok').onclick=()=>{
     const v=$('#pw_v').value.trim();
     if(!v){ alert('새 비밀번호를 입력해 주세요'); return; }
     rec.pw=v; rec._u=Date.now(); save();
     if(typeof Auth!=='undefined'&&Auth.online) Auth.register(rec, role);
     toast(rec.name+' 비밀번호를 변경했습니다'); closeModal();
   };
 }
}

/* 저장한 내용이 서버에 실제로 남았는지 확인합니다.
   동기화 문제로 조용히 되돌아가는 일을 사용자가 바로 알 수 있게 합니다. */
function saveVerify(col, id){
  if(typeof Net==='undefined' || !Net.enabled || !id) return;
  var before=(DB[col]||[]).filter(function(x){ return x && x.id===id; })[0];
  if(!before) return;
  var snap=JSON.stringify(before);
  setTimeout(function(){
    fetch('/api/state',{cache:'no-store',headers:eHdr()}).then(function(r){ return r.ok?r.json():null; })
      .then(function(j){
        if(!j || !j.ok || !j.state) return;
        var after=((j.state[col])||[]).filter(function(x){ return x && x.id===id; })[0];
        if(!after){ toast('저장한 내용이 서버에 반영되지 않았습니다. 새로고침 후 다시 시도해 주세요.'); return; }
        /* 이름처럼 눈에 띄는 항목만 비교합니다 (개인정보는 역할에 따라 가려질 수 있음) */
        if(before.name && after.name && before.name!==after.name){
          toast('저장한 내용이 서버와 다릅니다. 새로고침 후 확인해 주세요.');
        }
      }).catch(function(){});
  }, 1500);
}

/* ====== level results + analytics ====== */
function levelResults(){
 let html=head('레벨테스트 결과','신규 학생의 반 배정 결과입니다');
 html+=`<div class="note"><b>A반</b> 정답률 80%↑ · <b>B반</b> 60~79% · <b>C반</b> 60%↓ — 결과에 따라 자동 배정됩니다</div>`;
 html+=`<div class="panel">${levelTableHtml(acf(DB.levelTests).slice().reverse())}</div>`;
 page(html);
}
function levelTableHtml(rows){
 if(!rows.length) return '<div class="muted">레벨테스트 기록이 없습니다.</div>';
 return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>이름</th><th>점수</th><th>정답률</th><th>배정반</th><th>어휘</th><th>문법</th><th>독해</th><th>논리</th><th>목표</th><th>응시일</th></tr></thead><tbody>${rows.map(t=>`<tr><td><b>${esc(t.name)}</b></td><td>${t.score}/40</td><td><b>${pct(t.rate)}</b></td><td><span class="pill" style="--c:${tierColor(t.cls)}">${tierName(t.cls)}</span></td>${['vocab','grammar','reading','logic'].map(s=>`<td>${((t.sections||{})[s]!=null)?(t.sections[s]+'/10'):'-'}</td>`).join('')}<td>${esc(t.goalSchool||'-')}</td><td>${esc(t.date)}</td></tr>`).join('')}</tbody></table></div>`;
}
function adminAnalytics(){
 let html=head('전체 분석','전체 학생 테스트 성취도 현황입니다');
 const lts=acf(DB.levelTests); const secAvg={};
 for(const s of Object.keys(SECTIONS)){ const vals=lts.map(t=>((t.sections||{})[s])).filter(v=>v!=null && !isNaN(v)).map(v=>v*10); secAvg[s]=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0; }
 const overall=lts.length?Math.round(lts.reduce((a,b)=>a+b.rate,0)/lts.length):0;
 html+=`<div class="stats">${card('평균 정답률',pct(overall),lts.length+'명 응시')}${card('최고 정답률',pct(Math.max(0,...lts.map(t=>t.rate))),'')}${card('총 학습세션',DB.sessions.length,'누적')}</div>`;
 html+=`<div class="grid2"><div class="panel"><h3>영역별 평균</h3><canvas id="cvRadar" width="340" height="280"></canvas></div>
 <div class="panel"><h3>영역별 정답률</h3><canvas id="cvBar" width="340" height="280"></canvas></div></div>`;
 page(html);
 const labels=Object.values(SECTIONS), vals=Object.keys(SECTIONS).map(s=>secAvg[s]);
 radar($('#cvRadar'),labels,vals,'#4f46e5'); bars($('#cvBar'),labels,vals,'#7c3aed');
}


/* ====== 레벨테스트 개방 설정 (관리자) ====== */
function ltOpenForm(onDone){
  var c = ltCfg();
  var cls = c.classes || [], sel = c.studentIds || [];
  openModal(el('<div class="form ltform"><h3>레벨테스트 개방 설정</h3>'
    + '<p class="muted" style="margin:2px 0 12px;line-height:1.75">평소에는 학생 화면에서 레벨테스트가 잠겨 있습니다. 월별 레벨테스트 시행일에 이 화면에서 기간을 열어 주세요.</p>'
    + '<label class="lt-sw"><input type="checkbox" id="lt_open" ' + (c.open?'checked':'') + '> <b>레벨테스트 응시 개방</b></label>'
    + '<div class="frow"><label>시작일<input type="date" id="lt_from" value="' + esc(c.from||todayStr()) + '"></label>'
    + '<label>종료일<input type="date" id="lt_to" value="' + esc(c.to||todayStr()) + '"></label></div>'
    + '<label>응시 대상<select id="lt_target">'
      + '<option value="all"' + (c.target==='all'?' selected':'') + '>전체 학생</option>'
      + '<option value="class"' + (c.target==='class'?' selected':'') + '>특정 반</option>'
      + '<option value="select"' + (c.target==='select'?' selected':'') + '>학생 개별 선택</option>'
    + '</select></label>'
    + '<div id="lt_cls" class="lt-chips">' + ['A','B','C'].map(function(x){
        return '<label class="lt-chk"><input type="checkbox" class="ltc" value="' + x + '"' + (cls.indexOf(x)>=0?' checked':'') + '> ' + tierName(x) + '</label>'; }).join('') + '</div>'
    + '<div id="lt_stu" class="lt-stulist">' + acf(DB.students).filter(function(s){return !s.testOnly;}).map(function(s){
        return '<label class="lt-chk"><input type="checkbox" class="lts" value="' + s.id + '"' + (sel.indexOf(s.id)>=0?' checked':'') + '> ' + esc(s.name) + ' <span class="muted">' + (s.cls?tierName(s.cls):'미배정') + '</span></label>'; }).join('') + '</div>'
    + '<label>학생 안내 문구<input id="lt_note" value="' + esc(c.note||'') + '" placeholder="예: 8월 정기 레벨테스트 — 8/5(월)까지 응시"></label>'
    + '<div class="modal-actions"><button class="btn ghost" id="lt_c">취소</button><button class="btn" id="lt_ok">저장</button></div></div>'));
  var tg = document.getElementById('lt_target');
  function sync(){
    document.getElementById('lt_cls').style.display = (tg.value==='class') ? 'flex' : 'none';
    document.getElementById('lt_stu').style.display = (tg.value==='select') ? 'block' : 'none';
  }
  tg.onchange = sync; sync();
  document.getElementById('lt_c').onclick = closeModal;
  document.getElementById('lt_ok').onclick = function(){
    var c2 = ltCfg();
    c2.open = document.getElementById('lt_open').checked;
    c2.from = document.getElementById('lt_from').value;
    c2.to   = document.getElementById('lt_to').value;
    c2.target = tg.value;
    c2.classes = $$('.ltc').filter(function(x){return x.checked;}).map(function(x){return x.value;});
    c2.studentIds = $$('.lts').filter(function(x){return x.checked;}).map(function(x){return x.value;});
    c2.note = document.getElementById('lt_note').value;
    c2.by = CURRENT.name; c2.at = todayStr();
    DB.levelTest = c2; save(); closeModal();
    toast(c2.open ? '레벨테스트를 개방했습니다' : '레벨테스트를 잠갔습니다');
    if(onDone) onDone();
  };
}
/* 학생 1명에게만 임시 응시권 부여 */
function ltGrant(sid, name){
  DB.ltGrants = DB.ltGrants || {};
  var cur = DB.ltGrants[sid];
  if(cur && !cur.usedAt && (!cur.until || todayStr()<=cur.until)){
    if(!confirm(name + ' 학생의 응시 허용을 취소할까요?')) return;
    delete DB.ltGrants[sid]; save(); toast('응시 허용을 취소했습니다'); return;
  }
  var until = prompt('언제까지 응시할 수 있게 할까요? (YYYY-MM-DD)', addDays(todayStr(), 3));
  if(!until) return;
  DB.ltGrants[sid] = { until:until, by:CURRENT.name, at:todayStr(), usedAt:'' };
  save(); toast(name + ' 학생에게 ' + until + '까지 응시를 허용했습니다');
}

/* ====== 계정 재발급 (로그인 문제 해결용) ====== */
function reissueAccount(stu){
  function rid(n,set){ var s=''; for(var i=0;i<n;i++) s+=set.charAt(Math.floor(Math.random()*set.length)); return s; }
  var UP='ABCDEFGHJKLMNPQRSTUVWXYZ', NUM='23456789', LO='abcdefghijkmnpqrstuvwxyz';
  var newPw = rid(8, UP+LO+NUM);
  var role = stu.testOnly ? 'test' : 'student';
  openModal(el('<div class="form"><h3>계정 재발급</h3>'
    + '<p class="muted" style="line-height:1.75;margin-bottom:10px">'+esc(stu.name)+' 학생의 로그인 정보를 다시 발급합니다.<br>'
    + '로그인이 되지 않을 때 사용하세요. 발급 즉시 서버에 등록됩니다.</p>'
    + '<div class="credbox"><div><span>역할</span><b>'+(role==='test'?'TEST(체험)':'학생')+'</b></div>'
    + '<div><span>아이디</span><b>'+esc(stu.username||'')+'</b></div>'
    + '<div><span>새 비밀번호</span><b id="rqPw">'+esc(newPw)+'</b></div></div>'
    + '<div class="modal-actions"><button class="btn ghost" id="rq_c">취소</button>'
    + '<button class="btn ghost" id="rq_cp">복사</button>'
    + '<button class="btn" id="rq_ok">재발급</button></div></div>'));
  document.getElementById('rq_c').onclick = closeModal;
  document.getElementById('rq_cp').onclick = function(){
    var info='아이디 '+(stu.username||'')+' / 비밀번호 '+newPw;
    if(navigator.clipboard) navigator.clipboard.writeText(info);
    toast('계정 정보를 복사했습니다'); };
  document.getElementById('rq_ok').onclick = function(){
    stu.pw = newPw; stu.pwSynced = false; save();
    if(typeof Auth!=='undefined'){
      Auth.register(stu, role).then(function(ok){
        toast(ok ? '재발급 완료 — 새 비밀번호로 로그인할 수 있습니다'
                 : '재발급했습니다. 서버 등록은 자동으로 다시 시도됩니다');
        closeModal(); adminStudents();
      });
    } else { toast('재발급했습니다'); closeModal(); adminStudents(); }
  };
}
