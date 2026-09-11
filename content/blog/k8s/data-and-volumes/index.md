---
title: "Quản lý dữ liệu & Volume"
description: Giữ dữ liệu lại sau khi Pod chết. Từ emptyDir tới PersistentVolume.
order:
  - { slug: starting-project, title: "6.1 Dự án khởi điểm & những gì đã biết" }
  - { slug: more-than-docker-volumes, title: "6.2 Volume của K8s — nhiều hơn Docker volume" }
  - { slug: volume-theory, title: "6.3 Lý thuyết Volume & so sánh với Docker" }
  - { slug: new-deployment-and-service, title: "6.4 Tạo Deployment & Service mới" }
  - { slug: getting-started-with-volumes, title: "6.5 Bắt đầu với Kubernetes Volume" }
  - { slug: emptydir, title: "6.6 Volume đầu tiên: kiểu emptyDir" }
  - { slug: hostpath, title: "6.7 Volume thứ hai: kiểu hostPath" }
  - { slug: csi-volume, title: "6.8 Hiểu về kiểu Volume CSI" }
  - { slug: from-volumes-to-persistent-volumes, title: "6.9 Từ Volume tới Persistent Volume" }
  - { slug: defining-a-persistent-volume, title: "6.10 Định nghĩa một Persistent Volume" }
  - { slug: persistent-volume-claim, title: "6.11 Tạo Persistent Volume Claim" }
  - { slug: using-a-claim-in-a-pod, title: "6.12 Dùng Claim trong Pod" }
  - { slug: volume-vs-persistent-volume, title: "6.13 Volume vs Persistent Volume" }
  - { slug: environment-variables, title: "6.14 Dùng biến môi trường" }
  - { slug: environment-variables-and-configmap, title: "6.15 Biến môi trường & ConfigMap" }
  - { slug: module-summary, title: "6.16 Tóm tắt module" }
---

## Sợi chỉ xuyên suốt: app `stories`

Cả section dùng **một** app duy nhất, và nó được chọn rất khéo: một service Node hai
route, trong đó toàn bộ trạng thái nằm trong **một file trên đĩa**.

📦 [Tải source về](/code/kub-data-01-starting-setup.zip) — giải nén ra thư mục
`kub-data-01-starting-setup`.

```js
app.get('/story',  ...);   // đọc  story/text.txt
app.post('/story', ...);   // ghi thêm vào story/text.txt
```

Không database, không cache, không gì khác — chỉ `fs.readFile` và `fs.appendFile`. Đó
chính là điều làm nó hợp: mọi thứ bạn gửi lên app đều rơi vào **lớp ghi của container**,
nên bạn thấy tận mắt nó biến mất lúc nào.

`first-app` ở [module trước](/blog/k8s/k8s-in-action) là app **không trạng thái** —
giết bao nhiêu lần cũng chẳng mất gì, đó là lý do restart và scale trông đẹp đẽ đến thế.
`stories` là app **có trạng thái**, và toàn bộ section này tồn tại để giải quyết đúng
khác biệt đó.

Trong source còn sẵn một `docker-compose.yaml` với `volumes: - stories:/app/story`. Đó
là lời giải của Docker cho cùng bài toán. Giữ file đó lại để đối chiếu — K8s sẽ cần
nhiều hơn một dòng, và note 6.3 giải thích vì sao.

## Thứ tự của module này rất tốt

`emptyDir` → `hostPath` → **thấy giới hạn của cả hai** → mới sang PV/PVC.

Bạn hiểu **vì sao PersistentVolume tồn tại** thay vì học thuộc nó. Đa số tài liệu làm
ngược lại: giới thiệu PV/PVC ngay từ đầu như một khái niệm phải nhớ.

## Nối ngược về Section 0

Bài [Mount & overlayfs](/blog/k8s/foundations/linux/mount-and-overlayfs) đã cho bạn thấy
**lớp ghi của container biến mất lúc nào** — bằng tay, với `docker restart` và
`docker rm`.

Section này là câu trả lời của K8s cho đúng vấn đề đó. Bạn đã biết vấn đề trước khi
nghe giải pháp, nên `emptyDir` sẽ không còn là một từ khoá phải nhớ.

## Một chỗ khoá không dạy: Secret

Khoá dừng ở ConfigMap (bài 223) và **không hề nhắc tới Secret**. Đáng bổ sung ngay khi
học tới đây, vì hai thứ này luôn đi cặp trong thực tế.

Điều quan trọng nhất về Secret — tự thuyết phục mình một lần:

```bash
kubectl create secret generic demo --from-literal=pw=s3cret
kubectl get secret demo -o jsonpath='{.data.pw}' | base64 -d
```

Nó **chỉ là base64**, không phải mã hoá. Muốn mã hoá thật phải bật
`EncryptionConfiguration` ở apiserver.

## Đối chiếu khoá học

Bài **209–224**. Bỏ 208, 225 (nhịp video).
