FROM node:20-alpine AS base

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
RUN npm run build

FROM public.ecr.aws/lambda/nodejs:20 AS deploy
COPY package.json ./
COPY --from=install /deps/prod/node_modules node_modules
COPY --from=build /app/dist dist

ARG NOW
ENV NOW=$NOW

CMD ["dist/main.handler"]
