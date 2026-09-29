---
title: "8.8 Áp cấu hình Kubernetes lên cluster"
description: "Cùng bộ YAML, cụm khác — cộng một danh sách kiểm mà khoá học không có, vì năm 2020 EKS chưa bắt bạn tự cài những thứ này."
status: growing
created: 2026-09-25
updated: 2026-09-29
tags: [k8s, eks, kubectl, deploy, loadbalancer, addon]
---

> Tiếp [8.7](/blog/k8s/deploy-to-cloud/adding-worker-nodes). `kubectl get nodes` ra node
> `Ready`, và thư mục `kub-demo-cafe-system` từ
> [8.3](/blog/k8s/deploy-to-cloud/preparing-the-project) đã sẵn sàng.

`kubectl apply -f` không có gì mới. Bảy section vừa rồi bạn học một API, và API ấy không
đổi khi cụm nằm trên máy người khác.

Thứ đổi là **mọi tầng bên dưới nó**. Note này đi qua danh sách kiểm trước, rồi mới apply.

## Danh sách kiểm trước khi apply

Sáu dòng này là những thứ mà một cụm EKS mới **không** có sẵn. Thiếu bất kỳ cái nào, lỗi
sẽ hiện ra ở một chỗ rất xa nguyên nhân.

| # | Thứ cần | Thiếu thì triệu chứng là |
| --- | --- | --- |
| 1 | Access entry cho IAM user của bạn | `kubectl` báo `You must be logged in to the server` |
| 2 | Add-on `vpc-cni` | Node `NotReady`, `cni plugin not initialized` |
| 3 | Add-on `coredns` và `kube-proxy` | Pod chạy nhưng **không phân giải được tên nào** — `bad address` |
| 4 | Add-on `aws-ebs-csi-driver` | PVC của Mongo kẹt `Pending` mãi |
| 5 | `eksClusterRole` đủ policy và có `sts:TagSession` | `EXTERNAL-IP` kẹt `<pending>` |
| 6 | Subnet public có tag, Service có annotation scheme | Load balancer dựng ra là `internal`, gọi từ ngoài ra `ENOTFOUND` |

Kiểm nhanh bốn add-on:

```bash
aws eks list-addons --cluster-name kub-dep-demo
```

Thiếu cái nào thì cài. Trên Console: **EKS → cluster → Add-ons → Get more add-ons**, tick
rồi **Create**. Bằng CLI:

```bash
for a in vpc-cni coredns kube-proxy aws-ebs-csi-driver; do aws eks create-addon --cluster-name kub-dep-demo --addon-name $a; done
```

Kiểm DNS trong cụm đã sống chưa — một lệnh, và nó cũng in ra **IP mà thế giới bên ngoài
nhìn thấy khi Pod gọi ra internet**:

```bash
kubectl run ipcheck --rm -i --restart=Never --image=busybox:1.36 -- wget -qO- -T 8 http://checkip.amazonaws.com
```

`bad address` nghĩa là thiếu CoreDNS, quay lại dòng 3. Chi tiết từng thứ nằm ở
[8.6](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks) và
[8.7](/blog/k8s/deploy-to-cloud/adding-worker-nodes).

## 1. Sửa YAML cho cụm thật

Năm file trong `kubernetes/` đều có hai chỗ cần xem:

```yaml
          image: <your-docker-user>/kub-cafe-auth:1
          imagePullPolicy: Always
```

| Trường | Ở lab k3s | Trên EKS |
| --- | --- | --- |
| `image` | Tên gì cũng được, vì đã `ctr images import` | **Phải** là repo trên Docker Hub hoặc ECR |
| `imagePullPolicy` | `IfNotPresent` | **`Always`** — node EKS chưa từng thấy máy bạn |

Kiểm image đã thật sự lên Hub, trước khi ngồi đoán vì sao Pod lỗi:

```bash
for i in auth menu order shop admin; do docker manifest inspect <your-docker-user>/kub-cafe-$i:1 > /dev/null && echo "OK $i"; done
```

Và trong `kubernetes/mongo.yaml`, `storageClassName: gp2` chỉ dùng được khi add-on
`aws-ebs-csi-driver` đã cài. Trên k3d thì đổi thành `local-path`.

## 2. Apply theo thứ tự

Chắc chắn đang đứng đúng cụm trước đã:

```bash
kubectl config current-context
```

Database trước, vì hai API sẽ nối tới nó ngay khi khởi động:

```bash
kubectl apply -f kubernetes/mongo.yaml && kubectl rollout status deployment cafe-mongo-deployment --timeout=180s
```

```bash
kubectl get pvc
```

`cafe-mongo-pvc` phải `Bound`. Kẹt `Pending` thì xem lý do — gần như luôn là thiếu EBS CSI
driver:

```bash
kubectl describe pvc cafe-mongo-pvc | tail -10
```

