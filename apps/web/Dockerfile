FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /workspace

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY contracts/package.json contracts/package.json
RUN pnpm install --frozen-lockfile

COPY apps/web apps/web
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN pnpm --filter @yukcsca/web build

FROM nginx:1.31-alpine
# Official image envsubst: only this variable is expanded so nginx $host/$uri stay intact.
ENV YUKCSCA_MEDIA_PUBLIC_ENDPOINT=http://localhost:9000
ENV NGINX_ENVSUBST_FILTER=YUKCSCA_MEDIA_PUBLIC_ENDPOINT
COPY apps/web/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=6 \
  CMD wget --quiet --spider http://127.0.0.1/ || exit 1
