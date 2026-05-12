# GCP 초기 설정 가이드 (7.3 수동 작업)

> 최초 1회만 실행. 이후 배포는 `scripts/deploy.sh`로 자동화.

---

## 1. GCP 프로젝트 생성 및 결제 연결

```bash
# 프로젝트 생성
gcloud projects create YOUR_PROJECT_ID --name="AI Chat"

# 결제 계정 연결 (Console에서 수행 권장)
# https://console.cloud.google.com/billing

# 기본 프로젝트 설정
gcloud config set project YOUR_PROJECT_ID
```

---

## 2. 필요한 API 활성화

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project YOUR_PROJECT_ID
```

---

## 3. Cloud Build 서비스 계정에 Secret Manager 접근 권한 부여

```bash
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")

# Cloud Run 서비스 계정이 시크릿을 읽을 수 있도록 권한 부여
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. 시크릿 등록 (7.4)

```bash
# .env.local 값이 설정된 상태에서 실행
GCP_PROJECT_ID=YOUR_PROJECT_ID bash scripts/create-secrets.sh
```

---

## 5. 첫 배포 (7.6)

```bash
GCP_PROJECT_ID=YOUR_PROJECT_ID bash scripts/deploy.sh
```

---

## 6. 커스텀 도메인 연결 (7.7 선택)

### 방법 A: Cloud Run 도메인 매핑 (간단)

```bash
gcloud run domain-mappings create \
  --service ai-chat \
  --domain chat.yourdomain.com \
  --region asia-northeast3 \
  --project YOUR_PROJECT_ID
```

DNS 공급자에서 안내되는 CNAME 레코드를 추가하세요.

### 방법 B: HTTPS 로드밸런서 (고가용성)

1. 고정 IP 예약 → Cloud Run에 Network Endpoint Group(NEG) 생성
2. 백엔드 서비스 → URL 맵 → HTTPS 프록시 → 전달 규칙
3. SSL 인증서: Google Managed Certificate 사용 권장

> 동시접속 5~10명 규모에는 **방법 A**로 충분합니다.
