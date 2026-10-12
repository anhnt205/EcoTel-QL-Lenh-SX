# ================================
# Stage 1: Build
# ================================
FROM node:20-alpine AS builder

WORKDIR /app

# Cài pnpm
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

# Vite bake các biến VITE_* vào bundle tại BUILD TIME (không phải runtime) —
# nhận qua build-arg để mỗi môi trường (preview/staging/release) build image
# riêng trỏ đúng URL public của môi trường đó.
ARG VITE_API_KONG_URL
ARG VITE_PORTAL_URL
# Tiền tố đường dẫn khi nhúng dưới phần mềm Điều phối (vd /thong-ke/). Để trống
# = chạy ở gốc "/" như cũ.
ARG VITE_BASE_PATH
ENV VITE_API_KONG_URL=${VITE_API_KONG_URL}
ENV VITE_PORTAL_URL=${VITE_PORTAL_URL}
ENV VITE_BASE_PATH=${VITE_BASE_PATH}

RUN pnpm run build

# ================================
# Stage 2: Serve (Nginx)
# ================================
FROM nginx:stable-alpine AS production

# Copy file build từ stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy cấu hình nginx tùy chỉnh
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]