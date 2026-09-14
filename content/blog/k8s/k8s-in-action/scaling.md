---
title: "5.11 Scaling trong thực tế"
description: Một con số đổi thành 3, rồi bấm nút tự sát — lần này dịch vụ không đứt.
status: growing
created: 2026-08-25
updated: 2026-09-04
tags: [k8s, deployment, scaling, replicas]
---

> **Cần làm xong [note 5.10](/blog/k8s/k8s-in-action/container-restarts) trước.** Note
> này lặp lại đúng bài tập đó, chỉ đổi một con số — và kết quả khác hẳn.

Ở note trước, bấm `/error` là dịch vụ đứt. Chỉ có một Pod, Pod đó chết thì không còn ai
trả lời. Giờ sửa chuyện đó bằng một lệnh.

## Scale là sửa một con số

```bash
kubectl scale deployment/first-app --replicas=3
```

Không ssh vào đâu, không thêm máy, không sửa một dòng nào trong `app.js`.

Chuyện thật sự xảy ra: `spec.replicas` từ 1 thành 3 → ReplicaSet đếm thấy đang có 1 →
tạo thêm 2. Vẫn đúng một vòng lặp reconcile, không có cơ chế mới nào.

Xem chúng mọc lên:

```bash
kubectl get pods -w
```

```
NAME                        READY   STATUS              RESTARTS   AGE
first-app-d775f889b-5dvsn   1/1     Running             0          12m
first-app-d775f889b-mtq4z   0/1     ContainerCreating   0          1s
first-app-d775f889b-p8wnk   0/1     ContainerCreating   0          1s
first-app-d775f889b-mtq4z   1/1     Running             0          3s
first-app-d775f889b-p8wnk   1/1     Running             0          3s
```

Để ý cái hash `d775f889b` giống hệt nhau ở cả ba: chúng cùng một ReplicaSet, cùng một
Pod template. Chỉ hậu tố ngẫu nhiên phía sau là khác.

Pod cũ **không bị đụng tới** — `AGE 12m` giữ nguyên. Scale không dựng lại cái đang chạy.

## Bài tập — Bấm nút tự sát, lần này với ba Pod

Giữ `kubectl get pods -w` chạy ở một terminal.

**Đoán trước:** vào `http://192.168.103.154:8080/error` như note trước. Cả ba Pod cùng
chết, hay chỉ một? Và F5 lại trang chủ thì còn xem được không?

Bấm `/error`.

**Kết quả ở terminal:** **chỉ một** Pod nhúc nhích.

```
first-app-d775f889b-p8wnk   0/1     Error     0          2m
first-app-d775f889b-p8wnk   1/1     Running   1          2m
```

Hai Pod kia im lặng tuyệt đối — chúng không biết gì cả, và cũng không cần biết.

**Kết quả trên trình duyệt:** F5 lại trang chủ, **trang vẫn hiện ra bình thường**. Không
có `ERR_EMPTY_RESPONSE` nào. Service thấy một endpoint biến mất thì lập tức thôi gửi
request tới đó, hai endpoint còn lại gánh tiếp.

Đó là toàn bộ luận điểm của scaling, và bạn vừa thấy nó tận mắt: **không phải để chạy
nhanh hơn, mà để một Pod chết không làm sập dịch vụ.**

## Ai vừa lãnh viên đạn

Request `/error` chỉ tới đúng **một** Pod — Service chọn ngẫu nhiên một endpoint cho mỗi
kết nối. Muốn biết Pod nào thì nhìn cột `RESTARTS`:

```bash
kubectl get pods -l app=first-app
```

```
NAME                        READY   STATUS    RESTARTS   AGE
first-app-d775f889b-5dvsn   1/1     Running   0          14m
first-app-d775f889b-mtq4z   1/1     Running   0          2m
first-app-d775f889b-p8wnk   1/1     Running   1          2m
```

Pod nào có `RESTARTS 1` là Pod đã nhận request.

**Bấm `/error` thêm vài lần nữa** rồi xem lại bảng này. Con số `RESTARTS` sẽ rải ra cả
ba Pod, không dồn vào một cái — bằng chứng trực tiếp rằng kube-proxy đang chia tải thật.

Nhưng nó **không luân phiên tăm tắp**: bấm sáu lần rất khó ra 2-2-2. iptables chọn
endpoint bằng **xác suất** cho từng kết nối, nên phân bố chỉ đều khi số lần đủ lớn. Thấy
4-1-1 là bình thường, không phải hỏng.

