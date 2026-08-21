---
title: "Giai đoạn 4 — Config & Storage"
description: Đưa cấu hình vào container, và giữ dữ liệu lại sau khi Pod chết.
order:
  - { slug: configmap, title: "ConfigMap" }
  - { slug: secret-khong-phai-ma-hoa, title: "Secret không phải mã hoá" }
  - { slug: env-vs-volume, title: "env vs volume mount — cái nào cập nhật nóng" }
  - { slug: volume-types, title: "Volume: emptyDir, hostPath, projected" }
  - { slug: pv-pvc-storageclass, title: "PV, PVC và StorageClass" }
  - { slug: access-mode, title: "Access mode: RWO giới hạn theo node, không theo Pod" }
  - { slug: reclaim-policy, title: "Reclaim policy: Delete hay Retain" }
---

## Ba điều dễ hiểu sai

**Secret chỉ là base64.** Tự thuyết phục mình một lần:

```bash
kubectl create secret generic demo --from-literal=pw=s3cret
kubectl get secret demo -o jsonpath='{.data.pw}' | base64 -d
```

Muốn mã hoá thật phải bật `EncryptionConfiguration` ở apiserver, hoặc dùng external
secret store.

**`env` không cập nhật nóng.** Nạp ConfigMap qua `env` thì sửa ConfigMap **không**
ảnh hưởng container đang chạy. Mount thành file thì có, sau độ trễ vài chục giây.

**`RWO` giới hạn theo node, không theo Pod.** Hai Pod trên *cùng một node* vẫn dùng
chung được một PVC `ReadWriteOnce`.
