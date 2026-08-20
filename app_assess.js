/* ===================== 이룸편입 LMS · 평가 관리 (퀴즈·숙제·테스트 업로드) ===================== */
const ASSESS_TYPES=[['quiz','퀴즈'],['homework','숙제'],['test','테스트'],['mock','모의고사'],['schoolmock','학교별 기출유형 모의고사'],['weekly','주간테스트'],['monthly','월간테스트']];
function defaultLimit(type){ return type==='quiz' ? 0 : 60; }   /* 퀴즈 외에는 기본 60분 */
function subjToText(o){
  if(!o) return '';
  return Object.keys(o).sort(function(a,b){return +a-+b;}).map(function(k){ return k+': '+o[k]; }).join('\n');
}
function subjFromText(t){
  var out={};
  String(t||'').split(/\n+/).forEach(function(ln){
    var m=/^\s*(\d{1,3})\s*[.):：]\s*(.+)$/.exec(ln);
    if(m) out[+m[1]]=m[2].trim();
  });
  return out;
}
function assessTypeName(k){ var f=ASSESS_TYPES.find(function(x){return x[0]===k;}); return f?f[1]:k; }
function assessList(){ return (acf(DB.assessments)||[]).slice().sort(function(a,b){ return (b.openDate||'').localeCompare(a.openDate||''); }); }

var SA_CUR='', EG_CUR='', AM_FILT='all', AM_CO='all';
function assessManage(){
  DB.assessments=DB.assessments||[];
  var filt=AM_FILT||'all', coFilt=AM_CO||'all';
  let html=head('평가 관리','시험지를 올리고 공개 · 마감을 관리합니다');
  html+='<div class="bar"><div class="filters" id="asFilters">'
    +'<button class="chip'+(filt==='all'?' on':'')+'" data-t="all">전체</button>'
    +ASSESS_TYPES.map(function(x){return '<button class="chip'+(filt===x[0]?' on':'')+'" data-t="'+x[0]+'">'+x[1]+'</button>';}).join('')
    +'</div><div class="bar-actions">'
    +'<select id="asCo" class="cal-co"><option value="all"'+(coFilt==='all'?' selected':'')+'>전체 기수</option><option value="none"'+(coFilt==='none'?' selected':'')+'>기수 미지정(공통)</option>'
    + ((typeof VOD!=='undefined')?VOD.cohorts():[]).map(function(c){ return '<option value="'+c.id+'">'+esc(c.name)+'</option>'; }).join('')
    +'</select><button class="btn" id="asAdd">+ 평가 업로드</button></div></div>';
  html+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>유형</th><th>제목</th><th>기수</th><th>반</th><th>공개일</th><th>마감일</th><th>문항</th><th>자료</th><th>관리</th></tr></thead><tbody id="asBody"></tbody></table></div>';
  page(html);
  var draw=function(){
    var rows=assessList().filter(function(a){ return filt==='all'||a.type===filt; })
      .filter(function(a){ return coFilt==='all' || (coFilt==='none' ? !a.cohortId : a.cohortId===coFilt); });
    $('#asBody').innerHTML=rows.map(function(a){
      var open=(a.openDate||todayStr())<=todayStr();
      return '<tr><td><span class="as-chip as-'+a.type+'">'+assessTypeName(a.type)+'</span></td>'
        +'<td><b>'+esc(a.title)+'</b>'+(a.desc?'<div class="muted" style="font-size:11px">'+esc(a.desc)+'</div>':'')+'</td>'
        +'<td>'+assessCohortName(a.cohortId)+'</td>'
        +'<td>'+esc(a.target||'전체')+'</td>'
        +'<td>'+(a.openDate||'-')+(open?'':' <span class="pill" style="--c:#94a3b8">예정</span>')+'</td>'
        +'<td>'+(a.dueDate||'-')+'</td>'
        +'<td>'+((+a.qCount||0)?((+a.qCount)+'문항'+(a.timeLimit?(' · '+a.timeLimit+'분'):'')):'-')+'</td>'
        +'<td>'+(a.fileUrl?'<a class="lnk" href="'+esc(a.fileUrl)+'" target="_blank" rel="noopener">열기</a>':'-')+'</td>'
        +'<td><button class="lnk" data-ae="'+a.id+'">수정</button> <button class="lnk del" data-ad="'+a.id+'">삭제</button></td></tr>';
    }).join('') || '<tr><td colspan="9" class="muted">등록된 평가가 없습니다. [+ 평가 업로드]로 추가하세요.</td></tr>';
    $$('#asBody [data-ad]').forEach(function(b){ b.onclick=function(){ if(confirm('삭제할까요?')){ DB.assessments=DB.assessments.filter(function(x){return x.id!==b.dataset.ad;}); (DB._deletedIds=DB._deletedIds||[]).push(b.dataset.ad); save(); draw(); } }; });
    $$('#asBody [data-ae]').forEach(function(b){ b.onclick=function(){ assessForm(acf(DB.assessments).find(function(x){return x.id===b.dataset.ae;}), draw); }; });
  };
  draw();
  $$('#asFilters .chip').forEach(function(c){ c.onclick=function(){ $$('#asFilters .chip').forEach(function(x){x.classList.remove('on');}); c.classList.add('on'); filt=AM_FILT=c.dataset.t; draw(); }; });
  if($('#asCo')){ $('#asCo').value=coFilt; $('#asCo').onchange=function(){ coFilt=AM_CO=$('#asCo').value; draw(); }; }
  $('#asAdd').onclick=function(){ assessForm({cohortId:(coFilt!=='all'&&coFilt!=='none')?coFilt:''}, draw); };
}
function assessCohortName(id){
  if(!id) return '<span class="muted">공통</span>';
  var c=(typeof VOD!=='undefined')?VOD.cohort(id):null;
  return c ? ('<span class="pill" style="--c:#7c3aed">'+esc(c.name)+'</span>') : '<span class="muted">-</span>';
}

