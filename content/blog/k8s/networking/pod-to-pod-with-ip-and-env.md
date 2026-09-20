---
title: "7.7 Pod gọi Pod bằng IP & biến môi trường"
description: Hai cách bỏ con số copy tay trong AUTH_ADDRESS — và cả hai đều gãy, mỗi cái một kiểu.
status: growing
created: 2026-09-14
updated: 2026-09-20
tags: [k8s, network, service, env]
---

> Tiếp [7.6](/blog/k8s/networking/creating-multiple-deployments). `users` và `auth` đang ở
> hai Pod, `AUTH_ADDRESS` đang là ClusterIP copy tay của `auth-service`.

Con số `10.43.57.210` trong YAML chạy được nhưng không ai muốn giữ: xoá rồi tạo lại
Service là nó đổi, sang cụm khác cũng đổi. Note này thử hai cách lấy địa chỉ mà không
phải gõ tay, và cho bạn thấy chúng gãy ở đâu.

## Cách 1 — Ghi thẳng IP của Pod `auth`

Lấy IP Pod:

```bash
kubectl get pods -l app=auth -o jsonpath='{.items[0].status.podIP}{"\n"}'
```

Dán vào `kubernetes/users-deployment.yaml` (IP của bạn sẽ khác):

```yaml
          env:
            - name: AUTH_ADDRESS
              value: "10.42.0.171"
```

```bash
kubectl apply -f kubernetes/users-deployment.yaml && kubectl rollout status deployment users-deployment --timeout=60s
```

```bash
USERS=$(kubectl get svc users-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}') && curl -s -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"123"}' http://$USERS:8080/signup
```

**Chạy được** — `User created!`. Pod gọi thẳng Pod, không qua Service.

**Đoán trước:** giờ giết Pod `auth`. Deployment sẽ đẻ Pod mới. `users` có còn gọi được không?

```bash
kubectl delete pod -l app=auth && kubectl rollout status deployment auth-deployment --timeout=60s && kubectl get pods -l app=auth -o jsonpath='{.items[0].status.podIP}{"\n"}'
```

```bash
curl -s -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"123"}' http://$USERS:8080/signup
```

**Kết quả:** `500`. Pod mới mang **IP khác**, còn `users` vẫn ôm IP cũ.

```bash
kubectl logs deploy/users-deployment --tail=200 | grep -m1 -E "ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH"
```

Đây đúng là bài học ở [7.3](/blog/k8s/networking/services-revisited), lần này nhìn từ phía
người gọi: IP Pod là thứ **không ai hứa giữ nguyên**. Muốn chữa thì phải sửa YAML và
rollout lại — mỗi lần Pod `auth` sinh lại, mà chuyện đó xảy ra hằng ngày.

Cách 1 **tệ hơn** ClusterIP copy tay ở 7.6. Nó tồn tại ở đây để bạn thấy nó sai.

## Cách 2 — Biến môi trường K8s tự sinh

K8s tự bơm thông tin của **mọi Service đang tồn tại** vào biến môi trường của Pod mới:

```bash
kubectl exec deploy/users-deployment -- printenv | grep AUTH
```

```
AUTH_SERVICE_SERVICE_HOST=10.43.57.210
AUTH_SERVICE_SERVICE_PORT=80
AUTH_SERVICE_PORT_80_TCP_ADDR=10.43.57.210
```

Quy tắc đặt tên: **tên Service viết hoa, gạch ngang thành gạch dưới**, rồi thêm hậu tố.
`auth-service` → `AUTH_SERVICE_SERVICE_HOST`. Giá trị là **ClusterIP**, không phải IP Pod
— nên nó không gãy khi Pod `auth` sinh lại.

Thử ngay trong Pod `users`, không cần sửa gì:

```bash
kubectl exec deploy/users-deployment -- sh -c 'wget -qO- http://$AUTH_SERVICE_SERVICE_HOST/hashed-password/abc'
```

Ra `{"hashedPassword":"abc_hash"}`. Vậy K8s **đã** đưa sẵn địa chỉ vào Pod, khỏi copy tay.
Dùng nó thì `users-app.js` đọc `process.env.AUTH_SERVICE_SERVICE_HOST` thay vì
`process.env.AUTH_ADDRESS`.

Tốt hơn cách 1 và tốt hơn cả 7.6. Nhưng nó có một lỗ hổng chí mạng.

