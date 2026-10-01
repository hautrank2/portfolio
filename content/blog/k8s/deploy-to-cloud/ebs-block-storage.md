---
title: "8.8 EBS — đĩa cho MongoDB"
description: "Đĩa khối gắn vào đúng một instance trong đúng một AZ, và vì sao điều đó quyết định cách bạn viết PVC."
status: growing
created: 2026-09-29
updated: 2026-09-30
tags: [k8s, aws, ebs, storage, pvc, csi]
---

> Tiếp [8.7](/blog/k8s/deploy-to-cloud/efs-file-system). EFS đã có, dành cho ảnh món. Note
> này là chỗ ở của thứ còn lại có state: **dữ liệu MongoDB**.

Khác với EFS, bạn **không bấm tạo** EBS. Nó sinh ra từ một dòng YAML trong
`kubernetes/mongo.yaml`, lúc bạn apply ở [8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster).

Vậy sao nó có note riêng, đặt trước cả cluster? Vì **dòng YAML đó chỉ viết đúng được khi
bạn đã hiểu hai ràng buộc của EBS.** Không hiểu thì lỗi sẽ đến dưới dạng một Pod `Pending`
không nói rõ lý do, vào đúng lúc bạn đang rollout.

> **Note này để đọc, chưa phải để chạy.** Lúc này chưa có cluster (8.11), chưa có node
> (8.13), chưa có PVC nào (8.14) — `kubectl` chưa có gì để gọi tới. YAML và output trong
> bài là **mẫu** để bạn biết mình sắp gặp gì. Các lệnh kiểm tra được gom ở mục
> **"Khi tới 8.14"** cuối note. Việc cấp quyền cho driver cũng phải đợi có cluster.

## EBS là gì

**Elastic Block Store** là một **ổ đĩa ảo**. Nó cắm vào một EC2 instance qua mạng của AWS,
nhưng với hệ điều hành thì nó trông y như một ổ cứng thật: `/dev/nvme1n1`, format `ext4`,
mount vào một thư mục.

Bạn đã dùng EBS mà không để ý: **ổ `20 GiB` của mỗi worker node** ở
[8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes) chính là một đĩa EBS. Note này nói về
một đĩa **thứ hai**, riêng cho Mongo, sống lâu hơn mọi Pod và mọi node.

## Hai ràng buộc

| Ràng buộc | Nghĩa | Hệ quả trong Kubernetes |
| --- | --- | --- |
| **Một instance** | Mỗi lúc chỉ gắn vào đúng một EC2 | Access mode `ReadWriteOnce` |
| **Một AZ** | Đĩa sinh ra ở AZ nào thì chết ở AZ đó | Pod dùng đĩa chỉ chạy được trên node **cùng AZ** |

Ràng buộc thứ nhất là cái bạn đã biết từ [section 6](/blog/k8s/data-and-volumes). Ràng buộc
thứ hai là cái mới — cụm một node không bao giờ có "AZ khác" để mà gặp lỗi. Cụm này có hai
AZ, vì [8.6](/blog/k8s/deploy-to-cloud/vpc-and-subnets) bắt buộc như vậy.

## `ReadWriteOnce` nghĩa là một node, không phải một Pod

Đây là chỗ hay hiểu sai. `ReadWriteOnce` không nói "chỉ một Pod được dùng", mà nói **"chỉ
gắn được vào một node"**. Hai Pod trên cùng node vẫn dùng chung được; hai Pod trên hai
node thì không.

Đó là lý do `mongo.yaml` có đoạn này:

```yaml
spec:
  replicas: 1
  strategy:
    type: Recreate
```

Mặc định `RollingUpdate` tạo Pod mới **trước**, rồi mới xoá Pod cũ. Nếu scheduler đặt Pod
mới lên node khác, nó phải đòi đĩa đang gắn ở node kia — và kẹt:

```
Multi-Attach error for volume "pvc-…" Volume is already exclusively attached to one node
and can't be attached to another
```

`Recreate` đảo thứ tự: xoá Pod cũ, đĩa được tháo ra, rồi mới tạo Pod mới. Đổi lại vài giây
không có database — với một Mongo một bản, đó là cái giá không tránh được.

## Từ một dòng PVC tới một đĩa thật

`mongo.yaml` khai PVC như sau:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: cafe-mongo-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gp2
  resources:
    requests:
      storage: 2Gi
```

Và đây là chuỗi việc xảy ra sau lưng bạn khi apply nó:

```
PVC cafe-mongo-pvc (gp2, 2Gi)
   │  chờ — chưa có Pod nào dùng
   ▼
Pod mongo được xếp lên một node ở AZ-a
   │
   ▼
