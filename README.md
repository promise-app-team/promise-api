# Promise API

Promise API Server

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

### Running API Server

```bash
# development mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

### Testing

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```
