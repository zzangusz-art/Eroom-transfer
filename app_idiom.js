/* ===================== 빈출 숙어 총정리 · 독해 약점공략 =====================
   IDIOMS = [숙어, 뜻, 한 단어 동의어, 분류, 교재수록] (data_idiom.js) */

/* 생성한 문제도 '다시보기'에서 찾을 수 있도록 보조 문제은행을 둡니다 */
var EXTRA_Q = [];
(function(){
  if(typeof qById !== 'function') return;
  var _orig = qById;
  window.qById = function(id){
    var q = _orig(id);
    if(q) return q;
    for(var i=0;i<EXTRA_Q.length;i++) if(EXTRA_Q[i].id===id) return EXTRA_Q[i];
    return null;
  };
})();
function extraPut(q){
  for(var i=0;i<EXTRA_Q.length;i++) if(EXTRA_Q[i].id===q.id){ EXTRA_Q[i]=q; return q; }
  EXTRA_Q.push(q);
  if(EXTRA_Q.length>1200) EXTRA_Q.splice(0, 400);
  return q;
}

/* ---------- 숙어 도우미 ---------- */
function idObj(a){ return a ? { p:a[0], ko:a[1], syn:a[2], cat:a[3], book:!!a[4], lv:a[5]||2 } : null; }
function idFind(p){ for(var i=0;i<IDIOMS.length;i++) if(IDIOMS[i][0]===p) return IDIOMS[i]; return null; }
function idStore(sid){
  DB.idiom = DB.idiom || {};
  sid = sid || (CURRENT && CURRENT.id);
  var v = DB.idiom[sid] = DB.idiom[sid] || {};
  v.known = v.known || {};    /* 외운 숙어 */
  v.miss  = v.miss  || {};    /* 틀린 숙어 {숙어:{n,ok,at}} */
  return v;
}
function idMark(p, ok){
  var v=idStore();
  if(ok){
    var m=v.miss[p];
    if(m){ m.ok=(m.ok||0)+1; m.at=todayStr(); if(m.ok>=2){ delete v.miss[p]; v.known[p]=todayStr(); } }
    else v.known[p]=todayStr();
  } else {
    var mm=v.miss[p]=v.miss[p]||{n:0,ok:0}; mm.n++; mm.ok=0; mm.at=todayStr(); delete v.known[p];
  }
  v._u=Date.now();
}
var ID_CATS = ['동사구','전치사구','관용표현'];

/* ---------- 숙어 문제 만들기 ----------
   type: ko(숙어→뜻) / en(뜻→숙어) / syn(숙어→한 단어 동의어) */
