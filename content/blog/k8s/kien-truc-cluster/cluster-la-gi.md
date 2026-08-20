---
title: Cluster là gì
description: Một tập máy được điều khiển như một máy duy nhất, qua vòng lặp reconcile.
status: growing
created: 2026-08-19
updated: 2026-08-20
tags: [k8s, architecture]
---

Cluster là một nhóm máy (node) được gom lại và điều khiển **như thể là một máy duy
nhất**. Bạn không nói "chạy container này trên máy số 3". Bạn nói "tôi muốn có 3 bản
sao của app này", còn chuyện đặt ở đâu là việc của cluster.

## Hai nhóm thành phần

```
┌─────────────────── Control plane ───────────────────┐
│  kube-apiserver   etcd   scheduler   controller-mgr │
└─────────────────────────┬───────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
     ┌──▼───┐          ┌──▼───┐          ┌──▼───┐
     │ Node │          │ Node │          │ Node │
     │kubelet          │kubelet          │kubelet
     │kube-proxy       │kube-proxy       │kube-proxy
     └──────┘          └──────┘          └──────┘
```

**Control plane** quyết định. **Node** thực thi.

## Điểm cốt lõi: declarative, không imperative

Đây là thứ tôi mất lâu nhất để thấy tự nhiên.

Bạn không ra lệnh *làm gì*. Bạn khai báo *trạng thái mong muốn*, ghi vào etcd qua
api-server. Rồi các controller chạy vòng lặp liên tục:

> so sánh trạng thái hiện tại với trạng thái mong muốn → nếu lệch thì hành động cho hết lệch

Vòng lặp đó gọi là **reconciliation loop**, và nó không bao giờ dừng.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3          # <- trạng thái mong muốn, không phải một mệnh lệnh
  selector:
    matchLabels: { app: web }
  template:
    metadata:
      labels: { app: web }
    spec:
      containers:
        - name: web
          image: nginx:1.27
```

Vì vậy khi bạn xoá tay một Pod, nó sẽ mọc lại:

```bash
kubectl delete pod web-7d9f8c-abcde
kubectl get pods
```

```
NAME               READY   STATUS              AGE
web-7d9f8c-xyz12   1/1     Running             4m
web-7d9f8c-qwe34   1/1     Running             4m
web-7d9f8c-rty56   0/1     ContainerCreating   1s
```

Không có gì "tự chữa" một cách kỳ diệu ở đây. Chỉ là bạn khai `replicas: 3`, hiện tại
còn 2, nên controller tạo thêm một cái. Hiểu được vòng lặp này thì phần lớn hành vi
của K8s trở nên đoán trước được.

## Câu hỏi còn mở

- etcd bị mất thì cluster hỏng tới mức nào? Backup ra sao?
- Vì sao lại cần số node control plane lẻ (3, 5) — liên quan gì tới quorum của Raft?
