---
title: "8.4 Dịch vụ sẽ dùng & ước tính chi phí"
description: "Bảy dịch vụ AWS mà Cafe System cần, ai tạo từng cái, và hoá đơn sẽ khoảng bao nhiêu nếu bạn làm hết rồi dọn."
status: growing
created: 2026-09-25
updated: 2026-09-29
tags: [k8s, aws, eks, ec2, efs, ebs, elb, vpc, iam, cost]
---

Note này là bảng kê. Nó trả lời hai câu hỏi trước khi bạn bấm nút nào: **sẽ dùng những gì**,
và **tốn khoảng bao nhiêu**.

Các note từ [8.5](/blog/k8s/deploy-to-cloud/iam-roles) trở đi đi sâu vào từng dịch vụ
trong bảng này — mỗi dịch vụ một note, giải thích rồi tạo luôn.

## Bảy dịch vụ

Cột **Ai tạo** là cột đáng đọc nhất, vì nó cho biết cái gì nằm trong tay bạn và cái gì
xuất hiện sau lưng bạn:

| Dịch vụ | Vai trò trong Cafe System | Ai tạo | Tính tiền |
| --- | --- | --- | --- |
| **IAM** | Hai role: cho EKS và cho worker node | **Bạn**, bằng tay | Không |
| **VPC** | Mạng riêng, 2 subnet ở 2 AZ, định tuyến | **CloudFormation**, từ template của AWS | NAT Gateway: **có** |
| **EFS** | Thư mục ảnh món, nhiều Pod cùng ghi | **Bạn**, bằng tay | Có, theo dung lượng |
| **EKS** | Control plane — dựng **cuối cùng** | **Bạn**, bằng tay | **Có, theo giờ** |
| **EC2** | Worker node, qua node group của EKS | **Bạn**, sau khi có cluster | **Có, theo giờ** |
| **EBS** | Đĩa cho MongoDB, một Pod dùng | **Kubernetes**, khi bạn apply PVC | Có, theo dung lượng cấp |
| **ELB** | Hai load balancer cho hai frontend | **Kubernetes**, khi bạn apply Service | **Có, theo giờ** |

Ba dòng cuối là chỗ dễ mất tiền nhất: **bạn không bấm tạo chúng.** Chúng sinh ra từ một
dòng YAML — `type: LoadBalancer`, `kind: PersistentVolumeClaim` — nên chúng không nằm trong
đầu bạn như những thứ "tôi đã tạo", và vì thế không nằm trong danh sách khi bạn dọn.

Đó là bảng "việc của K8s / việc của bạn" ở [note 8.1](/blog/k8s/deploy-to-cloud/deployment-options)
hiện ra ở mặt hoá đơn: **K8s tiêu tài nguyên cloud thay bạn, nên nó cũng tiêu tiền thay bạn.**

### Hai thứ không tốn tiền nhưng tốn thời gian

| | |
| --- | --- |
| **IAM** | Miễn phí hoàn toàn. Nhưng thiếu quyền là lỗi khó đọc nhất trong section |
| **CloudFormation** | Miễn phí — bạn chỉ trả tiền cho tài nguyên nó tạo ra |

### Hai thứ cố tình không dùng

| | Vì sao |
| --- | --- |
| **ECR** | Image đẩy lên Docker Hub dạng `cafe-*`, đã làm ở [note 8.3](/blog/k8s/deploy-to-cloud/preparing-the-project) |
| **CloudWatch Logs** | Tắt logging control plane. Tính tiền theo lượng log, và `kubectl logs` đủ dùng ở lab |

## Ước tính chi phí

Đây là con số cho **đúng cấu hình của demo này**: 1 cluster, 2 worker node `t3.medium`,
1 NAT Gateway, 2 load balancer, EFS vài MB, 1 đĩa EBS 2Gi.

| Khoản | Đơn vị tính | Xấp xỉ mỗi giờ |
| --- | --- | --- |
| Control plane EKS | 1 cluster | **~$0.10** |
| EC2 worker | 2 × `t3.medium` | ~$0.10 |
| NAT Gateway | 1 cái + lưu lượng | ~$0.06 |
| ELB | 2 cái + lưu lượng | ~$0.05 |
| EBS `gp2` | 2Gi | ~$0.001 |
| EFS | vài MB | ~$0 |
| **Tổng** | | **~$0.31 / giờ** |

Quy ra những mốc dễ hình dung:

| Bạn để nó chạy | Hoá đơn |
| --- | --- |
| Một buổi lab 3 tiếng, dọn ngay | **~$1** |
| Quên một ngày | ~$7,5 |
| Quên một tuần | ~$52 |
| **Quên một tháng** | **~$225** |

