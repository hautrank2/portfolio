---
title: "8.19 Dọn dẹp — tắt hết để không mất phí"
description: "Xoá theo đúng thứ tự ngược với lúc dựng, kiểm từng bước bằng lệnh, rồi đi tìm những thứ hay sống sót: load balancer, đĩa EBS, mount target, NAT Gateway."
status: growing
created: 2026-10-01
updated: 2026-10-01
tags: [k8s, aws, eks, cleanup, cost, efs, ebs, elb, nat]
---

> Tiếp [8.18](/blog/k8s/deploy-to-cloud/using-the-efs-volume). Cafe System đang chạy trên
> EKS, ảnh nằm trên EFS, dữ liệu nằm trên EBS — và mọi thứ vẫn đang tính tiền theo giờ.

Note cuối của section, và là note **phải làm** nếu bạn không định giữ cụm chạy tiếp. Ước
tính ở [8.4](/blog/k8s/deploy-to-cloud/services-and-cost): quên một ngày khoảng $7, quên một
tháng hơn $200.

Dọn EKS không phải là bấm **Delete cluster** rồi thôi. Một nửa số thứ tính tiền **không**
bị xoá theo cluster — chúng là tài nguyên Kubernetes tạo hộ, hoặc tài nguyên bạn tạo tay
bên ngoài cụm.

> **Muốn nghỉ vài giờ rồi học tiếp, không muốn dọn hẳn?** Scale node group về 0 theo mục
> Tiền ở [8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes) — EC2 ngừng tính tiền, cụm
> và dữ liệu giữ nguyên. Nhưng control plane, NAT Gateway và hai load balancer **vẫn** tính
> tiền. Nghỉ qua đêm thì dọn hẳn theo note này rẻ hơn.

## Thứ tự: ngược với lúc dựng

```
1. Service LoadBalancer    → AWS gỡ hai load balancer
2. Workload và PVC         → AWS gỡ đĩa EBS của Mongo
3. Node group              → EC2 tắt
4. Cluster                 → control plane, add-on, access entry đi theo
5. EFS                     → mount target, rồi file system, rồi security group eks-efs
6. Stack VPC               → NAT Gateway, subnet, VPC đi theo
7. Kiểm thứ sống sót       → mỗi lệnh phải ra trống
8. IAM                     → miễn phí, tuỳ chọn
```

Thứ tự không tuỳ ý. Bước 1 và 2 dựa vào **controller đang chạy trong cụm** để gỡ tài
nguyên AWS: controller của cloud provider gỡ load balancer, driver EBS gỡ đĩa. Xoá node
group hay cluster trước là không còn ai gỡ — load balancer và đĩa thành **mồ côi**, vẫn
tính tiền, và còn chặn bước 6.

Mỗi bước dưới có lệnh, kết quả **Đúng**, và việc cần làm **Nếu không**. Bước nào chưa đúng
thì đừng sang bước sau.

Hai bước mất thời gian chờ là 3 và 4. Cái gì phải chờ cái gì:

| Bước | Phải chờ xong | Làm song song được với |
| --- | --- | --- |
| 3. Node group | Bước 1 và 2 | Bước 5 |
| 4. Cluster | **Bước 3 xong hẳn** — `DELETING` chưa tính | Bước 5 |
| 5. EFS | Bước 2 — không còn Pod nào mount | Bước 3 và 4 |
| 6. Stack VPC | **Cả bước 4 lẫn bước 5** | — |

## 0. Đứng đúng chỗ

Region của CLI phải là region đã dựng mọi thứ:

```bash
aws configure get region
```

`kubectl` phải đang trỏ vào cụm EKS, không phải cụm k3s ở máy:

```bash
kubectl config current-context
```

**Đúng:** `eks`, hoặc tên context bạn đặt ở [8.12](/blog/k8s/deploy-to-cloud/connecting-kubectl-to-eks).

**Nếu không:** đổi context trước — một `kubectl delete` gõ đúng lệnh mà sai cụm là xoá nhầm
chỗ:

```bash
kubectl config use-context eks
```

