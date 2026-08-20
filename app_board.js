/* ===================== 이룸편입 LMS · 이룸편입 공지 & 교안 자료실 ===================== */
var MAT_CATS = [['textbook','교재'],['handout','수업 교안'],['vocab','어휘'],['grammar','문법'],
                ['reading','독해'],['logic','논리'],['exam','기출·모의고사'],['guide','학습 안내'],['etc','기타']];
function matCatName(k){ var f=MAT_CATS.find(function(x){return x[0]===k;}); return f?f[1]:'기타'; }
function fmtSize(n){ n=+n||0; return n>=1048576 ? (n/1048576).toFixed(1)+'MB' : Math.max(1,Math.round(n/1024))+'KB'; }
function notices(){ DB.notices = DB.notices || []; return DB.notices; }
function materials(){ DB.materials = DB.materials || []; return DB.materials; }
/* 문장 단위로 자연스럽게 줄여 보여주기 (말줄임표 대신 문장 끝에서 끊음) */
function shortText(t, n){
  t = String(t||'').replace(/\s+/g,' ').trim();
  if(t.length <= n) return t;
  var cut = t.slice(0, n);
  var p = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('。'), cut.lastIndexOf('다.'), cut.lastIndexOf('요.'), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if(p > n*0.5) return cut.slice(0, p+1);
  var sp = cut.lastIndexOf(' ');
  return (sp > n*0.6 ? cut.slice(0, sp) : cut) + ' ...';
}
/* 공지 본문 서식 — 소제목·질문은 굵게, 목록은 들여쓰기, 문단 간격 적용 */
function noticeBodyHtml(body){
  var src = String(body||'');
  /* 줄바꿈이 유실된 본문도 정상 표시되도록 소제목·질문 앞에서 자동 줄바꿈 */
  src = src.replace(/\s*(\[\d+\]\s)/g, '\n$1')
           .replace(/\s*(【[^】]{1,20}】)/g, '\n$1')
           .replace(/\s+(Q\s?\d{1,2}\.)/g, '\n$1')
           .replace(/\s+(A\.)\s/g, '\n$1 ')
           .replace(/\s+(※)/g, '\n$1')
           .replace(/\s+([·•]\s)/g, '\n$1')
           .replace(/\n{3,}/g, '\n\n');
  var lines = src.split(/\n/);
  var out = [], inList = false;
  function closeList(){ if(inList){ out.push('</ul>'); inList=false; } }
  lines.forEach(function(raw){
    var t = String(raw||'').replace(/\s+$/,'');
    if(!t.trim()){ closeList(); out.push('<div class="nb-gap"></div>'); return; }
    /* [1] 제목 / 【제목】 */
    var m1 = /^\s*(?:\[(\d+)\]|【([^】]+)】)\s*(.*)$/.exec(t);
    if(m1){
      closeList();
      var pre = m1[1] ? ('[' + m1[1] + '] ') : ('【' + m1[2] + '】 ');
      var rest = (m1[3]||'').trim();
      var title = rest, tail = '';
      /* 제목이 길면 첫 문장까지만 제목으로 쓰고 나머지는 본문으로 */
      if(rest.length > 22){
        var cut = rest.search(/(?:[.!?]|다\.|요\.)\s/);
        if(cut > 0 && cut < rest.length - 2){ title = rest.slice(0, cut+1).trim(); tail = rest.slice(cut+1).trim(); }
        else {
          var sp = rest.indexOf(' ');
          if(sp > 0){
            var t2 = rest.slice(0, sp);
            if(t2.length < 4){ var sp2 = rest.indexOf(' ', sp + 1); if(sp2 > 0){ t2 = rest.slice(0, sp2); sp = sp2; } }
            title = t2.trim(); tail = rest.slice(sp).trim();
          }
        }
      }
      out.push('<h4 class="nb-h">' + esc(pre + title) + '</h4>');
      if(tail) out.push('<p class="nb-p">' + esc(tail) + '</p>');
      return;
    }
    /* Q1. 질문 */
    var m2 = /^\s*(Q\s*\d*[.)]?)\s*(.+)$/i.exec(t);
    if(m2){ closeList(); out.push('<div class="nb-q"><b>' + esc(m2[1].replace(/\s+/g,'')) + '</b> ' + esc(m2[2]) + '</div>'); return; }
    /* A. 답변 */
    var m3 = /^\s*(A\s*\d*[.)])\s*(.+)$/i.exec(t);
    if(m3){ closeList(); out.push('<div class="nb-a">' + esc(m3[2]) + '</div>'); return; }
    /* · 목록 / - 목록 */
    var m4 = /^\s*[·•\-–]\s*(.+)$/.exec(t);
    if(m4){ if(!inList){ out.push('<ul class="nb-ul">'); inList=true; } out.push('<li>' + esc(m4[1]) + '</li>'); return; }
    /* ※ 안내 */
    if(/^\s*※/.test(t)){ closeList(); out.push('<div class="nb-note">' + esc(t) + '</div>'); return; }
    /* 짧은 줄이 콜론으로 끝나면 소제목 */
    if(t.length <= 24 && /[:：]$/.test(t.trim())){ closeList(); out.push('<h4 class="nb-h">' + esc(t.replace(/[:：]$/,'')) + '</h4>'); return; }
    closeList();
    out.push('<p class="nb-p">' + esc(t) + '</p>');
  });
  closeList();
  return out.join('');
}
function isImgFile(f){ return /\.(png|jpe?g|gif|webp|svg)$/i.test((f&&f.name)||'') || /^data:image\//.test((f&&f.url)||''); }
function canManageBoard(){ return CURRENT.role==='admin' || CURRENT.role==='instructor'; }

/* 학생에게 보이는 자료인지 (반/기수 대상 필터) */
function matVisible(x, stu){
  if(!x) return false;
  /* 기수 제한 */
  if(x.cohortId && x.cohortId!=='all'){
    if(!stu || stu.cohortId !== x.cohortId) return false;
  }
  /* 반 제한 */
  if(x.target && x.target!=='전체'){
    if(!stu || !stu.cls || stu.cls !== x.target) return false;
  }
  return true;
}
function matCohortName(id){
  if(!id || id==='all') return '전체 기수';
  var c=(typeof VOD!=='undefined')?VOD.cohort(id):null; return c?c.name:'기수';
}

/* ---------- 공지 · 교안 (통합 화면) ---------- */
var BOARD_TAB = 'notice';
function boardView(){
  var manage = canManageBoard();
  var stu = (CURRENT.role==='student') ? myStu() : null;
  var html = head('이룸편입 공지 · 교안', manage
    ? '공지사항을 등록하고 수업 교안·교재 파일을 학생에게 배포합니다'
    : '이룸편입 공지사항을 확인하고 수업 교안을 내려받을 수 있습니다');
  html += '<div class="tabs board-tabs">'
    + '<button class="tab' + (BOARD_TAB==='notice'?' on':'') + '" data-bt="notice">이룸편입 공지</button>'
    + '<button class="tab' + (BOARD_TAB==='mat'?' on':'') + '" data-bt="mat">교안 · 자료실</button></div>';
  html += '<div id="boardBody"></div>';
  page(html);
  $$('#page [data-bt]').forEach(function(t){ t.onclick=function(){ BOARD_TAB=t.dataset.bt; boardView(); }; });
  if(BOARD_TAB==='notice') drawNotices(manage, stu); else drawMaterials(manage, stu);
}

function drawNotices(manage, stu){
  var list = notices().slice().sort(function(a,b){
    if(!!b.pinned !== !!a.pinned) return b.pinned?1:-1;
    return (b.date||'').localeCompare(a.date||'');
  });
  var h = '';
  if(manage) h += '<div class="bar"><div class="muted">총 ' + list.length + '건</div><div class="bar-actions"><button class="btn" id="ntAdd">+ 공지 등록</button></div></div>';
  h += list.length ? list.map(function(n){
      return '<div class="nt-item' + (n.pinned?' pin':'') + '" data-nt="' + n.id + '">'
        + '<div class="nt-h">' + (n.pinned?'<span class="pill" style="--c:#ef4444">중요</span> ':'')
        + '<b>' + esc(n.title) + '</b><span class="nt-date">' + esc(n.date||'') + '</span></div>'
        + '<p class="nt-body">' + esc(shortText(n.body||'', 110)) + '</p>'
        + (((n.files||[]).length || (n.images||[]).length) ? '<div class="nt-files">' + ((n.images||[]).length ? ('화면 안내 그림 ' + n.images.length + '장') : ('첨부 ' + n.files.length + '건')) + '</div>' : '')
        + '</div>'; }).join('')
    : '<div class="panel"><div class="muted">등록된 공지가 없습니다.</div></div>';
  $('#boardBody').innerHTML = h;
  if($('#ntAdd')) $('#ntAdd').onclick=function(){ noticeForm(null, boardView); };
  $$('#boardBody [data-nt]').forEach(function(c){ c.onclick=function(){ noticeDetail(c.dataset.nt); }; });
}

function noticeDetail(id){
  var n = notices().find(function(x){return x.id===id;}); if(!n) return;
  var manage = canManageBoard();
  var h = '<div class="form"><h3>' + esc(n.title) + '</h3>'
    + '<div class="muted" style="margin-bottom:12px">' + esc(n.date||'') + (n.by?(' · ' + esc(n.by)):'') + '</div>'
    + '<div class="nt-full">' + noticeBodyHtml(n.body||'') + '</div>'
    + ((n.images||[]).length ? '<div class="nt-imgs">' + n.images.map(function(im){
        return '<figure class="nt-fig"><img src="' + esc(im.url) + '" alt="' + esc(im.cap||'') + '" loading="lazy">'
             + (im.cap ? '<figcaption>' + esc(im.cap) + '</figcaption>' : '') + '</figure>'; }).join('') + '</div>' : '')
    + ((n.files||[]).filter(isImgFile).length ? '<div class="nt-imgs">' + n.files.filter(isImgFile).map(function(f){
        return '<figure class="nt-fig"><img src="' + esc(f.url) + '" alt="' + esc(f.name) + '" loading="lazy"><figcaption>' + esc(f.name) + '</figcaption></figure>'; }).join('') + '</div>' : '')
    + ((n.files||[]).filter(function(f){return !isImgFile(f);}).length ? '<div class="mat-files">' + n.files.filter(function(f){return !isImgFile(f);}).map(function(f){
        return '<a class="mat-file" href="' + esc(f.url) + '" download target="_blank" rel="noopener"><b>' + esc(f.name) + '</b><span>' + fmtSize(f.size) + ' · 내려받기</span></a>'; }).join('') + '</div>' : '')
    + '<div class="modal-actions">'
    + (manage ? '<button class="btn ghost del" id="nt_del">삭제</button><button class="btn ghost" id="nt_ed">수정</button>' : '')
    + '<button class="btn" id="nt_x">닫기</button></div></div>';
  openModal(el(h));
  document.getElementById('nt_x').onclick = closeModal;
  if(document.getElementById('nt_ed')) document.getElementById('nt_ed').onclick=function(){ closeModal(); noticeForm(n, boardView); };
  if(document.getElementById('nt_del')) document.getElementById('nt_del').onclick=function(){
    if(!confirm('이 공지를 삭제할까요?')) return;
    DB.notices = notices().filter(function(x){return x.id!==n.id;});
    (DB._deletedIds = DB._deletedIds||[]).push(n.id); save(); closeModal(); toast('삭제했습니다'); boardView(); };
}

/* 공지 등록/수정 */
function noticeForm(n, onDone){
  n = n || {};
  var files = (n.files||[]).slice();
  function fileHtml(){
    return files.length ? files.map(function(f,i){
      return '<div class="up-item"><b>' + esc(f.name) + '</b><span class="muted">' + fmtSize(f.size) + '</span><button class="lnk del" type="button" data-rmf="' + i + '">삭제</button></div>'; }).join('')
      : '<div class="muted" style="font-size:12px">첨부된 파일이 없습니다.</div>';
  }
  openModal(el('<div class="form"><h3>' + (n.id?'공지 수정':'공지 등록') + '</h3>'
    + '<label>제목 *<input id="nt_t" value="' + esc(n.title||'') + '" placeholder="예: 8월 정기 모의고사 안내"></label>'
    + '<div class="frow"><label>게시일<input type="date" id="nt_d" value="' + esc(n.date||todayStr()) + '"></label>'
    + '<label class="lt-sw" style="margin-top:24px"><input type="checkbox" id="nt_p" ' + (n.pinned?'checked':'') + '> 상단 고정(중요)</label></div>'
    + '<label class="lt-sw"><input type="checkbox" id="nt_c" ' + (n.showOnCal?'checked':'') + '> 학습 달력에도 표시</label>'
    + '<label>내용 *<textarea id="nt_b" rows="7" placeholder="공지 내용을 입력하세요">' + esc(n.body||'') + '</textarea></label>'
    + '<label>첨부 파일 <small class="muted">(PDF · 한글 · Word · 이미지 등)</small></label>'
    + '<div class="upl-row"><input type="file" id="nt_f"><button class="btn ghost rptmini" type="button" id="nt_up">파일 추가</button></div>'
    + '<div class="muted" id="nt_us" style="font-size:11.5px"></div>'
    + '<div class="up-list" id="nt_list">' + fileHtml() + '</div>'
    + '<div class="modal-actions"><button class="btn ghost" id="nt_cc">취소</button><button class="btn" id="nt_ok">저장</button></div></div>'));
  function redraw(){ document.getElementById('nt_list').innerHTML = fileHtml();
    $$('[data-rmf]').forEach(function(b){ b.onclick=function(){ files.splice(+b.dataset.rmf,1); redraw(); }; }); }
  redraw();
  document.getElementById('nt_cc').onclick = closeModal;
  document.getElementById('nt_up').onclick = function(){
    var inp = document.getElementById('nt_f'), f = (inp.files||[])[0];
    if(!f){ document.getElementById('nt_us').textContent='파일을 먼저 선택해 주세요'; return; }
    uploadPick('nt_f','nt_us', function(url,name){ files.push({url:url, name:name, size:f.size}); inp.value=''; redraw(); });
  };
  document.getElementById('nt_ok').onclick = function(){
    var t = document.getElementById('nt_t').value.trim(), b = document.getElementById('nt_b').value.trim();
    if(!t || !b){ alert('제목과 내용을 입력해 주세요'); return; }
    var data = { title:t, body:b, date:document.getElementById('nt_d').value,
      pinned:document.getElementById('nt_p').checked, showOnCal:document.getElementById('nt_c').checked,
      files:files, by:CURRENT.name };
    if(n.id) Object.assign(notices().find(function(x){return x.id===n.id;})||{}, data);
    else notices().push(Object.assign({id:uid('nt'), createdAt:todayStr()}, data));
    save(); closeModal(); toast('공지를 저장했습니다'); if(onDone) onDone();
  };
}

/* ---------- 교안 자료실 ---------- */
var MAT_FILT = 'all', MAT_CO = 'all';
function drawMaterials(manage, stu){
  var all = materials().slice().sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });
  var list = manage ? all : all.filter(function(x){ return matVisible(x, stu); });
  var shown = list.filter(function(x){ return MAT_FILT==='all' || x.category===MAT_FILT; });
  if(manage && MAT_CO!=='all') shown = shown.filter(function(x){ return (x.cohortId||'all') === MAT_CO; });
  var cos = (typeof VOD!=='undefined') ? VOD.cohorts() : [];
  var h = '';
  if(manage && cos.length){
    h += '<div class="bar"><div class="muted">기수별 자료 관리</div><div class="bar-actions">'
      + '<select id="matCo" class="cal-co"><option value="all"' + (MAT_CO==='all'?' selected':'') + '>전체 기수</option>'
      + cos.map(function(c){ return '<option value="' + c.id + '"' + (MAT_CO===c.id?' selected':'') + '>' + esc(c.name) + '</option>'; }).join('')
      + '</select></div></div>';
  }
  h += '<div class="bar"><div class="filters" id="matFilt">'
    + '<button class="chip' + (MAT_FILT==='all'?' on':'') + '" data-mf="all">전체</button>'
    + MAT_CATS.map(function(c){ return '<button class="chip mcf-' + c[0] + (MAT_FILT===c[0]?' on':'') + '" data-mf="' + c[0] + '">' + c[1] + '</button>'; }).join('')
    + '</div>' + (manage ? '<div class="bar-actions"><button class="btn" id="matAdd">+ 교안 업로드</button></div>' : '') + '</div>';
  h += shown.length ? '<div class="mat-grid">' + shown.map(function(m){
      return '<div class="mat-card">'
        + '<div class="mat-top"><span class="as-chip mc-' + esc(m.category||'etc') + '">' + matCatName(m.category) + '</span>'
        + '<span class="pill" style="--c:#7c3aed">' + esc(matCohortName(m.cohortId)) + '</span>'
        + (m.target && m.target!=='전체' ? '<span class="pill" style="--c:#0891b2">' + esc(TIERS[m.target]?tierName(m.target):m.target) + '</span>' : '')
        + '<span class="mat-date">' + esc(m.date||'') + '</span></div>'
        + '<div class="mat-title">' + esc(m.title) + '</div>'
        + (m.desc ? '<p class="muted mat-desc">' + esc(m.desc) + '</p>' : '')
        + '<div class="mat-meta">' + esc(m.fileName||'파일') + ' · ' + fmtSize(m.size) + (m.downloads?(' · ' + m.downloads + '회 내려받음'):'') + '</div>'
        + '<div class="mat-act"><a class="btn" href="' + esc(m.fileUrl) + '" download target="_blank" rel="noopener" data-dl="' + m.id + '">내려받기</a>'
        + (manage ? '<button class="lnk" data-me="' + m.id + '">수정</button><button class="lnk del" data-md="' + m.id + '">삭제</button>' : '')
        + '</div></div>'; }).join('') + '</div>'
    : '<div class="panel"><div class="muted">등록된 자료가 없습니다.</div></div>';
  $('#boardBody').innerHTML = h;
  $$('#matFilt [data-mf]').forEach(function(c){ c.onclick=function(){ MAT_FILT=c.dataset.mf; drawMaterials(manage, stu); }; });
  if($('#matCo')) $('#matCo').onchange=function(){ MAT_CO=$('#matCo').value; drawMaterials(manage, stu); };
  if($('#matAdd')) $('#matAdd').onclick=function(){ materialForm(null, boardView); };
  $$('#boardBody [data-dl]').forEach(function(a){ a.onclick=function(){
    var m = materials().find(function(x){return x.id===a.dataset.dl;}); if(m){ m.downloads=(m.downloads||0)+1; save(); } }; });
  $$('#boardBody [data-me]').forEach(function(b){ b.onclick=function(){ materialForm(materials().find(function(x){return x.id===b.dataset.me;}), boardView); }; });
  $$('#boardBody [data-md]').forEach(function(b){ b.onclick=function(){
    if(!confirm('이 자료를 삭제할까요?')) return;
    DB.materials = materials().filter(function(x){return x.id!==b.dataset.md;});
    (DB._deletedIds = DB._deletedIds||[]).push(b.dataset.md); save(); toast('삭제했습니다'); boardView(); }; });
}

