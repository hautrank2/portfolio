---
title: Process, PID 1 và signal
description: Vì sao app của bạn bị giết cứng sau 30 giây thay vì tắt êm.
status: seed
created: 2026-08-21
updated: 2026-08-21
tags: [linux, process, signal]
---

Đây là note trả lời một câu hỏi rất cụ thể: **vì sao `kubectl delete pod` có lúc xong
ngay, có lúc treo đúng 30 giây rồi mới xong?**

Câu trả lời không nằm ở K8s. Nó nằm ở PID 1.

## Lý thuyết vừa đủ

Khi K8s muốn dừng một container, nó **không giết ngay**. Trình tự là:

```
SIGTERM  →  đợi terminationGracePeriodSeconds (mặc định 30s)  →  SIGKILL
```

`SIGTERM` là lời **đề nghị** — process có thể bắt lấy, đóng connection, flush log rồi
tự thoát. `SIGKILL` là **cưỡng chế** — kernel giết ngay, không process nào chặn được.

Và đây là điều then chốt: **PID 1 được kernel đối xử đặc biệt.**

> Với một process mang PID 1 trong PID namespace, kernel **chỉ chuyển signal nào mà
> process đó đã cài handler**. Không cài handler cho `SIGTERM` thì signal bị bỏ qua
> hoàn toàn — kể cả khi hành vi mặc định của signal đó là "chết".

Process thường thì ngược lại: không cài handler thì nhận hành vi mặc định, `SIGTERM`
là thoát.

> **Chuẩn bị:** cần `docker` trên VM (k3s không kèm sẵn — xem
> [ghi chú môi trường](/blog/k8s/foundations/linux)). Thư mục nào cũng được; bài 3 ghi
> file vào `/tmp` bằng đường dẫn tuyệt đối.

## Bài tập 1 — Bắt quả tang container phớt lờ SIGTERM

**Đoán trước:** lệnh `docker stop` dưới đây mất bao lâu?
`(a)` tức thì · `(b)` khoảng 10 giây · `(c)` treo mãi

```bash
docker run -d --name t1 alpine sh -c 'while true; do sleep 1; done'
time docker stop t1
```

**Kết quả:** khoảng **10 giây** (timeout mặc định của `docker stop`).

**Vì sao:** `sh` là PID 1 và không cài handler cho `SIGTERM` → signal bị kernel bỏ
qua. Docker đợi hết hạn rồi gửi `SIGKILL`.

Xem nó chết bằng cách nào:

```bash
docker inspect -f '{{.State.ExitCode}}' t1
```

```
137
```

**137 ở đâu ra?** Quy ước: process bị signal giết thì exit code là `128 + số signal`.
`SIGKILL` là signal số 9 → `128 + 9 = 137`. Tương tự `SIGTERM` số 15 → `143`.

**Nối với K8s:** con số `137` này chính là thứ bạn thấy trong `kubectl describe pod`
khi container bị `OOMKilled` — vì OOM killer cũng dùng `SIGKILL`. Nhìn thấy 137 thì
biết ngay: **có ai đó đã SIGKILL nó**, còn ai thì phải đọc `Reason`.

## Bài tập 2 — `exec` có sửa được không?

Lời khuyên hay gặp là "dùng `exec` để app thành PID 1".

**Đoán trước:** lệnh này `docker stop` mất bao lâu?

```bash
docker run -d --name t2 alpine sh -c 'exec sleep 1000'
time docker stop t2
```

**Kết quả:** vẫn **10 giây**.

**Vì sao:** `exec` đúng là làm `sleep` thành PID 1 — nhưng `sleep` cũng **không cài
handler** cho `SIGTERM`. Vẫn là PID 1 không handler, vẫn bị bỏ qua.

Đây là chỗ tôi từng hiểu sai. `exec` giải quyết vấn đề **signal không được chuyển
tiếp xuống con**, chứ không tự làm process biết tắt êm. Muốn tắt êm thì **bản thân
chương trình phải xử lý `SIGTERM`**.

## Bài tập 3 — Sửa cho đúng

```bash
cat > /tmp/app.sh <<'EOF'
#!/bin/sh
trap 'echo "nhận SIGTERM, đang dọn dẹp..."; exit 0' TERM
echo "đang chạy, PID=$$"
sleep 1000 &
wait
EOF
chmod +x /tmp/app.sh

docker run -d --name t3 -v /tmp/app.sh:/app.sh alpine /app.sh
time docker stop t3
docker logs t3
```

**Kết quả:** dừng **gần như tức thì**, và log in ra `nhận SIGTERM, đang dọn dẹp...`

**Chú ý `sleep 1000 & wait`** — không phải `sleep 1000` trần. Shell chỉ chạy `trap`
sau khi lệnh đang chạy kết thúc; `sleep` trần sẽ chặn trap suốt 1000 giây. Đẩy xuống
nền rồi `wait` thì trap chạy được ngay. Đây là bẫy kinh điển của entrypoint script.

**Nối với K8s:**

- Không xử lý `SIGTERM` → mỗi lần rolling update, Pod cũ **treo đủ 30 giây** rồi bị
  `SIGKILL`, request đang dở bị cắt giữa chừng
- Với **NestJS** phải gọi `app.enableShutdownHooks()`
- Với **.NET** generic host xử lý sẵn, timeout mặc định cũng 30s nên khớp
- Cần thêm thời gian thì tăng `terminationGracePeriodSeconds` trong Pod spec

## Bài tập 4 — Zombie và chuyện dọn xác

**Đoán trước:** process con chết mà cha không `wait()` thì nó biến mất, hay còn lại
cái gì?

```bash
docker run --rm alpine sh -c '
  sh -c "sleep 0.1 & exit" &
  sleep 1
  ps -eo pid,ppid,stat,comm
'
```

Tìm dòng có `STAT` là **`Z`** — đó là **zombie**: process đã chết nhưng entry vẫn nằm
trong bảng process vì chưa ai đọc exit code của nó.

**Vì sao:** khi cha chết trước, con mồ côi được **PID 1 nhận nuôi**. Init thật (systemd)
có nhiệm vụ `wait()` để dọn. Nhưng `sh` làm PID 1 trong container thì **không làm việc
đó** — zombie tích lại, và bảng PID có giới hạn.

**Nối với K8s:** đây là lý do nhiều image dùng `tini` hoặc `dumb-init` làm entrypoint,
và là lý do K8s có `shareProcessNamespace` — khi bật, K8s chèn một pause container làm
PID 1 biết dọn xác cho cả Pod.

## Self-check

- [ ] Giải thích được vì sao `sh -c 'sleep 1000'` không chết khi nhận `SIGTERM`
- [ ] Tính nhẩm được exit code khi biết signal, và ngược lại
- [ ] Viết được entrypoint script tắt êm, và nói được vì sao cần `& wait`
- [ ] Phân biệt được `SIGTERM` và `SIGKILL` **về mặt ai kiểm soát được**

## Open questions

- `preStop` hook của K8s chạy **trước** `SIGTERM` — dùng nó để làm gì mà `SIGTERM`
  không làm được?
- Vì sao nhiều hướng dẫn khuyên `preStop: sleep 5`? Liên quan gì tới độ trễ cập nhật
  EndpointSlice?
- `tini` và `dumb-init` khác nhau ở điểm nào đáng kể?