function idMakeQ(a, type, idx){
  var o = idObj(a); if(!o) return null;
  if(type==='syn' && !o.syn) return null;
  var pool = IDIOMS.filter(function(x){ return x[0]!==o.p && x[3]===o.cat && (x[5]||2)===o.lv; });
  if(pool.length<3) pool = IDIOMS.filter(function(x){ return x[0]!==o.p && x[3]===o.cat; });
  if(pool.length<3) pool = IDIOMS.filter(function(x){ return x[0]!==o.p; });
  var wrong = shuffle(pool.slice()).slice(0,3);
  var right, opts, stem, exp;
  if(type==='ko'){
    right = o.ko;
    opts = wrong.map(function(x){ return x[1]; });
    stem = '<b>' + o.p + '</b> 의 뜻으로 알맞은 것은?';
    exp  = o.p + ' = ' + o.ko + (o.syn?(' (한 단어로 ' + o.syn + ')'):'');
  } else if(type==='en'){
    right = o.p;
    opts = wrong.map(function(x){ return x[0]; });
    stem = '「' + o.ko + '」 에 해당하는 숙어는?';
    exp  = o.ko + ' = ' + o.p + (o.syn?(' (= ' + o.syn + ')'):'');
  } else {
    right = o.syn;
    var sPool = IDIOMS.filter(function(x){ return x[2] && x[2]!==o.syn; });
    opts = shuffle(sPool).slice(0,3).map(function(x){ return x[2]; });
    stem = '<b>' + o.p + '</b> 을(를) 한 단어 동사로 바꾸면?';
    exp  = o.p + ' (' + o.ko + ') = ' + o.syn;
  }
  opts = opts.filter(Boolean);
  while(opts.length<3) opts.push('—');
  var all = shuffle(opts.concat([right]));
  var ans = all.indexOf(right);
  return extraPut({
    id: 900000 + (idx||0),
    section:'vocab', level:o.lv||2, tag:'숙어', sub:o.cat,
    stem: stem, options: all, answer: ans,
    explanation: exp,
    src:'이룸편입 빈출숙어', idiom:o.p
  });
}
/* 틀린 숙어가 더 자주 나오도록 가중치를 줍니다 */
function idPick(n, cat, only, lv){
  var v=idStore();
  var base = IDIOMS.filter(function(x){
    if(lv && (x[5]||2)!==+lv) return false;
    if(cat && cat!=='all' && x[3]!==cat) return false;
    if(only==='miss') return !!v.miss[x[0]];
    if(only==='unknown') return !v.known[x[0]];
    if(only==='book') return !!x[4];
    return true;
  });
  if(base.length<4) base = IDIOMS.slice();
  var bag=[];
  base.forEach(function(x){
    var m=v.miss[x[0]];
    var w = m ? Math.min(4, 1+(m.n||1)) : 1;
    for(var i=0;i<w;i++) bag.push(x);
  });
  var out=[], used={};
  for(var t=0; t<n*40 && out.length<n; t++){
    var x = bag[Math.floor(Math.random()*bag.length)];
    if(used[x[0]]) continue;
    used[x[0]]=1; out.push(x);
  }
  return out;
}
function idBuildTest(n, cat, only, type, lv){
  var picks = idPick(n, cat, only, lv);
  var qs=[];
  picks.forEach(function(a, i){
    var t = type==='mix' ? ['ko','en','syn'][i%3] : type;
    var q = idMakeQ(a, t, i) || idMakeQ(a, 'ko', i);
    if(q) qs.push(q);
  });
  return qs;
}

