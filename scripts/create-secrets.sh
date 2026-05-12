#!/usr/bin/env bash
# scripts/create-secrets.sh
# Google Secret Manager에 앱 시크릿을 등록합니다.
# 사용법: GCP_PROJECT_ID=your-project bash scripts/create-secrets.sh
set -euo pipefail

GCP_PROJECT_ID="${GCP_PROJECT_ID:?'GCP_PROJECT_ID 환경 변수를 설정하세요'}"

# .env.local 에서 값 읽기
if [[ -f .env.local ]]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env.local | grep -v '^$' | xargs)
fi

ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:?'ANTHROPIC_API_KEY가 설정되지 않았습니다'}"
MONGODB_URI="${MONGODB_URI:?'MONGODB_URI가 설정되지 않았습니다'}"

create_or_update_secret() {
  local name="$1"
  local value="$2"

  if gcloud secrets describe "$name" --project="$GCP_PROJECT_ID" &>/dev/null; then
    echo "[$name] 시크릿 업데이트 중..."
    printf '%s' "$value" | gcloud secrets versions add "$name" \
      --data-file=- --project="$GCP_PROJECT_ID"
  else
    echo "[$name] 시크릿 생성 중..."
    printf '%s' "$value" | gcloud secrets create "$name" \
      --data-file=- --project="$GCP_PROJECT_ID" \
      --replication-policy=automatic
  fi
}

create_or_update_secret "anthropic-api-key" "$ANTHROPIC_API_KEY"
create_or_update_secret "mongodb-uri"       "$MONGODB_URI"

echo ""
echo "✅ 시크릿 등록 완료"
echo "   - anthropic-api-key"
echo "   - mongodb-uri"
