/* ===================== 사용자 지정 루틴 =====================
   기본 루틴(단어·주간·모의고사…) 외에, 관리자가 직접 만드는 루틴입니다.
   ① 시험 루틴 — 평가 관리에 이미 올려 둔 시험지를 정해진 요일·주기로 반복 출제
   ② 할 일 루틴 — 학생 홈의 요일별 체크리스트에 항목 추가
   둘 다 전체 / 기수별 / 학생별로 대상을 정할 수 있습니다. */

function rtCustom(){
  var r = routine();
  if(!Array.isArray(r.custom)) r.custom = [];
  return r.custom;
}
function rtFind(id){ return rtCustom().filter(function(x){ return x.id===id; })[0] || null; }
function rtScopeText(sc){
  sc = sc || {t:'all'};
  if(sc.t==='cohort'){
    var ns=(sc.ids||[]).map(function(id){ var c=(typeof VOD!=='undefined')?VOD.cohort(id):null; return c?c.name:id; });
    return ns.length? ('기수 '+ns.join(', ')) : '기수 미지정';
  }
  if(sc.t==='student'){
    var ss=(sc.ids||[]).map(function(id){ var s=(acf(DB.students)||[]).filter(function(x){return x.id===id;})[0]; return s?s.name:id; });
    return ss.length? ('학생 '+ss.slice(0,4).join(', ')+(ss.length>4?(' 외 '+(ss.length-4)+'명'):'')) : '학생 미지정';
  }
  return '전체 학생';
}
/* 이 학생에게 해당되는 루틴인가 */
function rtMatches(item, stu){
  var sc = item.scope || {t:'all'};
  if(sc.t==='all') return true;
  if(!stu) return false;
  if(sc.t==='cohort'){
    var cid = stu.cohortId || ((typeof VOD!=='undefined' && VOD.activeCohort()) ? VOD.activeCohort().id : '');
    return (sc.ids||[]).indexOf(cid) >= 0;
  }
  if(sc.t==='student') return (sc.ids||[]).indexOf(stu.id) >= 0;
  return false;
}
/* 이 기수 달력에 해당되는 루틴인가 (관리자 달력용) */
function rtMatchesCohort(item, cohortId){
  var sc = item.scope || {t:'all'};
  if(sc.t==='all') return true;
  if(sc.t==='cohort') return !cohortId ? true : (sc.ids||[]).indexOf(cohortId) >= 0;
  if(sc.t==='student'){
    if(!cohortId) return true;
    return (sc.ids||[]).some(function(sid){
      var s=(acf(DB.students)||[]).filter(function(x){return x.id===sid;})[0];
      return s && s.cohortId===cohortId;
    });
  }
  return false;
}
/* 날짜가 이 루틴의 편성일인가 */
function rtHits(item, ds, base){
  var sd = item.sched || {};
  var w = dowOf(ds);
  if(sd.mode==='dom'){                     /* 매월 N일 */
    return +ds.slice(8,10) === (+sd.dom || 1);
  }
  if(sd.mode==='interval'){                /* N주마다 지정 요일 */
    if(w !== (+sd.dow||5)) return false;
    var n = +sd.everyWeeks || 2;
    var wk = Math.floor((new Date(ds+'T00:00:00') - new Date((base||ds)+'T00:00:00')) / 604800000);
    return wk >= 0 && (wk % n) === 0;
  }
  return (sd.dows||[]).indexOf(w) >= 0;    /* 지정 요일마다 */
}
/* 사용자 지정 시험 루틴의 이번 달 일정 */
function rtCustomPlan(ym, cohortId){
  var base = routineBase(cohortId);
  var y=+ym.slice(0,4), m=+ym.slice(5,7), last=daysInMonth(y,m), out=[];
  rtCustom().forEach(function(it){
    if(it.kind!=='test' || it.on===false) return;
    if(!rtMatchesCohort(it, cohortId)) return;
    for(var d=1; d<=last; d++){
      var ds=ymd(y,m,d);
      if(ds < base) continue;
      if(typeof isHoliday==='function' && isHoliday(ds) && routine().skipHoliday) continue;
      if(rtHits(it, ds, base)) out.push({ date:ds, kind:'custom', custom:it, type:it.type||'quiz', title:it.title||'테스트' });
    }
  });
  return out;
}
/* 사용자 지정 시험 루틴 → 실제 평가 생성 */
function rtCustomApply(ym, cohortId){
  var plan = rtCustomPlan(ym, cohortId);
  DB.assessments = DB.assessments || [];
  var r = routine(), made=0, skip=0;
  plan.forEach(function(p){
    var it = p.custom;
    var key = 'rtc:' + it.id + ':' + (cohortId||'all') + ':' + p.date;
    if(acf(DB.assessments).some(function(a){ return a.routineKey===key; })){ skip++; return; }
    /* 등록해 둔 시험지를 고른 경우 그 내용을 그대로 복사해 반복 출제합니다 */
    var src = it.assessId ? (acf(DB.assessments)||[]).filter(function(a){ return a.id===it.assessId; })[0] : null;
    DB.assessments.push({
      id: uid('as2'), routineKey: key, auto:true,
      type: (src && src.type) || it.type || 'quiz',
      cohortId: cohortId || '',
      title: (it.title || (src && src.title) || '테스트') + ' (' + p.date.slice(5).replace('-','/') + ')',
      desc: '사용자 지정 루틴으로 편성된 평가입니다.',
      target: (it.scope && it.scope.t==='student') ? '지정 학생' : '전체',
      routineScope: it.scope || {t:'all'},
      maxScore: (src && src.maxScore) || 100,
      qCount: (src && src.qCount) || 10,
      timeLimit: (src && src.timeLimit) || 0,
      answerKey: (src && src.answerKey) || '',
      subjKey: (src && src.subjKey) || {},
      explains: (src && src.explains) || {},
      fileUrl: (src && src.fileUrl) || '',
      openDate: p.date, dueDate: addDays(r.dueDays||1, p.date),
      createdAt: todayStr()
    });
    made++;
  });
  if(made) save();
  return {made:made, skip:skip};
}
/* 학생별 할 일 루틴 (기본 + 사용자 지정) */
function rtDailyFor(stu){
  var base = dailyRoutine();
  var add = rtCustom().filter(function(it){
    return it.kind==='daily' && it.on!==false && rtMatches(it, stu);
  }).map(function(it){
    return { key:'c_'+it.id, title:it.title||'할 일', desc:it.desc||'', to:it.to||'', act:it.act||'',
             dows:(it.sched&&it.sched.dows)||[1,2,3,4,5], on:true, custom:true, auto:it.auto||'' };
  });
  return base.concat(add);
}

