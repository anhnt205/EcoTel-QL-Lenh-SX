#### Build Docker images for local development

# Usage:
#   $ make up       # docker compose up --build
#   $ make clean    # docker compose down
#   $ make staging  # build & push images for staging
#   $ make release  # build & push images for release
####

# ============ REGISTRY ============
DOCKER_REGISTRY ?= ecoteldev

# ============ VERSIONS ============
RELEASE_VERSION=release
STAGING_VERSION=staging
TEST_VERSION=test
TAG_VERSION=$(shell git describe --tags --abbrev=0 2>/dev/null || echo "0.0.0")

# ============ GIT INFO ============
current_branch=$(shell git branch --show-current 2>/dev/null || echo "unknown")
commit_id=$(shell git rev-parse --short=7 HEAD 2>/dev/null || echo "unknown")

# Target-specific defaults for IMAGE_TAG if not provided by environment
test: IMAGE_TAG ?= ${TEST_VERSION}-${TAG_VERSION}-${commit_id}
staging: IMAGE_TAG ?= ${STAGING_VERSION}-${TAG_VERSION}-${commit_id}
release: IMAGE_TAG ?= ${RELEASE_VERSION}-${TAG_VERSION}-${commit_id}

# ============ LOCAL DEV ============
up: clean build

build:
	@echo "<-----Branch info------>" >> .branch_info
	@echo "#Current Branch: ${current_branch}" >> .branch_info
	@echo "#Current Commit ID: ${commit_id}" >> .branch_info
	@echo "#Build at time: $(shell date +'%Y-%m-%d %H:%M:%S')" >> .branch_info
	docker compose up --build

clean:
	@echo "Docker compose down"
	docker compose down

# ============ TEST ============
test:
	@echo "DOCKER_REGISTRY=${DOCKER_REGISTRY}" > .env
	@echo "IMAGE_TAG=${IMAGE_TAG}" >> .env
	@echo "Building images for test..."
	docker compose -f docker-compose-build-test.yml build \
		--parallel \
		--build-arg NGINX_CONF=nginx_test.conf
	@echo "Logging in to DockerHub..."
	echo "$$DOCKER_HUB_ACCESS_TOKEN" | docker login -u "$$DOCKER_HUB_USERNAME" --password-stdin
	@echo "Pushing images to DockerHub..."
	docker compose -f docker-compose-build-test.yml push

# ============ STAGING ============
staging:
	@echo "DOCKER_REGISTRY=${DOCKER_REGISTRY}" > .env
	@echo "IMAGE_TAG=${IMAGE_TAG}" >> .env
	@echo "Building images for staging..."
	docker compose -f docker-compose-build.yml build \
		--parallel \
		--build-arg NGINX_CONF=nginx_staging.conf
	@echo "Logging in to DockerHub..."
	echo "$$DOCKER_HUB_ACCESS_TOKEN" | docker login -u "$$DOCKER_HUB_USERNAME" --password-stdin
	@echo "Pushing images to DockerHub..."
	docker compose -f docker-compose-build.yml push

# ============ RELEASE ============
release:
	@echo "DOCKER_REGISTRY=${DOCKER_REGISTRY}" > .env
	@echo "IMAGE_TAG=${IMAGE_TAG}" >> .env
	@echo "Building images for release..."
	docker compose -f docker-compose-build.yml build \
		--parallel \
		--build-arg NGINX_CONF=nginx_release.conf
	@echo "Logging in to DockerHub..."
	echo "$$DOCKER_HUB_ACCESS_TOKEN" | docker login -u "$$DOCKER_HUB_USERNAME" --password-stdin
	@echo "Pushing images to DockerHub..."
	docker compose -f docker-compose-build.yml push

.PHONY: clean up build test staging release