Muốn giữ dữ liệu Mongo để dựng lại sau, sao lưu **trước** bước 2 — sau bước 2 đĩa không còn:

```bash
kubectl exec deploy/cafe-mongo-deployment -- mongodump --db cafe --archive=/tmp/cafe.archive
```

```bash
kubectl get pods -l app=mongo -o name
```

```bash
kubectl cp <mongo-pod-name>:/tmp/cafe.archive ./cafe.archive
```

`<mongo-pod-name>` là phần sau `pod/` của lệnh thứ hai.

## 1. Gỡ hai load balancer

```bash
kubectl delete svc cafe-shop-web-service cafe-admin-web-service
```

Cụm này tắt Auto Mode nên load balancer là loại **Classic**
([8.9](/blog/k8s/deploy-to-cloud/elastic-load-balancing)). Chờ một phút, rồi kiểm:

```bash
aws elb describe-load-balancers --query "LoadBalancerDescriptions[].{name:LoadBalancerName,dns:DNSName}" --output table
```

**Đúng:** bảng trống.

**Nếu còn dòng:** chờ thêm một hai phút — controller gỡ không tức thì. Quá 5 phút vẫn còn
thì xem event của Service đã xoá không được; gỡ tay bằng tên ở cột `name`:

```bash
aws elb delete-load-balancer --load-balancer-name <load-balancer-name>
```

Đang dùng NLB hay ALB — cụm bật Auto Mode hoặc có AWS Load Balancer Controller — thì kiểm ở
API kia:

```bash
aws elbv2 describe-load-balancers --query "LoadBalancers[].{name:LoadBalancerName,type:Type}" --output table
```

## 2. Gỡ workload và PVC

Một lệnh xoá mọi thứ khai trong thư mục `kubernetes/` — Deployment, Service còn lại, PVC
của Mongo, PV và PVC của EFS:

```bash
kubectl delete -f kubernetes/
```

Lệnh có thể đứng vài chục giây ở PVC: nó chờ Pod tắt hẳn rồi mới gỡ được volume — finalizer
`pvc-protection` ở [8.17](/blog/k8s/deploy-to-cloud/persistent-volume-for-efs). Đứng chờ là
bình thường.

| Thứ bị xoá | Chuyện gì xảy ra phía AWS |
| --- | --- |
| PVC `cafe-mongo-pvc` | StorageClass `gp2` có `reclaimPolicy: Delete` — driver EBS **xoá đĩa** |
| PV `cafe-menu-images-pv` | `Retain`, và chỉ là object phía Kubernetes — EFS **không** bị đụng tới, dọn ở bước 5 |

Kiểm phía Kubernetes:

```bash
kubectl get pv,pvc
```

**Đúng:** `No resources found`.

Kiểm phía AWS — đĩa của Mongo phải biến mất, thường sau một hai phút:

```bash
aws ec2 describe-volumes --filters Name=tag:kubernetes.io/created-for/pvc/name,Values=cafe-mongo-pvc --query "Volumes[].{id:VolumeId,state:State}" --output table
```

**Đúng:** bảng trống.

**Nếu còn dòng ở trạng thái `available`:** driver không kịp xoá, hoặc thiếu quyền —
kiểm 9 ở [8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes). Xoá tay bằng id ở cột `id`:

```bash
aws ec2 delete-volume --volume-id <volume-id>
```

## 3. Xoá node group

```bash
aws eks delete-nodegroup --cluster-name kub-cafe-demo --nodegroup-name kub-cafe-demo-node-group
```

```bash
aws eks wait nodegroup-deleted --cluster-name kub-cafe-demo --nodegroup-name kub-cafe-demo-node-group
```

Mất khoảng 3–5 phút. Trong lúc đó node group ở trạng thái `DELETING`:

```bash
aws eks describe-nodegroup --cluster-name kub-cafe-demo --nodegroup-name kub-cafe-demo-node-group --query "nodegroup.status" --output text
```

