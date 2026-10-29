# KellyCrochet – Website đồ móc len thủ công

## Cấu trúc dự án

```text
KellyCrochet/
├── index.html
├── shop.html
├── product.html
├── custom.html
├── orders.html
├── checkout.html
├── guides.html
├── css/
│   ├── variables.css
│   ├── base.css
│   ├── components.css
│   ├── animations.css
│   └── pages/
│       ├── home.css
│       ├── shop.css
│       ├── product.css
│       ├── custom.css
│       ├── orders.css
│       ├── checkout.css
│       └── guides.css
├── js/
│   ├── data/
│   │   └── products.js
│   ├── components/
│   │   ├── header.js
│   │   ├── footer.js
│   │   ├── cart.js
│   │   ├── search.js
│   │   ├── toast.js
│   │   └── productCard.js
│   ├── utils/
│   │   └── animations.js
│   └── pages/
│       ├── home.js
│       ├── shop.js
│       ├── product.js
│       ├── custom.js
│       ├── orders.js
│       └── checkout.js
├── assets/
│   └── images/
├── layouts/
│   └── main.html                 # Mẫu khung dùng chung cho trang HTML
├── admin/
│   ├── index.html                # Tổng quan quản trị (trang mặc định)
│   ├── products.html             # Quản lý sản phẩm
│   ├── orders.html               # Quản lý đơn hàng
│   ├── requests.html             # Yêu cầu đặt món riêng và báo giá
│   ├── categories.html           # Danh mục sản phẩm
│   ├── customers.html            # Danh sách khách hàng
│   ├── reports.html              # Báo cáo
│   ├── settings.html             # Cài đặt cửa hàng
│   ├── admin.css                 # Điểm nạp stylesheet quản trị
│   ├── css/                      # Tokens, bố cục, component, typography, responsive
│   └── js/
│       ├── admin-store.js        # Dữ liệu API và tiện ích dùng chung
│       ├── admin-app.js          # Khởi tạo trang quản trị
│       ├── components/           # Khung trang, dialogs và template dùng lại
│       └── features/             # Sản phẩm, đơn hàng, yêu cầu, danh mục/khách hàng
├── api/
│   ├── health.js                 # Serverless endpoint: GET /api/health
│   ├── auth/                     # Đăng ký, đăng nhập, tài khoản hiện tại
│   ├── products/                 # CRUD sản phẩm
│   ├── categories/               # CRUD danh mục
│   ├── orders/                   # Đặt hàng và quản lý đơn
│   └── requests/                 # Yêu cầu báo giá
├── package.json
├── .env.example
├── test/
│   └── backend.test.js
└── src/
    ├── app.js                    # Bộ xử lý chung cho serverless API
    ├── config/
    │   └── database.js           # Cấu hình MongoDB
    ├── controllers/              # Nhận và xử lý yêu cầu
    │   ├── productController.js
    │   ├── orderController.js
    │   └── customRequestController.js
    ├── models/                   # Product, Category, Order, CustomRequest, User
    ├── services/                 # Quy tắc nghiệp vụ, tồn kho và báo giá
    ├── middleware/               # Xác thực và phân quyền
    ├── domain/                   # Quy tắc chuyển trạng thái
    ├── utils/                    # Lỗi API, phân trang và xử lý HTTP
    └── routes/                   # Định tuyến backend
```

## Quy ước

