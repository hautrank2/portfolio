---
title: Kiến trúc & dựng cluster
description: Cluster gồm những gì, mỗi thành phần chịu trách nhiệm chuyện gì.
order:
  - cluster-la-gi
  - { slug: control-plane, title: "Control plane: api-server, etcd, scheduler, controller-manager" }
  - { slug: node-components, title: "Node: kubelet và kube-proxy" }
  - { slug: kubectl-va-kubeconfig, title: "kubectl, kubeconfig và context" }
  - { slug: dung-cluster-local, title: "Dựng cluster local với kind" }
---

Trước khi deploy được cái gì, tôi muốn vẽ được sơ đồ cluster ra giấy và nói đúng tên
từng process cùng việc nó làm.
