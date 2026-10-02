---
title: "8.17 Tạo Persistent Volume cho EFS"
description: "Ba object, một con số 5Gi hoàn toàn không có tác dụng gì, và hai khối YAML phải khớp tên nhau thì Pod mới thấy volume."
status: growing
created: 2026-09-25
updated: 2026-09-29
tags: [k8s, aws, efs, csi, pv, pvc, storageclass]
---

> Tiếp [8.16](/blog/k8s/deploy-to-cloud/adding-efs-as-a-volume). EFS đã có mount target,
> security group đã mở cổng 2049, add-on `aws-efs-csi-driver` đã `Active`, và bạn đang giữ
> một `FileSystemId` — lấy lại bằng `aws efs describe-file-systems` nếu chưa ghi.

Note này **khai phía Kubernetes** những gì đã tồn tại phía AWS, rồi nối nó vào `menu-api`.

Ba object mới nằm trong một file riêng. Tạo file `kubernetes/efs.yaml`, rồi chép lần lượt
ba khối YAML ở ba mục dưới vào đó, **cách nhau bằng một dòng `---`**.

## StorageClass — cái tên để hai bên tìm thấy nhau

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cafe-efs-sc
provisioner: efs.csi.aws.com
```

Chỉ một dòng có nội dung thật: `provisioner` trỏ vào cái tên mà driver đã đăng ký ở 8.16.

Điều dễ hiểu sai: **ở kiểu tĩnh, StorageClass này không cấp phát gì cả.** Nó không gọi API
EFS, không tạo access point, không sinh PV. Nó chỉ là một cái tên để PV và PVC ghép được
với nhau.

| | `gp2` của Mongo ở [8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster) | `cafe-efs-sc` ở đây |
| --- | --- | --- |
| Khai PVC xong | Provisioner **tự tạo** một EBS volume và một PV | Không có gì xảy ra. PVC `Pending` tới khi bạn tự viết PV |
| Vai trò của tên class | Chọn loại storage | Chỉ để ghép PV với PVC |
| Gọi là | Dynamic provisioning | **Static provisioning** |

Vậy vì sao vẫn phải khai? Vì bỏ trống `storageClassName` ở PVC thì nó rơi vào class **mặc
định** của cụm — và sẽ đi hỏi một provisioner khác hẳn.

## PersistentVolume — chỗ duy nhất có `FileSystemId`

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: cafe-menu-images-pv
spec:
  capacity:
    storage: 5Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteMany
  storageClassName: cafe-efs-sc
  csi:
    driver: efs.csi.aws.com
    volumeHandle: <file-system-id>
```

| Trường | Ý nghĩa thật |
| --- | --- |
| `capacity.storage` | **Không có tác dụng.** Xem mục dưới |
| `volumeMode: Filesystem` | Mount thành thư mục, không phải ổ block thô |
| `accessModes` | `ReadWriteMany` — đúng thứ bài tập 2 ở 8.15 cần mà không có |
| `storageClassName` | Phải khớp PVC |
| `csi.driver` | Gọi ai để mount. Sai một ký tự là Pod treo `ContainerCreating` |
| `volumeHandle` | **`FileSystemId` của EFS.** Sợi dây duy nhất nối YAML với tài nguyên thật trên AWS |

Lấy lại `volumeHandle` nếu chưa ghi ra đâu — nó chính là **File system ID** ở
**EFS → File systems**:

```bash
aws efs describe-file-systems --query "FileSystems[].{id:FileSystemId,name:Name}" --output table
```

Bốn chuỗi hay bị dán nhầm vào chỗ này:

| Giá trị | Đúng không |
| --- | --- |
| `fs-…` — 17 ký tự hex sau `fs-` | **Đúng** |
| `fsmt-…` | Không — đó là **mount target ID** |
| `arn:aws:elasticfilesystem:…` | Không — trường này chỉ nhận ID, không nhận ARN |
| `fs-….efs.<region>.amazonaws.com` | Không — đó là tên DNS, dùng khi mount tay |

