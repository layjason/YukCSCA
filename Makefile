SHELL := /bin/bash

.PHONY: bootstrap dev dev-host infra-up infra-down contract generate web api format format-check test verify docker-config docker-build stack-up stack-down smoke doctor

bootstrap:
	corepack enable
	@if [[ -f pnpm-lock.yaml ]]; then \
		pnpm install --frozen-lockfile; \
	else \
		echo "pnpm-lock.yaml not found; creating it for the first commit"; \
		pnpm install; \
	fi

infra-up:
	docker compose up -d postgres minio

infra-down:
	docker compose down

dev:
	docker compose up --build --watch

dev-host: infra-up
	@echo "Run 'make api' and 'make web' in separate terminals."

contract:
	pnpm contract:build

generate:
	pnpm generate

web:
	pnpm dev:web

api:
	set -a && [ -f .env ] && . ./.env && set +a; cd services/api && ./mvnw spring-boot:run -Dspring-boot.run.profiles=local

format:
	pnpm format
	cd services/api && ./mvnw --batch-mode spotless:apply

format-check:
	pnpm format:check
	cd services/api && ./mvnw --batch-mode spotless:check

test:
	pnpm test:web
	cd services/api && ./mvnw test

verify:
	./scripts/check.sh

docker-build:
	docker compose build web api render-worker

docker-config:
	docker compose config --quiet

stack-up:
	docker compose up --detach --build --wait

stack-down:
	docker compose down

smoke:
	./scripts/smoke.sh

doctor:
	./scripts/doctor.sh