/* ===================== 관리 화면 ===================== */
function rtManager(onDone){
  function draw(){
    var list = rtCustom();
    var h = '<div class="form rtwrap"><h3>사용자 지정 루틴</h3>'
      + '<p class="muted" style="margin:2px 0 12px">등록해 둔 시험지를 반복 출제하거나, 학생 홈 체크리스트에 할 일을 추가합니다. 대상은 전체 · 기수 · 학생 중에서 고릅니다.</p>'
      + '<div class="bar-actions" style="margin-bottom:10px">'
        + '<button class="btn" id="rtcAddT">+ 시험 루틴</button>'
        + '<button class="btn ghost" id="rtcAddD">+ 할 일 루틴</button></div>';
    h += list.length
      ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>종류</th><th>이름</th><th>주기</th><th>대상</th><th>사용</th><th></th></tr></thead><tbody>'
        + list.map(function(it){
            var sd=it.sched||{};
            var cyc = sd.mode==='dom' ? ('매월 '+(sd.dom||1)+'일')
                    : sd.mode==='interval' ? ((sd.everyWeeks||2)+'주마다 '+DOW[sd.dow||5]+'요일')
                    : ((sd.dows||[]).map(function(d){return DOW[d];}).join('·')+'요일');
            return '<tr><td><span class="pill" style="--c:'+(it.kind==='test'?'var(--pri)':'var(--ok)')+'">'+(it.kind==='test'?'시험':'할 일')+'</span></td>'
              + '<td><b>'+esc(it.title||'')+'</b>'+(it.kind==='daily'?('<br><span class="muted" style="font-size:11px">'+(it.auto==='manual'?'선생님 확인':'자동 확인')+'</span>'):'')+'</td>'
              + '<td>'+esc(cyc)+'</td><td>'+esc(rtScopeText(it.scope))+'</td>'
              + '<td><input type="checkbox" class="rtc-on" data-i="'+it.id+'"'+(it.on===false?'':' checked')+'></td>'
              + '<td><button class="lnk" data-re="'+it.id+'">수정</button> <button class="lnk del" data-rd="'+it.id+'">삭제</button></td></tr>';
          }).join('')
        + '</tbody></table></div>'
      : '<div class="muted">아직 등록한 루틴이 없습니다.</div>';
    h += '<div class="modal-actions"><button class="btn" id="rtcClose">닫기</button></div></div>';
    modalSet(el(h));
    document.getElementById('rtcClose').onclick=function(){ closeModal(); if(onDone) onDone(); };
    document.getElementById('rtcAddT').onclick=function(){ rtEdit(null,'test',draw); };
    document.getElementById('rtcAddD').onclick=function(){ rtEdit(null,'daily',draw); };
    $$('#modal [data-re]').forEach(function(b){ b.onclick=function(){ rtEdit(rtFind(b.dataset.re), null, draw); }; });
    $$('#modal [data-rd]').forEach(function(b){ b.onclick=function(){
      if(!confirm('이 루틴을 삭제할까요?')) return;
      var r=routine(); r.custom=rtCustom().filter(function(x){ return x.id!==b.dataset.rd; });
      (DB._deletedIds=DB._deletedIds||[]).push(b.dataset.rd);
      save(); draw(); }; });
    $$('#modal .rtc-on').forEach(function(c){ c.onchange=function(){
      var it=rtFind(c.dataset.i); if(it){ it.on=c.checked; save(); } }; });
  }
  openModal(el('<div class="form"><h3>사용자 지정 루틴</h3><div class="muted">불러오는 중…</div></div>'));
  draw();
}

