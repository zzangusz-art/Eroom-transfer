#!/usr/bin/env bash
# 이룸편입 LMS - GitHub push helper (Railway가 push 시 자동 재배포)
# 최초 1회: ./push.sh <github-repo-url>  (remote 설정 + push)
# 이후:    ./push.sh "커밋 메시지"
set -e
if git remote get-url origin >/dev/null 2>&1; then
  MSG="${1:-update $(date +%Y-%m-%d_%H:%M)}"
  git add -A && git commit -m "$MSG" || echo "변경 없음"
  git push origin main
  echo "✅ push 완료 → Railway가 자동 재배포합니다."
else
  if [ -z "$1" ]; then echo "사용법(최초): ./push.sh https://github.com/<ID>/<repo>.git"; exit 1; fi
  git remote add origin "$1"
  git branch -M main
  git add -A && git commit -m "deploy: eroom-lms v$(cat VERSION)" || true
  git push -u origin main
  echo "✅ 초기 push 완료 → Railway 자동 재배포."
fi
