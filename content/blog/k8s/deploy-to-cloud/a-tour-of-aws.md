---
title: "8.5 Dạo quanh AWS"
description: "EC2 và nhóm dịch vụ quanh nó — thứ mà mỗi dòng kubectl get nodes trên EKS thật sự trỏ tới, và vì sao section này sẽ ra hoá đơn."
status: growing
created: 2026-09-25
updated: 2026-09-25
tags: [k8s, aws, ec2, vpc, iam, cost]
---

Bảy section vừa rồi, cụm là một thứ có sẵn — bạn không cần biết node từ đâu ra. Section
này bước ra khỏi đó, nên trước khi bấm nút tạo gì, cần biết mình đang bấm vào cái gì.

AWS có hàng trăm dịch vụ. Tin tốt: EKS chỉ dựa vào **một nhóm nhỏ**, và gần như tất cả
đều xoay quanh một dịch vụ duy nhất.

## EC2 là trung tâm

**EC2** (*Elastic Compute Cloud*) là dịch vụ cho thuê **máy ảo theo giờ**. Nó là dịch vụ
lâu đời nhất, và cũng là thứ mọi dịch vụ khác trong section này gắn vào.

Điều đáng nhớ nhất về EC2 trong ngữ cảnh Kubernetes:

> **Worker node của EKS *chính là* EC2 instance.** Không phải "giống", không phải "chạy
> trên" — mỗi dòng bạn thấy khi gõ `kubectl get nodes` là một máy ảo EC2 đang bật.

Câu đó đổi cách bạn đọc một lệnh đã quá quen:

```bash
kubectl get nodes
```

Trên k3d, ba dòng kết quả là ba container Docker trên máy bạn. Trên EKS, ba dòng đó là ba
máy ảo đang bật ở một trung tâm dữ liệu của Amazon, **và đang tính tiền từng giây**. Cùng
một lệnh, cùng một kết quả trên màn hình, nhưng một bên miễn phí và một bên thì không.

## Những khái niệm đi kèm EC2

Tạo một EC2 instance không phải là chọn một thứ, mà là chọn sáu thứ. Đây là bộ từ vựng
bạn sẽ gặp lại liên tục:

| Khái niệm | Là gì | Ở lab k3s/k3d thì tương ứng với |
| --- | --- | --- |
| **AMI** (*Amazon Machine Image*) | Ảnh đĩa khởi tạo máy — hệ điều hành và phần mềm sẵn có | Image của container node |
| **Instance type** | Cấu hình máy: `t3.micro`, `t3.medium`, `m5.large`… | RAM/CPU bạn cấp cho Docker |
| **Key pair** | Cặp khoá SSH để đăng nhập vào máy | Không cần — `docker exec` là xong |
| **Security group** | Tường lửa mức instance: mở cổng nào, cho ai | Không có tầng này |
| **EBS volume** | Đĩa gắn vào máy, tồn tại độc lập với máy | Volume Docker của node |
| **ENI** + **Elastic IP** | Card mạng ảo và IP tĩnh công khai | IP của container node |

Hai dòng in đậm cần chú ý nhiều nhất:

**Security group** là chỗ người mới hay mắc nhất. Pod chạy đúng, Service đúng, nhưng
`curl` từ ngoài không tới — vì cổng chưa mở ở tầng này. Nó là một tầng chặn **nằm ngoài
tầm nhìn của Kubernetes**, nên không có lệnh `kubectl` nào cho bạn thấy.

Đó chính là họ lỗi bạn đã gặp ở [section 7](/blog/k8s/networking): `targetPort` sai số,
`selector` lệch nhãn, app nghe cổng khác — mỗi lần đều là một tầng mà K8s không kiểm được
giúp. Security group thêm một tầng nữa vào cái thang đó, và nó ở dưới cùng.

**EBS volume** thì gắn vào **một** instance, trong **một** Availability Zone. Đây là lý do
kỹ thuật cho toàn bộ các note 8.9–8.12: hai Pod nằm trên hai node khác nhau **không** dùng
chung được một EBS volume. Cùng đúng cái bài toán đã làm khó bạn ở
[section 6](/blog/k8s/data-and-volumes), nhưng lần này lý do là vật lý thật, không phải
`hostPath` trên cụm một node.

## Mạng: VPC và nhóm quanh nó

EC2 instance không lơ lửng — nó nằm trong một mạng ảo bạn phải khai.

| | Vai trò |
| --- | --- |
| **VPC** | Mạng ảo riêng của bạn, một dải IP như `10.0.0.0/16` |
| **Subnet** | Chia VPC theo Availability Zone — public hoặc private |
| **Route table** | Gói tin đi đâu |
| **Internet Gateway** | Cửa ra internet cho subnet public |
| **NAT Gateway** | Cửa ra internet cho subnet **private** |

