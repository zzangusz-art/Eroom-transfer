/* ===================== 학습 진단 리포트 =====================
   테스트 기록만 보지 않고, 그 학생이 남긴 학습 흔적을 전부 모아서 봅니다.
   강의 수강 · 평가 성적 · 단어 · 숙어 · 과제 · 학습 루틴 · 오답 · 학교별 문항까지. */

/* 최근 N일 동안의 학습 활동 */
function rptRecent(sid, days){
  days = days || 28;
  var from = addDays(-days, todayStr());
  var out = { days:days, from:from, testDays:{}, tests:0, questions:0, right:0,
              wordDays:0, wordCount:0, games:0, hwDays:0, lecDays:{}, routineDone:0, routineTotal:0 };

  (DB.sessions||[]).forEach(function(s){
    if(!s || s.studentId!==sid || (s.date||'') < from) return;
    out.tests++; out.testDays[s.date]=1;
    out.questions += (s.total||0); out.right += (s.score||0);
  });
  var v = (DB.vocab||{})[sid] || {};
  Object.keys(v.days||{}).forEach(function(d){
    if(d < from) return;
    var n=((v.days[d]||{}).done||[]).length;
    if(n){ out.wordDays++; out.wordCount += n; }
  });
  (v.games||[]).forEach(function(g){ if(String(g&&g.at||'').slice(0,10) >= from) out.games++; });
  (DB.submissions||[]).forEach(function(x){ if(x && x.studentId===sid && (x.date||'') >= from) out.hwDays++; });
  var wm=(DB.watch||{})[sid]||{};
  Object.keys(wm).forEach(function(lid){ var r=wm[lid]; if(r && r.lastAt && r.lastAt>=from) out.lecDays[r.lastAt]=1; });

  /* 학습 루틴 이행률 (최근 14일) */
  var d2 = new Date();
  for(var i=0;i<14;i++){
    var ds = todayStr(d2);
    try{
      var list = (typeof dailyFor==='function') ? dailyFor(ds, sid) : [];
      list.forEach(function(x){ out.routineTotal++; if(dailyDone(sid, ds, x.key)) out.routineDone++; });
    }catch(e){}
    d2.setDate(d2.getDate()-1);
  }
  out.testDayN = Object.keys(out.testDays).length;
  out.lecDayN  = Object.keys(out.lecDays).length;
  out.rate = out.questions ? Math.round(out.right/out.questions*100) : 0;
  out.routineRate = out.routineTotal ? Math.round(out.routineDone/out.routineTotal*100) : null;
  return out;
}

/* 평가(시험지) 성적 — 유형별로 묶습니다 */
function rptExams(sid){
  var rows=[], byType={};
  (acf(DB.assessments)||[]).forEach(function(a){
    var r = ((DB.scores||{})[a.id]||{})[sid];
    if(!r || r.score==null) return;
    if(typeof isCleared==='function' && isCleared(r)) return;
    var max = a.maxScore || 100;
    var pctv = max ? Math.round((+r.score)/max*100) : 0;
    var row = { id:a.id, type:a.type, title:a.title, date:a.openDate||a.dueDate||'', score:+r.score, max:max, pct:pctv };
    rows.push(row);
    var t = byType[a.type] || (byType[a.type]={ type:a.type, n:0, sum:0, last:null });
    t.n++; t.sum += pctv;
    if(!t.last || (row.date||'') >= (t.last.date||'')) t.last = row;
  });
  rows.sort(function(x,y){ return (y.date||'').localeCompare(x.date||''); });
  var types = Object.keys(byType).map(function(k){
    var t=byType[k]; t.avg = Math.round(t.sum/t.n); return t;
  }).sort(function(x,y){ return y.n - x.n; });
  var all = rows.length ? Math.round(rows.reduce(function(a,b){ return a+b.pct; },0)/rows.length) : null;
  /* 최근 3회 vs 그 이전 평균 — 오르고 있는지 */
  var trend = null;
  if(rows.length >= 4){
    var recent = rows.slice(0,3), older = rows.slice(3);
    var rAvg = Math.round(recent.reduce(function(a,b){return a+b.pct;},0)/recent.length);
    var oAvg = Math.round(older.reduce(function(a,b){return a+b.pct;},0)/older.length);
    trend = { recent:rAvg, older:oAvg, diff:rAvg-oAvg };
  }
  return { rows:rows, types:types, avg:all, trend:trend };
}

/* 자주 틀리는 문항 · 유형 */
function rptWrong(sid){
  var wb = (typeof wrongBook==='function') ? wrongBook(sid) : [];
  var list = (wb||[]).filter(function(x){ return x && x.wrong>0; });
  var repeat = list.filter(function(x){ return x.wrong>=2; });
  var unfixed = list.filter(function(x){ return x.lastCorrect===false; });          /* 전체 오답 중 아직 못 고친 것 */
  var repeatUnfixed = repeat.filter(function(x){ return x.lastCorrect===false; });  /* 반복 오답 중 못 고친 것 */
  var byTag = {};
  list.forEach(function(x){
    var nm = (SECTIONS[x.section]||x.section||'기타') + (x.tag ? (' · '+x.tag) : '');
    var e = byTag[nm] || (byTag[nm]={ name:nm, wrong:0 });
    e.wrong += x.wrong;
  });
  var tags = Object.keys(byTag).map(function(k){ return byTag[k]; })
              .sort(function(a,b){ return b.wrong-a.wrong; }).slice(0,5);
  return { total:list.length, repeat:repeat.length, unfixed:unfixed.length,
           repeatUnfixed:repeatUnfixed.length, tags:tags };
}

/* 단어 · 숙어 진도 */
function rptVocab(sid){
  var v=(DB.vocab||{})[sid]||{}, i=(DB.idiom||{})[sid]||{};
  var wKnown=Object.keys(v.known||{}).length, wMiss=Object.keys(v.miss||{}).length;
  var iKnown=Object.keys(i.known||{}).length, iMiss=Object.keys(i.miss||{}).length;
  var wTotal=(typeof WORDS!=='undefined')?WORDS.length:0;
  var iTotal=(typeof IDIOMS!=='undefined')?IDIOMS.length:0;
  var best=0; (v.games||[]).forEach(function(g){ if((g&&g.score||0)>best) best=g.score; });
  return { wKnown:wKnown, wMiss:wMiss, wTotal:wTotal, wRate: wTotal?Math.round(wKnown/wTotal*100):0,
           iKnown:iKnown, iMiss:iMiss, iTotal:iTotal, iRate: iTotal?Math.round(iKnown/iTotal*100):0,
           games:(v.games||[]).length, best:best };
}

