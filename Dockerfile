FROM oven/bun:latest as base

FROM base AS install
WORKDIR /deps

RUN mkdir -p dev prod
COPY package.json bun.lockb prisma dev/
COPY package.json bun.lockb prisma prod/

RUN cd dev && bun install --frozen-lockfile && bunx prisma generate
RUN cd prod && bun install --frozen-lockfile --production && bunx prisma generate

FROM base AS build
WORKDIR /app

COPY --from=install /deps/dev/node_modules node_modules
COPY . .
RUN bun run build

FROM public.ecr.aws/lambda/nodejs:18 as deploy
COPY --from=install /deps/prod/node_modules node_modules
COPY --from=build /app/dist dist

COPY patch.sh ./
RUN ./patch.sh

ARG NOW
ENV NOW=$NOW

CMD ["dist/main.handler"]
