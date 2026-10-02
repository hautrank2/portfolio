---
title: "8.14 Áp cấu hình Kubernetes lên cluster"
description: "Cùng bộ YAML, cụm khác — cộng một danh sách kiểm mà khoá học không có, vì năm 2020 EKS chưa bắt bạn tự cài những thứ này."
status: growing
created: 2026-09-25
updated: 2026-10-02
tags: [k8s, eks, kubectl, deploy, loadbalancer, addon]
---

> Tiếp [8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes). `kubectl get nodes` ra node
> `Ready`, và năm image của [8.3](/blog/k8s/deploy-to-cloud/preparing-the-project) đã nằm
> trên Docker Hub.

`kubectl apply -f` không có gì mới. Bảy section vừa rồi bạn học một API, và API ấy không
đổi khi cụm nằm trên máy người khác.

Thứ đổi là **mọi tầng bên dưới nó**. Note này đi qua danh sách kiểm trước, viết sáu file
manifest, rồi mới apply.

## Danh sách kiểm trước khi apply

Sáu dòng này là những thứ mà một cụm EKS mới **không** có sẵn. Thiếu bất kỳ cái nào, lỗi
sẽ hiện ra ở một chỗ rất xa nguyên nhân.

| # | Thứ cần | Thiếu thì triệu chứng là |
| --- | --- | --- |
| 1 | Access entry cho IAM user của bạn | `kubectl` báo `You must be logged in to the server` |
| 2 | Add-on **Amazon VPC CNI** (`vpc-cni`) | Node `NotReady`, `cni plugin not initialized` |
| 3 | Add-on **CoreDNS** (`coredns`) và **kube-proxy** (`kube-proxy`) | Pod chạy nhưng **không phân giải được tên nào** — `bad address` |
| 4 | Add-on `aws-ebs-csi-driver` **và quyền Pod Identity cho nó** — xem [8.8](/blog/k8s/deploy-to-cloud/ebs-block-storage) | Add-on **Degraded**, `ebs-csi-controller` `CrashLoopBackOff`, PVC của Mongo kẹt `Pending` mãi |
| 5 | `eksClusterRole` đủ policy và có `sts:TagSession` | `EXTERNAL-IP` kẹt `<pending>` |
| 6 | Subnet public có tag, Service có annotation scheme | Load balancer dựng ra là `internal`, gọi từ ngoài ra `ENOTFOUND` |

Kiểm nhanh bốn add-on:

```bash
aws eks list-addons --cluster-name kub-cafe-demo
```

Nếu đã chọn đủ ở Step 4 của [8.11](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks),
cả bốn đã có. Thiếu cái nào thì cài trên Console: **EKS → cluster → Add-ons → Get more
add-ons**, tick rồi **Create**. Với **EBS CSI Driver**, trang cấu hình kế tiếp có mục
**Add-on access** — cấp quyền Pod Identity ngay ở đó theo
[8.8](/blog/k8s/deploy-to-cloud/ebs-block-storage), đừng bỏ trống.

Ba add-on nền thì cài bằng CLI cũng được, mỗi lệnh một cái:

```bash
aws eks create-addon --cluster-name kub-cafe-demo --addon-name vpc-cni
```

```bash
aws eks create-addon --cluster-name kub-cafe-demo --addon-name coredns
```

```bash
aws eks create-addon --cluster-name kub-cafe-demo --addon-name kube-proxy
```

Rồi kiểm driver EBS có quyền chưa — trạng thái phải là `ACTIVE`, không phải `DEGRADED`:

```bash
aws eks describe-addon --cluster-name kub-cafe-demo --addon-name aws-ebs-csi-driver --query "addon.status" --output text
```

Kiểm DNS trong cụm đã sống chưa — một lệnh, và nó cũng in ra **IP mà thế giới bên ngoài
nhìn thấy khi Pod gọi ra internet**:

```bash
kubectl run ipcheck --rm -i --restart=Never --image=busybox:1.36 -- wget -qO- -T 8 http://checkip.amazonaws.com
```

`bad address` nghĩa là thiếu CoreDNS, quay lại dòng 3. Chi tiết từng thứ nằm ở
[8.11](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks) và
[8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes).

