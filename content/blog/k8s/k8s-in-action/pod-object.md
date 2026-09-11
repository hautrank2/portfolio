---
title: "5.4 Object Pod"
description: Đơn vị nhỏ nhất Kubernetes làm việc cùng — vì sao là Pod chứ không phải container, và vì sao đừng gắn bó với nó.
status: seed
created: 2026-08-30
updated: 2026-08-30
tags: [k8s, pod, workload]
---

Kubernetes **không chạy container trực tiếp** — nó chạy Pod. Note này đi từ một câu
định nghĩa, qua ba đặc điểm, tới một quy tắc chi phối tất cả.

## Đơn vị nhỏ nhất Kubernetes tương tác

Câu định nghĩa đáng dừng lại đủ lâu: **Pod là "đơn vị" nhỏ nhất mà Kubernetes
tương tác**.

Nghĩa là trong mắt K8s, **không tồn tại thao tác nào trên một container lẻ**. Bạn không
bảo cluster "chạy container này" — bạn tạo một Pod, và container nằm *bên trong* nó.
Mọi việc K8s làm đều lấy Pod làm đơn vị:

- **Đặt lịch** (scheduling): scheduler chọn Node cho *Pod*, không chọn cho từng container
- **Cấp phát mạng**: IP phát cho *Pod*, các container bên trong dùng chung
- **Theo dõi, thay thế, scale**: đếm bằng *Pod* — "3 bản sao" nghĩa là 3 Pod

Docker cho bạn nghĩ bằng container; K8s bắt bạn nâng đơn vị tư duy lên một nấc. Toàn
bộ phần còn lại của module — Deployment, Service, scaling, probe — đều thao tác trên
Pod, không bao giờ chạm trực tiếp vào container.

Từ định nghĩa đó toả ra **ba đặc điểm** làm nên một Pod:

## 1. Chứa và chạy một hoặc nhiều container

Pod là cái vỏ, container là thứ chạy bên trong — và vỏ này chứa được **nhiều hơn một**
container khi cần. Dù vậy, ca thường gặp nhất trong thực tế vẫn là
**"một container mỗi Pod"**.

Vì sao mặc định là một? Vì hai container chung Pod thì **sống chết cùng nhau, scale
cùng nhau, đi cùng Node với nhau** — ràng buộc chặt như vậy chỉ đáng khi chúng thật sự
không tách rời được (app + agent đẩy log, app + proxy chặn trước). Hai app chỉ "có liên
quan" tới nhau — web và database chẳng hạn — thì tách hai Pod, để scale độc lập.

## 2. Chứa tài nguyên dùng chung cho mọi container trong Pod

Các container trong một Pod không phải hàng xóm cách vách — chúng **chia nhau tài
nguyên của Pod**. Ví dụ điển hình là **volume**: một vùng lưu trữ gắn vào Pod, mọi
container bên trong cùng mount và cùng đọc/ghi.

Đây chính là chất keo của các ca "nhiều container": app ghi log vào volume, agent ở
container bên cạnh đọc volume đó mà đẩy đi — không cần mạng, không cần copy. Volume
sẽ có [nguyên một module riêng](/blog/k8s/data-and-volumes); ở đây chỉ cần nhớ: tài
nguyên thuộc về **Pod**, container chỉ là người dùng chung.

## 3. Có IP nội bộ cluster theo mặc định

Mỗi Pod sinh ra được phát **một IP riêng, nội bộ cluster**: các Pod khác trong cluster
gọi tới được, còn thế giới bên ngoài thì **không** — muốn phơi ra ngoài phải qua
[Service](/blog/k8s/k8s-in-action/service-object), chuyện của vài note sau.

Đi kèm là một chi tiết dễ nhầm nếu đọc nhanh: **các container *bên trong cùng
một* Pod nói chuyện với nhau qua `localhost`**. IP cluster là để Pod-nói-với-Pod;
còn trong nội bộ một Pod thì không cần IP nào cả — hàng xóm cùng Pod chính là
`127.0.0.1`. Không phải ma thuật của K8s: các container trong một Pod được đặt chung
network namespace — hệ quả trực tiếp của
[namespace](/blog/k8s/foundations/linux/namespaces-and-cgroups).

## Quy tắc bao trùm: Pod là thứ phù du

> Pod được thiết kế để **ephemeral**: Kubernetes sẽ **start, stop và thay thế** chúng
> khi cần.

Đây không phải chú thích bên lề. Nó là quy tắc chi phối cách bạn dùng
cả ba đặc điểm trên: container trong Pod chết theo Pod, dữ liệu không nằm trong volume
mất theo Pod, và IP của Pod **không phải là địa chỉ để ghi nhớ** — Pod mới là IP mới.

## Bài tập — Pod có IP, và IP đó không sống lâu

**Đoán trước:** tạo một Pod, ghi lại IP. Xoá đi tạo lại y hệt — IP có giữ nguyên không?

```bash
kubectl run web --image=nginx:1.27-alpine
kubectl get pod web -o wide
```

Cột `IP` là địa chỉ nội bộ cluster. Thử gọi nó **từ trong cluster** bằng một Pod soi
tạm (thay IP của bạn vào):

```bash
kubectl run soi --rm -it --image=busybox:1.36 --restart=Never -- wget -qO- http://<IP-vua-thay>
```

**Kết quả:** trang chào của nginx hiện ra — IP dùng được, nhưng chỉ từ bên trong.
Từ laptop của bạn, `curl` vào IP đó không đi tới đâu cả: đây là mạng riêng của cluster.

Giờ kiểm chứng chữ *ephemeral*:

```bash
kubectl delete pod web
kubectl run web --image=nginx:1.27-alpine
kubectl get pod web -o wide
```

Cùng tên, cùng image — nhưng **IP đã khác**. Mỗi lần Pod sinh ra là một danh tính
mạng mới. Hệ quả: **đừng bao giờ ghi cứng IP của Pod** ở bất cứ đâu. Thứ đứng ra giữ
một địa chỉ ổn định trước đám Pod phù du chính là [Service](/blog/k8s/k8s-in-action/service-object).

Dọn:

```bash
kubectl delete pod web --ignore-not-found
```

## Ai chịu trách nhiệm thay thế Pod?

Ephemeral nghĩa là Pod chết là chết thật — tự nó không ai hồi sinh. Phải có một object
khác đứng ra chịu trách nhiệm tạo Pod thay thế. Đó là chuyện của
[Object Deployment](/blog/k8s/k8s-in-action/deployment-object), note ngay sau.

## Tự kiểm

- [ ] Giải thích được "đơn vị nhỏ nhất K8s tương tác" nghĩa là gì với container lẻ
- [ ] Kể được ba đặc điểm của Pod, không cần nhìn lại note
- [ ] Phân biệt được IP cluster (Pod-với-Pod) và `localhost` (trong cùng Pod)
- [ ] Nói được "ephemeral" kéo theo hệ quả gì với IP và dữ liệu trong Pod

## Câu hỏi còn mở

- Khi nào một Pod *thật sự* nên có hai container (sidecar), thay vì tách hai Pod?
- Container chính restart thì ai giữ network namespace để IP của Pod không đổi?
