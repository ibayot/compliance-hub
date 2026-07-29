# -------------------------------------
# 1. Base stage
# -------------------------------------
FROM node:20-alpine AS base
# Force IPv4 to prevent "network unreachable" errors on hosts with broken IPv6 routing
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
WORKDIR /app
COPY package*.json ./

# -------------------------------------
# 2. Dependencies stage
# -------------------------------------
FROM base AS deps
RUN npm install --legacy-peer-deps

# -------------------------------------
# 3. Builder stage
# -------------------------------------
FROM deps AS builder
COPY . .
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
# We need environment variables to be passed at build time for the frontend,
# but since it's a runtime gateway, we can also point it locally or to the domain.
RUN npm run build

# -------------------------------------
# 4. Production stage (Nginx)
# -------------------------------------
FROM nginx:alpine AS runner

# Install openssl for generating self-signed certificates
RUN apk add --no-cache openssl tzdata

# Generate a self-signed certificate during build
RUN mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx-selfsigned.key \
    -out /etc/nginx/ssl/nginx-selfsigned.crt \
    -subj "/C=PH/ST=Metro Manila/L=Quezon City/O=Compliance Hub/CN=localhost"

# Copy the built dist from Vite to Nginx html folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace default config with one that supports React Router, SSL, Security Headers and proxies /api
RUN echo ' \
    add_header X-Frame-Options "SAMEORIGIN"; \
    add_header X-Content-Type-Options "nosniff"; \
    add_header Content-Security-Policy "default-src '"'"'self'"'"'; script-src '"'"'self'"'"' '"'"'unsafe-inline'"'"' '"'"'unsafe-eval'"'"' https://accounts.google.com; frame-src '"'"'self'"'"' https://accounts.google.com; style-src '"'"'self'"'"' '"'"'unsafe-inline'"'"' https://fonts.googleapis.com; font-src '"'"'self'"'"' https://fonts.gstatic.com data:; img-src '"'"'self'"'"' data: https: blob:; connect-src '"'"'self'"'"' https://* ws://* wss://*;"; \
' > /etc/nginx/security-headers.conf

RUN echo 'server { \
    listen 80; \
    server_name _; \
    server_tokens off; \
    return 301 https://$host$request_uri; \
} \
\
server { \
    listen 443 ssl; \
    server_name localhost; \
    server_tokens off; \
    \
    ssl_certificate /etc/nginx/ssl/nginx-selfsigned.crt; \
    ssl_certificate_key /etc/nginx/ssl/nginx-selfsigned.key; \
    \
    client_max_body_size 10M; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    location / { \
        include /etc/nginx/security-headers.conf; \
        try_files $uri $uri/ /index.html; \
    } \
    location = /index.html { \
        include /etc/nginx/security-headers.conf; \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
        add_header Pragma "no-cache"; \
        add_header Expires "0"; \
    } \
    location = /api/docs { \
        return 301 /api/docs/; \
    } \
    location /api/ { \
        proxy_pass http://gateway:4000/api/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]

