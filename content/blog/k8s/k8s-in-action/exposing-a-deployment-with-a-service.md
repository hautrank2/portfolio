---
title: "5.9 Exposing một Deployment với một Service"
description: Bốn kiểu Service, và vì sao cùng một lệnh expose cho hai kết quả khác nhau trên hai cụm.
status: growing
created: 2026-08-25
updated: 2026-09-04
tags: [k8s, service, network, loadbalancer, nodeport]
---

`port-forward` ở [note 5.6](/blog/k8s/k8s-in-action/first-deployment-imperative) là
một ống nối tạm, chết theo phiên terminal. Còn `first-app` ở
[note 5.8](/blog/k8s/k8s-in-action/service-object) mới chỉ có ClusterIP — gọi được từ
trong cluster, không gọi được từ máy bạn.

Note này đi hết đường: từ file zip tới lúc **mở trình duyệt và thấy trang**.

## Bài tập 1 — Từ zip tới trình duyệt

📦 [Tải source về](/code/first-app.zip) nếu chưa có — giải nén ra thư mục `first-app`.

Nếu `first-app` còn sống từ note 5.6 thì **kiểm tên image trước khi tin nó**:

```bash
kubectl get deploy first-app -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

Không phải `kub-first-app` — hay gặp nhất là còn sót `nginx` từ một bài trước — thì xoá
đi làm lại, đừng chữa:

```bash
kubectl delete deployment first-app --ignore-not-found; kubectl delete svc first-app --ignore-not-found
```

Dựng lại từ đầu. Ba bước, và **bước giữa là bước hay bị quên nhất**:

```bash
cd first-app && docker build -t hautrank2/kub-first-app:1 .
```

```bash
docker save hautrank2/kub-first-app:1 | sudo k3s ctr images import -
```

```bash
kubectl create deployment first-app --image=hautrank2/kub-first-app:1 --port=8080
```

Thiếu bước giữa thì Pod nằm lì ở `ImagePullBackOff`: `docker build` bỏ image vào kho của
**Docker**, còn kubelet đi hỏi kho của **containerd** — hai kho riêng biệt, không nhìn
thấy nhau. [Note 5.6](/blog/k8s/k8s-in-action/first-deployment-imperative) đào kỹ
chuyện này.

Dòng đó phải chạy **nguyên vẹn cả hai vế**. Gõ mỗi `docker save` thì nó từ chối —
*"cowardly refusing to save to a terminal"* — vì tarball sẽ đổ thẳng ra màn hình. Vế sau
dấu `|` chính là chỗ nhận cái tarball đó, và `-` nghĩa là "đọc từ stdin".

### Bỏ hẳn bước import có được không

Được, nhưng phải **thay** bằng thứ khác chứ không bỏ trắng. Kubelet chỉ biết hỏi
containerd, và Docker không có đường tự đẩy image sang đó.

| Thay bằng | Đánh đổi |
| --- | --- |
| `docker push` lên Docker Hub | Đúng cách production. Cần login, cần mạng, image thành public |
| Registry riêng trong cluster | Sạch nhất khi nhiều node. Phải dựng thêm một thứ nữa |
| Cài k3s với `--docker` | Docker **là** runtime luôn, khỏi import mãi mãi. Nhưng phải dựng lại cụm |

Với lab một node thì `ctr images import` vẫn là đường ngắn nhất — đổi lại, nhớ chạy lại
nó **sau mỗi lần build**, nếu không cụm vẫn đang ôm image cũ.

Chờ tới `1/1 Running` rồi hẵng đi tiếp — bước sau **không** kiểm tra giúp bạn:

```bash
kubectl rollout status deployment first-app && kubectl exec deploy/first-app -- wget -qO- http://localhost:8080
```

Phải ra `<h1>Hello from this NodeJS app!</h1>`. `1/1 Running` **không** đủ để kết luận
app đang phục vụ — một container chạy nginx nghe cổng 80 cũng `1/1 Running` y hệt, và
mọi thứ phía sau sẽ hỏng trong im lặng. Gọi được từ trong Pod rồi mới leo ra ngoài.

Xoá Service ClusterIP của note trước rồi expose lại bằng `LoadBalancer`:

```bash
kubectl delete svc first-app --ignore-not-found
kubectl expose deployment first-app --type=LoadBalancer --port=8080
```

**Đoán trước:** `LoadBalancer` là kiểu "nhờ hạ tầng dựng một load balancer thật". Cụm k3s
trên VM của bạn thì lấy đâu ra load balancer? Cột `EXTERNAL-IP` sẽ có gì?

```bash
kubectl get services
```

**Kết quả:** có địa chỉ thật, cấp gần như tức thì.

```
NAME         TYPE           CLUSTER-IP      EXTERNAL-IP       PORT(S)          AGE
first-app    LoadBalancer   10.43.147.219   192.168.103.154   8080:30726/TCP   4s
kubernetes   ClusterIP      10.43.0.1       <none>            443/TCP          13d
```

Mở trình duyệt vào `http://192.168.103.154:8080` — `Hello from this NodeJS app!`.
**Xong bài tập.** Đổi IP thành cái của bạn; nó chính là IP node, thứ lấy được bằng
`ip route get 1.1.1.1`.

