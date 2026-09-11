---
title: "5.13 Rollback & lịch sử revision"
description: Revision là gì, vì sao quay lại bản cũ chỉ mất vài giây, và vì sao số revision không bao giờ quay lui.
status: growing
created: 2026-08-25
updated: 2026-09-05
tags: [k8s, deployment, rollout, revision]
---

> **Nối tiếp thẳng [note 5.12](/blog/k8s/k8s-in-action/updating-deployments).** Trạng thái
> đang có: Deployment `first-app`, `replicas: 3`, container tên `kub-first-app`, image
> `hautrank2/kub-first-app:2`, mở web thấy `-- phien ban 2`.

Note trước kết lại ở chỗ ReplicaSet cũ tụt về 0 nhưng **không bị xoá**. Đó chính là cơ
chế rollback: bản cũ vẫn nằm nguyên đó, chỉ việc nâng lại.

## Revision là gì

**Một revision là một bản chụp của Pod template** — và chỉ có thế. Không phải bản chụp
của dữ liệu, không phải của ConfigMap, không phải của app đang chạy.

Mỗi revision ứng với đúng **một ReplicaSet**. Số của nó không nằm trong Deployment mà là
một annotation trên chính ReplicaSet đó:

```bash
kubectl get rs -l app=first-app -o custom-columns='REVISION:.metadata.annotations.deployment\.kubernetes\.io/revision,RS:.metadata.name,IMAGE:.spec.template.spec.containers[0].image,PODS:.spec.replicas'
```

**Kết quả:**

```
REVISION   RS                     IMAGE                       PODS
1          first-app-57d69676b9   hautrank2/kub-first-app:1   0
2          first-app-6c4b8d9f77   hautrank2/kub-first-app:2   3
```

Đây là bảng đáng thuộc nhất của cả note. Nó trả lời câu duy nhất bạn cần trước khi
rollback: *quay về revision N thì thật sự được image nào.*

### Cái gì tạo ra revision mới, cái gì không

Quy tắc chỉ có một: **template đổi thì hash đổi, hash đổi thì có ReplicaSet mới, và
ReplicaSet mới là một revision mới.**

| Việc bạn làm | Revision mới? | Vì sao |
| --- | --- | --- |
| `set image` sang tag khác | ✅ | Template đổi |
| Sửa `env`, `resources`, `command`, probe | ✅ | Vẫn là template |
| `kubectl rollout restart` | ✅ | Lén thêm annotation vào template |
| `kubectl scale` / đổi `replicas` | ❌ | `replicas` nằm ngoài template |
| **Build lại image, giữ nguyên tag** | ❌ | Deployment không đổi một ký tự nào |

Dòng cuối là chỗ dễ hiểu nhầm nhất, nên nói thẳng: **build không tạo revision.** Docker
không nói chuyện với K8s. Thứ tạo ra revision là **chuỗi tag trong Deployment đổi giá
trị** — nên `docker build` xong mà không `set image` sang tag mới thì cluster không hề
biết có chuyện gì xảy ra. Đó đúng là bài học "mỗi lần build một tag mới" ở
[note 5.12](/blog/k8s/k8s-in-action/updating-deployments).

## Đọc lịch sử

```bash
kubectl rollout history deployment/first-app
```

**Kết quả:**

```
REVISION  CHANGE-CAUSE
1         <none>
2         <none>
```

> Có chạy `kubectl rollout restart` ở cuối note 5.12 thì bạn sẽ thấy thêm một revision
> nữa. Số của bạn lệch đi một so với ở đây, còn lại giống hệt — cứ trừ ra khi đọc tiếp.

Xem chi tiết một revision **trước khi** quay về nó:

```bash
kubectl rollout history deployment/first-app --revision=1
```

Số revision giữ lại mặc định là **10** (`revisionHistoryLimit`). Quá đó thì ReplicaSet cũ
nhất bị dọn, và revision đó hết đường quay về.

## Quay về revision 1

```bash
kubectl rollout undo deployment/first-app --to-revision=1
```

```bash
kubectl rollout status deployment/first-app
```

