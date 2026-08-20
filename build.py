# -*- coding: utf-8 -*-
"""
public/index.html 조립 스크립트

  python3 build.py

- styles.css 와 app_*.js 모듈을 public/index.html 안에 다시 채워 넣습니다.
- 문제은행·대학 데이터 블록(const QUESTIONS ... const UNI_TAG)은 건드리지 않습니다.
  (예전 build.py 는 없어진 data.js 를 읽으려 해서 그대로 실행하면 실패했습니다)
- 조립 전에 모든 모듈의 문법을 node --check 로 확인합니다. 하나라도 깨지면 멈춥니다.
"""
import io, os, sys, subprocess

ORDER = [
    'app_core.js',
    'app_ac.js',            # 학원(편입·토익) 전환 공통 뼈대
    'app_ai.js', 'app_llm.js', 'app_v2.js', 'app_quiz.js', 'app_explain.js',
    'app_report.js', 'app_quote.js', 'app_v2_views.js', 'app_vod.js', 'app_docview.js',
    'app_assess.js', 'app_holiday.js', 'app_cal.js', 'app_routine.js', 'app_hw.js',
    'app_word.js', 'app_idiom.js', 'app_uni.js', 'app_adm.js', 'app_guide.js',
    'app_board.js', 'app_kakao.js', 'app_ops.js',
    # ---- 이룸토익 ----
    'app_toeic_core.js', 'app_toeic_voca.js', 'app_toeic_voca2.js', 'app_toeic_bank.js', 'app_toeic_exam.js',
    'app_toeic_views.js', 'app_toeic_word.js', 'app_toeic_admin.js',
    # ---- 화면 · 라우터 · 부팅 ----
    'app_views.js', 'app_views2.js', 'app_boot.js',
]

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)

START = '<script>\n/* ===================== 이룸편입 LMS · CORE'
END   = '</script>\n<script>if(document.readyState'
PAGE  = os.path.join('public', 'index.html')


def check_syntax(files):
    bad = []
    for f in files:
        try:
            r = subprocess.run(['node', '--check', f], capture_output=True, text=True)
            if r.returncode != 0:
                bad.append((f, (r.stderr or '').strip().split('\n')[0]))
        except FileNotFoundError:
            print('! node 를 찾을 수 없어 문법 검사를 건너뜁니다')
            return []
    return bad


def main():
    missing = [f for f in ORDER if not os.path.exists(f)]
    if missing:
        print('! 없는 모듈:', ', '.join(missing))
    files = [f for f in ORDER if os.path.exists(f)]

    bad = check_syntax(files + ['server.js'])
    if bad:
        print('문법 오류가 있어 조립을 멈춥니다:')
        for f, m in bad:
            print('  -', f, ':', m)
        sys.exit(1)

    js = '\n'.join(io.open(f, encoding='utf-8').read().rstrip() for f in files)
    css = io.open('styles.css', encoding='utf-8').read().rstrip()

    h = io.open(PAGE, encoding='utf-8').read()

    # 1) CSS 교체
    a = h.index('<style>')
    b = h.index('</style>', a)
    h = h[:a + 7] + '\n' + css + '\n' + h[b:]

    # 2) JS 모듈 블록 교체 (데이터 블록은 그대로 둡니다)
    s0 = h.index(START)
    s1 = h.index('\n', s0)          # <script> 줄 끝
    e0 = h.index(END, s0)
    h = h[:s1 + 1] + js + '\n' + h[e0:]

    io.open(PAGE, 'w', encoding='utf-8').write(h)
    print('조립 완료 — %s / %d자 / 모듈 %d개' % (PAGE, len(h), len(files)))


if __name__ == '__main__':
    main()
