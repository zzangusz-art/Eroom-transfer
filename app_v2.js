/* ===================== 이룸편입 LMS v2 · 관리형 하이브리드 엔진 ===================== */

/* ---------- Phase1: 6단계 레벨 체계 + 수준별 시간표 ---------- */
const LEVELS = [
 {id:1, name:'Beginner', ko:'기초 어휘·문법', grp:'하', color:'#10b981'},
 {id:2, name:'Lower-Int', ko:'문장 구조', grp:'하', color:'#22c55e'},
 {id:3, name:'Intermediate', ko:'논리 독해', grp:'중', color:'#3b82f6'},
 {id:4, name:'Upper-Int', ko:'유형 적응', grp:'중', color:'#6366f1'},
 {id:5, name:'Pre-Final', ko:'기출 분석', grp:'상', color:'#8b5cf6'},
 {id:6, name:'Final', ko:'실전 마무리', grp:'상', color:'#db2777'}
];
const GROUPS = { '하':{name:'하 (Beginner)', color:'#10b981', strategy:'문법5·독해4·논리4·어휘1·테스트1', cut:70},
 '중':{name:'중 (Intermediate)', color:'#3b82f6', strategy:'문법4·독해4·논리5·어휘1·테스트1', cut:85},
 '상':{name:'상 (Advanced)', color:'#db2777', strategy:'문법3·독해4·논리6·어휘1·테스트1', cut:101} };
const TIMETABLE = {
 '하':[['단어 테스트','단어 테스트','단어 테스트','단어 테스트','단어 테스트'],
   ['기초 편입 문법','기초 편입 문법','기초 편입 문법','기초 편입 문법','기초 편입 문법'],
   ['구문·기초 독해','구문·기초 독해','구문·기초 독해','구문·기초 독해','기초 논리 완성'],
   ['기초 논리 완성','기초 논리 완성','어휘 특강','기초 논리 완성','주간 테스트']],
 '중':[['단어 테스트','단어 테스트','단어 테스트','단어 테스트','단어 테스트'],
   ['빈출 문법 문풀','빈출 문법 문풀','빈출 문법 문풀','빈출 문법 문풀','빈출 문법 문풀'],
   ['중하위권 기출독해','중하위권 기출독해','중하위권 기출독해','중하위권 기출독해','유형별 실전논리'],
   ['유형별 실전논리','유형별 실전논리','동의어 특강','유형별 실전논리','주간 기출테스트']],
 '상':[['단어 테스트','단어 테스트','단어 테스트','단어 테스트','단어 테스트'],
   ['최고난도 문법/오문','최고난도 문법/오문','최고난도 문법/오문','고급 논리(Multi)','고급 논리(Multi)'],
   ['최상위권 장문독해','최상위권 장문독해','최상위권 장문독해','최상위권 장문독해','고급 논리(Multi)'],
   ['고급 논리(Multi)','고급 논리(Multi)','GRE 킬러어휘','고급 논리(Multi)','주간 하프모의고사']]
};
function levelObj(id){ return LEVELS.find(function(l){return l.id===id;})||LEVELS[0]; }
function clsToLevel(cls){ return cls==='A'?5: cls==='B'?3: cls==='C'?1: 1; }
function studentLevel(s){ return s.level || clsToLevel(s.cls); }
function studentGroup(s){ return levelObj(studentLevel(s)).grp; }

