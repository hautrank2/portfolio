---
title: "8.9 Bắt đầu với Volume"
description: "Mọi thứ học ở module 6 đều đúng trên một node. Thêm node thứ hai là hostPath và local-path sụp, vì ổ đĩa gắn vào máy chứ không gắn vào cụm."
status: growing
created: 2026-09-25
updated: 2026-09-26
tags: [k8s, volume, storage, eks, csi, ebs, efs]
---

> Tiếp [8.8](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster). Cụm hai node đang
> chạy `auth` và `users`.

[Module 6](/blog/k8s/data-and-volumes) dạy volume trên **một** node, và mọi thứ ở đó đều
đúng — trên một node. Note này chỉ làm một việc: cho thấy điều gì gãy khi có node thứ hai,
và vì sao cloud phải đẻ ra một tầng riêng để chữa.

Dự án của section này **không ghi file** — `users-api` ghi vào MongoDB Atlas. Nên volume ở
đây là một nhánh riêng, dựng bằng một Deployment nháp để quan sát, rồi dọn đi.

## Ba kiểu volume đã học, và chúng gắn vào đâu

| Kiểu | Dữ liệu nằm ở | Sống qua |
| --- | --- | --- |
| `emptyDir` | Đĩa của node đang chạy Pod | Container restart. **Không** sống qua Pod |
| `hostPath` | Một đường dẫn cụ thể trên node | Pod chết, nhưng **chỉ trên đúng node đó** |
| PVC + PV | Tuỳ StorageClass | Tuỳ loại storage phía sau |

Hai dòng đầu có chung một chữ: **node**. Đó là toàn bộ vấn đề của note này.

```
Một node:                    Hai node:

┌─ node ─────────┐           ┌─ node A ───────┐   ┌─ node B ───────┐
│  Pod ──► /data │           │  Pod ──► /data │   │  Pod ──► /data │
└────────────────┘           └────────────────┘   └────────────────┘
Pod sinh lại vẫn                     ▲                     ▲
thấy /data cũ                        └── hai thư mục khác nhau,
                                         cùng một đường dẫn
```

## Bài tập — Nhìn `hostPath` gãy

Dựng một Deployment nháp ghi tên Pod vào file mỗi 5 giây:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: writer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: writer
  template:
    metadata:
      labels:
        app: writer
    spec:
      containers:
        - name: writer
          image: busybox:1.36
          command: ["sh", "-c", "while true; do echo $HOSTNAME >> /data/log.txt; sleep 5; done"]
          volumeMounts:
            - name: data
              mountPath: /data
      volumes:
        - name: data
          hostPath:
            path: /tmp/writer-data
            type: DirectoryOrCreate