Dạng `<file-system-id>::<access-point-id>` cũng hợp lệ: hai dấu hai chấm nghĩa là mount qua **access
point**, để mỗi PVC có một thư mục riêng trong cùng file system. Với PV tĩnh thì chỉ cần
ID, và Pod sẽ thấy **thư mục gốc** của EFS.

### `5Gi` là một con số hư cấu

`capacity` là trường **bắt buộc** của PV, nên phải điền. Nhưng EFS không có dung lượng cố
định: nó giãn theo lượng dữ liệu bạn ghi, và tính tiền theo đó.

| | |
| --- | --- |
| Ghi 50Gi vào một PV khai `5Gi` | **Vẫn ghi được.** Không ai chặn, và hoá đơn tính đủ 50Gi |
| Đổi `5Gi` thành `1Ti` | Không đổi gì, cả về hành vi lẫn chi phí |
| Vai trò duy nhất của con số này | Để **ghép** với `requests.storage` của PVC |

Với `gp2` của Mongo thì ngược lại: `2Gi` là ổ đĩa thật, và bạn trả tiền cho đúng 2Gi đó dù
có dùng hết hay không.

## PersistentVolumeClaim — đơn xin chỗ

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: cafe-menu-images-pvc
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: cafe-efs-sc
  resources:
    requests:
      storage: 5Gi
```

PVC **không** nhắc tới EFS, cũng không nhắc tới `FileSystemId`. Nó chỉ nói: *"tôi cần 5Gi,
kiểu `ReadWriteMany`, thuộc class `cafe-efs-sc`"*. Ranh giới này là chủ ý, đúng như
[note 6.11](/blog/k8s/data-and-volumes/persistent-volume-claim): người viết app xin chỗ,
người quản trị cụm quyết định chỗ đó là gì.

Kubernetes ghép PV với PVC khi **cả ba** điều kiện đúng:

| Điều kiện | Ở ví dụ này |
| --- | --- |
| Cùng `storageClassName` | `cafe-efs-sc` ↔ `cafe-efs-sc` |
| PV có đủ `accessModes` mà PVC xin | `ReadWriteMany` ↔ `ReadWriteMany` |
| `capacity` của PV **≥** `requests` của PVC | `5Gi` ≥ `5Gi` |

Và ghép là **một–một**: một PV chỉ phục vụ đúng một PVC.

```bash
kubectl apply -f kubernetes/efs.yaml
```

Kiểm PV đang trỏ đúng EFS:

```bash
kubectl get pv cafe-menu-images-pv -o jsonpath="{.spec.csi.volumeHandle}"
```

**Đúng:** ra đúng `FileSystemId` của bạn, dạng `fs-…`. **Nếu ra `<file-system-id>`:** quên
thay placeholder trong `efs.yaml`. PV đã apply thì không sửa tại chỗ được — sửa file, rồi
tạo lại PV theo mục [Tạo lại PV khi PVC đang dùng nó](#tạo-lại-pv-khi-pvc-đang-dùng-nó).
Để nguyên thì PVC vẫn `Bound`, nhưng Pod kẹt `ContainerCreating` khi mount.

```bash
kubectl get pv,pvc
```

Hai dòng đều `Bound` là xong nửa đầu note này.

| Triệu chứng | Nguyên nhân |
| --- | --- |
| PVC `Pending`, PV vẫn `Available` | Lệch `storageClassName`, hoặc `accessModes` không khớp |
| PVC `Pending`, event `no persistent volumes available` | `requests.storage` **lớn hơn** `capacity` của PV |
| PVC `Pending`, PV đã `Bound` sang claim khác | Một–một: cần PV thứ hai |
| PV `Released` | PVC cũ đã bị xoá — xem mục cuối |

Để ý: mọi lỗi ở bảng này đều **không** liên quan tới EFS. Chúng là chuyện ghép hai object,
và xảy ra y hệt trên k3s. Lỗi thật sự của EFS — security group, mount target — chỉ lộ ra
khi có Pod đi mount, tức là ngay dưới đây.

## Nối PVC vào `menu-api`

PVC `Bound` rồi thì mới chỉ là **một chỗ đã được giữ**. Pod chưa thấy gì cả. Mở
`kubernetes/menu-api.yaml` đã viết ở [8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster),
thêm hai khối vào Deployment:

```yaml
    spec:
      containers:
        - name: menu-api
          image: <your-docker-user>/kub-cafe-menu:1
          imagePullPolicy: Always
          ports:
            - containerPort: 3000
          env:
            - name: MONGODB_URI
              value: 'mongodb://cafe-mongo-service:27017/cafe'
            - name: AUTH_ADDRESS
              value: 'cafe-auth-service:3000'
            - name: MENU_IMAGE_FOLDER
              value: '/app/data/images'
          volumeMounts:
            - name: menu-images
              mountPath: /app/data/images
      volumes:
        - name: menu-images
          persistentVolumeClaim:
            claimName: cafe-menu-images-pvc
