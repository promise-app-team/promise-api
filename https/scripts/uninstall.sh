mkcert -uninstall
rm -rf "$(mkcert -CAROOT)"
rm -f ssl/*

sudo sed -i '' '/# <promise.local>/,/# <\/promise.local>/d' /etc/hosts
sudo sed -i '' -e :a -e '/^\n*$/{$d;N;};/\n$/ba' /etc/hosts

docker compse down --rmi=all --remove-orphans
