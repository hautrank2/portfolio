---
title: "Nền tảng trước K8s"
description: Linux, mạng, container và YAML. Thiếu phần này thì K8s mãi là ma thuật.
status: seed
updated: 2026-08-21
order:
  - linux
  - mang
  - container
  - yaml
---

Đây là giai đoạn dễ bị bỏ nhất, và cũng là lý do phổ biến nhất khiến người ta học K8s
xong vẫn không tự tin. Kubernetes không phát minh ra cơ chế nào mới — nó **điều phối**
những cơ chế Linux đã có sẵn từ lâu. Không biết namespace và cgroup thì "Pod" chỉ là
một từ.

## Mục tiêu giai đoạn

Sau giai đoạn này, ba câu sau phải trả lời được không cần tra:

1. Container bị cách ly bằng cái gì, ở tầng nào?
2. Vì sao `curl http://api` chạy được bên trong cluster mà không cần domain đầy đủ?
3. Image layer là gì, và vì sao đổi một dòng trong Dockerfile lại làm hỏng cache?

## Lab trung tâm

Tự tay tạo một "container" **không dùng Docker**:

```bash
sudo unshare --pid --fork --mount-proc bash
ps -ef
```

Bên trong, `ps` chỉ thấy vài process và shell của bạn là PID 1 — trong khi nó vẫn
đang chạy trên chính máy đó. Làm bài này một lần, container hết huyền bí vĩnh viễn.

## Thời lượng

2 tuần. Đây là một trong hai giai đoạn **không nên nén** (cái kia là Networking).

## Vượt chặng khi

Bạn giải thích được cho người khác nghe: *"container không phải máy ảo thu nhỏ, nó là
một process bình thường bị kernel giới hạn tầm nhìn"* — và chỉ ra được **cơ chế nào
giới hạn cái gì**.