function assessForm(a, onDone){
  a=a||{};
  var _autoExplains = a.explains || {};
  var _autoSets = [];
  var _autoFileUrl = a.fileUrl || '';
  var _autoText = '';
  var typeOpts=ASSESS_TYPES.map(function(x){return '<option value="'+x[0]+'" '+(a.type===x[0]?'selected':'')+'>'+x[1]+'</option>';}).join('');
  openModal(el('<div class="form"><h3>'+(a.id?'평가 수정':'평가 업로드')+'</h3>'
    +'<div class="frow"><label>유형 *<select id="as_t">'+typeOpts+'</select></label>'
    +'<label>공개 기수<select id="as_co"><option value="">전체 기수 공통</option>'
      + ((typeof VOD!=='undefined')?VOD.cohorts():[]).map(function(c){ return '<option value="'+c.id+'"'+(a.cohortId===c.id?' selected':'')+'>'+esc(c.name)+'</option>'; }).join('')
    + '</select></label></div>'
    +'<label>공개 반<select id="as_g"><option value="전체">전체 반</option>'
      + ['A','B','C'].map(function(x){ return '<option value="'+x+'"'+(a.target===x?' selected':'')+'>'+tierName(x)+'</option>'; }).join('')
    + '</select><small class="muted">기수와 반을 함께 지정하면 해당 기수의 그 반 학생에게만 공개됩니다.</small></label>'
    +'<label>제목 *<input id="as_ti" value="'+esc(a.title||'')+'" placeholder="예: 3주차 어휘 퀴즈"></label>'
    +'<div class="frow"><label>만점<input id="as_ms" type="number" value="'+(a.maxScore||100)+'"></label><label>대상 학년/반<input id="as_g2" value="'+esc(a.target||'전체')+'" style="display:none"></label></div>'
    +'<label>설명<textarea id="as_d" placeholder="범위·유의사항 등">'+esc(a.desc||'')+'</textarea></label>'
    +'<div class="frow"><label>문항 수 <small class="muted">(파일 업로드 시 자동 입력 · 수정 가능)</small><input id="as_qn" type="number" min="0" value="'+(a.qCount||'')+'" placeholder="예: 20"></label>'
    +'<label>제한시간(분) <small class="muted">(퀴즈 외 기본 60분)</small><input id="as_tl" type="number" min="0" value="'+(a.timeLimit||defaultLimit(a.type))+'" placeholder="60"></label></div>'
    +'<label>객관식 정답표 <small class="muted">(예: 1 3 2 4 … 공백·쉼표로 구분 · 자동 채점)</small><input id="as_key" value="'+esc(a.answerKey||'')+'" placeholder="파일 업로드 시 자동 입력됩니다"></label>'
    +'<label>주관식(단답형) 정답표 <small class="muted">(한 줄에 하나씩 · 예: 6: innovation · 복수 정답은 / 로 구분 · 객관식만 있으면 비워 두세요)</small>'
    +'<textarea id="as_skey" rows="3" placeholder="객관식만 있는 시험은 비워 두세요&#10;6: innovation&#10;7: sustainability">'+esc(subjToText(a.subjKey))+'</textarea></label>'
    +'<div class="bar-actions" style="margin:-4px 0 4px"><button class="btn ghost rptmini" type="button" id="as_sclr">주관식 비우기</button></div>'
    +'<label class="as-uplab">시험지 자료 <small class="muted">(PDF · 한글(HWP/HWPX) · Word · 이미지 · 최대 100MB — 업로드하면 학생 화면에 시험지로 자동 표시되고, 정답·해설 부분은 자동으로 가려집니다)</small></label>'+'<div class="upl-row"><input type="file" id="as_f" accept=".pdf,.hwp,.hwpx,.doc,.docx,.png,.jpg,.jpeg,.ppt,.pptx,.xls,.xlsx,.txt"><button class="btn rptmini" id="as_up" type="button">서버에 업로드</button></div>'+'<div id="as_us" class="muted as-upst">파일을 선택한 뒤 [서버에 업로드]를 누르면 아래에 시험지 미리보기가 표시됩니다.</div>'+'<div class="upl-row"><input id="as_u" value="'+esc(a.fileUrl||'')+'" placeholder="업로드하면 자동 입력 · 외부 링크 직접 입력도 가능">'+'<button class="btn ghost rptmini" id="as_pv" type="button">원본 보기</button>'+'<button class="btn ghost rptmini" id="as_pv2" type="button">학생 화면으로 보기</button></div>'+'<div class="as-preview dv-box" id="as_pvbox"></div>'
    +'<div class="frow"><label>공개일<input id="as_o" type="date" value="'+(a.openDate|| (typeof VOD!=='undefined'&&VOD.startDate?VOD.startDate():null) || todayStr())+'"></label><label>마감일<input id="as_dd" type="date" value="'+(a.dueDate||'')+'"></label></div>'
    +'<div class="modal-actions"><button class="btn ghost" id="as_c">취소</button><button class="btn" id="as_ok">저장</button></div></div>'));
  document.getElementById('as_c').onclick=closeModal;
  var sclr=document.getElementById('as_sclr');
  if(sclr) sclr.onclick=function(){ var e=document.getElementById('as_skey'); if(e){ e.value=''; toast('주관식 정답표를 비웠습니다 — 전부 객관식으로 채점됩니다'); } };
  var typeSel=document.getElementById('as_t');
  if(typeSel) typeSel.onchange=function(){
    var tl=document.getElementById('as_tl');
    if(tl && (!tl.value || tl.value==='0' || tl.value==='60')) tl.value = defaultLimit(typeSel.value) || '';
  };
  var upBtn=document.getElementById('as_up');
  if(upBtn) upBtn.onclick=function(){
    var f=((document.getElementById('as_f')||{}).files||[])[0];
    if(!f){ alert('먼저 파일을 선택해 주세요'); return; }
    upBtn.disabled=true;
    uploadPick('as_f','as_us', function(url,name,size){
      upBtn.disabled=false;
      document.getElementById('as_u').value=url;
      var kn=(typeof DOCV!=='undefined')?DOCV.kindName(DOCV.kind(url)):'파일';
      var st=document.getElementById('as_us');
      st.innerHTML='<b style="color:#059669">업로드 완료</b> · '+esc(name)+' ('+fmtMB(size||f.size)+') · '+esc(kn)+' — 정답을 자동으로 찾는 중...';
      st.classList.add('ok');
      if(typeof DOCV!=='undefined') DOCV.render(document.getElementById('as_pvbox'), url, {hideAnswers:true, noDownload:true});
      autoDetectAnswers(url, name);
    }, {maxMB:100});
    setTimeout(function(){ upBtn.disabled=false; }, 1200);
  };
  function _pv(opt){
    var u=(document.getElementById('as_u').value||'').trim();
    if(!u){ toast('먼저 파일을 업로드하거나 주소를 입력하세요'); return; }
    if(typeof DOCV!=='undefined') DOCV.render(document.getElementById('as_pvbox'), u, opt);
  }
  if(document.getElementById('as_pv'))  document.getElementById('as_pv').onclick=function(){ _pv({}); };
  if(document.getElementById('as_pv2')) document.getElementById('as_pv2').onclick=function(){ _pv({hideAnswers:true, noDownload:true}); toast('학생에게 보이는 화면입니다 — 정답·해설은 자동으로 가려집니다'); };
  if(a.fileUrl && typeof DOCV!=='undefined') DOCV.render(document.getElementById('as_pvbox'), a.fileUrl, {hideAnswers:true, noDownload:true, setNo:assessSetNo(a)});
  /* 회차가 여러 개일 때 선택 화면 */
  function showSetPicker(sets, url, name){
    var box = document.getElementById('as_setbox');
    if(!box){
      box = document.createElement('div'); box.id='as_setbox'; box.className='set-box';
      var anchor = document.getElementById('as_pvbox');
      if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor);
    }
    _autoFileUrl = url;
    box.innerHTML = '<div class="set-h"><b>회차 ' + sets.length + '개를 찾았습니다</b>'
      + '<span class="muted">회차별로 따로 등록하면 학생이 1회차·2회차를 구분해 응시합니다.</span></div>'
      + '<div class="set-list">' + sets.map(function(x, i){
          return '<label class="set-row' + (x.complete ? '' : ' warn') + '">'
            + '<input type="checkbox" class="setck" data-i="' + i + '" checked>'
            + '<b>' + esc(x.label) + '</b>'
            + '<span class="muted">문항 ' + (x.qn || x.max) + ' · 정답 ' + x.count + ' · 해설 ' + (x.explainCount||0) + '</span>'
            + (x.complete ? '<span class="set-ok">정답 전부 인식</span>' : '<span class="set-warn">일부만 인식 — 저장 후 확인 필요</span>')
            + '</label>'; }).join('') + '</div>'
      + '<div class="set-acts"><button class="btn" type="button" id="as_setgo">선택한 회차로 나눠 등록</button>'
      + '<button class="btn ghost" type="button" id="as_setno">하나로 등록</button></div>';
    document.getElementById('as_setno').onclick=function(){ box.innerHTML=''; toast('회차를 나누지 않고 하나로 등록합니다'); };
    document.getElementById('as_setgo').onclick=function(){ createFromSets(sets); };
  }
  /* 회차별 평가 일괄 생성 */
  function createFromSets(sets){
    var picked = $$('.setck').filter(function(c){ return c.checked; }).map(function(c){ return sets[+c.dataset.i]; });
    if(!picked.length){ toast('등록할 회차를 선택해 주세요'); return; }
    var base = document.getElementById('as_ti').value.trim() || '평가';
    var type = document.getElementById('as_t').value;
    var co   = (document.getElementById('as_co')||{}).value || '';
    var tgt  = (document.getElementById('as_g')||{}).value || '전체';
    var open = document.getElementById('as_o').value || todayStr();
    var due  = document.getElementById('as_dd').value || '';
    var ms   = +((document.getElementById('as_ms')||{}).value) || 100;
    var tl   = +((document.getElementById('as_tl')||{}).value) || defaultLimit(type);
    var desc = document.getElementById('as_d').value || '';
    DB.assessments = DB.assessments || [];
    picked.forEach(function(x, i){
      var label = /회/.test(x.label) ? x.label : (x.no + '회차');
      DB.assessments.push({
        id: uid('as2'), type:type, cohortId:co, target:tgt,
        title: base + ' — ' + label,
        desc: desc, maxScore: ms, qCount: (x.qn || x.max || 0), timeLimit: tl,
        answerKey: x.key || '', subjKey: x.subj || {}, explains: x.explains || {},
        fileUrl: _autoFileUrl, openDate: open, dueDate: due,
        setNo: x.no, setLabel: label, parts: x.parts || null, createdAt: todayStr()
      });
    });
    save(); closeModal();
    toast(picked.length + '개 회차를 각각 등록했습니다');
    if(onDone) onDone();
  }
  /* 자동으로 회차를 못 찾았을 때: 수동 분할 안내 */
  function showManualSplitOffer(url){
    var box = document.getElementById('as_setbox');
    if(!box){
      box = document.createElement('div'); box.id='as_setbox'; box.className='set-box';
      var anchor = document.getElementById('as_pvbox');
      if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor);
    }
    _autoFileUrl = url;
    var whole = (typeof DOCX_!=='undefined') ? DOCX_.analyze(_autoText||'') : {count:0};
    var total = (whole.key||'').split(' ').filter(function(v){ return v && v!=='-'; }).length;
    box.innerHTML = '<div class="set-h"><b>이 파일에 1·2회차가 함께 들어 있나요?</b>'
      + '<span class="muted">자동으로 회차를 찾지 못했습니다. 아래에서 직접 나눠 등록할 수 있습니다. (전체 인식 정답 ' + total + '개)</span></div>'
      + '<div class="set-manual">'
      + '<label class="inl">회차 수 <input type="number" id="ms_n" min="2" max="10" value="2" style="width:64px"></label>'
      + '<label class="inl">회차별 문항 수 <input id="ms_q" placeholder="예: 30,30 (비우면 균등 분할)" style="width:190px"></label>'
      + '<button class="btn rptmini" type="button" id="ms_go">회차별로 나눠 등록</button>'
      + '<button class="btn ghost rptmini" type="button" id="ms_no">하나로 등록</button></div>';
    document.getElementById('ms_no').onclick = function(){ box.innerHTML=''; };
    document.getElementById('ms_go').onclick = function(){ createManualSets(); };
  }
  function createManualSets(){
    var whole = (typeof DOCX_!=='undefined') ? DOCX_.analyze(_autoText||'') : null;
    var keys = whole ? (whole.key||'').split(' ').filter(function(v){ return v!==''; }) : [];
    if(!keys.length){ toast('정답을 인식하지 못해 나눌 수 없습니다. 정답표를 직접 입력해 주세요.'); return; }
    var n = Math.max(2, Math.min(10, +((document.getElementById('ms_n')||{}).value) || 2));
    var qtxt = ((document.getElementById('ms_q')||{}).value || '').trim();
    var counts = [];
    if(qtxt){
      counts = qtxt.split(/[\s,]+/).map(Number).filter(function(x){ return x > 0; });
      if(counts.length !== n){ toast('회차별 문항 수를 ' + n + '개 입력해 주세요 (예: 30,30)'); return; }
    } else {
      var per = Math.floor(keys.length / n);
      for(var i=0;i<n;i++) counts.push(i === n-1 ? (keys.length - per*(n-1)) : per);
    }
    var sum = counts.reduce(function(a,b){ return a+b; }, 0);
    if(sum !== keys.length && !confirm('입력한 문항 합계(' + sum + ')가 인식된 정답 수(' + keys.length + ')와 다릅니다. 계속할까요?')) return;
    var base = document.getElementById('as_ti').value.trim() || '평가';
    var type = document.getElementById('as_t').value;
    var co   = (document.getElementById('as_co')||{}).value || '';
    var tgt  = (document.getElementById('as_g')||{}).value || '전체';
    var open = document.getElementById('as_o').value || todayStr();
    var due  = document.getElementById('as_dd').value || '';
    var ms   = +((document.getElementById('as_ms')||{}).value) || 100;
    var tl   = +((document.getElementById('as_tl')||{}).value) || defaultLimit(type);
    DB.assessments = DB.assessments || [];
    var pos = 0;
    for(var r2=0; r2<n; r2++){
      var take = counts[r2];
      var slice = keys.slice(pos, pos+take);
      var ex = {};
      Object.keys((whole && whole.explains) || {}).forEach(function(k){
        var q2 = +k; if(q2 > pos && q2 <= pos+take) ex[q2-pos] = whole.explains[k];
      });
      DB.assessments.push({
        id: uid('as2'), type:type, cohortId:co, target:tgt,
        title: base + ' — ' + (r2+1) + '회차',
        desc: '', maxScore: ms, qCount: take, timeLimit: tl,
        answerKey: slice.join(' '), subjKey: {}, explains: ex,
        fileUrl: _autoFileUrl, openDate: open, dueDate: due,
        setNo: r2+1, setLabel: (r2+1) + '회차',
        qFrom: pos+1, qTo: pos+take, createdAt: todayStr()
      });
      pos += take;
    }
    save(); closeModal();
    toast(n + '개 회차로 나눠 등록했습니다');
    if(onDone) onDone();
  }
  function autoDetectAnswers(url, name){
    var st=document.getElementById('as_us');
    if(typeof DOCV==='undefined' || !DOCV.extractText){ if(st) st.innerHTML='<b style="color:#059669">업로드 완료</b> · '+esc(name)+' — [저장]을 눌러 주세요.'; return; }
    DOCV.extractText(url).then(function(text){
      var r = (typeof DOCX_!=='undefined') ? DOCX_.analyze(text||'') : {found:false};
      _autoText = text || '';
      /* 회차(1회차·2회차 등)가 여러 개면 회차별로 나눠 등록할 수 있게 안내 */
      try{
        _autoSets = (typeof DOCX_!=='undefined' && DOCX_.analyzeSets) ? DOCX_.analyzeSets(text||'') : [];
      }catch(e){ _autoSets = []; }
      if(_autoSets && _autoSets.length >= 2){ showSetPicker(_autoSets, url, name); }
      else { showManualSplitOffer(url); }
      if(r.found){
        if(r.key) document.getElementById('as_key').value = r.key;
        var sk=document.getElementById('as_skey');
        if(sk && r.subjCount) sk.value = subjToText(r.subj);
        var subjMax = 0; Object.keys(r.subj||{}).forEach(function(k){ if(+k>subjMax) subjMax=+k; });
        var qn=document.getElementById('as_qn');
        var detected = Math.max(r.max || r.count || 0, subjMax);
        if(qn && detected) qn.value = detected;
        _autoExplains = r.explains || {};
        var nEx = Object.keys(_autoExplains).length;
        st.innerHTML = '<b style="color:#059669">자동 인식 완료</b> · 문항 <b>' + detected + '개</b>'
          + (r.count ? (' · 객관식 <b>' + r.count + '개</b>') : '')
          + (r.subjCount ? (' · 주관식 <b>' + r.subjCount + '개</b>') : ' · 주관식 없음')
          + (nEx ? (' · 해설 <b>' + nEx + '개</b>') : '')
          + (r.mode ? (' <span class="muted">(' + r.mode + ' 방식 인식)</span>') : '')
          + '<br>아래에서 자유롭게 수정할 수 있습니다. 객관식만 있는 시험인데 주관식이 잡혔다면 [주관식 비우기]를 눌러 주세요.';
        toast('정답 ' + (r.count + (r.subjCount||0)) + '개를 자동으로 읽었습니다');
      } else {
        st.innerHTML = '<b style="color:#d97706">정답을 찾지 못했습니다</b> · 파일에 「정답」 또는 「정답 및 해설」 부분이 있으면 자동으로 읽습니다. 아래에 직접 입력해 주세요.';
      }
    }).catch(function(){
      st.innerHTML = '<b style="color:#d97706">정답 자동 인식 실패</b> · 아래 정답표에 직접 입력해 주세요.';
    });
  }
  document.getElementById('as_ok').onclick=function(){
    var ti=document.getElementById('as_ti').value.trim();
    if(!ti){ alert('제목은 필수입니다'); return; }
    DB.assessments=DB.assessments||[];
    var data={ type:document.getElementById('as_t').value, title:ti, desc:document.getElementById('as_d').value,
      fileUrl:document.getElementById('as_u').value.trim(), target:document.getElementById('as_g').value.trim()||'전체',
      cohortId:(document.getElementById('as_co')||{}).value||'',
      subjKey: subjFromText((document.getElementById('as_skey')||{}).value||''),
      explains: Object.keys(_autoExplains||{}).length ? _autoExplains : (a.explains||{}),
      maxScore:+((document.getElementById('as_ms')||{}).value)||100, qCount:+((document.getElementById('as_qn')||{}).value)||0, timeLimit:+((document.getElementById('as_tl')||{}).value)||0, answerKey:((document.getElementById('as_key')||{}).value||'').trim(), openDate:document.getElementById('as_o').value||todayStr(), dueDate:document.getElementById('as_dd').value||null, by:CURRENT.name };
    if(a.id){ Object.assign((acf(DB.assessments).find(function(x){return x.id===a.id;})||{}),data); }
    else { DB.assessments.push(Object.assign({id:uid('as2'),createdAt:todayStr()},data)); }
    save(); closeModal(); if(onDone)onDone();
  };
}

