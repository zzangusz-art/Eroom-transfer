/* ===================== 이룸편입 LMS · 시험지 문서 뷰어 (PDF/Word/HWP 인라인) ===================== */
var DOCV = (function(){
  var CDN = {
    pdf:     'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    pdfw:    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    mammoth: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
    fflate:  'https://cdnjs.cloudflare.com/ajax/libs/fflate/0.8.2/umd/index.js'
  };
  var _loaded = {};
  function load(src){
    if(_loaded[src]) return _loaded[src];
    _loaded[src] = new Promise(function(res, rej){
      var t = document.createElement('script');
      t.src = src; t.async = true;
      t.onload = function(){ res(true); };
      t.onerror = function(){ _loaded[src]=null; rej(new Error('script load failed')); };
      document.head.appendChild(t);
      setTimeout(function(){ rej(new Error('script timeout')); }, 20000);
    });
    return _loaded[src];
  }
  function ext(url){ return ((url||'').toLowerCase().split('?')[0].split('#')[0].match(/\.([a-z0-9]+)$/)||[])[1]||''; }
  function kind(url){
    var e = ext(url);
    if(e==='pdf') return 'pdf';
    if(['png','jpg','jpeg','gif','webp','bmp'].indexOf(e)>=0) return 'img';
    if(e==='docx') return 'docx';
    if(e==='hwp')  return 'hwp';
    if(e==='hwpx') return 'hwpx';
    if(['doc','ppt','pptx','xls','xlsx'].indexOf(e)>=0) return 'office';
    if(e==='txt') return 'txt';
    return 'link';
  }
  function kindName(k){
    return {pdf:'PDF',img:'이미지',docx:'Word',hwp:'한글(HWP)',hwpx:'한글(HWPX)',office:'Office 문서',txt:'텍스트',link:'파일'}[k]||'파일';
  }
  function abs(u){ if(/^https?:\/\//i.test(u)) return u; return location.origin + (u.charAt(0)==='/'?'':'/') + u; }
  function esc2(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function fetchBuf(url){
    return fetch(url, {headers: (typeof eHdr==='function'? eHdr({}) : {})})
      .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.arrayBuffer(); });
  }
  /* ---------- 정답표/해설 자동 차단 ---------- */
  /* 정답/해설 '제목 줄' — 줄 전체가 제목일 때만 매칭 (문제 지문 오탐 방지) */
  var ANS_HEAD = /^\s*[\[\(<【<]?\s*(정\s*답(\s*(표|및\s*해설|과\s*해설))?|해\s*답(\s*표)?|모범\s*답안|해\s*설|풀\s*이|Answer\s*Key|Answers|Solutions?)\s*[\]\)>】>]?\s*[:：]?\s*(\d+\s*[~\-]\s*\d+\s*번?)?\s*$/i;
  /* 문서/페이지 안에 정답표가 있음을 강하게 시사하는 표현 */
  var ANS_HEAD_LOOSE = /(정\s*답\s*(표|및\s*해설|과\s*해설)|해\s*답\s*표|모범\s*답안|Answer\s*Key|정답\s*[:：]\s*\d)/i;
  /* "1.③ 2.① 3.④ ..." 처럼 번호+답이 연속되는 줄 */
  var ANS_ROW = /(?:\d{1,3}\s*[.)．\-:）]\s*(?:[\u2460-\u2469]|[1-5]|[A-Ea-e])[\s,]*){4,}/;
  function isAnswerLine(t){
    if(!t) return false;
    var x = String(t).trim();
    if(ANS_HEAD.test(x)) return true;
    if(ANS_HEAD_LOOSE.test(x)) return true;
    if(ANS_ROW.test(x)) return true;
    return false;
  }
  /* 문단 배열에서 정답 구간 이후를 잘라냄 */
  function stripAnswers(paras){
    var cut = -1;
    for(var i=0;i<paras.length;i++){
      var t = String(paras[i]||'').trim();
      if(!t) continue;
      if(ANS_HEAD.test(t) || ANS_HEAD_LOOSE.test(t)){ cut = i; break; }
      if(ANS_ROW.test(t)){ cut = i; break; }
    }
    if(cut < 0) return { list:paras, cut:false };
    /* 문서 앞부분이 통째로 잘리는 오탐 방지 */
    if(cut < Math.max(3, Math.floor(paras.length*0.08))) {
      var kept = paras.filter(function(t){ return !isAnswerLine(t); });
      return { list:kept, cut: kept.length !== paras.length };
    }
    return { list:paras.slice(0,cut), cut:true };
  }
  /* HTML(mammoth 결과)에서 정답 구간 제거 */
  function stripAnswersHtml(html){
    var wrap = document.createElement('div'); wrap.innerHTML = html;
    var kids = Array.prototype.slice.call(wrap.children);
    var cut = -1;
    for(var i=0;i<kids.length;i++){
      var t = (kids[i].textContent||'').trim();
      if(!t) continue;
      if(ANS_HEAD.test(t) || ANS_HEAD_LOOSE.test(t) || ANS_ROW.test(t)){ cut = i; break; }
    }
    if(cut < 0) return { html:wrap.innerHTML, cut:false };
    if(cut < Math.max(2, Math.floor(kids.length*0.08))){
      var removed=false;
      kids.forEach(function(k){ var t=(k.textContent||'').trim(); if(isAnswerLine(t)){ k.remove(); removed=true; } });
      return { html:wrap.innerHTML, cut:removed };
    }
    for(var j=kids.length-1;j>=cut;j--) kids[j].remove();
    return { html:wrap.innerHTML, cut:true };
  }
  function cutBadge(){ return ''; }   /* 안내 문구 비표시 (차단 동작은 유지) */
  /* 회차(1회차·2회차 등) 구간만 잘라내기 — 같은 파일을 회차별로 나눠 볼 때 사용 */
  var SETPAT = /((?:제\s*)?([0-9]{1,2})\s*회\s*(?:차|째|분)?|(?:VOCA\s+)?TEST\s*0?([0-9]{1,2})|SET\s*0?([0-9]{1,2})|PART\s*0?([0-9]{1,2}))(?![0-9])/i;
  function setNoOfLine(line){
    var t = String(line||'').trim();
    if(!t || t.length > 120) return 0;
    if(/^\d{1,3}\s*[.)]\s/.test(t)) return 0;
    if(/^[①-⑩]/.test(t)) return 0;
    var m = SETPAT.exec(t);
    if(!m) return 0;
    var n = +(m[2] || m[3] || m[4] || m[5] || 0);
    return (n > 0 && n <= 30) ? n : 0;
  }
  function isQLine(t){ return /^\s*0?\d{1,3}\s*[.)]\s+\S/.test(String(t||'')); }
  /* 문단 배열에서 지정한 회차 구간만 남긴다 — 목차 줄(문항 없는 표식)은 무시 */
  function sliceSetParas(paras, setNo){
    if(!setNo || !paras || !paras.length) return paras;
    /* 1) 표식 위치 수집 + 각 구간 문항 수 */
    var marks = [];
    for(var i=0;i<paras.length;i++){
      var n = setNoOfLine(paras[i]);
      if(n) marks.push({ i:i, no:n });
    }
    if(marks.length){
      var valid = [];
      for(var k=0;k<marks.length;k++){
        var end = (k+1<marks.length) ? marks[k+1].i : paras.length;
        var q = 0;
        for(var j2=marks[k].i; j2<end; j2++){ if(isQLine(paras[j2])) q++; }
        if(q >= 2) valid.push({ from:marks[k].i, to:end, no:marks[k].no });
      }
      if(valid.length >= 2){
        var segs = valid.filter(function(v){ return v.no === setNo; });
        if(segs.length){
          var out = [];
          segs.forEach(function(v){ for(var x=v.from; x<v.to; x++) out.push(paras[x]); });
          if(out.length >= 2) return out;
        }
      }
    }
    /* 2) 표식이 없으면 문항 번호 리셋 지점으로 분할 */
    var bounds = [0], last = 0;
    for(var j=0;j<paras.length;j++){
      var qm = /^\s*0?([0-9]{1,3})\s*[.)]\s+\S/.exec(String(paras[j]||''));
      if(!qm) continue;
      var q2 = +qm[1];
      if(q2 === 1 && last >= 3) bounds.push(j);
      last = q2;
    }
    if(bounds.length >= 2 && setNo <= bounds.length){
      var from2 = bounds[setNo-1];
      var to2 = (setNo < bounds.length) ? bounds[setNo] : paras.length;
      var seg = paras.slice(from2, to2);
      if(seg.length >= 2) return seg;
    }
    return paras;
  }
  /* 문항 번호 범위로 자르기 — 번호가 이어지는 파일(2회차 = 31~60번)용 */
  function sliceByQRange(paras, from, to){
    if(!from || !to || !paras || !paras.length) return null;
    var out = [], inc = false, found = false;
    for(var i=0;i<paras.length;i++){
      var m = /^\s*0?([0-9]{1,3})\s*[.)]\s+\S/.exec(String(paras[i]||''));
      if(m){
        var n = +m[1];
        inc = (n >= from && n <= to);
        if(inc) found = true;
      }
      if(inc) out.push(paras[i]);
    }
    return (found && out.length >= 2) ? out : null;
  }
  /* Word(HTML) 렌더 결과에서 회차 구간만 남기기 */
  function sliceSetHtml(htmlStr, setNo){
    if(!setNo) return htmlStr;
    var wrap = document.createElement('div'); wrap.innerHTML = htmlStr;
    var kids = Array.prototype.slice.call(wrap.children);
    if(kids.length < 4) return htmlStr;
    var texts = kids.map(function(k){ return (k.textContent||'').trim(); });
    var keep = sliceSetParas(texts, setNo);
    if(keep === texts || !keep || keep.length < 2) return htmlStr;
    /* 남길 문단의 인덱스 범위를 원본에서 다시 찾는다 */
    var first = texts.indexOf(keep[0]);
    var last  = texts.lastIndexOf(keep[keep.length-1]);
    if(first < 0 || last < first) return htmlStr;
    var out = document.createElement('div');
    for(var i=first; i<=last; i++) out.appendChild(kids[i].cloneNode(true));
    return out.innerHTML;
  }
  function busy(box, msg){ box.innerHTML = '<div class="dv-msg"><div class="dv-spin"></div><p>'+esc2(msg||'문서를 불러오는 중입니다...')+'</p></div>'; }
  function fallback(box, url, k, why){
    box.innerHTML = '<div class="dv-msg dv-fall">'
      + '<b>'+esc2(kindName(k))+' 파일을 화면에 바로 표시하지 못했습니다</b>'
      + '<p class="muted">'+esc2(why||'')+'</p>'
      + '<div class="dv-fall-btns">'
      + '<a class="btn" href="'+esc2(url)+'" target="_blank" rel="noopener">새 창에서 열기</a>'
      + '<a class="btn ghost" href="'+esc2(url)+'" download>파일 내려받기</a>'
      + '</div>'
      + '<p class="muted" style="margin-top:10px;font-size:11.5px">화면에서 바로 풀 수 있게 하려면 <b>PDF로 저장해 다시 업로드</b>해 주세요. (한글: 파일 → PDF로 저장 / Word: 다른 이름으로 저장 → PDF)</p>'
      + '</div>';
  }
  function pdfAnswerStart(pdf, opt){
    /* 정답/해설이 시작되는 페이지 번호를 찾음(없으면 0) */
    if(!opt || !opt.hideAnswers) return Promise.resolve(0);
    var jobs = [];
    for(var i=1;i<=pdf.numPages;i++){
      (function(n){
        jobs.push(pdf.getPage(n).then(function(pg){ return pg.getTextContent(); })
          .then(function(tc){
            var txt = (tc.items||[]).map(function(x){ return x.str; }).join(' ');
            var head = txt.slice(0, 260);
            var hit = ANS_HEAD_LOOSE.test(head) || ANS_ROW.test(txt);
            return {n:n, hit:hit};
          }).catch(function(){ return {n:n, hit:false}; }));
      })(i);
    }
    return Promise.all(jobs).then(function(rs){
      rs.sort(function(a,b){ return a.n-b.n; });
      /* 1페이지가 걸리면 오탐으로 보고 무시 */
      for(var k=0;k<rs.length;k++){ if(rs[k].hit && rs[k].n>1) return rs[k].n; }
      return 0;
    }).catch(function(){ return 0; });
  }
  /* PDF에서 해당 회차가 시작·끝나는 페이지 찾기 */
  function pdfSetRange(pdf, setNo){
    var jobs = [];
    for(var i=1;i<=pdf.numPages;i++){
      (function(n){ jobs.push(pdf.getPage(n).then(function(pg){ return pg.getTextContent(); })
        .then(function(tc){ return {n:n, t:(tc.items||[]).map(function(x){ return x.str; }).join(' ')}; })
        .catch(function(){ return {n:n, t:''}; })); })(i);
    }
    return Promise.all(jobs).then(function(rs){
      rs.sort(function(a,b){ return a.n-b.n; });
      var marks = [];
      rs.forEach(function(p){
        var m = /((?:제\s*)?([0-9]{1,2})\s*회\s*차?|TEST\s*0?([0-9]{1,2})|SET\s*0?([0-9]{1,2}))/i.exec(p.t.slice(0,300));
        if(m){ var n2 = +(m[2]||m[3]||m[4]||0); if(n2>0 && n2<=30) marks.push({page:p.n, no:n2}); }
      });
      if(!marks.length) return null;
      var startIdx = -1;
      for(var i2=0;i2<marks.length;i2++){ if(marks[i2].no === setNo){ startIdx = i2; break; } }
      if(startIdx < 0) return null;
      var from = marks[startIdx].page, to = null;
      for(var j=startIdx+1;j<marks.length;j++){ if(marks[j].no !== setNo){ to = marks[j].page - 1; break; } }
      return { from:from, to:to };
    }).catch(function(){ return null; });
  }
  function renderPdf(box, url, opt){
    busy(box, 'PDF 시험지를 불러오는 중입니다...');
    var _pdf=null, _stop=0, _setRange=null;
    return load(CDN.pdf).then(function(){
      var lib = window.pdfjsLib; if(!lib) throw new Error('pdfjs missing');
      try{ lib.GlobalWorkerOptions.workerSrc = CDN.pdfw; }catch(e){}
      return lib.getDocument({url:url, withCredentials:false}).promise;
    }).then(function(pdf){
      _pdf = pdf;
      if(opt && opt.setNo) return pdfSetRange(pdf, opt.setNo).then(function(rg){ _setRange = rg; return pdfAnswerStart(pdf, opt); });
      return pdfAnswerStart(pdf, opt);
    }).then(function(stop){
      var pdf = _pdf; _stop = stop;
      var last = stop ? (stop-1) : pdf.numPages;
      var first = 1;
      if(opt && opt.setNo && _setRange){ first = _setRange.from; if(_setRange.to) last = Math.min(last, _setRange.to); }
      box.innerHTML = ((stop)?cutBadge():'') + '<div class="dv-pages" id="dvPages"></div>';
      var host = box.querySelector('#dvPages');
      var width = Math.max(320, box.clientWidth - 24);
      var chain = Promise.resolve();
      for(var i=first;i<=last;i++){
        (function(n){
          chain = chain.then(function(){
            return pdf.getPage(n).then(function(pg){
              var v1 = pg.getViewport({scale:1});
              var scale = Math.min(2.2, width / v1.width);
              var vp = pg.getViewport({scale:scale});
              var cv = document.createElement('canvas');
              cv.className='dv-page'; cv.width=Math.floor(vp.width); cv.height=Math.floor(vp.height);
              host.appendChild(cv);
              return pg.render({canvasContext:cv.getContext('2d'), viewport:vp}).promise;
            });
          });
        })(i);
      }
      return chain.then(function(){
        if(opt && opt.noDownload){ var hs=box.querySelector('#dvPages'); if(hs) hs.classList.add('dv-lock'); }
        /* 화면 회전·크기 변경 시 재렌더 */
        if(!box._dvBound){
          box._dvBound = true;
          var t=null, lastW=box.clientWidth;
          var onResize=function(){
            if(!document.body.contains(box)){ window.removeEventListener('resize', onResize); return; }
            var w=box.clientWidth; if(Math.abs(w-lastW) < 60) return;
            clearTimeout(t); t=setTimeout(function(){ lastW=box.clientWidth; box._dvBound=false; renderPdf(box, url, opt); }, 260);
          };
          window.addEventListener('resize', onResize);
        }
        return true;
      });
    }).catch(function(e){
      box.innerHTML = '<iframe class="dv-frame" src="'+esc2(url)+'#toolbar=0&view=FitH"></iframe>';
      return true;
    });
  }
  function renderOffice(box, url, k, opt){
    var full = abs(url);
    if(!/^https:\/\//i.test(full) || /localhost|127\.0\.0\.1|192\.168\./i.test(full)){
      fallback(box, url, k||'office', '외부 미리보기 서비스는 공개된 https 주소에서만 동작합니다.');
      return Promise.resolve(false);
    }
    box.innerHTML = '<iframe class="dv-frame" src="https://view.officeapps.live.com/op/embed.aspx?src='+encodeURIComponent(full)+'"></iframe>';
    return Promise.resolve(true);
  }
  function renderDocx(box, url, opt){
    busy(box, 'Word 시험지를 변환하는 중입니다...');
    return load(CDN.mammoth).then(function(){ return fetchBuf(url); })
      .then(function(buf){
        if(!window.mammoth) throw new Error('mammoth missing');
        return window.mammoth.convertToHtml({arrayBuffer:buf});
      })
      .then(function(res){
        var h=(res&&res.value)||'';
        if(!h.replace(/<[^>]*>/g,'').trim()) throw new Error('empty');
        var cutMsg='';
        if(opt && opt.setNo) h = sliceSetHtml(h, opt.setNo);        /* 회차 구간만 표시 */
        if(opt && opt.hideAnswers){ var st=stripAnswersHtml(h); h=st.html; if(st.cut) cutMsg=cutBadge(); }
        box.innerHTML = '<div class="dv-doc'+((opt&&opt.noDownload)?' dv-lock':'')+'">'+cutMsg+h+'</div>';
        return true;
      })
      .catch(function(e){ return renderOffice(box, url, 'docx', opt); });
  }
  function paintText(box, paras, url, k, opt){
    opt = opt||{};
    var src = paras || [];
    if(opt.qFrom && opt.qTo){
      var rg = sliceByQRange(src, opt.qFrom, opt.qTo);
      if(rg) src = rg;
      else if(opt.setNo) src = sliceSetParas(src, opt.setNo);
    } else if(opt.setNo){ src = sliceSetParas(src, opt.setNo); }
    var clean = src.map(function(t){ return (t||'').replace(/　/g,' ').trim(); });
    var cutMsg = '';
    if(opt.hideAnswers){ var st = stripAnswers(clean); clean = st.list; if(st.cut) cutMsg = cutBadge(); }
    var body = clean.filter(function(t){ return t.length>0; });
    if(!body.length){ fallback(box, url, k, '문서에서 읽을 수 있는 내용을 찾지 못했습니다.'); return false; }
    var html = clean.map(function(t){ return t? '<p>'+esc2(t)+'</p>' : '<p class="dv-blank"></p>'; }).join('');
    var note = opt.hideAnswers
      ? '<div class="dv-note">문서를 텍스트로 변환해 표시했습니다. 화면에서 바로 응시하세요.</div>'
      : '<div class="dv-note">문서를 텍스트로 변환해 표시했습니다. 표·그림 등 원본 서식은 <a href="'+esc2(url)+'" target="_blank" rel="noopener">새 창</a>에서 확인하세요.</div>';
    box.innerHTML = '<div class="dv-doc dv-hwp'+(opt.noDownload?' dv-lock':'')+'">' + note + cutMsg + html + '</div>';
    return true;
  }
  function renderHwpx(box, url, opt){
    busy(box, '한글(HWPX) 시험지를 변환하는 중입니다...');
    return load(CDN.fflate).then(function(){ return fetchBuf(url); })
      .then(function(buf){
        var ff = window.fflate; if(!ff) throw new Error('fflate missing');
        var files = ff.unzipSync(new Uint8Array(buf));
        var names = Object.keys(files).filter(function(n){ return /Contents\/section[0-9]+\.xml$/i.test(n); })
                    .sort(function(a,b){ return a.localeCompare(b, undefined, {numeric:true}); });
        if(!names.length) throw new Error('no section');
        var dec = new TextDecoder('utf-8');
        var paras = [];
        names.forEach(function(n){
          var xml = dec.decode(files[n]);
          xml.replace(/<hp:p\b[\s\S]*?<\/hp:p>/g, function(blk){
            var txt='';
            blk.replace(/<hp:t[^>]*>([\s\S]*?)<\/hp:t>/g, function(m, t){ txt += t; return ''; });
            txt = txt.replace(/<[^>]+>/g,'')
                     .replace(/&lt;/g,'<').replace(/&gt;/g,'>')
                     .replace(/&quot;/g,'"').replace(/&amp;/g,'&');
            paras.push(txt); return '';
          });
        });
        return paras;
      })
      .then(function(paras){ return paintText(box, paras, url, 'hwpx', opt); })
      .catch(function(e){ fallback(box, url, 'hwpx', '문서를 변환하지 못했습니다.'); return false; });
  }
  function cfbRead(u8){
    var dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    if(dv.getUint32(0,true)!==0xE011CFD0 || dv.getUint32(4,true)!==0xE11AB1A1) throw new Error('not cfb');
    var secSize = 1 << dv.getUint16(30,true);
    var miniSize = 1 << dv.getUint16(32,true);
    var nFat = dv.getUint32(44,true), dirStart = dv.getUint32(48,true);
    var miniCut = dv.getUint32(56,true), miniFatStart = dv.getUint32(60,true), nMiniFat = dv.getUint32(64,true);
    var difatStart = dv.getUint32(68,true);
    function secOff(i){ return (i+1)*secSize; }
    var fatSecs = [], i, v;
    for(i=0; i<109 && fatSecs.length<nFat; i++){ v = dv.getUint32(76+i*4,true); if(v<0xFFFFFFFA) fatSecs.push(v); }
    var ds = difatStart, guard = 0;
    while(ds < 0xFFFFFFFA && guard++ < 4096 && fatSecs.length < nFat){
      var base = secOff(ds), per = secSize/4 - 1;
      for(var j=0; j<per && fatSecs.length<nFat; j++){ var v2 = dv.getUint32(base+j*4,true); if(v2<0xFFFFFFFA) fatSecs.push(v2); }
      ds = dv.getUint32(base+(secSize-4),true);
    }
    var fat = [];
    fatSecs.forEach(function(s){ var b = secOff(s); for(var k=0;k<secSize/4;k++) fat.push(dv.getUint32(b+k*4,true)); });
    function chain(start, arr){ var out=[], c=start, g=0; while(c<0xFFFFFFFA && g++<500000){ out.push(c); c=arr[c]; if(c==null) break; } return out; }
    function readChain(start, size){
      var secs = chain(start, fat), out = new Uint8Array(secs.length*secSize);
      secs.forEach(function(s,ix){ out.set(u8.subarray(secOff(s), secOff(s)+secSize), ix*secSize); });
      return (size!=null) ? out.subarray(0,size) : out;
    }
    var dirBuf = readChain(dirStart, null), entries = [];
    for(var off=0; off+128<=dirBuf.length; off+=128){
      var edv = new DataView(dirBuf.buffer, dirBuf.byteOffset+off, 128);
      var nameLen = edv.getUint16(64,true);
      if(nameLen<=0){ entries.push(null); continue; }
      var nm='';
      for(var c2=0; c2<nameLen-2; c2+=2){ nm += String.fromCharCode(edv.getUint16(c2,true)); }
      entries.push({ name:nm, type:edv.getUint8(66), left:edv.getUint32(68,true), right:edv.getUint32(72,true),
                     child:edv.getUint32(76,true), start:edv.getUint32(116,true), size:edv.getUint32(120,true) });
    }
    var root = entries[0];
    var miniStream = root ? readChain(root.start, root.size) : new Uint8Array(0);
    var miniFat = [];
    if(nMiniFat){
      var mb = readChain(miniFatStart, null), mdv = new DataView(mb.buffer, mb.byteOffset, mb.byteLength);
      for(var m=0; m*4+4<=mb.length; m++) miniFat.push(mdv.getUint32(m*4,true));
    }
    function readEntry(e){
      if(!e || !e.size) return new Uint8Array(0);
      if(e.size < miniCut){
        var secs = chain(e.start, miniFat), out = new Uint8Array(secs.length*miniSize);
        secs.forEach(function(s,ix){ out.set(miniStream.subarray(s*miniSize,(s+1)*miniSize), ix*miniSize); });
        return out.subarray(0, e.size);
      }
      return readChain(e.start, e.size);
    }
    function walk(idx, path, acc){
      if(idx==null || idx>=0xFFFFFFFA || !entries[idx]) return;
      var e = entries[idx];
      walk(e.left, path, acc);
      var p = path ? (path+'/'+e.name) : e.name;
      acc.push({path:p, entry:e});
      if(e.type===1 || e.type===5) walk(e.child, (e.type===5 ? '' : p), acc);
      walk(e.right, path, acc);
    }
    var flat = [];
    if(entries[0]) walk(entries[0].child, '', flat);
    return { list:flat, read:readEntry };
  }
  function hwpRecords(bytes){
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var out=[], i=0;
    while(i+4 <= bytes.length){
      var h = dv.getUint32(i,true);
      var tag = h & 0x3FF, size = (h>>>20) & 0xFFF, dataOff = i+4;
      if(size === 0xFFF){ if(i+8 > bytes.length) break; size = dv.getUint32(i+4,true); dataOff = i+8; }
      if(dataOff+size > bytes.length) break;
      out.push({tag:tag, off:dataOff, size:size});
      i = dataOff + size;
    }
    return out;
  }
  var CTRL_EXT = [1,2,3,11,12,14,15,16,17,18,21,22,23];
  function renderHwp(box, url, opt){
    busy(box, '한글(HWP) 시험지를 변환하는 중입니다...');
    return load(CDN.fflate).then(function(){ return fetchBuf(url); })
      .then(function(buf){
        var ff = window.fflate; if(!ff) throw new Error('fflate missing');
        var u8 = new Uint8Array(buf);
        var cfb = cfbRead(u8);
        var fh = cfb.list.filter(function(x){ return /FileHeader$/i.test(x.path); })[0];
        var compressed = true;
        if(fh){ var fhb = cfb.read(fh.entry); if(fhb.length > 37) compressed = !!(fhb[36] & 1); }
        var secs = cfb.list.filter(function(x){ return /BodyText\/Section[0-9]+$/i.test(x.path); })
                    .sort(function(a,b){ return a.path.localeCompare(b.path, undefined, {numeric:true}); });
        if(!secs.length) throw new Error('no section');
        var paras = [];
        secs.forEach(function(s){
          var raw = cfb.read(s.entry), data = raw;
          if(compressed){
            try{ data = ff.inflateSync(raw); }
            catch(e){ try{ data = ff.unzlibSync(raw); }catch(e2){ return; } }
          }
          hwpRecords(data).forEach(function(rec){
            if(rec.tag !== 67) return;
            var txt = '';
            for(var k=0; k+1<rec.size; k+=2){
              var code = data[rec.off+k] | (data[rec.off+k+1] << 8);
              if(code < 32){
                if(code===13 || code===10) txt += '\n';
                else if(code===9) txt += '\t';
                else if(CTRL_EXT.indexOf(code) >= 0) k += 14;
                continue;
              }
              txt += String.fromCharCode(code);
            }
            txt.split('\n').forEach(function(t){ paras.push(t); });
          });
        });
        return paras;
      })
      .then(function(paras){ return paintText(box, paras, url, 'hwp', opt); })
      .catch(function(e){ fallback(box, url, 'hwp', '한글 파일을 변환하지 못했습니다. (암호 설정 또는 배포용 문서일 수 있습니다)'); return false; });
  }
  function render(box, url, opt){
    opt = opt || {};
    if(!box) return Promise.resolve(false);
    if(!url){
      box.innerHTML = '<div class="dv-msg"><b>등록된 시험지 자료가 없습니다</b><p class="muted">평가 관리에서 자료를 업로드하면 이 영역에 시험지가 표시됩니다.</p></div>';
      return Promise.resolve(false);
    }
    var k = kind(url);
    try{
      if(k==='pdf')    return renderPdf(box, url, opt);
      if(k==='img'){   box.innerHTML = '<div class="dv-imgwrap"><img src="'+esc2(url)+'" alt="시험지"></div>'; return Promise.resolve(true); }
      if(k==='docx')   return renderDocx(box, url, opt);
      if(k==='hwpx')   return renderHwpx(box, url, opt);
      if(k==='hwp')    return renderHwp(box, url, opt);
      if(k==='office') return renderOffice(box, url, k, opt);
      if(k==='txt'){
        busy(box, '문서를 불러오는 중입니다...');
        return fetch(url).then(function(r){ return r.text(); })
          .then(function(t){ return paintText(box, t.split('\n'), url, 'txt', opt); })
          .catch(function(){ fallback(box, url, 'txt', ''); return false; });
      }
      box.innerHTML = '<iframe class="dv-frame" src="'+esc2(url)+'"></iframe>';
      return Promise.resolve(true);
    }catch(e){ fallback(box, url, k, ''); return Promise.resolve(false); }
  }
  /* 파일에서 원문 텍스트 추출 (정답 자동 인식용 · 정답 차단 없이 전체) */
  function extractText(url){
    var k = kind(url);
    if(k === 'hwp'){
      return load(CDN.fflate).then(function(){ return fetchBuf(url); }).then(function(buf){
        var ff = window.fflate, u8 = new Uint8Array(buf), cfb = cfbRead(u8);
        var fh = cfb.list.filter(function(x){ return /FileHeader$/i.test(x.path); })[0];
        var compressed = true;
        if(fh){ var fhb = cfb.read(fh.entry); if(fhb.length > 37) compressed = !!(fhb[36] & 1); }
        var secs = cfb.list.filter(function(x){ return /BodyText\/Section[0-9]+$/i.test(x.path); })
                    .sort(function(a,b){ return a.path.localeCompare(b.path, undefined, {numeric:true}); });
        var paras = [];
        secs.forEach(function(sx){
          var raw = cfb.read(sx.entry), data = raw;
          if(compressed){ try{ data = ff.inflateSync(raw); }catch(e){ try{ data = ff.unzlibSync(raw); }catch(e2){ return; } } }
          hwpRecords(data).forEach(function(rec){
            if(rec.tag !== 67) return;
            var txt = '';
            for(var k2=0; k2+1<rec.size; k2+=2){
              var code = data[rec.off+k2] | (data[rec.off+k2+1] << 8);
              if(code < 32){ if(code===13||code===10) txt += '\n'; else if(code===9) txt += '\t';
                             else if(CTRL_EXT.indexOf(code) >= 0) k2 += 14; continue; }
              txt += String.fromCharCode(code);
            }
            paras.push(txt);
          });
        });
        return paras.join('\n');
      });
    }
    if(k === 'hwpx'){
      return load(CDN.fflate).then(function(){ return fetchBuf(url); }).then(function(buf){
        var ff = window.fflate, files = ff.unzipSync(new Uint8Array(buf));
        var names = Object.keys(files).filter(function(n){ return /Contents\/section[0-9]+\.xml$/i.test(n); }).sort();
        var dec = new TextDecoder('utf-8'), paras = [];
        names.forEach(function(n){
          var xml = dec.decode(files[n]);
          xml.replace(/<hp:p\b[\s\S]*?<\/hp:p>/g, function(blk){
            var t=''; blk.replace(/<hp:t[^>]*>([\s\S]*?)<\/hp:t>/g, function(m,x){ t += x; return ''; });
            paras.push(t.replace(/<[^>]+>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&amp;/g,'&'));
            return '';
          });
        });
        return paras.join('\n');
      });
    }
    if(k === 'docx'){
      return load(CDN.mammoth).then(function(){ return fetchBuf(url); })
        .then(function(buf){ return window.mammoth.extractRawText({arrayBuffer:buf}); })
        .then(function(r){ return (r && r.value) || ''; });
    }
    if(k === 'pdf'){
      return load(CDN.pdf).then(function(){
        var lib = window.pdfjsLib; if(!lib) throw new Error('pdfjs');
        try{ lib.GlobalWorkerOptions.workerSrc = CDN.pdfw; }catch(e){}
        return lib.getDocument({url:url}).promise;
      }).then(function(pdf){
        var jobs = [];
        for(var i=1;i<=pdf.numPages;i++){
          (function(n){ jobs.push(pdf.getPage(n).then(function(pg){ return pg.getTextContent(); })
            .then(function(tc){ return {n:n, t:(tc.items||[]).map(function(x){ return x.str; }).join(' ')}; })); })(i);
        }
        return Promise.all(jobs).then(function(rs){
          rs.sort(function(a,b){ return a.n-b.n; });
          return rs.map(function(x){ return x.t; }).join('\n');
        });
      });
    }
    if(k === 'txt') return fetch(url).then(function(r){ return r.text(); });
    return Promise.resolve('');
  }
  return { render:render, kind:kind, kindName:kindName, ext:ext, extractText:extractText };
})();