/* ---------- Phase1: 마이그레이션 & 시드 ---------- */
function migrateV2(){
 if(!DB) return;
 DB.assignments = DB.assignments || [];
 DB.submissions = DB.submissions || [];
 DB.dailyTests = DB.dailyTests || {}; // studentId -> date -> {score,total,passed}
 DB.mockExams = DB.mockExams || []; // {id,studentId,round,score,classAvg,target,date}
 DB.diligence = DB.diligence || {}; // studentId -> date -> {attend,review,homework,mock}
 DB.complaintsLog = DB.complaintsLog || [];
 DB.kakaoLog = DB.kakaoLog || [];
 DB.certs = DB.certs || [];
 acf(DB.students).forEach(function(s){ if(s.level==null) s.level=clsToLevel(s.cls); if(s.coachId==null) s.coachId=s.instructorId; });
 if(!DB._v2seed){ seedV2(); DB._v2seed=true; save(); }
 if(!acf(DB.students).find(function(s){return s.username==='TEST';}) && (DB._deletedIds||[]).indexOf('demo')<0){ DB.students.push({id:'demo',name:'체험 진단',username:'TEST',pw:'eroom100',cls:null,instructorId:null,testOnly:true,goalSchool:'',goalDept:'',email:'',phone:'',memo:'레벨테스트 체험 계정',createdAt:todayStr()}); save(); }
 if(!DB.lectures){ DB.lectures=[
 {id:'lec1',title:'편입 영어 오리엔테이션',section:'vocab',minutes:18,videoUrl:'https://www.w3schools.com/html/mov_bbb.mp4',openDate:todayStr(),group:'all',order:0,instructor:'이룸편입'},
 {id:'lec2',title:'구문 독해 기초 1강',section:'reading',minutes:42,videoUrl:'https://www.w3schools.com/html/mov_bbb.mp4',openDate:todayStr(),group:'all',order:1,instructor:'이룸편입'}
 ]; DB.watch=DB.watch||{}; save(); }
 if(!DB._v2certseed){ if(acf(DB.students).find(function(x){return x.id==='s1';})){ DB.certs.push({id:uid('ct'),studentId:'s1',date:todayStr(),kind:'morning',status:'pending',note:'오전 수업 참석 완료',by:null,byName:null,at:null}); } DB._v2certseed=true; save(); }
}
function seedV2(){
 // assignments (today + recent)
 const today=todayStr();
 for(let i=0;i<3;i++){ const dt=new Date(); dt.setDate(dt.getDate()-i); const ds=todayStr(dt);
 if(i>0) DB.assignments.push({id:uid('as'),date:ds,grp:'all',auto:true,needPhoto:true,title:'[종합] 오늘 배운 내용으로 문장 만들기',desc:'오늘 강의에서 배운 표현·구문으로 영어 문장 5개를 직접 만들고, 우리말 해석과 함께 손으로 써서 사진으로 제출하세요.'});
 }
 // diligence 3주 + mock exams for s1(성실), s2(보통)
 const prof={ s1:{attend:.97,review:.92,homework:.95,base:78, slope:4},
 s2:{attend:.85,review:.7, homework:.72,base:58, slope:3} };
 Object.keys(prof).forEach(function(sid){ if(!acf(DB.students).find(function(x){return x.id===sid;})) return;
 const p=prof[sid]; DB.diligence[sid]=DB.diligence[sid]||{}; DB.dailyTests[sid]=DB.dailyTests[sid]||{};
 let round=0;
 for(let i=21;i>=1;i--){ const dt=new Date(); dt.setDate(dt.getDate()-i); const dow=dt.getDay(); if(dow===0||dow===6) continue; const ds=todayStr(dt);
 DB.diligence[sid][ds]={ attend: Math.random()<p.attend?100:(Math.random()<.5?60:0),
 review: Math.round(60+Math.random()*40*p.review), homework: Math.random()<p.homework?100:0, mock:null };
 // daily 단어테스트 결과
 const dt0=Math.random()< (sid==='s1'?.92:.7); DB.dailyTests[sid][ds]={score:dt0?9:6,total:10,passed:dt0};
 }
 // mock exams every ~2주 (4 rounds), increasing
 for(let r=1;r<=4;r++){ const dt=new Date(); dt.setDate(dt.getDate()-(28-r*7)); const ds=todayStr(dt);
 const score=Math.min(99, Math.round(p.base + p.slope*r + (Math.random()*6-3)));
 DB.mockExams.push({id:uid('mk'),studentId:sid,round:r,score:score,classAvg:Math.round(p.base-6+r*2),target:GROUPS[studentGroup(acf(DB.students).find(function(x){return x.id===sid;}))].cut,date:ds});
 }
 });
}

