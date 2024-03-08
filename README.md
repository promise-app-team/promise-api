# Promise API <!-- omit in toc -->

Promise API Server

**Table of Contents**

- [Development](#development)
  - [Prerequisites](#prerequisites)
  - [Installing Dependencies](#installing-dependencies)
  - [Setup Environment Variables](#setup-environment-variables)
  - [Setup MySQL Database](#setup-mysql-database)
  - [Run Local Server](#run-local-server)
  - [Run Local Server with HTTPS](#run-local-server-with-https)
  - [Database Migration](#database-migration)
    - [For Development Environment](#for-development-environment)
    - [For Remote Environment](#for-remote-environment)

## Development

### Prerequisites

- [bun.js](https://bun.sh)
- [docker-compose](https://www.docker.com/)
- [mkcert](https://github.com/FiloSottile/mkcert) (for [HTTPS](#run-local-server-with-https))

### Installing Dependencies

This project is using [bun.js](https://bun.sh) as a typescript runtime & toolkit.

```bash
$ bun install
```

### Setup Environment Variables

Copy `.env.example` to `.env` and fill the variables.

```bash
$ cp .env.example .env.local
```

### Setup MySQL Database

Using [docker-compose](https://www.docker.com/) to setup MySQL.

>It will create a `dockerdata` directory in the project root and store the database data.

```bash
$ make start_mysql
```

If you want to remove the database, use the following command.

```bash
$ make stop_mysql

# if you want to remove the database data as well
$ rm -rf dockerdata
```

### Run Local Server

Run the following commands to start the local development server.

>It will run on `http://localhost:$PORT`.

```bash
$ bun run start:dev
```

### Run Local Server with HTTPS

Run the following commands to start the local development server with HTTPS.

>It will run on `https://api.local.promise-app.com`.

```bash
$ make start_https # It will ask you for a password.
```



If you want to remove the HTTPS certificate, use the following command.

```bash
$ make stop_https # It will ask you for a password.
```

### Database Migration

#### For Development Environment

If you are running the migration for the first time, you need to initialize it.

>It will also create dummy data for testing.

```bash
$ bun run migrate:init
```
 
Edit [schema.prisma](./prisma/schema.prisma) to define the database schema.

And then run the following commands to migrate the database.

```bash
$ bun run migrate

# to check the migration status
$ bun run migrate:stat
```

#### For Remote Environment

Must be able to access the remote database.

```bash
# checkout to develop branch and pull the latest code
$ git checkout develop
$ git pull origin develop

# copy env-cmdrc file and fill the environment variables
$ cp .env-cmdrc.example.js .env-cmdrc.js

# deploy migration
$ bun run migrate:dev
```
