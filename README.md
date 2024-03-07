# Promise API

Promise API Server

## Development

### Prerequisites

- [bun.js](https://bun.sh)
- [docker-compose](https://www.docker.com/)
- [mkcert](https://github.com/FiloSottile/mkcert) for local https

### Installing Packages

This project is using [bun.js](https://bun.sh) as a typescript runtime & toolkit.

```bash
$ bun install
```

### Setup Environment Variables

Copy `.env.example` to `.env` and fill the variables.

```bash
$ cp .env.example .env
```

### Setup MySQL Database

Using [docker-compose](https://www.docker.com/) to setup MySQL.

```bash
$ make start_mysql
```

It will create a `dockerdata` directory in the project root and store the database data.

If you want to remove the database, use the following command.

```bash
$ make stop_mysql

# if you want to remove the database data
$ rm -rf dockerdata
```

### Run Local Server

Local development server will run on `http://localhost:$PORT`.

```bash
# development mode
$ bun run start:dev

# production mode
$ bun run build
$ bun run start:prod
```

### Run Local Server with HTTPS

Local development server will run on `https://api.local.promise-app.com`.

```bash
$ make start_https # It will ask you for a password.
```

If you want to remove the certificate, use the following command.

```bash
$ make stop_https # It will ask you for a password.
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