## Thu về 1 — ai bị chọn để xoá

**Đoán trước:** thu từ 3 xuống 1. K8s giữ lại Pod nào — Pod già nhất, hay Pod khoẻ nhất?

```bash
kubectl scale deployment/first-app --replicas=1; kubectl get pods -l app=first-app
```

**Kết quả:** hai Pod chuyển sang `Terminating`, một Pod sống sót — và **không phải Pod
già nhất**.

```
NAME                         READY   STATUS        RESTARTS        AGE
first-app-57d69676b9-2rcfg   1/1     Running       2 (3m12s ago)   3m46s
first-app-57d69676b9-f8fx8   1/1     Terminating   4 (3m2s ago)    42m
first-app-57d69676b9-fmfn6   1/1     Terminating   3 (2m59s ago)   3m46s
```

Pod `42m` tuổi bị xoá, Pod `3m46s` được giữ. ReplicaSet **không chọn theo tuổi** — nó có
một thang ưu tiên xoá, và Pod "kém khoẻ" đi trước: chưa `Ready` trước, rồi tới Pod vừa
mới `Ready` lại gần đây, rồi tới Pod có `RESTARTS` cao hơn. Cả hai Pod bị xoá đều vừa
restart xong vì bạn bấm `/error`.

Nói cách khác: **những viên đạn bạn bắn vào Pod nào cũng đánh dấu Pod đó là ứng viên bị
xoá trước.** Đó là hành vi mong muốn — khi thu quy mô, giữ lại cái đang ổn định nhất.

**Một hệ quả cần biết:** thu về 1 là quay lại đúng tình cảnh của
[note 5.10](/blog/k8s/k8s-in-action/container-restarts) — một Pod duy nhất, chết là đứt
dịch vụ. Nếu Pod sống sót đang mang sẵn `RESTARTS` cao, nó có thể rơi thẳng vào backoff
và nằm `Error` vài phút trước khi lên lại. Không hỏng gì cả, chỉ là đang chờ.

## Scale về 0

**Đoán trước:** `--replicas=0` thì Deployment biến mất, hay còn lại cái vỏ?

```bash
kubectl scale deployment/first-app --replicas=0; kubectl get deploy,pods -l app=first-app
```

**Kết quả:** Deployment còn nguyên, `READY 0/0`, không Pod nào. Service vẫn tồn tại
nhưng **danh sách endpoint rỗng** — gọi vào bị từ chối ngay lập tức, không phải chờ
timeout. Đúng triệu chứng `curl` trả `000` ở 0 ms mà bạn đã gặp.

Đó là cách tắt tạm một dịch vụ mà giữ nguyên toàn bộ cấu hình. Trả về:

```bash
kubectl scale deployment/first-app --replicas=3
```

## Vì sao `kubectl scale` không phải cách làm ở production

Nó sửa thẳng vào trạng thái sống. Lần `kubectl apply` tiếp theo từ file YAML ghi
`replicas: 1` sẽ **kéo ngược về 1** — và không ai hiểu vì sao dịch vụ tự thu nhỏ lúc nửa
đêm. Chuyện này là trọng tâm của note
[Imperative vs Declarative](/blog/k8s/k8s-in-action/imperative-vs-declarative).

Dùng `kubectl scale` để **thử**, sửa file YAML để **giữ**.

## Self-check

- [ ] Nói được chuyện gì thật sự xảy ra khi `kubectl scale`
- [ ] Giải thích được vì sao chỉ một Pod chết khi bấm `/error`
- [ ] Nói được vì sao trình duyệt vẫn xem được trong khi một Pod đang restart
- [ ] Dùng cột `RESTARTS` để biết Pod nào đã nhận request
- [ ] Giải thích được vì sao cân tải không chia đều tăm tắp
- [ ] Nói được `--replicas=0` khác `kubectl delete` chỗ nào
- [ ] Giải thích được vì sao thu về 1 lại giữ Pod trẻ mà xoá Pod già

## Open questions

- Ba Pod nằm cùng một node — node đó chết thì scaling còn cứu được gì?
- HPA tự chỉnh `replicas`, vậy nó có xung đột với `apply` từ file không?
- Đang có request dở dang mà Pod bị xoá thì request đó ra sao?
