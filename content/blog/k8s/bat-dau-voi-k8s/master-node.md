---
title: "Master Node"
description: Bốn thành phần của control plane, và vì sao không thành phần nào ra lệnh cho thành phần nào.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, architecture, control-plane]
---

Control plane là bộ não. Bốn thành phần, và chúng nối với nhau theo một kiểu đáng chú ý
hơn cả bản thân từng cái.

## Bốn thành phần

| Thành phần | Việc duy nhất nó làm |
| --- | --- |
| **kube-apiserver** | Cửa vào duy nhất. Xác thực, phân quyền, kiểm tra hợp lệ, đọc/ghi etcd |
| **etcd** | Cơ sở dữ liệu. Toàn bộ trạng thái cluster nằm ở đây, không ở đâu khác |
| **kube-scheduler** | Gán node cho những Pod chưa có node |
| **kube-controller-manager** | Chứa hàng chục vòng lặp reconcile, mỗi vòng trông một loại object |

Trên cloud có thêm **cloud-controller-manager** — cầu nối sang API của nhà cung cấp,
đúng thứ đã nói ở
[Kubernetes KHÔNG quản lý hạ tầng của bạn](/blog/k8s/bat-dau-voi-k8s/k8s-khong-quan-ly-ha-tang).

## Điều đáng nhớ nhất: không ai gọi ai

Trực giác thông thường là scheduler bảo kubelet chạy Pod. **Sai.**

```
              ┌──────────────┐
              │  api-server  │ ◄──── kubectl
              └──────┬───────┘
                     │  mọi mũi tên đều nối vào ĐÂY
     ┌───────────┬───┴────┬────────────┐
     ▼           ▼        ▼            ▼
 scheduler  controllers  etcd       kubelet (mọi node)
```

Scheduler không biết kubelet tồn tại. Controller không gọi scheduler. Chỉ api-server
được phép chạm vào etcd. Tất cả nói chuyện **qua** api-server bằng cách theo dõi và ghi
object — không ai gọi thẳng ai.

Được ba thứ từ thiết kế này: thay một thành phần mà không ai biết, phân quyền tập trung
đúng một chỗ (RBAC), và mọi thay đổi đều đi qua một cửa nên audit được.

## Một lệnh `kubectl apply` đi qua đâu

Đây là ví dụ làm cả kiến trúc sáng ra:

```
1. kubectl  ──► api-server: "tôi muốn Deployment này"
2. api-server xác thực, kiểm tra, GHI VÀO ETCD           <- xong việc của nó
3. deployment controller thấy Deployment mới ──► tạo ReplicaSet
4. replicaset controller thấy RS thiếu Pod  ──► tạo 3 Pod (chưa có nodeName)
5. scheduler thấy Pod thiếu nodeName ──► chọn node ──► GHI nodeName
6. kubelet node đó thấy Pod mang tên mình ──► gọi containerd chạy
7. kubelet ──► api-server: "Pod này Running rồi"
```

Bảy bước, và **không bước nào là một mệnh lệnh**. Mỗi bên chỉ nhìn thấy một object
thiếu thứ gì đó rồi bổ sung vào. `kubectl apply` trả về ngay sau bước 2 — lúc đó chưa
có container nào chạy cả.

Đó cũng là lý do `kubectl get pod` thấy `Pending`: Pod đã tồn tại từ bước 4, nhưng bước
5 chưa xong (không node nào đủ chỗ) hoặc bước 6 chưa xong (đang kéo image).

## etcd và con số lẻ

[Cluster là gì](/blog/k8s/bat-dau-voi-k8s/cluster-la-gi) để ngỏ câu hỏi vì sao node
control plane phải là số lẻ. Câu trả lời ở đây.

etcd đồng thuận bằng **Raft**: một thay đổi chỉ được coi là đã ghi khi **quá bán** số
thành viên xác nhận. Quá bán của N là `N/2 + 1`:

| Số node | Cần để ghi | Chịu được mất |
| --- | --- | --- |
| 3 | 2 | 1 |
| **4** | **3** | **1** |
| 5 | 3 | 2 |

Bốn node chịu đựng **đúng bằng** ba node, mà tốn thêm một máy và làm mỗi lần ghi chậm
hơn. Số chẵn không sai — nó chỉ vô ích.

Và vì đây là nơi duy nhất giữ sự thật: **mất etcd là mất cluster.** Container đang chạy
thì vẫn chạy, nhưng không còn gì biết chúng *nên* chạy. Backup etcd là backup toàn bộ
cluster, và nó là thứ đáng làm trước tiên.

## Control plane chết thì sao

Câu trả lời làm nhiều người ngạc nhiên: **app của bạn vẫn chạy.**

kubelet không cần control plane để tiếp tục việc đang làm, kube-proxy đã viết xong luật
iptables rồi. Cái mất đi là **khả năng thay đổi**:

| Vẫn chạy | Không còn |
| --- | --- |
| Pod đang chạy | `kubectl` bất kỳ lệnh gì |
| Service định tuyến như cũ | Tạo Pod mới, scale, rollout |
| Container crash được kubelet restart tại chỗ | Pod chết được dời sang node khác |

Cluster đóng băng ở trạng thái cuối cùng, chứ không sụp.

## Trên k3s thì hơi khác

```bash
kubectl get pods -n kube-system
```

Nếu bạn học theo tài liệu chuẩn rồi đi tìm bốn Pod `kube-apiserver`, `etcd`,
`kube-scheduler`, `kube-controller-manager` thì sẽ không thấy. k3s **gộp cả bốn vào một
tiến trình duy nhất**, và mặc định dùng SQLite thay etcd khi chỉ có một server.

Không phải cluster của bạn hỏng — đó là một bản đóng gói khác của cùng bộ API, đúng như
[Vì sao Kubernetes?](/blog/k8s/bat-dau-voi-k8s/vi-sao-k8s) nói. Xem tận nơi:

```bash
sudo systemctl status k3s
```

## Tự kiểm

- [ ] Kể được bốn thành phần và việc của từng cái
- [ ] Kể lại được bảy bước của một `kubectl apply`
- [ ] Giải thích được vì sao 4 node control plane vô ích so với 3
- [ ] Nói được cái gì còn, cái gì mất khi control plane chết

## Câu hỏi còn mở

- Backup và restore etcd làm thế nào, và restore xong thì Pod đang chạy ra sao?
- Managed cluster giấu control plane đi — vậy debug được tới đâu khi nó có vấn đề?
