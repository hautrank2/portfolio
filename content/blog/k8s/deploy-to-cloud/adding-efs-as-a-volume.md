---
title: "8.16 Thêm EFS làm Volume (kiểu CSI)"
description: "Phần AWS đã xong từ 8.7. Còn lại một driver, và một lần gõ thử cổng 2049 từ trong cụm — trước khi viết dòng YAML nào."
status: growing
created: 2026-09-25
updated: 2026-09-30
tags: [k8s, aws, efs, csi, volume, security-group]
---

> Tiếp [8.15](/blog/k8s/deploy-to-cloud/getting-started-with-volumes), nơi ảnh món biến mất
> sau khi Pod sinh lại, và chỉ hiện một nửa số lần khi `menu-api` chạy hai bản.

Gắn EFS vào cụm là bảy bước. Ba bước đầu — **toàn bộ phần AWS** — bạn đã làm ở
[8.7](/blog/k8s/deploy-to-cloud/efs-file-system), trước cả khi có cluster. Note này làm
bước thứ tư, bước đầu tiên nằm **trong** cụm:

```
1. Security group mở cổng 2049   ← 8.7, đã xong
2. EFS file system                ← 8.7, đã xong
3. Mount target ở mỗi AZ          ← 8.7, đã xong
4. EFS CSI driver                 ← note này
5. StorageClass + PersistentVolume ← 8.17
6. PersistentVolumeClaim          ← 8.17
7. Mount vào Pod                  ← 8.18
```

## Kiểm lại phần AWS, lần này từ phía cụm

Ở 8.7 chưa có node nào, nên còn một điều chưa kiểm được: **mỗi AZ có node phải có một mount
target.** Node ở một AZ không có mount target thì Pod trên node đó không mount được, trong
khi Pod ở node khác vẫn chạy — một kiểu lỗi "lúc được lúc không" rất khó chịu.

Node đang ở những AZ nào:

```bash
kubectl get nodes -o custom-columns='NODE:.metadata.name,AZ:.metadata.labels.topology\.kubernetes\.io/zone'
```

Lấy `FileSystemId` của bạn — mọi chỗ ghi `<file-system-id>` ở dưới đều thay bằng giá trị
này:

```bash
aws efs describe-file-systems --query "FileSystems[].{id:FileSystemId,name:Name,state:LifeCycleState}" --output table
```

Giá trị đúng có dạng `fs-` theo sau là 17 ký tự hex. Chép nguyên cột `id`, đừng gõ tay.

Mount target đang ở những AZ nào:

```bash
aws efs describe-mount-targets --file-system-id <file-system-id> --query "MountTargets[].{az:AvailabilityZoneName,state:LifeCycleState}" --output table
```

Mọi AZ ở bảng trên phải xuất hiện ở bảng dưới, với trạng thái `available`.

## Cài EFS CSI driver

Đây là phần **duy nhất** của note này nằm trong cụm. Driver là thứ dịch từ *"Pod cần
volume này"* sang *"mount NFS vào đường dẫn kia trên node"*.

Cách được khuyến nghị là dùng **EKS add-on**, vì AWS tự cập nhật và vá lỗi cho bạn.

**Trên Console** — đây là đường ngắn nhất, và cũng là chỗ dễ bỏ sót nhất vì nó nằm ở tab
mà không hướng dẫn nào nhắc tới:

1. **EKS → Clusters → kub-cafe-demo → tab Add-ons**
2. Bấm **Get more add-ons**
3. Trong danh sách **Amazon EKS add-ons**, tick **Amazon EFS CSI Driver**
4. **Next** → để mặc định hết version và conflict resolution → **Next** → **Create**

Trạng thái chuyển từ `Creating` sang **`Active`** trong 1–2 phút. Tab **Add-ons** lúc này
phải có đủ những gì cụm cần. Console hiện **tên hiển thị**, CLI dùng **tên trong ngoặc**:

| Add-on trên Console | Cho việc gì |
| --- | --- |
| **Amazon VPC CNI** (`vpc-cni`) | Cấp IP cho Pod. Thiếu là node `NotReady` |
| **CoreDNS** (`coredns`) | DNS trong cụm — Pod gọi nhau bằng tên Service |
| **kube-proxy** (`kube-proxy`) | Định tuyến từ Service tới Pod |
| **Amazon EBS CSI Driver** (`aws-ebs-csi-driver`) | PVC của Mongo ở [8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster) |
| **Amazon EFS CSI Driver** (`aws-efs-csi-driver`) | **Ảnh món, từ note này trở đi** |

Không thấy dòng nào trên Console thì đừng vội cài lại. Tab **Add-ons** có thể chia trang
hoặc lọc theo ô tìm kiếm, và nút **Get more add-ons** **không** liệt kê những add-on đã
cài. Hỏi thẳng CLI cho chắc — tên trong ngoặc ở bảng trên là thứ phải thấy:

```bash
aws eks list-addons --cluster-name kub-cafe-demo --output text
```

**Bằng CLI**, nếu bạn thích gõ:

```bash
aws eks create-addon --cluster-name kub-cafe-demo --addon-name aws-efs-csi-driver
```

```bash
aws eks describe-addon --cluster-name kub-cafe-demo --addon-name aws-efs-csi-driver --query "addon.status" --output text
```

Khoá học dùng kustomize, trỏ thẳng vào repo của driver.

