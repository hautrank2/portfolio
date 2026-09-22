---
title: "7.13 Dùng reverse proxy cho frontend"
description: Cho nginx trong Pod gọi tasks hộ trình duyệt — và tự nhiên hết CORS, hết địa chỉ nhúng cứng, bớt một LoadBalancer.
status: growing
created: 2026-09-22
updated: 2026-09-22
tags: [k8s, nginx, reverse-proxy, dns, cors]
---

> Tiếp [7.12](/blog/k8s/networking/deploying-the-frontend). Bốn Deployment đang chạy, ba
> trong số đó là `LoadBalancer`.

Hai chỗ vướng ở note trước — CORS, và địa chỉ API nhúng cứng trong image — đều bắt nguồn
từ **một** nguyên nhân: trình duyệt gọi thẳng `tasks-api`.

Ý tưởng của note này: để trình duyệt chỉ nói chuyện với **một** nơi duy nhất là nginx, rồi
nginx gọi `tasks` hộ. Và nginx thì chạy **trong cụm**, nên nó dùng được DNS.

```
Trước:   Trình duyệt ──► frontend-service (file tĩnh)
                    └──► tasks-service    (API)          ← khác origin, cần CORS

Sau:     Trình duyệt ──► frontend-service ──┬─► file tĩnh
                                            └─► nginx ──► tasks-service (trong cụm)
```

## Bước 1 — Thêm `location /api/` vào nginx

Sửa `frontend/conf/nginx.conf`:

```nginx
server {
  listen 80;

  location /api/ {
    proxy_pass http://tasks-service.default:8000/;
  }

  location / {
    root /usr/share/nginx/html;
    index index.html index.htm;
    try_files $uri $uri/ /index.html =404;
  }

  include /etc/nginx/extra-conf.d/*.conf;
}
```

Ba chi tiết dễ sai:

| Chi tiết | Vì sao |
| --- | --- |
| `tasks-service.default` | Tên DNS của Service, viết kèm namespace cho tường minh — đúng dạng ở [7.8](/blog/k8s/networking/dns-for-pod-to-pod) |
| Dấu `/` cuối `proxy_pass` | Có dấu này thì nginx **cắt** tiền tố `/api/`, nên `/api/tasks` tới `tasks` thành `/tasks`. Bỏ dấu này là app nhận `/api/tasks` và trả 404 |
| `location /api/` đặt **trước** `location /` | nginx chọn theo tiền tố dài nhất, nên thứ tự không quyết định — nhưng để trên cho dễ đọc |

## Bước 2 — Frontend gọi đường tương đối

Trong `frontend/src/App.js`, thay **cả hai** chỗ `fetch`:

```js
fetch('/api/tasks', {
  headers: { 'Authorization': 'Bearer abc' }
})
```

Không còn IP, không còn cổng. Trình duyệt tự ghép với origin đang mở, nên trang chạy ở
đâu thì API ở đó.

## Bước 3 — Build lại và rollout

```bash
docker build -t hautrank2/kub-demo-frontend:2 frontend && docker save hautrank2/kub-demo-frontend:2 | sudo k3s ctr images import -
```

Sửa `image:` trong `kubernetes/frontend-deployment.yaml` thành `:2`:

```bash
kubectl apply -f kubernetes/frontend-deployment.yaml && kubectl rollout status deployment frontend-deployment --timeout=60s
```

Mở lại `http://<EXTERNAL-IP>:8090`. *Fetch Tasks* và *Add Task* vẫn chạy — nhưng giờ
trong tab Network của trình duyệt, request đi tới `/api/tasks`, **cùng origin** với trang.

Kiểm tra từ phía cụm:

```bash
kubectl exec deploy/frontend-deployment -- wget -qO- --header 'Authorization: Bearer abc' http://localhost/api/tasks
```

Pod frontend tự gọi chính nó, và nginx chuyển tiếp sang `tasks-service`.