/* 과제 제출 */
function rptHomework(sid){
  var subs=(DB.submissions||[]).filter(function(x){ return x && x.studentId===sid; });
  var graded=subs.filter(function(x){ return x.status==='graded'; }).length;
  var redo=subs.filter(function(x){ return x.status==='redo'; }).length;
  return { total:subs.length, graded:graded, redo:redo, last:(subs.slice(-1)[0]||{}).date||'' };
}

/* 목표 대학 문항 정답률 */
function rptGoal(sid, stu){
  if(typeof admMyRate!=='function' || !stu || !stu.goalSchool) return null;
  try{
    var r = admMyRate(stu.goalSchool, sid);
    var cut = (typeof admCut==='function') ? admCut(stu.goalSchool) : null;
    return { uni:stu.goalSchool, rate:r.rate, n:r.n, from:r.from, cut:cut,
             gap: (cut!=null) ? (cut - r.rate) : null };
  }catch(e){ return null; }
}

/* ===================== 이룸편입 LMS · 학습 진단 리포트 (PDF) ===================== */
function reportData(studentId){
 const s = acf(DB.students).find(function(x){return x.id===studentId;}) || {};
 const lt = acf(DB.levelTests).filter(function(t){return t.studentId===studentId;}).slice(-1)[0];
 const sess = DB.sessions.filter(function(x){return x.studentId===studentId;});
 const secRates={};
 for(const k of Object.keys(SECTIONS)){ let r=0,t=0; sess.forEach(function(se){(se.detail||[]).forEach(function(d){ if(d.section===k){t++; if(d.correct)r++;} });}); if(lt&&t===0&&lt.sections&&lt.sections[k]!=null){ r=lt.sections[k]; t=10; } secRates[k]= t?Math.round(r/t*100):0; }
 const overall = sess.length ? Math.round(sess.reduce(function(a,b){return a+b.rate;},0)/sess.length) : (lt?lt.rate:0);
 const wk = AI.weakness(secRates);
 const att = attitude(studentId);
 const da = AI.detailAnalysis(studentId);
 const cls = s.cls || classOf(overall);
 const plan = AI.studyPlan(secRates, cls);
 const match = AI.schoolMatch(overall, s.goalSchool);
 const ins = acf(DB.instructors).find(function(i){return i.id===s.instructorId;});
 /* 테스트 말고도 남긴 학습 흔적을 모두 모읍니다 */
 const vodSum = (typeof VOD!=='undefined') ? VOD.summary(studentId) : {total:0,done:0,once:0,twice:0,rate:0};
 const exams  = rptExams(studentId);
 const recent = rptRecent(studentId, 28);
 const wrong  = rptWrong(studentId);
 const voca   = rptVocab(studentId);
 const hw     = rptHomework(studentId);
 const goal   = rptGoal(studentId, s);
 const streak = (typeof OPS!=='undefined') ? OPS.streak(studentId) : 0;
 return { s:s, lt:lt, sess:sess, secRates:secRates, overall:overall, wk:wk, att:att, da:da, cls:cls,
          plan:plan, match:match, teacher: ins?ins.name:'-',
          vod:vodSum, exams:exams, recent:recent, wrong:wrong, voca:voca, hw:hw, goal:goal, streak:streak };
}

var EXPERT_SYS='당신은 한국 편입 영어를 15년 가르친 강사입니다. 주어진 진단 데이터만 사용해 한국어로 짧게 씁니다. '
 + '규칙: (1) 세 문단, 각 문단 두세 문장. (2) 문단 앞에 【 】 같은 라벨을 붙이지 마세요. '
 + '(3) 숫자를 반드시 넣고, 없는 숫자는 지어내지 마세요. (4) "판단됩니다 / 핵심 과제입니다 / 권장합니다 / 바람직합니다" 같은 표현을 쓰지 마세요. '
 + '(5) 학생에게 말하듯 담백하게 씁니다. 전체 300~400자.';
function expertPrompt(d){ return '[진단 데이터]\n'+(typeof LLM!=='undefined'?LLM.context(d.s.id):'')+'\n목표대학: '+(d.s.goalSchool||'미정')+' '+(d.s.goalDept||'')+'\n\n위 데이터로 코멘트를 쓰세요.'; }

/* 가장 낮은 세부 요소 n개 */
function rptWeakSubs(d, n){
  var subs=[];
  Object.keys(SECTIONS).forEach(function(k){
    var dd=d.da[k]; if(!dd) return;
    dd.rows.forEach(function(r){ if(r.total>0) subs.push({ name:SECTIONS[k]+' '+r.sub, sec:SECTIONS[k], sub:r.sub, rate:r.rate, total:r.total }); });
  });
  subs.sort(function(a,b){ return a.rate-b.rate; });
  return subs.slice(0, n||2);
}
/* 한 영역을 목표치까지 올렸을 때 전체가 몇 %p 오르는지 (네 영역 동일 비중 가정) */
function rptLift(from, to){ return Math.max(0, Math.round((to-from)/4)); }

/* 진단 문구 — 테스트·강의·평가·단어·과제·루틴을 모두 보고 씁니다.
   라벨 없이, 숫자를 앞세워 짧게. */