/* 교안 업로드/수정 */
function materialForm(m, onDone){
  m = m || {};
  var fileUrl = m.fileUrl||'', fileName = m.fileName||'', fileSize = m.size||0;
  var cohorts = (typeof VOD!=='undefined') ? VOD.cohorts() : [];
  openModal(el('<div class="form"><h3>' + (m.id?'교안 수정':'교안 업로드') + '</h3>'
    + '<div class="frow"><label>분류<select id="mt_c">' + MAT_CATS.map(function(c){
        return '<option value="' + c[0] + '"' + (m.category===c[0]?' selected':'') + '>' + c[1] + '</option>'; }).join('') + '</select></label>'
    + '<label>공개 기수<select id="mt_co"><option value="all">전체 기수</option>'
      + cohorts.map(function(c){ return '<option value="' + c.id + '"' + (m.cohortId===c.id?' selected':'') + '>' + esc(c.name) + '</option>'; }).join('')
      + '</select></label></div>'
    + '<label>공개 반<select id="mt_g"><option value="전체">전체 반</option>'
      + ['A','B','C'].map(function(x){ return '<option value="' + x + '"' + (m.target===x?' selected':'') + '>' + tierName(x) + '</option>'; }).join('')
      + '</select><small class="muted">기수와 반을 함께 지정하면 해당 기수의 그 반 학생에게만 보입니다.</small></label>'
    + '<label>제목 *<input id="mt_t" value="' + esc(m.title||'') + '" placeholder="예: 3주차 어휘 교안"></label>'
    + '<label>설명<textarea id="mt_d" rows="3" placeholder="사용 안내·범위 등">' + esc(m.desc||'') + '</textarea></label>'
    + '<label>게시일<input type="date" id="mt_dt" value="' + esc(m.date||todayStr()) + '"></label>'
    + '<label>파일 * <small class="muted">(PDF · 한글 · Word · PPT · 동영상 · ZIP 등 · 최대 100MB)</small></label>'
    + '<div class="upl-row"><input type="file" id="mt_f"><button class="btn rptmini" type="button" id="mt_up">서버에 업로드</button></div>'
    + '<div class="muted as-upst" id="mt_us">' + (fileName ? ('현재 파일: ' + esc(fileName) + ' (' + fmtSize(fileSize) + ')') : '파일을 선택한 뒤 [서버에 업로드]를 눌러 주세요.') + '</div>'
    + '<div class="modal-actions"><button class="btn ghost" id="mt_cc">취소</button><button class="btn" id="mt_ok">저장</button></div></div>'));
  document.getElementById('mt_cc').onclick = closeModal;
  document.getElementById('mt_up').onclick = function(){
    var f = ((document.getElementById('mt_f')||{}).files||[])[0];
    if(!f){ document.getElementById('mt_us').textContent='파일을 먼저 선택해 주세요'; return; }
    uploadPick('mt_f','mt_us', function(url,name,size){
      fileUrl=url; fileName=name; fileSize=size||f.size;
      var st=document.getElementById('mt_us');
      st.innerHTML='<b style="color:#059669">업로드 완료</b> · ' + esc(name) + ' (' + fmtSize(f.size) + ') — [저장]을 눌러야 학생에게 공개됩니다.';
      st.classList.add('ok');
    });
  };
  document.getElementById('mt_ok').onclick = function(){
    var t = document.getElementById('mt_t').value.trim();
    if(!t){ alert('제목을 입력해 주세요'); return; }
    if(!fileUrl){ alert('파일을 업로드해 주세요'); return; }
    var data = { category:document.getElementById('mt_c').value, target:document.getElementById('mt_g').value,
      cohortId:document.getElementById('mt_co').value,
      title:t, desc:document.getElementById('mt_d').value, date:document.getElementById('mt_dt').value,
      fileUrl:fileUrl, fileName:fileName, size:fileSize, by:CURRENT.name };
    if(m.id) Object.assign(materials().find(function(x){return x.id===m.id;})||{}, data);
    else materials().push(Object.assign({id:uid('mt'), downloads:0, createdAt:todayStr()}, data));
    save(); closeModal(); toast('자료를 저장했습니다'); if(onDone) onDone();
  };
}

