---
title: "8.8 Áp cấu hình Kubernetes lên cluster"
description: "Cùng bộ YAML, cụm khác — và ba chỗ lộ ra rằng cụm thật không giống lab: image phải qua registry, EXTERNAL-IP là một tên miền, và database ở ngoài nhìn bạn bằng một IP khác."
status: growing
created: 2026-09-25
updated: 2026-09-26
tags: [k8s, eks, kubectl, deploy, loadbalancer, mongodb]
---

> Tiếp [8.7](/blog/k8s/deploy-to-cloud/adding-worker-nodes). `kubectl get nodes` ra hai
> node `Ready`, và thư mục `kub-deploy` từ
> [8.3](/blog/k8s/deploy-to-cloud/preparing-the-project) đã sẵn sàng.

Phần hay nhất của note này là nó **không có gì mới**. Vẫn hai file YAML đó, vẫn
`kubectl apply -f` đó. Bảy section vừa rồi bạn học một API, và API ấy không đổi khi cụm
nằm trên máy người khác.

Nhưng có ba chỗ lộ ra, và cả ba đều là thứ lab che mất.

## 1. Sửa YAML cho cụm thật

Hai chỗ trong `kubernetes/auth.yaml` và `kubernetes/users.yaml`:

```yaml
          image: <your-docker-user>/kub-dep-auth:1
          imagePullPolicy: Always
```

| Trường | Ở lab k3s | Trên EKS |
| --- | --- | --- |
| `image` | Tên gì cũng được, vì đã `ctr images import` | **Phải** là repo public trên Docker Hub (hoặc ECR) |
| `imagePullPolicy` | `IfNotPresent` — dùng bản đã nạp vào node | **`Always`** — node EKS không có kho local của bạn |

Node trên EKS là EC2 mới tinh do AWS dựng. Nó chưa từng thấy máy bạn, nên **image bắt buộc
phải đi qua registry**:

```bash
docker push <your-docker-user>/kub-dep-auth:1 && docker push <your-docker-user>/kub-dep-users:1
```

Kiểm image đã thật sự lên Hub, trước khi ngồi đoán vì sao Pod lỗi:

```bash
docker manifest inspect <your-docker-user>/kub-dep-users:1 > /dev/null && echo OK
```

Và kiểm luôn `MONGODB_CONNECTION_URI` với `TOKEN_KEY` trong hai file YAML đã là giá trị
thật của bạn, không còn placeholder.

## 2. Apply

Chắc chắn đang đứng đúng cụm trước đã — đây là lệnh đáng gõ thành phản xạ:

```bash
kubectl config current-context
```

```bash
kubectl apply -f kubernetes/auth.yaml -f kubernetes/users.yaml
```

```
service/auth-service created
deployment.apps/auth-deployment created
service/users-service created
deployment.apps/users-deployment created
```

Bốn object từ hai file, vì mỗi file chứa hai tài liệu YAML ngăn bằng `---`.

```bash
kubectl rollout status deployment auth-deployment --timeout=120s && kubectl rollout status deployment users-deployment --timeout=120s
```

```bash
kubectl get pods -o wide
```

Cột `NODE` cho thấy scheduler đặt hai Pod ở đâu. Trên cụm hai node, chúng có thể nằm cùng
một máy hoặc tách ra — cả hai đều đúng, và **`users` vẫn gọi được `auth`** dù nằm khác
máy. Đó chính là thứ `auth-service` sinh ra để lo.

## 3. `EXTERNAL-IP` không còn là một IP

```bash
kubectl get svc
```

```
NAME            TYPE           CLUSTER-IP      EXTERNAL-IP                                    PORT(S)
auth-service    ClusterIP      10.100.x.x      <none>                                         3000/TCP
users-service   LoadBalancer   10.100.y.y      a1b2c3...ap-southeast-2.elb.amazonaws.com      8201:31234/TCP
```

Khác biệt với k3s nằm ở cột `EXTERNAL-IP`:

| | k3s (ServiceLB) | EKS |
| --- | --- | --- |
| Cái được tạo | Một Pod giữ cổng trên node | **Một ELB thật** của AWS |
| Giá trị trả về | IP của node | **Tên miền**, không phải IP |
| Mất bao lâu | Tức thì | 2–4 phút, trong lúc đó là `<pending>` |
| Tiền | Không | **Tính theo giờ** |

Vì là tên miền nên lệnh lấy địa chỉ cũng khác — `.ip` không còn dùng được:

```bash
USERS=$(kubectl get svc users-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}') && echo $USERS
```

Đây cũng là lúc `eksClusterRole` ở [8.6](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks)
làm việc của nó: bạn viết `type: LoadBalancer`, EKS đóng vai role đó gọi API AWS để dựng
ELB. Suốt bảy section trước, tầng này vô hình.

## 4. Test

Tên miền ELB cần thêm một hai phút nữa để phân giải được, kể cả khi `kubectl` đã in ra.
Chờ tới khi lệnh này ra kết quả:

```bash
until getent hosts $USERS > /dev/null; do sleep 10; done && echo "DNS san sang"
```

```bash
curl -i -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"1234567"}' http://$USERS:8201/signup
```

```bash
curl -s -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"1234567"}' http://$USERS:8201/login
```

Mong đợi: `201` với một `user` mới, rồi một JWT.

`201` ở đây nói được ba điều cùng lúc, và đó là lý do nó là phép thử tốt:

| | |
| --- | --- |
| ELB → Pod `users` | Service `LoadBalancer` đã nối đúng |
| `users` → `auth` | DNS nội bộ trong cụm chạy, `auth-service.default:3000` phân giải được |
| `users` → Atlas | Node ra được internet, và Atlas cho IP đó vào |

Kiểm chứng mắt xích thứ ba bằng cách mở Atlas, xem collection `users` có bản ghi mới.

> Nhận `422 {"message":"Invalid email or password."}` thì chưa phải lỗi hạ tầng —
> password phải **≥ 7 ký tự**, đúng như [8.3](/blog/k8s/deploy-to-cloud/preparing-the-project)
> đã nói. App tự từ chối trước khi gọi ai.

## Khi nó không chạy

Đọc `STATUS` trước, đừng đoán:

```bash
kubectl get pods
```

| `STATUS` | Nguyên nhân trên EKS |
| --- | --- |
| `ImagePullBackOff` | Chưa push, repo để private, hoặc `imagePullPolicy` vẫn là `IfNotPresent` |
| `ImagePullBackOff` kèm `no match for platform` | Build trên máy ARM (Mac M-series), node EKS là amd64 — xem dưới |
| `Pending` | Hết chỗ: node group scale 0, hoặc chạm trần số Pod của `t3.small` |
| `CrashLoopBackOff` | Thiếu hoặc sai biến môi trường |
| `Running` nhưng `signup` ra `500` | `users` không gọi được `auth`, hoặc không tới được Atlas |

```bash
kubectl describe pod -l app=users | tail -20
```

```bash
kubectl logs deploy/users-deployment --tail=30
```

**Build trên máy ARM:** ép đúng kiến trúc của node rồi push lại:

```bash
docker build --platform linux/amd64 -t <your-docker-user>/kub-dep-users:2 ./users-api && docker push <your-docker-user>/kub-dep-users:2
```

**`500` ở `signup`:** tách hai khả năng ra, gọi thẳng `auth` từ trong Pod `users`:

```bash
kubectl exec deploy/users-deployment -- wget -qO- -T 3 http://auth-service.default:3000/token/abc/abc
```

Có phản hồi thì mắt xích `users → auth` ổn, và thủ phạm là Atlas.

## Khi `EXTERNAL-IP` đứng mãi ở `<pending>`

Kubernetes đã nhận Service, nhưng AWS chưa dựng được load balancer. Lý do **luôn** nằm
trong event của Service, không phải trong log Pod:

```bash
kubectl describe svc users-service | grep -A10 "Events:"
```

| Event | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| `sts:TagSession ... AccessDenied` | Trust policy của `eksClusterRole` chỉ cho `sts:AssumeRole` | Xem [8.6](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks) — mục Auto Mode |
| `is not authorized to perform: ec2:GetSecurityGroupsForVpc` | Đóng vai được role rồi, nhưng role thiếu policy | Gắn bốn policy của Auto Mode, xem dưới |
| `could not find any suitable subnets for creating the ELB` | Subnet thiếu tag | Gắn tag, xem dưới |
| Không có event nào | Không có controller nào nhận Service này | Kiểm `kubectl get nodes` — cụm không có node `Ready` |

Chuỗi lỗi này đi **sâu dần**, nên mỗi lần đổi thông báo là một bước tiến, không phải một
vấn đề mới.

Thiếu quyền thì gắn thêm:

```bash
for p in AmazonEKSLoadBalancingPolicy AmazonEKSNetworkingPolicy AmazonEKSComputePolicy AmazonEKSBlockStoragePolicy; do aws iam attach-role-policy --role-name eksClusterRole --policy-arn arn:aws:iam::aws:policy/$p; done
```

Thiếu tag subnet thì gắn cho các subnet **public**:

```bash
aws ec2 create-tags --resources subnet-aaa subnet-bbb --tags Key=kubernetes.io/role/elb,Value=1
```

Sửa xong, ép Service thử lại bằng cách tạo lại nó — sửa IAM không tự kích hoạt lần thử
mới:

```bash
kubectl delete svc users-service && kubectl apply -f kubernetes/users.yaml
```

Và nhớ là **Auto Mode dựng NLB**, nên kiểm phía AWS bằng `elbv2`, còn cụm thường dựng
Classic ELB thì mới dùng `elb`:

```bash
aws elbv2 describe-load-balancers --query "LoadBalancers[].{name:LoadBalancerName,dns:DNSName,state:State.Code}" --output table
```

