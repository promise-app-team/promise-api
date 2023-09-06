# Promise API

Promise API Server

**[How do I access https on localhost?](/https/README.md)**

## Development

This project is using [yarn berry](https://github.com/yarnpkg/berry) as the package manager.

### Installing Packages

```bash
$ yarn install # or yarn
```

### Setting Environment Variables

Use [direnv](https://github.com/direnv/direnv) to manager environment variables

1. Copy `.envrc.example` file and rename `.envrc`.
2. Set environment variables according to your local env.
3. Run `$ direnv allow` in your terminal so that enable environment variables.
4. Every time `.envrc` file is changed, run `$ direnv allow` again.

### Running API Server

```bash
# development mode
$ yarn start:dev

# production mode
$ yarn start:prod
```

### Database Migration

```bash
# generate migration file
$ yarn migration new <migration-name>

# run migration
$ yarn migration up

# revert last migration
$ yarn migration down

# revert migrations
$ yarn migration down <number-of-migrations>

# list migrations
$ yarn migration list
```

## Project Structure

TODO