/* ---------- Phase4: 성실도 5축(공부체력) ---------- */
const DILI_AXES=[['attend','출석'],['review','복습'],['homework','과제'],['mock','모의고사']];
function diligenceWeek(studentId, weekOffset){
 weekOffset=weekOffset||0;
 const rec=DB.diligence[studentId]||{};
 const now=new Date(); now.setDate(now.getDate()-weekOffset*7);
 const acc={attend:[],review:[],homework:[]};
 for(let i=0;i<7;i++){ const dt=new Date(now); dt.setDate(dt.getDate()-i); const ds=todayStr(dt); const d=rec[ds]; if(!d)continue;
 acc.attend.push(d.attend); acc.review.push(d.review); acc.homework.push(d.homework); }
 function avg(a){ return a.length?Math.round(a.reduce(function(x,y){return x+y;},0)/a.length):0; }
 // mock axis = latest mock score within ~2주 window
 const mocks=DB.mockExams.filter(function(m){return m.studentId===studentId;}).sort(function(a,b){return a.date<b.date?1:-1;});
 const mockAxis= mocks.length? mocks[Math.min(weekOffset,mocks.length-1)].score : 0;
 return { attend:avg(acc.attend), review:avg(acc.review), homework:avg(acc.homework), mock:mockAxis,
 score: Math.round((avg(acc.attend)+avg(acc.review)+avg(acc.homework)+mockAxis)/4) };
}

/* ---------- Phase3: 레벨업 엔진 ---------- */
function levelup(studentId){
 const s=acf(DB.students).find(function(x){return x.id===studentId;}); if(!s) return null;
 const lv=studentLevel(s); const grp=studentGroup(s); const cut=GROUPS[grp].cut;
 const mocks=DB.mockExams.filter(function(m){return m.studentId===studentId;}).sort(function(a,b){return a.round-b.round;});
 const last2=mocks.slice(-2);
 const avg2= last2.length? Math.round(last2.reduce(function(a,b){return a+b.score;},0)/last2.length):0;
 const next= lv<6? levelObj(lv+1):null;
 const can = next && cut<=100 && avg2>=cut;
 const demote = grp!=='하' && avg2>0 && avg2<55;
 const progress= cut>100?100: Math.min(100, Math.round(avg2/cut*100));
 return { lv:lv, levelName:levelObj(lv).name, grp:grp, cut:cut, avg2:avg2, next:next, can:can, demote:demote, progress:progress,
 gap: cut<=100? Math.max(0, cut-avg2):0, rounds:mocks.length };
}
function applyLevelup(studentId){
 const j=levelup(studentId); if(!j) return false; const s=acf(DB.students).find(function(x){return x.id===studentId;});
 if(j.can){ s.level=Math.min(6,(s.level||clsToLevel(s.cls))+1); s.cls=(studentGroup(s)==='상'?'A':studentGroup(s)==='중'?'B':'C'); save(); return '승급'; }
 if(j.demote){ s.level=Math.max(1,(s.level||clsToLevel(s.cls))-1); save(); return '강등'; }
 return false;
}

