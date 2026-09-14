---
title: "6.13 Volume vs Persistent Volume"
description: Hai thứ cùng tên gọi, khác phạm vi — và bảng quyết định nên dùng cái nào.
status: growing
created: 2026-09-14
updated: 2026-09-14
tags: [k8s, volume, persistentvolume]
---

Bạn đã dùng cả hai. Note này chỉ xếp chúng cạnh nhau, vì lúc đọc tài liệu cả hai đều được
gọi là "volume" và đó là nguồn gốc của rất nhiều nhầm lẫn.

## Ba điều mỗi bên

Cả hai đều để **giữ dữ liệu lại**. Chúng tách nhau ở đúng ba chỗ:

| | Volume "thường" | Persistent Volume |
| --- | --- | --- |
| Gắn với | **Pod và vòng đời của Pod** | **Không gắn Pod** — tài nguyên độc lập của cluster |
| Tạo ra khi nào | Khai và tạo **cùng lúc với Pod** | Tạo **riêng**, Pod xin dùng qua PVC |
| Ở quy mô lớn | **Lặp đi lặp lại, khó quản chung** | Khai **một lần, dùng nhiều lần** |

Hai dòng đầu bạn đã tự tay chứng minh ở note 6.6 và 6.12. Dòng thứ ba thì chưa — vì nó
chỉ hiện ra khi có nhiều app, và đó lại là lý do PV tồn tại.

## Dòng thứ ba: "lặp lại và khó quản"

Với volume thường, **mỗi Deployment tự khai lấy chỗ chứa của mình**:

```yaml
# app-a/deployment.yaml
      volumes:
        - name: data
          hostPath: { path: /data/app-a, type: DirectoryOrCreate }
```

```yaml
# app-b/deployment.yaml
      volumes:
        - name: data
          hostPath: { path: /data/app-b, type: DirectoryOrCreate }
```

Hai mươi app là hai mươi bản sao của cùng một ý tưởng. Hệ quả:

- Đổi chỗ chứa từ thư mục node sang NFS → **sửa hai mươi file**, rollout hai mươi app
- Không có chỗ nào nhìn được *"cụm này đang dùng bao nhiêu dung lượng, ở đâu"*
- Người viết app buộc phải biết đường dẫn trên node — thứ họ không nên biết

`kubectl get` cũng không cứu được, vì volume thường **không phải object** — không có gì
để liệt kê.

Với PV thì ngược lại: chỗ chứa được khai **một lần**, và mọi app xin dùng qua PVC.

```bash
kubectl get pv
```

Một lệnh thấy toàn bộ kho của cụm. Đổi hạ tầng thì sửa PV, `deployment.yaml` không đụng
tới. Đó chính là nghĩa của *"khai một lần, dùng nhiều lần"* — không phải nhiều Pod cùng
mount một PV (chuyện đó còn phụ thuộc `accessModes`), mà là **một định nghĩa phục vụ nhiều
lần khai báo nhu cầu**.

## Nhưng PV cũng có thể là dùng dao mổ trâu

Ba object, hai file thêm, một vòng ghép đôi có thể `Pending` im lặng — tất cả để lưu một
thư mục tạm mà mất cũng không sao. Với `emptyDir` thì **hai dòng là xong**.

Đừng dùng PV vì nó "xịn hơn". Dùng nó khi dữ liệu **không dựng lại được**, hoặc khi có
nhiều hơn một người cần quản chỗ chứa. Bảng ở cuối note chốt chuyện này.

## Bảng đối chiếu

| | Volume thường | Persistent Volume |
| --- | --- | --- |
| Khai ở đâu | **Trong Pod template**, giữa `deployment.yaml` | **Object riêng**, file riêng |
| Là object của K8s? | **Không** — chỉ là một trường trong Pod spec | **Có** — `kubectl get pv` thấy nó |
| Phạm vi | Pod | **Cluster** |
| Vòng đời | Chết cùng Pod (hoặc node) | Sống tới khi có người xoá |
| Ai viết | Người viết app | Quản trị viên, hoặc driver tự tạo |
| Pod trỏ vào bằng gì | Chính nó | Qua **PVC** |
| Kiểu | `emptyDir`, `hostPath`, `configMap`… | `hostPath`, `nfs`, `csi`… |

