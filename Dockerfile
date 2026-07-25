FROM node:25-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM alpine:3.22
RUN apk add --no-cache nginx nginx-mod-http-brotli
COPY --from=builder /app/dist /usr/share/nginx/html
RUN rm /etc/nginx/http.d/default.conf
COPY nginx/nginx.conf /etc/nginx/http.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
