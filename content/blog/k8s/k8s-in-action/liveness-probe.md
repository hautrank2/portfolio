---
title: "5.22 Liveness Probe"
description: Docker chỉ biết tiến trình còn sống. Probe là cách nói cho K8s biết app còn phục vụ được.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, probe, troubleshooting]
---

[Note mở màn của phần K8s](/blog/k8s/getting-started/the-manual-deployment-problem) có một câu
bỏ ngỏ: `--restart=always` chỉ bắt được tiến trình **chết**, không bắt được app **treo**.
Đây là chỗ trả nốt món nợ đó.

## Ba loại probe

| Probe | Fail thì sao | Dùng cho |
| --- | --- | --- |
| **liveness** | kubelet **giết và chạy lại** container | App treo, deadlock |
| **readiness** | Pod bị **rút khỏi Service**, không bị giết | Chưa nạp xong cache, mất DB |
| **startup** | Hoãn hai probe kia lại cho tới khi xong | App khởi động chậm |

Khác biệt cốt lõi giữa hai cái đầu: **liveness là "giết đi cho rồi", readiness là "khoan
gửi khách tới"**. Chọn nhầm thì hậu quả ngược nhau hoàn toàn — dùng liveness cho một app
đang chờ DB sẽ khiến nó bị giết đi giết lại trong khi bản thân nó hoàn toàn lành lặn.

## Thêm vào container

```yaml
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5     # chờ app khởi động xong
            periodSeconds: 5           # kiểm mỗi 5 giây
            failureThreshold: 3        # sai 3 lần liên tiếp mới tính là hỏng
```

Ba kiểu kiểm: `httpGet` (mã 200–399 là đạt), `tcpSocket` (nối được là đạt), `exec` (lệnh
trả về 0 là đạt).

```bash
kubectl apply -f k8s/deployment.yaml && kubectl rollout status deployment/first-app
```

## Bài tập 1 — Phá cho probe fail

**Đoán trước:** xoá `index.html` trong một Pod nginx thì `/` trả về 404. Probe coi 404 là
đạt hay hỏng? Và bao lâu thì container bị khởi động lại?

```bash
POD=$(kubectl get pod -l app=first-app -o name | head -1) && kubectl exec $POD -- rm /usr/share/nginx/html/index.html
```

```bash
kubectl get pod $POD -w
```

**Kết quả:** sau khoảng **15 giây** (3 lần fail × 5 giây), `RESTARTS` nhảy lên 1 và trang
trở lại bình thường — vì container chạy lại từ image gốc, nơi `index.html` vẫn còn
nguyên.

```
NAME                         READY   STATUS    RESTARTS      AGE
first-app-6d4f8b9c7d-c7wnp   1/1     Running   1 (8s ago)    6m
```

404 **là hỏng**: chỉ 200–399 mới tính đạt. Xem bằng chứng:

```bash
kubectl describe pod $POD | grep -E "Liveness|Killing"
```

Sẽ thấy `Liveness probe failed: HTTP probe failed with statuscode: 404` rồi
`Killing container`.

**Vì sao quan trọng:** đây đúng là kịch bản Docker không xử lý được. Tiến trình nginx
chưa bao giờ chết — nó vẫn nghe cổng 80, vẫn trả lời. Chỉ là trả lời sai.
`--restart=always` sẽ không bao giờ động tay, còn liveness probe thì có.

## Bài tập 2 — Probe sai còn tệ hơn không có probe

**Đoán trước:** trỏ liveness vào một đường dẫn không tồn tại. Chỉ một Pod hỏng, hay cả
dịch vụ chết?

```bash
kubectl patch deployment first-app --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/livenessProbe/httpGet/path","value":"/khong-co-duong-nay"}]'
```

```bash
kubectl get pods -l app=first-app -w
```

**Kết quả:** **mọi** Pod rơi vào vòng `Running → restart → Running → restart`, `RESTARTS`
tăng mãi, rồi `CrashLoopBackOff`. Dịch vụ chết hoàn toàn — do chính cái probe được thêm
vào để bảo vệ nó.

Sửa lại:

```bash
kubectl patch deployment first-app --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/livenessProbe/httpGet/path","value":"/"}]'
```

Ba quy tắc rút ra:

1. Endpoint của liveness phải **rẻ và cục bộ**. Đừng kiểm DB trong đó — DB chớp một cái
   là cả đội Pod bị giết cùng lúc, biến một sự cố nhỏ thành sự cố toàn phần.
2. `initialDelaySeconds` phải **rộng hơn** thời gian khởi động chậm nhất, hoặc dùng
   `startupProbe`.
3. Thứ phụ thuộc bên ngoài thuộc về **readiness**, không phải liveness.

## Self-check

- [ ] Phân biệt được liveness và readiness bằng hậu quả khi fail
- [ ] Nói được vì sao kiểm DB trong liveness là ý tồi
- [ ] Tính được thời gian tới lúc restart từ `periodSeconds` và `failureThreshold`
- [ ] Kể được một tình huống Docker không bắt được mà probe bắt được

## Open questions

- Không khai `readinessProbe` thì Pod được coi là ready lúc nào?
- Rolling update dựa vào readiness để biết Pod mới đã ổn — vậy thiếu nó thì `rollout status` có nói dối không?
