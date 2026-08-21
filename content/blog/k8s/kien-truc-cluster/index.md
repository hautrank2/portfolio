---
title: "Giai đoạn 2 — Kiến trúc & dựng lab"
description: Cluster gồm gì, và chuyện gì thật sự xảy ra khi bạn gõ kubectl apply.
order:
  - cluster-la-gi
  - { slug: dung-k3s, title: "Dựng k3s trên VM Linux" }
  - { slug: control-plane, title: "Control plane: apiserver, etcd, scheduler, controller-manager" }
  - { slug: node-components, title: "Node: kubelet và kube-proxy" }
  - { slug: kubectl-va-kubeconfig, title: "kubectl, kubeconfig và context" }
  - { slug: truy-vet-kubectl-apply, title: "Truy vết một kubectl apply từ đầu tới cuối" }
---

## Bài tập trung tâm

Viết ra giấy toàn bộ chuỗi xảy ra sau một `kubectl apply`:

```
kubectl → apiserver (authn → authz → admission → validate) → etcd
        → deployment-controller → ReplicaSet → Pod (nodeName rỗng)
        → scheduler chấm điểm node → gán nodeName
        → kubelet → CRI → containerd → runc → container chạy
        → kubelet ghi status ngược lên
```

Vẽ được luồng này không nhìn tài liệu là xong giai đoạn 2. Nó là **bản đồ để về sau
biết hỏng ở khâu nào** — mọi việc debug sau này đều quy về "chuỗi này đứt ở đâu".

## Lab

```bash
kubectl api-resources          # mọi loại object trong cluster
kubectl -v=8 get pods          # xem request HTTP thật gửi lên apiserver
sudo crictl ps                 # container thật trên node
```

Lệnh `-v=8` đáng làm một lần: bạn thấy `kubectl` chỉ là một HTTP client, không hơn.
