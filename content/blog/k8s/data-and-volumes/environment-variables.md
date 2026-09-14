---
title: "6.14 Dùng biến môi trường"
description: Gỡ một con số cứng ra khỏi code — và thấy vì sao nó vẫn chưa đủ để gọi là cấu hình.
status: growing
created: 2026-09-14
updated: 2026-09-14
tags: [k8s, env, configuration, deployment]
---

Đường dẫn `story` đang nằm cứng trong `app.js`:

```js
const filePath = path.join(__dirname, 'story', 'text.txt');
```

Muốn đổi sang `data` thì phải sửa code, build lại image, import lại, rollout lại. Với một
thư mục thì buồn cười, nhưng thay `story` bằng *địa chỉ database* hay *khoá API* là bạn
thấy vấn đề ngay: **cùng một image phải chạy được ở dev, staging và production**.

## Sửa app để đọc biến môi trường

```js
const filePath = path.join(__dirname, process.env.STORY_FOLDER, 'text.txt');
```

Build tag mới — nhớ bài học ở
[note 5.12](/blog/k8s/k8s-in-action/updating-deployments), giữ tag cũ là K8s không thấy
gì để làm:

```bash
docker build -t hautrank2/kub-data-app:2 . && docker save hautrank2/kub-data-app:2 | sudo k3s ctr images import -
```

## Khai biến trong deployment

```yaml
        - name: story
          image: hautrank2/kub-data-app:2
          imagePullPolicy: IfNotPresent
          env:
            - name: STORY_FOLDER
              value: 'story'
          ports:
            - containerPort: 3000
          volumeMounts:
            - name: story-volume
              mountPath: /app/story
```

`env` là **một danh sách**, mỗi phần tử có `name` và `value` — không phải map kiểu
`STORY_FOLDER: story`. Đây là lỗi cú pháp hay gặp nhất khi mới viết.

```bash
kubectl apply -f deployment.yaml && kubectl rollout status deployment story
```

Kiểm biến đã vào container chưa:

```bash
kubectl exec deploy/story -- printenv STORY_FOLDER
```

Rồi thử lại app — nhớ POST trước:

```bash
curl -X POST -H 'Content-Type: application/json' -d '{"text":"qua bien moi truong"}' http://192.168.103.154:3000/story && curl http://192.168.103.154:3000/story
```

## Bài tập — Đổi giá trị mà không đụng tới code

**Đoán trước:** đổi `value: 'story'` thành `value: 'story-data'`, còn `mountPath` vẫn giữ
`/app/story`. App sẽ ghi vào đâu, và dữ liệu cũ có thấy không?

```bash
sed -i "s|value: 'story'|value: 'story-data'|" deployment.yaml && kubectl apply -f deployment.yaml && kubectl rollout status deployment story
```

```bash
curl http://192.168.103.154:3000/story
```

**Kết quả:** `500 Failed to open file.` — và đây là kết quả **đúng**.

App giờ tìm `/app/story-data/text.txt`, mà volume lại mount ở `/app/story`. Hai đường dẫn
không còn gặp nhau: app ghi vào lớp ghi của container (thư mục `/app/story-data` do Node tự
tạo), còn dữ liệu cũ vẫn nằm yên ở `/data` trên node.

Muốn đổi thật thì phải đổi **cả hai**:

```yaml
          env:
            - name: STORY_FOLDER
              value: 'story-data'
          volumeMounts:
            - name: story-volume
              mountPath: /app/story-data      # ← đi theo
```

**Vì sao quan trọng:** biến môi trường gỡ được giá trị ra khỏi **code**, nhưng nó không tự
biết những chỗ khác đang phụ thuộc vào giá trị đó. Ở đây `STORY_FOLDER` và `mountPath`
buộc phải khớp nhau, mà **không có gì trong K8s kiểm tra điều đó** — lại một lỗi im lặng
nữa, đúng họ với `targetPort`.

Trả lại trước khi đi tiếp:

```bash
sed -i "s|value: 'story-data'|value: 'story'|" deployment.yaml && kubectl apply -f deployment.yaml
```

## Vì sao `env` vẫn chưa đủ

Bạn vừa gỡ giá trị ra khỏi code — nhưng nó vẫn **nằm cứng trong `deployment.yaml`**. Chỉ
là dời chỗ, chưa phải giải quyết.

Hệ quả thật sự khi có nhiều môi trường:

- Ba file deployment gần như giống hệt nhau, khác đúng vài dòng `value`
- Sửa một giá trị dùng chung ở năm app là sửa năm file
- Muốn đổi cấu hình phải rollout lại app, dù code không đổi gì

[Note sau](/blog/k8s/data-and-volumes/environment-variables-and-configmap) tách nốt phần
giá trị ra thành một object riêng.

## Self-check

- [ ] Khai được `env` đúng cú pháp danh sách, không nhầm sang map
- [ ] Kiểm được biến đã vào container bằng `printenv`
- [ ] Giải thích được vì sao đổi `STORY_FOLDER` mà quên `mountPath` thì hỏng
- [ ] Nói được vì sao `env` trong deployment vẫn chưa phải là "cấu hình"

## Open questions

- Đổi `env` có làm Pod restart không, hay app phải tự đọc lại?
- Biến môi trường chứa mật khẩu thì ai đọc được nó? (gợi ý: `kubectl describe pod`)
