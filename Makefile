env ?= .env.local

include $(env)
export

define docker_compose
	COMPOSE_IGNORE_ORPHANS=true docker compose -p promise-api -f docker-compose.$1.yml
endef

https := $(shell git rev-parse --show-toplevel)/https

start_db:
	@$(call docker_compose,local) up -d

stop_db:
	@$(call docker_compose,local) down --volumes

clean_db:
	@rm -rf dockerfile

restart_db: deinit_db init_db

start_https:
	@./https/scripts/install.sh
	@$(call docker_compose,https) up -d

stop_https:
	@./https/scripts/uninstall.sh
	@$(call docker_compose,https) down --rmi=all

restart_https: deinit_https init_https
