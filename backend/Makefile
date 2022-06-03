.PHONY: run_dev run_dev_debug docker_build_version docker_build_latest docker_push_version docker_push_latest help

VERSION?=$(shell cat ../VERSION)

VENV_DIR:=venv

DOCKER_REGISTRY?=bbpgitlab.epfl.ch:5050/nse
IMAGE_NAME?=ngv-viewer
TAG?=backend


REDIS_HOST?=

define HELPTEXT
Makefile usage
  Targets:
    python_build                  Build and package python.
    run_dev                       Run development instance of the backend, requires:
                                   docker engine and /gpfs mounted volume.
    run_dev_debug                 Same with above with debugger listening on port 3000.
    docker_build_version          Build backend local docker image with the version tag.
    docker_build_latest           Build backend local docker image with the latest tag.
    docker_push_version           Tag docker image with version and push to OpenShift registry.
    docker_push_latest            Tag docker image with the latest and push to OpenShift registry.
                                    This will result in the updated backend running in OpenShift.
endef
export HELPTEXT

help:
	@echo "$$HELPTEXT"

$(VENV_DIR):
	python3 -m venv venv

python_build: | $(VENV_DIR)
	$(VENV_DIR)/bin/python setup.py sdist

run_dev:
	docker run \
		--rm \
		-it \
		-e DEBUG=True \
		-v $$(pwd)/ngv_viewer:/usr/local/lib/python3.7/site-packages/ngv_viewer \
		-v $$(pwd)/config.json:/opt/ngv-viewer/config.json \
		-v /Users/antonel/gpfs:/gpfs \
		-p 8888:8000 \
		--entrypoint python \
		$(IMAGE_NAME):$(TAG) \
		-m ngv_viewer.main

run_dev_debug:
	docker run \
		--rm \
		-it \
		-e DEBUG=True \
		-v /Users/antonel/gpfs:/gpfs \
		-v $$(pwd)/ngv_viewer:/usr/local/lib/python3.7/site-packages/ngv_viewer \
		-v $$(pwd)/config.json:/opt/ngv-viewer/config.json \
		-p 8888:8000 \
		-p 3000:3000 \
		--entrypoint python \
		$(IMAGE_NAME):$(TAG) \
		-m debugpy --listen 0.0.0.0:3000 -m ngv_viewer.main

docker_build_latest: python_build
	docker build -t $(IMAGE_NAME):$(TAG) \
		--build-arg=redis_host=$(REDIS_HOST) \
		--build-arg=http_proxy=http://bbpproxy.epfl.ch:80/ \
		--build-arg=https_proxy=http://bbpproxy.epfl.ch:80/ \
		.

docker_push_latest: docker_build_latest
	docker tag $(IMAGE_NAME):$(TAG) $(DOCKER_REGISTRY)/$(IMAGE_NAME):$(TAG)
	docker push $(DOCKER_REGISTRY)/$(IMAGE_NAME):$(TAG)
	@echo 'backend latest version pushed to OpenShift registry.'
	@echo 'backend release done'

docker_only_push_latest:
	docker tag $(IMAGE_NAME):$(TAG) $(DOCKER_REGISTRY)/$(IMAGE_NAME):$(TAG)
	docker push $(DOCKER_REGISTRY)/$(IMAGE_NAME):$(TAG)
	@echo 'backend latest version pushed to OpenShift registry.'
	@echo 'backend release done'
