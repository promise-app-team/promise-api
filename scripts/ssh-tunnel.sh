#!/bin/bash

_notice() { printf "\e[34m>>>\e[0m $*"; }
_error() { printf "\e[31m>>>\e[0m $*"; }

tunnel="${DB_PORT}:${DB_HOST}:3306 $SSH_USER@$SSH_HOST"

echo "$(_notice "Establishing SSH tunnel to $tunnel...")"

ssh \
  -E /dev/null \
  -o LogLevel=error \
  -o ConnectTimeout=10 \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  -i $SSH_KEY -NL $tunnel

echo "$(_error "Failed to establish SSH tunnel")"
exit 1
