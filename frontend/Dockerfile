FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Use a lightweight web server to serve the static files
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port (default nginx port)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
