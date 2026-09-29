---
title: "8.12 Dùng EFS Volume"
description: "Chạy lại đúng hai bài tập đã làm hỏng ở 8.9 — lần này có EFS, và cả hai đều qua."
status: growing
created: 2026-09-25
updated: 2026-09-29
tags: [k8s, aws, efs, pvc, node, scaling]
---

> Tiếp [8.11](/blog/k8s/deploy-to-cloud/persistent-volume-for-efs). PV và PVC đã `Bound`,
> `cafe-menu-deployment` đã mount `cafe-menu-images-pvc` vào `/app/data/images`.

Note này không thêm cấu hình mới. Nó chạy lại **đúng hai bài tập đã thất bại ở
[8.9](/blog/k8s/deploy-to-cloud/getting-started-with-volumes)**, và cho bạn thấy khác biệt
duy nhất là storage giờ nằm ngoài node.

## 1. Upload lại một tấm ảnh

Mở trang quản trị, thêm một món kèm ảnh. Rồi xem file đã nằm trên EFS chưa:

```bash
kubectl exec deploy/cafe-menu-deployment -- ls -la /app/data/images
```

```bash
kubectl exec deploy/cafe-menu-deployment -- wget -qO- http://localhost:3000/menu/health
```

Route `health` trả về tên Pod và số file nó nhìn thấy — hai thông tin vừa đủ để làm phép
đo cho cả note này:

```json
{ "status": "ok", "pod": "cafe-menu-deployment-7d9c6b8f4-x2kqp", "images": 1 }
```

## 2. Bài tập — Xoá Pod, ảnh còn không?

**Đoán trước:** ở 8.9, xoá Pod là ảnh về `0`. Lần này thì sao?

```bash
kubectl delete pod -l app=menu && kubectl rollout status deployment cafe-menu-deployment --timeout=180s
```

```bash
kubectl exec deploy/cafe-menu-deployment -- wget -qO- http://localhost:3000/menu/health
```

**Kết quả:** tên Pod đã khác, nhưng `images` vẫn là `1`. Mở lại trang khách — ảnh còn
nguyên.

Bốn tầng vòng đời, xếp từ ngắn tới dài:

| Storage | Sống qua container restart | Sống qua Pod | Sống qua cluster |
| --- | --- | --- | --- |
| Lớp ghi của container | Không | Không | Không |
| `emptyDir` | Có | **Không** | Không |
| `hostPath` | Có | Có, nhưng chỉ trên **đúng node đó** | Có |
| **EFS qua PVC** | Có | **Có** | **Có** |

## 3. Bài tập — Hai Pod, một thư mục

Đây là bài tập đã hỏng ở 8.9, và là lý do cả ba note EFS tồn tại.

```bash
kubectl scale deployment cafe-menu-deployment --replicas=2 && kubectl rollout status deployment cafe-menu-deployment --timeout=180s
```

```bash
kubectl get pods -l app=menu -o wide
```

Ghi lại cột `NODE`. Hai Pod nằm **khác node** là điều kiện lý tưởng — nếu chúng rơi cùng
một node, xem mục cuối để ép tách ra.

**Đoán trước:** hỏi từng Pod xem nó thấy bao nhiêu ảnh.

```bash
for p in $(kubectl get pods -l app=menu -o name); do echo "== $p"; kubectl exec $p -- wget -qO- http://localhost:3000/menu/health; echo; done
```

**Kết quả:** cả hai đều báo cùng một số. Ở 8.9, một bản báo `1` còn bản kia báo `0`.

Kiểm tra bằng mắt luôn: tải lại trang khách chục lần, ảnh hiện **mọi lần**, không còn cảnh
lúc được lúc vỡ.

```bash
kubectl exec deploy/cafe-menu-deployment -- df -h /app/data/images
```

Cột `Filesystem` là địa chỉ EFS chứ không phải `overlay` — đó là toàn bộ khác biệt.

## 4. Bài tập — Ghi từ Pod này, đọc ở Pod kia

`ReadWriteMany` không chỉ là cùng đọc, mà là **cùng ghi**. Thêm hai món nữa qua trang quản
trị, mỗi lần một ảnh khác nhau. Request upload sẽ rơi vào hai Pod khác nhau.

```bash
for p in $(kubectl get pods -l app=menu -o name); do kubectl exec $p -- ls /app/data/images; echo "--"; done
```

Cả hai Pod liệt kê **đủ tất cả** các file, dù mỗi file do một Pod khác nhau ghi.

Đây là thứ `hostPath` và `emptyDir` không làm được, và cũng là thứ EBS không làm được:
EBS gắn vào một node tại một thời điểm, nên hai Pod ở hai node không thể cùng ghi.

