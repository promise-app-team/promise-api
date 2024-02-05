# Promise API

Promise API Server

**[How do I access https on localhost?](/https/README.md)**

## Development

This project is using [Bun.js](https://bun.sh) as a typescript runtime & toolkit.

### Installing Packages

```bash
$ bun install
```

### Setup Environment Variables

Copy `.env.example` to `.env` and fill the variables.

```bash
$ cp .env.example .env
```

### Setup MySQL Database and Redis

Using [docker-compose](https://www.docker.com/) to setup MySQL and Redis.

```bash
# build and run containers
$ docker compose up -d
```

It will create a `dockerdata` directory in the project root and store the database data.

### Run Server

```bash
# development mode
$ bun run start:dev

# production mode
$ bun run build && bun run start:prod
```

### Database Migration

Use `migration` command to manage database migration.

```bash
# generate migration file
$ bun run migration new [name]

# run migration
$ bun run migration up

# revert last migration
$ bun run migration down

# revert migrations
$ bun run migration down [number]

# list migrations
$ bun run migration list
```

#### Remote Database Migration

Use `ssh` to tunnel the remote database and run migration.

```bash
# copy env file and fill the variables
$ cp .env-cmdrc.example .env-cmdrc

# tunnel remote database (replace <DB_PORT> and <DB_HOST> with your environment variables)
$ ssh -i ~/path/to/[filename].pem -L <DB_PORT>:<DB_HOST>:3306 ubuntu@43.201.12.251 -N

# run migration development
$ bun run migration:dev [new|up|down|list]
```

## Project Structure

TODO
