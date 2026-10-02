FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

# Chỉ copy thứ cần cho bản build. Sửa nginx.conf thì tầng này vẫn dùng
# lại cache, nên build lại chỉ mất vài giây.
COPY index.html vite.config.js favicon.ico ./
COPY src ./src

RUN npm run build

FROM nginx:1.27-alpine

# Nhãn OCI: mô tả đi kèm image, đọc được bằng `docker inspect`.
# Trong build nhiều tầng, chỉ nhãn của tầng CUỐI mới theo image ra ngoài.
LABEL org.opencontainers.image.title="kub-cafe-shop"
LABEL org.opencontainers.image.description="Demo Kubernetes - Cafe System - shop-web"
LABEL org.opencontainers.image.version="1"
LABEL dev.kub-cafe.purpose="kubernetes-demo"

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD [ "nginx", "-g", "daemon off;" ]
