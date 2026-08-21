---
title: "Giai đoạn 3.5 — Debug"
description: Chèn sớm, ngay sau Workload. Từ đây trở đi mọi thứ sẽ hỏng.
order:
  - { slug: bon-lenh-debug, title: "Bốn lệnh giải quyết 90% sự cố" }
  - { slug: doc-events, title: "Đọc Events cho đúng" }
  - { slug: bang-tra-su-co, title: "Bảng tra triệu chứng → nguyên nhân" }
  - { slug: kubectl-debug-ephemeral, title: "kubectl debug và ephemeral container" }
---

Đây là chỗ tôi cố ý **tách khỏi Observability** và kéo lên sớm. Lý do: từ giai đoạn
này trở đi mọi thứ đều sẽ hỏng, và không có kỹ năng debug thì kẹt hàng giờ ở những
lỗi vặt. Đây cũng chính là mục tiêu ban đầu của tôi khi học K8s.

## Bốn lệnh

```bash
kubectl describe pod <pod>        # đọc Events ở cuối trước tiên
kubectl logs <pod> --previous     # log lần chạy trước, cho CrashLoopBackOff
kubectl get events --sort-by=.lastTimestamp
kubectl debug -it <pod> --image=busybox --target=<container>
```

## Bảng tra — nên thuộc

| Triệu chứng | Nghi ngờ đầu tiên |
|---|---|
| `ImagePullBackOff` | Sai tên/tag, thiếu `imagePullSecrets` |
| `CrashLoopBackOff` | App tự thoát — đọc `logs --previous` |
| `Pending` | Không node nào đủ chỗ, hoặc PVC chưa bind |
| `OOMKilled` | Vượt `limits.memory` |
| `ContainerCreating` kéo dài | Mount volume lỗi, hoặc CNI có vấn đề |
| Service không có endpoint | Selector không khớp label Pod |

## Lab

Tự tạo đủ 5 loại hỏng trên, rồi chẩn đoán **chỉ bằng kubectl** — không mở lại file
config đã viết.
