---
title: "9.1 Những gì đã học"
description: "Sáu section, mỗi section để lại một năng lực cụ thể. Bảng đối chiếu, năm ý lặp lại xuyên suốt, và một bài tự kiểm không tra tài liệu."
status: growing
created: 2026-10-02
updated: 2026-10-02
tags: [k8s, summary, self-check]
---

Note này không tóm tắt lại từng bài. Nó trả lời một câu hỏi khác: **sau từng section, bạn
làm được việc gì mà trước đó chưa làm được?**

Nếu một dòng trong các bảng dưới nghe lạ, đó là chỗ nên quay lại — link nằm ngay trong
tiêu đề từng mục.

## Theo từng section

### [Nền tảng trước K8s](/blog/k8s/foundations)

Section duy nhất không có trong khoá, và là thứ khiến phần còn lại hết huyền bí.

| Mảng | Giờ bạn giải thích được |
| --- | --- |
| **Linux** | Container bị cách ly bằng *namespace*, bị giới hạn bằng *cgroup*; `SIGTERM` khác `SIGKILL` ở đâu; lớp ghi của container là gì trên overlayfs |
| **Mạng** | Đọc được một CIDR; DNS phân giải tên qua `resolv.conf` thế nào; L4 khác L7; reverse proxy đứng ở đâu |
| **Container** | Image là chồng layer; tag khác digest; `containerd`, CRI và `runc` mỗi cái lo tầng nào; viết Dockerfile nhiều stage |
| **YAML** | Đọc và viết manifest không vấp thụt lề, list, map |

### [Bắt đầu với Kubernetes](/blog/k8s/getting-started)

Toàn lý thuyết, chưa gõ lệnh — nhưng là bản đồ cho mọi thứ phía sau.

- Vì sao deploy tay nhiều container trên nhiều máy không bền, và K8s giải bài toán nào
- Cluster gồm **control plane** (API server, scheduler, controller manager, etcd) và
  **worker node** (kubelet, container runtime, kube-proxy)
- **K8s không quản lý hạ tầng**: nó không tạo máy, không tạo mạng, không tạo đĩa. Câu này
  quay lại thành cả một section ở cuối

### [Kubernetes thực chiến](/blog/k8s/k8s-in-action)

Module lớn nhất. Sau nó, bạn tự đưa được một app lên cụm và giữ nó chạy.

| Việc | Bằng gì |
| --- | --- |
| Chạy app, giữ đủ số bản | `Pod`, `Deployment`, `replicas` |
| Cho bên ngoài gọi vào | `Service` — `ClusterIP`, `NodePort`, `LoadBalancer` |
| Đổi phiên bản không dừng dịch vụ | Rolling update, `rollout status`, `rollout undo` |
| Mô tả bằng file thay vì gõ lệnh | Declarative: `kubectl apply -f`, một file hay nhiều file |
| Nối các object với nhau | `labels` và `selector` |
| Cho K8s biết app còn sống | `livenessProbe` |

### [Dữ liệu & Volume](/blog/k8s/data-and-volumes)

Câu hỏi của cả section: **lúc nào dữ liệu trong Pod mất, lúc nào không?**

| Kiểu | Sống qua container restart | Sống qua Pod bị xoá | Dùng chung giữa các node |
| --- | --- | --- | --- |
| Không khai gì | Không | Không | Không |
| `emptyDir` | Có | Không | Không |
| `hostPath` | Có | Có, **trên đúng node đó** | Không |
| `PersistentVolume` + `PersistentVolumeClaim` | Có | Có | Tuỳ loại storage phía sau |

Cộng hai thứ đi kèm: tách người **xin** chỗ (PVC) khỏi người **cấp** chỗ (PV, StorageClass),
và đưa cấu hình ra ngoài image bằng biến môi trường với `ConfigMap`.

### [Networking](/blog/k8s/networking)

Ba service gọi nhau, theo đúng thứ tự tiến hoá:

| Cách Pod gọi Pod | Dùng khi | Điểm yếu |
| --- | --- | --- |
| `localhost` | Hai container **cùng một Pod** | Hai thứ sống chết cùng nhau |
| IP của Service, hoặc biến môi trường K8s tự sinh | Tạm, để hiểu cơ chế | IP đổi; biến chỉ có nếu Service tạo trước Pod |
| **Tên DNS của Service** | Luôn luôn | — |

Và đưa frontend lên cụm: nginx phục vụ file tĩnh, đồng thời làm **reverse proxy** để trình
duyệt gọi API qua cùng một địa chỉ, không dính CORS, không lộ Service nội bộ.