## Khi ảnh vẫn không hiện

| Triệu chứng | Nguyên nhân |
| --- | --- |
| Pod kẹt `ContainerCreating` | Mount hỏng — security group cổng 2049, hoặc thiếu mount target ở AZ của node |
| `EACCES: permission denied` trong log | EFS bật root squash, hoặc access point đặt UID khác |
| Upload xong, `images` vẫn `0` | `MENU_IMAGE_FOLDER` lệch `mountPath` — app ghi chỗ khác |
| `df` hiện `overlay` | Deployment chưa có `volumeMounts`, hoặc apply nhầm file |
| Ảnh hiện một nửa số lần | Pod đang chạy image cũ, hoặc PVC chưa gắn vào **mọi** bản |

```bash
kubectl describe pod -l app=menu | grep -A8 -i "events"
```

```bash
kubectl logs deploy/cafe-menu-deployment --tail=30
```

## Nếu hai Pod rơi cùng một node

Phép thử vẫn đúng, nhưng kém thuyết phục — cùng node thì `hostPath` cũng qua được. Ép
chúng tách ra bằng `topologySpreadConstraints` trong `kubernetes/menu.yaml`:

```yaml
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: menu
      containers:
        - name: menu-api
```

```bash
kubectl apply -f kubernetes/menu.yaml && kubectl get pods -l app=menu -o wide
```

Mỗi node tối đa một Pod, chênh lệch không quá `maxSkew: 1`.

## Nhìn lại: hai loại volume trong cùng một hệ

```bash
kubectl get pvc
```

```
NAME               STATUS   VOLUME           CAPACITY   ACCESS MODES   STORAGECLASS
cafe-menu-images-pvc    Bound    cafe-menu-images-pv   5Gi        RWX            cafe-efs-sc
cafe-mongo-pvc          Bound    pvc-8f3c…        2Gi        RWO            gp2
```

Hai dòng, hai câu trả lời cho hai câu hỏi khác nhau:

| | `cafe-mongo-pvc` | `cafe-menu-images-pvc` |
| --- | --- | --- |
| Câu hỏi | "Dữ liệu sống qua rollout không?" | "Nhiều Pod thấy chung không?" |
| Access mode | `ReadWriteOnce` | `ReadWriteMany` |
| Hệ quả lên Deployment | `replicas: 1`, `strategy: Recreate` | Scale bao nhiêu bản cũng được |
| Phía sau | EBS, gắn vào một node | EFS, nói NFS qua mạng |

Nếu bạn nhớ được một thứ từ cả section, nên là bảng này: **access mode quyết định bạn scale
được hay không**, chứ không phải ngược lại.

## Dọn

Xoá Deployment, PVC, PV **không** xoá dữ liệu trên EFS. Ảnh vẫn nằm đó, và hoá đơn EFS vẫn
chạy:

```bash
aws efs describe-file-systems --query "FileSystems[].{id:FileSystemId,size:SizeInBytes.Value}" --output table
```

Cách xoá hẳn nằm ở cuối [8.10](/blog/k8s/deploy-to-cloud/adding-efs-as-a-volume): xoá mount
target trước, rồi tới file system. Và nhớ rằng mount target còn sót lại là lý do hay gặp
khiến stack `eksVpc` báo `DELETE_FAILED` lúc dọn cuối section.

Trả `menu-api` về một bản nếu bạn còn để cụm chạy:

```bash
kubectl scale deployment cafe-menu-deployment --replicas=1
```

## Nếu chỉ đọc chứ không bật EKS

Trên k3d, thay `csi:` bằng `hostPath` như bản ở 8.11. Mục 2 và 4 vẫn chạy đúng, còn **mục
3 sẽ thất bại** khi hai Pod rơi vào hai node — và đó lại là điều đáng thấy nhất: bạn tự tay
quan sát giới hạn mà `ReadWriteMany` sinh ra để giải quyết.

## Self-check

- [ ] Giải thích vì sao xoá Pod không còn làm mất ảnh
- [ ] Nói được vì sao hai Pod giờ báo cùng một số ảnh
- [ ] Kể bốn tầng vòng đời của dữ liệu, từ lớp ghi container tới EFS
- [ ] Nói được vì sao EBS không thay được EFS cho bài toán này
- [ ] Biết ép hai Pod nằm khác node để phép thử có giá trị
- [ ] Nói được access mode ảnh hưởng thế nào tới việc scale

## Open questions

- Hai Pod cùng ghi vào một thư mục NFS — có va nhau không, và khi nào thì có?
- Ảnh trên EFS không có ai dọn. Xoá món trong Mongo thì file ở EFS đi đâu?
- Nếu đổi sang S3 thì ba note 8.10–8.12 rút gọn lại còn gì?
