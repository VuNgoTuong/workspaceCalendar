# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Copy yarn.lock if it exists, otherwise use npm
COPY yarn.lock* ./

RUN yarn install --prefer-offline || yarn install

COPY . .

RUN yarn build

# Production stage
FROM node:22-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider https://uat.thaco.com.vn:80/ || exit 1

CMD ["serve", "-s", "dist", "-l", "80"]