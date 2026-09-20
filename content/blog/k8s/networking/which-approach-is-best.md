---
title: "7.9 Cách nào tốt nhất?"
description: Bốn cách nối đã thử xong — cách nào là mặc định, cách nào chỉ để đọc code cũ, và cách nào đừng bao giờ dùng.
status: growing
created: 2026-09-20
updated: 2026-09-20
tags: [k8s, service, dns, network]
---

> Tiếp [7.8](/blog/k8s/networking/dns-for-pod-to-pod). `users` và `auth` đã nối bằng tên
> Service.

Bốn note vừa rồi đi qua bốn cách cho `users` tìm thấy `auth`. Note này chốt lại nên chọn
cách nào, và vì sao ba cách kia vẫn đáng đi qua.

## Bốn cách, một bảng

| Cách | Địa chỉ quyết định lúc nào | Dùng khi nào |
| --- | --- | --- |
| `localhost` trong một Pod | Lúc thiết kế Pod | Chỉ khi hai container **thật sự là một đơn vị**: sidecar, proxy, adapter |
| IP Pod | Lúc bạn gõ vào file | Không bao giờ. Chỉ để gỡ lỗi tạm trong một phiên `kubectl exec` |
| ClusterIP copy tay | Lúc bạn gõ vào file | Không. Nó sống lâu hơn IP Pod, nhưng vẫn chết khi Service bị tạo lại |
| Biến tự sinh `*_SERVICE_HOST` | Lúc **container khởi động** | Khi phải đọc code cũ của người khác. Không nên viết mới |
| **Tên Service qua DNS** | **Lúc gọi** | **Mặc định.** Mọi giao tiếp nội bộ trong cụm thật |

Câu trả lời ngắn: **DNS**.

```
IP Pod             ──► chết khi Pod sinh lại
ClusterIP copy tay ──► chết khi Service tạo lại
Biến tự sinh       ──► chết khi Service ra đời sau Pod
Tên Service        ──► hỏi lại ở mỗi request, nên không có gì để chết
```

Ba cách trên **đóng băng một giá trị**; DNS thì hỏi lại mỗi lần. Toàn bộ khác biệt nằm ở
cột "địa chỉ quyết định lúc nào" trong bảng.

## Vậy ba cách kia học để làm gì

| | |
| --- | --- |
| **Đọc được code người khác** | Rất nhiều manifest cũ còn `valueFrom` một biến `*_SERVICE_HOST`, hoặc một ClusterIP gõ cứng |
| **Đoán đúng triệu chứng** | Biết mỗi cách gãy kiểu gì thì nhìn lỗi là biết nên đi sửa chỗ nào |
| **Hiểu DNS giải quyết cái gì** | Đi thẳng vào DNS thì nó chỉ là "gõ tên Service", không thấy nó tránh được chuyện gì |

## Còn `localhost` thì sao — nó sai à?

Không sai, nhưng nó trả lời một câu hỏi khác. `localhost` chỉ tồn tại khi hai thứ nằm
**trong cùng một Pod**, mà nằm chung Pod nghĩa là scale chung, chết chung, deploy chung.

Phép thử ở [7.4](/blog/k8s/networking/multiple-containers-in-one-pod) vẫn đúng: *có muốn
scale hai thứ này khác nhau không?*

| Trả lời | Cách nối |
| --- | --- |
| Có — hai API riêng, hai nhịp deploy | Hai Deployment, gọi nhau bằng **tên Service** |
| Không — cái phụ vô nghĩa nếu đứng một mình | Một Pod, gọi nhau bằng **`localhost`** |

Với dự án này, `auth` là API riêng và `tasks` cũng cần nó — nên `auth` đứng riêng.

## DNS không miễn phí

Không có gì là không mất gì. Gọi bằng tên nghĩa là mỗi request thêm một lần tra CoreDNS,
và thêm một thành phần có thể hỏng:

| Cái giá | Chi tiết |
| --- | --- |
| Một lần tra DNS mỗi lần gọi | Thường vài mili giây, và OS có cache ngắn |
| Phụ thuộc CoreDNS | CoreDNS hỏng là mọi tên trong cụm hỏng theo |
| Bẫy `ndots:5` | Gọi dịch vụ **ngoài** cụm tốn 4 lần tra hỏng, xem [7.8](/blog/k8s/networking/dns-for-pod-to-pod) |

Đổi lại, bạn không bao giờ phải sửa một địa chỉ trong YAML nữa. Đó là món hời.

## Còn thiếu một mảnh

Sơ đồ đích ở [7.2](/blog/k8s/networking/first-deployment) có ba service, cụm mới có hai:

```
┌─ Cluster ──────────────────────────────────────────┐
│                                                    │
│   Pod users ──► auth-service ──► Pod auth          │
│      ▲                                             │
│   users-service (LoadBalancer :8080)               │
│                                                    │
│   Pod tasks ──► ?                          chưa có │
└────────────────────────────────────────────────────┘
```

`tasks-api` vẫn nằm im trong source, chưa vào cụm lần nào. Nối nó là việc của bạn, ở
[7.10](/blog/k8s/networking/challenge-solution).

## Self-check

- [ ] Nói được vì sao DNS là mặc định, và ba cách kia sai ở đâu
- [ ] Nói được mỗi cách gãy vì lý do gì, chỉ nhìn triệu chứng
- [ ] Nói được khi nào `localhost` mới là câu trả lời đúng
- [ ] Kể được ít nhất hai cái giá của việc gọi bằng DNS

## Open questions

- CoreDNS hỏng thì Service đang có kết nối sẵn có đứt ngay không?
- Có cách nào vừa gọi bằng tên, vừa không qua DNS mỗi request? (gợi ý: service mesh, sidecar proxy)
