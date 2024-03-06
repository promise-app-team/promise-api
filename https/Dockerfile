FROM nginx:1.25.1-alpine-slim
WORKDIR /etc/nginx

RUN rm -rf ./conf.d

COPY conf.d ./conf.d
COPY ssl ./ssl

ARG PORT
ENV PORT=$PORT

ARG DOMAIN
ENV DOMAIN=$DOMAIN

RUN envsubst '$PORT $DOMAIN' <./conf.d/promise.conf | tee ./conf.d/promise.conf
