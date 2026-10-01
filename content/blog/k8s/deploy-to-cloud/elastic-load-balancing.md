---
title: "8.9 ELB — đường vào cho hai frontend"
description: "Load balancer sinh ra từ một dòng type LoadBalancer, và ba thứ quyết định nó dựng ra internal hay internet-facing."
status: growing
created: 2026-09-29
updated: 2026-09-30
tags: [k8s, aws, elb, nlb, service, loadbalancer]
---

> Tiếp [8.8](/blog/k8s/deploy-to-cloud/ebs-block-storage). Hai note vừa rồi lo chỗ **lưu**
> dữ liệu. Note này lo đường **vào**.

> Chưa có cluster nên chưa có Service nào để xem. Lệnh duy nhất cần chạy ở note này là
> kiểm tag subnet; hai lệnh liệt kê load balancer để dành cho lúc dọn.

Cafe System có hai cửa cho người dùng: `shop-web` cho khách, `admin-web` cho chủ quán. Cả
hai là Service `type: LoadBalancer`. Ba API và Mongo là `ClusterIP` — không ai ngoài cụm gọi
tới được, đúng như thiết kế ở [8.3](/blog/k8s/deploy-to-cloud/preparing-the-project).

Như EBS, bạn **không bấm tạo** load balancer. Kubernetes tạo hộ khi apply ở
[8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster), và cũng như EBS, nó là thứ
dễ quên dọn nhất vì chưa từng nằm trong danh sách "tôi đã tạo".

## Ba loại load balancer của AWS

**Elastic Load Balancing** là tên chung của ba sản phẩm:

| Loại | Tầng | Hiểu gì về request | Dùng khi |
| --- | --- | --- | --- |
| **Classic** (CLB) | 4 và 7 | Ít | Đời đầu, AWS coi là cũ |
| **Network** (NLB) | 4 — TCP/UDP | Chỉ thấy kết nối, không đọc HTTP | Một cổng, một Service |
| **Application** (ALB) | 7 — HTTP | Đọc được path, host, header | Nhiều Service sau một cửa, qua `Ingress` |

Cụm của section này sẽ ra **Classic**, và lý do nằm ở một lựa chọn bạn làm từ
[8.11](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks): tắt Auto Mode.

## Ai dựng load balancer

`type: LoadBalancer` không tự làm gì cả. Nó chỉ là một yêu cầu, và phải có một **controller**
đọc yêu cầu đó rồi gọi API của AWS. Loại load balancer bạn nhận được phụ thuộc vào **ai
đang làm controller**:

| Controller | Có khi nào | Mặc định dựng ra |
| --- | --- | --- |
| **Cloud provider có sẵn trong control plane** | Luôn có, không cần cài | **Classic**. Thêm annotation `aws-load-balancer-type: nlb` thì ra NLB |
| AWS Load Balancer Controller | Bạn tự cài bằng Helm | NLB, và ALB cho `Ingress` |
| EKS Auto Mode | Bật Auto Mode | NLB |

Section này không cài controller nào và tắt Auto Mode, nên chỉ còn dòng đầu. Controller đó
chạy **trong control plane mà AWS giữ**, và gọi API bằng quyền của `eksClusterRole` — role
bạn tạo ở [8.5](/blog/k8s/deploy-to-cloud/iam-roles). Đây là một trong số ít lần role đó
làm việc mà bạn nhìn thấy được kết quả.

## Một request đi qua những đâu

```
 Trình duyệt
     │  http://<tên-miền>:8210
     ▼
 ┌──────────── Subnet PUBLIC (2 AZ) ────────────┐
 │  Load balancer — listener cổng 8210          │
 └──────────────────────┬───────────────────────┘
                        │  route local trong VPC, không qua NAT
 ┌──────────── Subnet PRIVATE (2 AZ) ───────────┐
 │  Node bất kỳ, cổng NodePort 3xxxx            │
 │     │  kube-proxy                            │
 │     ▼                                        │
 │  Pod shop-web, cổng 80                       │
 └──────────────────────────────────────────────┘
```

Ba điều đáng để ý trong hình:

**Service `LoadBalancer` là một `NodePort` có thêm một cửa phía trước.** Kubernetes mở cùng
một cổng `3xxxx` trên **mọi** node, rồi controller đăng ký tất cả node làm đích của load
balancer. Đó là lý do `kubectl get svc` ở 8.14 in ra `8210:31234/TCP` — số thứ hai chính là
NodePort.

