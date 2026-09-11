---
title: "5.15 Viết file cấu hình Deployment"
description: Bốn trường bắt buộc, và một lỗi kinh điển K8s bắt được ngay từ lúc apply.
status: growing
created: 2026-08-25
updated: 2026-09-05
tags: [k8s, yaml, deployment]
---

> **Nối tiếp [note 5.14](/blog/k8s/k8s-in-action/imperative-vs-declarative).** Từ đây tới
> hết module không còn `kubectl create` nữa — mọi thứ đi qua file.

`first-app` đã làm xong việc của nó: nó dạy bạn lối imperative. Giờ dựng một app **thứ
hai**, hoàn toàn bằng file, để hai lối không lẫn vào nhau.

📦 [Tải source về](/code/second-app.zip) — giải nén ra thư mục `second-app`. Vẫn app Node
như trước, nhưng lần này kèm sẵn `deployment.yaml` và `service.yaml`.

Dọn app cũ cho gọn:

```bash
kubectl delete deployment first-app; kubectl delete svc first-app
```

## Image lần này lấy từ registry

Mở `deployment.yaml` sẽ thấy image là `academind/kub-first-app:2` — một image **công khai
trên Docker Hub**, không phải image bạn tự build.

Đây không phải chuyện lười. Nhớ lại chuyện ở
[note 5.13](/blog/k8s/k8s-in-action/rollback-and-history): image `:1` bạn `ctr import` vào
node đã bị kubelet dọn mất, và rollback về revision cũ thành vô nghĩa. Image nằm trên
registry thì kubelet kéo lại được **bất cứ lúc nào** — bị dọn cũng không sao.

Nên nửa sau của module không có bước build, không có bước import. Đó là khác biệt thật
giữa lab tay và một cluster có registry, không phải bước rút gọn cho tiện.

## File tối thiểu

```yaml
apiVersion: apps/v1               # Deployment ở nhóm apps, không phải v1
kind: Deployment
metadata:
  name: second-app-deployment
spec:
  replicas: 1
  selector:                       # Deployment tìm Pod của nó bằng cái này
    matchLabels:
      app: second-app
      tier: backend
  template:                       # từ đây trở xuống là một Pod
    metadata:
      labels:
        app: second-app           # PHẢI khớp matchLabels ở trên
        tier: backend             # cả hai nhãn, không thiếu cái nào
    spec:
      containers:
        - name: second-node
          image: academind/kub-first-app:2
```

Bốn trường trên cùng là bắt buộc với **mọi** object K8s, không riêng Deployment:

| Trường | Trả lời câu hỏi |
| --- | --- |
| `apiVersion` | Nói chuyện với nhóm API nào, phiên bản nào |
| `kind` | Loại object gì |
| `metadata` | Tên, namespace, nhãn — phần định danh |
| `spec` | Trạng thái bạn **muốn** có |

Không có `status` trong file. Đó là phần **cluster viết**, không phải bạn.

```bash
cd second-app && kubectl apply -f deployment.yaml
```

```bash
kubectl get deploy,pods -l app=second-app
```

## Bài tập 1 — Selector lệch khỏi labels

**Đoán trước:** bỏ một nhãn trong `template.metadata.labels` (giữ `app`, xoá `tier`) mà
giữ nguyên `matchLabels` hai nhãn. Apply được không? Nếu hỏng thì hỏng lúc nào — lúc
apply, hay lúc Pod chạy?

```bash
sed '/^        tier: backend$/d' deployment.yaml | kubectl apply -f - 2>&1 | tail -4
```

**Kết quả:** api-server **từ chối ngay tại chỗ**:

```
The Deployment "second-app-deployment" is invalid: spec.template.metadata.labels:
Invalid value: map[string]string{"app":"second-app"}: `selector` does not match
template `labels`
```

Đây là một trong số rất ít lỗi K8s bắt được **trước khi** có gì chạy, và lý do rất rõ:
một Deployment mà selector không khớp template sẽ đẻ ra Pod rồi lập tức không nhận ra
chúng là của mình — đếm mãi vẫn thấy 0, nên tạo tiếp, vô hạn. Không cho tạo là đúng.

Để ý **chiều** của phép so: selector phải là *tập con* của labels. Template được phép
mang thêm nhãn mà selector không nhắc tới; ngược lại thì không.

Đối chiếu với bài `targetPort` sai ở
[note 5.9](/blog/k8s/k8s-in-action/exposing-a-deployment-with-a-service): chỗ đó K8s **không**
bắt được, vì nó không có cách nào biết container nghe cổng nào. Ranh giới giữa hai loại
lỗi này đáng nhớ.

## Bài tập 2 — Vì sao selector cần tới hai nhãn

**Đoán trước:** `app: second-app` một mình đã đủ định danh. Thêm `tier: backend` để làm
gì?

Tạo một Pod trần mang **đúng một** nhãn `app: second-app`:

```bash
kubectl run ke-la --image=academind/kub-first-app:2 --labels='app=second-app'
```

```bash
kubectl get pods -L app,tier
```

```bash
kubectl get deploy second-app-deployment
```

**Kết quả:** Pod `ke-la` chạy, mang nhãn `app=second-app`, nhưng Deployment **không đếm
nó** — cột `READY` vẫn `1/1`, không nhảy lên `2/1`. Vì selector đòi **cả hai** nhãn, mà
`ke-la` thiếu `tier`.

Selector nhiều nhãn ghép bằng **AND**. Càng nhiều điều kiện thì càng hẹp, càng khó bắt
nhầm.

Giữ Pod này lại, đừng xoá — [note 5.18](/blog/k8s/k8s-in-action/writing-a-service-file) sẽ
cho thấy Service **không** kén như Deployment, và đó chính là chỗ sinh chuyện.

## Bài tập 3 — Xem cluster điền thêm những gì

**Đoán trước:** file bạn gửi khoảng 20 dòng. Object trong cluster có bao nhiêu dòng?

```bash
kubectl get deployment second-app-deployment -o yaml | wc -l
```

**Kết quả:** thường **trên 60**. Phần thừa là mặc định do server điền —
`strategy.rollingUpdate`, `terminationGracePeriodSeconds`, `imagePullPolicy`,
`revisionHistoryLimit`, cộng toàn bộ `status`.

Xem cụ thể vài cái:

```bash
kubectl get deployment second-app-deployment -o jsonpath='{.spec.strategy}{"\n"}'
```

Nên nhớ: **file của bạn là tập con**, không phải bản sao của object. Đừng bao giờ
`get -o yaml` rồi lưu lại làm file nguồn — bạn sẽ mang theo cả `status`, `resourceVersion`
và `uid`, những thứ không thuộc về bạn và sẽ gây lỗi khi apply sang cluster khác.

## Tự kiểm

- [ ] Viết được Deployment YAML từ đầu, không nhìn
- [ ] Kể được bốn trường bắt buộc của mọi object, và câu hỏi mỗi cái trả lời
- [ ] Giải thích được vì sao `selector` phải là tập con của `template.labels`
- [ ] Nói được vì sao image từ registry lành hơn image import tay
- [ ] Phân biệt được lỗi K8s bắt được lúc apply và lỗi nó không thể bắt

## Câu hỏi còn mở

- Bỏ hẳn `selector` đi thì sao — có mặc định không?
- Vì sao `apiVersion` của Deployment là `apps/v1` mà Pod chỉ là `v1`?
- Apply một file *có* sẵn `status` trong đó thì chuyện gì xảy ra?
