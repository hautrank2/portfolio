---
title: "5.21 Thêm về Label & Selector"
description: matchExpressions, và một trường bạn sẽ không bao giờ sửa được sau khi tạo.
status: growing
created: 2026-08-25
updated: 2026-09-05
tags: [k8s, label, yaml]
---

> **Nối tiếp [note 5.20](/blog/k8s/k8s-thuc-chien/nhieu-file-hay-mot-file).** File nằm
> trong thư mục `k8s/`, apply bằng `kubectl apply -f k8s/`.

[Note 5.17](/blog/k8s/k8s-thuc-chien/label-va-selector) dùng label ở mức `key=value`. Còn
một dạng nữa, và một cái bẫy đáng biết **trước khi** dính.

## `matchExpressions` — điều kiện phức tạp hơn

```yaml
spec:
  selector:
    matchLabels:
      app: second-app
    matchExpressions:
      - key: tier
        operator: In
        values: [backend, worker]
      - key: deprecated
        operator: DoesNotExist
```

Bốn toán tử: `In`, `NotIn`, `Exists`, `DoesNotExist`. Mọi điều kiện — kể cả `matchLabels`
— đều ghép bằng **AND**. Không có OR giữa các mục; muốn OR thì nhét vào `values` của cùng
một `In`.

Hai toán tử `Exists` / `DoesNotExist` không cần `values`, và rất hợp cho nhãn dùng làm cờ:

```bash
kubectl get pods -l 'canary'
```

```bash
kubectl get pods -l '!canary'
```

Dạng này chỉ dùng được ở **selector của Deployment/ReplicaSet**, không dùng được ở
`spec.selector` của Service — Service vẫn chỉ nhận map phẳng. Đó là dấu vết tuổi tác của
API, giống chuyện `v1` vs `apps/v1` ở [note 5.18](/blog/k8s/k8s-thuc-chien/viet-file-service).

## Bài tập 1 — Trường không bao giờ sửa được

**Đoán trước:** Deployment đang chạy với selector hai nhãn. Giờ bạn thấy `tier` là thừa và
muốn bỏ nó khỏi `matchLabels`. Apply sẽ rolling update sang selector mới, hay báo lỗi?

```bash
sed '/^      tier: backend$/d' k8s/deployment.yaml | kubectl apply -f - 2>&1 | tail -4
```

**Kết quả:** bị chặn thẳng.

```
The Deployment "second-app-deployment" is invalid: spec.selector: Invalid value:
... field is immutable
```

`spec.selector` của Deployment là **bất biến** kể từ `apps/v1`.

Lý do rất thực tế: đổi selector nghĩa là Deployment lập tức mất dấu toàn bộ Pod hiện có —
chúng thành mồ côi như ở bài tập 5.17, còn nó thì đẻ một lứa mới. Bạn sẽ có gấp đôi số
Pod, một nửa không ai quản. Cấm hẳn an toàn hơn là cho phép rồi để người ta tự bắn vào
chân.

Để ý phép so ở [note 5.15](/blog/k8s/k8s-thuc-chien/viet-file-deployment) vẫn đúng, chỉ
là bây giờ nó bị chặn sớm hơn một bước: **thêm** nhãn vào `template.labels` thì được, còn
động vào `selector` thì không, kể cả khi hai bên vẫn khớp nhau sau khi đổi.

**Cách duy nhất** là xoá và tạo lại — tức có downtime — trừ khi bạn dựng Deployment mới
song song rồi chuyển Service sang. Service thì **không** bất biến, và đó chính là thứ cứu
bạn:

```bash
kubectl explain service.spec.selector | head -5
```

**Vì sao quan trọng:** đây là lý do đáng bỏ ra ba mươi giây nghĩ về bộ nhãn **ngay lần
đầu**. Gần như mọi thứ trong K8s sửa được lúc chạy; cái này thì không.

## Bài tập 2 — Selector Service bắt nhầm Pod của app khác

[Note 5.18](/blog/k8s/k8s-thuc-chien/viet-file-service) đã cho thấy một Pod trần lọt vào
Service. Lần này nặng hơn: **một app hoàn toàn khác** lọt vào.

