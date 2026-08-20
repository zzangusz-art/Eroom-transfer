/* ===================== 이룸편입 LMS · 학습 달력 & 루틴 편성 ===================== */
var DOW = ['일','월','화','수','목','금','토'];
function ymd(y,m,d){ return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'); }
function dowOf(ds){ return new Date(ds+'T00:00:00').getDay(); }
function monthOf(ds){ return ds.slice(0,7); }
function daysInMonth(y,m){ return new Date(y,m,0).getDate(); }
function addMonth(ym,n){ var y=+ym.slice(0,4), m=+ym.slice(5,7)+n;
  while(m>12){m-=12;y++;} while(m<1){m+=12;y--;} return y+'-'+String(m).padStart(2,'0'); }

/* 기본 루틴 규칙 */
function routine(){
  DB.routine = DB.routine || {
    on:true,
    wordDows:[1,2,3,4,5],      /* 단어테스트: 월~금 */
    weeklyDow:5,               /* 주간테스트: 금요일 */
    mockEvery:2,               /* 모의고사: 2주 1회 */
    mockDow:6,                 /* 토요일 */
    monthlyLastDow:5,          /* 월간테스트: 매월 마지막 금요일 */
    schoolMock:true,           /* 학교별 기출 모의고사(월 1회, 둘째 토) */
    skipHoliday:true,          /* 공휴일에는 테스트를 편성하지 않음 */
    shiftHoliday:true,         /* 공휴일이면 다음 평일로 이동 */
    dueDays:1                  /* 평가 마감 여유일 */
  };
  return DB.routine;
}
/* 기준일(기수 개강일) */
function routineBase(cohortId){
  var c = null;
  if(typeof VOD!=='undefined') c = cohortId ? VOD.cohort(cohortId) : VOD.activeCohort();
  return (c && c.startDate) ? c.startDate : todayStr().slice(0,8)+'01';
}
/* 특정 월의 루틴 일정 계산 (실제 평가 생성 전 미리보기 겸용) */
function routinePlan(ym, cohortId){
  var r = routine(); if(!r.on) return [];
  var base = routineBase(cohortId);
  var y=+ym.slice(0,4), m=+ym.slice(5,7), last=daysInMonth(y,m), out=[];
  var lastWeekly = null;
  for(var d=1; d<=last; d++){
    var ds = ymd(y,m,d), w = dowOf(ds);
    if(ds < base) continue;
    if((r.wordDows||[]).indexOf(w) >= 0) out.push({date:ds, kind:'word', type:'quiz', title:'단어 테스트'});
    if(w === r.weeklyDow){ out.push({date:ds, kind:'weekly', type:'weekly', title:'주간 테스트'}); lastWeekly = ds; }
    if(w === r.mockDow){
      var wk = Math.floor((new Date(ds+'T00:00:00') - new Date(base+'T00:00:00')) / 604800000);
      if(wk >= 0 && wk % (r.mockEvery||2) === 0) out.push({date:ds, kind:'mock', type:'mock', title:'정기 모의고사'});
    }
    if(r.schoolMock && w===6 && d>=8 && d<=14) out.push({date:ds, kind:'schoolmock', type:'schoolmock', title:'학교별 기출유형 모의고사'});
  }
  /* 월간테스트: 그 달 마지막 지정요일 */
  for(var d2=last; d2>=1; d2--){
    var ds2 = ymd(y,m,d2);
    if(dowOf(ds2) === r.monthlyLastDow){ if(ds2 >= base) out.push({date:ds2, kind:'monthly', type:'monthly', title:'월간 테스트'}); break; }
  }
  /* 공휴일 처리: 건너뛰거나 다음 평일로 이동 */
  if(r.skipHoliday && typeof isHoliday === 'function'){
    var moved = [];
    out = out.filter(function(p){
      if(!isHoliday(p.date)) return true;
      if(p.kind === 'word') return false;                 /* 단어테스트는 공휴일 제외 */
      if(!r.shiftHoliday) return false;
      /* 주간·월간 테스트는 평일로, 모의고사는 토요일도 허용 */
      var wkOnly = (p.kind === 'weekly' || p.kind === 'monthly');
      var n = addDays(1, p.date), g = 0;
      while(g++ < 12){
        var w2 = dowOf(n);
        var bad = isHoliday(n) || w2 === 0 || (wkOnly && w2 === 6);
        if(!bad) break;
        n = addDays(1, n);
      }
      if(monthOf(n) !== ym) return false;                 /* 달을 넘기면 생략 */
      moved.push(Object.assign({}, p, {date:n, moved:p.date}));
      return false;
    });
    out = out.concat(moved);
  }
  /* 사용자 지정 시험 루틴을 함께 편성합니다 */
  try{ if(typeof rtCustomPlan==='function') out = out.concat(rtCustomPlan(ym, cohortId)); }catch(e){}
  out.sort(function(a,b){ return a.date.localeCompare(b.date) || String(a.kind).localeCompare(String(b.kind)); });
  return out;
}

/* 루틴 → 실제 평가(acf(DB.assessments)) 자동 생성 */
function routineApply(ym, silent, cohortId){
  var plan = routinePlan(ym, cohortId), r = routine();
  var co = (cohortId && typeof VOD!=='undefined') ? VOD.cohort(cohortId) : null;
  DB.assessments = DB.assessments || [];
  var made = 0, skip = 0;
  plan.forEach(function(p){
    if(p.kind === 'word') return;                 /* 단어테스트는 테스트센터에서 즉시 응시 */
    if(p.kind === 'custom') return;               /* 사용자 지정은 rtCustomApply 에서 처리 */
    var key = 'rt:' + (cohortId||'all') + ':' + p.kind + ':' + p.date;
    if(acf(DB.assessments).some(function(a){ return a.routineKey === key; })){ skip++; return; }
    DB.assessments.push({
      id: uid('as2'), routineKey: key, type: p.type, cohortId: cohortId || '',
      title: p.title + ' (' + p.date.slice(5).replace('-','/') + ')' + (co ? (' · ' + co.name) : ''),
      movedFrom: p.moved || '',
      desc: '정기 루틴으로 자동 편성된 평가입니다.',
      target: '전체', maxScore: 100,
      qCount: ({weekly:20, monthly:30, mock:40, schoolmock:40, quiz:10}[p.kind] || 20),
      timeLimit: ({mock:60, schoolmock:60, monthly:40, weekly:25}[p.kind] || 0),
      answerKey: '', fileUrl: '',
      openDate: p.date, dueDate: addDays(r.dueDays || 1, p.date),
      auto: true, createdAt: todayStr()
    });
    made++;
  });
  try{ if(typeof rtCustomApply==='function'){ var c=rtCustomApply(ym, cohortId); made+=c.made; skip+=c.skip; } }catch(e){}
  if(made) save();
  if(!silent) toast(made ? (ym + ' 루틴 ' + made + '건 편성 완료' + (skip ? (' · 기존 ' + skip + '건 유지') : '')) : '이미 모두 편성되어 있습니다');
  return {made:made, skip:skip};
}
/* 루틴으로 만든 그 달 평가 되돌리기(미응시 건만) */
function routineClear(ym, cohortId){
  var before = (acf(DB.assessments)||[]).length;
  DB.assessments = (DB.assessments||[]).filter(function(a){
    if(!a.auto || !a.routineKey) return true;
    if(monthOf(a.openDate||'') !== ym) return true;
    if(cohortId && (a.cohortId||'') !== cohortId) return true;
    var sc = (DB.scores||{})[a.id] || {};
    if(Object.keys(sc).length) return true;       /* 응시 기록이 있으면 유지 */
    (DB._deletedIds = DB._deletedIds || []).push(a.id);
    return false;
  });
  save();
  toast((before - acf(DB.assessments).length) + '건을 되돌렸습니다');
}

/* ---------- 달력 이벤트 취합 ---------- */
function calEvents(ym, stu, cohortId){
  var y = +ym.slice(0,4), m = +ym.slice(5,7), last = daysInMonth(y,m);
  var from = ymd(y,m,1), to = ymd(y,m,last);
  var map = {}, seen = {};
  function put(ds, ev){
    if(ds < from || ds > to) return;
    var sig = ds + '|' + ev.k + '|' + (ev.t || '');
    if(seen[sig]) return;                 /* 같은 날 같은 항목 중복 표시 방지 */
    seen[sig] = 1;
    (map[ds] = map[ds] || []).push(ev);
  }

  /* 1) 강의(기수 Day 배정) */
  if(typeof VOD !== 'undefined'){
    var lecs;
    if(cohortId === '__all'){
      lecs = [];
      VOD.cohorts().forEach(function(c){ VOD.listByCohort(c.id).forEach(function(l){ lecs.push(l); }); });
    } else if(cohortId){
      lecs = VOD.listByCohort(cohortId);
    } else {
      lecs = VOD.list(stu || (typeof myStu === 'function' ? myStu() : null) || {});
    }
    lecs.forEach(function(l){
      var ttl = String(l.title || '').replace(/^이룸편입[\s·]*/, '').trim() || '강의';
      put(l.openDate, { k:'lec', t:'Day ' + (l.day||1) + ' · ' + ttl,
                        full:'Day ' + (l.day||1) + ' · ' + (l.title||''),
                        sub:(cohortId==='__all' && l.cohortName ? l.cohortName : ''),
                        id:l.id, cat:l.category||l.section });
    });
  }
  /* 2) 등록된 평가 */
  (acf(DB.assessments)||[]).forEach(function(a){
    if(cohortId && cohortId !== '__all' && a.cohortId && a.cohortId !== cohortId) return;
    if(!cohortId && stu && typeof assessVisible==='function' && !assessVisible(a, stu)) return;
    put(a.openDate || todayStr(), { k:'as', t:assessTypeName(a.type) + ' · ' + a.title, id:a.id, type:a.type });
    if(a.dueDate && a.dueDate !== a.openDate) put(a.dueDate, { k:'due', t:'마감 · ' + a.title, id:a.id, type:a.type });
  });
  /* 3) 루틴(아직 평가로 생성 전인 항목 · 단어테스트 포함) */
  routinePlan(ym).forEach(function(p){
    if(p.kind === 'word') return;          /* 단어 테스트는 데일리 루틴에서 표시 */
    var key = 'rt:' + (cohortId||'all') + ':' + p.kind + ':' + p.date;
    if(!(acf(DB.assessments)||[]).some(function(a){ return a.routineKey === key; })) put(p.date, { k:'plan', t:'[예정] ' + p.title, type:p.type });
  });
  /* 3-2) 요일별 데일리 루틴 */
  for(var dd=1; dd<=last; dd++){
    var dsx = ymd(y,m,dd);
    dailyFor(dsx).forEach(function(x){ put(dsx, { k:'daily', t:x.title, key:x.key, to:x.to, act:x.act }); });
  }
  /* 4) 공휴일 */
  if(typeof holidaysOf === 'function'){
    var HY = holidaysOf(y);
    Object.keys(HY).forEach(function(ds){ put(ds, { k:'hol', t:HY[ds].name }); });
  }
  /* 5) 이룸편입 공지·일정 */
  (acf(DB.calEvents)||[]).forEach(function(e){ put(e.date, { k:'note', t:e.title, id:e.id, color:e.color }); });
  (acf(DB.notices)||[]).forEach(function(n){ if(n.showOnCal && n.date) put(n.date, { k:'notice', t:'공지 · ' + n.title, id:n.id }); });
  return map;
}

/* ---------- 달력 화면 ---------- */
var CAL_YM = null, CAL_CO = null;
function calendarView(){
  var role = CURRENT.role;
  var stu = (role === 'student') ? myStu() : null;
  var manage = (role !== 'student');
  var cos = (typeof VOD!=='undefined') ? VOD.cohorts() : [];
  if(manage){
    if(CAL_CO === null){ var ac = (typeof VOD!=='undefined') ? VOD.activeCohort() : null; CAL_CO = ac ? ac.id : '__all'; }
    if(CAL_CO !== '__all' && !cos.some(function(c){return c.id===CAL_CO;})) CAL_CO = cos.length ? cos[0].id : '__all';
  } else CAL_CO = null;
  var curCo = (manage && CAL_CO !== '__all') ? ((typeof VOD!=='undefined') ? VOD.cohort(CAL_CO) : null) : null;
  CAL_YM = CAL_YM || monthOf(todayStr());
  var y = +CAL_YM.slice(0,4), m = +CAL_YM.slice(5,7);
  var first = dowOf(ymd(y,m,1)), last = daysInMonth(y,m);
  var map = calEvents(CAL_YM, stu, CAL_CO);
  var today = todayStr();

  var html = head('학습 달력', role === 'student'
    ? '이번 달 강의와 테스트 일정입니다. 날짜를 누르면 그날 할 일을 볼 수 있습니다.'
    : '기수를 선택해 개강일 기준 데일리 강의와 정기 테스트 루틴을 편성·관리합니다');

  html += '<div class="cal-bar">'
    + '<div class="cal-nav"><button class="btn ghost rptmini" id="calPrev">‹ 이전</button>'
    + '<b class="cal-title">' + y + '년 ' + m + '월</b>'
    + '<button class="btn ghost rptmini" id="calNext">다음 ›</button>'
    + '<button class="btn ghost rptmini" id="calToday">오늘</button></div>';
  if(manage){
    html += '<div class="bar-actions">'
      + '<select id="calCo" class="cal-co">'
        + '<option value="__all"' + (CAL_CO==='__all'?' selected':'') + '>전체 기수</option>'
        + cos.map(function(c){ return '<option value="' + c.id + '"' + (CAL_CO===c.id?' selected':'') + '>' + esc(c.name) + '</option>'; }).join('')
      + '</select>'
      + '<button class="btn ghost" id="calRule">루틴 설정</button>'
      + '<button class="btn ghost" id="calAdd">일정 추가</button>'
      + '<button class="btn" id="calApply">이 달 루틴 편성</button></div>';
  }
  html += '</div>';

  if(manage){
    var r = routine();
    var nStu = acf(DB.students).filter(function(x){ return CAL_CO==='__all' ? !!x.cohortId : x.cohortId===CAL_CO; }).length;
    html += '<div class="cal-rule">'
      + '<span class="cal-co-tag">' + (curCo ? (esc(curCo.name) + ' <b>개강 ' + esc(curCo.startDate||'-') + '</b>') : '<b>전체 기수 보기</b>') + '</span>'
      + '<span>수강생 <b>' + nStu + '명</b></span>'
      + '<span>단어 테스트 <b>' + (r.wordDows||[]).map(function(d){return DOW[d];}).join('·') + '</b></span>'
      + '<span>주간 테스트 <b>매주 ' + DOW[r.weeklyDow] + '</b></span>'
      + '<span>모의고사 <b>' + r.mockEvery + '주 1회 ' + DOW[r.mockDow] + '</b></span>'
      + '<span>월간 테스트 <b>매월 마지막 ' + DOW[r.monthlyLastDow] + '</b></span>'
      + (r.schoolMock ? '<span>학교별 기출 <b>매월 둘째 토</b></span>' : '')
      + '<span>공휴일 <b>' + (r.skipHoliday ? (r.shiftHoliday ? '다음 평일로 이동' : '편성 제외') : '무시') + '</b></span>'
      + '</div>';
  }

  var cells = '';
  for(var i=0;i<first;i++) cells += '<div class="cal-c cal-off"></div>';
  for(var d=1; d<=last; d++){
    var ds = ymd(y,m,d), evs = map[ds] || [], w = dowOf(ds);
    var hol = (typeof isHoliday === 'function') ? isHoliday(ds) : null;
    var cls = 'cal-c' + (ds === today ? ' cal-today' : '') + (hol ? ' cal-hol' : (w===0 ? ' cal-sun' : (w===6 ? ' cal-sat' : '')));
    evs = evs.filter(function(e){ return e.k !== 'hol'; });
    /* 왼쪽 = 강의·복습 / 오른쪽 = 테스트·평가 */
    var LEFT  = evs.filter(function(e){ return e.k==='lec' || (e.k==='daily' && /강의|복습|과제|점검/.test(e.t)); });
    var RIGHT = evs.filter(function(e){ return e.k==='as' || e.k==='due' || e.k==='plan' || e.k==='word'
                                             || (e.k==='daily' && /테스트|퀴즈|문제|모의/.test(e.t)); });
    var REST  = evs.filter(function(e){ return LEFT.indexOf(e)<0 && RIGHT.indexOf(e)<0; });
    function chip(e){
      var full = e.full || e.t;
      return '<span class="cal-e ce-' + e.k + '" title="' + esc(full) + '">' + esc(e.t)
           + (e.sub ? '<i class="cal-sub">' + esc(e.sub) + '</i>' : '') + '</span>';
    }
    function col(list, cname, label){
      return '<div class="cal-col ' + cname + '">'
        + '<div class="cal-coll">' + label + '</div>'
        + (list.length
            ? list.slice(0,3).map(chip).join('')
              + (list.length>3 ? '<button class="cal-more" data-more="' + ds + '">외 ' + (list.length-3) + '건 더보기</button>' : '')
            : '<span class="cal-none">없음</span>')
        + '</div>';
    }
    cells += '<div class="' + cls + '" data-day="' + ds + '">'
      + '<div class="cal-d">' + d + (ds===today ? '<span class="cal-tbadge">오늘</span>' : '')
      + (hol ? '<span class="cal-holname">' + esc(hol.name) + '</span>' : '') + '</div>'
      + (hol ? '<div class="cal-evs"><span class="cal-none">휴일</span></div>'
             : '<div class="cal-split">' + col(LEFT,'cal-l','강의') + col(RIGHT,'cal-r','테스트') + '</div>')
      + (REST.length ? '<div class="cal-rest">' + REST.slice(0,2).map(chip).join('')
            + (REST.length>2 ? '<button class="cal-more" data-more="' + ds + '">외 ' + (REST.length-2) + '건 더보기</button>' : '') + '</div>' : '')
      + '</div>';
  }
  html += '<div class="cal-wrap"><div class="cal-head">' + DOW.map(function(x,i){
      return '<div class="' + (i===0?'sun':(i===6?'sat':'')) + '">' + x + '</div>'; }).join('') + '</div>'
    + '<div class="cal-grid">' + cells + '</div></div>';

  html += '<div class="cal-legend"><b>왼쪽 칸</b>'
    + '<span class="cal-e ce-lec">강의 · 복습</span><span class="cal-e ce-daily">데일리 루틴</span>'
    + '<b>오른쪽 칸</b><span class="cal-e ce-as">평가 · 테스트</span><span class="cal-e ce-word">단어 테스트</span>'
    + '<span class="cal-e ce-due">마감</span><span class="cal-e ce-plan">편성 예정</span>'
    + '<b>기타</b><span class="cal-e ce-note">이룸편입 일정</span><span class="cal-e ce-hol">공휴일</span></div>';

  page(html);
  $('#calPrev').onclick = function(){ CAL_YM = addMonth(CAL_YM,-1); calendarView(); };
  $('#calNext').onclick = function(){ CAL_YM = addMonth(CAL_YM, 1); calendarView(); };
  $('#calToday').onclick = function(){ CAL_YM = monthOf(todayStr()); calendarView(); };
  if($('#calCo')) $('#calCo').onchange = function(){ CAL_CO = $('#calCo').value; calendarView(); };
  if($('#calApply')) $('#calApply').onclick = function(){
    if(CAL_CO === '__all'){ toast('편성할 기수를 먼저 선택해 주세요'); return; }
    var cn = (typeof VOD!=='undefined' && VOD.cohort(CAL_CO)) ? VOD.cohort(CAL_CO).name : '';
    if(!confirm(cn + ' · ' + CAL_YM + ' 루틴을 편성할까요? (이미 만들어진 평가는 그대로 유지됩니다)')) return;
    routineApply(CAL_YM, false, CAL_CO); calendarView();
  };
  if($('#calRule')) $('#calRule').onclick = function(){ routineForm(function(){ calendarView(); }); };
  if($('#calAdd')) $('#calAdd').onclick = function(){ calEventForm(null, function(){ calendarView(); }); };
  $$('#page .cal-c[data-day]').forEach(function(c){ c.onclick = function(){ calDay(c.dataset.day); }; });
  $$('#page [data-more]').forEach(function(b){ b.onclick = function(ev){ ev.stopPropagation(); calDay(b.dataset.more); }; });
}

/* 날짜 상세 (그날 할 일) */
function calDay(ds){
  var role = CURRENT.role, stu = (role==='student') ? myStu() : null;
  var evs = (calEvents(monthOf(ds), stu, (role==='student'?null:CAL_CO))[ds]) || [];
  var lecs = evs.filter(function(e){return e.k==='lec';});
  var ass  = evs.filter(function(e){return e.k==='as';});
  var dues = evs.filter(function(e){return e.k==='due';});
  var dly  = evs.filter(function(e){return e.k==='daily';});
  var etc  = evs.filter(function(e){return ['word','plan','note','notice'].indexOf(e.k)>=0;});
  var hol = (typeof isHoliday === 'function') ? isHoliday(ds) : null;
  var h = '<div class="form caldetail"><h3>' + ds + ' (' + DOW[dowOf(ds)] + ')'
        + (hol ? ' <span class="pill" style="--c:#ef4444">' + esc(hol.name) + '</span>' : '') + '</h3>';
  evs = evs.filter(function(e){ return e.k !== 'hol'; });
  if(!evs.length) h += '<p class="muted">' + (hol ? '공휴일입니다. 등록된 일정이 없습니다.' : '등록된 일정이 없습니다.') + '</p>';
  if(dly.length){
    h += '<div class="cd-sec"><h4>오늘의 루틴</h4>' + dly.map(function(e){
      var to = e.to || (/테스트|퀴즈|문제|모의/.test(e.t) ? 's-center' : 's-vod');
      return '<div class="cd-row cd-go" data-cdgo="' + to + '" data-cdact="' + (e.act||'') + '">'
        + '<span class="cal-e ce-daily">루틴</span><b>' + esc(e.t) + '</b>'
        + '<button class="btn rptmini">바로가기</button></div>'; }).join('') + '</div>';
  }
  if(lecs.length){
    h += '<div class="cd-sec"><h4>수강할 강의</h4>' + lecs.map(function(e){
      return '<div class="cd-row' + (role==='student'?' cd-go':'') + '" ' + (role==='student'?('data-cdlec="' + e.id + '"'):'') + '>'
        + '<span class="cal-e ce-lec">강의</span><b>' + esc(e.full || e.t) + '</b>'
        + (role==='student' ? '<button class="btn rptmini">시청</button>' : '<button class="btn ghost rptmini" data-cdvod="1">강의 관리</button>') + '</div>'; }).join('') + '</div>';
  }
  if(ass.length){
    h += '<div class="cd-sec"><h4>응시할 평가</h4>' + ass.map(function(e){
      return '<div class="cd-row' + (role==='student'?' cd-go':'') + '" ' + (role==='student'?('data-cdas="' + e.id + '"'):'') + '>'
        + '<span class="cal-e ce-as">평가</span><b>' + esc(e.t) + '</b>'
        + (role==='student' ? '<button class="btn rptmini">응시</button>' : '<button class="btn ghost rptmini" data-cdassm="1">평가 관리</button>') + '</div>'; }).join('') + '</div>';
  }
  if(dues.length) h += '<div class="cd-sec"><h4>마감</h4>' + dues.map(function(e){
      return '<div class="cd-row' + (role==='student'?' cd-go':'') + '" ' + (role==='student'&&e.id?('data-cdas="' + e.id + '"'):'') + '>'
        + '<span class="cal-e ce-due">마감</span><b>' + esc(e.t) + '</b>'
        + (role==='student'&&e.id?'<button class="btn rptmini">응시</button>':'') + '</div>'; }).join('') + '</div>';
  if(etc.length)  h += '<div class="cd-sec"><h4>기타</h4>' + etc.map(function(e){
      var go2 = e.k==='word' ? 's-center' : (e.k==='notice' ? 's-board' : '');
      return '<div class="cd-row' + (go2?' cd-go':'') + '" ' + (go2?('data-cdgo="'+go2+'" data-cdact="'+(e.k==='word'?'daily':'')+'"'):'') + '>'
        + '<span class="cal-e ce-' + e.k + '">' + (e.k==='word'?'단어':(e.k==='plan'?'예정':'일정')) + '</span><b>' + esc(e.t) + '</b>'
        + (go2?'<button class="btn ghost rptmini">바로가기</button>':'') + '</div>'; }).join('') + '</div>';
  h += '<div class="modal-actions">' + (role!=='student' ? '<button class="btn ghost" id="cdAdd">이 날 일정 추가</button>' : '') + '<button class="btn" id="cdX">닫기</button></div></div>';
  openModal(el(h));
  document.getElementById('cdX').onclick = closeModal;
  if(document.getElementById('cdAdd')) document.getElementById('cdAdd').onclick = function(){ closeModal(); calEventForm({date:ds}, function(){ calendarView(); }); };
  $$('#modal [data-cdlec]').forEach(function(b){ b.onclick = function(){ closeModal(); vodPlayer(b.dataset.cdlec); }; });
  $$('#modal [data-cdas]').forEach(function(b){ b.onclick = function(){ closeModal(); assessTake(b.dataset.cdas); }; });
  $$('#modal [data-cdgo]').forEach(function(b){ b.onclick = function(){ closeModal(); window._centerAct = b.dataset.cdact || ''; go(b.dataset.cdgo); }; });
  $$('#modal [data-cdvod]').forEach(function(b){ b.onclick = function(){ closeModal(); go(CURRENT.role==='instructor'?'t-vod':'a-vod'); }; });
  $$('#modal [data-cdassm]').forEach(function(b){ b.onclick = function(){ closeModal(); go(CURRENT.role==='instructor'?'t-assess':'a-assess'); }; });
}

/* 루틴 설정 */
function routineForm(onDone){
  var r = routine();
  function dowSel(id, val){ return '<select id="' + id + '">' + DOW.map(function(x,i){
    return '<option value="' + i + '"' + (i===+val?' selected':'') + '>' + x + '요일</option>'; }).join('') + '</select>'; }
  openModal(el('<div class="form"><h3>학습 루틴 설정</h3>'
    + '<p class="muted" style="margin:2px 0 12px;line-height:1.75">기수 개강일을 기준으로 정기 테스트를 자동 편성합니다. 저장 후 달력에서 [이 달 루틴 편성]을 누르면 실제 평가가 생성됩니다.</p>'
    + '<label class="lt-sw"><input type="checkbox" id="rt_on" ' + (r.on?'checked':'') + '> <b>루틴 자동 편성 사용</b></label>'
    + '<label>단어 테스트 요일' + '<div class="lt-chips">' + [1,2,3,4,5,6,0].map(function(d){
        return '<label class="lt-chk"><input type="checkbox" class="rtw" value="' + d + '"' + ((r.wordDows||[]).indexOf(d)>=0?' checked':'') + '> ' + DOW[d] + '</label>'; }).join('') + '</div></label>'
    + '<div class="frow"><label>주간 테스트' + dowSel('rt_wk', r.weeklyDow) + '</label>'
    + '<label>월간 테스트 (매월 마지막)' + dowSel('rt_mo', r.monthlyLastDow) + '</label></div>'
    + '<div class="frow"><label>모의고사 주기<select id="rt_me">' + [1,2,3,4].map(function(n){
        return '<option value="' + n + '"' + (n===+r.mockEvery?' selected':'') + '>' + n + '주 1회</option>'; }).join('') + '</select></label>'
    + '<label>모의고사 요일' + dowSel('rt_md', r.mockDow) + '</label></div>'
    + '<label class="lt-sw"><input type="checkbox" id="rt_sm" ' + (r.schoolMock?'checked':'') + '> 학교별 기출유형 모의고사 (매월 둘째 토요일)</label>'
    + '<label class="lt-sw"><input type="checkbox" id="rt_hs" ' + (r.skipHoliday?'checked':'') + '> 공휴일에는 테스트를 편성하지 않음</label>'
    + '<label class="lt-sw"><input type="checkbox" id="rt_hm" ' + (r.shiftHoliday?'checked':'') + '> 공휴일과 겹치면 다음 평일로 이동 (주간·월간·모의고사)</label>'
    + '<label>평가 마감 여유(일)<input type="number" id="rt_dd" min="0" max="14" value="' + (r.dueDays||1) + '"></label>'
    + '<div class="bar-actions" style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--line)">'
      + '<button class="btn ghost" id="rt_custom">사용자 지정 루틴 관리</button>'
      + '<span class="muted">등록한 시험지 반복 출제 · 기수별 · 학생별 할 일</span></div>'
    + '<div class="modal-actions"><button class="btn ghost" id="rt_c">취소</button><button class="btn" id="rt_ok">저장</button></div></div>'));
  document.getElementById('rt_c').onclick = closeModal;
  document.getElementById('rt_custom').onclick = function(){
    if(typeof rtManager==='function') rtManager(function(){ routineForm(onDone); });
  };
  document.getElementById('rt_ok').onclick = function(){
    var r2 = routine();
    r2.on = document.getElementById('rt_on').checked;
    r2.wordDows = $$('.rtw').filter(function(x){return x.checked;}).map(function(x){return +x.value;});
    r2.weeklyDow = +document.getElementById('rt_wk').value;
    r2.monthlyLastDow = +document.getElementById('rt_mo').value;
    r2.mockEvery = +document.getElementById('rt_me').value;
    r2.mockDow = +document.getElementById('rt_md').value;
    r2.schoolMock = document.getElementById('rt_sm').checked;
    r2.skipHoliday = document.getElementById('rt_hs').checked;
    r2.shiftHoliday = document.getElementById('rt_hm').checked;
    r2.dueDays = +document.getElementById('rt_dd').value || 0;
    DB.routine = r2; save(); closeModal(); toast('루틴을 저장했습니다');
    if(onDone) onDone();
  };
}

/* 이룸편입 일정(직접 추가) */
function calEventForm(ev, onDone){
  ev = ev || {};
  openModal(el('<div class="form"><h3>' + (ev.id ? '일정 수정' : '이룸편입 일정 추가') + '</h3>'
    + '<label>날짜<input type="date" id="ce_d" value="' + esc(ev.date||todayStr()) + '"></label>'
    + '<label>제목 *<input id="ce_t" value="' + esc(ev.title||'') + '" placeholder="예: 개강 오리엔테이션 / 휴강"></label>'
    + '<label>메모<textarea id="ce_m">' + esc(ev.memo||'') + '</textarea></label>'
    + '<div class="modal-actions">' + (ev.id ? '<button class="btn ghost del" id="ce_del">삭제</button>' : '')
    + '<button class="btn ghost" id="ce_c">취소</button><button class="btn" id="ce_ok">저장</button></div></div>'));
  document.getElementById('ce_c').onclick = closeModal;
  if(document.getElementById('ce_del')) document.getElementById('ce_del').onclick = function(){
    DB.calEvents = (DB.calEvents||[]).filter(function(x){return x.id!==ev.id;});
    (DB._deletedIds = DB._deletedIds||[]).push(ev.id); save(); closeModal(); toast('삭제했습니다'); if(onDone) onDone(); };
  document.getElementById('ce_ok').onclick = function(){
    var t = document.getElementById('ce_t').value.trim(); if(!t){ alert('제목을 입력해 주세요'); return; }
    DB.calEvents = DB.calEvents || [];
    var data = { date:document.getElementById('ce_d').value, title:t, memo:document.getElementById('ce_m').value };
    if(ev.id){ Object.assign(acf(DB.calEvents).find(function(x){return x.id===ev.id;})||{}, data); }
    else DB.calEvents.push(Object.assign({id:uid('ce')}, data));
    save(); closeModal(); toast('일정을 저장했습니다'); if(onDone) onDone();
  };
}

/* ---------- 요일별 데일리 루틴 ---------- */
var DAILY_DEFAULT = [
  {key:'lecture',  dows:[1,2,3,4,5], title:'오늘의 강의 수강 (2회독)', desc:'오늘 공개된 강의를 끝까지 듣고 2회독을 채우세요', to:'s-vod',    act:''},
  {key:'word',     dows:[1,2,3,4,5], title:'단어 테스트',              desc:'매일 어휘 확인 · 90% 이상 목표',              to:'s-center', act:'daily'},
  {key:'sentence', dows:[1,2,3,4,5], title:'과제 · 오늘 배운 내용으로 문장 만들기', desc:'배운 표현으로 직접 문장을 만들어 제출', to:'s-hw', act:''},
  {key:'vocabq',   dows:[1],         title:'어휘 퀴즈 (목표 정답률 90%)', desc:'90% 미만이면 다시 응시해 채워 주세요',        to:'s-center', act:'vocab'},
  {key:'school',   dows:[2],         title:'학교별 유형 문제 테스트',   desc:'목표 대학 출제 유형으로 연습',                 to:'s-center', act:'school'},
  {key:'retry',    dows:[3],         title:'지난주 오답 다시 풀기',     desc:'최근 7일 틀린 문제만 모아 재응시',             to:'s-center', act:'wrong'},
  {key:'adaptive', dows:[3],         title:'맞춤 추천 문제',            desc:'약한 유형을 가중 출제',                        to:'s-center', act:'adaptive'},
  {key:'mixtest',  dows:[4],         title:'테스트 센터 종합 테스트',   desc:'전 영역 20문항 실전 감각 유지',                to:'s-center', act:'mix'},
  {key:'review',   dows:[5],         title:'주간 복습 · 오답노트 정리', desc:'이번 주 오답을 다시 보고 정리',                to:'s-center', act:'review'},
  {key:'plan',     dows:[0],         title:'주간 학습 점검',            desc:'성장 리포트로 한 주를 돌아보고 다음 주 계획',  to:'s-growth', act:''}
];
function dailyRoutine(){
  var r = routine();
  var saved = {};
  (r.daily || []).forEach(function(x){ if(x && x.key) saved[x.key] = x; });
  /* 제목·설명·이동경로는 항상 코드 기본값 사용 → 저장 데이터가 손상돼도 글자가 깨지지 않음 */
  r.daily = DAILY_DEFAULT.map(function(d){
    var sv = saved[d.key] || {};
    return { key:d.key, title:d.title, desc:d.desc, to:d.to, act:d.act,
             dows: (sv.dows && sv.dows.length) ? sv.dows : d.dows,
             on: (sv.on === false) ? false : true };
  });
  return r.daily;
}
function dailyFor(ds, sid){
  var w = dowOf(ds);
  if(typeof isHoliday === 'function' && isHoliday(ds)) return [];
  /* 학생별·기수별 사용자 지정 루틴을 함께 반영합니다 */
  var stu = null;
  try{
    var id = sid || (typeof CURRENT!=='undefined' && CURRENT ? CURRENT.id : '');
    stu = (acf(DB.students)||[]).filter(function(s){ return s.id===id; })[0] || null;
  }catch(e){}
  var list = (typeof rtDailyFor==='function') ? rtDailyFor(stu) : dailyRoutine();
  return list.filter(function(x){ return x.on !== false && (x.dows||[]).indexOf(w) >= 0; });
}
/* ---------- 루틴 자동 완료 판정 ----------
   학생이 실제로 그 활동을 하면 체크를 누르지 않아도 완료로 봅니다. */
function dailySessions(sid, ds){
  return (DB.sessions||[]).filter(function(x){ return x && x.studentId===sid && x.date===ds; });
}
function dailyGamePlayed(sid, ds){
  var v=(DB.vocab||{})[sid];
  return !!(v && (v.games||[]).some(function(g){ return String(g && g.at || '').slice(0,10)===ds; }));
}
/* 빈출 숙어를 오늘 한 번이라도 했는가 (숙어 문항 id 는 900000번대) */
function dailyIdiomDone(sid, ds){
  var hit = dailySessions(sid, ds).some(function(s){
    return (s.detail||[]).some(function(d){ return +d.id >= 900000 && +d.id < 1000000; });
  });
  if(hit) return true;
  var iv=(DB.idiom||{})[sid]||{};
  var k=iv.known||{}, m=iv.miss||{};
  for(var a in k){ if(k[a]===ds) return true; }
  for(var b in m){ if(m[b] && m[b].at===ds) return true; }
  return false;
}
/* 오늘 아무 학습이라도 했는가 */
function dailyAnyStudy(sid, ds){
  if(dailySessions(sid, ds).length) return true;
  if(dailyGamePlayed(sid, ds)) return true;
  if(dailyIdiomDone(sid, ds)) return true;
  var v=(DB.vocab||{})[sid]||{};
  if(((v.days||{})[ds]||{}).done && v.days[ds].done.length) return true;
  var wm=(DB.watch||{})[sid]||{};
  for(var lid in wm){ if(wm[lid] && wm[lid].lastAt===ds) return true; }
  return (DB.submissions||[]).some(function(x){ return x && x.studentId===sid && x.date===ds; });
}
/* 완료 기준을 정하지 않은 사용자 지정 루틴은 이름·이동 화면으로 짐작합니다 */
function dailyGuessAuto(item){
  if(!item) return '';
  var t = String(item.title||'') + ' ' + String(item.desc||'');
  var to = String(item.to||''), act = String(item.act||'');
  if(/산성비|게임/.test(t) || act==='game') return 'game';
  if(/숙어/.test(t) || to==='s-idiom') return 'idiom';
  if(/독해/.test(t) || to==='s-read') return 'reading';
  if(/학교별|기출/.test(t) || to==='s-uni') return 'school';
  if(/오답/.test(t) || to==='s-wrong') return 'retry';
  if(/단어|어휘/.test(t) || to==='s-word') return 'wordAny';
  if(/과제/.test(t) || to==='s-hw') return 'sentence';
  if(/강의/.test(t) || to==='s-vod') return 'lecture';
  if(to==='s-center') return 'anyTest';
  return '';
}
function dailyAutoDone(sid, ds, key){
  try{
    var ss = dailySessions(sid, ds);
    switch(key){
      case 'lecture': {
        if(typeof VOD==='undefined') return false;
        /* 오늘 강의를 본 기록이 있으면 완료 */
        var wm=(DB.watch||{})[sid]||{};
        for(var lid in wm){ if(wm[lid] && wm[lid].lastAt===ds) return true; }
        /* 또는 오늘 공개된 강의를 모두 2회독했으면 완료 */
        var stu=(acf(DB.students)||[]).filter(function(x){return x.id===sid;})[0]; if(!stu) return false;
        var todayLec=(VOD.list(stu)||[]).filter(function(l){ return (l.openDate||'')===ds; });
        if(!todayLec.length) return false;
        return todayLec.every(function(l){ return (VOD.rec(sid,l.id).count||0) >= VOD.REQ; });
      }
      case 'word': {
        /* 오늘 단어 분량을 다 봤거나 단어 테스트를 통과하면 완료 */
        var v=(DB.vocab||{})[sid];
        var done=(v && v.days && v.days[ds] && v.days[ds].done) ? v.days[ds].done.length : 0;
        var need=(typeof WD_DAILY!=='undefined')?WD_DAILY:50;
        if(done >= need) return true;
        var dt=((DB.dailyTests||{})[sid]||{})[ds];
        return !!(dt && dt.passed);
      }
      case 'sentence':                       /* 과제 제출 */
        return (DB.submissions||[]).some(function(x){ return x && x.studentId===sid && x.date===ds; });
      case 'vocabq':                         /* 어휘 문제 응시 */
        return ss.some(function(x){ return x.section==='vocab' || (x.detail||[]).some(function(d){ return d.section==='vocab'; }); });
      case 'school':                         /* 학교별 유형 */
        return ss.some(function(x){ return x.type==='school'; });
      case 'adaptive':                       /* 맞춤 추천 */
        return ss.some(function(x){ return x.type==='adaptive'; });
      case 'mixtest':                        /* 종합 테스트 */
        return ss.some(function(x){ return x.type==='mix'; });
      case 'retry': case 'review': {         /* 오답 다시 풀기 — 전에 틀렸던 문항을 오늘 다시 푼 경우 */
        var wrongBefore={};
        (DB.sessions||[]).forEach(function(x){
          if(!x || x.studentId!==sid || (x.date||'')>=ds) return;
          (x.detail||[]).forEach(function(d){ if(!d.correct) wrongBefore[d.id]=1; });
        });
        return ss.some(function(x){ return (x.detail||[]).some(function(d){ return wrongBefore[d.id]; }); });
      }
      case 'game':                           /* 산성비 게임 — 한 판이라도 하면 인정 */
        return dailyGamePlayed(sid, ds);
      case 'idiom':                          /* 빈출 숙어 — 한 번이라도 하면 인정 */
        return dailyIdiomDone(sid, ds);
      case 'reading':                        /* 독해 약점공략 */
        return ss.some(function(x){ return x.section==='reading' || (x.detail||[]).some(function(d){ return d.section==='reading'; }); });
      case 'wordAny':                        /* 단어 — 조금이라도 봤으면 인정 */
        return (((DB.vocab||{})[sid]||{}).days||{})[ds] && ((DB.vocab||{})[sid].days[ds].done||[]).length>0 ? true : dailyGamePlayed(sid, ds);
      case 'anyTest':                        /* 아무 테스트나 한 번 */
        return ss.length>0;
      case 'any':                            /* 아무 학습이나 한 번 */
        return dailyAnyStudy(sid, ds);
      default: {
        /* 사용자 지정 루틴 — 관리자가 정한 기준, 없으면 이름으로 짐작 */
        if(String(key).indexOf('c_')!==0) return false;
        var it=(typeof rtFind==='function') ? rtFind(String(key).slice(2)) : null;
        if(!it) return false;
        if(it.auto === 'manual') return false;                 /* 선생님 확인으로 지정한 항목 */
        var kind = it.auto || (typeof dailyGuessAuto==='function' ? dailyGuessAuto(it) : '');
        if(!kind) return false;
        return dailyAutoDone(sid, ds, kind);
      }
    }
  }catch(e){ return false; }
}
/* 루틴 확인 요청 — 자동으로 알 수 없는 항목은 선생님 확인을 받습니다 */
function rtCertKind(key){ return 'rt:'+key; }
function rtReqStatus(sid, ds, key){
  var k=rtCertKind(key);
  var list=(DB.certs||[]).filter(function(c){ return c && c.studentId===sid && c.date===ds && c.kind===k; });
  if(!list.length) return '';
  if(list.some(function(c){ return c.status==='approved'; })) return 'approved';
  if(list.some(function(c){ return c.status==='pending'; })) return 'pending';
  return 'rejected';
}
function rtRequest(sid, ds, key, title, note){
  DB.certs = DB.certs || [];
  var k=rtCertKind(key);
  if(rtReqStatus(sid, ds, key)==='approved') return;
  DB.certs = DB.certs.filter(function(c){ return !(c.studentId===sid && c.date===ds && c.kind===k && c.status!=='approved'); });
  DB.certs.push({ id:uid('ct'), studentId:sid, date:ds, kind:k, rtTitle:title||key,
                  status:'pending', note:note||'', by:null, byName:null, at:null, _u:Date.now() });
  save();
}
/* 완료 = 실제 활동으로 자동 확인 · 선생님 확인 완료 · (예전에 직접 체크한 기록) */
function dailyDone(sid, ds, key){
  if(dailyAutoDone(sid, ds, key)) return true;
  if(rtReqStatus(sid, ds, key)==='approved') return true;
  DB.dailyDone = DB.dailyDone || {};
  var m = DB.dailyDone[sid] || {}; var d = m[ds] || {};
  return !!d[key];
}
function dailyToggle(sid, ds, key){
  DB.dailyDone = DB.dailyDone || {};
  DB.dailyDone[sid] = DB.dailyDone[sid] || {};
  DB.dailyDone[sid][ds] = DB.dailyDone[sid][ds] || {};
  var cur = !!DB.dailyDone[sid][ds][key];
  DB.dailyDone[sid][ds][key] = !cur;
  DB.dailyDone[sid][ds]._u = Date.now();
  save();
  return !cur;
}
function dailyProgress(sid, ds){
  var list = dailyFor(ds, sid);
  if(!list.length) return {done:0, total:0, rate:100};
  var done = list.filter(function(x){ return dailyDone(sid, ds, x.key); }).length;
  return {done:done, total:list.length, rate:Math.round(done/list.length*100)};
}

/* 루틴이 자동 생성한 평가 제목을 코드 원문으로 상시 복원 */
function repairRoutineAssessments(){
  var NAMES = { word:'단어 테스트', weekly:'주간 테스트', mock:'정기 모의고사',
                schoolmock:'학교별 기출유형 모의고사', monthly:'월간 테스트', quiz:'퀴즈' };
  var fixed = 0;
  (acf(DB.assessments)||[]).forEach(function(a){
    if(!a || !a.routineKey) return;
    var parts = String(a.routineKey).split(':');            /* rt:cohort:kind:date */
    if(parts.length < 4) return;
    var kind = parts[2], date = parts[3];
    var base = NAMES[kind]; if(!base || !date) return;
    var co = (typeof VOD!=='undefined' && parts[1] && parts[1]!=='all') ? VOD.cohort(parts[1]) : null;
    var title = base + ' (' + date.slice(5).replace('-','/') + ')' + (co ? (' · ' + co.name) : '');
    var desc = '정기 루틴으로 자동 편성된 평가입니다.';
    if(a.title !== title || a.desc !== desc){ a.title = title; a.desc = desc; a._u = Date.now(); fixed++; }
  });
  if(fixed) save();
  return fixed;
}
