---
title: Container khác máy ảo ở chỗ nào
description: Cùng cho cảm giác "một máy riêng", nhưng cơ chế cách ly hoàn toàn khác nhau.
status: growing
created: 2026-08-18
updated: 2026-08-19
tags: [container, linux]
---

Câu trả lời hay gặp là "container nhẹ hơn VM". Đúng nhưng không giải thích được gì.
Khác biệt thật nằm ở chỗ **cái gì đang bị cách ly**.

## Máy ảo cách ly ở tầng phần cứng

Hypervisor giả lập ra phần cứng. Mỗi VM cài **kernel riêng**, boot từ đầu như một máy
thật. Đó là lý do VM tốn vài trăm MB RAM và mất vài chục giây để khởi động.

## Container cách ly ở tầng tiến trình

Container **không** có kernel riêng — nó dùng chung kernel với host. Nó chỉ là một
process bình thường, nhưng bị Linux giới hạn tầm nhìn bằng hai cơ chế:

| Cơ chế | Vai trò |
| --- | --- |
| namespaces | Giới hạn *thấy được gì* — PID, network, mount, user... |
| cgroups | Giới hạn *dùng được bao nhiêu* — CPU, RAM, IO |

Nhìn từ host, container chỉ là một process:

```bash
docker run -d --name demo nginx
ps -ef | grep nginx
```

Bạn sẽ thấy tiến trình nginx nằm ngay trong danh sách process của host. Trong khi nhìn
từ bên trong container, nó tưởng mình là PID 1:

```bash
docker exec demo ps -ef
```

```
PID   USER     COMMAND
1     root     nginx: master process nginx -g daemon off;
```

Cùng một process, hai góc nhìn. Đó chính là namespace đang làm việc.

## Hệ quả thực tế

- **Khởi động mili giây**, vì không phải boot kernel
- **Container Linux không chạy được trên kernel Windows** — Docker Desktop thực ra
  chạy một VM Linux ẩn bên dưới, nên trên máy Windows bạn vẫn đang dùng cả hai
- **Ranh giới bảo mật yếu hơn VM**: lỗ hổng kernel ảnh hưởng mọi container trên cùng host

Điểm cuối là lý do tồn tại của `SecurityContext` và Pod Security Admission trong K8s —
những thứ sẽ gặp ở phần sau.

## Open questions

- gVisor và Kata Containers thu hẹp khoảng cách bảo mật này bằng cách nào?
- User namespace trong K8s hiện đã dùng được ở mức nào?
