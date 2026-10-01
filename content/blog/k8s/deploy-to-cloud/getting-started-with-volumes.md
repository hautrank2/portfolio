---
title: "8.15 Bắt đầu với Volume"
description: "Upload một tấm ảnh, xoá Pod, ảnh biến mất. Scale lên hai bản, ảnh lúc có lúc không. Hai lỗi đó là toàn bộ lý do EFS tồn tại."
status: growing
created: 2026-09-25
updated: 2026-09-29
tags: [k8s, volume, storage, eks, csi, ebs, efs]
---

> Tiếp [8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster). Năm service đang
> chạy, và bạn đã thêm được món kèm ảnh qua trang quản trị.

Mongo đã có volume từ 8.14 — nó dùng PVC, và dữ liệu sống qua rollout. `menu-api` thì
**chưa có gì**: ảnh đang ghi vào lớp ghi của container.

Note này để bạn tự tay làm hỏng nó hai lần, theo hai kiểu khác nhau.

## Ba kiểu volume đã học, và chúng gắn vào đâu

| Kiểu | Dữ liệu nằm ở | Sống qua |
| --- | --- | --- |
| Không khai gì | Lớp ghi của container | Container restart tại chỗ. **Không** sống qua Pod |
| `emptyDir` | Đĩa của node đang chạy Pod | Container restart. Không sống qua Pod |
| `hostPath` | Một đường dẫn cụ thể trên node | Pod chết, nhưng **chỉ trên đúng node đó** |
| PVC + PV | Tuỳ StorageClass | Tuỳ loại storage phía sau |

Ba dòng đầu đều dính vào **một máy cụ thể**. Đó là toàn bộ vấn đề của note này.

## Bài tập 1 — Xoá Pod, ảnh đi theo

Trước hết xác nhận ảnh đang nằm đâu:

```bash
kubectl exec deploy/cafe-menu-deployment -- ls -la /app/data/images
```

```bash
kubectl exec deploy/cafe-menu-deployment -- wget -qO- http://localhost:3000/menu/health
```

Trường `images` cho biết Pod này đang giữ bao nhiêu file.

**Đoán trước:** xoá Pod. Deployment tạo Pod mới ngay. Món vẫn còn trong Mongo — nhưng ảnh
thì sao?

```bash
kubectl delete pod -l app=menu && kubectl rollout status deployment cafe-menu-deployment --timeout=120s
```

**PowerShell:**

```powershell
kubectl delete pod -l app=menu; if ($?) { kubectl rollout status deployment cafe-menu-deployment --timeout=120s }
```

```bash
kubectl exec deploy/cafe-menu-deployment -- wget -qO- http://localhost:3000/menu/health
```

**Kết quả:** `images` về `0`. Mở lại trang khách, món vẫn đó nhưng **ảnh vỡ**.

Nhìn từ trình duyệt, đó là một `404` từ `menu-api`. Nhìn từ Kubernetes, không có gì hỏng
cả: Pod `Running`, Service có endpoint, log không một dòng lỗi.

Hai loại dữ liệu, hai số phận khác nhau, và khác biệt duy nhất là một cái có volume còn
cái kia thì không:

| | Món trong Mongo | Ảnh trong `menu-api` |
| --- | --- | --- |
| Nằm ở | PVC | Lớp ghi container |
| Sau khi Pod sinh lại | Còn nguyên | **Mất sạch** |

## Bài tập 2 — Scale lên hai bản, ảnh lúc có lúc không

Thêm lại một món kèm ảnh qua trang quản trị, rồi:

```bash
kubectl scale deployment cafe-menu-deployment --replicas=2 && kubectl rollout status deployment cafe-menu-deployment --timeout=120s
```

**PowerShell:**

```powershell
kubectl scale deployment cafe-menu-deployment --replicas=2; if ($?) { kubectl rollout status deployment cafe-menu-deployment --timeout=120s }
```

