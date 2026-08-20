/* ===================== 이룸편입 LMS · VOD 수강 (녹화강의 · 기수/개강일 체계) ===================== */
/* 규칙: 2회독 완료 = 학습 인정 / 공개일(개강일+Day-1)부터 3일 이내 수강 / 진도율 90%↑ = 1회독 */
const LEC_CATS=[['vocab','어휘'],['grammar','문법'],['reading','독해'],['logic','논리'],['mock','모의고사'],['workbook','워크북'],['detail','세부유형'],['school','학교별'],['etc','기타']];
function lecCatName(k){ var f=LEC_CATS.find(function(x){return x[0]===k;}); return f?f[1]:(SECTIONS[k]||'기타'); }

const VOD = {
  REQ:2, DAYS:3, PASS:90,
  cohorts(){ DB.cohorts=DB.cohorts||[]; return DB.cohorts; },
  cohort(id){ return VOD.cohorts().find(function(c){return c.id===id;})||null; },
  activeCohort(){ var cs=VOD.cohorts(); if(!cs.length) return null;
    var past=cs.filter(function(c){return c.startDate<=todayStr();}).sort(function(a,b){return b.startDate.localeCompare(a.startDate);});
    return past[0]||cs.slice().sort(function(a,b){return a.startDate.localeCompare(b.startDate);})[0]; },
  stuCohort(stu){ return (stu&&stu.cohortId&&VOD.cohort(stu.cohortId))||VOD.activeCohort(); },
  assigns(){ DB.assigns=DB.assigns||[]; return DB.assigns; },
  lecture(id){ return (acf(DB.lectures)||[]).find(function(l){return l.id===id;})||null; },
  openDateOf(cohort,day){ return cohort? addDays((day||1)-1, cohort.startDate) : todayStr(); },
  kind(url){ url=url||''; if(/youtu\.?be/i.test(url)) return 'youtube'; if(/vimeo\.com/i.test(url)) return 'vimeo'; return 'mp4'; },
  embed(url){
    url=(url||'').trim();
    var k=VOD.kind(url);
    if(k==='youtube'){ var m=url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/); return 'https://www.youtube.com/embed/'+(m?m[1]:'')+'?rel=0'; }
    if(k==='vimeo'){
      if(/player\.vimeo\.com/.test(url)) return url;              /* 이미 플레이어 주소면 그대로 */
      var v=url.match(/vimeo\.com\/(?:video\/|channels\/[\w]+\/|groups\/[\w]+\/videos\/)?(\d+)/);
      var id=v?v[1]:'';
      /* 비공개 영상 해시: vimeo.com/1234/abcdef 또는 ?h=abcdef */
      var h=url.match(/vimeo\.com\/(?:video\/)?\d+\/([0-9a-zA-Z]+)/);
      var hq=url.match(/[?&]h=([0-9a-zA-Z]+)/);
      var hash=(h&&h[1])||(hq&&hq[1])||'';
      return 'https://player.vimeo.com/video/'+id+(hash?('?h='+hash):'');
    }
    return url;
  },
  /* 학생이 볼 강의 = 소속 기수의 배정 목록 (레거시 lectures.openDate 도 지원) */
  list(stu){
    var co=VOD.stuCohort(stu); var out=[];
    if(co){ VOD.assigns().filter(function(a){return a.cohortId===co.id;}).forEach(function(a){
      var l=VOD.lecture(a.lectureId); if(!l) return;
      out.push(Object.assign({},l,{ assignId:a.id, day:a.day||1, openDate:VOD.openDateOf(co,a.day), cohortName:co.name }));
    }); }
    (acf(DB.lectures)||[]).forEach(function(l){ if(l.openDate && !out.some(function(x){return x.id===l.id;})) out.push(Object.assign({},l)); });
    return out.sort(function(a,b){ return (a.openDate||'').localeCompare(b.openDate||'') || (a.day||0)-(b.day||0); });
  },
  /* 특정 기수의 강의 목록 (관리자 달력용) */
  listByCohort(cohortId){
    var co=VOD.cohort(cohortId); if(!co) return [];
    var out=[];
    VOD.assigns().filter(function(a){return a.cohortId===co.id;}).forEach(function(a){
      var l=VOD.lecture(a.lectureId); if(!l) return;
      out.push(Object.assign({},l,{ assignId:a.id, day:a.day||1, openDate:VOD.openDateOf(co,a.day), cohortName:co.name, cohortId:co.id }));
    });
    return out.sort(function(a,b){ return (a.openDate||'').localeCompare(b.openDate||'') || (a.day||0)-(b.day||0); });
  },
  notes(sid,lid){ DB.notes=DB.notes||{}; DB.notes[sid]=DB.notes[sid]||{}; DB.notes[sid][lid]=DB.notes[sid][lid]||[]; return DB.notes[sid][lid]; },
  addNote(sid,lid,sec,text){ var n=VOD.notes(sid,lid); n.push({id:uid('nt'),t:Math.max(0,Math.round(sec||0)),text:text||'',at:todayStr()}); n.sort(function(a,b){return a.t-b.t;}); save(); return n; },
  delNote(sid,lid,nid){ DB.notes[sid][lid]=VOD.notes(sid,lid).filter(function(x){return x.id!==nid;}); save(); },
  fmtTime(sec){ sec=Math.max(0,Math.round(sec||0)); var h=Math.floor(sec/3600), m=Math.floor((sec%3600)/60), s=sec%60;
    return (h?h+':':'')+String(m).padStart(h?2:1,'0')+':'+String(s).padStart(2,'0'); },
  rec(sid,lid){ DB.watch=DB.watch||{}; DB.watch[sid]=DB.watch[sid]||{};
    if(!DB.watch[sid][lid]) DB.watch[sid][lid]={count:0,prog:0,openedAt:todayStr(),certifiedAt:null};
    return DB.watch[sid][lid]; },
  deadline(lec){ return addDays(VOD.DAYS, lec.openDate||todayStr()); },
  daysLeft(lec){ return Math.ceil((new Date(VOD.deadline(lec)+'T23:59:59')-new Date())/86400000); },
  overdue(lec){ return new Date() > new Date(VOD.deadline(lec)+'T23:59:59'); },
  notOpen(lec){ return (lec.openDate||todayStr()) > todayStr(); },
  startDate(){ var c=VOD.activeCohort(); return c?c.startDate:null; },
  status(sid,lec){ var r=VOD.rec(sid,lec.id);
    if(VOD.notOpen(lec)) return {k:'wait',t:lec.openDate+' 공개'};
    if(r.count>=VOD.REQ) return (r.certifiedAt && r.certifiedAt<=VOD.deadline(lec))?{k:'ok',t:'학습 인정'}:{k:'late',t:'지연 완료'};
    if(VOD.overdue(lec)) return {k:'over',t:'기한 초과'};
    return {k:'ing', t:(r.count===1?'1회독 완료':(r.prog>0?'수강 중':'미수강'))}; },
  addView(sid,lec){ var r=VOD.rec(sid,lec.id); r.count=Math.min(9,(r.count||0)+1); r.prog=100; r.lastAt=todayStr();
    if(r.count>=VOD.REQ && !r.certifiedAt) r.certifiedAt=todayStr(); save(); return r; },
  setProgRaw(sid,lec,p){ var r=VOD.rec(sid,lec.id); p=Math.round(p); if(p>(r.prog||0)){ r.prog=Math.min(100,p); r.lastAt=todayStr(); } save(); return r; },
  countView(sid,lec){ var r=VOD.rec(sid,lec.id); r.count=Math.min(9,(r.count||0)+1); r.lastAt=todayStr(); if(r.count>=VOD.REQ && !r.certifiedAt) r.certifiedAt=todayStr(); save(); return r; },
  resetSess(sid,lid){ var r=(DB.watch[sid]||{})[lid]; if(r){ r._sess=0; r.prog=Math.min(r.prog,99); save(); } },
  summary(studentId){ var stu=acf(DB.students).find(function(s){return s.id===studentId;})||{};
    var mine=VOD.list(stu).filter(function(l){ return !VOD.notOpen(l); });
    var ok=0,two=0,one=0; mine.forEach(function(l){ var st=VOD.status(studentId,l); if(st.k==='ok')ok++; var c=VOD.rec(studentId,l.id).count||0; if(c>=1) one++; if(c>=VOD.REQ) two++; });
    return {total:mine.length, done:ok, once:one, twice:two, rate: mine.length?Math.round(ok/mine.length*100):0}; }
};