## Bài tập — Chỗ cách 2 gãy

**Đoán trước:** xoá `auth-service` rồi tạo lại **sau khi** Pod `users` đã chạy. Pod đang
chạy có thấy Service mới không?

```bash
kubectl delete svc auth-service && kubectl apply -f kubernetes/auth-service.yaml && sleep 3 && kubectl exec deploy/users-deployment -- printenv | grep -c AUTH_SERVICE
```

**Kết quả:** `0`. Không còn biến nào, dù Service đang tồn tại và Pod `auth` vẫn chạy.

Biến môi trường được bơm vào **đúng một lần, lúc container khởi động**. Service tạo sau đó
thì Pod đang chạy không bao giờ biết tới — y hệt chuyện ConfigMap ở
[note 6.15](/blog/k8s/data-and-volumes/environment-variables-and-configmap).

```bash
kubectl rollout restart deployment users-deployment && kubectl rollout status deployment users-deployment --timeout=60s && kubectl exec deploy/users-deployment -- printenv | grep -c AUTH_SERVICE
```

Giờ mới có lại. **Thứ tự tạo quyết định kết quả** — và trong cụm thật bạn không kiểm soát
được thứ tự đó: Pod bị dời node, scale, rollout đều sinh lại vào những thời điểm ngẫu
nhiên. Một cụm dựng từ đầu bằng `kubectl apply -f kubernetes/` cũng không hứa Service ra
đời trước Pod.

Ngoài ra, ClusterIP mới sau khi tạo lại Service cũng **khác** giá trị cũ:

```bash
kubectl get svc auth-service -o jsonpath='{.spec.clusterIP}{"\n"}'
```

Nếu `AUTH_ADDRESS` của bạn vẫn đang giữ ClusterIP copy tay từ 7.6, thì nó vừa chết theo.

## Hai cách, hai kiểu gãy

| Cách | Địa chỉ trỏ vào | Gãy khi nào | Triệu chứng |
| --- | --- | --- | --- |
| ClusterIP copy tay (7.6) | Service | Service bị tạo lại | 500, phải sửa YAML |
| **IP Pod thủ công** | Pod | Pod `auth` sinh lại | 500, phải sửa YAML |
| **Biến tự sinh** | Service | Service tạo **sau** Pod | Biến không tồn tại, địa chỉ rỗng |

Cái cuối khó chịu nhất vì nó **không phải lúc nào cũng sai** — deploy đúng thứ tự thì chạy
ngon, và lỗi chỉ xuất hiện vài tuần sau, trong một lần restart không may.

Còn một phiền toái nữa: cụm có 50 Service thì mỗi Pod nhận **hàng trăm** biến nó không
dùng tới.

```bash
kubectl exec deploy/users-deployment -- printenv | wc -l
```

## Trả cụm về trạng thái chạy được

Cách 1 đã để lại một IP Pod hỏng trong YAML. Sửa `AUTH_ADDRESS` về ClusterIP hiện tại của
`auth-service`:

```bash
kubectl get svc auth-service -o jsonpath='{.spec.clusterIP}{"\n"}'
```

Dán lại vào `kubernetes/users-deployment.yaml`, rồi:

```bash
kubectl apply -f kubernetes/users-deployment.yaml && kubectl rollout status deployment users-deployment --timeout=60s && curl -s -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"123"}' http://$USERS:8080/signup
```

Phải ra `User created!` trở lại. Con số này vẫn là con số copy tay — và
[7.8](/blog/k8s/networking/dns-for-pod-to-pod) xoá nó đi lần cuối.

## Self-check

- [ ] Nói được vì sao `localhost` không dùng được giữa hai Pod
- [ ] Suy ra được tên biến tự sinh từ tên Service
- [ ] Nói được biến tự sinh trỏ vào ClusterIP chứ không phải IP Pod, và vì sao điều đó quan trọng
- [ ] Giải thích được vì sao biến môi trường phụ thuộc thứ tự tạo
- [ ] Nói được vì sao lỗi kiểu đó khó phát hiện hơn lỗi sai IP

## Open questions

- Tắt hẳn việc bơm biến môi trường được không? (gợi ý: `enableServiceLinks`)
- Nếu cả ba cách đều gãy, cách thứ tư dựa vào cái gì để không gãy?
