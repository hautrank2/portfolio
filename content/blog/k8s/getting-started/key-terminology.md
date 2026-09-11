---
title: "Thuật ngữ & khái niệm quan trọng"
description: Từ điển cuối section, xếp theo cái nào chứa cái nào — và tám cặp từ hay bị lẫn.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, glossary]
---

Note cuối của section. Không đọc một lượt từ trên xuống — dùng nó như chỗ tra lại khi
gặp một từ đã quên.

## Từ vựng, xếp theo nhóm

**Hạ tầng**

| Từ | Nghĩa |
| --- | --- |
| Cluster | Tập node được điều khiển như một máy |
| Node | Một máy trong cluster. Với K8s, chỉ là một **bản ghi** |
| Control plane | Nhóm thành phần ra quyết định |

**Chạy việc**

| Từ | Nghĩa |
| --- | --- |
| Pod | Đơn vị nhỏ nhất. Một hoặc nhiều container chung IP và vòng đời |
| ReplicaSet | Giữ đúng số lượng Pod |
| Deployment | Quản phiên bản và cách chuyển đổi giữa các ReplicaSet |
| StatefulSet | Như Deployment nhưng Pod có **danh tính cố định** — cho DB |
| DaemonSet | Đúng một Pod trên **mỗi** node — cho agent log, monitoring |
| Job / CronJob | Chạy tới khi xong, không chạy mãi |

**Mạng**

| Từ | Nghĩa |
| --- | --- |
| Service | Tên và IP ảo ổn định, cân tải **tầng 4** |
| EndpointSlice | Danh sách IP Pod đang sống của một Service |
| Ingress | Luật định tuyến **tầng 7** theo host và path |

**Cấu hình**

| Từ | Nghĩa |
| --- | --- |
| Namespace | Vách ngăn logic để chia tên và quyền |
| Label | Nhãn **dùng để chọn** object |
| Selector | Điều kiện lọc theo label |
| Annotation | Ghi chú, không chọn được bằng nó |
| ConfigMap / Secret | Cấu hình và bí mật, tách rời khỏi image |

**Lưu trữ**

| Từ | Nghĩa |
| --- | --- |
| Volume | Thư mục gắn vào Pod, sống theo Pod |
| PersistentVolume | Một khối lưu trữ thật, sống **lâu hơn** Pod |
| PersistentVolumeClaim | Đơn xin một PV |
| StorageClass | Loại đĩa và cách cấp phát tự động |

## Tám cặp hay bị lẫn

**Pod ≠ Container.** Pod là cái vỏ chứa; K8s chỉ làm việc ở mức Pod. Bạn không bao giờ
scale một container — bạn scale Pod.

**Namespace của K8s ≠ namespace của Linux.** Trùng tên, không liên quan gì nhau. Cái ở
[nen-tang/linux](/blog/k8s/foundations/linux/namespaces-and-cgroups) là cơ chế cách ly của
kernel. Cái ở đây chỉ là một tiền tố cho tên object và một điểm neo để gắn quyền.

**Label ≠ Annotation.** Cùng là cặp key-value, khác ở chỗ **selector chỉ đọc label**.
Muốn Service tìm ra Pod thì phải dùng label. Annotation là chỗ nhét metadata cho công
cụ khác đọc — cấu hình của Ingress controller nằm ở đó.

**Service ≠ Ingress.** Service là L4, không đọc HTTP. Ingress là L7. Ingress **cần**
Service để đi tiếp, không thay thế nó.

**Ingress ≠ Ingress controller.** Ingress là tờ giấy ghi luật; controller là chương
trình đọc tờ giấy đó và thật sự làm reverse proxy. Chưa cài controller mà tạo Ingress
thì **không có gì xảy ra, và cũng không có lỗi nào báo**.

**Volume ≠ PersistentVolume.** Volume chết cùng Pod. PV thì không.

**`kubectl` ≠ `kubelet`.** Cái đầu là công cụ trên máy bạn, cái sau là tiến trình trên
node. Gõ nhầm một chữ là hai thế giới khác nhau.

**Resource ≠ Object ≠ Controller.** `pods` là **resource** — cái tên trong API. Pod
`web-abc` là một **object**. Cái vòng lặp trông nom nó là **controller**.

## Câu hỏi cuối section

[Index của section](/blog/k8s/getting-started) đặt ra một câu:

> Xoá một Pod thì nó mọc lại, nhưng xoá Deployment thì Pod biến mất hẳn. Vì sao?

Trả lời gọn: vì **quyền sở hữu**, và nó được ghi thẳng trong object.

```bash
kubectl get pod <ten-pod> -o jsonpath='{.metadata.ownerReferences}'
```

```json
[{"kind":"ReplicaSet","name":"web-6d4f8b9c7d","controller":true}]
```

Mỗi Pod mang một `ownerReferences` trỏ về ReplicaSet sinh ra nó, và ReplicaSet trỏ tiếp
về Deployment. Từ đó:

- **Xoá Pod** → ReplicaSet vẫn còn, vẫn muốn 3 bản, hiện đếm được 2 → tạo bù một cái.
- **Xoá Deployment** → không còn ai muốn ReplicaSet đó nữa. Garbage collector đi theo
  dây `ownerReferences` **ngược xuống**, dọn ReplicaSet rồi dọn Pod.

Nên câu đúng không phải *"K8s tự chữa lành"*. Pod mọc lại chỉ vì **vẫn còn một object
khai rằng nó nên tồn tại**. Bỏ object đó đi thì không có gì mọc lại cả — cùng đúng một
vòng lặp reconcile ở [Cluster là gì](/blog/k8s/getting-started/what-is-a-cluster), nhìn từ
hướng ngược lại.

## Tự kiểm

- [ ] Phân biệt được cả tám cặp ở trên mà không cần nhìn lại
- [ ] Trả lời trôi câu hỏi cuối section, có nhắc `ownerReferences`
- [ ] Nói được vì sao tạo Ingress mà chưa cài controller thì im lặng không lỗi

## Câu hỏi còn mở

- `kubectl delete deployment --cascade=orphan` để lại gì?
- CRD cho phép tự định nghĩa resource mới — vậy controller cho nó ai viết?