Browser không ra gì? Đừng nhìn vào Service — nó vừa báo `EXTERNAL-IP` rất khoẻ mà vẫn có
thể trỏ vào hư không. Hỏi câu này trước:

```bash
kubectl get endpoints first-app
```

Có `10.42.x.x:8080` là Service đã tìm thấy Pod, lỗi nằm ở mạng hoặc firewall. Ra
`<none>` thì Pod chưa hề chạy — quay lại `kubectl get pods`, chín trên mười lần là quên
bước nạp image ở trên.

## Cái "load balancer" đó thật ra là gì

k3s không gọi ra AWS. Nó có sẵn **ServiceLB** (tên cũ: klipper-lb), và cách làm thì
trần trụi đến bất ngờ:

```bash
kubectl get pods -n kube-system -l svccontroller.k3s.cattle.io/svcname=first-app -o wide
```

**Kết quả:** một DaemonSet `svclb-first-app-...` vừa mọc lên. Mỗi Pod của nó dùng
`hostPort` chiếm cổng 8080 **trên chính node**, rồi đẩy gói vào ClusterIP. Xong, k3s ghi
IP node vào ô `EXTERNAL-IP`.

Nói cách khác: không có load balancer nào cả. Có một Pod giả vờ làm load balancer, và
điều đó đủ để `type: LoadBalancer` trở thành thật trên cụm của bạn.

Xoá Service thì DaemonSet đó biến mất theo — thử `kubectl get pods -n kube-system` trước
và sau khi `kubectl delete svc first-app` là thấy.

## Cùng lệnh đó, trên cụm khác

**Đoán trước:** gõ y nguyên `kubectl expose --type=LoadBalancer` trên một cụm `kubeadm`
tự dựng — cũng ra IP chứ?

**Kết quả:** không.

```
NAME        TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)          AGE
first-app   LoadBalancer   10.96.12.87    <pending>     8080:31842/TCP   5s
```

`<pending>` này **không phải đang tải**. Nó sẽ nằm đó mãi mãi.

`type: LoadBalancer` tự nó không dựng được cái gì. Nó chỉ là một **lời nhờ vả** ghi vào
etcd, chờ ai đó nhận: trên EKS là cloud controller manager của AWS dựng một ELB, trên
GKE là Google LB — và bạn trả tiền cho nó. Trên k3s là cái DaemonSet ở trên. Cụm
`kubeadm` trần hay `kind` thì **không có ai nhận**, nên ô đó trống vĩnh viễn.

Rơi vào cảnh đó thì vẫn gọi được app — tầng NodePort bên dưới không phụ thuộc vào ai
cả, cứ nhắm thẳng vào nó:

```bash
curl -s http://<ip-node>:31842
```

**Vì sao quan trọng:** cùng một manifest, hai cụm, hai kết quả. YAML của bạn không sai ở
đâu cả — thứ khác nhau là **ai đang đứng sau cụm**. Đây đúng là chuyện
[K8s không quản lý hạ tầng](/blog/k8s/k8s-in-action/k8s-does-not-manage-infrastructure-2) lặp lại
lần nữa, lần này ở tầng mạng. Gặp `<pending>` ở cụm on-prem sau này, đừng sửa YAML — đi
tìm xem cụm có cài MetalLB hay chưa.

## Bốn kiểu Service

`--type` chỉ nhận bốn giá trị. Ba cái đầu **xếp chồng** lên nhau; cái thứ tư đứng riêng
hẳn ra.

| `type` | Ai gọi được | Cơ chế thật sự | Dùng khi |
| --- | --- | --- | --- |
| **ClusterIP** (mặc định) | Chỉ trong cluster | IP ảo + luật iptables trên mỗi node | Service gọi service — đa số |
| **NodePort** | Ngoài, qua `<ip-node>:30000–32767` | Mở thêm một cổng trên **mọi** node | Lab, demo, thử nhanh |
| **LoadBalancer** | Ngoài, qua LB của hạ tầng | Nhờ bên ngoài cấp địa chỉ | Production trên cloud |
| **ExternalName** | — | Một bản ghi CNAME trong DNS | Trỏ tên nội bộ ra dịch vụ ngoài |

**ClusterIP** — một IP hư cấu không nằm trên interface nào, chỉ tồn tại trong luật
iptables mà kube-proxy viết ra. Đây là nền của hai kiểu dưới.

**NodePort** — vẫn có đủ ClusterIP, cộng thêm một cổng trong dải 30000–32767 mở trên
**mọi** node, kể cả node không chạy Pod nào. Dải cổng cố ý nằm cao để khỏi đụng cổng
dịch vụ thông thường.

**LoadBalancer** — vẫn có đủ ClusterIP và NodePort, cộng thêm lời nhờ vả gửi ra ngoài.
Nhìn lại output ở trên là thấy nguyên chồng ba tầng trong **một** dòng: `CLUSTER-IP` có
(tầng 1), `8080:30726` có (tầng 2), `EXTERNAL-IP` có (tầng 3, do ServiceLB đáp). **Ba
tầng của cùng một object**, không phải ba object.

