---
title: "Deploy lên cloud (AWS EKS)"
description: Từ cluster một node sang cluster thật — và mọi thứ hỏng ở tầng bên dưới Kubernetes.
order:
  - { slug: deployment-options, title: "8.1 Các lựa chọn deploy & các bước" }
  - { slug: eks-vs-ecs, title: "8.2 AWS EKS vs AWS ECS" }
  - { slug: preparing-the-project, title: "8.3 Chuẩn bị dự án" }
  - { slug: eks-cost-notes, title: "8.4 Ghi chú về chi phí AWS EKS" }
  - { slug: a-tour-of-aws, title: "8.5 Dạo quanh AWS" }
  - { slug: creating-a-cluster-with-eks, title: "8.6 Tạo & cấu hình cluster với EKS" }
  - { slug: adding-worker-nodes, title: "8.7 Thêm Worker Node" }
  - { slug: applying-config-to-the-cluster, title: "8.8 Áp cấu hình Kubernetes lên cluster" }
  - { slug: getting-started-with-volumes, title: "8.9 Bắt đầu với Volume" }
  - { slug: adding-efs-as-a-volume, title: "8.10 Thêm EFS làm Volume (kiểu CSI)" }
  - { slug: persistent-volume-for-efs, title: "8.11 Tạo Persistent Volume cho EFS" }
  - { slug: using-the-efs-volume, title: "8.12 Dùng EFS Volume" }
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

## Phần khoá học không dạy được

Khoá quay khoảng 2020, lúc đó EKS dựng xong là chạy. Bây giờ thì không: một cụm mới không
có CNI, không có DNS, không có CSI driver, và IAM chặt hơn nhiều.

Sáu thứ dưới đây **không** có trong khoá, nhưng thiếu cái nào cũng đủ làm bạn mất một buổi:

| Thứ | Thiếu thì triệu chứng là |
| --- | --- |
| Access entry cho IAM user | `You must be logged in to the server` |
| Add-on `vpc-cni` | Node `NotReady` |
| Add-on `coredns`, `kube-proxy` | Pod không phân giải được tên nào |
| Add-on `aws-ebs-csi-driver`, `aws-efs-csi-driver` | PVC kẹt `Pending` mãi |
| `eksClusterRole` đủ policy và `sts:TagSession` | `EXTERNAL-IP` kẹt `<pending>` |
| Tag subnet và annotation scheme | Load balancer dựng ra là `internal` |

Danh sách kiểm đầy đủ nằm ở [8.8](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster).

Điểm chung của cả sáu: **không cái nào là lỗi Kubernetes.** Chúng nằm ở IAM, add-on, DNS,
tường lửa — tầng mà lab một node che hết. Đó cũng là thứ đáng giá nhất khi bạn thật sự
bật một cụm cloud lên.

## Thực hành trên k3d nếu không muốn trả tiền

EKS tính tiền **theo giờ cho control plane** kể cả khi không chạy gì, cộng EC2 worker
node, cộng NAT Gateway, cộng EFS. Bài [8.4](/blog/k8s/deploy-to-cloud/eks-cost-notes) nói
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

Riêng bài tập ở [8.9](/blog/k8s/deploy-to-cloud/getting-started-with-volumes) thì **nên
làm**, dù bằng k3d: nó cho bạn thấy ảnh biến mất khi Pod sinh lại, và chỉ hiện một nửa số
lần khi chạy hai bản. Hai lỗi đó là toàn bộ lý do ba note EFS tồn tại.

## Đối chiếu khoá học

Bài **244–257** — trọn module. Bỏ 243, 258 (nhịp video), và bỏ hai bài thử thách cuối vì
dự án ở đây đã khác.
