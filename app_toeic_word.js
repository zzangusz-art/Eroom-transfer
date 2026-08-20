/* ===================== 이룸토익 LMS · 빈출 어휘 학습 =====================
   Day 단위 카드 학습 · 암기 표시 · 단어 테스트 4종 · 복습 · 진도
   ======================================================================== */

/* ---------------- 설정 · 덱 구성 ---------------- */
function toWordPerDay(){
  var c = toConf();
  var n = parseInt(c.wordPerDay, 10);
  return (n>=5 && n<=100) ? n : 30;
}
/* 주제 순서 → 난이도 → id 순으로 정렬해 Day 로 자릅니다.
   같은 Day 안에 한 주제가 모이도록 해서 「오늘은 사무 표현」처럼 묶여 보입니다. */
function toWordDeck(){
  var order = {};
  TO_THEMES.forEach(function(t,i){ order[t.k]=i; });
  return toVocaAll().slice().sort(function(a,b){
    var d = (order[a.theme]==null?99:order[a.theme]) - (order[b.theme]==null?99:order[b.theme]);
    if(d) return d;
    if((a.lv||1)!==(b.lv||1)) return (a.lv||1)-(b.lv||1);
    return String(a.id).localeCompare(String(b.id));
  });
}
function toWordDays(){ return Math.max(1, Math.ceil(toWordDeck().length / toWordPerDay())); }
function toWordOfDay(day){
  var n = toWordPerDay(), deck = toWordDeck();
  var d = Math.max(1, Math.min(toWordDays(), parseInt(day,10)||1));
  return deck.slice((d-1)*n, d*n);
}
/* Day 의 대표 주제 (화면 제목에 씁니다) */
function toWordDayTheme(day){
  var ws = toWordOfDay(day), cnt = {};
  ws.forEach(function(w){ cnt[w.theme]=(cnt[w.theme]||0)+1; });
  var best=null;
  Object.keys(cnt).forEach(function(k){ if(!best || cnt[k]>cnt[best]) best=k; });
  return best;
}

/* ---------------- 학생 기록 ---------------- */
/* DB.toeicWord[sid] = { st:{wid:1외움|2헷갈림}, seen:{wid:date}, log:{date:개수},
                         day:현재Day, tests:[{date,total,right,mode,wrong:[wid]}] } */
function toWordRec(sid){
  DB.toeicWord = DB.toeicWord || {};
  var r = DB.toeicWord[sid];
  if(!r) r = DB.toeicWord[sid] = { st:{}, seen:{}, log:{}, day:1, tests:[] };
  r.st = r.st || {}; r.seen = r.seen || {}; r.log = r.log || {};
  r.tests = r.tests || []; r.day = r.day || 1;
  return r;
}
function toWordMark(sid, wid, state){
  var r = toWordRec(sid), today = todayStr();
  if(state===0) delete r.st[wid];
  else r.st[wid] = state;
  if(!r.seen[wid]){ r.log[today] = (r.log[today]||0) + 1; }
  r.seen[wid] = today;
  r._u = Date.now();
  save();
}
function toWordSetDay(sid, day){
  var r = toWordRec(sid);
  r.day = Math.max(1, Math.min(toWordDays(), parseInt(day,10)||1));
  save();
  return r.day;
}
function toWordProgress(sid){
  var r = toWordRec(sid), all = toVocaAll();
  var known=0, vague=0, byTheme={};
  TO_THEMES.forEach(function(t){ byTheme[t.k]={known:0,vague:0,total:0}; });
  all.forEach(function(w){
    var b = byTheme[w.theme]; if(b) b.total++;
    var s = r.st[w.id];
    if(s===1){ known++; if(b) b.known++; }
    else if(s===2){ vague++; if(b) b.vague++; }
  });
  return { known:known, vague:vague, total:all.length,
           rate: all.length? Math.round(known/all.length*100):0,
           byTheme:byTheme, day:r.day, days:toWordDays(),
           streak: toWordStreak(sid), today: r.log[todayStr()]||0 };
}
/* 연속 학습일 — 오늘(또는 어제)부터 거꾸로 며칠 이어졌는가 */
function toWordStreak(sid){
  var r = toWordRec(sid);
  var n = 0, d = 0;
  if(!r.log[todayStr()] && !r.log[addDays(-1)]) return 0;
  if(!r.log[todayStr()]) d = 1;                 /* 오늘은 아직 안 했지만 어제까지 이어짐 */
  for(var i=0;i<400;i++){
    var day = addDays(-(d+i));
    if(r.log[day]) n++; else break;
  }
  return n;
}
/* 복습 대상 — 헷갈림 > 테스트 오답 > 오래 안 본 외운 단어 */
function toWordReviewList(sid, limit){
  var r = toWordRec(sid), all = toVocaAll(), byId = {};
  all.forEach(function(w){ byId[w.id]=w; });
  var wrongCnt = {};
  (r.tests||[]).slice(-10).forEach(function(t){
    (t.wrong||[]).forEach(function(id){ wrongCnt[id]=(wrongCnt[id]||0)+1; });
  });
  var rows = [];
  Object.keys(r.st).forEach(function(id){
    if(!byId[id]) return;
    var s = r.st[id];
    var score = (s===2 ? 100 : 0) + (wrongCnt[id]||0)*40;
    /* 외운 뒤 오래 지난 단어도 다시 봅니다 */
    var seen = r.seen[id] || '';
    var days = seen ? Math.max(0, Math.round((new Date(todayStr()+'T00:00:00') - new Date(seen+'T00:00:00'))/86400000)) : 999;
    if(s===1 && days>=7) score += Math.min(60, days);
    if(score<=0) return;
    rows.push({ w:byId[id], state:s, wrong:wrongCnt[id]||0, days:days, score:score });
  });
  rows.sort(function(a,b){ return b.score-a.score; });
  return limit ? rows.slice(0, limit) : rows;
}

