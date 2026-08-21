---
title: "Giai đoạn 6 — Scheduling & tài nguyên"
description: Xếp Pod vào node nào, và chuyện gì xảy ra khi tài nguyên cạn.
order:
  - { slug: requests-vs-limits, title: "requests để xếp chỗ, limits để chặn" }
  - { slug: qos-class, title: "QoS class và thứ tự bị đuổi" }
  - { slug: throttle-vs-oomkilled, title: "CPU bị throttle, RAM bị giết" }
  - { slug: node-selector-affinity, title: "nodeSelector và affinity" }
  - { slug: taint-toleration, title: "Taint & toleration" }
  - { slug: topology-spread, title: "Topology spread constraints" }
  - { slug: probes, title: "Liveness, readiness và startup probe" }
  - { slug: hpa, title: "HorizontalPodAutoscaler" }
  - { slug: pdb, title: "PodDisruptionBudget" }
---

## Quy tắc probe quan trọng nhất

> **Liveness không được kiểm tra dependency bên ngoài. Readiness thì phải.**

DB sập → liveness fail → container bị giết → restart → DB vẫn sập → `CrashLoopBackOff`.
Bạn vừa biến sự cố của DB thành sự cố của chính mình.

Readiness fail thì Pod chỉ bị rút khỏi EndpointSlice và tự quay lại khi DB sống —
đó mới là hành vi đúng.

## Lab

```bash
kubectl run stress --image=polinux/stress \
  --limits=memory=64Mi -- stress --vm 1 --vm-bytes 150M --vm-hang 1
kubectl get pod stress -w
```

Xem nó `OOMKilled` rồi restart. Bỏ `limits` chạy lại, so sánh.