/* 학생 화면: 공개된 평가 목록 + 응시/제출 */
/* 초기화(리셋)된 기록은 없는 것으로 취급 — 삭제 대신 표식을 남겨 기기 간 동기화가 되돌아오지 않게 한다 */
function isCleared(r){ return !!(r && r.cleared); }
function liveScore(r){ return isCleared(r) ? null : (r || null); }
function myScore(aid,sid){ DB.scores=DB.scores||{}; DB.scores[aid]=DB.scores[aid]||{}; return liveScore(DB.scores[aid][sid]); }
/* 제목에 '— 1회차'가 있는데 setNo가 없는 예전 등록분 보정 */
/* 풀이(정답·해설) 공개 여부 — 강사가 공개해야 학생이 볼 수 있다 */
function reviewOpen(a){ return !!(a && a.reviewOpen); }
function assessSetNo(a){
  if(!a) return 0;
  if(a.setNo) return a.setNo;
  var m = /(?:^|[—\-·\s])((?:제\s*)?([0-9]{1,2})\s*회\s*차?|TEST\s*0?([0-9]{1,2})|SET\s*0?([0-9]{1,2}))/i.exec(a.title||'');
  if(m){ var n = +(m[2]||m[3]||m[4]||0); if(n>0 && n<=30) return n; }
  return 0;
}
function assessVisible(a, stu){
  if(!a) return false;
  if(a.cohortId && (!stu || stu.cohortId !== a.cohortId)) return false;
  if(a.target && a.target!=='전체' && (!stu || stu.cls !== a.target)) return false;
  return true;
}
function assessStudentPanel(){
  var today=todayStr(); var s=myStu(); if(!s) return '';
  var open=(acf(DB.assessments)||[]).filter(function(a){ return (a.openDate||today)<=today && assessVisible(a, s); })
    .sort(function(a,b){ return (a.dueDate||'9999').localeCompare(b.dueDate||'9999'); });
  if(!open.length) return '';
  return '<div class="panel"><h3>등록된 평가 <small class="muted">(퀴즈·숙제·테스트·모의고사)</small></h3>'
    + open.map(function(a){
        var r=myScore(a.id,s.id)||{};
        var dd=a.dueDate?Math.ceil((new Date(a.dueDate+'T23:59:59')-new Date())/86400000):null;
        var closed=(dd!=null&&dd<0);
        var ddtxt=a.dueDate?(closed?'<span class="pill" style="--c:#ef4444">마감</span>':'<span class="pill" style="--c:'+(dd<=1?'#f59e0b':'#4f46e5')+'">D-'+dd+'</span>'):'';
        var st='';
        if(r.submittedAt && !reviewOpen(a)) st='<span class="vstat vstat-ing">제출 완료 · 선생님 채점 중</span>';
        else if(r.score!=null) st='<span class="vstat vstat-ok">채점 완료 · '+r.score+'/'+(a.maxScore||100)+'점</span>';
        else if(r.submittedAt) st='<span class="vstat vstat-ing">제출 완료 · 채점 대기 (수정 불가)</span>';
        else if(closed) st='<span class="vstat vstat-over">미제출</span>';
        else st='<span class="vstat vstat-ing">미응시</span>';
        var btn;
        if(r.submittedAt && !reviewOpen(a)) btn = '<button class="btn ghost rptmini disabled" disabled>채점 중</button>';
        else if(r.score!=null)     btn = '<button class="btn ghost rptmini" data-asv="'+a.id+'">결과·풀이 보기</button>';
        else if(r.submittedAt)     btn = '<button class="btn ghost rptmini disabled" disabled>제출 완료</button>';   /* 제출 후 수정 불가 */
        else if(closed)            btn = '<button class="btn ghost rptmini disabled" disabled>마감됨</button>';
        else                       btn = '<button class="btn rptmini" data-asd="'+a.id+'">응시하기</button>';
        return '<div class="hwitem"><b><span class="as-chip as-'+a.type+'">'+assessTypeName(a.type)+'</span> '
          +((a.setLabel||assessSetNo(a))?('<span class="pill" style="--c:#0891b2">'+esc(a.setLabel||(assessSetNo(a)+'회차'))+'</span> '):'')
          +esc(a.title)+'</b> '+ddtxt+' '+st
          +(a.desc?'<p class="muted">'+esc(a.desc)+'</p>':'')
          +'<div class="as-actions">'
          + btn
          +(a.fileUrl?'<span class="as-hint">화면에서 바로 응시합니다 (다운로드 없음)</span>':'')
          +(a.dueDate?'<span class="muted" style="font-size:11px">마감 '+a.dueDate+'</span>':'')
          +'</div>'
          +(r.submitFileUrl?'<div class="muted" style="font-size:11.5px;margin-top:6px">첨부 제출됨 · <a class="lnk" href="'+esc(r.submitFileUrl)+'" target="_blank" rel="noopener">확인</a></div>':'')+(r.memo?'<div class="aibox" style="margin-top:8px"><b>첨삭</b><p>'+esc(r.memo)+'</p></div>':'')
          +'</div>';
      }).join('')
    + '</div>';
}
function bindAssessStudent(){
  $$('#page [data-asd]').forEach(function(b){ b.onclick=function(){ assessTake(b.dataset.asd); }; });
  $$('#page [data-asv]').forEach(function(b){ b.onclick=function(){ assessResult(b.dataset.asv); }; });
}
/* 응시/제출 모달 — 시험지(PDF/Word/이미지) 뷰어 + 답안지 */
function fileKind(url){ url=(url||'').toLowerCase().split('?')[0];
  if(/\.pdf$/.test(url)) return 'pdf';
  if(/\.(png|jpe?g|gif|webp)$/.test(url)) return 'img';
  if(/\.(docx?|hwpx?|pptx?|xlsx?)$/.test(url)) return 'office';
  return 'link'; }