/* ---------------- 단어 테스트 ----------------
   4가지 방식
   e2k 영어 → 뜻 고르기 / k2e 뜻 → 영어 고르기
   blank 예문 빈칸에 알맞은 단어 / col 콜로케이션 짝 찾기 */
const TO_WORD_MODES = [
  {k:'e2k',   name:'영어 → 뜻',      desc:'단어를 보고 뜻을 고릅니다'},
  {k:'k2e',   name:'뜻 → 영어',      desc:'뜻을 보고 단어를 고릅니다'},
  {k:'blank', name:'예문 빈칸',      desc:'문장 흐름에 맞는 단어를 고릅니다'},
  {k:'mix',   name:'섞어서',        desc:'세 방식을 섞어 냅니다'}
];
function toWordMask(text, word){
  if(!text || !word) return text||'';
  try{
    var base = String(word).split(/\s+/)[0].replace(/[^A-Za-z]/g,'');
    if(base.length<3) return text;
    var re = new RegExp(base.slice(0, Math.max(3, base.length-2)) + '[A-Za-z]*', 'gi');
    return String(text).replace(re, '______');
  }catch(e){ return text; }
}
function toWordMakeQuiz(pool, n, mode){
  var all = toVocaAll();
  pool = (pool||[]).filter(function(w){ return w && w.w && w.mean; });
  if(!pool.length) return [];
  var picked = shuffle(pool).slice(0, n || 15);
  return picked.map(function(w, i){
    var m = mode==='mix' ? ['e2k','k2e','blank'][i%3] : (mode||'e2k');
    /* 오답 보기 — 같은 주제에서 먼저 고르고, 모자라면 전체에서 채웁니다 */
    var same = all.filter(function(x){ return x.id!==w.id && x.theme===w.theme; });
    var rest = all.filter(function(x){ return x.id!==w.id && x.theme!==w.theme; });
    var dist = shuffle(same).slice(0,3);
    if(dist.length<3) dist = dist.concat(shuffle(rest).slice(0, 3-dist.length));
    var opts, stem, hint='';
    if(m==='k2e'){
      stem = w.mean;
      opts = [w.w].concat(dist.map(function(x){ return x.w; }));
      hint = '뜻에 맞는 단어를 고르세요';
    }else if(m==='blank'){
      stem = toWordMask(w.ex, w.w);
      opts = [w.w].concat(dist.map(function(x){ return x.w; }));
      hint = '빈칸에 알맞은 단어를 고르세요';
    }else{
      stem = w.w + ' (' + toPosName(w.pos) + ')';
      opts = [w.mean].concat(dist.map(function(x){ return x.mean; }));
      hint = '단어의 뜻을 고르세요';
    }
    var order = shuffle([0,1,2,3]);
    var shown = order.map(function(ix){ return opts[ix]; });
    return { wid:w.id, word:w.w, mode:m, stem:stem, hint:hint,
             options:shown, answer:order.indexOf(0), ref:w };
  });
}

