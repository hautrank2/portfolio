---
title: "7.13 Dùng reverse proxy cho frontend"
description: Cấu hình proxy bằng IP ngoài chạy được ngay — rồi tự phá chính mục đích của nó ở bước tiếp theo.
status: growing
created: 2026-09-22
updated: 2026-09-24
tags: [k8s, nginx, reverse-proxy, dns, cors]
---

> Tiếp [7.12](/blog/k8s/networking/deploying-the-frontend). Bốn Deployment đang chạy, ba
> trong số đó là `LoadBalancer`.

Hai chỗ vướng ở note trước — CORS, và địa chỉ API nhúng cứng trong image — đều bắt nguồn
từ **một** nguyên nhân: trình duyệt gọi thẳng `tasks-api`.

Ý tưởng: để trình duyệt chỉ nói chuyện với **một** nơi là nginx, rồi nginx gọi `tasks` hộ.

```
Trước:   Trình duyệt ──► frontend-service (file tĩnh)
                    └──► tasks-service    (API)          ← khác origin, cần CORS

Sau:     Trình duyệt ──► frontend-service ──┬─► file tĩnh
                                            └─► nginx ──► tasks-service
```

## Bước 1 — Thêm `location /api/`

Sửa `frontend/conf/nginx.conf`. Địa chỉ `tasks-service` thì bạn đã biết — lấy từ
`kubectl get svc`:

```bash
kubectl get svc tasks-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}{"\n"}'
```

```nginx
server {
  listen 80;

  location /api/ {
    proxy_pass http://192.168.103.154:8000/;
  }

  location / {
    root /usr/share/nginx/html;
    index index.html index.htm;
    try_files $uri $uri/ /index.html =404;
  }

  include /etc/nginx/extra-conf.d/*.conf;
}
```

Dấu `/` cuối `proxy_pass` khiến nginx **cắt** tiền tố `/api/`, nên `/api/tasks` tới
`tasks` thành `/tasks`. Bỏ dấu này là app nhận `/api/tasks` và trả 404.

## Bước 2 — Frontend gọi đường tương đối

Trong `frontend/src/App.js`, thay **cả hai** chỗ `fetch`:

```js
fetch('/api/tasks', {
  headers: { 'Authorization': 'Bearer abc' }
})
```

Không còn IP, không còn cổng trong code React. Trình duyệt tự ghép với origin đang mở.

## Bước 3 — Build và thử

```bash
docker build -t hautrank2/kub-demo-frontend:2 frontend && docker save hautrank2/kub-demo-frontend:2 | sudo k3s ctr images import -
```

Sửa `image:` trong `kubernetes/frontend-deployment.yaml` thành `:2`:

```bash
kubectl apply -f kubernetes/frontend-deployment.yaml && kubectl rollout status deployment frontend-deployment --timeout=60s
```

Mở `http://<EXTERNAL-IP>:8090`, bấm *Fetch Tasks*.

**Chạy.** Tab Network cho thấy request đi tới `/api/tasks`, cùng origin với trang — CORS
biến mất. Kiểm từ phía cụm:

```bash
kubectl exec deploy/frontend-deployment -- wget -qO- --header 'Authorization: Bearer abc' http://localhost/api/tasks
```

Trông như đã xong. Nhưng chưa.

## Bài tập — Làm đúng cái việc mà reverse proxy sinh ra để làm

Giờ không còn ai từ ngoài gọi thẳng `tasks` nữa, nên nó không cần `EXTERNAL-IP`. Bớt một
cửa mở ra internet, bớt một `LoadBalancer`:

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

**Đoán trước:** nginx vẫn chạy, `tasks` vẫn chạy, chỉ là `tasks-service` đổi `type`. Trang
có còn hoạt động không?

```bash
kubectl delete svc tasks-service && kubectl apply -f kubernetes/tasks-service.yaml && kubectl get svc tasks-service
```

Tải lại trang, bấm *Fetch Tasks*.

**Kết quả:** `502 Bad Gateway`.

```bash
kubectl logs deploy/frontend-deployment --tail=10
```

```
connect() failed (113: Host is unreachable) while connecting to upstream,
upstream: "http://192.168.103.154:8000/tasks"
```

## Vì sao hỏng

`192.168.103.154:8000` là **địa chỉ ngoài cụm** — cửa trước của `tasks-service`, do
ServiceLB mở trên IP của node. Nghĩa là gói tin đi thế này:

```
nginx (trong Pod) ──► ra khỏi cụm ──► IP node :8000 ──► vòng lại vào cụm ──► Pod tasks
```

Nó chạy được ở bước 3 **chỉ vì** `tasks-service` còn là `LoadBalancer`. Hạ nó về
`ClusterIP` là cửa đó đóng lại, và nginx gõ vào một cổng không còn ai mở.

Nghịch lý nằm ở chỗ: **reverse proxy tồn tại để bạn có thể đóng cửa đó.** Cấu hình bằng IP
ngoài khiến nó tự phá mục đích của chính mình — bạn không bao giờ thu được `tasks` về
ClusterIP, mà đó lại là phần thưởng lớn nhất.

Còn hai vấn đề nữa, ít lộ hơn:

| Vấn đề | Hệ quả |
| --- | --- |
| IP nằm trong `nginx.conf`, mà file đó được `COPY` vào image | Đổi cụm, đổi node, đổi IP → **build lại image** |
| Đường đi ra rồi vòng vào | Thêm một chặng, và phụ thuộc mạng ngoài cụm |