Rollback **không phải deploy lại**. Không build, không kéo image, không tạo ReplicaSet
nào — chỉ vắt RS `6c4b8d9f77` về 0 và nâng RS `57d69676b9` lên 3. Hai con số. Vì thế nó
tính bằng giây, còn deploy xuôi thì tính bằng phút.

Xác nhận bằng mắt:

```bash
curl -s http://192.168.103.154:8080 | grep h1
```

**Kết quả:** `<h1>Hello from this NodeJS app!</h1>` — chữ `-- phien ban 2` đã biến mất.

Dùng `curl` chứ đừng F5 trình duyệt. Trình duyệt có cache riêng và hoàn toàn có thể trả
lại trang cũ trong khi cluster đã đổi xong từ lâu — mất hàng giờ debug một thứ không hỏng.

## Bài tập 1 — Số revision không bao giờ quay lui

**Đoán trước:** vừa quay về revision 1 xong. Giờ `rollout history` liệt kê những revision
nào?

```bash
kubectl rollout history deployment/first-app
```

**Kết quả:** không phải `1, 2`, mà là:

```
REVISION  CHANGE-CAUSE
2         <none>
3         <none>
```

**Revision 1 biến mất.** Không phải bị xoá — bị **đánh số lại**.

`rollout undo` không tua ngược lịch sử. Nó chép template cũ ra thành **một revision
mới ở cuối hàng**. ReplicaSet thì vẫn là cái cũ nguyên vẹn (cùng hash, nên Pod không phải
dựng lại từ đầu — đó là lý do rollback nhanh), nhưng annotation revision của nó được
đánh lại thành số lớn nhất.

```bash
kubectl get rs -l app=first-app -o custom-columns='REVISION:.metadata.annotations.deployment\.kubernetes\.io/revision,RS:.metadata.name,IMAGE:.spec.template.spec.containers[0].image,PODS:.spec.replicas'
```

```
REVISION   RS                     IMAGE                       PODS
3          first-app-57d69676b9   hautrank2/kub-first-app:1   3
2          first-app-6c4b8d9f77   hautrank2/kub-first-app:2   0
```

Cùng một ReplicaSet `57d69676b9`, cùng image `:1` — chỉ số revision nhảy từ 1 lên 3.

**Vì sao quan trọng:** lịch sử rollout là một **hàng đợi luôn tiến về phía trước**, không
phải con trỏ trượt qua lại. Hệ quả rất thực tế: gõ lại `--to-revision=1` lần thứ hai sẽ
**lỗi**, vì số 1 không còn tồn tại:

```
error: unable to find specified revision 1 in history
```

Đừng học thuộc số revision. Đọc bảng trước mỗi lần rollback.

## Khi rollback trông như không có tác dụng

Triệu chứng kinh điển: lệnh chạy trót lọt, `rollout status` báo thành công, mà web vẫn y
nguyên. Ba nguyên nhân, phân biệt được trong ba lệnh:

| Dấu hiệu | Nguyên nhân | Kiểm bằng |
| --- | --- | --- |
| `curl` ra bản mới, trình duyệt ra bản cũ | Cache trình duyệt | `curl` hoặc Ctrl-Shift-R |
| `error: unable to find specified revision` | Số revision đã bị đánh lại (bài tập 1) hoặc bị dọn | `kubectl rollout history` |
| Revision đổi mà nội dung không đổi | Hai revision trỏ về **cùng một image**, hoặc bạn đã build đè lên tag cũ | Cột `IMAGE` trong bảng ở trên |

Dòng thứ ba là hậu quả muộn của việc phá quy tắc "mỗi lần build một tag mới". Deployment
ghi `:1`, containerd cũng có `:1` — nhưng bên trong `:1` giờ là code mới vì bạn từng
build đè lên nó. Rollback về đúng revision, đúng image, và vẫn ra sai code. Không lệnh
`kubectl` nào phát hiện được, vì với K8s thì mọi thứ khớp cả.

Muốn biết chắc bên trong Pod là code nào thì hỏi thẳng Pod, đừng hỏi Deployment:

```bash
kubectl exec deploy/first-app -- cat /app/app.js | grep h1
```

## Bài tập 2 — Vì sao CHANGE-CAUSE luôn rỗng

**Đoán trước:** cột đó tự điền từ lệnh bạn vừa gõ, hay phải khai bằng tay?

