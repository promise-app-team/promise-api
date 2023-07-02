default: run

scripts=./scripts

clean:
	@. $(scripts)/clean.sh

build: clean
	@. $(scripts)/build.sh

run: build
	@. $(scripts)/run.sh

install:
	@. $(scripts)/install.sh

uninstall:
	@. $(scripts)/uninstall.sh

update: clean uninstall install run
