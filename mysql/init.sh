#!/bin/bash

init() {
  echo -e "\n[$1] Checking if MySQL is up..."

  until mysqladmin ping -h"127.0.0.1" -P3306 --silent; do
    echo "[$1] Waiting for MySQL to be up..."
    sleep 1
  done

  echo "[$1] MySQL is up - running initialization script..."

  create_user_sql="
    CREATE USER IF NOT EXISTS '${USER}'@'%' IDENTIFIED BY '${PASSWORD}';
    GRANT ALL PRIVILEGES ON *.* TO '${USER}'@'%' WITH GRANT OPTION;
    FLUSH PRIVILEGES;
  "

  create_database_sql="
    CREATE DATABASE IF NOT EXISTS \`${DATABASE}_${STAGE}\`;
    CREATE DATABASE IF NOT EXISTS \`${DATABASE}_${STAGE}_shadow\`;
    CREATE DATABASE IF NOT EXISTS \`${DATABASE}_test\`;
    CREATE DATABASE IF NOT EXISTS \`${DATABASE}_test_shadow\`;
  "

  _mysql() {
    echo "$1" | mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" -h127.0.0.1 -P3306 2>/dev/null | grep -vE "password.+?insecure"
  }

  if [[ "$USER" == "root" ]]; then
    echo "[$1] Running as root user..."
    _mysql "$create_database_sql"
  else
    echo "[$1] Running as non-root user..."
    _mysql "$create_user_sql"
    _mysql "$create_database_sql"
  fi

  echo "[$1] MySQL initialization script finished!"
}

filepath="init.sh"
init "$filepath" &
echo "[$filepath] MySQL initialization script started in the background (pid: $!)"
