#!/bin/bash

# https://github.com/FiloSottile/mkcert#readme
mkcert -install
mkcert -cert-file $https/ssl/promise.crt -key-file $https/ssl/promise.key ${HTTPS}

sudo perl -i -0pe 's/# <promise.local>.*# <\/promise.local>\n//s' /etc/hosts
sudo perl -i -0pe 'BEGIN{undef $/;} s/\n{2,}$/\n/g' /etc/hosts

cat <<EOF | sudo tee -a /etc/hosts >/dev/null

# <promise.local>
127.0.0.1   ${HTTPS}
# </promise.local>
EOF
