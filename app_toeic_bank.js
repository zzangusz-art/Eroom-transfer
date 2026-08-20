/* ===================== 이룸토익 LMS · 문제은행 =====================
   문항 스키마
   { id, part(1~7), type(세부 유형), level(1~3), setId(세트 문항일 때),
     img(사진 URL · Part1), audio(음원 URL), script(LC 스크립트),
     stem, options[], answer(0-based), explanation, src }
   세트 스키마 (Part 3·4·6·7)
   { id, part, title, audio, script, passage, kind }
   ==================================================================== */

const TO_SRC = '이룸토익 문제은행';

/* ---------------- 기본 세트 (지문 · 담화) ---------------- */
const TO_SETS_SEED = [
/* ===== Part 3 ===== */
{id:'s3a', part:3, title:'복사기 고장 문의', kind:'2인 대화', audio:'', script:
"W: Hi, I'm calling about the copier on the third floor. It keeps jamming every time we print more than ten pages.\n"+
"M: I'm sorry about that. Our technician is out on another call this morning, but I can send him over right after lunch.\n"+
"W: That works. Could you also bring extra toner? We're running low.\n"+
"M: Sure. I'll put a box on the service order."},
{id:'s3b', part:3, title:'출장 항공편 변경', kind:'2인 대화', audio:'', script:
"M: Sandra, did you hear the Chicago flight was moved to seven in the morning?\n"+
"W: Seven? That means we'd have to leave for the airport around five. Can we take the later one instead?\n"+
"M: The afternoon flight is fully booked. I already checked twice.\n"+
"W: Then let's book a hotel near the airport for the night before. I'll ask Accounting to approve it."},
{id:'s3c', part:3, title:'신제품 출시 회의', kind:'3인 대화', audio:'', script:
"W1: Before we launch, we still need the packaging design approved.\n"+
"M: The design team said they'd have it ready by Thursday.\n"+
"W2: Thursday is too late. The printer needs the files by Wednesday noon.\n"+
"M: Then I'll ask them to send a draft tomorrow so we can review it early."},
{id:'s3d', part:3, title:'사무실 이전 안내', kind:'2인 대화', audio:'', script:
"M: Have you packed up your desk yet? The movers come on Friday.\n"+
"W: Not yet. I've been finishing the quarterly report. I'll do it Thursday evening.\n"+
"M: Just remember to label every box with your name and the new room number.\n"+
"W: Good point. Where do I get the labels?\n"+
"M: There's a stack in the supply room, next to the printer paper."},
/* ===== Part 4 ===== */
{id:'s4a', part:4, title:'상점 안내 방송', kind:'안내 방송', audio:'', script:
"Attention, shoppers. Our garden center will close thirty minutes earlier than usual today for seasonal restocking. "+
"If you're planning to buy plants or soil, please head to aisle twelve before four thirty. "+
"Members who spend over fifty dollars today will receive a coupon for ten percent off their next purchase. "+
"Thank you for shopping with us."},
{id:'s4b', part:4, title:'음성 메시지', kind:'전화 메시지', audio:'', script:
"Hello, this is Daniel Ortiz from Brightway Consulting. I'm calling about the workshop scheduled for next Tuesday. "+
"Unfortunately the meeting room we reserved is under repair, so we've moved the session to the conference center on Elm Street. "+
"The start time hasn't changed. Please let your team know, and call me back if you need directions."},
{id:'s4c', part:4, title:'사내 교육 소개', kind:'발표', audio:'', script:
"Good morning, everyone. Today's session covers the new expense reporting system. "+
"Starting next month, all receipts must be uploaded through the mobile app instead of being submitted on paper. "+
"The app will automatically match each receipt to your corporate card statement. "+
"After the demonstration, I'll hand out a short guide, and you'll have time to install the app on your own phone."},
{id:'s4d', part:4, title:'라디오 교통 방송', kind:'방송', audio:'', script:
"You're listening to the morning traffic update. Construction on Route 9 has closed two lanes near the river bridge, "+
"and drivers are reporting delays of about twenty minutes. If you're heading downtown, take Maple Avenue instead. "+
"The city says the work should be finished by the end of the week. We'll have another update at the top of the hour."},
/* ===== Part 6 ===== */
{id:'s6a', part:6, title:'사내 공지 — 주차장 공사', kind:'공지', passage:
"NOTICE TO ALL EMPLOYEES\n\n"+
"The north parking lot will be resurfaced from May 6 to May 10. During this period the lot will be ______(1).\n"+
"Employees who normally park there should use the visitor lot on Cedar Street ______(2).\n"+
"We understand this may add a few minutes to your morning commute. ______(3)\n"+
"Thank you for your ______(4) while we complete this work."},
{id:'s6b', part:6, title:'이메일 — 주문 지연 안내', kind:'이메일', passage:
"Dear Ms. Feldman,\n\n"+
"Thank you for your order of twelve office chairs placed on March 2. "+
"We regret to inform you that the delivery will be ______(1) by approximately one week because our supplier's warehouse was temporarily closed.\n"+
"______(2) We have upgraded your shipping to express at no additional cost.\n"+
"If this new schedule does not ______(3) your needs, please contact us and we will arrange a full refund.\n"+
"We ______(4) your patience.\n\nSincerely,\nRoy Lambert, Customer Service"},
{id:'s6c', part:6, title:'광고 — 회원 모집', kind:'광고', passage:
"JOIN RIVERSIDE FITNESS TODAY\n\n"+
"For a limited time, new members can sign up with no registration fee — a savings of forty dollars. "+
"Our newly ______(1) facility includes a heated pool, twenty group classes each week, and a rooftop track.\n"+
"______(2) Personal training sessions are available at a discount for members who join before June 1.\n"+
"Stop by the front desk for a free tour, ______(3) call us at 555-0147.\n"+
"We look forward to ______(4) you."},
/* ===== Part 7 ===== */
{id:'s7a', part:7, title:'단일 지문 — 채용 공고', kind:'단일', passage:
"CITY LIBRARY — PART-TIME POSITION\n\n"+
"The Northfield City Library is seeking a part-time Program Assistant to support our weekend children's reading events.\n\n"+
"Responsibilities: preparing materials, greeting families, and helping the Program Coordinator run two sessions each Saturday.\n"+
"Requirements: at least one year of experience working with children; availability every Saturday from 9 A.M. to 2 P.M.\n"+
"A library science degree is not required, but candidates enrolled in a related program are encouraged to apply.\n\n"+
"Hours: 10 per week. Pay: $18 per hour.\n"+
"To apply, send a résumé and a short cover letter to jobs@northfieldlib.org by April 18. "+
"Interviews will be held during the last week of April, and the selected candidate will begin on May 9."},
{id:'s7b', part:7, title:'단일 지문 — 사내 메모', kind:'단일', passage:
"MEMO\n\nTo: All Sales Staff\nFrom: Priya Raman, Director of Sales\nDate: 8 September\nSubject: New Client Database\n\n"+
"Beginning Monday, all client records will be kept in the new database system, Vantage. "+
"The old spreadsheets will remain available for reference until the end of the month, but they will no longer be updated.\n\n"+
"Please complete the one-hour online training before Friday. The link was sent to your work e-mail this morning. "+
"Anyone who has not finished the training by Friday will not be able to log in to Vantage on Monday.\n\n"+
"If you have trouble accessing the training, contact the IT help desk at extension 244 — not your team leader, "+
"since account issues can only be resolved by IT."},
{id:'s7c', part:7, title:'이중 지문 — 예약 확인과 이메일', kind:'이중', passage:
"[지문 1] CONFIRMATION — Harborview Conference Center\n\n"+
"Reservation #4471\nClient: Delmar Tech\nRoom: Sea Breeze Hall (capacity 120)\n"+
"Date: 14 October, 9:00 A.M. – 4:00 P.M.\nCatering: Lunch buffet for 90\nTotal: $3,150\n"+
"Note: Changes to guest counts must be made at least 7 days before the event.\n\n"+
"------------------------------\n\n"+
"[지문 2] E-mail\n\nTo: bookings@harborviewcc.com\nFrom: t.oyelaran@delmartech.com\nDate: 5 October\nSubject: Reservation #4471\n\n"+
"Hello,\n\nOur registration closed yesterday and we ended up with 108 confirmed attendees, "+
"which is more than we expected. Could we increase the lunch order accordingly?\n\n"+
"Also, our presenter will need a wireless microphone and a second projector screen. "+
"Please let me know whether these carry an extra charge.\n\nThank you,\nTayo Oyelaran"}
];