/* ---------- 학생: 강의 수강 ---------- */
function stuVod(){
  const s=myStu(); const lecs=VOD.list(s); const sm=VOD.summary(s.id); const co=VOD.stuCohort(s);
  let html=head('강의 수강','같은 강의를 2회독하면 학습으로 인정됩니다. 공개일부터 '+VOD.DAYS+'일 이내에 수강해 주세요.'+(co?(' 소속 기수: '+co.name+' (개강 '+co.startDate+')'):''));
  html+='<div class="stats">'+card('배정 강의',lecs.length,'전체 강의 수')+card('2회독 완료',sm.twice+'/'+sm.total,'공개된 강의 기준')+card('학습 인정',sm.done+'/'+sm.total,'기한 내 2회독 완료')+card('이수율',pct(sm.rate),'인정 기준')+'</div>';
  if(!lecs.length){ html+='<div class="panel"><div class="muted">'+(co?('현재 소속 기수('+esc(co.name)+')에 배정된 강의가 없습니다. 관리자/강사가 강의를 배정하면 표시됩니다.'):'아직 개강 기수가 지정되지 않았습니다. 관리자에게 기수 배정을 요청해 주세요.')+'</div></div>'; page(html); return; }
  html+='<div class="vodgrid">'+lecs.map(function(l){ var r=VOD.rec(s.id,l.id); var st=VOD.status(s.id,l); var dl=VOD.daysLeft(l);
    var dots=''; for(var i=0;i<VOD.REQ;i++) dots+='<span class="vdot '+(i<r.count?'on':'')+'"></span>';
    var ddtxt = st.k==='wait'?('공개 '+l.openDate): st.k==='ok'?'완료': st.k==='over'?'기한 초과': (dl>=0?('D-'+dl):'기한 지남');
    var dayN = +l.day || 1;
    var hue = (dayN % 8);                                     /* 강의 회차별 색상 구분 */
    return '<div class="vcard vst-'+st.k+' vday-'+hue+'">'
      +'<div class="vc-top"><span class="as-chip as-'+(l.category||'etc')+'">'+lecCatName(l.category||l.section)+'</span><span class="vc-dd">'+ddtxt+'</span></div>'
      +'<div class="vc-title">'+(l.day?('<span class="daytag daytag-'+hue+'">Day '+l.day+'</span> '):'')+esc(l.title)+'</div>'
      +'<div class="vc-meta">'+esc(l.instructor||'이룸편입')+' 선생님 · '+(l.minutes||0)+'분 · 공개일 '+(l.openDate||'-')+'</div>'
      +'<div class="vc-prog"><div class="vc-bar"><div style="width:'+(r.prog||0)+'%"></div></div><span>'+(r.prog||0)+'%</span></div>'
      +'<div class="vc-foot"><div class="vdots">'+dots+' <b>'+r.count+'/'+VOD.REQ+'회독</b></div><span class="vstat vstat-'+st.k+'">'+st.t+'</span></div>'
      +(st.k==='wait'?'<button class="btn ghost" disabled style="opacity:.55;cursor:not-allowed">공개 예정입니다</button>':'<button class="btn '+(st.k==='ok'?'ghost':'')+' vplay" data-lec="'+l.id+'">'+(st.k==='ok'?'다시 보기':'재생')+'</button>')+'</div>';
  }).join('')+'</div>';
  page(html);
  $$('.vplay').forEach(function(b){ b.onclick=function(){ vodPlayer(b.dataset.lec); }; });
}

