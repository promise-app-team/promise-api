FROM nginx:1.25.1-alpine-slim
WORKDIR /etc/nginx

RUN rm -rf ./conf.d

COPY ssl ./ssl
COPY conf.d ./conf.d

COPY html ./html
COPY assets ./assets

ARG PORT
ENV PORT=$PORT

ARG HTTPS
ENV HTTPS=$HTTPS

RUN <<EOF
for file in ./conf.d/promise.conf ./html/502.html; do
  envsubst '$PORT $HTTPS' <$file >$file.tmp
  mv $file.tmp $file
  rm -f $file.tmp
done
EOF
