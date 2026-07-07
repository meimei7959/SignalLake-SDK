FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4318

COPY package.json ./
COPY contracts ./contracts
COPY docs ./docs
COPY fixtures ./fixtures
COPY relay ./relay
COPY schemas ./schemas
COPY sdk ./sdk
COPY tools ./tools

RUN mkdir -p /data/signallake && chown -R node:node /app /data/signallake

USER node

EXPOSE 4318

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node relay/service/src/healthcheck.mjs

CMD ["node", "relay/service/src/server.mjs"]
