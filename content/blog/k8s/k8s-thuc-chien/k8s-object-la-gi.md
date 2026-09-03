---
title: "5.3 Hiểu về Kubernetes Object (Resource)"
description: Mọi thứ trong cluster đều là một bản ghi cùng khuôn — bốn trường, và ranh giới giữa spec và status.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, architecture]
---

Trước khi tạo bất cứ thứ gì, cần đóng đinh một chuyện: trong K8s **không có "lệnh"**,
chỉ có **object**. Bạn không bảo cluster làm gì; bạn tạo ra một bản ghi mô tả điều
mình muốn, rồi có ai đó đọc nó.

## Mọi object cùng một khuôn

```yaml
apiVersion: apps/v1        # nhóm API + phiên bản
kind: Deployment           # loại object
metadata:                  # tên, namespace, label, annotation
  name: first-app
spec:                      # ĐIỀU BẠN MUỐN   <- bạn viết
  replicas: 3
status:                    # ĐIỀU ĐANG LÀ    <- cluster viết, đừng đụng
  readyReplicas: 2
```

Bốn trường trên, Pod cũng thế, Service cũng thế, Node cũng thế. Học một khuôn dùng cho
tất cả.

Ranh giới **`spec` / `status`** là chỗ đáng nhớ nhất:

| | Ai viết | Nghĩa |
| --- | --- | --- |
| `spec` | **Bạn** | Trạng thái mong muốn |
| `status` | **Controller** | Trạng thái thực tế, cập nhật liên tục |

Toàn bộ K8s chỉ là một đám vòng lặp đọc `spec`, nhìn `status`, và làm cho hai bên bằng
nhau — đúng vòng lặp reconcile ở
[Cluster là gì](/blog/k8s/bat-dau-voi-k8s/cluster-la-gi).

## "Object" hay "resource"?

Hai chữ hay dùng lẫn, và phân biệt được thì đọc tài liệu dễ hơn hẳn:

- **Resource** — cái tên trong API: `pods`, `deployments`. Là một *loại*.
- **Object** — một thể hiện cụ thể: Pod tên `first-app-7d9f-abcde`.

`kubectl get pods` = "liệt kê các object thuộc resource `pods`".

## Bài tập 1 — Cluster trống có bao nhiêu loại object

**Đoán trước:** một cluster chưa cài gì thêm biết bao nhiêu loại resource? 10, 30, hay
trên 50?

```bash
kubectl api-resources | wc -l
kubectl api-resources | head -20
```

**Kết quả:** thường **trên 50**, và đó mới là cluster trống. Cột `SHORTNAMES` giải
thích vì sao gõ được `kubectl get po`, `kubectl get deploy`, `kubectl get svc` — chúng
không phải mẹo của kubectl, chúng do **chính API server khai báo**.

Cột `APIVERSION` cho thấy resource nằm rải ở nhiều nhóm: `pods` ở nhóm lõi (`v1`),
`deployments` ở `apps/v1`, `ingresses` ở `networking.k8s.io/v1`. Đó là lý do dòng
`apiVersion` trong YAML lúc thì `v1` lúc thì có gạch chéo.

## Bài tập 2 — Nhìn thấy spec và status tách đôi

```bash
kubectl get node -o yaml | head -40
```

**Đoán trước:** Node là máy thật, bạn đâu có "khai báo" nó. Vậy `spec` của một Node có
gì?

**Kết quả:** `spec` gần như rỗng (vài dòng như `podCIDR`), còn `status` thì dài dằng
dặc — dung lượng RAM, số CPU, phiên bản kernel, danh sách điều kiện `Ready`,
`MemoryPressure`, `DiskPressure`.

Đúng như dự đoán được từ bảng trên: Node là thứ **bạn không mong muốn gì cả**, chỉ có
kubelet báo cáo về. Ngược hẳn với Deployment, nơi `spec` là tất cả những gì bạn viết.

## Tự kiểm

- [ ] Kể được bốn trường có mặt trong mọi object
- [ ] Nói được ai viết `spec`, ai viết `status`, và vì sao đừng sửa `status`
- [ ] Phân biệt được resource và object
- [ ] Biết tra `apiVersion` đúng cho một loại object mà không cần Google

## Câu hỏi còn mở

- CRD thêm resource mới vào `api-resources` — vậy ai viết `status` cho chúng?
- Có object nào không có `status` không?
