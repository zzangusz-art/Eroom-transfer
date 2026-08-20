/* ===================== 알림톡 · 상담톡 (카카오 비즈메시지 · 비즈고) =====================
   API 키는 서버에만 보관하며 이 화면으로 내려오지 않습니다.
   발송은 서버(/api/kakao/send)를 거쳐 비즈고로 전달됩니다. */

var TALK_TAB = 'queue';
var TALK_CFG = null;          /* 서버 설정 캐시 */
var TALK_LOG = null;          /* 발송 이력 캐시 */
var TALK_PICK = {};           /* 대기함 선택 상태 */

function talkStore(){
  DB.talk = DB.talk || {};
  var t = DB.talk;
  t.tpl     = t.tpl || {};        /* 템플릿별 설정 {code, text, title, btnName, btnUrl, on} */
  t.queue   = t.queue || [];      /* 발송 대기 목록 */
  t.sent    = t.sent || [];       /* 발송 완료 요약 */
  t.lastScan= t.lastScan || '';
  return t;
}
function talkBrand(){ return (DB.config && DB.config.brand) || '이룸편입'; }
function talkSite(){ return (DB.config && DB.config.site) || (location.origin || 'https://eroom.kr'); }

/* ---------- 템플릿 12종 ----------
   text 안의 #{변수}는 발송 직전 학생별 값으로 바뀝니다.
   code(템플릿 코드)는 비즈고에서 승인받은 코드를 [템플릿] 탭에서 입력합니다. */
var TALK_TPLS = [
  { key:'deadline', cat:'수강', name:'수강기한 임박 안내', auto:true,
    desc:'강의 2회독 기한이 3일 이내로 남았거나 지난 학생에게 보냅니다.',
    vars:['이름','강의명','기한','남은일'],
    title:'수강기한 안내',
    text:'[#{브랜드}] 수강기한 안내\n\n#{이름}님, 아직 이수하지 않은 강의가 있어 안내드립니다.\n\n· 강의: #{강의명}\n· 수강기한: #{기한} (#{남은일})\n\n기한 내에 2회독을 완료하셔야 학습으로 인정됩니다.\n지금 바로 이어서 수강해 주세요.',
    btnName:'강의 이어보기', btnPath:'#s-vod' },

  { key:'hw_notice', cat:'과제', name:'오늘의 과제 안내', auto:true,
    desc:'매일 아침, 그날의 과제 주제를 안내합니다.',
    vars:['이름','날짜','주제','마감'],
    title:'오늘의 과제',
    text:'[#{브랜드}] 오늘의 과제 안내\n\n#{이름}님, #{날짜} 과제를 안내드립니다.\n\n· 주제: #{주제}\n· 제출기한: #{마감}\n\n오늘 배운 내용을 손으로 정리한 뒤 사진으로 제출해 주세요.',
    btnName:'과제 제출하기', btnPath:'#s-hw' },

  { key:'notice', cat:'공지', name:'학원 공지 안내', auto:false,
    desc:'등록된 공지를 골라 학생에게 보냅니다.',
    vars:['이름','제목','내용'],
    title:'공지사항',
    text:'[#{브랜드}] 공지사항\n\n#{이름}님, 아래 내용을 확인해 주세요.\n\n· 제목: #{제목}\n\n#{내용}\n\n자세한 내용은 LMS 공지사항에서 확인하실 수 있습니다.',
    btnName:'공지 확인하기', btnPath:'#s-board' },

  { key:'maint', cat:'공지', name:'서버 점검 안내', auto:false,
    desc:'점검 일시와 영향 범위를 안내합니다.',
    vars:['이름','일시','시간','내용'],
    title:'서버 점검 안내',
    text:'[#{브랜드}] 서버 점검 안내\n\n#{이름}님, 서비스 점검 일정을 안내드립니다.\n\n· 일시: #{일시} #{시간}\n· 내용: #{내용}\n\n점검 중에는 강의 수강과 시험 응시가 어려울 수 있습니다.\n이용에 참고해 주세요.',
    btnName:'', btnPath:'' },

  { key:'miss_lec', cat:'수강', name:'놓친 강의 안내', auto:true,
    desc:'3일 이상 수강 기록이 없거나 미이수 강의가 쌓인 학생에게 보냅니다.',
    vars:['이름','미이수','최근수강','추천강의'],
    title:'놓친 강의가 있어요',
    text:'[#{브랜드}] 놓친 강의 안내\n\n#{이름}님, 아직 듣지 않은 강의가 있습니다.\n\n· 미이수 강의: #{미이수}강\n· 최근 수강일: #{최근수강}\n· 먼저 들을 강의: #{추천강의}\n\n하루 한 강씩만 채워도 금방 따라잡을 수 있습니다.',
    btnName:'강의 보러가기', btnPath:'#s-vod' },

  { key:'hw_late', cat:'과제', name:'과제 미제출 안내', auto:true,
    desc:'마감일이 지났는데 제출하지 않은 학생에게 보냅니다.',
    vars:['이름','주제','마감','경과'],
    title:'과제 미제출 안내',
    text:'[#{브랜드}] 과제 미제출 안내\n\n#{이름}님, 아직 제출되지 않은 과제가 있습니다.\n\n· 주제: #{주제}\n· 제출기한: #{마감} (#{경과})\n\n늦더라도 제출하시면 첨삭을 받으실 수 있습니다.',
    btnName:'지금 제출하기', btnPath:'#s-hw' },

  { key:'priority', cat:'학습', name:'오늘 먼저 할 일 추천', auto:true,
    desc:'미이수 강의·미제출 과제·오답 복습 중 가장 급한 순서로 알려줍니다.',
    vars:['이름','1순위','2순위','3순위'],
    title:'오늘 먼저 할 일',
    text:'[#{브랜드}] 오늘 먼저 할 일\n\n#{이름}님, 오늘은 이 순서대로 해보세요.\n\n1. #{1순위}\n2. #{2순위}\n3. #{3순위}\n\n순서대로만 따라오시면 오늘 분량은 충분합니다.',
    btnName:'학습 시작하기', btnPath:'#s-home' },

  { key:'weekly', cat:'리포트', name:'주간 학습 리포트 (매주 월요일)', auto:true,
    desc:'지난주 진도·테스트·오답·오답 개선을 정리해 보냅니다.',
    vars:['이름','기간','진도','테스트','오답','개선'],
    title:'주간 학습 리포트',
    text:'[#{브랜드}] 주간 학습 리포트\n\n#{이름}님, 지난주(#{기간}) 학습 결과입니다.\n\n· 진도: #{진도}\n· 테스트: #{테스트}\n· 오답: #{오답}\n· 오답 개선: #{개선}\n\n이번 주도 함께 채워가요.',
    btnName:'리포트 자세히 보기', btnPath:'#s-report' },

  { key:'exam_open', cat:'평가', name:'시험 응시 안내', auto:true,
    desc:'새 평가가 공개되면 응시 안내를 보냅니다.',
    vars:['이름','시험명','기간','문항'],
    title:'시험 응시 안내',
    text:'[#{브랜드}] 시험 응시 안내\n\n#{이름}님, 새로운 시험이 열렸습니다.\n\n· 시험명: #{시험명}\n· 응시기간: #{기간}\n· 문항수: #{문항}\n\n기간 내에 반드시 응시해 주세요.',
    btnName:'응시하러 가기', btnPath:'#s-assess' },

  { key:'exam_due', cat:'평가', name:'시험 마감 임박 안내', auto:true,
    desc:'마감 하루 전까지 응시하지 않은 학생에게 보냅니다.',
    vars:['이름','시험명','마감','남은일'],
    title:'시험 마감 임박',
    text:'[#{브랜드}] 시험 마감 임박\n\n#{이름}님, 아직 응시하지 않은 시험이 있습니다.\n\n· 시험명: #{시험명}\n· 마감: #{마감} (#{남은일})\n\n마감 후에는 응시할 수 없습니다.',
    btnName:'지금 응시하기', btnPath:'#s-assess' },

  { key:'graded', cat:'평가', name:'채점 완료 · 풀이 공개', auto:true,
    desc:'채점이 끝나고 풀이가 공개되면 알려줍니다.',
    vars:['이름','시험명','점수','오답'],
    title:'채점 결과 안내',
    text:'[#{브랜드}] 채점 결과 안내\n\n#{이름}님, 응시하신 시험의 채점이 끝났습니다.\n\n· 시험명: #{시험명}\n· 점수: #{점수}\n· 오답: #{오답}문항\n\n해설이 공개되었으니 오답을 꼭 확인해 주세요.',
    btnName:'해설 확인하기', btnPath:'#s-report' },

  { key:'comeback', cat:'케어', name:'장기 미접속 안내', auto:true,
    desc:'7일 이상 접속하지 않은 학생에게 보냅니다.',
    vars:['이름','미접속','미이수'],
    title:'다시 시작해요',
    text:'[#{브랜드}] 학습 안내\n\n#{이름}님, #{미접속} 동안 학습 기록이 없어 연락드립니다.\n\n· 남은 미이수 강의: #{미이수}강\n\n짧게라도 다시 시작하는 것이 가장 중요합니다.\n어려운 점이 있으면 언제든 문의해 주세요.',
    btnName:'학습 이어가기', btnPath:'#s-home' }
];
/* 관리자가 직접 만든 템플릿까지 합친 전체 목록 */
function talkAllTpls(){
  var t = talkStore();
  var mine = (t.custom||[]).map(function(c){
    return { key:c.key, cat:c.cat||'직접 등록', name:c.name, auto:false, custom:true,
             desc:c.desc||'직접 만든 안내문입니다. [새 발송]에서 대상을 골라 보냅니다.',
             vars:['이름'], title:c.title||'', text:c.text||'', btnName:c.btnName||'', btnPath:'' };
  });
  return TALK_TPLS.concat(mine);
}
function talkTpl(key){
  var all = talkAllTpls();
  for(var i=0;i<all.length;i++) if(all[i].key===key) return all[i];
  return null;
}
/* 모든 알림톡 끝에 붙는 공통 꼬리말 */
function talkFooter(){ var t=talkStore(); return t.footer || ''; }
function talkCfgOf(key, withFooter){
  var t=talkStore(); var base=talkTpl(key)||{};
  var c=t.tpl[key]||{};
  var body = (c.text!=null?c.text:base.text)||'';
  if(withFooter){
    var f = talkFooter();
    if(f && body.indexOf(f)<0) body = body + '\n\n' + f;
  }
  return { code:c.code||'', text:body, title:(c.title!=null?c.title:base.title)||'',
           btnName:(c.btnName!=null?c.btnName:base.btnName)||'', btnUrl:c.btnUrl||(base.btnPath?(talkSite()+'/'+base.btnPath):''),
           on: c.on!==false, custom: !!base.custom };
}
function talkSaveCfg(key, patch){
  var t=talkStore(); t.tpl[key]=Object.assign({}, talkCfgOf(key), patch, {_u:Date.now()}); save();
}

