# auth-api

Ký và kiểm JWT. **Không có database** — tài khoản admin khai bằng biến môi trường, nên
service này không giữ state gì cả và scale bao nhiêu bản cũng được.

- Nghe cổng `3000` (cố định trong code, không đọc biến `PORT`)
- Biến môi trường: `TOKEN_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` — xem `.env.template`
- Không service nào bên dưới nó. Đây là đáy của cây phụ thuộc.

| Method | Path | Cần token | Ai gọi |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | Không | admin-web |
| `GET` | `/auth/verify/:token` | Không (token nằm trong path) | menu-api, order-api |
| `GET` | `/auth/health` | Không | bạn, và `livenessProbe` |

---

## `POST /auth/login`

Đổi email + mật khẩu lấy một JWT sống **8 giờ**.

**Request**

```json
{ "email": "admin@cafe.local", "password": "..." }
```

**Response `200`**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "admin@cafe.local"
}
```

Payload trong token gồm `email` và `role: "admin"`. Không có gì bí mật bên trong — JWT chỉ
được **ký**, không được **mã hoá**. Ai có token đều đọc được nội dung bằng
[jwt.io](https://jwt.io); thứ họ không làm được là tạo một token mới hợp lệ mà không có
`TOKEN_KEY`.

**Lỗi**

| Mã | `message` | Nguyên nhân |
| --- | --- | --- |
| `422` | `Missing email or password.` | Một trong hai trường rỗng hoặc thiếu |
| `401` | `Wrong email or password.` | Không khớp `ADMIN_EMAIL` / `ADMIN_PASSWORD` |
| `500` | *(Express in stack trace)* | **`TOKEN_KEY` chưa được đặt** — `jwt.sign` ném lỗi |

Dòng `500` là dòng đáng nhớ nhất: request đúng, mật khẩu đúng, nhưng vẫn `500` vì thiếu
một biến môi trường. Kiểm từ chính tiến trình, không kiểm từ file YAML:

```bash
kubectl exec deploy/cafe-auth-deployment -- printenv | grep TOKEN_KEY
```

---

## `GET /auth/verify/:token`

Kiểm một token còn hợp lệ không. Đây là endpoint mà `menu-api` và `order-api` gọi trong
middleware `requireAdmin`.

**Response `200`**

```json
{ "email": "admin@cafe.local", "role": "admin" }
```

**Lỗi**

| Mã | `message` | Nguyên nhân |
| --- | --- | --- |
| `401` | `Invalid token.` | Token sai, hỏng, đã hết 8 giờ, hoặc ký bằng `TOKEN_KEY` khác |

Trường hợp cuối là bẫy: **đổi `TOKEN_KEY` rồi restart thì mọi token đang lưu ở trình duyệt
thành vô hiệu.** Admin đang mở tab sẽ bị đẩy về trang đăng nhập, và trông như một lỗi ngẫu
nhiên. Cùng họ với chuyện `TOKEN_KEY` phải giống nhau giữa mọi bản `auth-api` — chạy hai
Pod với hai giá trị khác nhau thì token ký ở Pod A bị Pod B từ chối, và lỗi chỉ xảy ra
**một nửa số lần**.

Token nằm trong URL nên nó vào access log của nginx và của mọi proxy trên đường. Ở lab thì
không sao; nếu làm thật thì chuyển sang header `Authorization`.

---

## `GET /auth/health`

```json
{ "status": "ok" }
```

Luôn `200` khi tiến trình còn sống. Nó **không** kiểm `TOKEN_KEY` hay bất cứ thứ gì khác —
nên `health` xanh vẫn không đảm bảo `/auth/login` chạy được. Đây là lý do một
`livenessProbe` xanh không phải bằng chứng service hoạt động đúng.

---

## Lỗi hay gặp khi gọi từ service khác

Ba service gọi `auth-api` qua biến `AUTH_ADDRESS`, dạng `host:port` **không kèm
`http://`** — code tự ghép tiền tố. Đặt sai gây ra những lỗi trông không liên quan:

| `AUTH_ADDRESS` | Chuyện xảy ra |
| --- | --- |
| `cafe-auth-service:3000` | Đúng |
| `http://cafe-auth-service:3000` | URL thành `http://http://…` → `503` |
| `cafe-auth-service` (thiếu cổng) | Gọi cổng 80 → treo rồi `503` |
| `cafe-auth-service.default:3000` | Đúng, nhưng chỉ chạy trong K8s, không chạy ở Docker Compose |
| rỗng | URL thành `http://undefined/auth/verify/…` → `503` |

Để ý: mọi trường hợp sai đều ra **`503`**, không phải `401`. Đó là cách phân biệt *"token
sai"* với *"không gọi được auth-api"* — và là thứ đáng nhớ khi debug, vì hai lỗi này có
cách sửa hoàn toàn khác nhau.
