---
title: "Kubernetes Networking"
description: Ba service gọi nhau bằng tên. Ba cách nối, theo đúng thứ tự tiến hoá.
order:
  - { slug: project-and-goals, title: "227. Dự án khởi điểm & mục tiêu" }
  - { slug: first-deployment, title: "228. Tạo Deployment đầu tiên" }
  - { slug: services-revisited, title: "229. Nhìn lại Service" }
  - { slug: multiple-containers-in-one-pod, title: "230. Nhiều container trong một Pod" }
  - { slug: intra-pod-communication, title: "231. Giao tiếp trong nội bộ Pod" }
  - { slug: creating-multiple-deployments, title: "232. Tạo nhiều Deployment" }
  - { slug: pod-to-pod-with-ip-and-env, title: "233. Pod gọi Pod bằng IP & biến môi trường" }
  - { slug: dns-for-pod-to-pod, title: "234. Dùng DNS cho giao tiếp Pod-to-Pod" }
  - { slug: which-approach-is-best, title: "235. Cách nào tốt nhất? Và một thử thách!" }
  - { slug: tasks-txt-hint, title: "236. Gợi ý quan trọng: tạo file tasks.txt" }
  - { slug: challenge-solution, title: "237. Lời giải thử thách" }
  - { slug: adding-a-frontend, title: "238. Thêm frontend đã container hoá" }
  - { slug: deploying-the-frontend, title: "239. Deploy frontend bằng Kubernetes" }
  - { slug: reverse-proxy, title: "240. Dùng reverse proxy cho frontend" }
  - { slug: module-summary, title: "241. Tóm tắt module" }
  - ingress-vs-service
---

## Phần hay nhất: ba cách nối, theo đúng thứ tự tiến hoá

Bài **233 → 234 → 235** đi qua ba cách cho Pod gọi Pod, và mỗi bước bạn thấy cách
trước gãy ở đâu:

| Cách | Gãy ở đâu |
| --- | --- |
| **IP thủ công** | Pod chết là IP đổi, phải sửa tay |
| **Biến môi trường tự sinh** | Chỉ có nếu Service tạo **trước** Pod |
| **DNS** | Không gãy — nên đây là cách dùng thật |

Đây là kiểu dạy hiếm: cho bạn đi vào ngõ cụt có kiểm soát, rồi mới chỉ đường ra.

## Thử thách — làm trước khi xem lời giải

Bài **235** đưa đề, bài **237** chữa. Ở giữa là bài **236** — một gợi ý ngắn.

Tôi tách thành ba note riêng có chủ ý: gộp lại một chỗ thì bạn sẽ đọc lời giải trước,
và mất sạch giá trị. **Tự nối ba service trước đã.**

## Nối ngược về Section 0

Bài tập [`unshare --net`](/blog/k8s/foundations/linux/namespaces-and-cgroups) đã cho bạn thấy
một network namespace trắng: chỉ có `lo`, và `lo` đang `DOWN`.

Đó **chính xác** là trạng thái Pod trước khi CNI vào cấu hình. Mọi thứ section này nói
đều xây trên nền đó.

## Một chỗ khoá không dạy: Ingress

Khoá giải quyết việc phơi ra ngoài bằng **reverse proxy nginx tự dựng** (bài 240) —
cách này chạy được, nhưng không phải cách K8s làm.

Khoá **không hề nhắc tới Ingress hay Ingress controller**, dù đó là thứ mọi cluster
thật đều dùng. Note *Ingress khác Service ở đâu* nằm cuối danh sách là phần tôi tự
thêm, ngoài khoá.

## Đối chiếu khoá học

Bài **227–241** — trọn module. Bỏ 226, 242 (nhịp video).
