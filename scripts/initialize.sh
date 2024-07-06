#!/usr/bin/env bash

set -e

cd $(dirname $0)/..

_inthash_key() {
  local data=$(npx inthash 2>/dev/null)
  local bits=$(echo $data | jq -r '.bits')
  local prime=$(echo $data | jq -r '.prime')
  local inverse=$(echo $data | jq -r '.inverse')
  local xor=$(echo $data | jq -r '.xor')
  echo "$bits.$prime.$inverse.$xor"
}

_sqids_key() {
  local letters=$(echo {a..z} {A..Z} | tr -d ' ')
  local shuffled=""
  while [[ -n $letters ]]; do
    local i=$((RANDOM % ${#letters}))
    shuffled+="${letters:i:1}"
    letters=${letters:0:i}${letters:i+1}
  done
  echo $shuffled
}

_jwt_key_pair() {
  local key_pair=$(npm --loglevel=silent run generate-key-pair -- --json)

  local public_key=$(echo $key_pair | jq -r '.publicKey')
  local private_key=$(echo $key_pair | jq -r '.privateKey')

  declare -A arr
  arr["public"]=$public_key
  arr["private"]=$private_key

  echo "${arr[@]@K}"
}

_strong_password() {
  local letters=$(echo {0..9} {a..z} {A..Z} | tr -d ' ')
  local shuffled=""
  while [[ -n $letters ]]; do
    local i=$((RANDOM % ${#letters}))
    shuffled+="${letters:i:1}"
    letters=${letters:0:i}${letters:i+1}
  done
  echo $shuffled | head -c 32
}

declare -A envMap=(
  [local]=development
  [test]=development
  [dev]=production
  [prod]=production
)

for stage in ${!envMap[@]}; do
  node_env=${envMap[$stage]}
  env_file=".env.$stage"

  if [ ! -f $env_file ]; then
    inthash_key=$(_inthash_key)
    sqids_key=$(_sqids_key)

    declare -A jwt_keys="($(_jwt_key_pair))"
    public_key=$(echo \'${jwt_keys[public]}\' | sed 's/\\n/\\\\n/g')
    private_key=$(echo \'${jwt_keys[private]}\' | sed 's/\\n/\\\\n/g')

    db_password=$(_strong_password)
    redis_password=$(_strong_password)

    cat .env.example | awk -v stage=$stage '{
      sub(/STAGE=.+?/, "STAGE='$stage'")
      sub(/NODE_ENV=.+?/, "NODE_ENV='$node_env'")
      sub(/INTHASH_KEY=.+?/, "INTHASH_KEY='$inthash_key'")
      sub(/SQIDS_KEY=.+?/, "SQIDS_KEY='$sqids_key'")
      sub(/JWT_SIGN_KEY=.+?/, "JWT_SIGN_KEY='"$private_key"'")
      sub(/JWT_VERIFY_KEY=.+?/, "JWT_VERIFY_KEY='"$public_key"'")
      sub(/DB_PASSWORD=.+?/, "DB_PASSWORD='$db_password'")
      sub(/REDIS_PASSWORD=.+?/, "REDIS_PASSWORD='$redis_password'")

      if (stage == "dev" || stage == "prod") {
        sub(/DB_PORT=.+?/, "DB_PORT=63306")
      }
    }1' >$env_file

    echo "$env_file created"
  fi
done

if [ ! -f .env-cmdrc.js ]; then
  cp .env-cmdrc.example.js .env-cmdrc.js
  echo ".env-cmdrc.js created"
fi
