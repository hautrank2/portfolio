---
title: "Vì sao Kubernetes?"
description: Note trước liệt kê sáu việc bạn phải tự làm. Note này xem K8s trả lời từng cái ra sao — và cái giá phải trả.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, mindset]
---

[Note trước](/blog/k8s/getting-started/the-manual-deployment-problem) kết thúc bằng một danh
sách sáu việc không ai lo hộ bạn. Cách đọc note này: **đối chiếu từng dòng**, xem K8s
đưa ra cái gì.

## Sáu vấn đề, sáu câu trả lời

| Việc không ai lo | K8s đưa ra cái gì |
| --- | --- |
| Container crash lúc 3 giờ sáng | `restartPolicy` của kubelet, cộng **liveness probe** để bắt cả trường hợp treo mà chưa chết |
| Traffic tăng gấp 10 | `replicas` khai báo được, `HorizontalPodAutoscaler` tự chỉnh con số đó |
| Cần chạy trên 5 server | **Scheduler** tự chọn máy — bạn không bao giờ chỉ định máy nào |
| Downtime giữa `stop` và `run` | **Rolling update**: bản mới lên trước, bản cũ xuống sau |
| Server chết hẳn | Controller thấy Pod mất, tạo lại ở node còn sống |
| App lên nhưng chưa sẵn sàng | **Readiness probe** — chưa ready thì Service không gửi request tới |

Đọc cột phải theo chiều dọc sẽ thấy chúng không phải sáu tính năng rời rạc. Tất cả đều
là **cùng một vòng lặp**: khai báo trạng thái mong muốn, rồi có ai đó liên tục kéo thực
tế về phía nó. Chi tiết vòng lặp nằm ở note [Cluster là gì](/blog/k8s/getting-started/what-is-a-cluster).

## Lời hứa lớn nhất lại không nằm trong bảng đó

Điều đáng giá nhất của K8s không phải auto-scaling hay self-healing — mấy thứ đó
Nomad, ECS, Swarm đều có. Nó nằm ở chỗ khác:

> Kubernetes không phải một phần mềm. Nó là **một bộ API**, cộng với những controller
> hiện thực hoá bộ API đó.

Nên "cài Kubernetes" là chuyện mơ hồ. k3s, kubeadm, EKS, GKE, AKS, minikube — bốn năm
bản cài rất khác nhau về ruột, nhưng đều **là** Kubernetes vì cùng nói một API.

Hệ quả rất cụ thể: file YAML bạn viết cho k3s chạy trên con VM ở nhà, `kubectl apply`
được lên EKS mà không sửa một dòng. Cái bạn học một lần là **API**, không phải một sản
phẩm của một hãng.

Đó là lý do K8s thắng cuộc đua điều phối container, chứ không phải vì nó dễ dùng hơn.

## Vậy còn phải trả gì

Đổi lại, bạn nhận về một hệ thống có ít nhất tám thành phần phải hiểu trước khi
debug được một lỗi tầm thường. Cái giá là **độ phức tạp**, và nó là thật.

| Quy mô | Thứ rẻ hơn K8s |
| --- | --- |
| Một app, một máy | `docker run` + `--restart=always` |
| Vài service, một máy | Docker Compose |
| Không muốn nuôi hạ tầng | PaaS — Render, Fly, Cloud Run |
| Nhiều máy, nhiều team, cần chuẩn chung | **Kubernetes** |

Câu hỏi đúng không phải *"K8s có tốt không"* mà *"tôi đã có bài toán mà nó giải chưa"*.
Dựng K8s cho một app duy nhất chạy trên một VM là mua một tầng phức tạp để giải quyết
vấn đề mình chưa có.

## Cái tên

`κυβερνήτης` — tiếng Hy Lạp, nghĩa là *người lái tàu*. Cùng gốc với *governor*. Viết
tắt `k8s` vì giữa `k` và `s` có đúng 8 chữ cái.

Ẩn dụ này khá sát: người lái tàu không đóng tàu, không tuyển thuỷ thủ, không xây cảng.
Họ **điều khiển thứ đã có sẵn** — và đó chính xác là ranh giới mà
[bài sau](/blog/k8s/getting-started/k8s-does-not-manage-infrastructure) sẽ nói bằng chữ in hoa.

## Tự kiểm

- [ ] Ứng được mỗi vấn đề ở [Vấn đề của deploy thủ công](/blog/k8s/getting-started/the-manual-deployment-problem)
      với một cơ chế cụ thể của K8s
- [ ] Giải thích được vì sao "Kubernetes là một bộ API" chứ không phải một phần mềm
- [ ] Kể được ít nhất hai tình huống mà **không** nên dùng K8s

## Câu hỏi còn mở

- Liveness probe và readiness probe khác nhau chỗ nào khi cùng fail?
- Nếu API là thứ chung, các bản cài khác nhau ở đâu — và khác đó có làm YAML lệch nhau không?
