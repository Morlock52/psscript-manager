FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install all dependencies including the newly added ones
RUN npm install && \
    npm install helmet compression express-rate-limit morgan ioredis swagger-ui-express swagger-jsdoc

COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev"]