### [Deploy lên cloud](/blog/k8s/deploy-to-cloud)

Cùng bộ YAML, cụm khác — và mọi thứ hỏng ở **tầng bên dưới** Kubernetes.

| Thứ ở cụm một node là vô hình | Trên EKS nó là |
| --- | --- |
| Quyền | Hai IAM role, access entry, Pod Identity cho driver |
| Mạng | VPC, subnet public/private ở hai AZ, NAT Gateway |
| Node | Node group, instance type, giới hạn Pod theo số IP |
| `type: LoadBalancer` | Một load balancer thật, có hoá đơn riêng |
| PVC | Đĩa EBS gắn một node một AZ, hoặc EFS dùng chung nhiều node |
| Dọn dẹp | Thứ tự xoá, và những thứ không đi theo cluster |

Bài học đắt nhất của section không nằm trong note nào riêng: **triệu chứng hiện ra ở
Kubernetes, nguyên nhân nằm ở AWS.** Pod `Pending` vì loại máy hết chỗ; PVC `Pending` vì
driver thiếu quyền; node không join vì access entry sai loại.

## Năm ý lặp lại xuyên suốt

Nếu chỉ mang đi được năm thứ, là năm thứ này — chúng xuất hiện ở mọi section, dưới những
cái tên khác nhau:

1. **Khai trạng thái, không ra lệnh.** Bạn nói *muốn gì*; controller lo *làm thế nào*, và
   làm lại mỗi khi thực tế lệch đi. Deployment, PVC, Service `LoadBalancer` đều cùng một ý.
2. **Mọi thứ nối với nhau bằng tên và nhãn, không bằng IP.** `selector` nối Service với Pod;
   `claimName` nối Pod với PVC; tên DNS nối service với service.
3. **Pod là thứ dùng rồi bỏ.** Thứ gì cần sống lâu hơn Pod — dữ liệu, cấu hình, địa chỉ —
   đều phải nằm ở một object khác.
4. **Kubernetes không quản lý hạ tầng.** Nó *yêu cầu* hạ tầng qua driver và controller; ai
   đó vẫn phải cấp quyền, cấp mạng, và trả tiền.
5. **Kiểm từ nguồn, đừng đoán.** `kubectl describe`, `logs`, `get events`, và phía cloud là
   `aws … describe-…`. Trạng thái thật luôn hỏi được bằng một lệnh.

## Tự kiểm — không tra tài liệu

Không phải "đã đọc hết", mà là trả lời được những câu này bằng lời của mình:

**Nền tảng**

- [ ] Container bị cách ly bằng **cơ chế nào**, cơ chế nào giới hạn **cái gì**?
- [ ] Vì sao `kubectl delete pod` mất tới 30 giây, và làm sao cho nó nhanh hơn một cách đúng?

**Cốt lõi**

- [ ] Vẽ được chuỗi từ `kubectl apply` tới lúc container chạy
- [ ] Viết được Deployment + Service YAML từ đầu, không copy
- [ ] Nhìn `Exit Code: 137` là biết ngay chuyện gì đã xảy ra
- [ ] Giải thích vì sao sửa `labels` của Pod có thể làm Service mất hết endpoint

**Dữ liệu và mạng**

- [ ] Nói được lúc nào dữ liệu trong Pod mất, lúc nào không — cho cả bốn kiểu volume
- [ ] Giải thích ba cách Pod gọi Pod, và vì sao DNS thắng
- [ ] Nói được reverse proxy trong frontend giải quyết những vấn đề gì

**Cloud**

- [ ] Kể những tài nguyên AWS mà Kubernetes **tạo hộ**, và vì sao chúng dễ bị quên dọn
- [ ] Giải thích vì sao Mongo dùng EBS còn ảnh món dùng EFS, bằng access mode và AZ
- [ ] Nói được vì sao số Pod trên một node phụ thuộc loại máy chứ không phụ thuộc RAM
- [ ] Viết ra thứ tự dọn một cụm EKS, và hậu quả nếu xoá cluster trước

Câu nào còn lúng túng thì quay lại section tương ứng, làm lại **bài tập** của nó chứ đừng
đọc lại lý thuyết. Source code cho từng section nằm ở
[9.3](/blog/k8s/wrap-up/all-source-code).

## Thứ khoá cố ý không dạy

Có năm mảng khoá bỏ trắng, và vài mảng nữa chỉ lộ ra khi lên cloud thật. Chúng không phải
"nâng cao" — phần lớn là thứ dùng hằng ngày. Danh sách và thứ tự học nằm ở
[9.2](/blog/k8s/wrap-up/what-to-learn-next).
