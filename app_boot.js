/* ===================== 이룸편입 LMS · LOGIN + MODAL + BOOT + SYNC ===================== */
let LOGIN_ROLE = 'admin';
/* 서버 인증 계층: 비밀번호는 서버에 해시로만 저장되며 브라우저로 내려오지 않음 */
const Auth = {
  online:false,
  init(){ return fetch('/api/auth/status',{headers:eHdr()}).then(function(r){return r.ok?r.json():null;})
    .then(function(j){ Auth.online=!!(j&&j.ok); if(Auth.online){ Auth.ensureUsers(); if(j.count===0) return Auth.migrateAll(); } })
    .catch(function(){ Auth.online=false; }); },
  accounts(){ var out=[];
    (DB.admins||[]).forEach(function(a){ if(a.pw) out.push({username:a.username,pw:a.pw,role:'admin',id:a.id,name:a.name}); });
    (DB.instructors||[]).forEach(function(a){ if(a.pw) out.push({username:a.username,pw:a.pw,role:'instructor',id:a.id,name:a.name}); });
    (DB.students||[]).forEach(function(a){ if(a.pw) out.push({username:a.username,pw:a.pw,role:a.testOnly?'test':'student',id:a.id,name:a.name}); });
    return out; },
  ensureUsers(){
    var D=[{u:'eroom_master',n:'관리자',r:'admin',id:'a1'},{u:'eroom_teacher',n:'이룸 강사',r:'instructor',id:'i1'},
           {u:'eroom_student',n:'이룸 학생',r:'student',id:'s1'},{u:'TEST',n:'체험 계정',r:'test',id:'demo'}];
    var ch=false;
    D.forEach(function(d){
      var list = d.r==='admin'?(DB.admins=DB.admins||[]) : d.r==='instructor'?(DB.instructors=DB.instructors||[]) : (DB.students=DB.students||[]);
      var f=list.find(function(x){ return x && (x.id===d.id || String(x.username||'').toLowerCase()===d.u.toLowerCase()); });
      if(!f){ var rec={id:d.id,ac:'transfer',name:d.n,username:d.u,createdAt:todayStr()};
        if(d.r==='test') rec.testOnly=true;
        if(d.r==='student'){ rec.cls=null; rec.instructorId='i1'; }
        list.push(rec); ch=true; }
    });
    if(ch) save();
  },
  migrateAll(){ var acc=Auth.accounts(); if(!acc.length) return Promise.resolve();
    return fetch('/api/auth/set',{method:'POST',headers:eHdr({'content-type':'application/json'}),body:JSON.stringify({accounts:acc, soft:true})})
      .then(function(){ (DB.students||[]).concat(DB.admins||[],DB.instructors||[]).forEach(function(u){ if(u.pw) u.pwSynced=true; }); save(); }).catch(function(){}); },
  register(user, role, soft){
    if(!user || !user.username || !user.pw) return Promise.resolve(false);
    var body={username:user.username,pw:user.pw,role:role||(user.testOnly?'test':'student'),id:user.id,name:user.name};
    if(soft) body.soft = true;   /* 자동 동기화 — 서버에 이미 있으면 그대로 둡니다 */
    /* 서버 상태와 무관하게 항상 시도한다 (초기 확인이 늦어도 계정이 누락되지 않도록) */
    return fetch('/api/auth/set',{method:'POST',headers:eHdr({'content-type':'application/json'}),body:JSON.stringify(body)})
      .then(function(r){ return r.ok ? r.json().catch(function(){return {ok:true};}) : null; })
      .then(function(j){
        if(j && j.ok !== false){ user.pwSynced = true; save(); return true; }   /* 등록 성공 — 비밀번호는 로컬에도 남겨 폴백 가능 */
        user.pwSynced = false; save(); return false;
      })
      .catch(function(){ user.pwSynced = false; save(); return false; }); },
  /* 서버에 올라가지 않은 계정을 다시 등록 (관리자 접속 시 자동 복구) */
  syncPending(){
    var pend = [];
    (DB.admins||[]).forEach(function(a){ if(a.pw && !a.pwSynced) pend.push({u:a,r:'admin'}); });
    (DB.instructors||[]).forEach(function(a){ if(a.pw && !a.pwSynced) pend.push({u:a,r:'instructor'}); });
    (DB.students||[]).forEach(function(a){ if(a.pw && !a.pwSynced) pend.push({u:a,r:a.testOnly?'test':'student'}); });
    if(!pend.length) return Promise.resolve(0);
    return Promise.all(pend.map(function(x){ return Auth.register(x.u, x.r, true); }))
      .then(function(rs){ return rs.filter(Boolean).length; }).catch(function(){ return 0; }); },
  /* 비밀번호를 모르는 상태에서 역할만 바꿉니다 (체험 → 정식 학생 전환 등) */
  setRole(user, role, fromUsername){
    if(!user || !user.username || !role) return Promise.resolve(false);
    return fetch('/api/auth/role',{method:'POST',headers:eHdr({'content-type':'application/json'}),
      body:JSON.stringify({username:user.username, from:fromUsername||'', role:role, id:user.id, name:user.name})})
      .then(function(r){ return r.ok?r.json():null; })
      .then(function(j){ return !!(j&&j.ok); }).catch(function(){ return false; });
  },
  stripLocal(){ ['admins','instructors','students'].forEach(function(k){ (DB[k]||[]).forEach(function(u){ delete u.pw; }); }); },
  login(username, pw){ if(!Auth.online) return Promise.resolve(null);
    return fetch('/api/login',{method:'POST',headers:eHdr({'content-type':'application/json'}),body:JSON.stringify({username:username,pw:pw})})
      .then(function(r){return r.json();})
      .then(function(j){ if(j && j.ok && j.sess) eSessSet(j.sess); return j; })
      .catch(function(){ return null; }); }
};
function renderLogin(){
 try{ acPaint(); }catch(e){}
 var _m = acMeta();
 app().innerHTML = '<div class="login-wrap"><div class="login-hero">'
 + '<img class="logo-img big" src="'+LOGO_SRC+'" alt="'+esc(_m.name)+'"><h1>'+esc(_m.name)+'</h1><p class="tagline">'+esc(_m.tag)+'</p>'
 + '<p class="sub">'+esc(_m.sub)+'</p>'
 + '</div>'
 + '<div class="login-card"><h2>로그인</h2><p class="muted">학원과 역할을 선택하고 계정으로 로그인하세요</p>'
 + '<div class="ac-pick">'
 + AC_IDS.map(function(a){ return '<button class="ac-p '+(a===AC?'on':'')+'" data-acp="'+a+'">'+esc(ACADEMIES[a].name)+'</button>'; }).join('')
 + '</div>'
 + '<div class="roles">'
 + '<button class="role on" data-r="admin"><span></span>관리자</button>'
 + '<button class="role" data-r="instructor"><span></span>강사</button>'
 + '<button class="role" data-r="student"><span></span>학생</button>'
 + '<button class="role" data-r="test"><span></span>TEST</button>'
 + '</div>'
 + '<label>아이디<input id="lg_user" placeholder="아이디"></label>'
 + '<label>비밀번호<input id="lg_pw" type="password" placeholder="비밀번호"></label>'
 + '<button class="btn big full" id="lg_btn">로그인</button>'
 + '</div></div>';
 $$('.ac-p').forEach(function(b){ b.onclick=function(){ acSet(b.dataset.acp, true); renderLogin(); }; });
 $$('.role').forEach(function(b){ b.onclick=function(){ $$('.role').forEach(function(x){x.classList.remove('on');}); b.classList.add('on'); LOGIN_ROLE=b.dataset.r; $('#lg_user').value=''; $('#lg_pw').value=''; $('#lg_user').focus(); }; });
  function finishLogin(acc){
    if((LOGIN_ROLE==='student'||LOGIN_ROLE==='test') && acctExpired(acc)){ alert('이용 기간이 만료된 계정입니다 (만료일 '+acc.validUntil+').\n기간 연장은 학원에 문의해 주세요.'); return; }
    loginAs(LOGIN_ROLE, acc.id, acc.name); ROUTE=null;
    /* 학생·강사는 소속 학원 화면으로 자동 전환합니다 */
    try{ var _ua = acOfUser(LOGIN_ROLE, acc.id) || acOf(acc); if(_ua) acSet(_ua, true); }catch(e){}
    try{ sessionStorage.removeItem('eroom_route'); }catch(e){}
    /* 화면을 먼저 그립니다. 서버 응답이 늦거나 실패해도 로그인이 멈추지 않도록 합니다. */
    renderShell();
    /* 그 다음 역할에 맞는 범위로 데이터를 다시 받아옵니다 (관리자는 전체, 체험 계정은 본인 것만) */
    if(typeof Net!=='undefined' && Net.enabled){
      try{
        Net.pull(function(st){
          if(!st) return;
          try{
            DB = ensureShape(st);
            try{ localStorage.setItem(LS_KEY, JSON.stringify(DB)); }catch(e){}
            if(typeof resetSnap==='function') resetSnap();
            if(typeof seedNotices==='function') seedNotices();
          }catch(e){}
          try{ renderShell(); }catch(e){}
        });
      }catch(e){}
    } }
  function poolOf(role){ if(role==='admin')return DB.admins||[]; if(role==='instructor')return DB.instructors||[];
    if(role==='test')return (DB.students||[]).filter(function(x){return x.testOnly;}); return (DB.students||[]).filter(function(x){return !x.testOnly;}); }
  function doLogin(){ const u=$('#lg_user').value.trim(), p=$('#lg_pw').value;
    const btn=$('#lg_btn'); if(btn){ btn.disabled=true; btn.textContent='확인 중...'; }
    function reset(){ if(btn){ btn.disabled=false; btn.textContent='로그인'; } }
    Auth.login(u,p).then(function(res){
      if(res && res.ok){
        if(res.user.role!==LOGIN_ROLE){ reset(); return alert('선택한 역할과 계정 유형이 다릅니다. 역할을 다시 선택해 주세요.'); }
        var acc=poolOf(LOGIN_ROLE).find(function(x){return x.id===res.user.id;}) || poolOf(LOGIN_ROLE).find(function(x){return x.username===u;}) || {id:res.user.id,name:res.user.name};
        reset(); return finishLogin(acc);
      }
      /* 서버에 계정이 없으면(등록 누락 등) 로컬 비밀번호로 한 번 더 확인하고, 성공 시 서버에 자동 등록 */
      var local = poolOf(LOGIN_ROLE).find(function(x){
        return String(x.username||'').toLowerCase()===String(u||'').toLowerCase() && x.pw && x.pw===p; });
      if(res && res.ok===false && res.error==='bad_password' && !local){
        reset(); return alert('아이디 또는 비밀번호가 올바르지 않습니다.'); }
      if(!local){
        /* 대소문자만 다른 경우까지 확인 */
        local = poolOf(LOGIN_ROLE).find(function(x){
          return String(x.username||'').toLowerCase()===String(u||'').toLowerCase() && x.pw && String(x.pw)===String(p); });
      }
      reset();
      if(!local) return alert('아이디 또는 비밀번호가 올바르지 않습니다.\n계정이 서버에 등록되지 않았을 수 있습니다. 관리자에게 문의해 주세요.');
      try{ Auth.register(local, LOGIN_ROLE); }catch(e){}      /* 서버에 없던 계정을 자동 복구 */
      finishLogin(local); });
  }
 $('#lg_btn').onclick=doLogin; $('#lg_pw').onkeydown=function(e){ if(e.key==='Enter')doLogin(); };
}
function openModal(node){ let m=$('#modal'); if(!m){ m=el('<div id="modal" class="modal"><div class="modal-card"></div></div>'); document.body.appendChild(m); m.onclick=function(e){ if(e.target===m) closeModal(); }; }
 const card=$('.modal-card',m); card.innerHTML=''; card.appendChild(node);
 m.classList.remove('m-exam','m-vod','m-wide');
 try{
   if(node.classList && node.classList.contains('exwrap')) m.classList.add('m-exam');
   else if(node.classList && node.classList.contains('vodwrap')) m.classList.add('m-vod');
 }catch(e){}
 m.classList.add('show');
 try{ document.body.classList.add('modal-open'); }catch(e){} }