/* ---------------- 기본 문항 ---------------- */
const TO_Q_SEED = [
/* ================= Part 1 · 사진 묘사 ================= */
{id:'q101', part:1, type:'1인 사진', level:1, img:'', audio:'',
 script:"(A) She's typing on a keyboard.\n(B) She's hanging a picture on the wall.\n(C) She's putting on a jacket.\n(D) She's watering a plant.",
 photo:'책상 앞에 앉은 여성이 노트북 자판을 두드리고 있다',
 stem:'사진을 가장 알맞게 묘사한 것은?',
 options:["She's typing on a keyboard.","She's hanging a picture on the wall.","She's putting on a jacket.","She's watering a plant."],
 answer:0, explanation:'자판을 두드리는 동작이므로 (A). (C)의 put on 은 「입는 중」을 뜻해 이미 입고 있는 상태(wearing)와 구별해야 합니다.'},
{id:'q102', part:1, type:'2인 이상', level:2, img:'', audio:'',
 script:"(A) They're shaking hands.\n(B) They're facing each other across a table.\n(C) They're leaving the room.\n(D) They're stacking chairs.",
 photo:'두 사람이 회의 탁자를 사이에 두고 마주 앉아 서류를 보고 있다',
 stem:'사진을 가장 알맞게 묘사한 것은?',
 options:["They're shaking hands.","They're facing each other across a table.","They're leaving the room.","They're stacking chairs."],
 answer:1, explanation:'마주 앉은 위치 관계를 말한 (B). 악수(A)나 퇴장(C)은 사진에 없는 동작입니다.'},
{id:'q103', part:1, type:'사물·풍경', level:2, img:'', audio:'',
 script:"(A) Some boxes have been piled on a cart.\n(B) A truck is being loaded.\n(C) Merchandise is displayed on shelves.\n(D) A door has been left open.",
 photo:'창고 안 선반에 상품 상자들이 가지런히 진열되어 있고 사람은 없다',
 stem:'사진을 가장 알맞게 묘사한 것은?',
 options:["Some boxes have been piled on a cart.","A truck is being loaded.","Merchandise is displayed on shelves.","A door has been left open."],
 answer:2, explanation:'사람이 없는 사진에서 「is being + p.p.」(B)는 동작 주체가 필요해 대부분 오답입니다. 상태를 말한 (C)가 정답.'},
{id:'q104', part:1, type:'1인 사진', level:2, img:'', audio:'',
 script:"(A) He's repairing a bicycle.\n(B) He's riding along a path.\n(C) He's locking a gate.\n(D) He's carrying a helmet.",
 photo:'남성이 공원 길을 자전거로 달리고 있다',
 stem:'사진을 가장 알맞게 묘사한 것은?',
 options:["He's repairing a bicycle.","He's riding along a path.","He's locking a gate.","He's carrying a helmet."],
 answer:1, explanation:'자전거를 「타고 가는」 중이므로 (B). 헬멧은 쓰고 있으므로 carrying(들고 가다)이 아닙니다.'},
{id:'q105', part:1, type:'사물·풍경', level:3, img:'', audio:'',
 script:"(A) Chairs have been arranged in rows.\n(B) A speaker is addressing an audience.\n(C) Curtains are being drawn.\n(D) A stage is being assembled.",
 photo:'빈 강당에 의자가 줄지어 놓여 있다',
 stem:'사진을 가장 알맞게 묘사한 것은?',
 options:["Chairs have been arranged in rows.","A speaker is addressing an audience.","Curtains are being drawn.","A stage is being assembled."],
 answer:0, explanation:'사람이 없으므로 완료 수동태 have been arranged 로 상태를 말한 (A)가 정답입니다.'},
{id:'q106', part:1, type:'2인 이상', level:3, img:'', audio:'',
 script:"(A) They're removing their coats.\n(B) One of the men is pointing at a screen.\n(C) They're washing some dishes.\n(D) Papers are scattered on the floor.",
 photo:'세 사람이 서서 화면을 보고 있고 그중 한 명이 화면을 가리키고 있다',
 stem:'사진을 가장 알맞게 묘사한 것은?',
 options:["They're removing their coats.","One of the men is pointing at a screen.","They're washing some dishes.","Papers are scattered on the floor."],
 answer:1, explanation:'여러 명 중 한 명의 동작을 「One of the men」으로 집어 말하는 것은 Part 1 단골 정답 형태입니다.'},

/* ================= Part 2 · 질의 응답 (3지선다) ================= */
{id:'q201', part:2, type:'의문사 의문문', level:1, audio:'', script:"Where did you put the sales report?",
 stem:'Where did you put the sales report?',
 options:["On your desk, under the folder.","Yes, I finished it.","It was a good report."],
 answer:0, explanation:'Where 의문문에는 장소로 답합니다. Yes/No 로 답한 (B)는 의문사 의문문에서 항상 오답입니다.'},
{id:'q202', part:2, type:'의문사 의문문', level:1, audio:'', script:"When is the new branch opening?",
 stem:'When is the new branch opening?',
 options:["In the shopping district.","Sometime in early June.","About twenty employees."],
 answer:1, explanation:'When → 시점. (A)는 Where, (C)는 How many 에 대한 답입니다.'},
{id:'q203', part:2, type:'의문사 의문문', level:2, audio:'', script:"Who's leading the training session tomorrow?",
 stem:"Who's leading the training session tomorrow?",
 options:["It starts at nine.","Ms. Alvarez from HR.","In the second-floor room."],
 answer:1, explanation:'Who → 사람. 시각(A)·장소(C)는 각각 When·Where 의 답입니다.'},
{id:'q204', part:2, type:'의문사 의문문', level:2, audio:'', script:"Why was the shipment delayed?",
 stem:'Why was the shipment delayed?',
 options:["Because the warehouse was closed.","By express courier.","Three days ago."],
 answer:0, explanation:'Why → 이유(Because…). (B)는 How, (C)는 When 의 답입니다.'},
{id:'q205', part:2, type:'의문사 의문문', level:2, audio:'', script:"How long does the tour take?",
 stem:'How long does the tour take?',
 options:["About ninety minutes.","At the main entrance.","Twelve dollars per person."],
 answer:0, explanation:'How long → 소요 시간. 가격을 묻는 How much 와 헷갈리지 않아야 합니다.'},
{id:'q206', part:2, type:'의문사 의문문', level:3, audio:'', script:"Which supplier did we use for the packaging?",
 stem:'Which supplier did we use for the packaging?',
 options:["I'll check the invoice.","It arrived on Monday.","Yes, we did."],
 answer:0, explanation:'「모른다 · 확인해 보겠다」류의 우회 응답은 Part 2 정답으로 매우 자주 나옵니다.'},
{id:'q207', part:2, type:'일반 의문문', level:1, audio:'', script:"Did you send the invoice to the client?",
 stem:'Did you send the invoice to the client?',
 options:["Yes, this morning.","The client list is updated.","In the accounting office."],
 answer:0, explanation:'일반 의문문에는 Yes/No + 보충 설명이 자연스럽습니다.'},
{id:'q208', part:2, type:'일반 의문문', level:2, audio:'', script:"Are the samples ready to be shipped?",
 stem:'Are the samples ready to be shipped?',
 options:["A shipping label.","Not until Thursday.","She shipped it herself."],
 answer:1, explanation:'Yes/No 없이 시점으로 답한 우회 응답입니다. shipping/shipped 같은 유사 발음 오답에 주의하세요.'},
{id:'q209', part:2, type:'일반 의문문', level:2, audio:'', script:"Has the contract been reviewed by the legal team?",
 stem:'Has the contract been reviewed by the legal team?',
 options:["They're still working on it.","A two-year contract.","On the top shelf."],
 answer:0, explanation:'아직 진행 중임을 알리는 (A)가 자연스러운 응답입니다.'},
{id:'q210', part:2, type:'평서문·제안', level:2, audio:'', script:"Would you like me to reserve a table for lunch?",
 stem:'Would you like me to reserve a table for lunch?',
 options:["That would be great, thanks.","The table is too small.","I had lunch already yesterday."],
 answer:0, explanation:'제안 표현 Would you like me to ~ 에는 수락·거절로 답합니다.'},
{id:'q211', part:2, type:'평서문·제안', level:2, audio:'', script:"Why don't we move the meeting to Thursday?",
 stem:"Why don't we move the meeting to Thursday?",
 options:["Because I moved last month.","Let me check everyone's schedule.","The meeting room on the fifth floor."],
 answer:1, explanation:'Why don\'t we ~ 는 이유를 묻는 것이 아니라 제안입니다. Because 로 답한 (A)가 함정입니다.'},
{id:'q212', part:2, type:'평서문·제안', level:3, audio:'', script:"The printer in the copy room isn't working again.",
 stem:"The printer in the copy room isn't working again.",
 options:["I'll call maintenance right away.","Two hundred copies, please.","It's a color printer."],
 answer:0, explanation:'문제를 알리는 평서문에는 해결 행동을 제시하는 응답이 정답이 됩니다.'},
{id:'q213', part:2, type:'부정·부가 의문문', level:3, audio:'', script:"You've already submitted your time sheet, haven't you?",
 stem:"You've already submitted your time sheet, haven't you?",
 options:["It's due on Friday, isn't it?","A new sheet of paper.","He submitted his application."],
 answer:0, explanation:'되묻는 응답도 정답이 될 수 있습니다. 부가 의문문의 Yes/No 는 앞 문장 내용에 맞춰 판단합니다.'},
{id:'q214', part:2, type:'부정·부가 의문문', level:3, audio:'', script:"Isn't the new software supposed to be faster?",
 stem:"Isn't the new software supposed to be faster?",
 options:["Soft to the touch.","It is, once you restart your computer.","I bought it online."],
 answer:1, explanation:'부정 의문문이라도 내용이 맞으면 긍정으로 답합니다. soft/software 유사 발음 함정에 주의하세요.'},
{id:'q215', part:2, type:'의문사 의문문', level:3, audio:'', script:"What should we do about the extra chairs?",
 stem:'What should we do about the extra chairs?',
 options:["Store them in the back room.","They were quite comfortable.","About fifty guests."],
 answer:0, explanation:'What should we do ~ 에는 행동 제안으로 답합니다.'},
{id:'q216', part:2, type:'선택 의문문', level:3, audio:'', script:"Do you want the report printed in color or in black and white?",
 stem:'Do you want the report printed in color or in black and white?',
 options:["Whichever is cheaper.","Yes, please print it.","The report was long."],
 answer:0, explanation:'선택 의문문에는 Yes/No 로 답할 수 없습니다. 「어느 쪽이든」류의 응답이 자주 정답입니다.'},
{id:'q217', part:2, type:'일반 의문문', level:2, audio:'', script:"Could you help me carry these boxes upstairs?",
 stem:'Could you help me carry these boxes upstairs?',
 options:["Sure, just give me a minute.","On the second floor.","They're quite heavy, aren't they?"],
 answer:0, explanation:'요청에는 수락·거절이 정답입니다. (C)는 그럴듯하지만 도움 요청에 대한 응답이 아닙니다.'},
{id:'q218', part:2, type:'의문사 의문문', level:2, audio:'', script:"How did the client respond to our proposal?",
 stem:'How did the client respond to our proposal?',
 options:["By e-mail this morning.","They asked for a lower price.","At the client's office."],
 answer:1, explanation:'How 가 「반응이 어땠는지」를 묻고 있으므로 반응 내용을 말한 (B)가 정답입니다. 수단(A)은 함정입니다.'},
{id:'q219', part:2, type:'평서문·제안', level:3, audio:'', script:"I thought the workshop was scheduled for next week.",
 stem:'I thought the workshop was scheduled for next week.',
 options:["It was moved up to this Friday.","A three-hour workshop.","Yes, I attended it."],
 answer:0, explanation:'「~인 줄 알았다」는 정보 확인 요청입니다. 바뀐 사실을 알려 주는 (A)가 정답.'},
{id:'q220', part:2, type:'의문사 의문문', level:2, audio:'', script:"Where can I find the employee handbook?",
 stem:'Where can I find the employee handbook?',
 options:["It's on the company intranet.","Last year's edition.","Because it was updated."],
 answer:0, explanation:'Where 에 대한 장소 응답. 요즘은 물리적 장소 대신 「웹사이트·인트라넷」으로 답하는 경우가 많습니다.'},

/* ================= Part 3 · 짧은 대화 ================= */
{id:'q301', part:3, setId:'s3a', type:'주제·목적', level:1,
 stem:'What is the problem?', options:['A machine keeps malfunctioning.','A delivery has not arrived.','An employee is absent.','A room is too small.'],
 answer:0, explanation:'첫 대사 「keeps jamming」에서 복사기 고장을 알 수 있습니다.'},
{id:'q302', part:3, setId:'s3a', type:'다음 행동', level:2,
 stem:'When will the technician visit?', options:['Immediately','This morning','After lunch','Tomorrow'],
 answer:2, explanation:'「right after lunch」 — 점심 직후에 보내겠다고 했습니다.'},
{id:'q303', part:3, setId:'s3a', type:'세부 사항', level:2,
 stem:'What does the woman additionally request?', options:['A replacement machine','Extra toner','A written estimate','A user manual'],
 answer:1, explanation:'「Could you also bring extra toner?」 에서 토너를 추가 요청했습니다.'},
{id:'q304', part:3, setId:'s3b', type:'주제·목적', level:2,
 stem:'What are the speakers mainly discussing?', options:['A canceled meeting','A change to a flight schedule','A hotel complaint','A new travel policy'],
 answer:1, explanation:'항공편이 오전 7시로 앞당겨진 것이 대화의 중심입니다.'},
{id:'q305', part:3, setId:'s3b', type:'세부 사항', level:2,
 stem:'Why can\'t the speakers take the afternoon flight?', options:['It is too expensive.','It is fully booked.','It arrives too late.','It was canceled.'],
 answer:1, explanation:'「The afternoon flight is fully booked」 — 좌석이 없습니다.'},
{id:'q306', part:3, setId:'s3b', type:'다음 행동', level:3,
 stem:'What will the woman most likely do next?', options:['Contact the accounting department','Rebook the flight','Cancel the trip','Call the hotel manager'],
 answer:0, explanation:'「I\'ll ask Accounting to approve it」 — 회계팀에 승인을 요청하겠다고 했습니다.'},
{id:'q307', part:3, setId:'s3c', type:'주제·목적', level:2,
 stem:'What is the conversation mainly about?', options:['A product launch preparation','A budget reduction','A staff hiring plan','A customer complaint'],
 answer:0, explanation:'출시 전 포장 디자인 승인을 논의하고 있습니다.'},
{id:'q308', part:3, setId:'s3c', type:'세부 사항', level:2,
 stem:'What is the deadline mentioned by the second woman?', options:['Tuesday morning','Wednesday noon','Thursday','Friday afternoon'],
 answer:1, explanation:'「The printer needs the files by Wednesday noon」.'},
{id:'q309', part:3, setId:'s3c', type:'다음 행동', level:3,
 stem:'What does the man offer to do?', options:['Approve the design himself','Ask for an early draft','Hire another printer','Postpone the launch'],
 answer:1, explanation:'「I\'ll ask them to send a draft tomorrow」 — 초안을 미리 받겠다고 제안했습니다.'},
{id:'q310', part:3, setId:'s3d', type:'주제·목적', level:1,
 stem:'What event are the speakers preparing for?', options:['An office relocation','A company banquet','An audit','A product demonstration'],
 answer:0, explanation:'금요일에 이삿짐 업체가 온다는 내용에서 사무실 이전임을 알 수 있습니다.'},
{id:'q311', part:3, setId:'s3d', type:'의도 파악', level:3,
 stem:'Why does the woman say, "I\'ve been finishing the quarterly report"?', options:['To ask for help with a report','To explain why she has not packed','To request a deadline extension','To praise her team'],
 answer:1, explanation:'아직 짐을 싸지 못한 이유를 설명하는 말입니다. 의도 파악 문제는 앞 문장과 연결해서 봅니다.'},
{id:'q312', part:3, setId:'s3d', type:'세부 사항', level:2,
 stem:'Where can the woman get the labels?', options:['From the movers','In the supply room','At the front desk','From her manager'],
 answer:1, explanation:'「There\'s a stack in the supply room」.'},

/* ================= Part 4 · 짧은 담화 ================= */
{id:'q401', part:4, setId:'s4a', type:'화자·청자', level:1,
 stem:'Where is the announcement being made?', options:['At a garden store','At an airport','At a library','At a factory'],
 answer:0, explanation:'shoppers · garden center · aisle 에서 매장 안내 방송임을 알 수 있습니다.'},
{id:'q402', part:4, setId:'s4a', type:'세부 사항', level:2,
 stem:'Why will the garden center close early?', options:['For a private event','For seasonal restocking','Because of bad weather','For staff training'],
 answer:1, explanation:'「for seasonal restocking」 — 계절 상품 재입고 때문입니다.'},
{id:'q403', part:4, setId:'s4a', type:'세부 사항', level:2,
 stem:'What can members who spend over fifty dollars receive?', options:['A free plant','A discount coupon','Free delivery','A membership upgrade'],
 answer:1, explanation:'「a coupon for ten percent off their next purchase」.'},
{id:'q404', part:4, setId:'s4b', type:'주제·목적', level:1,
 stem:'What is the purpose of the message?', options:['To cancel a workshop','To announce a location change','To request payment','To confirm an order'],
 answer:1, explanation:'회의실 수리로 장소가 변경되었음을 알리는 메시지입니다.'},
{id:'q405', part:4, setId:'s4b', type:'세부 사항', level:2,
 stem:'What has NOT changed?', options:['The venue','The start time','The presenter','The topic'],
 answer:1, explanation:'「The start time hasn\'t changed」 — 시작 시각은 그대로입니다.'},
{id:'q406', part:4, setId:'s4b', type:'다음 행동', level:2,
 stem:'What does the speaker ask the listener to do?', options:['Reserve another room','Inform the team','Send a receipt','Postpone the session'],
 answer:1, explanation:'「Please let your team know」.'},
{id:'q407', part:4, setId:'s4c', type:'주제·목적', level:1,
 stem:'What is the session about?', options:['A new expense reporting system','A staff reorganization','A safety inspection','A sales campaign'],
 answer:0, explanation:'첫 문장에서 주제를 밝히고 있습니다.'},
{id:'q408', part:4, setId:'s4c', type:'세부 사항', level:2,
 stem:'What will employees no longer do?', options:['Use corporate cards','Submit paper receipts','Attend monthly meetings','Travel for work'],
 answer:1, explanation:'영수증을 종이로 제출하지 않고 앱으로 올린다고 했습니다.'},
{id:'q409', part:4, setId:'s4c', type:'다음 행동', level:2,
 stem:'What will listeners do after the demonstration?', options:['Take a test','Install an application','Sign a form','Leave for lunch'],
 answer:1, explanation:'「you\'ll have time to install the app on your own phone」.'},
{id:'q410', part:4, setId:'s4d', type:'화자·청자', level:1,
 stem:'Who most likely are the listeners?', options:['Construction workers','Drivers','Store owners','City officials'],
 answer:1, explanation:'교통 방송이므로 청취자는 운전자입니다.'},
{id:'q411', part:4, setId:'s4d', type:'세부 사항', level:2,
 stem:'What does the speaker recommend?', options:['Taking Maple Avenue','Leaving earlier','Using public transportation','Avoiding downtown'],
 answer:0, explanation:'「take Maple Avenue instead」.'},
{id:'q412', part:4, setId:'s4d', type:'세부 사항', level:2,
 stem:'When will the construction be completed?', options:['Today','By the end of the week','Next month','It was not mentioned'],
 answer:1, explanation:'「the work should be finished by the end of the week」.'},

/* ================= Part 5 · 단문 공란 ================= */
{id:'q501', part:5, type:'품사 자리', level:1, stem:'The manager gave a ______ explanation of the new procedure at the staff meeting.',
 options:['clear','clearly','clarity','clearness'], answer:0, explanation:'관사 a 와 명사 explanation 사이는 형용사 자리입니다.'},
{id:'q502', part:5, type:'품사 자리', level:1, stem:'All visitors must sign in ______ at the front desk before entering the building.',
 options:['promptness','prompt','promptly','prompted'], answer:2, explanation:'완전한 문장 뒤에서 동사 sign in 을 꾸미므로 부사 promptly.'},
{id:'q503', part:5, type:'품사 자리', level:2, stem:'The committee praised the ______ of the volunteers who organized the charity run.',
 options:['dedicate','dedicated','dedication','dedicatedly'], answer:2, explanation:'정관사 the 뒤 · 전치사 of 앞은 명사 자리입니다.'},
{id:'q504', part:5, type:'동사 시제·태', level:1, stem:'By the time the auditors arrive, the accounting team ______ all the required documents.',
 options:['prepares','will have prepared','is preparing','prepared'], answer:1, explanation:'By the time + 현재시제(미래 의미) → 주절은 미래완료.'},
{id:'q505', part:5, type:'동사 시제·태', level:2, stem:'The renovation of the lobby ______ next Monday and will continue for six weeks.',
 options:['begins','began','has begun','was begun'], answer:0, explanation:'next Monday 라는 미래 시점 — 확정된 일정은 현재시제로 미래를 나타냅니다.'},
{id:'q506', part:5, type:'동사 시제·태', level:2, stem:'Employees ______ to submit their vacation requests at least two weeks in advance.',
 options:['require','are required','requiring','have required'], answer:1, explanation:'직원이 「요구받는」 대상이므로 수동태 be required to.'},
{id:'q507', part:5, type:'동사 시제·태', level:3, stem:'The shipment ______ yesterday afternoon, but it has not reached the warehouse yet.',
 options:['has dispatched','was dispatched','dispatched','is dispatching'], answer:1, explanation:'yesterday 라는 명백한 과거 시점 + 수동 의미이므로 was dispatched.'},
{id:'q508', part:5, type:'수 일치', level:2, stem:'Each of the departments ______ its own budget report by the end of the quarter.',
 options:['submit','submits','submitting','are submitting'], answer:1, explanation:'Each of + 복수명사는 단수 취급 → submits.'},
{id:'q509', part:5, type:'수 일치', level:2, stem:'The number of applicants for the internship ______ increased sharply this year.',
 options:['have','has','having','are'], answer:1, explanation:'The number of ~ 는 단수(그 수), A number of ~ 는 복수(많은)입니다.'},
{id:'q510', part:5, type:'전치사', level:1, stem:'Please submit the completed form ______ Friday at the latest.',
 options:['until','by','during','since'], answer:1, explanation:'제출 같은 「완료 시점」에는 by, 상태 지속에는 until 을 씁니다.'},
{id:'q511', part:5, type:'전치사', level:2, stem:'The office will remain closed ______ the holiday weekend.',
 options:['while','throughout','whereas','among'], answer:1, explanation:'명사구 앞이므로 전치사 throughout. while·whereas 는 접속사입니다.'},
{id:'q512', part:5, type:'전치사', level:2, stem:'Ms. Tanaka has worked at the firm ______ more than fifteen years.',
 options:['since','for','from','in'], answer:1, explanation:'기간(더 이상 ~ 동안)에는 for, 시점에는 since 를 씁니다.'},
{id:'q513', part:5, type:'전치사', level:3, stem:'______ the sudden drop in demand, the factory maintained its production schedule.',
 options:['Despite','Although','Even though','However'], answer:0, explanation:'뒤가 명사구이므로 전치사 Despite. Although·Even though 는 절을 이끕니다.'},
{id:'q514', part:5, type:'접속사·관계사', level:2, stem:'The seminar was postponed ______ the speaker missed her connecting flight.',
 options:['because of','because','due to','owing to'], answer:1, explanation:'뒤에 「주어+동사」 절이 오므로 접속사 because.'},
{id:'q515', part:5, type:'접속사·관계사', level:2, stem:'We will announce the winner as soon as the judges ______ their evaluation.',
 options:['will finish','finish','finishing','finished'], answer:1, explanation:'시간 부사절에서는 미래를 현재시제로 씁니다.'},
{id:'q516', part:5, type:'접속사·관계사', level:3, stem:'The candidate ______ résumé impressed the hiring manager will be invited for a second interview.',
 options:['who','whose','which','whom'], answer:1, explanation:'뒤에 명사 résumé 가 바로 오므로 소유격 관계대명사 whose.'},
{id:'q517', part:5, type:'접속사·관계사', level:3, stem:'Please indicate ______ you would prefer the morning or the afternoon session.',
 options:['that','whether','which','what'], answer:1, explanation:'「~인지 아닌지」 + or 구조이므로 whether.'},
{id:'q518', part:5, type:'대명사', level:2, stem:'Team leaders should review the proposals ______ before forwarding them to the director.',
 options:['they','their','themselves','theirs'], answer:2, explanation:'주어를 강조하는 재귀대명사 themselves — 「직접」의 뜻입니다.'},
{id:'q519', part:5, type:'대명사', level:2, stem:'Although the two printers look alike, ______ has a much faster output speed.',
 options:['other','another','the other','others'], answer:2, explanation:'둘 중 나머지 하나를 가리키므로 the other.'},
{id:'q520', part:5, type:'어휘', level:1, stem:'The company offers a generous ______ package that includes health insurance and paid leave.',
 options:['benefit','benefited','beneficial','benefiting'], answer:0, explanation:'복합명사 benefit package — 명사가 명사를 꾸미는 형태입니다.'},
{id:'q521', part:5, type:'어휘', level:2, stem:'All maintenance requests should be ______ to the building supervisor.',
 options:['informed','addressed','notified','remarked'], answer:1, explanation:'be addressed to ~ : ~에게 보내지다·전달되다. inform·notify 는 사람을 목적어로 씁니다.'},
{id:'q522', part:5, type:'어휘', level:2, stem:'The new policy is ______ to reduce paper waste by half within a year.',
 options:['expected','expecting','expectant','expectation'], answer:0, explanation:'be expected to 동사원형 — 「~할 것으로 예상되다」.'},
{id:'q523', part:5, type:'어휘', level:2, stem:'Sales figures for the third quarter ______ our original forecast by nearly ten percent.',
 options:['exceeded','excelled','extended','exchanged'], answer:0, explanation:'exceed : (수치를) 넘어서다. by ~ 는 차이를 나타냅니다.'},
{id:'q524', part:5, type:'어휘', level:3, stem:'The consultant\'s recommendations were ______ practical and easy to implement.',
 options:['high','highly','height','heighten'], answer:1, explanation:'형용사 practical 을 꾸미므로 부사 highly. high 는 「높이」의 뜻입니다.'},
{id:'q525', part:5, type:'어휘', level:3, stem:'Access to the server room is ______ to authorized personnel only.',
 options:['restricted','restrained','reserved','retained'], answer:0, explanation:'be restricted to ~ : ~로 제한되다. reserved for 와 전치사가 다릅니다.'},
{id:'q526', part:5, type:'품사 자리', level:2, stem:'The technician resolved the network issue with remarkable ______.',
 options:['efficient','efficiently','efficiency','efficacious'], answer:2, explanation:'형용사 remarkable 뒤 · 전치사 with 다음은 명사 자리.'},
{id:'q527', part:5, type:'동사 시제·태', level:3, stem:'Had the manager known about the defect, she ______ the shipment.',
 options:['would delay','would have delayed','will delay','delayed'], answer:1, explanation:'Had + 주어 + p.p. 는 가정법 과거완료의 도치 → 주절은 would have p.p.'},
{id:'q528', part:5, type:'품사 자리', level:2, stem:'Applicants must provide ______ of their previous employment along with the application.',
 options:['prove','proven','proof','provable'], answer:2, explanation:'타동사 provide 의 목적어 자리 → 명사 proof.'},
{id:'q529', part:5, type:'전치사', level:2, stem:'The conference will be held ______ the Grandview Hotel on October 3.',
 options:['on','at','in','to'], answer:1, explanation:'특정 건물·지점에는 at, 날짜에는 on 을 씁니다.'},
{id:'q530', part:5, type:'어휘', level:2, stem:'Please ______ that all safety equipment is inspected before the shift begins.',
 options:['ensure','assure','insure','endure'], answer:0, explanation:'ensure that 절 : ~하도록 확실히 하다. assure 는 사람을 목적어로 씁니다.'},
{id:'q531', part:5, type:'접속사·관계사', level:2, stem:'______ the budget is approved, we can begin hiring additional staff.',
 options:['Once','Despite','In spite of','Therefore'], answer:0, explanation:'뒤에 절이 오고 「일단 ~하면」의 뜻이므로 접속사 Once.'},
{id:'q532', part:5, type:'수 일치', level:3, stem:'Neither the supervisor nor the technicians ______ available for the afternoon inspection.',
 options:['is','was','are','has been'], answer:2, explanation:'Neither A nor B 는 B(가까운 주어)에 수를 맞춥니다 → technicians → are.'},
{id:'q533', part:5, type:'품사 자리', level:3, stem:'The board approved the merger, ______ was announced to the press the following morning.',
 options:['it','that','which','what'], answer:2, explanation:'앞 절 전체를 받는 계속적 용법의 관계대명사 which.'},
{id:'q534', part:5, type:'어휘', level:2, stem:'Attendance at the orientation is ______ for all newly hired employees.',
 options:['mandatory','voluntary','optional','temporary'], answer:0, explanation:'신입 직원 전원 대상이므로 「의무적인」 mandatory.'},
{id:'q535', part:5, type:'어휘', level:3, stem:'The two departments worked in close ______ to complete the project ahead of schedule.',
 options:['collaborate','collaboration','collaborative','collaboratively'], answer:1, explanation:'형용사 close 뒤 명사 자리 → collaboration.'},
{id:'q536', part:5, type:'동사 시제·태', level:2, stem:'Since 2019, the firm ______ its overseas offices from three to eleven.',
 options:['expands','expanded','has expanded','will expand'], answer:2, explanation:'Since + 과거 시점 → 현재완료.'},
{id:'q537', part:5, type:'전치사', level:2, stem:'The keynote speech is scheduled ______ 9:30 A.M. on the first day.',
 options:['in','at','on','by'], answer:1, explanation:'구체적인 시각 앞에는 at.'},
{id:'q538', part:5, type:'어휘', level:2, stem:'Customers may return unused items ______ thirty days of purchase.',
 options:['during','within','among','through'], answer:1, explanation:'within + 기간 : ~ 이내에.'},
{id:'q539', part:5, type:'품사 자리', level:1, stem:'The updated manual provides ______ instructions for installing the software.',
 options:['detail','detailed','details','detailing'], answer:1, explanation:'명사 instructions 앞은 형용사(분사) 자리.'},
{id:'q540', part:5, type:'접속사·관계사', level:3, stem:'The renovation was completed ahead of schedule ______ the extra crew hired last month.',
 options:['thanks to','because','so that','even though'], answer:0, explanation:'뒤가 명사구이므로 전치사구 thanks to 가 알맞습니다. because · so that · even though 는 모두 「주어+동사」 절을 이끕니다.'},
{id:'q541', part:5, type:'대명사', level:2, stem:'If you have any questions about the invoice, please direct ______ to the billing department.',
 options:['they','them','their','theirs'], answer:1, explanation:'타동사 direct 의 목적어 → 목적격 them.'},
{id:'q542', part:5, type:'동사 시제·태', level:2, stem:'The equipment ______ regularly to prevent unexpected breakdowns.',
 options:['services','is serviced','has serviced','servicing'], answer:1, explanation:'장비가 「점검받는」 대상이므로 수동태.'},
{id:'q543', part:5, type:'접속사·관계사', level:2, stem:'The report explains ______ the company decided to relocate its headquarters.',
 options:['why','because','due to','so'], answer:0, explanation:'명사절을 이끄는 의문사 why. because 는 명사절 자리에 쓸 수 없습니다.'},
{id:'q544', part:5, type:'어휘', level:2, stem:'The hotel is conveniently ______ within walking distance of the convention center.',
 options:['located','locating','location','locate'], answer:0, explanation:'be located : 위치해 있다.'},
{id:'q545', part:5, type:'품사 자리', level:2, stem:'A ______ of the survey results will be distributed at tomorrow\'s meeting.',
 options:['summarize','summary','summarized','summarily'], answer:1, explanation:'관사 A 뒤 명사 자리 → summary.'},
{id:'q546', part:5, type:'어휘', level:3, stem:'The manufacturer offers a two-year warranty that ______ both parts and labor.',
 options:['covers','contains','includes of','consists'], answer:0, explanation:'보증이 「보장하다」의 뜻일 때는 cover 를 씁니다. consist 는 of 가 필요합니다.'},
{id:'q547', part:5, type:'동사 시제·태', level:3, stem:'Not until the final inspection ______ the defect discovered.',
 options:['was','it was','had','did'], answer:0, explanation:'Not until ~ 이 문두에 오면 주절이 도치됩니다 → was the defect discovered.'},
{id:'q548', part:5, type:'전치사', level:2, stem:'Sales rose sharply ______ the first half of the year.',
 options:['while','during','when','since'], answer:1, explanation:'명사구 앞이므로 전치사 during.'},
{id:'q549', part:5, type:'어휘', level:2, stem:'Please ______ your seat belt while the aircraft is taking off.',
 options:['fasten','tighten','attach','connect'], answer:0, explanation:'안전벨트에는 fasten 을 관용적으로 씁니다.'},
{id:'q550', part:5, type:'품사 자리', level:3, stem:'______ interested in the training program should contact the HR department.',
 options:['Those','They','Whoever ones','Someone'], answer:0, explanation:'Those (who are) interested ~ : 관계사+be 동사 생략 구조입니다.'},

/* ================= Part 6 · 장문 공란 ================= */
{id:'q601', part:6, setId:'s6a', type:'어휘', level:2, stem:'(1)',
 options:['inaccessible','affordable','profitable','renewable'], answer:0, explanation:'공사 기간에는 주차장을 「이용할 수 없다」 → inaccessible.'},
{id:'q602', part:6, setId:'s6a', type:'문법·어형', level:2, stem:'(2)',
 options:['instead','instead of','in addition','as well'], answer:0, explanation:'앞 내용을 대신한다는 뜻의 부사 instead. instead of 는 뒤에 명사가 와야 합니다.'},
{id:'q603', part:6, setId:'s6a', type:'문장 삽입', level:3, stem:'(3)',
 options:['We recommend allowing an extra ten minutes to park.','The lot was resurfaced two years ago.','Visitor passes are available at the front desk.','Parking fees will increase next quarter.'],
 answer:0, explanation:'출근 시간이 더 걸릴 수 있다는 앞 문장과 자연스럽게 이어집니다.'},
{id:'q604', part:6, setId:'s6a', type:'어휘', level:2, stem:'(4)',
 options:['patience','patient','patiently','patients'], answer:0, explanation:'소유격 your 뒤 명사 자리 → patience(인내).'},
{id:'q605', part:6, setId:'s6b', type:'문법·어형', level:2, stem:'(1)',
 options:['delay','delayed','delaying','to delay'], answer:1, explanation:'will be ______ 수동태이므로 과거분사 delayed.'},
{id:'q606', part:6, setId:'s6b', type:'문장 삽입', level:3, stem:'(2)',
 options:['We apologize for the inconvenience this may cause.','Your order has already been delivered.','Please return the chairs within seven days.','The warehouse will remain closed indefinitely.'],
 answer:0, explanation:'지연을 알린 직후이므로 사과 문장이 자연스럽습니다.'},
{id:'q607', part:6, setId:'s6b', type:'어휘', level:2, stem:'(3)',
 options:['meet','make','take','give'], answer:0, explanation:'meet one\'s needs : 요구를 충족하다.'},
{id:'q608', part:6, setId:'s6b', type:'어휘', level:2, stem:'(4)',
 options:['appreciate','apply','appear','approve'], answer:0, explanation:'We appreciate your patience : 양해에 감사드립니다.'},
{id:'q609', part:6, setId:'s6c', type:'문법·어형', level:2, stem:'(1)',
 options:['renovate','renovated','renovation','renovating'], answer:1, explanation:'부사 newly 뒤, 명사 facility 앞은 과거분사 형용사 자리.'},
{id:'q610', part:6, setId:'s6c', type:'문장 삽입', level:3, stem:'(2)',
 options:['Membership is limited to residents of the city.','All classes are included in the monthly fee.','The pool will be closed for repairs this month.','We no longer offer group classes.'],
 answer:1, explanation:'시설·수업 소개가 이어지는 흐름이므로 회비에 수업이 포함된다는 문장이 알맞습니다.'},
{id:'q611', part:6, setId:'s6c', type:'문법·어형', level:2, stem:'(3)',
 options:['or','but','so','nor'], answer:0, explanation:'두 가지 방법 중 선택을 제시하므로 or.'},
{id:'q612', part:6, setId:'s6c', type:'문법·어형', level:2, stem:'(4)',
 options:['welcome','welcomed','welcoming','to welcome'], answer:2, explanation:'look forward to + 동명사 → welcoming.'},

/* ================= Part 7 · 독해 ================= */
{id:'q701', part:7, setId:'s7a', type:'주제·목적', level:1,
 stem:'What is the purpose of the notice?', options:['To announce a library closing','To advertise a job opening','To invite families to an event','To request donations'],
 answer:1, explanation:'채용 공고(PART-TIME POSITION)입니다.'},
{id:'q702', part:7, setId:'s7a', type:'세부 사항', level:2,
 stem:'What is a requirement for the position?', options:['A library science degree','Weekday availability','One year of experience with children','Fluency in two languages'],
 answer:2, explanation:'「at least one year of experience working with children」.'},
{id:'q703', part:7, setId:'s7a', type:'Not/True', level:3,
 stem:'What is NOT mentioned about the job?', options:['The hourly pay','The weekly hours','The health benefits','The start date'],
 answer:2, explanation:'시급 $18, 주 10시간, 시작일 5월 9일은 있으나 복리후생은 언급되지 않았습니다.'},
{id:'q704', part:7, setId:'s7a', type:'추론', level:3,
 stem:'When will interviews most likely take place?', options:['Before April 18','During the last week of April','On May 9','In early June'],
 answer:1, explanation:'「Interviews will be held during the last week of April」.'},
{id:'q705', part:7, setId:'s7b', type:'주제·목적', level:1,
 stem:'Why was the memo written?', options:['To introduce a new database','To announce a hiring plan','To report sales results','To schedule a team meeting'],
 answer:0, explanation:'새 고객 데이터베이스 Vantage 도입을 알리는 메모입니다.'},
{id:'q706', part:7, setId:'s7b', type:'세부 사항', level:2,
 stem:'What must staff do before Friday?', options:['Update the spreadsheets','Complete an online training','Meet with their team leader','Submit client records'],
 answer:1, explanation:'「Please complete the one-hour online training before Friday」.'},
{id:'q707', part:7, setId:'s7b', type:'추론', level:3,
 stem:'What will happen to employees who miss the deadline?', options:['They will be reassigned.','They will lose access to the new system.','They will attend an in-person class.','They will receive a warning letter.'],
 answer:1, explanation:'금요일까지 교육을 마치지 않으면 월요일에 Vantage 에 로그인할 수 없다고 했습니다.'},
{id:'q708', part:7, setId:'s7b', type:'세부 사항', level:2,
 stem:'Who should be contacted about access problems?', options:['The team leader','The IT help desk','The sales director','The training instructor'],
 answer:1, explanation:'계정 문제는 IT 만 해결할 수 있어 내선 244로 연락하라고 했습니다.'},
{id:'q709', part:7, setId:'s7c', type:'세부 사항', level:2,
 stem:'How many people did Delmar Tech originally plan for?', options:['90','108','120','150'],
 answer:0, explanation:'예약 확인서의 「Lunch buffet for 90」.'},
{id:'q710', part:7, setId:'s7c', type:'다중 지문 연계', level:3,
 stem:'What is indicated about Mr. Oyelaran\'s request to change the guest count?', options:['It was made within the allowed period.','It was made too late to be accepted.','It exceeds the capacity of the room.','It requires a new reservation number.'],
 answer:0, explanation:'행사일은 10월 14일이고 인원 변경은 «7일 전»까지(10월 7일) 가능합니다. 이메일은 10월 5일에 보냈으므로 기한 안입니다. 두 지문의 날짜를 맞춰 보는 전형적인 연계 문제입니다.'},
{id:'q711', part:7, setId:'s7c', type:'세부 사항', level:2,
 stem:'What equipment does Mr. Oyelaran request?', options:['A laptop and a printer','A microphone and a projector screen','A podium and lighting','A camera and a tripod'],
 answer:1, explanation:'「a wireless microphone and a second projector screen」.'},
{id:'q712', part:7, setId:'s7c', type:'추론', level:3,
 stem:'What does Mr. Oyelaran want to know?', options:['Whether there are additional fees','Where to park','How long the event will last','Who will cater the lunch'],
 answer:0, explanation:'「whether these carry an extra charge」 — 추가 비용 여부를 묻고 있습니다.'}
];

