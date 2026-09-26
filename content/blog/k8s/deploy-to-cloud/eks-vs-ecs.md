---
title: "8.2 AWS EKS vs AWS ECS"
description: Hai dịch vụ chạy container trên AWS — khác nhau ở chỗ bạn viết cấu hình bằng ngôn ngữ của ai.
status: growing
created: 2026-09-25
updated: 2026-09-25
tags: [k8s, aws, eks, ecs, cloud]
---

AWS có **hai** dịch vụ chạy container được quản lý, và tên chúng gần giống nhau tới mức
dễ chọn nhầm.

## Bảng đối chiếu

| | **AWS EKS**<br> (*Elastic Kubernetes Service*) | **AWS ECS**<br> (*Elastic Container Service*) |
| --- | --- | --- |
| Là gì | Dịch vụ quản lý cho **triển khai Kubernetes** | Dịch vụ quản lý cho **triển khai container** |
| Cú pháp | **Không cần** cú pháp hay triết lý riêng của AWS | Áp dụng cú pháp và triết lý **riêng của AWS** |
| Bạn viết gì | Cấu hình và tài nguyên **Kubernetes chuẩn** | Cấu hình và khái niệm **riêng của AWS** |

Dòng thứ ba là dòng quyết định, và nó có một hệ quả rất cụ thể: **mọi file YAML bạn đã
viết suốt bảy section vừa rồi chạy được trên EKS mà không sửa một chữ.**

## "Triết lý riêng của AWS" nghĩa là gì

ECS không phải Kubernetes gọi bằng tên khác. Nó là một bộ điều phối **khác hẳn**, với bộ
khái niệm riêng:

| Bạn đã học | ECS gọi là gì |
| --- | --- |
| `Pod` | **Task** |
| `Deployment` | **Task Definition** + **ECS Service** |
| `Service` (ClusterIP) | Service Discovery qua Cloud Map |
| `Service` (LoadBalancer) | Target Group của ALB/NLB |
| `PersistentVolumeClaim` | EFS volume khai trong Task Definition |
| `ConfigMap` / `Secret` | SSM Parameter Store / Secrets Manager |
| `kubectl apply -f` | `aws ecs …`, CloudFormation, hoặc bấm trong Console |
| `kubectl get pods` | `aws ecs list-tasks` |

Không có dòng nào là bản dịch một-một. `Deployment` tách thành **hai** object ở ECS;
`Service` của K8s tách thành hai thứ hoàn toàn khác nhau tuỳ nó là nội bộ hay công khai.

Đây không phải chuyện học thuộc tên mới. Nó nghĩa là **toàn bộ kiến thức bảy section vừa
rồi không chuyển sang được** — bạn học lại từ đầu một mô hình khác.

## Đánh đổi thật sự: khoá chặt vào nhà cung cấp

```
Manifest K8s  ──► EKS ──► GKE ──► AKS ──► k3s trên máy bạn   (cùng file)
Task Definition ──► ECS                                       (hết đường)
```

Đây là giá trị lớn nhất của EKS, và nó không nằm ở tính năng nào cả: **Kubernetes là một
chuẩn, ECS là một sản phẩm.**

Bạn thấy điều đó ngay trong khoá này — cùng bộ YAML chạy trên k3s ở VM của bạn, trên k3d,
và sẽ chạy trên EKS. Với ECS thì mỗi lần đổi nơi chạy là viết lại.

## Nhưng ECS không phải lựa chọn tồi

| | EKS | ECS |
| --- | --- | --- |
| Phí control plane | **Có** — tính theo giờ cho mỗi cluster | **Không** |
| Độ phức tạp | Cao — bạn phải hiểu K8s | Thấp hơn hẳn |
| Tích hợp IAM, ALB, CloudWatch | Qua controller/addon phải cài | **Sẵn, sâu** |
| Chạy được ở nơi khác | **Có** | Không |
| Hệ sinh thái công cụ | Helm, ArgoCD, Prometheus… | Hạn chế hơn |

ECS thắng khi: **đội nhỏ, chỉ dùng AWS, không có ai chuyên vận hành K8s, và không có kế
hoạch rời AWS.** Trong hoàn cảnh đó, K8s là dao mổ trâu — bạn trả phí control plane và
gánh cả một hệ khái niệm để đổi lấy tính di động mà bạn sẽ không dùng tới.

> `Fargate` không nằm trong bảng này vì nó là chuyện khác: đó là **cách cấp máy**, dùng
> được cho cả EKS lẫn ECS. Chọn EKS/ECS là chọn *bộ điều phối*; chọn EC2/Fargate là chọn
> *ai lo máy chủ*.

## Câu hỏi để chọn

> **Bạn có bao giờ định chạy app này ở chỗ khác ngoài AWS không?**

Có, hoặc chưa biết → **EKS**. Kiến thức và file cấu hình đi theo bạn.

Chắc chắn không, và đội bạn không có ai rành K8s → **ECS**. Đơn giản hơn, rẻ hơn, và tích
hợp AWS tốt hơn.

Đó cũng là lý do khoá này — và section này — chọn EKS: nó là **phần mở rộng tự nhiên** của
mọi thứ bạn đã học, không phải một hệ thống mới.

## Bài tập trên giấy

Mở lại tám file của bài tập cuối ở
[note 7.14](/blog/k8s/networking/module-summary). Với mỗi file, trả lời:

1. Nó chạy được trên EKS mà không sửa chữ nào không?
2. Nếu chuyển sang ECS, nó biến thành cái gì?

Câu 1 trả lời được ngay: **tất cả**, trừ đúng một chỗ — `type: LoadBalancer` sẽ tạo ra một
ELB thật thay vì dùng ServiceLB của k3s, và `hostPath` thì không nên dùng trên cụm nhiều
node.

Câu 2 sẽ mất nhiều thời gian hơn bạn tưởng, và đó chính là câu trả lời cho phần "khoá chặt
vào nhà cung cấp".

## Self-check

- [ ] Nói được khác biệt cốt lõi giữa EKS và ECS trong một câu
- [ ] Kể ba khái niệm K8s và đối ứng của chúng ở ECS
- [ ] Giải thích được vì sao "Kubernetes là chuẩn, ECS là sản phẩm"
- [ ] Kể hai tình huống ECS là lựa chọn đúng hơn
- [ ] Nói được Fargate nằm ở tầng nào, không phải tầng nào

## Open questions

- EKS không tính phí worker node — vậy hoá đơn thật sự đến từ đâu?
- Nếu K8s là chuẩn, vì sao chuyển từ EKS sang GKE vẫn không hoàn toàn miễn phí?