```bash
kubectl get pods -l app=menu -o wide
```

**Đoán trước:** hai Pod cùng phục vụ `menu-api`, Service chia request luân phiên. Tải lại
trang khách vài lần thì ảnh thế nào?

```bash
for p in $(kubectl get pods -l app=menu -o name); do echo "== $p"; kubectl exec $p -- wget -qO- http://localhost:3000/menu/health; echo; done
```

**PowerShell:**

```powershell
foreach ($p in (kubectl get pods -l app=menu -o name)) { "== $p"; kubectl exec $p -- wget -qO- http://localhost:3000/menu/health; "" }
```

**Kết quả:** một Pod báo `images` bằng `1`, Pod kia bằng `0`. Trên giao diện, ảnh **lúc
hiện lúc vỡ** tuỳ request rơi vào bản nào.

Đây là kiểu lỗi khó chịu nhất trong nghề: nó không sai hẳn, nó chỉ sai **một nửa số lần**.
Người dùng báo lỗi, bạn tải lại trang thì thấy bình thường.

```
                    ┌─ Pod menu A ── /app/data/images/ca-phe.jpg  ✓
Service menu ──────►│
                    └─ Pod menu B ── /app/data/images/ (trống)    ✗ 404
```

Trả về một bản trước khi đi tiếp:

```bash
kubectl scale deployment cafe-menu-deployment --replicas=1
```

## Vì sao cloud cần một tầng khác

Vấn đề không phải "K8s làm sai". Vấn đề là **ổ đĩa gắn vào máy**, còn Pod thì tự do đi lại
giữa các máy và có thể có nhiều bản cùng lúc. Muốn nhiều Pod thấy chung một thư mục,
storage phải nằm **ngoài** node và nối vào qua mạng.

AWS có hai lựa chọn, khác nhau ở chỗ căn bản:

| | **EBS** | **EFS** |
| --- | --- | --- |
| Là gì | Ổ đĩa block, như cắm thêm SSD vào một máy | Hệ thống file chia sẻ qua mạng, giao thức NFS |
| Gắn được vào | **Một** node tại một thời điểm | **Nhiều** node cùng lúc |
| Phạm vi | Một Availability Zone | Nhiều AZ trong region |
| Access mode | `ReadWriteOnce` | **`ReadWriteMany`** |
| Tính tiền | Theo dung lượng cấp phát | Theo dung lượng thật sự dùng |
| Trong dự án này | **Mongo** — một Pod ghi | **Ảnh món** — nhiều Pod đọc ghi |

Dòng cuối là bản đồ của cả phần còn lại: Mongo đã xong từ 8.14, còn ảnh là việc của ba note
tới.

Ba access mode, và chi tiết dễ hiểu sai nằm ở dòng đầu:

| Mode | Nghĩa |
| --- | --- |
| `ReadWriteOnce` (RWO) | Một **node** mount đọc ghi. Nhiều Pod trên cùng node đó vẫn dùng chung được |
| `ReadOnlyMany` (ROX) | Nhiều node mount, chỉ đọc |
| `ReadWriteMany` (RWX) | Nhiều node mount, đọc ghi — thứ bài tập 2 cần |

`ReadWriteOnce` giới hạn theo **node**, không phải theo Pod.

## CSI: ai là người đi gắn ổ đĩa

Kubernetes không biết EBS hay EFS là gì. Nó chỉ nói *"Pod này cần một volume kiểu X"*, rồi
để một **driver** lo phần còn lại: gọi API AWS, gắn vào đúng node, mount vào đúng thư mục.

**CSI** — Container Storage Interface — là bản hợp đồng giữa hai bên đó.

```
Bạn khai PVC
   │
   ▼
StorageClass ──► CSI driver ──► API của AWS ──► EBS volume / EFS access point
                 (Pod chạy trong cụm)
```

