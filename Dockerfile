FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

EXPOSE 5135

CMD ["npm", "run", "dev", "--", "--host"]
