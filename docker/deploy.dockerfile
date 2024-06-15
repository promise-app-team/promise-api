FROM node:20-alpine AS base

RUN npm install -g npm prisma

FROM base AS install
WORKDIR /deps

RUN mkdir -p dev prod
COPY package* prisma dev/
COPY package* prisma prod/

RUN cd dev && npm ci && prisma generate
RUN cd prod && npm ci --omit=dev && prisma generate

FROM base AS build
WORKDIR /app

COPY --from=install /deps/dev/node_modules node_modules
COPY . .
RUN . ./patch.sh && npm run build

FROM public.ecr.aws/lambda/nodejs:20 as deploy
COPY package.json ./
COPY --from=install /deps/prod/node_modules node_modules
COPY --from=build /app/dist dist

ARG NOW
ENV NOW=$NOW

CMD ["dist/main.handler"]
