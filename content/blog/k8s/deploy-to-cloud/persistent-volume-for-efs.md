---
title: "8.11 Tạo Persistent Volume cho EFS"
description: "Ba object, một con số 5Gi hoàn toàn không có tác dụng gì, và hai khối YAML phải khớp tên nhau thì Pod mới thấy volume."
status: growing
created: 2026-09-25
updated: 2026-09-27
tags: [k8s, aws, efs, csi, pv, pvc, storageclass]
---

> Tiếp [8.10](/blog/k8s/deploy-to-cloud/adding-efs-as-a-volume). EFS đã có mount target,
> security group đã mở cổng 2049, driver `efs.csi.aws.com` đã chạy, và bạn đang giữ một
> `FileSystemId` dạng `fs-0abc123`.

Note này là bước 5 và 6: **khai phía Kubernetes** những gì đã tồn tại phía AWS. Chưa Pod
nào mount gì — đó là [8.12](/blog/k8s/deploy-to-cloud/using-the-efs-volume).

Ba object, và chúng vào **đầu** `kubernetes/users.yaml`, trước Service và Deployment.

## StorageClass — cái tên để hai bên tìm thấy nhau

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: efs-sc
provisioner: efs.csi.aws.com
```

Chỉ một dòng có nội dung thật: `provisioner` trỏ vào cái tên mà driver đã đăng ký ở 8.10.

Điều dễ hiểu sai: **ở kiểu tĩnh, StorageClass này không cấp phát gì cả.** Nó không gọi API
EFS, không tạo access point, không sinh PV. Nó chỉ là một cái tên để PV và PVC ghép được
với nhau.

| | `local-path` ở [module 6](/blog/k8s/data-and-volumes) | `efs-sc` ở đây |
| --- | --- | --- |
| Khai PVC xong | Provisioner **tự tạo** PV | Không có gì xảy ra. PVC `Pending` tới khi bạn tự viết PV |
| Vai trò của tên class | Chọn loại storage | Chỉ để ghép PV với PVC |
| Cần `parameters` | Có | Không |

Vậy vì sao vẫn phải khai? Vì bỏ trống `storageClassName` ở PVC thì nó rơi vào class **mặc
định** của cụm — mà EKS mới dựng không có class mặc định nào, nên PVC sẽ treo với một lý
do chẳng liên quan gì tới EFS.

## PersistentVolume — chỗ duy nhất có `FileSystemId`

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: efs-pv
spec:
  capacity:
    storage: 5Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteMany
  storageClassName: efs-sc
  csi:
    driver: efs.csi.aws.com
    volumeHandle: fs-0abc123
```

| Trường | Ý nghĩa thật |
| --- | --- |
| `capacity.storage` | **Không có tác dụng.** Xem mục dưới |
| `volumeMode: Filesystem` | Mount thành thư mục, không phải ổ block thô |
| `accessModes` | `ReadWriteMany` — nhiều node mount đọc ghi cùng lúc, đúng thứ EFS bán |
| `storageClassName` | Phải khớp PVC |
| `csi.driver` | Gọi ai để mount. Sai một ký tự là Pod treo `ContainerCreating` |
| `volumeHandle` | **`FileSystemId` của EFS.** Đây là sợi dây duy nhất nối YAML với tài nguyên thật trên AWS |

Lấy lại `volumeHandle` nếu chưa ghi ra đâu — nó chính là **File system ID** ở
**EFS → File systems**:

```bash
aws efs describe-file-systems --query "FileSystems[].{id:FileSystemId,name:Name}" --output table
```

Bốn chuỗi hay bị dán nhầm vào chỗ này:

| Giá trị | Đúng không |
| --- | --- |
| `fs-0abc123` | **Đúng** |
| `fsmt-0abc123` | Không — đó là **mount target ID** |
| `arn:aws:elasticfilesystem:…` | Không — trường này chỉ nhận ID, không nhận ARN |
| `fs-0abc123.efs.ap-southeast-2.amazonaws.com` | Không — đó là tên DNS, dùng khi mount tay bằng lệnh `mount` |

