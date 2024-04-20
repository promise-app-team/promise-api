FROM node:18-alpine AS base

ARG NOW
ENV NOW=$NOW

# TODO: PRMS-153
# ARG PRISMA_CLI_BINARY_TARGETS
# ENV PRISMA_CLI_BINARY_TARGETS=$PRISMA_CLI_BINARY_TARGETS

FROM base AS install
WORKDIR /deps

RUN mkdir -p dev prod
COPY package* prisma dev/
COPY package* prisma prod/

RUN cd dev && npm ci && npx prisma generate
RUN cd prod && npm ci --omit=dev && npx prisma generate

FROM base AS build
WORKDIR /app

COPY --from=install /deps/dev/node_modules node_modules
COPY . .
RUN . ./patch.sh && npm run build

FROM public.ecr.aws/lambda/nodejs:18 as deploy
COPY --from=install /deps/prod/node_modules node_modules
COPY --from=build /app/dist dist

CMD ["dist/main.handler"]