function loadVimeoSDK(cb){ if(window.Vimeo&&window.Vimeo.Player) return cb(true); var sc=document.createElement('script'); sc.src='https://player.vimeo.com/api/player.js'; sc.onload=function(){cb(!!(window.Vimeo&&window.Vimeo.Player));}; sc.onerror=function(){cb(false);}; document.head.appendChild(sc); }
function vodPlayer(lecId){
  const s=myStu(); const lecs=VOD.list(s); const l=lecs.find(function(x){return x.id===lecId;})||VOD.lecture(lecId); if(!l) return;
  if(VOD.notOpen(l)){ alert('이 강의는 '+l.openDate+'부터 시청할 수 있습니다.'); return; }
  if(VOD.overdue(l) && VOD.rec(s.id,l.id).count<VOD.REQ){ if(!confirm('수강 기한(공개일+'+VOD.DAYS+'일)이 지난 강의입니다. 기한 내 인정으로 처리되지 않습니다. 계속할까요?')) return; }
  const r=VOD.rec(s.id,l.id); VOD.resetSess(s.id,l.id);
  const k=VOD.kind(l.videoUrl); const trackable=(k==='mp4'||k==='vimeo');
  var media = (k==='mp4')
    ? '<video id="vodFrame" src="'+esc(l.videoUrl)+'" controls controlsList="nodownload" style="width:100%;height:100%;background:#000;border-radius:10px"></video>'
    : '<iframe id="vodFrame" src="'+esc(VOD.embed(l.videoUrl))+'" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="width:100%;height:100%;border:0;border-radius:10px"></iframe>';
  var note = trackable ? ('실시청 진도 <b id="vpP">'+(r.prog||0)+'</b>% · '+VOD.PASS+'% 이상 실제 시청 시 1회독 인정')
    : ('YouTube는 정밀 진도 추적이 어렵습니다. 시청 후 버튼으로 1회독을 인정하세요.');
  openModal(el('<div class="vodwrap">'
    +'<div class="vod-head"><div><h3>'+esc(l.title)+'</h3>'
      +'<div class="vp-meta">'+lecCatName(l.category||l.section)+' · '+(l.minutes||0)+'분 · 수강기한 '+VOD.deadline(l)+' · 현재 '+r.count+'/'+VOD.REQ+'회독</div></div>'
      +'<div class="vod-head-btns"><button class="btn ghost rptmini" id="vpSide">메모 숨기기</button><button class="btn ghost rptmini" id="vpClose">닫기</button></div></div>'
    +'<div class="vod-body">'
      +'<div class="vod-main"><div class="vod-stage">'+media+'</div>'
        +'<div class="vp-prog">'+note+(trackable?'':'')+'</div>'
        +(!trackable?'<button class="btn" id="vpDone">이번 회차 시청 완료 (1회독 인정)</button>':'')
        +'<div class="vod-err muted" id="vodErr">영상이 보이지 않으면: Vimeo 영상 설정 → Privacy → “Where can this be embedded”에 이 사이트 도메인을 추가했는지 확인하세요. 비공개 영상은 주소에 해시(예: vimeo.com/123456/abcd12)가 포함돼야 합니다.</div>'
      +'</div>'
      +'<aside class="vod-note"><div class="vn-h">학습 메모<span class="muted" id="vnNow">00:00</span></div>'
        +'<textarea id="vnText" placeholder="지금 구간에 대한 메모를 적고 [메모 추가]를 누르면 재생 시점이 함께 저장됩니다."></textarea>'
        +'<button class="btn rptmini" id="vnAdd">현재 시점으로 메모 추가</button>'
        +'<div class="vn-list" id="vnList"></div></aside>'
    +'</div></div>'));
  var watched={}, counted=false, dur=0, cur=0, player=null;
  function paintNotes(){
    var ns=VOD.notes(s.id,l.id);
    document.getElementById('vnList').innerHTML = ns.length? ns.map(function(n){
      return '<div class="vn-item"><button class="vn-t" data-seek="'+n.t+'">'+VOD.fmtTime(n.t)+'</button>'
        +'<div class="vn-x">'+esc(n.text)+'</div><button class="vn-del" data-del="'+n.id+'">×</button></div>';
    }).join('') : '<div class="muted" style="font-size:12px;padding:8px 2px">아직 메모가 없습니다.</div>';
    $$('#vnList [data-del]').forEach(function(b){ b.onclick=function(){ VOD.delNote(s.id,l.id,b.dataset.del); paintNotes(); }; });
    $$('#vnList [data-seek]').forEach(function(b){ b.onclick=function(){ var sec=+b.dataset.seek;
      if(k==='mp4'){ var v=document.getElementById('vodFrame'); if(v){ v.currentTime=sec; v.play&&v.play(); } }
      else if(player){ try{ player.setCurrentTime(sec); }catch(e){} }
      else toast('이 영상은 구간 이동이 지원되지 않습니다'); }; });
  }
  function tick(c,duration){ if(duration&&duration>0) dur=duration; cur=c||0;
    var nw=document.getElementById('vnNow'); if(nw) nw.textContent=VOD.fmtTime(cur);
    if(!dur) return;
    var b=Math.floor(cur); if(b>=0&&b<200000) watched[b]=1;
    var w=0; for(var kk in watched) w++;
    var p=Math.min(100, Math.round(w/dur*100));
    var e2=document.getElementById('vpP'); if(e2) e2.textContent=p;
    VOD.setProgRaw(s.id,l,p);
    if(p>=VOD.PASS && !counted){ counted=true; var rr=VOD.countView(s.id,l); toast('1회독 인정 ('+rr.count+'/'+VOD.REQ+')'+(rr.count>=VOD.REQ?' · 학습 인정 완료':'')); } }
  if(k==='mp4'){ var v=document.getElementById('vodFrame'); if(v){ window._vodMedia = v; v.ontimeupdate=function(){ tick(v.currentTime, v.duration); };
      v.onerror=function(){ var e3=document.getElementById('vodErr'); if(e3) e3.classList.add('on'); }; } }
  else if(k==='vimeo'){ loadVimeoSDK(function(ok){ if(ok){ try{ player=new Vimeo.Player(document.getElementById('vodFrame'));
      window._vodPlayer = player;                       /* 모달 종료 시 정지시키기 위한 전역 핸들 */
      player.on('timeupdate', function(d){ tick(d.seconds, d.duration); });
      player.on('error', function(){ var e4=document.getElementById('vodErr'); if(e4) e4.classList.add('on'); });
      }catch(e){} } }); }
  var d=document.getElementById('vpDone'); if(d) d.onclick=function(){ var rr=VOD.addView(s.id,l); toast('1회독 인정 ('+rr.count+'/'+VOD.REQ+')'); stopVod(); closeModal(); stuVod(); };
  function stopVod(){
    try{ if(player){ try{ player.pause(); }catch(e){} try{ player.unload(); }catch(e){} } }catch(e){}
    try{ var mv=document.getElementById('vodFrame');
      if(mv && mv.tagName==='VIDEO'){ mv.pause(); mv.removeAttribute('src'); mv.load(); }
      else if(mv && mv.tagName==='IFRAME'){ mv.removeAttribute('src'); mv.src='about:blank'; }
    }catch(e){}
    window._vodPlayer=null; window._vodMedia=null;
  }
  /* ESC·배경 클릭으로 닫을 때도 정지 */
  try{ var mdl=document.getElementById('modal'); if(mdl) mdl.addEventListener('click', function(ev){ if(ev.target===mdl) stopVod(); }); }catch(e){}
  document.getElementById('vnAdd').onclick=function(){
    var tx=(document.getElementById('vnText').value||'').trim();
    if(!tx){ alert('메모 내용을 입력해 주세요'); return; }
    VOD.addNote(s.id,l.id,cur,tx); document.getElementById('vnText').value=''; paintNotes(); toast('메모 저장 ('+VOD.fmtTime(cur)+')');
  };
  var sideBtn=document.getElementById('vpSide');
  if(sideBtn) sideBtn.onclick=function(){ var wrap=document.querySelector('.vodwrap'); if(!wrap) return;
    wrap.classList.toggle('noside'); sideBtn.textContent=wrap.classList.contains('noside')?'메모 보기':'메모 숨기기'; };
  document.getElementById('vpClose').onclick=function(){ stopVod(); closeModal(); stuVod(); };
  paintNotes();
}

