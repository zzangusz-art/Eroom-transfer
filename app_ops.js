/* ===================== 이룸편입 LMS · 운영 도구 (알림·CSV·자동채점·스트릭) ===================== */
const OPS = {
  /* A1. 미이수 위험: 수강기한 임박(D-1 이하)인데 2회독 미완료 */
  atRisk(students){
    var out=[];
    (students||[]).forEach(function(s){
      if(s.testOnly) return;
      var lecs=(typeof VOD!=='undefined')?VOD.list(s):[];
      lecs.forEach(function(l){
        if(VOD.notOpen(l)) return;
        var r=VOD.rec(s.id,l.id); if(r.count>=VOD.REQ) return;
        var dl=VOD.daysLeft(l);
        if(dl<=1) out.push({sid:s.id,name:s.name,phone:s.phone||'',lecture:l.title,day:l.day||null,due:VOD.deadline(l),left:dl,count:r.count,prog:r.prog||0,over:dl<0});
      });
    });
    return out.sort(function(a,b){ return a.left-b.left; });
  },
  /* A3. 이용기간 만료 임박(D-7 이내) */
  expiring(students,days){
    days=days||7; var t=todayStr(); var out=[];
    (students||[]).forEach(function(s){
      if(!s.validUntil) return;
      var left=Math.ceil((new Date(s.validUntil+'T23:59:59')-new Date())/86400000);
      if(left<=days) out.push({sid:s.id,name:s.name,phone:s.phone||'',until:s.validUntil,left:left,expired:left<0});
    });
    return out.sort(function(a,b){ return a.left-b.left; });
  },
  /* C2. 연속 학습일(스트릭) — 시청/시험 기록 기준 */
  streak(sid){
    var days={}; var w=(DB.watch||{})[sid]||{};
    Object.keys(w).forEach(function(k){ if(w[k].certifiedAt) days[w[k].certifiedAt]=1; if(w[k].openedAt) days[w[k].openedAt]=1; });
    (DB.sessions||[]).filter(function(x){return x.studentId===sid;}).forEach(function(x){ days[x.date]=1; });
    var n=0, d=new Date();
    for(var i=0;i<400;i++){ var ds=todayStr(d); if(days[ds]) n++; else if(i>0) break; d.setDate(d.getDate()-1); }
    return n;
  },
  /* C2. 랭킹 (이수율 + 평가 평균) */
  ranking(students){
    return (students||[]).filter(function(s){return !s.testOnly;}).map(function(s){
      var sm=(typeof VOD!=='undefined')?VOD.summary(s.id):{rate:0,twice:0,total:0};
      var sc=[]; (acf(DB.assessments)||[]).forEach(function(a){ var r=((DB.scores||{})[a.id]||{})[s.id]; if(r&&r.score!=null) sc.push(+r.score/(a.maxScore||100)*100); });
      var avg=sc.length?Math.round(sc.reduce(function(x,y){return x+y;},0)/sc.length):0;
      return {sid:s.id,name:s.name,rate:sm.rate,twice:sm.twice,total:sm.total,avg:avg,streak:OPS.streak(s.id),score:Math.round(sm.rate*0.6+avg*0.4)};
    }).sort(function(a,b){ return b.score-a.score; });
  },
  /* B1. CSV */
  toCSV(rows,cols){
    var esc2=function(v){ v=(v==null?'':String(v)); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
    return '﻿'+cols.map(function(c){return esc2(c[1]);}).join(',')+'\n'
      + rows.map(function(r){ return cols.map(function(c){ return esc2(typeof c[0]==='function'?c[0](r):r[c[0]]); }).join(','); }).join('\n');
  },
  download(name,text){
    try{ var b=new Blob([text],{type:'text/csv;charset=utf-8;'}); var u=URL.createObjectURL(b);
      var a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click();
      setTimeout(function(){ URL.revokeObjectURL(u); a.remove(); },500); }catch(e){ alert('다운로드에 실패했습니다'); }
  },
  copy(text){ if(navigator.clipboard) navigator.clipboard.writeText(text); toast('클립보드에 복사되었습니다'); },
  parseCSV(text){
    var lines=String(text).replace(/^﻿/,'').split(/\r?\n/).filter(function(l){return l.trim();});
    return lines.map(function(l){ var out=[],cur='',q=false;
      for(var i=0;i<l.length;i++){ var c=l[i];
        if(q){ if(c==='"'&&l[i+1]==='"'){cur+='"';i++;} else if(c==='"'){q=false;} else cur+=c; }
        else { if(c==='"')q=true; else if(c===','){out.push(cur);cur='';} else cur+=c; } }
      out.push(cur); return out.map(function(x){return x.trim();}); });
  },
  /* B2. 자동 채점: 정답표(answerKey) + 학생 제출(answers) */
  autoGrade(assess, ans){
    var key=(assess.answerKey||'').split(/[\s,]+/).filter(Boolean);
    var subj=assess.subjKey||{};
    var subjNos=Object.keys(subj).map(Number).filter(function(n){return n>0;});
    if(!key.length && !subjNos.length) return null;
    var a=(ans||'').split(/[\s,]+/);
    function norm(t){ return String(t==null?'':t).toLowerCase().replace(/[\s.,'"`]/g,'').trim(); }
    var total=0, right=0, marks=[];
    var maxNo=Math.max(key.length, subjNos.length?Math.max.apply(null,subjNos):0);
    for(var i=1;i<=maxNo;i++){
      var mine=a[i-1];
      if(subj[i]!=null && String(subj[i]).trim()){
        total++;
        var accepted=String(subj[i]).split('/').map(norm).filter(Boolean);
        var ok=accepted.indexOf(norm(mine))>=0;
        if(ok) right++;
        marks.push({no:i, kind:'주관식', my:(mine||'-'), ans:subj[i], ok:ok});
      } else if(key[i-1] && key[i-1]!=='-'){
        total++;
        var ok2=norm(mine)===norm(key[i-1]);
        if(ok2) right++;
        marks.push({no:i, kind:'객관식', my:(mine||'-'), ans:key[i-1], ok:ok2});
      }
    }
    if(!total) return null;
    return { right:right, total:total, score:Math.round(right/total*(assess.maxScore||100)), marks:marks };
  },
  /* C1. 주간 리포트 텍스트 (카톡 발송용) */
  weeklyText(s){
    var sm=(typeof VOD!=='undefined')?VOD.summary(s.id):{rate:0,twice:0,total:0,done:0};
    var sc=[]; (acf(DB.assessments)||[]).forEach(function(a){ var r=((DB.scores||{})[a.id]||{})[s.id]; if(r&&r.score!=null) sc.push({t:a.title,v:r.score,m:a.maxScore||100}); });
    var avg=sc.length?Math.round(sc.reduce(function(x,y){return x+y.v;},0)/sc.length):0;
    var risk=OPS.atRisk([s]).length;
    return '['+ (DB.config&&DB.config.brand||'이룸편입') +'] '+s.name+' 학생 주간 리포트\n'
      +'· 강의 이수율: '+pct(sm.rate)+' ('+sm.done+'/'+sm.total+' 인정)\n'
      +'· 2회독 완료: '+sm.twice+'/'+sm.total+'강\n'
      +'· 평가 평균: '+(sc.length?avg+'점 ('+sc.length+'회)':'응시 없음')+'\n'
      +'· 연속 학습: '+OPS.streak(s.id)+'일\n'
      +(risk?('· 주의: 수강기한 임박 미이수 '+risk+'건\n'):'')
      +'항상 응원합니다. 문의는 이룸편입으로 연락 주세요.';
  }
};

/* ---------- 관리자: 운영 알림 센터 ---------- */
function opsCenter(){
  const role=CURRENT.role;
  const mine = role==='instructor'? acf(DB.students).filter(function(s){return s.instructorId===CURRENT.id;}) : acf(DB.students).filter(function(s){return !s.testOnly;});
  const risk=OPS.atRisk(mine), exp=OPS.expiring(mine,7), rank=OPS.ranking(mine);
  let html=head('운영 알림','지금 연락해야 할 학생 명단입니다');
  html+='<div class="stats">'+card('미이수 위험',risk.length,'기한 임박/초과',risk.length?'#ef4444':'#059669')
    +card('만료 임박',exp.filter(function(x){return !x.expired;}).length,'7일 이내','#d97706')
    +card('이미 만료',exp.filter(function(x){return x.expired;}).length,'재등록 필요','#ef4444')
    +card('관리 학생',mine.length,'전체')+'</div>';
  html+='<div class="panel"><h3>미이수 위험 (수강기한 D-1 이하 · 2회독 미완료)</h3>'
    +'<div class="bar-actions" style="margin-bottom:10px"><button class="btn ghost rptmini" id="riskCopy">카톡 명단 복사</button><button class="btn ghost rptmini" id="riskCsv">CSV 내려받기</button></div>'
    +(risk.length?'<div class="tbl-wrap"><table class="tbl"><thead><tr><th>학생</th><th>연락처</th><th>강의</th><th>기한</th><th>남은일</th><th>회독</th></tr></thead><tbody>'
      +risk.map(function(r){ return '<tr><td><b>'+esc(r.name)+'</b></td><td>'+esc(r.phone||'-')+'</td><td>'+(r.day?('Day '+r.day+' · '):'')+esc(r.lecture)+'</td><td>'+r.due+'</td>'
        +'<td><span class="pill" style="--c:'+(r.over?'#ef4444':'#d97706')+'">'+(r.over?'초과':'D-'+r.left)+'</span></td><td>'+r.count+'/'+VOD.REQ+'</td></tr>'; }).join('')
      +'</tbody></table></div>':'<div class="muted">현재 기한 임박 미이수 학생이 없습니다.</div>')+'</div>';
  html+='<div class="panel"><h3>이용기간 만료 임박 (D-7)</h3>'
    +'<div class="bar-actions" style="margin-bottom:10px"><button class="btn ghost rptmini" id="expCopy">재등록 안내 명단 복사</button><button class="btn ghost rptmini" id="expCsv">CSV 내려받기</button></div>'
    +(exp.length?'<div class="tbl-wrap"><table class="tbl"><thead><tr><th>학생</th><th>연락처</th><th>만료일</th><th>상태</th><th>연장</th></tr></thead><tbody>'
      +exp.map(function(e){ return '<tr><td><b>'+esc(e.name)+'</b></td><td>'+esc(e.phone||'-')+'</td><td>'+e.until+'</td>'
        +'<td><span class="pill" style="--c:'+(e.expired?'#ef4444':'#d97706')+'">'+(e.expired?'만료':'D-'+e.left)+'</span></td>'
        +'<td><button class="lnk" data-ext="'+e.sid+'">+30일</button></td></tr>'; }).join('')+'</tbody></table></div>':'<div class="muted">만료 임박 학생이 없습니다.</div>')+'</div>';
  html+='<div class="panel"><h3>학습 랭킹 · 연속 학습일</h3>'
    +'<div class="bar-actions" style="margin-bottom:10px"><button class="btn ghost rptmini" id="wkCopy">주간 리포트 문구 복사(1위 기준)</button></div>'
    +(rank.length?'<div class="tbl-wrap"><table class="tbl"><thead><tr><th>순위</th><th>학생</th><th>이수율</th><th>2회독</th><th>평가평균</th><th>연속</th><th>종합</th></tr></thead><tbody>'
      +rank.slice(0,15).map(function(r,i){ return '<tr><td><b>'+(i+1)+'</b></td><td>'+esc(r.name)+'</td><td>'+pct(r.rate)+'</td><td>'+r.twice+'/'+r.total+'</td><td>'+r.avg+'점</td>'
        +'<td>'+(r.streak?('<span class="pill" style="--c:#059669">'+r.streak+'일</span>'):'-')+'</td><td><b>'+r.score+'</b></td></tr>'; }).join('')+'</tbody></table></div>':'<div class="muted">데이터가 없습니다.</div>')+'</div>';
  page(html);
  var riskCols=[['name','학생'],['phone','연락처'],['lecture','강의'],['due','수강기한'],[function(r){return r.over?'초과':'D-'+r.left;},'남은일'],[function(r){return r.count+'/'+VOD.REQ;},'회독']];
  var expCols=[['name','학생'],['phone','연락처'],['until','만료일'],[function(e){return e.expired?'만료':'D-'+e.left;},'상태']];
  var el1=document.getElementById('riskCopy'); if(el1) el1.onclick=function(){ OPS.copy(risk.map(function(r){return r.name+' '+(r.phone||'')+' / '+r.lecture+' / 기한 '+r.due;}).join('\n')||'대상 없음'); };
  var el2=document.getElementById('riskCsv'); if(el2) el2.onclick=function(){ OPS.download('미이수위험_'+todayStr()+'.csv', OPS.toCSV(risk,riskCols)); };
  var el3=document.getElementById('expCopy'); if(el3) el3.onclick=function(){ OPS.copy(exp.map(function(e){return e.name+' '+(e.phone||'')+' / 만료 '+e.until;}).join('\n')||'대상 없음'); };
  var el4=document.getElementById('expCsv'); if(el4) el4.onclick=function(){ OPS.download('만료임박_'+todayStr()+'.csv', OPS.toCSV(exp,expCols)); };
  var el5=document.getElementById('wkCopy'); if(el5) el5.onclick=function(){ var s=mine.find(function(x){return rank.length&&x.id===rank[0].sid;}); OPS.copy(s?OPS.weeklyText(s):'대상 없음'); };
  $$('#page [data-ext]').forEach(function(b){ b.onclick=function(){ var st=acf(DB.students).find(function(x){return x.id===b.dataset.ext;}); if(!st)return;
    var base=(st.validUntil&&st.validUntil>=todayStr())?st.validUntil:todayStr(); st.validUntil=addDays(30,base); save(); toast(st.name+' 이용기한 → '+st.validUntil); opsCenter(); }; });
}

/* ---------- 관리자: CSV 일괄 등록/내보내기 ---------- */
function dataCenter(){
  let html=head('데이터 관리','명단 일괄 등록과 자료 내려받기');
  html+='<div class="grid2"><div class="panel"><h3>CSV 일괄 등록</h3>'
    +'<p class="muted dc-desc">헤더: 이름,아이디,비밀번호,연락처,희망대학,희망학과,학부모연락처,학교학년,특이사항,이용만료일</p>'
    +'<div class="upl-row"><input type="file" id="csvF" accept=".csv"><button class="btn ghost rptmini" id="csvTpl">양식 내려받기</button></div>'
    +'<button class="btn" id="csvImp">업로드 · 일괄 등록</button><div id="csvMsg" class="muted" style="margin-top:8px"></div></div>'
    +'<div class="panel"><h3>내보내기</h3><p class="muted dc-desc">엑셀에서 바로 열 수 있는 CSV로 저장됩니다.</p>'
    +'<div class="bar-actions" style="flex-wrap:wrap;gap:8px"><button class="btn ghost" id="expStu">학생 명단</button><button class="btn ghost" id="expLec">회독 현황</button><button class="btn ghost" id="expSc">평가 성적</button></div></div></div>';
  page(html);
  document.getElementById('csvTpl').onclick=function(){
    OPS.download('학생등록_양식.csv','﻿이름,아이디,비밀번호,연락처,희망대학,희망학과,학부모연락처,학교학년,특이사항,이용만료일\n홍길동,hong01,1234,010-0000-0000,연세대,경영학과,010-1111-1111,OO대 2학년,논리 취약,'+addDays(30)+'\n'); };
  document.getElementById('csvImp').onclick=function(){
    var f=((document.getElementById('csvF')||{}).files||[])[0];
    if(!f){ alert('CSV 파일을 선택해 주세요'); return; }
    var rd=new FileReader();
    rd.onload=function(){
      var rows=OPS.parseCSV(rd.result); if(rows.length<2){ alert('데이터가 없습니다'); return; }
      var added=0,skip=0,newAccounts=[];
      rows.slice(1).forEach(function(r){
        var name=r[0],user=r[1],pw=r[2]||'1234';
        if(!name||!user) { skip++; return; }
        if(acf(DB.students).some(function(x){return x.username===user;})){ skip++; return; }
        var st={id:uid('s'),name:name,username:user,pw:pw,cls:null,instructorId:null,phone:r[3]||'',goalSchool:r[4]||'',goalDept:r[5]||'',parentPhone:r[6]||'',school:r[7]||'',note:r[8]||'',memo:'',validFrom:todayStr(),validUntil:r[9]||null,createdAt:todayStr()};
        DB.students.push(st); newAccounts.push({username:user,pw:pw,role:'student',id:st.id,name:name}); added++;
      });
      save();
      if(typeof Auth!=='undefined' && Auth.online && newAccounts.length){
        fetch('/api/auth/set',{method:'POST',headers:eHdr({'content-type':'application/json'}),body:JSON.stringify({accounts:newAccounts})})
          .then(function(){ newAccounts.forEach(function(a){ var u=acf(DB.students).find(function(x){return x.id===a.id;}); if(u) delete u.pw; }); save(); }).catch(function(){});
      }
      document.getElementById('csvMsg').innerHTML='<b style="color:#059669">'+added+'명 등록 완료</b>'+(skip?(' · '+skip+'건 건너뜀(중복/누락)'):'');
      toast(added+'명이 등록되었습니다');
    };
    rd.readAsText(f,'utf-8');
  };
  document.getElementById('expStu').onclick=function(){
    var rows=acf(DB.students).filter(function(s){return !s.testOnly;});
    OPS.download('학생명단_'+todayStr()+'.csv', OPS.toCSV(rows,[['name','이름'],['username','아이디'],[function(s){return s.cls?tierName(s.cls):'미배정';},'반'],['phone','연락처'],['goalSchool','희망대학'],['goalDept','희망학과'],['parentPhone','학부모연락처'],['school','학교학년'],['note','특이사항'],['validUntil','이용만료일'],['createdAt','등록일']]));
  };
  document.getElementById('expLec').onclick=function(){
    var rows=[];
    acf(DB.students).filter(function(s){return !s.testOnly;}).forEach(function(s){
      (VOD.list(s)||[]).forEach(function(l){ var r=VOD.rec(s.id,l.id); var st=VOD.status(s.id,l);
        rows.push({name:s.name,lec:l.title,day:l.day||'',open:l.openDate||'',due:VOD.deadline(l),count:r.count,prog:r.prog||0,stat:st.t}); }); });
    OPS.download('회독현황_'+todayStr()+'.csv', OPS.toCSV(rows,[['name','학생'],['lec','강의'],['day','Day'],['open','공개일'],['due','수강기한'],['count','회독'],['prog','진도율'],['stat','상태']]));
  };
  document.getElementById('expSc').onclick=function(){
    var rows=[];
    (acf(DB.assessments)||[]).forEach(function(a){ var sc=(DB.scores||{})[a.id]||{};
      acf(DB.students).filter(function(s){return !s.testOnly;}).forEach(function(s){ var r=sc[s.id]||{};
        rows.push({name:s.name,type:assessTypeName(a.type),title:a.title,score:(r.score!=null?r.score:''),max:a.maxScore||100,memo:r.memo||''}); }); });
    OPS.download('평가성적_'+todayStr()+'.csv', OPS.toCSV(rows,[['name','학생'],['type','유형'],['title','평가'],['score','점수'],['max','만점'],['memo','메모']]));
  };
}

/* ---------- 학생 질문 취합 (관리자/강사) ---------- */
function qnaCenter(){
  DB.questionsToTeacher=DB.questionsToTeacher||[];
  const role=CURRENT.role;
  const mine = role==='instructor'? acf(DB.students).filter(function(s){return s.instructorId===CURRENT.id;}).map(function(s){return s.id;}) : null;
  var list=DB.questionsToTeacher.filter(function(q){ return !mine || mine.indexOf(q.studentId)>=0; })
    .slice().sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });
  var wait=list.filter(function(q){return !q.answer;});
  let html=head('학생 질문','답변하면 학생의 성적 화면에 표시됩니다');
  html+='<div class="stats">'+card('전체 질문',list.length,'누적')+card('미답변',wait.length,'답변 필요',wait.length?'#ef4444':'#059669')
    +card('답변 완료',list.length-wait.length,'처리','#059669')+'</div>';
  html+='<div class="panel"><h3>질문 목록</h3>'
    +(list.length? list.map(function(q){
        var stu=acf(DB.students).find(function(x){return x.id===q.studentId;});
        return '<div class="qt-item"><div class="qt-q"><b>Q</b><span>'+esc(q.text)+'</span><i>'+esc((stu?stu.name:q.studentName||'')+' · '+q.date)+'</i></div>'
          +(q.answer? ('<div class="qt-a"><b>A</b><span>'+esc(q.answer)+'</span><i>'+esc(q.answerBy||'')+'</i></div>')
            : ('<div class="qt-w"><textarea class="qt-in" data-q="'+q.id+'" rows="2" placeholder="답변을 입력하세요"></textarea><button class="btn rptmini" data-qa="'+q.id+'">답변 등록</button></div>'))
          +'</div>';
      }).join('') : '<div class="muted">등록된 질문이 없습니다.</div>')
    +'</div>';
  page(html);
  $$('#page [data-qa]').forEach(function(b){ b.onclick=function(){
    var box=document.querySelector('.qt-in[data-q="'+b.dataset.qa+'"]'); var tx=(box&&box.value||'').trim();
    if(!tx){ alert('답변 내용을 입력해 주세요'); return; }
    var q=DB.questionsToTeacher.find(function(x){return x.id===b.dataset.qa;});
    if(q){ q.answer=tx; q.answerBy=CURRENT.name; q.answeredAt=todayStr(); save(); toast('답변이 등록되었습니다'); qnaCenter(); }
  }; });
}