Đây đúng là bài học ở [7.7](/blog/k8s/networking/pod-to-pod-with-ip-and-env), lặp lại ở
một tầng khác: **đóng băng một địa chỉ ở đâu đó là nhận nợ**.

## Bước 4 — Dùng tên Service

nginx chạy **trong cụm**, nên nó hỏi được CoreDNS — thứ trình duyệt không làm được:

```nginx
  location /api/ {
    proxy_pass http://tasks-service.default:8000/;
  }
```

```bash
docker build -t hautrank2/kub-demo-frontend:3 frontend && docker save hautrank2/kub-demo-frontend:3 | sudo k3s ctr images import -
```

Đổi `image:` thành `:3` rồi apply:

```bash
kubectl apply -f kubernetes/frontend-deployment.yaml && kubectl rollout status deployment frontend-deployment --timeout=60s
```

Tải lại trang — **chạy**, dù `tasks-service` giờ là `ClusterIP` và không có `EXTERNAL-IP`.

```bash
kubectl exec deploy/frontend-deployment -- wget -qO- --header 'Authorization: Bearer abc' http://localhost/api/tasks
```

Cụm giờ còn:

| Service | `type` | Ai gọi |
| --- | --- | --- |
| `frontend-service` | LoadBalancer | Trình duyệt |
| `users-service` | LoadBalancer | Trình duyệt, cho `signup`/`login` |
| `tasks-service` | **ClusterIP** | Chỉ nginx trong Pod frontend |
| `auth-service` | ClusterIP | `users` và `tasks` |

Header CORS trong `tasks-app.js` cũng thành thừa — trình duyệt không còn gọi chéo origin.

## Vì sao cách này đúng

Câu trả lời nằm ở **ai là người gọi**:

| | Trình duyệt | nginx trong Pod |
| --- | --- | --- |
| Ở trong cụm | Không | **Có** |
| Hỏi được CoreDNS | Không | **Có** |
| Gọi được ClusterIP | Không | **Có** |
| Bị CORS chặn | Có | Không — CORS là luật của trình duyệt |

Reverse proxy chỉ làm đúng một việc: **dời điểm gọi từ ngoài vào trong cụm**. Mọi thứ tốt
lên là hệ quả.

## Một chỗ nginx không giống axios

[Note 7.8](/blog/k8s/networking/dns-for-pod-to-pod) nói DNS được tra **lúc gọi**. Với
`axios` thì đúng. Với nginx thì **không**: tên trong `proxy_pass` viết dưới dạng chuỗi
tĩnh được phân giải **một lần lúc nginx nạp cấu hình**, rồi giữ nguyên.

Hệ quả: xoá rồi tạo lại `tasks-service` (ClusterIP đổi) thì nginx vẫn ôm IP cũ và trả 502
cho tới khi Pod frontend restart.

```bash
kubectl delete svc tasks-service && kubectl apply -f kubernetes/tasks-service.yaml && kubectl exec deploy/frontend-deployment -- wget -qO- --header 'Authorization: Bearer abc' http://localhost/api/tasks
```

Chữa bằng cách ép nginx tra lại, dùng biến cộng `resolver` trỏ vào CoreDNS:

```nginx
  location /api/ {
    resolver 10.43.0.10 valid=10s;
    set $tasks_upstream http://tasks-service.default:8000;
    proxy_pass $tasks_upstream/;
  }
```

Trong lab thì không cần — nhưng đáng biết, để đừng tin rằng "dùng DNS là hết lo".

## Cái giá

| | |
| --- | --- |
| Mỗi frontend tự mang một nginx | Sửa route API là build lại image frontend |
| Một chặng mạng nữa | Trình duyệt → nginx → `tasks` |
| nginx thành điểm chết | Pod frontend hỏng là mất cả trang lẫn API |
| Cấu hình nằm trong image | Không đổi được lúc chạy, trừ khi mount ConfigMap vào `/etc/nginx/extra-conf.d/` |

Dòng cuối là lý do `nginx.conf` của khoá có sẵn dòng
`include /etc/nginx/extra-conf.d/*.conf;` — chỗ để nhét thêm cấu hình mà không build lại.

## Chỗ này K8s có sẵn câu trả lời tốt hơn

Cái bạn vừa dựng bằng tay — một điểm vào duy nhất, định tuyến theo đường dẫn — chính là
việc của **Ingress**. Khác biệt: Ingress làm ở **tầng cụm**, dùng chung cho mọi app, và
khai bằng YAML chứ không phải build vào image.

Khoá không dạy Ingress. Note [7.15](/blog/k8s/networking/ingress-vs-service) là phần tôi
tự thêm, và nó bắt đầu từ đúng chỗ note này dừng lại.

## Self-check

- [ ] Giải thích được vì sao `proxy_pass` bằng IP ngoài **chạy được** ở bước 3
- [ ] Nói được vì sao nó chết ngay khi `tasks-service` hạ về ClusterIP
- [ ] Giải thích được vì sao nginx gọi được ClusterIP còn trình duyệt thì không
- [ ] Nói được dấu `/` cuối `proxy_pass` làm gì
- [ ] Biết nginx phân giải DNS lúc nạp cấu hình, khác `axios`

## Open questions

- Muốn đổi `nginx.conf` mà không build lại image thì mount ConfigMap kiểu gì?
- Nếu `frontend` scale lên 3 bản, ba nginx có gọi cùng một Pod `tasks` không?
