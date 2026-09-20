---
title: "5.6 Deployment đầu tiên — kiểu imperative"
description: Build image từ source thật, đưa được nó tới node, rồi một lệnh sinh ba object.
status: growing
created: 2026-08-25
updated: 2026-09-02
tags: [k8s, deployment, kubectl, docker, image]
---

Đây là chỗ `first-app` ra đời. Nó sống suốt module này — scale, cập nhật, rollback, viết
lại thành YAML, gắn probe. **Đừng xoá nó** cho tới note tóm tắt.

Lần này không mượn image có sẵn mà build từ source thật — một service Node nhỏ, bốn file.

📦 [Tải source về](/code/first-app.zip) — giải nén ra thư mục `first-app`.

## App có gì

`app.js` vỏn vẹn hai route:

```js
app.get('/', (req, res) => {
  res.send('<h1>Hello from this NodeJS app!</h1>...');
});

app.get('/error', (req, res) => {
  process.exit(1);          // giết luôn tiến trình Node
});

app.listen(8080);
```

`/error` không phải trò đùa. Nó là **nút tự sát của container**, và là hạt giống của
[note khởi động lại container](/blog/k8s/k8s-in-action/container-restarts) lẫn
[liveness probe](/blog/k8s/k8s-in-action/liveness-probe). Cả module có một app, và app
đó cố tình chết được theo yêu cầu.

`Dockerfile` cũng chỉ bấy nhiêu:

```dockerfile
FROM node:14-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 8080
CMD [ "node", "app.js" ]
```

`node:14-alpine` là bản của khoá (2020) và đã hết hỗ trợ. Vẫn build được; muốn bớt cảnh
báo thì đổi sang `node:20-alpine` — app này không đụng API nào đã thay đổi.

`EXPOSE 8080` chỉ là **ghi chú trong image**, không mở cổng nào. Nhớ con số 8080, nó
quay lại ở mọi note sau.

## Build

```bash
cd first-app && docker build -t hautrank2/kub-first-app:1 .
```

Đổi `hautrank2` thành user Docker Hub của bạn. Và **đừng tag `:latest`** — bài tập 2
giải thích vì sao.

## Bài tập 1 — Build xong không có nghĩa là cluster thấy được

**Đoán trước:** image vừa build nằm trong Docker trên máy bạn, tên đúng chính xác. Trỏ
`kubectl` vào tên đó thì Pod lên được không?

```bash
kubectl create deployment first-app --image=hautrank2/kub-first-app:1 --port=8080
```

```bash
kubectl get pods
```

**Kết quả:** không lên.

```
NAME                         READY   STATUS             RESTARTS   AGE
first-app-6b8f9c7d55-2wq4z   0/1     ImagePullBackOff   0          40s
```

```bash
kubectl describe pod -l app=first-app | tail -6
```

Events nói thẳng: `Failed to pull image "hautrank2/kub-first-app:1" ... not found`.

**Vì sao:** Docker trên máy bạn và container runtime trên node là **hai kho image khác
nhau**, không liên quan gì tới nhau. K8s
[không quản lý hạ tầng](/blog/k8s/k8s-in-action/k8s-does-not-manage-infrastructure-2) — nó chỉ
đưa cho kubelet một chuỗi tên image, còn tự đi kiếm ở đâu là việc của node.

Hai cách đưa image tới node:

**A. Đẩy lên registry — cách của khoá, và cách của mọi cluster thật**

```bash
docker login && docker push hautrank2/kub-first-app:1 && kubectl rollout restart deployment first-app
```

**B. Nạp thẳng vào containerd của k3s — cách lab, không cần registry**

```bash
docker save hautrank2/kub-first-app:1 | sudo k3s ctr images import -
```

```bash
sudo crictl images | grep kub-first-app
```

Cách B chỉ nạp vào **một** node. Cluster ba node thì phải làm ba lần, và lần nào quên thì
Pod rơi đúng vào node đó là hỏng. Đó là lý do production luôn dùng registry, không phải
vì registry "chuẩn hơn".

Sau khi làm A hoặc B, Pod chuyển sang `Running`:

```bash
kubectl get pods
```

## Bài tập 2 — Bẫy `:latest`

**Đoán trước:** làm y hệt cách B nhưng tag `:latest`. Image nằm sẵn trong containerd của
node rồi. Pod lên được không?

```bash
docker tag hautrank2/kub-first-app:1 hautrank2/kub-first-app:latest && docker save hautrank2/kub-first-app:latest | sudo k3s ctr images import -
```

```bash
kubectl create deployment try-latest --image=hautrank2/kub-first-app:latest
```

```bash
kubectl get pods -l app=try-latest
```

**Kết quả:** `ImagePullBackOff` — dù image có sẵn ngay trên chính node đó.

| Tag | `imagePullPolicy` mặc định | Hệ quả |
| --- | --- | --- |
| `:1`, `:v2`, `:1.27-alpine` | `IfNotPresent` | Có sẵn thì dùng luôn |
| `:latest`, hoặc không tag | `Always` | Luôn đi hỏi registry, có sẵn cũng kệ |

```bash
kubectl delete deployment try-latest
```

**Vì sao quan trọng:** đây là lỗi kinh điển của mọi lab K8s chạy local, và triệu chứng
đánh lừa hoàn toàn — nó trông như "thiếu image", trong khi image có đủ. Thứ thiếu là
**quyền được dùng bản có sẵn**. Luôn tag phiên bản thật; để `:latest` cho chỗ nào có
registry thật.

## Bài tập 3 — Một lệnh tạo ra bao nhiêu object

