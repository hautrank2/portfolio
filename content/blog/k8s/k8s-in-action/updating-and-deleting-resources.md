---
title: "5.19 Cập nhật & xoá resource"
description: apply lại là xong, nhưng xoá thì có bốn cách và một cái đủ sức dọn sạch cả namespace.
status: growing
created: 2026-08-25
updated: 2026-09-05
tags: [k8s, kubectl, yaml]
---

> **Nối tiếp [note 5.18](/blog/k8s/k8s-in-action/writing-a-service-file).** Đang có
> `second-app-deployment` và Service `backend`, cả hai dựng từ file trong thư mục
> `second-app`.

Có file rồi thì cập nhật là **sửa file, apply lại**. Không có lệnh riêng cho từng loại
thay đổi — đó chính là thứ bạn đổi lấy khi bỏ lối imperative.

## Bài tập 1 — diff trước, apply sau

**Đoán trước:** `kubectl diff` tính phần khác biệt ở máy bạn hay trên server?

```bash
sed -i 's/replicas: 1/replicas: 3/' deployment.yaml && kubectl diff -f deployment.yaml
```

**Kết quả:** in ra đúng phần sẽ đổi, dạng diff quen thuộc:

```diff
   spec:
-    replicas: 1
+    replicas: 3
```

Việc tính diff do **server** làm — kubectl gửi file lên với chế độ chạy thử
(`dry-run=server`), nhận về object *sẽ có*, rồi so với object *đang có*. Nghĩa là nó tính
cả những trường mà webhook hoặc controller sẽ điền thêm, chứ không phải so hai đoạn text.

Kiểm chứng: `diff` một file **không** đổi gì thì im lặng hoàn toàn.

```bash
kubectl diff -f service.yaml; echo "exit code: $?"
```

Exit code `0` nghĩa là không có gì khác. Rất đáng dùng trong CI để chặn merge khi cluster
đã trôi khỏi file.

```bash
kubectl apply -f deployment.yaml && kubectl get pods -l app=second-app
```

## Bài tập 2 — Sửa bằng tay rồi apply đè lên

**Đoán trước:** `kubectl scale --replicas=5`, rồi apply lại file đang ghi `replicas: 3`.
5 Pod đó ra sao?

```bash
kubectl scale deployment second-app-deployment --replicas=5 && kubectl get deploy second-app-deployment
```

```bash
kubectl apply -f deployment.yaml && kubectl get deploy second-app-deployment
```

**Kết quả:** tụt thẳng về 3. Không cảnh báo, không hỏi lại.

Đây là kịch bản [note 5.14](/blog/k8s/k8s-in-action/imperative-vs-declarative) mô tả, giờ
chạy thật. Và hãy để ý điều tinh tế: `apply` **không** ghi đè cả object. Nó chỉ đụng vào
những trường bạn thật sự khai trong file. Trường nào bạn không nhắc tới — như
`strategy`, hay nhãn ai đó gắn thêm bằng `kubectl label` — vẫn nguyên vẹn.

```bash
kubectl label deployment second-app-deployment nguoi-them=bang-tay
```

```bash
kubectl apply -f deployment.yaml && kubectl get deploy second-app-deployment -L nguoi-them
```

Nhãn `bang-tay` **sống sót**, trong khi `replicas` bị kéo về. Khác biệt: `replicas` có
trong file nên thuộc quyền file; nhãn kia thì không.

Server nhớ được điều này nhờ so ba bên — file bạn gửi, trạng thái đang chạy, và bản
`apply` gần nhất nó lưu lại:

```bash
kubectl get deploy second-app-deployment -o jsonpath='{.metadata.managedFields[*].manager}{"\n"}'
```

## Bốn cách xoá, xếp theo mức nguy hiểm

```bash
kubectl delete -f deployment.yaml               # ① theo file — an toàn nhất
```

```bash
kubectl delete deployment second-app-deployment # ② theo tên
```

```bash
kubectl delete deployment -l app=second-app     # ③ theo nhãn
```

```bash
kubectl delete deployment --all                 # ④ tất cả trong namespace
```

Cách ① nên là mặc định: nó xoá **đúng những gì file mô tả**, không hơn. Bạn không phải nhớ
tên, và nếu file có nhiều object thì xoá trọn bộ trong một lệnh.

Cách ④ chỉ khác cách ③ vài ký tự, và **không hỏi lại lần nào**.

## Bài tập 3 — Thử trước khi xoá thật

**Đoán trước:** có cách nào xem `delete` sẽ đụng vào cái gì mà chưa xoá không?

```bash
kubectl delete deployment --all --dry-run=client
```

**Kết quả:** in ra danh sách kèm chữ `(dry run)`, không đụng gì.

`--dry-run=client` nên thành thói quen với **mọi** lệnh `delete` có `--all` hoặc `-l`. Nó
tốn hai giây và cứu được cả buổi chiều.

Một thói quen nữa, rẻ hơn nữa: đổi `delete` thành `get` trước đã.

```bash
kubectl get deployment -l app=second-app
```

Thấy đúng danh sách mình định xoá rồi mới đổi động từ.

## Bài tập 4 — Xoá xong Pod không biến mất ngay

**Đoán trước:** `kubectl delete` trả về ngay. Pod biến mất cùng lúc đó?

```bash
kubectl delete -f deployment.yaml && kubectl get pods -l app=second-app
```

**Kết quả:** Pod còn đó, trạng thái `Terminating`, và ở lại vài chục giây.

Vì kubelet gửi `SIGTERM` cho tiến trình rồi **chờ** `terminationGracePeriodSeconds` (mặc
định **30 giây**) trước khi `SIGKILL`. Đó là khoảng thời gian app đóng nốt kết nối đang
phục vụ — cùng cơ chế tín hiệu ở
[process và signal](/blog/k8s/foundations/linux/processes-and-signals).

App Node trong bài này **không** bắt `SIGTERM`. Nên nó ăn trọn 30 giây rồi bị giết cứng,
và mọi request đang dở bị cắt ngang. "Graceful shutdown" là việc của **app**, K8s chỉ cho
bạn khoảng thời gian đó và không làm hộ.

Muốn xem tận mắt là 30 giây thật:

```bash
kubectl get deployment second-app-deployment -o jsonpath='{.spec.template.spec.terminationGracePeriodSeconds}{"\n"}' 2>/dev/null || echo "đã xoá rồi"
```

Dựng lại để đi tiếp:

```bash
kubectl apply -f deployment.yaml -f service.yaml
```

## Self-check

- [ ] Biết `kubectl diff` tính ở đâu và vì sao điều đó quan trọng
- [ ] Giải thích được vì sao `apply` kéo `replicas` về mà không xoá nhãn thêm tay
- [ ] Nói được vì sao xoá theo file an toàn hơn xoá theo tên
- [ ] Có phản xạ `--dry-run=client` trước khi xoá hàng loạt
- [ ] Giải thích được vì sao Pod ở `Terminating` đúng 30 giây, và ai chịu trách nhiệm

## Open questions

- `--grace-period=0 --force` xoá ngay — mất gì khi làm vậy?
- Object bị kẹt `Terminating` mãi thường vì `finalizers`. Đó là gì?
- Xoá Deployment thì Pod bị xoá theo — cơ chế nào làm việc đó?