Rồi tới ba API và hai frontend:

```bash
kubectl apply -f kubernetes/auth.yaml -f kubernetes/menu.yaml -f kubernetes/order.yaml -f kubernetes/shop-web.yaml -f kubernetes/admin-web.yaml
```

```bash
kubectl get pods -o wide
```

> Thứ tự apply không bắt buộc đúng — Kubernetes tự hội tụ về trạng thái bạn khai, và một
> Pod khởi động trước database sẽ tự nối lại sau. Apply Mongo trước chỉ để bạn đọc log
> cho dễ.

## 3. `EXTERNAL-IP` không còn là một IP

```bash
kubectl get svc
```

```
NAME                TYPE           CLUSTER-IP      EXTERNAL-IP                                   PORT(S)
cafe-admin-web-service   LoadBalancer   10.100.x.x      k8s-default-adminweb-...elb.amazonaws.com     8211:31234/TCP
cafe-auth-service        ClusterIP      10.100.y.y      <none>                                        3000/TCP
cafe-menu-service        ClusterIP      10.100.z.z      <none>                                        3000/TCP
cafe-mongo-service       ClusterIP      10.100.a.a      <none>                                        27017/TCP
cafe-order-service       ClusterIP      10.100.b.b      <none>                                        3000/TCP
cafe-shop-web-service    LoadBalancer   10.100.c.c      k8s-default-shopweb-...elb.amazonaws.com      8210:32345/TCP
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

Đây cũng là lúc `eksClusterRole` ở [8.6](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks)
làm việc của nó: bạn viết `type: LoadBalancer`, EKS đóng vai role đó gọi API AWS để dựng
load balancer. Suốt bảy section trước, tầng này vô hình.

## 4. Test bằng giao diện

Tên miền cần thêm một hai phút để phân giải được, kể cả khi `kubectl` đã in ra:

```bash
until getent hosts $ADMIN > /dev/null; do sleep 10; done && echo "DNS san sang"
```

Mở `http://<ADMIN>:8211` trên trình duyệt:

1. Đăng nhập → chứng minh `admin-web` → `auth-api` thông.
2. Thêm một món kèm ảnh → chứng minh `menu-api` ghi được Mongo và ghi được file.
3. Mở `http://<SHOP>:8210`, đặt một đơn → chứng minh `order-api` đọc được giá từ Mongo và
   gọi được `auth`.
4. Quay lại admin, bấm **Tải lại** → đơn hiện ra.

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
| `Pending` | Hết chỗ, hoặc PVC chưa `Bound` |
| `CrashLoopBackOff` | Thiếu hoặc sai biến môi trường |
| `Completed` rồi restart | App tự thoát — với `menu`/`order` thường là không nối được Mongo |
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

| Event | Cách sửa |
| --- | --- |
| `sts:TagSession ... AccessDenied` | Trust policy của `eksClusterRole` — xem [8.6](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks) |
| `is not authorized to perform: ec2:…` | Role thiếu policy, gắn bốn policy của Auto Mode |
| `could not find any suitable subnets` | Subnet public thiếu tag `kubernetes.io/role/elb` |
| Không có event nào | Cụm không có node `Ready` |

Chuỗi lỗi này đi **sâu dần**, nên mỗi lần đổi thông báo là một bước tiến.

```bash
for p in AmazonEKSLoadBalancingPolicy AmazonEKSNetworkingPolicy AmazonEKSComputePolicy AmazonEKSBlockStoragePolicy; do aws iam attach-role-policy --role-name eksClusterRole --policy-arn arn:aws:iam::aws:policy/$p; done
```

```bash
aws ec2 create-tags --resources subnet-aaa subnet-bbb --tags Key=kubernetes.io/role/elb,Value=1
```

Sửa IAM xong phải **tạo lại Service** — nó không tự thử lại:

```bash
kubectl delete svc cafe-shop-web-service && kubectl apply -f kubernetes/shop-web.yaml
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
- [ ] Nói được vì sao `imagePullPolicy: IfNotPresent` hỏng trên EKS
- [ ] Biết `EXTERNAL-IP` trên EKS là tên miền, và lấy nó bằng `.hostname`
- [ ] Nói được bốn bước bấm trên giao diện chứng minh những mắt xích nào
- [ ] Giải thích vì sao load balancer ra `internal` nếu không khai annotation
- [ ] Biết dùng `port-forward` để đi tiếp trong lúc load balancer chưa xong

## Open questions

- Mỗi `LoadBalancer` là một hoá đơn. Hai frontend gộp về một cửa vào được không?
- `cafe-mongo-pvc` dùng `gp2`. Nếu node ở AZ khác với volume thì Pod có chạy được không?
- Bí mật vẫn nằm trong YAML. Secret của Kubernetes thật sự bảo vệ được gì?
