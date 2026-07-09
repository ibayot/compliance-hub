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
RUN npm install

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
# Copy the built dist from Vite to Nginx html folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace default config with one that supports React Router and proxies /api
RUN echo 'server { \
    listen 0.0.0.0:80; \
    server_name localhost; \
    client_max_body_size 50M; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location = /index.html { \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
        add_header Pragma "no-cache"; \
        add_header Expires "0"; \
    } \
    location /api/ { \
        proxy_pass http://gateway:4000/api/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
