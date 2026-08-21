---
title: "Giai đoạn 9 — Đóng gói & GitOps"
description: Quản lý hàng chục file YAML mà không phát điên.
order:
  - { slug: kustomize, title: "Kustomize: base và overlay" }
  - { slug: helm, title: "Helm: chart, values, release" }
  - { slug: helm-vs-kustomize, title: "Helm hay Kustomize?" }
  - { slug: gitops-la-gi, title: "GitOps là control loop ở tầng cao hơn" }
  - { slug: argocd, title: "ArgoCD" }
---

## Kustomize trước, Helm sau — có chủ ý

Kustomize chỉ là YAML thuần cộng overlay, không có ngôn ngữ mới. Học Helm khi chưa
viết vững YAML thô sẽ khiến bạn dùng chart như hộp đen.

## Thói quen cần tạo

**Luôn xem YAML cuối cùng trước khi apply.**

```bash
kubectl kustomize overlays/prod
helm template myapp ./chart
```

## Vòng khép kín

GitOps chính là control loop của [giai đoạn 1](/blog/k8s/mo-hinh-tu-duy), áp ở tầng
cao hơn: Git là trạng thái mong muốn, ArgoCD là controller, cluster là trạng thái
hiện tại.