var TWQ = null;
function toWordQuizStart(pool, mode, n){
  var qs = toWordMakeQuiz(pool, n||15, mode||'mix');
  if(!qs.length){ toast('출제할 단어가 없습니다.'); return false; }
  TWQ = { qs:qs, idx:0, answers:new Array(qs.length).fill(null), mode:mode||'mix', started:Date.now() };
  toWordQuizRender();
  return true;
}
function toWordQuizRender(){
  var q = TWQ.qs[TWQ.idx], total = TWQ.qs.length;
  var answered = TWQ.answers.filter(function(a){ return a!=null; }).length;
  var h = '<div class="twq">'
    + '<div class="twq-head"><b>단어 테스트</b>'
    + '<span class="muted">' + (TWQ.idx+1) + ' / ' + total + ' · 응답 ' + answered + '</span></div>'
    + '<div class="twq-prog"><div style="width:' + Math.round((TWQ.idx)/total*100) + '%"></div></div>'
    + '<div class="twq-hint">' + esc(q.hint) + '</div>'
    + '<div class="twq-stem">' + esc(q.stem) + '</div>'
    + '<div class="twq-opts">';
  q.options.forEach(function(o,i){
    var sel = TWQ.answers[TWQ.idx]===i ? 'sel' : '';
    h += '<button class="twq-o ' + sel + '" data-i="' + i + '"><span>' + 'ABCD'[i] + '</span> ' + esc(o) + '</button>';
  });
  h += '</div><div class="twq-b">'
    + '<button class="btn ghost" id="twqPrev" ' + (TWQ.idx===0?'disabled':'') + '>← 이전</button>'
    + (TWQ.idx===total-1
        ? '<button class="btn" id="twqSubmit">채점하기</button>'
        : '<button class="btn" id="twqNext">다음 →</button>')
    + '<button class="lnk" id="twqQuit">그만두기</button>'
    + '</div></div>';
  var node = el('<div class="form-card"></div>');
  node.innerHTML = h;
  openModal(node);
  node.querySelectorAll('.twq-o').forEach(function(b){
    b.onclick = function(){
      TWQ.answers[TWQ.idx] = +b.dataset.i;
      if(TWQ.idx < TWQ.qs.length-1){ TWQ.idx++; toWordQuizRender(); }
      else toWordQuizRender();
    };
  });
  var pv = node.querySelector('#twqPrev'); if(pv) pv.onclick=function(){ if(TWQ.idx>0){ TWQ.idx--; toWordQuizRender(); } };
  var nx = node.querySelector('#twqNext'); if(nx) nx.onclick=function(){ if(TWQ.idx<total-1){ TWQ.idx++; toWordQuizRender(); } };
  var sb = node.querySelector('#twqSubmit'); if(sb) sb.onclick=toWordQuizFinish;
  node.querySelector('#twqQuit').onclick=function(){ TWQ=null; closeModal(); };
}
function toWordQuizFinish(){
  if(!TWQ) return;
  var right = 0, wrong = [];
  TWQ.qs.forEach(function(q,i){
    if(TWQ.answers[i]===q.answer) right++;
    else wrong.push(q.wid);
  });
  var total = TWQ.qs.length, rate = Math.round(right/total*100);
  var sid = CURRENT.id;
  var r = toWordRec(sid);
  r.tests.push({ date:todayStr(), mode:TWQ.mode, total:total, right:right, wrong:wrong });
  /* 틀린 단어는 「헷갈림」으로, 맞힌 단어 중 미표시는 「외움」으로 자동 표시 */
  TWQ.qs.forEach(function(q,i){
    if(TWQ.answers[i]===q.answer){ if(!r.st[q.wid]) r.st[q.wid]=1; }
    else r.st[q.wid]=2;
    if(!r.seen[q.wid]) r.log[todayStr()] = (r.log[todayStr()]||0)+1;
    r.seen[q.wid]=todayStr();
  });
  save();

  var h = '<div class="twq-res">'
    + '<div class="tex-score"><div class="tex-score-main"><small>정답률</small><b>' + rate + '</b><span>%</span></div>'
    + '<div class="tex-score-sub"><div><small>맞은 단어</small><b>' + right + '</b><span>/ ' + total + '</span></div></div></div>';
  if(wrong.length){
    h += '<h4 class="tex-h">틀린 단어 ' + wrong.length + '개 — 복습 목록에 담았습니다</h4><div class="twq-wrong">';
    wrong.forEach(function(id){
      var w = toVocaById(id); if(!w) return;
      h += '<div class="twq-wrow"><b>' + esc(w.w) + '</b><span class="muted">' + toPosName(w.pos) + '</span>'
        +  '<span>' + esc(w.mean) + '</span></div>';
    });
    h += '</div>';
  }else{
    h += '<p class="tex-ok">전부 맞혔습니다. 다음 Day 로 넘어가세요.</p>';
  }
  h += '<div class="form-b"><button class="btn ghost" id="twqAgain">다시 테스트</button>'
    +  '<button class="btn" id="twqClose">닫기</button></div></div>';
  var node = el('<div class="form-card"></div>');
  node.innerHTML = h;
  var pool = TWQ.qs.map(function(q){ return q.ref; });
  var mode = TWQ.mode;
  TWQ = null;
  openModal(node);
  /* 닫기 버튼·배경 클릭 어느 쪽으로 닫아도 진도와 기록이 화면에 바로 반영되게 합니다 */
  if(typeof onModalClose==='function') onModalClose(function(){ if(ROUTE==='ts-word' && typeof tsWord==='function') tsWord(); });
  node.querySelector('#twqClose').onclick=function(){ closeModal(); };
  node.querySelector('#twqAgain').onclick=function(){ closeModal(); toWordQuizStart(pool, mode, pool.length); };
}

