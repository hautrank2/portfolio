---
title: "Tóm tắt module"
description: Bài kiểm tra thật của module này không phải đọc lại, mà là dựng lại toàn bộ từ một thư mục trống.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, tong-ket]
---

Module lớn nhất khoá kết thúc ở đây. Đừng đọc lại 22 note — làm bài tập cuối là biết
ngay mình thủng chỗ nào.

## Bản đồ những gì đã đi qua

```
Object  ──►  Deployment  ──►  Service        (khái niệm)
                 │               │
            imperative      kubectl expose   (làm bằng lệnh)
                 │               │
              scale, set image, rollback
                 │
                 ▼
            declarative: apply -f            (làm bằng file)
                 │
        label ── selector ── probe ── resources
```

Một câu cho cả module: **bạn không ra lệnh, bạn khai báo — và mọi thứ nối với nhau bằng
label, không bằng tên.**

## Năm điều nếu chỉ được nhớ năm

| | |
| --- | --- |
| **Pod là bất biến** | Không sửa Pod. Đổi gì cũng là tạo Pod mới, tên mới, IP mới |
| **Label là sợi dây duy nhất** | Không có khoá ngoại. Sai một chữ là đứt, và không ai báo |
| **`apply` idempotent, `create` thì không** | Đó là toàn bộ khác biệt imperative/declarative |
| **Lỗi im lặng nguy hơn lỗi ồn ào** | Sai `targetPort`, sai `selector`: mọi thứ xanh, chỉ là không chạy |
| **Deploy hỏng ≠ dịch vụ sập** | Rollout kẹt, Pod cũ vẫn phục vụ. Phải `rollout status` mới biết |

## Ba bảng đáng chép ra giấy dán lên tường

**Pod kẹt ở đâu → đi hỏi ai**

| Trạng thái | Ai đang bận | Kẹt nghĩa là |
| --- | --- | --- |
| `Pending` | scheduler | Không node nào đủ chỗ |
| `ContainerCreating` | kubelet | Kéo image hỏng, sai tên, thiếu quyền |
| `CrashLoopBackOff` | — | App tự chết. Đọc `logs --previous` |
| `Running` nhưng `0/1` | probe | Readiness chưa đạt |

**Service không gọi được → vì sao**

| Triệu chứng | Nguyên nhân |
| --- | --- |
| Có endpoint, không kết nối được | Sai `targetPort` |
| Không có endpoint nào | Sai `selector` |
| Kết nối được, nội dung sai | Selector bắt nhầm Pod app khác |

**Exit code**

| Mã | Nghĩa |
| --- | --- |
| 0 | Tiến trình chính thoát bình thường — thường là sai `command` |
| 1 | App tự lỗi. Đọc log |
| 137 | `SIGKILL` — OOMKilled hoặc hết hạn grace period |

## Bài tập cuối — dựng lại từ thư mục trống

Đây là bài kiểm tra thật. **Không nhìn note, không copy file cũ.**

```bash
kubectl delete namespace kiem-tra --ignore-not-found && kubectl create namespace kiem-tra
```

Trong một thư mục mới, viết tay ba file rồi `kubectl apply -f . -n kiem-tra`, sao cho
đạt đủ **bảy** điều kiện:

1. Một Deployment tên `web`, **3 replica**, image `nginx:1.27-alpine`
2. Container khai cổng có **tên** `http`
3. Có `livenessProbe` kiểu `httpGet` trỏ `/`, kiểm mỗi 10 giây
4. Có `resources.requests` cho cả cpu và memory
5. Một Service kiểu `NodePort` trỏ `targetPort` **bằng tên**, không bằng số
6. Nhãn theo quy ước `app.kubernetes.io/name`
7. `maxUnavailable: 0` trong strategy

Tự chấm:

```bash
kubectl get all -n kiem-tra
```

```bash
kubectl get endpointslice -n kiem-tra -o jsonpath='{.items[0].endpoints[*].addresses}{"\n"}'
```

```bash
PORT=$(kubectl get svc -n kiem-tra -o jsonpath='{.items[0].spec.ports[0].nodePort}') && for i in $(seq 5); do curl -s -o /dev/null -w '%{http_code} ' localhost:$PORT; done; echo
```

Ba dòng phải ra: 3 Pod `Running`, 3 địa chỉ endpoint, và năm mã `200`.

**Đoán trước khi apply:** file của bạn sẽ hỏng ở lần thứ mấy? Chỗ hỏng thường gặp là
`selector` không khớp `template.labels` (K8s bắt được, báo lỗi rõ), và `targetPort` tên
không khớp tên cổng đã khai (K8s **không** bắt được, chỉ là không kết nối nổi).

Dọn:

```bash
kubectl delete namespace kiem-tra
```

## Vượt chặng khi

[Index của module](/blog/k8s/k8s-thuc-chien) đặt tiêu chuẩn: viết được Deployment +
Service từ đầu không copy, và giải thích được vì sao `selector.matchLabels` phải khớp
`template.metadata.labels`.

Bảy điều kiện ở trên là bản khó hơn của đúng tiêu chuẩn đó. Làm xong không cần mở note
nào là qua.

## Còn nợ lại cho các module sau

| Câu hỏi bỏ ngỏ | Module trả lời |
| --- | --- |
| File Pod ghi ra bị mất khi restart | Section 3 — Dữ liệu & Volume |
| Cấu hình nhét cứng trong YAML | ConfigMap & Secret, cuối Section 3 |
| Service không định tuyến được theo path | Section 4 — Networking |
| Cụm chỉ có một node, không LoadBalancer thật | Section 5 — Deploy lên cloud |

## Tự kiểm

- [ ] Làm xong bài tập cuối, không mở note nào
- [ ] Thuộc ba bảng chẩn đoán, hoặc biết chúng nằm ở đâu
- [ ] Giải thích được cả năm điều ở bảng "nếu chỉ được nhớ năm"

## Câu hỏi còn mở

- Ba file YAML này lặp lại y hệt cho dev/staging/prod. Kustomize hay Helm giải ra sao?
- Bao nhiêu thứ trong module này thì Operator tự làm được, và lúc nào đáng viết một cái?
