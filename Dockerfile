FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY nginx/nginx.conf ./
RUN npm ci
COPY . .
RUN npm run build
RUN ls /app

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
