
FROM python:3.7-slim-stretch as builder

RUN pip install --upgrade pip setuptools virtualenv

COPY tmp/neuron /build/neuron
COPY tmp/sim-models /build/sim-models

# Install system dependencies
RUN apt-get update && apt-get install -yq \
    build-essential \
    libreadline-dev \
    jq \
    libz-dev

# Install Neuron
WORKDIR /build/neuron
RUN ./configure \
  --without-x \
  --disable-rx3d \
  --with-nrnpython=/usr/local/bin/python \
  && make -j4 \
  && make install \
  && cd /build/neuron/src/nrnpython \
  && python setup.py install \
  && rm -rf /build/neuron/*

ENV PATH="/usr/local/nrn/x86_64/bin:${PATH}"
ENV PYTHONPATH="/usr/local/nrn/lib/python"

COPY config.json /build/
RUN repos=$(cat /build/config.json | jq -c -r '.simModel | map(.repo) | unique | .[]') && \
	for repo in $repos; do \
    mod_dirs=$(cat /build/config.json | jq -c -r ".simModel | .[] | select(.repo==\"$repo\") | .modPath"); \
		for mod_dir in $mod_dirs; do \
      cd /build/sim-models/$repo/$mod_dir && nrnivmodl .; \
		done; \
	done


FROM python:3.7-slim-stretch
LABEL maintainer="BlueBrain NSE(Neuroscientific Software Engineering)"
WORKDIR /opt/blue-pair

ARG redis_host

ENV DEBIAN_FRONTEND=noninteractive
ENV REDIS_HOST=$redis_host
ENV PYTHONPATH="/usr/local/nrn/lib/python"
ENV PATH="/usr/local/nrn/x86_64/bin:${PATH}"

COPY dist/* ./dist/
COPY config.json .
COPY --from=builder /usr/local/nrn /usr/local/nrn
COPY --from=builder /build/sim-models sim-models

COPY entrypoint.sh .

RUN pip install \
    --no-cache-dir \
    -i https://bbpteam.epfl.ch/repository/devpi/simple \
    $(ls -t $PWD/dist/*.* | head -n 1)

EXPOSE 8000

ENTRYPOINT [ "./entrypoint.sh" ]
