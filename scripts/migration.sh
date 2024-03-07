#!/bin/bash

notice() { printf "\e[34m[NOTICE]\e[0m $*"; }
success() { printf "\e[32m[SUCCESS]\e[0m $*"; }
warning() { printf "\e[33m[WARNING]\e[0m $*"; }
error() { printf "\e[31m[ERROR]\e[0m $*"; }

tunnel="$DB_PORT:localhost:3306 $SSH_USER@$SSH_HOST"

echo "$(notice Trying to establish SSH tunnel to $tunnel...)"

ssh \
  -E /dev/null \
  -o LogLevel=error \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  -i $SSH_KEY -fNL $tunnel

MAX_TRIES=10
SLEEP_TIME=3

SUCCESS=false

for ((i = 1; i <= $MAX_TRIES; i++)); do
  if nc -z 127.0.0.1 $DB_PORT >/dev/null 2>&1; then
    echo "$(success Port forwarding is successful! Port $DB_PORT is open.)"
    SUCCESS=true
    break
  else
    echo "$(warning Port $DB_PORT doesn\'t open yet. Try $i/$MAX_TRIES after $SLEEP_TIME seconds...)"
    sleep $SLEEP_TIME
  fi
done

if [ "$SUCCESS" = false ]; then
  echo "$(error Port forwarding is failed. Please check the connection and try again.)"
  exit 1
fi

echo -e "$(notice Running Prisma migration...)\n" #
###################################################

export DB_URL="mysql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

bun run prisma migrate deploy

###################################################
echo -e "\n$(notice Done! Closing SSH tunnel...)" #

for pid in $(pgrep -f "$tunnel"); do
  kill $pid
  echo "$(success Closed SSH tunnel with PID: $pid)"
done
