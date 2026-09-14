---
title: "6.7 Volume thứ hai: kiểu hostPath"
description: Dữ liệu sống qua được cả việc xoá Pod — đổi lại nó dính chặt vào một node, và mở toang cửa sau ra máy chủ.
status: growing
created: 2026-09-11
updated: 2026-09-11
tags: [k8s, volume, hostpath, state, security]
---

> Tiếp [6.6](/blog/k8s/data-and-volumes/emptydir). Cùng một file `deployment.yaml`, chỉ
> đổi mấy dòng trong khối `volumes`.

`emptyDir` gục ở đúng một chỗ: **xoá Pod là mất**. `hostPath` chữa đúng chỗ đó — bằng
cách không cất dữ liệu trong Pod nữa, mà cất thẳng vào một thư mục **của node**.

## Đổi kiểu

```yaml
      volumes:
        - name: story-volume
          hostPath:
            path: /data/story
            type: DirectoryOrCreate
```

Khối `volumeMounts` **không đổi một chữ** — container vẫn thấy `/app/story` như cũ, không
hề biết phía sau đã đổi.

```bash
kubectl apply -f deployment.yaml && kubectl rollout status deployment story
```

```bash
curl -X POST -H 'Content-Type: application/json' -d '{"text":"song qua Pod"}' http://192.168.103.154:3000/story
```

## Bài tập 1 — Xoá Pod, thứ mà emptyDir không qua nổi

**Đoán trước:** đúng bài tập 2 của note 6.6, lần này với `hostPath`.

```bash
kubectl delete pod -l app=story
```

```bash
kubectl get pods -l app=story && curl http://192.168.103.154:3000/story
```

**Kết quả:** Pod mới, tên mới — và `{"story":"song qua Pod\n"}`. **Còn nguyên.**

Nhìn tận đĩa node là hiểu ngay vì sao:

```bash
sudo cat /data/story/text.txt
```

File nằm ở `/data/story` trên node, một đường dẫn bình thường của Linux. Pod sinh ra rồi
chết đi, thư mục đó chẳng liên quan gì — nó tồn tại trước và sau.

So với `emptyDir` nằm trong `/var/lib/kubelet/pods/<pod-uid>/...`: uid mới là thư mục mới.
Còn `/data/story` thì cố định.

## Bài tập 2 — Ba replica dùng chung một file

**Đoán trước:** scale lên 3. Với `emptyDir`, mỗi Pod có một thư mục riêng nên ba Pod ba
file khác nhau. Với `hostPath` trên cụm **một node** thì sao?

```bash
kubectl scale deployment story --replicas=3 && kubectl rollout status deployment story
```

```bash
for i in 1 2 3 4 5 6; do curl -s -o /dev/null -X POST -H 'Content-Type: application/json' -d "{\"text\":\"lan $i\"}" http://192.168.103.154:3000/story; done; curl -s http://192.168.103.154:3000/story
```

**Kết quả:** đủ cả sáu dòng, dù Service chia sáu request đó cho ba Pod khác nhau.

Ba Pod đều mount **cùng một** `/data/story` trên **cùng một** node, nên chúng thật sự
dùng chung file. Đây là điều `emptyDir` không làm được — và nghe như đã giải xong bài
toán.

Chưa đâu.

```bash
kubectl scale deployment story --replicas=1
```

## Vì sao hostPath không phải đáp án

**Nó dính chặt vào một node.** Cụm của bạn có đúng một node nên bài tập 2 trông đẹp. Thêm
node thứ hai thì:

- Pod rơi vào node B sẽ thấy `/data/story` **rỗng** — hoặc tệ hơn, thấy dữ liệu của một
  app khác tình cờ dùng trùng đường dẫn
- Ba replica nằm trên ba node là ba bản dữ liệu khác nhau, không ai đồng bộ với ai
- Node chết là dữ liệu đi theo, Pod dựng lại ở node khác cũng vô ích

Nói cách khác, `hostPath` không bền hơn `emptyDir` về bản chất — nó chỉ **đổi thứ mà dữ
liệu bám vào**, từ Pod sang node. Mà node cũng là thứ có thể chết.

**Và nó là một lỗ hổng bảo mật.** `hostPath` mount được **bất kỳ** đường dẫn nào của node:

```yaml
          hostPath:
            path: /            # cả hệ thống file của node
```

Container nào mount được `/` hoặc `/var/run/docker.sock` thì coi như có quyền trên chính
node đó — thoát ra khỏi container là chuyện vài dòng lệnh. Vì vậy cụm production thường
chặn hẳn `hostPath` bằng Pod Security Standards hoặc policy engine.

## Trường `type` để làm gì

| `type` | Nghĩa |
| --- | --- |
| `DirectoryOrCreate` | Chưa có thì tạo thư mục, quyền 0755 |
| `Directory` | **Bắt buộc** đã tồn tại, không thì Pod không lên được |
| `FileOrCreate` / `File` | Tương tự nhưng cho file |
| `Socket` | Bắt buộc là socket — dùng khi mount `docker.sock` |
| bỏ trống | Không kiểm gì cả |

Đừng bỏ trống. `Directory` mà gõ sai đường dẫn thì Pod báo lỗi ngay và bạn biết liền; bỏ
trống thì K8s im lặng tạo một thư mục rỗng ở chỗ sai, app chạy nhưng không thấy dữ liệu —
lại thêm một lỗi im lặng nữa.

## hostPath đúng việc khi nào

Nó không vô dụng, chỉ là không dùng để **lưu dữ liệu của app**:

- Agent thu thập log cần đọc `/var/log` của node
- Công cụ giám sát cần `/proc`, `/sys`
- Thứ gì đó cần `/var/run/containerd/containerd.sock`
- Lab một node, chấp nhận đánh đổi — đúng cảnh của bạn lúc này

Điểm chung: những thứ đó **vốn dĩ thuộc về node**, và đáng ra phải chạy như `DaemonSet`.

## Bảng ba mức, cập nhật

| | `emptyDir` | `hostPath` | PV/PVC |
| --- | --- | --- | --- |
| Container restart | Còn | Còn | Còn |
| Xoá Pod | **Mất** | Còn | Còn |
| Pod dời sang node khác | Mất | **Mất** | Còn |
| Node chết | Mất | **Mất** | Còn |
| Dùng chung giữa nhiều node | Không | Không | Có |
| An toàn trong production | Có | **Không** | Có |

Hai cột đầu hỏng ở hai chỗ khác nhau, và cả hai đều hỏng vì cùng một lý do gốc: **dữ liệu
bị buộc vào một thứ có thể biến mất**. Cột thứ ba cắt hẳn sợi dây đó ra — và đó là nội
dung của [note 6.9](/blog/k8s/data-and-volumes/from-volumes-to-persistent-volumes).

## Self-check

- [ ] Nói được `hostPath` hơn `emptyDir` ở chỗ nào, và hỏng ở chỗ nào
- [ ] Giải thích được vì sao ba replica dùng chung file trên cụm một node
- [ ] Nói được vì sao điều đó sụp đổ khi có node thứ hai
- [ ] Kể được một lý do bảo mật để cấm `hostPath` ở production
- [ ] Biết vì sao nên khai `type` thay vì bỏ trống

## Open questions

- Nếu `hostPath` nguy hiểm vậy, vì sao K8s vẫn giữ nó?
- Làm sao ép Pod luôn rơi đúng một node, để `hostPath` dùng được thật? (gợi ý:
  `nodeSelector`, và vì sao đó vẫn là ý tồi)