## 1. Viết sáu file manifest

Source ở [8.3](/blog/k8s/deploy-to-cloud/preparing-the-project) không có manifest nào. Tạo
thư mục `kubernetes/` ở gốc dự án, rồi viết sáu file dưới đây.

```bash
mkdir kubernetes
```

Cả sáu theo cùng một mẫu: **một Service, một dòng `---`, một Deployment**. Khác nhau ở
tên, nhãn, cổng và biến môi trường — đúng những thứ đã ghi ở bảng service của 8.3.

Ở năm file có image của bạn, thay `<your-docker-user>` bằng tài khoản Docker Hub — cùng tên
đã dùng lúc `docker push`.

### `kubernetes/mongo.yaml`

File duy nhất có ba object: thêm một PVC xin đĩa cho Mongo. Từng dòng của nó đã được giải
thích ở [8.8](/blog/k8s/deploy-to-cloud/ebs-block-storage).

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: cafe-mongo-pvc
spec:
  accessModes:
    - ReadWriteOnce
  # On EKS this class needs the aws-ebs-csi-driver add-on.
  # On k3d, change it to local-path.
  storageClassName: gp2
  resources:
    requests:
      storage: 2Gi
---
apiVersion: v1
kind: Service
metadata:
  name: cafe-mongo-service
spec:
  selector:
    app: mongo
  type: ClusterIP
  ports:
    - protocol: TCP
      port: 27017
      targetPort: 27017
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cafe-mongo-deployment
spec:
  replicas: 1
  # Recreate: delete the old Pod before creating the new one. With the default
  # RollingUpdate, two Pods would claim the same ReadWriteOnce volume.
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: mongo
  template:
    metadata:
      labels:
        app: mongo
    spec:
      containers:
        - name: mongo
          image: mongo:6
          ports:
            - containerPort: 27017
          volumeMounts:
            - name: mongo-data
              mountPath: /data/db
      volumes:
        - name: mongo-data
          persistentVolumeClaim:
            claimName: cafe-mongo-pvc
```

### `kubernetes/auth-api.yaml`

`ClusterIP`: `auth` chỉ được gọi từ trong cụm, không bao giờ từ internet. Đổi `TOKEN_KEY`
và `ADMIN_PASSWORD` thành đúng giá trị bạn đã đặt trong `docker-compose.yaml`.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cafe-auth-service
spec:
  selector:
    app: auth
  type: ClusterIP
  ports:
    - protocol: TCP
      port: 3000
      targetPort: 3000
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cafe-auth-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: auth
  template:
    metadata:
      labels:
        app: auth
    spec:
      containers:
        - name: auth-api
          image: <your-docker-user>/kub-cafe-auth:1
          imagePullPolicy: Always
          ports:
            - containerPort: 3000
          env:
            - name: TOKEN_KEY
              value: 'doi-chuoi-nay-di'
            - name: ADMIN_EMAIL
              value: 'admin@cafe.local'
            - name: ADMIN_PASSWORD
              value: 'cafe1234'
```

### `kubernetes/menu-api.yaml`

Chưa có volume nào — đó là chủ ý. Ảnh sẽ ghi vào lớp ghi của container, và
[8.15](/blog/k8s/deploy-to-cloud/getting-started-with-volumes) cho bạn thấy nó gãy ở đâu
trước khi [8.17](/blog/k8s/deploy-to-cloud/persistent-volume-for-efs) gắn EFS vào.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cafe-menu-service
spec:
  selector:
    app: menu
  type: ClusterIP
  ports:
    - protocol: TCP
      port: 3000
      targetPort: 3000
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cafe-menu-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: menu
  template:
    metadata:
      labels:
        app: menu
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
```

### `kubernetes/order-api.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cafe-order-service
spec:
  selector:
    app: order
  type: ClusterIP
  ports:
    - protocol: TCP
      port: 3000
      targetPort: 3000
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cafe-order-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: order
  template:
    metadata:
      labels:
        app: order
    spec:
      containers:
        - name: order-api
          image: <your-docker-user>/kub-cafe-order:1
          imagePullPolicy: Always
          ports:
            - containerPort: 3000
          env:
            - name: MONGODB_URI
              value: 'mongodb://cafe-mongo-service:27017/cafe'
            - name: AUTH_ADDRESS
              value: 'cafe-auth-service:3000'
