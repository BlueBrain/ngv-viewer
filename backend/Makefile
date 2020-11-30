.PHONY: run_dev run_dev_debug docker_build_version docker_build_latest docker_push_version docker_push_latest help

VERSION?=$(shell cat ../VERSION)

NEURON_SRC_URL:=https://neuron.yale.edu/ftp/neuron/versions/v7.6/7.6.7/nrn-7.6.7.tar.gz
VENV_DIR:=venv
NEURON_SRC_DIR:=tmp/neuron
SIM_MODELS_DIR:=tmp/sim-models
SIM_MODELS_REPO_BASE:=ssh://bbpcode.epfl.ch/sim/models
NEURODAMUS_CORE_REPO:=ssh://bbpcode.epfl.ch/sim/neurodamus-core
NEURODAMUS_CORE_DIR:=tmp/neurodamus-core
IMAGE_NAME:=ngv-viewer

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

$(NEURON_SRC_DIR):
	mkdir -p $@
	http_proxy=http://bbpproxy.epfl.ch:80 \
			wget -O tmp/nrn.tar.gz $(NEURON_SRC_URL)
	tar -xf tmp/nrn.tar.gz --strip-components=1 -C $@
	rm tmp/nrn.tar.gz

$(NEURODAMUS_CORE_DIR):
	git clone $(NEURODAMUS_CORE_REPO) $@

$(SIM_MODELS_DIR): | $(NEURODAMUS_CORE_DIR)
	mkdir -p $(SIM_MODELS_DIR)/core/hoc
	cp $(NEURODAMUS_CORE_DIR)/hoc/*.hoc $(SIM_MODELS_DIR)/core/hoc/

	mkdir -p $(SIM_MODELS_DIR)/core/mod
	cp $(NEURODAMUS_CORE_DIR)/mod/*.mod $(SIM_MODELS_DIR)/core/mod/

	rm -rf $(SIM_MODELS_DIR)/core/mod/Bin*.mod
	rm -rf $(SIM_MODELS_DIR)/core/mod/HDF*.mod
	rm -rf $(SIM_MODELS_DIR)/core/mod/hdf*.mod
	rm -rf $(SIM_MODELS_DIR)/core/mod/MemUsage*.mod
	rm -rf $(SIM_MODELS_DIR)/core/mod/SpikeWriter.mod


	repos=$$(cat config.json | jq -c -r '.simModel | map(.repo) | unique | .[]') && \
	for repo in $$repos; do \
		git clone --recurse-submodules $(SIM_MODELS_REPO_BASE)/$$repo $@/$$repo; \
		cp $(SIM_MODELS_DIR)/core/hoc/* $@/$$repo/hoc/; \
		mod_dirs=$$(cat config.json | jq -c -r ".simModel | .[] | select(.repo==\"$$repo\") | .modPath"); \
		for mod_dir in $$mod_dirs; do \
			cp $(SIM_MODELS_DIR)/core/mod/* $@/$$repo/$$mod_dir/; \
		done; \
	done

python_build: | $(VENV_DIR)
	$(VENV_DIR)/bin/python setup.py sdist

run_dev:
	docker run \
		--rm \
		--user 1000 \
		-it \
		-v /gpfs:/gpfs:ro \
		-e DEBUG=True \
		-v $$(pwd)/ngv_viewer:/usr/local/lib/python3.7/site-packages/ngv_viewer \
		-v /Users/antonel/Desktop/circuit:/circuits:ro \
		-v $$(pwd)/config.json:/opt/ngv-viewer/config.json \
		-p 8888:8000 \
		--entrypoint python \
		$$(IMAGE_NAME) \
		-m ngv_viewer.main

run_dev_debug:
	docker run \
		--rm \
		--user 1000 \
		-it \
		-v /gpfs:/gpfs:ro \
		-v /Users/antonel/Desktop/circuit:/circuits:ro \
		-e DEBUG=True \
		-v $$(pwd)/ngv_viewer:/usr/local/lib/python3.7/site-packages/ngv_viewer \
		-v $$(pwd)/config.json:/opt/ngv-viewer/config.json \
		-p 8888:8000 \
		-p 3000:3000 \
		--entrypoint python \
		$(IMAGE_NAME) \
		-m debugpy --listen 0.0.0.0:3000 -m ngv_viewer.main

docker_build_version: python_build | $(NEURON_SRC_DIR) $(SIM_MODELS_DIR)
	docker build -t $(IMAGE_NAME):$(VERSION) \
		--build-arg=redis_host=$(REDIS_HOST) \
		--build-arg=http_proxy=http://bbpproxy.epfl.ch:80/ \
		--build-arg=https_proxy=http://bbpproxy.epfl.ch:80/ \
		.

docker_build_latest: python_build | $(NEURON_SRC_DIR) $(SIM_MODELS_DIR)
	docker build -t $(IMAGE_NAME):latest \
		--build-arg=redis_host=$(REDIS_HOST) \
		--build-arg=http_proxy=http://bbpproxy.epfl.ch:80/ \
		--build-arg=https_proxy=http://bbpproxy.epfl.ch:80/ \
		.

docker_push_version: docker_build_version
	docker tag $(IMAGE_NAME):$(VERSION) docker-registry-default.ocp.bbp.epfl.ch/bbp-ou-nse/$(IMAGE_NAME):$(VERSION)
	docker push docker-registry-default.ocp.bbp.epfl.ch/bbp-ou-nse/$(IMAGE_NAME):$(VERSION)
	@echo 'backend version($(VERSION)) pushed to OpenShift registy'

docker_push_latest: docker_build_latest
	docker tag $(IMAGE_NAME):latest docker-registry-default.ocp.bbp.epfl.ch/bbp-ou-nse/$(IMAGE_NAME):latest
	docker push docker-registry-default.ocp.bbp.epfl.ch/bbp-ou-nse/$(IMAGE_NAME):latest
	@echo 'backend latest version pushed to OpenShift registry.'
	@echo 'backend release done'
