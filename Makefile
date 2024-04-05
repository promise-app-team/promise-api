env ?= .env.local

include $(env)
export

define docker_compose
	COMPOSE_IGNORE_ORPHANS=true docker compose -p promise-api -f docker-compose.$1.yml
endef

https := $(shell git rev-parse --show-toplevel)/https

start_mysql:
	@$(call docker_compose,local) up -d mysql

stop_mysql:
	@$(call docker_compose,local) down --volumes mysql

start_https:
	@./https/scripts/install.sh
	@$(call docker_compose,https) up -d https

stop_https:
	@./https/scripts/uninstall.sh
	@$(call docker_compose,https) down --rmi=all https
