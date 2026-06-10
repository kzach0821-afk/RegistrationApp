FROM node:20.11.1-alpine AS builder

WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY app/admin/package*.json ./
RUN npm ci
COPY app/admin ./
RUN npm run build

FROM nginx:1.27.3-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]