function expertComment(d){
  var out=[];
  var ov=d.overall;
  var strongSec=SECTIONS[d.wk.strongest.sec], weakSec=SECTIONS[d.wk.weakest.sec];
  var sr=d.wk.strongest.rate, wr=d.wk.weakest.rate, gap=Math.abs(sr-wr);
  var r=d.recent, ex=d.exams;

  /* 1. 지금 어디에 있나 — 문제 정답률 + 평가 성적을 같이 */
  var t1='';
  if(d.sess.length){
    t1='테스트 '+d.sess.length+'회를 봤고 전체 정답률은 '+pct(ov)+'입니다. '
      + strongSec+'가 '+pct(sr)+'로 가장 높고 '+weakSec+'가 '+pct(wr)+'로 가장 낮습니다.';
    if(gap>=25) t1 += ' 두 영역이 '+gap+'%p 벌어져 있어 시험마다 점수가 흔들립니다.';
    else if(gap<12) t1 += ' 네 영역이 고르게 나옵니다.';
  } else {
    t1='아직 테스트 기록이 없어 영역별 실력은 레벨테스트 결과로만 봤습니다.';
  }
  if(ex.avg!=null){
    t1 += ' 시험지로 본 평가는 '+ex.rows.length+'개 응시에 평균 '+pct(ex.avg)+'입니다';
    if(ex.trend){
      t1 += (Math.abs(ex.trend.diff) < 3
        ? ' — 최근 3회와 그 이전이 비슷한 수준입니다.'
        : (ex.trend.diff>0 ? (' — 최근 3회가 그 이전보다 '+ex.trend.diff+'%p 올랐습니다.')
                           : (' — 최근 3회가 그 이전보다 '+Math.abs(ex.trend.diff)+'%p 떨어졌습니다.')));
    } else t1 += '.';
  }
  out.push(t1);

  /* 2. 얼마나 하고 있나 — 실제 활동량 */
  var t2parts=[];
  if(d.vod.total){
    var lateN = Math.max(0, d.vod.twice - d.vod.done);
    var lec = '강의는 '+d.vod.total+'강 중 '+d.vod.twice+'강을 2회독했습니다';
    if(d.vod.done === d.vod.twice) lec += '(모두 기한 안에 인정)';
    else if(d.vod.done === 0)      lec += '(다만 모두 수강기한을 넘겨 인정은 0강)';
    else                           lec += '(그중 '+d.vod.done+'강만 기한 안에 인정, '+lateN+'강은 지연)';
    t2parts.push(lec);
  }
  if(r.testDayN) t2parts.push('최근 '+r.days+'일 중 '+r.testDayN+'일 문제를 풀었고 '+r.questions+'문항을 봤습니다');
  if(r.wordDays) t2parts.push('단어는 '+r.wordDays+'일 '+r.wordCount+'개'+(r.games?(', 산성비 '+r.games+'판'):''));
  if(d.voca.wKnown) t2parts.push('지금까지 외운 단어 '+d.voca.wKnown+'개'+(d.voca.iKnown?(' · 숙어 '+d.voca.iKnown+'개'):''));
  if(d.hw.total) t2parts.push('과제 '+d.hw.total+'건 제출'+(d.hw.redo?(' (재제출 요청 '+d.hw.redo+'건)'):''));
  if(r.routineRate!=null) t2parts.push('학습 루틴 이행률 '+pct(r.routineRate)+'(최근 2주)');
  var t2 = t2parts.length ? (t2parts.join('. ')+'.') : '아직 학습 기록이 많지 않습니다. 강의 수강과 단어부터 쌓으면 다음 리포트에서 흐름이 보입니다.';
  if(d.streak>=3) t2 += ' 연속 '+d.streak+'일 학습 중입니다.';
  if(d.vod.total && d.vod.twice < d.vod.total*0.6) t2 += ' 아직 2회독을 못 채운 강의가 '+(d.vod.total-d.vod.twice)+'강 남아 진도부터 따라잡아야 합니다.';
  else if(d.vod.total && d.vod.done < d.vod.twice*0.6) t2 += ' 듣기는 했지만 수강기한을 넘긴 강의가 많아 이수 인정이 덜 됐습니다.';
  if(r.routineRate!=null && r.routineRate<50) t2 += ' 매일 하기로 한 루틴이 절반도 지켜지지 않고 있습니다.';
  out.push(t2);

  /* 3. 목표까지 얼마나 */
  var t3;
  if(d.goal && d.goal.cut!=null && d.goal.n){
    if(d.goal.gap>0){
      t3='목표 '+d.goal.uni+' 기준 합격선 추정은 '+pct(d.goal.cut)+'인데, '
        + (d.goal.from==='school' ? (d.goal.uni+' 문항 '+d.goal.n+'개 기준 ') : '전체 기준 ')
        + pct(d.goal.rate)+'이라 '+d.goal.gap+'%p 남았습니다.';
      var lift = rptLift(wr, Math.min(100, wr+25));
      if(lift>0) t3 += ' '+weakSec+'만 '+pct(Math.min(100,wr+25))+'까지 올려도 전체가 약 '+lift+'%p 오릅니다.';
    } else {
      t3='목표 '+d.goal.uni+' 합격선 추정치는 이미 넘겼습니다. 남은 것은 제한 시간 안에 이 점수를 유지하는 연습입니다.';
    }
  } else if(d.match.goalNote){
    t3 = d.match.goalNote.gap>0
      ? ('목표 '+d.match.goalNote.uni+'까지 '+d.match.goalNote.gap+'%p 남았습니다.')
      : ('목표 '+d.match.goalNote.uni+' 기준 정답률은 넘겼습니다.');
    t3 += ' 그 학교 기출 문항을 아직 풀지 않아, 학교별 빈출에서 한 세트 풀어 보면 더 정확해집니다.';
  } else {
    t3='목표 대학을 정해 두면 합격선까지 몇 %p 남았는지 계산해 드립니다.';
  }
  out.push(t3);

  /* 4. 무엇부터 — 세부 요소 + 반복 오답 */
  var ws=rptWeakSubs(d,2), t4;
  if(ws.length>=2){
    t4='먼저 손볼 곳은 '+ws[0].sec+'의 '+ws[0].sub+' '+pct(ws[0].rate)+', '
      + ws[1].sec+'의 '+ws[1].sub+' '+pct(ws[1].rate)+' 입니다.';
  } else if(ws.length===1){
    t4='먼저 손볼 곳은 '+ws[0].sec+'의 '+ws[0].sub+' '+pct(ws[0].rate)+' 입니다.';
  } else {
    t4='아직 푼 문항이 적어 약한 요소를 짚기 어렵습니다. 영역별 테스트를 두세 번 보면 여기에 표시됩니다.';
  }
  if(d.wrong.repeat) t4 += ' 두 번 이상 틀린 문항이 '+d.wrong.repeat+'개이고, 그중 '+d.wrong.repeatUnfixed+'개는 마지막에도 틀렸습니다.'
    + ' 아직 못 고친 오답은 모두 '+d.wrong.unfixed+'문항입니다. 오답노트부터 정리하는 것이 가장 빠릅니다.';
  if(d.voca.wMiss>=30) t4 += ' 틀린 단어가 '+d.voca.wMiss+'개 쌓여 있어 데일리 단어에서 계속 다시 나옵니다.';
  if(d.att.score!=null && d.att.score<70) t4 += ' 출결이 '+pct(d.att.score)+'인 점도 같이 챙겨야 합니다.';
  out.push(t4);

  return out.join('\n\n');
}

