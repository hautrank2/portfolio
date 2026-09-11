---
title: Container
description: Image, layer, OCI, runtime. Thứ mà K8s ra lệnh chứ không tự chạy.
order:
  - container-vs-vm
  - { slug: images-and-layers, title: "Image, layer và overlayfs" }
  - { slug: tag-vs-digest, title: "Tag và digest — vì sao staging khác production" }
  - { slug: oci-spec, title: "OCI: image spec và runtime spec" }
  - { slug: containerd-cri-runc, title: "containerd, CRI và runc" }
  - { slug: dockerfile-multistage, title: "Dockerfile multi-stage và cache layer" }
---

Kubernetes **không chạy** container — nó ra lệnh cho một container runtime chạy. Nên
biết chuỗi `kubelet → CRI → containerd → runc` là điều kiện cần để sau này debug được
những lỗi nằm dưới tầng K8s.

Trên VM k3s, xem container thật nằm dưới lớp K8s:

```bash
sudo crictl ps
sudo crictl images
```

Đây là góc nhìn của node, không phải của apiserver. Khi `kubectl` nói Pod `Running`
mà app không phản hồi, `crictl` là chỗ tiếp theo để nhìn.
