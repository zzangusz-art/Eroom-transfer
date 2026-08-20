// eroom-lms server : static hosting + Claude API proxy + shared state store (zero dependency)
const APP_VERSION = '7.2.0';
const BUILD_AT = '2026-06-24';

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PORT    = process.env.PORT || 3000;
const PUBLIC  = path.join(__dirname, 'public');
let INDEX_CACHE = null;   /* index.html 메모리 캐시 */
const API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '';
const MODEL   = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest';

// ---- shared state store ----
// On Railway, attach a Volume and set DATA_DIR=/data so data survives redeploys.
const DATA_DIR  = process.env.DATA_DIR || path.resolve(__dirname, '..', 'eroom-data');
const DATA_FILE = process.env.DATA_FILE || path.join(DATA_DIR, 'eroom_state.json');
const MAX_BODY  = 6 * 1024 * 1024; // 6MB
let STATE = null;   // canonical DB object (or null until first device seeds)
let REV   = 0;      // bumped on every successful write; clients poll this

// ---- API access token: blocks anonymous read/write of /api/state and /api/ai ----
const crypto = require('crypto');
const TOKEN_FILE = path.join(DATA_DIR, '.eroom_token');
let API_TOKEN = process.env.API_TOKEN || '';
if(!API_TOKEN){ try{ API_TOKEN = fs.readFileSync(TOKEN_FILE,'utf8').trim(); }catch(e){} }
if(!API_TOKEN){ API_TOKEN = crypto.randomBytes(18).toString('hex'); try{ if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true}); fs.writeFileSync(TOKEN_FILE, API_TOKEN); }catch(e){} }
function qparam(req, k){ try{ var i=String(req.url||'').indexOf('?'); if(i<0) return '';
  var sp=new URLSearchParams(String(req.url).slice(i+1)); return sp.get(k)||''; }catch(e){ return ''; } }
function authed(req){ if(!API_TOKEN) return true;
  if(req.headers['x-eroom-token']===API_TOKEN) return true;
  /* sendBeacon 은 헤더를 붙일 수 없습니다. 창이 닫힐 때 보내는 beacon 저장에만
     쿼리로 받은 토큰을 인정합니다 (그 외 요청은 헤더만 인정) */
  return qparam(req,'beacon')==='1' && qparam(req,'t')===API_TOKEN; }
const FILE_MAX = +(process.env.FILE_MAX_MB || 100) * 1024 * 1024;   /* 업로드 최대 용량 (기본 100MB) */
/* 저장 데이터의 깨진 문자(U+FFFD 등) 제거 — 서버 측 최종 방어 */
function stripBadChars(o, d){
  d = d||0; if(!o || typeof o!=='object' || d>10) return o;
  const BAD = /[\uFFFD\uFFFE\uFFFF]/g;
  const HAS = /[\uFFFD\uFFFE\uFFFF]/;   /* test 용은 /g 를 쓰지 않습니다 (검사 위치가 남아 절반만 걸리던 문제) */
  if(Array.isArray(o)){
    for(let i=0;i<o.length;i++){
      if(typeof o[i]==='string'){ if(HAS.test(o[i])) o[i]=o[i].replace(BAD,'').replace(/\s{2,}/g,' ').trim(); }
      else stripBadChars(o[i], d+1);
    }
    return o;
  }
  for(const k of Object.keys(o)){
    const v=o[k];
    if(typeof v==='string'){ if(HAS.test(v)) o[k]=v.replace(BAD,'').replace(/\s{2,}/g,' ').trim(); }
    else if(v && typeof v==='object') stripBadChars(v, d+1);
  }
  return o;
}
function safeName(n){ return String(n||'file').replace(/[^\w.\-가-힣 ]/g,'_').slice(0,120) || 'file'; }

// ---- 서버 측 인증(비밀번호 해시) ----
const AUTH_FILE = path.join(DATA_DIR, 'eroom_auth.json');
let AUTH = {};
try{ AUTH = JSON.parse(fs.readFileSync(AUTH_FILE,'utf8')) || {}; }catch(e){ AUTH = {}; }
function saveAuth(){ try{ if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true});
  fs.writeFileSync(AUTH_FILE+'.tmp', JSON.stringify(AUTH)); fs.renameSync(AUTH_FILE+'.tmp', AUTH_FILE); }catch(e){ console.log('auth save error: '+e.message); } }
function hashPw(pw, salt){ salt = salt || crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(String(pw), salt, 32).toString('hex'); return { salt:salt, hash:h }; }
function verifyPw(pw, rec){ if(!rec||!rec.salt||!rec.hash) return false;
  try{ const h = crypto.scryptSync(String(pw), rec.salt, 32).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(h,'hex'), Buffer.from(rec.hash,'hex')); }catch(e){ return false; } }
function setCred(username, pw, role, id, name){ if(!username||!pw) return false;
  const k = String(username).toLowerCase(); const s = hashPw(pw);
  AUTH[k] = { salt:s.salt, hash:s.hash, role:role||'student', id:id||'', name:name||'', at:Date.now() }; saveAuth(); return true; }
// 공유 상태에서 비밀번호 제거(브라우저로 평문 비밀번호가 내려가지 않도록)
/* ===================== 로그인 세션 · 역할별 데이터 범위 =====================
   API 토큰은 페이지를 여는 누구나 갖게 되므로, 그것만으로는 누가 요청했는지 알 수 없습니다.
   그래서 로그인에 성공하면 세션 토큰을 따로 발급하고, 그 토큰의 역할에 따라
   /api/state 로 내려보내는 범위를 줄입니다. */
const SESS_FILE = path.join(DATA_DIR, '.eroom_sessions.json');
let SESS = Object.create(null);
const SESS_TTL = 12 * 60 * 60 * 1000;      /* 12시간 */
try{ const raw = JSON.parse(fs.readFileSync(SESS_FILE,'utf8')); if(raw && typeof raw==='object') SESS = raw; }catch(e){}
let sessSaveTimer = null;
function sessSave(){
  clearTimeout(sessSaveTimer);
  sessSaveTimer = setTimeout(function(){
    try{ if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true});
         fs.writeFileSync(SESS_FILE, JSON.stringify(SESS)); }catch(e){}
  }, 1500);
}
function sessSweep(){
  const now = Date.now();
  Object.keys(SESS).forEach(function(k){
    const s = SESS[k];
    if(!s || typeof s!=='object' || !s.at || (now - s.at > SESS_TTL)) delete SESS[k];
  });
}
function sessNew(user){
  sessSweep();
  const t = crypto.randomBytes(24).toString('hex');
  SESS[t] = { id:user.id, role:user.role, name:user.name, at:Date.now() };
  sessSave();
  return t;
}
function sessOf(req){
  const t = (req.headers['x-eroom-sess'] || qparam(req,'s'));
  if(!t || typeof t !== 'string') return null;
  const s = SESS[t];
  if(!s || typeof s!=='object' || !s.role) return null;
  if(Date.now() - s.at > SESS_TTL){ delete SESS[t]; sessSave(); return null; }
  if(Date.now() - s.at > 60000){ s.at = Date.now(); sessSave(); }
  return s;
}
/* 다른 사람 기록에서 지우는 개인정보 항목 */
const SCRUB_FIELDS = ['pw','phone','parentPhone','email','memo','note','school','creator',
                      'goals','goalSchool','goalDept','examDate','address'];
