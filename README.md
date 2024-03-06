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

### Setup MySQL Databases

Using [docker-compose](https://www.docker.com/) to setup MySQL.

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
$ bun run build
$ bun run start:prod
```

### Database Migration

Edit [schema.prisma](./prisma/schema.prisma) to define the database schema.

Use the following commands to run migration.

```bash
# initialize migration. run first time only
$ bun run migrate:init

# run migration
$ bun run migrate

# show migration status
$ bun run migrate:stat

# deploy migration
$ bun run migrate:prod
```

#### Remote Database Migration

Use `ssh` to tunnel the remote database and run migration.

```bash
# checkout to develop branch and pull the latest code
$ git checkout develop
$ git pull origin develop

# copy env file and fill the variables
$ cp .env-cmdrc.example .env-cmdrc

# tunnel remote database (replace <port> and <hostname> with your environment variables)
$ ssh -i ~/path/to/[filename].pem -L <port>:<hostname>:3306 [ec2-host-name]@[ec2-public-ip] -N

# deploy migration
$ bun run migrate:dev
```
