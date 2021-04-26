
FROM python:3.7-slim-stretch
LABEL maintainer="BlueBrain NSE(Neuroscientific Software Engineering)"
WORKDIR /opt/ngv-viewer

ARG redis_host

ENV DEBIAN_FRONTEND=noninteractive
ENV REDIS_HOST=$redis_host

COPY config.json .
COPY entrypoint.sh .
COPY dist/* ./dist/

RUN pip install \
    -i https://bbpteam.epfl.ch/repository/devpi/simple \
    $(ls -t $PWD/dist/*.* | head -n 1)

EXPOSE 8000

ENTRYPOINT [ "./entrypoint.sh" ]
