.PHONY: help run_dev build docker_build_version docker_build_latest docker_push_version docker_push_latest

VERSION?=$(shell cat ../VERSION)

NODE_MODULES:=node_modules

SINGLE_CIRCUIT?=

APP_NAME?=bp
SERVER_HOST:=bp-svc.ocp.bbp.epfl.ch
SERVER_PORT:=80


define HELPTEXT
Makefile usage
 Targets:
    run_dev               Run development web server.
    build                 Build web app into dist folder.
    docker_build_version  Build frontend local docker image with the version tag.
    docker_build_latest   Build frontend local docker image with the latest tag.
    docker_push_version   Tag docker image with version and push to OpenShift registy.
    docker_push_latest    Tag docker image with latest and push to OpenShift registy
                            This will result in the updated frontend running in OpenShift.
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
	VUE_APP_SERVER_HOST=$(SERVER_HOST) \
	VUE_APP_SERVER_PORT=$(SERVER_PORT) \
	VUE_APP_SINGLE_CIRCUIT="${SINGLE_CIRCUIT}" \
	VUE_APP_VERSION=$(VERSION) \
	npm run build --modern

docker_build_version: build
	docker build -t $(APP_NAME):$(VERSION) \
		--build-arg=http_proxy=http://bbpproxy.epfl.ch:80/ \
		--build-arg=https_proxy=http://bbpproxy.epfl.ch:80/ \
		.

docker_build_latest: build
	docker build -t $(APP_NAME):latest \
		--build-arg=http_proxy=http://bbpproxy.epfl.ch:80/ \
		--build-arg=https_proxy=http://bbpproxy.epfl.ch:80/ \
		.

docker_push_version: docker_build_version
	docker tag $(APP_NAME):$(VERSION) docker-registry-default.ocp.bbp.epfl.ch/bbp-ou-nse/$(APP_NAME):$(VERSION)
	docker push docker-registry-default.ocp.bbp.epfl.ch/bbp-ou-nse/$(APP_NAME):$(VERSION)
	@echo 'frontend version($(VERSION)) pushed to OpenShift registy'

docker_push_latest: docker_build_latest
	docker tag $(APP_NAME):latest docker-registry-default.ocp.bbp.epfl.ch/bbp-ou-nse/$(APP_NAME):latest
	docker push docker-registry-default.ocp.bbp.epfl.ch/bbp-ou-nse/$(APP_NAME):latest
	@echo 'frontend latest version pushed to OpenShift registry.'
	@echo 'frontend release done'
