---
title: "5.13 Rollback & lịch sử revision"
description: Vì sao quay lại bản cũ chỉ mất vài giây, và vì sao cột CHANGE-CAUSE của bạn luôn rỗng.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, deployment, rollout]
---

Note trước cho thấy ReplicaSet cũ tụt về 0 nhưng **không bị xoá**. Đó chính là cơ chế
rollback: bản cũ vẫn nằm đó, chỉ việc nâng lại.

```bash
kubectl get rs -l app=first-app
```

```
NAME                   DESIRED   CURRENT   READY   AGE
first-app-6d4f8b9c7d   3         3         3       5m    <- 1.28
first-app-5c9d8b7f4d   0         0         0       28m   <- 1.27, giữ lại
```

Nên rollback **không phải deploy lại**. Không kéo image, không build gì. Chỉ là đổi hai
con số — vì thế nó tính bằng giây.

## Lịch sử

```bash
kubectl rollout history deployment/first-app
```

```
REVISION  CHANGE-CAUSE
1         <none>
2         <none>
```

Số revision giữ lại mặc định là **10** (`revisionHistoryLimit`). Quá đó thì ReplicaSet
cũ nhất bị dọn, và revision đó hết quay về được.

## Bài tập 1 — Vì sao CHANGE-CAUSE luôn rỗng

**Đoán trước:** cột đó tự điền từ lệnh bạn đã gõ, hay phải khai bằng tay?

```bash
kubectl annotate deployment/first-app kubernetes.io/change-cause="len 1.29 vi ban va CVE" --overwrite
kubectl set image deployment/first-app first-app=nginx:1.29-alpine
kubectl rollout history deployment/first-app
```

**Kết quả:** revision mới có chú thích, các revision cũ vẫn `<none>`.

Cột này đọc từ annotation `kubernetes.io/change-cause`, **không** tự sinh. Cờ `--record`
ngày xưa làm việc đó đã bị bỏ. Nghĩa là ở một cluster thật, lịch sử rollout gần như luôn
là một cột rỗng vô dụng — trừ khi pipeline của bạn chủ động ghi vào.

## Bài tập 2 — Rollout kẹt vì image không tồn tại

Đây là bài tập mà [index của module](/blog/k8s/k8s-thuc-chien) có nhắc.

**Đoán trước:** đẩy một image chắc chắn không tồn tại. Dịch vụ **chết**, hay vẫn phục vụ
bình thường?

```bash
kubectl set image deployment/first-app first-app=khong-ton-tai:v9
kubectl get pods -l app=first-app
```

**Kết quả:** dịch vụ **vẫn chạy nguyên**.

```
NAME                         READY   STATUS             RESTARTS   AGE
first-app-6d4f8b9c7d-c7wnp   1/1     Running            0          9m
first-app-6d4f8b9c7d-m4kt2   1/1     Running            0          9m
first-app-7b5c9d8f21-p9x3k   0/1     ImagePullBackOff   0          25s
```

Rollout đứng im giữa chừng. Đây là `maxUnavailable` đang làm việc: Deployment **không
được phép** hạ Pod cũ xuống khi Pod mới chưa `Ready`. Một Pod mới hỏng thì nó dừng lại
và chờ — mãi mãi.

Xác nhận:

```bash
kubectl rollout status deployment/first-app --timeout=20s
```

Trả về `error: timed out`. Chính dòng này là thứ nên đặt trong CI: rollout hỏng thì
pipeline đỏ, thay vì báo thành công rồi để đó.

Sửa:

```bash
kubectl rollout undo deployment/first-app && kubectl rollout status deployment/first-app
```

**Vì sao quan trọng:** rút ra được hai điều trái trực giác. Một deploy hỏng ở K8s
**không làm sập dịch vụ** — nó chỉ không tiến lên. Và vì `kubectl set image` trả về
`updated` ngay lập tức, một pipeline không kiểm `rollout status` sẽ báo xanh trong khi
thực tế chẳng có gì được triển khai.

## Quay về một revision cụ thể

```bash
kubectl rollout undo deployment/first-app --to-revision=1
```

## Tự kiểm

- [ ] Giải thích được vì sao rollback chỉ mất vài giây
- [ ] Nói được vì sao `CHANGE-CAUSE` rỗng và cách làm nó có nội dung
- [ ] Giải thích được vì sao image sai không làm sập dịch vụ đang chạy
- [ ] Biết lệnh nào phải có trong CI để không báo xanh giả

## Câu hỏi còn mở

- `revisionHistoryLimit: 0` thì mất gì?
- Rollback một Deployment có kéo theo ConfigMap về bản cũ không?
