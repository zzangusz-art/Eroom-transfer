/* ===================== 학교별 빈출 =====================
   UNI_NAMES = [학교명…]
   UNI_META  = [[학교, 총문항, 제한시간, {영역:문항수}, 설명]…]
   UNI_Q     = [[id, 영역, 발문, [보기4], 정답, 해설, 세부유형, [학교인덱스…], 지문인덱스]…]
   지문은 기존 문제은행(QUESTIONS)의 지문을 번호로 가리킵니다. */

var UNI_READY = false;
var UNI_PSGS  = [];      /* 지문 목록 (기존 문제은행에서 뽑음) */

function uniInit(){
  if(UNI_READY) return;
  if(typeof QUESTIONS==='undefined' || typeof UNI_Q==='undefined') return;
  /* 기존 문제은행에서 지문을 등장 순서대로 모읍니다 */
  var seen = {};
  UNI_PSGS = [];
  QUESTIONS.forEach(function(q){
    if(q.passage && !seen[q.passage]){ seen[q.passage] = 1; UNI_PSGS.push(q.passage); }
  });
  /* 학교별 문항을 문제은행에 합칩니다 */
  var exist = {};
  QUESTIONS.forEach(function(q){ exist[q.id] = 1; });
  var added = 0;
  UNI_Q.forEach(function(a){
    if(exist[a[0]]) return;
    var q = {
      id:a[0], section:a[1], stem:a[2], options:a[3].slice(), answer:a[4],
      explanation:a[5], tag:a[6], level: uniLevelOf(a[7]),
      unis:a[7], src:'이룸편입 학교별 기출유형', vtype:'학교별'
    };
    if(a[8] >= 0 && UNI_PSGS[a[8]]) q.passage = UNI_PSGS[a[8]];
    QUESTIONS.push(q);
    added++;
  });
  /* 이미 문제은행에 있던 문항에는 출제 학교만 붙입니다 (독해 문항이 여기에 해당) */
  if(typeof UNI_TAG!=='undefined'){
    var byId = {};
    QUESTIONS.forEach(function(q){ byId[q.id] = q; });
    UNI_TAG.forEach(function(t){
      var q = byId[t[0]];
      if(!q) return;
      /* 여러 번 태그되면 학교를 합칩니다 */
      var cur = q.unis || [];
      t[1].forEach(function(u){ if(cur.indexOf(u)<0) cur.push(u); });
      q.unis = cur.sort(function(a,b){ return a-b; });
      if(!q.src || q.src.indexOf('학교별')<0) q.src = (q.src||'이룸편입 문제은행') + ' · 학교별 출제';
    });
  }
  UNI_READY = true;
  return added;
}
/* 여러 학교에 나온 문항일수록 빈출로 봅니다 */
function uniLevelOf(unis){
  var n = (unis||[]).length;
  return n >= 3 ? 3 : (n === 2 ? 2 : 2);
}
function uniName(i){ return (typeof UNI_NAMES!=='undefined' && UNI_NAMES[i]) || ''; }
function uniIndex(name){ return (typeof UNI_NAMES!=='undefined') ? UNI_NAMES.indexOf(name) : -1; }
function uniMetaOf(name){
  if(typeof UNI_META==='undefined') return null;
  for(var i=0;i<UNI_META.length;i++) if(UNI_META[i][0]===name){
    var m=UNI_META[i];
    return { uni:m[0], total:m[1], min:m[2], dist:m[3]||{}, label:m[4]||'',
             hard:m[5]||3, feature:m[6]||'', tip:m[7]||'', basis:m[8]||'추정' };
  }
  return null;
}
/* 그 학교 문항 전체 */
function uniBank(name, sec){
  uniInit();
  var ix = uniIndex(name);
  if(ix < 0) return [];
  return QUESTIONS.filter(function(q){
    if(!q.unis || q.unis.indexOf(ix) < 0) return false;
    if(sec && sec!=='all' && q.section !== sec) return false;
    return true;
  });
}
/* 여러 학교에 공통으로 나온 문항 = 공통 빈출 */
function uniCommon(minN, sec){
  uniInit();
  minN = minN || 2;
  return QUESTIONS.filter(function(q){
    if(!q.unis || q.unis.length < minN) return false;
    if(sec && sec!=='all' && q.section !== sec) return false;
    return true;
  }).sort(function(a,b){ return b.unis.length - a.unis.length; });
}
/* 학교 목록 + 문항 수 */
function uniList(){
  uniInit();
  if(typeof UNI_NAMES==='undefined') return [];
  return UNI_NAMES.map(function(n, i){
    var m = uniMetaOf(n) || {};
    var qs = QUESTIONS.filter(function(q){ return q.unis && q.unis.indexOf(i)>=0; });
    var bySec = {};
    qs.forEach(function(q){ bySec[q.section] = (bySec[q.section]||0)+1; });
    return { name:n, idx:i, total:m.total||0, min:m.min||60, dist:m.dist||{}, label:m.label||'',
             hard:m.hard||3, feature:m.feature||'', tip:m.tip||'', basis:m.basis||'추정',
             bank:qs.length, bySec:bySec };
  });
}
/* 내 목표 대학 */
function uniMyGoal(){
  var s = (typeof myStu==='function') ? myStu() : null;
  var g = s && s.goalSchool ? String(s.goalSchool).trim() : '';
  if(!g) return '';
  if(uniIndex(g) >= 0) return g;
  /* '연세대학교' 처럼 적혀 있어도 찾아냅니다 */
  for(var i=0;i<UNI_NAMES.length;i++){
    if(g.indexOf(UNI_NAMES[i]) === 0 || UNI_NAMES[i].indexOf(g) === 0) return UNI_NAMES[i];
  }
  return '';
}


