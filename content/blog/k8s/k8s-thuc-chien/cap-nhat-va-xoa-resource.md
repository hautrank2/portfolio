---
title: "Cập nhật & xoá resource"
description: apply lại là xong, nhưng xoá thì có bốn cách và một cái đủ sức xoá nhầm cả namespace.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, kubectl, yaml]
---

Có file rồi thì cập nhật là **sửa file, apply lại**. Không có lệnh riêng cho từng loại
thay đổi.

## Bài tập 1 — diff trước, apply sau

**Đoán trước:** `kubectl diff` tính phần khác biệt ở máy bạn hay trên server?

```bash
sed -i 's/replicas: 3/replicas: 4/' deployment.yaml
kubectl diff -f deployment.yaml
```

**Kết quả:** in ra đúng phần sẽ đổi, dạng diff quen thuộc:

```diff
-  replicas: 3
+  replicas: 4
```

Việc tính diff do **server** làm — kubectl gửi file lên với chế độ chạy thử
(`dry-run=server`), nhận về object *sẽ có*, rồi so với object *đang có*. Nghĩa là nó
tính cả những trường mà webhook hoặc controller sẽ điền thêm, chứ không phải so hai đoạn
text.

```bash
kubectl apply -f deployment.yaml
```

## Bốn cách xoá, xếp theo mức nguy hiểm

```bash
kubectl delete -f deployment.yaml          # ① theo file — an toàn nhất
kubectl delete deployment first-app        # ② theo tên
kubectl delete deployment -l app=first-app # ③ theo nhãn
kubectl delete deployment --all            # ④ tất cả trong namespace
```

Cách ① là cách nên dùng: nó xoá **đúng những gì file mô tả**, không hơn. Bạn không phải
nhớ tên, và nếu file có nhiều object thì xoá trọn bộ.

Cách ④ chỉ thiếu một chữ so với ③, và không hỏi lại lần nào.

## Bài tập 2 — Thử trước khi xoá thật

**Đoán trước:** có cách nào xem `delete` sẽ đụng vào cái gì mà chưa xoá không?

```bash
kubectl delete deployment --all --dry-run=client
```

**Kết quả:** in ra danh sách kèm chữ `(dry run)`, không đụng gì.

`--dry-run=client` nên thành thói quen với mọi lệnh `delete` có `--all` hoặc `-l`. Nó
tốn hai giây và cứu được cả buổi chiều.

## Bài tập 3 — Xoá xong Pod không biến mất ngay

**Đoán trước:** `kubectl delete deployment` trả về ngay. Pod biến mất cùng lúc đó?

```bash
kubectl delete deployment first-app && kubectl get pods -l app=first-app
```

**Kết quả:** Pod còn đó, trạng thái `Terminating`, và ở lại vài chục giây.

Vì kubelet gửi `SIGTERM` cho tiến trình rồi **chờ** `terminationGracePeriodSeconds`
(mặc định **30 giây**) trước khi `SIGKILL`. Đó là khoảng thời gian app đóng nốt kết nối
đang phục vụ — cùng cơ chế tín hiệu ở
[process và signal](/blog/k8s/nen-tang/linux/process-va-signal).

App không xử lý `SIGTERM` sẽ ăn trọn 30 giây rồi bị giết cứng, và mọi request đang dở bị
cắt ngang. Đó là lý do "graceful shutdown" là việc của **app**, K8s chỉ cho bạn khoảng
thời gian đó.

Dựng lại để đi tiếp:

```bash
kubectl apply -f deployment.yaml -f service.yaml
```

## Tự kiểm

- [ ] Biết `kubectl diff` tính ở đâu và vì sao điều đó quan trọng
- [ ] Nói được vì sao xoá theo file an toàn hơn xoá theo tên
- [ ] Có phản xạ `--dry-run=client` trước khi xoá hàng loạt
- [ ] Giải thích được vì sao Pod ở `Terminating` 30 giây

## Câu hỏi còn mở

- `--grace-period=0 --force` xoá ngay — mất gì khi làm vậy?
- Object bị kẹt `Terminating` mãi thường vì `finalizers`. Đó là gì?