function omrHtml(qn, prev, subj, parts){
  prev = prev || []; subj = subj || {}; parts = parts || null;
  var out='';
  for(var i=0;i<qn;i++){
    if(parts){
      for(var pi=0; pi<parts.length; pi++){
        if(parts[pi].from === i+1){ out += '<div class="omr-part">'+esc(parts[pi].name)+' <span>'+parts[pi].from+'~'+parts[pi].to+'번</span></div>'; }
      }
    }
    var isSubj = subj[i+1] != null && String(subj[i+1]).trim() !== '';
    out += '<label class="omr-q'+(isSubj?' omr-subj':'')+'"><span>'+(i+1)+'</span>'
      + '<input class="omr-in'+(isSubj?' omr-in-s':'')+'" data-i="'+i+'"'
      + (isSubj ? ' placeholder="단답"' : ' maxlength="2" inputmode="numeric"')
      + ' value="'+esc(prev[i]||'')+'"></label>';
  }
  return out;
}
function assessTake(aid){
  var s=myStu(); var a=(acf(DB.assessments)||[]).find(function(x){return x.id===aid;}); if(!a) return;
  var today=todayStr();
  if(CURRENT.role==='student' && !assessVisible(a, s)){ alert('응시 대상이 아닌 평가입니다.'); return; }
  if(a.dueDate && a.dueDate<today){ alert('마감된 평가입니다.'); return; }
  var _prev = myScore(aid, s.id);
  if(CURRENT.role==='student' && _prev && _prev.submittedAt){
    alert('이미 제출한 평가입니다. 답안은 수정할 수 없습니다.\n다시 응시가 필요하면 담당 선생님께 초기화를 요청해 주세요.');
    if(_prev.score!=null) assessResult(aid);
    return;
  }
  var r=myScore(aid,s.id)||{};
  var keys=(a.answerKey||'').split(/[\s,]+/).filter(Boolean);
  var subjNos = Object.keys(a.subjKey||{}).map(Number).filter(function(n){return n>0;});
  var qn = Math.max(keys.length, (+a.qCount||0), subjNos.length?Math.max.apply(null,subjNos):0);
  var flexQ = false;
  if(!qn){ qn = +(r.qnUsed||0) || 20; flexQ = true; }   /* 문항 수 미지정 시 기본 20문항(조절 가능) */
  var prev=(r.answers||'').split(/[\s,]+/).filter(Boolean);

  /* 시험지 뷰어 */
  var viewer='<div class="ex-doc dv-box" id="exDoc"></div>';
  /* 답안지 */
  var sheet='';
  if(qn>0){
    sheet='<div class="ex-omr-h">답안 입력 '
      + (flexQ
        ? '<span class="qn-pick">문항 수 <select id="exQn">'
            + [10,15,20,25,30,35,40,45,50].map(function(n){ return '<option value="'+n+'"'+(n===qn?' selected':'')+'>'+n+'</option>'; }).join('')
          + '</select></span>'
        : '<span class="muted">'+qn+'문항</span>')
      + '</div>'
      +'<div class="omr" id="exOmr">'+omrHtml(qn, prev, a.subjKey, a.parts)+'</div>'
      +(keys.length?'<p class="muted" style="font-size:11.5px">제출 즉시 자동 채점됩니다.</p>':'<p class="muted" style="font-size:11.5px">제출 후 강사가 채점합니다.</p>')
      +'<label style="margin-top:8px">추가 메모(선택)<textarea id="as_sub" rows="3" placeholder="풀이·질문 등">'+esc(r.submitText||'')+'</textarea></label>'
      +'<div class="upl-row"><input type="file" id="as_sf" accept="image/*,.pdf,.doc,.docx,.hwp,.hwpx"><button class="btn ghost rptmini" type="button" id="as_su">답안지 사진·파일 첨부</button><span id="as_ss" class="muted" style="font-size:11px">'+(r.submitFileUrl?'첨부됨':'')+'</span></div>'
      +'<p class="muted" style="font-size:11px">손으로 푼 답안지는 사진을 찍어 첨부하세요.</p>';
  } else {
    sheet='<div class="ex-omr-h">답안 제출</div>'
      +'<label>답안 내용<textarea id="as_sub" rows="8" placeholder="답안·풀이를 입력하세요">'+esc(r.submitText||'')+'</textarea></label>'
      +'<div class="upl-row"><input type="file" id="as_sf" accept="image/*,.pdf,.doc,.docx,.hwp,.hwpx"><button class="btn ghost rptmini" type="button" id="as_su">답안지 사진·파일 첨부</button><span id="as_ss" class="muted" style="font-size:11px">'+(r.submitFileUrl?'첨부됨':'')+'</span></div>';
  }
  openModal(el('<div class="exwrap">'
    +'<div class="ex-head"><div><h3>'+esc(a.title)+'</h3>'
      +'<div class="vp-meta">'+assessTypeName(a.type)+((a.setLabel||assessSetNo(a))?(' · '+esc(a.setLabel||(assessSetNo(a)+'회차'))):'')+(a.dueDate?(' · 마감 '+a.dueDate):'')+(qn?(' · '+qn+'문항'):'')+(a.timeLimit?(' · 제한 '+a.timeLimit+'분'):'')+'</div></div>'
      +'<div class="ex-head-btns">'+(a.timeLimit?'<span class="ex-timer" id="exTimer">--:--</span>':'')
      +'<span class="ex-zoom"><button class="btn ghost rptmini" type="button" id="exZo">-</button><button class="btn ghost rptmini" type="button" id="exZi">+</button></span>'

      +'<button class="btn ghost rptmini" id="as_x">닫기</button></div></div>'
    +'<div class="ex-tabs"><button class="ex-tab on" data-extab="paper" type="button">시험지</button><button class="ex-tab" data-extab="sheet" type="button">답안지</button></div>'
    +'<div class="ex-body" id="exBody"><div class="ex-paper">'+viewer+'</div>'
      +'<aside class="ex-sheet">'+sheet
      +'<button class="btn big" id="as_ok" style="margin-top:10px">제출하기</button></aside></div></div>'));

  if(typeof DOCV!=='undefined'){ DOCV.render(document.getElementById('exDoc'), a.fileUrl||'', {hideAnswers:true, noDownload:true, setNo:assessSetNo(a), setLabel:a.setLabel||'', qFrom:a.qFrom||0, qTo:a.qTo||0}); }
  (function(){ var pa=document.querySelector('.ex-paper'); if(!pa) return;
    pa.addEventListener('contextmenu', function(ev){ ev.preventDefault(); });
    pa.addEventListener('dragstart', function(ev){ ev.preventDefault(); }); })();
  /* 문항 수 조절 (문항 수가 지정되지 않은 평가) */
  (function(){
    var sel=document.getElementById('exQn'); if(!sel) return;
    sel.onchange=function(){
      var cur=[]; $$('.omr-in').forEach(function(i){ cur.push(i.value||''); });
      qn=+sel.value;
      document.getElementById('exOmr').innerHTML=omrHtml(qn, cur, a.subjKey, a.parts);
    };
  })();
  /* 모바일: 시험지 / 답안지 탭 전환 */
  (function(){
    var body=document.getElementById('exBody'); if(!body) return;
    $$('.ex-tab').forEach(function(t){ t.onclick=function(){
      $$('.ex-tab').forEach(function(x){ x.classList.remove('on'); });
      t.classList.add('on');
      body.setAttribute('data-show', t.dataset.extab);
    };});
    body.setAttribute('data-show','paper');
  })();
  /* 시험지 글자/화면 확대·축소 */
  (function(){
    var z=1, pa=document.querySelector('.ex-paper'); if(!pa) return;
    function apply(){ pa.style.setProperty('--exz', z); }
    var zi=document.getElementById('exZi'), zo=document.getElementById('exZo');
    if(zi) zi.onclick=function(){ z=Math.min(2.2, z+0.15); apply(); };
    if(zo) zo.onclick=function(){ z=Math.max(0.6, z-0.15); apply(); };
    apply();
  })();
  var fileUrl=r.submitFileUrl||'';
  var up=document.getElementById('as_su');
  if(up) up.onclick=function(){ uploadPick('as_sf','as_ss', function(url){ fileUrl=url; }, {maxMB:50}); };
  /* 제한시간 타이머 */
  var timer=null;
  if(a.timeLimit){ var left=a.timeLimit*60;
    var tick2=function(){ var m=Math.floor(left/60), sec=left%60;
      var el2=document.getElementById('exTimer'); if(!el2){ clearInterval(timer); return; }
      el2.textContent=String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
      el2.classList.toggle('warn', left<=300);
      if(left<=0){ clearInterval(timer); toast('제한시간이 종료되어 자동 제출합니다'); doSubmit(); return; }
      left--; };
    tick2(); timer=setInterval(tick2,1000);
  }
  function doSubmit(){
    DB.scores=DB.scores||{}; DB.scores[aid]=DB.scores[aid]||{};
    var rec=DB.scores[aid][s.id]||{};
    if(rec.cleared) rec={};                 /* 초기화 후 재응시 → 완전히 새 기록으로 시작 */
    rec.cleared=false;
    rec._u=Date.now();
    rec.submittedAt=todayStr();
    if(qn>0){
      var ans=[]; $$('.omr-in').forEach(function(inp){ ans.push((inp.value||'').trim()||'-'); });
      rec.answers=ans.join(' ');
      rec.qnUsed=ans.length;
      var g=OPS.autoGrade(a, rec.answers);
      if(g){ rec.score=g.score; rec.right=g.right; rec.total=g.total; rec.marks=g.marks; rec.by='자동채점'; rec.at=todayStr(); }
    }
    var sub=document.getElementById('as_sub'); if(sub) rec.submitText=sub.value||'';
    if(fileUrl) rec.submitFileUrl=fileUrl;
    DB.scores[aid][s.id]=rec; save();
    if(timer) clearInterval(timer);
    closeModal();
    if(reviewOpen(a) && rec.score!=null){ toast('제출 완료 — '+rec.right+'/'+rec.total+' 정답 · '+rec.score+'점'); assessResult(aid); }
    else toast('제출이 완료되었습니다. 선생님이 채점한 뒤 풀이가 공개됩니다.');
    if(document.getElementById('page')){ if(typeof v2Assignments==='function' && ROUTE==='s-hw') v2Assignments(); else renderPage(); }
  }
  document.getElementById('as_x').onclick=function(){ if(timer) clearInterval(timer); closeModal(); };
  function autoDetectAnswers(url, name){
    var st=document.getElementById('as_us');
    if(typeof DOCV==='undefined' || !DOCV.extractText){ if(st) st.innerHTML='<b style="color:#059669">업로드 완료</b> · '+esc(name)+' — [저장]을 눌러 주세요.'; return; }
    DOCV.extractText(url).then(function(text){
      var r = (typeof DOCX_!=='undefined') ? DOCX_.analyze(text||'') : {found:false};
      _autoText = text || '';
      /* 회차(1회차·2회차 등)가 여러 개면 회차별로 나눠 등록할 수 있게 안내 */
      try{
        _autoSets = (typeof DOCX_!=='undefined' && DOCX_.analyzeSets) ? DOCX_.analyzeSets(text||'') : [];
      }catch(e){ _autoSets = []; }
      if(_autoSets && _autoSets.length >= 2){ showSetPicker(_autoSets, url, name); }
      else { showManualSplitOffer(url); }
      if(r.found){
        if(r.key) document.getElementById('as_key').value = r.key;
        var sk=document.getElementById('as_skey');
        if(sk && r.subjCount) sk.value = subjToText(r.subj);
        var subjMax = 0; Object.keys(r.subj||{}).forEach(function(k){ if(+k>subjMax) subjMax=+k; });
        var qn=document.getElementById('as_qn');
        var detected = Math.max(r.max || r.count || 0, subjMax);
        if(qn && detected) qn.value = detected;
        _autoExplains = r.explains || {};
        var nEx = Object.keys(_autoExplains).length;
        st.innerHTML = '<b style="color:#059669">자동 인식 완료</b> · 문항 <b>' + detected + '개</b>'
          + (r.count ? (' · 객관식 <b>' + r.count + '개</b>') : '')
          + (r.subjCount ? (' · 주관식 <b>' + r.subjCount + '개</b>') : ' · 주관식 없음')
          + (nEx ? (' · 해설 <b>' + nEx + '개</b>') : '')
          + (r.mode ? (' <span class="muted">(' + r.mode + ' 방식 인식)</span>') : '')
          + '<br>아래에서 자유롭게 수정할 수 있습니다. 객관식만 있는 시험인데 주관식이 잡혔다면 [주관식 비우기]를 눌러 주세요.';
        toast('정답 ' + (r.count + (r.subjCount||0)) + '개를 자동으로 읽었습니다');
      } else {
        st.innerHTML = '<b style="color:#d97706">정답을 찾지 못했습니다</b> · 파일에 「정답」 또는 「정답 및 해설」 부분이 있으면 자동으로 읽습니다. 아래에 직접 입력해 주세요.';
      }
    }).catch(function(){
      st.innerHTML = '<b style="color:#d97706">정답 자동 인식 실패</b> · 아래 정답표에 직접 입력해 주세요.';
    });
  }
  document.getElementById('as_ok').onclick=function(){
    if(!confirm('제출하시겠습니까?\n제출 후에는 답안을 수정할 수 없습니다.')) return; doSubmit(); };
}
/* 결과 보기 */
function assessResult(aid){
  var s=myStu(); var a=(acf(DB.assessments)||[]).find(function(x){return x.id===aid;}); if(!a) return;
  var r=myScore(aid,s.id)||{};
  if(CURRENT.role==='student' && !reviewOpen(a)){
    openModal(el('<div class="form"><h3>'+esc(a.title)+'</h3>'
      + '<div class="rv-wait"><b>선생님이 채점 중입니다</b>'
      + '<p>채점이 끝나고 풀이가 공개되면 점수와 해설을 확인할 수 있습니다.</p>'
      + '<p class="muted">제출일 '+esc(r.submittedAt||'-')+'</p></div>'
      + '<div class="modal-actions"><button class="btn" id="ar_w">확인</button></div></div>'));
    document.getElementById('ar_w').onclick=closeModal;
    return;
  }
  var keys=(a.answerKey||'').split(/[\s,]+/).filter(Boolean);
  var mine=(r.answers||'').split(/[\s,]+/).filter(Boolean);
  var ex=(a.explains||{});
  var detail='', wrongList='';
  if(r.marks && r.marks.length){
    detail='<h4 class="ar-h">문항별 채점</h4><div class="omr">'+r.marks.map(function(m){
      return '<div class="omr-r '+(m.ok?'ok':'no')+'"><span>'+m.no+'</span><b>'+esc(m.my)+'</b>'+(m.ok?'':'<i>정답 '+esc(m.ans)+'</i>')+'</div>';
    }).join('')+'</div>';
    var ws=r.marks.filter(function(m){ return !m.ok; });
    wrongList = ws.length
      ? '<h4 class="ar-h">틀린 문항 해설 <span class="muted">('+ws.length+'문항)</span></h4><div class="ar-wrongs">'
        + ws.map(function(m){
            var e2=ex[m.no]||ex[String(m.no)]||'';
            return '<div class="ar-w"><div class="ar-wh"><b>'+m.no+'번</b><span class="muted">'+esc(m.kind)+'</span>'
              +'<span class="rv-tag bad">내 답 '+esc(m.my)+'</span><span class="rv-tag ok">정답 '+esc(m.ans)+'</span></div>'
              +(e2?exPaperHtml(e2, m.my, m.ans):'<div class="muted ar-noex">해설이 등록되지 않은 문항입니다.</div>')
              +'</div>'; }).join('') + '</div>'
      : '<div class="ar-perfect">틀린 문항이 없습니다. 완벽합니다.</div>';
  } else if(keys.length && mine.length){
    detail='<h4 class="ar-h">문항별 채점</h4><div class="omr">'+keys.map(function(k,i){
      var ok=(mine[i]||'').toLowerCase()===k.toLowerCase();
      return '<div class="omr-r '+(ok?'ok':'no')+'"><span>'+(i+1)+'</span><b>'+esc(mine[i]||'-')+'</b>'+(ok?'':'<i>정답 '+esc(k)+'</i>')+'</div>';
    }).join('')+'</div>';
    var wrongs=[];
    keys.forEach(function(k,i){
      if(k==='-') return;
      var ok=(mine[i]||'').toLowerCase()===k.toLowerCase();
      if(!ok) wrongs.push({n:i+1, my:(mine[i]||'-'), ans:k, ex:ex[i+1]||ex[String(i+1)]||''});
    });
    if(wrongs.length){
      wrongList='<h4 class="ar-h">틀린 문항 해설 <span class="muted">('+wrongs.length+'문항)</span></h4>'
        +'<div class="ar-wrongs">'+wrongs.map(function(w){
          return '<div class="ar-w"><div class="ar-wh"><b>'+w.n+'번</b>'
            +'<span class="rv-tag bad">내 답 '+esc(w.my)+'</span><span class="rv-tag ok">정답 '+esc(w.ans)+'</span></div>'
            +(w.ex?exPaperHtml(w.ex, w.my, w.ans):'<div class="muted ar-noex">해설이 등록되지 않은 문항입니다. 시험지의 해설 부분을 확인하세요.</div>')
            +'</div>'; }).join('')+'</div>';
    } else {
      wrongList='<div class="ar-perfect">틀린 문항이 없습니다. 완벽합니다.</div>';
    }
  }
  openModal(el('<div class="form"><h3>'+esc(a.title)+' 결과</h3>'
    +'<div class="credbox"><div><span>점수</span><b>'+(r.score!=null?r.score:'-')+' / '+(a.maxScore||100)+'</b></div>'
    +(r.total?'<div><span>정답</span><b>'+r.right+' / '+r.total+'</b></div>':'')
    +'<div><span>제출일</span><b>'+(r.submittedAt||'-')+'</b></div></div>'
    + detail + wrongList
    +(r.memo?'<div class="aibox" style="margin-top:10px"><b>강사 첨삭</b><p>'+esc(r.memo)+'</p></div>':'')
    +'<div class="modal-actions"><button class="btn" id="ar_x">← 목록으로 돌아가기</button></div></div>'));
  document.getElementById('ar_x').onclick=closeModal;
}