function uniFire(n){ n=Math.max(1,Math.min(5,n||3)); var s=''; for(var i=0;i<n;i++) s+='●'; for(var j=n;j<5;j++) s+='○'; return s; }
function uniHardName(n){ return ['','아주 쉬움','쉬움','보통','어려움','매우 어려움'][Math.max(1,Math.min(5,n||3))]; }
function uniHardColor(n){ return ['','#94a3b8','#0891b2','#4f46e5','#d97706','#ef4444'][Math.max(1,Math.min(5,n||3))]; }

/* ===================== 화면 ===================== */
var UNI_SEL = '', UNI_SEC = 'all', UNI_N = 20;
function stuUni(){
  uniInit();
  if(!UNI_SEL) UNI_SEL = uniMyGoal() || (UNI_NAMES && UNI_NAMES[0]) || '';
  var list = uniList();
  var me = list.filter(function(x){ return x.name===UNI_SEL; })[0] || list[0];
  var goal = uniMyGoal();
  var common = uniCommon(2);

  var html = head('학교별 빈출', '목표 대학의 출제 경향에 맞춰, 교재 문항을 변형해 새 문제로 출제합니다');
  html += '<div class="stats">'
    + card('등록 대학', list.length + '개', '기출유형 실전문제집 기준')
    + card('학교별 문항', QUESTIONS.filter(function(q){ return q.unis; }).length + '문항', '어휘·문법·논리·독해')
    + card('공통 빈출', common.length + '문항', '두 개 이상 학교에 출제', common.length?'#b45309':'#94a3b8')
    + card('선택한 대학 난이도', (me?uniFire(me.hard):'-'), me?(uniHardName(me.hard)+(me.basis==='추정'?' · 추정':'')):'', me?uniHardColor(me.hard):'#94a3b8')
    + '</div>';

  /* 학교 고르기 */
  html += '<div class="panel"><h3>대학 선택</h3><div class="uni-grid">'
    + list.map(function(x){
        return '<button class="uni-chip'+(x.name===UNI_SEL?' on':'')+(x.name===goal?' goal':'')+'" data-uni="'+esc(x.name)+'">'
          + '<b>'+esc(x.name)+'</b><span>'+x.bank+'문항</span>'
          + (x.name===goal?'<i>목표</i>':'') + '</button>';
      }).join('')
    + '</div></div>';

  if(me){
    var d = me.dist || {};
    var secN = me.bySec || {};
    html += '<div class="panel"><h3>'+esc(me.name)+' 출제 경향</h3>'
      + '<div class="uni-info">'
        + '<div><span>총 문항</span><b>'+(me.total||'-')+'문항</b></div>'
        + '<div><span>제한 시간</span><b>'+(me.min||60)+'분</b></div>'
        + '<div><span>문항당</span><b>'+(me.total?Math.round(me.min*60/me.total)+'초':'-')+'</b></div>'
        + '<div><span>수록 문항</span><b>'+me.bank+'개</b></div>'
      + '</div>'
      + '<div class="uni-note">'
        + '<div class="uni-hard"><b>난이도</b> <span class="uni-fire">'+uniFire(me.hard)+'</span> '
          + '<span class="pill" style="--c:'+uniHardColor(me.hard)+'">'+uniHardName(me.hard)+'</span>'
          + '<span class="muted"> · '+(me.basis==='확인'?'편입 전문 자료로 확인':'대학 수준 기준 추정')+'</span></div>'
        + (me.feature?('<div><b>출제 특징</b> '+esc(me.feature)+'</div>'):'')
        + (me.tip?('<div><b>대비 전략</b> '+esc(me.tip)+'</div>'):'')
      + '</div>'
      + '<div class="uni-bars">'
        + ['어휘','문법','논리','독해'].map(function(k){
            var key = {'어휘':'vocab','문법':'grammar','논리':'logic','독해':'reading'}[k];
            var n = d[k]||0, pct0 = me.total? Math.round(n/me.total*100) : 0;
            var col = {'어휘':'#4f46e5','문법':'#0891b2','논리':'#d97706','독해':'#059669'}[k];
            return '<div class="uni-bar"><div class="uni-bl">'+k+' <b>'+n+'문항</b> <span class="muted">'+pct0+'%</span>'
              + ' <span class="muted">· 수록 '+(secN[key]||0)+'개</span></div>'
              + '<div class="mini"><div style="width:'+pct0+'%;background:'+col+'"></div></div></div>';
          }).join('')
      + '</div>'
      + '<div class="wg-opts" style="margin-top:12px">'
        + '<label>영역<select id="unSec"><option value="all">전 영역(실전과 같은 비율)</option>'
          + [['vocab','어휘'],['grammar','문법'],['logic','논리'],['reading','독해']].map(function(x){
              return '<option value="'+x[0]+'"'+(UNI_SEC===x[0]?' selected':'')+'>'+x[1]+' ('+(secN[x[0]]||0)+'문항)</option>'; }).join('')
          + '</select></label>'
        + '<label>문항 수<select id="unN">'+[10,20,30,40].map(function(n){
            return '<option value="'+n+'"'+(UNI_N===n?' selected':'')+'>'+n+'문항</option>'; }).join('')+'</select></label>'
      + '</div>'
      + '<div class="bar-actions" style="margin-top:10px">'
        + '<button class="btn" id="unStart">'+esc(me.name)+' 문항 풀기</button>'
        + '<button class="btn ghost" id="unFull">실전 모의 '+(me.total||40)+'문항 ('+(me.min||60)+'분)</button>'
        + '<button class="btn ghost" onclick="go(\'s-center\')">테스트 센터로</button>'
      + '</div>'
      + '<div class="muted" style="margin-top:8px">교재 문항을 그대로 내지 않습니다. 보기를 새로 뽑거나 묻는 방향을 바꿔 매번 다른 문제로 나옵니다.'
      + ' 난이도가 높은 학교일수록 정답과 헷갈리는 보기를 넣습니다.</div>'
      + '</div>';
  }

  /* 공통 빈출 */
  html += '<div class="panel"><h3>공통 빈출 <small class="muted">(여러 학교에 함께 나온 문항일수록 중요합니다)</small></h3>';
  if(!common.length){
    html += '<div class="muted">공통 출제 문항이 없습니다.</div>';
  } else {
    var by3 = uniCommon(3);
    html += '<div class="qt-w" style="margin-bottom:10px">'
      + '<button class="btn" id="unCom2">2개 학교 이상 ('+common.length+'문항) 풀기</button>'
      + (by3.length?('<button class="btn ghost" id="unCom3">3개 학교 이상 ('+by3.length+'문항) 풀기</button>'):'')
      + '</div>'
      + '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>영역</th><th>문항</th><th>출제 대학</th></tr></thead><tbody>'
      + common.slice(0,30).map(function(q){
          return '<tr><td><span class="badge sec-'+q.section+'">'+(SECTIONS[q.section]||q.section)+'</span></td>'
            + '<td class="tk-prev">'+esc(String(q.stem).replace(/<[^>]*>/g,'').slice(0,70))+'…</td>'
            + '<td><b>'+q.unis.length+'개교</b> <span class="muted">'+q.unis.map(uniName).join(', ')+'</span></td></tr>';
        }).join('')
      + '</tbody></table></div>'
      + (common.length>30?'<div class="muted" style="margin-top:8px">앞의 30문항만 표시했습니다.</div>':'');
  }
  html += '</div>';
  page(html);

  var g=function(id){ return document.getElementById(id); };
  $$('#page [data-uni]').forEach(function(b){ b.onclick=function(){ UNI_SEL=b.dataset.uni; stuUni(); }; });
  if(g('unSec')) g('unSec').onchange=function(){ UNI_SEC=g('unSec').value; };
  if(g('unN'))   g('unN').onchange=function(){ UNI_N=+g('unN').value; };
  if(g('unStart')) g('unStart').onclick=function(){
    var qs = uniBank(UNI_SEL, UNI_SEC==='all'?null:UNI_SEC);
    if(!qs.length){ toast('해당 영역의 문항이 없습니다'); return; }
    uniRun(shuffle(qs.slice()).slice(0, UNI_N), UNI_SEL, (uniMetaOf(UNI_SEL)||{}).hard);
  };
  if(g('unFull')) g('unFull').onclick=function(){ uniMock(UNI_SEL); };
  if(g('unCom2')) g('unCom2').onclick=function(){ uniRun(shuffle(uniCommon(2)).slice(0,30), '공통 빈출'); };
  if(g('unCom3')) g('unCom3').onclick=function(){ uniRun(shuffle(uniCommon(3)).slice(0,30), '공통 빈출'); };
}