```

### `kubernetes/shop-web.yaml`

Một trong hai Service `LoadBalancer`. Cổng `8210` là cổng load balancer nghe; `targetPort:
80` là cổng nginx trong container. Annotation `scheme` được giải thích ở
[8.9](/blog/k8s/deploy-to-cloud/elastic-load-balancing).

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cafe-shop-web-service
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
spec:
  selector:
    app: shop-web
  type: LoadBalancer
  ports:
    - protocol: TCP
      port: 8210
      targetPort: 80
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cafe-shop-web-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: shop-web
  template:
    metadata:
      labels:
        app: shop-web
    spec:
      containers:
        - name: shop-web
          image: <your-docker-user>/kub-cafe-shop:1
          imagePullPolicy: Always
          ports:
            - containerPort: 80
```

### `kubernetes/admin-web.yaml`

Giống `shop-web.yaml`, khác tên, nhãn, image và cổng `8211`.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cafe-admin-web-service
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
spec:
  selector:
    app: admin-web
  type: LoadBalancer
  ports:
    - protocol: TCP
      port: 8211
      targetPort: 80
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cafe-admin-web-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: admin-web
  template:
    metadata:
      labels:
        app: admin-web
    spec:
      containers:
        - name: admin-web
          image: <your-docker-user>/kub-cafe-admin:1
          imagePullPolicy: Always
          ports:
            - containerPort: 80
