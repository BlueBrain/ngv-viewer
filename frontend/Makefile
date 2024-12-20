.PHONY: help run_dev build docker_build_version docker_build_latest docker_push_version docker_push_latest

VERSION?=$(shell cat ../VERSION)

NODE_MODULES:=node_modules

SINGLE_CIRCUIT?=ngv-20201027

IMAGE_NAME?=ngv-viewer
TAG?=frontend

DOCKER_REGISTRY?=bbpgitlab.epfl.ch:5050/nse

PROD_BASE_PATH?=/ngv-viewer


define HELPTEXT
Makefile usage
 Targets:
    run_dev               Run development web server.
    build                 Build web app into dist folder.
    docker_build_latest   Build frontend local docker image with the latest tag.
    docker_push_latest    Tag docker image with latest and push to the registy.
    docker_push_only      Tag and push to the registry.
endef
export HELPTEXT

help:
	@echo "$$HELPTEXT"

$(NODE_MODULES):
	npm install

run_dev: | $(NODE_MODULES)
	VUE_APP_SINGLE_CIRCUIT=${SINGLE_CIRCUIT} \
	VUE_APP_VERSION=$(VERSION) \
	npm run serve

build: | $(NODE_MODULES)
	VUE_APP_SINGLE_CIRCUIT="${SINGLE_CIRCUIT}" \
	VUE_APP_VERSION=$(VERSION) \
	VUE_APP_BASE_PATH=$(PROD_BASE_PATH) \
	npm run build --modern

docker_build_latest:
	docker build -t $(IMAGE_NAME):$(TAG) \
		--build-arg=http_proxy=http://bbpproxy.epfl.ch:80/ \
		--build-arg=https_proxy=http://bbpproxy.epfl.ch:80/ \
		--build-arg=VUE_APP_SINGLE_CIRCUIT="${SINGLE_CIRCUIT}" \
		--build-arg=VUE_APP_VERSION=$(VERSION) \
		--build-arg=VUE_APP_BASE_PATH=$(PROD_BASE_PATH) \
		.

docker_push_latest: docker_build_latest
	docker tag $(IMAGE_NAME):$(TAG) $(DOCKER_REGISTRY)/$(IMAGE_NAME):$(TAG)
	docker push $(DOCKER_REGISTRY)/$(IMAGE_NAME):$(TAG)
	@echo 'frontend latest version pushed to OpenShift registry.'
	@echo 'frontend release done'

docker_push_only:
	docker tag $(IMAGE_NAME):$(TAG) $(DOCKER_REGISTRY)/$(IMAGE_NAME):$(TAG)
	docker push $(DOCKER_REGISTRY)/$(IMAGE_NAME):$(TAG)