Dòng cuối là dòng đáng khoanh đỏ, vì hai lý do cùng lúc: nó **tính tiền theo giờ** và nó
thường **do wizard tạo ngầm** khi bạn bấm tạo cluster. Nên nó không nằm trong danh sách
"những thứ tôi đã tự tạo" trong đầu bạn — và đó là cách nó sống sót qua lần dọn dẹp.

EKS cần VPC có **ít nhất hai subnet ở hai AZ khác nhau**. Yêu cầu này không phải hình
thức: nó là cách AWS bắt bạn phải chấp nhận rằng node có thể nằm ở những nơi vật lý khác
nhau — và từ đó, bài toán EBS ở trên trở thành không tránh được.

## IAM: chỗ hay chặn người mới nhất

**IAM** (*Identity and Access Management*) quyết định ai được gọi API nào. Nó không tốn
tiền, nhưng tốn thời gian.

EKS cần **hai** role riêng biệt, và lẫn hai cái này là lỗi phổ biến:

| Role | Cấp cho ai | Để làm gì |
| --- | --- | --- |
| **Cluster role** | Chính dịch vụ EKS | Thay bạn tạo ELB, gắn volume, đọc VPC |
| **Node role** | EC2 instance làm worker | Cho kubelet gia nhập cụm, pull image từ ECR |

Dòng đầu chính là bảng "việc của K8s / việc của bạn" ở
[note 8.1](/blog/k8s/deploy-to-cloud/deployment-options) hiện ra dưới dạng quyền: khi bạn
viết `type: LoadBalancer`, **có một thứ gọi API AWS thay bạn** — và trên cloud thật, thứ
đó phải được cấp quyền trước. Ở k3s thì ServiceLB làm việc đó không cần xin phép ai, nên
tầng này bị ẩn đi hoàn toàn.

Triệu chứng khi thiếu quyền rất dễ nhận: Service `LoadBalancer` treo mãi ở
`EXTERNAL-IP: <pending>`, còn `kubectl describe service` ghi một lỗi API AWS. Đúng cái
trạng thái `<pending>` bạn từng gặp, nhưng lần này lý do hoàn toàn khác.

## Ba dịch vụ còn lại

| Dịch vụ | Xuất hiện khi | Thay cho thứ gì ở lab |
| --- | --- | --- |
| **ELB** (*Elastic Load Balancing*) | Bạn khai `type: LoadBalancer` | ServiceLB của k3s |
| **EFS** (*Elastic File System*) | Cần volume nhiều node dùng chung | `local-path` của k3s |
| **ECR** (*Elastic Container Registry*) | Muốn registry riêng thay Docker Hub | Docker Hub, hoặc `ctr images import` |

**EFS** là dịch vụ đáng để ý nhất trong ba, vì nó là câu trả lời cho giới hạn của EBS: một
filesystem qua NFS, nhiều node **cùng mount được một lúc**. Các note 8.10–8.12 làm đúng
việc đó qua CSI driver.

**ECR** thì đáng dùng thật khi làm việc, nhưng ở đây nó chỉ đổi chỗ chứa image. Việc build
và tag thì y hệt [note 8.3](/blog/k8s/deploy-to-cloud/preparing-the-project).

## Bản đồ một câu

Gộp lại, khi bạn `kubectl apply -f` lên một cụm EKS:

```
  kubectl apply -f users.yaml
            │
            ▼
   ┌──────────────────┐   AWS chạy & vá, bạn trả tiền theo giờ
   │  Control plane   │ ◄── EKS
   └────────┬─────────┘
            │  scheduler chọn node
            ▼
   ┌──────────────────┐   máy ảo thật, trả tiền theo giờ
   │   Worker node    │ ◄── EC2   (trong Subnet, trong VPC)
   └────────┬─────────┘         └── Security group chặn/mở cổng
            │
     ┌──────┴───────┬──────────────┐
     ▼              ▼              ▼
   Pod       type: LoadBalancer   PVC
              └── ELB             └── EBS (1 node) / EFS (nhiều node)
                  tiền theo giờ       tiền theo dung lượng
```

Ba trong bốn ô ở cột dưới **tính tiền**, và cả ba đều do Kubernetes tạo hộ bạn.

## Section này sẽ tốn tiền

Đây là chỗ khác biệt lớn nhất so với bảy section trước, nên nói thẳng:

> **Bảy section vừa rồi hoàn toàn miễn phí. Section này thì không.** Nếu bạn làm trên AWS
> thật, bạn sẽ nhận một hoá đơn — kể cả khi cụm không chạy Pod nào, kể cả khi bạn đang
> ngủ.

Thứ tính tiền **theo giờ**, tức là cứ tồn tại là tính, không cần dùng:

