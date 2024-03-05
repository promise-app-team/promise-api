FROM oven/bun:latest as base
WORKDIR /app

FROM base AS install

RUN mkdir -p /deps/dev /deps/prod
COPY package.json bun.lockb /deps/dev/
COPY package.json bun.lockb /deps/prod/
COPY prisma /deps/prod/prisma

RUN cd /deps/dev && bun install --frozen-lockfile
RUN cd /deps/prod && bun install --frozen-lockfile --production && bunx prisma generate

FROM base AS build

COPY --from=install /deps/dev/node_modules node_modules
COPY . .
RUN bun run build

FROM public.ecr.aws/lambda/nodejs:18 as deploy
COPY --from=install /deps/prod/node_modules node_modules
COPY --from=build /app/dist dist

ARG NOW
ENV NOW=$NOW

CMD ["dist/main.handler"]
