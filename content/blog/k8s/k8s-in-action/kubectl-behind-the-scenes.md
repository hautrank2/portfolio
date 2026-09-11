---
title: "5.7 kubectl: chuyện gì xảy ra phía sau"
description: Một lệnh, bốn diễn viên. Lần theo tham số --image từ bàn phím tới lúc container chạy.
status: growing
created: 2026-08-25
updated: 2026-09-02
tags: [k8s, kubectl, api, scheduler, kubelet]
---

[Note trước](/blog/k8s/k8s-in-action/first-deployment-imperative) gõ một lệnh và có
container chạy. Note này mổ đúng lệnh đó ra: giữa hai đầu có **bốn** bên làm việc, và
không bên nào biết mặt bên kia.

## Toàn cảnh

```
   kubectl create deployment first-app --image=hautrank2/kub-first-app:1
             │                                                    ╎
          ①  │ HTTPS POST                                         ╎
             ▼                                                    ╎
   ┌──────────────────────┐                                       ╎
   │    MASTER NODE       │                                       ╎
   │    (control plane)   │                                       ╎
   │                      │                                       ╎
   │  ② api-server, etcd  │                                       ╎
   │     controller       │                                       ╎
   │  ③ scheduler         │                                       ╎
   └──────────┬───────────┘                                       ╎
              │ gán Pod vào một node cụ thể                       ╎
              ▼                                                   ╎
   ┌──────────────────────┐                                       ╎
   │    WORKER NODE       │                                       ╎
   │                      │                                       ╎
   │  ④ kubelet           │                                       ╎
   │        │             │                                       ╎
   │        ▼             │                                       ╎
   │  ┌──────────────┐    │                                       ╎
   │  │ Pod          │    │                                       ╎
   │  │ ┌──────────┐ │    │                                       ╎
   │  │ │ Container│◀╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
   │  │ └──────────┘ │    │
   │  └──────────────┘    │
   └──────────────────────┘
```

| # | Ai | Làm gì | Xong khi |
| --- | --- | --- | --- |
| ① | **kubectl** | Dịch lệnh thành một HTTPS POST | api-server trả `201 Created` |
| ② | **api-server + controller** | Xác thực, phân quyền, ghi etcd. Deployment controller sinh ReplicaSet, ReplicaSet sinh Pod | Pod tồn tại, nhưng `spec.nodeName` **rỗng** |
| ③ | **scheduler** | Soi các Pod đang chạy trên toàn cluster, chọn node tốt nhất, ghi tên node vào Pod | Pod có `nodeName` |
| ④ | **kubelet** | Thấy Pod gán cho mình → bảo containerd kéo image → chạy container, rồi trông chừng nó | Container `Running` |

Cả ① ② ③ đều nằm trên **master**. Việc thật — kéo image, chạy tiến trình — chỉ xảy ra ở
④, trên worker. Master không chạy app của bạn; nó chỉ quyết định app chạy ở đâu.

## Đường nét đứt: `--image` đi thẳng tới container

Chuỗi `hautrank2/kub-first-app:1` **không được ai ở master mở ra xem**. Nó chỉ là một
chuỗi ký tự, được chép từ lệnh vào Deployment, từ Deployment vào ReplicaSet, từ ReplicaSet
vào Pod — mãi tới ④ mới có người thật sự dùng tới nó.

Hệ quả rất cụ thể: **gõ sai tên image thì cluster không hề báo lỗi ở ①**. Lệnh trả về
`deployment.apps/first-app created` như thường. Lỗi nổ ở ④, vài giây sau, dưới dạng
`ErrImagePull`. Đúng thứ bạn gặp ở bài tập 1 của note trước — và giờ thì biết vì sao nó
tới muộn như vậy.

## Bài tập 1 — Xem đúng request kubectl gửi đi (chặng ①)

**Đoán trước:** `kubectl get pods` gửi đi mấy request, tới URL nào, bằng method gì?

```bash
kubectl get pods -v=8 2>&1 | grep -E "GET|Response Status" | head
```

**Kết quả:** đại khái

```
GET https://127.0.0.1:6443/api/v1/namespaces/default/pods?limit=500
Response Status: 200 OK
```

Chỉ vậy. Một `GET`, một URL REST rất đoán được: `/api/v1/namespaces/<ns>/pods`. Cấu trúc
URL khớp đúng với cột `APIVERSION` trong `kubectl api-resources`.

`-v=8` in cả header và body. Rất đáng nhớ khi debug phân quyền: bạn thấy chính xác
request nào bị `403` chứ không phải đoán.

**Vậy `kubectl` là gì?** Một chương trình dịch lệnh thành HTTP rồi vẽ kết quả thành bảng.
Không hơn. Nó không có kênh đặc quyền nào tới cluster.

## Bài tập 2 — Bắt Pod ở khoảnh khắc chưa có node (chặng ② → ③)

**Đoán trước:** Pod đã tồn tại trong etcd nhưng scheduler chưa chọn được node cho nó —
trạng thái đó nhìn thế nào? Có phân biệt được với "đang kéo image" không?

Ép scheduler bó tay bằng một `nodeSelector` không node nào khớp:

```bash
kubectl run keo --image=hautrank2/kub-first-app:1 --overrides='{"spec":{"nodeSelector":{"disk":"khong-co"}}}'
```

```bash
kubectl get pod keo -o wide
```

**Kết quả:** `Pending`, và cột `NODE` là `<none>`.