/* ================= 학생 화면 ================= */
var TS_WORD_HIDE = true;    /* 뜻 가리기 기본 켜짐 */
function tsWord(){
  var sid = CURRENT.id, pg = toWordProgress(sid), r = toWordRec(sid);
  var day = r.day, days = pg.days;
  var ws = toWordOfDay(day);
  var th = toWordDayTheme(day);

  var h = head('토익 빈출 어휘', 'ETS 공식 출제 영역 13개 주제로 나눈 빈출 단어를 하루 ' + toWordPerDay() + '개씩 봅니다');
  h += '<div class="stats">'
    +  card('외운 단어', fmtNum(pg.known) + '개', '전체 ' + fmtNum(pg.total) + '개 중', '#059669')
    +  card('헷갈리는 단어', fmtNum(pg.vague) + '개', '복습 대상', '#d97706')
    +  card('진도율', pg.rate + '%', 'Day ' + day + ' / ' + days, '#0d9488')
    +  card('연속 학습', pg.streak + '일', '오늘 ' + pg.today + '개 확인', '#7c3aed')
    +  '</div>';

  /* Day 이동 */
  h += '<div class="bar tw-bar">'
    +  '<div class="inl"><button class="btn ghost" id="twPrevDay" ' + (day<=1?'disabled':'') + '>← 이전 Day</button>'
    +  '<select id="twDaySel">'
    +  (function(){ var s=''; for(var i=1;i<=days;i++){ s += '<option value="'+i+'" '+(i===day?'selected':'')+'>Day '+i+'</option>'; } return s; })()
    +  '</select>'
    +  '<button class="btn ghost" id="twNextDay" ' + (day>=days?'disabled':'') + '>다음 Day →</button></div>'
    +  '<div class="inl"><button class="btn ghost" id="twHide">' + (TS_WORD_HIDE?'뜻 보기':'뜻 가리기') + '</button>'
    +  '<button class="btn ghost" id="twAllKnown">이 Day 전부 외움</button>'
    +  '<button class="btn" id="twTest">이 Day 단어 테스트</button></div></div>';

  /* Day 헤더 */
  var dayKnown = ws.filter(function(w){ return r.st[w.id]===1; }).length;
  h += '<div class="panel tw-dayhead">'
    +  '<div><b>Day ' + day + '</b> <span class="pill" style="--c:' + toTheme(th).color + '">' + esc(toThemeName(th)) + '</span>'
    +  ' <span class="muted">' + esc(toTheme(th).sub) + '</span></div>'
    +  '<div class="tw-dayprog">' + toBar(ws.length? Math.round(dayKnown/ws.length*100):0, '#059669')
    +  '<b>' + dayKnown + ' / ' + ws.length + '</b></div></div>';

  /* 단어 카드 */
  h += '<div class="tw-cards">';
  ws.forEach(function(w){
    var s = r.st[w.id] || 0;
    h += '<div class="tw-card ' + (s===1?'known':s===2?'vague':'') + '" data-w="' + w.id + '">'
      +  '<div class="tw-c-top">'
      +  '<div class="tw-c-w"><b>' + esc(w.w) + '</b><span class="tw-pos">' + toPosName(w.pos) + '</span>'
      +  (w.lv?'<span class="tw-lv lv'+w.lv+'">'+(w.lv===1?'기초':w.lv===2?'중급':'고급')+'</span>':'')
      +  '<span class="tw-parts">' + (w.parts||[]).map(function(p){ return 'P'+p; }).join(' ') + '</span></div>'
      +  '<div class="tw-c-b"><button class="tw-mk ' + (s===1?'on':'') + '" data-mk="1" data-id="' + w.id + '">외웠어요</button>'
      +  '<button class="tw-mk vg ' + (s===2?'on':'') + '" data-mk="2" data-id="' + w.id + '">헷갈려요</button></div>'
      +  '</div>'
      +  '<div class="tw-c-mean ' + (TS_WORD_HIDE?'hid':'') + '" data-mean="' + w.id + '">' + esc(w.mean) + '</div>'
      +  '<div class="tw-c-ex">' + esc(w.ex) + '<small>' + esc(w.exK) + '</small></div>'
      +  '<div class="tw-c-more">'
      +  (w.col ?'<div class="tw-tag col"><b>짝 표현</b>' + esc(w.col) + '</div>':'')
      +  (w.syn ?'<div class="tw-tag syn"><b>동의어</b>' + esc(w.syn) + '</div>':'')
      +  (w.conf?'<div class="tw-tag conf"><b>혼동 주의</b>' + esc(w.conf) + '</div>':'')
      +  '</div></div>';
  });
  h += '</div>';

  /* 복습 · 주제별 진도 */
  var rv = toWordReviewList(sid, 8);
  h += '<div class="grid2"><div class="panel"><h3>복습이 필요한 단어</h3>';
  if(!rv.length) h += '<p class="muted">아직 복습 대상이 없습니다. 「헷갈려요」로 표시한 단어와 테스트에서 틀린 단어가 여기 모입니다.</p>';
  else{
    h += '<div class="tw-rv">';
    rv.forEach(function(x){
      h += '<div class="tw-rvrow"><b>' + esc(x.w.w) + '</b><span>' + esc(x.w.mean) + '</span>'
        +  '<span class="muted">' + (x.state===2?'헷갈림':'복습 시기') + (x.wrong?' · 테스트 오답 '+x.wrong+'회':'') + '</span></div>';
    });
    h += '</div><button class="btn full" id="twReviewTest">복습 단어 테스트 ' + Math.min(toWordReviewList(sid).length,20) + '개</button>';
  }
  h += '</div><div class="panel"><h3>주제별 진도</h3>';
  TO_THEMES.forEach(function(t){
    var b = pg.byTheme[t.k]; if(!b || !b.total) return;
    var rate = Math.round(b.known/b.total*100);
    h += '<div class="srow"><span>' + esc(t.name) + '</span>' + toBar(rate, t.color) + '<b>' + b.known + '/' + b.total + '</b></div>';
  });
  h += '</div></div>';

  /* 최근 테스트 */
  var ts = (r.tests||[]).slice(-8).reverse();
  if(ts.length){
    h += '<div class="panel"><h3>최근 단어 테스트</h3><div class="tbl-wrap"><table class="tbl">'
      +  '<thead><tr><th>날짜</th><th>방식</th><th>문항</th><th>정답률</th></tr></thead><tbody>';
    ts.forEach(function(t){
      var mn = (TO_WORD_MODES.find(function(m){ return m.k===t.mode; })||{}).name || t.mode;
      h += '<tr><td>' + esc(t.date) + '</td><td>' + esc(mn) + '</td><td>' + t.right + '/' + t.total + '</td>'
        +  '<td>' + Math.round(t.right/t.total*100) + '%</td></tr>';
    });
    h += '</tbody></table></div></div>';
  }

  h += '<p class="muted tw-src">주제 분류는 ETS 가 공식 안내서에서 밝힌 TOEIC Listening &amp; Reading 출제 영역 13개를 그대로 따랐습니다. '
    +  '단어·예문은 이룸토익이 그 영역에 맞춰 직접 정리한 것으로, 관리자 화면에서 학원 단어장으로 바꾸거나 추가할 수 있습니다.</p>';

  page(h);

  $('#twPrevDay').onclick = function(){ toWordSetDay(sid, day-1); tsWord(); };
  $('#twNextDay').onclick = function(){ toWordSetDay(sid, day+1); tsWord(); };
  $('#twDaySel').onchange = function(){ toWordSetDay(sid, +$('#twDaySel').value); tsWord(); };
  $('#twHide').onclick = function(){ TS_WORD_HIDE = !TS_WORD_HIDE; tsWord(); };
  $('#twAllKnown').onclick = function(){
    if(!confirm('Day ' + day + ' 단어 ' + ws.length + '개를 모두 「외웠어요」로 표시할까요?')) return;
    ws.forEach(function(w){ toWordMark(sid, w.id, 1); });
    toast('Day ' + day + ' 을 모두 외움으로 표시했습니다'); tsWord();
  };
  $('#twTest').onclick = function(){ toWordQuizStart(ws, 'mix', Math.min(15, ws.length)); };
  var rt = $('#twReviewTest');
  if(rt) rt.onclick = function(){
    var pool = toWordReviewList(sid, 20).map(function(x){ return x.w; });
    toWordQuizStart(pool, 'mix', pool.length);
  };
  /* 뜻 카드 눌러서 하나만 열기 */
  $$('[data-mean]').forEach(function(d){
    d.onclick = function(){ d.classList.toggle('hid'); };
  });
  $$('[data-mk]').forEach(function(b){
    b.onclick = function(ev){
      ev.stopPropagation();
      var id = b.dataset.id, want = +b.dataset.mk;
      var cur = toWordRec(sid).st[id] || 0;
      toWordMark(sid, id, cur===want ? 0 : want);
      tsWord();
    };
  });
}