**Đoán trước:** lệnh `create deployment` ở trên tạo ra mấy object? Một, hay nhiều hơn?

```bash
kubectl get all
```

**Kết quả:** **ba**.

```
NAME                             READY   STATUS    AGE
pod/first-app-6b8f9c7d55-2wq4z   1/1     Running   3m

NAME                        READY   UP-TO-DATE   AVAILABLE
deployment.apps/first-app   1/1     1            1

NAME                                   DESIRED   CURRENT   READY
replicaset.apps/first-app-6b8f9c7d55   1         1         1
```

Bạn tạo **một**, hai cái còn lại do controller tạo — đúng bước 3 và 4 trong
[bảy bước của một apply](/blog/k8s/getting-started/master-node).

Để ý chuỗi `6b8f9c7d55` xuất hiện ở cả tên ReplicaSet và tên Pod. Đó là **hash của Pod
template**. Đổi image là hash đổi, nên ReplicaSet mới có tên mới — cơ chế nền của rolling
update.

Container bên trong mang tên `kub-first-app`, không phải tên deployment. Lấy ra khi cần:

```bash
kubectl get deploy first-app -o jsonpath='{.spec.template.spec.containers[*].name}{"\n"}'
```

Nhớ lấy — [note cập nhật](/blog/k8s/k8s-in-action/updating-deployments) cần đúng tên này.

`--port=8080` chỉ ghi `containerPort` vào spec. Nó **không** mở cổng nào ra ngoài; expose
app là việc của [Service](/blog/k8s/k8s-in-action/service-object).

## Bài tập 4 — Nhìn Pod đi qua các trạng thái

**Đoán trước:** giữa lúc gõ lệnh và lúc `Running`, Pod đi qua mấy trạng thái?

Mở một terminal thứ hai:

```bash
kubectl get pods -w
```

Rồi ở terminal đầu:

```bash
kubectl create deployment temp --image=hautrank2/kub-first-app:1
```

**Kết quả:** `Pending` → `ContainerCreating` → `Running`.

Ba trạng thái ứng đúng với ba bên khác nhau đang làm việc:

| Trạng thái | Ai đang bận | Kẹt ở đây nghĩa là |
| --- | --- | --- |
| `Pending` | scheduler chưa chọn được node | Không node nào đủ chỗ, hoặc có taint |
| `ContainerCreating` | kubelet đang kéo image | Mạng chậm, sai tên image, thiếu quyền registry |
| `Running` | — | Container đã chạy (**chưa chắc app đã sẵn sàng**) |

`ImagePullBackOff` ở bài tập 1 chính là chặng thứ hai hỏng. Biết Pod kẹt ở đâu là biết
ngay phải đi hỏi ai — [note sau](/blog/k8s/k8s-in-action/kubectl-behind-the-scenes)
vẽ đủ bốn chặng.

```bash
kubectl delete deployment temp
```

## Bài tập 5 — Gọi thử app, rồi giết nó

**Đoán trước:** Pod `Running` rồi. Từ máy bạn `curl` thẳng vào được chưa?

Chưa — chưa có gì expose nó ra ngoài. Đường tạm là `port-forward`:

```bash
kubectl port-forward deploy/first-app 8080:8080
```

Terminal khác:

```bash
curl -s localhost:8080
```

**Kết quả:** `<h1>Hello from this NodeJS app!</h1>` — app của chính bạn, không phải trang
mặc định của ai khác.

Giờ bấm nút tự sát:

```bash
curl -s localhost:8080/error
```

```bash
kubectl get pods -l app=first-app
```

**Kết quả:** `curl` báo `Empty reply from server` — response không bao giờ tới, vì tiến
trình chết trước khi kịp trả lời. `port-forward` đứt theo, và cột `RESTARTS` nhảy lên
`1`. Tiến trình Node
chết, container chết theo, kubelet dựng lại — **không ai phải gọi bạn dậy lúc 3 giờ
sáng**. Đó là toàn bộ luận điểm của note khởi động lại container, và bạn vừa thấy nó
trước.

`port-forward` chỉ là ống nối tới **một** Pod, sống cùng phiên terminal. Không phải cách
expose app.

## Khi Pod không lên

```bash
kubectl describe pod -l app=first-app | tail -15
```

Phần `Events` ở cuối là **nhật ký của scheduler và kubelet cho riêng Pod này** —
`Scheduled`, `Pulling`, `Pulled`, `Created`, `Started`. Chín trên mười lần Pod không lên,
nguyên nhân nằm nguyên văn ở đó, không cần đoán.

Nhớ là Events chỉ giữ khoảng một giờ. Pod hỏng từ hôm qua thì mục này rỗng.

## Self-check

- [ ] Giải thích được vì sao build xong trên máy mình mà node vẫn `ImagePullBackOff`
- [ ] Kể được hai cách đưa image tới node, và vì sao production chọn registry
- [ ] Nói được vì sao tag `:latest` làm hỏng lab local
- [ ] Nói được một lệnh `create deployment` sinh ra ba object nào
- [ ] Giải thích được chuỗi hash trong tên ReplicaSet đến từ đâu
- [ ] Phản xạ đầu tiên khi Pod không lên là `describe`, không phải `logs`

## Open questions

- Registry riêng có xác thực thì khai báo ở đâu? (gợi ý: `imagePullSecrets`)
- `Running` mà app chưa phục vụ được thì cột nào cho biết? (gợi ý: `READY 0/1`)
- Vì sao `kubectl get all` lại không hề "all" — Secret, ConfigMap, Ingress đâu?
