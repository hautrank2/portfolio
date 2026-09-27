---
title: "8.12 Dùng EFS Volume"
description: "Cho app ghi thật vào volume, rồi scale lên hai Pod ở hai node — nếu cả hai đọc được cùng một file, ReadWriteMany không còn là chữ trong YAML."
status: growing
created: 2026-09-25
updated: 2026-09-27
tags: [k8s, aws, efs, pvc, node, express]
---

> Tiếp [8.11](/blog/k8s/deploy-to-cloud/persistent-volume-for-efs). PV và PVC đã `Bound`,
> Deployment đã mount `efs-pvc` vào `/app/users`.

Volume đã mount, nhưng `users-api` **không ghi gì** — nó ghi vào MongoDB Atlas. Thư mục
`/app/users` đang trống và sẽ trống mãi.

Note này sửa code cho app ghi thật vào đó, rồi dùng chính tính năng mới ấy để chứng minh
`ReadWriteMany` hoạt động: hai Pod, hai node, một file chung.

## 1. Ghi log mỗi lần tạo user

Mở `users-api/controllers/user-actions.js`. Hai module ở đầu file:

```js
const path = require('path');
const fs = require('fs');
```

Trong `createUser`, sau khi `savedUser` đã lưu vào Mongo và **trước** khi trả response:

```js
  const logEntry = `${new Date().toISOString()} - ${savedUser.id} - ${email}\n`;

  fs.appendFile(
    path.join('/app', 'users', 'users-log.txt'),
    logEntry,
    (err) => {
      console.log(err);
    }
  );
```

Đường dẫn `/app/users` **phải khớp `mountPath`** trong Deployment. Đây là chỗ ghép duy
nhất giữa code và YAML, và không có gì kiểm giúp bạn: sai đường dẫn thì app ghi vào lớp
ghi của container, chạy vẫn ngon, và dữ liệu mất lặng lẽ mỗi lần Pod sinh lại.

Để ý callback chỉ `console.log(err)`. Ghi hỏng thì client **vẫn nhận `201`**, còn lỗi nằm
im trong log Pod. Nhớ điều này khi gỡ lỗi ở dưới.

## 2. Thêm route đọc log

Cuối `user-actions.js`:

```js
const getLogs = (req, res, next) => {
  fs.readFile(path.join('/app', 'users', 'users-log.txt'), (err, data) => {
    if (err) {
      createAndThrowError('Could not open logs file.', 500);
    } else {
      const dataArr = data.toString().split('\n');
      res.status(200).json({ logs: dataArr });
    }
  });
};
```

```js
exports.createUser = createUser;
exports.verifyUser = verifyUser;
exports.getLogs = getLogs;
```

Và `users-api/routes/user-routes.js`:

```js
router.get('/logs', userActions.getLogs);
```

Route này mới là công cụ đo: nó đọc file **từ Pod nhận request**, mà Service thì chia
request cho các Pod luân phiên. Gọi `/logs` vài lần là bạn đang hỏi nhiều Pod khác nhau
cùng một câu hỏi.

## 3. Build lại và cập nhật Deployment

```bash
docker build -t <your-docker-user>/kub-dep-users:2 ./users-api && docker push <your-docker-user>/kub-dep-users:2
```

Trong `kubernetes/users.yaml`, đổi tag và tăng số bản:

```yaml
spec:
  replicas: 2
  ...
        - name: users-api
          image: <your-docker-user>/kub-dep-users:2
```

```bash
kubectl apply -f kubernetes/users.yaml && kubectl rollout status deployment users-deployment --timeout=120s
```

```bash
kubectl get pods -l app=users -o wide
```

Ghi lại cột `NODE`. Hai Pod nằm **khác node** là điều kiện lý tưởng cho phép thử dưới —
nếu chúng rơi cùng một node, xem mục cuối để ép tách ra.

## 4. Bài tập — Hai Pod, một file

Tạo hai user. Nhớ password từ 7 ký tự:

```bash
USERS=$(kubectl get svc users-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}') && echo $USERS
```

```bash
curl -s -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"1234567"}' http://$USERS:8201/signup
```

```bash
curl -s -X POST -H 'Content-Type: application/json' -d '{"email":"d@e.f","password":"1234567"}' http://$USERS:8201/signup
```

Hai request này gần như chắc chắn rơi vào **hai Pod khác nhau**, nên mỗi Pod ghi một dòng.

**Đoán trước:** gọi `/logs` — bạn thấy một dòng hay hai dòng?

```bash
curl -s http://$USERS:8201/logs
```

**Kết quả: hai dòng.** Hỏi Pod nào cũng ra đủ, vì cả hai đang nhìn vào **cùng một file
trên EFS**.

Xác nhận từng Pod một, không qua Service:

```bash
for p in $(kubectl get pods -l app=users -o name); do echo "== $p"; kubectl exec $p -- cat /app/users/users-log.txt; done
```

Đây chính là phép thử đã **thất bại** với `hostPath` ở
[8.9](/blog/k8s/deploy-to-cloud/getting-started-with-volumes): ở đó hai Pod trên hai node
thấy hai file khác nhau. Khác biệt duy nhất là storage giờ nằm ngoài node.