function buildReportNode(d, expertCmt){
 const today = todayStr();
 const OK='#0f766e', WARN='#b45309', BAD='#b91c1c', DIM='#94a3b8', INK='#0f172a', LINE='#dfe3e8';
 function tone(v){ return v>=80?OK : v>=60?WARN : BAD; }
 function bar(label, v, forceCol){
   const c = forceCol || tone(v);
   return '<div class="r-row"><span class="r-lab">'+label+'</span>'
     + '<div class="r-bar"><div style="width:'+Math.max(0,Math.min(100,v))+'%;background:'+c+'"></div></div>'
     + '<span class="r-pct" style="color:'+c+'">'+pct(v)+'</span></div>';
 }
 const secBars = Object.keys(SECTIONS).map(function(k){ return bar(SECTIONS[k], d.secRates[k]); }).join('')
   + (d.att.score!=null ? bar('출결', d.att.score) : '');

 /* 세부 요소 */
 let detail='';
 for(const sec of Object.keys(SECTIONS)){
   const dd=d.da[sec];
   const rows = dd ? dd.rows : (SUBELEMENTS[sec]||[]).map(function(x){return {sub:x,right:0,total:0,rate:0};});
   detail += '<div class="r-sg"><div class="r-sgh"><b>'+SECTIONS[sec]+'</b>'
     + (dd&&dd.total ? '<span class="r-sgr">'+pct(dd.rate)+' · '+dd.total+'문항</span>'
                     : '<span class="r-sgr r-muted">아직 안 풂</span>')+'</div>';
   detail += rows.map(function(r){
     const empty=r.total===0;
     const c = empty ? '#e2e8f0' : tone(r.rate);
     return '<div class="r-erow"><span class="r-elab">'+esc(r.sub)+'</span>'
       + '<div class="r-ebar"><div style="width:'+(empty?0:r.rate)+'%;background:'+c+'"></div></div>'
       + '<span class="r-ep" style="color:'+(empty?DIM:c)+'">'+(empty?'-':pct(r.rate))+'</span></div>';
   }).join('');
   detail += '</div>';
 }

 /* 먼저 손볼 것 */
 const weak2 = rptWeakSubs(d, 3);
 const todoHtml = weak2.length
   ? '<ol class="r-todo">'+weak2.map(function(x,i){
       return '<li><span class="r-no">'+(i+1)+'</span>'
            + '<b>'+esc(x.sub)+'</b><u>'+esc(x.sec)+'</u>'
            + '<i style="color:'+tone(x.rate)+'">'+pct(x.rate)+'</i>'
            + '<em>'+x.total+'문항</em></li>'; }).join('')+'</ol>'
   : '<div class="r-muted">테스트를 두세 번 보면 약한 요소가 여기에 표시됩니다.</div>';

 const schools = d.match.list.slice(0,9).map(function(u){
   return '<span class="r-chip r-b-'+u.band+'">'+esc(u.uni)+'<i>'+u.band+' · 경쟁률 '+u.ratio+'</i></span>'; }).join('');
 const planHtml = d.plan.plan.map(function(p){
   return '<div class="r-pd"><b>'+p.day+'</b><span>'+SECTIONS[p.sec]+'</span><i>'+esc(p.focus)+' '+p.qty+'문항</i></div>'; }).join('');
 const ltLine = d.lt
   ? ('레벨테스트 '+d.lt.score+'/40 · 어휘 '+((d.lt.sections||{}).vocab!=null?d.lt.sections.vocab:'-')
      +' 문법 '+((d.lt.sections||{}).grammar!=null?d.lt.sections.grammar:'-')
      +' 독해 '+((d.lt.sections||{}).reading!=null?d.lt.sections.reading:'-')
      +' 논리 '+((d.lt.sections||{}).logic!=null?d.lt.sections.logic:'-')+' (각 10점)')
   : '레벨테스트 기록 없음';

 const wrap = document.createElement('div');
 wrap.id='reportRoot';
 wrap.style.cssText='position:fixed;left:-10000px;top:0;width:760px;background:#fff;z-index:-1;';
 wrap.innerHTML =
 '<style>'
 +'#reportRoot .rpt{font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:'+INK+';padding:30px 32px;width:760px;box-sizing:border-box;letter-spacing:-.2px}'
 +'#reportRoot .r-top{display:flex;align-items:flex-end;gap:12px;padding-bottom:14px;border-bottom:1px solid '+INK+'}'
 +'#reportRoot .r-logo-img{width:34px;height:34px;object-fit:contain}'
 +'#reportRoot .r-tt{font-size:20px;font-weight:800;line-height:1.2}'
 +'#reportRoot .r-ts{font-size:10.5px;color:#64748b;margin-top:2px}'
 +'#reportRoot .r-date{margin-left:auto;font-size:10.5px;color:#64748b;text-align:right;line-height:1.6}'
 +'#reportRoot .r-who{display:flex;flex-wrap:wrap;gap:0 22px;margin:14px 0 4px;font-size:12px}'
 +'#reportRoot .r-who span{color:#64748b}#reportRoot .r-who b{color:'+INK+';font-weight:700;margin-left:5px}'
 +'#reportRoot .r-lt{font-size:10.5px;color:#94a3b8;margin-bottom:16px}'
 /* 핵심 숫자 */
 +'#reportRoot .r-key{display:flex;gap:0;border:1px solid '+LINE+';border-radius:10px;overflow:hidden;margin-bottom:18px}'
 +'#reportRoot .r-k{flex:1;padding:13px 14px;border-right:1px solid '+LINE+'}'
 +'#reportRoot .r-k:last-child{border-right:0}'
 +'#reportRoot .r-k .l{font-size:10px;color:#64748b}'
 +'#reportRoot .r-k .v{font-size:21px;font-weight:800;margin:3px 0 1px;letter-spacing:-.6px}'
 +'#reportRoot .r-k .s{font-size:9.5px;color:#94a3b8}'
 /* 진단 */
 +'#reportRoot .r-read{border-left:2px solid '+INK+';padding:2px 0 2px 14px;margin-bottom:20px}'
 +'#reportRoot .r-read p{font-size:12px;line-height:1.85;margin:0 0 9px;color:#1e293b}'
 +'#reportRoot .r-read p:last-child{margin-bottom:0}'
 /* 구역 */
 +'#reportRoot .r-sec{margin-bottom:18px;page-break-inside:avoid;break-inside:avoid}'
 +'#reportRoot .r-h{font-size:12.5px;font-weight:700;margin-bottom:9px;padding-bottom:5px;border-bottom:1px solid '+LINE+'}'
 +'#reportRoot .r-h small{font-weight:400;color:#94a3b8;font-size:10.5px;margin-left:6px}'
 +'#reportRoot .r-cols{display:flex;gap:22px}'
 +'#reportRoot .r-col{flex:1;min-width:0}'
 /* 막대 */
 +'#reportRoot .r-row{display:flex;align-items:center;gap:9px;margin:6px 0;font-size:11px}'
 +'#reportRoot .r-lab{width:36px;color:#475569}'
 +'#reportRoot .r-bar{flex:1;height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden}'
 +'#reportRoot .r-bar>div{height:100%}'
 +'#reportRoot .r-pct{width:36px;text-align:right;font-weight:700}'
 /* 세부 요소 */
 +'#reportRoot .r-sg{margin-bottom:12px;page-break-inside:avoid;break-inside:avoid}'
 +'#reportRoot .r-act{page-break-inside:avoid;break-inside:avoid}'
 +'#reportRoot .r-key{page-break-inside:avoid;break-inside:avoid}'
 +'#reportRoot .r-read{page-break-inside:avoid;break-inside:avoid}'
 +'#reportRoot canvas{page-break-inside:avoid;break-inside:avoid}'
 +'#reportRoot .r-sgh{display:flex;align-items:baseline;margin-bottom:5px}'
 +'#reportRoot .r-sgh b{font-size:11.5px}'
 +'#reportRoot .r-sgr{margin-left:auto;font-size:10px;color:#64748b}'
 +'#reportRoot .r-erow{display:flex;align-items:center;gap:9px;margin:3px 0;font-size:10.5px}'
 +'#reportRoot .r-elab{width:112px;color:#475569}'
 +'#reportRoot .r-ebar{flex:1;height:5px;background:#f1f5f9;border-radius:3px;overflow:hidden}'
 +'#reportRoot .r-ebar>div{height:100%}'
 +'#reportRoot .r-ep{width:34px;text-align:right;font-weight:700}'
 /* 먼저 할 것 */
 +'#reportRoot .r-todo{list-style:none;margin:0;padding:0}'
 +'#reportRoot .r-todo li{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f1f5f9;font-size:12px}'
 +'#reportRoot .r-todo li:last-child{border-bottom:0}'
 +'#reportRoot .r-no{width:19px;height:19px;border-radius:50%;background:'+INK+';color:#fff;font-size:10.5px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:0 0 auto}'
 +'#reportRoot .r-todo b{font-weight:600}'
 +'#reportRoot .r-todo u{text-decoration:none;font-size:10px;color:#94a3b8;margin-left:7px}'
 +'#reportRoot .r-todo i{font-style:normal;font-weight:700;margin-left:auto}'
 +'#reportRoot .r-todo em{font-style:normal;color:#94a3b8;font-size:10px;width:64px;text-align:right}'
 /* 칩 · 플랜 */
 +'#reportRoot .r-chip{display:inline-flex;flex-direction:column;border:1px solid '+LINE+';border-radius:8px;padding:6px 10px;font-size:11px;margin:0 5px 5px 0;font-weight:600}'
 +'#reportRoot .r-chip i{font-style:normal;font-size:9.5px;color:#94a3b8;font-weight:400;margin-top:1px}'
 +'#reportRoot .r-b-도전{border-left:2px solid '+BAD+'}'
 +'#reportRoot .r-b-적정{border-left:2px solid '+WARN+'}'
 +'#reportRoot .r-b-안정{border-left:2px solid '+OK+'}'
 +'#reportRoot .r-pd{display:inline-block;width:18.6%;border:1px solid '+LINE+';border-radius:8px;padding:8px 4px;margin:0 1% 0 0;text-align:center;vertical-align:top;box-sizing:border-box}'
 +'#reportRoot .r-pd b{display:block;font-size:11px}'
 +'#reportRoot .r-pd span{display:block;font-size:10px;color:#475569;margin:2px 0 1px}'
 +'#reportRoot .r-pd i{display:block;font-size:9px;color:#94a3b8;font-style:normal}'
 /* 기타 */
 +'#reportRoot .r-note{font-size:10.5px;color:#64748b;line-height:1.7;margin-top:9px}'
 +'#reportRoot .r-act{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}'
 +'#reportRoot .r-a{border:1px solid '+LINE+';border-radius:8px;padding:9px 11px}'
 +'#reportRoot .r-a span{display:block;font-size:10px;color:#64748b}'
 +'#reportRoot .r-a b{display:block;font-size:15px;font-weight:800;margin:2px 0 1px;letter-spacing:-.3px}'
 +'#reportRoot .r-a i{display:block;font-style:normal;font-size:9.5px;color:#94a3b8}'
 +'#reportRoot .r-muted{color:#94a3b8;font-size:11px}'
 +'#reportRoot .r-grow{display:flex;gap:16px;font-size:10.5px;color:#64748b;margin-top:7px}'
 +'#reportRoot .r-grow b{color:'+INK+'}'
 +'#reportRoot .r-grow .up{color:'+OK+';font-weight:700}#reportRoot .r-grow .down{color:'+BAD+';font-weight:700}'
 +'#reportRoot .r-foot{margin-top:22px;border-top:1px solid '+LINE+';padding-top:9px;font-size:9.5px;color:#94a3b8;display:flex}'
 +'#reportRoot .r-foot span:last-child{margin-left:auto}'
 +'</style>'
 +'<div class="rpt">'

 /* 머리말 */
 +'<div class="r-top">'
   +'<img class="r-logo-img" src="'+(typeof LOGO_SRC!=='undefined'?LOGO_SRC:'')+'" alt="">'
   +'<div><div class="r-tt">학습 진단 리포트</div><div class="r-ts">이룸편입</div></div>'
   +'<div class="r-date">'+today+'<br>'+esc(d.s.username||'')+'</div>'
 +'</div>'
 +'<div class="r-who">'
   +'<div><span>이름</span><b>'+esc(d.s.name||'-')+'</b></div>'
   +'<div><span>반</span><b>'+(d.cls?tierName(d.cls):'미배정')+'</b></div>'
   +'<div><span>목표</span><b>'+esc(d.s.goalSchool||'미정')+' '+esc(d.s.goalDept||'')+'</b></div>'
   +'<div><span>담당</span><b>'+esc(d.teacher)+'</b></div>'
 +'</div>'
 +'<div class="r-lt">'+esc(ltLine)+'</div>'

 /* 핵심 숫자 */
 +'<div class="r-key">'
   +'<div class="r-k"><div class="l">문제 정답률</div><div class="v" style="color:'+tone(d.overall)+'">'+pct(d.overall)+'</div><div class="s">테스트 '+d.sess.length+'회</div></div>'
   +'<div class="r-k"><div class="l">평가 평균</div><div class="v" style="color:'+(d.exams.avg==null?DIM:tone(d.exams.avg))+'">'+(d.exams.avg==null?'-':pct(d.exams.avg))+'</div><div class="s">'+(d.exams.rows.length?(d.exams.rows.length+'개 응시'):'응시 없음')+'</div></div>'
   +'<div class="r-k"><div class="l">강의 2회독</div><div class="v" style="color:'+(d.vod.total?tone(Math.round((d.vod.twice/Math.max(1,d.vod.total))*100)):DIM)+'">'+(d.vod.total?(d.vod.twice+' / '+d.vod.total):'-')+'</div><div class="s">'+(d.vod.total?('기한 내 인정 '+d.vod.done+'강'):'배정 없음')+'</div></div>'
   +'<div class="r-k"><div class="l">가장 낮은 영역</div><div class="v" style="font-size:15px;color:'+tone(d.wk.weakest.rate)+'">'+SECTIONS[d.wk.weakest.sec]+'</div><div class="s">'+pct(d.wk.weakest.rate)+'</div></div>'
   +'<div class="r-k"><div class="l">출결</div><div class="v" style="font-size:15px">'+(d.att.score==null?'-':pct(d.att.score))+'</div><div class="s">'+esc(d.att.label||'')+'</div></div>'
 +'</div>'

 /* 진단 */
 +'<div class="r-read">'+String(expertCmt||'').split(/\n{2,}/).map(function(t){ return '<p>'+esc(t)+'</p>'; }).join('')+'</div>'

 /* 먼저 할 것 */
 +'<div class="r-sec"><div class="r-h">먼저 손볼 것<small>정답률이 낮은 순</small></div>'+todoHtml+'</div>'

 /* 최근 학습 활동 */
 +(function(){
   var r=d.recent, v=d.voca;
   var cells=[
     ['문제 푼 날', r.testDayN+' / '+r.days+'일', r.questions+'문항 · 정답률 '+pct(r.rate)],
     ['강의 본 날', r.lecDayN+'일', d.vod.total?(d.vod.twice+'/'+d.vod.total+'강 2회독 · 인정 '+d.vod.done+'강'):'배정 없음'],
     ['단어', r.wordDays+'일 '+r.wordCount+'개', '누적 '+v.wKnown+'개'+(v.wMiss?(' · 복습 '+v.wMiss+'개'):'')],
     ['숙어', v.iKnown+'개 외움', v.iTotal?('전체 '+v.iTotal+'개 중 '+pct(v.iRate)):'-'],
     ['과제', d.hw.total+'건 제출', d.hw.redo?(d.hw.redo+'건 재제출 요청'):'재제출 없음'],
     ['학습 루틴', r.routineRate==null?'-':pct(r.routineRate), '최근 2주 이행률']
   ];
   return '<div class="r-sec"><div class="r-h">최근 '+r.days+'일 학습 활동<small>'+esc(r.from)+' 이후</small></div>'
     + '<div class="r-act">' + cells.map(function(c){
         return '<div class="r-a"><span>'+c[0]+'</span><b>'+c[1]+'</b><i>'+c[2]+'</i></div>'; }).join('')
     + '</div>'
     + (d.streak>=3 ? ('<div class="r-note">연속 '+d.streak+'일 학습 중입니다.</div>') : '')
     + '</div>';
  })()

 /* 평가 성적 */
 +(function(){
   var ex=d.exams;
   if(!ex.rows.length) return '<div class="r-sec"><div class="r-h">평가 성적</div><div class="r-muted">아직 채점된 평가가 없습니다.</div></div>';
   var byType = ex.types.map(function(t){
     return '<div class="r-a"><span>'+(typeof assessTypeName==='function'?assessTypeName(t.type):t.type)+'</span>'
       + '<b style="color:'+tone(t.avg)+'">'+pct(t.avg)+'</b><i>'+t.n+'회 응시</i></div>'; }).join('');
   var recent = ex.rows.slice(0,6).map(function(x){
     return '<div class="r-erow"><span class="r-elab">'+esc(x.title).slice(0,22)+'</span>'
       + '<div class="r-ebar"><div style="width:'+x.pct+'%;background:'+tone(x.pct)+'"></div></div>'
       + '<span class="r-ep" style="color:'+tone(x.pct)+'">'+x.score+'/'+x.max+'</span></div>'; }).join('');
   return '<div class="r-sec"><div class="r-h">평가 성적<small>유형별 평균 · 최근 응시</small></div>'
     + '<div class="r-act">'+byType+'</div>'
     + (ex.trend ? ('<div class="r-note">최근 3회 평균 '+pct(ex.trend.recent)+' · 그 이전 '+pct(ex.trend.older)
        +' → '+(ex.trend.diff>=0?'+':'−')+Math.abs(ex.trend.diff)+'%p</div>') : '')
     + '<div style="margin-top:10px">'+recent+'</div></div>';
  })()

 /* 영역별 */
 +'<div class="r-sec"><div class="r-cols">'
   +'<div class="r-col"><div class="r-h">영역별 정답률</div>'+secBars+'</div>'
   +'<div class="r-col"><div class="r-h">영역 균형</div><canvas id="rptRadar" width="300" height="230"></canvas></div>'
 +'</div></div>'

 /* 성장 곡선 */
 +(function(){
    var g = (typeof growthSeries==='function') ? growthSeries(d.s.id) : {labels:[]};
    if(!g.labels || !g.labels.length){
      return '<div class="r-sec"><div class="r-h">성장 곡선</div>'
        + '<div class="r-muted">테스트를 두 번 이상 보면 여기에 그려집니다.</div></div>';
    }
    var first=g.cum[0], last=g.cum[g.cum.length-1], diff=last-first;
    return '<div class="r-sec"><div class="r-h">성장 곡선<small>응시할수록 쌓이는 누적 정답률</small></div>'
      + '<canvas id="rptGrow" width="640" height="210"></canvas>'
      + '<div class="r-grow"><span>첫 응시 <b>'+first+'%</b></span><span>지금 <b>'+last+'%</b></span>'
      + '<span class="'+(diff>=0?'up':'down')+'">'+(diff>=0?'+':'−')+Math.abs(diff)+'%p</span>'
      + '<span>'+g.labels.length+'회 응시</span></div></div>';
  })()

 /* 세부 요소 */
 +'<div class="r-sec"><div class="r-h">세부 요소별 정답률<small>아직 풀지 않은 요소는 «-»</small></div>'+detail+'</div>'

 /* 반복 오답 */
 +(function(){
   var wr=d.wrong;
   if(!wr.total) return '';
   return '<div class="r-sec"><div class="r-h">자주 틀리는 곳<small>전체 오답 '+wr.total+'문항</small></div>'
     + '<div class="r-act">'
       + '<div class="r-a"><span>두 번 이상 틀림</span><b style="color:'+(wr.repeat?BAD:OK)+'">'+wr.repeat+'문항</b><i>반복 오답</i></div>'
       + '<div class="r-a"><span>아직 못 고침</span><b style="color:'+(wr.unfixed?BAD:OK)+'">'+wr.unfixed+'문항</b><i>마지막에도 틀림</i></div>'
       + '<div class="r-a"><span>반복 + 못 고침</span><b style="color:'+(wr.repeatUnfixed?BAD:OK)+'">'+wr.repeatUnfixed+'문항</b><i>가장 급한 것</i></div>'
     + '</div>'
     + (wr.tags.length ? ('<div style="margin-top:10px">' + wr.tags.map(function(t){
         return '<div class="r-erow"><span class="r-elab">'+esc(t.name)+'</span>'
           + '<div class="r-ebar"><div style="width:'+Math.min(100, Math.round(t.wrong/wr.tags[0].wrong*100))+'%;background:'+BAD+'"></div></div>'
           + '<span class="r-ep">'+t.wrong+'회</span></div>'; }).join('') + '</div>') : '')
     + '</div>';
  })()

 /* 지원 가능 대학 */
 +'<div class="r-sec"><div class="r-h">지원 가능 대학</div>'+schools
   +'<div class="r-note">'
     + (d.goal && d.goal.cut!=null && d.goal.n
        ? (esc(d.goal.uni)+' 문항 기준 정답률 '+pct(d.goal.rate)+' · 합격선 추정 '+pct(d.goal.cut)
           + (d.goal.gap>0 ? (' · '+d.goal.gap+'%p 남음') : ' · 도달')
           + (d.goal.from==='school' ? (' (해당 학교 문항 '+d.goal.n+'개 기준)') : ' (전체 응시 기준)'))
        : esc(d.match.goalNote ? d.match.goalNote.msg : '목표 대학을 정하면 합격선까지 몇 %p 남았는지 함께 계산합니다.'))
     + '</div></div>'

 /* 학습 플랜 */
 +'<div class="r-sec"><div class="r-h">이번 주 학습 <small>'+esc(d.plan.stage)+'</small></div>'+planHtml
   +'<div class="r-note">'+esc(d.plan.headline)+'</div></div>'

 +'<div class="r-foot"><span>이룸편입</span><span>레벨테스트와 학습 기록으로 만든 리포트입니다 · '+today+'</span></div>'
 +'</div>';
 return wrap;
}

