# Build dist stage

FROM --platform=linux/amd64 python:3.9-slim as build
WORKDIR /ngv-build

COPY ngv_viewer ./ngv_viewer
COPY setup.py .

RUN python setup.py sdist

#--------------------------------------------

FROM --platform=linux/amd64 python:3.9-slim
LABEL maintainer="BlueBrain NSE(Neuroscientific Software Engineering)"
WORKDIR /opt/ngv-viewer

ARG redis_host

ENV DEBIAN_FRONTEND=noninteractive \
    REDIS_HOST=$redis_host

COPY config.json entrypoint.sh .

COPY --from=build /ngv-build/dist/* ./dist/

RUN pip install \
    -i https://bbpteam.epfl.ch/repository/devpi/simple \
    $(ls -t $PWD/dist/*.* | head -n 1)

EXPOSE 8000

ENTRYPOINT [ "./entrypoint.sh" ]
