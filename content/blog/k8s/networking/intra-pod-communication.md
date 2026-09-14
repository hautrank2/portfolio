---
title: "7.5 Giao tiếp trong nội bộ Pod"
description: Hai container cùng Pod gọi nhau bằng localhost — và đó là hệ quả trực tiếp của network namespace.
status: growing
created: 2026-09-14
updated: 2026-09-14
tags: [k8s, pod, network, namespace]
---

> Cần hiểu Pod nhiều container ở
> [note 7.4](/blog/k8s/networking/multiple-containers-in-one-pod).

Các container trong cùng một Pod **dùng chung một network namespace**. Hệ quả: chúng thấy
nhau ở `localhost`, y như hai tiến trình trên cùng một máy.

## Bài tập — Gọi qua localhost

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
kubectl apply -f two-containers.yaml && kubectl wait --for=condition=ready pod/two-containers --timeout=60s
```

**Đoán trước:** từ container `shell`, gọi `http://localhost` — có tới được nginx ở
container `web` không? Chúng là hai container khác nhau, hai image khác nhau.

```bash
kubectl exec two-containers -c shell -- wget -qO- http://localhost | head -4
```

**Kết quả:** trang mặc định của nginx. `localhost` của container này **chính là**
`localhost` của container kia.

Xác nhận chúng dùng chung một ngăn mạng:

```bash
kubectl exec two-containers -c shell -- ip addr | grep -E "^[0-9]+:|inet "
```

```bash
kubectl exec two-containers -c web -- ip addr | grep -E "^[0-9]+:|inet "
```

Hai output **giống hệt nhau** — cùng `lo`, cùng `eth0`, cùng IP. Không phải hai máy nói
chuyện với nhau; là **một ngăn mạng, hai tiến trình**.

## Vì sao lại thế

Đây chính là network namespace ở
[note nền tảng](/blog/k8s/foundations/linux/namespaces-and-cgroups). Khi tạo Pod, runtime
dựng **một** network namespace, rồi cho mọi container trong Pod **gia nhập ngăn đó** thay
vì tạo ngăn riêng.

```
┌─ Pod — MỘT network namespace ────────────┐
│   IP 10.42.0.57                          │
│                                          │
│   ┌─ web ───────┐   ┌─ shell ────────┐   │
│   │ nginx :80   │◄──┤ wget localhost │   │
│   └─────────────┘   └────────────────┘   │
│   (hai filesystem riêng, chung mạng)     │
└──────────────────────────────────────────┘
```

Ai giữ ngăn mạng đó khi container chính restart? Một container ẩn tên `pause`, sinh ra
cùng Pod và chỉ làm đúng một việc: **tồn tại** để namespace không bị dọn. Xem nó ở tầng
node:

```bash
sudo k3s crictl pods --name two-containers
```

## Hệ quả: không ai được trùng cổng

**Đoán trước:** thêm một container nginx thứ hai vào Pod, cũng nghe cổng 80. K8s có chặn
không?

```yaml
    - name: web2
      image: nginx:1.27-alpine
      ports:
        - containerPort: 80
```

**Kết quả:** `kubectl apply` **thành công**. Nhưng một trong hai nginx sẽ chết với
`bind: address already in use` và Pod rơi vào `CrashLoopBackOff`.

Lại một lỗi im lặng nữa: `containerPort` chỉ là ghi chú, K8s **không** kiểm trùng. Nó chỉ
lộ ra lúc chạy.

```bash
kubectl logs two-containers -c web2 --previous 2>/dev/null | tail -3
```

Trong một Pod, dải cổng là **tài nguyên dùng chung**. Mỗi container phải một cổng riêng,
y như trên một máy vật lý.

## So với Docker Compose

| | Docker Compose | Pod nhiều container |
| --- | --- | --- |
| Gọi nhau bằng | **Tên service** — `http://api:3000` | **`localhost:3000`** |
| Mỗi thành phần có IP riêng | Có | **Không** — chung một IP |
| Cổng trùng nhau | Được, vì khác namespace | **Không được** |

Đây là chỗ người từ Docker Compose sang hay vấp: bê nguyên `http://api:3000` vào một Pod
hai container thì không chạy, vì trong Pod không có cái tên nào tên `api` cả — chỉ có
`localhost`.

Ngược lại, hai container ở **hai Pod khác nhau** thì lại đúng là phải gọi bằng tên — và
đó là nội dung của [note 7.7](/blog/k8s/networking/pod-to-pod-with-ip-and-env) trở đi.

## Dọn

```bash
kubectl delete pod two-containers
```

## Self-check

- [ ] Giải thích được vì sao `localhost` bắc cầu giữa hai container cùng Pod
- [ ] Nói được container `pause` để làm gì
- [ ] Biết vì sao hai container trong một Pod không được trùng cổng
- [ ] Chỉ ra khác biệt với cách Docker Compose nối các service

## Open questions

- Pod dùng chung network namespace — vậy chúng có chung `/etc/hosts` không?
- `hostNetwork: true` thì Pod dùng luôn ngăn mạng của node. Khi nào cần tới?
