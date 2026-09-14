---
title: "5.20 Nhiều file hay một file cấu hình"
description: Dấu --- gộp mọi thứ vào một file. Câu hỏi thật không phải gộp hay tách, mà là xoá bằng gì.
status: growing
created: 2026-08-25
updated: 2026-09-05
tags: [k8s, yaml]
---

> **Nối tiếp [note 5.19](/blog/k8s/k8s-in-action/updating-and-deleting-resources).** Trong thư
> mục `second-app` đang có `deployment.yaml` và `service.yaml`, cả hai đã apply.

Hai file là đủ để đặt ra câu hỏi tổ chức. Gộp được thành một, bằng dấu `---`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: second-app-deployment
# ...
---
apiVersion: v1
kind: Service
metadata:
  name: backend
# ...
```

Đó là cú pháp của **chính YAML**, không phải của K8s: một file, nhiều document. Cùng dấu
đó dùng được ở bất kỳ đâu YAML xuất hiện.

## Bài tập 1 — Thứ tự trong file có quan trọng không

**Đoán trước:** đặt Service **trước** Deployment trong cùng một file. Service được tạo khi
chưa có Pod nào để trỏ tới — có lỗi không?

```bash
{ cat service.yaml; echo '---'; cat deployment.yaml; } > master.yaml
```

```bash
kubectl delete -f deployment.yaml -f service.yaml
```

```bash
kubectl apply -f master.yaml && kubectl get svc backend -o jsonpath='{.spec.selector}{"\n"}'
```

**Kết quả:** không lỗi. Service tạo xong nằm đó với danh sách endpoint rỗng, vài giây sau
Pod lên và nó tự đầy.

```bash
kubectl get endpointslice -l kubernetes.io/service-name=backend
```

Vì mọi object đều **độc lập** — không object nào cần object khác tồn tại trước. Đây lại là
hệ quả của ghép lỏng bằng label: Service không tham chiếu tới Deployment, nó chỉ đặt ra
một điều kiện rồi chờ ai đó thoả mãn. Chờ mãi cũng không sao, không có timeout nào.

Hai ngoại lệ đáng nhớ, và cả hai đều là quan hệ **chứa**, không phải quan hệ trỏ:

| Phải có trước | Vì |
| --- | --- |
| `Namespace` | Object nằm *bên trong* nó |
| `CustomResourceDefinition` | Không có CRD thì api-server không biết `kind` đó là gì |

`kubectl apply` xử lý theo đúng thứ tự trong file, nên gặp hai trường hợp đó thì xếp cho
đúng — hoặc apply hai lần, lần hai sẽ ăn.

## Bài tập 2 — Apply cả thư mục

**Đoán trước:** `kubectl apply -f .` có đọc cả file YAML nằm trong thư mục con không?

```bash
mkdir -p k8s && cp deployment.yaml service.yaml k8s/ && mkdir -p k8s/them && cp service.yaml k8s/them/
```

```bash
kubectl apply -f k8s/ --dry-run=client
```

```bash
kubectl apply -f k8s/ -R --dry-run=client
```

**Kết quả:** mặc định **không** đệ quy. Lệnh đầu thấy 2 object, lệnh sau thấy 3. Muốn vào
thư mục con phải thêm `-R`.

Nhiều người xếp file theo thư mục con rồi thắc mắc sao thiếu object — nguyên nhân là đúng
một chữ cái đó, và nó **không** báo lỗi, chỉ lặng lẽ bỏ qua.

```bash
rm -rf k8s/them
```

## Gộp hay tách

| | Một file | Nhiều file |
| --- | --- | --- |
| Xoá trọn bộ | `delete -f master.yaml` — một lệnh | phải liệt kê hết |
| Đọc diff trong PR | rối, một file dài | rõ, đúng file bị đụng |
| Sửa một object | mở file lớn, tìm | mở đúng file nhỏ |
| Đảo thứ tự khi cần | dễ | phải nhớ thứ tự lúc apply |
| Xung đột khi hai người cùng sửa | cao | thấp |

Thực tế hay dùng: **một thư mục cho một app, một file cho một object**, rồi
`kubectl apply -f k8s/`. Được cái tiện của cả hai — vẫn xoá trọn bộ bằng
`kubectl delete -f k8s/`, mà diff trong pull request vẫn đọc được.

Ngoại lệ đáng giữ: những object **luôn đi cùng nhau và chỉ có nghĩa cùng nhau** — như một
Deployment và Service của đúng nó — thì gộp một file cũng hợp lý. Cái đáng tránh là file
900 dòng chứa cả hệ thống.

## Bài tập 3 — Xoá theo file thì xoá được bao nhiêu

**Đoán trước:** `kubectl delete -f master.yaml` xoá cả Deployment lẫn Service, hay chỉ
object đầu tiên?

```bash
kubectl delete -f master.yaml && kubectl get deploy,svc -l app=second-app
```

**Kết quả:** xoá sạch cả hai, đúng một lệnh — kể cả khi thứ tự trong file là ngược.

Đây là lợi ích thật sự của việc giữ file khớp với thực tế: **file vừa là thứ tạo ra, vừa
là danh sách để dọn.** Object nào bạn lỡ tạo bằng tay ngoài file thì không nằm trong danh
sách đó, và sẽ ở lại — như Pod `ke-la` từng ở lại.

Thử với thư mục:

```bash
kubectl apply -f k8s/ && kubectl get deploy,svc -l app=second-app
```

```bash
kubectl delete -f k8s/ && kubectl get deploy,svc -l app=second-app
```

Dựng lại rồi đi tiếp:

```bash
kubectl apply -f k8s/
```

## Self-check

- [ ] Biết `---` là cú pháp của YAML chứ không phải của K8s
- [ ] Giải thích được vì sao thứ tự object thường không quan trọng, và hai ngoại lệ
- [ ] Nhớ `-R` khi có thư mục con, và biết nó im lặng khi thiếu
- [ ] Chọn được cách tổ chức file và nói được lý do
- [ ] Nói được vì sao object tạo ngoài file lại là nợ kỹ thuật

## Open questions

- Kustomize giải bài toán này thế nào so với xếp thư mục bằng tay?
- `kubectl apply -f https://...` được — rủi ro ở đâu?
- Xoá một object khỏi file rồi `apply` lại: object cũ có bị xoá khỏi cluster không?
