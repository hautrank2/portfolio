---
title: "6.12 Dùng Claim trong Pod"
description: Ba dòng trong deployment, và lần đầu tiên dữ liệu sống qua được việc xoá sạch mọi thứ.
status: growing
created: 2026-09-14
updated: 2026-09-14
tags: [k8s, pvc, deployment, volume]
---

> Cần `host-pvc` đang `Bound` từ
> [6.11](/blog/k8s/data-and-volumes/persistent-volume-claim).

Mảnh cuối. Và nó ngắn đến bất ngờ — Pod không hề biết PV tồn tại, nó chỉ gọi tên tờ đơn.

## Đổi khối `volumes`

```yaml
      volumes:
        - name: story-volume
          persistentVolumeClaim:
            claimName: host-pvc
```

`volumeMounts` **vẫn không đổi một chữ**, y như hai lần trước:

```yaml
          volumeMounts:
            - name: story-volume
              mountPath: /app/story
```

```bash
kubectl apply -f deployment.yaml && kubectl rollout status deployment story
```

Nhớ POST trước khi GET — thư mục `/data` giờ do PV quản, nhưng cơ chế che file của image
vẫn y nguyên:

```bash
curl -X POST -H 'Content-Type: application/json' -d '{"text":"qua PVC"}' http://192.168.103.154:3000/story && curl http://192.168.103.154:3000/story
```

## Đường đi đầy đủ

```
container:/app/story
      │  volumeMounts.name = story-volume
      ▼
Pod volume "story-volume"
      │  claimName
      ▼
PVC host-pvc
      │  đã Bound
      ▼
PV host-pv
      │  hostPath.path
      ▼
node:/data
```

Bốn mắt xích, và **không mắt nào biết mắt cách nó hai bậc**. Container chỉ biết
`/app/story`. Deployment chỉ biết tên PVC. PVC chỉ biết mình cần 1Gi kiểu `standard`.
Chỉ PV mới biết dữ liệu thật sự nằm ở `/data`.

Đổi `/data` thành một đĩa EBS thì **chỉ sửa PV** — ba mắt xích trên không đụng tới. Đó
chính là thứ bạn đã trả giá bằng ba object để có được.

## Bài tập — Xoá sạch, dựng lại

**Đoán trước:** xoá cả Deployment **lẫn Service**, rồi apply lại. `hostPath` ở note 6.7
qua được bài này. PVC thì sao?

```bash
kubectl delete -f deployment.yaml -f service.yaml
```

```bash
kubectl get all -l app=story && kubectl get pvc,pv
```

Không còn Pod, không còn Service — nhưng **PVC vẫn `Bound`, PV vẫn `Bound`**. Chúng không
thuộc về Deployment, nên không chết theo.

```bash
kubectl apply -f deployment.yaml -f service.yaml && kubectl rollout status deployment story
```

```bash
curl http://192.168.103.154:3000/story
```

**Kết quả:** `{"story":"qua PVC\n"}` — còn nguyên.

## Vậy khác gì hostPath?

Ở cụm một node của bạn, kết quả **giống hệt** — vì cuối chuỗi vẫn là `/data` trên node.
Khác biệt chưa hiện ra được, và tôi nói thẳng điều đó thay vì giả vờ.

Cái đã đổi là **chỗ chứa được khai ở đâu**:

| | `hostPath` trong Deployment | PVC |
| --- | --- | --- |
| Đổi từ `/data` sang đĩa mạng | Sửa `deployment.yaml`, rollout lại app | Sửa **PV**, app không đụng tới |
| Ai được phép quyết định | Người viết app | Người quản trị hạ tầng |
| Chạy được ở cụm khác | Không — `/data` có thể không tồn tại | Có — chỉ cần cụm đó có PV thoả |
| Xoá nhầm Deployment | Dữ liệu còn | Dữ liệu còn |

Giá trị của PVC không nằm ở "bền hơn" mà ở **tách trách nhiệm**. Trên cụm thật, người viết
`deployment.yaml` thường không có quyền — và cũng không cần biết — chạm vào đĩa.

## Xoá thật sự thì làm sao

```bash
kubectl delete pvc host-pvc
```

```bash
kubectl get pv
```

PV chuyển sang `Released`, **dữ liệu vẫn còn** ở `/data` — đúng chính sách `Retain` ở
[note 6.10](/blog/k8s/data-and-volumes/defining-a-persistent-volume). Muốn xoá hẳn thì
phải tự tay:

```bash
sudo rm -rf /data/*
```

Với PV do driver tự tạo (`reclaimPolicy: Delete`), xoá PVC là mất luôn — nhanh hơn nhưng
không có lưới an toàn.

Dựng lại để đi tiếp:

```bash
kubectl apply -f host-pvc.yaml
```

`Pending`? Xoá và tạo lại PV — `Released` không tự về `Available`:

```bash
kubectl delete pv host-pv && kubectl apply -f host-pv.yaml && kubectl get pvc
```

## Self-check

- [ ] Viết được khối `volumes` dùng PVC mà không nhìn mẫu
- [ ] Vẽ được đủ bốn mắt xích từ `mountPath` xuống `/data`
- [ ] Nói được vì sao xoá Deployment không làm mất dữ liệu
- [ ] Giải thích được PVC hơn `hostPath` ở chỗ nào, **ngoài** chuyện độ bền
- [ ] Biết `Retain` khiến việc xoá dữ liệu cần thêm một bước tay

## Open questions

- Hai Deployment khác nhau cùng dùng một PVC — có được không, và nên không?
- PVC nằm trong namespace, PV thì không. Vậy hai team ở hai namespace có giành PV của nhau được không?