/* ===================== 시험 채점 (구 인증 승인) ===================== */
function examScores(aid){ DB.scores=DB.scores||{}; DB.scores[aid]=DB.scores[aid]||{}; return DB.scores[aid]; }
var EG_CO='all';
/* 정답표가 있는 평가의 미채점 제출을 한 번에 자동채점 */
function autoGradeAll(list, students){
  var n=0, skip=0;
  (list||[]).forEach(function(a){
    var keys=(a.answerKey||'').split(/[\s,]+/).filter(Boolean);
    if(!keys.length){ skip++; return; }
    DB.scores=DB.scores||{}; DB.scores[a.id]=DB.scores[a.id]||{};
    (students||[]).forEach(function(st){
      var r=liveScore(DB.scores[a.id][st.id]);
      /* 답안이 있고 아직 점수가 없으면 채점 — 학생 제출분과 수기 입력분 모두 포함 */
      if(!r || r.score!=null || !r.answers) return;
      var g=(typeof OPS!=='undefined')?OPS.autoGrade(a, r.answers):null;
      if(g){ r.score=g.score; r.right=g.right; r.total=g.total; r.marks=g.marks;
             r.memo=r.memo||(g.right+'/'+g.total+' 정답');
             r.by='자동채점'; r.at=todayStr(); r._u=Date.now();
             DB.scores[a.id][st.id]=r; n++; }
    });
  });
  if(n) save();
  toast(n ? (n+'건을 자동채점했습니다'+(skip?(' · 정답표 없는 평가 '+skip+'건은 제외'):''))
          : (skip ? ('정답표가 등록된 평가가 없습니다 — [평가 관리]에서 정답표를 먼저 등록해 주세요')
                  : '채점할 답안이 없습니다 — 학생이 제출했거나 답안을 입력한 건만 자동채점됩니다'));
  examGrading();
}
function examGrading(){
  DB.assessments=DB.assessments||[]; DB.scores=DB.scores||{};
  const role=CURRENT.role;
  const mine = role==='instructor'? acf(DB.students).filter(function(s){return s.instructorId===CURRENT.id;}) : acf(DB.students).filter(function(s){return !s.testOnly;});
  const today=todayStr();
  var _co = (typeof EG_CO!=='undefined' && EG_CO) ? EG_CO : 'all';
  const opened=(acf(DB.assessments)||[]).filter(function(a){ return (a.openDate||today)<=today; })
    .filter(function(a){ return _co==='all' || (_co==='none' ? !a.cohortId : a.cohortId===_co); })
    .sort(function(a,b){ return (b.openDate||'').localeCompare(a.openDate||''); });
  let html=head('시험 채점','평가별로 점수를 입력하고 채점 상태를 관리합니다');
  html+='<div class="bar"><div class="muted">정답표가 있는 시험지는 제출 즉시 자동 채점됩니다</div><div class="bar-actions">'
    +'<button class="btn ghost" id="egRelease">풀이 공개 / 비공개</button>'
    +'<button class="btn ghost" id="egAuto">미채점 일괄 자동채점</button>'
    +'<select id="egCo" class="cal-co"><option value="all"'+(_co==='all'?' selected':'')+'>전체 기수</option>'
    +'<option value="none"'+(_co==='none'?' selected':'')+'>기수 미지정(공통)</option>'
    + ((typeof VOD!=='undefined')?VOD.cohorts():[]).map(function(c){ return '<option value="'+c.id+'"'+(_co===c.id?' selected':'')+'>'+esc(c.name)+'</option>'; }).join('')
    +'</select></div></div>';
  var totalCells=opened.length*mine.length, graded=0;
  opened.forEach(function(a){ var sc=examScores(a.id); mine.forEach(function(s){ if(sc[s.id]&&sc[s.id].score!=null) graded++; }); });
  html+='<div class="stats">'
    +card('채점 완료',graded+'/'+totalCells, '평가 '+opened.length+'개 · 학생 '+mine.length+'명', graded>=totalCells&&totalCells?'var(--ok)':'var(--warn)')
    +card('미채점',Math.max(0,totalCells-graded)+'건','입력이 필요합니다', (totalCells-graded)?'var(--bad)':'var(--dim)')
    +'</div>';
  if(!opened.length){ html+='<div class="panel"><div class="muted">채점할 공개 평가가 없습니다. [평가 관리]에서 평가를 등록하세요.</div></div>'; page(html);
    if($('#egCo')) $('#egCo').onchange=function(){ EG_CO=$('#egCo').value; examGrading(); };
    if($('#egRelease')) $('#egRelease').onclick=function(){ toast('채점할 평가가 없습니다'); };
    if($('#egAuto')) $('#egAuto').onclick=function(){ toast('채점할 평가가 없습니다'); };
    return; }
  html+='<div class="bar"><label class="inline-date">평가 <select id="egSel">'
    + opened.map(function(a){ return '<option value="'+a.id+'">['+assessTypeName(a.type)+'] '+esc(a.title)+(a.dueDate?(' · 마감 '+a.dueDate):'')+'</option>'; }).join('')
    + '</select></label><div class="bar-actions"><button class="btn" id="egSave">전체 저장</button></div></div><div id="egPane"></div>';
  page(html);
  if(!EG_CUR || !opened.some(function(x){ return x.id===EG_CUR; })) EG_CUR = opened[0].id;
  var cur=EG_CUR;
  /* 화면이 그려진 뒤에 버튼을 연결한다 — 이전에는 그리기 전에 연결해 클릭이 동작하지 않았다 */
  if($('#egCo')) $('#egCo').onchange=function(){ EG_CO=$('#egCo').value; examGrading(); };
  if($('#egRelease')) $('#egRelease').onclick=function(){
    var A=(acf(DB.assessments)||[]).find(function(x){ return x.id===cur; });
    if(!A){ toast('평가를 먼저 선택해 주세요'); return; }
    var on = !A.reviewOpen;
    if(on && !confirm('『'+A.title+'』의 채점 결과와 풀이를 학생에게 공개할까요?')) return;
    if(!on && !confirm('공개를 취소하면 학생이 다시 볼 수 없습니다. 진행할까요?')) return;
    A.reviewOpen = on; A.reviewOpenAt = on ? todayStr() : ''; A.reviewBy = CURRENT.name; A._u = Date.now();
    save(); toast(on ? '풀이를 공개했습니다 — 학생이 결과와 해설을 볼 수 있습니다' : '풀이 공개를 취소했습니다');
    drawPane(); };
  if($('#egAuto')) $('#egAuto').onclick=function(){ autoGradeAll(opened, mine); };
  function drawPane(){
    var a=(acf(DB.assessments)||[]).find(function(x){return x.id===cur;}); if(!a) return;
    var sc=examScores(a.id);
    var done=mine.filter(function(s){return sc[s.id]&&sc[s.id].score!=null;}).length;
    var vals=mine.map(function(s){return sc[s.id]&&sc[s.id].score!=null?+sc[s.id].score:null;}).filter(function(v){return v!=null;});
    var avg=vals.length?Math.round(vals.reduce(function(x,y){return x+y;},0)/vals.length):0;
    document.getElementById('egPane').innerHTML='<div class="panel"><h3>'+esc(a.title)+' <small class="muted">('+assessTypeName(a.type)+(a.setLabel?(' · '+esc(a.setLabel)):'')+(a.dueDate?(' · 마감 '+a.dueDate):'')+')</small></h3>'
      +'<div class="rel-bar '+(a.reviewOpen?'on':'')+'">'
        +'<b>'+(a.reviewOpen?'풀이 공개 중':'풀이 비공개')+'</b>'
        +'<span class="muted">'+(a.reviewOpen
            ? ('학생이 점수와 해설을 볼 수 있습니다'+(a.reviewOpenAt?(' · 공개일 '+esc(a.reviewOpenAt)):''))
            : '학생 화면에는 「제출 완료 · 선생님 채점 중」으로 표시됩니다')+'</span>'
        +'<button class="btn '+(a.reviewOpen?'ghost':'')+' rptmini" id="egRel2">'+(a.reviewOpen?'공개 취소':'풀이 공개하기')+'</button>'
      +'</div>'
      +'<div class="stats" style="grid-template-columns:repeat(3,1fr)"><div class="stat"><div class="stat-l">채점</div><div class="stat-v">'+done+'/'+mine.length+'</div><div class="stat-s">명</div></div>'
      +'<div class="stat"><div class="stat-l">평균</div><div class="stat-v">'+avg+'</div><div class="stat-s">점</div></div>'
      +'<div class="stat"><div class="stat-l">만점</div><div class="stat-v">'+(a.maxScore||100)+'</div><div class="stat-s">기준</div></div></div>'

      +(a.answerKey?'<div class="note-box" style="margin-top:10px">정답표 '+a.answerKey.split(/[\s,]+/).filter(Boolean).length+'문항 등록됨 — 학생 답안을 입력하면 [자동 채점]으로 일괄 처리됩니다. <button class="btn rptmini" id="egAutoOne">자동 채점 실행</button></div>':'')+'<div class="tbl-wrap" style="margin-top:10px"><table class="tbl"><thead><tr><th>학생</th><th>반</th>'+(a.answerKey?'<th>답안</th>':'')+'<th>점수</th><th>제출</th><th>메모</th><th>상태</th></tr></thead><tbody>'
      + mine.map(function(s){ var r=sc[s.id]||{};
          r = liveScore(r) || {};
          return '<tr><td><b>'+esc(s.name)+'</b></td><td>'+(s.cls?tierName(s.cls):'미배정')+'</td>'
            +(a.answerKey?('<td><input class="sc-ans" data-a="'+s.id+'" value="'+esc(r.answers||'')+'" placeholder="1 3 2 4"></td>'):'')+'<td><input class="sc-in" type="number" min="0" data-s="'+s.id+'" value="'+(r.score!=null?r.score:'')+'" placeholder="-"> / '+(a.maxScore||100)+'</td>'
            +'<td>'+(r.submitText||r.submitFileUrl||r.answers?('<button class="lnk" data-sv="'+s.id+'">제출 보기</button>'):'<span class="muted">미제출</span>')+'</td>'
            +'<td><input class="sc-memo" data-m="'+s.id+'" value="'+esc(r.memo||'')+'" placeholder="첨삭 메모"></td>'
            +'<td>'+(r.score!=null?'<span class="vstat vstat-ok">채점 완료</span>':'<span class="vstat vstat-ing">미채점</span>')
            +'<div class="sc-acts">'
              +(r.answers?('<button class="lnk" data-regrade="'+s.id+'">재채점</button>'):'')
              +((r.score!=null||r.answers||r.submittedAt)?('<button class="lnk del" data-reset="'+s.id+'">리셋</button>'):'')
            +'</div></td></tr>';
        }).join('')
      +'</tbody></table></div></div>';
    $$('#egPane .sc-in').forEach(function(inp){ inp.onchange=function(){ var sc2=examScores(cur); var id=inp.dataset.s;
      sc2[id]=sc2[id]||{}; sc2[id].score= inp.value===''?null:+inp.value; sc2[id].by=CURRENT.name; sc2[id].at=todayStr(); save(); drawPane(); }; });
    var rel2=document.getElementById('egRel2');
    if(rel2) rel2.onclick=function(){
      var A2=(acf(DB.assessments)||[]).find(function(x){ return x.id===cur; }); if(!A2) return;
      var on=!A2.reviewOpen;
      if(on && !confirm('『'+A2.title+'』의 채점 결과와 풀이를 학생에게 공개할까요?')) return;
      if(!on && !confirm('공개를 취소하면 학생이 다시 볼 수 없습니다. 진행할까요?')) return;
      A2.reviewOpen=on; A2.reviewOpenAt=on?todayStr():''; A2.reviewBy=CURRENT.name; save();
      toast(on?'풀이를 공개했습니다':'풀이 공개를 취소했습니다'); drawPane(); };
    $$('#egPane [data-regrade]').forEach(function(b){ b.onclick=function(){
      var sc2=examScores(cur);
      var A=(acf(DB.assessments)||[]).find(function(x){return x.id===cur;});
      var id=b.dataset.regrade, r=liveScore(sc2[id]) || {};
      if(!r.answers){ toast('제출된 답안이 없습니다'); return; }
      var g=OPS.autoGrade(A, r.answers);
      if(!g){ toast('정답표가 없어 자동채점할 수 없습니다'); return; }
      r.score=g.score; r.right=g.right; r.total=g.total; r.marks=g.marks;
      r.by='자동채점(재채점)'; r.at=todayStr(); sc2[id]=r; save();
      toast(g.right+'/'+g.total+' 정답 · '+g.score+'점으로 재채점했습니다'); drawPane(); }; });
    $$('#egPane [data-reset]').forEach(function(b){ b.onclick=function(){
      var sc2=examScores(cur);
      var id=b.dataset.reset;
      var st=acf(DB.students).find(function(x){return x.id===id;});
      if(!confirm((st?st.name:'해당 학생')+'의 응시 기록을 초기화할까요?\n점수·답안·제출 기록이 모두 지워지고 다시 응시할 수 있습니다.')) return;
      sc2[id] = { cleared:true, _u:Date.now(), by:CURRENT.name, at:todayStr() };
      save();
      toast('응시 기록을 초기화했습니다. 학생은 다시 응시할 수 있습니다.'); drawPane(); }; });
    $$('#egPane .sc-ans').forEach(function(inp){ inp.onchange=function(){ var sc2=examScores(cur); var id=inp.dataset.a; sc2[id]=sc2[id]||{}; sc2[id].answers=inp.value; save(); }; });
    var au=document.querySelector('#egPane #egAutoOne');
    if(au) au.onclick=function(){
      var A=(acf(DB.assessments)||[]).find(function(x){return x.id===cur;});
      if(!A){ toast('평가를 먼저 선택해 주세요'); return; }
      if(!A.answerKey){ toast('정답표가 없어 자동 채점할 수 없습니다 — [평가 관리]에서 정답표를 먼저 등록해 주세요'); return; }
      var sc2=examScores(cur), n=0, skipped=0;
      mine.forEach(function(s){
        var r=liveScore(sc2[s.id]);
        if(!r || !r.answers){ skipped++; return; }
        var g=OPS.autoGrade(A, r.answers);
        if(!g){ skipped++; return; }
        r.score=g.score; r.right=g.right; r.total=g.total; r.marks=g.marks;
        r.memo=(g.right+'/'+g.total+' 정답'); r.by='자동채점'; r.at=todayStr(); r._u=Date.now();
        sc2[s.id]=r; n++;
      });
      save();
      toast(n ? (n+'명 자동 채점 완료'+(skipped?(' · 답안 없음 '+skipped+'명 건너뜀'):'')) : '채점할 답안이 없습니다 — 학생 답안을 먼저 입력해 주세요');
      drawPane(); };
    $$('#egPane [data-sv]').forEach(function(b){ b.onclick=function(){ var A=(acf(DB.assessments)||[]).find(function(x){return x.id===cur;}); var st=acf(DB.students).find(function(x){return x.id===b.dataset.sv;}); var rr=(examScores(cur)[b.dataset.sv]||{});
      openModal(el('<div class="form"><h3>'+esc(st?st.name:'')+' 제출 내용</h3>'
        +'<div class="vp-meta">'+esc(A?A.title:'')+' · 제출 '+(rr.submittedAt||'-')+'</div>'
        +(rr.answers?'<div class="note-box">답안: '+esc(rr.answers)+'</div>':'')
        +(rr.submitText?'<div class="note-box" style="white-space:pre-wrap">'+esc(rr.submitText)+'</div>':'')
        +(rr.submitFileUrl?'<a class="btn ghost rptmini" href="'+esc(rr.submitFileUrl)+'" target="_blank" rel="noopener">첨부파일 열기</a>':'')
        +'<div class="modal-actions"><button class="btn" id="sv_x">닫기</button></div></div>'));
      document.getElementById('sv_x').onclick=closeModal; }; });
    $$('#egPane .sc-memo').forEach(function(inp){ inp.onchange=function(){ var sc2=examScores(cur); var id=inp.dataset.m;
      sc2[id]=sc2[id]||{}; sc2[id].memo=inp.value; save(); }; });
  }
  drawPane();
  document.getElementById('egSel').value = cur;
  document.getElementById('egSel').onchange=function(){ cur=EG_CUR=this.value; drawPane(); };
  document.getElementById('egSave').onclick=function(){ save(); toast('채점 내용이 저장되었습니다'); };
}