/* ---------- 변수 채우기 ---------- */
function talkFill(text, vars){
  return String(text||'').replace(/#\{([^}]+)\}/g, function(m, k){
    var v = vars[k];
    return (v==null || v==='') ? m : String(v);
  });
}
function talkLeftDays(ds){
  if(!ds) return null;
  return Math.ceil((new Date(ds+'T23:59:59') - new Date())/86400000);
}
function talkDayText(n){
  if(n==null) return '';
  if(n<0) return Math.abs(n)+'일 지남';
  if(n===0) return '오늘 마감';
  return 'D-'+n;
}
function talkPhone(s){ return String((s&&s.phone)||'').replace(/[^0-9]/g,''); }
/* 010-1234-5678 형태로 보기 좋게 */
function talkPhoneFmt(p){
  p = String(p||'').replace(/[^0-9]/g,'');
  if(p.length===11) return p.slice(0,3)+'-'+p.slice(3,7)+'-'+p.slice(7);
  if(p.length===10) return p.slice(0,3)+'-'+p.slice(3,6)+'-'+p.slice(6);
  return p;
}

/* ---------- 학생별 발송 대상 판정 + 변수 생성 ----------
   보낼 필요가 없으면 null을 돌려줍니다. */
function talkBuild(key, s, extra){
  extra = extra || {};
  var brand = talkBrand(), today = todayStr();
  var V = { '브랜드':brand, '이름':s.name||'' };

  if(key==='deadline'){
    var risk = (typeof OPS!=='undefined') ? OPS.atRisk([s]) : [];
    if(!risk.length) return null;
    var r = risk[0];
    V['강의명']=r.lecture||'-'; V['기한']=r.due||'-'; V['남은일']=talkDayText(r.left);
    return V;
  }
  if(key==='hw_notice'){
    var tt = extra.주제 || '';
    if(!tt){
      var todayA = (acf(DB.assignments)||[]).filter(function(a){ return a.date===today; })[0];
      if(todayA) tt = todayA.title || '';
      else if(typeof hwTopicFor==='function'){ var tp=hwTopicFor(today, s); if(tp) tt='['+tp.secName+'] '+tp.title; }
    }
    if(!tt) return null;
    /* 이미 낸 학생에게는 보내지 않습니다 */
    var todayA2 = (acf(DB.assignments)||[]).filter(function(a){ return a.date===today; })[0];
    if(todayA2){ var sb=talkSubOf(todayA2.id, s.id); if(sb && (sb.fileUrl||sb.photoUrl||sb.text||sb.submittedAt)) return null; }
    V['날짜']=today; V['주제']=String(tt); V['마감']=extra.마감||(today+' 23:59');
    return V;
  }
  if(key==='notice'){
    if(!extra.제목) return null;
    V['제목']=extra.제목; V['내용']=String(extra.내용||'').slice(0,400);
    return V;
  }
  if(key==='maint'){
    if(!extra.일시) return null;
    V['일시']=extra.일시; V['시간']=extra.시간||''; V['내용']=extra.내용||'홈페이지 및 강의 수강 일시 중단';
    return V;
  }
  if(key==='miss_lec'){
    var sm = (typeof VOD!=='undefined') ? VOD.summary(s.id) : null;
    if(!sm || !sm.total) return null;
    var left = sm.total - sm.done;
    if(left<=0) return null;
    var lastDay = talkLastStudy(s.id);
    var gap = lastDay ? Math.floor((new Date(today)-new Date(lastDay))/86400000) : 99;
    if(gap < 3 && left < 3) return null;
    V['미이수']=left; V['최근수강']= lastDay ? (lastDay+' ('+gap+'일 전)') : '기록 없음';
    V['추천강의']= talkNextLecture(s) || '배정된 다음 강의';
    return V;
  }
  if(key==='hw_late'){
    var late = talkLateHw(s);
    if(!late) return null;
    V['주제']=late.topic; V['마감']=late.due; V['경과']=talkDayText(talkLeftDays(late.due));
    return V;
  }
  if(key==='priority'){
    var list = talkPriority(s);
    if(list.length<1) return null;
    V['1순위']=list[0]||'-'; V['2순위']=list[1]||'오답노트 복습'; V['3순위']=list[2]||'단어 테스트';
    return V;
  }
  if(key==='weekly'){
    var w = talkWeekly(s);
    if(!w) return null;
    V['기간']=w.period; V['진도']=w.prog; V['테스트']=w.test; V['오답']=w.wrong; V['개선']=w.fix;
    return V;
  }
  if(key==='exam_open'){
    var a = extra.assess || talkOpenAssess(s);
    if(!a) return null;
    V['시험명']=a.title; V['기간']=(a.openDate||today)+' ~ '+(a.dueDate||'미지정'); V['문항']=(a.qCount||a.count||'-')+'문항';
    return V;
  }
  if(key==='exam_due'){
    var a2 = extra.assess || talkDueAssess(s);
    if(!a2) return null;
    V['시험명']=a2.title; V['마감']=a2.dueDate||'-'; V['남은일']=talkDayText(talkLeftDays(a2.dueDate));
    return V;
  }
  if(key==='graded'){
    var g = extra.assess ? talkGradedOf(s, extra.assess) : talkGraded(s);
    if(!g) return null;
    V['시험명']=g.title; V['점수']=g.score+'점'; V['오답']=g.wrong;
    return V;
  }
  /* 직접 만든 템플릿은 조건을 따지지 않고 고른 학생 모두에게 보냅니다 */
  var tp0 = talkTpl(key);
  if(tp0 && tp0.custom) return V;
  if(key==='comeback'){
    var last = talkLastStudy(s.id);
    var d = last ? Math.floor((new Date(today)-new Date(last))/86400000) : 99;
    if(d < 7) return null;
    var sm2 = (typeof VOD!=='undefined') ? VOD.summary(s.id) : {total:0,done:0};
    V['미접속']= (d>=99?'오랫동안':(d+'일')); V['미이수']=Math.max(0,(sm2.total||0)-(sm2.done||0));
    return V;
  }
  return null;
}