## Bước 4 — Thu `tasks-service` về `ClusterIP`

Giờ không còn ai từ ngoài gọi thẳng `tasks` nữa, nên nó không cần `EXTERNAL-IP`:

```yaml
spec:
  selector:
    app: tasks
  type: ClusterIP
  ports:
    - protocol: TCP
      port: 8000
      targetPort: 8000
```

```bash
kubectl delete svc tasks-service && kubectl apply -f kubernetes/tasks-service.yaml && kubectl get svc
```

Tải lại trang — **vẫn chạy**, vì đường đi mới nằm gọn trong cụm. Cụm giờ chỉ còn:

| Service | `type` | Ai gọi |
| --- | --- | --- |
| `frontend-service` | LoadBalancer | Trình duyệt |
| `users-service` | LoadBalancer | Trình duyệt, cho `signup`/`login` |
| `tasks-service` | **ClusterIP** | Chỉ nginx trong Pod frontend |
| `auth-service` | ClusterIP | `users` và `tasks` |

Bớt được một `LoadBalancer`. Trên cloud, đó là bớt một hoá đơn và bớt một cửa mở ra
internet.

Header CORS trong `tasks-app.js` cũng thành thừa — trình duyệt không còn gọi chéo origin
nữa. Giữ hay bỏ tuỳ bạn; bỏ thì nhớ build lại image `tasks`.

## Vì sao cách này chạy được

Câu trả lời nằm ở **ai là người gọi**:

| | Trình duyệt | nginx trong Pod |
| --- | --- | --- |
| Ở trong cụm | Không | **Có** |
| Hỏi được CoreDNS | Không | **Có** |
| Gọi được ClusterIP | Không | **Có** |
| Bị CORS chặn | Có | Không — CORS là luật của trình duyệt |

Reverse proxy chỉ làm đúng một việc: **dời điểm gọi từ ngoài vào trong cụm**. Mọi thứ tốt
lên là hệ quả của việc đó.

## Cái giá

| | |
| --- | --- |
| Mỗi frontend tự mang một nginx | Sửa route API là phải build lại image frontend |
| Một chặng mạng nữa | Trình duyệt → nginx → `tasks`, thay vì gọi thẳng |
| nginx thành điểm chết | Pod frontend hỏng là mất cả trang lẫn API |
| Cấu hình nằm trong image | Không đổi được lúc chạy, trừ khi mount ConfigMap vào `/etc/nginx/extra-conf.d/` |

Dòng cuối là lý do `nginx.conf` của khoá có sẵn dòng `include
/etc/nginx/extra-conf.d/*.conf;` — chỗ để nhét thêm cấu hình mà không cần build lại.

## Chỗ này K8s có sẵn một câu trả lời tốt hơn

Cái bạn vừa dựng bằng tay — một điểm vào duy nhất, định tuyến theo đường dẫn — chính là
việc của **Ingress**. Khác biệt: Ingress làm ở **tầng cụm**, dùng chung cho mọi app, và
khai bằng YAML chứ không phải build vào image.

Khoá không dạy Ingress. Note [7.15](/blog/k8s/networking/ingress-vs-service) là phần tôi
tự thêm, và nó bắt đầu từ đúng chỗ note này dừng lại.

## Self-check

- [ ] Giải thích được vì sao nginx gọi được `tasks-service` còn trình duyệt thì không
- [ ] Nói được dấu `/` cuối `proxy_pass` làm gì
- [ ] Giải thích được vì sao CORS biến mất, không phải vì bạn sửa header
- [ ] Nói được vì sao `tasks-service` hạ về ClusterIP được
- [ ] Kể hai cái giá của reverse proxy tự dựng

## Open questions

- Muốn đổi `nginx.conf` mà không build lại image thì mount ConfigMap kiểu gì?
- Nếu `frontend` scale lên 3 bản, ba nginx có gọi cùng một Pod `tasks` không?
