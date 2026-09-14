---
title: "7.10 Gợi ý quan trọng: tạo file tasks.txt"
description: Một lỗi 500 không liên quan gì tới mạng — appendFile tạo được file nhưng không tạo được thư mục.
status: growing
created: 2026-09-14
updated: 2026-09-14
tags: [k8s, tasks-api, docker, troubleshooting]
---

Note ngắn, gỡ đúng một chỗ vướng sẽ làm hỏng thử thách ở
note 7.9 nếu không biết trước.

## Triệu chứng

```bash
curl -X POST -H "Authorization: Bearer abc" -H 'Content-Type: application/json' -d '{"title":"t1","text":"noi dung"}' http://192.168.103.154:8000/tasks
```

```json
{ "message": "Storing the task failed." }
```

Token đã được `auth` xác thực xong — nếu không thì lỗi phải là `Could not verify token.`
Vậy phần mạng **đang đúng**, hỏng nằm ở chỗ khác.

## Nguyên nhân

```js
const filePath = path.join(__dirname, process.env.TASKS_FOLDER, 'tasks.txt');
```

Với `TASKS_FOLDER=tasks` thì đường dẫn là `/app/tasks/tasks.txt`. Nhưng:

```bash
kubectl exec deploy/tasks-deployment -- ls -la /app
```

Không có thư mục `tasks`. Image không mang nó theo, vì source của khoá **không có sẵn thư
mục đó**.

Và `fs.appendFile` **tạo được file, không tạo được thư mục cha**. Thiếu `/app/tasks` là
nó ném `ENOENT`, app bắt lại rồi trả 500.

Xem log để tự thuyết phục:

```bash
kubectl logs deploy/tasks-deployment --tail=10 | grep -i enoent
```

## Cách 1 — Đưa thư mục vào image

```bash
cd kub-network-01-starting-setup/tasks-api && mkdir -p tasks && touch tasks/tasks.txt
```

Build tag mới — giữ tag cũ là K8s không thấy gì để rollout:

```bash
docker build -t hautrank2/kub-demo-tasks:2 . && docker save hautrank2/kub-demo-tasks:2 | sudo k3s ctr images import -
```

Sửa `image:` trong `tasks-deployment.yaml` thành `:2`:

```bash
kubectl apply -f tasks-deployment.yaml && kubectl rollout status deployment tasks-deployment --timeout=60s
```

```bash
kubectl exec deploy/tasks-deployment -- ls -la /app/tasks
```

Thử lại — giờ phải ra `Task stored.`

## Cách 2 — Gắn volume, không đụng tới image

```yaml
          volumeMounts:
            - name: tasks-volume
              mountPath: /app/tasks
      volumes:
        - name: tasks-volume
          emptyDir: {}
```

Mount tạo sẵn thư mục, nên `appendFile` chạy được ngay — không cần build lại image.

Nhưng nhớ [note 6.6](/blog/k8s/data-and-volumes/emptydir): `emptyDir` chết cùng Pod, nên
task sẽ mất mỗi lần rollout. Muốn giữ thì thay bằng PVC, đúng như
[note 6.12](/blog/k8s/data-and-volumes/using-a-claim-in-a-pod).

| | Cách 1 — vào image | Cách 2 — volume |
| --- | --- | --- |
| Phải build lại | Có | Không |
| Dữ liệu sống qua rollout | **Không** — lớp ghi container | Tuỳ kiểu volume |
| Hợp với | Chạy thử cho nhanh | Cách đúng cho app ghi file |

## Vì sao note này tồn tại

Không phải vì `mkdir` khó. Mà vì lỗi này **trông giống lỗi mạng**: bạn đang giữa một
section về networking, `tasks` gọi `auth`, và nhận về 500. Rất dễ đi sửa Service.

Phân biệt bằng **nội dung thông báo**:

| Thông báo | Tầng hỏng |
| --- | --- |
| `Could not verify token.` | Mạng — `tasks` không gọi được `auth` |
| `Storing the task failed.` | Đĩa — thư mục hoặc quyền ghi |
| `Loading the tasks failed.` | Đĩa — file chưa tồn tại |

Hai dòng dưới nghĩa là phần mạng **đã chạy đúng**. Đọc đúng thông báo tiết kiệm được cả
buổi.

## Self-check

- [ ] Nói được vì sao `appendFile` không tự tạo thư mục
- [ ] Phân biệt được ba thông báo lỗi của `tasks-api` thuộc tầng nào
- [ ] Kể hai cách tạo thư mục, và đánh đổi từng cách

## Open questions

- Vì sao Docker Compose chạy được mà không cần tạo thư mục? (gợi ý: thử `docker compose up` xem có thật không)
- Thư mục tạo bằng `mkdir` trong image thuộc user nào, và container chạy bằng user nào?