/* ---------- 판정 도우미 ---------- */
function talkLastStudy(sid){
  var days={}; var w=(DB.watch||{})[sid]||{};
  Object.keys(w).forEach(function(k){ if(w[k].certifiedAt) days[w[k].certifiedAt]=1; if(w[k].openedAt) days[w[k].openedAt]=1; });
  Object.keys(DB.scores||{}).forEach(function(aid){ var r=(DB.scores[aid]||{})[sid]; if(r&&r.at) days[r.at]=1; if(r&&r.submittedAt) days[String(r.submittedAt).slice(0,10)]=1; });
  var ks=Object.keys(days).sort();
  return ks.length ? ks[ks.length-1] : '';
}
function talkNextLecture(s){
  if(typeof VOD==='undefined') return '';
  var lecs = VOD.list(s)||[];
  for(var i=0;i<lecs.length;i++){
    var l=lecs[i]; if(VOD.notOpen(l)) continue;
    var r=VOD.rec(s.id,l.id)||{};
    if((r.count||0) < VOD.REQ) return l.title||('Day '+(l.day||(i+1)));
  }
  return '';
}
function talkSubOf(aid, sid){
  var arr = DB.submissions;
  if(Array.isArray(arr)) return arr.find(function(x){ return x.assignmentId===aid && x.studentId===sid; }) || null;
  return ((arr||{})[aid]||{})[sid] || null;
}
/* 마감이 지났는데 아직 내지 않은 과제 (가장 오래된 것 우선) */
function talkLateHw(s){
  var t = todayStr();
  var arr = (acf(DB.assignments)||[]).filter(function(a){ return a.date && a.date < t && a.date >= talkDaysAgo(14); })
              .sort(function(a,b){ return (a.date||'').localeCompare(b.date||''); });
  for(var i=0;i<arr.length;i++){
    var a=arr[i];
    var sub = talkSubOf(a.id, s.id);
    if(sub && (sub.fileUrl || sub.photoUrl || sub.text || sub.submittedAt)) continue;
    return { topic:a.title||'과제', due:a.date };
  }
  return null;
}
function talkPriority(s){
  var out=[];
  var risk=(typeof OPS!=='undefined')?OPS.atRisk([s]):[];
  if(risk.length) out.push('수강기한 임박 강의 ' + (risk[0].lecture||'') + ' 2회독');
  var late=talkLateHw(s);
  if(late) out.push('미제출 과제 「' + late.topic + '」 제출');
  var nx=talkNextLecture(s);
  if(nx && out.length<3) out.push('오늘 강의 ' + nx + ' 수강');
  var due=talkDueAssess(s);
  if(due && out.length<3) out.push('「' + due.title + '」 응시 (마감 ' + (due.dueDate||'') + ')');
  var wrong=(typeof allWrongQuestions==='function')?(allWrongQuestions(s.id, 50)||[]):[];
  if(wrong.length && out.length<3) out.push('오답 ' + wrong.length + '문항 다시 풀기');
  return out.slice(0,3);
}
function talkOpenAssess(s){
  var t=todayStr();
  var arr=(acf(DB.assessments)||[]).filter(function(a){
    if((a.openDate||t) > t) return false;
    if(a.dueDate && a.dueDate < t) return false;
    var r=((DB.scores||{})[a.id]||{})[s.id];
    if(r && r.score!=null) return false;
    return (a.openDate||'') >= talkDaysAgo(3);
  });
  return arr[0]||null;
}
function talkDueAssess(s){
  var t=todayStr();
  var arr=(acf(DB.assessments)||[]).filter(function(a){
    if(!a.dueDate) return false;
    var left=talkLeftDays(a.dueDate);
    if(left==null || left<0 || left>2) return false;
    var r=((DB.scores||{})[a.id]||{})[s.id];
    return !(r && r.score!=null);
  }).sort(function(a,b){ return (a.dueDate||'').localeCompare(b.dueDate||''); });
  return arr[0]||null;
}
function talkGradedOf(s, a){
  var r=((DB.scores||{})[a.id]||{})[s.id];
  if(!r || r.score==null || !a.reviewOpen) return null;
  var wrong = (r.total!=null && r.right!=null) ? (r.total - r.right) : '-';
  return { title:a.title, score:r.score, wrong:wrong };
}
function talkGraded(s){
  var arr=(acf(DB.assessments)||[]).filter(function(a){ return a.reviewOpen; })
    .sort(function(a,b){ return (b.reviewOpenAt||'').localeCompare(a.reviewOpenAt||''); });
  for(var i=0;i<arr.length;i++){
    if((arr[i].reviewOpenAt||'') < talkDaysAgo(3)) break;
    var g=talkGradedOf(s, arr[i]); if(g) return g;
  }
  return null;
}
function talkDaysAgo(n){
  var d=new Date(); d.setDate(d.getDate()-n);
  return todayStr(d);
}
/* 지난주 월~일 */
function talkWeekRange(){
  var d=new Date(); var w=d.getDay(); var back=(w===0?6:w-1)+7;
  var mon=new Date(d); mon.setDate(d.getDate()-back);
  var sun=new Date(mon); sun.setDate(mon.getDate()+6);
  return { from:todayStr(mon), to:todayStr(sun) };
}
function talkWeekly(s){
  var R=talkWeekRange();
  var sm=(typeof VOD!=='undefined')?VOD.summary(s.id):{total:0,done:0,twice:0,rate:0};
  /* 지난주 시청 */
  var w=(DB.watch||{})[s.id]||{}, lecN=0;
  Object.keys(w).forEach(function(k){ var c=w[k]; var d=c.certifiedAt||c.openedAt||''; if(d>=R.from && d<=R.to) lecN++; });
  /* 지난주 시험 */
  var scores=[], wrongN=0, totalQ=0;
  Object.keys(DB.scores||{}).forEach(function(aid){
    var r=(DB.scores[aid]||{})[s.id]; if(!r || r.score==null) return;
    var d=String(r.at||r.submittedAt||'').slice(0,10);
    if(d<R.from || d>R.to) return;
    var a=(acf(DB.assessments)||[]).find(function(x){return x.id===aid;});
    scores.push({t:(a&&a.title)||'평가', v:r.score});
    if(r.total!=null && r.right!=null){ wrongN += (r.total-r.right); totalQ += r.total; }
  });
  var avg = scores.length ? Math.round(scores.reduce(function(x,y){return x+y.v;},0)/scores.length) : null;
  if(!lecN && !scores.length) return null;   /* 활동이 없으면 리포트를 만들지 않습니다 */
  /* 오답 개선: 지지난주 대비 오답률 변화 */
  var prevFrom = todayStr(new Date(new Date(R.from) - 7*86400000));
  var prevTo   = todayStr(new Date(new Date(R.to)   - 7*86400000));
  var pW=0, pT=0;
  Object.keys(DB.scores||{}).forEach(function(aid){
    var r=(DB.scores[aid]||{})[s.id]; if(!r || r.total==null || r.right==null) return;
    var d=String(r.at||r.submittedAt||'').slice(0,10);
    if(d<prevFrom || d>prevTo) return;
    pW += (r.total-r.right); pT += r.total;
  });
  var nowRate = totalQ ? Math.round(wrongN/totalQ*100) : null;
  var preRate = pT ? Math.round(pW/pT*100) : null;
  var fix;
  if(nowRate==null) fix='지난주 시험 응시 없음';
  else if(preRate==null) fix='오답률 '+nowRate+'% (비교할 지난 기록 없음)';
  else if(nowRate < preRate) fix='오답률 '+preRate+'% → '+nowRate+'% ('+(preRate-nowRate)+'%p 개선)';
  else if(nowRate > preRate) fix='오답률 '+preRate+'% → '+nowRate+'% ('+(nowRate-preRate)+'%p 증가)';
  else fix='오답률 '+nowRate+'% (지난주와 동일)';

  return {
    period: R.from.slice(5)+' ~ '+R.to.slice(5),
    prog  : '강의 '+lecN+'강 수강 · 누적 이수율 '+(sm.rate||0)+'%',
    test  : scores.length ? (scores.length+'회 응시 · 평균 '+avg+'점') : '응시 없음',
    wrong : totalQ ? (wrongN+'문항 / '+totalQ+'문항 ('+nowRate+'%)') : '기록 없음',
    fix   : fix
  };
}

/* ---------- 대기함 담기 ---------- */
function talkQueueAdd(key, students, extra, opt){
  opt = opt || {};
  var t=talkStore(), cfg=talkCfgOf(key, true), tpl=talkTpl(key);
  var today=todayStr(), added=0, skipped=0, noPhone=0;
  (students||[]).forEach(function(s){
    if(s.testOnly) return;
    var ph=talkPhone(s);
    if(ph.length<10){ noPhone++; return; }
    var dedupe = key+'|'+s.id+'|'+today;
    if(!opt.force && t.queue.some(function(q){ return q.dedupe===dedupe; })){ skipped++; return; }
    if(!opt.force && (t.sent||[]).some(function(q){ return q.dedupe===dedupe; })){ skipped++; return; }
    var V = talkBuild(key, s, extra);
    if(!V){ skipped++; return; }
    t.queue.push({
      id:'tq'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),
      key:key, name:tpl?tpl.name:key, sid:s.id, sname:s.name, phone:ph,
      vars:V, text: talkFill(cfg.text, V), title:cfg.title, code:cfg.code,
      btnName:cfg.btnName, btnUrl:cfg.btnUrl,
      status:'대기', createdAt:new Date().toISOString().slice(0,16).replace('T',' '),
      dedupe:dedupe, _u:Date.now()
    });
    added++;
  });
  save();
  return { added:added, skipped:skipped, noPhone:noPhone };
}

