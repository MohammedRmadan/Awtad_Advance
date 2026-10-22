FROM node:22-alpine
ENV NODE_ENV=production TZ=Asia/Riyadh
RUN apk add --no-cache tzdata
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY src ./src
COPY public ./public
COPY views ./views
COPY scripts ./scripts
COPY seed ./seed
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
ENV UPLOAD_DIR=/data/uploads PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
CMD ["node", "src/server.js"]