> **`DELETING` chưa phải là đã xoá.** Đừng chạy bước 4 lúc này: cluster chỉ xoá được khi
> node group đã biến mất hẳn. Chờ lệnh `wait` ở trên trả về, hoặc tới khi lệnh
> `describe-nodegroup` báo `ResourceNotFoundException`.
>
> Không muốn ngồi chờ thì làm **bước 5** trong lúc này — EFS thuộc VPC, không thuộc cluster,
> và sau bước 2 không còn Pod nào mount nó.

Kiểm node group đã hết:

```bash
aws eks list-nodegroups --cluster-name kub-cafe-demo --output text
```

**Đúng:** không in ra gì.

Kiểm không còn EC2 nào của cụm:

```bash
aws ec2 describe-instances --filters "Name=tag:eks:cluster-name,Values=kub-cafe-demo" "Name=instance-state-name,Values=pending,running,stopping,stopped" --query "Reservations[].Instances[].InstanceId" --output text
```

**Đúng:** không in ra gì.

**Nếu còn instance:** node group chưa xoá xong — chạy lại lệnh `wait`. Đừng terminate tay:
Auto Scaling Group của node group sẽ dựng máy mới thay vào
([8.10](/blog/k8s/deploy-to-cloud/ec2-instances)).

## 4. Xoá cluster

```bash
aws eks delete-cluster --name kub-cafe-demo
```

```bash
aws eks wait cluster-deleted --name kub-cafe-demo
```

Mất khoảng 5–10 phút. Đi theo cluster: control plane, mọi add-on, access entry, Pod Identity
association, và cluster security group `eks-cluster-sg-kub-cafe-demo-…`.

```bash
aws eks list-clusters --output text
```

**Đúng:** không còn `kub-cafe-demo`.

**Nếu `delete-cluster` báo `ResourceInUseException: Cluster has nodegroups attached`:**
node group chưa xoá xong — kể cả khi nó đang `DELETING`. Lệnh bị từ chối, không có gì hỏng
và cũng chưa có gì bị xoá. Quay lại bước 3, chờ lệnh `wait nodegroup-deleted` trả về, rồi
chạy lại `delete-cluster`.

Từ đây `kubectl` không còn cụm nào để gọi. Context `eks` trong `~/.kube/config` vẫn còn, trỏ
vào một địa chỉ đã chết — xoá cho khỏi nhầm:

```bash
kubectl config delete-context eks
```

## 5. Xoá EFS

EFS không đi theo cluster — nó là tài nguyên của VPC
([8.7](/blog/k8s/deploy-to-cloud/efs-file-system)). Thứ tự bắt buộc: mount target, rồi file
system, rồi security group.

Lấy `FileSystemId`:

```bash
aws efs describe-file-systems --query "FileSystems[].{id:FileSystemId,name:Name}" --output table
```

Lấy id các mount target của nó:

```bash
aws efs describe-mount-targets --file-system-id <file-system-id> --query "MountTargets[].MountTargetId" --output text
```

Xoá từng mount target — mỗi AZ một cái, thường là hai lệnh:

```bash
aws efs delete-mount-target --mount-target-id <mount-target-id>
```

**PowerShell** — xoá tất cả trong một lệnh:

```powershell
foreach ($m in (aws efs describe-mount-targets --file-system-id "<file-system-id>" --query "MountTargets[].MountTargetId" --output text).Split()) { if ($m) { aws efs delete-mount-target --mount-target-id $m } }
```

Mount target mất khoảng một phút để biến mất. Chạy lại lệnh `describe-mount-targets` ở trên
tới khi nó **không in ra gì**, rồi mới xoá file system:

```bash
aws efs delete-file-system --file-system-id <file-system-id>
```

**Nếu báo `FileSystemInUse`:** mount target chưa xoá xong. Chờ thêm rồi chạy lại.

Cuối cùng là security group `eks-efs` — chỉ xoá được khi không còn mount target nào gắn nó:

```bash
aws ec2 describe-security-groups --filters Name=group-name,Values=eks-efs --query "SecurityGroups[].GroupId" --output text
```

```bash
aws ec2 delete-security-group --group-id <security-group-id>
```

