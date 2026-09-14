---
title: "5.24 Tóm tắt module"
description: Bài kiểm tra thật của module này không phải đọc lại, mà là dựng lại toàn bộ từ một thư mục trống.
status: growing
created: 2026-08-25
updated: 2026-09-10
tags: [k8s, tong-ket]
---

Module lớn nhất khoá kết thúc ở đây. Đừng đọc lại 22 note — làm bài tập cuối là biết
ngay mình thủng chỗ nào.

Một câu cho cả module: **bạn không ra lệnh, bạn khai báo — và mọi thứ nối với nhau bằng
label, không bằng tên.** Ba mục dưới đây là ba lát cắt của câu đó: hệ thống gồm những gì,
bạn gõ ra cái gì, và ai chịu trách nhiệm phần nào.

## Kiến trúc, gói lại trong một hình

```
  kubectl  ──►  Cluster
                  │
                  ├─ Master Node  ──►  Cloud Provider API
                  │     Control Plane + component quản lý worker
                  │
                  ├─ Worker Node ── Proxy/Config ── Pod (Container)
                  └─ Worker Node ── Proxy/Config ── Pod (Container)
```

| Thành phần | Là gì |
| --- | --- |
| `kubectl` | Công cụ **gửi chỉ thị** tới cluster — "tạo cho tôi một deployment" |
| **Cluster** | Tập hợp các node, ranh giới của mọi thứ bên trong |
| **Master Node** | Control plane cùng các component quản lý worker; cũng là nơi phát lệnh ra **Cloud Provider API** khi cần hạ tầng |
| **Worker Node** | **Máy thật hoặc máy ảo của bạn** — nơi container của app thật sự chạy |
| **Pod** | Đơn vị chạy container. Tạo thêm hay bớt Pod chính là **scale** |

Ba câu gọn nếu quên hết bảng trên:

- **Master Node điều khiển toàn bộ Worker Node** — bạn không nói chuyện trực tiếp với
  worker bao giờ.
- **"Node" là máy của bạn**, không phải khái niệm trừu tượng. Cụm của bạn có đúng một
  node vì bạn có đúng một VM.
- **Mọi node đều phải được cài phần mềm K8s** — kubelet, proxy, và bạn bè. Không tự có,
  và không phải việc của K8s.

Đào sâu ở [Master Node](/blog/k8s/getting-started/master-node) và
[Worker Node](/blog/k8s/getting-started/worker-node).

## Thứ bạn thật sự gõ ra: Object

Cluster dựng xong rồi thì mọi việc còn lại chỉ là **tạo và sửa Object**. K8s không nhận
"lệnh làm gì" — nó nhận **mô tả về thứ cần tồn tại**.

```
             Kubernetes làm việc với OBJECT
                          │
    ┌────────┬────────────┼────────────┬────────┐
   Pod   Deployment    Service      Volume     …
```

Module này đi hết ba cái đầu. `Volume` là của
[Section 3](/blog/k8s/data-and-volumes), và dấu `…` còn dài — ConfigMap, Secret,
Ingress, Job, StatefulSet.

Và mỗi Object đều tạo được bằng **đúng hai cách**:

| | Imperative | Declarative |
| --- | --- | --- |
| Cách gõ | `kubectl create`, `scale`, `set image` | `kubectl apply -f` |
| Bạn nói | *"làm việc này"* | *"trạng thái phải là thế này"* |
| Chạy lại lần hai | Lỗi hoặc đè lung tung | Kết quả y hệt |
| Dùng ở đâu | Học, thử, chữa cháy | Mọi cụm thật |

Nửa đầu module dùng cột trái để bạn thấy kết quả ngay; nửa sau chuyển sang cột phải —
chi tiết ở [Imperative vs Declarative](/blog/k8s/k8s-in-action/imperative-vs-declarative)
và [Object là gì](/blog/k8s/k8s-in-action/what-is-a-k8s-object).

## Ranh giới: việc của K8s, việc của bạn

Cả module chạy dọc theo một đường phân chia. Vẽ sai đường này là đi sửa nhầm chỗ, và
nhầm rất lâu.

| K8s sẽ làm | Bạn phải tự dựng (thứ K8s **đòi** phải có sẵn) |
| --- | --- |
| Tạo các object bạn khai (Pod, Deployment, Service) và quản lý chúng | **Cluster** cùng các node instance — master và worker |
| Giám sát Pod, dựng lại khi chết, scale theo `replicas` | **API server, kubelet** và phần mềm K8s trên từng node |
| Dùng tài nguyên hạ tầng **đã có** để hiện thực hoá cấu hình của bạn | Chính tài nguyên đó: load balancer, filesystem, registry |

Cột trái là *điều bạn muốn xảy ra*. Cột phải là *điều phải có sẵn thì cột trái mới xảy ra
được*. K8s là **bộ điều phối** — nó tiêu thụ tài nguyên hạ tầng chứ không sinh ra chúng.
Ý này đã mở đầu module ở
[K8s không quản lý hạ tầng](/blog/k8s/k8s-in-action/k8s-does-not-manage-infrastructure-2), và
đóng lại ở đây.

Trong module bạn đã va vào đường này đúng ba lần, lần nào cũng vì rơi sang cột phải:

| Triệu chứng | Cột phải thiếu gì |
| --- | --- |
| `EXTERNAL-IP` đứng `<pending>` vĩnh viễn | Không ai cấp được load balancer thật cho cụm |
| `ImagePullBackOff` dù `docker build` đã xong | Đưa image tới runtime của node là việc của bạn |
| Pod `Pending`, không node nào nhận | Không đủ node — thêm máy cũng là việc của bạn |

