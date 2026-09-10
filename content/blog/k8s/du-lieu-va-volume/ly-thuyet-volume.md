---
title: "6.3 Lý thuyết Volume & so sánh với Docker"
description: Cùng tên gọi, khác luật chơi — volume của K8s không mặc nhiên bền, và nó chết theo Pod.
status: growing
created: 2026-09-10
updated: 2026-09-10
tags: [k8s, volume, docker, state]
---

[Note 6.1](/blog/k8s/du-lieu-va-volume/du-an-khoi-diem) vừa dạy bạn một trực giác rất
chắc: xoá container, dữ liệu vẫn còn. Note này **cố tình đập vỡ nó**, vì mang nguyên trực
giác đó sang K8s là mất dữ liệu thật.

## K8s mount volume vào container — hai điều đi kèm

```
        K8s mount Volume vào Container
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
  Rất nhiều KIỂU /          VÒNG ĐỜI volume
  driver được hỗ trợ        bám theo vòng đời POD
        │                         │
   ┌────┴────┐              ┌─────┴──────┐
   ▼         ▼              ▼            ▼
 volume   volume        sống qua      mất khi
 "local"  của cloud     container     Pod bị
(trên node) provider    restart &     huỷ
                        cả removal
```

Nhánh trái là điều tốt: bạn chọn được chỗ chứa phù hợp — một thư mục trên node, hay một
đĩa EBS/GCE thật của nhà cung cấp cloud.

Nhánh phải là điều phải nhớ kỹ: **volume gắn với Pod, không gắn với container.** Nó sống
qua mọi lần container chết đi sống lại — nhưng Pod chết là nó đi theo.

## Bảng đối chiếu

| | K8s Volume | Docker Volume |
| --- | --- | --- |
| Kiểu và driver | **Rất nhiều** — chọn theo nhu cầu | Gần như chỉ một kiểu dùng thật |
| Độ bền | **Không mặc nhiên bền** | Bền tới khi bạn tự tay xoá |
| Container restart / bị xoá | Sống sót | Sống sót |

Đúng **một dòng** giống nhau: cả hai đều sống sót khi container restart hoặc bị xoá. Hai
dòng còn lại khác hẳn, và dòng giữa là dòng làm người ta mất dữ liệu.

> Docker có cơ chế volume driver (NFS, plugin…), nhưng thực tế gần như ai cũng dùng
> `local`. Còn ở K8s, chọn kiểu là việc bắt buộc phải làm — không có mặc định nào an
> toàn cho mọi trường hợp.

## Dòng nguy hiểm nhất: "không mặc nhiên bền"

Ở Docker, volume **sống tới khi bạn ra lệnh xoá nó**. Bạn phải chủ động gõ `-v` thì dữ
liệu mới mất — đúng như bài tập ở note 6.1.

Ở K8s, với các kiểu cơ bản, volume **sống tới khi Pod chết**. Mà Pod thì chết liên tục,
và phần lớn là do chính bạn ra lệnh mà không nghĩ tới dữ liệu:

- `kubectl delete pod`
- rollout một image mới — Pod cũ bị thay bằng Pod mới
- scale xuống rồi lên lại
- node được drain để bảo trì
- scheduler dời Pod sang node khác

Không hành động nào trong số đó *trông giống* "xoá dữ liệu". Ở Docker chúng tương đương
`docker rm` — vốn vô hại. Ở K8s chúng là `docker volume rm`.

## Bài tập trên giấy — đoán trước rồi kiểm sau

Chưa cần gõ lệnh nào. Tự điền cột thứ ba, rồi giữ lại để đối chiếu ở note 6.6 và 6.7:

| Chuyện gì xảy ra | Docker volume | K8s volume kiểu cơ bản |
| --- | --- | --- |
| Container bên trong crash rồi restart | Còn | ? |
| Container bị xoá, dựng lại từ image | Còn | ? |
| Pod bị xoá, Deployment tạo Pod mới | — | ? |
| Rollout đổi image | — | ? |
| Node reboot | Còn | ? |
| Bạn tự tay xoá volume | Mất | ? |

Gợi ý cho dòng thứ ba: nó chính là bài tập 2 của note 6.1, nhưng chạy trên K8s — và kết
quả **ngược lại**.

## Nhưng volume vẫn cứu được một thứ rất thật

Đừng vì "không mặc nhiên bền" mà kết luận volume vô dụng ở K8s. Nhớ lại
[note 5.10](/blog/k8s/k8s-thuc-chien/restart-container): container chết là kubelet dựng
container **mới từ image**, lớp ghi cũ đi luôn — trong khi Pod vẫn nguyên tên, nguyên IP,
chỉ `RESTARTS` nhảy lên 1.

Không có volume thì mỗi lần app crash là mất sạch dữ liệu, dù chẳng ai xoá gì cả. Có
volume thì qua được chuyện đó. Đấy đã là một khoảng cách rất lớn — chỉ là chưa đủ để gọi
là "bền".

Ba mức, và section này đi hết cả ba:

| Mức | Sống qua được | Note |
| --- | --- | --- |
| Không volume | Không gì cả | — |
| Volume gắn Pod | Container restart, container bị xoá | 6.6, 6.7 |
| PersistentVolume | Pod bị xoá, node đổi, cụm dựng lại | 6.9 → 6.12 |

## Tự kiểm

- [ ] Nói được volume của K8s gắn với **Pod**, không phải container
- [ ] Chỉ ra đúng một dòng mà K8s và Docker giống nhau trong bảng đối chiếu
- [ ] Kể được ba việc thường ngày làm Pod chết, kéo theo mất dữ liệu
- [ ] Giải thích được vì sao volume "không bền" vẫn đáng dùng

## Câu hỏi còn mở

- Volume kiểu `hostPath` để lại byte trên node sau khi Pod chết — vậy dữ liệu đó còn
  dùng lại được không, hay chỉ là rác?
- Nếu volume gắn với Pod, hai Pod của cùng một Deployment có dùng chung volume không?
