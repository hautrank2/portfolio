---
title: YAML — đủ dùng và những cái bẫy
description: Phần cú pháp mất 20 phút. Phần bẫy mới là thứ làm mất cả buổi chiều.
status: seed
created: 2026-08-21
updated: 2026-08-21
tags: [yaml, basics]
---

Mọi thứ trong K8s đều là YAML, nhưng phần cú pháp thật ra rất nhỏ. Cái đáng học là
vài chỗ YAML hành xử khác với trực giác.

## Đủ dùng

Ba kiểu dữ liệu: **scalar**, **list**, **map**. Thụt lề bằng **space**, không bao giờ
bằng tab.

```yaml
name: web           # scalar
ports:              # list
  - 80
  - 443
labels:             # map
  app: web
  tier: frontend
```

Nhiều document trong một file, ngăn bằng `---`. K8s dùng liên tục:

```yaml
apiVersion: v1
kind: Service
# ...
---
apiVersion: apps/v1
kind: Deployment
# ...
```

## Bẫy 1: Norway problem

YAML tự suy kiểu. Những giá trị sau bị parse thành **boolean**, không phải chuỗi:

```
y  Y  yes  Yes  YES  n  N  no  No  NO  true  false  on  off
```

Nên `country: NO` trở thành `country: false`. Trong K8s hay gặp ở dạng:

```yaml
data:
  ENABLE_CACHE: yes      # ❌ thành boolean -> ConfigMap từ chối
  ENABLE_CACHE: "yes"    # ✅
```

**Quy tắc tự đặt: mọi giá trị trong `data` của ConfigMap luôn đặt nháy kép.**

## Bẫy 2: số có số 0 đứng đầu

```yaml
uid: 0755        # bị hiểu là octal -> 493
uid: "0755"      # ✅
```

Version cũng vậy: `version: 1.20` là số thực nên thành `1.2`. Luôn `"1.20"`.

## Bẫy 3: chuỗi nhiều dòng — `|` và `>`

```yaml
script: |          # giữ nguyên xuống dòng
  echo one
  echo two

note: >            # gộp thành một dòng, xuống dòng thành dấu cách
  câu này
  sẽ thành một dòng
```

Dùng sai `>` cho một shell script là lỗi rất hay gặp — script biến thành một dòng dài
và chạy sai. Với script luôn dùng `|`.

Biến thể `|-` bỏ dấu xuống dòng cuối, `|+` giữ lại. Với chứng chỉ TLS thì khác biệt
này có thể làm hỏng file.

## Anchor và alias

Giảm lặp, thỉnh thoảng gặp trong Helm values hoặc CI config:

```yaml
defaults: &defaults
  restartPolicy: Always
  terminationGracePeriodSeconds: 30

pod-a:
  <<: *defaults
  name: a
```

K8s manifest thuần thì hiếm dùng, vì `kubectl` không quan tâm — anchor được resolve
lúc parse, cluster chỉ thấy kết quả cuối.

## Cách kiểm tra nhanh

```bash
kubectl apply -f manifest.yaml --dry-run=server
```

`--dry-run=server` gửi lên apiserver để validate thật (kể cả admission) nhưng không
ghi vào etcd. Tốt hơn `--dry-run=client` vì client chỉ kiểm tra cú pháp.

## Câu hỏi còn mở

- Vì sao K8s chọn YAML mà không phải JSON hay HCL? (apiserver thật ra nhận cả JSON)
- `kubectl apply` và `kubectl create` khác nhau ở chỗ nào ngoài chuyện idempotent?