```bash
kubectl annotate deployment/first-app kubernetes.io/change-cause="len :2 vi ban v1 thieu trang chao" --overwrite
```

```bash
kubectl set image deployment/first-app kub-first-app=hautrank2/kub-first-app:2
```

```bash
kubectl rollout history deployment/first-app
```

**Kết quả:** revision mới có chú thích, các revision cũ vẫn `<none>`.

```
REVISION  CHANGE-CAUSE
3         <none>
4         len :2 vi ban v1 thieu trang chao
```

Cột này đọc từ annotation `kubernetes.io/change-cause` và **không tự sinh**. Cờ `--record`
ngày xưa làm việc đó đã bị bỏ. Nghĩa là ở cluster thật, lịch sử rollout gần như luôn là
một cột rỗng vô dụng — trừ khi pipeline chủ động ghi vào trước mỗi lần deploy.

Nhớ `--overwrite`: thiếu nó thì lần annotate thứ hai báo lỗi thay vì cập nhật.

## Bài tập 3 — Rollout kẹt vì image không tồn tại

Đây là bài tập mà [index của module](/blog/k8s/k8s-in-action) có nhắc.

**Đoán trước:** đẩy một image chắc chắn không tồn tại. Dịch vụ **chết**, hay vẫn phục vụ
bình thường?

```bash
kubectl set image deployment/first-app kub-first-app=khong-ton-tai:v9
```

```bash
kubectl get pods -l app=first-app
```

**Kết quả:** dịch vụ **vẫn chạy nguyên**.

```
NAME                         READY   STATUS             RESTARTS   AGE
first-app-6c4b8d9f77-c7wnp   1/1     Running            0          9m
first-app-6c4b8d9f77-m4kt2   1/1     Running            0          9m
first-app-6c4b8d9f77-h2vbd   1/1     Running            0          9m
first-app-84fc6d5b92-p9x3k   0/1     ImagePullBackOff   0          25s
```

Rollout đứng im giữa chừng. Đây là `maxUnavailable` đang làm việc: Deployment **không
được phép** hạ Pod cũ xuống khi Pod mới chưa `Ready`. Một Pod mới hỏng thì nó dừng lại và
chờ — mãi mãi.

Xác nhận:

```bash
kubectl rollout status deployment/first-app --timeout=20s
```

Trả về `error: timed out`. Chính dòng này là thứ phải có trong CI: rollout hỏng thì
pipeline đỏ, thay vì báo thành công rồi để đó.

Sửa — `undo` không kèm `--to-revision` là quay về **revision liền trước**:

```bash
kubectl rollout undo deployment/first-app && kubectl rollout status deployment/first-app
```

**Vì sao quan trọng:** hai điều trái trực giác. Một deploy hỏng ở K8s **không làm sập
dịch vụ** — nó chỉ không tiến lên được. Và vì `kubectl set image` trả về `updated` ngay
lập tức, pipeline nào không kiểm `rollout status` sẽ báo xanh trong khi thực tế chẳng có
gì được triển khai.

## Trạng thái bàn giao cho note sau

```bash
curl -s http://192.168.103.154:8080 | grep h1
```

Phải thấy `-- phien ban 2` trở lại. Deployment đang ở `:2`, 3 replica, lịch sử có 4–5
revision tuỳ bạn đã nghịch tới đâu. Note sau viết lại đúng trạng thái này thành YAML.

## Tự kiểm

- [ ] Nói được revision là bản chụp của **cái gì**, và nó sống ở đâu
- [ ] Giải thích được vì sao `docker build` không tạo revision mới
- [ ] Giải thích được vì sao `kubectl scale` không tạo revision mới
- [ ] Đọc được bảng revision → image trước khi rollback, thay vì đoán số
- [ ] Giải thích được vì sao sau `undo --to-revision=1` thì revision 1 biến mất
- [ ] Giải thích được vì sao image sai không làm sập dịch vụ đang chạy
- [ ] Biết lệnh nào phải có trong CI để không báo xanh giả

## Câu hỏi còn mở

- `revisionHistoryLimit: 0` thì mất gì?
- Rollback một Deployment có kéo ConfigMap và Secret về bản cũ không?
- Hai người cùng `rollout undo` một lúc thì ai thắng?
