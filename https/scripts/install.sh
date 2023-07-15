# https://github.com/FiloSottile/mkcert#readme
mkcert -install
mkcert \
  -cert-file ssl/promise.crt \
  -key-file ssl/promise.key \
  api.promise.local

echo "
# <promise.local>
127.0.0.1   api.promise.local
# </promise.local>
" | sudo tee -a /etc/hosts >/dev/null
