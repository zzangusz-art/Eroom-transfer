/* ===================== 이룸편입 LMS · 오늘의 과제 자동 편성 ===================== */
/* 매일 학습한 내용을 손으로 정리해 사진으로 제출하는 과제를 자동으로 생성한다. */
var HW_POOL = {
  vocab: [
    ['오늘 배운 어휘 20개 백지 인출', '오늘 강의·단어 테스트에 나온 어휘 20개를 빈 종이에 영단어–뜻–동의어 순으로 직접 쓰고 사진으로 제출하세요.'],
    ['틀린 어휘 오답 카드 만들기', '오늘 틀린 어휘를 카드 형태로 정리하세요. 앞면에 영단어, 뒷면에 뜻·동의어·예문을 손으로 적어 사진으로 제출합니다.'],
    ['어근·접사 정리', '오늘 나온 단어 중 어근이나 접두사가 같은 단어를 묶어 손으로 정리하고 사진으로 제출하세요.'],
    ['영영 뜻풀이 옮겨 쓰기', '오늘 배운 어휘 10개를 골라 영어 뜻풀이와 예문을 직접 써 보고 사진으로 제출하세요.']
  ],
  grammar: [
    ['오늘 문법 포인트 백지 정리', '오늘 강의의 핵심 문법 규칙을 빈 종이에 예문과 함께 직접 쓰고 사진으로 제출하세요.'],
    ['오답 문장 다시 쓰기', '오늘 틀린 문법 문항의 문장을 바르게 고쳐 쓰고, 왜 틀렸는지 한 줄로 적어 사진으로 제출하세요.'],
    ['문법 규칙 3줄 요약', '오늘 배운 문법 규칙을 세 줄로 요약하고 각 규칙마다 예문을 하나씩 만들어 손으로 써서 제출하세요.'],
    ['비교·도치·가정법 예문 만들기', '오늘 배운 구문으로 직접 영작한 문장 5개를 손으로 쓰고 사진으로 제출하세요.']
  ],
  reading: [
    ['오늘 지문 한 문단 필사·요약', '오늘 독해 지문에서 핵심 문단을 골라 손으로 옮겨 쓰고, 아래에 한 줄 요약을 적어 사진으로 제출하세요.'],
    ['주제문·근거 표시하기', '오늘 지문의 주제문에 밑줄을 긋고 근거 문장을 번호로 표시한 뒤 사진으로 제출하세요.'],
    ['모르는 표현 정리', '오늘 지문에서 몰랐던 표현·구문을 손으로 정리하고 뜻을 적어 사진으로 제출하세요.'],
    ['지문 3줄 요약', '오늘 읽은 지문을 우리말 세 줄로 요약해 손으로 쓰고 사진으로 제출하세요.']
  ],
  logic: [
    ['연결어 관계 정리', '오늘 배운 연결어를 대조·인과·부연·예시로 분류해 손으로 표를 만들고 사진으로 제출하세요.'],
    ['오답 문항 논리 흐름 쓰기', '오늘 틀린 논리 문항의 앞뒤 문장 관계를 화살표로 그려 설명하고 사진으로 제출하세요.'],
    ['빈칸 근거 찾기', '오늘 푼 빈칸 문항에서 정답의 근거가 된 단서를 손으로 적어 제출하세요.'],
    ['연결어 넣어 영작하기', '오늘 배운 연결어를 사용해 문장 5개를 직접 만들어 손으로 쓰고 사진으로 제출하세요.']
  ],
  common: [
    ['오늘 배운 내용으로 문장 만들기', '오늘 강의에서 배운 표현·구문을 사용해 영어 문장 5개를 직접 만들고, 우리말 해석과 함께 손으로 써서 사진으로 제출하세요.'],
    ['오늘 학습 정리 노트', '오늘 공부한 내용을 한 페이지로 정리하세요. 배운 것·어려웠던 것·내일 할 것을 손으로 적어 사진으로 제출합니다.'],
    ['오답 총정리', '오늘 틀린 문항을 모아 문제·내 답·정답·이유를 손으로 정리해 사진으로 제출하세요.']
  ]
};
/* 그날 공개된 강의의 영역을 우선으로 과제 주제를 고른다 */
function hwSectionOf(ds, stu){
  try{
    if(typeof VOD === 'undefined') return null;
    var lecs = VOD.list(stu || (typeof myStu==='function'?myStu():null) || {});
    var todays = lecs.filter(function(l){ return l.openDate === ds; });
    if(!todays.length) return null;
    var cat = todays[0].category || todays[0].section || '';
    if(/vocab|어휘/.test(cat)) return 'vocab';
    if(/grammar|문법/.test(cat)) return 'grammar';
    if(/reading|독해/.test(cat)) return 'reading';
    if(/logic|논리/.test(cat)) return 'logic';
  }catch(e){}
  return null;
}
/* 날짜를 기준으로 매일 다른 주제를 뽑는다 (같은 날은 모든 학생이 동일) */
function hwTopicFor(ds, stu){
  ds = ds || todayStr();
  var y=+ds.slice(0,4), m=+ds.slice(5,7), d=+ds.slice(8,10);
  var days = Math.floor(Date.UTC(y, m-1, d)/86400000);
  var sec = hwSectionOf(ds, stu);
  var dow = dowOf(ds);
  if(!sec){ sec = ['common','vocab','grammar','reading','logic','common','common'][dow]; }
  var pool = HW_POOL[sec] || HW_POOL.common;
  var pick = pool[((days % pool.length) + pool.length) % pool.length];
  var secName = ({vocab:'어휘',grammar:'문법',reading:'독해',logic:'논리',common:'종합'})[sec] || '종합';
  return { section:sec, secName:secName, title:pick[0], desc:pick[1] };
}
/* 오늘 과제가 없으면 자동 생성 */
function ensureTodayAssignment(){
  var ds = todayStr();
  DB.assignments = DB.assignments || [];
  if(typeof isHoliday === 'function' && isHoliday(ds)) return null;   /* 공휴일은 과제 없음 */
  var exist = acf(DB.assignments).filter(function(a){ return a.date === ds; });
  if(exist.length) return exist[0];
  var t = hwTopicFor(ds);
  var item = { id: uid('hw'), date: ds, grp: 'all', auto: true,
               section: t.section, title: '[' + t.secName + '] ' + t.title, desc: t.desc,
               needPhoto: true, createdAt: ds };
  DB.assignments.push(item);
  save();
  return item;
}

/* 자동 출제된 과제의 제목·설명을 코드 원문으로 상시 복원 (날짜 기준 결정적이므로 재구성 가능) */
function repairAssignments(){
  var fixed = 0;
  (acf(DB.assignments)||[]).forEach(function(a){
    if(!a || !a.auto || !a.date) return;
    var t = hwTopicFor(a.date);
    var title = '[' + t.secName + '] ' + t.title;
    if(a.title !== title || a.desc !== t.desc){
      a.title = title; a.desc = t.desc; a.section = t.section; a.needPhoto = true; a._u = Date.now(); fixed++;
    }
  });
  if(fixed) save();
  return fixed;
}