```

| Khối | Cấp | Trả lời câu hỏi |
| --- | --- | --- |
| `volumes` | **Pod** — thụt ngang với `containers` | Pod này có volume nào, và nó từ đâu ra |
| `volumeMounts` | **Container** — nằm trong từng container | Container gắn volume đó vào thư mục nào |

Ba cái tên phải khớp nhau, và không có gì kiểm giúp bạn:

```
MENU_IMAGE_FOLDER = /app/data/images
        ║ phải bằng
   mountPath      = /app/data/images ──► volume menu-images ──► PVC cafe-menu-images-pvc ──► PV ──► <file-system-id>
```

Lệch `MENU_IMAGE_FOLDER` với `mountPath` thì app **vẫn chạy**, vẫn nhận upload, chỉ là ghi
vào lớp ghi của container — tức là quay lại đúng bài toán ở 8.15 mà không hề báo lỗi.

> **Không cần tạo sẵn thư mục trong image.** Mount tự tạo điểm gắn trước khi container
> khởi động, và `menu-app.js` cũng gọi `fs.mkdirSync(..., { recursive: true })`. Ngược lại
> còn phải nhớ: nếu image **có sẵn** file ở `/app/data/images`, mount sẽ **che** chúng đi.

```bash
kubectl apply -f kubernetes/menu-api.yaml && kubectl rollout status deployment cafe-menu-deployment --timeout=180s
```

**PowerShell:**

```powershell
kubectl apply -f kubernetes/menu-api.yaml; if ($?) { kubectl rollout status deployment cafe-menu-deployment --timeout=180s }
```

```bash
kubectl exec deploy/cafe-menu-deployment -- df -h /app/data/images
```

Cột `Filesystem` phải là địa chỉ EFS, dạng `127.0.0.1:/` hoặc `fs-….efs…:/`. Nếu nó
là `overlay` thì mount chưa xảy ra.

Pod kẹt ở `ContainerCreating` chính là lúc mọi lỗi của 8.16 lộ ra:

```bash
kubectl describe pod -l app=menu | grep -A8 -i "events"
```

**PowerShell:**

```powershell
kubectl describe pod -l app=menu | Select-String -Pattern "events" -Context 0,8
```

`mount.nfs4: Connection timed out` là security group chưa mở cổng 2049, hoặc AZ của node
không có mount target.

## Tạo lại PV khi PVC đang dùng nó

Cần khi phải sửa một trường không đổi tại chỗ được của PV — `volumeHandle` sai là trường
hợp hay gặp nhất.

**Đừng `kubectl delete pv` ngay.** PV đang `Bound` có finalizer
`kubernetes.io/pv-protection`, nên lệnh xoá trả về ngay nhưng PV đứng ở `Terminating` mãi —
chừng nào PVC còn, mà PVC thì đang được Pod `menu-api` mount. Lệnh xoá cũng không huỷ được.
Lỡ chạy rồi thì vẫn làm đúng các bước dưới, từ bước 1.

Thứ tự đúng là nhả từ ngoài vào trong — Pod, rồi PVC, rồi PV:

1. Dừng Pod đang mount PVC:

```bash
kubectl scale deployment cafe-menu-deployment --replicas=0
```

2. Xoá PVC:

```bash
kubectl delete pvc cafe-menu-images-pvc
```

3. Xoá PV — bỏ qua nếu đã chạy lệnh này từ trước, PV đang `Terminating` sẽ tự biến mất sau
bước 2:

```bash
kubectl delete pv cafe-menu-images-pv
```

```bash
kubectl get pv
```

**Đúng:** không còn dòng `cafe-menu-images-pv`.

4. Sửa `efs.yaml` nếu cần, rồi tạo lại cả PV lẫn PVC:

```bash
kubectl apply -f kubernetes/efs.yaml
```

```bash
kubectl get pv,pvc
```

**Đúng:** cả hai `Bound`.

5. Bật lại `menu-api` — apply lại file để số bản về đúng như khai trong YAML:

```bash
kubectl apply -f kubernetes/menu-api.yaml
```

```bash
kubectl exec deploy/cafe-menu-deployment -- ls -la /app/data/images
```

Ảnh đã có trên EFS vẫn còn nguyên: cả quá trình chỉ xoá **bản khai** phía Kubernetes, không
đụng tới file system.

## `Retain` và trạng thái `Released`

PV tạo thủ công mặc định `persistentVolumeReclaimPolicy: Retain`. Xoá PVC thì PV không xoá
theo, nhưng chuyển sang `Released` — và ở trạng thái đó nó **không nhận PVC mới**, dù mọi
thứ khớp.

```bash
kubectl get pv
```

Cách gỡ: xoá PV rồi apply lại — lúc này PVC đã không còn, nên PV xoá được ngay. (PVC vẫn
còn thì làm theo mục ngay trên.) Ảnh trên EFS **không** mất, vì PV chỉ là một bản khai trỏ
tới `FileSystemId`:

```bash
kubectl delete pv cafe-menu-images-pv && kubectl apply -f kubernetes/efs.yaml
```

**PowerShell:**

```powershell
kubectl delete pv cafe-menu-images-pv; if ($?) { kubectl apply -f kubernetes/efs.yaml }
```

Đây là chỗ trực giác dễ sai: xoá PV không xoá dữ liệu, xoá cluster cũng không. Chỉ
`aws efs delete-file-system` mới xoá.

## Nếu chỉ đọc chứ không bật EKS

Ba object này chạy trên k3d, chỉ đổi khối `csi:` thành một loại volume mà cụm local có:

```yaml
  storageClassName: cafe-efs-sc
  hostPath:
    path: /tmp/menu-images
    type: DirectoryOrCreate
