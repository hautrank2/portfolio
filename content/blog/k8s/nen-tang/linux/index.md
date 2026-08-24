---
title: Linux
description: Process, namespace, cgroup, systemd, overlayfs. Đúng những mảnh mà K8s ghép lại thành Pod.
order:
  - namespace-va-cgroup
  - process-va-signal
  - systemd-co-ban
  - mount-va-overlayfs
---

Kubernetes không phát minh cơ chế cách ly nào. Nó gọi xuống những thứ kernel Linux đã
có: namespace để giới hạn *thấy được gì*, cgroup để giới hạn *dùng được bao nhiêu*,
overlayfs để xếp chồng image layer.

## Chạy ở đâu, bằng quyền gì

Mọi lệnh trong mục này chạy **trên VM Linux**, không phải trên Windows. SSH vào rồi
xác nhận bạn đang đúng chỗ:

```bash
hostname && whoami && pwd
```

**Thư mục làm việc: `~/k8s-lab`** — tức `/home/<user-cua-ban>/k8s-lab`.

```bash
whoami && echo $HOME              # xác nhận user thật, đừng đoán
mkdir -p ~/k8s-lab/{scratch,manifests} && cd ~/k8s-lab
```

**Đừng làm trong `/root`.** Đó là home của user root — `ls` cũng phải `sudo`, git và
editor đều vướng quyền, và `~/.ssh` `~/.gitconfig` `~/.kube` của bạn thì lại nằm ở home
user thường. Lý do quan trọng nhất: làm bằng user thường và chỉ `sudo` khi cần mới cho
bạn biết **lệnh nào thật sự đòi quyền root** — đó chính là thứ đáng học ở giai đoạn này.

Nói thẳng để bạn khỏi phân vân: **phần lớn bài tập ở đây không quan tâm bạn đang đứng
ở thư mục nào.** Chúng thao tác với namespace và cgroup — những thứ thuộc về *process*,
không thuộc về thư mục — hoặc dùng đường dẫn tuyệt đối như `/sys/fs/cgroup` và `/tmp`.
Mỗi bài đều ghi rõ ở đầu nếu có yêu cầu riêng.

**Về quyền.** Lệnh nào cần root đã có `sudo` viết sẵn trong bài. Đừng `sudo su` rồi
chạy tất cả bằng root — làm vậy bạn mất luôn thông tin *lệnh nào thật sự cần quyền*,
mà đó là thứ đáng học.

**Mỗi note cần gì — không phải note nào cũng cần cluster:**

| Note | Cần gì |
| --- | --- |
| Namespace & cgroup | Không cần gì ngoài Linux |
| Process & signal | `docker` |
| Mount & overlayfs | `docker` (chỉ bài 3) |
| **systemd** | **k3s đang chạy** |

Ba note đầu chạy được ngay trên một VM Ubuntu trắng. Chỉ note `systemd` mới cần cluster —
nếu chưa cài k3s thì cứ để dành note đó, hoặc cài luôn theo bước dưới.

### Cài k3s (chỉ khi cần note systemd, hoặc muốn đi trước sang Section 2)

```bash
curl -sfL https://get.k3s.io | sh -
sudo systemctl status k3s --no-pager | head -3
```

Rồi cho `kubectl` chạy bằng user thường. k3s ghi kubeconfig ra
`/etc/rancher/k3s/k3s.yaml` với quyền `600` thuộc root, nên `kubectl get nodes` sẽ báo
lỗi permission trong khi `sudo kubectl` lại chạy — rất dễ tưởng mình cài sai:

```bash
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
chmod 600 ~/.kube/config

# Bắt buộc với k3s — xem giải thích ngay dưới
echo 'export KUBECONFIG=$HOME/.kube/config' >> ~/.bashrc
source ~/.bashrc

kubectl get nodes
```

**Vì sao cần dòng `export`?** `kubectl` mà trình cài k3s tạo ra **không phải kubectl
thật** — nó là symlink trỏ về chính binary `k3s`, và bản wrapper đó mặc định đọc
`/etc/rancher/k3s/k3s.yaml` chứ **không** đọc `~/.kube/config`. Chép file xong mà bỏ
qua bước này thì vẫn lỗi y như cũ.

