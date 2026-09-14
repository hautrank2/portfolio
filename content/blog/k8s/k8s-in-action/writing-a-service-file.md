---
title: "5.18 Viết Service bằng YAML"
description: Ba con số cổng, LoadBalancer trên k3s, và một selector rộng hơn nó tưởng.
status: growing
created: 2026-08-25
updated: 2026-09-05
tags: [k8s, yaml, service, k3s]
---

> **Nối tiếp [note 5.17](/blog/k8s/k8s-in-action/labels-and-selectors).** Đang có
> `second-app-deployment` 1 replica và Pod trần `ke-la` — Pod này sắp có vai diễn.

Nốt nửa còn lại: phơi app ra bằng file, không dùng `kubectl expose`.

## File

```yaml
apiVersion: v1               # Service ở nhóm lõi, KHÔNG phải apps/v1
kind: Service
metadata:
  name: backend
spec:
  selector:                  # phẳng, không có matchLabels như Deployment
    app: second-app
  ports:
    - protocol: 'TCP'
      port: 80               # cổng của chính Service
      targetPort: 8080       # cổng container đang nghe
  type: LoadBalancer
```

Ngắn hơn Deployment nhiều, nhưng có hai chỗ trực giác đánh lừa:

| | Deployment | Service |
| --- | --- | --- |
| `apiVersion` | `apps/v1` | `v1` |
| Selector | `selector.matchLabels.app` | `selector.app` — phẳng hơn một tầng |

Không giống nhau vì Service ra đời **trước**, từ thời API chưa có dạng `matchLabels`. Đây
là nguồn lỗi cú pháp số một khi viết tay.

## Ba con số cổng, đừng lẫn

```
người dùng ──▶ port 80 ──▶ Service ──▶ targetPort 8080 ──▶ container
                                                            (containerPort 8080)
```

| Con số | Ai nghe | Ai khai |
| --- | --- | --- |
| `port: 80` | chính Service (ClusterIP của nó) | bạn, tuỳ ý |
| `targetPort: 8080` | container | **phải đúng** cổng app nghe |
| `containerPort` | không ai — thuần tài liệu | tuỳ, có thể bỏ |

Lần này `port` và `targetPort` **khác nhau**, khác với ví dụ 80→80 quen thuộc. Đó là mục
đích: người gọi dùng cổng 80 tiêu chuẩn, còn app Node vẫn nghe 8080 như nó vẫn thế. Service
là chỗ dịch giữa hai thế giới đó.

`containerPort` bản thân nó **không mở cổng gì cả** — container nghe cổng nào là do app
quyết, khai hay không khai cũng vậy.

```bash
kubectl apply -f service.yaml && kubectl get svc backend
```

## Bài tập 1 — `LoadBalancer` trên k3s

**Đoán trước:** `type: LoadBalancer` thường cần một cloud provider cấp IP. Cluster k3s
trên VM nhà bạn không có cloud nào. Cột `EXTERNAL-IP` sẽ ra gì?

```bash
kubectl get svc backend
```

**Kết quả:** tuỳ cluster của bạn, một trong hai.

**Trường hợp A — có IP thật:**

```
NAME      TYPE           CLUSTER-IP     EXTERNAL-IP       PORT(S)        AGE
backend   LoadBalancer   10.43.12.87    192.168.103.154   80:31820/TCP   10s
```

k3s có sẵn **ServiceLB** (klipper-lb) — một LoadBalancer nhà làm, dựng một DaemonSet
chiếm cổng đó trên mọi node rồi khai IP node làm external IP. Nên trên k3s, `LoadBalancer`
chạy được ngay, không cần `minikube tunnel` như trong khoá.

```bash
curl -s http://192.168.103.154 | grep h1
```

**Trường hợp B — kẹt `<pending>` mãi:**

```
NAME      TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE
backend   LoadBalancer   10.43.12.87    <pending>     80:31820/TCP   2m
```

Đây mới là trường hợp hay gặp, và lý do rất cụ thể:

```bash
kubectl get pods -n kube-system | grep svclb
```

```bash
kubectl get svc -A | grep LoadBalancer
```

k3s mặc định cài **Traefik**, và Traefik đã chiếm cổng **80** và **443** trên node từ lúc
cluster ra đời. ServiceLB dựng Pod dùng `hostPort`, mà cổng 80 không còn trống → Pod
`svclb-backend-…` kẹt `Pending`, nên không bao giờ có external IP.

```bash
kubectl describe pod -n kube-system -l app=svclb-backend | tail -5
```

Sẽ thấy nguyên văn `node(s) didn't have free ports for the requested pod ports`.

Ba cách ra, chọn theo mục đích:

| Cách | Làm gì | Khi nào |
| --- | --- | --- |
| Đổi `port` sang số trống, ví dụ `8081` | Sửa một dòng trong file | Học, lab — đơn giản nhất |
| Đổi `type` sang `NodePort` | Bỏ ServiceLB, dùng cổng 30000–32767 | Không cần cổng đẹp |
| Gỡ Traefik | `--disable=traefik` lúc cài k3s | Chắc chắn không dùng Ingress |

Cách đầu, sửa `service.yaml`:

```yaml
      port: 8081
```

```bash
kubectl apply -f service.yaml && kubectl get svc backend
```

```bash
curl -s http://192.168.103.154:8081 | grep h1
```

