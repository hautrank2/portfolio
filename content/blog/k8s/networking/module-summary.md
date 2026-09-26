---
title: "7.14 Tóm tắt module"
description: Bốn service, năm cách viết một địa chỉ, và một câu hỏi quyết định tất cả — địa chỉ được chốt lúc nào.
status: growing
created: 2026-09-25
updated: 2026-09-25
tags: [k8s, network, service, dns, tong-ket]
---

Cả section xoay quanh đúng một câu hỏi: **địa chỉ của một service được chốt lúc nào.**
Mọi cách nối bạn đã thử chỉ khác nhau ở câu trả lời đó.

## Kiến trúc cuối cùng

```
                 ┌─ Cluster ──────────────────────────────────────────┐
                 │                                                    │
Trình duyệt ────►│ frontend-service (LB)  ──► Pod frontend            │
                 │                              │ nginx /api/ ──┐     │
                 │                                              ▼     │
                 │                            tasks-service (ClusterIP)│
                 │                                   │                │
Trình duyệt ────►│ users-service (LB) ──► Pod users  │                │
                 │                            │      ▼                │
                 │                            └─► auth-service        │
                 │                                (ClusterIP)         │
                 └────────────────────────────────────────────────────┘
```

| Service | `type` | Cổng app | Ai gọi |
| --- | --- | --- | --- |
| `frontend-service` | LoadBalancer | 80 | Trình duyệt |
| `users-service` | LoadBalancer | 8080 | Trình duyệt — `signup`, `login` |
| `tasks-service` | **ClusterIP** | 8000 | Chỉ nginx trong Pod frontend |
| `auth-service` | **ClusterIP** | 80 | `users` và `tasks` |

Bốn service, **hai** cửa ra internet. Đó là con số đúng — mỗi `LoadBalancer` thừa là một
hoá đơn và một cửa không cần mở.

## Thang địa chỉ

| Cách | Địa chỉ chốt lúc nào | Chết khi |
| --- | --- | --- |
| `localhost` (cùng Pod) | Lúc thiết kế Pod | Tách hai thứ ra hai Pod |
| IP Pod | Lúc gõ vào file | Pod sinh lại |
| ClusterIP copy tay | Lúc gõ vào file | Service tạo lại |
| Biến tự sinh `*_SERVICE_HOST` | Lúc container khởi động | Service ra đời **sau** Pod |
| **Tên Service qua DNS** | **Lúc gọi** | Không có gì để chết |

Bốn cách trên đều **đóng băng một giá trị**. DNS hỏi lại ở mỗi request — đó là toàn bộ
khác biệt, và là lý do nó thắng.

> Một ngoại lệ đáng nhớ: **nginx không tra DNS lúc gọi.** Tên tĩnh trong `proxy_pass` được
> phân giải một lần lúc nạp cấu hình. Chi tiết ở
> [7.13](/blog/k8s/networking/reverse-proxy).

## Ba quyết định thiết kế

**Chung Pod hay hai Pod?** Hỏi: *"tôi có muốn scale hai thứ này với số lượng khác nhau
không?"* Có → hai Deployment. Không → cân nhắc chung Pod. `auth` phải tách ra vì `tasks`
cũng cần nó, mà `tasks` ở Pod khác.

**`ClusterIP` hay `LoadBalancer`?** Hỏi: *"có ai ngoài cụm gọi thẳng vào đây không?"*
Không → `ClusterIP`. `auth` chưa bao giờ cần `LoadBalancer`; `tasks` thì cần cho tới khi
reverse proxy xuất hiện.

**Địa chỉ viết ở đâu?** Trong **biến môi trường**, không trong code. Nhờ vậy đổi từ
`localhost` sang ClusterIP sang tên DNS không phải build lại image lần nào.

## Sáu lỗi và triệu chứng

Bảng này đáng chép ra giấy — mỗi lỗi có một chữ ký riêng:

| Thông báo | Tầng hỏng |
| --- | --- |
| `getaddrinfo ENOTFOUND auth` | **Cái tên** không tồn tại — chưa tạo Service |
| `ECONNREFUSED 127.0.0.1:80` | Tên có, địa chỉ có, **không ai nghe** ở cổng đó |
| `Endpoints: <none>` | `selector` của Service không khớp nhãn Pod |
| Trình duyệt chặn, `curl` chạy | **CORS** — luật của trình duyệt, không phải của server |
| `502 Bad Gateway` từ nginx | Proxy không với tới upstream — sai địa chỉ hoặc upstream chết |
| Proxy chạy nhưng app trả `404` | `proxy_pass` thiếu dấu `/` cuối, app nhận nguyên `/api/…` |

