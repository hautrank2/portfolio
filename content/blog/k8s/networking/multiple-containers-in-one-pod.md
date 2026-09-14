---
title: "7.4 Nhiều container trong một Pod"
description: Pod chứa được nhiều container — nhưng câu hỏi đúng không phải "có được không" mà "khi nào nên".
status: growing
created: 2026-09-14
updated: 2026-09-14
tags: [k8s, pod, sidecar, network]
---

Tới giờ mọi Pod bạn dựng đều có đúng **một** container, tới mức dễ tưởng Pod và container
là một. Không phải.

## Pod chia sẻ gì, không chia sẻ gì

| Chia sẻ | Không chia sẻ |
| --- | --- |
| **Network namespace** — cùng IP, cùng dải cổng, gọi nhau qua `localhost` | **Hệ thống file** — mỗi container một image, một lớp ghi riêng |
| **Volume** đã khai, nếu cùng mount | Tiến trình — mỗi container một PID 1 riêng |
| Vòng đời — sinh cùng, chết cùng, dời node cùng | Biến môi trường, `resources` |

Dòng đầu là dòng quan trọng nhất và là chủ đề của
[note sau](/blog/k8s/networking/intra-pod-communication).

## Bài tập — Dựng một Pod hai container

`two-containers.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: two-containers
spec:
  containers:
    - name: web
      image: nginx:1.27-alpine
      ports:
        - containerPort: 80
    - name: shell
      image: busybox:1.36
      command: ["sh", "-c", "sleep 3600"]
```

```bash
kubectl apply -f two-containers.yaml && kubectl get pod two-containers
```

```
NAME             READY   STATUS    RESTARTS   AGE
two-containers   1/1     Running   0          5s
```

**Đoán trước:** cột `READY` sẽ là `1/1` hay `2/2`?

Đợi vài giây rồi xem lại — nó là **`2/2`**. Cột đó đọc là *"số container sẵn sàng / tổng
số container"*, không phải số Pod. Từ giờ nhìn `READY 1/2` là biết ngay: Pod có hai
container và một cái đang hỏng.

Một IP duy nhất cho cả hai:

```bash
kubectl get pod two-containers -o jsonpath='{.status.podIP}{"\n"}'
```

Muốn thao tác với container nào thì phải chỉ rõ bằng `-c`:

```bash
kubectl exec two-containers -c shell -- hostname
```

```bash
kubectl logs two-containers -c web --tail=5
```

Bỏ `-c` khi Pod có nhiều container thì `kubectl` sẽ chọn cái đầu tiên và **in một cảnh
báo** — dễ bỏ sót, và bạn sẽ ngồi đọc log nhầm container.

## Khi nào nên, khi nào không

Câu hỏi không phải *"làm được không"* mà *"hai thứ này có thật sự là một đơn vị không"*.

**Nên chung một Pod:**

| Mẫu | Ví dụ |
| --- | --- |
| **Sidecar** | Agent gom log đọc chung volume với app |
| **Ambassador** | Proxy đứng trước, app chỉ gọi `localhost` |
| **Adapter** | Container chuyển định dạng metric cho hệ giám sát |
| **Init** | Chạy xong rồi tắt, chuẩn bị dữ liệu cho container chính |

Điểm chung: cái phụ **không có ý nghĩa gì nếu đứng một mình**, và luôn cần scale y hệt
cái chính.

**Không nên chung một Pod:**

- Hai API riêng biệt — chúng cần scale độc lập
- Frontend và backend — số lượng và nhịp deploy khác nhau
- App và database — database gần như không bao giờ nên nằm trong Pod của app

Phép thử gọn: **"tôi có muốn scale hai thứ này với số lượng khác nhau không?"** Có → hai
Deployment. Không → cân nhắc chung Pod.

## Cái giá phải trả

| | |
| --- | --- |
| Scale chung | Cần 10 bản app là có 10 bản sidecar, dù sidecar rảnh |
| Chết chung | Container phụ crash liên tục kéo cả Pod vào `CrashLoopBackOff` |
| Cổng phải khác nhau | Cùng network namespace nên không ai được trùng cổng |
| Deploy chung | Sửa sidecar là rollout cả app |

Vì vậy mặc định vẫn nên là **một container một Pod**. Nhiều container là ngoại lệ có lý
do, không phải cách làm thông thường.

## Dọn

```bash
kubectl delete pod two-containers
```

## Self-check

- [ ] Kể được cái gì chia sẻ và cái gì không giữa các container trong một Pod
- [ ] Đọc đúng cột `READY 2/2`
- [ ] Nhớ dùng `-c` với `logs` và `exec`
- [ ] Dùng được phép thử "có muốn scale khác nhau không" để quyết định
- [ ] Kể ít nhất hai cái giá của việc gộp container

## Open questions

- `initContainers` khác container thường ở chỗ nào, và chạy lúc nào?
- Một container trong Pod chết hẳn — Pod có bị coi là chết không?