> **Chỉ chọn một cách. Đã có add-on thì đừng chạy lệnh dưới.** Kiểm bằng
> `aws eks list-addons` ở trên: thấy `aws-efs-csi-driver` — kể cả do bạn tick ở Step 4 của
> [8.11](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks) — là driver đã có, bỏ qua
> lệnh này. Chạy thêm nó sẽ ghi đè lên chính các object cùng tên mà add-on đang quản lý
> trong `kube-system` — `efs-csi-controller`, `efs-csi-node` — bằng một phiên bản khác, và
> lần cập nhật add-on sau sẽ báo xung đột hoặc ghi đè ngược lại. Lệnh này chỉ dành cho cụm
> **không** dùng EKS add-on.

```bash
kubectl apply -k "github.com/kubernetes-sigs/aws-efs-csi-driver/deploy/kubernetes/overlays/stable/?ref=release-2.1"
```

> Trong video, `ref` là `release-1.0`. Bản đó ra từ 2020 và có thể không hợp với phiên bản
> Kubernetes của cụm bạn. Lấy nhánh còn được hỗ trợ ở
> [trang releases](https://github.com/kubernetes-sigs/aws-efs-csi-driver/releases), đừng
> chép số version từ note này.

Cách nào cũng cho ra hai thứ:

| Object | Vai trò |
| --- | --- |
| **DaemonSet** `efs-csi-node` | Một Pod **trên mỗi node**, vì việc mount xảy ra trên chính máy chạy Pod của bạn |
| **CSIDriver** `efs.csi.aws.com` | Đăng ký cái tên mà PV ở 8.17 sẽ trỏ tới |

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-efs-csi-driver -o wide
```

```bash
kubectl get csidrivers efs.csi.aws.com
```

Số Pod của DaemonSet phải bằng số node. Thêm node mới thì nó tự đặt Pod lên, không phải
làm gì thêm.

> **Static provisioning không cần IAM.** Mount một EFS đã có sẵn chỉ là một lệnh mount NFS
> thường, không gọi API AWS nào. Chỉ khi dùng **dynamic provisioning** — driver tự tạo
> access point cho mỗi PVC — mới cần gắn IAM role vào ServiceAccount của driver qua IRSA.
> Section này đi đường tĩnh nên bỏ qua được phần đó.

## Bài tập — Thử kết nối trước khi viết PV

Đây là 30 giây tiết kiệm cho bạn cả buổi ở note sau. Từ trong cụm, gõ thẳng vào cổng 2049
của EFS:

```bash
kubectl run nfs-probe --rm -it --restart=Never --image=busybox:1.36 -- sh -c 'nc -w 3 <file-system-id>.efs.<region>.amazonaws.com 2049 < /dev/null && echo PORT_2049_OK || echo PORT_2049_FAIL'
```

Thay `<file-system-id>` bằng ID ở trên, `<region>` bằng region của bạn — ví dụ
`ap-southeast-2`. Tên DNS này do VPC phân giải thành IP của mount
target trong đúng AZ của node.

| Kết quả | Nghĩa |
| --- | --- |
| `PORT_2049_OK` | Đường mạng thông. Sang [8.17](/blog/k8s/deploy-to-cloud/persistent-volume-for-efs) viết PV được rồi |
| `PORT_2049_FAIL`, sau khoảng 3 giây | Security group chưa cho vào, hoặc mount target thiếu ở AZ của node này |
| `bad address` | AZ của node không có mount target, hoặc VPC tắt DNS resolution |

Dòng `warning: couldn't attach to pod/nfs-probe, falling back to streaming logs` có thể hiện
ra trước kết quả. Không phải lỗi: Pod chạy xong nhanh hơn lúc `kubectl` kịp gắn vào, nên
nó đọc log thay vì gắn terminal. Kết quả vẫn là dòng cuối.

Nếu bỏ qua bước này, triệu chứng ở note sau sẽ là: PVC `Bound` bình thường, Pod kẹt
`ContainerCreating`, và phải chờ tới khi `kubectl describe pod` in ra
`mount.nfs4: Connection timed out`.

## Dọn

Driver là add-on, nên nó đi theo cluster. EFS thì **không** — nó là tài nguyên của VPC, và
chặn việc xoá stack `cafe-eks-vpc` chừng nào mount target còn đó. Thứ tự xoá nằm ở
[8.7](/blog/k8s/deploy-to-cloud/efs-file-system).

## Nếu chỉ đọc chứ không bật EKS

Không có bản k3d cho note này: k3d không có storage nào gắn qua mạng để nhiều node cùng
ghi. Thứ đáng mang đi là **thứ tự bảy bước**, và nhận xét rằng ba bước đầu hoàn toàn nằm
ngoài Kubernetes — đến mức làm xong được từ trước khi có cluster.

Muốn thử `ReadWriteMany` ở local thì dựng một NFS server bằng container rồi khai PV kiểu
`nfs:` — cách làm y hệt, chỉ đổi phần "ai chạy NFS server".

## Self-check

- [ ] Kiểm được từ phía cụm rằng mọi AZ có node đều có mount target
- [ ] Giải thích vì sao driver phải là DaemonSet chứ không phải Deployment
- [ ] Nói được vì sao static provisioning không cần IAM còn dynamic thì cần
- [ ] Biết driver đi theo cluster còn EFS thì không

## Open questions

- Một EFS dùng chung cho nhiều cluster được không, và lúc đó phân tách dữ liệu bằng gì?
- Driver chạy thành DaemonSet trên mọi node. Nếu Pod driver trên một node chết, Pod app
  đang mount EFS trên node đó có mất kết nối không?