**Load balancer ở public, node ở private** — đúng hình dạng đã dựng ở
[8.6](/blog/k8s/deploy-to-cloud/vpc-and-subnets). Load balancer có IP công khai để nhận
request từ internet; đoạn từ nó vào node đi trong VPC. Node không cần, và không có, IP
công khai nào.

**Controller tự mở tường lửa.** Nó thêm rule vào security group của node, cho phép load
balancer gọi vào dải NodePort. Bạn không phải sửa security group nào — nhưng nên biết rule
đó ở đâu ra khi đọc security group ở [8.10](/blog/k8s/deploy-to-cloud/ec2-instances).

## Ba thứ quyết định internal hay internet-facing

Một load balancer có **scheme**:

| Scheme | Tên miền phân giải ra | Gọi được từ |
| --- | --- | --- |
| `internet-facing` | IP công khai | Mọi nơi |
| `internal` | IP riêng trong VPC | Chỉ trong VPC |

Scheme sai là lỗi khó chịu nhất của cả phần này: `EXTERNAL-IP` có tên miền đàng hoàng, load
balancer `active`, nhưng trình duyệt báo `ENOTFOUND`. Ba thứ quyết định scheme:

### 1. Controller nào, mặc định của nó là gì

| Controller | Scheme mặc định |
| --- | --- |
| Cloud provider có sẵn | **`internet-facing`** |
| AWS Load Balancer Controller, Auto Mode | **`internal`** |

Hai mặc định ngược nhau — và bạn đổi controller là đổi mặc định, dù YAML không đổi một dòng.

### 2. Annotation trên Service

`shop-web.yaml` và `admin-web.yaml` khai thẳng:

```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
```

Với cụm của section này thì annotation đó **không có tác dụng**: cloud provider có sẵn không
đọc nó, và mặc định của nó vốn đã là `internet-facing`. Nó nằm đó để YAML vẫn đúng nếu một
ngày cụm chuyển sang AWS Load Balancer Controller hoặc Auto Mode — nơi thiếu nó thì ra
`internal`.

Mỗi controller đọc một bộ annotation riêng. Cloud provider có sẵn muốn `internal` thì dùng
một annotation khác hẳn:

```yaml
service.beta.kubernetes.io/aws-load-balancer-internal: "true"
```

Hai controller, hai cách viết cho cùng một ý. Đây là chỗ đọc tài liệu phải xem nó viết cho
controller nào.

### 3. Tag trên subnet

Load balancer `internet-facing` phải nằm ở subnet **public**. Controller tìm subnet dựa vào
tag:

| Tag | Đặt ở | Nghĩa |
| --- | --- | --- |
| `kubernetes.io/role/elb` = `1` | Subnet public | Nơi đặt load balancer `internet-facing` |
| `kubernetes.io/role/internal-elb` = `1` | Subnet private | Nơi đặt load balancer `internal` |

Template CloudFormation của AWS ở 8.6 thường đã gắn sẵn, nhưng kiểm thì rẻ hơn tin. Lệnh
này chạy được **ngay bây giờ** — VPC đã có, không cần cluster — và nên chạy luôn, vì thiếu
tag thì lỗi chỉ lộ ra ở 8.14:

```bash
aws ec2 describe-subnets --filters Name=vpc-id,Values=<vpc-id> --query "Subnets[].{id:SubnetId,name:Tags[?Key=='Name']|[0].Value,elb:Tags[?Key=='kubernetes.io/role/elb']|[0].Value,internal:Tags[?Key=='kubernetes.io/role/internal-elb']|[0].Value}" --output table
```

Hai subnet `Public…` phải có `1` ở cột `elb`. Thiếu thì event của Service sẽ báo
`could not find any suitable subnets`, và lệnh gắn tag nằm ở
[8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster).

## `EXTERNAL-IP` là một tên miền

Load balancer của AWS **không có IP cố định**. Nó có nhiều node phía sau, IP thay đổi theo
thời gian, và AWS chỉ cam kết một **tên miền**:

```
a1b2c3d4e5f6…-1234567890.ap-southeast-2.elb.amazonaws.com
```

Cái tên vô nghĩa đó là dấu hiệu của Classic do cloud provider có sẵn dựng: nó đặt tên load
balancer bằng một chuỗi băm. AWS Load Balancer Controller thì đặt tên đọc được, dạng
`k8s-default-shopweb-…` — nhìn tên là biết controller nào đã làm việc.

