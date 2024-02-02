FROM oven/bun:latest as base
WORKDIR /app

ARG NOW
ENV DEPLOY=$NOW

FROM base AS install

RUN mkdir -p /deps/dev /deps/prod
COPY package.json bun.lockb /deps/dev/
COPY package.json bun.lockb /deps/prod/

RUN bun install --frozen-lockfile --silent --ignore-scripts --cwd /deps/dev
RUN bun install --frozen-lockfile --silent --ignore-scripts --cwd /deps/prod --production

FROM base AS build

COPY --from=install /deps/dev/node_modules node_modules
COPY . .
RUN bun run build

FROM public.ecr.aws/lambda/nodejs:18 as deploy
COPY --from=install /deps/prod/node_modules node_modules
COPY --from=build /app/dist dist

CMD ["dist/main.handler"]