**Nếu báo `DependencyViolation`:** vẫn còn mount target. Kiểm lại lệnh `describe-mount-targets`.

## 6. Xoá stack VPC

Xoá **stack**, đừng xoá tay từng tài nguyên — CloudFormation biết dọn đúng thứ tự, và gỡ
luôn NAT Gateway cùng địa chỉ IP công khai của nó
([8.6](/blog/k8s/deploy-to-cloud/vpc-and-subnets)).

Tên stack là tên bạn đặt ở 8.6 — note này dùng `cafe-eks-vpc`. Không nhớ thì liệt kê:

```bash
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --query "StackSummaries[].StackName" --output text
```

```bash
aws cloudformation delete-stack --stack-name cafe-eks-vpc
```

```bash
aws cloudformation wait stack-delete-complete --stack-name cafe-eks-vpc
```

Mất khoảng 5 phút. Kiểm trạng thái cuối của stack:

```bash
aws cloudformation list-stacks --stack-status-filter DELETE_COMPLETE DELETE_FAILED DELETE_IN_PROGRESS --query "StackSummaries[?StackName=='cafe-eks-vpc'].{name:StackName,status:StackStatus,time:DeletionTime}" --output table
```

**Đúng:** dòng mới nhất là `DELETE_COMPLETE`, và lệnh `wait` trả về im lặng. VPC, subnet,
NAT Gateway đều đã đi theo stack.

**Nếu ra `DELETE_IN_PROGRESS`:** chưa xong, chạy lại lệnh `wait`.

## 7. Đi tìm thứ sống sót

Mỗi lệnh dưới là một khoản có thể còn tính tiền. **Đúng** cho tất cả: không in ra gì, hoặc
bảng trống.

Cluster EKS:

```bash
aws eks list-clusters --output text
```

EC2 đang chạy hoặc đang tắt — EC2 tắt vẫn tính tiền ổ đĩa:

```bash
aws ec2 describe-instances --filters "Name=instance-state-name,Values=pending,running,stopping,stopped" --query "Reservations[].Instances[].{id:InstanceId,type:InstanceType}" --output table
```

Load balancer, cả hai loại:

```bash
aws elb describe-load-balancers --query "LoadBalancerDescriptions[].LoadBalancerName" --output text
```

```bash
aws elbv2 describe-load-balancers --query "LoadBalancers[].LoadBalancerName" --output text
```

Đĩa EBS không gắn vào đâu:

```bash
aws ec2 describe-volumes --filters Name=status,Values=available --query "Volumes[].{id:VolumeId,size:Size}" --output table
```

NAT Gateway còn sống:

```bash
aws ec2 describe-nat-gateways --filter Name=state,Values=available,pending --query "NatGateways[].NatGatewayId" --output text
```

Địa chỉ IP công khai đã cấp mà không gắn vào đâu — AWS tính tiền theo giờ cho từng cái:

```bash
aws ec2 describe-addresses --query "Addresses[?AssociationId==null].{ip:PublicIp,id:AllocationId}" --output table
```

EFS:

```bash
aws efs describe-file-systems --query "FileSystems[].FileSystemId" --output text
```

Log của control plane — chỉ có nếu đã bật logging ở Step 3 của 8.11:

```bash
aws logs describe-log-groups --log-group-name-prefix /aws/eks --query "logGroups[].logGroupName" --output text
```

**Nếu lệnh nào còn ra kết quả**, xoá đúng thứ đó:

| Còn | Xoá bằng |
| --- | --- |
| EC2 | Kiểm tra nó thuộc node group nào trước. Không thuộc ai: `aws ec2 terminate-instances --instance-ids <instance-id>` |
| Load balancer | Bước 1 |
| Đĩa EBS | `aws ec2 delete-volume --volume-id <volume-id>` |
| NAT Gateway | Stack VPC chưa xoá xong — bước 6 |
| IP công khai | `aws ec2 release-address --allocation-id <allocation-id>` |
| EFS | Bước 5 |
| Log group | `aws logs delete-log-group --log-group-name <log-group-name>` |

## 8. IAM — miễn phí, tuỳ chọn