StorageClass gp2 ──► EBS CSI driver ──► API EC2: CreateVolume ở AZ-a
                                              │
                                              ▼
                              PV pvc-… (gắn nhãn: chỉ AZ-a) ──► Bound
                                              │
                                              ▼
                              AttachVolume vào node ──► mount vào /data/db
```

Ba mắt xích trong chuỗi này đáng xem kỹ.

### StorageClass `gp2`

EKS tạo sẵn StorageClass này trong mọi cụm mới. Nó trông như sau:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp2
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp2
  fsType: ext4
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

Ba trường đáng đọc:

| Trường | Giá trị | Nghĩa |
| --- | --- | --- |
| `provisioner` | `kubernetes.io/aws-ebs` | Tên cũ, từ thời driver nằm trong lõi Kubernetes |
| `volumeBindingMode` | `WaitForFirstConsumer` | **Chưa tạo đĩa cho tới khi có Pod cần nó** |
| `reclaimPolicy` | `Delete` | Xoá PVC là xoá luôn đĩa |

`provisioner` ghi tên cũ, nhưng driver trong lõi đã bị gỡ. Kubernetes chuyển mọi yêu cầu
sang **EBS CSI driver** — nên thiếu add-on `aws-ebs-csi-driver` thì PVC kẹt `Pending` mãi,
dù StorageClass vẫn nằm đó.

Một chi tiết nữa: trên cụm EKS mới, `gp2` **không còn là StorageClass mặc định**. Đó là
lý do `mongo.yaml` ghi thẳng `storageClassName: gp2` — bỏ dòng đó đi thì PVC không biết
dùng class nào, và cũng kẹt `Pending`.

### `WaitForFirstConsumer` — chìa khoá của chuyện AZ

Nếu đĩa được tạo **ngay khi apply PVC**, AWS sẽ chọn một AZ bất kỳ. Rồi scheduler đặt Pod
lên node ở AZ kia, và Pod không bao giờ gắn được đĩa của mình.

`WaitForFirstConsumer` tránh chuyện đó bằng cách đảo thứ tự: **Pod được xếp chỗ trước, đĩa
được tạo sau, ở đúng AZ của node đó.** Lúc chưa có Pod, PVC ở trạng thái `Pending` — và
lần này `Pending` là bình thường. Event của PVC sẽ ghi:

```
Normal  WaitForFirstConsumer  waiting for first consumer to be created before binding
```

Sau khi đĩa được tạo, PV mang theo một **ràng buộc AZ** mãi mãi, nằm trong `spec` của nó:

```yaml
spec:
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - key: topology.kubernetes.io/zone
              operator: In
              values:
                - ap-southeast-2a
