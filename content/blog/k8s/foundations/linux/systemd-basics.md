---
title: "systemd: systemctl, journalctl"
description: Tắt control plane rồi xem workload có chết theo không — bài tập một câu trả lời nhiều thứ.
status: seed
created: 2026-08-21
updated: 2026-08-21
tags: [linux, systemd, k3s]
---

Phần này ngắn, và mục đích rất hẹp: **khi cluster có vấn đề, biết nhìn vào đâu ở tầng
dưới K8s**. `kubectl` không giúp được khi chính apiserver không lên.

## Lý thuyết vừa đủ

systemd quản lý các **unit**. Với k3s bạn chỉ cần bốn lệnh:

```bash
systemctl status k3s          # đang chạy không, PID bao nhiêu, log gần nhất
systemctl cat k3s             # đọc file unit — nó thực sự chạy lệnh gì
journalctl -u k3s -f          # bám log theo thời gian thực
journalctl -u k3s --since "10 min ago" -p err   # chỉ lấy lỗi
```

Điểm đáng chú ý về mặt khái niệm: **systemd với service cũng giống kubelet với
container**. Cả hai đều là một vòng lặp giám sát — khai báo trạng thái mong muốn, có
chính sách restart, và ghi lại lý do khi tiến trình chết. Đây chính là control loop
của [Section 1](/blog/k8s/getting-started), chỉ ở tầng thấp hơn.

```bash
systemctl show k3s -p Restart -p RestartSec
```

So sánh với `restartPolicy` của Pod — cùng một ý tưởng.

> **Chuẩn bị:** chạy trên VM có k3s. Thư mục nào cũng được. Cần `sudo`.
> **Bài tập 2 tắt cluster khoảng một phút** — đừng làm khi đang có việc dở trên đó.

## Bài tập 1 — Đọc xem k3s thật sự chạy gì

```bash
systemctl cat k3s
```

Tìm ba dòng: `ExecStart` (lệnh thật), `Restart`, và `KillMode`.

**Đoán trước:** `KillMode` đang là gì? Nó quyết định điều gì khi bạn `systemctl stop`?

Mặc định systemd giết **cả cgroup** của service — nghĩa là mọi process con cũng chết.
Hãy xem k3s có giữ mặc định đó không, vì câu trả lời quyết định bài tập tiếp theo.

## Bài tập 2 — Tắt control plane

Đây là bài tập giá trị nhất của cả note.

**Đoán trước:** `systemctl stop k3s` thì các Pod đang chạy có chết không?
`(a)` chết hết · `(b)` vẫn chạy · `(c)` tuỳ cấu hình

```bash
kubectl get pods -A --no-headers | wc -l    # đếm trước
sudo systemctl stop k3s

kubectl get nodes                            # sẽ lỗi — apiserver không còn
sudo crictl ps | head                        # nhưng container thì sao?
```

`crictl` nói chuyện thẳng với container runtime, **không qua apiserver**, nên nó vẫn
trả lời được khi K8s đã tắt. Đây là công cụ chính khi debug ở tầng node.

```bash
sudo systemctl start k3s
kubectl get pods -A
```

**Ý nghĩa:** control plane là bộ phận **ra quyết định**, không phải bộ phận **chạy
ứng dụng**. Apiserver sập thì bạn mất khả năng thay đổi cluster — không deploy được,
không scale được, controller ngừng reconcile — nhưng ứng dụng đang chạy thì vẫn phục
vụ traffic bình thường.

Hiểu điều này đổi hẳn cách bạn phản ứng khi có sự cố: *"apiserver đang down"* không
đồng nghĩa *"hệ thống đang sập"*.

## Bài tập 3 — Đọc log lúc đang có việc xảy ra

Mở hai terminal.

```bash
# terminal 1
journalctl -u k3s -f
```

```bash
# terminal 2
kubectl create deployment probe --image=nginx
kubectl delete deployment probe
```

Quan sát log ở terminal 1 khi bạn tạo và xoá. Bạn sẽ thấy dấu vết của đúng chuỗi đã
học ở [Section 1](/blog/k8s/getting-started): apiserver nhận request → scheduler
gán node → kubelet kéo image và khởi động container.

**Nối với K8s:** khi Pod kẹt ở `Pending` hoặc `ContainerCreating` mà `describe` không
nói gì rõ ràng, đây là chỗ tiếp theo để nhìn.

## Bài tập 4 — Ép một service chết và xem nó tự sống lại

```bash
systemctl show k3s -p Restart
sudo pkill -f 'k3s server'
sleep 5
systemctl status k3s | head -5
```

**Đoán trước:** sau khi bị `pkill`, k3s có tự lên lại không? Nếu có thì nhờ cái gì?

Đây đúng là hành vi mà `restartPolicy: Always` mang lại cho container — chỉ khác là ở
đây systemd đóng vai kubelet.

## Tự kiểm

- [ ] Đọc được `systemctl cat k3s` và chỉ ra lệnh thật đang chạy
- [ ] Nói được vì sao `crictl` còn dùng được khi `kubectl` đã chết
- [ ] Giải thích được vì sao apiserver sập mà app vẫn phục vụ traffic
- [ ] Lọc được log lỗi trong 10 phút gần nhất của một unit

## Câu hỏi còn mở

- k3s gộp apiserver, scheduler, controller-manager, kubelet vào **một** process. Cluster
  chuẩn tách riêng từng cái — việc gộp này giấu mất điều gì đáng học không?
- `KillMode=process` giúp gì cho k3s mà mặc định `control-group` không làm được?
- Nếu etcd (hoặc SQLite của k3s) hỏng thì mất tới mức nào? Backup ra sao?
