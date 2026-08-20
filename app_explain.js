/* ===================== 상세 해설 =====================
   문항 하나를 [정답 근거 · 보기 어휘 · 오답 정리 · 해석] 으로 풀어 보여줍니다.
   보기의 뜻은 단어장(WORDS 3,005개)과 숙어(IDIOMS 715개)에서 찾아 붙입니다. */

/* 단어 찾기 — 굴절형(-ed, -ing, -s …)도 원형으로 되돌려 찾습니다 */
var EX_WMAP = null;
function exWord(w){
  if(typeof WORDS==='undefined') return null;
  if(!EX_WMAP){
    EX_WMAP = {};
    for(var i=0;i<WORDS.length;i++) EX_WMAP[WORDS[i][0]] = WORDS[i];
  }
  var t = String(w||'').toLowerCase().replace(/[^a-z\- ]/g,'').trim();
  if(!t) return null;
  if(EX_WMAP[t]) return EX_WMAP[t];
  var tries = [
    t.replace(/ies$/,'y'), t.replace(/ies$/,'ie'), t.replace(/ied$/,'y'),
    t.replace(/(ches|shes|sses|xes|zes)$/,function(x){ return x.slice(0,-2); }),
    t.replace(/es$/,''), t.replace(/es$/,'e'), t.replace(/s$/,''),
    t.replace(/ed$/,''), t.replace(/ed$/,'e'),
    t.replace(/ing$/,''), t.replace(/ing$/,'e'),
    t.replace(/ly$/,''), t.replace(/ily$/,'y'),
    t.replace(/ness$/,''), t.replace(/ment$/,''), t.replace(/tion$/,'te'), t.replace(/ation$/,'ate'),
    t.replace(/([a-z])\1(ed|ing)$/,'$1')
  ];
  for(var k=0;k<tries.length;k++){ if(tries[k] && EX_WMAP[tries[k]]) return EX_WMAP[tries[k]]; }
  return null;
}
function exIdiom(p){
  if(typeof IDIOMS==='undefined') return null;
  var t = String(p||'').toLowerCase().trim();
  for(var i=0;i<IDIOMS.length;i++) if(IDIOMS[i][0]===t) return IDIOMS[i];
  return null;
}
/* 연결어 뜻 — 논리 문항 보기 풀이에 씁니다 */
var EX_LINK = {
  'however':'그러나 (대조)','nevertheless':'그럼에도 (대조)','nonetheless':'그럼에도 (대조)',
  'in contrast':'이와 대조적으로 (대조)','on the contrary':'오히려 (대조)','conversely':'반대로 (대조)',
  'yet':'그렇지만 (대조)','instead':'대신에 (대조)','on the other hand':'반면에 (대조)',
  'moreover':'게다가 (부연)','in addition':'게다가 (부연)','furthermore':'더욱이 (부연)',
  'besides':'게다가 (부연)','what is more':'더욱이 (부연)','also':'또한 (부연)','likewise':'마찬가지로 (부연)',
  'therefore':'그러므로 (결과)','thus':'따라서 (결과)','consequently':'결과적으로 (결과)',
  'as a result':'그 결과 (결과)','hence':'따라서 (결과)','accordingly':'그에 따라 (결과)',
  'because of this':'이 때문에 (인과)','owing to this':'이 때문에 (인과)','for this reason':'이런 이유로 (인과)',
  'since':'~이므로 (인과)','as':'~이므로 (인과)',
  'for example':'예를 들어 (예시)','for instance':'예를 들어 (예시)','to illustrate':'예를 들자면 (예시)',
  'namely':'즉 (예시)','specifically':'구체적으로 (예시)',
  'although':'비록 ~이지만 (양보)','even so':'그렇다 해도 (양보)','granted':'물론 (양보)',
  'admittedly':'인정하건대 (양보)','in spite of this':'이에도 불구하고 (양보)',
  'in short':'요컨대 (요약)','in sum':'요약하면 (요약)','to summarize':'정리하면 (요약)',
  'all in all':'대체로 (요약)','in conclusion':'결론적으로 (요약)','meanwhile':'한편 (전환)','similarly':'비슷하게 (부연)'
};
function exPos(p){ return {v:'v.', n:'n.', adj:'a.', adv:'ad.'}[p] || ''; }
function exPosKo(p){ return {v:'동사', n:'명사', adj:'형용사', adv:'부사'}[p] || ''; }

