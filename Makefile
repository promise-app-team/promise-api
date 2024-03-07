include .env
export

https := $(shell git rev-parse --show-toplevel)/https

start: start_mysql start_https

stop: stop_mysql stop_https

start_mysql:
	@docker compose up -d mysql

stop_mysql:
	@docker compose down mysql

start_https:
	@. ./https/scripts/install.sh
	@docker compose up -d https

stop_https:
	@. ./https/scripts/uninstall.sh
	@docker compose down https --rmi=all