```

Tên `key` có thể là `topology.ebs.csi.aws.com/zone` tuỳ phiên bản driver; ý nghĩa như nhau.

Từ giờ trở đi, Pod Mongo **chỉ** được xếp lên node cùng AZ với đĩa. Node ở AZ đó mất đi mà
không có node thay thế cùng AZ, thì Pod đứng `Pending` với lý do:

```
node(s) had volume node affinity conflict
```

Đó là cái giá của ràng buộc thứ hai. Và cũng là lý do ảnh món không dùng EBS: hai bản
`menu-api` ở hai AZ **không thể** cùng gắn một đĩa, dù bạn viết YAML thế nào.

### Driver cần quyền gọi API EC2

`CreateVolume`, `AttachVolume`, `DeleteVolume` đều là API của AWS. Driver chạy dưới dạng Pod
trong cụm, và Pod đó cần **quyền IAM** để gọi chúng — policy `AmazonEBSCSIDriverPolicy`.

Cụm của section này tắt Auto Mode, nên **không ai cấp sẵn quyền đó**. Cài add-on mà không
cấp quyền thì ba chỗ cùng báo, theo thứ tự bạn sẽ gặp:

| Chỗ | Thấy gì |
| --- | --- |
| Tab **Add-ons** trên Console | Amazon EBS CSI Driver ở trạng thái **Degraded** |
| `kubectl get pods -n kube-system` | `ebs-csi-controller` **`CrashLoopBackOff`**, `1/6` — ngay khi có node ở 8.13 |
| Log container `ebs-plugin` | `no EC2 IMDS role found … context deadline exceeded` |

Và nếu đi tiếp tới 8.14 mà không sửa: PVC của Mongo kẹt `Pending` mãi.

Dòng log nói đúng chuyện đang xảy ra. Không có role riêng, driver thử **mượn role của
node** qua dịch vụ metadata của EC2 (IMDS). Nhưng trên node group mặc định, Pod không tới
được IMDS — lời gọi treo tới khi hết giờ. Vì vậy gắn `AmazonEBSCSIDriverPolicy` vào
`eksNodeRole` **không** giải quyết được: quyền nằm trên node, nhưng Pod không với tới.

Cách đúng là **Pod Identity**: gắn một role riêng vào đúng ServiceAccount của driver,
`ebs-csi-controller-sa`. Cần add-on **Amazon EKS Pod Identity Agent** — chọn ở Step 4 của
[8.11](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks), hoặc thêm sau ở tab Add-ons.

### Cấp quyền bằng Pod Identity

Làm được khi add-on EBS CSI đã được cài — lúc tạo cluster ở 8.11, hoặc sau đó ở 8.14.

1. **EKS → `kub-cafe-demo` → tab Add-ons** → chọn **Amazon EBS CSI Driver** → **Edit**.
   (Nếu đang cài add-on lần đầu, đây là trang **Configure selected add-ons settings**.)
2. Mục **Add-on access**: chọn **EKS Pod Identity**.
3. Dòng **Pod Identity IAM role for service account: ebs-csi-controller-sa** → bấm
   **Create new role**. Một tab IAM mở ra:
   - **Trusted entity**: `EKS - Pod Identity`, đã chọn sẵn → **Next**
   - **Permissions**: `AmazonEBSCSIDriverPolicy` phải được tick; chưa thì tìm tên rồi tick →
     **Next**
   - **Role name**: để tên gợi ý, hoặc `AmazonEKSPodIdentityAmazonEBSCSIDriverRole` →
     **Create role**
4. Quay lại tab EKS, bấm nút **↻** cạnh ô **Choose an existing role**, chọn role vừa tạo.
5. **Save changes**.

Nếu controller đã từng chạy mà không có quyền, nó giữ trạng thái cũ — khởi động lại để nó
nhận credential mới:

```bash
kubectl rollout restart deployment ebs-csi-controller -n kube-system
```

Kiểm lại:

```bash
aws eks describe-addon --cluster-name kub-cafe-demo --addon-name aws-ebs-csi-driver --query "addon.{status:status,podIdentity:podIdentityAssociations}" --output json
```

`status` phải là `ACTIVE`, và `podIdentity` có một ARN. Hai Pod `ebs-csi-controller` phải
`6/6 Running`.

## `reclaimPolicy: Delete` — xoá PVC là mất dữ liệu

`Delete` nghĩa là đĩa sống đúng bằng PVC:

| Bạn làm | Đĩa EBS |
| --- | --- |
| Xoá Pod, rollout, restart | **Còn** — PVC vẫn đó |
| Xoá node, scale node group về 0 | **Còn** — đĩa chỉ bị tháo ra |
| `kubectl delete -f kubernetes/mongo.yaml` | **Mất** — file đó chứa cả PVC |
| Xoá cluster khi PVC còn | **Còn**, nhưng thành đĩa mồ côi, vẫn tính tiền |

Dòng thứ ba là cái bẫy: muốn gỡ Mongo để apply lại thì chỉ xoá Deployment, đừng xoá cả
file. Dòng cuối là lý do [thứ tự dọn ở 8.4](/blog/k8s/deploy-to-cloud/services-and-cost)
xoá PVC **trước** khi xoá cluster.

Lúc dọn cuối section, tìm đĩa mồ côi — đĩa ở trạng thái `available` là đĩa không gắn vào
máy nào:

```bash
aws ec2 describe-volumes --filters Name=status,Values=available --query "Volumes[].{id:VolumeId,size:Size,az:AvailabilityZone,pvc:Tags[?Key=='kubernetes.io/created-for/pvc/name']|[0].Value}" --output table
```

## `gp2` hay `gp3`

`gp2` là loại cũ; `gp3` rẻ hơn khoảng 20% và nhanh hơn ở đĩa nhỏ:

| | `gp2` | `gp3` |
| --- | --- | --- |
| IOPS | Theo dung lượng: 3 IOPS mỗi GB, tối thiểu 100 | **3000** cố định, bất kể dung lượng |
| Giá | Cao hơn | Thấp hơn |
| Có sẵn trên EKS | Có, StorageClass `gp2` | Không — phải tự khai |

Đĩa `2Gi` của Mongo với `gp2` chỉ có 100 IOPS nền, dù có thể bùng lên cao hơn một lúc. Với
lab thì thừa đủ. Muốn dùng `gp3` thì khai thêm một StorageClass, rồi đổi
`storageClassName` trong PVC:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
parameters:
  type: gp3
```

Lần này `provisioner` là tên thật của CSI driver, không qua lớp chuyển tiếp nào. Section
này giữ `gp2` cho khớp YAML của dự án.