/* ---------------- 접근 함수 ---------------- */
function toBank(){
  var custom = (DB.toeicQ||[]);
  return TO_Q_SEED.concat(custom);
}
function toSetsAll(){
  var custom = (DB.toeicSets||[]);
  return TO_SETS_SEED.concat(custom);
}
function toSetById(id){ if(!id) return null; return toSetsAll().find(function(s){ return s.id===id; }) || null; }
function toQById(id){ return toBank().find(function(q){ return q.id===id; }) || null; }
function toQByPart(p){ return toBank().filter(function(q){ return q.part===+p; }); }
function toQCount(p){ return toQByPart(p).length; }
function toBankStat(){
  var out = {};
  TO_PARTS.forEach(function(p){ out[p.p] = toQCount(p.p); });
  out.total = toBank().length;
  out.lc = toBank().filter(function(q){ return toArea(q.part)==='LC'; }).length;
  out.rc = out.total - out.lc;
  return out;
}
/* 세트 문항은 세트 단위로 묶어서 출제합니다 */
function toGroupBySet(list){
  var groups = [], byId = {};
  list.forEach(function(q){
    if(!q.setId){ groups.push({set:null, qs:[q]}); return; }
    var g = byId[q.setId];
    if(!g){ g = byId[q.setId] = {set:toSetById(q.setId), qs:[]}; groups.push(g); }
    g.qs.push(q);
  });
  return groups;
}
/* 출제 — 파트/유형/난이도로 걸러 섞은 뒤 n문항 (세트는 통째로) */
function toPick(opt){
  opt = opt || {};
  var list = toBank().filter(function(q){
    if(opt.part && q.part!==+opt.part) return false;
    if(opt.area && toArea(q.part)!==opt.area) return false;
    if(opt.type && (q.type||'')!==opt.type) return false;
    if(opt.level && (q.level||1)!==+opt.level) return false;
    if(opt.onlyWithAudio && !q.audio && !toSetHasAudio(q)) return false;
    return true;
  });
  var groups = shuffle(toGroupBySet(list));
  var out = [], n = opt.n || 20;
  for(var i=0;i<groups.length && out.length<n;i++){
    var g = groups[i];
    if(g.set){
      /* 세트(지문·담화)는 쪼개지 않습니다 — 남은 자리가 모자라면 건너뜁니다 */
      if(out.length && out.length + g.qs.length > n) continue;
      out = out.concat(g.qs);
    } else out.push(g.qs[0]);
  }
  return out;
}
function toSetHasAudio(q){ var s = q.setId ? toSetById(q.setId) : null; return !!(s && s.audio); }
/* 문항에 딸린 음원·지문 (문항 자체 또는 세트) */
function toAudioOf(q){ if(q.audio) return q.audio; var s=q.setId?toSetById(q.setId):null; return (s&&s.audio)||''; }
function toScriptOf(q){ if(q.script) return q.script; var s=q.setId?toSetById(q.setId):null; return (s&&s.script)||''; }
function toPassageOf(q){ if(q.passage) return q.passage; var s=q.setId?toSetById(q.setId):null; return (s&&s.passage)||''; }

