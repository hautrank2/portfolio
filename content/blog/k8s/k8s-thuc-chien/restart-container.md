---
title: "5.10 Container restart lúc nào"
description: Tự tay giết app bằng trình duyệt, rồi xem kubelet dựng nó dậy — live, trong một cửa sổ terminal.
status: growing
created: 2026-08-25
updated: 2026-09-04
tags: [k8s, kubelet, troubleshooting, restart]
---

> **Cần làm xong [note 5.9](/blog/k8s/k8s-thuc-chien/phoi-deployment-bang-service)
> trước.** Note này không tạo gì mới — nó phá cái bạn vừa dựng xong.

Kiểm tra điều kiện đầu vào: mở `http://192.168.103.154:8080` (đổi thành IP node của bạn)
và thấy `Hello from this NodeJS app!`. Chưa thấy thì quay lại 5.9, đừng đọc tiếp.

Nhớ lại `app.js` có hai route, và route thứ hai là một cái nút tự sát:

```js
app.get('/error', (req, res) => {
  process.exit(1);          // giết luôn tiến trình Node
});
```

Giờ bấm nó, và xem chuyện gì xảy ra.

## Bài tập — Giết app rồi xem nó sống lại

Mở terminal, cho nó chạy và **để nguyên đó**:

```bash
kubectl get pods -w
```

Cờ `-w` là *watch*: nó không thoát ra, mà in thêm một dòng mới mỗi lần Pod đổi trạng
thái. Đây là cách xem vòng đời **trực tiếp**, không phải gõ `get pods` liên tục.

**Đoán trước:** sang trình duyệt, vào `http://192.168.103.154:8080/error`. Tiến trình
Node chết chắc chắn rồi — nhưng Pod sẽ thế nào? Biến mất và một Pod mới tên khác mọc lên,
hay vẫn là Pod cũ?

Bấm vào đường dẫn `/error` đó.

**Kết quả trên trình duyệt:** không có trang nào cả — `ERR_EMPTY_RESPONSE`, hoặc *"kết
nối đã bị đặt lại"*. Response không bao giờ được gửi, vì tiến trình chết trước khi kịp
trả lời.

**Kết quả ở terminal đang `-w`:** vài dòng mới hiện ra, rất nhanh.

```
NAME                        READY   STATUS    RESTARTS   AGE
first-app-d775f889b-5dvsn   1/1     Running   0          4m
first-app-d775f889b-5dvsn   0/1     Error     0          4m
first-app-d775f889b-5dvsn   1/1     Running   1          4m
```

Đọc kỹ ba dòng đó, vì gần như toàn bộ note nằm ở đây:

- **Tên Pod không đổi.** Vẫn `first-app-d775f889b-5dvsn`, từ đầu tới cuối. Không có Pod
  nào bị xoá, không có Pod nào được tạo.
- **`AGE` không reset.** Vẫn `4m` — Pod chưa hề trẻ lại.
- **`RESTARTS` nhảy từ 0 lên 1.** Đây là thứ duy nhất thật sự đổi.

Bấm F5 lại trang chủ: app trả lời bình thường. Toàn bộ chuyện xảy ra trong khoảng một
giây, không ai gọi bạn dậy.

## Vì sao mở một trang web lại giết được cả container

Nghe vô lý: bạn chỉ gõ một URL, sao cả container chết theo? Chuỗi domino đúng bốn mắt
xích, và mắt xích thứ hai mới là chỗ đáng nhớ.

**1. `process.exit(1)` giết tiến trình Node ngay lập tức.** Không phải trả về lỗi 500 —
`process.exit()` là lệnh của Node bảo hệ điều hành kết thúc tiến trình, ngay tại đó.
Response chưa kịp gửi, nên trình duyệt nhận được một kết nối đứt giữa chừng.

**2. Tiến trình đó là PID 1 của container.** Nhìn lại `Dockerfile`:

```dockerfile
CMD [ "node", "app.js" ]
```

`CMD` định nghĩa **tiến trình chính**. Container không phải một máy ảo có init system
trông coi nhiều dịch vụ — nó là *một cái vỏ bọc quanh một tiến trình*. Vòng đời của
container **chính là** vòng đời của tiến trình đó. PID 1 chết là container kết thúc, dù
bên trong còn file, còn thư mục, còn mọi thứ khác nguyên vẹn.

Kiểm chứng ngay, trước khi bấm `/error`:

```bash
kubectl exec deploy/first-app -- ps aux
```

Chỉ có đúng `node app.js` ở PID 1. Không có gì khác giữ container sống hộ nó.

**3. containerd ghi nhận exit code 1 và báo lên kubelet.**

**4. kubelet đọc `restartPolicy: Always` rồi dựng container mới** từ cùng image đó, đặt
lại vào **đúng Pod cũ**.

