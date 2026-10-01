---
title: "Deploy lên cloud (AWS EKS)"
description: Từ cluster một node sang cluster thật — và mọi thứ hỏng ở tầng bên dưới Kubernetes.
order:
  - { slug: deployment-options, title: "8.1 Các lựa chọn deploy & các bước" }
  - { slug: eks-vs-ecs, title: "8.2 AWS EKS vs AWS ECS" }
  - { slug: preparing-the-project, title: "8.3 Chuẩn bị dự án" }
  - { slug: services-and-cost, title: "8.4 Dịch vụ sẽ dùng & ước tính chi phí" }
  - { slug: iam-roles, title: "8.5 IAM — hai role cho cluster và node" }
  - { slug: vpc-and-subnets, title: "8.6 VPC — mạng cho cluster" }
  - { slug: efs-file-system, title: "8.7 EFS — filesystem dùng chung" }
  - { slug: ebs-block-storage, title: "8.8 EBS — đĩa cho MongoDB" }
  - { slug: elastic-load-balancing, title: "8.9 ELB — đường vào cho hai frontend" }
  - { slug: ec2-instances, title: "8.10 EC2 — máy ảo làm worker node" }
  - { slug: creating-a-cluster-with-eks, title: "8.11 EKS — tạo cluster" }
  - { slug: connecting-kubectl-to-eks, title: "8.12 AWS CLI — nối kubectl vào cluster" }
  - { slug: adding-worker-nodes, title: "8.13 Thêm Worker Node" }
  - { slug: applying-config-to-the-cluster, title: "8.14 Áp cấu hình Kubernetes lên cluster" }
  - { slug: getting-started-with-volumes, title: "8.15 Bắt đầu với Volume" }
  - { slug: adding-efs-as-a-volume, title: "8.16 Thêm EFS làm Volume (kiểu CSI)" }
  - { slug: persistent-volume-for-efs, title: "8.17 Tạo Persistent Volume cho EFS" }
  - { slug: using-the-efs-volume, title: "8.18 Dùng EFS Volume" }
  - { slug: cleaning-up, title: "8.19 Dọn dẹp — tắt hết để không mất phí" }
---

## Dự án của section này

Một quán cà phê nhỏ: **ba API và hai frontend**, cộng một MongoDB chạy ngay trong cụm.
Khác với dự án ở [section 7](/blog/k8s/networking), nó có đủ ba thứ mà một hệ thật luôn
có — xác thực, database có state, và file do người dùng tải lên.

```
 Khách ──► shop-web ──┐                        ┌── menu-api ──► ảnh (EFS, RWX)
                      ├── nginx proxy /api ────┤
 Chủ   ──► admin-web ─┘                        ├── order-api ──► mongo (PVC, RWO)
                                               └── auth-api
```

Chi tiết ở [8.3](/blog/k8s/deploy-to-cloud/preparing-the-project). Hai dòng bên phải là
lý do section này chọn đúng dự án đó: **hai loại volume, hai access mode, hai bài toán
khác hẳn nhau.**

## Thứ tự dựng: EKS đi cuối

Mỗi dịch vụ AWS có một note riêng — giải thích nó là gì, rồi tạo luôn. Thứ tự không tuỳ ý
mà do **phụ thuộc** quyết định:

| Note | Dịch vụ | Tạo ở đâu |
| --- | --- | --- |
| 8.5 | **IAM** | Bạn, bằng tay — EKS đòi role trước khi cho điền form |
| 8.6 | **VPC** | CloudFormation — EKS đòi VPC có ≥ 2 subnet ở 2 AZ |
| 8.7 | **EFS** | Bạn, bằng tay — mount target cần subnet của 8.6 |
| 8.8 | **EBS** | *Kubernetes tạo hộ* khi bạn apply PVC ở [8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster) |
| 8.9 | **ELB** | *Kubernetes tạo hộ* khi bạn apply Service `LoadBalancer` |
| 8.10 | **EC2** | Qua node group ở [8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes) |
| **8.11** | **EKS** | **Cuối cùng** — nó cần cả 8.5 lẫn 8.6 đã có |