function scrubPerson(u){
  if(!u || typeof u !== 'object') return u;
  const c = {};
  Object.keys(u).forEach(function(k){ if(SCRUB_FIELDS.indexOf(k) < 0) c[k] = u[k]; });
  return c;
}
/* 원본에 없던 항목이라도 빈 배열/빈 객체로 돌려줍니다.
   undefined 를 내려보내면 화면 쪽에서 목록을 읽다가 멈춥니다. */
function onlyMine(arr, myId, key){
  if(!Array.isArray(arr)) return [];
  return arr.filter(function(x){ return x && x[key||'studentId'] === myId; });
}
function onlyMyKey(obj, myId){
  const c = {};
  if(isPlainObj(obj) && obj[myId] !== undefined) c[myId] = obj[myId];
  return c;
}
/* 역할에 따라 내려줄 상태를 줄입니다 */
/* 체험 계정이 저장할 수 있는 범위 — 본인 기록만 통과시킵니다 */
/* 학생 화면에서 스스로 바꾸는 항목만 통과시킵니다.
   이름·연락처·메모·이용기간 같은 관리자 항목은 학생 쪽 브라우저가 덮어쓰지 못합니다.
   (체험 계정으로 다시 체험하면 관리자가 적어 둔 정보가 지워지던 문제) */
const SELF_FIELDS = ['id','_u','cls','level','goalSchool','goalDept','goals','examDate','coachId'];
function limitSelfStudent(rec){
  const out = {};
  SELF_FIELDS.forEach(function(k){ if(rec[k] !== undefined) out[k] = rec[k]; });
  return out;
}
function limitTestWrite(inc, myId){
  if(!isPlainObj(inc)) return {};
  const out = {};
  /* 걸러낸 결과가 비면 키 자체를 넣지 않습니다.
     빈 배열을 넘기면 병합 규칙상 서버의 기존 목록을 통째로 지워버리기 때문입니다. */
  if(Array.isArray(inc.students)){
    const mine = inc.students.filter(function(s){ return s && s.id === myId; }).map(limitSelfStudent);
    if(mine.length) out.students = mine;
  }
  ['sessions','levelTests','mockExams','assignments','questionsToTeacher'].forEach(function(k){
    if(!Array.isArray(inc[k])) return;
    const mine = inc[k].filter(function(x){ return x && x.studentId === myId; });
    if(mine.length) out[k] = mine;
  });
  ['watch','vocab','idiom','notes','wrongMemo','dailyTests','presence'].forEach(function(k){
    if(isPlainObj(inc[k]) && inc[k][myId] !== undefined){ out[k] = {}; out[k][myId] = inc[k][myId]; }
  });
  return out;
}
function scopeState(state, sess){
  if(!state) return state;
  const role = sess ? sess.role : null;
  const myId = sess ? sess.id : null;

  /* 관리자·강사는 원래대로 전부 봅니다 */
  if(role === 'admin' || role === 'instructor') return state;

  const out = Object.assign({}, state);

  /* 체험(TEST) 계정 — 레벨테스트·진단 리포트만 쓰므로 본인 것만 내려보냅니다 */
  if(role === 'test'){
    out.students    = (state.students||[]).filter(function(s){ return s && s.id === myId; });
    out.instructors = [];
    out.admins      = [];
    out.sessions    = onlyMine(state.sessions, myId);
    out.levelTests  = onlyMine(state.levelTests, myId);
    out.mockExams   = onlyMine(state.mockExams, myId);
    out.assignments = onlyMine(state.assignments, myId);
    out.watch       = onlyMyKey(state.watch, myId);
    out.vocab       = onlyMyKey(state.vocab, myId);
    out.idiom       = onlyMyKey(state.idiom, myId);
    out.notes       = onlyMyKey(state.notes, myId);
    out.wrongMemo   = onlyMyKey(state.wrongMemo, myId);
    out.dailyTests  = onlyMyKey(state.dailyTests, myId);
    out.presence    = onlyMyKey(state.presence, myId);
    out.ltGrants    = onlyMyKey(state.ltGrants, myId);
    out.questionsToTeacher = onlyMine(state.questionsToTeacher, myId);
    out.toeicSessions = onlyMine(state.toeicSessions, myId);
    out.toeicGoal   = onlyMyKey(state.toeicGoal, myId);
    out.toeicWrong  = onlyMyKey(state.toeicWrong, myId);
    out.toeicWord   = onlyMyKey(state.toeicWord, myId);
    const sc = {};
    if(isPlainObj(state.scores)){
      Object.keys(state.scores).forEach(function(aid){ sc[aid] = onlyMyKey(state.scores[aid], myId); });
    }
    out.scores = sc;
    return out;
  }

  /* 학생 · 로그인 전 — 다른 사람의 연락처·메모 같은 개인정보를 지웁니다 */
  ['students','instructors','admins'].forEach(function(k){
    if(!Array.isArray(state[k])) return;
    out[k] = state[k].map(function(u){ return (myId && u && u.id === myId) ? u : scrubPerson(u); });
  });
  return out;
}
function stripPw(state){ if(!state) return state;
  ['students','instructors','admins'].forEach(function(k){ if(Array.isArray(state[k])) state[k].forEach(function(u){ if(u && 'pw' in u) delete u.pw; }); });
  return state; }
// 기본 계정 4종 자동 생성(자격증명이 하나도 없을 때) — 잠김 방지
const DEFAULT_ACCOUNTS = [
  { username:'eroom_master',  pw:'eroom2026!',  role:'admin',      id:'a1',   name:'관리자' },
  { username:'eroom_teacher', pw:'teacher2026!',role:'instructor', id:'i1',   name:'이룸 강사' },
  { username:'eroom_student', pw:'student2026!',role:'student',    id:'s1',   name:'이룸 학생' },
  { username:'TEST',          pw:'eroom100',    role:'test',       id:'demo', name:'체험 계정' }
];
function seedAuthDefaults(){
  if(Object.keys(AUTH).length) return false;
  DEFAULT_ACCOUNTS.forEach(function(a){ setCred(a.username, a.pw, a.role, a.id, a.name); });
  console.log('default accounts seeded: ' + DEFAULT_ACCOUNTS.map(function(a){return a.username;}).join(', '));
  return true;
}
seedAuthDefaults();
// 공유 상태에 기본 사용자 레코드가 없으면 추가(비밀번호 제외)
const ARR_KEYS = ['students','instructors','admins','lectures','cohorts','assigns','assessments','notices',
  'materials','calEvents','sessions','levelTests','mockExams','assignments','schedules','questionsToTeacher',
  'qna','holidays','submissions','certs','kakaoLog','recordings','_deletedIds',
  /* 토익 학원 */ 'toeicQ','toeicSets','toeicSessions','toeicExams','toeicDates','toeicCuts','toeicVoca'];
const OBJ_KEYS = ['scores','watch','vocab','idiom','notes','wrongMemo','dailyTests','presence','ltGrants',
  'config','routine','levelTest','kakao','diligence','dailyDone','attendance','memos',
  /* 토익 학원 */ 'toeicConf','toeicGoal','toeicWrong','toeicWord'];