Hai hệ quả, cả hai đều gặp ở 8.14:

- Lấy bằng `.status.loadBalancer.ingress[0].hostname`, không phải `.ip`.
- Sau khi `kubectl` đã in ra tên miền, cần thêm một hai phút để DNS phân giải được.

## Vòng đời — đi theo Service, không đi theo cluster

| Bạn làm | Load balancer |
| --- | --- |
| Xoá Pod, rollout, scale Deployment | Còn nguyên, tên miền không đổi |
| Sửa annotation scheme | **Không** sửa tại chỗ — phải xoá Service rồi tạo lại, tên miền mới |
| `kubectl delete svc` | Controller gỡ load balancer |
| **Xoá cluster khi Service còn** | Load balancer **mồ côi**, vẫn tính tiền |

Dòng cuối tệ hơn cả EBS mồ côi. Load balancer có card mạng nằm trong subnet public, và kèm
một security group do controller tạo — nên **stack `cafe-eks-vpc` cũng không xoá được** cho
tới khi bạn tự đi gỡ chúng.

Xem load balancer nào đang tồn tại — Classic và NLB/ALB nằm ở hai API khác nhau:

```bash
aws elb describe-load-balancers --query "LoadBalancerDescriptions[].{name:LoadBalancerName,dns:DNSName,scheme:Scheme}" --output table
```

```bash
aws elbv2 describe-load-balancers --query "LoadBalancers[].{name:LoadBalancerName,type:Type,scheme:Scheme}" --output table
```

Vì vậy bước **đầu tiên** trong [thứ tự dọn ở 8.4](/blog/k8s/deploy-to-cloud/services-and-cost)
là xoá mọi Service `LoadBalancer`, khi controller vẫn còn sống để gỡ hộ bạn.

## Chi phí

| Khoản | Xấp xỉ |
| --- | --- |
| Mỗi load balancer | ~$0.025/giờ, tính cả khi không ai gọi |
| Lưu lượng | Theo GB đi qua — với lab thì không đáng kể |
| **Hai frontend** | **~$0.05/giờ**, khoảng $36 mỗi tháng nếu để quên |

Hai Service là **hai hoá đơn**. Muốn gộp về một cửa thì dùng `Ingress` với một ALB, định
tuyến theo path hay theo host — nhưng việc đó cần cài AWS Load Balancer Controller, và nằm
ngoài section này.

## Nếu chỉ đọc chứ không bật EKS

k3d có sẵn **ServiceLB**. Apply một Service `LoadBalancer` rồi xem:

```bash
kubectl get pods -n kube-system -l svccontroller.k3s.cattle.io/svcname -o wide
```

Không có máy nào mới. ServiceLB chỉ đặt một Pod nhỏ trên mỗi node, giữ cổng của Service
trên chính node đó, và `EXTERNAL-IP` là IP của node. Mô hình giống hệt — một controller đọc
`type: LoadBalancer` rồi dựng đường vào — chỉ khác thứ nó dựng ra.

Cái k3d không cho bạn thấy: scheme, subnet tag, tên miền thay cho IP, và một hoá đơn cho
mỗi Service.

## Self-check

- [ ] Phân biệt Classic, NLB, ALB ở tầng mạng và khi nào dùng cái nào
- [ ] Nói được vì sao cụm này ra Classic, và đổi gì thì ra NLB
- [ ] Giải thích quan hệ giữa `LoadBalancer`, `NodePort` và cổng `3xxxx`
- [ ] Kể ba thứ quyết định scheme, và vì sao annotation trong YAML không có tác dụng ở cụm này
- [ ] Biết vì sao `EXTERNAL-IP` là tên miền chứ không phải IP
- [ ] Giải thích vì sao phải xoá Service **trước** khi xoá cluster

## Open questions

- Load balancer đăng ký **mọi** node làm đích, kể cả node không chạy Pod `shop-web`. Request
  tới node đó thì đi tiếp thế nào, và tốn thêm gì?
- `externalTrafficPolicy: Local` thay đổi đường đi ở trên ra sao?
- Một ALB cho cả hai frontend thì `admin-web` và `shop-web` phân biệt bằng path hay bằng
  host — cái nào hợp với nginx proxy `/api` hiện tại?
