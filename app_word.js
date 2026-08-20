/* ===================== 데일리 단어 · 산성비 게임 =====================
   WORDS = [단어, 품사, 뜻, 레벨, 동의어, 예문]  (data_words.js)  */

var WD_DAILY = 50;                 /* 하루 학습 단어 수 */
var WD_TAB   = 'today';

/* ---------- 저장소 ---------- */
function wdStore(sid){
  DB.vocab = DB.vocab || {};
  sid = sid || (CURRENT && CURRENT.id);
  var v = DB.vocab[sid] = DB.vocab[sid] || {};
  v.known = v.known || {};     /* 외운 단어 {단어:날짜} */
  v.miss  = v.miss  || {};     /* 틀린 단어 {단어:{n:횟수, at:마지막날, ok:연속정답}} */
  v.games = v.games || [];     /* 게임 기록 */
  v.days  = v.days  || {};     /* 날짜별 진행 {날짜:{done:[단어]}} */
  v.best  = v.best  || 0;
  return v;
}
function wdWord(w){
  for(var i=0;i<WORDS.length;i++) if(WORDS[i][0]===w) return WORDS[i];
  return null;
}
function wdObj(a){
  if(!a) return null;
  return { w:a[0], pos:a[1], ko:a[2], lv:a[3], syn:a[4], ex:a[5] };
}
function wdPosName(p){
  return {v:'동사', n:'명사', adj:'형용사', adv:'부사'}[p] || '';
}

/* ---------- 오늘의 단어 고르기 ----------
   날짜를 기준으로 순서가 정해지므로 같은 날에는 늘 같은 목록이 나옵니다.
   여기에 그 학생이 틀렸던 단어를 앞쪽에 섞어 넣습니다. */
function wdDayIndex(ds){
  ds = ds || todayStr();
  var y=+ds.slice(0,4), m=+ds.slice(5,7), d=+ds.slice(8,10);
  return Math.floor(Date.UTC(y, m-1, d)/86400000);
}
function wdTodayList(ds, sid){
  ds = ds || todayStr();
  var v = wdStore(sid);
  var day = wdDayIndex(ds);
  var total = WORDS.length;
  var start = (day * WD_DAILY) % total;
  var base = [];
  for(var i=0;i<WD_DAILY;i++) base.push(WORDS[(start+i)%total]);

  /* 틀린 적 있는 단어를 최대 10개까지 앞에 넣고, 그만큼 뒤를 덜어냅니다 */
  var miss = wdMissList(sid).slice(0, 10);
  if(miss.length){
    var names = {};
    miss.forEach(function(x){ names[x.w]=1; });
    base = base.filter(function(a){ return !names[a[0]]; });
    var head = miss.map(function(x){ return wdWord(x.w); }).filter(Boolean);
    base = head.concat(base).slice(0, WD_DAILY);
  }
  return base.map(wdObj);
}
/* 틀린 단어 목록 — 많이 틀리고 최근일수록 앞 */
function wdMissList(sid){
  var v = wdStore(sid);
  return Object.keys(v.miss).map(function(w){
    var m=v.miss[w]||{};
    return { w:w, n:m.n||1, ok:m.ok||0, at:m.at||'' };
  }).filter(function(x){ return wdWord(x.w); })
    .sort(function(a,b){
      if(b.n!==a.n) return b.n-a.n;
      return (b.at||'').localeCompare(a.at||'');
    });
}
function wdMark(w, correct){
  var v = wdStore();
  if(correct){
    var m = v.miss[w];
    if(m){
      m.ok = (m.ok||0) + 1;
      m.at = todayStr();
      /* 세 번 연속 맞히면 복습 대상에서 졸업 */
      if(m.ok >= 3){ delete v.miss[w]; v.known[w] = todayStr(); }
    } else {
      v.known[w] = todayStr();
    }
  } else {
    var mm = v.miss[w] = v.miss[w] || { n:0, ok:0 };
    mm.n = (mm.n||0) + 1; mm.ok = 0; mm.at = todayStr();
    delete v.known[w];
  }
  v._u = Date.now();
}
function wdKnownToday(ds){
  var v=wdStore(); ds=ds||todayStr();
  return (v.days[ds] && v.days[ds].done) || [];
}
function wdToggleToday(w){
  var v=wdStore(), ds=todayStr();
  var d = v.days[ds] = v.days[ds] || { done:[] };
  var i = d.done.indexOf(w);
  if(i>=0){ d.done.splice(i,1); }
  else { d.done.push(w); v.known[w]=ds; }
  v._u = Date.now();
  save();
  return i<0;
}
/* 연속 학습일 */
function wdStreak(sid){
  var v=wdStore(sid), n=0, d=new Date();
  for(var i=0;i<400;i++){
    var ds=todayStr(d);
    var got=(v.days[ds]&&v.days[ds].done||[]).length;
    if(got>0) n++;
    else if(i>0) break;          /* 오늘은 아직 안 했을 수 있으므로 넘어갑니다 */
    d.setDate(d.getDate()-1);
  }
  return n;
}