/* ===================== 학생별 분석 ===================== */
function studentAnalytics(){
  const role=CURRENT.role;
  const mine = role==='instructor'? acf(DB.students).filter(function(s){return s.instructorId===CURRENT.id;}) : acf(DB.students).filter(function(s){return !s.testOnly;});
  let html=head('학생별 분석','학생 한 명의 진행 상황을 자세히 봅니다');
  if(!mine.length){ html+='<div class="panel"><div class="muted">학생이 없습니다.</div></div>'; page(html); return; }
  html+='<div class="bar"><label class="inline-date">학생 <select id="saSel">'+mine.map(function(s){return '<option value="'+s.id+'">'+esc(s.name)+' ('+(s.cls?tierName(s.cls):'미배정')+')</option>';}).join('')+'</select></label>'
    +'<div class="bar-actions"><button class="btn ghost" id="saFixAll">회독 일괄 보정</button>'
    +'<button class="btn" id="saRpt">리포트 다운로드</button></div></div><div id="saPane"></div>';
  page(html);
  if(!SA_CUR || !mine.some(function(x){ return x.id===SA_CUR; })) SA_CUR = mine[0].id;
  var cur=SA_CUR;
  function draw(){
    var s=acf(DB.students).find(function(x){return x.id===cur;}); if(!s) return;
    var sm=(typeof VOD!=='undefined')?VOD.summary(s.id):{total:0,twice:0,done:0,rate:0};
    var lecs=(typeof VOD!=='undefined')?VOD.list(s):[];
    var scoreRows=(acf(DB.assessments)||[]).map(function(a){ var r=((DB.scores||{})[a.id]||{})[s.id]; return r&&r.score!=null?{a:a,r:r}:null; }).filter(Boolean);
    var avg=scoreRows.length?Math.round(scoreRows.reduce(function(x,y){return x+(+y.r.score);},0)/scoreRows.length):0;
    var da=AI.detailAnalysis(s.id); var att=attitude(s.id);
    var sess=DB.sessions.filter(function(x){return x.studentId===s.id;});
    var overall=sess.length?Math.round(sess.reduce(function(a,b){return a+b.rate;},0)/sess.length):0;
    document.getElementById('saPane').innerHTML=
      '<div class="stats">'+card('강의 이수율',pct(sm.rate),sm.done+'/'+sm.total+' 인정',sm.rate>=80?'#059669':'#d97706')
      +card('2회독 완료',sm.twice+'/'+sm.total,'공개 강의')
      +card('평가 평균',avg+'점',scoreRows.length+'개 응시','#7c3aed')
      +card('테스트 정답률',pct(overall),sess.length+'회','#4f46e5')
      +card('태도(출결)',att.score==null?'-':pct(att.score),att.label,'#059669')+'</div>'
      +'<div class="grid2"><div class="panel"><h3>강의 회독 현황</h3>'
      +(lecs.length?'<div class="tbl-wrap"><table class="tbl"><thead><tr><th>강의</th><th>공개일</th><th>회독</th><th>상태</th><th></th></tr></thead><tbody>'
        +lecs.map(function(l){ var r=VOD.rec(s.id,l.id); var st=VOD.status(s.id,l);
          return '<tr><td>'+(l.day?('Day '+l.day+' · '):'')+esc(l.title)+'</td><td>'+(l.openDate||'-')+'</td><td><b>'+r.count+'/'+VOD.REQ+'</b></td>'
            +'<td><span class="vstat vstat-'+st.k+'">'+st.t+'</span></td>'
            +'<td><button class="lnk" data-vfix="'+esc(l.id)+'">보정</button></td></tr>';
        }).join('')+'</tbody></table></div>':'<div class="muted">배정된 강의가 없습니다.</div>')
      +'</div><div class="panel"><h3>평가 점수</h3>'
      +(scoreRows.length?'<div class="tbl-wrap"><table class="tbl"><thead><tr><th>유형</th><th>평가</th><th>점수</th><th>메모</th></tr></thead><tbody>'
        +scoreRows.map(function(x){ return '<tr><td><span class="as-chip as-'+x.a.type+'">'+assessTypeName(x.a.type)+'</span></td><td>'+esc(x.a.title)+'</td><td><b>'+x.r.score+'</b>/'+(x.a.maxScore||100)+'</td><td class="muted">'+esc(x.r.memo||'-')+'</td></tr>'; }).join('')
        +'</tbody></table></div>':'<div class="muted">채점된 평가가 없습니다.</div>')
      +'</div></div>'
      +'<div class="panel"><h3>영역별 세부 성취</h3>'+Object.keys(SECTIONS).map(function(k){ var d=da[k];
          return '<div class="srow"><span>'+SECTIONS[k]+'</span><div class="mini"><div style="width:'+(d?d.rate:0)+'%;background:'+((d&&d.rate>=80)?'#059669':(d&&d.rate>=60)?'#d97706':'#ef4444')+'"></div></div><b>'+pct(d?d.rate:0)+'</b></div>';
        }).join('')+'</div>';
  }
  function bindFix(){
    $$('#saPane [data-vfix]').forEach(function(b){ b.onclick=function(){ vodFixForm(cur, b.dataset.vfix, draw); }; });
    var all=document.getElementById('saFixAll');
    if(all) all.onclick=function(){ vodFixBulk(cur, draw); };
  }
  var _draw = draw;
  draw = function(){ _draw(); bindFix(); };
  draw();
  document.getElementById('saSel').value = cur;
  document.getElementById('saSel').onchange=function(){ cur=SA_CUR=this.value; draw(); };
  document.getElementById('saRpt').onclick=function(){ downloadReport(cur); };
}