function modalSet(node){ const card=$('#modal .modal-card'); card.innerHTML=''; card.appendChild(node);
 var m=$('#modal'); if(m){ m.classList.remove('m-exam','m-vod');
   try{ if(node.classList && node.classList.contains('exwrap')) m.classList.add('m-exam');
        else if(node.classList && node.classList.contains('vodwrap')) m.classList.add('m-vod'); }catch(e){} } }
/* 모달을 닫을 때 재생 중인 영상·소리를 반드시 정지시킨다 */
function stopMedia(root){
  try{ if(typeof wgLeave==='function') wgLeave(); }catch(e){}
  if(!root) return;
  try{
    /* Vimeo/YouTube 등 iframe: API 정지 시도 후 src 제거 */
    Array.prototype.slice.call(root.querySelectorAll('iframe')).forEach(function(f){
      try{ f.contentWindow && f.contentWindow.postMessage(JSON.stringify({method:'pause'}), '*'); }catch(e){}
      try{ f.contentWindow && f.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*'); }catch(e){}
      try{ f.removeAttribute('src'); f.src='about:blank'; }catch(e){}
    });
    Array.prototype.slice.call(root.querySelectorAll('video,audio')).forEach(function(v){
      try{ v.pause(); v.removeAttribute('src'); v.load(); }catch(e){}
    });
  }catch(e){}
  /* Vimeo Player SDK 인스턴스가 있으면 확실히 정지·해제 */
  try{
    if(window._vodPlayer){
      try{ window._vodPlayer.pause(); }catch(e){}
      try{ window._vodPlayer.unload(); }catch(e){}
      try{ window._vodPlayer.destroy(); }catch(e){}
      window._vodPlayer = null;
    }
  }catch(e){}
  try{ if(window._vodTimer){ clearInterval(window._vodTimer); window._vodTimer=null; } }catch(e){}
}
/* 모달이 닫힌 뒤에 한 번만 실행할 일을 예약합니다 (닫기 버튼·배경 클릭 어느 쪽이든) */
function onModalClose(fn){ window.__afterModal = fn; }
function closeModal(){
  const m=$('#modal');
  if(m){
    var card=$('.modal-card', m);
    stopMedia(card || m);
    m.classList.remove('show');
    /* 내용을 비워 백그라운드 재생·타이머를 확실히 끊는다 */
    setTimeout(function(){ try{ if(m && !m.classList.contains('show') && card) card.innerHTML=''; }catch(e){} }, 60);
  }
  try{ document.body.classList.remove('modal-open'); }catch(e){}
  try{
    var fn = window.__afterModal;
    if(fn){ window.__afterModal = null; setTimeout(function(){ try{ fn(); }catch(e){} }, 0); }
  }catch(e){}
}
function toast(msg){ const t=el('<div class="toast">'+esc(msg)+'</div>'); document.body.appendChild(t); setTimeout(function(){t.classList.add('show');},10); setTimeout(function(){ t.classList.remove('show'); setTimeout(function(){t.remove();},300); },2200); }

/* ---- 서버 공용 저장소 동기화 계층 ----
 서버(/api/state)가 살아있으면 모든 기기가 같은 데이터를 공유한다.
 서버가 없으면(예: 파일을 직접 열었을 때) localStorage 단독으로 동작(오프라인 폴백). */
const Net = {
 enabled:true, lastRev:null, pushTimer:null, pollTimer:null, liveTimer:null,
 pull:function(cb){
 fetch('/api/state',{cache:'no-store',headers:eHdr()}).then(function(r){ return r.ok?r.json():null; }).then(function(j){
 if(j && j.ok){ Net.lastRev=j.rev; cb(j.state||null); setTimeout(function(){ Net.markGood(); },0); } else { Net.enabled=false; cb(null); }
 }).catch(function(){ Net.enabled=false; cb(null); });
 },
 /* 받아온 데이터가 비정상적으로 비어 있으면 그대로 서버에 되밀지 않습니다.
    (한 번 잘못 밀면 서버의 학생·강의·평가가 통째로 지워질 수 있습니다) */
 safeToPush:function(){
   if(!DB || typeof DB!=='object') return false;
   if(Net._lastGood){
     var keys=['students','lectures','assessments','notices','cohorts'];
     for(var i=0;i<keys.length;i++){
       var was=Net._lastGood[keys[i]]||0, now=(DB[keys[i]]||[]).length;
       /* 이전에 있던 목록이 통째로 비었으면 비정상으로 봅니다 */
       if(was>=3 && now===0){
         try{ console.error('[push 차단]', keys[i], was+'건 → 0건'); }catch(e){}
         return false;
       }
     }
   }
   return true;
 },
 markGood:function(){
   try{ Net._lastGood={}; ['students','lectures','assessments','notices','cohorts'].forEach(function(k){
     Net._lastGood[k]=(DB[k]||[]).length; }); }catch(e){}
 },
 /* 저장이 서버에 닿기 전에 동기화가 끼어들면 방금 바꾼 값이 사라집니다.
    보내는 중에는 받아오기를 건너뜁니다. */
 _sending:false,
 push:function(){
 if(!Net.enabled) return;
 if(!Net.safeToPush()) return;
 Net._sending = true;                       /* 예약된 순간부터 보호 */
 clearTimeout(Net.pushTimer);
 Net.pushTimer=setTimeout(function(){
 if(!Net.safeToPush()){ Net._sending=false; return; }
 fetch('/api/state',{method:'PUT',headers:eHdr({'content-type':'application/json'}),body:JSON.stringify(DB)})
 .then(function(r){ return r.ok?r.json():null; })
 .then(function(j){ if(j && j.ok){ Net.lastRev=j.rev; if(j.state){ DB=ensureShape(j.state); try{localStorage.setItem(LS_KEY,JSON.stringify(DB));}catch(e){} if(typeof resetSnap==='function') resetSnap(); Net.markGood(); } } })
 .catch(function(){})
 .then(function(){ Net._sending=false; });
 },500);
 },
 /* 예약(0.5초 지연)된 저장을 지금 바로 보냅니다.
    창을 닫거나 로그아웃할 때 방금 바꾼 내용이 서버에 닿지 못하던 문제를 막습니다.
    - 보통은 fetch 로 보내고, 끝날 때까지 기다릴 수 있게 Promise 를 돌려줍니다.
    - 창이 닫히는 중이면 요청이 취소될 수 있어, 자료가 작을 때만 sendBeacon 을 씁니다.
      (sendBeacon·keepalive 는 64KB 제한이 있어 큰 자료에는 쓸 수 없습니다) */
 flush:function(opt){
   opt = opt || {};
   if(!Net.enabled) return Promise.resolve(false);
   if(!Net.safeToPush()) return Promise.resolve(false);
   clearTimeout(Net.pushTimer);
   var body;
   try{ body = JSON.stringify(DB); }catch(e){ return Promise.resolve(false); }
   if(opt.unloading && body.length < 60000){
     try{
       if(navigator && navigator.sendBeacon){
         var tk = (typeof eTok==='function') ? eTok() : '';
         var sk = (typeof eSess==='function') ? eSess() : '';
         var url = '/api/state?beacon=1' + (tk?('&t='+encodeURIComponent(tk)):'') + (sk?('&s='+encodeURIComponent(sk)):'');
         if(navigator.sendBeacon(url, new Blob([body], {type:'application/json'}))){ Net._sending=false; return Promise.resolve(true); }
       }
     }catch(e){}
   }
   return fetch('/api/state',{method:'PUT',headers:eHdr({'content-type':'application/json'}),body:body})
     .then(function(r){ return r.ok ? r.json() : null; })
     .then(function(j){ if(j && j.ok){ Net.lastRev=j.rev; Net.markGood(); } Net._sending=false; return !!(j&&j.ok); })
     .catch(function(){ Net._sending=false; return false; });
 },
 busy:function(){
 if(typeof QUIZ!=='undefined' && QUIZ && QUIZ.questions && !QUIZ.submitted) return true; // 시험 진행 중
 if(typeof TEXAM!=='undefined' && TEXAM && TEXAM.questions && !TEXAM.submitted) return true; // 토익 시험 진행 중
 if(document.querySelector('#modal.show')) return true; // 모달 열림
 if(document.querySelector('#examRoot')) return true; // 시험 오버레이
 if(document.querySelector('#texamRoot')) return true; // 토익 시험 오버레이
 return false;
 },
 /* 지금 화면을 다시 그려도 되는가.
    입력 중이거나 방금 조작한 직후에 다시 그리면 고르던 값·적던 내용이 사라집니다. */
 _lastAct: 0,
 _pending: false,
 canRender:function(){
   if(Net.busy()) return false;
   try{
     var a = document.activeElement;
     /* 아직 화면에 붙어 있는 입력 칸에 커서가 있을 때만 미룹니다 */
     if(a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) && document.body.contains(a)) return false;
     if(Date.now() - (Net._lastAct||0) < 6000) return false;              /* 방금 조작함 */
   }catch(e){}
   return true;
 },
 /* 조작이 끝나 조용해지면 미뤄 둔 화면 갱신을 처리합니다 */
 renderLater:function(){
   Net._pending = true;
   clearTimeout(Net._rTimer);
   Net._rTimer = setTimeout(function(){
     if(!Net._pending) return;
     if(!Net.canRender()){ Net.renderLater(); return; }
     Net._pending = false;
     try{ if(CURRENT && typeof renderShell==='function') renderShell(); }catch(e){}
   }, 2500);
 },
 markAct:function(){ Net._lastAct = Date.now(); },
 /* 로그인 세션이 끊기면 서버가 좁은 범위의 데이터를 내려줍니다.
    그 상태로 덮어쓰면 관리자 화면에서 연락처 같은 항목이 비어 보이므로, 덮지 않고 재로그인을 안내합니다. */
 scopeOk:function(j){
   if(!CURRENT || !j) return true;
   if(j.role === CURRENT.role) return true;
   if(Net._warned) return false;
   Net._warned = true;
   try{ toast('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.'); }catch(e){}
   setTimeout(function(){ try{ logout(); }catch(e){} }, 1800);
   return false;
 },
 poll:function(){
 if(!Net.enabled || Net.busy()) return;
 if(Net._sending) return;                   /* 저장 중에는 받아오지 않습니다 */
 fetch('/api/state',{cache:'no-store',headers:eHdr()}).then(function(r){ return r.ok?r.json():null; }).then(function(j){
 if(j && j.ok && !Net.scopeOk(j)) return;
 if(j && j.ok && j.rev!=null && j.rev!==Net.lastRev){
 Net.lastRev=j.rev;
 if(j.state){ DB=ensureShape(j.state); try{localStorage.setItem(LS_KEY,JSON.stringify(DB));}catch(e){}
          if(typeof resetSnap==='function') resetSnap();
          try{ if(typeof fixBrokenText==='function') fixBrokenText(); }catch(e){}
          try{ if(typeof seedNotices==='function') seedNotices(); }catch(e){}   /* 옛 안내문이 다시 내려와도 최신본 유지 */
          try{ if(typeof repairLectureTitles==='function') repairLectureTitles(); }catch(e){}
          try{ if(typeof repairAssignments==='function') repairAssignments(); }catch(e){}
          try{ if(typeof repairCohorts==='function') repairCohorts(); }catch(e){}
          try{ if(typeof repairMaterials==='function') repairMaterials(); }catch(e){}
 try{ if(typeof repairCohorts==='function') repairCohorts(); }catch(e){}
 try{ if(typeof repairMaterials==='function') repairMaterials(); }catch(e){}
          try{ if(typeof repairRoutineAssessments==='function') repairRoutineAssessments(); }catch(e){}
 try{ if(typeof repairAssignments==='function') repairAssignments(); }catch(e){}
 try{ if(typeof repairCohorts==='function') repairCohorts(); }catch(e){}
 try{ if(typeof repairMaterials==='function') repairMaterials(); }catch(e){}
 try{ if(typeof repairRoutineAssessments==='function') repairRoutineAssessments(); }catch(e){}
 /* 데이터는 항상 최신으로 받되, 조작 중이면 화면 갱신만 미룹니다 */
 if(CURRENT && typeof renderShell==='function'){
   if(Net.canRender()){ try{ renderShell(); }catch(e){} }
   else Net.renderLater();
 } }
 }
 }).catch(function(){});
 },
 startPolling:function(){ if(!Net.enabled) return; clearInterval(Net.pollTimer); Net.pollTimer=setInterval(Net.poll, 8000);
   /* 실시간 관제 화면을 보는 동안에는 4초마다 접속 현황을 새로 확인한다 */
   clearInterval(Net.liveTimer);
   Net.liveTimer=setInterval(function(){
     if(typeof ROUTE==='undefined' || ROUTE!=='a-control') return;
     if(Net.busy() || document.hidden) return;
     Net.poll();
     try{ if(typeof refreshPresenceCells==='function') refreshPresenceCells(); }catch(e){}
   }, 4000);
   /* 다른 탭/앱에서 돌아오면 즉시 최신 데이터로 맞춘다 */
   if(!Net._actBound){ Net._actBound=true;
     try{
       ['pointerdown','keydown','input','change','focusin'].forEach(function(ev){
         document.addEventListener(ev, Net.markAct, true);
       });
     }catch(e){}
   }
   if(!Net._visBound){ Net._visBound=true;
     try{ document.addEventListener('visibilitychange', function(){ if(!document.hidden) Net.poll(); }); }catch(e){}
     try{ window.addEventListener('focus', function(){ Net.poll(); }); }catch(e){}
   } }
};