/* ===================== 학생 화면 ===================== */
function stuWords(){
  var s = myStu(); if(!s) return;
  var v = wdStore(s.id);
  var list = wdTodayList(todayStr(), s.id);
  var done = wdKnownToday();
  var missN = Object.keys(v.miss).length;
  var knownN = Object.keys(v.known).length;

  var html = head('데일리 단어', '매일 ' + WD_DAILY + '개씩 외우고, 산성비 게임으로 다시 확인합니다');
  html += '<div class="stats">'
    + card('오늘 외운 단어', done.length + '/' + WD_DAILY, todayStr(), done.length>=WD_DAILY?'#059669':'#4f46e5')
    + card('누적 암기', knownN + '개', '전체 ' + WORDS.length + '개 중')
    + card('복습할 단어', missN + '개', '틀린 단어는 계속 나옵니다', missN?'#d97706':'#94a3b8')
    + card('연속 학습', wdStreak(s.id) + '일', '최고 점수 ' + (v.best||0) + '점', '#0891b2')
    + '</div>';
  html += '<div class="bar"><div class="tk-tabs">'
    + [['today','오늘의 단어'],['game','산성비 게임'],['miss','복습 단어 ('+missN+')'],['all','전체 단어장']]
        .map(function(x){ return '<button class="tk-tab'+(WD_TAB===x[0]?' on':'')+'" data-wd="'+x[0]+'">'+x[1]+'</button>'; }).join('')
    + '</div></div><div id="wdPane"></div>';
  page(html);
  $$('#page [data-wd]').forEach(function(b){ b.onclick=function(){ WD_TAB=b.dataset.wd; stuWords(); }; });
  wdPane(list);
}

function wdPane(list){
  var root = document.getElementById('wdPane'); if(!root) return;
  if(WD_TAB==='today') return wdPaneToday(root, list);
  if(WD_TAB==='game')  return wdPaneGame(root);
  if(WD_TAB==='miss')  return wdPaneMiss(root);
  if(WD_TAB==='all')   return wdPaneAll(root);
}

/* --- 오늘의 단어 --- */
var WD_HIDE = false;
var WD_MODE = 'view';        /* view = 보기 / type = 단어 가리고 받아쓰기 */
var WD_TRY  = {};            /* 받아쓰기 시도 횟수 {단어:횟수} */

