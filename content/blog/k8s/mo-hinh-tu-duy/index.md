---
title: "Giai đoạn 1 — Mô hình tư duy"
description: Giai đoạn duy nhất đọc nhiều hơn gõ. Quyết định bạn hiểu hay chỉ thuộc lòng.
order:
  - { slug: declarative-vs-imperative, title: "Declarative và control loop" }
  - { slug: api-object, title: "Mọi thứ là API object: spec do bạn viết, status do controller viết" }
  - { slug: etcd-nguon-su-that, title: "etcd là nguồn sự thật duy nhất" }
  - { slug: label-va-selector, title: "Label & selector — chất keo của cả hệ thống" }
  - { slug: controller-khong-goi-nhau, title: "Controller không gọi nhau" }
---

Sáu điều cần nắm, và chỉ sáu điều. Ngắn nhưng là giai đoạn quyết định — nắm rồi thì
phần lớn hành vi của K8s trở nên **đoán trước được** thay vì phải tra.

## Bài kiểm tra, không cần cluster

Giải thích được vì sao **xoá một Pod thì nó mọc lại, nhưng xoá Deployment thì Pod
biến mất hẳn**.

Trả lời trôi chảy là qua giai đoạn. Còn lúng túng thì đọc lại phần control loop —
đừng đi tiếp.

## Thời lượng

3–5 ngày, học xen kẽ với Giai đoạn 0.