/* 대기함 항목을 지금의 학생 정보(연락처·이름)로 다시 맞춥니다.
   학생 관리에서 번호를 고쳐도 대기함·발송에 바로 반영되도록 하기 위함입니다. */
function talkSyncItem(x){
  if(!x || !x.sid) return x;
  var s = (acf(DB.students)||[]).find(function(y){ return y.id===x.sid; });
  if(!s) { x.gone = true; return x; }
  x.gone = false;
  var ph = talkPhone(s);
  if(ph && ph !== x.phone){ x.phone = ph; x._u = Date.now(); }
  if(!ph) x.phone = '';
  if(s.name && s.name !== x.sname){
    x.sname = s.name;
    /* 이름이 바뀌면 본문도 다시 만듭니다 */
    if(x.vars){ x.vars['이름'] = s.name; x.text = talkFill(talkCfgOf(x.key, true).text, x.vars); }
    x._u = Date.now();
  }
  return x;
}
/* 대기함 전체를 최신 학생 정보로 맞춥니다 */
function talkSyncQueue(){
  var t = talkStore(), changed = 0;
  (t.queue||[]).forEach(function(x){
    var before = x.phone + '|' + x.sname;
    talkSyncItem(x);
    if(before !== (x.phone + '|' + x.sname)) changed++;
  });
  if(changed) save();
  return changed;
}

/* 자동 규칙 한 번 돌리기 */
function talkScan(silent){
  var t=talkStore();
  var mine = acf(DB.students).filter(function(s){ return !s.testOnly; });
  var isMonday = (new Date()).getDay() === 1;
  var total={added:0, skipped:0, noPhone:0};
  TALK_TPLS.forEach(function(tp){
    if(!tp.auto) return;
    if(!talkCfgOf(tp.key).on) return;
    if(tp.key==='weekly' && !isMonday) return;     /* 주간 리포트는 월요일에만 */
    var r = talkQueueAdd(tp.key, mine, {});
    total.added+=r.added; total.skipped+=r.skipped; total.noPhone+=r.noPhone;
  });
  t.lastScan = new Date().toISOString().slice(0,16).replace('T',' ');
  save();
  if(!silent) toast(total.added ? (total.added+'건을 발송 대기함에 담았습니다') : '새로 보낼 대상이 없습니다');
  return total;
}

/* ---------- 실제 발송 ---------- */
function talkSendItems(items, done){
  items = (items||[]).filter(function(x){ return x && x.status==='대기'; });
  if(!items.length){ toast('발송할 항목이 없습니다'); if(done) done(); return; }
  /* 보내기 직전에 학생 관리의 최신 연락처·이름으로 다시 맞춥니다 */
  items.forEach(talkSyncItem);
  var noPh = items.filter(function(x){ return !x.phone || x.phone.length<10; });
  if(noPh.length){
    items = items.filter(function(x){ return x.phone && x.phone.length>=10; });
    toast('연락처가 없는 '+noPh.length+'명은 제외했습니다 — 학생 관리에서 번호를 입력해 주세요');
    if(!items.length){ if(done) done(); return; }
  }
  save();
  var missing = items.filter(function(x){ return !x.code; });
  if(missing.length){
    toast('템플릿 코드가 없는 항목이 '+missing.length+'건 있습니다 — [템플릿] 탭에서 먼저 입력해 주세요');
    if(done) done(); return;
  }
  /* 내용이 같은 항목끼리 묶어 한 번에 보냅니다 (최대 200명) */
  var groups={};
  items.forEach(function(x){
    var k = x.code+'|@|'+x.text+'|@|'+(x.title||'')+'|@|'+(x.btnName||'')+'|@|'+(x.btnUrl||'');
    (groups[k]=groups[k]||[]).push(x);
  });
  var keys=Object.keys(groups), gi=0, okN=0, failN=0, errs=[];
  toast(items.length+'건 발송을 시작합니다…');
  (function next(){
    if(gi>=keys.length){
      save();
      toast('발송 완료 — 성공 '+okN+'건'+(failN?(' · 실패 '+failN+'건'):''));
      if(errs.length) console.log('알림톡 실패 사유:', errs);
      if(done) done();
      return;
    }
    var arr=groups[keys[gi++]];
    var head0=arr[0];
    var body={
      templateCode: head0.code, msgType:'AT', text: head0.text, title: head0.title||'',
      kind: head0.name || head0.key,
      destinations: arr.map(function(x){ return { to:x.phone, ref:x.sid }; }),
      ref: head0.key
    };
    if(head0.btnName && head0.btnUrl){
      body.buttons=[{ type:'WL', name:head0.btnName.slice(0,14), urlMobile:head0.btnUrl, urlPc:head0.btnUrl }];
    }
    fetch('/api/kakao/send', { method:'POST', headers:eHdr({'content-type':'application/json'}), body:JSON.stringify(body) })
      .then(function(r){ return r.json(); })
      .then(function(j){
        var byTo={}; ((j&&j.results)||[]).forEach(function(r){ byTo[String(r.to)]=r; });
        arr.forEach(function(x){
          var r=byTo[x.phone];
          var ok = j && j.ok && (!r || r.ok);
          x.status = ok ? '발송' : '실패';
          x.result = ok ? (j.sandbox?'테스트망 발송':'발송 성공') : ((r&&r.result)||(j&&j.error)||'발송 실패');
          x.sentAt = new Date().toISOString().slice(0,16).replace('T',' ');
          x._u=Date.now();
          if(ok) okN++; else { failN++; errs.push(x.sname+': '+x.result); }
        });
        talkArchive(arr);
        next();
      })
      .catch(function(e){
        arr.forEach(function(x){ x.status='실패'; x.result='서버에 연결하지 못했습니다'; failN++; });
        talkArchive(arr); next();
      });
  })();
}
/* 발송이 끝난 항목을 대기함에서 이력으로 옮깁니다 */
function talkArchive(arr){
  var t=talkStore();
  arr.forEach(function(x){
    if(x.status==='대기') return;
    t.sent.unshift({ id:x.id, key:x.key, name:x.name, sid:x.sid, sname:x.sname, phone:x.phone,
                     status:x.status, result:x.result||'', sentAt:x.sentAt||'', dedupe:x.dedupe, text:x.text });
    (DB._deletedIds=DB._deletedIds||[]).push(x.id);
    t.queue = t.queue.filter(function(q){ return q.id!==x.id; });
  });
  if(t.sent.length>500) t.sent.length=500;
  save();
}

/* ---------- 서버 설정 ---------- */
function talkLoadCfg(cb){
  fetch('/api/kakao/config', { headers:eHdr() }).then(function(r){ return r.json(); })
    .then(function(j){ TALK_CFG = (j&&j.config)||null; if(cb) cb(TALK_CFG); })
    .catch(function(){ TALK_CFG=null; if(cb) cb(null); });
}

/* ===================== 화면 ===================== */
function talkCenter(){
  var t=talkStore();
  var tabs=[['queue','발송 대기함'],['compose','새 발송'],['tpl','템플릿'],['log','발송 이력'],['cs','상담톡'],['cfg','설정']];
  var pend=t.queue.filter(function(q){return q.status==='대기';}).length;
  var todaySent=(t.sent||[]).filter(function(q){ return (q.sentAt||'').slice(0,10)===todayStr() && q.status==='발송'; }).length;
  var failN=(t.sent||[]).filter(function(q){ return q.status==='실패'; }).length;
  var noPh=acf(DB.students).filter(function(s){ return !s.testOnly && talkPhone(s).length<10; }).length;

  var html=head('알림톡','카카오톡으로 학생에게 안내를 보냅니다');
  html+='<div class="stats">'
    +card('발송 대기',pend+'건','확인 후 발송',pend?'#d97706':'#94a3b8')
    +card('오늘 발송',todaySent+'건','성공 기준','#059669')
    +card('발송 실패',failN+'건','재발송 필요',failN?'#ef4444':'#94a3b8')
    +card('번호 없음',noPh+'명','학생 정보에 연락처 필요',noPh?'#d97706':'#94a3b8')+'</div>';
  html+='<div class="bar"><div class="tk-tabs">'
    + tabs.map(function(x){ return '<button class="tk-tab'+(TALK_TAB===x[0]?' on':'')+'" data-tk="'+x[0]+'">'+x[1]+(x[0]==='queue'&&pend?(' <b>'+pend+'</b>'):'')+'</button>'; }).join('')
    +'</div></div><div id="tkPane"></div>';
  page(html);
  $$('#page [data-tk]').forEach(function(b){ b.onclick=function(){ TALK_TAB=b.dataset.tk; talkCenter(); }; });
  talkPane();
}

function talkPane(){
  var el0=document.getElementById('tkPane'); if(!el0) return;
  if(TALK_TAB==='queue')   return talkPaneQueue(el0);
  if(TALK_TAB==='compose') return talkPaneCompose(el0);
  if(TALK_TAB==='tpl')     return talkPaneTpl(el0);
  if(TALK_TAB==='log')     return talkPaneLog(el0);
  if(TALK_TAB==='cs')      return talkPaneCs(el0);
  if(TALK_TAB==='cfg')     return talkPaneCfg(el0);
}

