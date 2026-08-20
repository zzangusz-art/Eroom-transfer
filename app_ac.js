/* ===================== 이룸 LMS · ACADEMY (학원 전환) =====================
   한 개의 LMS 안에서 여러 학원(편입 · 토익)을 운영하기 위한 공통 뼈대입니다.

   원칙
   - 기존 편입 데이터는 ac 값이 없습니다. ac 가 없으면 항상 '편입'으로 봅니다.
     → 예전 데이터를 건드리지 않아도 그대로 동작합니다.
   - 새로 만드는 레코드에는 acStamp() 로 현재 학원을 찍습니다.
   - 화면에서 목록을 읽을 때는 acf() 로 현재 학원 것만 걸러 냅니다.
     acf() 는 「같은 객체」를 담은 새 배열을 돌려주므로 find/forEach 로 찾은 뒤
     값을 고쳐도 원본이 그대로 바뀝니다.
   ========================================================================= */

const ACADEMIES = {
  transfer:{ id:'transfer', name:'이룸편입', short:'편입', sub:'편입 하이브리드 LMS',
             tag:'편입 영어의 기준을 새로 세우다', c1:'#4f46e5', c2:'#7c3aed', side1:'#1e1b4b', side2:'#312e81' },
  toeic:{    id:'toeic',    name:'이룸토익', short:'토익', sub:'TOEIC 목표점수 달성 LMS',
             tag:'목표 점수까지, 가장 짧은 길', c1:'#0d9488', c2:'#0891b2', side1:'#042f2e', side2:'#134e4a' }
};
const AC_IDS = ['transfer','toeic'];
const AC_DEFAULT = 'transfer';

/* 현재 보고 있는 학원 */
var AC = AC_DEFAULT;

function acMeta(a){ return ACADEMIES[a || AC] || ACADEMIES[AC_DEFAULT]; }
function acName(a){ return acMeta(a).name; }
function acShort(a){ return acMeta(a).short; }
function acValid(a){ return AC_IDS.indexOf(a)>=0 ? a : AC_DEFAULT; }

/* 레코드가 속한 학원 — 값이 없으면 편입(기존 데이터) */
function acOf(rec){ var v = rec && rec.ac; return (v && ACADEMIES[v]) ? v : AC_DEFAULT; }
function acIs(rec, a){ return acOf(rec) === acValid(a || AC); }

/* 현재 학원 것만 걸러낸 배열 (원본 객체 그대로) */
function acf(arr){
  if(!arr || !arr.length) return arr || [];
  var cur = AC;
  var out = [];
  for(var i=0;i<arr.length;i++){ var r=arr[i]; if(!r || acOf(r)===cur) out.push(r); }
  return out;
}
/* 특정 학원으로 거르기 */
function acfOf(arr, a){
  a = acValid(a);
  return (arr||[]).filter(function(r){ return !r || acOf(r)===a; });
}
/* 새 레코드에 현재 학원을 찍습니다 */
function acStamp(rec, a){ if(rec && typeof rec==='object' && !rec.ac) rec.ac = acValid(a || AC); return rec; }

/* 학원 전환 — 화면 색과 메뉴가 함께 바뀝니다 */
function acSet(a, silent){
  var n = acValid(a);
  if(n===AC && silent) return;
  AC = n;
  try{ sessionStorage.setItem('eroom_ac', AC); localStorage.setItem('eroom_ac', AC); }catch(e){}
  acPaint();
  if(!silent){
    ROUTE = null;                       /* 학원마다 메뉴가 달라 첫 화면부터 다시 */
    try{ sessionStorage.removeItem('eroom_route'); localStorage.removeItem('eroom_route'); }catch(e){}
    if(typeof renderShell==='function') renderShell();
  }
}
function acRead(){
  var v=''; try{ v = sessionStorage.getItem('eroom_ac') || localStorage.getItem('eroom_ac') || ''; }catch(e){}
  return acValid(v);
}
/* 색상 테마 적용 */
function acPaint(){
  try{
    var m = acMeta(), b = document.body;
    AC_IDS.forEach(function(x){ b.classList.remove('ac-'+x); });
    b.classList.add('ac-'+AC);
    var r = document.documentElement;
    r.style.setProperty('--pri', m.c1);
    r.style.setProperty('--pri2', m.c2);
    r.style.setProperty('--side1', m.side1);
    r.style.setProperty('--side2', m.side2);
    var t = document.querySelector('title'); if(t) t.textContent = m.name + ' LMS';
  }catch(e){}
}