/* 보기 하나의 뜻 풀이 — "sluggish a. 게으른, 동작이 느린" */
function exGloss(opt){
  var s = String(opt||'').trim();
  if(!s) return null;
  var lk = EX_LINK[s.toLowerCase()];
  if(lk) return { w:s, pos:'', ko:lk, from:'연결어' };
  var id = exIdiom(s);
  if(id) return { w:s, pos:'', ko:id[1], from:'숙어' };
  var w = exWord(s);
  if(w) return { w:s, pos:exPos(w[1]), ko:w[2], from:'단어장' };
  /* 여러 단어면 각각 찾아 붙입니다 */
  var parts = s.split(/\s+/).filter(Boolean);
  if(parts.length>1 && parts.length<=4){
    var got = parts.map(exWord).filter(Boolean);
    if(got.length === parts.length){
      return { w:s, pos:'', ko:got.map(function(x){ return x[2]; }).join(' + '), from:'조합' };
    }
  }
  return null;
}
/* 보기 전부의 뜻을 모읍니다 */
function exGlossAll(q){
  return (q.options||[]).map(function(o, i){
    var g = exGloss(o);
    return { i:i, text:o, gloss:g, correct:(i===q.answer) };
  });
}
/* 발문에서 묻는 대상(밑줄 단어·빈칸 앞뒤)을 뽑습니다 */
function exHeadword(q){
  var st = String(q.stem||'');
  var m = /\[([A-Za-z][A-Za-z\-' ]*)\]/.exec(st);
  if(m) return m[1].trim();
  m = /<b>([^<]+)<\/b>/.exec(st);
  if(m) return m[1].trim();
  var ex = String(q.explanation||q.explain||'');
  m = /표제어\s+([A-Za-z][A-Za-z\-]{2,17})/.exec(ex);
  if(m) return m[1].trim();
  m = /^\s*([A-Za-z][A-Za-z\-]{2,17})\s*\((?:v|n|adj|adv)\.\)/.exec(ex);
  if(m) return m[1].trim();
  m = /([A-Za-z][A-Za-z\-]{2,17})\s*\((?:v|n|adj|adv)\.\)\s*=/.exec(ex);
  if(m) return m[1].trim();
  /* 발문에서 단어장에 있는 어려운 단어를 찾습니다 (정답 보기는 제외) */
  var right = String((q.options||[])[q.answer]||'').toLowerCase();
  var toks = st.toLowerCase().match(/[a-z]{5,18}/g) || [];
  for(var i=0;i<toks.length;i++){
    if(toks[i]===right) continue;
    var w0 = exWord(toks[i]);
    if(w0 && w0[3]>=2) return w0[0];
  }
  return '';
}
/* 기존 해설에서 한국어 해석 문장을 뽑아냅니다 */
function exTranslation(q){
  var t = String(q.explanation || q.explain || '');
  var m = /해석\s*[:：]\s*([^\n]+)/.exec(t);
  if(m) return m[1].trim();
  return '';
}
/* 영역·유형별 접근법 한 줄 */
function exApproach(q){
  var sec = q.section, tag = String(q.tag||q.sub||'');
  if(sec==='vocab'){
    if(tag.indexOf('숙어')>=0) return '숙어는 한 단어 동사로 바꿔 쓸 수 있는지를 먼저 봅니다. 구성 단어의 뜻을 더해 짐작하면 틀리기 쉽습니다.';
    if(/빈칸|바꾸어/.test(q.stem||'')) return '빈칸 앞뒤의 어조(긍정·부정)와 연결어를 먼저 보고, 방향이 맞는 보기부터 남깁니다.';
    return '밑줄 친 단어의 뜻을 먼저 확정한 뒤, 같은 의미장에 있는 보기를 찾습니다. 뜻을 모르면 어근·접두사로 방향(긍정·부정)만이라도 잡습니다.';
  }
  if(sec==='grammar') return '무엇을 묻는 포인트인지(수일치·시제·태·관계사·병렬 등) 먼저 규정하고, 그 포인트만 대조합니다. 문장 전체를 해석하지 않아도 풀립니다.';
  if(sec==='logic')   return '빈칸 앞뒤 두 문장의 관계(대조·인과·부연·예시)를 규정한 뒤, 그 관계를 나타내는 연결어만 남깁니다.';
  if(sec==='reading'){
    if(tag.indexOf('주제')>=0) return '글 전체를 포괄하는 한 문장을 고릅니다. 지문의 한 부분만 말하거나(지엽적) 지문을 넘어서는(과대) 보기는 오답입니다.';
    if(tag.indexOf('세부')>=0) return '보기의 핵심어를 지문에서 찾아 하나씩 대조합니다. 지문에 없는 말이 섞이면 오답입니다.';
    if(tag.indexOf('추론')>=0) return '지문에 직접 없지만 근거 문장에서 반드시 도출되는 것을 고릅니다. 근거 문장을 짚을 수 없으면 오답입니다.';
    if(tag.indexOf('어휘')>=0) return '사전적 뜻이 아니라 그 문장에서의 의미로 판단합니다. 해당 단어를 가리고 빈칸으로 보면 쉬워집니다.';
    return '문제를 먼저 읽고 무엇을 찾을지 정한 뒤 지문을 봅니다.';
  }
  return '';
}
/* 정답 근거 문장 만들기 */
function exReason(q){
  var head = exHeadword(q);
  var right = (q.options||[])[q.answer];
  var rg = exGloss(right);
  var hg = head ? exGloss(head) : null;
  if(q.section==='vocab' && head && rg){
    if(hg) return head + '(' + hg.ko + ')와 ' + right + '(' + rg.ko + ')는 뜻이 같은 계열입니다. 나머지 보기는 의미 방향이 달라 바꿔 쓸 수 없습니다.';
    return '밑줄 친 ' + head + ' 를 대체할 수 있는 것은 ' + right + '(' + rg.ko + ') 입니다.';
  }
  if(q.section==='logic' && rg){
    var rel = /\(([^)]+)\)/.exec(rg.ko);
    return '앞뒤 문장의 관계는 ' + (rel? rel[1] : (q.tag||q.sub||'연결')) + ' 입니다. 그래서 ' + right + '(' + rg.ko.replace(/\s*\([^)]*\)/,'') + ')가 알맞습니다. 관계를 먼저 규정하면 나머지 연결어는 자동으로 걸러집니다.';
  }
  if(rg) return '정답은 ' + right + '(' + rg.ko + ') 입니다.';
  return right ? ('정답은 ' + right + ' 입니다.') : '';
}
/* 오답이 왜 틀렸는지 */
function exWrongNote(q){
  var list = exGlossAll(q).filter(function(x){ return !x.correct; });
  var withKo = list.filter(function(x){ return x.gloss; });
  if(!withKo.length) return '';
  return withKo.map(function(x){ return x.text + '(' + x.gloss.ko + ')'; }).join(' · ') + ' 는 문맥이 요구하는 의미와 방향이 다릅니다.';
}

/* ---------- 최종 HTML ---------- */
function qExplainHtml(q, picked){
  if(!q) return '';
  var base = String(q.explanation || q.explain || '').trim();
  var right = (q.options||[])[q.answer];
  var L = ['①','②','③','④','⑤'];
  var glosses = exGlossAll(q);
  var known = glosses.filter(function(x){ return x.gloss; });
  var head = exHeadword(q);
  var hg = head ? exGloss(head) : null;
  var trans = exTranslation(q);

  var h = '<div class="ex-box">';
  /* 1. 정답 */
  h += '<div class="ex-row ex-ans"><span class="ex-k">정답</span>'
     + '<span>' + (L[q.answer]||'') + ' <b>' + esc(right||'') + '</b>'
     + (hg ? (' <span class="ex-sub">— ' + esc(head) + ' ' + esc(hg.pos) + ' ' + esc(hg.ko) + '</span>') : '')
     + '</span></div>';
  /* 2. 내가 고른 답 */
  if(picked!=null && picked!==q.answer && (q.options||[])[picked]!=null){
    var pg = exGloss(q.options[picked]);
    h += '<div class="ex-row ex-my"><span class="ex-k">내 답</span><span>'
       + (L[picked]||'') + ' ' + esc(q.options[picked])
       + (pg ? (' <span class="ex-sub">' + esc(pg.pos) + ' ' + esc(pg.ko) + '</span>') : '')
       + ' — 문맥이 요구하는 뜻과 다릅니다.</span></div>';
  }
  /* 3. 정답 근거 */
  var reason = exReason(q);
  if(reason) h += '<div class="ex-row"><span class="ex-k">근거</span><span>' + esc(reason) + '</span></div>';
  /* 4. 교재 해설 (있으면 그대로) */
  if(base){
    var clean = base.replace(/^정답\s*[①-⑤]?\s*/,'').trim();
    h += '<div class="ex-row"><span class="ex-k">풀이</span><span>' + esc(clean) + '</span></div>';
  }
  /* 5. 보기 어휘 정리 */
  if(known.length){
    h += '<div class="ex-row"><span class="ex-k">어휘</span><span class="ex-voca">'
       + (hg ? '<em class="ex-hw">' + esc(head) + ' <i>' + esc(hg.pos) + '</i> ' + esc(hg.ko) + '</em>' : '')
       + known.map(function(x){
           return '<em' + (x.correct?' class="on"':'') + '>' + esc(x.text)
                + ' <i>' + esc(x.gloss.pos) + '</i> ' + esc(x.gloss.ko) + '</em>';
         }).join('')
       + '</span></div>';
  }
  /* 6. 오답 정리 */
  var wn = exWrongNote(q);
  if(wn && q.section!=='reading') h += '<div class="ex-row"><span class="ex-k">오답</span><span>' + esc(wn) + '</span></div>';
  /* 7. 접근법 */
  var ap = exApproach(q);
  if(ap) h += '<div class="ex-row ex-tip"><span class="ex-k">푸는 법</span><span>' + esc(ap) + '</span></div>';
  /* 8. 해석 */
  if(trans) h += '<div class="ex-row"><span class="ex-k">해석</span><span>' + esc(trans) + '</span></div>';
  h += '</div>';
  return h;
}
/* 글자만 필요한 곳(복사·문자 발송 등) */
function qExplainText(q, picked){
  var d = document.createElement('div');
  d.innerHTML = qExplainHtml(q, picked);
  return (d.textContent||'').replace(/\s{2,}/g,' ').trim();
}


/* 업로드한 시험지의 해설 문자열을 항목별로 나눠 보여줍니다 (문항 객체가 없는 경우) */
function exPaperHtml(text, my, ans){
  var t = String(text||'').trim();
  if(!t) return '';
  var rows = [];
  /* '정답 근거:' '오답 정리:' 같은 표시가 있으면 나눠 담습니다 */
  var m;
  var work = t.replace(/^정답\s*[①-⑤]?\s*/,'').trim();
  var pat = [['정답 근거','근거'],['오답 정리','오답'],['해석','해석'],['어휘','어휘'],['포인트','포인트']];
  var used = false, seen = {};
  pat.forEach(function(p0){
    if(seen[p0[1]]) return;
    var re = new RegExp(p0[0]+'\\s*[:：]\\s*([^]*?)(?=(?:정답 근거|오답 정리|해석|어휘|포인트)\\s*[:：]|$)');
    var mm = re.exec(work);
    if(mm && mm[1].trim()){ rows.push([p0[1], mm[1].trim()]); seen[p0[1]]=1; used = true; }
  });
  var h = '<div class="ex-box">';
  if(my!=null || ans!=null){
    h += '<div class="ex-row ex-ans"><span class="ex-k">정답</span><span><b>'+esc(String(ans==null?'':ans))+'</b>'
       + (my!=null && String(my)!==String(ans) ? ' <span class="ex-sub">내 답 '+esc(String(my))+'</span>' : '')
       + '</span></div>';
  }
  if(used){
    var lead = work.split(/정답 근거|오답 정리|해석\s*[:：]|어휘\s*[:：]/)[0].trim();
    if(lead && lead.length>3) h += '<div class="ex-row"><span class="ex-k">풀이</span><span>'+esc(lead)+'</span></div>';
    rows.forEach(function(r){ h += '<div class="ex-row"><span class="ex-k">'+r[0]+'</span><span>'+esc(r[1])+'</span></div>'; });
  } else {
    /* 구분 표시가 없으면 문장 단위로 끊어 읽기 쉽게 만듭니다 */
    var sents = work.replace(/([.。!?])\s+/g,'$1\u0001').split(/\u0001|\n+/).filter(function(x){ return x.trim(); });
    h += '<div class="ex-row"><span class="ex-k">풀이</span><span>'
       + (sents.length>1 ? sents.map(function(x){ return '<span class="ex-s">'+esc(x.trim())+'</span>'; }).join('') : esc(work))
       + '</span></div>';
  }
  h += '</div>';
  return h;
}