**Vì sao quan trọng:** `LoadBalancer` không phải một loại Service đặc biệt — nó là
`NodePort` **cộng thêm** một yêu cầu gửi ra bên ngoài: *"ai đó cấp cho tôi một IP đi"*.
Không ai đáp thì nó nằm `<pending>` vĩnh viễn, và K8s coi đó là bình thường chứ không
phải lỗi. Để ý cột `PORT(S)` vẫn có `80:31820` — NodePort vẫn được cấp và vẫn dùng được
kể cả khi external IP không bao giờ tới.

## Bài tập 2 — Selector của Service rộng hơn của Deployment

Đây là chỗ hay nhất của file mẫu này, và nó **cố tình** để hở.

So hai selector:

```yaml
# deployment.yaml
  selector:
    matchLabels:
      app: second-app
      tier: backend        # ← hai điều kiện

# service.yaml
  selector:
    app: second-app        # ← chỉ một
```

**Đoán trước:** Pod `ke-la` từ note 5.15 chỉ mang `app=second-app`, không có `tier`. Nó
nằm ngoài Deployment. Vậy nó có nằm trong Service không?

```bash
kubectl get endpointslice -l kubernetes.io/service-name=backend -o jsonpath='{.items[0].endpoints[*].addresses}{"\n"}'
```

```bash
kubectl get pods -l app=second-app -o wide
```

**Kết quả:** **có**. Service bắt cả hai — Pod của Deployment lẫn `ke-la`. Hai địa chỉ IP
trong endpoint, dù Deployment chỉ quản một Pod.

Nghĩa là một nửa số request đang rơi vào một Pod **không ai quản lý**: không được scale,
không được rollout, không được rollback. Nó sẽ giữ nguyên phiên bản cũ mãi mãi trong khi
phần còn lại của cụm đã cập nhật.

Không lỗi. Không cảnh báo. `kubectl get all` xanh hết.

```bash
for i in 1 2 3 4; do curl -s http://192.168.103.154:8081 -o /dev/null -w '%{time_total}\n'; done
```

Sửa: cho selector của Service hẹp bằng selector của Deployment.

```yaml
  selector:
    app: second-app
    tier: backend
```

```bash
kubectl apply -f service.yaml && kubectl get endpointslice -l kubernetes.io/service-name=backend -o jsonpath='{.items[0].endpoints[*].addresses}{"\n"}'
```

Còn đúng một địa chỉ.

**Quy tắc:** selector của Service nên **khớp hoặc hẹp hơn** selector của Deployment sinh
ra Pod. Rộng hơn là mở cửa cho Pod lạ đi vào tuyến phục vụ.
[Note 5.21](/blog/k8s/k8s-in-action/more-on-labels-and-selectors) đào tiếp chuyện này.

Dọn `ke-la`, nó xong việc rồi:

```bash
kubectl delete pod ke-la
```

## Ba lỗi im lặng, phân biệt bằng một lệnh

```bash
kubectl get endpointslice -l kubernetes.io/service-name=backend
```

| Triệu chứng | Nguyên nhân |
| --- | --- |
| Có endpoint, **không** kết nối được | Sai `targetPort` |
| **Không** endpoint nào | Sai `selector` — không Pod nào khớp |
| Có endpoint, kết nối được, **nội dung sai** | Selector bắt nhầm Pod của app khác |
| `EXTERNAL-IP` kẹt `<pending>` | Không ai cấp IP — xem bài tập 1 |

Không cái nào trong số này sinh ra một dòng lỗi. Đó là lý do `get endpointslice` nên là
phản xạ thứ hai sau `describe`.

## Bài tập 3 — `targetPort` khai bằng tên

**Đoán trước:** có cách nào viết Service mà **không** cần biết container nghe cổng nào?

Đặt tên cổng trong container, ở `deployment.yaml`:

```yaml
          ports:
            - name: http
              containerPort: 8080
```

Rồi trong `service.yaml` trỏ bằng tên:

```yaml
      targetPort: http
```

```bash
kubectl apply -f deployment.yaml -f service.yaml && curl -s -o /dev/null -w '%{http_code}\n' http://192.168.103.154:8081
```

**Kết quả:** chạy y như cũ. Nhưng giờ Service **không còn phụ thuộc vào con số** — app đổi
từ 8080 sang 3000 thì chỉ sửa `deployment.yaml`, Service giữ nguyên.

**Vì sao quan trọng:** đây là cách xoá hẳn lỗi `targetPort` sai ra khỏi đời bạn. Con số
chỉ khai đúng **một chỗ**, ở nơi biết rõ sự thật nhất — chính cái container đó. Và đây
cũng là lúc `containerPort` hết vô dụng: nó trở thành chỗ để đặt cái tên.

## Self-check

- [ ] Viết được Service YAML từ đầu, nhớ đúng `v1` và selector phẳng
- [ ] Nói được ba con số cổng, ai nghe cái nào, cái nào bắt buộc đúng
- [ ] Giải thích được vì sao `LoadBalancer` trên k3s chạy được, và khi nào nó kẹt
- [ ] Nói được `LoadBalancer` thực chất là `NodePort` cộng thêm gì
- [ ] Phân biệt được bốn triệu chứng ở bảng trên chỉ bằng `get endpointslice`
- [ ] Giải thích được vì sao selector Service rộng hơn Deployment là nguy hiểm

## Open questions

- Một Service khai nhiều cổng thì `name` của từng cổng có bắt buộc không?
- ServiceLB của k3s dùng `hostPort` — vậy cluster nhiều node thì IP nào được trả về?
- `type: ClusterIP` không có external IP — vậy làm sao gọi được từ ngoài?
