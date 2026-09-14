---
title: "6.11 Tạo Persistent Volume Claim"
description: Tờ đơn xin chỗ chứa — bốn trường, và ba điều kiện quyết định nó có được nhận hay không.
status: growing
created: 2026-09-14
updated: 2026-09-14
tags: [k8s, pvc, accessmodes, storage]
---

> Cần `host-pv` đang `Available` từ
> [6.10](/blog/k8s/data-and-volumes/defining-a-persistent-volume).

## `host-pvc.yaml`

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: host-pvc
spec:
  volumeName: host-pv
  storageClassName: standard
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

```bash
kubectl apply -f host-pvc.yaml && kubectl get pvc && kubectl get pv
```

```
NAME       STATUS   VOLUME    CAPACITY   ACCESS MODES   STORAGECLASS   AGE
host-pvc   Bound    host-pv   1Gi        RWO            standard       2s

NAME      CAPACITY   STATUS   CLAIM              STORAGECLASS   AGE
host-pv   1Gi        Bound    default/host-pvc   standard       9m
```

Cả hai chuyển sang `Bound`, mỗi bên ghi tên bên kia. Quan hệ này là **một-một** — PV đã bị
đặt chỗ, không PVC nào khác lấy được nữa.

## Từng dòng một

**`kind: PersistentVolumeClaim`** — khác PV ở chỗ nó **thuộc namespace**. Cột `CLAIM` của
PV ghi `default/host-pvc` chính là vì vậy.

**`volumeName: host-pv`** — chỉ **đích danh** PV muốn dùng. Trường này **tuỳ chọn**: bỏ đi
thì K8s tự tìm PV nào thoả ba điều kiện bên dưới. Ở đây ghi rõ cho dễ theo dõi.

**`storageClassName: standard`** — phải **khớp đúng từng ký tự** với PV.

> **Đây là dòng quyết định trên k3s.** Bỏ nó đi thì admission controller **tự điền class
> mặc định** — `local-path`. PVC class `local-path` không ghép được với PV class
> `standard`, và tệ hơn: `local-path` có provisioner thật nên K8s sẽ đi **tạo một PV hoàn
> toàn mới**, còn `host-pv` nằm `Available` mãi không ai dùng. Mọi thứ `Bound` xanh đẹp
> nhưng dữ liệu đi vào chỗ khác, không phải `/data`.
>
> Khoá học dùng minikube, nơi `standard` **là** tên class mặc định — nên bỏ trống hay ghi
> rõ đều ra cùng một giá trị. Trên k3s thì không.

**`accessModes`** — PVC đòi mode nào thì PV phải **có chứa** mode đó.

**`resources.requests.storage: 1Gi`** — dung lượng tối thiểu cần. PV phải **≥** con số này.

## Ba điều kiện để ghép được

K8s chỉ ghép khi **cả ba** đều thoả:

| Điều kiện | PVC | PV | |
| --- | --- | --- | --- |
| `storageClassName` khớp đúng chữ | `standard` | `standard` | ✅ |
| PV **chứa** mode PVC đòi | `RWO` | `RWO` | ✅ |
| `capacity` PV **≥** `requests` | 1Gi | 1Gi | ✅ |

Lệch một cái là PVC nằm `Pending` **vĩnh viễn, không lỗi nào**. Muốn biết vì sao:

```bash
kubectl describe pvc host-pvc | tail -5
```

## `accessModes` — trường quyết định scale được hay không

| Mode | Viết tắt | Nghĩa |
| --- | --- | --- |
| `ReadWriteOnce` | RWO | **Một node** mount để đọc ghi |
| `ReadOnlyMany` | ROX | Nhiều node mount, chỉ đọc |
| `ReadWriteMany` | RWX | Nhiều node mount, đọc ghi |
| `ReadWriteOncePod` | RWOP | **Một Pod** duy nhất |

**Đơn vị là *node*, không phải *Pod*.** Với `ReadWriteOnce`, ba Pod cùng một node vẫn
mount chung được — đúng như bài tập 2 ở [note 6.7](/blog/k8s/data-and-volumes/hostpath).
Nhưng Pod rơi sang node khác thì kẹt `Pending` vĩnh viễn.

Đó là lý do nhiều người scale lên 3 thấy chạy ngon trên cụm một node, rồi lên production
ba node thì hai Pod không bao giờ khởi động.

Và RWX không phải muốn là được — nó phụ thuộc loại lưu trữ:

| Loại lưu trữ | RWX? |
| --- | --- |
| `hostPath`, `local-path` | Không |
| Đĩa khối — EBS, GCE PD, Azure Disk | Không |
| Hệ thống file chia sẻ — NFS, EFS, CephFS | **Có** |

Khai `ReadWriteMany` trong PV `hostPath` thì K8s **vẫn cho apply** — nó không kiểm được
điều đó. Bạn chỉ phát hiện khi Pod rơi sang node khác và dữ liệu không thấy đâu.

## Bài tập — Đòi nhiều hơn PV có

**Đoán trước:** sửa `requests.storage` thành `5Gi` trong khi PV chỉ có `1Gi`. Báo lỗi
ngay, hay im lặng?

```bash
kubectl delete pvc host-pvc && sed 's/storage: 1Gi/storage: 5Gi/' host-pvc.yaml | kubectl apply -f - && kubectl get pvc
```

**Kết quả:** `Pending`, không lỗi nào.

```bash
kubectl describe pvc host-pvc | tail -4
```

Events nói `no persistent volumes available for this claim`. K8s **chờ vô hạn** — vì biết
đâu lát nữa có người tạo thêm PV 5Gi.

Trả lại:

```bash
kubectl delete pvc host-pvc && kubectl apply -f host-pvc.yaml && kubectl get pvc
```

> Vẫn `Pending`? Xem `kubectl get pv` — với `Retain`, `host-pv` đang ở `Released` và
> **không tự quay về** `Available`:
>
> ```bash
> kubectl delete pv host-pv && kubectl apply -f host-pv.yaml
> ```

## Bước cuối: trỏ deployment vào PVC

Trong `deployment.yaml`, đổi khối `volumes` — `volumeMounts` giữ nguyên:

```yaml
      volumes:
        - name: story-volume
          persistentVolumeClaim:
            claimName: host-pvc
```

Tên `story-volume` là **tên nội bộ trong Pod**, vẫn phải khớp với `volumeMounts[].name`.
Thứ đổi là *nguồn* của nó: từ `hostPath` sang một tờ đơn.

Chạy thử và đo độ bền ở [note 6.12](/blog/k8s/data-and-volumes/using-a-claim-in-a-pod).

## Self-check

- [ ] Kể ba điều kiện để PVC ghép được với PV
- [ ] Nói được vì sao bỏ `storageClassName` trên k3s lại hỏng âm thầm
- [ ] Giải thích `ReadWriteOnce` tính theo **node**, và hệ quả khi scale
- [ ] Biết loại lưu trữ nào cho `ReadWriteMany`, loại nào không
- [ ] Nói được vì sao PV `Released` không tự dùng lại được

## Open questions

- PVC đòi 1Gi mà ghép vào PV 10Gi — app dùng được 1Gi hay 10Gi?
- Xoá PVC trong khi Pod đang dùng nó thì chuyện gì xảy ra?
