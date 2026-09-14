---
title: "6.5 Bắt đầu với Kubernetes Volume"
description: Một volume, hai chỗ khai — và hai chỗ đó nối với nhau bằng tên, đúng như mọi thứ khác trong K8s.
status: growing
created: 2026-09-11
updated: 2026-09-11
tags: [k8s, volume, yaml]
---

> Tiếp ngay sau [6.4](/blog/k8s/data-and-volumes/new-deployment-and-service) — vẫn dùng
> `deployment.yaml` của app `story`.

Ở Docker, khai volume là **một dòng**: `stories:/app/story`. Ở K8s phải viết **hai khối**,
nằm ở hai cấp khác nhau. Note này chỉ làm một việc: cho bạn thấy vì sao hai, và chúng
tìm thấy nhau bằng cách nào.

## Hai khối, hai câu hỏi khác nhau

| Khối | Khai ở cấp | Trả lời câu hỏi |
| --- | --- | --- |
| `spec.volumes` | **Pod** | *Pod này có những chỗ chứa nào?* |
| `spec.containers[].volumeMounts` | **Container** | *Container này gắn chỗ chứa đó vào thư mục nào?* |

Nhìn vào chỗ chúng nằm trong file là hiểu ngay:

```yaml
    spec:                          # ← spec của POD
      containers:
        - name: story
          image: hautrank2/kub-data-app:1
          volumeMounts:            # ← thuộc về CONTAINER
            - name: story-volume
              mountPath: /app/story
      volumes:                     # ← thuộc về POD, ngang hàng containers
        - name: story-volume
          emptyDir: {}
```

Để ý `volumes` thụt vào **ngang hàng với `containers`**, không nằm bên trong nó. Đây là
lỗi thụt lề hay gặp nhất khi mới viết, và K8s sẽ báo `unknown field` nếu bạn đặt nhầm.

## Vì sao phải tách làm hai

Vì volume thuộc về **Pod**, không thuộc về container —
[note 6.3](/blog/k8s/data-and-volumes/volume-theory) đã nói điều đó, và đây là chỗ nó
hiện ra thành cú pháp.

Một Pod có thể chứa nhiều container. Tách hai khối cho phép:

- **Nhiều container dùng chung một volume** — mỗi cái mount vào một đường dẫn khác nhau
- **Một container mount nhiều volume** — mỗi volume một mục đích
- **Container restart** mà volume vẫn nguyên, vì nó không thuộc về container

Với Docker một container thì không cần phân biệt, nên gộp được thành một dòng. K8s không
có may mắn đó.

## Sợi dây nối: trường `name`

`volumeMounts[].name` phải **khớp đúng từng ký tự** với `volumes[].name`. Đó là toàn bộ
cơ chế ghép nối — không có con trỏ, không có khoá ngoại, y hệt cách
[label nối Service với Pod](/blog/k8s/k8s-in-action/labels-and-selectors).

## Bài tập — Gõ sai tên xem K8s có bắt được không

**Đoán trước:** đặt `volumeMounts.name` là `story-volume` nhưng `volumes.name` là
`story-vol`. Đây là kiểu sai giống hệt `selector` lệch `labels`. K8s bắt được, hay im
lặng như vụ `targetPort`?

Thử mà không đụng tới cluster:

```bash
kubectl apply -f deployment.yaml --dry-run=server
```

**Kết quả:** bị chặn ngay.

```
The Deployment "story" is invalid: spec.template.spec.containers[0].volumeMounts[0].name:
Not found: "story-volume"
```

**K8s bắt được.** Vì đây là quan hệ **bên trong cùng một object** — API server có đủ dữ
kiện để đối chiếu ngay lúc nhận.

Đặt cạnh hai loại lỗi bạn đã gặp thì ra một quy luật gọn:

| Loại sai | K8s có bắt được? | Vì sao |
| --- | --- | --- |
| Sai tên trường (`targetgetPort`) | **Có** — `unknown field` | Không có trong schema |
| Tên volume lệch nhau | **Có** — `Not found` | Hai đầu nằm cùng một object |
| `targetPort` sai **số** | **Không** | K8s không biết app nghe cổng nào |
| `selector` không khớp Pod nào | **Không** | Pod có thể được tạo sau |

Quy luật: **K8s kiểm được những gì nằm trong tầm nhìn của nó.** Ra ngoài phạm vi một
object, hoặc phụ thuộc vào thứ chạy bên trong container, là nó chịu.

## Còn `emptyDir: {}` là gì

Đó là **kiểu** volume — chỗ duy nhất trong khối `volumes` mà bạn thật sự phải chọn. Hai
dấu ngoặc rỗng nghĩa là "dùng hết mặc định, tôi không cấu hình gì thêm".

Đổi `emptyDir: {}` thành `hostPath: {...}` hay `persistentVolumeClaim: {...}` là đổi toàn
bộ độ bền của dữ liệu, trong khi phần còn lại của file **không đổi một chữ**. Đó là điểm
hay của thiết kế này, và cũng là cái bẫy: nhìn file thì hai trường hợp giống hệt nhau.

## Các kiểu volume phổ biến

K8s hỗ trợ vài chục kiểu, nhưng thực tế bạn chỉ gặp lại chừng này:

| Kiểu | Dữ liệu nằm ở đâu | Sống lâu bằng | Dùng khi | Note |
| --- | --- | --- | --- | --- |
| `emptyDir` | Thư mục của Pod trên node (hoặc RAM) | **Pod** | Thư mục tạm, cache, trao đổi giữa container cùng Pod | [6.6](/blog/k8s/data-and-volumes/emptydir) |
| `hostPath` | Một đường dẫn có sẵn **trên node** | **Node** | Đọc file/thiết bị của node — log, socket. Lab một node | [6.7](/blog/k8s/data-and-volumes/hostpath) |
| `persistentVolumeClaim` | Bất cứ đâu mà PV trỏ tới | **Độc lập với Pod** | Dữ liệu thật cần bền | [6.9](/blog/k8s/data-and-volumes/from-volumes-to-persistent-volumes) → [6.12](/blog/k8s/data-and-volumes/using-a-claim-in-a-pod) |
| `csi` | Hệ thống lưu trữ ngoài, qua driver | Độc lập với cụm | Production, nhiều node | [6.8](/blog/k8s/data-and-volumes/csi-volume) |
| `configMap` / `secret` | etcd — kubelet dựng thành file | Pod | Đưa cấu hình, chứng chỉ vào container | [6.15](/blog/k8s/data-and-volumes/environment-variables-and-configmap) |
| `downwardAPI` | — | Pod | Đưa metadata của chính Pod vào file | — |

Ba kiểu đầu là ba **mức bền** khác nhau, và section này đi đúng theo thứ tự đó — từ yếu
nhất tới mạnh nhất, để bạn thấy mỗi bậc giải quyết được gì mà bậc trước không.

Hai kiểu cuối đáng để ý ở chỗ: **chúng không phải để lưu trữ**. `configMap` và `secret`
dùng cơ chế volume chỉ để *đưa dữ liệu vào* container dưới dạng file — chiều đi vào, không
phải chiều giữ lại. Cùng cú pháp hai khối, mục đích ngược nhau.

[Note sau](/blog/k8s/data-and-volumes/emptydir) dùng `emptyDir` thật và đo xem nó bền tới
đâu.

## Self-check

- [ ] Nói được `volumes` và `volumeMounts` nằm ở cấp nào, trả lời câu hỏi gì
- [ ] Giải thích được vì sao K8s không gộp được thành một dòng như Docker
- [ ] Biết hai khối nối nhau bằng gì
- [ ] Nói được vì sao lệch tên volume thì bị chặn, còn lệch `targetPort` thì không

## Open questions

- Hai container cùng mount một volume vào hai `mountPath` khác nhau — có được không?
- Mount đè lên một thư mục **đã có file** trong image thì mấy file đó đi đâu?