## Chi phí

EBS tính theo **dung lượng đã cấp**, không phải dung lượng đã dùng. PVC khai `2Gi` thì trả
tiền cho `2Gi`, dù Mongo mới ghi vài MB.

| Đĩa | Xấp xỉ |
| --- | --- |
| `gp2`, mỗi GB mỗi tháng | ~$0.10–0.12 tuỳ region |
| Đĩa Mongo `2Gi` | Vài xu mỗi tháng |
| Ổ gốc `20 GiB` × 2 node | Vài đô mỗi tháng — đi theo EC2, bị xoá cùng instance |

Rẻ tới mức không đáng lo — **trừ khi nó mồ côi.** Một đĩa quên xoá tính tiền đều đặn, và
không còn lệnh `kubectl` nào nhắc bạn là nó tồn tại.

## Khi tới 8.14 — kiểm bằng lệnh

Sau khi apply `mongo.yaml` ở [8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster),
quay lại đây và chạy các lệnh sau để thấy tận mắt những gì note này mô tả.

StorageClass có đúng như mẫu ở trên:

```bash
kubectl get storageclass gp2 -o yaml
```

PVC đã `Bound` chưa, và nếu chưa thì vì sao — `WaitForFirstConsumer`, thiếu driver, hay
thiếu quyền (thiếu quyền thì làm lại mục *Cấp quyền bằng Pod Identity* ở trên):

```bash
kubectl describe pvc cafe-mongo-pvc | tail -5
```

**PowerShell:**

```powershell
kubectl describe pvc cafe-mongo-pvc | Select-Object -Last 5
```

Đĩa bị ghim vào AZ nào:

```bash
kubectl get pv -o custom-columns='PV:.metadata.name,CLAIM:.spec.claimRef.name,ZONE:.spec.nodeAffinity.required.nodeSelectorTerms[0].matchExpressions[0].values[0]'
```

So với AZ của các node — Pod Mongo phải nằm trên node có cùng AZ với đĩa:

```bash
kubectl get nodes -o custom-columns='NODE:.metadata.name,ZONE:.metadata.labels.topology\.kubernetes\.io/zone'
```

Khi không chắc thiếu gì, log của driver là nơi nói thật nhất:

```bash
kubectl logs -n kube-system deploy/ebs-csi-controller -c csi-provisioner --tail=20
```

## Nếu chỉ đọc chứ không bật EKS

k3d có StorageClass `local-path`, và nó tái hiện được **đúng hình dạng** của bài toán AZ,
chỉ thu nhỏ lại: đĩa là một thư mục trên **một node cụ thể**, thay vì một AZ.

```bash
kubectl get storageclass local-path -o jsonpath='{.volumeBindingMode}'
```

Cũng ra `WaitForFirstConsumer`. Apply `mongo.yaml` (đổi `gp2` thành `local-path`) lên cụm
hai agent, rồi xem PV bị ghim vào node nào:

```bash
kubectl get pv -o custom-columns='PV:.metadata.name,NODE:.spec.nodeAffinity.required.nodeSelectorTerms[0].matchExpressions[0].values[0]'
```

Dừng node đó bằng `k3d node stop`, xoá Pod Mongo, và bạn sẽ thấy đúng lỗi
`volume node affinity conflict` — không tốn đồng nào.

## Self-check

- [ ] Kể hai ràng buộc của EBS, và hệ quả của từng cái trong Kubernetes
- [ ] Giải thích `ReadWriteOnce` giới hạn node chứ không giới hạn Pod
- [ ] Nói được vì sao `mongo.yaml` cần `strategy: Recreate`
- [ ] Giải thích `WaitForFirstConsumer` tránh được lỗi gì, và vì sao PVC `Pending` lúc đầu là bình thường
- [ ] Biết vì sao thiếu add-on hay thiếu quyền IAM đều ra cùng một triệu chứng, và phân biệt bằng gì
- [ ] Giải thích vì sao gắn policy vào node role không cấp được quyền cho driver, và Pod Identity khác ở đâu
- [ ] Biết thao tác nào xoá mất đĩa Mongo, thao tác nào không
- [ ] Nói được EBS tính tiền theo gì

## Open questions

- Node ở AZ-a chết, node group tạo node mới ở AZ-b. Mongo có tự sống lại không, và làm gì
  để nó sống lại?
- Muốn Mongo chịu được mất cả một AZ thì phải đổi kiến trúc thế nào — vẫn EBS, hay bỏ EBS?
- PVC khai `2Gi`, Mongo ghi đầy. Tăng lên `5Gi` bằng cách sửa YAML có được không?