/* ---------- 숙어 총정리 화면 ---------- */
var ID_CAT='all', ID_Q='', ID_HIDE=false, ID_PAGE=1, ID_PER=100, ID_LV=0;
/* 테스트 시작 옵션 — 화면이 다시 그려져도 고른 값을 유지합니다 */
var IDT={cat:'all', lv:'0', only:'all', type:'mix', n:10};
var RDT={t:'all', l:'0', n:10};
function stuIdiom(){
  var v=idStore();
  var knownN=Object.keys(v.known).length, missN=Object.keys(v.miss).length;
  var list = IDIOMS.filter(function(x){
    if(ID_CAT!=='all' && x[3]!==ID_CAT) return false;
    if(ID_LV && (x[5]||2)!==ID_LV) return false;
    if(ID_Q){ var q=ID_Q.toLowerCase();
      if(x[0].indexOf(q)<0 && x[1].indexOf(ID_Q)<0 && String(x[2]||'').indexOf(q)<0) return false; }
    return true;
  });
  var html=head('빈출 숙어 총정리','편입 동의어 문제에 자주 나오는 구동사·관용표현을 한 번에 정리합니다');
  html+='<div class="stats">'
    + card('전체 숙어', IDIOMS.length+'개', '동사구·전치사구·관용표현')
    + card('외운 숙어', knownN+'개', '두 번 연속 맞히면 인정', knownN?'#059669':'#94a3b8')
    + card('복습할 숙어', missN+'개', '틀린 숙어는 계속 나옵니다', missN?'#d97706':'#94a3b8')
    + card('난이도 분포', [1,2,3].map(function(n){return IDIOMS.filter(function(x){return (x[5]||2)===n;}).length;}).join(' / '), '1단계 / 2단계 / 3단계','#4f46e5')
    + '</div>';
  html+='<div class="panel"><h3>숙어 테스트</h3>'
    + '<div class="wg-opts">'
      + '<label>범위<select id="idCat"><option value="all"'+(IDT.cat==='all'?' selected':'')+'>전체</option>'
        + ID_CATS.map(function(c){ return '<option value="'+c+'"'+(IDT.cat===c?' selected':'')+'>'+c+'</option>'; }).join('')+'</select></label>'
      + '<label>난이도<select id="idLv"><option value="0"'+(IDT.lv==='0'?' selected':'')+'>전체 난이도</option>'
        + [1,2,3].map(function(n){ return '<option value="'+n+'"'+(IDT.lv===String(n)?' selected':'')+'>'+n+'단계 ('+IDIOMS.filter(function(x){return (x[5]||2)===n;}).length+'개)</option>'; }).join('')+'</select></label>'
      + '<label>대상<select id="idOnly">'
        + [['all','전체 숙어'],['unknown','아직 못 외운 숙어'],['miss','틀렸던 숙어'],['book','교재 수록 숙어만']]
            .map(function(x){ return '<option value="'+x[0]+'"'+(IDT.only===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')
        + '</select></label>'
      + '<label>유형<select id="idType">'
        + [['mix','섞어서 출제'],['ko','숙어 → 뜻 고르기'],['en','뜻 → 숙어 고르기'],['syn','숙어 → 한 단어 동의어']]
            .map(function(x){ return '<option value="'+x[0]+'"'+(IDT.type===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')
        + '</select></label>'
      + '<label>문항 수<select id="idN">'
        + [10,15,20,30].map(function(n){ return '<option'+(IDT.n===n?' selected':'')+'>'+n+'</option>'; }).join('')+'</select></label>'
    + '</div>'
    + '<div class="bar-actions" style="margin-top:10px"><button class="btn" id="idStart">테스트 시작</button>'
    + '<button class="btn ghost" onclick="go(\'s-center\')">테스트 센터로</button></div></div>';
  var idPages = Math.max(1, Math.ceil(list.length / ID_PER));
  if(ID_PAGE > idPages) ID_PAGE = idPages;
  if(ID_PAGE < 1) ID_PAGE = 1;
  var idFrom = (ID_PAGE-1)*ID_PER;
  var idPageList = list.slice(idFrom, idFrom + ID_PER);
  html+='<div class="panel"><h3>숙어 목록 <small class="muted">('+list.length+'개)</small></h3>'
    + '<div class="bar-actions" style="margin-bottom:10px">'
      + '<select id="idCat2" class="cal-co"><option value="all">전체 분류</option>'
        + ID_CATS.map(function(c){ return '<option value="'+c+'"'+(ID_CAT===c?' selected':'')+'>'+c+'</option>'; }).join('')+'</select>'
      + '<select id="idLv2" class="cal-co"><option value="0">전체 난이도</option>'
        + [1,2,3].map(function(n){ return '<option value="'+n+'"'+(ID_LV===n?' selected':'')+'>'+n+'단계</option>'; }).join('')+'</select>'
      + '<input id="idQ" placeholder="숙어 · 뜻 · 동의어 검색" value="'+esc(ID_Q)+'" style="max-width:220px">'
      + '<select id="idPer" class="cal-co">'+[50,100,200].map(function(n){
          return '<option value="'+n+'"'+(ID_PER===n?' selected':'')+'>'+n+'개씩 보기</option>'; }).join('')+'</select>'
      + '<button class="btn ghost" id="idHide">'+(ID_HIDE?'뜻 보이기':'뜻 가리고 외우기')+'</button>'
    + '</div>'
    + '<div class="muted wd-count" style="margin-bottom:8px">'
      + (list.length ? ('전체 '+list.length+'개 중 '+(idFrom+1)+'~'+(idFrom+idPageList.length)+'번째 · '+ID_PAGE+'/'+idPages+'쪽') : '조건에 맞는 숙어가 없습니다')
      + '</div>'
    + (typeof wdPagerHtml==='function' ? wdPagerHtml(ID_PAGE, idPages, 'top') : '')
    + '<div class="wd-grid">'
    + idPageList.map(function(x){
        var o=idObj(x), on=!!v.known[o.p], m=v.miss[o.p];
        return '<div class="wd-card'+(on?' on':'')+(m?' miss':'')+'" data-id="'+esc(o.p)+'">'
          + '<div class="wd-h"><b>'+esc(o.p)+'</b>'
            + '<span class="wd-pos">'+esc(o.cat)+'</span>'
            + '<span class="pill" style="--c:'+['#94a3b8','#0891b2','#4f46e5','#b45309'][o.lv]+'">'+o.lv+'단계</span>'
            + (o.book?'<span class="pill" style="--c:#059669">교재</span>':'')
            + (m?('<span class="wd-flag">틀림 '+m.n+'회</span>'):'')
            + '<span class="wd-ck">'+(on?'✓':'')+'</span></div>'
          + '<div class="wd-ko'+(ID_HIDE?' blur':'')+'">'+esc(o.ko)+'</div>'
          + (o.syn?('<div class="wd-syn">= '+esc(o.syn)+'</div>'):'')
          + '</div>';
      }).join('')
    + '</div>'
    + (typeof wdPagerHtml==='function' ? wdPagerHtml(ID_PAGE, idPages, 'bot') : '')
    + '</div>';
  page(html);
  var g=function(id){ return document.getElementById(id); };
  if(g('idCat2')) g('idCat2').onchange=function(){ ID_CAT=g('idCat2').value; ID_PAGE=1; stuIdiom(); };
  if(g('idLv2'))  g('idLv2').onchange=function(){ ID_LV=+g('idLv2').value; ID_PAGE=1; stuIdiom(); };
  if(g('idPer'))  g('idPer').onchange=function(){ ID_PER=+g('idPer').value; ID_PAGE=1; stuIdiom(); };
  if(g('idHide')) g('idHide').onclick=function(){ ID_HIDE=!ID_HIDE; stuIdiom(); };
  if(g('idQ')) g('idQ').oninput=function(){ ID_Q=g('idQ').value.trim(); ID_PAGE=1; clearTimeout(window.__idq);
    window.__idq=setTimeout(function(){ stuIdiom(); var q=document.getElementById('idQ'); if(q){ q.focus(); q.setSelectionRange(q.value.length,q.value.length); } }, 300); };
  $$('#page [data-pg]').forEach(function(b){
    b.onclick=function(){
      var t=b.dataset.pg;
      if(t==='prev') ID_PAGE--;
      else if(t==='next') ID_PAGE++;
      else if(t==='first') ID_PAGE=1;
      else if(t==='last') ID_PAGE=idPages;
      else ID_PAGE=+t;
      stuIdiom();
    };
  });
  if(g('wdJump')) g('wdJump').onchange=function(){ ID_PAGE=+g('wdJump').value; stuIdiom(); };
  $$('#page .wd-card[data-id]').forEach(function(c){
    c.onclick=function(){
      var p=c.dataset.id, v2=idStore();
      if(v2.known[p]) delete v2.known[p]; else v2.known[p]=todayStr();
      v2._u=Date.now(); save();
      var on=!!v2.known[p];
      c.classList.toggle('on', on);
      var ck=c.querySelector('.wd-ck'); if(ck) ck.textContent=on?'✓':'';
    };
  });
  ['idCat','idLv','idOnly','idType','idN'].forEach(function(id){ var e=g(id); if(e) e.onchange=function(){
    IDT.cat=g('idCat').value; IDT.lv=(g('idLv')||{}).value||'0';
    IDT.only=g('idOnly').value; IDT.type=g('idType').value; IDT.n=+g('idN').value||10; }; });
  if(g('idStart')) g('idStart').onclick=function(){
    IDT.cat=g('idCat').value; IDT.lv=(g('idLv')||{}).value||'0';
    IDT.only=g('idOnly').value; IDT.type=g('idType').value; IDT.n=+g('idN').value||10;
    var qs=idBuildTest(IDT.n, IDT.cat, IDT.only, IDT.type, +IDT.lv||0);
    if(!qs.length){ toast('출제할 숙어가 없습니다'); return; }
    window._afterQuiz=function(){ idAfter(); go('s-idiom'); };
    window._againQuiz=function(){ startQuiz(qs,{mode:'section',section:'vocab'}); };
    startQuiz(qs, {mode:'section', section:'vocab'});
  };
}
/* 채점이 끝나면 맞고 틀린 숙어를 기록합니다 */
function idAfter(){
  try{
    var ss=(mySessions()||[])[0];
    if(!ss || !ss.detail) return;
    var n=0;
    ss.detail.forEach(function(d){
      var q=qById(d.id);
      if(q && q.idiom){ idMark(q.idiom, !!d.correct); n++; }
    });
    if(n) save();
  }catch(e){}
}

/* ===================== 독해 약점공략 ===================== */
var RD_TYPES = [
  { key:'주제·요지', tags:['주제','주제·요지'],
    tip:'글 전체를 포괄하는 한 문장을 찾습니다. 너무 좁거나(지엽적) 너무 넓은(일반적) 선택지는 오답입니다.',
    clue:'반복되는 핵심어 + 주제문', how:'스키밍 — 제목·첫 문단·각 문단 첫 문장·마지막 문단을 빠르게 훑습니다.' },
  { key:'세부내용', tags:['세부','세부내용'],
    tip:'선택지의 핵심어를 지문에서 찾아 사실 여부를 하나씩 대조합니다.',
    clue:'지문에 명시된 진술', how:'스캐닝 — 고유명사·숫자·핵심어를 단서로 필요한 곳만 찾아 읽습니다.' },
  { key:'추론', tags:['추론'],
    tip:'지문에 직접 없지만 논리적으로 반드시 도출되는 내용을 고릅니다. 상상으로 넘겨짚으면 틀립니다.',
    clue:'근거 문장의 함의', how:'선택지마다 근거 문장을 지문에서 짚어 봅니다. 근거가 없으면 오답입니다.' },
  { key:'문맥어휘', tags:['어휘','어휘추론'],
    tip:'단어의 사전적 뜻이 아니라 그 문장에서의 의미로 판단합니다.',
    clue:'앞뒤 문맥의 단서', how:'해당 단어를 가리고 빈칸으로 본 뒤, 문맥에 맞는 말을 먼저 떠올립니다.' }
];
function rdTypeOf(q){
  var t=(q&&q.tag)||'';
  for(var i=0;i<RD_TYPES.length;i++) if(RD_TYPES[i].tags.indexOf(t)>=0) return RD_TYPES[i].key;
  return '기타';
}
function rdBank(typeKey, level){
  var base = QUESTIONS.filter(function(q){
    if(q.section!=='reading') return false;
    if(level && q.level!==level) return false;
    if(typeKey && typeKey!=='all' && rdTypeOf(q)!==typeKey) return false;
    return true;
  });
  /* 문맥어휘는 교재 문항이 적어 지문에서 자동으로 더 만들어 붙입니다 */
  if(!typeKey || typeKey==='all' || typeKey==='문맥어휘'){
    try{ base = base.concat(rdVocabBank(level)); }catch(e){}
  }
  return base;
}
/* 유형별 내 정답률 */
function rdStats(sid){
  sid = sid || (CURRENT && CURRENT.id);
  var acc={};
  RD_TYPES.forEach(function(t){ acc[t.key]={t:0,r:0}; });
  (mySessions()||[]).forEach(function(se){
    (se.detail||[]).forEach(function(d){
      if(d.section!=='reading') return;
      var q=qById(d.id); if(!q) return;
      var k=rdTypeOf(q); if(!acc[k]) return;
      acc[k].t++; if(d.correct) acc[k].r++;
    });
  });
  return RD_TYPES.map(function(t){
    var a=acc[t.key];
    return { key:t.key, total:a.t, right:a.r, rate: a.t? Math.round(a.r/a.t*100) : null,
             bank: rdBank(t.key).length, tip:t.tip, clue:t.clue, how:t.how };
  });
}
function rdWeakest(sid){
  var st=rdStats(sid).filter(function(x){ return x.total>=3 && x.bank>0; });
  if(!st.length) return null;
  st.sort(function(a,b){ return a.rate-b.rate; });
  return st[0];
}
function stuReading(){
  var st=rdStats(), weak=rdWeakest();
  var wrongN=(function(){
    var n=0;
    (mySessions()||[]).forEach(function(se){ (se.detail||[]).forEach(function(d){
      if(d.section==='reading' && !d.correct) n++; }); });
    return n;
  })();
  var html=head('독해 약점공략','유형별로 내 정답률을 확인하고 약한 유형만 집중해서 풉니다');
  html+='<div class="stats">'
    + card('독해 문제은행', rdBank('all').length+'문항', '4개 유형')
    + card('가장 약한 유형', weak?weak.key:'—', weak?('정답률 '+weak.rate+'%'):'세 문항 이상 풀면 표시됩니다', weak?'#ef4444':'#94a3b8')
    + card('독해 오답', wrongN+'문항', '다시 풀 수 있습니다', wrongN?'#d97706':'#94a3b8')
    + card('평균 정답률', (function(){
        var v=st.filter(function(x){return x.rate!=null;});
        return v.length? Math.round(v.reduce(function(a,b){return a+b.rate;},0)/v.length)+'%' : '—';
      })(), '독해 전체','#0891b2')
    + '</div>';

  if(weak){
    html+='<div class="cta"><div><b>지금은 「'+esc(weak.key)+'」 유형이 가장 약합니다 — 정답률 '+weak.rate+'%</b>'
      +'<p>'+esc(weak.tip)+'</p></div><button class="btn" data-rdgo="'+esc(weak.key)+'">이 유형 10문제 풀기 →</button></div>';
  }

  html+='<div class="panel"><h3>유형별 진단</h3><div class="rd-grid">'
    + st.map(function(x){
        var color = x.rate==null ? '#94a3b8' : x.rate>=80?'#059669' : x.rate>=60?'#d97706' : '#ef4444';
        return '<div class="rd-card">'
          + '<div class="rd-h"><b>'+esc(x.key)+'</b>'
            + '<span class="rd-rate" style="color:'+color+'">'+(x.rate==null?'미응시':x.rate+'%')+'</span></div>'
          + '<div class="mini"><div style="width:'+(x.rate==null?0:x.rate)+'%;background:'+color+'"></div></div>'
          + '<div class="rd-n">'+(x.total?('푼 문항 '+x.total+'개 · 맞힘 '+x.right+'개'):'아직 푼 문항이 없습니다')
            + ' · 문제은행 '+x.bank+'문항</div>'
          + '<div class="rd-tip"><b>전략</b> '+esc(x.tip)+'</div>'
          + '<div class="rd-tip"><b>단서</b> '+esc(x.clue)+'</div>'
          + '<div class="rd-tip"><b>푸는 법</b> '+esc(x.how)+'</div>'
          + '<div class="bar-actions"><button class="btn ghost rptmini" data-rdgo="'+esc(x.key)+'">이 유형만 풀기</button></div>'
          + '</div>';
      }).join('')
    + '</div></div>';

  html+='<div class="panel"><h3>맞춤 훈련</h3>'
    + '<div class="wg-opts">'
      + '<label>유형<select id="rdT"><option value="all"'+(RDT.t==='all'?' selected':'')+'>전체 유형</option>'
        + RD_TYPES.map(function(t){ return '<option value="'+esc(t.key)+'"'+(RDT.t===t.key?' selected':'')+'>'+esc(t.key)+'</option>'; }).join('')+'</select></label>'
      + '<label>난이도<select id="rdL">'
        + [['0','전체 단계'],['1','1단계'],['2','2단계'],['3','3단계']].map(function(x){ return '<option value="'+x[0]+'"'+(RDT.l===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></label>'
      + '<label>문항 수<select id="rdN">'
        + [5,10,15,20].map(function(n){ return '<option'+(RDT.n===n?' selected':'')+'>'+n+'</option>'; }).join('')+'</select></label>'
    + '</div>'
    + '<div class="bar-actions" style="margin-top:10px">'
      + '<button class="btn" id="rdStart">훈련 시작</button>'
      + '<button class="btn ghost" id="rdWrong">독해 오답만 다시 풀기</button>'
      + '<button class="btn ghost" onclick="go(\'s-center\')">테스트 센터로</button>'
    + '</div></div>';
  page(html);

  var g=function(id){ return document.getElementById(id); };
  $$('#page [data-rdgo]').forEach(function(b){ b.onclick=function(){ rdRun(b.dataset.rdgo, 0, 10); }; });
  ['rdT','rdL','rdN'].forEach(function(id){ var e=g(id); if(e) e.onchange=function(){
    RDT.t=g('rdT').value; RDT.l=g('rdL').value; RDT.n=+g('rdN').value||10; }; });
  if(g('rdStart')) g('rdStart').onclick=function(){
    RDT.t=g('rdT').value; RDT.l=g('rdL').value; RDT.n=+g('rdN').value||10;
    rdRun(RDT.t, +RDT.l||0, RDT.n); };
  if(g('rdWrong')) g('rdWrong').onclick=function(){
    var ids={}, qs=[];
    (mySessions()||[]).forEach(function(se){ (se.detail||[]).forEach(function(d){
      if(d.section==='reading' && !d.correct && !ids[d.id]){ ids[d.id]=1; var q=qById(d.id); if(q) qs.push(q); } }); });
    if(!qs.length){ toast('독해 오답이 없습니다. 잘하고 있어요.'); return; }
    rdGo(shuffle(qs).slice(0,20));
  };
}
function rdRun(typeKey, level, n){
  var bank = rdBank(typeKey==='all'?null:typeKey, level||0);
  if(!bank.length && level){ bank = rdBank(typeKey==='all'?null:typeKey, 0); }
  if(!bank.length){ toast('해당 유형의 문항이 없습니다'); return; }
  rdGo(shuffle(bank.slice()).slice(0, n||10));
}
function rdGo(qs){
  var q2 = (typeof varySet==='function') ? varySet(qs) : qs;
  window._afterQuiz=function(){ go('s-read'); };
  window._againQuiz=function(){ rdGo(qs); };
  startQuiz(q2, { mode:'section', section:'reading' });
}


/* ---------- 문맥 어휘 문항 자동 생성 ----------
   지문에 실제로 나온 단어 중 단어장에 있는 것을 골라
   "밑줄 친 낱말과 뜻이 가장 가까운 것" 문제를 만듭니다.
   정답과 오답 모두 검증된 단어장에서 가져오므로 뜻이 어긋나지 않습니다. */
var RD_VOCAB_CACHE = null;
function rdWordMap(){
  if(RD_VOCAB_CACHE) return RD_VOCAB_CACHE;
  var m = {};
  for(var i=0;i<WORDS.length;i++){
    var a = WORDS[i];
    if(!a[4]) continue;                     /* 동의어가 있는 단어만 */
    if(a[0].length < 6) continue;           /* 너무 쉬운 짧은 단어는 제외 */
    m[a[0]] = a;
  }
  RD_VOCAB_CACHE = m;
  return m;
}
/* 지문 하나에서 만들 수 있는 문맥 어휘 문제들 */
function rdVocabFrom(passage, level, tag){
  var map = rdWordMap(), out = [], used = {};
  var toks = String(passage||'').toLowerCase().match(/[a-z]{6,18}/g) || [];
  for(var i=0;i<toks.length;i++){
    var w = toks[i];
    var a = map[w];
    if(!a && w.length>3){
      /* 간단한 어미 되돌리기: -ed, -ing, -s, -ly */
      var stem = w.replace(/(ed|ing|es|s|ly)$/,'');
      a = map[stem] || map[stem+'e'];
      if(a) w = a[0];
    }
    if(!a || used[a[0]]) continue;
    used[a[0]] = 1;
    out.push(a);
    if(out.length >= 8) break;
  }
  return out.map(function(a, k){
    var pos = a[1], right = a[4];
    var pool = WORDS.filter(function(x){
      return x[4] && x[0]!==a[0] && x[4]!==right && (!pos || x[1]===pos);
    });
    if(pool.length < 3) pool = WORDS.filter(function(x){ return x[4] && x[4]!==right; });
    var wrong = shuffle(pool.slice()).slice(0,3).map(function(x){ return x[4]; });
    var opts = shuffle(wrong.concat([right]));
    return extraPut({
      id: 950000 + (rdHash(a[0]+String(level||1)) % 40000) + k,
      section:'reading', level: level || a[3] || 2, tag:'어휘',
      stem: '밑줄 친 <b>' + a[0] + '</b> 의 의미로 가장 가까운 것은?',
      passage: passage, options: opts, answer: opts.indexOf(right),
      explanation: a[0] + ' (' + (a[1]?wdPosName(a[1])+' ':'') + a[2] + ') 의 동의어는 ' + right + '.',
      src:'이룸편입 문맥어휘(자동)', autoVocab:true
    });
  });
}
function rdHash(s){
  var h=0; s=String(s);
  for(var i=0;i<s.length;i++){ h=(h*31 + s.charCodeAt(i))|0; }
  return Math.abs(h);
}
/* 문맥어휘 문제은행 — 모든 지문에서 만들어 냅니다 */
function rdVocabBank(level){
  var seen={}, out=[];
  QUESTIONS.forEach(function(q){
    if(q.section!=='reading' || !q.passage) return;
    if(seen[q.passage]) return;
    seen[q.passage]=1;
    if(level && q.level!==level) return;
    out = out.concat(rdVocabFrom(q.passage, q.level, q.tag));
  });
  return out;
}
