# Sineoda — tek konteyner: API + statik frontend
FROM node:22-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Aynı domain'de API + site: boş bırak (relative /api)
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build:cpanel

FROM node:22-alpine
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/tsconfig.json ./
COPY server/src ./src
COPY --from=frontend /app/dist /app/web-dist

ENV NODE_ENV=production
ENV PORT=3001
ENV WEB_DIST_DIR=/app/web-dist

EXPOSE 3001
VOLUME ["/app/server/data", "/app/server/uploads"]

CMD ["node", "--import", "tsx", "src/index.ts"]