```

```bash
kubectl apply -f writer.yaml && kubectl rollout status deployment writer --timeout=60s
```

```bash
kubectl get pods -l app=writer -o wide
```

**Đoán trước:** hai Pod cùng ghi vào `/data/log.txt`. Đọc file từ Pod này có thấy dòng của
Pod kia không?

```bash
for p in $(kubectl get pods -l app=writer -o name); do echo "== $p"; kubectl exec $p -- sort -u /data/log.txt; done
```

**Kết quả** phụ thuộc chỗ scheduler đặt Pod:

| Hai Pod nằm | Bạn thấy |
| --- | --- |
| Cùng node | Hai file giống nhau, có tên cả hai Pod — dễ tưởng là đã chia sẻ được |
| Khác node | **Hai file khác nhau**, mỗi cái chỉ có tên Pod của chính nó |

Đó là cái bẫy: `hostPath` **trông như** chạy được, cho tới một ngày scheduler đặt Pod sang
máy khác. Và bạn không kiểm soát được ngày đó — rollout, node bị drain, node chết đều
khiến Pod chuyển nhà.

Ép nó lộ ra ngay:

```bash
kubectl delete pod -l app=writer && sleep 20 && for p in $(kubectl get pods -l app=writer -o name); do echo "== $p"; kubectl exec $p -- wc -l /data/log.txt; done
```

Pod nào rơi sang node chưa từng chạy `writer` sẽ bắt đầu lại từ một file rỗng.

```bash
kubectl delete deployment writer
```

## Vì sao cloud cần một tầng khác

Vấn đề không phải "K8s làm sai". Vấn đề là **ổ đĩa gắn vào máy**, mà Pod thì tự do đi lại
giữa các máy. Muốn dữ liệu đi theo Pod, storage phải nằm **ngoài** node và nối vào qua
mạng.

AWS có hai lựa chọn, và chúng khác nhau ở chỗ căn bản:

| | **EBS** | **EFS** |
| --- | --- | --- |
| Là gì | Ổ đĩa block, như cắm thêm SSD vào một máy | Hệ thống file chia sẻ qua mạng, giao thức NFS |
| Gắn được vào | **Một** node tại một thời điểm | **Nhiều** node cùng lúc |
| Phạm vi | Một Availability Zone | Nhiều AZ trong region |
| Access mode | `ReadWriteOnce` | **`ReadWriteMany`** |
| Tính tiền | Theo dung lượng cấp phát | Theo dung lượng thật sự dùng |
| Hợp với | Database một bản, ghi nhiều | Nhiều Pod cùng đọc ghi một thư mục |

Nhớ ba access mode, vì chúng quyết định bạn dùng được loại nào:

| Mode | Nghĩa |
| --- | --- |
| `ReadWriteOnce` (RWO) | Một **node** mount đọc ghi. Nhiều Pod trên cùng node đó vẫn dùng chung được |
| `ReadOnlyMany` (ROX) | Nhiều node mount, chỉ đọc |
| `ReadWriteMany` (RWX) | Nhiều node mount, đọc ghi — đây là thứ bài tập `writer` ở trên cần |

Chi tiết dễ hiểu sai: `ReadWriteOnce` giới hạn theo **node**, không phải theo Pod.

## EFS là gì, nhìn từ phía Kubernetes

EFS là một **hệ thống file dùng chung** mà AWS quản lý, nói giao thức **NFS**. Đúng nghĩa
đen: nhiều máy `mount` chung một thư mục qua mạng, và cái gì một máy ghi thì máy kia đọc
được ngay. Đây chính là thứ bài tập `writer` ở trên cần mà `hostPath` không cho.

| | |
| --- | --- |
| **Không** có dung lượng cố định | Không khai trước bao nhiêu GB. Ghi tới đâu tính tiền tới đó |
| **Không** thuộc về node nào | Nó là một tài nguyên trong VPC, không gắn vào EC2 cụ thể |
| **Không** giới hạn một AZ | Node ở AZ nào cũng mount được, miễn AZ đó có mount target |

### Bốn thứ phải có, và thứ tự của chúng

Đây là phần lộ ra rằng storage trên cloud là chuyện **mạng**, không phải chuyện đĩa:

| # | Thứ | Vai trò |
| --- | --- | --- |
| 1 | **File system** | Bản thân EFS, có một `FileSystemId` dạng `fs-0abc…` |
| 2 | **Mount target** ở mỗi AZ | Một địa chỉ IP trong subnet để node ở AZ đó nối vào. Thiếu nó, node ở AZ ấy **không** mount được |
| 3 | **Security group** mở cổng **2049** | Cổng NFS. Phải cho phép traffic **từ security group của node** |
| 4 | **EFS CSI driver** trong cụm | Phần dịch từ "PVC" sang "lệnh mount NFS" |

Ba cái đầu nằm hoàn toàn ở phía AWS, và Kubernetes không biết gì về chúng. Chỉ cái thứ tư
mới sống trong cụm.

> Quên cổng **2049** là lỗi phổ biến nhất khi gắn EFS, và nó biểu hiện rất khó chịu: PVC
> `Bound` bình thường, nhưng Pod kẹt ở `ContainerCreating` cho tới khi timeout, với thông
> báo đại loại `mount.nfs4: Connection timed out` trong `kubectl describe pod`. Nhìn từ
> tầng Kubernetes thì mọi thứ đều xanh.

### Tĩnh hay động

Có hai cách nối EFS vào cụm, và section này đi đường thứ nhất:

| | **Static provisioning** | **Dynamic provisioning** |
| --- | --- | --- |
| Bạn làm gì | Tự tạo EFS, rồi tự viết một PV trỏ vào `FileSystemId` | Khai StorageClass một lần, PVC tự sinh ra PV |
| Thứ được tạo tự động | Không có | Một **access point** cho mỗi PVC |
| Hợp với | Học, hoặc khi EFS đã tồn tại sẵn | Dùng thật, nhiều team, nhiều app |

Cách tĩnh rườm rà hơn nhưng dạy được nhiều hơn: bạn viết tay đúng cái object mà bình
thường hệ thống sinh hộ, nên nhìn thấy PV và PVC rời nhau ra sao — đúng chỗ
[note 6.10](/blog/k8s/data-and-volumes/defining-a-persistent-volume) đã dựng nền.

### Cái giá

| | |
| --- | --- |
| Chậm hơn EBS | NFS đi qua mạng, latency cao hơn ổ block gắn thẳng |
| Không hợp làm database | Ghi ngẫu nhiên nhiều, khoá file — MongoDB hay Postgres trên NFS là lựa chọn tồi |
| Tính tiền theo dung lượng dùng | Rẻ khi ít dữ liệu, nhưng có thêm phí throughput nếu đọc ghi nhiều |
| Vẫn tính tiền khi cụm đã xoá | EFS **không** biến mất theo cluster — đây là thứ hay bị bỏ quên trên hoá đơn |

Dòng cuối đáng ghi lại: EFS là tài nguyên của VPC, không phải của Kubernetes. Xoá cluster,
xoá node group, xoá PVC — file system vẫn nằm đó.

```bash
aws efs describe-file-systems --query "FileSystems[].{id:FileSystemId,size:SizeInBytes.Value,name:Name}" --output table
```

## CSI: ai là người đi gắn ổ đĩa

Kubernetes không biết EBS hay EFS là gì. Nó chỉ nói "Pod này cần một volume 5Gi kiểu X",
rồi để một **driver** lo phần còn lại: gọi API AWS tạo ổ đĩa, gắn vào đúng node, mount vào
đúng thư mục.

**CSI** — Container Storage Interface — là bản hợp đồng giữa hai bên đó. Nhờ nó, mã của
từng nhà cung cấp nằm ngoài Kubernetes, cài thêm khi cần.

```
Bạn khai PVC
   │
   ▼
