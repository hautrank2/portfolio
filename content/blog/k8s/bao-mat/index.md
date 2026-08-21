---
title: "Giai đoạn 7 — Bảo mật"
description: Ai được làm gì trong cluster, và container được phép làm gì trên node.
order:
  - { slug: rbac, title: "RBAC: Role, ClusterRole và binding" }
  - { slug: service-account, title: "ServiceAccount và token trong Pod" }
  - { slug: security-context, title: "SecurityContext: runAsNonRoot, drop capabilities" }
  - { slug: pod-security-admission, title: "Pod Security Admission: privileged, baseline, restricted" }
  - { slug: admission-controller, title: "Admission controller: mutating trước, validating sau" }
  - { slug: secret-at-rest, title: "Mã hoá Secret khi lưu trữ" }
---

## Công cụ debug RBAC tốt nhất

```bash
kubectl auth can-i delete pods --as=system:serviceaccount:default:default
```

Dùng nhiều. Nó trả lời trực tiếp câu hỏi "vì sao Pod này bị 403" mà không phải đọc
ngược từng binding.

## Một điểm hay nhầm

`ClusterRole` **có thể** được gắn bằng `RoleBinding` để giới hạn lại vào một
namespace. Nghĩa là ClusterRole không đồng nghĩa với "quyền toàn cluster" — phạm vi
do **binding** quyết định, không phải do role.
