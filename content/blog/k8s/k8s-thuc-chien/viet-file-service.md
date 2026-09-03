---
title: "5.18 Viết Service bằng YAML"
description: Service YAML ngắn hơn Deployment, và có đúng một chỗ dễ sai — cùng chỗ đã sai bằng lệnh.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, yaml, service]
---

Nốt nửa còn lại: thay Service tạo bằng `kubectl expose` bằng một file.

```bash
kubectl delete svc first-app
```

## File

```yaml
apiVersion: v1               # Service ở nhóm lõi, KHÔNG phải apps/v1
kind: Service
metadata:
  name: first-app
spec:
  type: NodePort
  selector:                  # phẳng, không có matchLabels như Deployment
    app: first-app
  ports:
    - protocol: TCP
      port: 80               # cổng trên ClusterIP
      targetPort: 80         # cổng trên container
      nodePort: 30080        # cổng trên mọi node — bỏ trống thì K8s tự cấp
```

Lưu `service.yaml`, rồi:

```bash
kubectl apply -f service.yaml && kubectl get svc first-app
```

## Hai khác biệt so với Deployment, nhớ kỹ

| | Deployment | Service |
| --- | --- | --- |
| `apiVersion` | `apps/v1` | `v1` |
| Selector | `selector.matchLabels.app` | `selector.app` (phẳng hơn một tầng) |

Hai chỗ này gây lỗi cú pháp nhiều nhất khi viết tay, vì trực giác bảo chúng phải giống
nhau. Không giống — Service ra đời trước, từ thời API chưa có dạng `matchLabels`.

## Bài tập 1 — Selector sai thì im lặng, sai kiểu khác

**Đoán trước:** note trước đã thấy sai `targetPort` thì không có lỗi nào. Sai `selector`
thì sao — có lỗi không, và triệu chứng khác chỗ nào?

```bash
sed 's/^    app: first-app$/    app: khong-ai-mang-nhan-nay/' service.yaml | kubectl apply -f -
kubectl get endpointslice -l kubernetes.io/service-name=first-app
curl -s -m 3 -o /dev/null -w '%{http_code}\n' localhost:30080 || echo "khong ket noi duoc"
```

**Kết quả:** vẫn không lỗi nào, Service vẫn `Running`. Nhưng lần này **không có
EndpointSlice nào**, hoặc danh sách địa chỉ rỗng.

Đó là cách phân biệt hai lỗi im lặng, và nên thuộc:

| Triệu chứng | Nguyên nhân |
| --- | --- |
| Có endpoint, **không** kết nối được | Sai `targetPort` |
| **Không** có endpoint nào | Sai `selector` |
| Có endpoint, kết nối được, sai nội dung | Selector bắt nhầm Pod của app khác |

Trả lại:

```bash
kubectl apply -f service.yaml && curl -s -o /dev/null -w '%{http_code}\n' localhost:30080
```

## Bài tập 2 — `targetPort` khai bằng tên

**Đoán trước:** có cách nào viết Service mà **không** cần biết container nghe cổng nào
không?

Thêm tên cổng vào container trong `deployment.yaml`:

```yaml
          ports:
            - name: http
              containerPort: 80
```

Rồi trong `service.yaml` trỏ bằng tên:

```yaml
      targetPort: http
```

```bash
kubectl apply -f deployment.yaml -f service.yaml && curl -s -o /dev/null -w '%{http_code}\n' localhost:30080
```

**Kết quả:** chạy y như cũ. Nhưng giờ Service **không còn phụ thuộc vào con số** — app
đổi từ 80 sang 8080 thì chỉ sửa `deployment.yaml`, Service giữ nguyên.

**Vì sao quan trọng:** đây là cách xoá hẳn lỗi `targetPort` sai ra khỏi đời bạn. Con số
chỉ khai đúng **một chỗ**, ở nơi biết rõ sự thật nhất — chính cái container đó.

Lưu ý `containerPort` bản thân nó **không mở cổng gì cả**; nó thuần tuý là tài liệu, và
là chỗ để đặt cái tên. Container vẫn nghe cổng nào là do app quyết.

## Tự kiểm

- [ ] Viết được Service YAML từ đầu, nhớ đúng `v1` và selector phẳng
- [ ] Phân biệt được ba triệu chứng ở bảng trên chỉ bằng `get endpointslice`
- [ ] Dùng `targetPort` dạng tên
- [ ] Nói được `containerPort` thật ra làm gì

## Câu hỏi còn mở

- Một Service khai nhiều cổng thì `name` của từng cổng có bắt buộc không?
- `nodePort` khai cứng 30080 — chuyện gì xảy ra nếu Service khác đã chiếm nó?
