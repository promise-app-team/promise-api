#!/bin/bash

mkcert -uninstall
rm -rf "$(mkcert -CAROOT)"
rm -f $https/ssl/*

sudo perl -i -0pe 's/# <promise.local>.*# <\/promise.local>\n//s' /etc/hosts
sudo perl -i -0pe 'BEGIN{undef $/;} s/\n{2,}$/\n/g' /etc/hosts