- Các trang HTML cửa hàng ở thư mục gốc để giữ URL hiện tại; tài nguyên dùng chung nằm trong `css/`, `js/` và `assets/`.
- `admin/` chứa riêng giao diện và tài nguyên quản trị.
- `api/` giữ ở thư mục gốc theo quy ước định tuyến serverless; mã backend dùng chung đặt trong `src/`.
- `guides.html` chứa các bài hướng dẫn đan móc; các thẻ nổi bật được giới thiệu ở cuối trang chủ.
- `layouts/main.html` là tệp mẫu; sao chép khung vào trang mới và giữ đường dẫn tương đối phù hợp với vị trí trang.
- Giao diện quản trị bắt đầu tại `admin/index.html`; mỗi mục quản trị có một trang HTML riêng.
- Admin đọc/ghi sản phẩm, danh mục, đơn hàng và yêu cầu báo giá qua API; màn hình được bảo vệ bằng JWT và chỉ tài khoản Admin được truy cập.
- `admin/login.html` đăng nhập qua `POST /api/auth/login`; token được lưu trên thiết bị để dùng cho các thao tác quản trị.
- Điều hướng giữa các trang admin tải lại phần nội dung bằng Fetch và cập nhật History API; cần mở website qua HTTP/HTTPS (ví dụ Live Server). Nếu Fetch không dùng được, trình duyệt tự tải trang theo cách thông thường.
- CSS quản trị được chia theo phần trong `admin/css/`; JavaScript tách store, components và features trong `admin/js/`. Nội dung quản trị dùng Times New Roman, riêng logo giữ Cormorant Garamond và link không gạch chân.
- Admin hỗ trợ lưu nhiều URL ảnh, màu sắc, tồn kho và CRUD danh mục; dữ liệu nghiệp vụ được đồng bộ với MongoDB.
- Trang đơn hàng có chi tiết đơn, tiến trình trạng thái và lịch sử cập nhật; trạng thái được chuyển theo từng bước.
- Backend dùng MVC kết hợp service layer: API route → controller → service → model. Mảng sản phẩm trong đơn được nhúng cùng giá/tên tại thời điểm mua; danh mục được tham chiếu bằng ObjectId.
- Giá, số lượng, email, trạng thái và quyền được xác thực ở model/API. Ngày tạo/cập nhật do Mongoose tự lưu; tồn kho được trừ khi tạo đơn và hoàn lại khi hủy đơn trước khi giao.
- Cửa hàng tải danh mục/sản phẩm, gửi đơn COD và gửi yêu cầu đặt riêng qua API. Danh sách đơn khách xem trên trang `orders.html` được lưu trên thiết bị vừa đặt hàng, chưa có tài khoản khách để tra cứu xuyên thiết bị.
- Cài đặt cửa hàng hiện lưu trong `localStorage` của trình duyệt quản trị; chưa có collection/API cấu hình cửa hàng.
- Mã trạng thái API: sản phẩm `selling` / `out_of_stock` (tự tính theo tồn kho); danh mục `visible` / `hidden`; đơn `pending_confirmation` → `preparing` → `shipping` → `completed` hoặc hủy trước khi giao; yêu cầu `waiting_quote` → `quoted` → `accepted` hoặc `rejected`.
- Ngân sách yêu cầu hiện nhận chuỗi tự do để hỗ trợ các lựa chọn như “dưới 300.000”; ảnh sản phẩm lưu dưới dạng danh sách URL/đường dẫn, chưa có dịch vụ upload ảnh.

## Cách thêm sản phẩm mới

Tạo và cập nhật sản phẩm trong `admin/products.html`. Sản phẩm dùng danh mục đang hiển thị, danh sách màu và URL/đường dẫn ảnh; API tự lưu `createdAt` và tính trạng thái theo số lượng. Mảng `PRODUCTS` trong `js/data/products.js` chỉ là dữ liệu tạm trước khi API tải xong, không phải nguồn lưu trữ.

## Cách thay đổi màu sắc / style

Mở `css/variables.css` để thay đổi CSS Custom Properties.

## Tính năng

| Tính năng | Mô tả |
|---|---|
| Giỏ hàng | Drawer slide, lưu localStorage |
| Đặt hàng | Điền địa chỉ giao hàng gồm địa chỉ chi tiết, khu phố/ấp, xã/phường và tỉnh/thành phố; phí giao hàng 30.000₫, xác nhận đơn COD |
| Tìm kiếm | Overlay tìm kiếm sản phẩm |
| Filter | Lọc theo danh mục, màu sắc, giá |
| Sort | Sắp xếp theo giá |
| Đơn hàng | Tạo đơn trên API; thông tin tra cứu của khách lưu trên thiết bị vừa đặt hàng |
| Đặt riêng | Form yêu cầu sản phẩm theo ý thích, gồm số điện thoại và email liên hệ |
| Responsive | CSS tự co giãn theo kích thước màn hình |