/* 로그인한 사람의 소속 학원 — 학생·강사는 자기 학원으로 고정, 관리자는 전환 가능 */
function acOfUser(role, id){
  try{
    if(role==='student' || role==='test'){
      var s=(DB.students||[]).find(function(x){ return x.id===id; }); if(s) return acOf(s);
    }else if(role==='instructor'){
      var t=(DB.instructors||[]).find(function(x){ return x.id===id; }); if(t) return acOf(t);
    }else if(role==='admin'){
      var a=(DB.admins||[]).find(function(x){ return x.id===id; });
      if(a && a.ac && a.acLock) return acOf(a);       /* 학원 전용 관리자 */
    }
  }catch(e){}
  return null;
}
function acCanSwitch(){
  if(!CURRENT || CURRENT.role!=='admin') return false;
  try{
    var a=(DB.admins||[]).find(function(x){ return x.id===CURRENT.id; });
    if(a && a.acLock) return false;
  }catch(e){}
  return true;
}

/* 관리자용 학원 전환 버튼 (사이드바에 들어갑니다) */
function acSwitchHtml(){
  if(!acCanSwitch()) return '';
  return '<div class="ac-switch">' + AC_IDS.map(function(a){
    var m=ACADEMIES[a];
    return '<button class="ac-btn '+(a===AC?'on':'')+'" data-ac="'+a+'">'+esc(m.short)+'</button>';
  }).join('') + '</div>';
}
function acBindSwitch(){
  try{
    (document.querySelectorAll('.ac-btn')||[]).forEach(function(b){
      b.onclick=function(){ acSet(b.dataset.ac); };
    });
  }catch(e){}
}

/* 학원별 학생/강사 수 — 대시보드용 */
function acCount(a, key){ return acfOf(DB[key]||[], a).length; }

/* 예전 데이터 정리: ac 가 잘못 들어간 값은 편입으로 되돌립니다 */
/* 관리자(admins)는 학원 공통이라 태그하지 않습니다 */
const AC_TAGGED = ['students','instructors','lectures','cohorts','assessments',
  'notices','materials','assignments','calEvents','levelTests'];
function acMigrate(){
  var ch=false;
  AC_TAGGED.forEach(function(k){
    (DB[k]||[]).forEach(function(r){
      if(r && r.ac && !ACADEMIES[r.ac]){ delete r.ac; ch=true; }
    });
  });
  return ch;
}

/* ---------- 새로 만든 레코드에 학원 도장 찍기 ----------
   서버에서 받아온 레코드(ac 없는 예전 편입 데이터 포함)는 건드리지 않고,
   이 기기에서 「새로 생긴」 레코드에만 현재 학원을 찍습니다. */
function acSeenReset(){
  var seen = {};
  AC_TAGGED.forEach(function(k){
    var s = {};
    (DB && DB[k] || []).forEach(function(r){ if(r && r.id!=null) s[r.id]=1; });
    seen[k]=s;
  });
  window.__acSeen = seen;
}
function acStampNew(){
  var seen = window.__acSeen;
  if(!seen){ acSeenReset(); return; }               /* 첫 호출: 기준만 잡고 끝 */
  AC_TAGGED.forEach(function(k){
    var s = seen[k] || (seen[k]={});
    (DB && DB[k] || []).forEach(function(r){
      if(!r || r.id==null) return;
      if(!s[r.id]){ s[r.id]=1; if(!r.ac) r.ac = AC; }
    });
  });
}
