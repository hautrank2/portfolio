---
title: "8.20 Video demo — cả section trong một lần quay"
description: "Một video dài gần 90 phút dựng lại Cafe System trên EKS từ đầu tới lúc dọn sạch, kèm mục lục trỏ từng mốc thời gian về note tương ứng — và hai lỗi gặp thật khi quay."
status: growing
created: 2026-10-06
updated: 2026-10-06
tags: [k8s, aws, eks, demo, video, efs, ebs]
---

> Tiếp [8.19](/blog/k8s/deploy-to-cloud/cleaning-up). Mười chín note trước đi từng dịch vụ
> một. Note này là cả chuỗi đó chạy liền một mạch.

Tôi dựng lại toàn bộ section trên AWS và quay màn hình từ đầu tới cuối:

- **Video:** [Cafe System trên AWS EKS — YouTube](https://www.youtube.com/watch?v=lu44QnNLekI)
- **Trang demo:** [/demo/k8s-aws](/demo/k8s-aws) — video nhúng sẵn, kèm tóm tắt và link tải source

Đây là **demo cá nhân để ôn lại, không phải bài giảng**. Tôi quay sau khi học xong khoá, nên
có chỗ làm chưa gọn và có chỗ sai rồi sửa ngay trong video. Phần giải thích nằm ở các note;
video chỉ cho thấy chúng chạy thật trông ra sao.

## Mục lục video

Mỗi mốc mở video đúng đoạn đó. Cột bên phải là note giải thích việc đang làm.

| Mốc | Trong video | Note |
| --- | --- | --- |
| [00:00](https://www.youtube.com/watch?v=lu44QnNLekI&t=0s) | Kiến trúc, rồi test bằng Docker trước khi đụng tới AWS | [8.3](/blog/k8s/deploy-to-cloud/preparing-the-project) |
| [01:15](https://www.youtube.com/watch?v=lu44QnNLekI&t=75s) | Thêm dữ liệu, thử các tính năng | [8.3](/blog/k8s/deploy-to-cloud/preparing-the-project) |
| [04:21](https://www.youtube.com/watch?v=lu44QnNLekI&t=261s) | Xem ảnh nằm ở đâu trong container | [8.3](/blog/k8s/deploy-to-cloud/preparing-the-project) |
| [06:03](https://www.youtube.com/watch?v=lu44QnNLekI&t=363s) | Tạo IAM role | [8.5](/blog/k8s/deploy-to-cloud/iam-roles) |
| [08:22](https://www.youtube.com/watch?v=lu44QnNLekI&t=502s) | Cài AWS CLI | [8.12](/blog/k8s/deploy-to-cloud/connecting-kubectl-to-eks) |
| [17:46](https://www.youtube.com/watch?v=lu44QnNLekI&t=1066s) | Tạo stack VPC bằng CloudFormation | [8.6](/blog/k8s/deploy-to-cloud/vpc-and-subnets) |
| [23:08](https://www.youtube.com/watch?v=lu44QnNLekI&t=1388s) | Tạo security group cho EFS | [8.7](/blog/k8s/deploy-to-cloud/efs-file-system) |
| [24:59](https://www.youtube.com/watch?v=lu44QnNLekI&t=1499s) | Tạo file system EFS | [8.7](/blog/k8s/deploy-to-cloud/efs-file-system) |
| [30:04](https://www.youtube.com/watch?v=lu44QnNLekI&t=1804s) | Viết `mongo.yaml` | [8.8](/blog/k8s/deploy-to-cloud/ebs-block-storage) |
| [35:40](https://www.youtube.com/watch?v=lu44QnNLekI&t=2140s) | Tạo cluster EKS | [8.11](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks) |
| [41:59](https://www.youtube.com/watch?v=lu44QnNLekI&t=2519s) | Trong lúc chờ cluster: cấu hình context cho `kubectl` | [8.12](/blog/k8s/deploy-to-cloud/connecting-kubectl-to-eks) |
| [48:48](https://www.youtube.com/watch?v=lu44QnNLekI&t=2928s) | Tạo node group | [8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes) |
| [51:28](https://www.youtube.com/watch?v=lu44QnNLekI&t=3088s) | Thử tạo rồi xoá một Deployment | [8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes) |
| [53:50](https://www.youtube.com/watch?v=lu44QnNLekI&t=3230s) | **Lỗi 1:** `ebs-csi-controller` không chạy | [8.8](/blog/k8s/deploy-to-cloud/ebs-block-storage), [8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes) |
| [56:52](https://www.youtube.com/watch?v=lu44QnNLekI&t=3412s) | Viết các manifest Deployment và Service | [8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster) |
| [1:05:50](https://www.youtube.com/watch?v=lu44QnNLekI&t=3950s) | Thử các tính năng trên web thật | [8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster) |
| [1:10:55](https://www.youtube.com/watch?v=lu44QnNLekI&t=4255s) | Xoá Pod `menu-api` — ảnh mất hết | [8.15](/blog/k8s/deploy-to-cloud/getting-started-with-volumes) |
| [1:15:08](https://www.youtube.com/watch?v=lu44QnNLekI&t=4508s) | Gắn EFS làm volume để ảnh sống qua lần Pod sinh lại | [8.16](/blog/k8s/deploy-to-cloud/adding-efs-as-a-volume), [8.17](/blog/k8s/deploy-to-cloud/persistent-volume-for-efs) |
| [1:21:42](https://www.youtube.com/watch?v=lu44QnNLekI&t=4902s) | **Lỗi 2:** mount EFS bị timeout | [8.17](/blog/k8s/deploy-to-cloud/persistent-volume-for-efs) |
| [1:28:14](https://www.youtube.com/watch?v=lu44QnNLekI&t=5294s) | Xoá toàn bộ tài nguyên | [8.19](/blog/k8s/deploy-to-cloud/cleaning-up) |

Thứ tự trong video lệch với thứ tự note ở hai chỗ, và cả hai đều không ảnh hưởng kết quả:
AWS CLI được cài sớm, ngay sau IAM; và `mongo.yaml` được viết trước khi có cluster, để tận
dụng lúc chờ.

## Hai lỗi gặp thật khi quay

Cả hai đều đã nằm trong các note dưới dạng cảnh báo. Lúc quay tôi vẫn dính — và đó là phần
đáng xem nhất của video, vì nó cho thấy lỗi trông ra sao trước khi bạn biết nó là gì.

### Lỗi 1 — `ebs-csi-controller` đứng ở `1/6`

Hai Pod `ebs-csi-controller` ở `CrashLoopBackOff`, cột `READY` là `1/6`. Log của container
`ebs-plugin` lặp lại một dòng có chứa `no EC2 IMDS role found`.

Nguyên nhân: add-on `aws-ebs-csi-driver` được cài mà **chưa gán IAM role**. Driver không có
danh tính nào, quay sang hỏi metadata của node, và Pod không với tới được nó.

Cách sửa gồm hai nửa, thiếu nửa nào cũng không chạy:

| Việc | Để làm gì |
| --- | --- |
| Gán role cho driver bằng Pod Identity | **Cấp quyền** gọi API của EBS |
| Để Pod `ebs-csi-controller` được tạo lại | Quyền chỉ được đưa vào Pod **lúc Pod được tạo** — Pod cũ không tự nhận |

Các bước cụ thể ở mục *Cấp quyền bằng Pod Identity* của
[8.8](/blog/k8s/deploy-to-cloud/ebs-block-storage), và phần kiểm `6/6 Running` ở
[8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes).

### Lỗi 2 — Pod mới kẹt `ContainerCreating` khi mount EFS

Sau khi thêm `volumeMounts`, Pod mới của `menu-api` không lên. Event của Pod báo
`MountVolume.SetUp failed ... DeadlineExceeded`. Trong lúc đó Pod **cũ** vẫn chạy và vẫn
phục vụ, nên trang web trông hoàn toàn bình thường.

Nguyên nhân: security group gắn trên mount target **không có rule inbound nào**, nên node
không gõ được vào cổng `2049`. Mount target, PV và PVC đều đúng — chỉ có đường mạng là đóng.

Cách sửa: thêm rule inbound cho cổng `2049` (NFS) từ các node, rồi chờ kubelet thử mount
lại. Lý thuyết ở [8.7](/blog/k8s/deploy-to-cloud/efs-file-system); cách thử cổng `2049` từ
trong cụm *trước khi* viết PV ở
[8.16](/blog/k8s/deploy-to-cloud/adding-efs-as-a-volume) — bước mà lúc quay tôi đã bỏ qua.

Một chi tiết dễ đánh lừa: khi rollout còn dang dở, `kubectl exec deploy/cafe-menu-deployment`
chạy vào Pod **cũ**. Lệnh `df` vẫn trả về `overlay`, và bạn tưởng volume chưa được khai —
trong khi nó đã khai đúng, chỉ là Pod mới chưa lên.

## Xem video thế nào cho có ích

- **Đọc note trước, xem video sau.** Video không giải thích vì sao; nó chỉ cho thấy thao tác.
- **Nhảy theo mốc**, đừng xem một lèo. Các đoạn chờ AWS tạo cluster và node group rất dài.
- **Đừng chép lệnh từ video.** Tên, ID và vùng trong video là của tài khoản tôi. Lệnh để
  chép nằm trong các note.
- **Làm theo thì nhớ dọn.** Mọi thứ trong video tính tiền theo giờ cho tới khi xoá —
  [8.19](/blog/k8s/deploy-to-cloud/cleaning-up).

## Self-check

- [ ] Nhìn `READY 1/6` kèm `CrashLoopBackOff`, biết phải đọc log của container nào
- [ ] Nói được vì sao gán role xong mà Pod cũ vẫn lỗi
- [ ] Phân biệt được lỗi mount do **mạng** (timeout) với lỗi do **quyền** (bị từ chối)
- [ ] Biết vì sao `kubectl exec deploy/...` có thể chạy vào Pod cũ khi rollout chưa xong

## Open questions

- Hai lỗi trên đều có thể bắt bằng một bước kiểm trước khi apply. Có nên gom các bước kiểm
  đó thành một script chạy đầu mỗi lần dựng không?
- Nếu quay lại lần nữa bằng CloudFormation hoặc Terraform cho toàn bộ hạ tầng, video sẽ
  ngắn đi bao nhiêu — và người xem sẽ học được ít đi hay nhiều lên?