```

StorageClass đổi `provisioner` thành `kubernetes.io/no-provisioner` — với PV tĩnh, class
chỉ cần **tồn tại và đúng tên**. Giữ nguyên tên `cafe-menu-images-pvc` thì phần Deployment
không phải sửa gì, và bài tập ở 8.18 vẫn chạy được **miễn là hai Pod cùng node**.

## Self-check

- [ ] Nói được vì sao StorageClass ở đây không cấp phát gì mà vẫn phải khai
- [ ] Chỉ ra trường duy nhất nối YAML với tài nguyên thật trên AWS
- [ ] Giải thích vì sao `5Gi` không giới hạn được gì trên EFS, nhưng vẫn phải điền
- [ ] Kể ba điều kiện để PV và PVC `Bound` với nhau
- [ ] Nói được ba cái tên phải khớp nhau giữa code, Deployment và PVC
- [ ] Nói được xoá PV, xoá PVC, xoá cluster — cái nào xoá ảnh trên EFS

## Open questions

- PVC xin `ReadWriteMany` mà PV chỉ có `ReadWriteOnce` — lỗi xuất hiện lúc `Bound` hay lúc Pod mount?
- Access point giải quyết vấn đề gì mà PV tĩnh không giải quyết được?
- Hai cluster cùng khai PV trỏ vào một `FileSystemId` — chuyện gì xảy ra?