function rtEdit(item, kind, onDone){
  var isNew = !item;
  item = item || { id:uid('rtc'), kind:kind||'test', title:'', on:true,
                   scope:{t:'all', ids:[]}, sched:{mode:'dow', dows:[5], dom:1, everyWeeks:2, dow:5},
                   type:'quiz', assessId:'', desc:'', to:'s-center', act:'', auto:'' };
  var sc = item.scope||{t:'all'}, sd = item.sched||{mode:'dow',dows:[5]};
  var isTest = item.kind==='test';
  var cohorts = (typeof VOD!=='undefined') ? VOD.cohorts() : [];
  var studs = (acf(DB.students)||[]).filter(function(s){ return !s.testOnly; });
  var assess = (acf(DB.assessments)||[]).filter(function(a){ return !a.auto; })
                 .sort(function(a,b){ return (b.openDate||'').localeCompare(a.openDate||''); });

  var h = '<div class="form"><h3>'+(isNew?'루틴 추가':'루틴 수정')+' · '+(isTest?'시험':'할 일')+'</h3>'
    + '<label>이름 *<input id="rte_t" value="'+esc(item.title||'')+'" placeholder="'+(isTest?'예: 금요일 어휘 확인 테스트':'예: 오답노트 5문항 정리')+'"></label>';

  if(isTest){
    h += '<label>사용할 시험지 <small class="muted">(고르면 그 시험지가 반복 출제됩니다)</small>'
      + '<select id="rte_a"><option value="">새로 만들기 (빈 평가)</option>'
      + assess.map(function(a){ return '<option value="'+a.id+'"'+(item.assessId===a.id?' selected':'')+'>['+assessTypeName(a.type)+'] '+esc(a.title)+'</option>'; }).join('')
      + '</select></label>'
      + '<label>평가 유형<select id="rte_ty">'
      + ASSESS_TYPES.map(function(t){ return '<option value="'+t[0]+'"'+(item.type===t[0]?' selected':'')+'>'+t[1]+'</option>'; }).join('')
      + '</select></label>';
  } else {
    h += '<label>설명<input id="rte_d" value="'+esc(item.desc||'')+'" placeholder="학생 화면에 함께 보일 한 줄 안내"></label>'
      + '<label>완료 기준 <small class="muted">(자동으로 확인할 항목을 고르면 학생이 요청하지 않아도 됩니다)</small>'
      + '<select id="rte_au">'
      + [['','이름으로 자동 판단 (권장)'],['any','아무 학습이나 1회'],['anyTest','아무 테스트나 1회'],
         ['game','산성비 게임 1판'],['idiom','빈출 숙어 1회'],['reading','독해 1회'],
         ['wordAny','단어 조금이라도'],['word','단어 하루 분량 완료'],['sentence','과제 제출'],
         ['mixtest','종합 테스트 응시'],['vocabq','어휘 문제 풀기'],['school','학교별 테스트 응시'],
         ['adaptive','맞춤 추천 응시'],['retry','오답 다시 풀기'],['lecture','강의 수강'],
         ['manual','선생님이 확인 (수동)']]
        .map(function(x){ return '<option value="'+x[0]+'"'+((item.auto||'')===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')
      + '</select></label>'
      + '<label>누르면 갈 화면<select id="rte_to">'
      + [['','이동 없음'],['s-center','테스트 센터'],['s-word','데일리 단어'],['s-idiom','빈출 숙어'],['s-read','독해 약점공략'],
         ['s-uni','학교별 빈출'],['s-wrong','오답노트'],['s-vod','강의 수강'],['s-hw','과제·평가'],['s-growth','성장 리포트'],['s-adm','입시 정보']]
        .map(function(x){ return '<option value="'+x[0]+'"'+(item.to===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')
      + '</select></label>';
  }

  h += '<label>주기<select id="rte_m">'
    + [['dow','지정한 요일마다'],['interval','N주마다 한 번'],['dom','매월 지정한 날짜']].map(function(x){
        return '<option value="'+x[0]+'"'+(sd.mode===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')
    + '</select></label>'
    + '<div id="rte_dowBox"><label>요일<div class="lt-chips">'
      + [1,2,3,4,5,6,0].map(function(d){ return '<label class="lt-chk"><input type="checkbox" class="rted" value="'+d+'"'+((sd.dows||[]).indexOf(d)>=0?' checked':'')+'> '+DOW[d]+'</label>'; }).join('')
      + '</div></label></div>'
    + '<div id="rte_ivBox" class="frow"><label>몇 주마다<select id="rte_ev">'
      + [1,2,3,4].map(function(n){ return '<option value="'+n+'"'+((+sd.everyWeeks||2)===n?' selected':'')+'>'+n+'주</option>'; }).join('')
      + '</select></label><label>요일<select id="rte_dw">'
      + DOW.map(function(x,i){ return '<option value="'+i+'"'+((+sd.dow||5)===i?' selected':'')+'>'+x+'요일</option>'; }).join('')
      + '</select></label></div>'
    + '<div id="rte_domBox"><label>매월 며칠<input type="number" id="rte_dm" min="1" max="31" value="'+(sd.dom||1)+'"></label></div>';

  h += '<label>대상<select id="rte_s">'
    + [['all','전체 학생'],['cohort','특정 기수'],['student','특정 학생']].map(function(x){
        return '<option value="'+x[0]+'"'+(sc.t===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')
    + '</select></label>'
    + '<div id="rte_coBox"><div class="lt-chips">'
      + (cohorts.length? cohorts.map(function(c){ return '<label class="lt-chk"><input type="checkbox" class="rtco" value="'+c.id+'"'+((sc.ids||[]).indexOf(c.id)>=0?' checked':'')+'> '+esc(c.name)+'</label>'; }).join('')
                       : '<span class="muted">등록된 기수가 없습니다</span>')
      + '</div></div>'
    + '<div id="rte_stBox"><input id="rte_sq" placeholder="학생 이름 검색" style="margin-bottom:6px">'
      + '<div class="lt-chips rt-stu" id="rte_stList">'
      + studs.map(function(s){ return '<label class="lt-chk" data-nm="'+esc(s.name||'')+'"><input type="checkbox" class="rtst" value="'+s.id+'"'+((sc.ids||[]).indexOf(s.id)>=0?' checked':'')+'> '+esc(s.name)+'</label>'; }).join('')
      + '</div></div>'
    + '<div class="modal-actions"><button class="btn ghost" id="rte_c">취소</button><button class="btn" id="rte_ok">저장</button></div></div>';

  modalSet(el(h));
  function sync(){
    var m=document.getElementById('rte_m').value, s=document.getElementById('rte_s').value;
    document.getElementById('rte_dowBox').style.display = (m==='dow')?'':'none';
    document.getElementById('rte_ivBox').style.display  = (m==='interval')?'':'none';
    document.getElementById('rte_domBox').style.display = (m==='dom')?'':'none';
    document.getElementById('rte_coBox').style.display  = (s==='cohort')?'':'none';
    document.getElementById('rte_stBox').style.display  = (s==='student')?'':'none';
  }
  document.getElementById('rte_m').onchange=sync;
  document.getElementById('rte_s').onchange=sync;
  sync();
  var sq=document.getElementById('rte_sq');
  if(sq) sq.oninput=function(){ var q=this.value.trim();
    $$('#rte_stList .lt-chk').forEach(function(l){ l.style.display = (!q || (l.dataset.nm||'').indexOf(q)>=0) ? '' : 'none'; }); };
  document.getElementById('rte_c').onclick=function(){ if(onDone) onDone(); };
  document.getElementById('rte_ok').onclick=function(){
    var t=document.getElementById('rte_t').value.trim();
    if(!t){ alert('이름을 입력해 주세요'); return; }
    item.title=t;
    var m=document.getElementById('rte_m').value;
    item.sched={ mode:m,
      dows:$$('.rted').filter(function(x){return x.checked;}).map(function(x){return +x.value;}),
      everyWeeks:+document.getElementById('rte_ev').value||2,
      dow:+document.getElementById('rte_dw').value||5,
      dom:+document.getElementById('rte_dm').value||1 };
    if(m==='dow' && !item.sched.dows.length){ alert('요일을 하나 이상 선택해 주세요'); return; }
    var st=document.getElementById('rte_s').value;
    var ids = st==='cohort' ? $$('.rtco').filter(function(x){return x.checked;}).map(function(x){return x.value;})
            : st==='student' ? $$('.rtst').filter(function(x){return x.checked;}).map(function(x){return x.value;}) : [];
    if(st!=='all' && !ids.length){ alert('대상을 하나 이상 선택해 주세요'); return; }
    item.scope={ t:st, ids:ids };
    if(item.kind==='test'){
      item.assessId=document.getElementById('rte_a').value;
      item.type=document.getElementById('rte_ty').value;
    } else {
      item.desc=document.getElementById('rte_d').value;
      item.to=document.getElementById('rte_to').value;
      item.auto=document.getElementById('rte_au').value;
    }
    item._u=Date.now();
    var arr=rtCustom();
    if(!arr.some(function(x){ return x.id===item.id; })) arr.push(item);
    save();
    toast('루틴을 저장했습니다');
    if(onDone) onDone();
  };
}
