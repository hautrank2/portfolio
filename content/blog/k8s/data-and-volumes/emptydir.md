---
title: "6.6 Volume đầu tiên: kiểu emptyDir"
description: Giết container thì dữ liệu còn, xoá Pod thì mất — hai bài tập đo đúng ranh giới của emptyDir.
status: growing
created: 2026-09-11
updated: 2026-09-11
tags: [k8s, volume, emptydir, state]
---

> Cần `story-deployment` đang chạy từ
> [6.4](/blog/k8s/data-and-volumes/new-deployment-and-service), và hiểu cú pháp hai khối
> ở [6.5](/blog/k8s/data-and-volumes/getting-started-with-volumes).

Volume đầu tiên, và cũng là volume đơn giản nhất. Tên nó nói đúng những gì nó làm:
**một thư mục rỗng**, do K8s tạo ra khi Pod được xếp lên node.

## Thêm vào deployment

```yaml
    spec:
      containers:
        - name: story
          image: hautrank2/kub-data-app:1
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
          volumeMounts:
            - name: story-volume
              mountPath: /app/story
      volumes:
        - name: story-volume
          emptyDir: {}
```

```bash
kubectl apply -f deployment.yaml && kubectl rollout status deployment story
```

Ghi một dòng để lát nữa có cái mà đo:

```bash
curl -X POST -H 'Content-Type: application/json' -d '{"text":"dong dau tien"}' http://192.168.103.154:3000/story && curl http://192.168.103.154:3000/story
```

> **Phải POST trước, đừng GET trước.** Volume vừa gắn là một thư mục **rỗng**, đè lên
> `story/text.txt` mà image mang sẵn — file đó bị che đi. Mà `fs.readFile` không tạo file,
> nên GET đầu tiên trả `500 Failed to open file.` chứ không phải chuỗi rỗng. `fs.appendFile`
> của POST thì tự tạo, nên POST một lần là mọi thứ vào guồng.
>
> Đây là hệ quả trực tiếp của việc mount đè: từ giờ container **không bao giờ** còn thấy
> file gốc trong image nữa.

## Bài tập 1 — Giết container, Pod vẫn sống

Đây là dòng đầu trong bảng giấy ở
[note 6.3](/blog/k8s/data-and-volumes/volume-theory).

**Đoán trước:** giết tiến trình trong container. kubelet sẽ dựng container **mới từ
image** — mà image chứa `text.txt` rỗng. Dòng bạn vừa ghi còn hay mất?

App này không có route `/error` như `first-app`, nên dừng container thẳng từ tầng node:

```bash
sudo k3s crictl stop $(sudo k3s crictl ps --name story -q | head -1)
```

```bash
kubectl get pods -l app=story
```

**Kết quả:** cùng tên Pod, cùng `AGE`, `RESTARTS` nhảy lên `1` — đúng hành vi ở
[note 5.10](/blog/k8s/k8s-in-action/container-restarts).

```bash
curl http://192.168.103.154:3000/story
```

**Kết quả:** `{"story":"dong dau tien\n"}` — **vẫn còn.**

Vì `emptyDir` thuộc về **Pod**, không thuộc container. Container mới mount lại đúng thư
mục cũ, và thư mục đó chưa hề bị đụng tới. Không có volume thì dòng vừa rồi đã mất sạch
mà chẳng ai xoá gì.

## Bài tập 2 — Xoá Pod

**Đoán trước:** giờ xoá cả Pod. Deployment dựng Pod mới ngay. `emptyDir` có theo sang
không?

```bash
kubectl delete pod -l app=story
```

```bash
kubectl get pods -l app=story && curl http://192.168.103.154:3000/story
```

**Kết quả:** Pod mới, tên mới, và `{"story":""}` — **mất sạch.**

`emptyDir` sinh ra cùng Pod và chết cùng Pod. Pod mới là một `emptyDir` mới, rỗng, đúng
như tên gọi.

## Bảng giấy, chấm điểm

| Chuyện gì xảy ra | Docker volume | `emptyDir` |
| --- | --- | --- |
| Container crash rồi restart | Còn | **Còn** |
| Container bị xoá, dựng lại từ image | Còn | **Còn** |
| Pod bị xoá, Deployment tạo Pod mới | — | **Mất** |
| Rollout đổi image | — | **Mất** (Pod bị thay) |
| Node reboot | Còn | **Mất** |
| Tự tay xoá volume | Mất | — (không có gì để xoá) |

Đây chính là câu *"volume không mặc nhiên bền"* ở note 6.3, đo được bằng số.

Và để ý dòng thứ tư: **mỗi lần deploy bản mới là mất dữ liệu.** Với một app thật thì đó
không phải là hạn chế nhỏ — đó là không dùng được.

## Vậy `emptyDir` để làm gì

Đừng vội gạch nó đi. Nó đúng việc khi dữ liệu **chỉ cần sống bằng đời Pod**:

- **Thư mục tạm** — file upload đang xử lý dở, kết quả trung gian, vùng sort
- **Cache dựng lại được** — mất thì chậm, không sai
- **Chỗ trao đổi giữa các container trong cùng Pod** — container A ghi, container B đọc;
  đây là công dụng mà không kiểu volume nào khác thay được

Nhớ lại hai loại state ở [note 6.2](/blog/k8s/data-and-volumes/more-than-docker-volumes):
`emptyDir` là câu trả lời cho **loại thứ hai** — kết quả trung gian app tự sinh. Nó chưa
bao giờ nhắm tới loại thứ nhất.

Còn `story/text.txt` của bạn là loại thứ nhất. Nên `emptyDir` **không phải** đáp án cho
app này — nó chỉ là bậc thang đầu tiên.

## Một chi tiết đáng biết

`emptyDir: {}` mặc định nằm trên **đĩa của node**. Muốn nó nằm trong RAM:

```yaml
          emptyDir:
            medium: Memory
```

Nhanh hơn hẳn, nhưng ăn vào bộ nhớ của node và mất khi node reboot — hợp cho cache nóng,
không hợp cho thứ gì lớn.

## Self-check

- [ ] Nói được `emptyDir` sinh ra lúc nào và chết lúc nào
- [ ] Giải thích được vì sao container restart không làm mất dữ liệu
- [ ] Nói được vì sao rollout đổi image lại làm mất
- [ ] Kể được ba trường hợp `emptyDir` là lựa chọn đúng

## Open questions

- `mountPath: /app/story` đè lên thư mục đã có trong image — file `text.txt` gốc đi đâu?
- Scale lên 3 replica thì ba Pod có ba `emptyDir` riêng hay dùng chung?