```

### Kiểm trước khi apply

Sáu file, không file nào còn placeholder:

```bash
kubectl apply --dry-run=client -f kubernetes/
```

**Đúng:** mười ba dòng `created (dry run)` — sáu Service, sáu Deployment, một PVC — và
không có lỗi nào.

**Nếu báo lỗi YAML:** gần như luôn là thụt lề. Thông báo ghi tên file và số dòng.

Lệnh trên không bắt được placeholder còn sót, vì `<your-docker-user>` vẫn là một chuỗi hợp
lệ với YAML. Tìm riêng:

```bash
grep -rn "your-docker-user" kubernetes/
```

**PowerShell:**

```powershell
Select-String -Path kubernetes\*.yaml -Pattern "your-docker-user"
```

**Đúng:** không in ra gì. Còn dòng nào thì Pod của file đó sẽ kẹt `InvalidImageName`.

Hai trường trong năm Deployment của bạn quyết định image được kéo từ đâu:

| Trường | Ở lab k3s | Trên EKS |
| --- | --- | --- |
| `image` | Tên gì cũng được, vì đã `ctr images import` | **Phải** là repo trên Docker Hub hoặc ECR |
| `imagePullPolicy` | `IfNotPresent` | **`Always`** — node EKS chưa từng thấy máy bạn |

Kiểm image đã thật sự lên Hub, trước khi ngồi đoán vì sao Pod lỗi:

```bash
for i in auth menu order shop admin; do docker manifest inspect <your-docker-user>/kub-cafe-$i:1 > /dev/null && echo "OK $i"; done
```

**PowerShell:**

```powershell
foreach ($i in "auth","menu","order","shop","admin") { docker manifest inspect "<your-docker-user>/kub-cafe-${i}:1" > $null; if ($?) { "OK $i" } }
```


## 2. Apply theo thứ tự

Chắc chắn đang đứng đúng cụm trước đã:

```bash
kubectl config current-context
```

Database trước, vì hai API sẽ nối tới nó ngay khi khởi động:

```bash
kubectl apply -f kubernetes/mongo.yaml && kubectl rollout status deployment cafe-mongo-deployment --timeout=180s
```

**PowerShell:**

```powershell
kubectl apply -f kubernetes/mongo.yaml; if ($?) { kubectl rollout status deployment cafe-mongo-deployment --timeout=180s }
```

```bash
kubectl get pvc
```

`cafe-mongo-pvc` phải `Bound`. Kẹt `Pending` thì xem lý do — gần như luôn là thiếu EBS CSI
driver, hoặc driver có mà thiếu quyền. Thiếu quyền thì `ebs-csi-controller` cũng đang
`CrashLoopBackOff`, và cách sửa là mục *Cấp quyền bằng Pod Identity* ở
[8.8](/blog/k8s/deploy-to-cloud/ebs-block-storage):

```bash
kubectl describe pvc cafe-mongo-pvc | tail -10
```

**PowerShell:**

```powershell
kubectl describe pvc cafe-mongo-pvc | Select-Object -Last 10
```

Rồi tới ba API và hai frontend:

```bash
kubectl apply -f kubernetes/auth-api.yaml -f kubernetes/menu-api.yaml -f kubernetes/order-api.yaml -f kubernetes/shop-web.yaml -f kubernetes/admin-web.yaml
```

```bash
kubectl get pods -o wide
```

Kiểm hai API đã nối được Mongo — mỗi lệnh phải in ra dòng `đã nối được MongoDB`:

```bash
kubectl logs deploy/cafe-menu-deployment --tail=5
```

```bash
kubectl logs deploy/cafe-order-deployment --tail=5
```

**Nếu thấy `KHÔNG NỐI ĐƯỢC MONGODB`:** API đó khởi động trước khi Mongo sẵn sàng. `menu-api`
và `order-api` chỉ thử nối **một lần** lúc khởi động, không tự thử lại — Pod vẫn `Running`,
nhưng mọi thao tác với database sẽ báo `Could not save item.` hay `Could not load menu.`.
Khởi động lại đúng Deployment đó:

```bash
kubectl rollout restart deployment cafe-menu-deployment
```

> Đó là lý do apply Mongo trước và **chờ `rollout status`** xong mới apply phần còn lại.
> Chuyện này quay lại mỗi khi mọi Pod khởi động cùng lúc — sau khi tạo lại node group
> chẳng hạn. Cách chữa tận gốc là `initContainers` chờ Mongo, hoặc `readinessProbe`; cả hai
> nằm ở [9.2](/blog/k8s/wrap-up/what-to-learn-next).

## 3. `EXTERNAL-IP` không còn là một IP

```bash
kubectl get svc
```

```
NAME                TYPE           CLUSTER-IP      EXTERNAL-IP                                   PORT(S)
cafe-admin-web-service   LoadBalancer   10.100.x.x      ad3fcc6c…-272975491.<region>.elb.amazonaws.com   8211:31234/TCP
cafe-auth-service        ClusterIP      10.100.y.y      <none>                                        3000/TCP
cafe-menu-service        ClusterIP      10.100.z.z      <none>                                        3000/TCP
cafe-mongo-service       ClusterIP      10.100.a.a      <none>                                        27017/TCP
cafe-order-service       ClusterIP      10.100.b.b      <none>                                        3000/TCP
cafe-shop-web-service    LoadBalancer   10.100.c.c      a70a358e…-1652082020.<region>.elb.amazonaws.com  8210:32345/TCP
```

| | k3s (ServiceLB) | EKS |
| --- | --- | --- |
| Cái được tạo | Một Pod giữ cổng trên node | **Một load balancer thật** của AWS |
| Giá trị trả về | IP của node | **Tên miền**, không phải IP |
| Mất bao lâu | Tức thì | 2–4 phút, trong lúc đó là `<pending>` |
| Tiền | Không | **Tính theo giờ**, mỗi cái một hoá đơn |

Vì là tên miền nên jsonpath cũng khác — `.ip` không còn dùng được:

```bash
SHOP=$(kubectl get svc cafe-shop-web-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}') && ADMIN=$(kubectl get svc cafe-admin-web-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}') && echo "shop=$SHOP admin=$ADMIN"
```

**PowerShell:**

```powershell
$SHOP = kubectl get svc cafe-shop-web-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'; $ADMIN = kubectl get svc cafe-admin-web-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'; "shop=$SHOP admin=$ADMIN"
```

Đây cũng là lúc `eksClusterRole` ở [8.11](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks)
làm việc của nó: bạn viết `type: LoadBalancer`, EKS đóng vai role đó gọi API AWS để dựng
load balancer. Suốt bảy section trước, tầng này vô hình.

## 4. Test bằng giao diện

Tên miền cần thêm một hai phút để phân giải được, kể cả khi `kubectl` đã in ra:

```bash
until getent hosts $ADMIN > /dev/null; do sleep 10; done && echo "DNS san sang"
```

**PowerShell:**

```powershell
while (-not (Resolve-DnsName $ADMIN -ErrorAction SilentlyContinue)) { Start-Sleep 10 }; "DNS san sang"
```

Mở `http://<ADMIN>:8211` trên trình duyệt:

1. **Log in** → chứng minh `admin-web` → `auth-api` thông.
2. **Add item** kèm một ảnh trong thư mục `images/` → chứng minh `menu-api` ghi được Mongo
   và ghi được file.
3. Mở `http://<SHOP>:8210`, bấm **Place order** → chứng minh `order-api` đọc được giá từ
   Mongo và gọi được `auth`.
4. Quay lại admin → đơn hiện ở **Recent orders**; chưa thấy thì bấm **Reload**.

Nhớ gõ đủ `http://` và cổng. Load balancer chỉ nghe `8210` và `8211`, không nghe cổng 80.

Bốn bước đó đi qua **toàn bộ** các mũi tên trong sơ đồ ở 8.3. Không cần `curl` dòng nào.

## Khi nó không chạy

Đọc `STATUS` trước, đừng đoán:

```bash
kubectl get pods
```

| `STATUS` | Nguyên nhân trên EKS |
| --- | --- |
| `ImagePullBackOff` | Chưa push, repo private, hoặc `imagePullPolicy` vẫn `IfNotPresent` |
| `ImagePullBackOff` kèm `no match for platform` | Build trên máy ARM — build lại với `--platform linux/amd64` |
| `Pending` | Node hết chỗ — `Too many pods`, kiểm 10 ở [8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes) — hoặc PVC chưa `Bound` |
| `CrashLoopBackOff` | Thiếu hoặc sai biến môi trường |
| `InvalidImageName` | Còn sót `<your-docker-user>` trong manifest |
| `Running` nhưng thêm món báo `Could not save item.` | API khởi động trước Mongo và không nối lại — `kubectl rollout restart` Deployment đó |
| `Running` nhưng giao diện lỗi | Xem mục dưới |

```bash
kubectl logs deploy/cafe-menu-deployment --tail=30
```

Ba lỗi hay gặp nhất của dự án này, và cách tách chúng ra:

```bash
kubectl run probe --rm -i --restart=Never --image=busybox:1.36 -- wget -qO- -T 5 http://cafe-menu-service:3000/menu/health
```

| Kết quả | Nghĩa |
| --- | --- |
| JSON có `pod` và `images` | `menu-api` khoẻ. Lỗi nằm ở nginx hoặc load balancer |
| `bad address` | DNS cụm hỏng — thiếu CoreDNS |
| Treo rồi timeout | Service không khớp Pod nào: `kubectl get endpointslices` |

## Khi `EXTERNAL-IP` đứng mãi ở `<pending>`

Lý do **luôn** nằm trong event của Service, không phải trong log Pod:

```bash
kubectl describe svc cafe-shop-web-service | grep -A10 "Events:"
```

**PowerShell:**

```powershell
kubectl describe svc cafe-shop-web-service | Select-String -Pattern "Events:" -Context 0,10
```

| Event | Cách sửa |
| --- | --- |
| `sts:TagSession ... AccessDenied` | Chỉ gặp khi cụm **bật Auto Mode**: trust policy của `eksClusterRole` thiếu `sts:TagSession` — xem [8.5](/blog/k8s/deploy-to-cloud/iam-roles) |
| `is not authorized to perform: …` | `eksClusterRole` thiếu policy. Auto Mode tắt: phải có `AmazonEKSClusterPolicy`. Auto Mode bật: thêm bốn policy ở lệnh dưới |
| `could not find any suitable subnets` | Subnet public thiếu tag `kubernetes.io/role/elb` |
| Không có event nào | Cụm không có node `Ready` |

