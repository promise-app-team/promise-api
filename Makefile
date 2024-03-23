env ?= .env

include $(env)
export

https := $(shell git rev-parse --show-toplevel)/https

start: start_mysql start_https
restart: restart_mysql restart_https
stop: stop_mysql stop_https

start_mysql:
	@docker compose up -d mysql

restart_mysql:
	@docker compose restart mysql

stop_mysql:
	@docker compose down --volumes mysql

start_https:
	@. ./https/scripts/install.sh
	@docker compose up -d https

restart_https:
	@docker compose restart https

stop_https:
	@. ./https/scripts/uninstall.sh
	@docker compose down https --rmi=all