```bash
kubectl exec deploy/users-deployment -- df -h /app/users
```

Cột `Filesystem` là địa chỉ EFS, không phải `overlay`.

## 5. Bài tập — Dữ liệu sống qua Pod

**Đoán trước:** xoá cả hai Pod. Deployment tạo hai Pod mới, có thể ở node khác. Log còn không?

```bash
kubectl delete pod -l app=users && kubectl rollout status deployment users-deployment --timeout=120s
```

```bash
curl -s http://$USERS:8201/logs
```

**Vẫn đủ hai dòng.** Với `emptyDir`, dữ liệu đã mất ngay ở bước này — như chuyện
`tasks.txt` ở [section 7](/blog/k8s/networking).

Ba tầng vòng đời, xếp từ ngắn tới dài:

| Storage | Sống qua container restart | Sống qua Pod | Sống qua cluster |
| --- | --- | --- | --- |
| Lớp ghi của container | Không | Không | Không |
| `emptyDir` | Có | **Không** | Không |
| `hostPath` | Có | Có, nhưng chỉ trên **đúng node đó** | Có |
| **EFS qua PVC** | Có | **Có** | **Có** |

Dòng cuối là lý do EFS đắt hơn và chậm hơn: nó không thuộc về máy nào cả.

## Khi log trống hoặc lỗi

`GET /logs` trả `500 Could not open logs file.` nghĩa là `readFile` gặp `ENOENT` — chưa ai
ghi dòng nào. Tạo một user rồi thử lại. Nếu vẫn vậy:

```bash
kubectl logs deploy/users-deployment --tail=30
```

Callback của `appendFile` in thẳng lỗi ra đây.

| Lỗi trong log Pod | Nguyên nhân |
| --- | --- |
| `ENOENT: no such file or directory, open '/app/users/users-log.txt'` | Thư mục `/app/users` không tồn tại — `mountPath` không khớp đường dẫn trong code |
| `EACCES: permission denied` | EFS bật root squash, hoặc access point đặt UID khác với user chạy container |
| `EROFS: read-only file system` | Volume mount ở chế độ chỉ đọc |
| Không lỗi, nhưng `/logs` vẫn trống | Pod đang chạy image cũ — kiểm tag |

```bash
kubectl exec deploy/users-deployment -- ls -la /app/users
```

```bash
kubectl get deploy users-deployment -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

## Nếu hai Pod rơi cùng một node

Phép thử vẫn đúng, nhưng kém thuyết phục — cùng node thì `hostPath` cũng qua được. Ép
chúng tách ra bằng `topologySpreadConstraints`:

```yaml
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: users
      containers:
        - name: users-api
```

```bash
kubectl apply -f kubernetes/users.yaml && kubectl get pods -l app=users -o wide
```

Mỗi node tối đa một Pod, chênh lệch không quá `maxSkew: 1`.

## Dọn

Xoá Deployment, PVC, PV **không** xoá dữ liệu trên EFS. File `users-log.txt` vẫn nằm đó,
và hoá đơn EFS vẫn chạy:

```bash
aws efs describe-file-systems --query "FileSystems[].{id:FileSystemId,size:SizeInBytes.Value}" --output table
```

Cách xoá hẳn nằm ở cuối [8.10](/blog/k8s/deploy-to-cloud/adding-efs-as-a-volume): xoá
mount target trước, rồi tới file system.

## Nếu chỉ đọc chứ không bật EKS

Trên k3d, thay `csi:` bằng `hostPath` như bản ở 8.11. Mọi thứ ở mục 1–3 chạy y hệt, và
mục 5 (dữ liệu sống qua Pod) cũng đúng.

Chỉ **mục 4 sẽ thất bại** khi hai Pod rơi vào hai node — và đó lại là điều đáng thấy nhất:
bạn tự tay quan sát giới hạn mà `ReadWriteMany` sinh ra để giải quyết. Chạy bài tập ở
[8.9](/blog/k8s/deploy-to-cloud/getting-started-with-volumes) với `replicas: 2` là ra ngay.

## Self-check

- [ ] Nói được vì sao đường dẫn trong code phải khớp `mountPath`, và hỏng thế nào nếu lệch
- [ ] Giải thích vì sao `GET /logs` là phép đo tốt cho `ReadWriteMany`
- [ ] Nói được vì sao `appendFile` hỏng mà client vẫn nhận `201`
- [ ] Kể bốn tầng vòng đời của dữ liệu, từ lớp ghi container tới EFS
- [ ] Biết ép hai Pod nằm khác node để phép thử có giá trị

## Open questions

- Hai Pod cùng `appendFile` vào một file trên NFS — có mất dòng nào không, và vì sao?
- App ghi log ra file trong khi user lưu ở Mongo: khi nào nên tách log ra khỏi filesystem hẳn?
- `readFile` đọc cả file vào RAM. Log 2GB thì chuyện gì xảy ra với Pod?
