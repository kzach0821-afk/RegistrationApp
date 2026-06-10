FROM node:20.11.1-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY app/backend/package*.json ./

RUN npm ci --omit=dev

COPY app/backend ./

RUN chown -R node:node /app

USER node

EXPOSE 3000

CMD ["npm", "start"]