/* ---------------- 실전 모의고사 구성 ----------------
   TOEIC 정식 구성은 200문항(LC 100 · RC 100)입니다.
   문제은행에 문항이 모자라면 있는 만큼만 출제하고, 그 사실을 화면에 알립니다. */
const TO_FULL_SPEC = [{p:1,n:6},{p:2,n:25},{p:3,n:39},{p:4,n:30},{p:5,n:30},{p:6,n:16},{p:7,n:54}];
const TO_HALF_SPEC = [{p:1,n:3},{p:2,n:12},{p:3,n:18},{p:4,n:15},{p:5,n:15},{p:6,n:8},{p:7,n:27}];
function toBuildMock(kind){
  var spec = kind==='half' ? TO_HALF_SPEC : TO_FULL_SPEC;
  var qs = [], short = [];
  spec.forEach(function(s){
    var got = toPick({part:s.p, n:s.n});
    if(got.length < s.n) short.push({part:s.p, want:s.n, got:got.length});
    qs = qs.concat(got);
  });
  return { questions:qs, short:short, spec:spec,
           lcTotal: qs.filter(function(q){ return toArea(q.part)==='LC'; }).length,
           rcTotal: qs.filter(function(q){ return toArea(q.part)==='RC'; }).length };
}
/* 관리자가 등록한 정식 회차(toeicExams)로 구성 */
function toExamById(id){ return (DB.toeicExams||[]).find(function(e){ return e.id===id; }) || null; }
function toExamQuestions(exam){
  if(!exam) return [];
  return (exam.qids||[]).map(toQById).filter(Boolean);
}
