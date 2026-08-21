---
title: "Giai đoạn 3 — Workload"
description: Pod tới CronJob. Thứ tự dưới đây là bắt buộc, không đảo được.
order:
  - { slug: pod-va-vong-doi, title: "Pod và vòng đời" }
  - { slug: pause-container, title: "Pause container và network namespace dùng chung" }
  - { slug: init-container-sidecar, title: "Init container và sidecar native" }
  - { slug: replicaset, title: "ReplicaSet" }
  - { slug: deployment, title: "Deployment" }
  - { slug: rolling-update, title: "Rolling update, maxSurge và maxUnavailable" }
  - { slug: daemonset, title: "DaemonSet" }
  - { slug: statefulset, title: "StatefulSet và volumeClaimTemplates" }
  - { slug: job-cronjob, title: "Job & CronJob" }
---

## Bài tập phá — làm nghiêm túc

```bash
kubectl set image deploy/web nginx=nginx:khong-ton-tai
kubectl get pods
kubectl describe deploy web
```

Quan sát: Pod cũ **vẫn chạy**, Pod mới kẹt `ImagePullBackOff`, rollout đứng im. Hiểu
vì sao lại thế chính là hiểu `maxUnavailable`.

## Vượt chặng khi

Viết được Deployment YAML từ đầu, không copy, và giải thích được vì sao
`selector.matchLabels` bắt buộc phải khớp `template.metadata.labels`.
