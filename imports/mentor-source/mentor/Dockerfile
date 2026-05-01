# Railway build v2
FROM node:20-slim
RUN npm install -g pnpm
WORKDIR /app
COPY . .
RUN pnpm install
ENV PORT=8080 BASE_PATH=/
RUN pnpm --filter @workspace/churchill-ai build
RUN pnpm --filter @workspace/api-server build
EXPOSE 8080
CMD node artifacts/api-server/dist/index.mjs
