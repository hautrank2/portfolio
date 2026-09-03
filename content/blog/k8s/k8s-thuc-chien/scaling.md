---
title: "5.11 Scaling trong thực tế"
description: Một con số đổi, và cân tải hiện ra — nhìn tận mắt bằng tên Pod trả lời từng request.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, deployment, scaling]
---

Scale trong K8s là **sửa một con số**. Không ssh, không thêm máy, không sửa gì ở app.

```bash
kubectl scale deployment first-app --replicas=3
kubectl get pods -l app=first-app
```

Cái thật sự xảy ra: `spec.replicas` từ 1 thành 3 → ReplicaSet đếm được 1 → tạo thêm 2.
Vẫn đúng một vòng lặp reconcile, không có cơ chế mới nào.

## Bài tập 1 — Ai đang trả lời request

**Đoán trước:** ba Pod cùng đứng sau một Service. Gọi Service mười lần — cùng một Pod
trả lời cả mười, hay chia đều?

Đánh dấu từng Pod bằng chính hostname của nó:

```bash
for p in $(kubectl get pods -l app=first-app -o name); do kubectl exec $p -- sh -c 'echo $HOSTNAME > /usr/share/nginx/html/index.html'; done
```

```bash
PORT=$(kubectl get svc first-app -o jsonpath='{.spec.ports[0].nodePort}') && for i in $(seq 10); do curl -s localhost:$PORT; done | sort | uniq -c
```

**Kết quả:** cả ba tên đều xuất hiện, xấp xỉ chia đều:

```
      4 first-app-5c9d8b7f4d-c7wnp
      3 first-app-5c9d8b7f4d-m4kt2
      3 first-app-5c9d8b7f4d-x8k2p
```

Hai điều rơi ra từ đây:

- **`$HOSTNAME` trong container chính là tên Pod.** Đó là cách rẻ nhất để một app biết
  mình là bản sao nào — không cần API nào cả.
- Cân tải là **ngẫu nhiên theo kết nối**, không phải luân phiên tăm tắp. iptables chọn
  bằng xác suất, nên gọi 10 lần khó ra đúng 3-3-4.

## Bài tập 2 — Thứ vừa ghi sẽ biến mất

**Đoán trước:** xoá một Pod đi. Pod mới lên có giữ file `index.html` bạn vừa ghi không?

```bash
kubectl delete pod -l app=first-app --field-selector status.phase=Running --wait=false 2>/dev/null; sleep 8; curl -s localhost:$PORT
```

**Kết quả:** trang nginx mặc định quay lại. File bạn ghi **mất sạch**.

Vì filesystem của container nằm trong lớp ghi của nó, và lớp đó chết cùng container —
đúng chuyện đã dựng ở
[image và layer](/blog/k8s/nen-tang/container/image-va-layer). Đây chính là bài toán mà
cả Section 3 (Volume) sinh ra để giải.

## Bài tập 3 — Scale về 0

**Đoán trước:** `--replicas=0` thì Deployment biến mất, hay còn lại cái vỏ?

```bash
kubectl scale deployment first-app --replicas=0 && kubectl get deploy,pods -l app=first-app
```

**Kết quả:** Deployment còn nguyên, `READY 0/0`, không Pod nào. Service vẫn tồn tại
nhưng **danh sách endpoint rỗng** — gọi vào sẽ bị từ chối kết nối ngay lập tức, không
phải chờ timeout.

Đó là cách tắt tạm một dịch vụ mà giữ nguyên toàn bộ cấu hình. Trả về:

```bash
kubectl scale deployment first-app --replicas=3
```

## Vì sao `kubectl scale` không phải cách làm ở production

Nó sửa trực tiếp trạng thái sống. Lần `kubectl apply` tiếp theo từ file YAML ghi
`replicas: 1` sẽ **kéo ngược về 1** — và không ai hiểu vì sao dịch vụ tự thu nhỏ lúc nửa
đêm. Chuyện này là trọng tâm của note
[Imperative vs Declarative](/blog/k8s/k8s-thuc-chien/imperative-vs-declarative).

## Tự kiểm

- [ ] Nói được chuyện gì thật sự xảy ra khi `kubectl scale`
- [ ] Biết `$HOSTNAME` trong container là gì
- [ ] Giải thích được vì sao cân tải không chia đều tăm tắp
- [ ] Nói được `--replicas=0` khác `kubectl delete` chỗ nào

## Câu hỏi còn mở

- HPA tự chỉnh `replicas` — vậy nó có xung đột với `apply` từ file không?
- Ba Pod nằm cùng một node thì scale còn ý nghĩa gì?