/* --- 발송 대기함 --- */
function talkPaneQueue(root){
  var t=talkStore();
  talkSyncQueue();                       /* 화면을 열 때마다 최신 연락처로 맞춥니다 */
  var q=t.queue.filter(function(x){return x.status==='대기';});
  var h='<div class="panel"><h3>발송 대기함 <small class="muted">(내용을 확인한 뒤 발송하세요)</small></h3>'
    +'<div class="bar-actions" style="margin-bottom:10px">'
    +'<button class="btn" id="tkScan">자동 대상 불러오기</button>'
    +'<button class="btn ghost" id="tkSync">연락처 새로고침</button>'
    +'<button class="btn ghost" id="tkAll">전체 선택</button>'
    +'<button class="btn ghost" id="tkNone">선택 해제</button>'
    +'<button class="btn" id="tkSend">선택 발송</button>'
    +'<button class="btn ghost del" id="tkDel">선택 삭제</button>'
    +'</div>'
    +(t.lastScan?('<div class="muted" style="margin-bottom:8px">마지막 자동 확인: '+esc(t.lastScan)+'</div>'):'');
  if(!q.length){
    h+='<div class="muted">대기 중인 알림톡이 없습니다. [자동 대상 불러오기]를 누르면 수강기한·과제·오답 조건에 맞는 학생을 찾아 담아드립니다.</div></div>';
    root.innerHTML=h; talkBindQueue(); return;
  }
  h+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:34px"></th><th>종류</th><th>학생</th><th>연락처</th><th>내용 미리보기</th><th>담긴 시각</th><th></th></tr></thead><tbody>'
    + q.map(function(x){
        return '<tr><td><input type="checkbox" class="tk-ck" data-id="'+x.id+'"'+(TALK_PICK[x.id]?' checked':'')+'></td>'
          +'<td><span class="pill" style="--c:#4f46e5">'+esc(x.name)+'</span></td>'
          +'<td><b>'+esc(x.sname)+'</b>'+(x.gone?'<span class="wd-flag">삭제된 학생</span>':'')+'</td>'
          +'<td>'+(x.phone && x.phone.length>=10
              ? esc(talkPhoneFmt(x.phone))
              : '<span class="vstat vstat-ing" style="color:#ef4444">번호 없음</span>')+'</td>'
          +'<td class="tk-prev">'+esc(String(x.text||'').replace(/\n+/g,' / ').slice(0,60))+'…</td>'
          +'<td>'+esc(x.createdAt||'')+'</td>'
          +'<td><button class="lnk" data-tkv="'+x.id+'">전체 보기</button></td></tr>';
      }).join('')
    +'</tbody></table></div></div>';
  root.innerHTML=h;
  talkBindQueue();
}
function talkBindQueue(){
  var t=talkStore();
  var g=function(id){ return document.getElementById(id); };
  if(g('tkScan')) g('tkScan').onclick=function(){ talkScan(); TALK_TAB='queue'; talkCenter(); };
  if(g('tkSync')) g('tkSync').onclick=function(){
    var n = talkSyncQueue();
    toast(n ? (n+'건의 연락처·이름을 최신으로 맞췄습니다') : '이미 모두 최신 상태입니다');
    talkCenter();
  };
  if(g('tkAll'))  g('tkAll').onclick=function(){ t.queue.forEach(function(x){ if(x.status==='대기') TALK_PICK[x.id]=true; }); talkPane(); };
  if(g('tkNone')) g('tkNone').onclick=function(){ TALK_PICK={}; talkPane(); };
  $$('#tkPane .tk-ck').forEach(function(c){ c.onchange=function(){ TALK_PICK[c.dataset.id]=c.checked; }; });
  $$('#tkPane [data-tkv]').forEach(function(b){ b.onclick=function(){
    var x=t.queue.find(function(q){return q.id===b.dataset.tkv;}); if(!x) return;
    openModal(el('<div class="form"><h3>'+esc(x.name)+' · '+esc(x.sname)+'</h3>'
      +'<div class="vp-meta">'+esc(x.phone)+' · 템플릿 코드 '+(x.code?esc(x.code):'<b style="color:#ef4444">미입력</b>')+'</div>'
      +'<div class="tk-bubble">'+esc(x.text).replace(/\n/g,'<br>')+(x.btnName?('<div class="tk-btn">'+esc(x.btnName)+'</div>'):'')+'</div>'
      +'<div class="modal-actions"><button class="btn ghost del" id="tkv_d">이 건 삭제</button><button class="btn" id="tkv_s">이 건만 발송</button><button class="btn ghost" id="tkv_x">닫기</button></div></div>'));
    g('tkv_x').onclick=closeModal;
    g('tkv_d').onclick=function(){ (DB._deletedIds=DB._deletedIds||[]).push(x.id);
      t.queue=t.queue.filter(function(q){return q.id!==x.id;}); save(); closeModal(); talkCenter(); };
    g('tkv_s').onclick=function(){ closeModal(); talkSendItems([x], function(){ talkCenter(); }); };
  }; });
  if(g('tkSend')) g('tkSend').onclick=function(){
    var sel=t.queue.filter(function(x){ return x.status==='대기' && TALK_PICK[x.id]; });
    if(!sel.length){ toast('발송할 항목을 선택해 주세요'); return; }
    if(!confirm(sel.length+'건의 알림톡을 발송할까요?\n실제 카카오톡으로 전송됩니다.')) return;
    TALK_PICK={};
    talkSendItems(sel, function(){ talkCenter(); });
  };
  if(g('tkDel')) g('tkDel').onclick=function(){
    var ids=Object.keys(TALK_PICK).filter(function(k){return TALK_PICK[k];});
    if(!ids.length){ toast('삭제할 항목을 선택해 주세요'); return; }
    if(!confirm(ids.length+'건을 대기함에서 삭제할까요?')) return;
    DB._deletedIds=(DB._deletedIds||[]).concat(ids);
    t.queue=t.queue.filter(function(q){ return ids.indexOf(q.id)<0; }); TALK_PICK={}; save(); talkCenter();
  };
}

