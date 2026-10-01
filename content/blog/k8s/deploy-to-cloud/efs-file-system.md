---
title: "8.7 EFS — filesystem dùng chung"
description: "Filesystem qua NFS, nhiều node mount cùng lúc — câu trả lời cho giới hạn của EBS."
status: growing
created: 2026-09-29
updated: 2026-09-30
tags: [k8s, aws, efs, nfs, storage, security-group]
---

> Tiếp [8.6](/blog/k8s/deploy-to-cloud/vpc-and-subnets). Stack `cafe-eks-vpc` đã
> `CREATE_COMPLETE`, và bạn có VPC id cùng bốn subnet ở hai AZ.

Dịch vụ thứ ba, và là cái **duy nhất trong ba dịch vụ lưu trữ/đường vào mà bạn tạo bằng
tay**. EBS và ELB ở hai note sau đều do Kubernetes tạo hộ; EFS thì không — bạn dựng nó
trước, Kubernetes chỉ mount vào.

Nó đứng ở đây, trước cả cluster, vì nó **chỉ cần VPC**. Không cần node, không cần control
plane, và không tính tiền theo giờ — nên tạo sớm không tốn gì.

## EFS là gì

**Elastic File System** là một thư mục nằm trên mạng. Máy nào trong VPC cũng mount được nó
qua **NFS**, và nhiều máy mount **cùng lúc**, cùng đọc cùng ghi.

Đó chính là thứ ảnh món của Cafe System cần. `menu-api` chạy hai bản, hai bản nằm ở hai
node, hai node ở hai AZ — và cả hai phải thấy **cùng một thư mục** `/app/data/images`.
[Bài tập ở 8.15](/blog/k8s/deploy-to-cloud/getting-started-with-volumes) cho bạn thấy
chuyện gì xảy ra khi không có nó: ảnh hiện một nửa số lần.

## EFS và EBS — hai câu trả lời cho hai câu hỏi

Note sau là EBS, và hai dịch vụ này hay bị nhầm vì tên giống nhau. Chúng khác nhau từ gốc:

| | **EFS** | **EBS** ([8.8](/blog/k8s/deploy-to-cloud/ebs-block-storage)) |
| --- | --- | --- |
| Là gì | Một **filesystem**, truy cập qua mạng | Một **ổ đĩa**, gắn vào máy |
| Gắn vào | Nhiều máy, **nhiều AZ**, cùng lúc | **Một** máy, trong **một** AZ |
| Access mode trong K8s | `ReadWriteMany` | `ReadWriteOnce` |
| Dung lượng | Tự giãn, không cần khai | Khai trước, trả tiền cho phần khai |
| Tính tiền | Theo **GB thật sự dùng** | Theo **GB đã cấp** |
| Trong Cafe System | Ảnh món | MongoDB |

Vậy sao không cho Mongo dùng luôn EFS, cho khỏi phải học hai thứ? Vì database cần đĩa
**độ trễ thấp** và **khoá file đáng tin**, còn NFS thì đi qua mạng ở mỗi lần đọc ghi. Chạy
được, nhưng chậm, và MongoDB không khuyên dùng NFS cho thư mục dữ liệu. Mỗi loại lưu trữ
hợp với một kiểu dữ liệu — đó là lý do [8.3](/blog/k8s/deploy-to-cloud/preparing-the-project)
chọn dự án có **cả hai**.

## Ba mảnh của một EFS

Một EFS dùng được không phải là một tài nguyên, mà là ba:

| Mảnh | Nằm ở đâu | Vai trò |
| --- | --- | --- |
| **File system** | Cả region | Chỗ dữ liệu thật sự nằm, nhân bản qua nhiều AZ |
| **Mount target** | **Một subnet**, mỗi AZ một cái | Một card mạng có IP riêng — cánh cửa để node gõ vào |
| **Security group** | Gắn trên mount target | Quyết định ai được gõ vào cổng **2049** |

```
                    ┌────────── EFS file system (fs-0…) ──────────┐
                    │              dữ liệu, cả region             │
                    └──────────┬───────────────────────┬──────────┘
                               │                       │
   ┌───────────────────────────┼───┐   ┌───────────────┼───────────────┐
   │ Subnet PRIVATE · AZ-a     │   │   │ Subnet PRIVATE · AZ-b         │
   │                           ▼   │   │               ▼               │
   │   EC2 worker ──2049──► mount  │   │   mount ◄──2049── EC2 worker  │
   │                       target  │   │   target                      │
   │                      [eks-efs]│   │  [eks-efs]                    │
   └───────────────────────────────┘   └───────────────────────────────┘
```

