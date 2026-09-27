---
title: "8.10 Thêm EFS làm Volume (kiểu CSI)"
description: "Một security group, một file system, hai mount target, một driver. Ba thứ đầu nằm ngoài Kubernetes — và đó mới là chỗ mọi lỗi mount bắt nguồn."
status: growing
created: 2026-09-25
updated: 2026-09-27
tags: [k8s, aws, efs, csi, volume, security-group]
---

> Tiếp [8.9](/blog/k8s/deploy-to-cloud/getting-started-with-volumes), nơi `hostPath` gãy
> ngay khi có node thứ hai.

Note này làm bốn bước đầu trong bảy bước ở 8.9 — tức là **toàn bộ phần AWS**, cộng việc
cài driver. Chưa có PV, chưa có PVC, chưa Pod nào mount gì cả.

```
1. Security group mở cổng 2049   ← note này
2. EFS file system                ← note này
3. Mount target ở mỗi AZ          ← note này
4. EFS CSI driver                 ← note này
5. StorageClass + PersistentVolume ← 8.11
6. PersistentVolumeClaim          ← 8.11
7. Mount vào Pod                  ← 8.12
```

> EFS tính tiền theo dung lượng thật sự dùng, nên một lab vài KB gần như không đáng kể.
> Nhưng nó **không** biến mất khi bạn xoá cluster — đọc mục dọn dẹp ở cuối trước khi bắt
> đầu.

## Vì sao security group đi trước

Form tạo file system sẽ hỏi security group cho mount target. Tạo trước thì đỡ phải quay
lại sửa.

Và đây là chỗ đáng hiểu cho đúng: **mount EFS là một kết nối mạng**. Node mở một kết nối
TCP tới cổng **2049** của mount target. Security group là bức tường đứng giữa hai bên, nên
nếu nó không mở, mọi thứ phía Kubernetes vẫn xanh mà Pod thì treo.

## 1. Tạo security group

**EC2 → Network & Security → Security Groups → Create security group**:

| Trường | Giá trị |
| --- | --- |
| Security group name | `eks-efs` |
| Description | `for eks` |
| VPC | VPC do stack `eksVpc` tạo ở [8.6](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks) |

**Inbound rules → Add rule**:

| Trường | Giá trị |
| --- | --- |
| Type | **NFS** (tự điền cổng `2049`) |
| Source | **Custom** → dán **IPv4 CIDR của VPC** |

Lấy CIDR ở **VPC → Your VPCs**, cột **IPv4 CIDR**, thường dạng `192.168.0.0/16`. Hoặc:

```bash
aws ec2 describe-vpcs --query "Vpcs[].{id:VpcId,cidr:CidrBlock,name:Tags[?Key=='Name']|[0].Value}" --output table
```

**Outbound rules**: để mặc định. Mặc định là cho ra mọi nơi, và mount target không cần
chủ động gọi ai.

Vì sao source là CIDR của VPC chứ không phải một IP cụ thể: node có thể sinh ra ở bất kỳ
subnet nào trong VPC, và mỗi lần scale là một IP mới. Mở theo CIDR nghĩa là *"máy nào
trong mạng riêng này cũng được"* — trong VPC riêng của lab thì đủ chặt.

> Cách chặt hơn cho môi trường thật: ở ô **Source** chọn chính **security group của
> node group** thay vì CIDR. Khi đó chỉ những máy thuộc nhóm đó mới vào được, dù ai khác
> có nằm trong VPC.

## 2. Tạo file system

Vào dịch vụ **EFS → Create file system**. Hộp thoại đầu chỉ có hai ô — **đừng bấm Create
ở đây**:

| Trường | Giá trị |
| --- | --- |
| Name | `eks-efs` |
| VPC | Cùng VPC ở trên |

Bấm **Customize**.

Bấm thẳng `Create` ở hộp thoại rút gọn cũng tạo được file system, nhưng nó gắn
**security group mặc định** của VPC vào mọi mount target. Security group mặc định không mở
cổng 2049 cho ai cả, nên bạn sẽ có một EFS trông như hoàn chỉnh mà không node nào mount
được.

Trang **File system settings**: để mặc định hết. Vài ô đáng biết mình đang để mặc định cái
gì:

| Ô | Mặc định | Nghĩa |
| --- | --- | --- |
| Storage class | `Standard` | Nhân bản qua nhiều AZ |
| Automatic backups | Bật | Có phí riêng. Lab thì tắt được |
| Lifecycle management | 30 ngày | File không đụng tới sẽ chuyển sang lớp lưu trữ rẻ hơn |
| Encryption | Bật | Mã hoá lúc nằm trên đĩa |

Trang **Network access** — đây là trang quan trọng nhất:

| Trường | Làm gì |
| --- | --- |
| Mount targets | Để nguyên danh sách subnet, **mỗi AZ một cái** |
| Security groups | **Xoá** security group mặc định, chọn **`eks-efs`** |

Phải làm cho **từng dòng** trong bảng, vì mỗi AZ là một mount target riêng và mỗi cái có ô
security group riêng.

Trang **File system policy**: để trống, **Next**, rồi **Create**.

Mount target mất khoảng 1–2 phút để chuyển sang `Available`.

## 3. Kiểm tra phía AWS trước khi đụng tới Kubernetes