/* --- 새 발송 --- */
function talkPaneCompose(root){
  var mine=acf(DB.students).filter(function(s){return !s.testOnly;});
  var cohorts=(typeof VOD!=='undefined')?(VOD.cohorts()||[]):[];
  var h='<div class="panel"><h3>새 발송</h3>'
    +'<div class="form-grid">'
    +'<label>템플릿<select id="tkcT">'+talkAllTpls().map(function(p){ return '<option value="'+p.key+'">['+p.cat+'] '+esc(p.name)+'</option>'; }).join('')+'</select></label>'
    +'<label>대상<select id="tkcW"><option value="all">재원생 전체 ('+mine.length+'명)</option>'
      + cohorts.map(function(c){ return '<option value="co:'+c.id+'">'+esc(c.name)+'</option>'; }).join('')
      + ['A','B','C'].map(function(k){ return '<option value="cls:'+k+'">'+(TIERS[k]?tierName(k):k+'반')+'</option>'; }).join('')
      +'<option value="pick">직접 고르기</option></select></label>'
    +'</div>'
    +'<div id="tkcPick" style="display:none;margin-top:8px" class="tk-picklist">'
      + mine.map(function(s){ return '<label class="tk-p"><input type="checkbox" class="tkc-s" value="'+s.id+'"> '+esc(s.name)+' <span class="muted">'+esc(s.phone||'번호 없음')+'</span></label>'; }).join('')
    +'</div>'
    +'<div id="tkcExtra" style="margin-top:10px"></div>'
    +'<div class="bar-actions" style="margin-top:12px">'
      +'<button class="btn ghost" id="tkcPrev">미리보기</button>'
      +'<button class="btn" id="tkcQ">발송 대기함에 담기</button>'
    +'</div>'
    +'<div id="tkcOut" style="margin-top:12px"></div></div>';
  root.innerHTML=h;

  var g=function(id){ return document.getElementById(id); };
  function extraFields(){
    var k=g('tkcT').value, box=g('tkcExtra');
    if(k==='notice'){
      var ns=(acf(DB.notices)||[]).slice(0,20);
      box.innerHTML='<div class="form-grid"><label>공지 선택<select id="tkcN"><option value="">— 직접 입력 —</option>'
        + ns.map(function(n){ return '<option value="'+n.id+'">'+esc(n.title||'')+'</option>'; }).join('')+'</select></label></div>'
        +'<label>제목<input id="tkcTitle" placeholder="공지 제목"></label>'
        +'<label>내용<textarea id="tkcBody" rows="3" placeholder="학생에게 보낼 요약 내용"></textarea></label>';
      if(g('tkcN')) g('tkcN').onchange=function(){
        var n=(acf(DB.notices)||[]).find(function(x){return x.id===g('tkcN').value;});
        if(n){ g('tkcTitle').value=n.title||''; g('tkcBody').value=String(n.body||'').replace(/<[^>]*>/g,'').slice(0,200); }
      };
    } else if(k==='maint'){
      box.innerHTML='<div class="form-grid"><label>점검 일시<input id="tkcDate" type="date" value="'+todayStr()+'"></label>'
        +'<label>시간<input id="tkcTime" placeholder="예: 오전 02:00 ~ 04:00"></label></div>'
        +'<label>내용<input id="tkcBody" value="홈페이지 및 강의 수강 일시 중단"></label>';
    } else if(k==='hw_notice'){
      box.innerHTML='<div class="form-grid"><label>주제(비우면 오늘 주제 자동)<input id="tkcTitle" placeholder="자동"></label>'
        +'<label>제출기한<input id="tkcBody" value="'+todayStr()+' 23:59"></label></div>';
    } else {
      box.innerHTML='<div class="note-box">이 템플릿은 학생별 학습 기록을 보고 내용을 자동으로 채웁니다. 조건에 맞지 않는 학생은 제외됩니다.</div>';
    }
  }
  function targets(){
    var w=g('tkcW').value;
    if(w==='all') return mine;
    if(w.indexOf('co:')===0){ var cid=w.slice(3); return mine.filter(function(s){ return (typeof VOD!=='undefined') && VOD.stuCohort(s) && VOD.stuCohort(s).id===cid; }); }
    if(w.indexOf('cls:')===0){ var c=w.slice(4); return mine.filter(function(s){ return s.cls===c; }); }
    var ids=$$('#tkcPick .tkc-s').filter(function(x){return x.checked;}).map(function(x){return x.value;});
    return mine.filter(function(s){ return ids.indexOf(s.id)>=0; });
  }
  function extraVals(){
    var k=g('tkcT').value, e={};
    if(k==='notice'){ e.제목=(g('tkcTitle')||{}).value||''; e.내용=(g('tkcBody')||{}).value||''; }
    if(k==='maint'){ e.일시=(g('tkcDate')||{}).value||''; e.시간=(g('tkcTime')||{}).value||''; e.내용=(g('tkcBody')||{}).value||''; }
    if(k==='hw_notice'){ if((g('tkcTitle')||{}).value) e.주제=g('tkcTitle').value; e.마감=(g('tkcBody')||{}).value||''; }
    return e;
  }
  g('tkcT').onchange=extraFields; extraFields();
  g('tkcW').onchange=function(){ g('tkcPick').style.display = (g('tkcW').value==='pick') ? 'block' : 'none'; };
  g('tkcPrev').onclick=function(){
    var k=g('tkcT').value, cfg=talkCfgOf(k, true), list=targets(), e=extraVals(), out=[], skip=0, noph=0;
    list.forEach(function(s){
      if(talkPhone(s).length<10){ noph++; return; }
      var V=talkBuild(k, s, e);
      if(!V){ skip++; return; }
      out.push({ s:s, text:talkFill(cfg.text,V) });
    });
    g('tkcOut').innerHTML = '<div class="note-box">대상 '+list.length+'명 중 <b>'+out.length+'명</b>에게 발송됩니다.'
      +(skip?(' · 조건에 맞지 않아 제외 '+skip+'명'):'')+(noph?(' · 연락처 없음 '+noph+'명'):'')
      +(cfg.code?'':' <b style="color:#ef4444">· 템플릿 코드가 없어 발송할 수 없습니다</b>')+'</div>'
      + (out.length ? ('<div class="tk-bubble" style="margin-top:10px"><div class="muted" style="margin-bottom:6px">미리보기 — '+esc(out[0].s.name)+'</div>'
          + esc(out[0].text).replace(/\n/g,'<br>')
          + (cfg.btnName?('<div class="tk-btn">'+esc(cfg.btnName)+'</div>'):'') +'</div>') : '');
  };
  g('tkcQ').onclick=function(){
    var k=g('tkcT').value, list=targets(), e=extraVals();
    if(!list.length){ toast('대상 학생이 없습니다'); return; }
    var r=talkQueueAdd(k, list, e, {force:true});
    toast(r.added ? (r.added+'건을 대기함에 담았습니다'+(r.noPhone?(' · 연락처 없음 '+r.noPhone+'명 제외'):'')) : '조건에 맞는 학생이 없습니다');
    if(r.added){ TALK_TAB='queue'; talkCenter(); }
  };
}