function boot(){
 Net.pull(function(serverState){
 if(serverState){ DB = ensureShape(serverState); try{ localStorage.setItem(LS_KEY, JSON.stringify(DB)); }catch(e){} }
 if(typeof resetSnap==='function') resetSnap();
 seed(); migrate(); if(typeof migrateV2==='function') migrateV2(); restore();
 try{ fixBrokenText(); }catch(e){}
 try{ if(typeof restoreGeneratedText==='function') restoreGeneratedText(); }catch(e){}
 try{ if(typeof repairLectureTitles==='function') repairLectureTitles(); }catch(e){}
 try{ if(typeof repairAssignments==='function') repairAssignments(); }catch(e){}
 try{ if(typeof repairCohorts==='function') repairCohorts(); }catch(e){}
 try{ if(typeof repairMaterials==='function') repairMaterials(); }catch(e){}
 try{ if(typeof repairRoutineAssessments==='function') repairRoutineAssessments(); }catch(e){}
 try{ if(typeof seedNotices==='function') seedNotices(); }catch(e){}
 /* 서버에 남아 있던 옛 공지가 다시 내려와도 최신 안내문으로 유지되도록 재적용 */
 try{ setTimeout(function(){ if(typeof seedNotices==='function') seedNotices(); }, 1200); }catch(e){}
 try{ if(typeof uniInit==='function') uniInit(); }catch(e){}
 try{ if(typeof acSet==='function') acSet(acRead(), true); }catch(e){}
 try{ if(typeof toeicInit==='function') toeicInit(); }catch(e){}
 try{ if(typeof acMigrate==='function' && acMigrate()) save(); }catch(e){}
 try{ if(typeof ensureTodayAssignment==='function') ensureTodayAssignment(); }catch(e){}
 try{ if(typeof talkAutoScan==='function') setTimeout(talkAutoScan, 2500); }catch(e){}
 if(CURRENT){ renderShell(); } else { renderLogin(); }
 if(typeof LLM!=='undefined'){ LLM.init(); }
    if(typeof Auth!=='undefined'){ Auth.init().then(function(){ try{ Auth.syncPending(); }catch(e){} }); }
 try{ if(typeof markPresence==='function'){ markPresence(); setInterval(markPresence, 45000);
   document.addEventListener('visibilitychange', function(){
     if(!document.hidden){ markPresence(); }
     else if(typeof CURRENT!=='undefined' && CURRENT && DB.presence && DB.presence[CURRENT.id]){
       /* 화면을 숨기면 마지막 활동 시각만 남긴다 */
       try{ pushPresenceNow(DB.presence[CURRENT.id]); }catch(e){}
     }
   });
   /* 창을 닫으면 바로 오프라인으로 표시되도록 즉시 전송 */
   var _bye = function(){ try{ if(typeof markLogout==='function') markLogout(); }catch(e){}
     try{ if(typeof Net!=='undefined' && Net.flush) Net.flush({unloading:true}); }catch(e){} };
   window.addEventListener('pagehide', _bye);
   window.addEventListener('beforeunload', _bye);
 } }catch(e){}
 Net.startPolling();
 });
}
window.addEventListener('DOMContentLoaded', boot);
window.addEventListener('hashchange', function(){ if(!CURRENT) return; var h=''; try{ h=decodeURIComponent(location.hash.slice(1)||''); }catch(e){}
  if(h && h!==ROUTE && (navOf(CURRENT.role)||[]).some(function(n){return n.id===h;})){ ROUTE=h; renderShell(); } });