/* ===================== 훼손 제목 구조 복원 (부분수열 매칭) =====================
   글자가 빠진 제목을 표준 후보와 대조해 원형을 되돌린다.
   'a'가 'b'의 부분수열이면(순서 유지, 글자 누락만) 같은 문자열로 간주. */
function isSubseq(a, b){
  if(!a || !b || a.length > b.length) return false;
  var i = 0;
  for(var j=0; j<b.length && i<a.length; j++){ if(a.charAt(i) === b.charAt(j)) i++; }
  return i === a.length;
}
/* 훼손 문자열 a에 가장 잘 맞는 후보 고르기 (누락 글자 수가 가장 적은 것) */
function bestMatch(a, cands, maxLoss){
  var flat = String(a||'').replace(/[\s_·\-]/g,'');
  if(!flat) return null;
  var best = null, bestLoss = 1e9;
  for(var i=0;i<cands.length;i++){
    var c = cands[i], cf = c.replace(/[\s_·\-]/g,'');
    if(!isSubseq(flat, cf)) continue;
    var loss = cf.length - flat.length;
    if(loss < bestLoss){ bestLoss = loss; best = c; }
  }
  if(!best) return null;
  var lim = (maxLoss == null) ? Math.max(4, Math.ceil(best.replace(/[\s_·\-]/g,'').length * 0.35)) : maxLoss;
  return (bestLoss <= lim) ? best : null;
}
var MAT_SUBJ = [
  { key:'vocab',   full:'영어어휘' },
  { key:'grammar', full:'영어문법' },
  { key:'reading', full:'영어독해' },
  { key:'logic',   full:'영어논리' }
];
var MAT_KIND = ['이론서','워크북','세부유형별_집중문제집',
                '기출문제집_1단계','기출문제집_2단계','기출문제집_3단계',
                '실전모의고사_1회','실전모의고사_2회','실전모의고사_3회','실전모의고사'];
