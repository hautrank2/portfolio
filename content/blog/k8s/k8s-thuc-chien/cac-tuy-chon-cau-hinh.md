---
title: "5.23 Nhìn kỹ các tuỳ chọn cấu hình"
description: Bốn nhóm trường còn lại, và hai con số quyết định Pod của bạn bị đối xử ra sao khi node hết chỗ.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, yaml, resources]
---

Note gom những trường hay dùng mà chưa có chỗ nào nhắc. Không cần thuộc — cần biết chúng
tồn tại, để lúc gặp thì tra bằng `kubectl explain`.

## `resources` — hai con số quan trọng nhất trong cả file

```yaml
          resources:
            requests:              # dùng để CHỌN NODE
              memory: "64Mi"
              cpu: "50m"
            limits:                # trần cứng lúc CHẠY
              memory: "128Mi"
              cpu: "200m"
```

Hai chữ này khác nhau về **bản chất**, không phải về mức độ:

| | `requests` | `limits` |
| --- | --- | --- |
| Ai đọc | **scheduler**, lúc chọn node | **cgroup của kernel**, lúc chạy |
| Vượt thì sao | không có khái niệm vượt | CPU bị **bóp**, RAM bị **giết** |

`50m` là **năm phần trăm** một core. `Mi` là mebibyte (1024²), khác `M` (10⁶) — khai
nhầm là lệch 5%.

## Bài tập 1 — Vượt limit bộ nhớ

**Đoán trước:** container vượt `limits.memory` thì bị bóp lại như CPU, hay bị giết?

Tới đây thì viết file, đừng dùng `kubectl run` — cờ `--limits` của nó đã bị gỡ khỏi
kubectl đời mới.

```yaml
# an-ram.yaml
apiVersion: v1
kind: Pod
metadata:
  name: an-ram
spec:
  restartPolicy: Never
  containers:
    - name: an-ram
      image: busybox:1.36
      command: ["sh", "-c", "dd if=/dev/zero of=/dev/shm/x bs=1M count=200"]
      resources:
        limits:
          memory: "64Mi"
```

```bash
kubectl apply -f an-ram.yaml && sleep 12 && kubectl describe pod an-ram | grep -E "Reason|Exit Code"
```

**Kết quả:** `Reason: OOMKilled`, `Exit Code: 137`.

Khác biệt phải nhớ: **CPU co giãn được, bộ nhớ thì không.** Vượt CPU limit thì tiến trình
chỉ chạy chậm lại. Vượt memory limit thì kernel giết ngay, không thương lượng. Và
137 = 128 + 9 chính là `SIGKILL`, đúng bảng exit code ở
[Container restart lúc nào](/blog/k8s/k8s-thuc-chien/restart-container).

```bash
kubectl delete -f an-ram.yaml && rm an-ram.yaml
```

## Bài tập 2 — Không khai gì thì Pod xếp hạng bét

**Đoán trước:** Pod không khai `resources` được ưu tiên thế nào khi node hết RAM?

```bash
kubectl get pod -l app=first-app -o jsonpath='{.items[0].status.qosClass}{"\n"}'
```

**Kết quả:** `BestEffort` — hạng thấp nhất trong ba hạng QoS:

| Hạng | Khi nào | Bị đuổi thứ mấy |
| --- | --- | --- |
| `Guaranteed` | requests **bằng** limits, khai đủ cả hai | cuối cùng |
| `Burstable` | có khai, nhưng không bằng nhau | thứ hai |
| `BestEffort` | **không khai gì** | **đầu tiên** |

Nên "không khai resources" không phải là trung lập. Nó là **tự nguyện xếp cuối hàng**:
node hết RAM thì Pod của bạn bị đuổi trước tiên.

## `env` — và cách Pod tự biết mình là ai

```yaml
          env:
            - name: LOG_LEVEL
              value: "debug"
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
```

`fieldRef` cho container biết tên Pod, namespace, IP node của chính nó mà không cần gọi
API — cùng ý tưởng với `$HOSTNAME` đã dùng ở
[Scaling trong thực tế](/blog/k8s/k8s-thuc-chien/scaling), nhưng lấy được nhiều trường
hơn.

## `imagePullPolicy`

Mặc định là `IfNotPresent`, **trừ khi** tag là `:latest` thì mặc định thành `Always`.
Một cái bẫy nữa của tag di động, cộng vào cái đã nói ở
[Cập nhật Deployment](/blog/k8s/k8s-thuc-chien/cap-nhat-deployment).

## `strategy`

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0        # không bao giờ tụt dưới replicas
```

`maxUnavailable: 0` đáng dùng cho dịch vụ quan trọng — nhưng **bắt buộc** phải có
readiness probe đúng, nếu không rollout kẹt vĩnh viễn vì không bao giờ đủ Pod "sẵn sàng"
để hạ Pod cũ xuống.

`type: Recreate` thì giết sạch rồi mới dựng: có downtime, nhưng cần khi hai phiên bản
tuyệt đối không được chạy cùng lúc — ví dụ bản mới migrate schema DB theo cách bản cũ
không đọc nổi.

## Tự kiểm

- [ ] Nói được `requests` và `limits` do ai đọc, ở thời điểm nào
- [ ] Giải thích được vì sao vượt CPU thì chậm còn vượt RAM thì chết
- [ ] Biết hạng QoS của một Pod không khai gì, và hậu quả
- [ ] Nói được vì sao `maxUnavailable: 0` bắt buộc phải đi kèm readiness probe

## Câu hỏi còn mở

- `LimitRange` áp mặc định cho cả namespace — nó đè lên spec của bạn hay bị đè?
- CPU limit gây bóp ngay cả khi node đang rảnh. Vậy có nên bỏ hẳn CPU limit không?
