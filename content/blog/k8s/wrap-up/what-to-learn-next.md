---
title: "9.2 Những gì có thể tự học thêm"
description: "Mười mảng khoá không dạy, xếp theo thứ tự nên học. Mỗi mảng có lý do cần, một bài tập đầu tiên làm được trên k3d, và từ khoá để tra."
status: growing
created: 2026-10-02
updated: 2026-10-02
tags: [k8s, next-steps, debug, rbac, helm, ingress, probes]
---

Khoá dạy đủ để **đưa một hệ nhiều service lên cụm**. Nó không dạy đủ để **giữ hệ đó chạy
khi có người khác cùng dùng cụm** — và đó là khoảng cách giữa lab với việc thật.

Đây không phải chê khoá: nó là khoá *Docker & Kubernetes* cho người mới, và làm rất tốt phần
nó chọn làm. Chỉ là biết trước mình còn thiếu gì thì tốt hơn phát hiện lúc đang gỡ lỗi.

Mọi bài tập dưới đây chạy được trên **k3d**, không tốn tiền:

```bash
k3d cluster create lab --agents 2
```

Dùng lại Cafe System ở [9.3](/blog/k8s/wrap-up/all-source-code) làm chỗ thử — nó đã có đủ
API, database và frontend để mọi khái niệm dưới có chỗ gắn vào.

## Thứ tự nên học

Xếp theo mức **dùng thường xuyên**, không theo độ khó:

| # | Mảng | Vì sao cần | Khoá có? |
| --- | --- | --- | --- |
| 1 | **Debug** | Pod hỏng là chuyện hằng ngày | Không |
| 2 | **`requests` / `limits` / QoS** | Thiếu thì các Pod tự bóp chết nhau | Không |
| 3 | **`readinessProbe`, `startupProbe`** | Khoá chỉ dạy `livenessProbe` | Một phần |
| 4 | **`Secret`** | Mật khẩu đang nằm thẳng trong YAML | Không |
| 5 | **`Ingress`** | Mỗi `LoadBalancer` là một hoá đơn | Không |
| 6 | **Helm / Kustomize** | Khoá `kubectl apply -f` từ đầu tới cuối | Không |
| 7 | **RBAC & `SecurityContext`** | Bắt buộc khi cụm có nhiều người | Không |
| 8 | **`StatefulSet`** | Mongo đang chạy bằng `Deployment` một bản | Không |
| 9 | **Autoscaling** | `replicas` đang là con số gõ tay | Không |
| 10 | **Hạ tầng bằng code & CI/CD** | Section 8 bấm Console gần hai chục bước | Không |

Bốn mảng đầu là thứ nên học **ngay**, trước khi động tới cụm của người khác.

## 1. Debug

Bạn đã dùng từng lệnh rải rác suốt section 8. Thứ còn thiếu là **một trình tự cố định**, để
không phải đoán:

```
kubectl get pods            → STATUS nói Pod kẹt ở giai đoạn nào
kubectl describe pod <pod>  → Events nói vì sao
kubectl logs <pod>          → app nói gì
kubectl logs <pod> --previous → bản trước khi restart nói gì
kubectl get events --sort-by=.lastTimestamp → cả cụm vừa xảy ra chuyện gì
```

| `STATUS` | Nhìn vào đâu trước |
| --- | --- |
| `Pending` | `describe` → Events: thiếu node, thiếu chỗ, PVC chưa `Bound` |
| `ImagePullBackOff` | Tên image, tag, quyền kéo |
| `CrashLoopBackOff` | `logs --previous` — container chết trước khi bạn kịp xem |
| `Running` nhưng không gọi được | `kubectl get endpointslices` — Service có trỏ tới Pod nào không |

**Bài tập đầu tiên:** cố ý làm hỏng Cafe System theo bốn cách — sai tên image, sai
`MONGODB_URI`, sai `selector` của Service, PVC xin dung lượng lớn hơn PV — rồi tìm lại từng
lỗi chỉ bằng năm lệnh trên.

**Từ khoá:** `kubectl debug`, ephemeral container, `kubectl get events`, exit code 137 / 143.

## 2. `requests`, `limits` và QoS

Không khai gì thì Pod được dùng bao nhiêu tuỳ thích — cho tới khi node hết RAM và kernel
chọn một tiến trình để giết. `requests` là thứ scheduler dùng để xếp chỗ; `limits` là trần
cgroup áp lên container. Đây chính là cgroup ở [section Nền tảng](/blog/k8s/foundations),
nhìn từ phía YAML.

