/* ===================== 이룸편입 LMS · AI ENGINE ===================== */
/* 세부 요소 고정 분류 체계 (영역별) */
const SUBELEMENTS = {
 vocab:['동의어·유의어','반의어','빈칸·문맥추론','어휘정의'],
 grammar:['수일치·명사','시제·완료·태','부정사·동명사','분사·관계사','전치사·접속사','가정법·도치·강조','비교·기타'],
 reading:['주제·요지','세부내용·일치','추론·함의','문맥어휘','글의구조·빈칸'],
 logic:['대조·양보','인과·결과','첨가·부연','예시·구체화','조건·가정','문맥·종합']
};
function elementOf(section, tag){
 tag = tag||'';
 if(section==='vocab'){
 if(/반의/.test(tag)) return '반의어';
 if(/빈칸|문맥/.test(tag)) return '빈칸·문맥추론';
 if(/정의|뜻/.test(tag)) return '어휘정의';
 return '동의어·유의어';
 }
 if(section==='grammar'){
 if(/가정법|도치|강조|if 생략|but for|as if|as though/.test(tag)) return '가정법·도치·강조';
 if(/분사|관계/.test(tag)) return '분사·관계사';
 if(/전치사|접속사|양보|상관|so that|no sooner|scarcely|as well as|such~that|so~that/.test(tag)) return '전치사·접속사';
 if(/부정사|동명사|-ing|gerund/.test(tag)) return '부정사·동명사';
 if(/시제|완료|수동|조동사|사역|제안|주장|당위|미래|과거|would|prefer/.test(tag)) return '시제·완료·태';
 if(/수일치|일치|명사|관사|복수|가산|number of|many a|each/.test(tag)) return '수일치·명사';
 if(/비교|형용사|부사|대명사/.test(tag)) return '비교·기타';
 return '비교·기타';
 }
 if(section==='reading'){
 if(/주제|요지|제목/.test(tag)) return '주제·요지';
 if(/세부|내용|일치/.test(tag)) return '세부내용·일치';
 if(/어휘/.test(tag)) return '문맥어휘';
 if(/추론|함의/.test(tag)) return '추론·함의';
 if(/무관|순서|삽입|빈칸|구조|흐름/.test(tag)) return '글의구조·빈칸';
 return '추론·함의';
 }
 if(/대조|양보|역접|반대/.test(tag)) return '대조·양보';
 if(/인과|결과|원인/.test(tag)) return '인과·결과';
 if(/첨가|부연|동시|유사|나열/.test(tag)) return '첨가·부연';
 if(/예시|구체/.test(tag)) return '예시·구체화';
 if(/조건|가정/.test(tag)) return '조건·가정';
 if(/문맥|종합/.test(tag)) return '문맥·종합';
 return '문맥·종합';
}

