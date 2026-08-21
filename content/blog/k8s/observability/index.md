---
title: "Giai đoạn 8 — Observability"
description: Monitoring và log tập trung. Phần debug cơ bản đã tách ra học sớm hơn.
order:
  - { slug: metrics-server, title: "metrics-server và kubectl top" }
  - { slug: prometheus, title: "Prometheus: mô hình pull và service discovery" }
  - { slug: grafana, title: "Grafana" }
  - { slug: log-tap-trung, title: "Log tập trung: Loki hoặc EFK" }
  - { slug: golden-signals, title: "Bốn tín hiệu vàng" }
---

Phần `describe` / `logs` / `events` đã nằm ở [giai đoạn Debug](/blog/k8s/debug), học
ngay sau Workload. Ở đây chỉ còn monitoring — thứ cần khi hệ thống đã chạy ổn và bạn
muốn thấy xu hướng, không phải khi đang chữa cháy.

k3s có sẵn `metrics-server`, nên `kubectl top` và HPA chạy được ngay không cần cài gì.
