---
title: "8.6 VPC — mạng cho cluster"
description: "Mạng riêng cho cụm: subnet public và private ở hai AZ, dựng bằng template CloudFormation của AWS thay vì bấm từng tài nguyên."
status: growing
created: 2026-09-29
updated: 2026-09-29
tags: [k8s, aws, vpc, subnet, cloudformation, nat]
---

Dịch vụ thứ hai, và là thứ EKS đòi ngay sau IAM: **một mạng ảo để đặt node vào.**

Đây cũng là note đầu tiên trong section **có tính tiền** — không phải VPC, mà một thứ nằm
bên trong nó.

## VPC và nhóm dịch vụ quanh nó

EC2 instance không lơ lửng. Nó nằm trong một mạng ảo bạn phải khai trước:

| | Vai trò | Tính tiền |
| --- | --- | --- |
| **VPC** | Mạng ảo riêng của bạn, một dải IP như `10.0.0.0/16` | Không |
| **Subnet** | Chia VPC theo Availability Zone — public hoặc private | Không |
| **Route table** | Quyết định gói tin đi đâu | Không |
| **Internet Gateway** | Cửa ra internet cho subnet **public** | Không |
| **NAT Gateway** | Cửa ra internet cho subnet **private** | **Có, theo giờ + lưu lượng** |

Dòng cuối là dòng đáng khoanh đỏ, vì hai lý do cùng lúc: nó **tính tiền theo giờ**, và nó
**do template tạo ngầm** — bạn không bấm tạo nó, nên nó không nằm trong đầu bạn như một thứ
"tôi đã tạo". Đó là cách nó sống sót qua lần dọn dẹp, và là dòng hay gặp nhất trong những
hoá đơn AWS bất ngờ.

## Public và private khác nhau ở đúng một thứ

Không phải ở IP, không phải ở tường lửa. Khác ở **route table**:

| Subnet | Đường ra internet | Ai vào được từ internet |
| --- | --- | --- |
| **Public** | Qua **Internet Gateway** | Được, nếu security group cho |
| **Private** | Qua **NAT Gateway** | **Không ai** |

NAT Gateway cho phép đi ra mà không cho đi vào — giống cách router ở nhà bạn làm việc. Node
ở subnet private vẫn pull được image từ Docker Hub, vẫn gọi được API của EKS, nhưng không ai
từ internet mở được một kết nối tới nó.

Hình dạng dùng thật của một cụm EKS:

```
                        Internet
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
   ┌─────────────────────┐     ┌─────────────────────┐
   │  Subnet PUBLIC      │     │  Subnet PUBLIC      │
   │  AZ-a               │     │  AZ-b               │
   │    · ELB            │     │    · ELB            │
   │    · NAT Gateway ───┼──┐  │                     │
   └─────────────────────┘  │  └─────────────────────┘
                            │  đường ra cho private
   ┌─────────────────────┐  │  ┌─────────────────────┐
   │  Subnet PRIVATE     │◄─┘  │  Subnet PRIVATE     │
   │  AZ-a               │     │  AZ-b               │
   │    · EC2 worker     │     │    · EC2 worker     │
   │    · EFS mount tgt  │     │    · EFS mount tgt  │
   └─────────────────────┘     └─────────────────────┘
```

**Load balancer ở public, worker node ở private.** Khách gọi vào ELB, ELB chuyển vào node —
và node không có đường vào trực tiếp từ internet. Đây chính là mẫu đã dựng ở
[note 8.3](/blog/k8s/deploy-to-cloud/preparing-the-project) nhưng ở tầng mạng: hai frontend
là `LoadBalancer`, ba API là `ClusterIP` không ra ngoài.

## Vì sao bắt buộc hai AZ

EKS đòi VPC có **ít nhất hai subnet ở hai Availability Zone khác nhau**. Yêu cầu này không
phải hình thức, và nó có hai hệ quả bạn sẽ gặp lại:

