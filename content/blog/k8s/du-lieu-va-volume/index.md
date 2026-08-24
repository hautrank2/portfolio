---
title: "Quản lý dữ liệu & Volume"
description: Giữ dữ liệu lại sau khi Pod chết. Từ emptyDir tới PersistentVolume.
order:
  - { slug: du-an-khoi-diem, title: "209. Dự án khởi điểm & những gì đã biết" }
  - { slug: volume-nhieu-hon-docker, title: "210. Volume của K8s — nhiều hơn Docker volume" }
  - { slug: ly-thuyet-volume, title: "211. Lý thuyết Volume & so sánh với Docker" }
  - { slug: tao-deployment-va-service-moi, title: "212. Tạo Deployment & Service mới" }
  - { slug: bat-dau-voi-volume, title: "213. Bắt đầu với Kubernetes Volume" }
  - { slug: emptydir, title: "214. Volume đầu tiên: kiểu emptyDir" }
  - { slug: hostpath, title: "215. Volume thứ hai: kiểu hostPath" }
  - { slug: csi-volume, title: "216. Hiểu về kiểu Volume CSI" }
  - { slug: tu-volume-den-persistent-volume, title: "217. Từ Volume tới Persistent Volume" }
  - { slug: dinh-nghia-persistent-volume, title: "218. Định nghĩa một Persistent Volume" }
  - { slug: persistent-volume-claim, title: "219. Tạo Persistent Volume Claim" }
  - { slug: dung-claim-trong-pod, title: "220. Dùng Claim trong Pod" }
  - { slug: volume-vs-persistent-volume, title: "221. Volume vs Persistent Volume" }
  - { slug: bien-moi-truong, title: "222. Dùng biến môi trường" }
  - { slug: bien-moi-truong-va-configmap, title: "223. Biến môi trường & ConfigMap" }
  - { slug: tom-tat-module, title: "224. Tóm tắt module" }
---

## Thứ tự của module này rất tốt

`emptyDir` → `hostPath` → **thấy giới hạn của cả hai** → mới sang PV/PVC.

Bạn hiểu **vì sao PersistentVolume tồn tại** thay vì học thuộc nó. Đa số tài liệu làm
ngược lại: giới thiệu PV/PVC ngay từ đầu như một khái niệm phải nhớ.

## Nối ngược về Section 0

Bài [Mount & overlayfs](/blog/k8s/nen-tang/linux/mount-va-overlayfs) đã cho bạn thấy
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