Chuỗi lỗi này đi **sâu dần**, nên mỗi lần đổi thông báo là một bước tiến.

Kiểm role đang có những policy nào:

```bash
aws iam list-attached-role-policies --role-name eksClusterRole --query "AttachedPolicies[].PolicyName" --output text
```

Cụm của section này **tắt Auto Mode**, nên chỉ cần thấy `AmazonEKSClusterPolicy`. Lệnh gắn
bốn policy dưới đây **chỉ dành cho cụm bật Auto Mode**:

```bash
for p in AmazonEKSLoadBalancingPolicy AmazonEKSNetworkingPolicy AmazonEKSComputePolicy AmazonEKSBlockStoragePolicy; do aws iam attach-role-policy --role-name eksClusterRole --policy-arn arn:aws:iam::aws:policy/$p; done
```

**PowerShell:**

```powershell
foreach ($p in "AmazonEKSLoadBalancingPolicy","AmazonEKSNetworkingPolicy","AmazonEKSComputePolicy","AmazonEKSBlockStoragePolicy") { aws iam attach-role-policy --role-name eksClusterRole --policy-arn "arn:aws:iam::aws:policy/$p" }
```

```bash
aws ec2 create-tags --resources subnet-aaa subnet-bbb --tags Key=kubernetes.io/role/elb,Value=1
```

Sửa IAM xong phải **tạo lại Service** — nó không tự thử lại:

```bash
kubectl delete svc cafe-shop-web-service && kubectl apply -f kubernetes/shop-web.yaml
```

**PowerShell:**

```powershell
kubectl delete svc cafe-shop-web-service; if ($?) { kubectl apply -f kubernetes/shop-web.yaml }
```

## Nếu tên miền ra `ENOTFOUND`

Load balancer đang là `internal`: nó chỉ phân giải được từ **trong** VPC.

```bash
aws elbv2 describe-load-balancers --query "LoadBalancers[].{dns:DNSName,scheme:Scheme,state:State.Code}" --output table
```

Hai controller có hai mặc định ngược nhau, và đây là chỗ khoá học không thể nhắc tới vì
thời đó chưa có cái thứ hai:

| Controller | Scheme mặc định |
| --- | --- |
| In-tree cloud provider (Classic ELB) | `internet-facing` |
| AWS Load Balancer Controller, và EKS Auto Mode | **`internal`** |

Vì vậy hai file `shop-web.yaml` và `admin-web.yaml` khai thẳng:

```yaml
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
```

Scheme **không sửa tại chỗ được** — phải xoá Service rồi apply lại để dựng load balancer
mới, và tên miền sẽ khác tên cũ.

## Đừng chờ load balancer mới học tiếp

`port-forward` bỏ qua cả Service lẫn load balancer:

```bash
kubectl port-forward svc/cafe-admin-web-service 8211:8211
```

Mở `http://localhost:8211` là dùng được trang quản trị như thường, đủ để đi tiếp sang phần
volume.

## Self-check

- [ ] Kể sáu thứ trong danh sách kiểm, và triệu chứng khi thiếu từng cái
- [ ] Viết được sáu file manifest, và chỉ ra mỗi file khác nhau ở những trường nào
- [ ] Biết vì sao phải chờ Mongo sẵn sàng rồi mới apply hai API
- [ ] Nói được vì sao `imagePullPolicy: IfNotPresent` hỏng trên EKS
- [ ] Biết `EXTERNAL-IP` trên EKS là tên miền, và lấy nó bằng `.hostname`
- [ ] Nói được bốn bước bấm trên giao diện chứng minh những mắt xích nào
- [ ] Giải thích vì sao load balancer ra `internal` nếu không khai annotation
- [ ] Biết dùng `port-forward` để đi tiếp trong lúc load balancer chưa xong

## Open questions

- Mỗi `LoadBalancer` là một hoá đơn. Hai frontend gộp về một cửa vào được không?
- `cafe-mongo-pvc` dùng `gp2`. Nếu node ở AZ khác với volume thì Pod có chạy được không?
- Bí mật vẫn nằm trong YAML. Secret của Kubernetes thật sự bảo vệ được gì?