| Tài nguyên | Tính tiền kể cả khi không dùng |
| --- | --- |
| **Control plane EKS** | Có — và **không có mức Free Tier nào** |
| **EC2 worker node** | Có |
| **NAT Gateway** | Có, cộng thêm tiền lưu lượng |
| **ELB** | Có, cộng thêm tiền lưu lượng |
| **Elastic IP** chưa gắn vào đâu | Có — nghịch lý: để không lại tốn hơn |
| **EBS volume** | Có, theo dung lượng đã cấp, dù đĩa rỗng |
| **EFS** | Theo dung lượng đang lưu |

Hai dòng dễ bị bỏ qua nhất:

**Control plane EKS** là dòng lạ nhất với người quen Free Tier. EC2 có 750 giờ miễn phí
mỗi tháng trong năm đầu, nên nhiều người mặc định "chắc EKS cũng có gì đó". Không có. Một
cluster rỗng để quên vẫn ra hoá đơn đều đặn mỗi giờ.

**EBS volume** thì tính theo dung lượng bạn **cấp**, không phải dung lượng bạn **dùng**.
Một PV 20Gi chứa một file text vẫn tính đủ 20Gi. Và nếu `reclaimPolicy: Retain`, xoá PVC
rồi đĩa vẫn còn — vẫn tính tiền, nhưng không còn `kubectl` nào nhắc bạn là nó tồn tại.

### Con số thực tế

Làm gọn các bài trong section rồi dọn ngay thì **chỉ vài đô**. Con số đó giả định một điều
kiện: bạn dọn sạch. Riêng control plane EKS đã vào khoảng **$0.10 mỗi giờ** — cỡ **$70–75
một tháng** nếu để quên, trước khi cộng node, NAT Gateway và ELB.

Giá thay đổi theo thời gian và theo region, nên đừng tin con số trong blog này. Kiểm ở
nguồn:

- [aws.amazon.com/eks/pricing](https://aws.amazon.com/eks/pricing/)
- [aws.amazon.com/ec2/pricing](https://aws.amazon.com/ec2/pricing/)
- [aws.amazon.com/vpc/pricing](https://aws.amazon.com/vpc/pricing/) — NAT Gateway ở đây

### Làm hai việc này trước khi bấm tạo bất cứ thứ gì

1. **Đặt cảnh báo ngân sách** — Billing → Budgets, ngưỡng vài đô, gửi email. Vài phút
   thiết lập, và nó là thứ duy nhất báo cho bạn khi quên dọn.
2. **Ghi lại region đang dùng.** Tài nguyên gắn chặt vào region, và Console chỉ hiện những
   gì thuộc region đang chọn. Một cluster bị quên ở một region khác là cách phổ biến nhất
   để trả tiền cho thứ mình tưởng đã xoá.

Thứ tự dọn dẹp — và vì sao xoá cluster **trước** là sai thứ tự — ở
[note 8.4](/blog/k8s/deploy-to-cloud/eks-cost-notes).

## Ở đây tôi làm gì

Tôi không bật EKS, mà dùng **k3d**: node là container Docker, dựng cụm nhiều node trong
mười giây, không tốn đồng nào.

```bash
k3d cluster create lab --agents 2
```

Cách đọc các note EKS phía sau cho có ích dù không bật EKS: mỗi lần gặp một dịch vụ AWS,
hỏi **"ở k3d thì ai đang làm việc này?"** Bảng ở trên trả lời sẵn cho từng dòng — và chính
câu hỏi đó là thứ đáng mang đi, hơn là thao tác bấm trong Console.

Thứ **thật sự mất đi**: bạn sẽ không tự tay gỡ một security group chặn cổng, không tự đọc
một lỗi IAM thiếu quyền. Đó là kiến thức thật và k3d không thay được. Nhưng nó là kiến
thức rẻ để mua sau, khi có một buổi rảnh — hoặc khi công ty trả tiền.

## Self-check

- [ ] Nói được worker node của EKS thật ra là gì
- [ ] Kể sáu thứ phải chọn khi tạo một EC2 instance
- [ ] Giải thích vì sao EBS không dùng chung được cho Pod ở hai node
- [ ] Phân biệt cluster role và node role của EKS
- [ ] Kể bốn tài nguyên tính tiền theo giờ dù không dùng
- [ ] Biết chỗ đặt cảnh báo ngân sách, và vì sao phải ghi lại region

## Open questions

- Security group chặn ở tầng ngoài K8s — vậy có lệnh `kubectl` nào cho thấy dấu hiệu không?
- EFS dùng chung được nhiều node, vậy còn dùng EBS làm gì?
- Elastic IP chưa gắn vào đâu lại tốn tiền hơn khi đã gắn — vì sao AWS thiết kế như vậy?
