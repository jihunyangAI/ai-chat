# ── 변수 ──────────────────────────────────────────────────────────────────────
APP_NAME   := ai-chat
GCP_REGION := asia-northeast3

# GCP_PROJECT_ID는 환경 변수로 주입하거나 아래에 직접 입력
GCP_PROJECT_ID ?= $(shell gcloud config get-value project 2>/dev/null)
IMAGE_NAME     := gcr.io/$(GCP_PROJECT_ID)/$(APP_NAME)

# ── 기본 타겟 ──────────────────────────────────────────────────────────────────
.DEFAULT_GOAL := help

.PHONY: help init dev build start lint \
        docker-build docker-run docker-stop docker-push \
        secrets deploy logs clean

# ── 도움말 ────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "사용 가능한 명령어:"
	@echo ""
	@echo "  초기화"
	@echo "    make init          의존성 설치 + .env.local 생성"
	@echo ""
	@echo "  개발"
	@echo "    make dev           개발 서버 실행 (localhost:3000)"
	@echo "    make lint          ESLint 검사"
	@echo ""
	@echo "  빌드"
	@echo "    make build         프로덕션 빌드"
	@echo "    make start         프로덕션 빌드 로컬 실행"
	@echo ""
	@echo "  Docker"
	@echo "    make docker-build  Docker 이미지 빌드"
	@echo "    make docker-run    Docker 컨테이너 로컬 실행 (localhost:3000)"
	@echo "    make docker-stop   실행 중인 컨테이너 중지"
	@echo "    make docker-push   Cloud Build로 이미지 빌드 & GCR 푸시"
	@echo ""
	@echo "  배포 (GCP)"
	@echo "    make secrets       Secret Manager에 API 키 등록"
	@echo "    make deploy        Cloud Run에 배포"
	@echo "    make logs          Cloud Run 로그 조회"
	@echo ""
	@echo "  기타"
	@echo "    make clean         빌드 산출물 삭제 (.next)"
	@echo ""

# ── 초기화 ────────────────────────────────────────────────────────────────────
init:
	npm ci
	@if [ ! -f .env.local ]; then \
		cp .env.example .env.local 2>/dev/null || \
		printf "ANTHROPIC_API_KEY=\nMONGODB_URI=\nNEXT_PUBLIC_APP_NAME=AI Chat\nGCP_PROJECT_ID=\nGCP_REGION=asia-northeast3\n" > .env.local; \
		echo ".env.local 파일을 생성했습니다. 값을 채워주세요."; \
	else \
		echo ".env.local 파일이 이미 존재합니다."; \
	fi

# ── 개발 ──────────────────────────────────────────────────────────────────────
dev:
	npm run dev

lint:
	npm run lint

# ── 빌드 ──────────────────────────────────────────────────────────────────────
build:
	npm run build

start: build
	npm run start

# ── Docker ────────────────────────────────────────────────────────────────────
docker-build:
	docker build -t $(APP_NAME):latest .

docker-run:
	docker run --rm -p 3000:3000 \
		--env-file .env.local \
		--name $(APP_NAME) \
		$(APP_NAME):latest

docker-stop:
	docker stop $(APP_NAME) 2>/dev/null || true

docker-push:
	@if [ -z "$(GCP_PROJECT_ID)" ]; then \
		echo "오류: GCP_PROJECT_ID가 설정되지 않았습니다."; \
		echo "  export GCP_PROJECT_ID=your-project-id  또는"; \
		echo "  make docker-push GCP_PROJECT_ID=your-project-id"; \
		exit 1; \
	fi
	gcloud builds submit --tag $(IMAGE_NAME)

# ── GCP Secret Manager ────────────────────────────────────────────────────────
secrets:
	@echo "Secret Manager에 시크릿을 등록합니다..."
	@if [ -z "$(ANTHROPIC_API_KEY)" ]; then \
		read -s -p "ANTHROPIC_API_KEY: " KEY && echo; \
		printf "%s" "$$KEY" | gcloud secrets create anthropic-api-key --data-file=- 2>/dev/null || \
		printf "%s" "$$KEY" | gcloud secrets versions add anthropic-api-key --data-file=-; \
	else \
		printf "%s" "$(ANTHROPIC_API_KEY)" | gcloud secrets create anthropic-api-key --data-file=- 2>/dev/null || \
		printf "%s" "$(ANTHROPIC_API_KEY)" | gcloud secrets versions add anthropic-api-key --data-file=-; \
	fi
	@if [ -z "$(MONGODB_URI)" ]; then \
		read -s -p "MONGODB_URI: " URI && echo; \
		printf "%s" "$$URI" | gcloud secrets create mongodb-uri --data-file=- 2>/dev/null || \
		printf "%s" "$$URI" | gcloud secrets versions add mongodb-uri --data-file=-; \
	else \
		printf "%s" "$(MONGODB_URI)" | gcloud secrets create mongodb-uri --data-file=- 2>/dev/null || \
		printf "%s" "$(MONGODB_URI)" | gcloud secrets versions add mongodb-uri --data-file=-; \
	fi
	@echo "시크릿 등록 완료."

# ── Cloud Run 배포 ────────────────────────────────────────────────────────────
deploy: docker-push
	@if [ -z "$(GCP_PROJECT_ID)" ]; then \
		echo "오류: GCP_PROJECT_ID가 설정되지 않았습니다."; exit 1; \
	fi
	gcloud run deploy $(APP_NAME) \
		--image $(IMAGE_NAME) \
		--platform managed \
		--region $(GCP_REGION) \
		--allow-unauthenticated \
		--concurrency 10 \
		--min-instances 1 \
		--max-instances 2 \
		--set-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest \
		--set-secrets MONGODB_URI=mongodb-uri:latest

logs:
	@if [ -z "$(GCP_PROJECT_ID)" ]; then \
		echo "오류: GCP_PROJECT_ID가 설정되지 않았습니다."; exit 1; \
	fi
	gcloud run services logs tail $(APP_NAME) --region $(GCP_REGION)

# ── 정리 ──────────────────────────────────────────────────────────────────────
clean:
	rm -rf .next
