---
title: "6.8 Hiểu về kiểu Volume CSI"
description: Cái tên bạn sẽ không bao giờ gõ ra, nhưng là thứ đứng sau mọi volume bền trong cụm thật.
status: growing
created: 2026-09-11
updated: 2026-09-11
tags: [k8s, volume, csi, storage]
---

> Note khái niệm, không có YAML nào để apply. Nhưng nó giải thích vì sao [6.9 trở đi](/blog/k8s/data-and-volumes/from-volumes-to-persistent-volumes)
> trông khác hẳn hai note vừa rồi.

`emptyDir` và `hostPath` đều tự K8s làm được, vì chúng chỉ là **thư mục trên node**. Còn
muốn dữ liệu sống độc lập với node thì phải có một hệ thống lưu trữ thật đứng sau — và
K8s không tự viết ra thứ đó.

**CSI — Container Storage Interface** — là cách K8s nói chuyện với những hệ thống đó.

## Trước khi có CSI

Mỗi nhà cung cấp lưu trữ được viết thẳng vào mã nguồn Kubernetes:

```yaml
      volumes:
        - name: data
          awsElasticBlockStore:      # ← "in-tree", nằm trong chính source của K8s
            volumeID: vol-0abc123
```

Cách này hỏng theo ba hướng cùng lúc: muốn hỗ trợ NetApp thì phải gửi patch vào
Kubernetes; sửa một lỗi driver phải chờ bản K8s tiếp theo; và source của K8s phình ra
bằng code của hàng chục hãng lưu trữ.

Những trường như `awsElasticBlockStore`, `gcePersistentDisk`, `azureDisk` giờ đã bị **gỡ
bỏ**. Gặp chúng trong tài liệu cũ thì biết đó là bài viết trước 2021.

## CSI làm gì

Biến chuyện đó thành một **giao diện chuẩn**. Hãng lưu trữ viết một driver theo chuẩn CSI,
cài vào cụm như một ứng dụng bình thường, và K8s gọi driver qua đúng bộ hàm đã quy ước:
tạo volume, gắn vào node, mount vào Pod, tháo ra, xoá.

```
     K8s  ──gọi theo chuẩn CSI──►  driver  ──►  hệ thống lưu trữ thật
                                              (EBS, Ceph, NFS, Longhorn…)
```

Hệ quả đáng giá nhất: **driver là một Pod, không phải một bản K8s**. Cài, nâng cấp, gỡ nó
như mọi thứ khác trong cụm. Và cùng một driver dùng được cho cả Nomad hay OpenShift, vì
chuẩn không thuộc về K8s.

## Bạn sẽ không gõ `csi:` trong YAML

Đây là điểm dễ hiểu nhầm nhất của note này. Có tồn tại cú pháp `csi:` trong khối `volumes`,
nhưng bạn gần như không bao giờ dùng tới.

Đường thật sự là:

```
StorageClass  ──►  PersistentVolumeClaim  ──►  Pod
  (kiểu đĩa)         (tôi cần 1Gi)           (dùng claim này)
        │
        └── ghi rõ driver CSI nào sẽ cấp đĩa
```

Bạn viết một **PVC** nói *"cho tôi 1Gi"*. StorageClass biết phải nhờ driver CSI nào. Driver
đi tạo đĩa thật. Pod chỉ thấy một thư mục.

Đó chính là lý do note 6.9 tới 6.12 nói về PV, PVC và StorageClass chứ không nói về CSI:
**CSI là tầng bạn dựa vào, không phải tầng bạn viết.**

## Nhìn CSI trong cụm của bạn

k3s có sẵn một driver — `local-path-provisioner`:

```bash
kubectl get storageclass
```

```
NAME                   PROVISIONER             RECLAIMPOLICY   DEFAULT   AGE
local-path (default)   rancher.io/local-path   Delete          true      20d
```

Cột `PROVISIONER` là tên driver sẽ được gọi khi có PVC. Dấu `(default)` nghĩa là PVC nào
không chỉ định `storageClassName` thì rơi vào nó.

Xem những driver CSI đã đăng ký:

```bash
kubectl get csidrivers
```

Và chính driver đang chạy như một app bình thường:

```bash
kubectl get pods -n kube-system | grep -i local-path
```

Một Pod, trong một namespace, xem log được, restart được — đúng điều CSI hướng tới.

> `local-path` của k3s thực ra cấp thư mục trên node, tức là vẫn mang hạn chế của
> `hostPath` về chuyện dính node. Nó tiện cho lab, nhưng đừng nhầm "có StorageClass" với
> "dữ liệu đã bền thật". Trên cụm nhiều node thật, driver sẽ là EBS, Longhorn, Ceph hay
> NFS.

## Vài driver hay gặp

| Driver | Kiểu lưu trữ | Nhiều Pod ghi cùng lúc |
| --- | --- | --- |
| `local-path` (k3s) | Thư mục trên node | Không — một node |
| AWS EBS, GCE PD, Azure Disk | Đĩa khối gắn vào một máy | **Không** — mỗi lúc một node |
| AWS EFS, NFS, CephFS | Hệ thống file chia sẻ qua mạng | **Có** |
| Longhorn, Rook/Ceph RBD | Đĩa khối phân tán, tự nhân bản | Không |

Cột cuối là cột hay làm người ta vấp. Đĩa khối (`EBS`, `PD`) chỉ gắn được vào **một node
tại một thời điểm** — nên `replicas: 3` với một PVC kiểu đó là hỏng, đúng kiểu hỏng mà
app `story` của bạn sẽ gặp. Muốn nhiều Pod cùng ghi thì phải là hệ thống file chia sẻ.

Chi tiết ở [note 6.11](/blog/k8s/data-and-volumes/persistent-volume-claim), phần `accessModes`.

## Self-check

- [ ] Nói được CSI giải quyết vấn đề gì của cách "in-tree" cũ
- [ ] Giải thích được vì sao bạn hiếm khi viết `csi:` trong YAML
- [ ] Chỉ ra được driver nào đang chạy trong cụm của mình
- [ ] Nói được vì sao "có StorageClass" chưa chắc là "dữ liệu đã bền"
- [ ] Biết loại lưu trữ nào cho nhiều Pod ghi cùng lúc, loại nào không

## Open questions

- Driver CSI chạy như Pod — vậy nó mount volume cho chính nó kiểu gì?
- Nếu driver bị gỡ trong khi vẫn còn PV đang dùng thì chuyện gì xảy ra?