StorageClass ──► CSI driver ──► API của AWS ──► EBS volume / EFS access point
                 (Pod chạy trong cụm)
```

Trên EKS, **driver không có sẵn**. Cụm mới dựng không cài EBS CSI hay EFS CSI driver, nên
một PVC khai ra sẽ nằm mãi ở `Pending` mà không có lỗi rõ ràng. Kiểm tra cụm đang có gì:

```bash
kubectl get storageclass
```

```bash
kubectl get csidrivers
```

```bash
aws eks list-addons --cluster-name kub-dep-demo
```

Đây là khác biệt lớn nhất so với k3s: k3s ship sẵn `local-path` và đặt nó làm mặc định,
nên ở module 6 bạn khai PVC là có ngay. Trên EKS, phần "có ngay" đó là thứ **bạn phải tự
cài**.

## `local-path` của k3s cũng dính đúng bẫy này

Một điểm đáng nói vì nó dễ gây hiểu nhầm: PVC **không** tự nghĩa là an toàn. `local-path`
cấp một thư mục **trên node đang chạy Pod**, nên nó chỉ là `hostPath` có thêm lớp áo PVC.

```bash
kubectl get storageclass local-path -o jsonpath='{.provisioner}{"\n"}'
```

Trên cụm k3d nhiều node, PV do `local-path` cấp bị **ghim vào một node** qua
`nodeAffinity`. Hệ quả: Pod nào cần PVC đó buộc phải chạy trên đúng node ấy, và node chết
là Pod `Pending` vô thời hạn.

Vậy nên câu hỏi đúng không phải *"tôi đã dùng PVC chưa"* mà là **"phía sau PVC là loại
storage nào, và nó gắn vào node hay gắn vào mạng"**.

## Chọn cái gì cho việc gì

| Nhu cầu | Dùng |
| --- | --- |
| Cache, file tạm, chết cùng Pod cũng không sao | `emptyDir` |
| Đọc thứ gì đó của chính node, ví dụ log hệ thống | `hostPath` — và chấp nhận Pod bị ghim vào node |
| Một Pod ghi, cần sống qua rollout | PVC với **EBS** |
| Nhiều Pod cùng ghi một thư mục | PVC với **EFS** |
| Dữ liệu quan trọng, quan hệ, có truy vấn | **Đừng tự host** — dùng RDS, Atlas, hay dịch vụ tương đương |

Dòng cuối chính là lựa chọn của dự án section này: `users-api` ghi vào Atlas, nên nó không
cần volume nào cả, và cũng không có bài toán "dữ liệu đi đâu khi Pod chuyển node".

Ba note tiếp theo dựng EFS để thấy nhánh `ReadWriteMany` hoạt động ra sao:
[8.10](/blog/k8s/deploy-to-cloud/adding-efs-as-a-volume) cài driver,
[8.11](/blog/k8s/deploy-to-cloud/persistent-volume-for-efs) khai PV và PVC,
[8.12](/blog/k8s/deploy-to-cloud/using-the-efs-volume) mount vào Pod.

## Nếu chỉ đọc chứ không bật EKS

Bài tập `writer` ở trên chạy nguyên xi trên k3d, và đó mới là phần đáng làm — nó cho thấy
`hostPath` gãy, thứ mà cụm một node không bao giờ cho bạn thấy:

```bash
k3d cluster create lab --agents 2
```

Cái k3d **không** tái hiện được là EFS: không có storage nào gắn qua mạng để nhiều node
cùng ghi. Muốn thử `ReadWriteMany` ở local thì phải tự dựng một NFS server, và lúc đó bạn
đang làm đúng việc mà EFS bán.

## Self-check

- [ ] Nói được vì sao `hostPath` "chạy được" trên một node nhưng sai về bản chất
- [ ] Giải thích được vì sao hai Pod cùng `hostPath` có thể thấy hai nội dung khác nhau
- [ ] Phân biệt EBS và EFS qua access mode và phạm vi AZ
- [ ] Nói được `ReadWriteOnce` giới hạn theo node hay theo Pod
- [ ] Giải thích CSI driver làm gì, và vì sao EKS không có sẵn
- [ ] Nói được vì sao PVC với `local-path` vẫn dính đúng bẫy của `hostPath`
- [ ] Kể bốn thứ phải có để gắn được EFS, và cái nào nằm ngoài Kubernetes
- [ ] Nói được triệu chứng khi quên mở cổng 2049
- [ ] Phân biệt static và dynamic provisioning của EFS

## Open questions

- PV do `local-path` cấp bị ghim vào một node. Vậy `kubectl drain` node đó thì Pod đi đâu?
- EBS là `ReadWriteOnce`. Vậy một StatefulSet ba bản thì mỗi bản một ổ, hay dùng chung một ổ?
- EFS tính tiền theo dung lượng dùng thật, không cấp phát trước. Điều đó đổi cách bạn khai `storage:` trong PVC thế nào?