function loadScript(src){ return new Promise(function(res,rej){ const sc=document.createElement('script'); sc.src=src; sc.onload=res; sc.onerror=rej; document.head.appendChild(sc); }); }
function ensurePdfLibs(){
 if(window.jspdf && window.html2canvas) return Promise.resolve(true);
 const a = window.html2canvas ? Promise.resolve() : loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
 return a.then(function(){ return window.jspdf ? Promise.resolve() : loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'); })
 .then(function(){ return !!(window.jspdf && window.html2canvas); })
 .catch(function(){ return false; });
}
function printFallback(node){
 const clone=node.cloneNode(true); clone.style.position='static'; clone.style.left='0';
 const sc=node.querySelectorAll('canvas'), cc=clone.querySelectorAll('canvas');
 for(var i=0;i<sc.length;i++){ try{ const img=document.createElement('img'); img.src=sc[i].toDataURL('image/png'); img.width=sc[i].width; img.height=sc[i].height; cc[i].parentNode.replaceChild(img,cc[i]); }catch(e){} }
 const w=window.open('','_blank'); if(!w){ toast('팝업 차단을 해제하면 PDF로 저장할 수 있어요'); return; }
 w.document.write('<html><head><meta charset="utf-8"><title>이룸편입 리포트</title></head><body style="margin:0">'+clone.outerHTML+'</body></html>');
 w.document.close(); setTimeout(function(){ try{ w.focus(); w.print(); }catch(e){} }, 500);
}
/* ---------- PDF 페이지 나누기 ----------
   구역 한가운데를 자르지 않도록, 잘라도 되는 위치를 실제 화면에서 계산합니다. */
function reportCutPoints(node){
  var root = node.querySelector('.rpt') || node;
  var base = root.getBoundingClientRect().top;
  var blocks = [];
  /* 최상위 구역을 하나의 덩어리로 보되, 안에 소분류(.r-sg)가 있으면 그 단위로 더 잘게 나눕니다 */
  function put(el){
    var b = el.getBoundingClientRect();
    var top = b.top - base, bot = b.bottom - base;
    if(bot - top > 1) blocks.push({ top: top, bottom: bot });     /* 높이를 못 재면 버립니다 */
  }
  Array.prototype.forEach.call(root.children, function(child){
    var subs = child.querySelectorAll ? child.querySelectorAll('.r-sg') : [];
    if(subs && subs.length >= 2){
      var cb = child.getBoundingClientRect();
      var firstTop = subs[0].getBoundingClientRect().top;
      if(firstTop - cb.top > 4) blocks.push({ top: cb.top-base, bottom: firstTop-base });
      Array.prototype.forEach.call(subs, put);
    } else put(child);
  });
  blocks.sort(function(a,b){ return a.top-b.top; });
  /* 제대로 못 쟀으면 빈 배열을 돌려 '균등 분할'로 넘깁니다 */
  if(blocks.length < 2) return [];
  var covered = blocks[blocks.length-1].bottom - blocks[0].top;
  var total = root.getBoundingClientRect().height || root.scrollHeight || 0;
  if(total > 0 && covered < total * 0.6) return [];               /* 대부분을 못 쟀으면 신뢰하지 않습니다 */
  return blocks;
}
/* 덩어리들을 A4 한 장 높이에 맞춰 나눕니다 */
function reportPages(blocks, totalH, pageH){
  if(!blocks.length) return [[0, totalH]];
  var pages = [], start = 0, i = 0;
  while(i < blocks.length){
    var limit = start + pageH;
    var last = i;
    /* 이 페이지에 통째로 들어가는 마지막 덩어리를 찾습니다 */
    while(last < blocks.length && blocks[last].bottom <= limit) last++;
    if(last === i){
      /* 덩어리 하나가 한 장보다 크면 어쩔 수 없이 잘라야 합니다 */
      pages.push([start, Math.min(limit, totalH)]);
      start = Math.min(limit, totalH);
      while(i < blocks.length && blocks[i].bottom <= start) i++;
    } else {
      var end = blocks[last-1].bottom;
      /* 다음 덩어리와의 여백 절반까지 포함해 잘린 느낌을 없앱니다 */
      if(last < blocks.length) end = (end + blocks[last].top) / 2;
      else end = totalH;
      pages.push([start, end]);
      start = end; i = last;
    }
    if(start >= totalH - 1) break;
    if(pages.length > 20) break;                 /* 안전장치 */
  }
  if(start < totalH - 1) pages.push([start, totalH]);
  return pages;
}

function downloadReport(studentId){
 const d=reportData(studentId);
 const localCmt=expertComment(d);
 toast('리포트를 만드는 중입니다...');

 function renderPdf(canvas, name, cuts, domH){
   const jsPDF=window.jspdf.jsPDF; const pdf=new jsPDF('p','mm','a4');
   const AW=210, AH=297;
   const scale = canvas.height / (domH || canvas.height);          /* 화면 좌표 → 캔버스 좌표 */
   const pageH = Math.floor(canvas.width * AH / AW);               /* A4 비율에 맞는 한 장 높이 */
   var pages = cuts && cuts.length
     ? cuts.map(function(p){ return [Math.round(p[0]*scale), Math.round(p[1]*scale)]; })
     : null;
   if(!pages || !pages.length){
     pages = []; for(var y=0; y<canvas.height; y+=pageH) pages.push([y, Math.min(canvas.height, y+pageH)]);
   }
   pages.forEach(function(pr, i){
     var top = Math.max(0, pr[0]), bot = Math.min(canvas.height, pr[1]);
     var hgt = Math.max(1, bot - top);
     var tmp=document.createElement('canvas'); tmp.width=canvas.width; tmp.height=hgt;
     var tx=tmp.getContext('2d'); tx.fillStyle='#ffffff'; tx.fillRect(0,0,tmp.width,tmp.height);
     tx.drawImage(canvas, 0, top, canvas.width, hgt, 0, 0, canvas.width, hgt);
     var img=tmp.toDataURL('image/jpeg',0.95); if(i>0) pdf.addPage();
     var dw=AW, dh=hgt*AW/tmp.width;
     if(dh>AH){ dh=AH; dw=tmp.width*AH/hgt; }                      /* 한 장을 넘으면 줄여서 맞춥니다 */
     pdf.addImage(img,'JPEG',(AW-dw)/2, 0, dw, dh);
   });
   pdf.save(name);
   return pages.length;
 }

 function proceed(cmt){
 const node=buildReportNode(d, cmt); document.body.appendChild(node);
 const cv=node.querySelector('#rptRadar');
 if(cv && typeof radar==='function'){ radar(cv,[SECTIONS.vocab,SECTIONS.grammar,SECTIONS.reading,SECTIONS.logic,'태도'],[d.secRates.vocab,d.secRates.grammar,d.secRates.reading,d.secRates.logic,d.att.score||0],'#4f46e5'); }
 try{
   var gcv=node.querySelector('#rptGrow');
   if(gcv && typeof growthSeries==='function' && typeof lineChart==='function'){
     var gg=growthSeries(d.s.id);
     if(gg.labels && gg.labels.length) lineChart(gcv, gg.labels, [{color:'#94a3b8',dash:true,data:gg.mine},{color:'#4f46e5',data:gg.cum}]);
   }
 }catch(e){}

 ensurePdfLibs().then(function(ok){
   if(!(ok && window.html2canvas && window.jspdf)){ printFallback(node); if(node.parentNode) node.parentNode.removeChild(node); return; }
   var root = node.querySelector('.rpt') || node;
   var domH = root.getBoundingClientRect().height || root.scrollHeight;
   var blocks = [];
   try{ blocks = reportCutPoints(node); }catch(e){}
   var pageDomH = 0;
   try{ pageDomH = (root.getBoundingClientRect().width) * 297/210; }catch(e){}
   var cuts = (blocks.length && pageDomH>0) ? reportPages(blocks, domH, pageDomH) : null;
   window.html2canvas(node,{scale:2,backgroundColor:'#ffffff',useCORS:true}).then(function(canvas){
     try{
       var n = renderPdf(canvas, '이룸편입_리포트_'+(d.s.name||'student')+'_'+todayStr()+'.pdf', cuts, domH);
       toast('리포트 PDF를 저장했습니다 ('+n+'페이지)');
     }catch(e){ printFallback(node); }
     if(node.parentNode) node.parentNode.removeChild(node);
   }).catch(function(){ printFallback(node); if(node.parentNode) node.parentNode.removeChild(node); });
 });
 }
 if(typeof LLM!=='undefined' && LLM.enabled){ LLM.ask(EXPERT_SYS, expertPrompt(d), 700).then(function(t){ proceed(t && t.trim() ? t.trim() : localCmt); }); }
 else { proceed(localCmt); }
}