/* 배열 자리에 배열이 아닌 값이 오면 무시합니다. 그대로 두면 뒤쪽에서 터집니다. */
function sanitizeIncoming(inc){
  if(!isPlainObj(inc)) return {};
  const out = {};
  Object.keys(inc).forEach(function(k){
    const v = inc[k];
    if(ARR_KEYS.indexOf(k) >= 0){ if(Array.isArray(v)) out[k] = v; return; }
    if(OBJ_KEYS.indexOf(k) >= 0){ if(isPlainObj(v)) out[k] = v; return; }
    out[k] = v;
  });
  return out;
}
function ensureDefaultUsers(state){
  if(!state) return state;
  ARR_KEYS.forEach(function(k){ if(state[k]!==undefined && !Array.isArray(state[k])) delete state[k]; });
  OBJ_KEYS.forEach(function(k){ if(state[k]!==undefined && !isPlainObj(state[k])) delete state[k]; });
  state.admins = Array.isArray(state.admins)?state.admins:[];
  state.instructors = Array.isArray(state.instructors)?state.instructors:[];
  state.students = Array.isArray(state.students)?state.students:[];
  DEFAULT_ACCOUNTS.forEach(function(a){
    var list = a.role==='admin' ? state.admins : (a.role==='instructor' ? state.instructors : state.students);
    if(!list.some(function(u){ return u && (u.id===a.id || String(u.username||'').toLowerCase()===a.username.toLowerCase()); })){
      var rec = { id:a.id, name:a.name, username:a.username, createdAt:new Date().toISOString().slice(0,10) };
      if(a.role==='test') rec.testOnly = true;
      if(a.role==='student'){ rec.cls=null; rec.instructorId='i1'; }
      list.push(rec);
    }
  });
  return state;
}
var _loginHits = {};
function loginRateOk(ip){ var n=Date.now(); var w=_loginHits[ip]; if(!w||n-w.t>300000){ w={t:n,n:0}; } w.n++; _loginHits[ip]=w; return w.n<=20; }
function secHeaders(extra){ return Object.assign({ 'X-Content-Type-Options':'nosniff', 'X-Frame-Options':'SAMEORIGIN', 'Referrer-Policy':'strict-origin-when-cross-origin' }, extra||{}); }
var _aiHits = {};
function aiRateOk(ip){ var now=Date.now(); var w=_aiHits[ip]; if(!w || now-w.t>60000){ w={t:now,n:0}; } w.n++; _aiHits[ip]=w; return w.n<=30; }

function readStateFile(fn){
  const raw = fs.readFileSync(fn, 'utf8');
  const j = JSON.parse(raw);
  if (j && typeof j === 'object') return { state: j.state || null, rev: j.rev || 0 };
  throw new Error('invalid state file');
}
(function loadState(){
  for (const fn of [DATA_FILE, DATA_FILE + '.bak']){
    try{ const r = readStateFile(fn); STATE = r.state; REV = r.rev;
      console.log('state loaded: rev='+REV+' file='+fn); return; }catch(e){}
  }
  console.log('no existing state file ('+DATA_FILE+') - starting empty');
})();

function persist(){ try{ stripBadChars(STATE); }catch(e){}
  try{ if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive:true }); }catch(e){}
  const tmp = DATA_FILE + '.tmp';
  try{
    // keep a rolling backup of the previous good state before overwriting
    try{ if (fs.existsSync(DATA_FILE)) fs.copyFileSync(DATA_FILE, DATA_FILE + '.bak'); }catch(e){}
    fs.writeFileSync(tmp, JSON.stringify({ rev:REV, state:STATE }));
    fs.renameSync(tmp, DATA_FILE);
  }catch(e){ console.log('persist error: '+e.message); }
}

function isPlainObj(v){ return v && typeof v==='object' && !Array.isArray(v); }
// union arrays of objects by id (incoming overrides same id, base-only kept)
// 레코드별 수정시각(_u) 기준 병합 — 오래된 클라이언트가 최신 값을 덮어쓰지 못하게 함
function mergeById(base, inc){
  const map = {}; const order = [];
  (Array.isArray(base)?base:[]).forEach(function(o){ if(o && o.id!=null){ if(!(o.id in map)) order.push(o.id); map[o.id]=o; } });
  (Array.isArray(inc)?inc:[]).forEach(function(o){
    if(!o || o.id==null) return;
    if(!(o.id in map)){ order.push(o.id); map[o.id]=o; return; }
    var b = map[o.id];
    var bu = +(b && b._u) || 0, iu = +(o && o._u) || 0;
    // 들어온 값이 더 최신이면 덮어쓰고, 아니면 서버(기존) 값을 우선 — 양쪽 필드는 합집합으로 보존
    map[o.id] = (iu >= bu) ? Object.assign({}, b, o) : Object.assign({}, o, b);
  });
  return order.map(function(id){ return map[id]; });
}
// 사용자별 기록을 _u(기록시각) 기준으로 병합 — 오래된 기기가 최신 접속기록을 되돌리지 못하게 함
function mergeStamped(base, inc){
  const out = isPlainObj(base) ? Object.assign({}, base) : {};
  Object.keys(inc||{}).forEach(function(k){
    const b = out[k], v = inc[k];
    if(!isPlainObj(v)){ out[k] = v; return; }
    if(!isPlainObj(b)){ out[k] = v; return; }
    out[k] = (+(v._u)||0) >= (+(b._u)||0) ? v : b;
  });
  return out;
}
/* 강의 회독 기록은 '되돌아가지 않는' 값입니다.
   오래 열어둔 다른 탭이 옛 데이터를 올려도 회독 수·진도가 줄지 않게 큰 값을 남깁니다. */
