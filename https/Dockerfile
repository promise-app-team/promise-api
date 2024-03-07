FROM nginx:1.25.1-alpine-slim
WORKDIR /etc/nginx

RUN rm -rf ./conf.d

COPY conf.d ./conf.d
COPY ssl ./ssl

ARG PORT
ENV PORT=$PORT

ARG HTTPS
ENV HTTPS=$HTTPS

RUN envsubst '$PORT $HTTPS' <./conf.d/promise.conf >./conf.d/promise.conf.tmp
RUN mv ./conf.d/promise.conf.tmp ./conf.d/promise.conf && rm -f ./conf.d/promise.conf.tmp