Node **luôn** nói chuyện với mount target **cùng AZ** với nó. Tên DNS của EFS phân giải ra
IP khác nhau tuỳ bạn hỏi từ AZ nào. Hệ quả: **AZ nào có node thì AZ đó phải có mount
target.** Thiếu một cái, Pod trên các node ở AZ đó không mount được, trong khi Pod ở AZ
kia vẫn chạy bình thường.

### Mount target đặt ở subnet nào

Ở **subnet private** — cùng chỗ với worker node, đúng như sơ đồ ở
[8.6](/blog/k8s/deploy-to-cloud/vpc-and-subnets).

Đặt ở public thì vẫn chạy, vì trong một VPC mọi subnet đều đi thẳng tới nhau qua route
`local` — không qua NAT Gateway, không qua Internet Gateway. Nhưng mount target không cần
đường ra internet, không cần ai từ ngoài gọi vào, nên không có lý do gì để nó nằm ở
public.

## 1. Tạo security group

Form tạo file system sẽ hỏi security group cho mount target, nên tạo nó trước.

Mount EFS là **một kết nối mạng**: node mở kết nối TCP tới cổng **2049** của mount target.
Security group chặn kết nối đó thì mọi thứ phía Kubernetes vẫn xanh, còn Pod thì treo ở
`ContainerCreating`.

**EC2 → Network & Security → Security Groups → Create security group**:

| Trường | Giá trị |
| --- | --- |
| Security group name | `eks-efs` |
| Description | `NFS from cafe-eks-vpc` |
| VPC | VPC của stack `cafe-eks-vpc` |

**Inbound rules → Add rule**:

| Trường | Giá trị |
| --- | --- |
| Type | **NFS** (tự điền cổng `2049`) |
| Source | **Custom** → dán **IPv4 CIDR của VPC** |

Lấy CIDR:

```bash
aws ec2 describe-vpcs --query "Vpcs[].{id:VpcId,cidr:CidrBlock,name:Tags[?Key=='Name']|[0].Value}" --output table
```

Template của AWS thường cho dải `192.168.0.0/16`.

**Outbound rules**: để mặc định. Mount target không chủ động gọi ai.

Vì sao source là cả dải VPC, chứ không phải security group của node? Vì **lúc này chưa có
node nào**, và cũng chưa có security group nào của node để trỏ tới — node group chỉ ra
đời ở [8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes). Mở theo CIDR nghĩa là *"máy
nào trong mạng riêng này cũng được"*; với một VPC chỉ dùng cho lab, vậy là đủ chặt.

> Cách chặt hơn khi đã có cụm: đổi **Source** thành security group mà EKS gắn cho node
> (xem [8.10](/blog/k8s/deploy-to-cloud/ec2-instances)). Khi đó chỉ node của cụm mới vào
> được, dù ai khác có nằm trong VPC.

## 2. Tạo file system

**EFS → Create file system**. Hộp thoại đầu chỉ có hai ô — **đừng bấm `Create` ở đây**:

| Trường | Giá trị |
| --- | --- |
| Name | `eks-efs` |
| VPC | VPC của stack `cafe-eks-vpc` |

Bấm **Customize**.

Bấm thẳng `Create` ở hộp thoại rút gọn cũng tạo được file system, nhưng nó gắn
**security group mặc định** của VPC vào mọi mount target. Security group mặc định không mở
cổng 2049 cho ai, nên bạn sẽ có một EFS trông hoàn chỉnh mà không node nào mount được.

### Trang File system settings

Để mặc định, trừ một ô:

| Ô | Mặc định | Nên để |
| --- | --- | --- |
| Storage class | `Standard` | Giữ — nhân bản qua nhiều AZ |
| **Automatic backups** | Bật | **Tắt** cho lab — có phí riêng, tính cả khi bạn quên |
| Lifecycle management | 30 ngày | Giữ — file không đụng tới chuyển sang lớp rẻ hơn |
| Encryption | Bật | Giữ |

### Trang Network access — trang quan trọng nhất

Mỗi AZ là một dòng, mỗi dòng là một mount target với ô subnet và ô security group riêng.
Làm cho **từng dòng**:

| Ô | Làm gì |
| --- | --- |
| Subnet ID | Chọn subnet **private** của AZ đó — tên có chữ `PrivateSubnet` |
| Security groups | **Xoá** security group mặc định, chọn **`eks-efs`** |

Console hay tự điền sẵn subnet đầu tiên nó thấy ở mỗi AZ, và đó có thể là subnet public.
Kiểm lại tên trước khi đi tiếp.