Chứng minh tầng 2 vẫn sống nguyên dưới tầng 3 — gọi thẳng vào `nodePort`, ra kết quả y
hệt:

```bash
curl -s http://192.168.103.154:30726
```

**ExternalName** — kẻ lạc loài. Không selector, không ClusterIP, không cổng, không
chuyển tiếp gói nào cả. CoreDNS chỉ trả về một CNAME:

```bash
kubectl create service externalname db-ngoai --external-name=mydb.abc123.ap-southeast-1.rds.amazonaws.com
```

Pod gọi `db-ngoai` → DNS trả CNAME → Pod đi thẳng tới RDS, không qua kube-proxy. Lợi ích
là **cái tên**: code luôn viết `db-ngoai`, còn dev/staging/prod trỏ ra ba database khác
nhau mà không phải sửa dòng nào.

Kiểu thứ năm thì không có. `clusterIP: None` (**headless**) chỉ là biến thể của
ClusterIP: bỏ IP ảo đi, DNS trả thẳng danh sách IP Pod — thứ StatefulSet cần.

## Ba cổng, và chúng khác nhau thật sự

`8080:30726/TCP` là hai trong ba con số. Đủ bộ:

| Trường | Ở đâu | Trong ví dụ |
| --- | --- | --- |
| `nodePort` | Trên **mọi node**, mở ra ngoài | 30726 |
| `port` | Trên **ClusterIP** của Service | 8080 |
| `targetPort` | Trên **container** | 8080 (mặc định lấy theo `port`) |

Đường đi: `node:30726` → `clusterIP:8080` → `pod:8080`.

`kubectl expose` để `targetPort` bằng `port`, nên ở đây cả ba đều dính tới số 8080 và
tưởng như chỉ có một. Chúng độc lập hoàn toàn — bài tập 2 làm lộ ra điều đó.

## Bài tập 2 — Cố tình sai `targetPort`

**Đoán trước:** đổi `targetPort` sang 3000 trong khi app vẫn nghe 8080. Service báo lỗi,
hay vẫn xanh bình thường?

```bash
LB=$(kubectl get svc first-app -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
PORT=$(kubectl get svc first-app -o jsonpath='{.spec.ports[0].nodePort}')
kubectl patch svc first-app -p '{"spec":{"ports":[{"port":8080,"targetPort":3000,"nodePort":'$PORT'}]}}'
```

```bash
curl -s -m 3 -o /dev/null -w '%{http_code}\n' http://$LB:8080 || echo "khong ket noi duoc"
```

**Kết quả:** **không có lỗi nào cả.** Service vẫn tồn tại, `EXTERNAL-IP` vẫn nguyên,
endpoint vẫn đầy đủ, `kubectl get svc` xanh mướt. Chỉ là kết nối bị từ chối, vì gói được
chuyển tới cổng 3000 của Pod, nơi không có ai nghe.

Trả lại:

```bash
kubectl patch svc first-app -p '{"spec":{"ports":[{"port":8080,"targetPort":8080,"nodePort":'$PORT'}]}}'
```

**Vì sao quan trọng:** đây là lỗi phổ biến nhất khi mới viết Service YAML, và nó **im
lặng tuyệt đối**. K8s không có cách nào biết container của bạn nghe cổng nào — nó chỉ
làm theo con số bạn khai. `EXPOSE 8080` trong Dockerfile cũng chỉ là ghi chú, không ai
đọc để đối chiếu.

Cách kiểm nhanh khi nghi ngờ:

```bash
kubectl get endpointslice -l kubernetes.io/service-name=first-app -o jsonpath='{.items[0].endpoints[*].addresses}{"  cong: "}{.items[0].ports[*].port}{"\n"}'
```

Có endpoint mà không gọi được → gần như chắc chắn sai `targetPort`. Không có endpoint
nào → sai `selector`, chuyện của
[note về label](/blog/k8s/k8s-in-action/labels-and-selectors).

## Self-check

- [ ] Kể được bốn `type`, cái nào bao cái nào, và cái nào đứng riêng
- [ ] Nói được ai điền `EXTERNAL-IP` trên k3s, và vì sao cụm trần thì để trống vĩnh viễn
- [ ] Giải thích được ServiceLB làm gì mà không cần load balancer thật
- [ ] Vẽ được đường đi qua ba cổng và nói mỗi cổng nằm ở đâu
- [ ] Giải thích được vì sao sai `targetPort` lại không sinh ra lỗi nào
- [ ] Phân biệt được triệu chứng "sai targetPort" và "sai selector"

## Open questions

- Mỗi Service `LoadBalancer` là một LB tính tiền riêng trên cloud. Vậy 30 service thì làm
  sao? (gợi ý: [Ingress](/blog/k8s/networking/ingress-vs-service))
- ServiceLB chiếm `hostPort` trên node — hai Service cùng đòi cổng 8080 thì ai thắng?
- `targetPort` khai bằng **tên** thay vì số thì lợi gì?
- NodePort mở trên mọi node — vậy chặn bớt bằng gì khi không muốn thế?
