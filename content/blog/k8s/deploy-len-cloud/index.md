---
title: "Deploy lên cloud (AWS EKS)"
description: Từ cluster một node sang cluster thật. Đọc theo khoá, thực hành trên k3d.
order:
  - { slug: cac-lua-chon-deploy, title: "244. Các lựa chọn deploy & các bước" }
  - { slug: eks-vs-ecs, title: "245. AWS EKS vs AWS ECS" }
  - { slug: chuan-bi-du-an, title: "246. Chuẩn bị dự án" }
  - { slug: ghi-chu-chi-phi-eks, title: "247. Ghi chú về chi phí AWS EKS" }
  - { slug: dao-quanh-aws, title: "248. Dạo quanh AWS" }
  - { slug: tao-cluster-voi-eks, title: "249. Tạo & cấu hình cluster với EKS" }
  - { slug: them-worker-node, title: "250. Thêm Worker Node" }
  - { slug: ap-cau-hinh-len-cluster, title: "251. Áp cấu hình Kubernetes lên cluster" }
  - { slug: bat-dau-voi-volume, title: "252. Bắt đầu với Volume" }
  - { slug: them-efs-lam-volume, title: "253. Thêm EFS làm Volume (kiểu CSI)" }
  - { slug: persistent-volume-cho-efs, title: "254. Tạo Persistent Volume cho EFS" }
  - { slug: dung-efs-volume, title: "255. Dùng EFS Volume" }
  - { slug: mot-thu-thach, title: "256. Một thử thách!" }
  - { slug: loi-giai-thu-thach, title: "257. Lời giải thử thách" }
---

## Đọc theo khoá, thực hành trên k3d

Khoá deploy lên **AWS EKS** thật, và có hẳn một bài riêng (**247**) chỉ để cảnh báo về
giá. Không phải cảnh báo thừa: EKS tính tiền **theo giờ cho control plane** kể cả khi
không chạy gì, cộng EC2 worker node, cộng NAT Gateway, cộng EFS.

Cách tôi làm section này:

| | Khoá | Ở đây |
| --- | --- | --- |
| Cluster nhiều node | EKS + EC2 worker | **k3d** — node là container, miễn phí |
| Storage | EFS + CSI driver | local-path của k3s |
| LoadBalancer | AWS ELB | ServiceLB có sẵn của k3s |

```bash
k3d cluster create lab --agents 2
kubectl get nodes
```

Ba node, thêm khoảng 1GB RAM, không tốn đồng nào.

## Cái gì mất đi khi không dùng cloud thật

Thành thật: có mất. Bạn sẽ **không** tự tay chạm vào VPC, subnet, security group, IAM
role, hay CSI driver của nhà cung cấp. Đó là kiến thức thật.

Nên chia đôi section:

- **Làm được ngay trên k3d** — 250, 251, 252, 256, 257: multi-node, scheduling qua
  nhiều node, LoadBalancer, volume, thử thách cuối
- **Chỉ đọc hiểu** — 245, 248, 249, 253, 254: EKS vs ECS, giao diện AWS, IAM, EFS CSI

Khi nào có nhu cầu thật, hoặc công ty trả tiền, thì quay lại làm phần hai. Ghi note
theo hướng *"nếu là EKS thì bước này là gì"* để sau này đọc lại vẫn nối được.

## Đối chiếu khoá học

Bài **244–257** — trọn module. Bỏ 243, 258 (nhịp video).
