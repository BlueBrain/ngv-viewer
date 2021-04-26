.PHONY: help test build release run_dev_backend run_dev_frontend docker_push_latest deploy create_oo_deployment

APP_NAME_PREFIX?=ngv-viewer
APP_DNS_BASE?=ocp.bbp.epfl.ch
OO_PROJECT?=bbp-ou-nse
DOCKER_REGISTRY_HOST?=docker-registry-default.ocp.bbp.epfl.ch

VERSION:=$(shell cat VERSION)
export VERSION

define HELPTEXT
Makefile usage
 Targets:
    run_dev_backend       Run development instance of the backend.
    run_dev_frontend      Run development instance of the frontend.
    create_oo_deployment  Create OpenShift deployment.
    test                  Test and compile packages, rebuild docker images locally(latest tag).
    build                 Same as test. If VERSION has not been previously git tagged:
                            git tag it and push this version to docker registry.
    release               Same as build. Push the latest tag to the docker registy.
                            This will result in updated app in prod.
endef
export HELPTEXT

help:
	@echo "$$HELPTEXT"

run_dev_backend:
	$(MAKE) -C backend run_dev

run_dev_frontend:
	$(MAKE) -C frontend run_dev

build:
	@echo "building $(VERSION)"
ifdef $(JENKINS_HOME)
	git config user.email bbprelman@epfl.ch
endif
	! git rev-parse $(VERSION) >/dev/null 2>&1; \
		if [ $$? -eq 0 ]; \
		then \
			echo "tagging $(VERSION)" && \
			echo "VERSION = '$(VERSION)'" > backend/ngv_viewer/version.py && \
			sed -i 's/"version": "\([0-9.]\+\)"/"version": "$(VERSION)"/' frontend/package.json && \
			$(MAKE) -C backend docker_push_version && \
			$(MAKE) -C frontend docker_push_version && \
			git add backend/ngv_viewer/version.py frontend/package.json && \
			git commit -m "release $(VERSION)" && \
			git tag -a $(VERSION) -m $(VERSION) && \
			git push origin HEAD:$$GERRIT_BRANCH && \
			git push --tags; \
		fi

release: build docker_push_latest

deploy: docker_push_latest

docker_push_latest:
	@echo "pushing docker images for version $(VERSION)"
	$(MAKE) -C backend docker_push_latest
	$(MAKE) -C frontend docker_push_latest
