#!/usr/bin/env bash

cd $(dirname $0)/..

./patch.sh

declare -A envMap
envMap[local]=local
envMap[test]=test
envMap[dev]=development

for stage in ${!envMap[@]}; do
  node_env=${envMap[$stage]}
  env_file=".env.$stage"

  if [ ! -f $env_file ]; then
    cat .env.example | awk -v stage=$stage '{
      sub(/STAGE=local/, "STAGE='$stage'")
      sub(/NODE_ENV=local/, "NODE_ENV='$node_env'")
      if (stage == "dev") {
        sub(/DB_PORT=3306/, "DB_PORT=63306")
      }
    }1' >$env_file

    echo "$env_file created"
  fi
done

if [ ! -f .env-cmdrc.js ]; then
  cp .env-cmdrc.example.js .env-cmdrc.js
  echo ".env-cmdrc.js created"
fi