function mergeWatch(base, inc){
  const out = isPlainObj(base) ? Object.assign({}, base) : {};
  Object.keys(inc||{}).forEach(function(sid){
    const bi = isPlainObj(out[sid]) ? out[sid] : {};
    const vi = inc[sid];
    if(!isPlainObj(vi)){ out[sid] = vi; return; }
    const m = Object.assign({}, bi);
    Object.keys(vi).forEach(function(lid){
      const b = bi[lid], v = vi[lid];
      if(!isPlainObj(v)){ m[lid] = v; return; }
      if(!isPlainObj(b)){ m[lid] = v; return; }
      const r = Object.assign({}, b, v);
      r.count = Math.max(+(b.count)||0, +(v.count)||0);          /* 회독 수는 줄지 않습니다 */
      r.prog  = Math.max(+(b.prog)||0,  +(v.prog)||0);           /* 진도도 줄지 않습니다 */
      /* 인정일은 먼저 인정받은 날을 남깁니다 */
      if(b.certifiedAt && v.certifiedAt) r.certifiedAt = (b.certifiedAt < v.certifiedAt) ? b.certifiedAt : v.certifiedAt;
      else r.certifiedAt = b.certifiedAt || v.certifiedAt || null;
      if(b.openedAt && v.openedAt) r.openedAt = (b.openedAt < v.openedAt) ? b.openedAt : v.openedAt;
      m[lid] = r;
    });
    out[sid] = m;
  });
  return out;
}
function deepMerge(base, inc, depth){
  depth = depth||0;
  if(depth > 12) return isPlainObj(inc) ? inc : base;   /* 지나치게 깊은 데이터로 스택이 넘치지 않게 */
  const out = isPlainObj(base) ? Object.assign({}, base) : {};
  Object.keys(inc).forEach(function(k){
    const b = out[k], v = inc[k];
    if (k === 'presence'){ out[k] = mergeStamped(isPlainObj(b)?b:{}, isPlainObj(v)?v:{}); return; }
    if (k === 'watch'){ out[k] = mergeWatch(isPlainObj(b)?b:{}, isPlainObj(v)?v:{}); return; }
    if (Array.isArray(v)){
      if (v.length && isPlainObj(v[0]) && ('id' in v[0])) out[k] = mergeById(Array.isArray(b)?b:[], v);
      else if (v.length === 0 && Array.isArray(b) && b.length && ARR_KEYS.indexOf(k) >= 0){
        /* 빈 목록이 들어와도 서버에 있던 자료를 지우지 않습니다.
           (동기화가 늦은 기기나 취소된 요청 때문에 학생·강의·평가가 통째로 사라지던 경로)
           삭제는 _deletedIds(툼스톤)로만 전파됩니다. */
        out[k] = b;
      }
      else out[k] = v; // primitive arrays / no-id arrays: replace
    } else if (isPlainObj(v)){
      out[k] = deepMerge(isPlainObj(b)?b:{}, v, depth+1);
    } else {
      out[k] = v;
    }
  });
  // tombstones: union deleted-id list so deletions propagate across devices
  var da=(base&&base._deletedIds)||[], dbb=(inc&&inc._deletedIds)||[];
  if(da.length||dbb.length){ var dset={}; da.concat(dbb).forEach(function(x){dset[x]=1;}); out._deletedIds=Object.keys(dset); }
  return out;
}
function applyTombstones(state){
  if(!state || !Array.isArray(state._deletedIds) || !state._deletedIds.length) return state;
  var del={}; state._deletedIds.forEach(function(x){del[x]=1;});
  /* 최상위뿐 아니라 한 단계 안쪽(예: kakao.queue)까지 훑어 지운 항목이 되살아나지 않게 합니다 */
  function walk(node, depth){
    if(!node || typeof node!=='object' || depth>4) return node;
    Object.keys(node).forEach(function(k){
      if(k==='_deletedIds') return;
      var v=node[k];
      if(Array.isArray(v)){
        if(v.length && isPlainObj(v[0]) && ('id' in v[0])) node[k]=v.filter(function(o){ return !(o && del[o.id]); });
      } else if(isPlainObj(v)) walk(v, depth+1);
    });
    return node;
  }
  walk(state, 0);
  /* 삭제 표시가 무한정 쌓이지 않도록 최근 3000개만 남깁니다 */
  if(state._deletedIds.length > 3000) state._deletedIds = state._deletedIds.slice(-3000);
  return state;
}

function sendJson(res, code, obj){ const s = JSON.stringify(obj);
  res.writeHead(code, secHeaders({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'})); res.end(s); }

// ---- Claude (Anthropic Messages API) call ----
// ============ 카카오 비즈메시지(비즈고 / 인포뱅크 OMNI API v2) ============
// API 키는 서버에만 보관한다 — 브라우저로 절대 내려보내지 않는다.
const KAKAO_FILE = path.join(DATA_DIR, 'eroom_kakao.json');
const KAKAO_LOG_FILE = path.join(DATA_DIR, 'eroom_kakao_log.json');
let KAKAO = {
  apiKey  : process.env.BIZGO_API_KEY || '',
  senderKey: process.env.BIZGO_SENDER_KEY || '',   // 카카오톡 채널 발신프로필 키
  sandbox : false,                                  // true면 테스트망(실제 발송 안 됨)
  sms     : { enabled:false, from:'' },             // 알림톡 실패 시 문자 대체발송
  updatedAt: ''
};
try{ KAKAO = Object.assign(KAKAO, JSON.parse(fs.readFileSync(KAKAO_FILE,'utf8'))||{}); }catch(e){}
if(!KAKAO.apiKey) KAKAO.apiKey = 'mars_ak_50af63f1-a676-480e-9bb3-5a03e2335d41';
function saveKakao(){ try{ if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true});
  fs.writeFileSync(KAKAO_FILE+'.tmp', JSON.stringify(KAKAO)); fs.renameSync(KAKAO_FILE+'.tmp', KAKAO_FILE); }catch(e){ console.log('kakao save error: '+e.message); } }
let KAKAO_LOG = [];
try{ KAKAO_LOG = JSON.parse(fs.readFileSync(KAKAO_LOG_FILE,'utf8'))||[]; }catch(e){ KAKAO_LOG=[]; }
function pushKakaoLog(rec){
  KAKAO_LOG.unshift(rec);
  if(KAKAO_LOG.length>1000) KAKAO_LOG.length=1000;
  try{ fs.writeFileSync(KAKAO_LOG_FILE+'.tmp', JSON.stringify(KAKAO_LOG)); fs.renameSync(KAKAO_LOG_FILE+'.tmp', KAKAO_LOG_FILE); }catch(e){}
}
function kakaoBase(){ return KAKAO.sandbox ? 'https://sandbox-mars.ibapi.kr/api/comm' : 'https://mars.ibapi.kr/api/comm'; }
function maskKey(k){ k=String(k||''); return k ? (k.slice(0,12)+'••••'+k.slice(-4)) : ''; }
function onlyDigits(v){ return String(v||'').replace(/[^0-9]/g,''); }

// 비즈고 API 호출 (POST JSON)
function bizgoPost(pathname, payload, cb){
  if(!KAKAO.apiKey) return cb(new Error('API 키가 설정되지 않았습니다'), null);
  let body; try{ body = JSON.stringify(payload); }catch(e){ return cb(e, null); }
  const url = kakaoBase() + pathname;
  const req = https.request(url, {
    method:'POST',
    headers:{ 'content-type':'application/json', 'Authorization': KAKAO.apiKey,
              'content-length': Buffer.byteLength(body) }
  }, (r)=>{
    let chunks=[]; r.on('data', d=>chunks.push(d));
    r.on('end', ()=>{
      const raw = Buffer.concat(chunks).toString('utf8');
      let j=null; try{ j=JSON.parse(raw); }catch(e){}
      cb(null, { status:r.statusCode, body:j, raw:raw });
    });
  });
  req.setTimeout(20000, ()=>{ req.destroy(new Error('응답 시간이 초과되었습니다(20초)')); });
  req.on('error', e=>cb(e, null));
  req.write(body); req.end();
}

// 알림톡 발송 — 수신자 200명 단위로 나눠 보낸다
function kakaoSend(opt, cb){
  const senderKey = opt.senderKey || KAKAO.senderKey;
  if(!senderKey) return cb(new Error('발신프로필 키(senderKey)가 없습니다 — [알림톡 > 설정]에서 입력해 주세요'), null);
  if(!opt.templateCode) return cb(new Error('템플릿 코드가 없습니다'), null);
  if(!Array.isArray(opt.destinations)) opt.destinations = [];
  if(!Array.isArray(opt.buttons)) opt.buttons = [];
  const all = opt.destinations.map(function(d){
    const o = { to: onlyDigits(d.to) };
    if(d.ref) o.ref = String(d.ref).slice(0,200);
    if(d.replaceWords) o.replaceWords = d.replaceWords;
    return o;
  }).filter(function(d){ return d.to.length>=10; });
  if(!all.length) return cb(new Error('보낼 수 있는 휴대폰 번호가 없습니다'), null);

  const groups=[]; for(let i=0;i<all.length;i+=200) groups.push(all.slice(i,i+200));
  const results=[]; let idx=0, failed=null;
  (function next(){
    if(idx>=groups.length || failed){
      if(failed) return cb(failed, null);
      return cb(null, results);
    }
    const dest = groups[idx++];
    const at = { senderKey: senderKey, msgType: opt.msgType || 'AT',
                 templateCode: opt.templateCode, text: String(opt.text||'') };
    if(opt.title)  at.title  = String(opt.title).slice(0,50);
    if(opt.header) at.header = String(opt.header);
    if(opt.link && opt.link.urlMobile) at.link = opt.link;
    if(opt.buttons && opt.buttons.length) at.attachment = { button: opt.buttons.slice(0,5) };
    const flow=[{ alimtalk: at }];
    // 알림톡이 안 갈 때 문자로 대신 보내기
    if(KAKAO.sms && KAKAO.sms.enabled && KAKAO.sms.from){
      flow.push({ sms:{ from: onlyDigits(KAKAO.sms.from), text: String(opt.smsText||opt.text||'').slice(0,1000) } });
    }
    const payload = { messageFlow: flow, destinations: dest };
    if(opt.ref) payload.ref = String(opt.ref).slice(0,200);
    if(opt.idempotencyKey) { payload.idempotencyKey = String(opt.idempotencyKey).slice(0,200); payload.idempotencyTtl = 86400; }
    bizgoPost('/v1/send/omni', payload, function(err, res){
      if(err){ failed = err; return next(); }
      const d = res.body && res.body.data;
      const code = (d && d.code) || String(res.status);
      const okAll = code === 'A000';
      const rows = (d && d.data && d.data.destinations) || dest.map(function(x){ return { to:x.to, code:code, result:(d&&d.result)||res.raw.slice(0,120) }; });
      rows.forEach(function(r){ results.push({ to:r.to, msgKey:r.msgKey||'', code:r.code||code, result:r.result||(d&&d.result)||'', ok:(r.code||code)==='A000' }); });
      if(!okAll && !(d && d.data)){ failed = new Error((d&&d.result) || ('발송 실패 (HTTP '+res.status+')')); }
      next();
    });
  })();
}

function callClaude(system, prompt, maxTokens, cb){
  const payload = JSON.stringify({
    model: MODEL,
    max_tokens: Math.max(64, Math.min(maxTokens || 600, 1024)),
    system: (system || 'You are a helpful Korean study coach.').slice(0, 4000),
    messages: [{ role:'user', content: String(prompt || '').slice(0, 8000) }]
  });
  const req = https.request('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{
      'content-type':'application/json',
      'x-api-key': API_KEY,
      'anthropic-version':'2023-06-01',
      'content-length': Buffer.byteLength(payload)
    }
  }, (r)=>{
    let body=''; r.on('data', d=> body+=d);
    r.on('end', ()=>{
      try{
        const j = JSON.parse(body);
        if (j && j.content && j.content[0] && j.content[0].text) return cb(null, j.content[0].text);
        return cb(new Error((j && j.error && j.error.message) || ('API error ' + r.statusCode)), null);
      }catch(e){ cb(e, null); }
    });
  });
  req.on('error', e=> cb(e, null));
  req.setTimeout(28000, ()=> req.destroy(new Error('timeout')));
  req.write(payload); req.end();
}

