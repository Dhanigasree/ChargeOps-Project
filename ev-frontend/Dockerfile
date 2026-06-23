FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine

USER root
RUN apk update && apk upgrade --no-cache libcrypto3 libssl3 openssl
RUN mkdir -p /etc/nginx/templates /tmp/nginx /var/cache/nginx /var/run \
  && chown -R 101:0 /etc/nginx /tmp/nginx /var/cache/nginx /var/run /usr/share/nginx/html
COPY --chown=101:0 nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder --chown=101:0 /app/dist /usr/share/nginx/html
USER 101

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
