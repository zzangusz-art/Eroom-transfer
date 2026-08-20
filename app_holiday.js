/* ===================== 이룸편입 LMS · 대한민국 공휴일 ===================== */
/* 음력 기준 명절은 연도별 표(한국천문연구원 월력요항 기준), 양력 공휴일은 규칙 계산.
   제헌절(7/17)은 2026년부터 공휴일로 재지정되어 반영. */
var LUNAR_HOLIDAYS = {
  2026:{ seol:'2026-02-17', buddha:'2026-05-24', chuseok:'2026-09-25' },
  2027:{ seol:'2027-02-07', buddha:'2027-05-13', chuseok:'2027-09-15' },
  2028:{ seol:'2028-01-27', buddha:'2028-05-02', chuseok:'2028-10-03' },
  2029:{ seol:'2029-02-13', buddha:'2029-05-20', chuseok:'2029-09-22' },
  2030:{ seol:'2030-02-03', buddha:'2030-05-09', chuseok:'2030-09-12' },
  2031:{ seol:'2031-01-23', buddha:'2031-05-28', chuseok:'2031-10-01' },
  2032:{ seol:'2032-02-11', buddha:'2032-05-16', chuseok:'2032-09-19' }
};
var HOL_CACHE = {};

function holidaysOf(year){
  year = +year;
  if(HOL_CACHE[year]) return HOL_CACHE[year];
  var H = {};   /* 'YYYY-MM-DD' -> {name, sub, noSub, nam} */
  function add(ds, name, opt){
    opt = opt || {};
    if(!ds) return;
    if(H[ds]){                                   /* 같은 날 중복(예: 추석과 개천절) */
      if(H[ds].name.indexOf(name) < 0) H[ds].name += ' · ' + name;
      if(opt.nam) H[ds].nam = true;
      H[ds].dup = true;
      return;
    }
    H[ds] = {name:name, sub:!!opt.sub, noSub:!!opt.noSub, nam:!!opt.nam};
  }

  /* 양력 고정 공휴일 */
  add(year+'-01-01','신정',{noSub:true});
  add(year+'-03-01','삼일절');
  add(year+'-05-05','어린이날');
  add(year+'-06-06','현충일',{noSub:true});
  if(year >= 2026) add(year+'-07-17','제헌절');
  add(year+'-08-15','광복절');
  add(year+'-10-03','개천절');
  add(year+'-10-09','한글날');
  add(year+'-12-25','성탄절');

  /* 음력 명절(설날·추석 3일 · 부처님오신날) */
  var L = LUNAR_HOLIDAYS[year], namDays = [];
  if(L){
    if(L.buddha) add(L.buddha,'부처님오신날');
    ['seol','chuseok'].forEach(function(k){
      var base = L[k]; if(!base) return;
      var nm = (k === 'seol') ? '설날' : '추석';
      [[-1, nm + ' 연휴'], [0, nm], [1, nm + ' 연휴']].forEach(function(x){
        var ds = addDays(x[0], base);
        namDays.push({ds:ds, nm:nm});
        add(ds, x[1], {nam:true});
      });
    });
  }

  /* 대체공휴일 계산 */
  function nextFree(ds){
    var n = addDays(1, ds), g = 0;
    while(g++ < 12){
      if(!H[n] && dowOf(n) !== 0 && dowOf(n) !== 6) return n;
      n = addDays(1, n);
    }
    return null;
  }
  var subs = [];
  /* 1) 설·추석 연휴: 일요일 또는 다른 공휴일과 겹칠 때 */
  namDays.forEach(function(x){
    var h = H[x.ds]; if(!h) return;
    if(dowOf(x.ds) === 0 || h.dup) subs.push({from:x.ds, name:x.nm});
  });
  /* 2) 그 밖의 공휴일: 토·일과 겹칠 때 (신정·현충일 제외) */
  Object.keys(H).sort().forEach(function(ds){
    var h = H[ds]; if(h.sub || h.noSub || h.nam) return;
    var w = dowOf(ds);
    if(w === 0 || w === 6) subs.push({from:ds, name:h.name});
  });
  subs.sort(function(a,b){ return a.from.localeCompare(b.from); });
  subs.forEach(function(x){
    var n = nextFree(x.from);
    if(n) H[n] = {name:x.name + ' 대체공휴일', sub:true};
  });

  HOL_CACHE[year] = H;
  return H;
}
function isHoliday(ds){ var H = holidaysOf(+ds.slice(0,4)); return H[ds] || null; }
function holidayName(ds){ var h = isHoliday(ds); return h ? h.name : ''; }
/* 휴일(주말 포함) 여부 — 루틴 편성에서 제외할 때 사용 */
function isOffDay(ds){ var w = dowOf(ds); return w === 0 || w === 6 || !!isHoliday(ds); }