/* 표준 제목 후보 전체 */
function matCandidates(){
  var out = [];
  MAT_SUBJ.forEach(function(s){
    MAT_KIND.forEach(function(k){ out.push({ title:'이룸편입_' + s.full + '_' + k, section:s.key }); });
  });
  return out;
}
function matNormalize(name, sectionHint){
  var t = String(name||'').trim();
  if(!t) return null;
  var ext = '';
  var em = /\.([A-Za-z0-9]{1,5})$/.exec(t);
  if(em){ ext = em[0]; t = t.slice(0, -ext.length); }
  var cands = matCandidates();
  /* 자료의 영역(어휘/문법/독해/논리)이 정해져 있으면 그 영역 후보만 사용해
     파일명이 심하게 훼손돼도 다른 영역으로 잘못 복원되지 않게 한다 */
  if(sectionHint){
    var narrowed = cands.filter(function(c){ return c.section === sectionHint; });
    if(narrowed.length) cands = narrowed;
  }
  var titles = cands.map(function(c){ return c.title; });
  var hit = bestMatch(t, titles);
  if(!hit) return null;
  var found = cands.filter(function(c){ return c.title === hit; })[0];
  return { title: hit, section: found ? found.section : '', ext: ext };
}
/* 교안 제목·파일명 자동 복원 */
function repairMaterials(){
  var CAT2SEC = { vocab:'vocab', grammar:'grammar', reading:'reading', logic:'logic' };
  var fixed = 0;
  (acf(DB.materials)||[]).forEach(function(m){
    var hint = CAT2SEC[m.category] || '';
    var r = matNormalize(m.title, hint);
    if(r && m.title !== r.title){ m.title = r.title; m._u = Date.now(); fixed++; }
    /* 파일명은 복원된 제목을 기준으로 맞춘다 (원본 파일명이 심하게 훼손된 경우 대비) */
    if(m.fileName){
      var base = (r && r.title) ? r.title : null;
      var rf = matNormalize(m.fileName, hint);
      var want = base ? (base + (rf ? rf.ext : (/\.[A-Za-z0-9]{1,5}$/.exec(m.fileName)||[''])[0]))
                      : (rf ? (rf.title + rf.ext) : null);
      if(want && m.fileName !== want){ m.fileName = want; m._u = Date.now(); fixed++; }
    }
  });
  if(fixed) save();
  return fixed;
}
