---
title: "6.16 Tóm tắt module"
description: Một app ghi file, năm cách cất nó, và bài tập cuối để xem bạn chọn đúng cách nào.
status: growing
created: 2026-09-14
updated: 2026-09-14
tags: [k8s, volume, tong-ket]
---

Cả section xoay quanh đúng một câu: **dữ liệu bám vào cái gì, và cái đó sống được bao
lâu.** Mọi thứ còn lại là hệ quả.

## Thang độ bền

| | Bám vào | Container restart | Xoá Pod | Pod dời node |
| --- | --- | --- | --- | --- |
| Không volume | Lớp ghi container | **Mất** | Mất | Mất |
| `emptyDir` | **Pod** | Còn | **Mất** | Mất |
| `hostPath` | **Node** | Còn | Còn | **Mất** |
| PV + PVC (`local-path`) | PV, nhưng đĩa vẫn ở node | Còn | Còn | **Mất** |
| PV + PVC (NFS, EFS, Ceph) | Hệ thống lưu trữ ngoài | Còn | Còn | **Còn** |

Hai dòng cuối trông giống nhau trên cụm một node của bạn — và đó chính là cái bẫy của cả
section. Có PV, có PVC, có `Bound` đầy đủ **không đồng nghĩa** dữ liệu đã bền; nó chỉ bền
tới mức mà thứ nằm dưới cùng cho phép.

## Ba object, ba vai

```
Pod  ──►  PVC  ──►  PV  ──►  chỗ chứa thật
        (tờ đơn)  (tài nguyên       (hostPath, NFS,
         của app)  của cluster)      đĩa cloud…)
```

| | Phạm vi | Ai viết | Sống lâu bằng |
| --- | --- | --- | --- |
| PVC | Namespace | Người viết app | Tới khi bị xoá |
| PV | **Cluster** | Quản trị viên hoặc driver | Tới khi bị xoá |
| StorageClass | Cluster | Quản trị viên | — |

Giá trị lớn nhất của PV/PVC **không phải** độ bền — `hostPath` cũng sống qua việc xoá
Deployment. Nó là **tách trách nhiệm**: đổi từ thư mục trên node sang đĩa EBS chỉ cần sửa
PV, `deployment.yaml` không đụng một chữ.

## Bốn lỗi im lặng của section này

Cùng họ với `targetPort` và `selector` ở module 5 — K8s xanh hết, chỉ là không chạy:

| Lỗi | Triệu chứng |
| --- | --- |
| `mountPath` không khớp chỗ app đọc ghi | App ghi vào lớp ghi container, mất khi Pod chết |
| Đổi `hostPath.path` | Thư mục mới rỗng, dữ liệu cũ nằm nguyên chỗ cũ |
| PVC không khớp PV (class / mode / size) | PVC `Pending` vĩnh viễn, không lỗi nào |
| Sửa ConfigMap | Container giữ giá trị cũ tới khi có người restart |

Cộng thêm một lỗi **không** im lặng, dễ chịu hơn hẳn: lệch tên giữa `volumeMounts` và
`volumes` thì API server chặn ngay — vì hai đầu nằm trong cùng một object.

## Câu hỏi để chọn đúng kiểu

> **Mất cái này có dựng lại được không?**

Dựng lại được → `emptyDir`. Không dựng lại được → PVC. Hai loại state ở
[note 6.2](/blog/k8s/data-and-volumes/more-than-docker-volumes) quy về đúng câu này.

`hostPath` không nằm trong câu trả lời nào cả — nó dành cho việc **đọc thứ vốn thuộc về
node** (log, `/proc`, socket), và ở production thường bị policy chặn thẳng.

## Bài tập cuối — dựng lại từ thư mục trống

Không nhìn note, không copy file cũ.

```bash
kubectl delete namespace volume-exam --ignore-not-found && kubectl create namespace volume-exam
```

Viết tay bốn file rồi `kubectl apply -f . -n volume-exam`, sao cho đủ **sáu** điều kiện:

1. Một ConfigMap khai `folder: story`
2. Một PV `2Gi`, `hostPath: /exam-data`, `accessModes: ReadWriteOnce`
3. Một PVC đòi `1Gi`, ghép được với PV đó
4. Deployment `replicas: 1`, image `hautrank2/kub-data-app:2`, `imagePullPolicy: IfNotPresent`
5. `STORY_FOLDER` lấy từ ConfigMap, và `mountPath` **khớp** với giá trị đó
6. Service `LoadBalancer` cổng 3000

Tự chấm:

```bash
kubectl get pvc,pv -n volume-exam
```

```bash
kubectl exec deploy/story -n volume-exam -- printenv STORY_FOLDER
```

```bash
IP=$(kubectl get svc -n volume-exam -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}') && curl -s -X POST -H 'Content-Type: application/json' -d '{"text":"bai tap cuoi"}' http://$IP:3000/story && kubectl delete pod -n volume-exam -l app=story && sleep 10 && curl -s http://$IP:3000/story
```

Ba lệnh phải ra: PVC `Bound`, biến đúng giá trị, và dòng `bai tap cuoi` **sống sót** qua
lần xoá Pod.

**Đoán trước khi apply:** file của bạn hỏng ở đâu? Hai chỗ phổ biến nhất là PVC đòi
`storageClassName` mà PV không có (`Pending` im lặng), và `mountPath` quên đi theo
`STORY_FOLDER` (`500 Failed to open file.`).

Dọn:

```bash
kubectl delete namespace volume-exam && sudo rm -rf /exam-data
```

## Vượt chặng khi

Viết được đủ bốn file từ đầu, và **giải thích được vì sao PVC `Pending`** chỉ bằng cách
nhìn vào PV — không cần `describe`.

## Còn nợ lại cho module sau

| Câu hỏi bỏ ngỏ | Trả lời ở |
| --- | --- |
| Nhiều Pod trên nhiều node cùng ghi một chỗ | Section 5 — storage chia sẻ trên cloud |
| Mỗi Pod cần một volume riêng, ổn định qua restart | StatefulSet (ngoài khoá) |
| Hai app gọi nhau bằng tên, không bằng IP | [Section 4 — Networking](/blog/k8s/networking) |
| Cấu hình đổi mà app tự nhận | Ngoài khoá — reloader, hoặc app tự watch |

## Self-check

- [ ] Đọc thuộc thang độ bền, và nói được mỗi bậc hỏng ở đâu
- [ ] Vẽ được chuỗi Pod → PVC → PV → chỗ chứa thật
- [ ] Kể được bốn lỗi im lặng và triệu chứng từng cái
- [ ] Làm xong bài tập cuối, không mở note nào
- [ ] Giải thích được vì sao "có PVC" chưa chắc là "dữ liệu đã bền"

## Open questions

- Backup một PVC làm thế nào, và khôi phục vào cụm khác được không?
- Nếu `local-path` dính node, vì sao k3s vẫn đặt nó làm StorageClass mặc định?