**Bài tập đầu tiên:** đặt `limits.memory: 64Mi` cho `menu-api`, upload vài ảnh lớn, rồi xem
`kubectl describe pod` báo `OOMKilled`. Sau đó khai `requests` lớn hơn tài nguyên của node
và xem Pod `Pending` với lý do gì.

**Từ khoá:** QoS class (`Guaranteed`, `Burstable`, `BestEffort`), `OOMKilled`, CPU throttling,
`LimitRange`, `ResourceQuota`.

## 3. `readinessProbe` và `startupProbe`

`livenessProbe` trả lời *"có nên khởi động lại không"*. Nó **không** trả lời *"đã sẵn sàng
nhận request chưa"* — và đó là lý do rolling update vẫn có thể rớt request.

Section 8 đã cho bạn thấy đúng lỗ hổng này: `menu-api` khởi động trước Mongo, không nối
được, mà vẫn `Running` và vẫn nhận request. Một `readinessProbe` gọi vào endpoint kiểm tra
kết nối database sẽ giữ Pod đó ngoài Service cho tới khi nó thật sự dùng được.

**Bài tập đầu tiên:** thêm vào `menu-api` một endpoint trả `503` khi chưa nối được Mongo,
khai `readinessProbe` trỏ vào nó, rồi khởi động `menu-api` trước Mongo và xem cột `READY`.

**Từ khoá:** `readinessProbe`, `startupProbe`, `initContainers`, `minReadySeconds`,
`terminationGracePeriodSeconds`, `preStop`.

## 4. `Secret`

`TOKEN_KEY` và `ADMIN_PASSWORD` của Cafe System đang nằm thẳng trong `auth-api.yaml`, tức
là nằm trong Git. `Secret` tách chúng ra khỏi manifest — nhưng mặc định nó chỉ là base64,
**không phải mã hoá**. Hiểu đúng giới hạn đó quan trọng hơn biết cú pháp.

**Bài tập đầu tiên:** chuyển ba biến của `auth-api` sang một `Secret`, nạp bằng
`secretKeyRef`, rồi `kubectl get secret -o yaml` và tự giải mã để thấy nó lộ ra dễ thế nào.

**Từ khoá:** `Secret`, `secretKeyRef`, encryption at rest, External Secrets Operator, Sealed
Secrets, AWS Secrets Manager.

## 5. `Ingress`

Hai frontend của Cafe System là hai `LoadBalancer`, hai hoá đơn. `Ingress` gom nhiều
Service về **một** cửa vào, chia đường theo host hoặc path — đúng việc mà nginx trong
frontend đang làm cho `/api`, nhưng ở tầng cụm.

k3d có sẵn Traefik làm Ingress controller, nên thử được ngay không cần cài gì.

**Bài tập đầu tiên:** đổi cả hai frontend về `ClusterIP`, viết một `Ingress` đưa
`shop.localhost` tới `shop-web` và `admin.localhost` tới `admin-web`.

**Từ khoá:** `Ingress`, `IngressClass`, Gateway API, AWS Load Balancer Controller, ALB,
cert-manager, TLS termination.

## 6. Helm và Kustomize

Bảy file YAML của Cafe System chỉ khác nhau giữa các môi trường ở vài chỗ: tag image, số
bản, StorageClass, annotation của load balancer. Sửa tay từng chỗ là cách chắc chắn sẽ sai.

| | Cách làm | Hợp khi |
| --- | --- | --- |
| **Kustomize** | Giữ YAML gốc, chồng bản vá lên theo môi trường. Có sẵn trong `kubectl apply -k` | App của chính bạn, ít biến thể |
| **Helm** | YAML thành template có biến; đóng gói thành chart, cài và gỡ như một đơn vị | Cài phần mềm của người khác, nhiều tham số |

**Bài tập đầu tiên:** tạo hai overlay Kustomize cho Cafe System — `k3d` dùng `local-path`,
`eks` dùng `gp2` và annotation load balancer — từ cùng một bộ YAML gốc.

**Từ khoá:** `kustomization.yaml`, overlay, `helm install`, `values.yaml`, chart,
`helm template`.

## 7. RBAC và `SecurityContext`

Section 8 đã chạm vào một nửa: access entry quyết định **ai** vào được cụm. RBAC là nửa còn
lại — vào rồi thì được **làm gì**. Còn `SecurityContext` là chuyện container chạy với quyền
gì: mọi container của Cafe System đang chạy bằng `root`.

**Bài tập đầu tiên:** tạo một `ServiceAccount` chỉ được `get` và `list` Pod trong một
namespace, rồi dùng `kubectl auth can-i` để kiểm từng quyền. Sau đó thêm
`runAsNonRoot: true` vào một Deployment và sửa cho tới khi nó chạy được.