/* ---------- Phase2: 일일 상태 + 인증(승인) 워크플로 ---------- */
const CERT_KINDS=[['homework','과제 마감']]; /* 녹화수업 체계: 오전/오후 인증 제거 */
function certStatus(studentId,date,kind){ var arr=DB.certs.filter(function(x){return x.studentId===studentId&&x.date===date&&x.kind===kind;}); var c=arr[arr.length-1]; return c?c.status:'none'; }
function submitCert(studentId,kind,note){ var t=todayStr(); DB.certs=DB.certs.filter(function(x){return !(x.studentId===studentId&&x.date===t&&x.kind===kind&&x.status!=='approved');}); if(certStatus(studentId,t,kind)==='approved') return; DB.certs.push({id:uid('ct'),studentId:studentId,date:t,kind:kind,status:'pending',note:note||'',by:null,byName:null,at:null}); save(); }
function approveCert(certId,ok,by,byName){ var c=DB.certs.find(function(x){return x.id===certId;}); if(!c)return; c.status=ok?'approved':'rejected'; c.by=by; c.byName=byName||''; c.at=Date.now(); if(ok&&c.kind==='morning'){ DB.diligence[c.studentId]=DB.diligence[c.studentId]||{}; var d=DB.diligence[c.studentId][c.date]||{}; d.attend=100; DB.diligence[c.studentId][c.date]=d; } save(); }
function pendingCerts(studentIds){ return DB.certs.filter(function(c){return c.status==='pending'&&(!studentIds||studentIds.indexOf(c.studentId)>=0);}).sort(function(a,b){return a.date<b.date?1:(a.date>b.date?-1:0);}); }
function certLabel(st){ return st==='approved'?'승인됨':st==='pending'?'승인 대기':st==='rejected'?'반려됨':'미요청'; }

function dailyStatus(studentId, date){
 date=date||todayStr();
 const dt=(DB.dailyTests[studentId]||{})[date];
 const dil=(DB.diligence[studentId]||{})[date]||{};
 const subs=DB.submissions.filter(function(x){return x.studentId===studentId && x.date===date;});
 const ch=certStatus(studentId,date,'homework');
 var stu=acf(DB.students).find(function(x){return x.id===studentId;});
 var vs=(typeof VOD!=='undefined'&&stu)?VOD.summary(studentId):{total:0,once:0,twice:0,done:0,rate:0};
 var once=vs.once!=null?vs.once:vs.twice, twice=vs.twice||0;
 const certified = (twice>0 || vs.total===0) && ch==='approved';
 return { dailyTest:dt||null, reviewProg:dil.review||0, homeworkDone:subs.length>0, subs:subs,
 vod:vs, once:once, twice:twice,
 cert:{homework:ch}, certified:certified,
 items:[ {k:'단어테스트 실시', ok: !!dt},
 {k:'수업 1회독', ok: once>0},
 {k:'수업 2회독', ok: twice>0},
 {k:'과제 제출', ok: subs.length>0} ] };
}

/* ---------- 관제 신호(자동 컴플레인) · 녹화강의 기준 ---------- */
function complaints(){
 const out=[]; const today=todayStr();
 acf(DB.students).forEach(function(s){
 if(!s.cls) return;
 const mocks=DB.mockExams.filter(function(m){return m.studentId===s.id;});
 if(mocks.length===0) out.push({sid:s.id,name:s.name,type:'미응시',sev:2,msg:'정기 모의고사 미응시 — 응시 독려 필요'});
 const sorted=mocks.slice().sort(function(a,b){return a.round-b.round;});
 if(sorted.length>=2 && sorted[sorted.length-1].score < sorted[sorted.length-2].score-8)
   out.push({sid:s.id,name:s.name,type:'성적급락',sev:3,msg:'최근 모의고사 '+(sorted[sorted.length-2].score)+'→'+(sorted[sorted.length-1].score)+'점 하락 — 상담 필요'});
 if(typeof VOD!=='undefined'){
   var open=VOD.list(s).filter(function(l){ return !VOD.notOpen(l); });
   var over=open.filter(function(l){ return VOD.overdue(l) && VOD.rec(s.id,l.id).count<VOD.REQ; });
   var soon=open.filter(function(l){ return !VOD.overdue(l) && VOD.daysLeft(l)<=1 && VOD.rec(s.id,l.id).count<VOD.REQ; });
   var none=open.filter(function(l){ return VOD.rec(s.id,l.id).count===0; });
   if(over.length) out.push({sid:s.id,name:s.name,type:'수강기한 초과',sev:3,msg:'2회독 미완료 상태로 수강기한 초과 '+over.length+'강'});
   else if(soon.length) out.push({sid:s.id,name:s.name,type:'기한 임박',sev:2,msg:'수강기한 D-1 이하 미이수 '+soon.length+'강 — 즉시 시청 안내'});
   if(none.length>=3) out.push({sid:s.id,name:s.name,type:'미시청',sev:2,msg:'한 번도 시청하지 않은 강의 '+none.length+'강'});
 }
 var openAs=(acf(DB.assessments)||[]).filter(function(a){ return (a.openDate||today)<=today && a.dueDate && a.dueDate<today; });
 var miss=openAs.filter(function(a){ var r=((DB.scores||{})[a.id]||{})[s.id]; if(typeof isCleared==='function'&&isCleared(r)) r=null; return !(r&&r.submittedAt); });
 if(miss.length) out.push({sid:s.id,name:s.name,type:'평가 미제출',sev:2,msg:'마감 지난 평가 '+miss.length+'건 미제출'});
 if(s.validUntil){ var left=Math.ceil((new Date(s.validUntil+'T23:59:59')-new Date())/86400000);
   if(left<0) out.push({sid:s.id,name:s.name,type:'이용 만료',sev:3,msg:'이용기간 만료('+s.validUntil+') — 재등록 안내 필요'});
   else if(left<=7) out.push({sid:s.id,name:s.name,type:'만료 임박',sev:1,msg:'이용기간 D-'+left+' ('+s.validUntil+')'});
 }
 });
 return out.sort(function(a,b){return b.sev-a.sev;});
}

