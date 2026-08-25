---
title: "Kubernetes thực chiến: các khái niệm cốt lõi"
description: Module lớn nhất khoá, 2h33. Deployment, Service, và đường từ imperative sang declarative.
order:
  - k8s-khong-quan-ly-ha-tang-2
  - cai-dat-can-gi
  - k8s-object-la-gi
  - deployment-object
  - deployment-dau-tien-imperative
  - kubectl-phia-sau-hau-truong
  - service-object
  - phoi-deployment-bang-service
  - restart-container
  - scaling
  - cap-nhat-deployment
  - rollback-va-lich-su
  - imperative-vs-declarative
  - viet-file-deployment
  - pod-va-container-spec
  - label-va-selector
  - viet-file-service
  - cap-nhat-va-xoa-resource
  - nhieu-file-hay-mot-file
  - them-ve-label-selector
  - liveness-probe
  - cac-tuy-chon-cau-hinh
  - tom-tat-module
---

**Module lớn nhất của cả khoá — 2h33, 27 bài.** Gần bằng ba module sau cộng lại.
Đừng nén.

## Mạch của module, và vì sao nó đúng

Khoá đi theo thứ tự này:

1. **Làm bằng lệnh trước** (`kubectl create deployment`) — thấy kết quả ngay, chưa
   phải đọc dòng YAML nào
2. **Rồi mới viết file** — lúc này bạn đã biết mình đang mô tả cái gì
3. **Đối chiếu hai cách** (bài 196) — hiểu vì sao production luôn dùng cách thứ hai

Học YAML trước khi thấy nó làm được gì là cách nhanh nhất để nản. Thứ tự này tránh
được điều đó.

## Sợi chỉ xuyên suốt: `first-app`

Toàn bộ 23 note dùng **một** app duy nhất. Nó ra đời ở
[Deployment đầu tiên](/blog/k8s/k8s-thuc-chien/deployment-dau-tien-imperative) bằng một
lệnh, rồi lần lượt được phơi ra, scale, cập nhật, rollback, viết lại thành YAML và gắn
probe — cho tới note tóm tắt.

**Đừng xoá nó giữa chừng.** Mỗi bài tập nối tiếp trạng thái bài trước, không dựng lại từ
đầu. Bỏ dở một note là note sau thiếu hiện trường.

Chỉ cần `nginx:1.27-alpine`, không phải build image nào.

## Thay đổi so với khoá: bỏ Minikube

Khoá cài **Minikube**, có hai bài riêng cho macOS (184) và Windows (185). Tôi bỏ cả
hai và dùng **k3s trên VM Linux** — xem
[ghi chú môi trường](/blog/k8s/nen-tang/linux).

Lý do: containerd thật, systemd thật, sống qua reboot. Minikube giấu mất tầng node,
mà đó lại là chỗ debug thật sự xảy ra.

Bài **183** vẫn đáng ghi note — nhưng nội dung là *"cần những gì để chạy K8s"*, không
phải *"bấm nút nào trên máy Mac"*.

## Bài tập phá — không có trong khoá

```bash
kubectl set image deploy/first-app first-app=khong-ton-tai:v9
kubectl get pods
kubectl describe deploy first-app
```

Pod cũ **vẫn chạy**, Pod mới kẹt `ImagePullBackOff`, rollout đứng im. Hiểu vì sao lại
thế chính là hiểu `maxUnavailable` — thứ bài 205 nhắc qua mà không đào.

## Vượt chặng khi

Viết được Deployment + Service YAML từ đầu, không copy, và giải thích được vì sao
`selector.matchLabels` bắt buộc phải khớp `template.metadata.labels`.

## Đối chiếu khoá học

Bài **182–183, 186–206**. Bỏ 181, 207 (nhịp video) và **184, 185** (setup
macOS/Windows — đã thay bằng k3s).
