set -e

command=$1
datasource="dist/database/datasource.js"

function warn() {
  echo "\033[0;33mUsage: yarn migration <command>\033[0m\n"
  echo "  Available commands:"
  echo "  - new <name>    create a new migration file"
  echo "  - up            run all migrations"
  echo "  - down <count>  revert last migration(s) (default: 1)"
  echo "  - list          list all migrations"
}

function new() {
  name=$1
  [[ -z "$name" ]] && {
    echo "\033[0;33m[ERROR] Usage: yarn migration:new <name>\033[0m"
    exit 1
  }

  output="$(typeorm migration:create ./src/database/migrations/$name)"
  abs_path="$(cut -d ' ' -f2 <<<$output)"
  prettier --write $abs_path >/dev/null
  sed -i '' 's/queryRunner/runner/g' $abs_path

  echo "\033[0;32m[SUCCESS] Created migration file: $(basename $abs_path)\033[0m"
}

function up() {
  typeorm migration:run -d $datasource
}

function down() {
  repeat=${1:-1}
  for ((i = 1; i <= $repeat; ++i)); do
    typeorm migration:revert -d $datasource
  done
}

function list() {
  typeorm migration:show -d $datasource
}

if [[ -z "$command" ]]; then
  warn && exit 1
fi

if [[ $(type -t $command) == function ]]; then
  $command ${@:2} 2>/dev/null
else
  warn && exit 1
fi