Còn một dạng nữa bạn sẽ gặp trong tài liệu: `fs-0abc123::fsap-0def456`. Hai dấu hai chấm
nghĩa là mount qua **access point**, để mỗi PVC có một thư mục riêng trong cùng file
system. Với PV tĩnh thì chỉ cần ID, và Pod sẽ thấy **thư mục gốc** của EFS.

Kiểm ID trước khi apply, đỡ phải đoán sau:

```bash
aws efs describe-file-systems --file-system-id fs-0abc123 --query "FileSystems[0].LifeCycleState" --output text
```

`available` là dùng được. `FileSystemNotFound` nghĩa là sai ID, hoặc bạn đang ở region
khác.

### `5Gi` là một con số hư cấu

`capacity` là trường **bắt buộc** của PV, nên phải điền. Nhưng EFS không có dung lượng cố
định: nó giãn theo lượng dữ liệu bạn ghi, và tính tiền theo đó.

| | |
| --- | --- |
| Ghi 50Gi vào một PV khai `5Gi` | **Vẫn ghi được.** Không ai chặn, và hoá đơn tính đủ 50Gi |
| Đổi `5Gi` thành `1Ti` | Không đổi gì, cả về hành vi lẫn chi phí |
| Vai trò duy nhất của con số này | Để **ghép** với `requests.storage` của PVC |

Nói cách khác, đây là một lời hứa không ai kiểm tra. Với EBS thì ngược lại: `capacity`
quyết định ổ đĩa được cấp bao nhiêu, và bạn trả tiền cho đúng con số đó dù có dùng hết hay
không.

## PersistentVolumeClaim — đơn xin chỗ

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: efs-pvc
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-sc
  resources:
    requests:
      storage: 5Gi
```

PVC **không** nhắc tới EFS, cũng không nhắc tới `fs-0abc123`. Nó chỉ nói: *"tôi cần 5Gi,
kiểu `ReadWriteMany`, thuộc class `efs-sc`"*. Ranh giới này là chủ ý, đúng như
[note 6.11](/blog/k8s/data-and-volumes/persistent-volume-claim): người viết app xin chỗ,
người quản trị cụm quyết định chỗ đó là gì.

Kubernetes ghép PV với PVC khi **cả ba** điều kiện đúng:

| Điều kiện | Ở ví dụ này |
| --- | --- |
| Cùng `storageClassName` | `efs-sc` ↔ `efs-sc` |
| PV có đủ `accessModes` mà PVC xin | `ReadWriteMany` ↔ `ReadWriteMany` |
| `capacity` của PV **≥** `requests` của PVC | `5Gi` ≥ `5Gi` |

Và ghép là **một–một**: một PV chỉ phục vụ đúng một PVC. Nhiều Pod dùng chung một PVC thì
được — đó là chuyện của [8.12](/blog/k8s/deploy-to-cloud/using-the-efs-volume) — nhưng hai
PVC không chia nhau một PV.

## Apply và kiểm tra

```bash
kubectl apply -f kubernetes/users.yaml
```

```bash
kubectl get storageclass efs-sc
```

```bash
kubectl get pv,pvc
```

```
NAME                     CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM
persistentvolume/efs-pv   5Gi        RWX            Retain           Bound    default/efs-pvc