### Trang File system policy

Để trống, **Next**, rồi **Create**.

Mount target mất khoảng 1–2 phút để chuyển sang `Available`.

## 3. Kiểm lại

Lấy `FileSystemId` — chuỗi `fs-0…` mà [8.17](/blog/k8s/deploy-to-cloud/persistent-volume-for-efs)
sẽ dán vào `volumeHandle` của PersistentVolume:

```bash
aws efs describe-file-systems --query "FileSystems[].{id:FileSystemId,name:Name,state:LifeCycleState}" --output table
```

Mount target — phải có **mỗi AZ một dòng**, đều `available`:

```bash
aws efs describe-mount-targets --file-system-id <file-system-id> --query "MountTargets[].{id:MountTargetId,az:AvailabilityZoneName,subnet:SubnetId,ip:IpAddress,state:LifeCycleState}" --output table
```

Đúng security group chưa — `<mount-target-id>` là một giá trị ở cột `id` của bảng trên,
dạng `fsmt-…`:

```bash
aws efs describe-mount-target-security-groups --mount-target-id <mount-target-id>
```

Phải ra đúng **một** id, và là id của `eks-efs`.

Phần kiểm tra từ phía cụm — node ở AZ nào, Pod có gõ tới được cổng 2049 không — phải đợi
có node, nên nằm ở [8.16](/blog/k8s/deploy-to-cloud/adding-efs-as-a-volume).

## Chi phí

| Khoản | Tính theo |
| --- | --- |
| Dữ liệu ở lớp `Standard` | **GB thật sự dùng**, khoảng $0.3 mỗi GB mỗi tháng |
| Mount target, security group | Miễn phí |
| Automatic backups | Có phí riêng — lý do tắt ở trên |

Vài chục tấm ảnh món là vài MB, tức **gần như bằng không**. Và vì không có phí theo giờ,
EFS là thứ duy nhất trong section mà để qua đêm cũng không sao.

Không sao về tiền, nhưng có một chỗ vướng khi dọn — mục ngay dưới.

## Dọn — EFS không đi theo cluster

Xoá cluster, xoá node group, xoá PVC đều **không** xoá EFS. Nó là tài nguyên của VPC, không
phải của Kubernetes.

Thứ tự xoá là mount target trước, rồi mới tới file system:

```bash
aws efs delete-mount-target --mount-target-id <mount-target-id>
```

```bash
aws efs delete-file-system --file-system-id <file-system-id>
```

Và đây là chỗ vướng: **stack `cafe-eks-vpc` không xoá được chừng nào còn mount target nằm
trong subnet của nó.** Mount target là một card mạng, subnet còn card mạng thì không xoá
được, và stack báo `DELETE_FAILED`. Đó là lý do bước 5 ở
[thứ tự dọn của 8.4](/blog/k8s/deploy-to-cloud/services-and-cost) là *"xoá EFS, **rồi**
xoá stack VPC"*.

## Nếu chỉ đọc chứ không bật EKS

Không có EFS trên k3d, nhưng có thứ tương đương: một NFS server chạy trong container, rồi
khai PersistentVolume kiểu `nfs:` trỏ vào nó. Cách mount y hệt, chỉ khác ai chạy NFS
server.

Thứ đáng mang đi từ note này không phụ thuộc AWS: **một volume dùng chung qua mạng cần một
đường mạng thông**, và khi nó không thông thì Kubernetes không báo lỗi gì cả — Pod chỉ
đứng chờ.

## Self-check

- [ ] Phân biệt EFS với EBS ở bốn điểm: kiểu, gắn vào đâu, access mode, cách tính tiền
- [ ] Kể ba mảnh của một EFS và vai trò từng mảnh
- [ ] Giải thích vì sao mỗi AZ có node thì phải có một mount target
- [ ] Nói được vì sao source của security group là CIDR của VPC, **ở thời điểm này**
- [ ] Giải thích vì sao bấm `Create` ở hộp thoại rút gọn lại hỏng
- [ ] Biết vì sao EFS có thể tạo trước cluster mà không tốn tiền
- [ ] Biết xoá EFS theo thứ tự nào, và vì sao nó chặn việc xoá stack VPC

## Open questions

- Một EFS dùng chung cho nhiều cluster được không, và lúc đó phân tách dữ liệu bằng gì?
- Cổng 2049 mở cho cả VPC — vậy EFS có cần mật khẩu hay xác thực gì nữa không?
- Nếu thêm một AZ thứ ba vào node group mà quên tạo mount target, triệu chứng là gì?
