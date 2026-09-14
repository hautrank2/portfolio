---
title: "6.15 Biến môi trường & ConfigMap"
description: "Tách giá trị ra khỏi deployment — và cái bẫy lớn nhất: sửa ConfigMap không làm app đổi theo."
status: growing
created: 2026-09-14
updated: 2026-09-14
tags: [k8s, configmap, secret, configuration]
---

> Tiếp [6.14](/blog/k8s/data-and-volumes/environment-variables). Cần image `:2` đã đọc
> `process.env.STORY_FOLDER`.

`env` gỡ giá trị ra khỏi code, nhưng nó vẫn nằm cứng trong `deployment.yaml`. **ConfigMap**
gỡ nốt bước cuối: giá trị thành một object riêng, nhiều app cùng dùng, sửa mà không đụng
tới file deployment.

## Tạo ConfigMap

`environment.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: data-store-env
data:
  folder: 'story'
```

```bash
kubectl apply -f environment.yaml && kubectl get configmap data-store-env -o yaml | grep -A2 "^data:"
```

`data` là một map phẳng gồm các cặp chữ-với-chữ. Một ConfigMap chứa được nhiều khoá — đây
mới có một.

## Trỏ `env` vào ConfigMap

```yaml
          env:
            - name: STORY_FOLDER
              valueFrom:
                configMapKeyRef:
                  name: data-store-env
                  key: folder
```

`value` đổi thành `valueFrom`. Tên biến trong container vẫn là `STORY_FOLDER` — app không
biết gì về ConfigMap, và đó là chủ ý.

```bash
kubectl apply -f deployment.yaml && kubectl rollout status deployment story
```

```bash
kubectl exec deploy/story -- printenv STORY_FOLDER
```

## Lấy cả ConfigMap thay vì từng khoá

Nhiều khoá thì khai từng cái rất dài. Dùng `envFrom`:

```yaml
          envFrom:
            - configMapRef:
                name: data-store-env
```

Mọi khoá thành biến môi trường cùng tên — `folder` thành biến `folder`, không phải
`STORY_FOLDER`. Tiện nhưng **mất kiểm soát**: thêm một khoá vào ConfigMap là tự động có
thêm một biến trong mọi container dùng nó, kể cả khi bạn không định vậy. Với app này thì
`configMapKeyRef` rõ ràng hơn, vì tên khoá và tên biến khác nhau.

## Bài tập — Sửa ConfigMap, app có đổi không

Đây là cái bẫy lớn nhất của ConfigMap, và ai cũng dính đúng một lần.

**Đoán trước:** đổi `folder` thành `story-data` trong ConfigMap rồi apply. App đang chạy sẽ
đọc giá trị mới, hay giữ giá trị cũ?

```bash
sed -i "s/folder: 'story'/folder: 'story-data'/" environment.yaml && kubectl apply -f environment.yaml
```

```bash
kubectl get configmap data-store-env -o jsonpath='{.data.folder}{"\n"}'; kubectl exec deploy/story -- printenv STORY_FOLDER
```

**Kết quả:** ConfigMap đã là `story-data`, nhưng trong container vẫn là `story`.

Biến môi trường được **nạp một lần duy nhất, lúc container khởi động**. Sửa ConfigMap
không đụng gì tới container đang chạy, và **K8s không tự restart chúng**. Không cảnh báo,
không event, không gì cả — cấu hình và thực tế lệch nhau trong im lặng.

Muốn áp thì phải tự ép:

```bash
kubectl rollout restart deployment story && kubectl rollout status deployment story
```

```bash
kubectl exec deploy/story -- printenv STORY_FOLDER
```

Giờ mới là `story-data`. Trả lại cho khớp `mountPath`:

```bash
sed -i "s/folder: 'story-data'/folder: 'story'/" environment.yaml && kubectl apply -f environment.yaml && kubectl rollout restart deployment story
```

> Mount ConfigMap **dưới dạng volume** thì file trong container **có** tự cập nhật (sau
> khoảng một phút). Nhưng app phải tự đọc lại file — hầu hết app không làm thế. Nên câu
> "đổi ConfigMap là xong" gần như luôn sai, dù là `env` hay volume.

## Còn Secret

Khoá học dừng ở ConfigMap. Nhưng hai thứ này luôn đi cặp, nên biết luôn:

```bash
kubectl create secret generic demo --from-literal=pw=s3cret
```

```bash
kubectl get secret demo -o jsonpath='{.data.pw}' | base64 -d; echo
```

Ra nguyên văn `s3cret`. **Secret chỉ là base64, không phải mã hoá.** Ai đọc được Secret
trong cụm thì đọc được mật khẩu.

| | ConfigMap | Secret |
| --- | --- | --- |
| Nội dung | Chữ thường | base64 (**không phải mã hoá**) |
| Dùng cho | URL, cờ bật tắt, tên thư mục | Mật khẩu, token, chứng chỉ |
| Cú pháp trong `env` | `configMapKeyRef` | `secretKeyRef` |
| Hiện trong `kubectl describe pod` | **Có, cả giá trị** | Chỉ hiện tên khoá |

Dòng cuối là lý do thực dụng nhất để dùng Secret dù nó không mã hoá: giá trị không rơi ra
trong output của `describe` hay log. Muốn mã hoá thật thì phải bật `EncryptionConfiguration`
ở apiserver, hoặc dùng Sealed Secrets / External Secrets.

```bash
kubectl delete secret demo
```

## Self-check

- [ ] Tạo được ConfigMap và trỏ `env` vào nó
- [ ] Nói được `configMapKeyRef` khác `envFrom` chỗ nào, và khi nào dùng cái nào
- [ ] Giải thích được vì sao sửa ConfigMap không làm app đổi theo
- [ ] Biết cách ép áp dụng cấu hình mới
- [ ] Nói được Secret khác ConfigMap ở chỗ nào — và **không** khác ở chỗ nào

## Open questions

- Làm sao để app tự restart khi ConfigMap đổi? (gợi ý: annotation chứa hash của ConfigMap)
- Xoá một ConfigMap đang được Pod dùng thì Pod đang chạy có sao không?