/* ---------- 깨진 글자 원천 차단 (전 데이터 재귀 검사 + 저장 전 정화) ---------- */
var BAD_CH = /[�-￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/;
var BAD_STRIP = /[�-￾￿]/g;

/* 깨진 글자를 제거하고 앞뒤 공백을 정리 */
function cleanStr(t){
  if(typeof t !== 'string' || !BAD_CH.test(t)) return t;
  var out = t.replace(BAD_STRIP, '');
  /* 짝 없는 서러게이트 제거 */
  out = out.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '').replace(/(^|[^\uD800-\uDBFF])([\uDC00-\uDFFF])/g, '$1');
  /* 줄바꿈은 반드시 보존한다 — 공백·탭만 정리 */
  out = out.replace(/[ \t\u00a0]{2,}/g, ' ')
           .replace(/[ \t]+\n/g, '\n')
           .replace(/\n{3,}/g, '\n\n')
           .replace(/[ \t]+([.,!?)\]])/g, '$1');
  return out.replace(/^[ \t]+|[ \t]+$/g, '');
}
/* 알려진 기본 문구는 원문으로 복구 */
var TEXT_TEMPLATES = [
  { test:/문법\s*백지암기/, field:'desc', value:'핵심 문법 공식을 빈 종이에 직접 쓰고 사진 또는 텍스트로 제출하세요.' }
];
/* 객체 전체를 재귀적으로 훑어 정리 */
function deepFix(obj, depth){
  depth = depth || 0;
  if(depth > 8 || !obj || typeof obj !== 'object') return 0;
  var n = 0;
  if(Object.prototype.toString.call(obj) === '[object Array]'){
    for(var i=0;i<obj.length;i++){
      var v = obj[i];
      if(typeof v === 'string'){ var c = fixWords(cleanStr(v)); if(c !== v){ obj[i] = c; n++; } }
      else n += deepFix(v, depth+1);
    }
    return n;
  }
  for(var k in obj){
    if(!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    var val = obj[k];
    if(typeof val === 'string'){
      var wf = fixWords(val);
      if(wf !== val){ obj[k] = wf; val = wf; n++; }
      if(BAD_CH.test(val)){
        var fixed = cleanStr(val);
        for(var t=0;t<TEXT_TEMPLATES.length;t++){
          var tpl = TEXT_TEMPLATES[t];
          if(tpl.field === k && (tpl.test.test(obj.title||'') || tpl.test.test(fixed))) fixed = tpl.value;
        }
        if(fixed !== val){ obj[k] = fixed; n++; }
      }
    } else if(val && typeof val === 'object'){
      n += deepFix(val, depth+1);
    }
  }
  return n;
}
/* 앞글자 유실 등 손상된 저장 텍스트를 코드 기본값으로 되돌린다 */
function restoreGeneratedText(){
  var n = 0;
  try{
    if(DB.routine && DB.routine.daily){ DB.routine.daily = null; n++; }   /* dailyRoutine()이 기본값으로 재생성 */
  }catch(e){}
  try{
    (DB.assignments||[]).forEach(function(a){
      if(a.title && /문장 만들기|백지암기/.test(a.title) && !/^(오늘|D-)/.test(a.title)){ a.title = '오늘 ' + a.title.replace(/^[^가-힣A-Za-z0-9]+/, ''); n++; }
      if(a.desc && a.desc.length < 12){ a.desc = '오늘 배운 표현으로 직접 문장을 만들어 제출하세요.'; n++; }
    });
  }catch(e){}
  if(n) save();
  return n;
}
/* 글자 유실로 훼손된 흔한 단어 복원 사전 — 오탐 위험이 없는 조합만 등록 */
var WORD_FIX = [
  [/개반(?![가-힣])/g, '개강반'],
  [/(?<![가-힣])개강(?=\s|$)(?!반)/g, '개강반'],
  [/(?<!로)그인(?=이|을|은|하| |$)/g, '로그인'],
  [/(?<!비)밀번호/g, '비밀번호'],
  [/새로침/g, '새로고침'],
  [/(?<!모)의고사/g, '모의고사'],
  [/모고사/g, '모의고사'],
  [/(?<!기)출유형/g, '기출유형'],
  [/기출유(?!형)/g, '기출유형'],
  [/(?<!이)룸편입/g, '이룸편입'],
  [/이편입(?![가-힣])/g, '이룸편입'],
  [/(?<!테)스트센터/g, '테스트센터'],
  [/레벨테스(?!트)/g, '레벨테스트']
];
function fixWords(t){
  if(typeof t !== 'string' || t.length < 2) return t;
  var out = t;
  for(var i=0;i<WORD_FIX.length;i++){ out = out.replace(WORD_FIX[i][0], WORD_FIX[i][1]); }
  return out;
}
/* 부팅 시 1회 전체 복구 */
function fixBrokenText(){
  var fixed = 0;
  try{ fixed = deepFix(DB, 0); }catch(e){}
  if(fixed) save();
  return fixed;
}
/* 저장 직전 정화 — 새 깨짐이 저장되는 것을 막는다 */
function sanitizeBeforeSave(){
  try{ return deepFix(DB, 0); }catch(e){ return 0; }
}

/* ---------- 손상된 제목 자동 복구 (부분수열 매칭) ---------- */
function _subseq(a,b){ if(!a||!b||a.length>b.length) return false; var i=0;
  for(var j=0;j<b.length&&i<a.length;j++){ if(a.charAt(i)===b.charAt(j)) i++; } return i===a.length; }
function _pick(a, cands){
  var flat=String(a||'').replace(/[\s_·\-]/g,''); if(!flat) return null;
  var best=null, bl=1e9;
  for(var i=0;i<cands.length;i++){
    var cf=cands[i].replace(/[\s_·\-]/g,'');
    if(!_subseq(flat, cf)) continue;
    var loss=cf.length-flat.length;
    if(loss<bl){ bl=loss; best=cands[i]; }
  }
  if(!best) return null;
  var lim=Math.max(3, Math.ceil(best.replace(/[\s_·\-]/g,'').length*0.35));
  return bl<=lim ? best : null;
}
/* 강의명: '이룸편입 <영역> N강' 표준형으로 복원 */
function repairLectureTitles(){
  if(typeof lecCatName !== 'function') return 0;
  var fixed = 0;
  (DB.lectures||[]).forEach(function(l){
    var t = String(l.title||'').trim();
    var m = /(\d{1,3})\s*강\s*$/.exec(t);
    if(!m) return;
    var cat = lecCatName(l.category || l.section || '');
    if(!cat || cat === '기타') return;
    var cands = ['이룸편입 ' + cat + ' ' + m[1] + '강'];
    ['어휘','문법','독해','논리','기타'].forEach(function(c){
      cands.push('이룸편입 ' + c + ' ' + m[1] + '강');
    });
    var hit = _pick(t, cands);
    var expected = '이룸편입 ' + cat + ' ' + m[1] + '강';
    if(hit && t !== hit){ l.title = (hit === expected) ? expected : hit; l._u = Date.now(); fixed++; }
    else if(!hit && _subseq(t.replace(/\s/g,''), expected.replace(/\s/g,''))){ l.title = expected; l._u = Date.now(); fixed++; }
  });
  if(fixed) save();
  return fixed;
}
/* 기수명: 'YYYY년MM월DD일 개강반' 표준형으로 복원 */
function repairCohorts(){
  var fixed = 0;
  (DB.cohorts||[]).forEach(function(c){
    var t = String(c.name||'').trim();
    var t2 = t.replace(/개반(?![가-힣])/g, '개강반')
              .replace(/(?<![가-힣])개강(?!반)(?=\s|$)/g, '개강반');
    /* '2026년08월01' 처럼 '일'이 빠진 경우 보정 */
    t2 = t2.replace(/(\d{4}년\s*\d{1,2}월\s*\d{1,2})(?!일)(?=\s|$|개)/g, '$1일');
    if(t2 !== t){ c.name = t2; c._u = Date.now(); fixed++; }
  });
  if(fixed) save();
  return fixed;
}
