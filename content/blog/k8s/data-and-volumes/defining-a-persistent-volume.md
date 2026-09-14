---
title: "6.10 Định nghĩa một Persistent Volume"
description: Bảy trường, mỗi trường một quyết định — và với mỗi trường, còn những lựa chọn nào khác.
status: growing
created: 2026-09-14
updated: 2026-09-14
tags: [k8s, persistentvolume, yaml, storage]
---

> Tiếp [6.9](/blog/k8s/data-and-volumes/from-volumes-to-persistent-volumes). Đây là object
> đầu tiên trong section này **không nằm trong** `deployment.yaml`.

## `host-pv.yaml`

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: host-pv
spec:
  capacity:
    storage: 1Gi
  volumeMode: Filesystem
  storageClassName: standard
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: /data
    type: DirectoryOrCreate
```

```bash
kubectl apply -f host-pv.yaml && kubectl get pv
```

```
NAME      CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS      CLAIM   STORAGECLASS   AGE
host-pv   1Gi        RWO            Retain           Available           standard       3s
```

`STATUS: Available` — PV đã tồn tại nhưng **chưa thuộc về ai**, cột `CLAIM` rỗng. Nó nằm
đó chờ một PVC khớp điều kiện.

## Từng dòng một

**`apiVersion: v1`** — PV là object lõi, không thuộc nhóm `apps/v1` như Deployment.

**`kind: PersistentVolume`** — cluster-scoped. Không có `metadata.namespace`, và thêm vào
cũng bị bỏ qua.

**`metadata.name: host-pv`** — tên này sẽ xuất hiện ở cột `VOLUME` của PVC khi hai bên
ghép xong.

**`capacity.storage: 1Gi`** — dung lượng bạn **tuyên bố**. Với `hostPath` thì đây là con
số trên danh nghĩa: K8s không giới hạn `/data` ở 1Gi, cũng không kiểm đĩa node còn bao
nhiêu. Nó chỉ dùng để so với `requests.storage` của PVC. Với đĩa cloud thật thì con số này
mới thực sự được cấp phát.

**`volumeMode: Filesystem`** — K8s format và mount sẵn, đưa cho container một thư mục.

**`storageClassName: standard`** — ở đây **không** trỏ tới StorageClass nào có thật. Nó
chỉ là **nhãn ghép đôi**: PVC nào ghi đúng chữ `standard` mới nhận được PV này.

Kiểm chứng — cụm bạn không hề có class tên `standard`:

```bash
kubectl get storageclass
```

Vẫn chỉ có `local-path`, mà PV vẫn `Available` bình thường.

**`accessModes: [ReadWriteOnce]`** — *một **node** được mount để đọc ghi*. Đơn vị là node,
không phải Pod. Đào kỹ ở [note 6.11](/blog/k8s/data-and-volumes/persistent-volume-claim).

**`hostPath`** — chỗ chứa thật. Đúng cú pháp đã dùng ở
[note 6.7](/blog/k8s/data-and-volumes/hostpath), chỉ khác là giờ nó nằm trong PV thay vì
trong Pod. Đó là **toàn bộ** ý nghĩa của việc tách ra: cùng thư mục `/data`, nhưng vòng
đời không còn dính vào Pod nào.

**`RECLAIM POLICY: Retain`** — trường bạn **không khai** mà vẫn hiện ra. Mặc định cho PV
tạo bằng tay: xoá PVC thì PV chuyển sang `Released` và **dữ liệu vẫn còn**. Đổi lại, PV ở
`Released` không tự quay về `Available` — phải xoá rồi tạo lại mới dùng tiếp được.

## Không dùng cái này thì còn gì khác

Mỗi trường là một ngã rẽ. Bảng này để biết mình đang bỏ qua cái gì:

| Trường | Đang dùng | Thay được bằng | Khi nào |
| --- | --- | --- | --- |
| `volumeMode` | `Filesystem` | `Block` | Đưa nguyên thiết bị khối thô cho app tự xử lý — database hiệu năng cao |
| `storageClassName` | `standard` (nhãn tự đặt) | `local-path` | Muốn k3s **tự cấp** PV, khỏi viết file này |
| | | `""` (rỗng) | Chặn hẳn class mặc định, chỉ ghép với PV không class |
| `accessModes` | `ReadWriteOnce` | `ReadWriteMany` | Nhiều node cùng ghi — **cần** NFS/EFS/CephFS |
| | | `ReadOnlyMany` | Nhiều node cùng đọc, không ghi |
| | | `ReadWriteOncePod` | Chặt nhất: đúng **một Pod** |
| `hostPath` | thư mục node | `nfs` | Nhiều node dùng chung, không cần driver |
| | | `csi` | Đĩa cloud, Longhorn, Ceph — cách của production |
| | | `local` | Đĩa gắn trực tiếp, có ràng buộc node tường minh |
| *reclaim policy* | `Retain` | `persistentVolumeReclaimPolicy: Delete` | Xoá PVC là xoá luôn dữ liệu — hợp môi trường tạm |

**Và lựa chọn lớn nhất: không viết file này.** Đây là *static provisioning* — bạn tự cấp
PV. Cách còn lại là để driver tự tạo:

```yaml
# pvc.yaml — không cần PV nào cả
spec:
  storageClassName: local-path
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 1Gi
```

k3s sẽ tự đẻ ra PV khi có Pod dùng tới. Ngắn hơn hẳn, và là cách mọi cụm thật đang làm.

Section này vẫn đi static trước vì bạn **nhìn thấy cả hai mảnh** và tự tay ghép chúng —
hiểu rồi thì dynamic chỉ là bỏ bớt bước đầu.

## Self-check

- [ ] Viết được một PV từ đầu, không copy
- [ ] Giải thích vì sao `capacity` với `hostPath` chỉ là con số trên danh nghĩa
- [ ] Nói được `storageClassName` ở đây dùng làm gì, khi không có class nào tên đó
- [ ] Nói được `Retain` khác `Delete` chỗ nào
- [ ] Kể được ít nhất hai lựa chọn thay thế cho `hostPath`

## Open questions

- Hai PV cùng class và cùng dung lượng — PVC sẽ chọn cái nào?
- PV đang `Bound` mà `kubectl delete pv` thì Pod đang chạy có sao không?
