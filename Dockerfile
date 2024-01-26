FROM oven/bun:latest as base

FROM base AS install
WORKDIR /deps

RUN mkdir dev
COPY package.json bun.lockb dev/
RUN cd dev && bun install --frozen-lockfile

RUN mkdir prod
COPY package.json bun.lockb prod/
RUN cd prod && bun install --production --frozen-lockfile

FROM base AS prerelease
WORKDIR /app

COPY --from=install /deps/dev/node_modules node_modules
COPY . .
RUN bun run build

FROM public.ecr.aws/lambda/nodejs:18 as release
COPY --from=install /deps/prod/node_modules node_modules
COPY --from=prerelease /app/dist dist
COPY --from=prerelease /app/node_modules node_modules

CMD ["dist/main.handler"]
