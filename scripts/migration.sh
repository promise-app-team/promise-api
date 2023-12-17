#!/bin/bash

set -e

script="bun run"
command=$1
datasource="dist/database/datasource.js"

function warn {
  echo -e "\033[0;33mUsage: $script migration <command>\033[0m\n"
  echo -e "  Available commands:"
  echo -e "  - new <name>    create a new migration file"
  echo -e "  - up            run all migrations"
  echo -e "  - down <count>  revert last migration(s) (default: 1)"
  echo -e "  - list          list all migrations"
}

function new {
  name=$1
  [[ -z "$name" ]] && {
    echo -e "\033[0;33m[ERROR] Usage: $script migration new <name>\033[0m"
    exit 1
  }

  output="$(typeorm migration:create ./src/database/migrations/$name)"
  abs_path="$(cut -d ' ' -f2 <<<$output)"
  prettier --write $abs_path >/dev/null
  sed -i '' 's/queryRunner/runner/g' $abs_path

  echo -e "\033[0;32m[SUCCESS] Created migration file: $(basename $abs_path)\033[0m"
}

function up {
  typeorm migration:run -d $datasource
}

function down {
  repeat=${1:-1}
  for ((i = 1; i <= $repeat; ++i)); do
    typeorm migration:revert -d $datasource
  done
}

function list {
  typeorm migration:show -d $datasource
}

if [[ -z "$command" ]]; then
  warn && exit 1
fi

if [[ $(type -t $command) == function ]]; then
  $command ${@:2}
else
  warn && exit 1
fi
