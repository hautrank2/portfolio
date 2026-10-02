FROM node:20-alpine

# Nhãn OCI: mô tả đi kèm image, đọc được bằng `docker inspect`.
# Trong build nhiều tầng, chỉ nhãn của tầng CUỐI mới theo image ra ngoài.
LABEL org.opencontainers.image.title="kub-cafe-auth"
LABEL org.opencontainers.image.description="Demo Kubernetes - Cafe System - auth-api"
LABEL org.opencontainers.image.version="1"
LABEL dev.kub-cafe.purpose="kubernetes-demo"

WORKDIR /app

COPY package.json .

RUN npm install --omit=dev

COPY . .

EXPOSE 3000

CMD [ "node", "auth-app.js" ]
