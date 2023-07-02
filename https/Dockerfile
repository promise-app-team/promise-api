FROM nginx:1.25.1-alpine-slim

RUN rm -rf /etc/nginx/conf.d

COPY conf.d /etc/nginx/conf.d
COPY ssl /etc/nginx/ssl
