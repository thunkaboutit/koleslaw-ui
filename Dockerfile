# Stage 1: Build
FROM node:22-alpine AS build

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies (cached unless lockfile changes)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build-only

# Stage 2: Serve
FROM nginx:stable-alpine

# Default backend URL (standalone: host network; override in docker-compose)
ENV API_UPSTREAM=http://host.docker.internal:8000

# Only substitute API_UPSTREAM — leave nginx variables ($host, $uri, etc.) intact
ENV NGINX_ENVSUBST_FILTER=API_UPSTREAM

# nginx's entrypoint runs envsubst on /etc/nginx/templates/*.template
# and writes the result to /etc/nginx/conf.d/<name>
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
