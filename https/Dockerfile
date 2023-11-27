FROM nginx:1.25.1-alpine-slim
WORKDIR /etc/nginx

ARG PORT
ENV PORT=$PORT

RUN rm -rf ./conf.d

COPY conf.d ./conf.d
COPY ssl ./ssl

RUN envsubst '$PORT' <./conf.d/api.promise.conf >./conf.d/api.promise.conf.temp
RUN mv ./conf.d/api.promise.conf.temp ./conf.d/api.promise.conf
