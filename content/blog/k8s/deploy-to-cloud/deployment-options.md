---
title: "8.1 Các lựa chọn deploy & các bước"
description: Ba đường để có một cluster thật, khác nhau ở đúng một chỗ — bạn tự làm bao nhiêu phần trong cột "việc của bạn".
status: growing
created: 2026-09-25
updated: 2026-09-25
tags: [k8s, deploy, cloud, eks, kops]
---

Bảy section vừa rồi đều chạy trên một cluster có sẵn. Section này trả lời câu hỏi bị bỏ
qua từ đầu: **cái cluster đó ở đâu ra.**

## Nhắc lại ranh giới

| K8s sẽ làm | Bạn phải tự dựng |
| --- | --- |
| Tạo các object bạn khai (Pod, Deployment, Service) và quản lý chúng | **Cluster** cùng các node instance — master và worker |
| Giám sát Pod, dựng lại khi chết, scale theo `replicas` | **API server, kubelet** và phần mềm K8s trên **từng** node |
| Dùng tài nguyên hạ tầng **đã có** để hiện thực hoá cấu hình của bạn | Chính tài nguyên đó: load balancer, filesystem, registry |

Cột trái K8s lo hết, và bạn đã sống với nó suốt bảy section. Cột phải thì tới giờ **k3s
làm hộ bạn trong ba mươi giây** bằng một dòng cài đặt — nên rất dễ quên là nó tồn tại.

Bảng đầy đủ ở [note 5.24](/blog/k8s/k8s-in-action/module-summary). Section này chỉ làm
một việc: đi hết **cột phải**.

## Ba đường để có cột phải

```
                        Muốn có một cluster
                                 │
              ┌──────────────────┴──────────────────┐
              ▼                                     ▼
   ┌──────────────────────┐            ┌──────────────────────┐
   │  Trung tâm dữ liệu   │            │  Nhà cung cấp cloud  │
   │        riêng         │            └───────────┬──────────┘
   └───────────┬──────────┘                        │
               │                        ┌──────────┴──────────┐
               ▼                        ▼                     ▼
    Tự cài + cấu hình TẤT CẢ    Tự cài phần lớn        Dùng dịch vụ
               │                        │              được quản lý
       ┌───────┴───────┐        ┌───────┴───────┐              │
       ▼               ▼        ▼               ▼              ▼
  ┌─────────┐   ┌───────────┐  ┌──────────┐ ┌──────────┐ ┌──────────────┐
  │   Máy   │   │  Phần mềm │  │ Tạo + nối│ │  Cài +   │ │ Khai kiến    │
  │   móc   │   │    K8s    │  │   máy    │ │ cấu hình │ │ trúc cluster │
  └─────────┘   └───────────┘  └──────────┘ └──────────┘ └──────────────┘

                                 thủ công / kops         EKS · GKE · AKS
```

Ba đường chỉ khác nhau ở **bạn tự làm bao nhiêu phần của cột phải**:

| | Trung tâm dữ liệu riêng | Cloud, tự quản | Cloud, được quản lý |
| --- | --- | --- | --- |
| Mua/dựng máy | **Bạn** | Nhà cung cấp | Nhà cung cấp |
| Nối mạng giữa các máy | **Bạn** | **Bạn** | Nhà cung cấp |
| Cài kubelet, containerd | **Bạn** | **Bạn** (hoặc `kops`) | Nhà cung cấp |
| Chạy & vá control plane | **Bạn** | **Bạn** | **Nhà cung cấp** |
| Load balancer, storage | **Bạn** | Gọi API cloud | Gọi API cloud |
| Bạn khai gì | Mọi thứ | Máy + cấu hình | **Chỉ kiến trúc cluster** |
| Ví dụ | Bare metal, VMware | `kops`, `kubeadm` trên EC2 | **EKS**, GKE, AKS |

Cột cuối là thứ khoá học dùng, và cũng là thứ gần như mọi công ty dùng.

## Vì sao "được quản lý" thắng gần như mọi lúc

Control plane là phần **khó nhất và ít đáng tự làm nhất**: etcd phải được sao lưu, API
server phải có sẵn sàng cao, chứng chỉ phải xoay vòng, phiên bản phải vá. Không có phần
nào trong đó là lợi thế cạnh tranh của bạn.

Đổi lại, bạn trả tiền theo giờ cho control plane — kể cả khi cụm không chạy gì. Đó là
nội dung [note 8.4](/blog/k8s/deploy-to-cloud/eks-cost-notes), và là lý do tôi không
khuyên bạn bật EKS lên chỉ để học.

Hai đường còn lại vẫn có chỗ dùng thật:

| Đường | Khi nào hợp lý |
| --- | --- |
| Trung tâm dữ liệu riêng | Ràng buộc pháp lý về dữ liệu, hoặc quy mô lớn tới mức tự vận hành rẻ hơn |
| Cloud, tự quản (`kops`) | Cần tuỳ biến control plane, hoặc nhà cung cấp không có dịch vụ quản lý |

## Các bước, dù đi đường nào

Thứ tự này không đổi — chỉ đổi ai làm từng bước:

1. **Có máy** — vài VM, hoặc vài node trong một dịch vụ
2. **Nối chúng thành mạng** — cùng VPC/subnet, mở đúng cổng
3. **Cài phần mềm K8s** lên từng máy — kubelet, container runtime, kube-proxy
4. **Dựng control plane** — API server, scheduler, etcd, controller manager
5. **Nối node vào cluster** — có `kubectl get nodes` ra kết quả
6. **Chuẩn bị tài nguyên hạ tầng** — load balancer, storage class, registry
7. **Áp cấu hình của bạn** — `kubectl apply -f`

Sáu bước đầu là cột phải. **Chỉ bước 7 là thứ bạn đã làm suốt bảy section.**

Với EKS, bước 1–5 gói lại thành "khai kiến trúc cluster rồi bấm tạo"; bước 6 thành vài
lần gọi API AWS; bước 7 thì y hệt những gì bạn đã gõ từ đầu khoá.

## Ở đây tôi làm gì

Tôi **không** bật EKS. Thay vào đó dùng **k3d** — node là container Docker, dựng cụm
nhiều node trong mười giây, miễn phí:

```bash
k3d cluster create lab --agents 2
```

```bash
kubectl get nodes
```

Ba node, thêm khoảng 1GB RAM, không tốn đồng nào. Phần nào của section làm được trên k3d
và phần nào chỉ đọc hiểu thì có ở [index của section](/blog/k8s/deploy-to-cloud).

Thứ **mất đi** khi không dùng cloud thật: bạn sẽ không tự tay chạm vào VPC, subnet,
security group, IAM role hay CSI driver của nhà cung cấp. Đó là kiến thức thật, và tôi
không giả vờ là k3d thay thế được.

Nhưng năm bước đầu thì k3d cho bạn thấy đủ: nhiều node, Pod rải qua các node, và mọi
chuyện hỏng vì **dữ liệu dính vào một node** — thứ mà cụm một node giấu kín suốt
[section 6](/blog/k8s/data-and-volumes).

## Self-check

- [ ] Kể ba đường để có một cluster, và điểm khác nhau giữa chúng
- [ ] Nói được vì sao control plane là phần ít đáng tự làm nhất
- [ ] Liệt kê bảy bước, và chỉ ra bước nào bạn đã quen làm
- [ ] Nói được `kops` nằm ở đâu trong bảng, và khi nào cần tới

## Open questions

- Dịch vụ được quản lý lo control plane — vậy worker node ai vá, ai nâng cấp?
- Nếu control plane chết, các Pod đang chạy có ngừng phục vụ không?
