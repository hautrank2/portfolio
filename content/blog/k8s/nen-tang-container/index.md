---
title: Nền tảng container
description: Thứ mà K8s điều phối. Không nắm phần này thì mọi thứ phía sau đều mơ hồ.
order:
  - container-vs-vm
  - { slug: image-va-layer, title: "Image & layer" }
  - { slug: dockerfile-va-build, title: "Dockerfile & quá trình build" }
  - { slug: registry, title: "Registry và cách image được kéo về" }
  - { slug: container-runtime, title: "Container runtime: containerd, CRI, OCI" }
---

Kubernetes không chạy container — nó *ra lệnh* cho một container runtime chạy. Nên
phần này là điều kiện cần.
