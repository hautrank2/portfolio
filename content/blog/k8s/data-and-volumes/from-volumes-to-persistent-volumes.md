---
title: "6.9 Từ Volume tới Persistent Volume"
description: Cắt sợi dây buộc dữ liệu vào Pod — bằng cách tách "chỗ chứa tồn tại" khỏi "app cần chỗ chứa".
status: growing
created: 2026-09-14
updated: 2026-09-14
tags: [k8s, volume, persistentvolume, pvc]
---

Hai kiểu volume đã thử đều hỏng vì **cùng một lý do gốc**: chúng được khai **bên trong Pod
template**, nên số phận của chúng dính vào Pod (hoặc node mà Pod đang đứng).

```yaml
    spec:
      volumes:                    # ← nằm trong template của Pod
        - name: story-volume
          emptyDir: {}            # sinh cùng Pod, chết cùng Pod
```

Muốn dữ liệu sống lâu hơn Pod thì phải **đưa nó ra khỏi Pod** — thành một object riêng của
cluster.

## Ba object, ba vai

| Object | Phạm vi | Ai viết | Trả lời |
| --- | --- | --- | --- |
| **PersistentVolume** (PV) | **Cluster** — không thuộc namespace nào | Quản trị viên, hoặc driver tự tạo | *Cụm này có sẵn những chỗ chứa nào?* |
| **PersistentVolumeClaim** (PVC) | **Namespace** | Người viết app | *App của tôi cần 1Gi, kiểu này* |
| **StorageClass** | Cluster | Quản trị viên | *Khi có ai đòi, nhờ driver nào đi cấp?* |

Pod không còn trỏ vào chỗ chứa nữa. Nó trỏ vào **một tờ đơn** (PVC), và tờ đơn đó được
ghép với một PV.

```
Pod  ──►  PVC  ──►  PV  ──►  chỗ chứa thật
       (tờ đơn)  (tài nguyên
                  của cluster)
```

## PV nằm ở đâu — và đó là toàn bộ khác biệt

Vẽ cả cụm ra thì thấy ngay:

```
┌─ Cluster ────────────────────────────────────────────────┐
│                                                          │
│   ┌─ Node A ───────────────────┐                         │
│   │  Pod   Pod   PV Claim ─────┼────►  ┌──────────────┐  │
│   └────────────────────────────┘       │  Persistent  │  │
│                                        │  Volume      │  │
│   ┌─ Node B ───────────────────┐       └──────────────┘  │
│   │  Pod   Pod   PV Claim ─────┼────►  ┌──────────────┐  │
│   └────────────────────────────┘       │  Persistent  │  │
│                                        │  Volume      │  │
│                                        └──────────────┘  │
└──────────────────────────────────────────────────────────┘
```

Hai hộp `Persistent Volume` nằm **trong Cluster nhưng ngoài mọi Node**. Đó không phải
chi tiết vẽ cho đẹp — nó là điểm khác biệt duy nhất đáng nhớ.

Đặt cạnh volume thường thì rõ:

```
┌─ Node ─────────────────────────┐
│   ┌─ Pod ──────────────────┐   │
│   │   volume               │   │   ← emptyDir / hostPath
│   └────────────────────────┘   │      nằm TRONG Pod, TRONG Node
└────────────────────────────────┘
```

| | Volume thường | Persistent Volume |
| --- | --- | --- |
| Nằm ở | **Trong Pod**, nên cũng trong Node | **Trong Cluster**, ngoài mọi Node |
| Pod trỏ tới bằng | Chính nó — khai thẳng trong Pod spec | **PVC** |
| Pod dời sang node khác | Dữ liệu ở lại node cũ → mất | PV không đổi, Pod mới nối lại qua PVC |
| `kubectl get` thấy không | **Không** — nó chỉ là một trường | **Có** — `kubectl get pv` |

Để ý cột `PV Claim` trong hình: nó nằm **cùng cấp với Pod, bên trong Node**. Claim đi theo
app; PV thì không. Đó là lý do Pod nhảy node bao nhiêu lần cũng tìm lại được đúng chỗ chứa
cũ — nó mang theo tờ đơn, còn kho thì đứng yên.

Bảng đối chiếu đầy đủ ở
[note 6.13](/blog/k8s/data-and-volumes/volume-vs-persistent-volume).

## Vì sao phải tách ra hai object

Nghe thừa — sao không để Pod trỏ thẳng vào PV?

**Vì hai bên biết hai chuyện khác nhau.** Người viết app biết *"tôi cần 1Gi, đọc ghi được"*.
Họ **không** biết cụm này chạy trên AWS hay on-prem, đĩa là EBS hay NFS, tên volume là gì.
Người quản trị hạ tầng biết điều đó, nhưng không biết app nào cần bao nhiêu.

PVC là chỗ hai bên gặp nhau mà không cần biết chuyện của nhau. Cùng một file deployment
chạy được ở cả laptop lẫn production, vì phần khác nhau nằm ở PV chứ không nằm trong app.

Đây đúng là chuyện
[K8s không quản lý hạ tầng](/blog/k8s/k8s-in-action/k8s-does-not-manage-infrastructure-2)
lần nữa: K8s không tạo ra đĩa, nó chỉ **môi giới** giữa bên có và bên cần.

## Hai cách để có PV

| | Static | Dynamic |
| --- | --- | --- |
| Ai tạo PV | Bạn viết `pv.yaml` bằng tay | Driver tự tạo khi có PVC |
| Cần gì | Chỗ chứa phải có sẵn | Một `StorageClass` |
| Dùng khi | Học, hoặc hạ tầng cố định | Mọi cụm thật |

Section này đi **static** trước ([6.10](/blog/k8s/data-and-volumes/defining-a-persistent-volume)
và [6.11](/blog/k8s/data-and-volumes/persistent-volume-claim)) vì bạn nhìn thấy cả hai
mảnh và tự tay ghép chúng. Hiểu rồi thì dynamic chỉ là bỏ bớt bước đầu — và đó là thứ
`local-path` của k3s đang làm sẵn cho bạn.

## Thứ thật sự đổi

Nhìn lại bảng ở [note 6.7](/blog/k8s/data-and-volumes/hostpath):

| | `emptyDir` | `hostPath` | PV/PVC |
| --- | --- | --- | --- |
| Dữ liệu bám vào | **Pod** | **Node** | **Không bám vào gì có thể chết** |

`emptyDir` và `hostPath` không hề "kém bền hơn" theo nghĩa kỹ thuật — chúng chỉ bị buộc
vào một thứ có vòng đời ngắn. PV cắt sợi dây đó: nó là một object độc lập, sống tới khi
**có người xoá nó**, đúng như Docker volume mà bạn đã quen ở
[note 6.1](/blog/k8s/data-and-volumes/starting-project).

Nói cách khác, PV/PVC là cách K8s lấy lại thứ Docker cho không, sau khi đã đánh đổi nó để
có nhiều node.

## Self-check

- [ ] Nói được vì sao khai volume trong Pod template thì không thể bền
- [ ] Kể ba object và vai trò từng cái
- [ ] Giải thích được vì sao cần cả PV lẫn PVC, không gộp một
- [ ] Phân biệt static và dynamic provisioning

## Open questions

- PV không thuộc namespace, PVC thì có — hai namespace khác nhau dùng chung một PV được không?
- Nếu PVC đòi 1Gi mà PV chỉ có 500Mi thì chuyện gì xảy ra?