Trên EKS, **driver không có sẵn**. Bạn đã gặp điều này ở 8.14: PVC của Mongo chỉ `Bound`
sau khi cài add-on `aws-ebs-csi-driver`. EFS cũng vậy, và đó là
[note 8.16](/blog/k8s/deploy-to-cloud/adding-efs-as-a-volume).

```bash
kubectl get storageclass
```

```bash
kubectl get csidrivers
```

Khác biệt lớn nhất so với k3s: k3s ship sẵn `local-path` và đặt làm mặc định, nên ở module
6 bạn khai PVC là có ngay. Trên EKS, phần "có ngay" đó là thứ **bạn phải tự cài**.

## PVC không tự nghĩa là an toàn

`local-path` của k3s cấp một thư mục **trên node đang chạy Pod** — nó chỉ là `hostPath`
khoác áo PVC.

```bash
kubectl get storageclass local-path -o jsonpath='{.provisioner}{"\n"}'
```

Trên cụm nhiều node, PV do nó cấp bị **ghim vào một node** qua `nodeAffinity`. Pod nào cần
PVC đó buộc phải chạy trên đúng node ấy, và node chết là Pod `Pending` vô thời hạn.

Câu hỏi đúng không phải *"tôi đã dùng PVC chưa"* mà là **"phía sau PVC là loại storage
nào, và nó gắn vào node hay gắn vào mạng"**.

## Chọn cái gì cho việc gì

| Nhu cầu | Dùng |
| --- | --- |
| Cache, file tạm, chết cùng Pod cũng không sao | `emptyDir` |
| Đọc thứ gì đó của chính node, ví dụ log hệ thống | `hostPath`, và chấp nhận Pod bị ghim vào node |
| Một Pod ghi, cần sống qua rollout | PVC với **EBS** — chính là Mongo ở 8.14 |
| Nhiều Pod cùng đọc ghi một thư mục | PVC với **EFS** — chính là ảnh món ở 8.16–8.18 |
| File tĩnh cho người dùng tải, quy mô thật | **S3**, và đây mới là câu trả lời ngoài đời cho bài toán ảnh |

Dòng cuối đáng nói thẳng: một quán cà phê thật sẽ đẩy ảnh lên S3 chứ không dựng EFS. Ba
note tới dùng EFS vì mục tiêu là **hiểu `ReadWriteMany` của Kubernetes**, không phải vì
đây là kiến trúc mẫu.

## Nếu chỉ đọc chứ không bật EKS

Cả hai bài tập ở trên chạy nguyên xi trên k3d, và đó mới là phần đáng làm:

```bash
k3d cluster create lab --agents 2
```

Bài tập 2 trên cụm nhiều node cho thấy đúng thứ cụm một node không bao giờ cho thấy. Cái
k3d **không** tái hiện được là EFS: không có storage nào gắn qua mạng để nhiều node cùng
ghi. Muốn thử `ReadWriteMany` ở local thì phải tự dựng một NFS server — và lúc đó bạn đang
làm đúng việc mà EFS bán.

## Self-check

- [ ] Nói được vì sao ảnh mất khi Pod sinh lại còn món thì không
- [ ] Giải thích vì sao lỗi ở bài tập 2 chỉ xảy ra một nửa số lần
- [ ] Phân biệt EBS và EFS qua access mode và phạm vi AZ
- [ ] Nói được `ReadWriteOnce` giới hạn theo node hay theo Pod
- [ ] Giải thích CSI driver làm gì, và vì sao EKS không có sẵn
- [ ] Nói được vì sao PVC với `local-path` vẫn dính đúng bẫy của `hostPath`

## Open questions

- PV do `local-path` cấp bị ghim vào một node. Vậy `kubectl drain` node đó thì Pod đi đâu?
- EBS là `ReadWriteOnce`. Vậy Mongo ba bản thì mỗi bản một ổ, hay dùng chung một ổ?
- Nếu đổi sang S3 thì `menu-api` mất đi và có thêm những gì?