## Backend API và MongoDB

Backend dùng Mongoose và tái sử dụng kết nối trong cùng một instance serverless. Thiết lập `MONGODB_URI` và `JWT_SECRET` (ít nhất 32 byte ngẫu nhiên) trong **Vercel → Project Settings → Environment Variables**. Không đưa URI, mật khẩu hoặc secret thật vào mã nguồn. `.env.example` chỉ liệt kê tên biến cần thiết.

| API | Quyền | Mục đích |
|---|---|---|
| `GET /api/health` | Công khai | Kiểm tra MongoDB |
| `GET/POST /api/products` | Đọc công khai / ghi Admin | Danh sách, tạo sản phẩm |
| `GET/PATCH/DELETE /api/products/:id` | Đọc công khai / ghi Admin | Chi tiết, sửa, xóa sản phẩm |
| `GET/POST /api/categories` | Đọc danh mục hiển thị / ghi Admin | Danh sách, tạo danh mục |
| `PATCH/DELETE /api/categories/:id` | Admin | Sửa, xóa danh mục chưa được sử dụng |
| `POST /api/orders` | Công khai | Tạo đơn COD; giá và tổng tiền lấy từ database |
| `GET /api/orders`, `GET/PATCH /api/orders/:id` | Admin | Quản lý đơn và chuyển trạng thái |
| `POST /api/requests` | Công khai | Gửi yêu cầu làm sản phẩm |
| `GET /api/requests`, `GET/PATCH /api/requests/:id` | Admin | Báo giá và xử lý yêu cầu |
| `POST /api/auth/register`, `POST /api/auth/login` | Công khai | Tạo tài khoản User / đăng nhập |
| `GET /api/auth/me` | Đăng nhập | Lấy tài khoản hiện tại |

Các API ghi cần token `Authorization: Bearer <token>` của Admin, trừ đăng ký, đăng nhập, đặt hàng và gửi yêu cầu. Đăng ký công khai chỉ tạo quyền User. Tạo Admin lần đầu bằng `ADMIN_USERNAME` và `ADMIN_PASSWORD` (ít nhất 12 ký tự) trong môi trường rồi chạy `npm run seed:admin`; script có thể chạy lại để đặt lại thông tin Admin. Mật khẩu lưu bằng bcrypt, không bao giờ trả về từ API.

Sau khi cấu hình MongoDB và các biến môi trường trong `.env.local`, chạy API cùng giao diện qua `vercel dev`. Tạo tài khoản Admin bằng `npm run seed:admin`, sau đó đăng nhập tại `admin/login.html`. Mở các trang bằng HTTP/HTTPS; không dùng `file://` vì trình duyệt không thể gọi API theo cách đó.

Tạo đơn dùng transaction để trừ tồn kho và ghi đơn cùng lúc; MongoDB cần hỗ trợ transaction (MongoDB Atlas replica set). `GET /api/health` trả về `200` khi MongoDB hoạt động và `503` khi không kết nối được. Các API danh sách hỗ trợ `page` và `limit` (tối đa 100); sản phẩm hỗ trợ lọc `category` và `search`.

Các request ghi dùng JSON. Ví dụ tạo đơn: `{ "customer": { "name": "Nguyễn An", "phone": "0900000000", "address": "Địa chỉ giao hàng", "email": "an@example.com" }, "paymentMethod": "COD", "items": [{ "productId": "<ObjectId>", "color": "Trắng", "quantity": 1 }] }`. Không gửi giá từ trình duyệt; server tự lấy giá hiện tại, chốt giá vào từng dòng sản phẩm, cộng phí giao hàng 30.000₫ hiện dùng trên checkout và tính tổng đơn.

Chạy kiểm tra bằng `npm test`. Để chạy cục bộ bằng Vercel CLI, đặt biến môi trường trong `.env.local` rồi chạy `vercel dev`. Đảm bảo Network Access của MongoDB Atlas chỉ cho phép các nguồn cần thiết. Pool serverless được giữ nhỏ (`maxPoolSize: 5`, `minPoolSize: 0`, `maxIdleTimeMS: 30000`).