**Từ khoá:** `Role`, `ClusterRole`, `RoleBinding`, `ServiceAccount`, `kubectl auth can-i`,
`runAsNonRoot`, `readOnlyRootFilesystem`, Pod Security Standards, `NetworkPolicy`.

## 8. `StatefulSet`

Mongo của Cafe System chạy bằng `Deployment` một bản với `strategy: Recreate` — đủ cho lab,
nhưng không scale lên được và không có tên ổn định. `StatefulSet` cho mỗi bản một **tên cố
định** và một **PVC riêng**, đúng thứ một database nhiều bản cần.

**Bài tập đầu tiên:** chuyển Mongo sang `StatefulSet` một bản với `volumeClaimTemplates`,
xoá Pod, và xem nó quay lại đúng tên cũ, đúng đĩa cũ.

**Từ khoá:** `StatefulSet`, headless Service, `volumeClaimTemplates`, replica set của
MongoDB, operator, và câu hỏi *"có nên chạy database trong cụm không"*.

## 9. Autoscaling

Có ba tầng, và chúng trả lời ba câu hỏi khác nhau:

| Tầng | Trả lời | Công cụ |
| --- | --- | --- |
| Số bản của Pod | Cần bao nhiêu bản lúc này | `HorizontalPodAutoscaler` + metrics-server |
| Tài nguyên mỗi Pod | Mỗi bản cần bao nhiêu CPU, RAM | Vertical Pod Autoscaler |
| Số node | Cụm cần bao nhiêu máy | Cluster Autoscaler, Karpenter |

Tầng đầu cần `requests` ở mục 2 mới chạy được — HPA tính phần trăm trên `requests`.

**Bài tập đầu tiên:** khai `requests.cpu` cho `menu-api`, tạo HPA ngưỡng 50% CPU, rồi bắn
tải vào bằng một vòng `wget` và xem `kubectl get hpa -w`.

**Từ khoá:** `HorizontalPodAutoscaler`, metrics-server, `kubectl top`, Karpenter,
`PodDisruptionBudget`.

## 10. Hạ tầng bằng code và CI/CD

Section 8 dựng cụm bằng tay, gần hai chục bước, và sai một ô ở Step 1 là mất nửa buổi. Mọi
bước đó viết được thành code — và [8.6](/blog/k8s/deploy-to-cloud/vpc-and-subnets) đã cho
thấy lợi ích: CloudFormation không chỉ dựng, nó còn biết dọn.

| Việc | Công cụ |
| --- | --- |
| Dựng cụm EKS bằng một file | `eksctl`, Terraform, AWS CDK |
| Build và push image tự động | GitHub Actions, GitLab CI |
| Đưa thay đổi YAML lên cụm tự động | GitOps: Argo CD, Flux |
| Xem log và metric của cả cụm | Prometheus, Grafana, Loki, CloudWatch |

**Bài tập đầu tiên:** viết một workflow GitHub Actions build image `menu-api` và push lên
Docker Hub mỗi khi có commit — chưa cần đụng tới cụm.

**Từ khoá:** `eksctl`, Terraform, GitOps, Argo CD, image tag theo commit SHA, Prometheus.

## Ba hướng đi, chọn theo mục tiêu

| Mục tiêu | Học tiếp | Bỏ qua được |
| --- | --- | --- |
| **Đọc hiểu và debug manifest của team** | Mục 1–4 | Mục 8–10 |
| **Tự vận hành một cụm nhỏ** | Tất cả, thêm backup (Velero) và nâng cấp cụm | — |
| **Chứng chỉ** | **CKAD** — mục 1–7 là gần đủ phạm vi thi | CKA, trừ khi bạn làm ops |

CKAD thi kỹ năng của người **dùng** cụm; CKA thi kỹ năng **dựng và vá** cụm. Với người làm
ứng dụng, CKAD đúng vai hơn.

## Self-check

- [ ] Kể được bốn mảng nên học ngay, và mỗi mảng vá lỗ hổng nào của Cafe System
- [ ] Nói được `livenessProbe` khác `readinessProbe` ở câu hỏi nó trả lời
- [ ] Giải thích vì sao `Secret` mặc định không phải là mã hoá
- [ ] Biết khi nào dùng Kustomize, khi nào dùng Helm
- [ ] Chọn được hướng đi của mình trong ba hướng ở trên

## Open questions

- Trong mười mảng trên, mảng nào team bạn đang dùng mà bạn chưa đọc hiểu được?
- Nếu chỉ có một cuối tuần, bài tập nào trong mười bài cho bạn nhiều nhất?
- Có nên chạy database trong Kubernetes không, hay để dịch vụ quản lý sẵn lo?