Dòng đầu là lý do section này làm được với chi phí không đáng kể. Dòng cuối là lý do phải
đặt cảnh báo ngân sách **trước** khi bắt đầu.

> **Đừng tin những con số trên.** Giá đổi theo thời gian và theo region, và bảng này chỉ
> dùng để bạn biết mình đang ở **bậc độ lớn nào** — vài đô một buổi, không phải vài xu và
> cũng không phải vài trăm. Số thật thì lấy ở nguồn:
>
> - [Bảng giá EKS](https://aws.amazon.com/eks/pricing/)
> - [Bảng giá EC2](https://aws.amazon.com/ec2/pricing/on-demand/)
> - [Bảng giá VPC](https://aws.amazon.com/vpc/pricing/) — NAT Gateway ở đây
> - [Bảng giá ELB](https://aws.amazon.com/elasticloadbalancing/pricing/)
> - [AWS Pricing Calculator](https://calculator.aws/) — dựng đúng cấu hình rồi xem tổng

## EKS không có Free Tier

Dòng dễ gây nhầm nhất trong bảng trên là control plane.

**EKS không nằm trong [AWS Free Tier](https://aws.amazon.com/free).** Bạn trả tiền từ
cluster đầu tiên, tính theo giờ, **kể cả khi cụm không chạy Pod nào.**

Điều này trái với trực giác của người quen Free Tier: EC2 có 750 giờ miễn phí mỗi tháng
trong năm đầu, nên nhiều người mặc định "chắc EKS cũng có gì đó". Không có. Một cluster
rỗng để quên vẫn ra hoá đơn đều đặn từng giờ.

## Hai việc làm trước khi bấm tạo bất cứ thứ gì

**1. Đặt cảnh báo ngân sách.** Billing → **Budgets**, ngưỡng vài đô, gửi email. Mất vài
phút, và nó là thứ duy nhất báo cho bạn khi quên dọn — vì AWS không tự nhắc.

**2. Ghi lại region.** Tài nguyên gắn chặt vào region, và Console chỉ hiện những gì thuộc
region đang chọn. Một cluster bị quên ở một region khác là cách phổ biến nhất để trả tiền
cho thứ mình tưởng đã xoá.

```bash
aws configure get region
```

## Dọn dẹp: thứ tự quan trọng hơn danh sách

Các bước chi tiết, kèm lệnh kiểm từng bước, nằm ở [8.19](/blog/k8s/deploy-to-cloud/cleaning-up). Dưới đây là khung.

Xoá cluster **trước** khi xoá những thứ nó tạo hộ là sai thứ tự — lúc đó không còn ai gỡ
load balancer và volume nữa, chúng thành rác mồ côi vẫn tính tiền.

1. `kubectl delete` mọi Service `LoadBalancer` → AWS gỡ ELB
2. `kubectl delete` mọi PVC → gỡ EBS, nếu `reclaimPolicy: Delete`
3. Xoá node group (EC2)
4. Xoá cluster EKS
5. Xoá EFS, rồi xoá stack VPC (stack gỡ luôn NAT Gateway)
6. Mở **Billing → Cost Explorer** hôm sau, xem còn dòng nào không

Bước 6 là bước duy nhất **chứng minh** được bạn đã dọn sạch. Danh sách tài nguyên thì dễ
sót — nhất là với ba dòng cuối của bảng đầu note, thứ bạn chưa từng bấm tạo. Hoá đơn thì
không sót gì.

Hai thứ hay sống sót qua lần dọn: **NAT Gateway** (do template tạo ngầm) và **EBS volume**
với `reclaimPolicy: Retain` (xoá PVC rồi đĩa vẫn còn, và không còn lệnh `kubectl` nào nhắc
bạn là nó tồn tại).

## Self-check

- [ ] Kể bảy dịch vụ và vai trò từng cái trong Cafe System
- [ ] Chỉ ra ba tài nguyên **Kubernetes tạo hộ**, và vì sao chúng dễ bị quên dọn
- [ ] Nói được bậc độ lớn: một buổi lab tốn khoảng bao nhiêu
- [ ] Giải thích vì sao cluster EKS rỗng vẫn tính tiền
- [ ] Biết thứ tự dọn, và vì sao xoá cluster trước là sai

## Open questions

- EBS tính tiền theo dung lượng **cấp** hay dung lượng **dùng**?
- Hai cluster EKS ở hai region có tính tiền gấp đôi không?
- PV `reclaimPolicy: Retain` giữ lại đĩa — xoá cụm rồi thì ai dọn đĩa đó?
