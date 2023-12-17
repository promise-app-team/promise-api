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

### Running API Server

```bash
# development mode
$ bun run start:dev

# production mode
$ bun run start:prod
```

### Database Migration

```bash
# generate migration file
$ bun run migration new <migration-name>

# run migration
$ bun run migration up

# revert last migration
$ bun run migration down

# revert migrations
$ bun run migration down <number-of-migrations>

# list migrations
$ bun run migration list
```

## Project Structure

TODO
