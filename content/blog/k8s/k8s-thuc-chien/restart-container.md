---
title: "Container restart lúc nào"
description: Ai bấm nút restart, backoff tăng theo cấp số nhân, và vì sao Pod không bao giờ "restart".
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, kubelet, troubleshooting]
---

Câu hỏi nghe đơn giản nhưng trả lời sai thì debug sai suốt: **ai** khởi động lại
container, và **khi nào**.

## Không phải control plane

kubelet trên chính node đó làm việc này, theo `restartPolicy` ghi trong Pod spec:

| `restartPolicy` | Nghĩa | Mặc định của |
| --- | --- | --- |
| `Always` | Thoát kiểu gì cũng khởi động lại | Deployment |
| `OnFailure` | Chỉ khi exit code ≠ 0 | Job |
| `Never` | Không bao giờ | — |

Điểm dễ nhầm nhất: **Pod không bao giờ được restart.** Chỉ **container bên trong** nó
được chạy lại, còn Pod vẫn là Pod cũ — cùng tên, cùng IP. Cột `RESTARTS` đếm số lần
container chạy lại, không phải số Pod mới.

Đó là lý do `RESTARTS: 47` mà `AGE: 2d` hoàn toàn hợp lý.

## Bài tập — Xem backoff giãn ra

**Đoán trước:** một container thoát ngay sau 5 giây, lặp mãi. kubelet chạy lại **ngay
lập tức** mỗi lần, hay chờ lâu dần?

```bash
kubectl create deployment hay-chet --image=busybox:1.36 -- sh -c 'sleep 5; exit 1'
kubectl get pods -l app=hay-chet -w
```

Để chạy khoảng ba phút rồi Ctrl-C.

**Kết quả:** vài lần đầu chạy lại gần như tức thì, sau đó chậm dần và Pod chuyển sang
`CrashLoopBackOff`:

```
NAME                        READY   STATUS             RESTARTS   AGE
hay-chet-7f8c9d5b4-nm2xq    0/1     CrashLoopBackOff   4          2m13s
```

kubelet chờ **10s → 20s → 40s → 80s…**, gấp đôi mỗi lần, **chặn trên 5 phút**. Bộ đếm
chỉ được reset khi container sống liên tục đủ 10 phút.

Xem lý do thoát:

```bash
kubectl describe pod -l app=hay-chet | grep -A6 "Last State"
```

`Reason: Error`, `Exit Code: 1` — đúng cái container tự làm.

Dọn:

```bash
kubectl delete deployment hay-chet
```

## `CrashLoopBackOff` không phải một lỗi

Đây là chỗ đọc sai nhiều nhất. Nó **không** nói app bị lỗi gì. Nó chỉ nói *"tôi đang
chờ trước khi thử lại"*. Nguyên nhân thật luôn nằm ở chỗ khác:

```bash
kubectl logs <pod> --previous
```

Cờ `--previous` là thứ đáng nhớ nhất của cả note này: nó lấy log của **lần chạy trước**,
tức lần vừa chết. Không có nó thì bạn đang đọc log của container mới vừa dựng, thường
rỗng không.

## Ba nguyên nhân thường gặp

| Triệu chứng | Thường là |
| --- | --- |
| Exit code 1 ngay lập tức | App lỗi cấu hình, thiếu biến môi trường |
| Exit code 0 rồi vẫn restart | Tiến trình chính chạy xong rồi thoát — sai `command` |
| Exit code 137 | Bị `SIGKILL` — hết bộ nhớ (OOMKilled) |

137 = 128 + 9. Cùng quy ước exit code của shell ở
[process và signal](/blog/k8s/nen-tang/linux/process-va-signal).

## Tự kiểm

- [ ] Nói được ai restart container, và theo trường nào trong spec
- [ ] Giải thích được vì sao Pod không bao giờ restart
- [ ] Nhớ dãy backoff và mức chặn trên
- [ ] Phản xạ dùng `logs --previous` khi gặp CrashLoopBackOff
- [ ] Dịch được exit code 137

## Câu hỏi còn mở

- `restartPolicy: Never` trong Deployment thì sao? (gợi ý: apply thử đi)
- Container bị restart thì file nó ghi ra có còn không?
