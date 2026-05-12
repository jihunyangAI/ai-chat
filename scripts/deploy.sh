#!/usr/bin/env bash
# scripts/deploy.sh
# Google Cloud Run에 AI Chat 앱을 빌드하고 배포합니다.
# 사전 조건: gcloud CLI 인증 완료, GCP_PROJECT_ID 환경 변수 설정
# 사용법:   GCP_PROJECT_ID=your-project bash scripts/deploy.sh
set -euo pipefail

GCP_PROJECT_ID="${GCP_PROJECT_ID:?'GCP_PROJECT_ID 환경 변수를 설정하세요'}"
GCP_REGION="${GCP_REGION:-asia-northeast3}"
SERVICE_NAME="ai-chat"
IMAGE="gcr.io/${GCP_PROJECT_ID}/${SERVICE_NAME}"

echo "=============================="
echo " AI Chat — Cloud Run 배포"
echo "=============================="
echo "  프로젝트 : $GCP_PROJECT_ID"
echo "  리전     : $GCP_REGION"
echo "  이미지   : $IMAGE"
echo ""

# 1. Docker 이미지 빌드 & Container Registry 푸시
echo "▶ 이미지 빌드 및 푸시 (Cloud Build)..."
gcloud builds submit \
  --tag "$IMAGE" \
  --project "$GCP_PROJECT_ID"

# 2. Cloud Run 배포
echo ""
echo "▶ Cloud Run 배포 중..."
gcloud run deploy "$SERVICE_NAME" \
  --image          "$IMAGE" \
  --platform       managed \
  --region         "$GCP_REGION" \
  --allow-unauthenticated \
  --concurrency    10 \
  --min-instances  1 \
  --max-instances  2 \
  --memory         512Mi \
  --cpu            1 \
  --timeout        60s \
  --set-env-vars   "NEXT_PUBLIC_APP_NAME=AI Chat" \
  --set-secrets    "ANTHROPIC_API_KEY=anthropic-api-key:latest" \
  --set-secrets    "MONGODB_URI=mongodb-uri:latest" \
  --project        "$GCP_PROJECT_ID"

# 3. 배포된 URL 출력
echo ""
echo "✅ 배포 완료!"
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region  "$GCP_REGION" \
  --project "$GCP_PROJECT_ID" \
  --format  "value(status.url)")
echo "   서비스 URL: $SERVICE_URL"
