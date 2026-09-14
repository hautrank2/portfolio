---
title: "5.2 Cần chuẩn bị và cài những gì"
description: Bốn thứ, không hơn — và vì sao tôi bỏ Minikube của khoá để dùng k3s.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, setup, k3s]
---

Khoá dành hai bài riêng cho macOS và Windows. Tôi bỏ cả hai — xem
[lý do ở index của module](/blog/k8s/k8s-in-action). Note này ghi thứ **thật sự** cần,
không phụ thuộc bạn dùng bản cài nào.

## Bốn thứ

| Cần | Là gì | Ở đâu trong lab này |
| --- | --- | --- |
| Một **cluster** | Chỗ chạy control plane + node | k3s trên VM Linux |
| **kubectl** | Client gọi API. Chỉ là một chương trình HTTP | k3s cài kèm |
| **kubeconfig** | Địa chỉ + chứng chỉ để vào cluster nào | `/etc/rancher/k3s/k3s.yaml` |
| Một **registry** | Nơi cluster kéo image về | Docker Hub, mặc định |

Không cần Docker Desktop. Không cần cài `containerd` bằng tay. Không cần tài khoản cloud.

## Chọn bản cài nào

| Bản | Hợp khi | Điểm yếu |
| --- | --- | --- |
| **k3s** | Có sẵn một VM Linux | Vài addon riêng, không giống hệt cluster chuẩn |
| Minikube | Chỉ có laptop, muốn xoá sạch dễ | Giấu mất tầng node |
| kind | Cần dựng/xoá cluster liên tục trong CI | Node là container, khác thật |
| EKS/GKE | Chạy thật, có tiền | Tính tiền theo giờ, kể cả lúc ngủ |

Tôi chọn k3s vì **tầng node là thật**: có systemd thật, containerd thật, sống qua
reboot. Chỗ debug thật sự xảy ra nằm ở tầng đó, mà Minikube lại giấu nó đi.

## Bài tập — kubeconfig là thứ quyết định bạn nói chuyện với ai

**Đoán trước:** gõ `kubectl get nodes` bằng user thường (không `sudo`) ngay sau khi cài
k3s. Chạy được, hay lỗi? Nếu lỗi thì lỗi gì — thiếu quyền, hay không tìm thấy cluster?

```bash
kubectl get nodes
```

**Kết quả:** hầu như chắc chắn lỗi, và điều thú vị là nó **không** nói "permission
denied". Nó nói đại ý *không kết nối được tới `localhost:8080`*.

Vì sao lại là 8080? Vì `kubectl` không tìm thấy kubeconfig nào, nên nó rơi về giá trị
mặc định biên dịch sẵn — `http://localhost:8080`, một địa chỉ chẳng có gì. File
`/etc/rancher/k3s/k3s.yaml` có quyền `0600` của root, user thường đọc không được nên
coi như không tồn tại.

```bash
ls -l /etc/rancher/k3s/k3s.yaml
```

Sửa đúng cách — copy về thư mục nhà, đổi chủ:

```bash
mkdir -p ~/.kube && sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config && sudo chown $USER ~/.kube/config && chmod 600 ~/.kube/config
```

Giờ mới xem được mình đang trỏ vào đâu:

```bash
kubectl config view --minify
```

**Vì sao quan trọng:** kubeconfig là **thứ duy nhất** quyết định `kubectl` nói chuyện
với cluster nào. Cùng một lệnh `kubectl delete deployment` gõ nhầm context là xoá trên
production. Thứ tự ưu tiên: cờ `--kubeconfig`, rồi biến `KUBECONFIG`, rồi `~/.kube/config`.

## Self-check

- [ ] Kể được bốn thứ cần có, và cái nào k3s làm hộ
- [ ] Giải thích được vì sao thiếu kubeconfig thì lỗi lại nhắc tới cổng 8080
- [ ] Biết mình đang trỏ vào cluster nào mà không cần đoán

## Open questions

- Một kubeconfig chứa nhiều cluster thì chuyển qua lại bằng gì, và làm sao khỏi nhầm?
- Chứng chỉ trong kubeconfig k3s hết hạn lúc nào?