```
NAME   READY   STATUS    RESTARTS   AGE   IP       NODE     NOMINATED NODE
keo    0/1     Pending   0          20s   <none>   <none>   <none>
```

```bash
kubectl get pod keo -o jsonpath='{.spec.nodeName}'; echo "<- rỗng"
```

```bash
kubectl describe pod keo | tail -4
```

```
Type     Reason            From               Message
Warning  FailedScheduling  default-scheduler  0/1 nodes are available: 1 node(s)
                                              didn't match Pod's node affinity/selector.
```

Object **có tồn tại** — ② đã xong xuôi, api-server đã ghi etcd, `kubectl get` thấy nó.
Chỉ là chưa ai nhận nuôi. Pod ở trạng thái này **chưa hề chạm tới worker node nào**:
kubelet không biết nó tồn tại, và image cũng chưa được kéo dòng nào.

```bash
kubectl delete pod keo
```

## Bài tập 3 — Events chính là hình vẽ ở trên, viết bằng chữ

```bash
kubectl describe pod -l app=first-app | grep -A8 "Events:"
```

**Kết quả:**

```
Type    Reason     Age   From               Message
Normal  Scheduled  4m    default-scheduler  Successfully assigned default/first-app-… to node-1
Normal  Pulling    4m    kubelet            Pulling image "hautrank2/kub-first-app:1"
Normal  Pulled     4m    kubelet            Successfully pulled image …
Normal  Created    4m    kubelet            Created container first-app
Normal  Started    4m    kubelet            Started container first-app
```

Đọc **cột `From`**, không phải cột `Message`. Nó đổi chủ đúng một lần: `default-scheduler`
làm xong chặng ③ rồi bàn giao, `kubelet` làm cả chặng ④. Đó là toàn bộ sơ đồ trên, do
chính cluster tự khai ra.

## Bài tập 4 — Bỏ kubectl đi, gọi thẳng API

**Đoán trước:** không có `kubectl` thì lấy dữ liệu đó bằng gì?

```bash
kubectl proxy --port=8001
```

Terminal khác:

```bash
curl -s localhost:8001/api/v1/namespaces/default/pods | head -20
```

**Kết quả:** JSON đầy đủ — đúng thứ `kubectl get pods` nhận được trước khi nó vẽ thành
bảng.

Gọi thẳng cổng 6443 mà không qua proxy thì bị từ chối vì thiếu chứng chỉ client.
`kubectl proxy` mở một cửa **không cần xác thực ở phía bạn** rồi tự đính danh tính từ
kubeconfig vào. Chính vì thế đừng bao giờ mở nó ra ngoài `localhost`.

## Hỏng ở chặng nào

Đây là lý do đáng để thuộc sơ đồ này — nó biến một thông báo lỗi thành một địa chỉ cụ thể
để đi hỏi.

| Triệu chứng | Hỏng ở | Đi tìm ở đâu |
| --- | --- | --- |
| `The connection to the server … was refused` | ① | kubeconfig sai, hoặc api-server chết |
| `Error … is forbidden: User … cannot create` | ② | RBAC, ServiceAccount |
| Lệnh trả về `created` nhưng `kubectl get all` không thấy Pod | ② | controller-manager chết |
| Pod `Pending`, `NODE` là `<none>` | ③ | scheduler: taint, thiếu tài nguyên, `nodeSelector` |
| Pod `ContainerCreating` / `ImagePullBackOff` mãi | ④ | kubelet, registry, mạng của node |
| Pod `Running` nhưng `READY 0/1` | sau ④ | app bên trong, hoặc readiness probe |

Bốn dòng đầu là chuyện của master, hai dòng cuối là chuyện của node. Nhìn `describe pod`
mà không biết đang ở dòng nào thì mọi lỗi trông đều giống nhau.

## Vì sao quan trọng

- **`created` không có nghĩa là đang chạy.** Nó chỉ nghĩa là api-server ghi xong etcd —
  hết chặng ②. Ba chặng còn lại diễn ra sau đó, bất đồng bộ, và có thể thất bại im lặng.
- **Mọi thứ nói chuyện với K8s đều qua cùng một REST API** — Helm, ArgoCD, dashboard,
  controller bạn tự viết, và cả kubelet. Không ai có cửa sau.
- **RBAC áp ở tầng HTTP**, nên `kubectl` không thể làm gì mà API không cho phép.
- **`kubectl get pods -w` không phải vòng lặp hỏi lại.** Nó là một request `?watch=true`
  giữ mở, api-server đẩy sự kiện xuống. Đúng cơ chế mà scheduler và kubelet đang dùng để
  biết có việc mới.

## Tự kiểm

- [ ] Vẽ lại được bốn chặng và nói ai làm gì ở mỗi chặng
- [ ] Giải thích được vì sao sai tên image lại không bị bắt ngay lúc gõ lệnh
- [ ] Phân biệt được `Pending` do scheduler với `ContainerCreating` do kubelet
- [ ] Dùng cột `From` trong Events để biết ai đang xử lý Pod
- [ ] Nói được `-w` hoạt động bằng cơ chế gì

## Câu hỏi còn mở

- Scheduler "chọn node tốt nhất" dựa trên điểm số nào? (gợi ý: filter rồi score)
- Nếu mọi client đều dùng chung API, vì sao vẫn cần client library (client-go)?
- `kubectl apply` tính ra phần khác biệt ở đâu — máy bạn hay server?