const AI = {
 placeClass(rate){
 const cls = classOf(rate);
 return Object.assign({ cls:cls }, TIERS[cls], {
 reason: rate>=80 ? '정답률 '+pct(rate)+'. 심화·실전 문항 위주로 가면 됩니다.'
 : rate>=60 ? '정답률 '+pct(rate)+'. 약한 영역을 메우면 한 단계 위를 볼 수 있습니다.'
 : '정답률 '+pct(rate)+'. 어휘와 어법 기초부터 쌓는 구간입니다.' });
 },
 weakness(sectionRates){
 const arr = Object.entries(sectionRates).map(function(e){ return {sec:e[0], rate:e[1]}; });
 arr.sort(function(a,b){ return a.rate-b.rate; });
 return { ranked:arr, weakest:arr[0], strongest:arr[arr.length-1],
 weak:arr.filter(function(x){return x.rate<60;}).map(function(x){return x.sec;}),
 strong:arr.filter(function(x){return x.rate>=80;}).map(function(x){return x.sec;}) };
 },
 tagWeakness(studentId){
 const counts = {};
 for(const s of DB.sessions.filter(function(x){return x.studentId===studentId;})){
 for(const d of (s.detail||[])){
 if(!d.tag) continue;
 counts[d.tag] = counts[d.tag] || {wrong:0,total:0};
 counts[d.tag].total++; if(!d.correct) counts[d.tag].wrong++;
 }
 }
 return Object.entries(counts).map(function(e){ const tag=e[0],c=e[1]; return {tag:tag, wrong:c.wrong, total:c.total, rate: c.total? Math.round((c.total-c.wrong)/c.total*100):0}; })
 .filter(function(x){return x.total>=2;}).sort(function(a,b){return a.rate-b.rate;});
 },
 detailAnalysis(studentId){
 const acc={};
 for(const sec of Object.keys(SECTIONS)){ acc[sec]={}; SUBELEMENTS[sec].forEach(function(s){ acc[sec][s]={right:0,total:0}; }); }
 for(const s of DB.sessions.filter(function(x){return x.studentId===studentId;})){
 for(const d of (s.detail||[])){
 const sec=d.section; if(!acc[sec]) continue;
 const sub=elementOf(sec, d.tag);
 if(!acc[sec][sub]) acc[sec][sub]={right:0,total:0};
 acc[sec][sub].total++; if(d.correct) acc[sec][sub].right++;
 }
 }
 const out={};
 for(const sec of Object.keys(SECTIONS)){
 const rows=SUBELEMENTS[sec].map(function(sub){ const c=acc[sec][sub]||{right:0,total:0}; return {sub:sub, right:c.right, total:c.total, rate: c.total?Math.round(c.right/c.total*100):0}; });
 const att=rows.filter(function(r){return r.total>0;}).slice().sort(function(a,b){return a.rate-b.rate;});
 const tot=att.reduce(function(a,b){return a+b.total;},0), rt=att.reduce(function(a,b){return a+b.right;},0);
 out[sec]={ rows:rows, rate: tot?Math.round(rt/tot*100):0, total:tot, weakest:att[0]||null, strongest:att[att.length-1]||null };
 }
 return out;
 },
 detailComment(sec, data){
 if(!data || !data.total) return SECTIONS[sec]+'는 아직 푼 문항이 없습니다.';
 const w=data.weakest, s=data.strongest;
 if(w && w.rate<60) return SECTIONS[sec]+'에서 가장 낮은 것은 '+w.sub+' '+w.rate+'% 입니다.';
 if(s && data.rate>=80) return SECTIONS[sec]+'는 '+data.rate+'%로 안정적입니다. 그중 '+s.sub+'가 '+s.rate+'%로 가장 높습니다.';
 return SECTIONS[sec]+'는 요소마다 점수 차이가 있습니다.';
 },
 recommend(studentId, n){
 n = n||10;
 const w = AI.tagWeakness(studentId);
 const weakTags = new Set(w.filter(function(x){return x.rate<70;}).map(function(x){return x.tag;}));
 const stu = acf(DB.students).find(function(s){return s.id===studentId;});
 const lvl = stu && stu.cls==='A' ? 3 : stu && stu.cls==='B' ? 2 : 1;
 let pool = QUESTIONS.filter(function(q){ return Math.abs((q.level||2)-lvl)<=1; });
 if(pool.length < n) pool = QUESTIONS.slice();            /* 단계 조건으로 문항이 부족하면 전체에서 출제 */
 if(!pool.length) return [];
 /* 약한 유형 가중치 — 세부유형(elementOf) 기준으로도 가중 */
 const weakSubs = new Set();
 try{
   (typeof myWeakSubs==='function' ? myWeakSubs(studentId, 6) : []).forEach(function(x){
     if(x.rate < 70) weakSubs.add(x.section + '|' + x.sub);
   });
 }catch(e){}
 const scored = pool.map(function(q){
   let wt = 1;
   if(weakTags.has(q.tag)) wt += 2;
   try{
     const el = (typeof elementOf==='function') ? elementOf(q.section, q.tag) : (q.tag||'');
     if(weakSubs.has(q.section + '|' + el)) wt += 2;
   }catch(e){}
   return {q:q, key: Math.random() / wt};                  /* 가중 무작위 추출 */
 });
 scored.sort(function(a,b){ return a.key - b.key; });
 const out=[], seen={};
 for(let i=0; i<scored.length && out.length<n; i++){
   const q = scored[i].q;
   if(seen[q.id]) continue;
   seen[q.id] = 1; out.push(q);
 }
 return (typeof varySet==='function') ? varySet(out) : out;
 },
 studyPlan(sectionRates, cls){
 const wk = AI.weakness(sectionRates);
 const order = wk.ranked.map(function(x){return x.sec;});
 const stage = cls==='A'?'3단계 심화':cls==='B'?'2단계 응용':'1단계 기초';
 const days = ['월','화','수','목','금'];
 const plan = days.map(function(d,i){
 const sec = order[i % order.length];
 const rate = sectionRates[sec];
 const focus = rate<60 ? '집중 보강' : rate<80 ? '유형 훈련' : '실전 점검';
 return { day:d, sec:sec, focus:focus, qty: rate<60?20:15, note: SECTIONS[sec]+' '+stage+' · '+focus+' (정답률 '+pct(rate)+')' };
 });
 return { stage:stage, plan:plan, headline:SECTIONS[wk.weakest.sec]+'가 '+pct(wk.weakest.rate)+'로 가장 낮아 여기에 하루를 더 붙였습니다.' };
 },
 schoolMatch(rate, goalSchool){
 const cls = classOf(rate);
 const tierTargets = { A:['A','B'], B:['B','C'], C:['C'] }[cls];
 const cands = UNIVERSITIES.filter(function(u){ return tierTargets.indexOf(u.tier)>=0; });
 function bucket(u){
 if(u.tier==='A') return rate>=85?'적정':'도전';
 if(u.tier==='B') return rate>=72?'안정':rate>=60?'적정':'도전';
 return rate>=60?'안정':'적정';
 }
 let list = cands.map(function(u){ return {uni:u.uni, tier:u.tier, ratio:u.avgRatio, quota:u.totalQuota, depts:u.deptCount, band:bucket(u)}; });
 const bandOrder={'도전':0,'적정':1,'안정':2};
 list.sort(function(a,b){ return (bandOrder[a.band]-bandOrder[b.band]) || (a.tier<b.tier?-1:1) || (a.ratio-b.ratio); });
 const goal = goalSchool ? UNIVERSITIES.find(function(u){return u.uni===goalSchool || u.uni.indexOf(goalSchool)>=0;}) : null;
 let goalNote=null;
 if(goal){
 const need = tierOf(goal.tier).min;
 goalNote = { uni:goal.uni, tier:goal.tier, ratio:goal.avgRatio, gap: Math.round(need-rate),
 msg: rate>=need ? ('목표 '+goal.uni+' 기준 정답률은 넘겼습니다. 남은 것은 시간 안에 이 점수를 유지하는 연습입니다.')
 : ('목표 '+goal.uni+'까지 '+Math.max(0,Math.round(need-rate))+'%p 남았습니다. 위의 「먼저 손볼 것」부터 올리면 가장 빠릅니다.') };
 }
 return { cls:cls, list:list.slice(0,18), goalNote:goalNote };
 },
 explain(q, picked){
 const base = q.explanation || '';
 const correctTxt = q.options[q.answer];
 let coach='';
 if(q.section==='vocab') coach = "표제어 '"+(q.headword||correctTxt)+"'와 동의어 관계를 소리 내어 반복 암기하세요.";
 else if(q.section==='grammar') coach = '['+(q.tag||'어법')+'] 포인트입니다. 오답 보기가 왜 틀렸는지 한 문장으로 설명할 수 있어야 합니다.';
 else if(q.section==='logic') coach = '빈칸 앞뒤의 논리 관계(['+(q.tag||'관계')+'])를 먼저 규정한 뒤 연결어를 골랐는지 점검하세요.';
 else coach = '['+(q.tag||'독해')+'] 유형 — 정답의 근거 문장을 지문에서 직접 찾는 연습을 하세요.';
 const wrongNote = (picked!=null && picked!==q.answer) ? "\n선택한 '"+q.options[picked]+"'은(는) 정답이 아닙니다. 정답은 '"+correctTxt+"'." : '';
 return { text: base + wrongNote, coach:coach };
 },
 tutor(msg, studentId){
 const m = msg.toLowerCase();
 const sess = DB.sessions.filter(function(s){return s.studentId===studentId;});
 const last = sess[sess.length-1];
 if(/약점|취약|부족|어디/.test(msg)){
 if(!last) return '아직 학습 기록이 없습니다. 테스트 센터에서 몇 세트를 풀면 약점을 분석해 드릴게요.';
 const wk = AI.tagWeakness(studentId);
 if(wk.length) return '최근 기록상 가장 취약한 세부유형은 ['+wk[0].tag+'] (정답률 '+pct(wk[0].rate)+') 입니다. 이 유형을 집중 추천 문제로 풀어보세요.';
 return '영역별로는 큰 약점이 없습니다. 실전 모의고사로 시간 관리를 점검해 보세요.';
 }
 if(/태도|출결|출석|결석|지각/.test(msg)){
 const a=attitude(studentId);
 if(a.score==null) return '아직 출결 데이터가 없습니다. 수업 출석이 기록되면 태도 점수를 분석해 드립니다.';
 return '현재 태도 점수는 '+pct(a.score)+' ('+a.label+')입니다. 출석 '+a.present+'·지각 '+a.late+'·결석 '+a.absent+'회 기준이며, 출결은 성적 향상과 직결됩니다.';
 }
 if(/대학|학교|지원|어디까지/.test(msg)){
 const stu=acf(DB.students).find(function(s){return s.id===studentId;});
 const lt=acf(DB.levelTests).filter(function(t){return t.studentId===studentId;}).slice(-1)[0];
 const rate = lt?lt.rate:60;
 const r=AI.schoolMatch(rate, stu&&stu.goalSchool);
 return '현재 수준(정답률 '+pct(rate)+', '+r.cls+'반)에서 '+r.list.slice(0,3).map(function(x){return x.uni;}).join(', ')+' 등이 도전·적정권입니다. 내 성적 → 지원가능 대학에서 자세히 확인하세요.';
 }
 if(/계획|플랜|어떻게 공부|공부법/.test(msg)){
 return '내 성적 페이지의 [AI 맞춤 학습플랜]에서 약점 기반 주 5일 순환 플랜을 생성해 드립니다. 가장 취약한 영역부터 배치됩니다.';
 }
 if(/단어|어휘|voca/.test(m)) return '어휘는 동의어 쌍 암기가 핵심입니다. 테스트 센터 → 단어테스트로 인출 연습을 반복하세요.';
 return '질문을 이해했어요. 내 약점, 지원 가능 대학, 학습 계획, 출결 태도 같은 주제로 물어보면 데이터 기반으로 답해 드립니다.';
 }
};