/* ================= 관리자 화면 ================= */
var TA_WORD_THEME = '';
var TA_WORD_Q = '';
function taWord(){
  function draw(){
    var stat = toVocaStat();
    var list = toVocaAll().filter(function(v){
      if(TA_WORD_THEME && v.theme!==TA_WORD_THEME) return false;
      if(TA_WORD_Q){
        var q = TA_WORD_Q.toLowerCase();
        if(String(v.w).toLowerCase().indexOf(q)<0 && String(v.mean).indexOf(TA_WORD_Q)<0) return false;
      }
      return true;
    });
    var own = {}; (DB.toeicVoca||[]).forEach(function(v){ own[v.id]=1; });
    /* 학원이 직접 넣은 단어를 맨 앞에 둡니다 — 방금 추가한 단어가 바로 보이도록 */
    list = list.slice().sort(function(a,b){ return (own[b.id]?1:0) - (own[a.id]?1:0); });

    var h = head('토익 어휘 관리', 'ETS 공식 출제 영역 13개 주제로 나눈 어휘를 관리합니다');
    h += '<div class="stats">'
      +  card('전체 단어', fmtNum(stat.total) + '개', '기본 제공 + 학원 등록')
      +  card('학원 등록', fmtNum((DB.toeicVoca||[]).length) + '개', '직접 추가한 단어', '#0d9488')
      +  card('하루 분량', toWordPerDay() + '개', '전체 ' + toWordDays() + ' Day', '#0891b2')
      +  card('난이도 분포', stat.byLv[1] + ' / ' + stat.byLv[2] + ' / ' + stat.byLv[3], '기초 / 중급 / 고급', '#7c3aed')
      +  '</div>';

    h += '<div class="bar"><div class="filters" id="twFilt">'
      +  '<button class="chip ' + (TA_WORD_THEME===''?'on':'') + '" data-t="">전체 (' + stat.total + ')</button>'
      +  TO_THEMES.map(function(t){ return '<button class="chip ' + (TA_WORD_THEME===t.k?'on':'') + '" data-t="' + t.k + '">' + esc(t.name) + ' (' + stat.byTheme[t.k] + ')</button>'; }).join('')
      +  '</div></div>';
    h += '<div class="bar"><div class="inl">검색 <input id="twQ" value="' + esc(TA_WORD_Q) + '" placeholder="단어 또는 뜻" style="width:200px"></div>'
      +  '<div class="inl"><label class="inl">하루 분량 <input id="twPerDay" type="number" min="5" max="100" value="' + toWordPerDay() + '" style="width:80px"></label>'
      +  '<button class="btn ghost" id="twPerSave">저장</button>'
      +  '<button class="btn" id="twAdd">단어 추가</button>'
      +  '<button class="btn ghost" id="twImport">일괄 등록</button></div></div>';

    h += '<div class="panel"><h3>단어 ' + list.length + '개</h3><div class="tbl-wrap"><table class="tbl">'
      +  '<thead><tr><th>단어</th><th>품사</th><th>뜻</th><th>주제</th><th>난이도</th><th>파트</th><th></th></tr></thead><tbody>';
    var SHOWN = 300;
    list.slice(0, SHOWN).forEach(function(v){
      h += '<tr><td><b>' + esc(v.w) + '</b></td><td>' + toPosName(v.pos) + '</td>'
        +  '<td class="tex-stemcell">' + esc(v.mean) + '</td>'
        +  '<td><span class="pill" style="--c:' + toTheme(v.theme).color + '">' + esc(toThemeName(v.theme)) + '</span></td>'
        +  '<td>' + (v.lv||1) + '</td><td>' + (v.parts||[]).map(function(p){ return 'P'+p; }).join(' ') + '</td>'
        +  '<td>' + (own[v.id]
              ? '<button class="lnk" data-ew="' + v.id + '">수정</button> <button class="lnk del" data-dw="' + v.id + '">삭제</button>'
              : '<button class="lnk" data-cw="' + v.id + '">복사해 수정</button> <span class="muted">기본 제공</span>') + '</td></tr>';
    });
    h += '</tbody></table></div>';
    if(list.length>SHOWN) h += '<p class="muted">'+list.length+'개 중 앞의 '+SHOWN+'개만 표시했습니다. '
      + '학원이 등록한 단어는 항상 맨 앞에 나옵니다. 나머지는 위의 주제 칩이나 검색으로 좁혀 보세요.</p>';
    h += '</div>';

    /* 학생별 진도 */
    var st = toMyStudents();
    h += '<div class="panel"><h3>학생별 어휘 진도</h3>';
    if(!st.length) h += '<p class="muted">등록된 토익 학생이 없습니다.</p>';
    else{
      h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>학생</th><th>Day</th><th>외운 단어</th><th>헷갈림</th><th>진도율</th><th>연속 학습</th><th>최근 테스트</th></tr></thead><tbody>';
      st.forEach(function(s){
        var pg = toWordProgress(s.id), rec = toWordRec(s.id);
        var last = (rec.tests||[]).slice(-1)[0];
        h += '<tr><td><b>' + esc(s.name) + '</b></td><td>' + pg.day + ' / ' + pg.days + '</td>'
          +  '<td>' + pg.known + '</td><td>' + pg.vague + '</td>'
          +  '<td>' + pg.rate + '%</td><td>' + pg.streak + '일</td>'
          +  '<td>' + (last ? esc(last.date) + ' · ' + Math.round(last.right/last.total*100) + '%' : '<span class="muted">없음</span>') + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';
    page(h);

    $$('#twFilt .chip').forEach(function(b){ b.onclick=function(){ TA_WORD_THEME=b.dataset.t; draw(); }; });
    var qi = $('#twQ');
    qi.onchange = function(){ TA_WORD_Q = qi.value.trim(); draw(); };
    qi.onkeydown = function(e){ if(e.key==='Enter'){ TA_WORD_Q = qi.value.trim(); draw(); } };
    $('#twPerSave').onclick = function(){
      var n = parseInt($('#twPerDay').value,10);
      if(!(n>=5 && n<=100)) return alert('하루 분량은 5~100개 사이로 정해 주세요.');
      toConf().wordPerDay = n; save(); toast('하루 분량을 ' + n + '개로 저장했습니다'); draw();
    };
    $('#twAdd').onclick = function(){ taWordForm(null, draw); };
    $('#twImport').onclick = function(){ taWordImport(draw); };
    $$('[data-ew]').forEach(function(b){ b.onclick=function(){ taWordForm(toVocaById(b.dataset.ew), draw); }; });
    $$('[data-cw]').forEach(function(b){ b.onclick=function(){
      var src = toVocaById(b.dataset.cw); if(!src) return;
      var c = JSON.parse(JSON.stringify(src)); c.id=null; taWordForm(c, draw); }; });
    $$('[data-dw]').forEach(function(b){ b.onclick=function(){
      if(!confirm('이 단어를 삭제하시겠습니까?')) return;
      DB.toeicVoca = (DB.toeicVoca||[]).filter(function(v){ return v.id!==b.dataset.dw; }); save(); draw(); }; });
  }
  draw();
}

function taWordForm(v, onDone){
  var isNew = !v || !v.id;
  v = v || { pos:'n', theme:TA_WORD_THEME||'office', lv:2, parts:[5] };
  var node = el('<div class="form-card"></div>');
  var h = '<h3>' + (isNew?'단어 추가':'단어 수정') + '</h3>'
    + '<div class="grid2"><label>단어<input id="wW" value="' + esc(v.w||'') + '"></label>'
    + '<label>품사<select id="wPos">' + Object.keys(TO_POS).map(function(k){ return '<option value="' + k + '" ' + (v.pos===k?'selected':'') + '>' + TO_POS[k] + '</option>'; }).join('') + '</select></label></div>'
    + '<label>뜻<input id="wMean" value="' + esc(v.mean||'') + '"></label>'
    + '<div class="grid2"><label>주제<select id="wTheme">' + TO_THEMES.map(function(t){ return '<option value="' + t.k + '" ' + (v.theme===t.k?'selected':'') + '>' + esc(t.name) + '</option>'; }).join('') + '</select></label>'
    + '<label>난이도<select id="wLv">' + [1,2,3].map(function(n){ return '<option value="' + n + '" ' + ((v.lv||2)===n?'selected':'') + '>' + n + ' (' + (n===1?'기초':n===2?'중급':'고급') + ')</option>'; }).join('') + '</select></label></div>'
    + '<label>주로 나오는 파트 (여러 개는 쉼표로)<input id="wParts" value="' + esc((v.parts||[]).join(',')) + '" placeholder="예: 5,6,7"></label>'
    + '<label>예문 (영어)<input id="wEx" value="' + esc(v.ex||'') + '"></label>'
    + '<label>예문 해석<input id="wExK" value="' + esc(v.exK||'') + '"></label>'
    + '<label>짝 표현 (콜로케이션)<input id="wCol" value="' + esc(v.col||'') + '"></label>'
    + '<label>동의어 (패러프레이징)<input id="wSyn" value="' + esc(v.syn||'') + '"></label>'
    + '<label>혼동 주의<input id="wConf" value="' + esc(v.conf||'') + '"></label>'
    + '<div class="form-b"><button class="btn" id="wSave">저장</button><button class="btn ghost" id="wCancel">취소</button></div>';
  node.innerHTML = h;
  openModal(node);
  node.querySelector('#wCancel').onclick = closeModal;
  node.querySelector('#wSave').onclick = function(){
    var word = (node.querySelector('#wW').value||'').trim();
    var mean = (node.querySelector('#wMean').value||'').trim();
    if(!word) return alert('단어를 입력해 주세요.');
    if(!mean) return alert('뜻을 입력해 주세요.');
    var parts = (node.querySelector('#wParts').value||'').split(',')
      .map(function(x){ return parseInt(x.trim(),10); })
      .filter(function(n){ return n>=1 && n<=7; });
    if(!parts.length) parts = [5];
    var rec = { id: v.id || uid('tw'), ac:'toeic', w:word,
                pos: node.querySelector('#wPos').value,
                mean: mean,
                theme: node.querySelector('#wTheme').value,
                lv: +node.querySelector('#wLv').value,
                parts: parts,
                ex: (node.querySelector('#wEx').value||'').trim(),
                exK: (node.querySelector('#wExK').value||'').trim(),
                col: (node.querySelector('#wCol').value||'').trim(),
                syn: (node.querySelector('#wSyn').value||'').trim(),
                conf: (node.querySelector('#wConf').value||'').trim() };
    DB.toeicVoca = DB.toeicVoca || [];
    var ix = DB.toeicVoca.findIndex(function(x){ return x.id===rec.id; });
    if(ix>=0) DB.toeicVoca[ix]=rec; else DB.toeicVoca.push(rec);
    save(); closeModal(); toast('저장했습니다'); onDone && onDone();
  };
}

function taWordImport(onDone){
  var node = el('<div class="form-card"></div>');
  node.innerHTML = '<h3>단어 일괄 등록</h3>'
    + '<p class="muted">한 줄에 한 단어씩, 탭이나 <b>|</b> 로 칸을 나눠 붙여 넣습니다.<br>'
    + '순서 : 단어 | 품사(n/v/a/ad/phr) | 뜻 | 주제키 | 난이도(1~3) | 파트(5,7) | 예문 | 예문해석 | 짝표현 | 동의어 | 혼동주의<br>'
    + '뒤쪽 칸은 비워도 됩니다. 주제키는 아래를 참고하세요.</p>'
    + '<div class="tw-keys">' + TO_THEMES.map(function(t){ return '<span class="pill" style="--c:' + t.color + '">' + t.k + ' = ' + esc(t.name) + '</span>'; }).join('') + '</div>'
    + '<textarea id="wiTxt" style="min-height:200px" placeholder="negotiate | v | 협상하다 | biz | 2 | 5,7 | They are negotiating a contract. | 그들은 계약을 협상하고 있습니다. | negotiate terms 조건을 협상하다 | bargain | negotiable(협상 가능한)"></textarea>'
    + '<div class="form-b"><button class="btn" id="wiGo">등록</button><button class="btn ghost" id="wiCancel">취소</button></div>';
  openModal(node);
  node.querySelector('#wiCancel').onclick = closeModal;
  node.querySelector('#wiGo').onclick = function(){
    var lines = (node.querySelector('#wiTxt').value||'').split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
    var ok=0, fail=[];
    DB.toeicVoca = DB.toeicVoca || [];
    lines.forEach(function(l, i){
      var c = l.split(/\t|\|/).map(function(x){ return x.trim(); });
      var word=c[0], pos=c[1]||'n', mean=c[2]||'';
      if(!word){ fail.push((i+1)+'행: 단어 없음'); return; }
      if(!mean){ fail.push((i+1)+'행: 뜻 없음'); return; }
      if(!TO_POS[pos]) pos='n';
      var theme = TO_THEMES.some(function(t){ return t.k===c[3]; }) ? c[3] : 'office';
      var lv = [1,2,3].indexOf(+c[4])>=0 ? +c[4] : 2;
      var parts = (c[5]||'5').split(/[,\s]+/).map(function(x){ return parseInt(x,10); }).filter(function(n){ return n>=1&&n<=7; });
      if(!parts.length) parts=[5];
      DB.toeicVoca.push({ id:uid('tw'), ac:'toeic', w:word, pos:pos, mean:mean, theme:theme, lv:lv, parts:parts,
                          ex:c[6]||'', exK:c[7]||'', col:c[8]||'', syn:c[9]||'', conf:c[10]||'' });
      ok++;
    });
    save(); closeModal();
    alert(ok + '개 단어를 등록했습니다.' + (fail.length? '\n\n등록하지 못한 줄:\n' + fail.slice(0,10).join('\n') : ''));
    onDone && onDone();
  };
}
