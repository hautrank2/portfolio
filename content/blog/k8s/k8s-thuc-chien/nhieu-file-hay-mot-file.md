---
title: "Nhiều file hay một file cấu hình"
description: Dấu `---` gộp mọi thứ vào một file. Câu hỏi thật không phải gộp hay tách, mà là xoá bằng gì.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, yaml]
---

Bạn đang có `deployment.yaml` và `service.yaml`. Gộp được thành một, bằng dấu `---`:

```yaml
apiVersion: apps/v1
kind: Deployment
# ...
---
apiVersion: v1
kind: Service
# ...
```

Đó là cú pháp của **chính YAML**, không phải của K8s: một file, nhiều document.

## Bài tập 1 — Thứ tự trong file có quan trọng không

**Đoán trước:** đặt Service **trước** Deployment trong cùng một file. Service sẽ được
tạo khi chưa có Pod nào để trỏ tới — có lỗi không?

```bash
{ cat service.yaml; echo '---'; cat deployment.yaml; } > all.yaml
kubectl delete -f deployment.yaml -f service.yaml
kubectl apply -f all.yaml
```

**Kết quả:** không lỗi. Service tạo xong nằm đó với danh sách endpoint rỗng, vài giây sau
Pod lên và nó tự đầy.

Vì mọi object đều **độc lập** — không object nào cần object khác tồn tại trước. Đây lại
là hệ quả của ghép lỏng bằng label: Service không tham chiếu tới Deployment, nó chỉ đặt
ra một điều kiện và chờ ai đó thoả mãn.

Ngoại lệ hiếm: Namespace phải có trước object nằm trong nó, và CRD phải có trước object
thuộc loại đó. `kubectl apply` xử lý theo thứ tự trong file nên gặp mấy trường hợp đó thì
xếp cho đúng.

## Bài tập 2 — Apply cả thư mục

**Đoán trước:** `kubectl apply -f .` có đọc cả file YAML nằm trong thư mục con không?

```bash
mkdir -p k8s && cp deployment.yaml service.yaml k8s/ && kubectl apply -f k8s/
kubectl apply -f k8s/ -R
```

**Kết quả:** mặc định **không** đệ quy. Muốn vào thư mục con phải thêm `-R`. Nhiều
người xếp file theo thư mục con rồi thắc mắc sao thiếu object — nguyên nhân là chữ đó.

## Gộp hay tách

| | Một file | Nhiều file |
| --- | --- | --- |
| Xoá trọn bộ | `delete -f all.yaml` — dễ | phải liệt kê hết |
| Đọc diff trong PR | rối, một file dài | rõ, đúng file bị đụng |
| Sửa một object | mở file lớn | mở đúng file nhỏ |
| Đảo thứ tự khi cần | dễ | phải nhớ thứ tự lúc apply |

Thực tế hay dùng: **một thư mục cho một app, một file cho một object**, rồi
`kubectl apply -f k8s/`. Được cái tiện của cả hai — vẫn xoá trọn bộ bằng
`kubectl delete -f k8s/`, mà diff trong pull request vẫn đọc được.

Ngoại lệ đáng giữ: những object **luôn đi cùng nhau và chỉ có nghĩa cùng nhau** — như
một Deployment và Service của đúng nó — thì gộp một file cũng hợp lý. Cái đáng tránh là
file 900 dòng chứa cả hệ thống.

## Bài tập 3 — Xoá theo file thì xoá được bao nhiêu

**Đoán trước:** `kubectl delete -f all.yaml` xoá cả Deployment lẫn Service, hay chỉ
object đầu tiên?

```bash
kubectl delete -f all.yaml && kubectl get deploy,svc -l app=first-app
```

**Kết quả:** xoá sạch cả hai, đúng một lệnh. Đây là lợi ích thật sự của việc giữ file
khớp với thực tế: file vừa là thứ tạo ra, vừa là **danh sách để dọn**.

Dựng lại rồi đi tiếp:

```bash
kubectl apply -f k8s/
```

## Tự kiểm

- [ ] Biết `---` là cú pháp của YAML chứ không phải của K8s
- [ ] Giải thích được vì sao thứ tự object thường không quan trọng, và hai ngoại lệ
- [ ] Nhớ `-R` khi có thư mục con
- [ ] Chọn được cách tổ chức file và nói được lý do

## Câu hỏi còn mở

- Kustomize giải bài toán này thế nào so với việc xếp thư mục bằng tay?
- `kubectl apply -f https://...` được — rủi ro ở đâu?
