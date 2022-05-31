# Build dist stage

FROM --platform=linux/amd64 node:14 as build
WORKDIR /ngv-build
COPY package.json .
RUN npm install

COPY public ./public
COPY src ./src
COPY babel.config.js jsconfig.json vue.config.js .
ARG VUE_APP_SINGLE_CIRCUIT
ARG VUE_APP_VERSION
ARG VUE_APP_BASE_PATH
RUN npm run build

#--------------------------------------------

FROM --platform=linux/amd64 nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /ngv-build/dist/ /usr/share/nginx/html/
EXPOSE 8000