/* --- 템플릿 --- */
var TALK_VARS = ['이름','브랜드','날짜','제목','내용','주제','마감','강의명','기한','남은일','시험명','점수'];
function talkPaneTpl(root){
  var t = talkStore();
  var h = '<div class="note ag-note"><b>알림톡은 카카오 승인을 받은 템플릿만 발송할 수 있습니다.</b> 아래 본문을 고친 뒤 [본문 복사]로 복사해 비즈고에 템플릿을 등록하고 승인받으세요. 승인 후 받은 <b>템플릿 코드</b>를 각 항목에 입력하면 발송됩니다. 문구를 바꾸면 비즈고 템플릿도 반드시 같이 수정해야 합니다.</div>';

  /* 공통 꼬리말 */
  h += '<div class="panel"><h3>공통 꼬리말 <small class="muted">(모든 알림톡 맨 끝에 붙습니다)</small></h3>'
    + '<label><textarea id="tkFoot" rows="3" placeholder="예) 문의: 이룸편입 02-000-0000 · 평일 10:00~19:00">'+esc(talkFooter())+'</textarea></label>'
    + '<div class="muted" style="margin-top:6px">비워두면 붙지 않습니다. 꼬리말도 템플릿 본문의 일부이므로 비즈고에 등록할 때 함께 넣어야 합니다.</div>'
    + '<div class="bar-actions" style="margin-top:10px"><button class="btn" id="tkFootSave">꼬리말 저장</button></div></div>';

  /* 새 템플릿 만들기 */
  h += '<div class="panel"><h3>문구 직접 추가 <small class="muted">(필요한 안내문을 새로 만들어 씁니다)</small></h3>'
    + '<div class="form-grid">'
      + '<label>이름<input id="tkNewName" placeholder="예) 특강 안내"></label>'
      + '<label>분류<input id="tkNewCat" placeholder="예) 공지" value="직접 등록"></label>'
    + '</div>'
    + '<label>본문<textarea id="tkNewText" rows="5" placeholder="[#{브랜드}] 특강 안내&#10;&#10;#{이름}님, 이번 주 특강을 안내드립니다."></textarea></label>'
    + '<div class="tk-vars" data-for="tkNewText">'
      + '<span class="muted">변수 넣기</span>'
      + TALK_VARS.map(function(v){ return '<button class="tk-var" data-var="'+v+'" data-t="tkNewText">#{'+v+'}</button>'; }).join('')
    + '</div>'
    + '<div class="bar-actions" style="margin-top:10px"><button class="btn" id="tkNewAdd">문구 추가하기</button></div></div>';

  var all = talkAllTpls();
  var cats = [];
  all.forEach(function(p){ if(cats.indexOf(p.cat)<0) cats.push(p.cat); });
  cats.forEach(function(cat){
    var arr = all.filter(function(p){ return p.cat===cat; });
    if(!arr.length) return;
    h += '<div class="panel"><h3>'+esc(cat)+'</h3>';
    arr.forEach(function(p){
      var c = talkCfgOf(p.key);
      var ta = 'tkT_'+p.key;
      h += '<div class="tk-tpl">'
        + '<div class="tk-tpl-h"><b>'+esc(p.name)+'</b>'
          + '<span class="pill" style="--c:'+(p.auto?'#4f46e5':'#94a3b8')+'">'+(p.auto?'자동':'수동')+'</span>'
          + (p.custom?'<span class="pill" style="--c:#0891b2">직접 등록</span>':'')
          + '<label class="tk-sw"><input type="checkbox" class="tk-on" data-k="'+p.key+'"'+(c.on?' checked':'')+'> 사용</label>'
          + (c.code?'<span class="vstat vstat-ok">코드 등록됨</span>':'<span class="vstat vstat-ing">코드 미입력</span>')
        + '</div>'
        + '<div class="muted" style="margin:4px 0 8px">'+esc(p.desc)+'</div>'
        + '<div class="form-grid">'
          + '<label>템플릿 코드<input class="tk-code" data-k="'+p.key+'" value="'+esc(c.code)+'" placeholder="비즈고에서 발급받은 코드"></label>'
          + '<label>강조 제목<input class="tk-title" data-k="'+p.key+'" value="'+esc(c.title)+'" placeholder="선택"></label>'
        + '</div>'
        + '<label>본문<textarea class="tk-text" id="'+ta+'" data-k="'+p.key+'" rows="7">'+esc(c.text)+'</textarea></label>'
        + '<div class="tk-vars">'
          + '<span class="muted">변수 넣기</span>'
          + (p.vars||['이름']).concat(['브랜드']).filter(function(v,i,a){return a.indexOf(v)===i;})
              .map(function(v){ return '<button class="tk-var" data-var="'+v+'" data-t="'+ta+'">#{'+v+'}</button>'; }).join('')
          + '<span class="tk-vhelp">누르면 본문 커서 자리에 들어갑니다</span>'
        + '</div>'
        + '<div class="form-grid">'
          + '<label>버튼 이름<input class="tk-bn" data-k="'+p.key+'" value="'+esc(c.btnName)+'" placeholder="선택 (최대 14자)"></label>'
          + '<label>버튼 주소<input class="tk-bu" data-k="'+p.key+'" value="'+esc(c.btnUrl)+'" placeholder="https://"></label>'
        + '</div>'
        + '<div class="bar-actions">'
          + '<button class="btn ghost rptmini tk-prev" data-k="'+p.key+'">미리보기</button>'
          + '<button class="btn ghost rptmini tk-copy" data-k="'+p.key+'">본문 복사</button>'
          + (p.custom
              ? '<button class="btn ghost rptmini del tk-del" data-k="'+p.key+'">이 문구 삭제</button>'
              : '<button class="btn ghost rptmini tk-reset" data-k="'+p.key+'">기본 문구로 되돌리기</button>')
        + '</div></div>';
    });
    h += '</div>';
  });
  root.innerHTML = h;

  var g=function(id){ return document.getElementById(id); };
  var bind=function(sel, field){
    $$('#tkPane '+sel).forEach(function(i){
      i.onchange=function(){ var o={}; o[field]=(i.type==='checkbox'?i.checked:i.value); talkSaveCfg(i.dataset.k, o); toast('저장되었습니다'); };
    });
  };
  bind('.tk-code','code'); bind('.tk-title','title'); bind('.tk-text','text');
  bind('.tk-bn','btnName'); bind('.tk-bu','btnUrl'); bind('.tk-on','on');

  /* 변수 넣기 — 커서 자리에 끼워 넣습니다 */
  $$('#tkPane .tk-var').forEach(function(b){
    b.onclick=function(ev){
      if(ev) ev.preventDefault();
      var ta=document.getElementById(b.dataset.t); if(!ta) return;
      var tag='#{'+b.dataset.var+'}';
      var st=ta.selectionStart!=null?ta.selectionStart:ta.value.length;
      var en=ta.selectionEnd!=null?ta.selectionEnd:st;
      ta.value = ta.value.slice(0,st) + tag + ta.value.slice(en);
      ta.focus();
      var pos=st+tag.length;
      try{ ta.setSelectionRange(pos,pos); }catch(e){}
      if(ta.classList.contains('tk-text')){ talkSaveCfg(ta.dataset.k, {text:ta.value}); }
    };
  });
  /* 미리보기 */
  $$('#tkPane .tk-prev').forEach(function(b){
    b.onclick=function(){
      var k=b.dataset.k, cfg=talkCfgOf(k, true);
      var s0=(acf(DB.students)||[]).filter(function(x){return !x.testOnly;})[0];
      var V = s0 ? (talkBuild(k, s0, {제목:'예시 제목', 내용:'예시 내용입니다.', 일시:todayStr(), 시간:'오전 2시~4시', 주제:'예시 주제'}) || {'브랜드':talkBrand(),'이름':s0.name}) : {'브랜드':talkBrand(),'이름':'홍길동'};
      var body = talkFill(cfg.text, V);
      openModal(el('<div class="form"><h3>미리보기 — '+esc(talkTpl(k)?talkTpl(k).name:k)+'</h3>'
        + '<div class="vp-meta">'+(s0?esc(s0.name)+' 기준':'예시')+' · 남은 변수는 값이 없어 그대로 보입니다</div>'
        + '<div class="tk-bubble">'+esc(body).replace(/\n/g,'<br>')
        + (cfg.btnName?('<div class="tk-btn">'+esc(cfg.btnName)+'</div>'):'')+'</div>'
        + '<div class="modal-actions"><button class="btn" id="tkp_x">닫기</button></div></div>'));
      g('tkp_x').onclick=closeModal;
    };
  });
  $$('#tkPane .tk-copy').forEach(function(b){
    b.onclick=function(){
      var c=talkCfgOf(b.dataset.k, true);
      if(typeof OPS!=='undefined' && OPS.copy) OPS.copy(c.text); else { try{ navigator.clipboard.writeText(c.text); }catch(e){} }
      toast('본문을 복사했습니다 — 비즈고 템플릿 등록에 붙여넣으세요');
    };
  });
  $$('#tkPane .tk-reset').forEach(function(b){
    b.onclick=function(){
      var p=talkTpl(b.dataset.k); if(!p) return;
      talkSaveCfg(b.dataset.k, { text:p.text, title:p.title, btnName:p.btnName });
      toast('기본 문구로 되돌렸습니다'); talkPane();
    };
  });
  $$('#tkPane .tk-del').forEach(function(b){
    b.onclick=function(){
      var k=b.dataset.k, tp=talkTpl(k);
      if(!confirm('「'+(tp?tp.name:k)+'」 문구를 삭제할까요?')) return;
      var t2=talkStore();
      t2.custom=(t2.custom||[]).filter(function(c){ return c.key!==k; });
      delete t2.tpl[k];
      t2.queue=(t2.queue||[]).filter(function(q){ return q.key!==k; });
      save(); toast('삭제했습니다'); talkCenter();
    };
  });
  /* 공통 꼬리말 저장 */
  if(g('tkFootSave')) g('tkFootSave').onclick=function(){
    var t2=talkStore(); t2.footer=g('tkFoot').value.trim(); t2._u=Date.now(); save();
    toast(t2.footer ? '꼬리말을 저장했습니다 — 모든 본문 끝에 붙습니다' : '꼬리말을 지웠습니다');
    talkPane();
  };
  /* 새 문구 추가 */
  if(g('tkNewAdd')) g('tkNewAdd').onclick=function(){
    var nm=(g('tkNewName').value||'').trim();
    var tx=(g('tkNewText').value||'').trim();
    if(!nm){ toast('문구 이름을 입력해 주세요'); return; }
    if(!tx){ toast('본문을 입력해 주세요'); return; }
    var t2=talkStore();
    t2.custom = t2.custom || [];
    if(t2.custom.some(function(c){ return c.name===nm; })){ toast('같은 이름의 문구가 이미 있습니다'); return; }
    t2.custom.push({
      key:'my'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),
      name:nm, cat:(g('tkNewCat').value||'직접 등록').trim(), text:tx, title:'', btnName:'', _u:Date.now()
    });
    t2._u=Date.now(); save();
    toast('문구를 추가했습니다 — 비즈고에 템플릿을 등록하고 코드를 입력하면 발송할 수 있습니다');
    talkPane();
  };
}

/* --- 발송 이력 --- */
function talkPaneLog(root){
  var t=talkStore();
  root.innerHTML='<div class="panel"><h3>발송 이력</h3><div class="muted">불러오는 중…</div></div>';
  fetch('/api/kakao/log', { headers:eHdr() }).then(function(r){return r.json();}).then(function(j){
    TALK_LOG=(j&&j.log)||[];
    var svr=TALK_LOG.filter(function(x){ return x.kind!=='상담톡수신'; });
    var h='<div class="panel"><h3>학생별 발송 내역 <small class="muted">(최근 500건)</small></h3>';
    if(!t.sent.length) h+='<div class="muted">아직 발송한 내역이 없습니다.</div>';
    else h+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>발송 시각</th><th>종류</th><th>학생</th><th>연락처</th><th>상태</th><th>결과</th></tr></thead><tbody>'
      + t.sent.slice(0,200).map(function(x){
          return '<tr><td>'+esc(x.sentAt||'')+'</td><td>'+esc(x.name||'')+'</td><td><b>'+esc(x.sname||'')+'</b></td><td>'+esc(x.phone||'')+'</td>'
            +'<td>'+(x.status==='발송'?'<span class="vstat vstat-ok">발송</span>':'<span class="vstat vstat-ing" style="color:#ef4444">실패</span>')+'</td>'
            +'<td class="muted">'+esc(x.result||'')+'</td></tr>'; }).join('')
      +'</tbody></table></div>';
    h+='</div><div class="panel"><h3>서버 발송 기록 <small class="muted">(비즈고 응답)</small></h3>';
    if(!svr.length) h+='<div class="muted">서버에 기록된 발송이 없습니다.</div>';
    else h+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>시각</th><th>종류</th><th>템플릿 코드</th><th>건수</th><th>결과</th></tr></thead><tbody>'
      + svr.slice(0,100).map(function(x){
          var okN=(x.results||[]).filter(function(r){return r.ok;}).length;
          return '<tr><td>'+esc(String(x.at||'').slice(0,16).replace('T',' '))+'</td><td>'+esc(x.kind||'')+'</td><td>'+esc(x.tpl||'')+'</td>'
            +'<td>'+(x.count||0)+'</td><td>'+(x.ok?('<span class="vstat vstat-ok">성공 '+okN+'건</span>'+(x.sandbox?' <span class="pill" style="--c:#d97706">테스트망</span>':'')):('<span class="muted" style="color:#ef4444">'+esc(x.error||'실패')+'</span>'))+'</td></tr>'; }).join('')
      +'</tbody></table></div>';
    h+='</div>';
    root.innerHTML=h;
  }).catch(function(){
    root.innerHTML='<div class="panel"><h3>발송 이력</h3><div class="muted">서버에 연결하지 못해 이력을 불러오지 못했습니다.</div></div>';
  });
}

