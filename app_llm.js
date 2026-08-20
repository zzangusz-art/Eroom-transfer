/* ===================== 이룸편입 LMS · LLM LAYER (Claude) =====================
   - 결정적 데이터(점수/분석/추천)는 항상 내장 AI.* 로 로컬 계산
   - 자연어 응답(튜터/해설/코칭)만 Claude 프록시(/api/ai) 사용
   - 키 미설정/오류/오프라인 시 자동으로 내장 로직 폴백 */
const LLM = {
  enabled:false, model:null, checked:false,
  hasFetch(){ return (typeof fetch==='function'); },
  init(){
    if(!LLM.hasFetch()){ LLM.enabled=false; LLM.checked=true; return Promise.resolve(); }
    return fetch('/api/ai/status',{headers:eHdr()}).then(function(r){return r.json();})
      .then(function(j){ LLM.enabled=!!(j&&j.enabled); LLM.model=j&&j.model||null; })
      .catch(function(){ LLM.enabled=false; })
      .then(function(){ LLM.checked=true; });
  },
  ask(system, prompt, maxTokens){
    if(!LLM.enabled || !LLM.hasFetch()) return Promise.resolve(null);
    return fetch('/api/ai',{method:'POST',headers:eHdr({'content-type':'application/json'}),
        body:JSON.stringify({system:system, prompt:prompt, maxTokens:maxTokens||600})})
      .then(function(r){return r.json();})
      .then(function(j){ if(j && j.enabled===false){ LLM.enabled=false; return null; }
        return (j && j.text) ? String(j.text).trim() : null; })
      .catch(function(){ return null; });
  },

  /* 학생 데이터 요약(프롬프트 컨텍스트) — DB에서만 추출, 점수 날조 방지 */
  context(studentId){
    const s = acf(DB.students).find(function(x){return x.id===studentId;}) || {};
    const lt = acf(DB.levelTests).filter(function(t){return t.studentId===studentId;}).slice(-1)[0];
    const da = AI.detailAnalysis(studentId);
    const att = attitude(studentId);
    const sess = DB.sessions.filter(function(x){return x.studentId===studentId;});
    const overall = sess.length ? Math.round(sess.reduce(function(a,b){return a+b.rate;},0)/sess.length) : (lt?lt.rate:0);
    let lines = [];
    lines.push('이름: '+(s.name||'학생')+' / 배정반: '+(s.cls?tierName(s.cls):'미배정')+' / 목표: '+(s.goalSchool||'미정')+' '+(s.goalDept||''));
    lines.push('누적 정답률: '+pct(overall)+' (세션 '+sess.length+'회)');
    if(lt) lines.push('레벨테스트: '+lt.score+'/40, 어휘 '+lt.sections.vocab+'/10 문법 '+lt.sections.grammar+'/10 독해 '+lt.sections.reading+'/10 논리 '+lt.sections.logic+'/10');
    for(const sec of Object.keys(SECTIONS)){
      const dd=da[sec]; if(!dd||!dd.total) continue;
      const rows=dd.rows.filter(function(r){return r.total>0;}).map(function(r){return r.sub+' '+pct(r.rate);}).join(', ');
      lines.push(SECTIONS[sec]+'('+pct(dd.rate)+'): '+rows);
    }
    lines.push('태도(출결): '+(att.score==null?'데이터없음':pct(att.score)+' '+att.label+' (출석'+att.present+'/지각'+att.late+'/결석'+att.absent+')'));
    const match = AI.schoolMatch(overall, s.goalSchool);
    lines.push('지원가능 후보: '+match.list.slice(0,6).map(function(u){return u.uni+'('+u.band+',경쟁률'+u.ratio+')';}).join(', '));
    return lines.join('\n');
  },

  tutor(msg, studentId){
    const sys='You are E-ROOM, a warm and practical Korean 편입(university transfer) English study coach. '
      +'Answer in natural Korean, concise (3-6 sentences), encouraging and specific. '
      +'Use ONLY the provided student data; never invent scores or universities. '
      +'If the question is unrelated to study, gently steer back to learning.';
    const prompt='[학생 데이터]\n'+LLM.context(studentId)+'\n\n[학생 질문]\n'+msg+'\n\n위 데이터에 근거해 한국어로 답하세요.';
    return LLM.ask(sys, prompt, 500).then(function(out){ return out || AI.tutor(msg, studentId); });
  },
  explainQ(q, picked){
    const sys='You are an expert Korean 편입 English teacher. In Korean, explain concisely (3-4 sentences) '
      +'why the correct option is right and, if a wrong option was chosen, why it is wrong. End with one short study tip.';
    const opts=q.options.map(function(o,i){return 'ABCD'[i]+'. '+o;}).join(' / ');
    const prompt='영역: '+SECTIONS[q.section]+(q.tag?' ['+q.tag+']':'')
      +'\n'+(q.passage?('지문: '+q.passage+'\n'):'')
      +'문제: '+q.stem+'\n보기: '+opts
      +'\n정답: '+'ABCD'[q.answer]+'. '+q.options[q.answer]
      +(picked!=null&&picked!==q.answer?('\n학생 선택(오답): '+'ABCD'[picked]+'. '+q.options[picked]):'')
      +(q.explanation?('\n참고 해설: '+q.explanation):'');
    return LLM.ask(sys, prompt, 400);
  },
  coach(studentId){
    const sys='You are E-ROOM study coach. Write a Korean coaching note (4-6 sentences): '
      +'praise one concrete strength, name the single weakest sub-element with a specific next action and recommended test, '
      +'comment briefly on attendance if relevant, and close with one motivating line. Use ONLY provided data.';
    return LLM.ask(sys, LLM.context(studentId), 550);
  }
};