Bốn dòng đầu là lỗi **mạng trong cụm**, hai dòng cuối là lỗi **proxy**. Đọc đúng thông báo
là đỡ nửa thời gian.

Và một lỗi **không** thuộc nhóm này, dễ nhầm nhất: `Storing/Loading the tasks failed.` —
đó là lỗi **đĩa**, nghĩa là phần mạng đã chạy đúng.

## Bài tập cuối — dựng lại từ namespace trống

Không nhìn note, không copy file cũ.

```bash
kubectl delete namespace net-exam --ignore-not-found && kubectl create namespace net-exam
```

Viết tay tám file rồi `kubectl apply -f . -n net-exam`, đạt đủ **bảy** điều kiện:

1. `auth` — Deployment + Service `ClusterIP` cổng 80
2. `users` — `AUTH_ADDRESS` trỏ tên Service `auth`, Service `LoadBalancer`
3. `tasks` — `AUTH_ADDRESS` trỏ tên Service `auth`, `TASKS_FOLDER`, và một volume cho thư mục đó
4. `tasks-service` là **ClusterIP**
5. `frontend` — nginx proxy `/api/` sang `tasks`, Service `LoadBalancer`
6. Đúng **hai** Service kiểu `LoadBalancer`, không hơn
7. Không có IP nào gõ cứng trong bất kỳ file nào

Tự chấm:

```bash
kubectl get svc -n net-exam -o custom-columns='NAME:.metadata.name,TYPE:.spec.type,PORT:.spec.ports[0].port'
```

```bash
kubectl get endpoints -n net-exam
```

```bash
grep -rnE "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" kubernetes/ || echo "khong co IP go cung"
```

```bash
FE=$(kubectl get svc frontend-service -n net-exam -o jsonpath='{.status.loadBalancer.ingress[0].ip}') && curl -s -X POST -H 'Content-Type: application/json' -d '{"title":"t1","text":"noi dung"}' -H 'Authorization: Bearer abc' http://$FE/api/tasks && curl -s -H 'Authorization: Bearer abc' http://$FE/api/tasks
```

Bốn lệnh phải ra: đúng hai `LoadBalancer`, mọi `endpoints` đều có địa chỉ, không IP nào
gõ cứng, và task lưu rồi đọc lại được **qua frontend** — tức là đủ cả chuỗi
`nginx → tasks → auth`.

**Đoán trước khi apply:** hỏng ở đâu? Hai chỗ phổ biến nhất là `selector` lệch nhãn
(`Endpoints: <none>`, im lặng) và `LoadBalancer` đòi một cổng node đã bị chiếm
(`EXTERNAL-IP` kẹt `<pending>`).

Dọn:

```bash
kubectl delete namespace net-exam
```

## Vượt chặng khi

Viết được đủ tám file từ đầu, và **nhìn một thông báo lỗi là nói ngay nên đi sửa object
nào** — không cần thử từng cái một.

## Còn nợ lại

| Câu hỏi bỏ ngỏ | Trả lời ở |
| --- | --- |
| Mỗi app tự mang một nginx là thừa | Ingress — chưa viết |
| Nhiều LoadBalancer là nhiều hoá đơn | 7.15, và [Section 8](/blog/k8s/deploy-to-cloud) |
| `tasks` ghi file, scale lên 3 là hỏng | Storage chia sẻ — Section 8 |
| Ai được gọi ai trong cụm | `NetworkPolicy` — ngoài khoá |

Dòng cuối đáng để ý: cả section này chỉ làm cho các service **gọi được** nhau. Chưa có
dòng nào **cấm** ai gọi ai — mặc định trong K8s là mọi Pod gọi được mọi Pod, kể cả
`auth-service` là `ClusterIP`.

## Self-check

- [ ] Vẽ được kiến trúc bốn service và nói `type` từng cái, kèm lý do
- [ ] Đọc thuộc thang địa chỉ, và nói mỗi cách chết vì chuyện gì
- [ ] Dùng được ba câu hỏi thiết kế để quyết định thay vì đoán
- [ ] Nhìn sáu thông báo lỗi và chỉ đúng tầng hỏng
- [ ] Làm xong bài tập cuối, không mở note nào

## Open questions

- `ClusterIP` không phải là bảo mật — vậy chặn Pod này gọi Pod kia bằng gì?
- Hai namespace khác nhau có gọi nhau được không, và cần viết tên thế nào?