**Đoán trước:** dựng một Deployment thứ hai, khác app, nhưng vô tình cũng đặt nhãn
`app: second-app`. Service `backend` phản ứng thế nào?

```bash
cat > /tmp/app-khac.yaml <<'EOY'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-khac
spec:
  replicas: 2
  selector:
    matchLabels:
      app: second-app
      tier: worker
  template:
    metadata:
      labels:
        app: second-app
        tier: worker
    spec:
      containers:
        - name: web
          image: nginx:1.27-alpine
EOY
kubectl apply -f /tmp/app-khac.yaml
```

```bash
kubectl get pods -L app,tier
```

```bash
kubectl get endpointslice -l kubernetes.io/service-name=backend -o jsonpath='{.items[0].endpoints[*].addresses}{"\n"}'
```

**Kết quả:** phụ thuộc vào việc bạn đã sửa selector của Service ở note 5.18 hay chưa.

| Selector của Service | Endpoint | Hậu quả |
| --- | --- | --- |
| `app: second-app` (bản gốc trong file mẫu) | 3 địa chỉ | Một phần request rơi vào **nginx**, trả về trang mặc định thay vì app Node |
| `app: second-app` + `tier: backend` (đã sửa) | 1 địa chỉ | Không sao |

Nếu đang ở dòng đầu, gọi thử vài lần sẽ thấy nội dung **nhảy qua lại** giữa hai app:

```bash
for i in 1 2 3 4 5 6; do curl -s http://192.168.103.154:8081 | grep -o '<h1>[^<]*' ; done
```

Hai Deployment hoàn toàn khoẻ mạnh. Service hoàn toàn khoẻ mạnh. `kubectl get all` xanh
hết. Chỉ có kết quả là sai, và sai không đều — nên log lỗi cũng ngắt quãng, khó lần.

Đây là loại sự cố tệ nhất trong K8s: **mọi thứ xanh, chỉ có câu trả lời là sai.**

Dọn:

```bash
kubectl delete -f /tmp/app-khac.yaml && rm /tmp/app-khac.yaml
```

## Hai loại nhãn, đừng trộn vai

Rút ra từ hai bài trên:

| Loại | Ví dụ | Dùng để | Đổi được không |
| --- | --- | --- | --- |
| **Nhãn định danh** | `app`, `tier` trong selector | Ghép Service ↔ Pod, Deployment ↔ Pod | Gần như không — selector bất biến |
| **Nhãn mô tả** | `env`, `version`, `team`, `owner` | Lọc khi xem, gom hoá đơn, gắn policy | Thoải mái |

Quy tắc: **selector phải đủ hẹp để chỉ định danh đúng một workload.** Nhãn mô tả chung
(`tier`, `env`) hợp để *lọc khi xem*, không hợp để *ghép nối* — trừ khi bạn ghép cả cụm
nhãn đủ hẹp như `app` + `tier`.

Và vì selector bất biến, chọn sai ở đây là chọn sai vĩnh viễn. Đó là lý do bộ nhãn
`app.kubernetes.io/*` ở note 5.17 có tận hai trường cho việc định danh: `name` cho *loại
app*, `instance` cho *lần triển khai cụ thể*.

## Tự kiểm

- [ ] Viết được `matchExpressions` với bốn toán tử
- [ ] Biết `matchExpressions` không dùng được cho Service, và vì sao
- [ ] Nhớ rằng `spec.selector` của Deployment bất biến, và nói được hậu quả nếu nó không
- [ ] Phân biệt được nhãn định danh và nhãn mô tả
- [ ] Nhận ra triệu chứng "mọi thứ xanh, nội dung sai" là lỗi selector quá rộng

## Câu hỏi còn mở

- `selector` của Service không bất biến — vì sao nó được phép mà Deployment thì không?
- Đổi nhãn trong `template.metadata.labels` mà giữ nguyên selector thì sao?
- Hai Deployment cùng selector y hệt nhau thì chuyện gì xảy ra?
