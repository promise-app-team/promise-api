env ?= .env.local

include $(env)
export

define docker_compose
	COMPOSE_IGNORE_ORPHANS=true docker compose -p promise-api -f docker/docker-compose.$1.yml
endef

https := $(shell git rev-parse --show-toplevel)/docker/https

start_db:
	@$(call docker_compose,local) up -d

stop_db:
	@$(call docker_compose,local) down --volumes

clean_db:
	@rm -rf docker/dockerdata

restart_db: stop_db start_db

reset_db: stop_db clean_db start_db

start_https:
	@./docker/https/scripts/install.sh
	@$(call docker_compose,https) up -d

stop_https:
	@./docker/https/scripts/uninstall.sh
	@$(call docker_compose,https) down --rmi=all

restart_https: stop_https start_https