Đó là lý do một dòng code ba chữ trong `app.js` lại điều khiển được cả vòng đời container
— và cũng là lý do note này dùng `/error` thay vì đi `kill` tiến trình thủ công: nó cho
bạn bấm nút từ trình duyệt, ở đầu bên kia của cả chuỗi.

Cùng ý đó ở tầng Linux: [process và signal](/blog/k8s/nen-tang/linux/process-va-signal).

## Vậy ai vừa làm việc đó

Không phải control plane. Không phải Deployment. Là **kubelet trên chính node đó** — nó
canh container mình quản, thấy tiến trình thoát thì dựng lại, theo `restartPolicy` ghi
trong Pod spec:

| `restartPolicy` | Nghĩa | Mặc định của |
| --- | --- | --- |
| `Always` | Thoát kiểu gì cũng chạy lại | Deployment |
| `OnFailure` | Chỉ khi exit code ≠ 0 | Job |
| `Never` | Không bao giờ | — |

Deployment mặc định `Always`, nên `first-app` được dựng lại kể cả khi nó thoát với mã 0.

Và đây là chỗ dễ nhầm nhất, cũng là điều ba dòng output ở trên vừa chứng minh:

> **Pod không bao giờ được restart.** Chỉ **container bên trong** nó được chạy lại. Pod
> vẫn là Pod cũ — cùng tên, cùng IP, cùng tuổi.

Đó là lý do một Pod `RESTARTS: 47` mà `AGE: 2d` hoàn toàn hợp lý, và cũng là lý do cột
`RESTARTS` đáng nhìn hơn cột `STATUS` khi đi tìm dấu vết sự cố.

Xem chính xác lần chết vừa rồi:

```bash
kubectl describe pod -l app=first-app | grep -A6 "Last State"
```

`Reason: Error`, `Exit Code: 1` — đúng con số `process.exit(1)` trong `app.js` viết ra.

## Bấm nhiều lần thì sao

**Đoán trước:** bấm `/error` liên tục năm sáu lần. kubelet vẫn dựng lại tức thì mỗi lần?

Cứ giữ `kubectl get pods -w` chạy rồi F5 trang `/error` vài lần liên tiếp.

**Kết quả:** vài lần đầu lên lại gần như tức thì, sau đó chậm dần, và `STATUS` chuyển
sang `CrashLoopBackOff`:

```
first-app-d775f889b-5dvsn   0/1     CrashLoopBackOff   4     6m
```

kubelet chờ **10s → 20s → 40s → 80s…**, gấp đôi mỗi lần, **chặn trên 5 phút**. Bộ đếm
chỉ reset khi container sống liên tục đủ 10 phút.

`CrashLoopBackOff` **không phải một lỗi**. Nó không nói app hỏng chỗ nào — nó chỉ nói
*"tôi đang chờ trước khi thử lại"*. Nguyên nhân thật luôn nằm ở log của lần chạy **đã
chết**, không phải lần đang chạy:

```bash
kubectl logs -l app=first-app --previous
```

Cờ `--previous` là thứ đáng nhớ nhất của note này. Thiếu nó, bạn đang đọc log của
container vừa mới dựng — thường rỗng không, và chẳng nói gì về nguyên nhân.

Đợi khoảng một phút cho backoff nguội, Pod tự về `Running`. Không cần làm gì cả.

## Vì sao chuyện này quan trọng

Đây là lần đầu bạn thấy K8s **tự chữa** mà không ai ra lệnh. Bạn không gõ lệnh nào để
dựng app dậy — vòng lặp reconcile làm, đúng như nó vẫn làm với mọi thứ khác.

Nhưng để ý cái giá: trong khoảng một giây đó, **dịch vụ đứt hoàn toàn**. Chỉ có một Pod,
Pod đó chết là không còn ai trả lời. Người dùng thấy đúng cái `ERR_EMPTY_RESPONSE` bạn
vừa thấy.

Đó chính là bài toán mà [note sau](/blog/k8s/k8s-thuc-chien/scaling) giải.

## Tự kiểm

- [ ] Nói được ai restart container, và theo trường nào trong spec
- [ ] Giải thích được vì sao tên Pod và `AGE` không đổi sau khi container chết
- [ ] Đọc được ý nghĩa cột `RESTARTS`
- [ ] Nhớ dãy backoff và mức chặn trên
- [ ] Phản xạ dùng `logs --previous` khi gặp `CrashLoopBackOff`

## Câu hỏi còn mở

- `restartPolicy: Never` trong Deployment thì sao? (gợi ý: apply thử đi)
- Container bị restart thì file nó vừa ghi ra có còn không?
- Exit code `137` nghĩa là gì, và ai gửi tín hiệu đó?