```bash
ls -l $(command -v kubectl)     # sẽ thấy trỏ sang /usr/local/bin/k3s
```

**Nếu dùng zsh/fish (prompt starship đẹp đẽ thường đi kèm zsh):** dòng
`export` ở trên ghi vào `~/.bashrc` sẽ **không có tác dụng** — ghi vào file
của shell bạn đang dùng:

```bash
echo $SHELL                     # xem shell thật
# zsh:
echo 'export KUBECONFIG=$HOME/.kube/config' >> ~/.zshrc
# fish:
# set -Ux KUBECONFIG $HOME/.kube/config
```

Và đừng quen tay `sudo kubectl` để né lỗi — nó chạy được nhưng che mất cấu
hình sai, và file kubectl tạo ra sẽ thuộc root.

**Hai lỗi hay gặp, đọc kỹ để phân biệt:**

| Thông báo | Nghĩa là |
| --- | --- |
| `cp: cannot stat '/etc/rancher/k3s/k3s.yaml'` | k3s **chưa được cài** — chạy lệnh `curl` ở trên trước |
| `WARN[0000] Unable to read /etc/rancher/k3s/k3s.yaml` kèm `permission denied` | k3s đã cài, nhưng **thiếu `export KUBECONFIG`**. Dòng `WARN[0000]` là log của k3s, kubectl thật không in kiểu đó |

**Về `/tmp`.** Bài tập cố ý dùng `/tmp/ovl`, `/tmp/app.sh` — `/tmp` bị dọn khi reboot
nên không để lại rác. Mặt khác: đừng để gì bạn muốn giữ ở đó.

**Nếu lỡ tay.** Mọi bài tập đều có bước dọn dẹp ở cuối. Kẹt ở đâu không thoát được thì
`exit` để rời shell con, hoặc mở phiên SSH mới — không có gì hỏng vĩnh viễn.

## Cách luyện tập ở đây

Gõ lại lệnh trong bài không làm bạn hiểu gì cả — bạn chỉ đang chép. Mỗi bài tập trong
mục này đều theo đúng ba bước:

1. **Đoán trước.** Câu hỏi luôn có đáp án đúng/sai rõ ràng. Viết câu trả lời ra giấy
   trước khi gõ. Nghiêm túc — bước này là toàn bộ giá trị.
2. **Chạy và so.** Nếu đoán đúng, bạn đã hiểu. Nếu sai, bạn vừa tìm ra một lỗ hổng mà
   đọc mười lần cũng không phát hiện được.
3. **Nối với K8s.** Mỗi bài kết thúc bằng field hoặc hành vi tương ứng trong K8s.

Đoán sai là kết quả **tốt hơn** đoán đúng. Đoán đúng chỉ xác nhận cái bạn đã biết;
đoán sai mới là chỗ học được.

## Bốn nhóm bài tập

| Note | Bạn sẽ tự tay làm | Giải thích được chuyện gì trong K8s |
| --- | --- | --- |
| Namespace & cgroup | Tạo "container" bằng `unshare`, giới hạn RAM bằng cgroup | `OOMKilled`, `resources.limits`, vì sao container cùng Pod nói chuyện qua `localhost` |
| Process & signal | Ép container phớt lờ `SIGTERM`, rồi sửa cho nó nghe lời | `terminationGracePeriodSeconds`, `Exit Code: 137`, rolling update rớt request |
| systemd | Tắt control plane, xem workload có chết theo không | Vì sao apiserver sập mà app vẫn chạy |
| Mount & overlayfs | Dựng một image layer bằng tay | Vì sao xoá file không làm image nhỏ đi, `emptyDir` mất dữ liệu lúc nào |

## Vượt chặng khi

Không phải "đã đọc hết", mà là trả lời được bốn câu này không tra tài liệu:

- [ ] Container bị cách ly bằng **cơ chế nào**, và cơ chế nào giới hạn **cái gì**?
- [ ] Vì sao `Exit Code: 137` xuất hiện, và 137 ở đâu ra?
- [ ] Sửa một file trong container thì file gốc trong image có đổi không? Nó nằm ở đâu?
- [ ] Vì sao có app nhận `SIGTERM` rồi tắt êm, có app bị giết cứng sau 30 giây?

Thiếu câu nào thì quay lại đúng note đó, đừng đi tiếp.