/* ---------- 회독 보정 ----------
   시스템 문제로 회독이 덜 인정된 경우 관리자가 바로잡습니다.
   누가 언제 왜 고쳤는지 기록에 남깁니다. */
function vodFixForm(sid, lid, onDone){
  var stu=(acf(DB.students)||[]).filter(function(x){return x.id===sid;})[0];
  if(!stu){ toast('학생을 찾을 수 없습니다'); return; }
  /* 배정된 강의를 써야 공개일·수강기한이 실제 화면과 같습니다 */
  var lec=(typeof VOD!=='undefined') ? (VOD.list(stu)||[]).filter(function(l){ return l.id===lid; })[0] : null;
  if(!lec && typeof VOD!=='undefined') lec=VOD.lecture(lid);
  if(!lec){ toast('강의 정보를 찾을 수 없습니다'); return; }
  var r=VOD.rec(sid, lid);
  var dl=VOD.deadline(lec);
  openModal(el('<div class="form"><h3>회독 보정</h3>'
    + '<div class="note-b info"><div class="nb-t"><b>'+esc(stu.name)+' · '+esc(lec.title)+'</b>'
      + '공개일 '+(lec.openDate||'-')+' · 수강기한 '+dl+' · 현재 '+r.count+'/'+VOD.REQ+'회독</div></div>'
    + '<div class="frow"><label>회독 수<select id="vf_c">'
      + [0,1,2,3,4,5].map(function(n){ return '<option value="'+n+'"'+(n===(r.count||0)?' selected':'')+'>'+n+'회독</option>'; }).join('')
      + '</select></label>'
    + '<label>인정일 <small class="muted">(기한 안이면 「학습 인정」)</small>'
      + '<input type="date" id="vf_d" value="'+esc(r.certifiedAt || dl)+'"></label></div>'
    + '<label>사유<input id="vf_m" value="'+esc(r.fixMemo||'')+'" placeholder="예: 시스템 오류로 회독이 덜 반영됨"></label>'
    + '<div class="note-b warn"><div class="nb-t"><b>기한 내 인정으로 처리하려면</b>'
      + '인정일을 '+dl+' 이전으로 두세요. 그 이후 날짜면 「지연 완료」로 표시됩니다.</div></div>'
    + '<div class="modal-actions"><button class="btn ghost" id="vf_x">취소</button>'
      + '<button class="btn" id="vf_ok">저장</button></div></div>'));
  document.getElementById('vf_x').onclick=closeModal;
  document.getElementById('vf_ok').onclick=function(){
    var c=+document.getElementById('vf_c').value||0;
    var d=document.getElementById('vf_d').value||dl;
    var rec=VOD.rec(sid, lid);
    rec.count=c;
    rec.prog = c>0 ? 100 : (rec.prog||0);
    rec.certifiedAt = (c>=VOD.REQ) ? d : null;
    rec.fixedBy = (CURRENT&&CURRENT.name)||'관리자';
    rec.fixedAt = todayStr();
    rec.fixMemo = document.getElementById('vf_m').value||'';
    save();
    toast(stu.name+' · '+lec.title+' → '+c+'회독으로 보정했습니다');
    closeModal(); if(onDone) onDone();
  };
}
/* 여러 강의를 한 번에 보정 */
function vodFixBulk(sid, onDone){
  var stu=(acf(DB.students)||[]).filter(function(x){return x.id===sid;})[0];
  if(!stu){ toast('학생을 찾을 수 없습니다'); return; }
  var lecs=(typeof VOD!=='undefined')?VOD.list(stu):[];
  var open=lecs.filter(function(l){ return !VOD.notOpen(l); });
  if(!open.length){ toast('공개된 강의가 없습니다'); return; }
  openModal(el('<div class="form rtwrap"><h3>회독 일괄 보정 · '+esc(stu.name)+'</h3>'
    + '<p class="muted" style="margin:2px 0 10px">체크한 강의를 지정한 회독 수로 맞춥니다. 인정일은 각 강의의 수강기한으로 넣어 「학습 인정」이 되게 합니다.</p>'
    + '<div class="bar-actions" style="margin-bottom:10px">'
      + '<label class="inline-date">회독 수 <select id="vb_c">'
        + [1,2,3].map(function(n){ return '<option value="'+n+'"'+(n===VOD.REQ?' selected':'')+'>'+n+'회독</option>'; }).join('')
      + '</select></label>'
      + '<button class="btn ghost rptmini" id="vb_all">전체 선택</button>'
      + '<button class="btn ghost rptmini" id="vb_lack">'+VOD.REQ+'회독 미달만 선택</button>'
      + '<button class="btn ghost rptmini" id="vb_none">선택 해제</button></div>'
    + '<label>사유<input id="vb_m" placeholder="예: 시스템 오류로 회독이 덜 반영됨 (2026-08 이전 수강분)"></label>'
    + '<div class="tbl-wrap" style="max-height:44vh;overflow:auto;margin-top:10px"><table class="tbl"><thead><tr>'
      + '<th style="width:36px"></th><th>강의</th><th>공개일</th><th>수강기한</th><th>현재</th><th>상태</th></tr></thead><tbody>'
      + open.map(function(l){ var r=VOD.rec(sid,l.id), st=VOD.status(sid,l);
          return '<tr><td><input type="checkbox" class="vb-ck" data-l="'+esc(l.id)+'"></td>'
            + '<td>'+(l.day?('Day '+l.day+' · '):'')+esc(l.title)+'</td><td>'+(l.openDate||'-')+'</td>'
            + '<td>'+VOD.deadline(l)+'</td><td><b>'+r.count+'/'+VOD.REQ+'</b></td>'
            + '<td><span class="vstat vstat-'+st.k+'">'+st.t+'</span></td></tr>'; }).join('')
      + '</tbody></table></div>'
    + '<div class="modal-actions"><button class="btn ghost" id="vb_x">취소</button>'
      + '<button class="btn" id="vb_ok">선택한 강의 보정</button></div></div>'));
  document.getElementById('vb_x').onclick=closeModal;
  document.getElementById('vb_all').onclick=function(){ $$('#modal .vb-ck').forEach(function(c){ c.checked=true; }); };
  document.getElementById('vb_none').onclick=function(){ $$('#modal .vb-ck').forEach(function(c){ c.checked=false; }); };
  document.getElementById('vb_lack').onclick=function(){
    $$('#modal .vb-ck').forEach(function(c){ c.checked = (VOD.rec(sid,c.dataset.l).count||0) < VOD.REQ; }); };
  document.getElementById('vb_ok').onclick=function(){
    var want=+document.getElementById('vb_c').value||VOD.REQ;
    var memo=document.getElementById('vb_m').value||'';
    var ids=$$('#modal .vb-ck').filter(function(c){ return c.checked; }).map(function(c){ return c.dataset.l; });
    if(!ids.length){ toast('보정할 강의를 선택하세요'); return; }
    var byId={}; open.forEach(function(l){ byId[l.id]=l; });
    var n=0;
    ids.forEach(function(lid){
      var l=byId[lid] || VOD.lecture(lid); if(!l) return;
      var rec=VOD.rec(sid,lid);
      rec.count=want; rec.prog=100;
      rec.certifiedAt = (want>=VOD.REQ) ? VOD.deadline(l) : null;
      rec.fixedBy=(CURRENT&&CURRENT.name)||'관리자'; rec.fixedAt=todayStr(); rec.fixMemo=memo;
      n++;
    });
    save(); toast(n+'개 강의를 '+want+'회독으로 보정했습니다');
    closeModal(); if(onDone) onDone();
  };
}
