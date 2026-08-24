---
title: "Kubernetes thực chiến: các khái niệm cốt lõi"
description: Module lớn nhất khoá, 2h33. Deployment, Service, và đường từ imperative sang declarative.
order:
  - { slug: k8s-khong-quan-ly-ha-tang-2, title: "182. Kubernetes không quản lý hạ tầng" }
  - { slug: cai-dat-can-gi, title: "183. Cần chuẩn bị và cài những gì" }
  - { slug: k8s-object-la-gi, title: "186. Hiểu về Kubernetes Object (Resource)" }
  - { slug: deployment-object, title: "187. Object Deployment" }
  - { slug: deployment-dau-tien-imperative, title: "188. Deployment đầu tiên — kiểu imperative" }
  - { slug: kubectl-phia-sau-hau-truong, title: "189. kubectl: chuyện gì xảy ra phía sau" }
  - { slug: service-object, title: "190. Object Service" }
  - { slug: phoi-deployment-bang-service, title: "191. Phơi Deployment ra bằng Service" }
  - { slug: restart-container, title: "192. Container restart lúc nào" }
  - { slug: scaling, title: "193. Scaling trong thực tế" }
  - { slug: cap-nhat-deployment, title: "194. Cập nhật Deployment" }
  - { slug: rollback-va-lich-su, title: "195. Rollback & lịch sử revision" }
  - { slug: imperative-vs-declarative, title: "196. Imperative vs Declarative" }
  - { slug: viet-file-deployment, title: "197. Viết file cấu hình Deployment" }
  - { slug: pod-va-container-spec, title: "198. Thêm Pod spec và Container spec" }
  - { slug: label-va-selector, title: "199. Làm việc với Label & Selector" }
  - { slug: viet-file-service, title: "200. Viết Service bằng YAML" }
  - { slug: cap-nhat-va-xoa-resource, title: "201. Cập nhật & xoá resource" }
  - { slug: nhieu-file-hay-mot-file, title: "202. Nhiều file hay một file cấu hình" }
  - { slug: them-ve-label-selector, title: "203. Thêm về Label & Selector" }
  - { slug: liveness-probe, title: "204. Liveness Probe" }
  - { slug: cac-tuy-chon-cau-hinh, title: "205. Nhìn kỹ các tuỳ chọn cấu hình" }
  - { slug: tom-tat-module, title: "206. Tóm tắt module" }
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
