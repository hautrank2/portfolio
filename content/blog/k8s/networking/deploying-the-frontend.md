---
title: "7.12 Deploy frontend bằng Kubernetes"
description: Deployment thứ tư, Service thứ tư — và một địa chỉ nhúng cứng trong image bắt đầu trả giá.
status: growing
created: 2026-09-22
updated: 2026-09-22
tags: [k8s, frontend, deployment, service, loadbalancer]
---

> Tiếp [7.11](/blog/k8s/networking/adding-a-frontend). Image
> `hautrank2/kub-demo-frontend:1` đã có trên node, `tasks` đã có header CORS.

Frontend là app thứ tư, và cũng là app dễ deploy nhất: không biến môi trường, không gọi ai
từ trong cụm, chỉ là nginx phục vụ file tĩnh.

## `kubernetes/frontend-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: hautrank2/kub-demo-frontend:1
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 80
```

Không có khối `env`. Địa chỉ `tasks-api` đã **nằm trong đống file tĩnh** từ lúc
`npm run build`, nên K8s không có gì để truyền vào nữa.

## `kubernetes/frontend-service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
spec:
  selector:
    app: frontend
  type: LoadBalancer
  ports:
    - protocol: TCP
      port: 8090
      targetPort: 80
```

`port` và `targetPort` **khác nhau** ở đây, lần đầu trong cả section:

| Trường | Giá trị | Vì sao |
| --- | --- | --- |
| `targetPort` | `80` | nginx trong container nghe cổng 80, không đổi được nếu không sửa image |
| `port` | `8090` | Cổng bạn tự chọn để gọi từ ngoài |

Vì sao không để `port: 80` cho gọn? Vì trên k3s, **Traefik thường đã giữ cổng 80 và 443**
của node. Kiểm tra trước:

```bash
kubectl get svc -A | grep -E ":80/|:443/|LoadBalancer"
```

Nếu cổng 80 đã có chủ mà bạn vẫn khai `port: 80`, Service mới sẽ kẹt ở `<pending>` mãi —
đúng kiểu lỗi đã gặp ở 7.10 với cổng 8000.

```bash
kubectl apply -f kubernetes/frontend-deployment.yaml -f kubernetes/frontend-service.yaml && kubectl rollout status deployment frontend-deployment --timeout=60s
```

```bash
kubectl get svc frontend-service
```

Mở `http://<EXTERNAL-IP>:8090` trên trình duyệt. Trang hiện ra, *Fetch Tasks* chạy, thêm
task chạy.

## Bốn Deployment, bốn Service

```bash
kubectl get deploy,svc -o wide
```

```
Trình duyệt ──► frontend-service (LB :8090) ──► Pod frontend (nginx)
     │
     └────────► tasks-service    (LB :8000) ──► Pod tasks ──┐
                users-service    (LB :8080) ──► Pod users ──┴──► auth-service (ClusterIP :80) ──► Pod auth
```

Ba `LoadBalancer` và một `ClusterIP`. Để ý mũi tên thứ hai: **trình duyệt gọi thẳng
`tasks-service`**, không đi qua Pod frontend. Pod frontend chỉ làm đúng một việc là giao
file lần đầu.

## Bài tập — Cái giá của địa chỉ nhúng cứng

**Đoán trước:** xoá `tasks-service` rồi tạo lại. `users` gọi `tasks`… không, `users`
không gọi `tasks`. Nhưng trình duyệt thì có. Trang web còn chạy không?

```bash
kubectl delete svc tasks-service && kubectl apply -f kubernetes/tasks-service.yaml && kubectl get svc tasks-service
```

Trên k3s một node, `EXTERNAL-IP` thường vẫn là IP cũ nên trang vẫn chạy. Nhưng thử
tưởng tượng ba tình huống rất đời thường:

| Tình huống | Hậu quả |
| --- | --- |
| Cụm mới, `EXTERNAL-IP` khác | Phải sửa `App.js`, **build lại image**, push, rollout |
| Đổi `port` của `tasks-service` từ 8000 sang 9000 | Y như trên |
| Deploy cùng image lên staging và production | Không được — mỗi môi trường một địa chỉ, nên phải hai image khác nhau |

Đây là khác biệt lớn nhất giữa frontend và ba service kia. `users` chỉ cần sửa một dòng
`env` trong YAML rồi `apply`; frontend thì phải quay lại tận bước `docker build`.

Nguyên nhân gốc: **cấu hình của frontend bị đóng băng lúc build**, vì thứ đọc cấu hình là
trình duyệt chứ không phải container.

## Hai chỗ còn vướng

1. **Client phải biết hai địa chỉ** — `:8090` cho trang web, `:8000` cho API. Mỗi địa chỉ
   là một `LoadBalancer`, mà trên cloud mỗi `LoadBalancer` là một hoá đơn riêng.
2. **CORS** — vẫn cần, vì trang và API khác origin.

Cả hai biến mất trong [7.13](/blog/k8s/networking/reverse-proxy), bằng cách cho **nginx
trong Pod frontend** đứng ra gọi `tasks` hộ trình duyệt. Và nginx thì nằm trong cụm, nên
nó dùng được DNS.

## Self-check

- [ ] Nói được vì sao Deployment frontend không cần khối `env`
- [ ] Giải thích được vì sao `port` và `targetPort` ở đây khác nhau
- [ ] Biết kiểm tra cổng đã có chủ trước khi khai `LoadBalancer`
- [ ] Nói được vì sao sửa địa chỉ API của frontend tốn công hơn sửa của `users`
- [ ] Chỉ ra được trên sơ đồ: request nào đi qua Pod frontend, request nào không

## Open questions

- Muốn một image frontend dùng cho nhiều môi trường thì phải đọc cấu hình lúc nào?
- `replicas: 3` cho frontend có ý nghĩa gì, khi mỗi Pod chỉ giao file tĩnh?