Điểm dễ bỏ sót nhất là dòng thứ hai: **volume thường không phải một object**. Nó không có
tên trong cluster, `kubectl get` không tìm thấy, và không tồn tại độc lập với Pod chứa nó.
PV thì ngược lại — nó là công dân hạng nhất, có `kubectl describe`, có trạng thái riêng.

## Cùng một `hostPath`, hai vị trí

Dễ thấy nhất là đặt hai file cạnh nhau. Cùng trỏ vào `/data`, khác nhau ở **chỗ đứng**:

```yaml
# Volume thường — nằm trong deployment.yaml
      volumes:
        - name: story-volume
          hostPath:
            path: /data
            type: DirectoryOrCreate
```

```yaml
# PV — file riêng, object riêng
apiVersion: v1
kind: PersistentVolume
metadata:
  name: host-pv
spec:
  capacity:
    storage: 1Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: /data
    type: DirectoryOrCreate
```

Về mặt dữ liệu, hai cách này cho **kết quả y hệt** trên cụm một node. Khác biệt chỉ hiện
ra khi có người khác tham gia: đổi hạ tầng, đổi cụm, hoặc tách quyền giữa hai đội.

## Nên dùng cái nào

| Tình huống | Chọn |
| --- | --- |
| Thư mục tạm, cache, dựng lại được | `emptyDir` |
| Hai container trong cùng Pod trao đổi file | `emptyDir` |
| Đọc `/var/log`, `/proc` của node (agent, monitoring) | `hostPath` + `DaemonSet` |
| Đưa cấu hình, chứng chỉ vào container | `configMap` / `secret` |
| **Dữ liệu của app cần giữ lại** | **PVC** |
| Lab một node, muốn nhanh và không quan tâm về sau | `hostPath` — chấp nhận đánh đổi |

Quy tắc gọn: **hỏi "mất cái này có dựng lại được không?"** Dựng lại được thì volume
thường; không dựng lại được thì PVC. Đúng hai loại state ở
[note 6.2](/blog/k8s/data-and-volumes/more-than-docker-volumes).

## Ba chỗ hay nhầm

**"PV thì bền, volume thì không"** — không chính xác. `hostPath` viết trong Deployment
cũng sống qua việc xoá Deployment, bạn đã tự tay chứng minh ở
[note 6.7](/blog/k8s/data-and-volumes/hostpath). Cái PV thật sự cho bạn là **tách trách
nhiệm** và **không dính node**, chứ không phải chữ "persistent" trong tên.

**"Có StorageClass là bền"** — `local-path` của k3s vẫn cấp thư mục trên node. Có PV, có
PVC, có `Bound` đầy đủ mà Pod dời node vẫn mất dữ liệu.

**"PVC là một loại volume"** — PVC là **tờ đơn**, không phải chỗ chứa. Trong Pod spec,
`persistentVolumeClaim` đứng đúng vị trí mà `emptyDir` từng đứng, nên trông như một kiểu
volume — nhưng nó chỉ là con trỏ tới một object khác.

## Self-check

- [ ] Nói được vì sao volume thường không phải một K8s object
- [ ] Đặt được hai file `hostPath` cạnh nhau và chỉ ra khác biệt thật sự
- [ ] Dùng câu hỏi "mất có dựng lại được không?" để chọn đúng kiểu
- [ ] Phản bác được câu "PV thì bền, volume thì không"

## Open questions

- StatefulSet có `volumeClaimTemplates` — mỗi Pod một PVC riêng. Khi nào cần tới thứ đó?
- Backup một PVC thì làm thế nào? (gợi ý: `VolumeSnapshot`, cũng là một chuẩn CSI)