/* ---------- 관리자/강사: 강의 관리 (라이브러리 + 기수 배정) ---------- */
var AS_CUR='', AS_CAT='all', AS_ONLY='all', AS_Q='', AS_PICK={}, VOD_TAB='lib';
function vodManage(){
  DB.lectures=DB.lectures||[]; VOD.cohorts(); VOD.assigns();
  let html=head('강의 관리','영상을 올리고 기수별 Day에 배정합니다');
  html+='<div class="tabs" id="vTabs"><button class="tab on" data-v="lib">영상 라이브러리</button><button class="tab" data-v="co">개강 기수</button><button class="tab" data-v="as">기수별 배정</button></div>';
  html+='<div id="vPane"></div>';
  page(html);
  var pane=function(){ return document.getElementById('vPane'); };

  function drawLib(){
    var cats=[['all','전체']].concat(LEC_CATS);
    pane().innerHTML='<div class="bar"><div class="filters" id="lcF">'+cats.map(function(c,i){return '<button class="chip '+(i===0?'on':'')+'" data-c="'+c[0]+'">'+c[1]+'</button>';}).join('')+'</div><button class="btn" id="lAdd">+ 영상 업로드</button></div>'
      +'<div class="tbl-wrap"><table class="tbl"><thead><tr><th>카테고리</th><th>제목</th><th>길이</th><th>영상</th><th>배정 기수</th><th>관리</th></tr></thead><tbody id="lBody"></tbody></table></div>';
    var f='all';
    var redraw=function(){
      var rows=(acf(DB.lectures)||[]).filter(function(l){ return f==='all'||(l.category||'etc')===f; });
      document.getElementById('lBody').innerHTML=rows.map(function(l){
        var used=VOD.assigns().filter(function(a){return a.lectureId===l.id;}).length;
        return '<tr><td><span class="as-chip as-'+(l.category||'etc')+'">'+lecCatName(l.category||l.section)+'</span></td><td><b>'+esc(l.title)+'</b></td><td>'+(l.minutes||0)+'분</td>'
          +'<td>'+(l.videoUrl?'<a class="lnk" href="'+esc(l.videoUrl)+'" target="_blank" rel="noopener">열기</a>':'-')+'</td>'
          +'<td>'+(used?('<b>'+used+'</b>개 기수'):'<span class="muted">미배정</span>')+'</td>'
          +'<td><button class="lnk" data-le="'+l.id+'">수정</button> <button class="lnk del" data-ld="'+l.id+'">삭제</button></td></tr>';
      }).join('')||'<tr><td colspan="6" class="muted">등록된 영상이 없습니다.</td></tr>';
      $$('#lBody [data-ld]').forEach(function(b){ b.onclick=function(){ if(confirm('영상을 삭제할까요? (배정도 함께 삭제됩니다)')){
        var _gone=VOD.assigns().filter(function(a){return a.lectureId===b.dataset.ld;}).map(function(a){return a.id;});
        DB.lectures=DB.lectures.filter(function(x){return x.id!==b.dataset.ld;});
        DB.assigns=VOD.assigns().filter(function(a){return a.lectureId!==b.dataset.ld;});
        DB._deletedIds=(DB._deletedIds||[]).concat(_gone, [b.dataset.ld]); save(); redraw(); } }; });
      $$('#lBody [data-le]').forEach(function(b){ b.onclick=function(){ lecForm(VOD.lecture(b.dataset.le), redraw); }; });
    };
    redraw();
    $$('#lcF .chip').forEach(function(c){ c.onclick=function(){ $$('#lcF .chip').forEach(function(x){x.classList.remove('on');}); c.classList.add('on'); f=c.dataset.c; redraw(); }; });
    document.getElementById('lAdd').onclick=function(){ lecForm(null, redraw); };
  }
  function drawCo(){
    pane().innerHTML='<div class="bar"><div class="muted">기수(개강일)를 만들고 학생을 배정하면, 같은 영상이 기수별 개강일 기준으로 순차 공개됩니다.</div><button class="btn" id="cAdd">+ 개강 기수 추가</button></div>'
      +'<div class="tbl-wrap"><table class="tbl"><thead><tr><th>기수명</th><th>개강일</th><th>배정 강의</th><th>소속 학생</th><th>관리</th></tr></thead><tbody id="cBody"></tbody></table></div>';
    var redraw=function(){
      document.getElementById('cBody').innerHTML=VOD.cohorts().map(function(c){
        var n=VOD.assigns().filter(function(a){return a.cohortId===c.id;}).length;
        var st=acf(DB.students).filter(function(s){return s.cohortId===c.id;}).length;
        return '<tr><td><b>'+esc(c.name)+'</b>'+(VOD.activeCohort()&&VOD.activeCohort().id===c.id?' <span class="pill" style="--c:#059669">현재</span>':'')+'</td><td>'+c.startDate+'</td><td>'+n+'강</td><td>'+st+'명</td>'
          +'<td><button class="lnk" data-cs="'+c.id+'">학생 배정</button> <button class="lnk" data-ce="'+c.id+'">수정</button> <button class="lnk" data-cc="'+c.id+'">복제</button> <button class="lnk del" data-cd="'+c.id+'">삭제</button></td></tr>';
      }).join('')||'<tr><td colspan="5" class="muted">등록된 기수가 없습니다. [+ 개강 기수 추가]로 만들어 주세요.</td></tr>';
      $$('#cBody [data-cd]').forEach(function(b){ b.onclick=function(){ if(confirm('기수를 삭제할까요? (해당 기수 배정도 삭제)')){
        var _gone=VOD.assigns().filter(function(a){return a.cohortId===b.dataset.cd;}).map(function(a){return a.id;});
        DB.cohorts=VOD.cohorts().filter(function(x){return x.id!==b.dataset.cd;});
        DB.assigns=VOD.assigns().filter(function(a){return a.cohortId!==b.dataset.cd;});
        DB._deletedIds=(DB._deletedIds||[]).concat(_gone, [b.dataset.cd]); save(); redraw(); } }; });
      $$('#cBody [data-ce]').forEach(function(b){ b.onclick=function(){ cohortForm(VOD.cohort(b.dataset.ce), redraw); }; });
      $$('#cBody [data-cc]').forEach(function(b){ b.onclick=function(){ cohortCopy(b.dataset.cc, redraw); }; });
      $$('#cBody [data-cs]').forEach(function(b){ b.onclick=function(){ cohortStudents(b.dataset.cs, redraw); }; });
    };
    redraw();
    document.getElementById('cAdd').onclick=function(){ cohortForm(null, redraw); };
  }
  /* ---------- 기수별 배정 ----------
     모달을 열지 않고 한 화면에서 체크 → Day 지정 → 저장까지 끝냅니다. */
  function drawAs(){
    var cs=VOD.cohorts();
    if(!cs.length){ pane().innerHTML='<div class="panel"><div class="muted">먼저 [개강 기수] 탭에서 기수를 만들어 주세요.</div></div>'; return; }
    if(!AS_CUR || !VOD.cohort(AS_CUR)) AS_CUR = cs[0].id;

    function draw(){
      var co=VOD.cohort(AS_CUR);
      var lecs=(acf(DB.lectures)||[]).slice();
      var mine=VOD.assigns().filter(function(a){ return a.cohortId===AS_CUR; });
      var byLec={}; mine.forEach(function(a){ (byLec[a.lectureId]=byLec[a.lectureId]||[]).push(a); });

      var list=lecs.filter(function(l){
        if(AS_CAT!=='all' && (l.category||'etc')!==AS_CAT) return false;
        if(AS_ONLY==='on'  && !byLec[l.id]) return false;
        if(AS_ONLY==='off' && byLec[l.id]) return false;
        if(AS_Q && String(l.title||'').toLowerCase().indexOf(AS_Q.toLowerCase())<0) return false;
        return true;
      });
      /* 배정된 것은 Day 순, 나머지는 제목 순 */
      list.sort(function(a,b){
        var da=byLec[a.id]?Math.min.apply(null,byLec[a.id].map(function(x){return x.day||1;})):9999;
        var db=byLec[b.id]?Math.min.apply(null,byLec[b.id].map(function(x){return x.day||1;})):9999;
        if(da!==db) return da-db;
        return String(a.title||'').localeCompare(String(b.title||''));
      });
      var nextDay=mine.length? Math.max.apply(null,mine.map(function(a){return a.day||0;}))+1 : 1;

      var h='<div class="bar">'
        + '<label class="inline-date">기수 <select id="asCo">'
          + cs.map(function(c){ return '<option value="'+c.id+'"'+(c.id===AS_CUR?' selected':'')+'>'+esc(c.name)+' (개강 '+c.startDate+')</option>'; }).join('')
        + '</select></label>'
        + '<div class="bar-actions">'
          + '<select id="asCat" class="cal-co"><option value="all">전체 분류</option>'
            + LEC_CATS.map(function(c){ return '<option value="'+c[0]+'"'+(AS_CAT===c[0]?' selected':'')+'>'+c[1]+'</option>'; }).join('') + '</select>'
          + '<select id="asOnly" class="cal-co">'
            + [['all','전체 강의'],['off','미배정만'],['on','배정된 것만']].map(function(x){ return '<option value="'+x[0]+'"'+(AS_ONLY===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('') + '</select>'
          + '<input id="asQ" placeholder="제목 검색" value="'+esc(AS_Q)+'" style="max-width:170px">'
        + '</div></div>';

      h+='<div class="note-b info"><div class="nb-t"><b>'+esc(co.name)+' · 개강 '+co.startDate+' · 배정 '+mine.length+'강</b>'
        + '왼쪽에서 강의를 고르고 아래 버튼을 누르면 Day '+nextDay+'부터 차례로 배정됩니다. Day 칸을 직접 고쳐도 바로 저장됩니다.</div></div>';

      h+='<div class="bar-actions" style="margin-bottom:10px">'
        + '<button class="btn" id="asBulk">선택한 강의 배정 (Day '+nextDay+'부터)</button>'
        + '<button class="btn ghost" id="asBulkOff">선택 배정 해제</button>'
        + '<button class="btn ghost" id="asAll">전체 선택</button>'
        + '<button class="btn ghost" id="asNone">선택 해제</button>'
        + '<span class="muted" id="asCnt">0개 선택</span>'
        + '</div>';

      h+='<div class="tbl-wrap"><table class="tbl as-tbl"><thead><tr>'
        + '<th style="width:36px"></th><th>분류</th><th>강의</th><th style="width:96px">Day</th><th>공개일</th><th>수강기한</th><th style="width:76px"></th>'
        + '</tr></thead><tbody id="asBody2">'
        + (list.length ? list.map(function(l){
            var a=(byLec[l.id]||[])[0];
            var day=a?(a.day||1):'';
            var od=a?VOD.openDateOf(co,a.day||1):'';
            return '<tr class="'+(a?'as-on':'')+'">'
              + '<td><input type="checkbox" class="as-ck" data-l="'+l.id+'"'+(AS_PICK[l.id]?' checked':'')+'></td>'
              + '<td><span class="as-chip as-'+(l.category||'etc')+'">'+lecCatName(l.category)+'</span></td>'
              + '<td><b>'+esc(l.title)+'</b>'+(l.minutes?(' <span class="muted">'+l.minutes+'분</span>'):'')+'</td>'
              + '<td>'+(a ? ('<input type="number" min="1" class="as-day" data-a="'+a.id+'" value="'+day+'">') : '<span class="muted">미배정</span>')+'</td>'
              + '<td>'+(od||'-')+'</td>'
              + '<td>'+(od?addDays(VOD.DAYS,od):'-')+'</td>'
              + '<td>'+(a ? ('<button class="lnk del" data-ax="'+a.id+'">해제</button>') : ('<button class="lnk" data-a1="'+l.id+'">배정</button>'))+'</td>'
              + '</tr>';
          }).join('') : '<tr><td colspan="7" class="muted">조건에 맞는 강의가 없습니다.</td></tr>')
        + '</tbody></table></div>';

      pane().innerHTML=h;
      bind(co, nextDay);
    }

    function bind(co, nextDay){
      function cnt(){ var n=Object.keys(AS_PICK).filter(function(k){return AS_PICK[k];}).length;
        var e=document.getElementById('asCnt'); if(e) e.textContent=n+'개 선택'; }
      cnt();
      document.getElementById('asCo').onchange=function(){ AS_CUR=this.value; AS_PICK={}; draw(); };
      document.getElementById('asCat').onchange=function(){ AS_CAT=this.value; draw(); };
      document.getElementById('asOnly').onchange=function(){ AS_ONLY=this.value; draw(); };
      var q=document.getElementById('asQ');
      q.oninput=function(){ AS_Q=this.value; var pos=this.selectionStart; draw();
        var n=document.getElementById('asQ'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } };

      $$('#asBody2 .as-ck').forEach(function(c){ c.onchange=function(){ AS_PICK[c.dataset.l]=c.checked; cnt(); }; });
      document.getElementById('asAll').onclick=function(){ $$('#asBody2 .as-ck').forEach(function(c){ c.checked=true; AS_PICK[c.dataset.l]=true; }); cnt(); };
      document.getElementById('asNone').onclick=function(){ AS_PICK={}; $$('#asBody2 .as-ck').forEach(function(c){ c.checked=false; }); cnt(); };

      /* 선택한 강의를 화면에 보이는 순서대로 Day 를 이어서 배정 */
      document.getElementById('asBulk').onclick=function(){
        var ids=$$('#asBody2 .as-ck').filter(function(c){ return c.checked; }).map(function(c){ return c.dataset.l; });
        if(!ids.length){ toast('배정할 강의를 먼저 선택하세요'); return; }
        var already={}; VOD.assigns().filter(function(a){return a.cohortId===AS_CUR;}).forEach(function(a){ already[a.lectureId]=1; });
        var d=nextDay, n=0;
        ids.forEach(function(lid){
          if(already[lid]) return;                    /* 이미 배정된 것은 건너뜁니다 */
          VOD.assigns().push({id:uid('asg'),cohortId:AS_CUR,lectureId:lid,day:d,_u:Date.now()});
          d++; n++;
        });
        AS_PICK={}; save();
        toast(n? (n+'강을 Day '+nextDay+'부터 배정했습니다') : '이미 모두 배정되어 있습니다');
        draw();
      };
      document.getElementById('asBulkOff').onclick=function(){
        var ids=$$('#asBody2 .as-ck').filter(function(c){ return c.checked; }).map(function(c){ return c.dataset.l; });
        if(!ids.length){ toast('해제할 강의를 먼저 선택하세요'); return; }
        if(!confirm('선택한 '+ids.length+'강의 배정을 해제할까요?')) return;
        var gone=VOD.assigns().filter(function(a){ return a.cohortId===AS_CUR && ids.indexOf(a.lectureId)>=0; }).map(function(a){ return a.id; });
        DB.assigns=VOD.assigns().filter(function(a){ return !(a.cohortId===AS_CUR && ids.indexOf(a.lectureId)>=0); });
        DB._deletedIds=(DB._deletedIds||[]).concat(gone);
        AS_PICK={}; save(); toast(gone.length+'건을 해제했습니다'); draw();
      };

      /* 한 건씩 배정 / 해제 */
      $$('#asBody2 [data-a1]').forEach(function(b){ b.onclick=function(){
        VOD.assigns().push({id:uid('asg'),cohortId:AS_CUR,lectureId:b.dataset.a1,day:nextDay,_u:Date.now()});
        save(); toast('Day '+nextDay+'에 배정했습니다'); draw(); }; });
      $$('#asBody2 [data-ax]').forEach(function(b){ b.onclick=function(){
        DB.assigns=VOD.assigns().filter(function(x){ return x.id!==b.dataset.ax; });
        (DB._deletedIds=DB._deletedIds||[]).push(b.dataset.ax);
        save(); draw(); }; });

      /* Day 를 직접 고치면 바로 저장 */
      $$('#asBody2 .as-day').forEach(function(inp){ inp.onchange=function(){
        var a=VOD.assigns().filter(function(x){ return x.id===inp.dataset.a; })[0];
        if(!a) return;
        var d=Math.max(1, parseInt(inp.value,10)||1);
        a.day=d; a._u=Date.now(); save(); draw(); }; });
    }
    draw();
  }
  var panes={lib:drawLib,co:drawCo,as:drawAs};
  $$('#vTabs .tab').forEach(function(t){ t.onclick=function(){ $$('#vTabs .tab').forEach(function(x){x.classList.remove('on');}); t.classList.add('on'); VOD_TAB=t.dataset.v; panes[t.dataset.v](); }; });
  /* 마지막으로 보던 탭을 유지합니다 (동기화로 화면이 다시 그려져도 첫 탭으로 돌아가지 않게) */
  if(!panes[VOD_TAB]) VOD_TAB='lib';
  $$('#vTabs .tab').forEach(function(x){ x.classList.toggle('on', x.dataset.v===VOD_TAB); });
  panes[VOD_TAB]();
}
function lecForm(l,onDone){
  l=l||{};
  var opts=LEC_CATS.map(function(c){return '<option value="'+c[0]+'" '+(l.category===c[0]?'selected':'')+'>'+c[1]+'</option>';}).join('');
  openModal(el('<div class="form"><h3>'+(l.id?'영상 수정':'영상 업로드')+'</h3>'
    +'<div class="frow"><label>카테고리 *<select id="l_c">'+opts+'</select></label><label>길이(분)<input id="l_m" type="number" value="'+(l.minutes||'')+'"></label></div>'
    +'<label>제목 *<input id="l_t" value="'+esc(l.title||'')+'" placeholder="예: 어휘 1강 - 동의어"></label>'
    +'<label>영상 URL * <small class="muted">(Vimeo 권장 · YouTube · mp4)</small><input id="l_u" value="'+esc(l.videoUrl||'')+'" placeholder="https://vimeo.com/..."></label>'
    +'<div class="vp-meta">공개일은 기수 배정(Day)에 따라 자동 계산됩니다. 같은 영상을 여러 기수에 배정할 수 있습니다.</div>'
    +'<div class="modal-actions"><button class="btn ghost" id="l_x">취소</button><button class="btn" id="l_ok">저장</button></div></div>'));
  document.getElementById('l_x').onclick=closeModal;
  document.getElementById('l_ok').onclick=function(){
    var t=document.getElementById('l_t').value.trim(), u=document.getElementById('l_u').value.trim();
    if(!t||!u){ alert('제목과 영상 URL은 필수입니다'); return; }
    var data={title:t,category:document.getElementById('l_c').value,minutes:+document.getElementById('l_m').value||0,videoUrl:u,instructor:CURRENT.name};
    if(l.id){ Object.assign(VOD.lecture(l.id)||{},data); } else { DB.lectures.push(Object.assign({id:uid('lec')},data)); }
    save(); closeModal(); if(onDone)onDone();
  };
}
function cohortForm(c,onDone){
  c=c||{};
  openModal(el('<div class="form"><h3>'+(c.id?'기수 수정':'개강 기수 추가')+'</h3>'
    +'<label>기수명 *<input id="c_n" value="'+esc(c.name||'')+'" placeholder="예: 2026년 3월 개강반"></label>'
    +'<label>개강일 *<input id="c_d" type="date" value="'+(c.startDate||todayStr())+'"></label>'
    +'<div class="vp-meta">배정된 강의는 개강일 기준 Day 순서대로 공개되고, 각 강의는 공개일+'+VOD.DAYS+'일 이내 2회독해야 인정됩니다.</div>'
    +'<div class="modal-actions"><button class="btn ghost" id="c_x">취소</button><button class="btn" id="c_ok">저장</button></div></div>'));
  document.getElementById('c_x').onclick=closeModal;
  document.getElementById('c_ok').onclick=function(){
    var n=document.getElementById('c_n').value.trim(), d=document.getElementById('c_d').value;
    if(!n||!d){ alert('기수명과 개강일은 필수입니다'); return; }
    if(c.id){ Object.assign(VOD.cohort(c.id)||{},{name:n,startDate:d}); } else { VOD.cohorts().push({id:uid('co'),name:n,startDate:d}); }
    save(); closeModal(); if(onDone)onDone();
  };
}
function assignForm(cohortId,onDone){
  var co=VOD.cohort(cohortId); var lecs=acf(DB.lectures)||[];
  if(!lecs.length){ alert('먼저 [영상 라이브러리]에서 영상을 업로드해 주세요.'); return; }
  var used=VOD.assigns().filter(function(a){return a.cohortId===cohortId;});
  var nextDay=used.length? Math.max.apply(null,used.map(function(a){return a.day||0;}))+1 : 1;
  var opts=lecs.map(function(l){return '<option value="'+l.id+'">['+lecCatName(l.category)+'] '+esc(l.title)+'</option>';}).join('');
  openModal(el('<div class="form"><h3>강의 배정 · '+esc(co.name)+'</h3>'
    +'<label>영상 선택 *<select id="a_l">'+opts+'</select></label>'
    +'<div class="frow"><label>Day (개강일 기준) *<input id="a_d" type="number" min="1" value="'+nextDay+'"></label><label>공개일 (자동)<input id="a_o" value="'+VOD.openDateOf(co,nextDay)+'" disabled></label></div>'
    +'<div class="vp-meta">Day 1 = 개강일. 같은 영상을 다른 기수/다른 Day에 다시 배정할 수 있습니다.</div>'
    +'<div class="modal-actions"><button class="btn ghost" id="a_x">취소</button><button class="btn" id="a_ok">배정</button></div></div>'));
  var dayIn=document.getElementById('a_d');
  dayIn.oninput=function(){ document.getElementById('a_o').value=VOD.openDateOf(co, +dayIn.value||1); };
  document.getElementById('a_x').onclick=closeModal;
  document.getElementById('a_ok').onclick=function(){
    var lid=document.getElementById('a_l').value, day=+dayIn.value||1;
    VOD.assigns().push({id:uid('asg'),cohortId:cohortId,lectureId:lid,day:day});
    save(); closeModal(); if(onDone)onDone();
  };
}

/* 기수 복제: 배정(Day)을 새 기수로 통째 복사 */
function cohortCopy(srcId,onDone){
  var src=VOD.cohort(srcId); if(!src) return;
  var n=VOD.assigns().filter(function(a){return a.cohortId===srcId;}).length;
  openModal(el('<div class="form"><h3>기수 복제</h3>'
    +'<p class="muted">「'+esc(src.name)+'」의 강의 배정 '+n+'건을 새 기수로 그대로 복사합니다. (Day 구성 동일, 공개일만 새 개강일 기준으로 재계산)</p>'
    +'<label>새 기수명 *<input id="cc_n" value="'+esc(src.name+' (복제)')+'"></label>'
    +'<label>새 개강일 *<input id="cc_d" type="date" value="'+addDays(7)+'"></label>'
    +'<div class="modal-actions"><button class="btn ghost" id="cc_x">취소</button><button class="btn" id="cc_ok">복제</button></div></div>'));
  document.getElementById('cc_x').onclick=closeModal;
  document.getElementById('cc_ok').onclick=function(){
    var nm=document.getElementById('cc_n').value.trim(), dt=document.getElementById('cc_d').value;
    if(!nm||!dt){ alert('기수명과 개강일은 필수입니다'); return; }
    var nid=uid('co'); VOD.cohorts().push({id:nid,name:nm,startDate:dt});
    VOD.assigns().filter(function(a){return a.cohortId===srcId;}).forEach(function(a){
      VOD.assigns().push({id:uid('asg'),cohortId:nid,lectureId:a.lectureId,day:a.day}); });
    save(); closeModal(); toast('기수를 복제했습니다 ('+n+'강 배정)'); if(onDone)onDone();
  };
}

/* 기수에 학생 일괄 배정 */
function cohortStudents(cohortId,onDone){
  var co=VOD.cohort(cohortId); if(!co) return;
  var studs=acf(DB.students).filter(function(s){return !s.testOnly;});
  openModal(el('<div class="form"><h3>학생 배정 · '+esc(co.name)+'</h3>'
    +'<p class="muted">체크한 학생은 이 기수의 강의를 보게 됩니다. (개강일 '+co.startDate+' 기준으로 공개)</p>'
    +'<div class="bar-actions" style="margin-bottom:8px"><button class="btn ghost rptmini" id="cs_all">전체 선택</button><button class="btn ghost rptmini" id="cs_none">전체 해제</button></div>'
    +'<div class="cs-list">'+(studs.length?studs.map(function(s){
        return '<label class="cs-item"><input type="checkbox" class="cs-c" value="'+s.id+'" '+(s.cohortId===cohortId?'checked':'')+'>'
          +'<b>'+esc(s.name)+'</b><span class="muted">'+esc(s.username)+(s.cohortId&&s.cohortId!==cohortId?(' · 현재: '+esc((VOD.cohort(s.cohortId)||{}).name||'-')):'')+'</span></label>';
      }).join(''):'<div class="muted">등록된 학생이 없습니다.</div>')+'</div>'
    +'<div class="modal-actions"><button class="btn ghost" id="cs_x">취소</button><button class="btn" id="cs_ok">저장</button></div></div>'));
  document.getElementById('cs_x').onclick=closeModal;
  document.getElementById('cs_all').onclick=function(){ $$('.cs-c').forEach(function(c){c.checked=true;}); };
  document.getElementById('cs_none').onclick=function(){ $$('.cs-c').forEach(function(c){c.checked=false;}); };
  document.getElementById('cs_ok').onclick=function(){
    var n=0;
    $$('.cs-c').forEach(function(c){ var s=acf(DB.students).find(function(x){return x.id===c.value;}); if(!s) return;
      if(c.checked){ if(s.cohortId!==cohortId){ s.cohortId=cohortId; n++; } }
      else if(s.cohortId===cohortId){ s.cohortId=null; n++; } });
    save(); closeModal(); toast(n+'명의 기수가 변경되었습니다'); if(onDone)onDone();
  };
}