**Một — control plane cần hai AZ để chịu lỗi.** AWS chạy API server và etcd ở nhiều AZ; mất
một AZ thì cụm vẫn sống.

**Hai — và đây là hệ quả làm khó bạn:** hai AZ nghĩa là hai Pod có thể nằm ở **hai nơi vật
lý khác nhau**. Từ đó bài toán ở [note 8.8](/blog/k8s/deploy-to-cloud/ebs-block-storage) trở
thành không tránh được — một đĩa EBS chỉ gắn được vào một instance trong một AZ, nên hai Pod
ở hai AZ **không** dùng chung được một đĩa.

Nói cách khác: **AWS bắt bạn chấp nhận sự phân tán ngay từ lúc khai mạng**, và đó là lý do
gốc khiến ảnh món của Cafe System cần EFS chứ không phải một `PersistentVolume` thường. Cụm
một node ở [section 6](/blog/k8s/data-and-volumes) giấu kín chuyện này.

## Dựng bằng CloudFormation, không bấm tay

Danh sách VPC trong form tạo cluster gần như chắc chắn không có cái nào dùng được — VPC mặc
định của tài khoản thường thiếu cấu hình subnet mà EKS cần.

Tự bấm tạo thì phải làm đúng thứ tự: VPC → 4 subnet → Internet Gateway → NAT Gateway → 2
route table → gắn từng subnet vào đúng route table → tag subnet đúng cách cho EKS nhận. Hơn
mười tài nguyên, và sai một cái thì lỗi hiện ra ở tận bước cuối.

Cách AWS khuyên là dùng **template CloudFormation có sẵn**.

**CloudFormation** là dịch vụ IaC của AWS: bạn đưa một file mô tả hạ tầng, nó tạo trọn bộ
tài nguyên. Đúng ý tưởng `kubectl apply -f` — khai cái bạn muốn, để hệ thống tự dựng —
nhưng ở tầng hạ tầng cloud thay vì tầng Kubernetes. Bản thân CloudFormation **miễn phí**;
bạn chỉ trả tiền cho tài nguyên nó tạo ra.

### Các bước

Mở dịch vụ **CloudFormation**:

