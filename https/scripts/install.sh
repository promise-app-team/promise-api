#!/bin/bash

# https://github.com/FiloSottile/mkcert#readme
mkcert -install
mkcert -cert-file $https/ssl/promise.crt -key-file $https/ssl/promise.key ${HTTPS}

sudo sed -i '' '/# <promise.local>/,/# <\/promise.local>/d' /etc/hosts
sudo sed -i '' -e :a -e '/^\n*$/{$d;N;};/\n$/ba' /etc/hosts

cat <<EOF | sudo tee -a /etc/hosts >/dev/null

# <promise.local>
127.0.0.1   ${HTTPS}
# </promise.local>
EOF
