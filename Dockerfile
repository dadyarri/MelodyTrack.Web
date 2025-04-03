FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

EXPOSE 80
CMD ["npm", "run", "preview", "--", "--host", "--port", "80"] 