/* ===================== 시험지 파일에서 정답·해설 자동 추출 ===================== */
var DOCX_ = (function(){
  var CIRCLE = {'①':1,'②':2,'③':3,'④':4,'⑤':5,'⑥':6,'⑦':7,'⑧':8,'⑨':9,'⑩':10};
  function toNum(tok){
    if(!tok) return '';
    tok = String(tok).trim();
    if(CIRCLE[tok]) return String(CIRCLE[tok]);
    if(/^[1-9]$|^10$/.test(tok)) return tok;
    var up = tok.toUpperCase();
    if(/^[A-E]$/.test(up)) return String('ABCDE'.indexOf(up) + 1);
    return '';
  }
  /* 텍스트에서 "번호-정답" 쌍을 뽑아 answerKey 문자열로 */
  function parseAnswers(text){
    if(!text) return {key:'', pairs:{}, count:0};
    var pairs = {};
    /* 1) "12. ③" / "12) 3" / "12 : C" 형태 */
    var re = /(?:^|[\s,;|·\n])(\d{1,3})\s*(?:번)?\s*[.)．)\-:：]?\s*(?:정\s*답|답)?\s*[:：]?\s*([①-⑩]|[1-5]|[A-Ea-e])(?![\w가-힣])/g, m;
    var SKIP = /(TEST|SET|PART|회\s*차?|단계|문항)\s*$/i;
    while((m = re.exec(text)) !== null){
      var no = +m[1], v = toNum(m[2]);
      var pre = text.slice(Math.max(0, m.index - 12), m.index);
      if(SKIP.test(pre)) continue;                     /* 'TEST 01' 같은 제목 번호는 제외 */
      if(no >= 1 && no <= 200 && v) { if(!pairs[no]) pairs[no] = v; }
    }
    var nos = Object.keys(pairs).map(Number).sort(function(a,b){ return a-b; });
    if(!nos.length) return {key:'', pairs:{}, count:0};
    var maxNo = nos[nos.length-1];
    var arr = [];
    for(var i=1; i<=maxNo; i++) arr.push(pairs[i] || '-');
    return {key: arr.join(' '), pairs: pairs, count: nos.length, max: maxNo};
  }
  /* 문항 번호 없이 '정답 ②' 형태로 문항 바로 뒤에 붙는 교재용 순차 매칭 */
  function parseSequential(text){
    var lines = String(text||'').split(/\n/);
    var pairs = {}, ex = {}, cur = 0, lastNo = 0;
    var Q  = /^\s*(\d{1,3})\s*[.)]\s+\S/;
    var AN = /^\s*정\s*답\s*[:：]?\s*([①-⑩]|[1-5]|[A-Ea-e])\s*(.*)$/;
    for(var i=0;i<lines.length;i++){
      var ln = lines[i];
      var qm = Q.exec(ln);
      if(qm){ cur = +qm[1]; continue; }
      var am = AN.exec(ln);
      if(am && cur){
        var v = toNum(am[1]);
        if(v && !pairs[cur]) pairs[cur] = v;
        var rest = (am[2]||'').replace(/\[[^\]]{1,20}\]\s*$/, '').trim();
        /* 뒤따르는 해설 줄 수집 */
        var buf = rest;
        for(var j=i+1; j<lines.length && j<i+4; j++){
          var nx = lines[j];
          if(Q.test(nx) || AN.test(nx) || /^[①-⑤]/.test(nx)) break;
          if(/^\s*(▶\s*)?해설/.test(nx) || (buf.length < 20 && nx.trim().length > 10)){
            buf = (buf + ' ' + nx.replace(/^\s*▶?\s*해설\s*[:：]?\s*/, '')).trim();
          } else break;
        }
        if(buf && buf.length >= 6 && !ex[cur]) ex[cur] = buf.slice(0,300);
        if(cur > lastNo) lastNo = cur;
        cur = 0;
      }
    }
    var nos = Object.keys(pairs).map(Number).sort(function(a,b){ return a-b; });
    if(!nos.length) return {key:'', pairs:{}, count:0, max:0, explains:{}};
    var max = nos[nos.length-1], arr = [];
    for(var k=1;k<=max;k++) arr.push(pairs[k] || '-');
    return {key:arr.join(' '), pairs:pairs, count:nos.length, max:max, explains:ex};
  }
  /* 해설 구간에서 문항별 해설 뽑기 */
  function parseExplains(text){
    if(!text) return {};
    var out = {};
    var reA = /(?:^|\n)\s*(\d{1,3})\s*(?:번)?\s*[.)．)\-:：]?\s*(?:해설|풀이)\s*[:：]?\s*([^\n]{6,400})/g;
    var reB = /(?:^|\n)\s*(\d{1,3})\s*[.)．)\-:：]\s*([^\n]{14,400})/g;
    [reA, reB].forEach(function(re){
      var m;
      while((m = re.exec(text)) !== null){
        var no = +m[1], t = (m[2]||'').trim();
        if(no < 1 || no > 200) continue;
        t = t.replace(/^[①-⑩]\s*/, '').trim();
        if(t.length < 6) continue;
        if(/^[①-⑩\d A-Ea-e.,)\-:：]+$/.test(t)) continue;
        if(re === reB && !/[가-힣]{2,}/.test(t)) continue;      /* 해설 표기가 없으면 한글 설명일 때만 */
        if(re === reB && t.length < 14) continue;
        if(!out[no]) out[no] = t;
      }
    });
    return out;
  }
  /* 객관식 보기 기호로만 이루어졌는지 */
  function isChoiceToken(v){
    var t = String(v||'').trim();
    if(!t) return true;
    if(/^[①-⑩]$/.test(t)) return true;
    if(/^[1-9]$|^10$/.test(t)) return true;
    if(/^[A-Ea-e]$/.test(t)) return true;
    if(/^[가-마]$/.test(t)) return true;
    return false;
  }
  /* 주관식(단답형) 정답 추출
     - 정답 구간을 확실히 찾은 경우에만 수행 (문제 본문 오인식 방지)
     - 객관식으로 이미 잡힌 번호, 객관식 정답 범위 안의 번호는 제외
     - 단어·짧은 구만 인정 (문장·지문 배제) */
  function parseSubjective(text, objPairs, maxObjNo){
    if(!text) return {};
    objPairs = objPairs || {};
    var out = {};
    var re = /(?:^|\n)\s*(\d{1,3})\s*(?:번\s*)?(?:[.)．)\-:：]\s*)?(?:정답\s*[:：]?\s*)?([^\n]{1,60})/g, m;
    while((m = re.exec(text)) !== null){
      var no = +m[1];
      var v = (m[2] || '').trim();
      if(no < 1 || no > 200) continue;
      if(objPairs[no]) continue;                                  /* 객관식으로 확정된 번호 */
      /* 값 정리: 뒤에 붙은 해설/부연 제거 */
      v = v.replace(/^[①-⑩]\s*/, '')
           .split(/\s{2,}|\s*[▶·—]\s*|\s*\/\/\s*/)[0]
           .replace(/[.,;:]+$/, '')
           .trim();
      if(!v) continue;
      if(isChoiceToken(v)) continue;                              /* 보기 기호는 객관식 */
      if(/^(해설|풀이|정답|답안|해답|오답|보기|지문|본문)/.test(v)) continue;
      if(/_{3,}|\.{3,}|\(\s*\)/.test(v)) continue;              /* 빈칸이 포함된 문제 지문 배제 */
      /* 단답형은 짧아야 한다 — 문장·지문은 배제 */
      if(v.length > 30) continue;
      if((v.match(/\s/g) || []).length > 3) continue;              /* 4어절 이상이면 문장으로 간주 */
      if(/[.!?]\s/.test(v)) continue;                              /* 문장부호 + 공백 = 문장 */
      if(/[가-힣]{2,}.*[가-힣]{2,}\s+[가-힣]{2,}/.test(v)) continue; /* 한글 설명문 배제 */
      if(!/[A-Za-z가-힣0-9]/.test(v)) continue;
      out[no] = v;
    }
    /* 객관식 정답 번호 범위 안(1~maxObjNo)의 번호는 주관식으로 보지 않는다 */
    if(maxObjNo){
      Object.keys(out).forEach(function(k){ if(+k <= maxObjNo) delete out[k]; });
    }
    return out;
  }
  /* 해설 문자열 정리 — '정답 ③', '[어휘]', '▶ 해설' 같은 접두어 제거 */
  function tidyExplain(t){
    var x = String(t||'').trim();
    x = x.replace(/^정\s*답\s*[:：]?\s*[①-⑩1-5A-Ea-e]?\s*/,'')
         .replace(/^▶?\s*해\s*설\s*[:：]?\s*/,'')
         .replace(/^\[[^\]]{1,12}\]\s*/,'')
         .replace(/^[-–—·]\s*/,'')
         .replace(/\s{2,}/g,' ')
         .trim();
    return x;
  }
  /* 회차(세트) 분리 — '제2회 실전 모의', '1회차', 'TEST 03' 등
     · 제목 줄 어디에 있어도 인식 (줄 길이 120자까지)
     · 목차·표지 줄(뒤에 문항이 없는 표식)은 세트로 치지 않음 */
  var SETPAT2 = /((?:제\s*)?([0-9]{1,2})\s*회\s*(?:차|째|분)?|(?:VOCA\s+)?TEST\s*0?([0-9]{1,2})|SET\s*0?([0-9]{1,2})|PART\s*0?([0-9]{1,2}))(?![0-9])/i;
  function setNoOfLine2(line){
    var t = String(line||'').trim();
    if(!t || t.length > 120) return 0;
    if(/^\d{1,3}\s*[.)]\s/.test(t)) return 0;          /* '01. 문제' 줄 제외 */
    if(/^[①-⑩]/.test(t)) return 0;                     /* 보기 줄 제외 */
    var m = SETPAT2.exec(t);
    if(!m) return 0;
    var n = +(m[2] || m[3] || m[4] || m[5] || 0);
    return (n > 0 && n <= 30) ? n : 0;
  }
  function qLinesIn(lines, from, to){
    var c = 0;
    for(var i=from; i<to; i++){ if(/^\s*0?\d{1,3}\s*[.)]\s+\S/.test(lines[i]||'')) c++; }
    return c;
  }
  function splitSets(text){
    if(!text) return [];
    var lines = String(text).split(/\n/);
    var marks = [];
    for(var i=0;i<lines.length;i++){
      var n = setNoOfLine2(lines[i]);
      if(n) marks.push({ i:i, no:n, label:lines[i].trim() });
    }
    if(marks.length < 2) return [];
    /* 각 표식 구간의 문항 수를 세서, 문항이 2개 미만인 표식(목차·표지)은 버린다 */
    var valid = [];
    for(var k=0;k<marks.length;k++){
      var end = (k+1 < marks.length) ? marks[k+1].i : lines.length;
      var q = qLinesIn(lines, marks[k].i, end);
      if(q >= 2) valid.push({ i:marks[k].i, no:marks[k].no, label:marks[k].label, end:end, q:q });
    }
    if(valid.length < 2) return [];
    /* 같은 회차 번호(문제면 + 정답·해설면)를 하나로 합친다 */
    var group = {};
    valid.forEach(function(x){
      var piece = lines.slice(x.i, x.end).join('\n');
      if(!group[x.no]) group[x.no] = { no:x.no, label:x.label, parts:[] };
      group[x.no].parts.push(piece);
    });
    var out = Object.keys(group).map(function(k2){ return group[k2]; })
      .sort(function(a,b){ return a.no - b.no; })
      .map(function(g){
        var lb = g.label;
        var m2 = /((?:제\s*)?[0-9]{1,2}\s*회\s*(?:차|째|분)?|TEST\s*0?[0-9]{1,2}|SET\s*0?[0-9]{1,2}|PART\s*0?[0-9]{1,2})/i.exec(lb);
        lb = m2 ? m2[1].replace(/\s+/g,'').replace(/^제/,'').replace(/(회)(?!차)/,'$1차') : (g.no + '회차');
        if(!/회|TEST|SET|PART/i.test(lb)) lb = g.no + '회차';
        return { no:g.no, label:lb, text:g.parts.join('\n') };
      });
    return out.length >= 2 ? out : [];
  }
  function splitSets(text){
    if(!text) return [];
    var lines = String(text).split(/\n/);
    var marks = [];
    for(var i=0;i<lines.length;i++){
      var n = setNoOfLine2(lines[i]);
      if(n) marks.push({ i:i, no:n, label:lines[i].trim() });
    }
    if(marks.length < 2) return [];
    /* 같은 회차의 문제면·정답면을 하나로 합친다 */
    var group = {};
    marks.forEach(function(x, k){
      var end = (k+1 < marks.length) ? marks[k+1].i : lines.length;
      var piece = lines.slice(x.i, end).join('\n');
      if(!group[x.no]) group[x.no] = { no:x.no, label:x.label, parts:[] };
      group[x.no].parts.push(piece);
    });
    var out = Object.keys(group).map(function(k){ return group[k]; })
      .sort(function(a,b){ return a.no - b.no; })
      .map(function(g){
        var lb = g.label;
        if(lb.length > 24){ var m2 = SETPAT2.exec(lb); lb = m2 ? m2[1].replace(/\s+/g,'') : (g.no + '회차'); }
        if(!/회|TEST|SET|PART/i.test(lb)) lb = g.no + '회차';
        return { no:g.no, label:lb, text:g.parts.join('\n') };
      });
    return out.length >= 2 ? out : [];
  }
  /* 'NN. 정답 ③' 형태의 명시적 정답 줄만 모으는 최우선 파서
     — 빠른 정답표(표 형식)의 번호·기호가 줄 단위로 분리된 문서에서 오인식을 막는다 */
  function parseExplicit(text){
    var lines = String(text||'').split(/\n/);
    var pairs = {}, ex = {};
    var RE = /^\s*0?(\d{1,3})\s*[.)]\s*정\s*답\s*([①-⑩]|[1-5]|[A-Ea-e])\s*(.*)$/;
    for(var i=0;i<lines.length;i++){
      var m = RE.exec(lines[i]);
      if(!m) continue;
      var no = +m[1], v = toNum(m[2]);
      if(no < 1 || no > 200 || !v) continue;
      if(!pairs[no]) pairs[no] = v;
      /* 뒤따르는 해설 줄 수집 */
      var buf = (m[3]||'').replace(/\[[^\]]{1,20}\]\s*$/,'').trim();
      for(var j=i+1; j<lines.length && j<i+8; j++){
        if(RE.test(lines[j])) break;
        if(/^\s*해\s*설/.test(lines[j])) buf += (buf?' ':'') + lines[j].replace(/^\s*해\s*설\s*/,'').trim();
        else if(/^\s*(?:제\s*\d+회\s*)?PART/i.test(lines[j])) break;
      }
      if(buf && !ex[no]) ex[no] = buf.slice(0,300);
    }
    var nos = Object.keys(pairs).map(Number).sort(function(a,b){ return a-b; });
    if(!nos.length) return null;
    var max = nos[nos.length-1], arr = [];
    for(var k=1;k<=max;k++) arr.push(pairs[k] || '-');
    return { key:arr.join(' '), pairs:pairs, count:nos.length, max:max, explains:ex };
  }
  /* 정답·해설면에서 PART(영역) 경계를 추출한다 — 답안지에 영역 구분을 표시하기 위함
     (예: 건국대 실전문제집 — PART 1. 어휘 1~12, PART 2. 문법 13~21 …) */
  var PART_RE = /^\s*(?:제\s*\d{1,2}\s*회\s*)?PART\s*([0-9]{1,2})\s*[.．]?\s*(.*)$/i;
  var ANSLINE = /^\s*0?(\d{1,3})\s*[.)]\s*정\s*답\s*([①-⑩]|[1-5]|[A-Ea-e])/;
  function partRanges(text){
    var lines = String(text||'').split(/\n/);
    var out = [], cur = null;
    for(var i=0;i<lines.length;i++){
      var pm = PART_RE.exec(lines[i]);
      if(pm){
        var nm = (pm[2]||'').split(/\s{2,}/)[0].replace(/[A-Z]{3,}/g,'').trim();
        cur = { name: nm || ('PART ' + pm[1]), from:0, to:0 };
        out.push(cur); continue;
      }
      var am = ANSLINE.exec(lines[i]);
      if(am && cur){
        var n = +am[1];
        if(!cur.from || n < cur.from) cur.from = n;
        if(n > cur.to) cur.to = n;
      }
    }
    out = out.filter(function(x){ return x.from && x.to && x.to >= x.from; });
    /* 같은 영역이 문제면·정답면에 두 번 나오면 병합 */
    var merged = [];
    out.forEach(function(x){
      var f = merged.filter(function(m){ return m.name === x.name; })[0];
      if(f){ f.from = Math.min(f.from, x.from); f.to = Math.max(f.to, x.to); }
      else merged.push({ name:x.name, from:x.from, to:x.to });
    });
    merged.sort(function(a,b){ return a.from - b.from; });
    return merged.length >= 2 ? merged : null;
  }
  /* 세트 본문에서 문항 개수 추정 */
  function countQuestions(t){
    var nos = {}, m, re2 = /(?:^|\n)\s*(\d{1,3})\s*[.)]\s+\S/g;
    while((m = re2.exec(t)) !== null){ var n = +m[1]; if(n >= 1 && n <= 200) nos[n] = 1; }
    var arr = Object.keys(nos).map(Number);
    return arr.length ? Math.max.apply(null, arr) : 0;
  }
  /* 회차별 분석 — 두 방식(회차 내 정답 / 권말 정답 분할) 중 문항 수에 더 맞는 쪽을 채택 */
  function analyzeSets(text){
    var sets = splitSets(text);
    if(sets.length < 2) return [];
    var qn = sets.map(function(s2){ return countQuestions(s2.text); });

    /* 방식 A: 회차 텍스트 안에서 직접 분석 */
    var A = sets.map(function(s2, i){
      var a = analyze(s2.text);
      var pr = partRanges(s2.text);
      /* 정답이 충분히 인식되면 문항 수는 정답표 길이를 신뢰한다
         (문제면 번호가 영역마다 1부터 다시 시작하는 교재 대응) */
      if(a.count >= 5) qn[i] = a.max;
      return { no:s2.no, label:s2.label, key:a.key, count:a.count, max:a.max,
               explains:a.explains||{}, subj:a.subj||{}, subjCount:a.subjCount||0, qn:qn[i],
               parts:pr || null };
    });
    /* 방식 B: 전체 정답표를 회차별 문항 수로 분할 */
    var whole = analyze(text);
    var keys = (whole.key||'').split(' ').filter(function(v){ return v !== ''; });
    var B = [];
    if(keys.length){
      var pos = 0;
      for(var i=0;i<sets.length;i++){
        var take = qn[i] || Math.floor(keys.length/sets.length);
        if(i === sets.length-1) take = Math.max(0, keys.length - pos);
        if(take <= 0) continue;
        var slice = keys.slice(pos, pos+take), ex = {};
        Object.keys(whole.explains||{}).forEach(function(k){
          var n2 = +k; if(n2 > pos && n2 <= pos+take) ex[n2-pos] = whole.explains[k];
        });
        B.push({ no:sets[i].no, label:sets[i].label, key:slice.join(' '),
                 count:slice.filter(function(v){ return v && v!=='-'; }).length,
                 max:take, qn:qn[i], explains:ex, subj:{}, subjCount:0, split:true });
        pos += take;
      }
    }
    /* 문항 수와 정답 수가 가장 잘 맞는 방식 선택 */
    function score(list){
      if(!list || list.length < 2) return -1e9;
      var sc = 0;
      list.forEach(function(x){
        var q = x.qn || x.max || 0;
        if(!q) { sc -= 5; return; }
        sc -= Math.abs(q - x.count) * 2;       /* 문항 수와 정답 수 차이 */
        sc += Math.min(x.count, q) * 0.5;      /* 인식된 정답이 많을수록 가점 */
        sc += Object.keys(x.explains||{}).length * 0.2;
      });
      return sc;
    }
    var best = (score(A) >= score(B)) ? A : B;
    best = best.filter(function(x){ return x.count > 0; });
    if(best.length < 2) return [];
    best.forEach(function(x){
      x.found = true;
      x.complete = (x.qn ? (x.count >= x.qn) : true);      /* 정답이 전부 인식됐는지 */
      x.explainCount = Object.keys(x.explains||{}).length;
    });
    return best;
  }
  /* 문서 전체 텍스트에서 정답 구간을 찾아 분석 */
  function analyze(text){
    if(!text) return {key:'', count:0, explains:{}, found:false};
    var idx = -1;
    var head = /(정\s*답\s*(?:표|및\s*해설|과\s*해설)?|해\s*답\s*표?|모범\s*답안|Answer\s*Key)/i;
    var mm = head.exec(text);
    if(mm) idx = mm.index;
    var exp = parseExplicit(text);              /* 'NN. 정답 ③' 형태가 있으면 최우선 채택 */
    var zone = (idx >= 0) ? text.slice(idx) : text;
    var a = parseAnswers(zone);
    /* 정답 표기가 여러 곳에 있으면 가장 많이 찾은 구간을 채택 */
    if(idx >= 0){
      var alt = parseAnswers(zone.replace(/^[^\n]*\n/, ''));   /* 제목 줄 제외 */
      if(alt.count > a.count) a = alt;
    }
    if(!a.count && idx >= 0) a = parseAnswers(text);        /* 정답 구간에서 못 찾으면 전체 재시도 */
    var seq = parseSequential(text);                        /* 문항 뒤에 '정답 ②'가 붙는 교재 */
    var useSeq = seq.count > a.count;
    var best = useSeq ? seq : a;
    if(exp && exp.count >= Math.max(3, best.count)){ best = exp; useSeq = false; }
    var ex = parseExplains(zone);
    if(useSeq){ Object.keys(seq.explains||{}).forEach(function(k){ if(!ex[k]) ex[k] = seq.explains[k]; }); }
    if(exp && best === exp){ Object.keys(exp.explains||{}).forEach(function(k){ ex[k] = exp.explains[k]; }); }
    Object.keys(ex).forEach(function(k){ var v = tidyExplain(ex[k]); if(v && v.length >= 4) ex[k] = v; else delete ex[k]; });
    /* 주관식: 정답 구간을 찾았고 순차매칭이 주력이 아닐 때만 (문제 본문 오인식 방지) */
    var sub = (idx >= 0 && !useSeq) ? parseSubjective(zone, best.pairs, best.max || 0) : {};
    return {key:best.key, count:best.count, max:best.max||0, explains:ex, subj:sub,
            subjCount:Object.keys(sub).length,
            found:!!best.count || Object.keys(sub).length>0, zoneFound: idx>=0, mode: useSeq?'순차':'정답표'};
  }
  return {analyze:analyze, analyzeSets:analyzeSets, partRanges:partRanges, parseExplicit:parseExplicit, splitSets:splitSets, tidyExplain:tidyExplain,
          parseAnswers:parseAnswers, parseExplains:parseExplains, parseSubjective:parseSubjective, toNum:toNum};
})();