/* ---------- Phase4: 차트(라인/파이) ---------- */
function lineChart(canvas, labels, series){
 const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
 const padL=34,padR=12,padT=14,padB=24; const max=100,min=0;
 const x=function(i){ return padL+(W-padL-padR)*(labels.length<=1?0.5:i/(labels.length-1)); };
 const y=function(v){ return padT+(H-padT-padB)*(1-(v-min)/(max-min)); };
 ctx.strokeStyle='#e2e8f0'; ctx.fillStyle='#94a3b8'; ctx.font='10px sans-serif'; ctx.textAlign='right';
 for(let g=0;g<=4;g++){ const v=min+(max-min)*g/4; const yy=y(v); ctx.beginPath(); ctx.moveTo(padL,yy); ctx.lineTo(W-padR,yy); ctx.stroke(); ctx.fillText(Math.round(v),padL-4,yy+3); }
 ctx.textAlign='center'; labels.forEach(function(l,i){ ctx.fillText(l,x(i),H-8); });
 series.forEach(function(s){ ctx.strokeStyle=s.color; ctx.lineWidth=s.dash?1.5:2.5; if(s.dash)ctx.setLineDash([5,4]); else ctx.setLineDash([]);
 ctx.beginPath(); s.data.forEach(function(v,i){ if(v==null)return; if(i===0||s.data[i-1]==null)ctx.moveTo(x(i),y(v)); else ctx.lineTo(x(i),y(v)); }); ctx.stroke();
 if(!s.dash){ ctx.fillStyle=s.color; s.data.forEach(function(v,i){ if(v==null)return; ctx.beginPath(); ctx.arc(x(i),y(v),3,0,7); ctx.fill(); }); } });
 ctx.setLineDash([]);
}
function pieChart(canvas, slices){
 const ctx=canvas.getContext('2d'); const W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
 const cx=W*0.34, cy=H/2, R=Math.min(W*0.5,H)/2-6; const tot=slices.reduce(function(a,b){return a+b.v;},0)||1;
 let a=-Math.PI/2;
 slices.forEach(function(s){ const ang=Math.PI*2*s.v/tot; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,R,a,a+ang); ctx.closePath(); ctx.fillStyle=s.color; ctx.fill(); a+=ang; });
 // legend
 ctx.font='11px sans-serif'; ctx.textAlign='left'; let ly=14;
 slices.forEach(function(s){ ctx.fillStyle=s.color; ctx.fillRect(W*0.62,ly-9,10,10); ctx.fillStyle='#334155'; ctx.fillText(s.label+' '+Math.round(s.v/tot*100)+'%',W*0.62+15,ly); ly+=17; });
}