1. **Create stack** → *With new resources (standard)*
2. **Prepare template**: `Template is ready`
3. **Template source**: `Amazon S3 URL`
4. **Amazon S3 URL**: lấy từ trang tài liệu chính thức —
   [Create a VPC for your EKS cluster](https://docs.aws.amazon.com/eks/latest/userguide/creating-a-vpc.html#create-vpc),
   phần **Public and private subnets**, bản **IPv4**
5. **Stack name**:

```
cafe-eks-vpc
```

6. Các bước còn lại để mặc định → **Submit**

> **Đừng chép URL template từ blog này hay từ video khoá học.** AWS thay đường dẫn theo
> phiên bản, và một URL cũ hoặc sai bản sẽ dựng ra một VPC không hợp lệ với EKS — lỗi chỉ lộ
> ra ở bước cuối, khi bạn đã đi qua bốn màn hình của form tạo cluster. Lấy từ trang tài liệu
> ở trên.

Chọn đúng bản **Public and private subnets** là có lý do, đúng như sơ đồ trên: bản
chỉ-public cũng dựng được cụm, nhưng lúc đó worker node phơi ra internet — không phải hình
dạng dùng thật, và cũng không dạy được bạn vì sao NAT Gateway tồn tại.

Chờ stack chuyển sang `CREATE_COMPLETE`, khoảng vài phút.

### Mở tab Resources ra xem một lần

Tab **Resources** của stack liệt kê **chính xác** những gì nó vừa tạo. Đáng mở ra nhìn, vì
đó là lần duy nhất bạn thấy cả bảng ở đầu note này hiện ra dưới dạng tài nguyên thật — thay
vì chỉ là những cái tên.

Và trong danh sách đó có **NAT Gateway**. Tin tốt: **xoá stack sẽ gỡ luôn nó**, miễn là bạn
xoá stack chứ không đi xoá tay từng tài nguyên. Xoá tay thì CloudFormation mất dấu, và
những gì còn lại thành rác mồ côi vẫn tính tiền.

Đây là lợi ích thật của IaC mà người ta ít nói tới: **nó không chỉ dựng, nó còn biết cách
dọn.** Cùng lý do bạn `kubectl delete -f` thay vì đi xoá từng Pod.

## Kiểm lại trước khi đi tiếp

```bash
aws cloudformation describe-stacks --stack-name cafe-eks-vpc --query 'Stacks[0].StackStatus' --output text
```

Phải ra `CREATE_COMPLETE`.

Lấy VPC id và danh sách subnet — bạn sẽ cần chúng ở [8.7](/blog/k8s/deploy-to-cloud/efs-file-system)
khi tạo mount target cho EFS, và ở [8.11](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks)
khi điền form cluster:

```bash
aws cloudformation describe-stacks --stack-name cafe-eks-vpc --query 'Stacks[0].Outputs' --output table
```

Đếm subnet và AZ, để chắc là đủ hai vùng:

```bash
aws ec2 describe-subnets --filters Name=vpc-id,Values=<vpc-id> --query 'Subnets[].[SubnetId,AvailabilityZone,CidrBlock]' --output table
```

Phải thấy **ít nhất hai AZ khác nhau** ở cột thứ hai. Đây là điều kiện EKS kiểm ở form, và
kiểm trước bằng lệnh thì rẻ hơn là phát hiện ở màn hình cuối.

## Chi phí

| | |
| --- | --- |
| VPC, subnet, route table, Internet Gateway | **Miễn phí** |
| CloudFormation | **Miễn phí** |
| **NAT Gateway** | **~$0.06/giờ** + tiền lưu lượng |

Tức là từ note này trở đi, **đồng hồ đã bắt đầu chạy** — khoảng một đô rưỡi mỗi ngày, trước
khi có cluster hay node nào. Con số cụ thể ở
[note 8.4](/blog/k8s/deploy-to-cloud/services-and-cost).

Nếu bạn định dừng giữa chừng rồi làm tiếp hôm sau, **xoá stack đi** rồi dựng lại — mất vài
phút, và rẻ hơn là để NAT Gateway chạy qua đêm.

## Nếu chỉ đọc chứ không bật EKS

Trên k3d, Docker network lo hết. Không có subnet, không có NAT Gateway, không có AZ:

```bash
k3d cluster create lab --agents 2
```

Cái **mất đi** ở đây là thật, và là cái mất đáng kể nhất của cả section: bạn sẽ không tự tay
sửa một route table sai, không tự đọc một lỗi *"subnet không có đường ra internet"*.

Nhưng **khái niệm hai AZ thì k3d tái hiện được**, và đó mới là thứ quan trọng: hai node là
hai chỗ vật lý khác nhau, nên một volume chỉ gắn được vào một node sẽ làm ảnh món hỏng đúng
một nửa số lần. Chạy bài tập ở [8.14](/blog/k8s/deploy-to-cloud/getting-started-with-volumes)
là thấy ngay, không cần trả tiền cho AWS.

## Self-check

- [ ] Kể năm thành phần của mạng, và cái nào tính tiền
- [ ] Nói được public và private subnet khác nhau ở đúng chỗ nào
- [ ] Giải thích vì sao ELB ở public mà worker node ở private
- [ ] Nói được vì sao EKS bắt buộc hai AZ, và hệ quả với EBS
- [ ] Giải thích vì sao dùng CloudFormation thay vì bấm tạo từng tài nguyên
- [ ] Biết vì sao phải xoá **stack** chứ không xoá tay từng tài nguyên

## Open questions

- Một NAT Gateway cho cả hai AZ thì mất AZ đó có mất đường ra của AZ còn lại không?
- Template tạo 4 subnet — EKS dùng cả 4 hay chỉ dùng private?
- Nếu đặt worker node ở subnet public thì tiết kiệm được NAT Gateway, đánh đổi là gì?
