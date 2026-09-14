---
title: "7.3 Nhìn lại Service"
description: Lần trước Service dùng để phơi app ra ngoài. Lần này nó làm việc chính của nó — nối service với service.
status: growing
created: 2026-09-14
updated: 2026-09-14
tags: [k8s, service, clusterip, network]
---

[Note 5.8](/blog/k8s/k8s-in-action/service-object) giới thiệu Service, nhưng cả module đó
chỉ dùng nó để **phơi app ra ngoài** — `LoadBalancer`, `EXTERNAL-IP`, mở trình duyệt.

Đó là công dụng phụ. Việc chính của Service là **nối các thành phần bên trong cụm với
nhau**, và section này mới chạm tới nó.

## Vì sao không gọi thẳng Pod

```bash
kubectl create deployment api --image=nginx:1.27-alpine
```

```bash
kubectl get pods -l app=api -o jsonpath='{.items[0].status.podIP}{"\n"}'
```

Ghi lại IP đó. Giờ giết Pod:

```bash
kubectl delete pod -l app=api && sleep 5 && kubectl get pods -l app=api -o jsonpath='{.items[0].status.podIP}{"\n"}'
```

**IP đã khác.** Và không có gì báo cho bên gọi biết.

Ba lý do Pod IP không dùng được làm địa chỉ:

| | |
| --- | --- |
| **Đổi mỗi lần Pod sinh lại** | Crash, rollout, drain node — đều ra IP mới |
| **Nhiều bản thì nhiều IP** | `replicas: 3` là ba địa chỉ, ai chọn giúp bạn? |
| **Không biết trước** | Lúc viết YAML chưa có Pod nào để mà ghi IP |

## ClusterIP — mặc định, và đúng cho việc này

```bash
kubectl expose deployment api --port=80
```

```bash
kubectl get svc api
```

```
NAME   TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
api    ClusterIP   10.43.201.55    <none>        80/TCP    3s
```

`EXTERNAL-IP` là `<none>` — **cố ý**. ClusterIP chỉ gọi được từ trong cụm, và đó chính là
điều bạn muốn cho một API nội bộ: nó không nên có đường vào từ internet.

Xoá Pod bao nhiêu lần thì ClusterIP vẫn thế:

```bash
kubectl delete pod -l app=api && sleep 5 && kubectl get svc api -o jsonpath='{.spec.clusterIP}{"\n"}'; kubectl get endpoints api
```

ClusterIP không đổi, còn danh sách **endpoint** thì tự cập nhật sang IP Pod mới. Đó là
toàn bộ công việc của Service: *giữ một cái tên đứng yên trước một danh sách luôn động*.

## Bài tập — Gọi từ trong cụm

**Đoán trước:** ClusterIP không gọi được từ máy bạn. Vậy từ **một Pod khác** thì sao?

```bash
kubectl run probe --rm -it --image=busybox:1.36 --restart=Never -- wget -qO- http://api
```

**Kết quả:** trả về trang mặc định của nginx. Để ý bạn gõ `http://api` — **tên Service,
không phải IP**. Phần đó là việc của DNS, đào ở
[note 7.8](/blog/k8s/networking/dns-for-pod-to-pod).

Còn từ máy bạn thì không:

```bash
curl -m 3 http://10.43.201.55 || echo "khong goi duoc tu ngoai cum"
```

## Bốn kiểu, và kiểu nào cho việc gì

| `type` | Dùng cho |
| --- | --- |
| **ClusterIP** | **Service gọi service** — mặc định, và là phần lớn Service trong một cụm thật |
| `NodePort` | Lab, demo nhanh |
| `LoadBalancer` | Thứ duy nhất cần phơi ra internet — thường chỉ một, cho frontend |
| `ExternalName` | Bí danh DNS trỏ ra dịch vụ ngoài cụm |

Một hệ ba service như section này sắp dựng sẽ có **ba ClusterIP và nhiều nhất một
LoadBalancer**. Phơi cả ba ra ngoài là vừa tốn tiền vừa mở cửa không cần thiết.

## Dọn

```bash
kubectl delete deployment api && kubectl delete svc api
```

## Self-check

- [ ] Kể ba lý do không dùng Pod IP làm địa chỉ
- [ ] Nói được vì sao `EXTERNAL-IP: <none>` của ClusterIP là điều đúng
- [ ] Giải thích được ClusterIP đứng yên trong khi endpoint thì đổi
- [ ] Nói được một hệ ba service nên có bao nhiêu Service kiểu nào

## Open questions

- Service không có Pod nào khớp `selector` thì gọi vào sẽ ra lỗi gì?
- Hai Service cùng trỏ vào một tập Pod — có được không, và để làm gì?