IAM không tính tiền, nên role để lại không tốn đồng nào. Giữ chúng nếu định làm lại section
này — lần sau khỏi tạo lại [8.5](/blog/k8s/deploy-to-cloud/iam-roles).

Ba role của section:

| Role | Tạo ở |
| --- | --- |
| `eksClusterRole` | [8.5](/blog/k8s/deploy-to-cloud/iam-roles) |
| `eksNodeRole` | [8.5](/blog/k8s/deploy-to-cloud/iam-roles) |
| `AmazonEKSPodIdentityAmazonEBSCSIDriverRole` | [8.8](/blog/k8s/deploy-to-cloud/ebs-block-storage), nút **Create new role** |

Muốn xoá hẳn thì làm trên Console: **IAM → Roles** → chọn role → **Delete**. Console tự gỡ
policy đang gắn trước khi xoá; làm bằng CLI thì phải gỡ từng policy trước.

**Một thứ nên dọn dù miễn phí:** nếu đã tạo IAM user `eks-admin` theo Đường 2 ở
[8.12](/blog/k8s/deploy-to-cloud/connecting-kubectl-to-eks) mà không dùng nữa, xoá access
key của nó. Key đó có `AdministratorAccess` và không bao giờ hết hạn:

```bash
aws iam list-access-keys --user-name eks-admin --query "AccessKeyMetadata[].{id:AccessKeyId,status:Status}" --output table
```

```bash
aws iam delete-access-key --user-name eks-admin --access-key-id <access-key-id>
```

## 9. Hôm sau: hỏi hoá đơn

Danh sách lệnh ở bước 7 dễ sót — nhất là tài nguyên ở **region khác**. Hoá đơn thì không
sót gì.

Sau khoảng 24 giờ, mở **Billing → Cost Explorer**, nhóm theo **Service**, xem ngày hôm nay.
Mọi dòng EKS, EC2, ELB, VPC, EFS phải về **0**.

**Nếu còn dòng nào tăng:** lọc thêm theo **Region** để biết nó ở đâu, rồi chạy lại bước 7
với region đó:

```bash
aws eks list-clusters --region <region> --output text
```

Cảnh báo ngân sách đặt ở [8.4](/blog/k8s/deploy-to-cloud/services-and-cost) cứ để nguyên —
nó là lưới an toàn cho lần sau.

## Nếu chỉ đọc chứ không bật EKS

Một lệnh:

```bash
k3d cluster delete lab
```

Cụm, node, volume, load balancer — tất cả là container trên máy bạn, và đi theo cụm. Không
có hoá đơn, không có thứ gì sống sót.

Và đó chính là bài học của note này nhìn từ phía ngược lại: trên k3d, "dọn" là một lệnh vì
mọi thứ nằm **trong** cụm. Trên AWS, một nửa số thứ nằm **ngoài** cụm — Kubernetes tạo hộ
hoặc bạn tạo tay — và không ai dọn chúng thay bạn.

## Self-check

- [ ] Nói được vì sao phải xoá Service và PVC **trước** node group và cluster
- [ ] Kể những thứ đi theo cluster, và những thứ không
- [ ] Biết bước nào phải chờ bước nào xong hẳn, và bước nào làm song song được
- [ ] Biết xoá EFS theo thứ tự nào, và lỗi gì báo khi sai thứ tự
- [ ] Biết vì sao xoá stack VPC chứ không xoá tay NAT Gateway
- [ ] Chạy được bảy lệnh kiểm ở bước 7 và biết mỗi dòng còn lại là khoản tiền gì
- [ ] Biết vì sao Cost Explorer hôm sau mới là bằng chứng cuối cùng

## Open questions

- PV của EFS là `Retain`, của Mongo là `Delete`. Nếu đổi Mongo sang `Retain` thì bước 2 phải
  thêm việc gì?
- Có cách nào để AWS tự xoá cả cụm sau một số giờ, cho lab không bao giờ bị quên?
- Dựng lại toàn bộ section từ đầu mất bao lâu? Có đáng viết thành CloudFormation hay
  Terraform cho lần sau không?
