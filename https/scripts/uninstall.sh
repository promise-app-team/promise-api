mkcert -uninstall
rm -rf "$(mkcert -CAROOT)"
rm -f ssl/*

sudo sed -i '' '/#\s*<promise.local>/,/#\s*<\/promise.local>/d' /etc/hosts
