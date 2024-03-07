#!/bin/bash

mkcert -uninstall
rm -rf "$(mkcert -CAROOT)"
rm -f $https/ssl/*

sudo sed -i '' '/# <promise.local>/,/# <\/promise.local>/d' /etc/hosts
sudo sed -i '' -e :a -e '/^\n*$/{$d;N;};/\n$/ba' /etc/hosts