### Đừng chờ load balancer mới học tiếp

`port-forward` bỏ qua cả Service lẫn ELB, đủ để kiểm tra app và để đi tiếp sang phần EFS:

```bash
kubectl port-forward svc/users-service 8201:8201
```

```bash
curl -i -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"1234567"}' http://localhost:8201/signup
```

Ra `201` nghĩa là Deployment, Service, DNS nội bộ và Atlas đều đúng, và thứ duy nhất còn
thiếu là ELB.

## Chỗ này lab không dạy được: Atlas nhìn thấy IP nào

Khi bạn chạy bằng Docker ở máy nhà, Atlas thấy **IP nhà mạng của bạn**. Từ trong EKS, Pod
đi ra internet qua **NAT Gateway** của VPC — nên Atlas thấy một IP hoàn toàn khác, là
Elastic IP của NAT Gateway đó.

Nếu ở Atlas bạn chỉ mở đúng IP nhà, `signup` sẽ treo rồi trả `500` với lỗi timeout khi kết
nối Mongo, dù mọi thứ trong cụm đều xanh.

| Cách mở ở Atlas | Đánh giá |
| --- | --- |
| `0.0.0.0/0` | Nhanh, và là thứ khoá học làm. Biết rõ là đang mở database ra cả internet |
| Thêm EIP của NAT Gateway | Chặt hơn, và chỉ mất một lệnh để tra |

```bash
aws ec2 describe-nat-gateways --filter "Name=state,Values=available" --query "NatGateways[].NatGatewayAddresses[].PublicIp" --output text
```

Đây là loại vấn đề **chỉ xuất hiện trên cụm thật**: cùng một manifest, cùng một chuỗi kết
nối, nhưng danh tính mạng của bên gọi đã đổi.

## Dọn — phần dễ quên nhất

Xoá Deployment **không** xoá ELB. ELB được tạo bởi Service, nên nó chỉ biến mất khi bạn
xoá Service:

```bash
kubectl delete -f kubernetes/users.yaml -f kubernetes/auth.yaml
```

```bash
kubectl get svc
```

Còn dòng `users-service` nghĩa là ELB vẫn sống và vẫn tính tiền. Kiểm lại phía AWS cho
chắc:

```bash
aws elbv2 describe-load-balancers --query "LoadBalancers[].{name:LoadBalancerName,state:State.Code}" --output table
```

```bash
aws elb describe-load-balancers --query "LoadBalancerDescriptions[].LoadBalancerName" --output text
```

Hai lệnh vì có hai thế hệ: `elbv2` cho ALB/NLB, `elb` cho Classic — mà `type: LoadBalancer`
mặc định trên EKS vẫn dựng **Classic ELB** nếu không cài thêm controller nào.

Đây là cái bẫy hoá đơn kinh điển: người ta xoá node group, tưởng đã dừng hết, nhưng ELB
mồ côi vẫn nằm đó chạy đồng hồ.

## Nếu chỉ đọc chứ không bật EKS

Toàn bộ note này chạy nguyên xi trên k3d, đổi đúng hai chỗ:

```bash
sed -i 's/imagePullPolicy: Always/imagePullPolicy: IfNotPresent/' kubernetes/*.yaml
```

```bash
k3d image import <your-docker-user>/kub-dep-auth:1 <your-docker-user>/kub-dep-users:1 -c lab
```

```bash
kubectl apply -f kubernetes/auth.yaml -f kubernetes/users.yaml
```

Và lấy địa chỉ bằng `.ip` thay vì `.hostname`, vì ServiceLB trả về IP chứ không phải tên
miền. Ba thứ k3d không tái hiện được: ELB thật, NAT Gateway đứng giữa bạn và Atlas, và
chuyện node là một máy hoàn toàn xa lạ với kho image local.

## Self-check

- [ ] Nói được vì sao `imagePullPolicy: IfNotPresent` dùng được ở k3s nhưng hỏng trên EKS
- [ ] Biết `EXTERNAL-IP` trên EKS là tên miền, và lấy nó bằng `.hostname`
- [ ] Biết đọc event của Service khi `EXTERNAL-IP` kẹt `<pending>`, và nói được lỗi nằm ngoài Kubernetes
- [ ] Biết dùng `port-forward` để đi tiếp trong lúc load balancer chưa xong
- [ ] Nói được `201` ở `signup` chứng minh ba mắt xích nào
- [ ] Giải thích được vì sao Atlas thấy một IP khác khi gọi từ trong cụm
- [ ] Biết vì sao phải xoá Service chứ không chỉ xoá Deployment

## Open questions

- `type: LoadBalancer` trên EKS dựng Classic ELB. Muốn NLB hoặc ALB thì khai thêm gì?
- Chuỗi kết nối Mongo đang nằm thẳng trong YAML — Secret thay đổi được gì, và **không** thay đổi được gì?
- Hai Service `LoadBalancer` là hai ELB, hai hoá đơn. Trên EKS thì cách gộp là gì?
