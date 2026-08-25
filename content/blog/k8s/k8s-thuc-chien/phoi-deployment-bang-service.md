---
title: "Phơi Deployment ra bằng Service"
description: Ba con số cổng dễ lẫn nhất trong K8s, phân biệt bằng một bài tập cố tình làm sai.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, service, network]
---

ClusterIP chỉ gọi được từ trong cluster. Muốn mở trình duyệt trên máy mình và thấy
`first-app` thì cần `NodePort`.

```bash
kubectl delete svc first-app --ignore-not-found
kubectl expose deployment first-app --type=NodePort --port=80
kubectl get svc first-app
```

```
NAME        TYPE       CLUSTER-IP     PORT(S)        AGE
first-app   NodePort   10.43.12.87    80:31842/TCP   3s
```

## Ba cổng, và chúng khác nhau thật sự

`80:31842/TCP` là hai trong ba con số. Đủ bộ:

| Trường | Ở đâu | Trong ví dụ |
| --- | --- | --- |
| `nodePort` | Trên **mọi node**, mở ra ngoài | 31842 |
| `port` | Trên **ClusterIP** của Service | 80 |
| `targetPort` | Trên **container** | 80 (mặc định lấy theo `port`) |

Đường đi: `node:31842` → `clusterIP:80` → `pod:80`.

`kubectl expose` để `targetPort` bằng `port`, nên hai cái trùng nhau và tưởng như chỉ
có một. Chúng độc lập hoàn toàn — bài tập 2 làm lộ ra điều đó.

## Bài tập 1 — Gọi từ ngoài

**Đoán trước:** `nodePort` được cấp trong khoảng nào, và gọi vào **node nào** thì được?
Chỉ node đang chạy Pod, hay node nào cũng được?

```bash
PORT=$(kubectl get svc first-app -o jsonpath='{.spec.ports[0].nodePort}') && curl -s -o /dev/null -w '%{http_code}\n' localhost:$PORT
```

**Kết quả:** `200`. Khoảng cổng mặc định là **30000–32767** — cố ý nằm ngoài dải cổng
dịch vụ thông thường để khỏi đụng.

Và điểm bất ngờ: gọi vào **node nào cũng được**, kể cả node không hề chạy Pod nào. Vì
kube-proxy viết luật giống hệt nhau lên **mọi** node; node nhận gói sẽ chuyển tiếp tới
node có Pod. Cụm một node thì không thấy, nhưng đây là hành vi cần biết trước.

## Bài tập 2 — Cố tình sai `targetPort`

**Đoán trước:** đổi `targetPort` sang 8080 trong khi nginx vẫn nghe 80. Service báo lỗi,
hay vẫn `Running` bình thường?

```bash
kubectl patch svc first-app -p '{"spec":{"ports":[{"port":80,"targetPort":8080,"nodePort":'$PORT'}]}}'
curl -s -m 3 -o /dev/null -w '%{http_code}\n' localhost:$PORT || echo "khong ket noi duoc"
```

**Kết quả:** **không có lỗi nào cả.** Service vẫn `Running`, endpoint vẫn đầy đủ,
`kubectl get svc` xanh mướt. Chỉ là kết nối bị từ chối, vì gói được chuyển tới cổng
8080 của Pod, nơi không có ai nghe.

Trả lại:

```bash
kubectl patch svc first-app -p '{"spec":{"ports":[{"port":80,"targetPort":80,"nodePort":'$PORT'}]}}'
```

**Vì sao quan trọng:** đây là lỗi phổ biến nhất khi mới viết Service YAML, và nó **im
lặng tuyệt đối**. K8s không có cách nào biết container của bạn nghe cổng nào — nó chỉ
làm theo con số bạn khai.

Cách kiểm nhanh khi nghi ngờ:

```bash
kubectl get endpointslice -l kubernetes.io/service-name=first-app -o jsonpath='{.items[0].endpoints[*].addresses}{"  cong: "}{.items[0].ports[*].port}{"\n"}'
```

Có endpoint mà không gọi được → gần như chắc chắn sai `targetPort`. Không có endpoint
nào → sai `selector`, chuyện của note về label.

## Tự kiểm

- [ ] Vẽ được đường đi qua ba cổng và nói mỗi cổng nằm ở đâu
- [ ] Biết khoảng `nodePort` mặc định và vì sao nó nằm ở đó
- [ ] Giải thích được vì sao sai `targetPort` lại không sinh ra lỗi nào
- [ ] Phân biệt được triệu chứng "sai targetPort" và "sai selector"

## Câu hỏi còn mở

- `targetPort` khai bằng **tên** thay vì số thì lợi gì?
- NodePort mở trên mọi node — vậy chặn bớt bằng gì khi không muốn thế?