/* 그 학교 영역 비율대로 실전 모의를 구성합니다 */
function uniMock(name){
  var m = uniMetaOf(name);
  if(!m){ toast('출제 정보를 찾을 수 없습니다'); return; }
  var map = {'어휘':'vocab','문법':'grammar','논리':'logic','독해':'reading'};
  var qs = [];
  Object.keys(m.dist||{}).forEach(function(k){
    var sec = map[k]; if(!sec) return;
    var want = m.dist[k]|0;
    var pool = uniBank(name, sec);
    if(pool.length < want) pool = QUESTIONS.filter(function(q){ return q.section===sec; });
    qs = qs.concat(shuffle(pool.slice()).slice(0, want));
  });
  if(!qs.length){ toast('출제할 문항이 없습니다'); return; }
  uniRun(qs, name + ' 실전 모의', m.hard);
}
function uniRun(qs, label, hard){
  if(!qs || !qs.length){ toast('출제할 문항이 없습니다'); return; }
  /* 교재 문항을 그대로 내지 않고 변형해서 출제합니다 */
  var q2 = uniVarySet(qs, hard || (uniMetaOf(UNI_SEL)||{}).hard || 3);
  q2 = (typeof varySet==='function') ? varySet(q2) : q2;
  window._afterQuiz = function(){ go('s-uni'); };
  window._againQuiz = function(){ uniRun(qs, label, hard); };
  startQuiz(q2, { mode:'school', section:'mix', uni: UNI_SEL });
}