Ba note 8.8–8.10 giải thích trước, tạo sau. Đó không phải sắp xếp lạ: **bạn phải hiểu EBS
gắn vào một AZ trước khi viết dòng PVC sinh ra nó**, nếu không lỗi sẽ đến dưới dạng một Pod
`Pending` không nói lý do.

Và EKS đi cuối vì một lý do rất thực dụng: **nó là thứ đắt nhất và tính tiền theo giờ.**
Dựng nó sớm rồi loay hoay với IAM và VPC trong ba tiếng là trả tiền cho một cụm rỗng.

## Phần khoá học không dạy được

Khoá quay khoảng 2020, lúc đó EKS dựng xong là chạy. Bây giờ thì không: một cụm mới không
có CNI, không có DNS, không có CSI driver, và IAM chặt hơn nhiều.

Bảy thứ dưới đây **không** có trong khoá, nhưng thiếu cái nào cũng đủ làm bạn mất một buổi:

| Thứ | Thiếu thì triệu chứng là |
| --- | --- |
| **Auto Mode tắt** khi tạo cluster | Node group tạo EC2 mà không máy nào join — access entry của node role bị Auto Mode tạo sai loại |
| Access entry cho IAM user | `You must be logged in to the server` |
| Add-on **Amazon VPC CNI** (`vpc-cni`) | Node `NotReady` |
| Add-on **CoreDNS** (`coredns`), **kube-proxy** (`kube-proxy`) | Pod không phân giải được tên nào |
| Add-on `aws-ebs-csi-driver` **kèm quyền Pod Identity**, `aws-efs-csi-driver` | `ebs-csi-controller` `CrashLoopBackOff`, PVC kẹt `Pending` mãi |
| `eksClusterRole` đủ policy và `sts:TagSession` | `EXTERNAL-IP` kẹt `<pending>` |
| Tag subnet và annotation scheme | Load balancer dựng ra là `internal` |

Danh sách kiểm đầy đủ nằm ở [8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster).

Điểm chung của cả bảy: **không cái nào là lỗi Kubernetes.** Chúng nằm ở IAM, add-on, DNS,
tường lửa — tầng mà lab một node che hết. Đó cũng là thứ đáng giá nhất khi bạn thật sự
bật một cụm cloud lên.

## Dọn dẹp: note cuối, và là note phải làm

Mọi thứ ở trên tính tiền theo giờ cho tới khi bạn xoá, và một nửa trong số đó **không** đi
theo cluster. [8.19](/blog/k8s/deploy-to-cloud/cleaning-up) xoá theo đúng thứ tự ngược lúc
dựng, kiểm từng bước bằng lệnh, rồi đi tìm những thứ hay sống sót.

## Thực hành trên k3d nếu không muốn trả tiền

EKS tính tiền **theo giờ cho control plane** kể cả khi không chạy gì, cộng EC2 worker
node, cộng NAT Gateway, cộng EFS. Bài [8.4](/blog/k8s/deploy-to-cloud/services-and-cost) nói
kỹ.

| | Trên EKS | Trên k3d |
| --- | --- | --- |
| Cluster nhiều node | EC2 worker | Node là container, miễn phí |
| Storage cho Mongo | EBS qua `gp2` | `local-path` của k3s |
| Storage cho ảnh | **EFS**, `ReadWriteMany` | Không tái hiện được — cần NFS server tự dựng |
| LoadBalancer | ELB hoặc NLB thật | ServiceLB có sẵn |

```bash
k3d cluster create lab --agents 2
```

Mỗi note đều có mục **"Nếu chỉ đọc chứ không bật EKS"** ở cuối, nói rõ phần nào chạy được
trên k3d và phần nào không.

Riêng bài tập ở [8.15](/blog/k8s/deploy-to-cloud/getting-started-with-volumes) thì **nên
làm**, dù bằng k3d: nó cho bạn thấy ảnh biến mất khi Pod sinh lại, và chỉ hiện một nửa số
lần khi chạy hai bản. Hai lỗi đó là toàn bộ lý do ba note EFS tồn tại.

## Đối chiếu khoá học

Bài **244–257** — trọn module. Bỏ 243, 258 (nhịp video), và bỏ hai bài thử thách cuối vì
dự án ở đây đã khác.