Cài `k3s` bằng một dòng lệnh thì hai hàng đầu của cột phải xong trong ba mươi giây, nên
rất dễ tưởng K8s tự lo. Trên cụm thật, đó là công việc của cả một đội hạ tầng — hoặc là
hoá đơn hàng tháng bạn trả cho EKS, GKE.

## Năm điều nếu chỉ được nhớ năm

| | |
| --- | --- |
| **Pod là bất biến** | Không sửa Pod. Đổi gì cũng là tạo Pod mới, tên mới, IP mới |
| **Label là sợi dây duy nhất** | Không có khoá ngoại. Sai một chữ là đứt, và không ai báo |
| **Pod không restart, container mới restart** | `RESTARTS 47` mà `AGE 2d` là bình thường — vẫn Pod cũ, cùng tên, cùng IP |
| **Lỗi im lặng nguy hơn lỗi ồn ào** | Sai `targetPort`, sai `selector`: mọi thứ xanh, chỉ là không chạy |
| **Deploy hỏng ≠ dịch vụ sập** | Rollout kẹt, Pod cũ vẫn phục vụ. Phải `rollout status` mới biết |

## Ba bảng đáng chép ra giấy dán lên tường

**Pod kẹt ở đâu → đi hỏi ai**

| Trạng thái | Ai đang bận | Kẹt nghĩa là |
| --- | --- | --- |
| `Pending` | scheduler | Không node nào đủ chỗ |
| `ContainerCreating` | kubelet | Kéo image hỏng, sai tên, thiếu quyền |
| `CrashLoopBackOff` | — | App tự chết. Đọc `logs --previous` |
| `Running` nhưng `0/1` | probe | Readiness chưa đạt |

**Service không gọi được → vì sao**

| Triệu chứng | Nguyên nhân |
| --- | --- |
| Có endpoint, không kết nối được | Sai `targetPort` |
| Không có endpoint nào | Sai `selector` |
| Kết nối được, nội dung sai | Selector bắt nhầm Pod app khác |

**Exit code**

| Mã | Nghĩa |
| --- | --- |
| 0 | Tiến trình chính thoát bình thường — thường là sai `command` |
| 1 | App tự lỗi. Đọc log |
| 137 | `SIGKILL` — OOMKilled hoặc hết hạn grace period |

## Bài tập cuối — dựng lại từ thư mục trống

Đây là bài kiểm tra thật. **Không nhìn note, không copy file cũ.**

```bash
kubectl delete namespace exam --ignore-not-found && kubectl create namespace exam
```

Trong một thư mục mới, viết tay ba file rồi `kubectl apply -f . -n exam`, sao cho
đạt đủ **bảy** điều kiện:

1. Một Deployment tên `web`, **3 replica**, image `nginx:1.27-alpine`
2. Container khai cổng có **tên** `http`
3. Có `livenessProbe` kiểu `httpGet` trỏ `/`, kiểm mỗi 10 giây
4. Có `resources.requests` cho cả cpu và memory
5. Một Service kiểu `NodePort` trỏ `targetPort` **bằng tên**, không bằng số
6. Nhãn theo quy ước `app.kubernetes.io/name`
7. `maxUnavailable: 0` trong strategy

Tự chấm:

```bash
kubectl get all -n exam
```

```bash
kubectl get endpointslice -n exam -o jsonpath='{.items[0].endpoints[*].addresses}{"\n"}'
```

```bash
PORT=$(kubectl get svc -n exam -o jsonpath='{.items[0].spec.ports[0].nodePort}') && for i in $(seq 5); do curl -s -o /dev/null -w '%{http_code} ' localhost:$PORT; done; echo
```

Ba dòng phải ra: 3 Pod `Running`, 3 địa chỉ endpoint, và năm mã `200`.

**Đoán trước khi apply:** file của bạn sẽ hỏng ở lần thứ mấy? Chỗ hỏng thường gặp là
`selector` không khớp `template.labels` (K8s bắt được, báo lỗi rõ), và `targetPort` tên
không khớp tên cổng đã khai (K8s **không** bắt được, chỉ là không kết nối nổi).

Dọn:

```bash
kubectl delete namespace exam
```

## Vượt chặng khi

[Index của module](/blog/k8s/k8s-in-action) đặt tiêu chuẩn: viết được Deployment +
Service từ đầu không copy, và giải thích được vì sao `selector.matchLabels` phải khớp
`template.metadata.labels`.

Bảy điều kiện ở trên là bản khó hơn của đúng tiêu chuẩn đó. Làm xong không cần mở note
nào là qua.

## Còn nợ lại cho các module sau

| Câu hỏi bỏ ngỏ | Module trả lời |
| --- | --- |
| File Pod ghi ra bị mất khi restart | Section 3 — Dữ liệu & Volume |
| Cấu hình nhét cứng trong YAML | ConfigMap & Secret, cuối Section 3 |
| Service không định tuyến được theo path | Section 4 — Networking |
| Cụm chỉ có một node, không LoadBalancer thật | Section 5 — Deploy lên cloud |

## Self-check

- [ ] Vẽ được ranh giới hai cột, và xếp đúng ba triệu chứng đã gặp vào cột phải
- [ ] Làm xong bài tập cuối, không mở note nào
- [ ] Thuộc ba bảng chẩn đoán, hoặc biết chúng nằm ở đâu
- [ ] Giải thích được cả năm điều ở bảng "nếu chỉ được nhớ năm"

## Open questions

- Ba file YAML này lặp lại y hệt cho dev/staging/prod. Kustomize hay Helm giải ra sao?
- Bao nhiêu thứ trong module này thì Operator tự làm được, và lúc nào đáng viết một cái?
