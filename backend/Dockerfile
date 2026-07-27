# Use the full Debian-based image instead of Alpine — Prisma's query engine
# needs a standard OpenSSL install, which Alpine's musl-based libc doesn't
# provide in a way Prisma can reliably detect.
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN npx prisma generate

EXPOSE 4000
CMD ["npm", "start"]