/* ===== 프로세스 보호 =====
   요청 처리 중 예외가 하나라도 나면 Node 는 그대로 종료됩니다.
   그러면 서비스가 내려가 502(Bad gateway)가 뜹니다. 아래에서 붙잡아 살려 둡니다. */
process.on('uncaughtException', function(e){
  try{ console.error('[uncaughtException]', e && (e.stack || e.message || e)); }catch(_){}
});
process.on('unhandledRejection', function(e){
  try{ console.error('[unhandledRejection]', e && (e.stack || e.message || e)); }catch(_){}
});

const server = http.createServer((req, res)=>{
  try{ return handleReq(req, res); }
  catch(e){
    try{ console.error('[request error]', req && req.url, e && (e.stack||e.message)); }catch(_){}
    try{ if(!res.headersSent){ res.writeHead(500, {'Content-Type':'application/json; charset=utf-8'}); }
         res.end(JSON.stringify({ ok:false, error:'server error' })); }catch(_){}
  }
});
function handleReq(req, res){
  /* 잘못된 %인코딩이 섞인 주소(봇이 자주 보냅니다)로 서버가 죽지 않도록 안전하게 해독합니다 */
  const rawPath = (req.url||'/').split('?')[0];
  let url;
  try{ url = decodeURIComponent(rawPath); }
  catch(e){ res.writeHead(400, secHeaders()); return res.end('Bad request'); }

  if (url === '/healthz') { res.writeHead(200); return res.end('ok'); }
  if (url === '/diag') {
    const mu = process.memoryUsage();
    return sendJson(res, 200, { ok:true, version:APP_VERSION, uptimeSec:Math.round(process.uptime()),
      node:process.version, rss:Math.round(mu.rss/1048576)+'MB', heap:Math.round(mu.heapUsed/1048576)+'MB',
      stateBytes: STATE? Buffer.byteLength(JSON.stringify(STATE)) : 0,
      sessions:Object.keys(SESS).length, accounts:Object.keys(AUTH).length, rev:REV });
  }
  if (url === '/version') { const cnt=(k)=> (STATE && Array.isArray(STATE[k])) ? STATE[k].length : 0;
    return sendJson(res, 200, { name:'eroom-lms', version:APP_VERSION, builtAt:BUILD_AT, ai: API_KEY ? 'claude' : 'builtin', rev:REV, store:true, dataFile:DATA_FILE, counts:{ students:cnt('students'), sessions:cnt('sessions'), levelTests:cnt('levelTests') } }); }

  // AI status (client uses this to decide LLM vs builtin)
  if (url === '/api/ai/status') return sendJson(res, 200, { enabled: !!API_KEY, model: API_KEY ? MODEL : null });

  // ---- shared state: read ----
  if (url === '/api/state' && req.method === 'GET'){
    if(!authed(req)) return sendJson(res, 401, { ok:false, error:'unauthorized' });
    if(STATE) STATE = ensureDefaultUsers(STATE);
    let _s = null, _st = STATE;
    try{ _s = sessOf(req); _st = scopeState(STATE, _s); }
    catch(e){
      /* 범위 계산이 실패하면 전체를 내보내지 않고 개인정보를 지운 상태로 대체합니다 */
      try{ console.error('[scopeState]', e && (e.stack||e.message)); }catch(_){}
      try{ _st = scopeState(STATE, null); }catch(_){ _st = { notices: (STATE&&STATE.notices)||[] }; }
    }
    return sendJson(res, 200, { ok:true, rev:REV, role:(_s?_s.role:null), state: _st });
  }
  // ---- shared state: write (merge) ----
  if (url === '/api/state' && (req.method === 'PUT' || (req.method === 'POST' && qparam(req,'beacon')==='1'))){
    if(!authed(req)) return sendJson(res, 401, { ok:false, error:'unauthorized' });
    let chunks=[]; let blen=0; let tooBig=false;
    req.on('data', d=>{ blen+=d.length; if (blen > MAX_BODY){ tooBig=true; req.destroy(); return; } chunks.push(d); });
    req.on('end', ()=>{
      try{
      if (tooBig) return sendJson(res, 413, { ok:false, error:'payload too large' });
      let incoming; try{ incoming = JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'); }catch(e){ return sendJson(res, 400, { ok:false, error:'bad json' }); }
      if (!isPlainObj(incoming)) return sendJson(res, 400, { ok:false, error:'state must be object' });
      incoming = sanitizeIncoming(incoming);
      const _ps = sessOf(req);
      if(_ps && _ps.role === 'test') incoming = limitTestWrite(incoming, _ps.id);
      else if(_ps && _ps.role === 'student' && Array.isArray(incoming.students)){
        /* 학생은 자기 기록의 학습 항목만, 남의 기록은 통째로 무시합니다 */
        const mine = incoming.students.filter(function(s){ return s && s.id === _ps.id; }).map(limitSelfStudent);
        if(mine.length) incoming.students = mine; else delete incoming.students;
      }
      STATE = STATE ? deepMerge(STATE, incoming) : incoming;
      STATE = applyTombstones(STATE);
      STATE = stripPw(ensureDefaultUsers(STATE));
      REV += 1;
      persist();
      return sendJson(res, 200, { ok:true, rev:REV, state:STATE });
      }catch(e){
        try{ console.error('[PUT /api/state]', e && (e.stack||e.message)); }catch(_){}
        try{ if(!res.headersSent) sendJson(res, 500, { ok:false, error:'merge failed' }); }catch(_){}
      }
    });
    return;
  }

  // ---- 로그인 (서버 검증) ----
  if (url === '/api/login' && req.method === 'POST'){
    if(!authed(req)) return sendJson(res, 401, { ok:false, error:'unauthorized' });
    if(!loginRateOk(req.socket.remoteAddress||'x')) return sendJson(res, 429, { ok:false, error:'too many attempts' });
    let chunks=[]; let blen=0; req.on('data', d=>{ blen+=d.length; if(blen>4000){ req.destroy(); return; } chunks.push(d); });
    req.on('end', ()=>{
      let p; try{ p=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'); }catch(e){ return sendJson(res,400,{ok:false,error:'bad json'}); }
      const k=String(p.username||'').toLowerCase(); const rec=AUTH[k];
      if(!rec) return sendJson(res, 200, { ok:false, error:'no_account' });
      if(!verifyPw(p.pw, rec)) return sendJson(res, 200, { ok:false, error:'bad_password' });
      const st = (STATE && Array.isArray(STATE.students)) ? STATE.students.find(function(x){ return x && x.id===rec.id; }) : null;
      const tok = sessNew(rec);
      return sendJson(res, 200, { ok:true, sess:tok, user:{ id:rec.id, name:rec.name, role:rec.role, username:k,
        validFrom: (st&&st.validFrom)||null, validUntil: (st&&st.validUntil)||null,
        cls: (st&&st.cls)||null, instructorId: (st&&st.instructorId)||null, cohortId: (st&&st.cohortId)||null } });
    });
    return;
  }
  // ---- 계정 자격증명 등록/변경 (관리자 작업 시 클라이언트가 호출) ----
  if (url === '/api/auth/set' && req.method === 'POST'){
    if(!authed(req)) return sendJson(res, 401, { ok:false, error:'unauthorized' });
    let chunks=[]; let blen=0; req.on('data', d=>{ blen+=d.length; if(blen>200000){ req.destroy(); return; } chunks.push(d); });
    req.on('end', ()=>{
      let p; try{ p=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'); }catch(e){ return sendJson(res,400,{ok:false,error:'bad json'}); }
      const list = Array.isArray(p.accounts)? p.accounts : (p.username? [p] : []);
      /* soft: 서버에 이미 있는 계정은 건드리지 않습니다.
         브라우저에 남아 있던 옛 비밀번호가 부팅할 때 현재 비밀번호를 덮어쓰던 문제를 막습니다. */
      const soft = !!p.soft;
      let n=0, skipped=0;
      list.forEach(function(a){
        if(!a || !a.username || !a.pw) return;
        if(soft && AUTH[String(a.username).toLowerCase()]){ skipped++; return; }
        setCred(a.username, a.pw, a.role, a.id, a.name); n++;
      });
      return sendJson(res, 200, { ok:true, saved:n, skipped:skipped });
    });
    return;
  }
  // ---- 역할만 변경(비밀번호는 그대로) ----
  if (url === '/api/auth/role' && req.method === 'POST'){
    if(!authed(req)) return sendJson(res, 401, { ok:false, error:'unauthorized' });
    let chunks=[]; let blen=0; req.on('data', d=>{ blen+=d.length; if(blen>20000){ req.destroy(); return; } chunks.push(d); });
    req.on('end', ()=>{
      try{
        let p; try{ p=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'); }catch(e){ return sendJson(res,400,{ok:false,error:'bad json'}); }
        let k=String(p.username||'').toLowerCase();
        const from=String(p.from||'').toLowerCase();
        /* 아이디를 바꾼 경우: 예전 이름의 자격증명을 새 이름으로 옮깁니다 (비밀번호 유지) */
        if(from && from!==k && AUTH[from] && !AUTH[k]){ AUTH[k]=AUTH[from]; delete AUTH[from]; }
        if(!k || !AUTH[k]) return sendJson(res, 200, { ok:false, error:'no_account' });
        if(p.role) AUTH[k].role = String(p.role);
        if(p.id) AUTH[k].id = String(p.id);
        if(p.name) AUTH[k].name = String(p.name);
        AUTH[k].at = Date.now(); saveAuth();
        /* 역할이 바뀌면 그 계정의 기존 로그인 세션을 정리합니다 */
        Object.keys(SESS).forEach(function(t){ if(SESS[t] && SESS[t].id===AUTH[k].id) delete SESS[t]; });
        sessSave();
        return sendJson(res, 200, { ok:true, role:AUTH[k].role });
      }catch(e){
        try{ console.error('[auth/role]', e && (e.stack||e.message)); }catch(_){}
        try{ if(!res.headersSent) sendJson(res, 500, { ok:false, error:'failed' }); }catch(_){}
      }
    });
    return;
  }
  // ---- 등록된 계정 목록(해시 제외) ----
  if (url === '/api/auth/list' && req.method === 'GET'){
    if(!authed(req)) return sendJson(res, 401, { ok:false, error:'unauthorized' });
    return sendJson(res, 200, { ok:true, accounts: Object.keys(AUTH).map(function(k){ return { username:k, role:AUTH[k].role, id:AUTH[k].id, name:AUTH[k].name }; }) });
  }
  // ---- 인증 계정 존재 여부 ----
  if (url === '/api/auth/status' && req.method === 'GET'){
    if(!authed(req)) return sendJson(res, 401, { ok:false, error:'unauthorized' });
    return sendJson(res, 200, { ok:true, count:Object.keys(AUTH).length });
  }

  // ---- file upload (base64 JSON · 소용량용, 최대 100MB) ----
  if (url === '/api/upload' && req.method === 'POST'){
    if(!authed(req)) return sendJson(res, 401, { ok:false, error:'unauthorized' });
    let chunks=[]; let len=0; let tooBig=false; const UP_MAX = Math.ceil(FILE_MAX*1.4) + 65536;
    req.on('data', d=>{ len+=d.length; if (len > UP_MAX){ tooBig=true; req.destroy(); return; } chunks.push(d); });
    req.on('end', ()=>{
      if (tooBig) return sendJson(res, 413, { ok:false, error:'file too large (max '+Math.round(FILE_MAX/1048576)+'MB)' });
      let p; try{ p = JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'); }catch(e){ return sendJson(res, 400, { ok:false, error:'bad json' }); }
      const name = safeName(p.name);
      const m = /^data:[^;]*;base64,(.*)$/.exec(String(p.data||''));
      let bin; try{ bin = Buffer.from(m?m[1]:String(p.data||''), 'base64'); }catch(e){ return sendJson(res, 400, { ok:false, error:'bad data' }); }
      if (!bin.length) return sendJson(res, 400, { ok:false, error:'empty file' });
      if (bin.length > FILE_MAX) return sendJson(res, 413, { ok:false, error:'file too large (max '+Math.round(FILE_MAX/1048576)+'MB)' });
      const dir = path.join(DATA_DIR, 'uploads');
      try{ fs.mkdirSync(dir, { recursive:true }); }catch(e){}
      const fname = Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6)+'-'+name;
      try{ fs.writeFileSync(path.join(dir, fname), bin); }catch(e){ return sendJson(res, 500, { ok:false, error:'save failed' }); }
      return sendJson(res, 200, { ok:true, url:'/files/'+encodeURIComponent(fname), name:fname, size:bin.length });
    });
    return;
  }

  // ---- file upload (바이너리 스트리밍 · 대용량 교안용, 최대 100MB) ----
  if (url === '/api/upload-raw' && req.method === 'POST'){
    if(!authed(req)) return sendJson(res, 401, { ok:false, error:'unauthorized' });
    let rawName = '';
    try{ rawName = decodeURIComponent(String(req.headers['x-file-name']||'')); }catch(e){ rawName = String(req.headers['x-file-name']||''); }
    const name = safeName(rawName);
    const declared = +(req.headers['content-length']||0);
    if (declared && declared > FILE_MAX) return sendJson(res, 413, { ok:false, error:'file too large (max '+Math.round(FILE_MAX/1048576)+'MB)' });
    const dir = path.join(DATA_DIR, 'uploads');
    try{ fs.mkdirSync(dir, { recursive:true }); }catch(e){}
    const fname = Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6)+'-'+name;
    const fp = path.join(dir, fname);
    const ws = fs.createWriteStream(fp);
    let written = 0, aborted = false;
    req.on('data', d=>{
      written += d.length;
      if (written > FILE_MAX){
        aborted = true;
        try{ ws.destroy(); }catch(e){}
        try{ req.destroy(); }catch(e){}
        try{ fs.unlinkSync(fp); }catch(e){}
        return sendJson(res, 413, { ok:false, error:'file too large (max '+Math.round(FILE_MAX/1048576)+'MB)' });
      }
    });
    req.pipe(ws);
    ws.on('error', ()=>{ if(!aborted){ aborted=true; try{ fs.unlinkSync(fp); }catch(e){} sendJson(res, 500, { ok:false, error:'save failed' }); } });
    ws.on('finish', ()=>{
      if (aborted) return;
      if (!written){ try{ fs.unlinkSync(fp); }catch(e){} return sendJson(res, 400, { ok:false, error:'empty file' }); }
      return sendJson(res, 200, { ok:true, url:'/files/'+encodeURIComponent(fname), name:fname, size:written });
    });
    req.on('aborted', ()=>{ if(!aborted){ aborted=true; try{ ws.destroy(); }catch(e){} try{ fs.unlinkSync(fp); }catch(e){} } });
    return;
  }
  // ---- serve uploaded files ----
  if (url.startsWith('/files/')){
    const dir = path.join(DATA_DIR, 'uploads');
    const fp = path.normalize(path.join(dir, url.slice(7)));
    if (!fp.startsWith(dir + path.sep)) { res.writeHead(403, secHeaders()); return res.end('Forbidden'); }
    fs.stat(fp, (serr, st)=>{
      if (serr || !st.isFile()){ res.writeHead(404, secHeaders()); return res.end('Not found'); }
      const ext0 = path.extname(fp).toLowerCase();
      const T0 = {'.pdf':'application/pdf','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.zip':'application/zip','.mp4':'video/mp4','.mp3':'audio/mpeg','.txt':'text/plain; charset=utf-8'};
      if (st.size > 2*1024*1024){          /* 2MB 초과는 스트리밍 전송 */
        res.writeHead(200, secHeaders({'Content-Type': T0[ext0]||'application/octet-stream','Content-Length': st.size,'Cache-Control':'public, max-age=86400','Accept-Ranges':'bytes'}));
        return fs.createReadStream(fp).pipe(res);
      }
      fs.readFile(fp, (err, data)=>{
      if (err){ res.writeHead(404, secHeaders()); return res.end('Not found'); }
      const ext = path.extname(fp).toLowerCase();
      const T = {'.pdf':'application/pdf','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.zip':'application/zip','.hwp':'application/octet-stream','.doc':'application/msword','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.xls':'application/vnd.ms-excel','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.ppt':'application/vnd.ms-powerpoint','.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation','.mp3':'audio/mpeg','.mp4':'video/mp4','.txt':'text/plain; charset=utf-8'};
      res.writeHead(200, secHeaders({'Content-Type': T[ext]||'application/octet-stream','Cache-Control':'public, max-age=86400'})); res.end(data);
      });
    });
    return;
  }

  // AI proxy
  // ---- 카카오 알림톡: 설정 조회 (API 키는 가려서 내려보낸다) ----
  if (url === '/api/kakao/config' && req.method === 'GET'){
    if(!authed(req)) return sendJson(res, 401, { ok:false, error:'unauthorized' });
    return sendJson(res, 200, { ok:true, config:{
      apiKeyMasked: maskKey(KAKAO.apiKey), hasApiKey: !!KAKAO.apiKey,
      senderKey: KAKAO.senderKey || '', sandbox: !!KAKAO.sandbox,
      sms: { enabled: !!(KAKAO.sms&&KAKAO.sms.enabled), from: (KAKAO.sms&&KAKAO.sms.from)||'' },
      base: kakaoBase(), updatedAt: KAKAO.updatedAt||'' } });
  }
  // ---- 카카오 알림톡: 설정 저장 ----
  if (url === '/api/kakao/config' && req.method === 'PUT'){
    if(!authed(req)) return sendJson(res, 401, { ok:false, error:'unauthorized' });
    let chunks=[]; req.on('data', d=>chunks.push(d));
    req.on('end', ()=>{
      let b; try{ b = JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'); }catch(e){ return sendJson(res,400,{ok:false,error:'bad json'}); }
      if(typeof b.apiKey==='string' && b.apiKey.trim() && b.apiKey.indexOf('•')<0) KAKAO.apiKey = b.apiKey.trim();
      if(typeof b.senderKey==='string') KAKAO.senderKey = b.senderKey.trim();
      if(typeof b.sandbox==='boolean')  KAKAO.sandbox  = b.sandbox;
      if(b.sms && typeof b.sms==='object') KAKAO.sms = { enabled: !!b.sms.enabled, from: String(b.sms.from||'').trim() };
      KAKAO.updatedAt = new Date().toISOString();
      saveKakao();
      return sendJson(res, 200, { ok:true, config:{ apiKeyMasked:maskKey(KAKAO.apiKey), hasApiKey:!!KAKAO.apiKey,
        senderKey:KAKAO.senderKey, sandbox:!!KAKAO.sandbox, sms:KAKAO.sms, base:kakaoBase(), updatedAt:KAKAO.updatedAt } });
    });
    return;
  }
  // ---- 카카오 알림톡: 발송 ----
  if (url === '/api/kakao/send' && req.method === 'POST'){
    if(!authed(req)) return sendJson(res, 401, { ok:false, error:'unauthorized' });
    let chunks=[]; let blen=0; let tooBig=false;
    req.on('data', d=>{ blen+=d.length; if(blen>MAX_BODY){ tooBig=true; req.destroy(); return; } chunks.push(d); });
    req.on('end', ()=>{
      if(tooBig) return sendJson(res, 413, { ok:false, error:'payload too large' });
      let b; try{ b = JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'); }catch(e){ return sendJson(res,400,{ok:false,error:'bad json'}); }
      kakaoSend(b, function(err, results){
        const rec = { at:new Date().toISOString(), tpl:b.templateCode||'', title:b.title||'', kind:b.kind||'',
                      count:(b.destinations||[]).length, sandbox:!!KAKAO.sandbox,
                      ok: !err, error: err?err.message:'', results: results||[] };
        pushKakaoLog(rec);
        if(err) return sendJson(res, 200, { ok:false, error: err.message });
        const okN = results.filter(function(r){return r.ok;}).length;
        return sendJson(res, 200, { ok:true, sent:okN, failed:results.length-okN, results:results, sandbox:!!KAKAO.sandbox });
      });
    });
    return;
  }
  // ---- 카카오 알림톡: 연결 확인 ----
  if (url === '/api/kakao/ping' && req.method === 'GET'){
    if(!authed(req)) return sendJson(res, 401, { ok:false, error:'unauthorized' });
    if(!KAKAO.apiKey) return sendJson(res, 200, { ok:false, error:'API 키가 없습니다' });
    bizgoPost('/v1/send/omni', { messageFlow:[], destinations:[] }, function(err, r){
      if(err) return sendJson(res, 200, { ok:false, error:err.message, base:kakaoBase() });
      const auth = r.body && r.body.common && r.body.common.authCode;
      const okAuth = auth === 'A000';
      return sendJson(res, 200, { ok: okAuth, base: kakaoBase(), authCode: auth||'',
        authResult: (r.body&&r.body.common&&r.body.common.authResult)||'',
        detail: (r.body&&r.body.data&&r.body.data.result)||r.raw.slice(0,200),
        error: okAuth ? '' : '인증에 실패했습니다 — API 키 또는 서버 IP 등록(ACL)을 확인해 주세요' });
    });
    return;
  }
  // ---- 카카오 알림톡: 발송 이력 ----
  if (url.split('?')[0] === '/api/kakao/log' && req.method === 'GET'){
    if(!authed(req)) return sendJson(res, 401, { ok:false, error:'unauthorized' });
    return sendJson(res, 200, { ok:true, log: KAKAO_LOG.slice(0,300) });
  }
  // ---- 상담톡: 고객 메시지 수신 (비즈고 콘솔에 이 주소를 등록) ----
  if (url === '/api/kakao/cs/hook' && req.method === 'POST'){
    let chunks=[]; let blen=0;
    req.on('data', d=>{ blen+=d.length; if(blen>1024*512){ req.destroy(); return; } chunks.push(d); });
    req.on('end', ()=>{
      let b={}; try{ b = JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'); }catch(e){}
      pushKakaoLog({ at:new Date().toISOString(), kind:'상담톡수신', ok:true, cs:b, count:1, results:[] });
      return sendJson(res, 200, { code:'A000', result:'Success' });
    });
    return;
  }

  if (url === '/api/ai' && req.method === 'POST') {
    if(!authed(req)) return sendJson(res, 401, { ok:false, error:'unauthorized' });
    if(!aiRateOk(req.socket.remoteAddress||'x')) return sendJson(res, 429, { error:'rate limited' });
    if (!API_KEY) return sendJson(res, 200, { enabled:false });
    let chunks=[]; let blen=0; let tooBig=false;
    req.on('data', d=>{ blen+=d.length; if (blen > 20000){ tooBig=true; req.destroy(); return; } chunks.push(d); });
    req.on('end', ()=>{
      if (tooBig) return sendJson(res, 413, { error:'payload too large' });
      let p; try{ p = JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'); }catch(e){ return sendJson(res, 400, { error:'bad json' }); }
      callClaude(p.system, p.prompt, p.maxTokens, (err, text)=>{
        if (err) return sendJson(res, 200, { enabled:true, error: String(err.message||err) });
        sendJson(res, 200, { enabled:true, text: text });
      });
    });
    return;
  }

  // static
  const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
    '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
    '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon' };
  const INDEX = path.join(PUBLIC, 'index.html');
  function serveIndex(){
    /* 한 번 읽어 메모리에 두고 재사용합니다 (요청마다 2MB 넘게 읽고 복사하지 않도록) */
    if(INDEX_CACHE){ res.writeHead(200, secHeaders({'Content-Type':'text/html; charset=utf-8'})); return res.end(INDEX_CACHE); }
    fs.readFile(INDEX, (e, idx)=>{
      if (e) { res.writeHead(404, secHeaders()); return res.end('Not found'); }
      try{
        const html = idx.toString('utf8').replace(/%%EROOM_TOKEN%%/g, API_TOKEN);
        INDEX_CACHE = Buffer.from(html, 'utf8');
        res.writeHead(200, secHeaders({'Content-Type':'text/html; charset=utf-8'})); res.end(INDEX_CACHE);
      }catch(err){
        try{ console.error('[serveIndex]', err && (err.stack||err.message)); }catch(_){}
        if(!res.headersSent) res.writeHead(500, secHeaders());
        res.end('index error');
      }
    });
  }
  let urlPath = url === '/' ? '/index.html' : url;
  const filePath = path.normalize(path.join(PUBLIC, urlPath));
  if (filePath !== INDEX && !filePath.startsWith(PUBLIC + path.sep)) { res.writeHead(403, secHeaders()); return res.end('Forbidden'); }
  if (path.basename(filePath) === 'index.html') return serveIndex();
  fs.readFile(filePath, (err, data)=>{
    if (err) return serveIndex();
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, secHeaders({'Content-Type': TYPES[ext] || 'application/octet-stream'})); res.end(data);
  });
}

server.listen(PORT, ()=> console.log('eroom-lms v'+APP_VERSION+' on port '+PORT+' (AI: '+(API_KEY?'claude/'+MODEL:'builtin')+', store: '+DATA_FILE+')'));