/* ===================== 변형 출제 =====================
   교재 문항을 그대로 내지 않고, 보기·발문·출제 방향을 바꿔 새 문제로 만듭니다.
   난이도가 높은 학교일수록 정답과 헷갈리는 오답을 넣어 변별력을 올립니다. */
var UNI_VSEQ = 0;
var LINKERS = {
  '대조': ['However','Nevertheless','In contrast','On the contrary','Conversely','Yet','Nonetheless'],
  '부연': ['Moreover','In addition','Furthermore','Besides','What is more','Also'],
  '결과': ['Therefore','Thus','Consequently','As a result','Hence','Accordingly'],
  '인과': ['Because of this','Owing to this','For this reason','Since','As'],
  '예시': ['For example','For instance','To illustrate','Namely','Specifically'],
  '양보': ['Although','Even so','Granted','Admittedly','In spite of this'],
  '요약': ['In short','In sum','To summarize','All in all','In conclusion']
};
function uniAllLinkers(){
  var a=[]; Object.keys(LINKERS).forEach(function(k){ a=a.concat(LINKERS[k]); }); return a;
}
/* 단어장에서 오답 후보를 뽑습니다 — 난이도가 높을수록 정답과 가까운 뜻을 섞습니다 */
function uniDistractors(right, pos, n, hard){
  if(typeof WORDS==='undefined') return [];
  var rl = String(right||'').toLowerCase();
  var rw = null;
  for(var i=0;i<WORDS.length;i++) if(WORDS[i][0]===rl){ rw = WORDS[i]; break; }
  var lvWant = hard>=5 ? 3 : (hard>=4 ? 3 : (hard>=3 ? 2 : 1));
  var pool = WORDS.filter(function(x){
    if(x[0]===rl) return false;
    if(pos && x[1] && x[1]!==pos) return false;
    if(rw && x[2]===rw[2]) return false;          /* 뜻이 같으면 정답이 둘이 됩니다 */
    return true;
  });
  var tier = pool.filter(function(x){ return x[3]===lvWant; });
  if(tier.length >= n*3) pool = tier;
  /* 어려운 학교면 같은 첫 글자·비슷한 길이로 혼동을 줍니다 */
  if(hard>=4 && rl){
    var near = pool.filter(function(x){
      return x[0].charAt(0)===rl.charAt(0) || Math.abs(x[0].length-rl.length)<=1;
    });
    if(near.length >= n*2) pool = near;
  }
  return shuffle(pool.slice()).slice(0, n).map(function(x){ return x[0]; });
}
/* 어휘 문항 변형 */
function uniVaryVocab(q, hard){
  var right = q.options[q.answer];
  /* 표제어 찾기: 발문의 [단어] → 해설 첫머리 'word (v.) = 뜻' → 발문에서 단어장에 있는 단어 */
  var m = /\[([A-Za-z][A-Za-z\-]*)\]/.exec(q.stem);
  var head = m ? m[1] : '';
  if(!head){
    var hm = /^\s*([A-Za-z][A-Za-z\-]{2,17})\s*\((?:v|n|adj|adv)\.\)/.exec(q.explanation||'');
    if(hm) head = hm[1];
  }
  if(!head && typeof WORDS!=='undefined'){
    var toks = String(q.stem).toLowerCase().match(/[a-z]{5,18}/g) || [];
    for(var t=0;t<toks.length;t++){
      if(toks[t]===String(right).toLowerCase()) continue;
      for(var wi=0;wi<WORDS.length;wi++){
        if(WORDS[wi][0]===toks[t]){ head = toks[t]; break; }
      }
      if(head) break;
    }
  }
  var pm = /\(([a-z]+)\.\)/.exec(q.explanation||'');
  var pos = pm ? pm[1] : '';
  if(!pos && head && typeof WORDS!=='undefined'){
    for(var pi=0;pi<WORDS.length;pi++) if(WORDS[pi][0]===head){ pos = WORDS[pi][1]; break; }
  }
  var mode = UNI_VSEQ % 3;
  var opts, ans, stem, exp, kind;

  if(mode===0 && head){
    /* 방향 뒤집기: 정답 동의어를 표제어로, 원 표제어를 정답으로 */
    var d1 = uniDistractors(head, pos, 3, hard);
    if(d1.length < 3) return null;
    opts = shuffle(d1.concat([head]));
    ans = opts.indexOf(head);
    stem = '밑줄 친 [' + right + '] 와 의미가 가장 가까운 것은?';
    exp = right + ' 의 동의어는 ' + head + '. ' + (q.explanation||'');
    kind = '방향 전환';
  } else if(mode===1 && head){
    /* 빈칸형 전환 */
    var d2 = uniDistractors(right, pos, 3, hard);
    if(d2.length < 3) return null;
    opts = shuffle(d2.concat([right]));
    ans = opts.indexOf(right);
    stem = '[' + head + '] 을(를) 바꾸어 쓸 수 있는 말로 가장 알맞은 것은?';
    exp = head + ' 자리에 들어갈 동의어는 ' + right + '. ' + (q.explanation||'');
    kind = '빈칸 전환';
  } else {
    /* 오답만 새로 뽑기 (발문·정답 유지) */
    var d3 = uniDistractors(right, pos, 3, hard);
    if(d3.length < 3) return null;
    opts = shuffle(d3.concat([right]));
    ans = opts.indexOf(right);
    stem = q.stem;
    exp = (q.explanation||'') + ' (보기를 새로 구성한 변형 문항입니다.)';
    kind = '보기 교체';
  }
  return { stem:stem, options:opts, answer:ans, explanation:exp, kind:kind };
}
/* 논리(연결어) 문항 변형 — 오답 연결어를 다른 것으로 갈아끼웁니다 */
function uniVaryLogic(q, hard){
  var right = q.options[q.answer];
  var all = uniAllLinkers();
  var isLinker = all.some(function(x){ return x.toLowerCase()===String(right).toLowerCase(); });
  if(!isLinker) return null;
  /* 정답과 같은 계열은 오답으로 쓰면 안 됩니다 */
  var sameFamily = [];
  Object.keys(LINKERS).forEach(function(k){
    if(LINKERS[k].some(function(x){ return x.toLowerCase()===String(right).toLowerCase(); })) sameFamily = LINKERS[k];
  });
  var pool = all.filter(function(x){
    return !sameFamily.some(function(y){ return y.toLowerCase()===x.toLowerCase(); });
  });
  if(pool.length < 3) return null;
  var opts = shuffle(pool.slice()).slice(0,3).concat([right]);
  opts = shuffle(opts);
  return { stem:q.stem, options:opts, answer:opts.indexOf(right),
           explanation:(q.explanation||'') + ' (보기를 새로 구성한 변형 문항입니다.)', kind:'연결어 교체' };
}
/* 문항 하나를 변형합니다. 변형할 수 없으면 보기 순서만 바꿉니다. */
function uniVaryOne(q, hard){
  var v = null;
  try{
    if(q.section==='vocab' && !q.passage) v = uniVaryVocab(q, hard);
    else if(q.section==='logic') v = uniVaryLogic(q, hard);
  }catch(e){ v = null; }
  UNI_VSEQ++;
  if(!v){
    /* 문법·독해는 구조와 지문에 매여 있어 보기 순서만 바꿉니다 */
    var right0 = q.options[q.answer];
    var op = shuffle(q.options.slice());
    return extraPut({
      id: 700000 + (UNI_VSEQ % 90000),
      section:q.section, level:q.level||2, tag:q.tag, sub:q.sub,
      stem:q.stem, options:op, answer:op.indexOf(right0),
      explanation:q.explanation, passage:q.passage,
      src:(q.src||'')+' · 변형', unis:q.unis, varyKind:'보기 순서'
    });
  }
  return extraPut({
    id: 700000 + (UNI_VSEQ % 90000),
    section:q.section, level:q.level||2, tag:q.tag, sub:q.sub,
    stem:v.stem, options:v.options, answer:v.answer,
    explanation:v.explanation, passage:q.passage,
    src:(q.src||'')+' · 변형', unis:q.unis, varyKind:v.kind
  });
}
function uniVarySet(list, hard){
  return (list||[]).map(function(q){ return uniVaryOne(q, hard||3); });
}
