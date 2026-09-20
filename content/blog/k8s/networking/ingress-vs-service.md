---
title: Ingress khác Service ở đâu
description: Service làm việc ở tầng 4, Ingress ở tầng 7. Đó là toàn bộ khác biệt.
status: seed
created: 2026-08-20
updated: 2026-08-20
tags: [k8s, networking]
---

Cả hai đều "đưa traffic vào Pod", nên lúc đầu tôi tưởng chúng thay thế nhau được.
Thật ra chúng nằm ở hai tầng khác nhau và **dùng chung với nhau**.

## Service — tầng 4

Service chỉ biết IP và port. Nó không đọc được HTTP, nên không phân biệt được
`/api` với `/admin`. Muốn expose ra ngoài cluster thì mỗi Service cần một `LoadBalancer`
riêng — trên cloud nghĩa là mỗi cái một hoá đơn.

## Ingress — tầng 7

Ingress đọc được HTTP, nên định tuyến được theo host và path. Một load balancer
duy nhất phục vụ nhiều Service:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-svc      # <- vẫn trỏ vào một Service
                port: { number: 80 }
```

Chú ý dòng `service.name`: Ingress **không** thay thế Service, nó đứng trước và
trỏ vào Service.

## Cái bẫy tôi mắc phải

Tạo Ingress xong mà không có gì xảy ra. Lý do: `Ingress` chỉ là **bản khai báo**.
Phải có một **ingress controller** đang chạy trong cluster thì mới có thứ đọc bản
khai đó và thực sự cấu hình proxy. Cluster trống thì tạo bao nhiêu Ingress cũng vô ích.

## Open questions

- Gateway API giải quyết điều gì mà Ingress làm chưa tốt?
- `pathType: Prefix` và `ImplementationSpecific` khác nhau ra sao giữa các controller?