/* 입력한 답과 정답을 비교합니다 (대소문자·공백·하이픈 무시) */
function wdNorm(t){ return String(t||'').toLowerCase().replace(/[\s\-']/g,''); }

function wdPaneToday(root, list){
  var done = wdKnownToday();
  var v = wdStore();
  var typing = (WD_MODE==='type');
  var left = list.filter(function(o){ return done.indexOf(o.w)<0; }).length;

  var h = '<div class="panel"><h3>오늘의 단어 <small class="muted">('+todayStr()+' · '+WD_DAILY+'개)</small></h3>'
    + '<div class="bar-actions" style="margin-bottom:10px">'
      + '<button class="btn'+(typing?'':' ghost')+'" id="wdType">'+(typing?'받아쓰기 끄기':'단어 가리고 받아쓰기')+'</button>'
      + (typing?'':'<button class="btn ghost" id="wdHide">'+(WD_HIDE?'뜻 보이기':'뜻 가리고 외우기')+'</button>')
      + '<button class="btn ghost" id="wdAllDone">전체 외움 표시</button>'
      + '<button class="btn ghost" id="wdGoGame">이 단어로 게임하기</button>'
    + '</div>'
    + (typing
        ? '<div class="note-box" style="margin-bottom:10px">뜻을 보고 <b>영어 단어를 입력한 뒤 Enter</b>를 누르세요. 맞히면 외움으로 넘어가고 다음 칸으로 이동합니다. 세 번 틀리면 정답을 보여줍니다. <b class="wd-left">남은 단어 '+left+'개</b></div>'
        : '')
    + '<div class="wd-grid">'
    + list.map(function(o, i){
        var on = done.indexOf(o.w)>=0;
        var wrong = v.miss[o.w];
        var head = (typing && !on)
          ? '<input class="wd-in" data-w="'+esc(o.w)+'" data-i="'+i+'" placeholder="영어 단어" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">'
          : '<b>'+esc(o.w)+'</b>';
        return '<div class="wd-card'+(on?' on':'')+(wrong?' miss':'')+(typing?' typing':'')+'" data-w="'+esc(o.w)+'">'
          + '<div class="wd-h">' + head
            + (o.pos?('<span class="wd-pos">'+esc(wdPosName(o.pos))+'</span>'):'')
            + (wrong?('<span class="wd-flag">틀림 '+wrong.n+'회</span>'):'')
            + '<span class="wd-ck">'+(on?'✓':'')+'</span></div>'
          + '<div class="wd-ko'+((WD_HIDE&&!typing)?' blur':'')+'">'+esc(o.ko)+'</div>'
          + (o.syn?('<div class="wd-syn">= '+esc(o.syn)+'</div>'):'')
          + (o.ex?('<div class="wd-ex">'+((typing&&!on)?esc(o.ex).replace(new RegExp(o.w,'ig'),'____'):esc(o.ex))+'</div>'):'')
          + '</div>';
      }).join('')
    + '</div></div>';
  root.innerHTML = h;

  var g=function(id){ return document.getElementById(id); };
  function bump(){
    var n = wdKnownToday().length;
    var st = document.querySelector('#page .stats .stat .stat-v');
    if(st) st.textContent = n + '/' + WD_DAILY;
    var lf = document.querySelector('#wdPane .wd-left');
    if(lf) lf.textContent = '남은 단어 ' + Math.max(0, WD_DAILY - n) + '개';
  }

  if(typing){
    /* --- 받아쓰기 --- */
    var ins = $$('#wdPane .wd-in');
    ins.forEach(function(inp){
      inp.onkeydown = function(e){
        if(e.key !== 'Enter') return;
        e.preventDefault();
        var w = inp.dataset.w;
        var card = inp.closest ? inp.closest('.wd-card') : null;
        if(wdNorm(inp.value) === wdNorm(w)){
          /* 맞음 → 외움으로 넘기고 단어를 드러냅니다 */
          if(wdKnownToday().indexOf(w) < 0) wdToggleToday(w);
          wdMark(w, true); save();
          delete WD_TRY[w];
          if(card){
            card.classList.add('on','just');
            var b = document.createElement('b'); b.textContent = w;
            inp.parentNode.replaceChild(b, inp);
            var ck = card.querySelector('.wd-ck'); if(ck) ck.textContent = '✓';
            var ex = card.querySelector('.wd-ex');
            if(ex){ var o2 = wdObj(wdWord(w)); if(o2 && o2.ex) ex.textContent = o2.ex; }
            setTimeout(function(){ card.classList.remove('just'); }, 700);
          }
          bump();
          /* 다음 빈칸으로 이동 */
          var rest = $$('#wdPane .wd-in');
          for(var k=0;k<rest.length;k++){ if(rest[k]!==inp){ rest[k].focus(); break; } }
          if(!rest.length || wdKnownToday().length>=WD_DAILY) toast('오늘 단어를 모두 외웠습니다. 잘하셨어요.');
        } else {
          /* 틀림 */
          var n = WD_TRY[w] = (WD_TRY[w]||0) + 1;
          inp.classList.add('bad');
          setTimeout(function(){ inp.classList.remove('bad'); }, 300);
          if(n === 1){
            inp.placeholder = '첫 글자: ' + w.charAt(0) + ' (' + w.length + '글자)';
            inp.value = '';
          } else if(n === 2){
            inp.placeholder = w.charAt(0) + w.charAt(1) + '…' + w.charAt(w.length-1) + ' (' + w.length + '글자)';
            inp.value = '';
          } else {
            /* 세 번 틀리면 정답을 알려주고 복습 목록에 넣습니다 */
            wdMark(w, false); save();
            inp.value = w;
            inp.classList.add('shown');
            inp.placeholder = '';
            if(card) card.classList.add('miss');
            toast(w + ' — ' + (wdObj(wdWord(w))||{}).ko);
            delete WD_TRY[w];
          }
        }
      };
      inp.onfocus = function(){ if(inp.classList.contains('shown')){ inp.classList.remove('shown'); inp.value=''; } };
    });
    if(ins.length) ins[0].focus();
  } else {
    /* --- 보기 모드: 카드를 눌러 외움 표시 --- */
    $$('#wdPane .wd-card').forEach(function(c){
      c.onclick = function(ev){
        if(ev){ ev.preventDefault(); ev.stopPropagation(); }
        var w = c.dataset.w;
        var on = wdToggleToday(w);
        c.classList.toggle('on', on);
        var ck = c.querySelector('.wd-ck'); if(ck) ck.textContent = on ? '✓' : '';
        bump();
      };
    });
  }

  if(g('wdType')) g('wdType').onclick=function(){
    WD_MODE = (WD_MODE==='type') ? 'view' : 'type';
    WD_TRY = {};
    wdPane(wdTodayList());
  };
  if(g('wdHide')) g('wdHide').onclick=function(){ WD_HIDE=!WD_HIDE; wdPane(wdTodayList()); };
  if(g('wdAllDone')) g('wdAllDone').onclick=function(){
    var v2=wdStore(), ds=todayStr(); var d=v2.days[ds]=v2.days[ds]||{done:[]};
    wdTodayList().forEach(function(o){ if(d.done.indexOf(o.w)<0){ d.done.push(o.w); v2.known[o.w]=ds; } });
    v2._u=Date.now(); save(); toast('오늘 단어를 모두 외움으로 표시했습니다'); stuWords();
  };
  if(g('wdGoGame')) g('wdGoGame').onclick=function(){ WD_TAB='game'; WG.pool='today'; stuWords(); };
}

/* --- 복습 단어 --- */
function wdPaneMiss(root){
  var list = wdMissList();
  if(!list.length){
    root.innerHTML='<div class="panel"><h3>복습 단어</h3><div class="muted">아직 틀린 단어가 없습니다. 산성비 게임에서 놓친 단어가 이곳에 모입니다.</div></div>';
    return;
  }
  root.innerHTML='<div class="panel"><h3>복습 단어 <small class="muted">(틀린 단어는 오늘의 단어와 게임에 계속 나옵니다)</small></h3>'
    +'<div class="note-box" style="margin-bottom:10px">게임에서 <b>세 번 연속</b> 맞히면 복습 목록에서 빠집니다.</div>'
    +'<div class="wd-grid">'
    + list.map(function(x){
        var o=wdObj(wdWord(x.w)); if(!o) return '';
        return '<div class="wd-card miss"><div class="wd-h"><b>'+esc(o.w)+'</b>'
          +(o.pos?('<span class="wd-pos">'+esc(wdPosName(o.pos))+'</span>'):'')
          +'<span class="wd-flag">틀림 '+x.n+'회'+(x.ok?(' · 연속 '+x.ok+'회 정답'):'')+'</span></div>'
          +'<div class="wd-ko">'+esc(o.ko)+'</div>'
          +(o.syn?('<div class="wd-syn">= '+esc(o.syn)+'</div>'):'')
          +(o.ex?('<div class="wd-ex">'+esc(o.ex)+'</div>'):'')+'</div>';
      }).join('')
    +'</div>'
    +'<div class="bar-actions" style="margin-top:12px"><button class="btn" id="wdMissGame">이 단어로 게임하기</button></div></div>';
  var b=document.getElementById('wdMissGame');
  if(b) b.onclick=function(){ WD_TAB='game'; WG.pool='miss'; stuWords(); };
}

/* --- 전체 단어장 --- */
var WD_ALL_LV = 0, WD_ALL_Q = '', WD_ALL_PAGE = 1, WD_PER = 100;
function wdPaneAll(root){
  var v=wdStore();
  var list = WORDS.map(wdObj).filter(function(o){
    if(WD_ALL_LV && o.lv!==WD_ALL_LV) return false;
    if(WD_ALL_Q){
      var q=WD_ALL_Q.toLowerCase();
      if(o.w.indexOf(q)<0 && o.ko.indexOf(WD_ALL_Q)<0 && String(o.syn||'').indexOf(q)<0) return false;
    }
    return true;
  });
  var pages = Math.max(1, Math.ceil(list.length / WD_PER));
  if(WD_ALL_PAGE > pages) WD_ALL_PAGE = pages;
  if(WD_ALL_PAGE < 1) WD_ALL_PAGE = 1;
  var from = (WD_ALL_PAGE-1)*WD_PER;
  var page1 = list.slice(from, from + WD_PER);

  root.innerHTML='<div class="panel"><h3>전체 단어장 <small class="muted">('+WORDS.length+'개 · 이룸편입 어휘 교재 + 편입 빈출 어휘)</small></h3>'
    +'<div class="bar-actions" style="margin-bottom:10px">'
      +'<select id="wdLv" class="cal-co">'+[[0,'전체 레벨'],[1,'1단계 · 기본'],[2,'2단계 · 중급'],[3,'3단계 · 고급']]
          .map(function(x){ return '<option value="'+x[0]+'"'+(WD_ALL_LV===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select>'
      +'<input id="wdQ" placeholder="단어 · 뜻 · 동의어 검색" value="'+esc(WD_ALL_Q)+'" style="max-width:220px">'
      +'<select id="wdPer" class="cal-co">'+[50,100,200,300].map(function(n){
          return '<option value="'+n+'"'+(WD_PER===n?' selected':'')+'>'+n+'개씩 보기</option>'; }).join('')+'</select>'
      +(WD_ALL_Q||WD_ALL_LV?'<button class="btn ghost rptmini" id="wdReset">필터 지우기</button>':'')
    +'</div>'
    +'<div class="muted wd-count" style="margin-bottom:8px">'
      + (list.length
          ? ('전체 '+list.length+'개 중 '+(from+1)+'~'+(from+page1.length)+'번째 · '+WD_ALL_PAGE+'/'+pages+'쪽')
          : '조건에 맞는 단어가 없습니다')
      + ' · 외운 단어 '+Object.keys(v.known).length+'개</div>'
    + wdPagerHtml(WD_ALL_PAGE, pages, 'top')
    +'<div class="wd-grid">'
    + page1.map(function(o){
        var on=!!v.known[o.w], wrong=v.miss[o.w];
        return '<div class="wd-card'+(on?' on':'')+(wrong?' miss':'')+'" data-aw="'+esc(o.w)+'"><div class="wd-h"><b>'+esc(o.w)+'</b>'
          +(o.pos?('<span class="wd-pos">'+esc(wdPosName(o.pos))+'</span>'):'')
          +'<span class="pill" style="--c:'+['#94a3b8','#0891b2','#4f46e5','#b45309'][o.lv]+'">'+o.lv+'단계</span>'
          +(wrong?('<span class="wd-flag">틀림 '+wrong.n+'회</span>'):'')
          +'<span class="wd-ck">'+(on?'✓':'')+'</span></div>'
          +'<div class="wd-ko">'+esc(o.ko)+'</div>'
          +(o.syn?('<div class="wd-syn">= '+esc(o.syn)+'</div>'):'')
          +(o.ex?('<div class="wd-ex">'+esc(o.ex)+'</div>'):'')+'</div>';
      }).join('')
    +'</div>'
    + wdPagerHtml(WD_ALL_PAGE, pages, 'bot')
    +'</div>';

  var g=function(id){ return document.getElementById(id); };
  function redraw(keepFocus){
    wdPane();
    if(keepFocus){ var q=document.getElementById('wdQ'); if(q){ q.focus(); q.setSelectionRange(q.value.length,q.value.length); } }
    else { var pn=document.querySelector('#wdPane .panel'); if(pn && pn.scrollIntoView) try{ pn.scrollIntoView({block:'start'}); }catch(e){} }
  }
  if(g('wdLv'))  g('wdLv').onchange=function(){ WD_ALL_LV=+g('wdLv').value; WD_ALL_PAGE=1; redraw(); };
  if(g('wdPer')) g('wdPer').onchange=function(){ WD_PER=+g('wdPer').value; WD_ALL_PAGE=1; redraw(); };
  if(g('wdReset')) g('wdReset').onclick=function(){ WD_ALL_Q=''; WD_ALL_LV=0; WD_ALL_PAGE=1; redraw(); };
  if(g('wdQ')) g('wdQ').oninput=function(){
    WD_ALL_Q=g('wdQ').value.trim(); WD_ALL_PAGE=1;
    clearTimeout(window.__wdq);
    window.__wdq=setTimeout(function(){ redraw(true); }, 300);
  };
  /* 쪽 이동 */
  $$('#wdPane [data-pg]').forEach(function(b){
    b.onclick=function(){
      var t=b.dataset.pg;
      if(t==='prev') WD_ALL_PAGE--;
      else if(t==='next') WD_ALL_PAGE++;
      else if(t==='first') WD_ALL_PAGE=1;
      else if(t==='last') WD_ALL_PAGE=pages;
      else WD_ALL_PAGE=+t;
      redraw();
    };
  });
  var jump=g('wdJump');
  if(jump) jump.onchange=function(){ WD_ALL_PAGE=+jump.value; redraw(); };
  /* 카드를 눌러 외움 표시 */
  $$('#wdPane .wd-card[data-aw]').forEach(function(c){
    c.onclick=function(){
      var w=c.dataset.aw, v2=wdStore();
      if(v2.known[w]) delete v2.known[w]; else v2.known[w]=todayStr();
      v2._u=Date.now(); save();
      var on=!!v2.known[w];
      c.classList.toggle('on', on);
      var ck=c.querySelector('.wd-ck'); if(ck) ck.textContent=on?'✓':'';
    };
  });
}
/* 쪽 넘김 버튼 — 앞뒤 두 쪽씩 보여주고 멀면 … 으로 줄입니다 */
function wdPagerHtml(cur, pages, where){
  if(pages<=1) return '';
  var nums=[], lo=Math.max(1,cur-2), hi=Math.min(pages,cur+2);
  if(lo>1){ nums.push(1); if(lo>2) nums.push('…'); }
  for(var i=lo;i<=hi;i++) nums.push(i);
  if(hi<pages){ if(hi<pages-1) nums.push('…'); nums.push(pages); }
  var h='<div class="wd-pager'+(where==='bot'?' bot':'')+'">'
    + '<button class="wd-pg" data-pg="first"'+(cur<=1?' disabled':'')+'>처음</button>'
    + '<button class="wd-pg" data-pg="prev"'+(cur<=1?' disabled':'')+'>← 이전</button>'
    + nums.map(function(n){
        if(n==='…') return '<span class="wd-dots">…</span>';
        return '<button class="wd-pg'+(n===cur?' on':'')+'" data-pg="'+n+'">'+n+'</button>';
      }).join('')
    + '<button class="wd-pg" data-pg="next"'+(cur>=pages?' disabled':'')+'>다음 →</button>'
    + '<button class="wd-pg" data-pg="last"'+(cur>=pages?' disabled':'')+'>끝</button>';
  if(where==='bot' && pages>8){
    h += '<select id="wdJump" class="wd-jump">'
      + Array.apply(null,{length:pages}).map(function(_,i){
          return '<option value="'+(i+1)+'"'+((i+1)===cur?' selected':'')+'>'+(i+1)+'쪽</option>'; }).join('')
      + '</select>';
  }
  return h+'</div>';
}

/* ===================== 산성비 게임 ===================== */
var WG = {
  on:false, raf:null, items:[], t0:0, last:0, spawnAt:0,
  score:0, combo:0, maxCombo:0, hit:0, miss:0, water:0, lives:5,
  level:'normal', pool:'today', mode:'ko',      /* mode: ko=뜻→영어, en=영어 그대로 */
  words:[], seq:0, paused:false, msgs:[]
};
/* fall = 1초에 내려오는 화면 높이 비율(%).
   화면을 두 배로 키웠기 때문에 같은 값이면 픽셀 속도가 두 배가 되어 훨씬 빨라 보입니다.
   그래서 값을 낮춰 눈에 보이는 속도를 이전과 비슷하게 맞췄습니다. */
var WG_LEVELS = {
  easy  : { name:'쉬움',   fall:8,  gap:2600, max:4,  life:5, label:'천천히 떨어집니다' },
  normal: { name:'보통',   fall:12, gap:1900, max:6,  life:5, label:'기본 속도' },
  hard  : { name:'어려움', fall:18, gap:1300, max:8,  life:4, label:'빠르고 많이' },
  hell  : { name:'지옥',   fall:26, gap:900,  max:11, life:3, label:'실수는 곧 끝' }
};
var WG_POOLS = [
  ['today','오늘의 50단어'],
  ['miss','최근 틀린 단어'],
  ['unknown','아직 못 외운 단어'],
  ['lv1','1단계 · 기본'],
  ['lv2','2단계 · 중급'],
  ['lv3','3단계 · 고급'],
  ['all','전체 단어']
];
/* 채우기 전 실제 개수 — 화면에 정확한 숫자를 보여주기 위함 */
function wgPoolCount(kind){
  var v=wdStore();
  if(kind==='today') return wdTodayList().length;
  if(kind==='miss') return wdMissList().length;
  if(kind==='unknown') return WORDS.filter(function(a){ return !v.known[a[0]]; }).length;
  if(kind==='lv1'||kind==='lv2'||kind==='lv3'){ var lv=+kind.slice(2); return WORDS.filter(function(a){ return a[3]===lv; }).length; }
  return WORDS.length;
}
function wgPool(kind){
  var v=wdStore(), out=[];
  if(kind==='today') out = wdTodayList().map(function(o){ return o.w; });
  else if(kind==='miss') out = wdMissList().map(function(x){ return x.w; });
  else if(kind==='unknown') out = WORDS.filter(function(a){ return !v.known[a[0]]; }).map(function(a){ return a[0]; });
  else if(kind==='lv1'||kind==='lv2'||kind==='lv3'){ var lv=+kind.slice(2); out = WORDS.filter(function(a){ return a[3]===lv; }).map(function(a){ return a[0]; }); }
  else out = WORDS.map(function(a){ return a[0]; });
  if(out.length < 8){                       /* 너무 적으면 오늘 단어로 채웁니다 */
    var add = wdTodayList().map(function(o){ return o.w; });
    add.forEach(function(w){ if(out.indexOf(w)<0) out.push(w); });
  }
  return out;
}
/* 틀린 단어가 더 자주 나오도록 가중치를 줍니다 */
function wgPick(){
  var v=wdStore(), pool=WG.words;
  if(!pool.length) return null;
  var bag=[];
  for(var i=0;i<pool.length;i++){
    var w=pool[i], m=v.miss[w];
    var weight = m ? Math.min(5, 1 + (m.n||1)) : 1;
    for(var k=0;k<weight;k++) bag.push(w);
  }
  /* 화면에 이미 떠 있는 단어는 피합니다 */
  for(var tries=0; tries<24; tries++){
    var pick = bag[Math.floor(Math.random()*bag.length)];
    if(!WG.items.some(function(it){ return it.w===pick; })) return pick;
  }
  return bag[Math.floor(Math.random()*bag.length)];
}

function wdPaneGame(root){
  var L=WG_LEVELS[WG.level], v=wdStore();
  root.innerHTML =
    '<div class="panel"><h3>산성비 <small class="muted">(떨어지는 단어를 입력해 없애세요)</small></h3>'
    + '<div class="wg-opts">'
      + '<label>난이도<select id="wgLv">'+Object.keys(WG_LEVELS).map(function(k){
          return '<option value="'+k+'"'+(WG.level===k?' selected':'')+'>'+WG_LEVELS[k].name+' — '+WG_LEVELS[k].label+'</option>'; }).join('')+'</select></label>'
      + '<label>출제 범위<select id="wgPool">'+WG_POOLS.map(function(x){
          var n=wgPoolCount(x[0]);
          var tail = (n===0) ? ' — 없음, 오늘 단어로 진행' : (n<8 ? ' ('+n+'개 + 오늘 단어)' : ' ('+n+'개)');
          return '<option value="'+x[0]+'"'+(WG.pool===x[0]?' selected':'')+'>'+x[1]+tail+'</option>'; }).join('')+'</select></label>'
      + '<label>방식<select id="wgMode">'
          + '<option value="ko"'+(WG.mode==='ko'?' selected':'')+'>뜻을 보고 영어 단어 입력 (어휘 암기)</option>'
          + '<option value="en"'+(WG.mode==='en'?' selected':'')+'>영어 단어를 그대로 입력 (타자 연습)</option>'
        + '</select></label>'
    + '</div>'
    + '<div class="wg-wrap">'
      + '<div class="wg-hud">'
        + '<span class="wg-s">점수 <b id="wgScore">0</b></span>'
        + '<span class="wg-s">콤보 <b id="wgCombo">0</b></span>'
        + '<span class="wg-s">맞힘 <b id="wgHit">0</b></span>'
        + '<span class="wg-s">놓침 <b id="wgMiss">0</b></span>'
        + '<span class="wg-lives" id="wgLives"></span>'
      + '</div>'
      + '<div class="wg-field" id="wgField">'
        + '<img class="wg-logo" src="'+LOGO_SRC+'" alt="">'
        + '<div class="wg-water" id="wgWater"></div>'
        + '<div class="wg-start" id="wgStart">'
          + '<div class="wg-title">산성비</div>'
          + '<p>단어가 바닥에 닿으면 산성비가 차오릅니다.<br>'+L.life+'번 놓치면 끝납니다.</p>'
          + '<button class="btn" id="wgGo">시작하기</button>'
          + '<div class="muted" style="margin-top:10px">최고 점수 '+(v.best||0)+'점</div>'
        + '</div>'
      + '</div>'
      + '<div class="wg-bar">'
        + '<input id="wgIn" placeholder="여기에 입력하고 Enter" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" disabled>'
        + '<button class="btn ghost" id="wgPause" disabled>일시정지</button>'
      + '</div>'
      + '<div class="wg-log" id="wgLog"></div>'
    + '</div></div>'
    + wgRecentHtml();

  var g=function(id){ return document.getElementById(id); };
  g('wgLv').onchange   = function(){ WG.level=g('wgLv').value; wgStop(); wdPane(); };
  g('wgPool').onchange = function(){ WG.pool=g('wgPool').value; wgStop(); wdPane(); };
  g('wgMode').onchange = function(){ WG.mode=g('wgMode').value; wgStop(); wdPane(); };
  g('wgGo').onclick    = function(){ wgStart(); };
  g('wgPause').onclick = function(){ wgTogglePause(); };
  g('wgIn').onkeydown  = function(e){
    if(e.key==='Enter'){ e.preventDefault(); wgSubmit(g('wgIn').value); g('wgIn').value=''; }
    else if(e.key==='Escape'){ g('wgIn').value=''; }
  };
  wgLives();
}
function wgRecentHtml(){
  var v=wdStore(), g=(v.games||[]).slice(0,8);
  if(!g.length) return '';
  return '<div class="panel"><h3>최근 기록</h3><div class="tbl-wrap"><table class="tbl">'
    +'<thead><tr><th>날짜</th><th>난이도</th><th>범위</th><th>점수</th><th>맞힘</th><th>놓침</th><th>최고 콤보</th></tr></thead><tbody>'
    + g.map(function(x){
        return '<tr><td>'+esc(x.at||'')+'</td><td>'+esc(x.lv||'')+'</td><td>'+esc(x.pool||'')+'</td>'
          +'<td><b>'+x.score+'</b></td><td>'+x.hit+'</td><td>'+x.miss+'</td><td>'+(x.combo||0)+'</td></tr>';
      }).join('')
    +'</tbody></table></div></div>';
}

function wgStart(){
  var L=WG_LEVELS[WG.level];
  WG.words = wgPool(WG.pool);
  if(!WG.words.length){ toast('출제할 단어가 없습니다'); return; }
  WG.on=true; WG.paused=false; WG.items=[]; WG.score=0; WG.combo=0; WG.maxCombo=0;
  WG.hit=0; WG.miss=0; WG.water=0; WG.lives=L.life; WG.seq=0;
  var st=document.getElementById('wgStart'); if(st) st.style.display='none';
  var f=document.getElementById('wgField');
  if(f) $$('#wgField .wg-item').forEach(function(n){ n.remove(); });
  var inp=document.getElementById('wgIn'); if(inp){ inp.disabled=false; inp.value=''; inp.focus(); }
  var pb=document.getElementById('wgPause'); if(pb){ pb.disabled=false; pb.textContent='일시정지'; }
  document.getElementById('wgLog').innerHTML='';
  wgHud(); wgLives(); wgWater();
  WG.t0=performance.now(); WG.last=WG.t0; WG.spawnAt=WG.t0+400;
  cancelAnimationFrame(WG.raf);
  WG.raf=requestAnimationFrame(wgLoop);
}
function wgStop(){
  WG.on=false; cancelAnimationFrame(WG.raf);
  var inp=document.getElementById('wgIn'); if(inp) inp.disabled=true;
  var pb=document.getElementById('wgPause'); if(pb) pb.disabled=true;
}
function wgTogglePause(){
  if(!WG.on) return;
  WG.paused=!WG.paused;
  var pb=document.getElementById('wgPause'); if(pb) pb.textContent = WG.paused?'이어하기':'일시정지';
  if(!WG.paused){ WG.last=performance.now(); WG.raf=requestAnimationFrame(wgLoop); }
  else { cancelAnimationFrame(WG.raf); }
}
function wgSpawn(){
  var L=WG_LEVELS[WG.level];
  if(WG.items.length >= L.max) return;
  var w = wgPick(); if(!w) return;
  var a = wdWord(w); if(!a) return;
  var o = wdObj(a);
  var f = document.getElementById('wgField'); if(!f) return;
  var label = (WG.mode==='ko') ? o.ko : o.w;
  var node = document.createElement('div');
  node.className='wg-item lv'+o.lv;
  node.innerHTML = '<span class="wg-txt">'+esc(label)+'</span>'
    + (WG.mode==='ko' && o.pos ? ('<span class="wg-p">'+esc(wdPosName(o.pos))+'</span>') : '');
  /* 이미 떠 있는 단어와 가로로 겹치지 않는 자리를 찾습니다 */
  var wpc = 50;
  for(var t=0;t<14;t++){
    var c = 7 + Math.random()*78;
    var clash = WG.items.some(function(it){ return Math.abs(it.x - c) < 13 && it.y < 22; });
    if(!clash){ wpc = c; break; }
    wpc = c;
  }
  node.style.left = wpc + '%';
  node.style.top = '-6%';
  f.appendChild(node);
  WG.items.push({ id:++WG.seq, w:o.w, ko:o.ko, y:-6, x:wpc, node:node, lv:o.lv });
}
function wgLoop(now){
  if(!WG.on || WG.paused) return;
  var L=WG_LEVELS[WG.level];
  var dt=Math.min(64, now-WG.last)/1000; WG.last=now;
  /* 시간이 지날수록 조금씩 빨라집니다 */
  var elapsed=(now-WG.t0)/1000;
  var speed = L.fall * (1 + Math.min(0.6, elapsed/120));
  var gap   = Math.max(500, L.gap * (1 - Math.min(0.45, elapsed/150)));

  if(now >= WG.spawnAt){ wgSpawn(); WG.spawnAt = now + gap; }

  for(var i=WG.items.length-1;i>=0;i--){
    var it=WG.items[i];
    it.y += speed*dt;
    if(it.y >= 92){ wgDrop(it, i); continue; }
    it.node.style.top = it.y + '%';
    if(it.y>74) it.node.classList.add('warn');
  }
  if(WG.on) WG.raf=requestAnimationFrame(wgLoop);
}
function wgDrop(it, idx){
  it.node.classList.add('splash');
  (function(n){ setTimeout(function(){ try{ n.remove(); }catch(e){} }, 260); })(it.node);
  WG.items.splice(idx,1);
  WG.miss++; WG.combo=0; WG.lives--;
  WG.water = Math.min(100, WG.water + Math.round(100/WG_LEVELS[WG.level].life));
  wdMark(it.w, false);
  wgLog('놓침', it.w + ' — ' + it.ko, false);
  wgHud(); wgLives(); wgWater();
  var f=document.getElementById('wgField'); if(f){ f.classList.add('shake'); setTimeout(function(){ f.classList.remove('shake'); }, 260); }
  if(WG.lives<=0) wgOver();
}
function wgSubmit(raw){
  if(!WG.on || WG.paused) return;
  var t=String(raw||'').trim().toLowerCase();
  if(!t) return;
  for(var i=0;i<WG.items.length;i++){
    if(WG.items[i].w === t){
      var it=WG.items[i];
      it.node.classList.add('pop');
      (function(n){ setTimeout(function(){ try{ n.remove(); }catch(e){} }, 220); })(it.node);
      WG.items.splice(i,1);
      WG.hit++; WG.combo++; WG.maxCombo=Math.max(WG.maxCombo, WG.combo);
      var base = 10 + it.lv*5;
      var bonus = Math.min(30, (WG.combo-1)*3);
      WG.score += base + bonus;
      wdMark(it.w, true);
      wgLog('정답', it.w + ' — ' + it.ko + (bonus?(' (+'+bonus+' 콤보)'):''), true);
      wgHud();
      return;
    }
  }
  /* 틀린 입력 — 콤보만 끊깁니다 */
  WG.combo=0; wgHud();
  var inp=document.getElementById('wgIn');
  if(inp){ inp.classList.add('bad'); setTimeout(function(){ inp.classList.remove('bad'); }, 220); }
}
function wgHud(){
  var g=function(id){ return document.getElementById(id); };
  if(g('wgScore')) g('wgScore').textContent=WG.score;
  if(g('wgCombo')) g('wgCombo').textContent=WG.combo;
  if(g('wgHit'))   g('wgHit').textContent=WG.hit;
  if(g('wgMiss'))  g('wgMiss').textContent=WG.miss;
}
function wgLives(){
  var e=document.getElementById('wgLives'); if(!e) return;
  var L=WG_LEVELS[WG.level], n=WG.on?WG.lives:L.life;
  var s='';
  for(var i=0;i<L.life;i++) s+='<i class="wg-life'+(i<n?' on':'')+'"></i>';
  e.innerHTML=s;
}
function wgWater(){
  var e=document.getElementById('wgWater'); if(!e) return;
  e.style.height = (WG.on?WG.water:0) + '%';
}
function wgLog(kind, text, ok){
  var e=document.getElementById('wgLog'); if(!e) return;
  var d=document.createElement('div');
  d.className='wg-l '+(ok?'ok':'no');
  d.textContent = kind + ' · ' + text;
  e.insertBefore(d, e.firstChild);
  while(e.childNodes.length>6) e.removeChild(e.lastChild);
}
function wgOver(){
  wgStop();
  var v=wdStore();
  var poolName=(WG_POOLS.find(function(x){return x[0]===WG.pool;})||['','전체'])[1];
  v.games.unshift({ at:todayStr()+' '+new Date().toTimeString().slice(0,5),
                    lv:WG_LEVELS[WG.level].name, pool:poolName,
                    score:WG.score, hit:WG.hit, miss:WG.miss, combo:WG.maxCombo });
  if(v.games.length>50) v.games.length=50;
  var isBest = WG.score > (v.best||0);
  if(isBest) v.best = WG.score;
  v._u=Date.now(); save();

  var missWords = wdMissList().slice(0,12);
  openModal(el('<div class="form"><h3>게임 종료</h3>'
    + '<div class="wg-result">'
      + '<div><span>점수</span><b>'+WG.score+'</b></div>'
      + '<div><span>맞힘</span><b>'+WG.hit+'</b></div>'
      + '<div><span>놓침</span><b>'+WG.miss+'</b></div>'
      + '<div><span>최고 콤보</span><b>'+WG.maxCombo+'</b></div>'
    + '</div>'
    + (isBest?'<div class="note-box" style="border-color:#bbf7d0;background:#f0fdf4;margin-top:10px"><b style="color:#059669">최고 기록을 새로 세웠습니다!</b></div>':'')
    + (missWords.length ? ('<div class="note-box" style="margin-top:10px"><b>복습할 단어</b><div class="wg-missw">'
        + missWords.map(function(x){ var o=wdObj(wdWord(x.w)); return o?('<span>'+esc(o.w)+' <i>'+esc(o.ko)+'</i></span>'):''; }).join('')
        + '</div><div class="muted" style="margin-top:6px">이 단어들은 오늘의 단어와 다음 게임에 계속 나옵니다.</div></div>') : '')
    + '<div class="modal-actions"><button class="btn ghost" id="wgo_m">복습 단어 보기</button><button class="btn" id="wgo_r">다시 하기</button><button class="btn ghost" id="wgo_x">닫기</button></div></div>'));
  var g=function(id){ return document.getElementById(id); };
  g('wgo_x').onclick=function(){ closeModal(); stuWords(); };
  g('wgo_r').onclick=function(){ closeModal(); WD_TAB='game'; stuWords(); setTimeout(wgStart, 120); };
  g('wgo_m').onclick=function(){ closeModal(); WD_TAB='miss'; stuWords(); };
}
/* 화면을 벗어나면 게임을 멈춥니다 */
function wgLeave(){ if(WG.on) wgStop(); }
