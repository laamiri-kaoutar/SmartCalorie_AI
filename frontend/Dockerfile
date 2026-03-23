FROM node:22-alpine
RUN apk add --no-cache libc6-compat

WORKDIR /app

# We only copy package files first for faster builds
COPY package*.json ./
RUN npm install

# Then copy the rest of the code
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]