Lấy `FileSystemId` — chuỗi `fs-0…` mà bài 8.11 sẽ cần:

```bash
aws efs describe-file-systems --query "FileSystems[].{id:FileSystemId,name:Name,state:LifeCycleState}" --output table
```

Xem mount target, phải có **mỗi AZ một dòng** và đều `available`:

```bash
aws efs describe-mount-targets --file-system-id fs-0abc123 --query "MountTargets[].{az:AvailabilityZoneName,ip:IpAddress,state:LifeCycleState}" --output table
```

Xem đúng security group đã gắn chưa:

```bash
aws efs describe-mount-target-security-groups --mount-target-id fsmt-0abc123
```

Số mount target phải **bằng hoặc nhiều hơn** số AZ mà node của bạn đang nằm. Node ở một AZ
không có mount target thì Pod trên node đó không mount được, trong khi Pod trên node khác
lại chạy ngon — một kiểu lỗi "lúc được lúc không" rất khó chịu.

```bash
kubectl get nodes -o custom-columns='NODE:.metadata.name,AZ:.metadata.labels.topology\.kubernetes\.io/zone'
```

## 4. Cài EFS CSI driver

Đây là phần **duy nhất** của note này nằm trong cụm. Driver là thứ dịch từ *"Pod cần
volume này"* sang *"mount NFS vào đường dẫn kia trên node"*.

Cách được khuyến nghị là dùng EKS add-on:

```bash
aws eks create-addon --cluster-name kub-dep-demo --addon-name aws-efs-csi-driver
```

```bash
aws eks describe-addon --cluster-name kub-dep-demo --addon-name aws-efs-csi-driver --query "addon.status" --output text
```

Khoá học dùng kustomize, trỏ thẳng vào repo của driver:

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
| **CSIDriver** `efs.csi.aws.com` | Đăng ký cái tên mà PV ở 8.11 sẽ trỏ tới |

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
kubectl run nfs-probe --rm -it --restart=Never --image=busybox:1.36 -- sh -c 'nc -w 3 fs-0abc123.efs.ap-southeast-2.amazonaws.com 2049 < /dev/null && echo "2049 OK" || echo "2049 KHONG TOI DUOC"'
```

Thay `fs-0abc123` và region bằng của bạn. Tên DNS này do VPC phân giải thành IP của mount
target trong đúng AZ của node.

| Kết quả | Nghĩa |
| --- | --- |
| `2049 OK` | Đường mạng thông. Sang [8.11](/blog/k8s/deploy-to-cloud/persistent-volume-for-efs) viết PV được rồi |
| Treo rồi timeout | Security group chưa cho vào, hoặc mount target thiếu ở AZ của node này |
| `bad address` | AZ của node không có mount target, hoặc VPC tắt DNS resolution |

Nếu bỏ qua bước này, triệu chứng ở note sau sẽ là: PVC `Bound` bình thường, Pod kẹt
`ContainerCreating`, và phải chờ tới khi `kubectl describe pod` in ra
`mount.nfs4: Connection timed out`.

## Dọn — EFS không đi theo cluster

Xoá cluster, xoá node group, xoá PVC đều **không** xoá EFS. Nó là tài nguyên của VPC.

```bash
aws efs describe-file-systems --query "FileSystems[].{id:FileSystemId,name:Name,size:SizeInBytes.Value}" --output table
```

Muốn xoá thì phải xoá mount target trước, rồi mới tới file system:

```bash
aws efs delete-mount-target --mount-target-id fsmt-0abc123
```

```bash
aws efs delete-file-system --file-system-id fs-0abc123
```

Và nhớ rằng stack `eksVpc` không xoá được chừng nào còn mount target nằm trong subnet của
nó — một lý do rất hay gặp khiến `DELETE_FAILED` lúc dọn cuối section.

## Nếu chỉ đọc chứ không bật EKS

Không có bản k3d cho note này: k3d không có storage nào gắn qua mạng để nhiều node cùng
ghi. Thứ đáng mang đi là **thứ tự bốn bước**, và nhận xét rằng ba bước đầu hoàn toàn nằm
ngoài Kubernetes.

Muốn thử `ReadWriteMany` ở local thì dựng một NFS server bằng container rồi khai PV kiểu
`nfs:` — cách làm y hệt, chỉ đổi phần "ai chạy NFS server".

## Self-check

- [ ] Nói được vì sao phải tạo security group **trước** khi tạo file system
- [ ] Giải thích vì sao bấm `Create` ngay ở hộp thoại rút gọn lại hỏng
- [ ] Nói được vì sao mỗi AZ cần một mount target
- [ ] Giải thích vì sao driver phải là DaemonSet chứ không phải Deployment
- [ ] Nói được vì sao static provisioning không cần IAM còn dynamic thì cần
- [ ] Biết EFS **không** bị xoá theo cluster, và xoá nó theo thứ tự nào

## Open questions

- Mount target nằm ở subnet public hay private thì đúng, và có khác gì về đường đi?
- Một EFS dùng chung cho nhiều cluster được không, và lúc đó phân tách dữ liệu bằng gì?
- `Automatic backups` bật mặc định — trong lab thì nó tốn bao nhiêu, và tắt ở đâu?