NAME                            STATUS   VOLUME   CAPACITY   ACCESS MODES
persistentvolumeclaim/efs-pvc   Bound    efs-pv   5Gi        RWX
```

Hai dòng đều `Bound` là xong note này. Cột `CLAIM` của PV cho biết nó đã thuộc về ai.

Không `Bound` thì đọc lý do, đừng đoán:

```bash
kubectl describe pvc efs-pvc | tail -15
```

| Triệu chứng | Nguyên nhân |
| --- | --- |
| PVC `Pending`, PV vẫn `Available` | Lệch `storageClassName`, hoặc `accessModes` không khớp |
| PVC `Pending`, event `no persistent volumes available` | `requests.storage` **lớn hơn** `capacity` của PV |
| PVC `Pending`, PV đã `Bound` sang claim khác | Một–một: cần PV thứ hai |
| PV `Released` | PVC cũ đã bị xoá — xem mục dưới |

Để ý: mọi lỗi ở bảng này đều **không** liên quan tới EFS. Chúng là chuyện ghép hai object
với nhau, và xảy ra y hệt trên k3s. Lỗi thật sự của EFS — security group, mount target —
chỉ lộ ra ở 8.12, khi có Pod thật đi mount.

## Nối PVC vào Deployment

PVC `Bound` rồi thì mới chỉ là **một chỗ đã được giữ**. Pod chưa thấy gì cả. Phải khai
thêm hai khối trong `users-deployment`:

```yaml
    spec:
      containers:
        - name: users-api
          image: <your-docker-user>/kub-dep-users:1
          env:
            - name: MONGODB_CONNECTION_URI
              value: '…'
            - name: AUTH_API_ADDRESS
              value: 'auth-service.default:3000'
          volumeMounts:
            - name: efs-vol
              mountPath: /app/users
      volumes:
        - name: efs-vol
          persistentVolumeClaim:
            claimName: efs-pvc
```

| Khối | Cấp | Trả lời câu hỏi |
| --- | --- | --- |
| `volumes` | **Pod** — thụt ngang với `containers` | Pod này có volume nào, và nó từ đâu ra |
| `volumeMounts` | **Container** — nằm trong từng container | Container gắn volume đó vào thư mục nào |

Sợi dây nối hai khối là `name`: `efs-vol` ở dưới phải khớp `efs-vol` ở trên. Sai tên thì
`kubectl apply` từ chối ngay với lỗi `references non-existent volume`.

Chuỗi trỏ đầy đủ, từ thư mục trong container ra tới tài nguyên AWS:

```
/app/users ──► volume efs-vol ──► PVC efs-pvc ──► PV efs-pv ──► fs-0abc123
```

Khai `volumes` mà quên `volumeMounts` thì Pod vẫn chạy, không lỗi gì, chỉ là **không có gì
được mount** — một kiểu lỗi im lặng quen thuộc.

> **Không cần tạo sẵn thư mục `users` trong image.** Mount tự tạo điểm gắn trước khi
> container khởi động. Khác với `tasks-api` ở [section 7](/blog/k8s/networking), nơi không
> có volume nào nên `appendFile` gãy vì thiếu thư mục cha. Ngược lại còn phải nhớ: nếu
> image **có sẵn** `/app/users` với nội dung bên trong, mount sẽ **che** nó đi.

```bash
kubectl apply -f kubernetes/users.yaml && kubectl rollout status deployment users-deployment --timeout=120s
```

Kiểm nhanh volume đã vào chưa:

```bash
kubectl exec deploy/users-deployment -- df -h /app/users
```

Cột `Filesystem` phải là địa chỉ EFS, dạng `127.0.0.1:/` hoặc `fs-0abc123.efs…:/`. Nếu nó
là `overlay` thì mount chưa xảy ra.

Pod kẹt ở `ContainerCreating` nghĩa là mount đang hỏng, và đó là lúc mọi lỗi của
[8.10](/blog/k8s/deploy-to-cloud/adding-efs-as-a-volume) lộ ra:

```bash
kubectl describe pod -l app=users | grep -A8 -i "events"
```

`mount.nfs4: Connection timed out` là security group chưa mở cổng 2049, hoặc AZ của node
không có mount target.

Phần kiểm chứng `ReadWriteMany` thật sự — nhiều Pod trên nhiều node cùng ghi một file —
nằm ở [8.12](/blog/k8s/deploy-to-cloud/using-the-efs-volume).

## `Retain` và trạng thái `Released`

PV tạo thủ công mặc định `persistentVolumeReclaimPolicy: Retain`. Xoá PVC thì PV không xoá
theo, nhưng chuyển sang `Released` — và ở trạng thái đó nó **không nhận PVC mới**, dù mọi
thứ khớp.

```bash
kubectl get pv
```

Cách gỡ: xoá PV rồi apply lại. Dữ liệu trên EFS **không** mất, vì PV chỉ là một bản khai
trỏ tới `fs-0abc123`:

```bash
kubectl delete pv efs-pv && kubectl apply -f kubernetes/users.yaml
```

Đây là chỗ trực giác từ module 6 dễ sai: xoá PV **không** xoá dữ liệu, xoá cluster cũng
không. Chỉ `aws efs delete-file-system` mới xoá.

## Đối chiếu với source của khoá

Mở source gốc, bạn sẽ thấy bốn chỗ khác với bản ở đây:

| Bản gốc | Ở đây | Vì sao |
| --- | --- | --- |
| `volumeHandle: fs-59d14521` | `fs-0abc123` — bạn tự điền | Đó là file system của tác giả, không tồn tại với bạn |
| Chuỗi kết nối Mongo thật, kèm mật khẩu | Placeholder | Đã nói ở [8.3](/blog/k8s/deploy-to-cloud/preparing-the-project) |
| `AUTH_API_ADDRESSS` | `AUTH_API_ADDRESS` | Ba chữ `S` là lỗi gõ của source gốc |
| `image: academind/…:latest` | `<your-docker-user>/…:1` | Tài khoản của tác giả, và `:latest` khiến rollout không thấy gì đổi |

## Nếu chỉ đọc chứ không bật EKS

Ba object này chạy trên k3d, chỉ đổi khối `csi:` thành một loại volume mà cụm local có.
Bản `hostPath` cho thấy đúng cơ chế ghép PV–PVC, dù mất phần `ReadWriteMany`:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: efs-pv
spec:
  capacity:
    storage: 5Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce
  storageClassName: efs-sc
  hostPath:
    path: /tmp/efs-lab
    type: DirectoryOrCreate
```