/* --- 상담톡 --- */
function talkPaneCs(root){
  var hook=(location.origin||'')+'/api/kakao/cs/hook';
  root.innerHTML='<div class="panel"><h3>상담톡 연결</h3>'
    +'<div class="note ag-note">상담톡은 학생이 카카오톡 채널에서 보낸 메시지를 받아 상담하는 기능입니다. 비즈고 콘솔에서 아래 주소를 <b>수신 URL(webhook)</b>로 등록하면 학생이 보낸 메시지가 이 화면에 쌓입니다.</div>'
    +'<label>수신 URL<input id="tkCsUrl" value="'+esc(hook)+'" readonly></label>'
    +'<div class="bar-actions" style="margin-top:8px"><button class="btn ghost rptmini" id="tkCsCopy">주소 복사</button></div>'
    +'<div class="note-box" style="margin-top:10px"><b>알림톡에서 상담으로 바로 넘기려면</b><br>[템플릿] 탭의 버튼 이름을 그대로 두고, 비즈고 템플릿 등록 시 버튼 종류를 <b>상담톡 전환(BC)</b>으로 지정하면 학생이 버튼 한 번으로 상담을 시작할 수 있습니다.</div>'
    +'</div><div class="panel"><h3>받은 상담 메시지</h3><div id="tkCsList" class="muted">불러오는 중…</div></div>';
  var g=document.getElementById('tkCsCopy');
  if(g) g.onclick=function(){ try{ navigator.clipboard.writeText(hook); }catch(e){} toast('수신 URL을 복사했습니다'); };
  fetch('/api/kakao/log', { headers:eHdr() }).then(function(r){return r.json();}).then(function(j){
    var cs=((j&&j.log)||[]).filter(function(x){ return x.kind==='상담톡수신'; });
    var box=document.getElementById('tkCsList'); if(!box) return;
    if(!cs.length){ box.innerHTML='아직 받은 상담 메시지가 없습니다. 비즈고 콘솔에 수신 URL을 등록하면 이곳에 표시됩니다.'; return; }
    box.className='';
    box.innerHTML='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>받은 시각</th><th>보낸 사람</th><th>내용</th></tr></thead><tbody>'
      + cs.slice(0,100).map(function(x){
          var b=x.cs||{};
          var who=b.userKey||b.user||b.from||'-';
          var msg=b.text||b.message||(b.content&&b.content.text)||JSON.stringify(b).slice(0,120);
          return '<tr><td>'+esc(String(x.at||'').slice(0,16).replace('T',' '))+'</td><td>'+esc(String(who).slice(0,20))+'</td><td>'+esc(String(msg).slice(0,200))+'</td></tr>';
        }).join('')+'</tbody></table></div>';
  }).catch(function(){});
}

/* --- 설정 --- */
function talkPaneCfg(root){
  root.innerHTML='<div class="panel"><h3>비즈고 연결 설정</h3><div class="muted">불러오는 중…</div></div>';
  talkLoadCfg(function(c){
    if(!c){ root.innerHTML='<div class="panel"><h3>비즈고 연결 설정</h3><div class="muted">서버에 연결하지 못했습니다. 서버를 켠 상태에서 다시 시도해 주세요.</div></div>'; return; }
    var h='<div class="panel"><h3>비즈고 연결 설정</h3>'
      +'<div class="note ag-note">API 키는 서버에만 저장되며 이 화면에는 일부만 표시됩니다. 브라우저나 파일에는 남지 않습니다.</div>'
      +'<div class="form-grid">'
        +'<label>API 키<input id="tkApi" value="'+esc(c.apiKeyMasked||'')+'" placeholder="새 키를 입력하면 교체됩니다"></label>'
        +'<label>발신프로필 키 (senderKey)<input id="tkSender" value="'+esc(c.senderKey||'')+'" placeholder="카카오톡 채널 발신프로필 키"></label>'
      +'</div>'
      +'<label class="tk-sw"><input type="checkbox" id="tkSbx"'+(c.sandbox?' checked':'')+'> 테스트망(샌드박스)으로 보내기 — 실제 카카오톡으로 가지 않습니다</label>'
      +'<div class="form-grid" style="margin-top:8px">'
        +'<label class="tk-sw"><input type="checkbox" id="tkSmsOn"'+(c.sms&&c.sms.enabled?' checked':'')+'> 알림톡이 실패하면 문자로 대신 보내기</label>'
        +'<label>문자 발신번호<input id="tkSmsFrom" value="'+esc((c.sms&&c.sms.from)||'')+'" placeholder="사전 등록된 발신번호"></label>'
      +'</div>'
      +'<div class="muted" style="margin-top:8px">현재 주소: '+esc(c.base||'')+(c.updatedAt?(' · 최근 저장 '+esc(String(c.updatedAt).slice(0,16).replace('T',' '))):'')+'</div>'
      +'<div class="bar-actions" style="margin-top:12px"><button class="btn" id="tkCfgSave">저장</button><button class="btn ghost" id="tkPing">연결 확인</button></div>'
      +'<div id="tkPingOut" style="margin-top:10px"></div>'
      +'</div>'
      +'<div class="panel"><h3>연동 전 확인할 것</h3>'
      +'<ol class="tk-steps">'
        +'<li>비즈고 콘솔에서 <b>카카오톡 채널을 발신프로필로 등록</b>하고 senderKey를 받아 위에 입력합니다.</li>'
        +'<li>[템플릿] 탭의 본문을 복사해 비즈고에 <b>템플릿을 등록하고 승인</b>받습니다. 승인까지 보통 영업일 기준 며칠 걸립니다.</li>'
        +'<li>승인 후 발급된 <b>템플릿 코드</b>를 [템플릿] 탭 각 항목에 입력합니다.</li>'
        +'<li>비즈고 V2는 <b>서버 IP 등록(ACL)</b>이 필수입니다. 이 LMS 서버의 공인 IP를 콘솔에 등록해 주세요.</li>'
        +'<li>[연결 확인]으로 인증이 되는지 본 뒤, 테스트망을 끄고 실제 발송을 시작합니다.</li>'
      +'</ol></div>';
    root.innerHTML=h;
    var g=function(id){ return document.getElementById(id); };
    g('tkCfgSave').onclick=function(){
      var body={ senderKey:g('tkSender').value, sandbox:g('tkSbx').checked,
                 sms:{ enabled:g('tkSmsOn').checked, from:g('tkSmsFrom').value } };
      var ak=g('tkApi').value;
      if(ak && ak.indexOf('•')<0) body.apiKey=ak;
      fetch('/api/kakao/config',{method:'PUT',headers:eHdr({'content-type':'application/json'}),body:JSON.stringify(body)})
        .then(function(r){return r.json();}).then(function(j){
          if(j&&j.ok){ toast('저장되었습니다'); TALK_CFG=j.config; talkPane(); }
          else toast('저장하지 못했습니다');
        }).catch(function(){ toast('서버에 연결하지 못했습니다'); });
    };
    g('tkPing').onclick=function(){
      g('tkPingOut').innerHTML='<div class="muted">확인 중…</div>';
      fetch('/api/kakao/ping',{headers:eHdr()}).then(function(r){return r.json();}).then(function(j){
        g('tkPingOut').innerHTML = j&&j.ok
          ? '<div class="note-box" style="border-color:#bbf7d0;background:#f0fdf4"><b style="color:#059669">연결 정상</b> — 인증에 성공했습니다 ('+esc(j.base||'')+')</div>'
          : '<div class="note-b bad"><div class="nb-t"><b>연결 실패</b>'+esc((j&&(j.error||j.detail))||'알 수 없는 오류')+'</div></div>';
      }).catch(function(){ g('tkPingOut').innerHTML='<div class="muted">서버에 연결하지 못했습니다.</div>'; });
    };
  });
}

/* 하루 한 번 자동으로 대상을 모아 대기함에 담아둡니다 (발송은 관리자가 확인 후 진행) */
function talkAutoScan(){
  try{
    if(!CURRENT || CURRENT.role!=='admin') return;
    var t=talkStore();
    if(String(t.lastScan||'').slice(0,10) === todayStr()) return;
    talkScan(true);
  }catch(e){}
}