StorageClass đổi `provisioner` thành `kubernetes.io/no-provisioner` — với PV tĩnh, class
chỉ cần **tồn tại và đúng tên**. Giữ nguyên tên `efs-sc` và `efs-pvc` thì phần Deployment
ở 8.12 không phải sửa gì.

## Self-check

- [ ] Nói được vì sao StorageClass ở đây không cấp phát gì mà vẫn phải khai
- [ ] Chỉ ra trường duy nhất nối YAML với tài nguyên thật trên AWS
- [ ] Giải thích vì sao `5Gi` không giới hạn được gì trên EFS, nhưng vẫn phải điền
- [ ] Kể ba điều kiện để PV và PVC `Bound` với nhau
- [ ] Nói được vì sao cần **cả** `volumes` lẫn `volumeMounts`, và cái nào ở cấp nào
- [ ] Nói được vì sao không phải tạo sẵn thư mục `users` trong image
- [ ] Nói được vì sao PV `Released` không tự nhận PVC mới, và cách gỡ
- [ ] Nói được xoá PV, xoá PVC, xoá cluster — cái nào xoá dữ liệu trên EFS

## Open questions

- PVC xin `ReadWriteMany` mà PV chỉ có `ReadWriteOnce` — lỗi xuất hiện lúc `Bound` hay lúc Pod mount?
- Dynamic provisioning sinh một access point cho mỗi PVC. Access point giải quyết vấn đề gì mà PV tĩnh không giải quyết được?
- Hai cluster khác nhau cùng khai PV trỏ vào một `FileSystemId` — chuyện gì xảy ra?
