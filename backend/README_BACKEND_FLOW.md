# Tài Liệu Luồng Xử Lý Backend - Dự Án Hiến Máu

Tài liệu này cung cấp cái nhìn chi tiết và toàn diện về toàn bộ luồng xử lý phía Backend (dựa trên framework NestJS). Nó mô tả danh sách tất cả các module, các API endpoints, file xử lý (Controller) và hàm tương ứng gọi đến Service, cùng với chức năng chi tiết của từng API.

## Tổng Quan Kiến Trúc
Backend được tổ chức thành các **Modules** độc lập theo tính năng (Feature Modules). Luồng đi cơ bản của một API như sau:
1. **Client** gọi Request (HTTP GET/POST/PUT/DELETE) tới một API Endpoint (vd: `/api/v1/auth/login`).
2. **Router/Controller** (file `*.controller.ts`) tiếp nhận request, kiểm tra quyền (Guards) và tham số (DTOs).
3. **Controller** gọi phương thức tương ứng trong **Service** (file `*.service.ts`) để xử lý logic nghiệp vụ.
4. **Service** có thể tương tác với cơ sở dữ liệu (thông qua Prisma), hoặc gọi các dịch vụ tiện ích khác (gửi email, upload file).
5. **Service** trả dữ liệu về Controller, sau đó Controller phản hồi (Response) lại cho Client.

---

## Danh Sách Chi Tiết Các Module và Luồng Đi API

### 1. Module Xác Thực (Auth Module - `src/auth`)
Quản lý các luồng đăng ký, đăng nhập và bảo mật tài khoản.

| API Endpoint | HTTP Method | File Controller & Hàm Xử Lý | File Service & Hàm Logic | Mô Tả Chức Năng |
| --- | --- | --- | --- | --- |
| `/api/v1/auth/register` | `POST` | `auth.controller.ts` -> `register()` | `auth.service.ts` -> `register()` | Đăng ký tài khoản mới. Service sẽ tạo mã OTP và dùng `mail.service.ts` để gửi email chứa OTP cho người dùng xác nhận. |
| `/api/v1/auth/verify-otp` | `POST` | `auth.controller.ts` -> `verifyOtp()` | `auth.service.ts` -> `verifyOtp()` | Kiểm tra mã OTP người dùng nhập vào để kích hoạt tài khoản. |
| `/api/v1/auth/resend-otp` | `POST` | `auth.controller.ts` -> `resendOtp()` | `auth.service.ts` -> `resendOtp()` | Gửi lại mã OTP vào email nếu người dùng chưa nhận được hoặc mã cũ đã hết hạn. |
| `/api/v1/auth/login` | `POST` | `auth.controller.ts` -> `login()` | `auth.service.ts` -> `login()` | Xác thực thông tin đăng nhập (email/password). Nếu đúng, Service tạo và trả về chuỗi JSON Web Token (JWT) để client dùng cho các request sau. |
| `/api/v1/auth/forgot-password` | `POST` | `auth.controller.ts` -> `forgotPassword()` | `auth.service.ts` -> `forgotPassword()` | Yêu cầu lấy lại mật khẩu. Service tạo OTP và gửi qua email cho người dùng. |
| `/api/v1/auth/reset-password` | `POST` | `auth.controller.ts` -> `resetPassword()` | `auth.service.ts` -> `resetPassword()` | Đặt lại mật khẩu mới thông qua OTP được cấp từ bước Forgot Password. |

---

### 2. Module Quản Lý Người Hiến Máu (Donor Module - `src/donor`)
Xử lý các nghiệp vụ của người hiến máu và cơ sở y tế quản lý lịch hiến.

| API Endpoint | HTTP Method | File Controller & Hàm Xử Lý | File Service & Hàm Logic | Mô Tả Chức Năng |
| --- | --- | --- | --- | --- |
| `/api/v1/donor/register` | `POST` | `donor.controller.ts` -> `registerDonor()` | `donor.service.ts` -> `registerDonorProfile()` | Bổ sung/đăng ký thông tin hồ sơ người hiến máu (nhóm máu, tiền sử bệnh...) cho user đang đăng nhập. |
| `/api/v1/donor/profile` | `GET` | `donor.controller.ts` -> `getProfile()` | `donor.service.ts` -> `getDonorProfile()` | Lấy thông tin hồ sơ người hiến máu của chính mình. |
| `/api/v1/donor/profile` | `PUT` | `donor.controller.ts` -> `updateProfile()` | `donor.service.ts` -> `updateDonorProfile()` | Cập nhật hồ sơ cá nhân người hiến máu. |
| `/api/v1/donor/availability` | `PUT` | `donor.controller.ts` -> `updateAvailability()` | `donor.service.ts` -> `updateAvailability()` | Bật/tắt trạng thái sẵn sàng hiến máu khẩn cấp của người dùng. |
| `/api/v1/donor/book-slot` | `POST` | `donor.controller.ts` -> `bookSlot()` | `donor.service.ts` -> `bookDonationSlot()` | Người dùng đặt lịch hẹn hiến máu tại một cơ sở/địa điểm cụ thể. |
| `/api/v1/donor/cancel-slot/:id` | `POST` | `donor.controller.ts` -> `cancelSlot()` | `donor.service.ts` -> `cancelDonationSlot()` | Hủy lịch đã đặt trước đó. |
| `/api/v1/donor/history` | `GET` | `donor.controller.ts` -> `getHistory()` | `donor.service.ts` -> `getDonationHistory()` | Xem lịch sử các lần hiến máu đã thành công của bản thân. |
| `/api/v1/donor/my-slots` | `GET` | `donor.controller.ts` -> `getMySlots()` | `donor.service.ts` -> `getMySlots()` | Xem danh sách các lịch hẹn hiến máu đang chờ tới ngày. |
| `/api/v1/donor/schedules` | `GET` | `donor.controller.ts` -> `getSchedules()` | `donor.service.ts` -> `getSchedules()` | Lấy danh sách thời gian trống/các lịch của cơ sở y tế (Public API). |
| **(Dành cho Facility Admin)** | | | | |
| `/api/v1/donor/slots` | `GET` | `donor.controller.ts` -> `getSlots()` | `donor.service.ts` -> `getSlots()` | Quản trị viên cơ sở y tế xem tất cả các lịch hẹn của những người hiến máu. |
| `/api/v1/donor/slots/:id/status`| `PUT` | `donor.controller.ts` -> `updateSlotStatus()` | `donor.service.ts` -> `updateSlotStatus()` | Cập nhật trạng thái của 1 lịch hẹn (Vd: Đã đến, Hủy, Chờ). |
| `/api/v1/donor/donations` | `POST`| `donor.controller.ts` -> `recordDonation()` | `donor.service.ts` -> `recordDonation()` | Ghi nhận một lượt hiến máu thành công từ lịch hẹn. |

---

### 3. Module Người Dùng (Users Module - `src/users`)
Quản lý thông tin tài khoản chung và các API cho Quản trị viên tối cao (Admin).

| API Endpoint | HTTP Method | File Controller & Hàm Xử Lý | File Service & Hàm Logic | Mô Tả Chức Năng |
| --- | --- | --- | --- | --- |
| `/api/v1/users/profile` | `GET` | `users.controller.ts` -> `getProfile()` | `users.service.ts` -> `getProfile()` | Lấy thông tin cơ bản của tài khoản người dùng đang đăng nhập. |
| `/api/v1/users/profile` | `PUT` | `users.controller.ts` -> `updateProfile()` | `users.service.ts` -> `updateProfile()` | Cập nhật thông tin cơ bản (tên, số điện thoại...). |
| `/api/v1/users/avatar` | `POST` | `users.controller.ts` -> `uploadAvatar()` | `users.service.ts` -> `uploadAvatar()` | Tải lên ảnh đại diện. File tải lên được gửi qua service để lưu lên **Cloudinary** (thông qua `cloudinary.provider.ts`). |
| `/api/v1/users/change-password-otp`| `POST` | `users.controller.ts` -> `requestChangePasswordOtp()` | `users.service.ts` -> `sendChangePasswordOtp()` | Yêu cầu mã OTP về email để thay đổi mật khẩu (khi đang đăng nhập). |
| `/api/v1/users/change-password` | `PUT` | `users.controller.ts` -> `changePassword()` | `users.service.ts` -> `changePassword()` | Đổi mật khẩu dựa trên OTP xác thực. |
| **(Dành cho Admin)** | | | | |
| `/api/v1/users` | `GET` | `users.controller.ts` -> `getAllUsers()` | `users.service.ts` -> `getAllUsers()` | Admin lấy danh sách toàn bộ người dùng trong hệ thống (kèm phân trang, lọc). |
| `/api/v1/users/:id` | `GET` | `users.controller.ts` -> `getUserById()` | `users.service.ts` -> `getUserById()` | Xem thông tin chi tiết một tài khoản bất kỳ. |
| `/api/v1/users` | `POST` | `users.controller.ts` -> `createUser()` | `users.service.ts` -> `createUserAdmin()` | Admin tự tạo một tài khoản mới (vd: tạo tài khoản cho nhân viên y tế). |
| `/api/v1/users/:id` | `PUT` | `users.controller.ts` -> `updateUser()` | `users.service.ts` -> `updateUserAdmin()` | Admin cập nhật thông tin và phân quyền cho một user. |
| `/api/v1/users/:id/lock` | `PUT` | `users.controller.ts` -> `toggleLockUser()` | `users.service.ts` -> `toggleLockUser()` | Khóa/Mở khóa một tài khoản. |

---

### 4. Module Kho Máu (Inventory Module - `src/inventory`)
Quản lý lượng máu dự trữ tại các cơ sở y tế.

| API Endpoint | HTTP Method | File Controller & Hàm Xử Lý | File Service & Hàm Logic | Mô Tả Chức Năng |
| --- | --- | --- | --- | --- |
| `/api/v1/inventory/receive` | `POST` | `inventory.controller.ts` -> `receiveBlood()` | `inventory.service.ts` -> `receiveBlood()` | Nhập đơn vị máu mới vào kho sau khi lấy máu thành công từ người hiến. |
| `/api/v1/inventory/:id/discard`| `POST` | `inventory.controller.ts` -> `discardBlood()` | `inventory.service.ts` -> `discardBlood()` | Hủy/Vứt bỏ một đơn vị máu (do hết hạn hoặc không đạt tiêu chuẩn), lưu lại lý do. |
| `/api/v1/inventory/stats` | `GET` | `inventory.controller.ts` -> `getStats()` | `inventory.service.ts` -> `getInventoryStats()` | Thống kê số lượng máu hiện có trong kho theo nhóm máu. |

---

### 5. Module Yêu Cầu Máu (Request Module - `src/request`)
Quản lý các yêu cầu cần truyền máu/nhận máu từ bệnh viện.

| API Endpoint | HTTP Method | File Controller & Hàm Xử Lý | File Service & Hàm Logic | Mô Tả Chức Năng |
| --- | --- | --- | --- | --- |
| `/api/v1/requests` | `POST` | `request.controller.ts` -> `createRequest()` | `request.service.ts` -> `createRequest()` | Tạo một yêu cầu cung cấp nhóm máu mới (số lượng, mức độ khẩn cấp). |
| `/api/v1/requests/:id/process` | `POST` | `request.controller.ts` -> `processRequest()`| `request.service.ts` -> `processRequest()` | Nhân viên y tế xác nhận xuất kho hoặc xử lý xong yêu cầu cung cấp máu này. |

---

### 6. Module Bài Viết / Tin Tức (Blog Module - `src/blog`)
Quản lý các bài viết tin tức, thông báo cộng đồng và bình luận.

| API Endpoint | HTTP Method | File Controller & Hàm Xử Lý | File Service & Hàm Logic | Mô Tả Chức Năng |
| --- | --- | --- | --- | --- |
| `/api/v1/blog/categories` | `GET` | `blog.controller.ts` -> `getCategories()` | `blog.service.ts` -> `getCategories()` | Lấy danh mục các chủ đề bài viết. |
| `/api/v1/blog/posts` | `GET` | `blog.controller.ts` -> `getAllPosts()` | `blog.service.ts` -> `getAllPosts()` | Lấy danh sách bài viết public (kèm phân trang và filter). |
| `/api/v1/blog/posts/:slug` | `GET` | `blog.controller.ts` -> `getPostBySlug()` | `blog.service.ts` -> `getPostBySlug()` | Xem chi tiết 1 bài viết dựa trên đường dẫn tĩnh (slug). |
| `/api/v1/blog/posts/:slug/related`| `GET` | `blog.controller.ts` -> `getRelatedPosts()` | `blog.service.ts` -> `getRelatedPosts()` | Lấy danh sách các bài viết liên quan. |
| `/api/v1/blog/posts/:id/comments` | `GET` | `blog.controller.ts` -> `getComments()` | `blog.service.ts` -> `getComments()` | Lấy các bình luận đã được duyệt của bài viết. |
| `/api/v1/blog/posts/:id/comments` | `POST`| `blog.controller.ts` -> `addComment()` | `blog.service.ts` -> `addComment()` | Thêm bình luận vào bài viết (Bình luận có thể phải chờ duyệt). |
| **(Dành cho Admin/Mod)** | | | | |
| `/api/v1/blog/posts` | `POST` | `blog.controller.ts` -> `createPost()` | `blog.service.ts` -> `createPost()` | Tạo bài viết/tin tức mới. |
| `/api/v1/blog/posts/:id` | `PUT` | `blog.controller.ts` -> `updatePost()` | `blog.service.ts` -> `updatePost()` | Cập nhật bài viết hiện có. |
| `/api/v1/blog/posts/:id` | `DELETE`| `blog.controller.ts` -> `deletePost()` | `blog.service.ts` -> `deletePost()` | Xóa bài viết. |
| `/api/v1/blog/comments/pending` | `GET` | `blog.controller.ts` -> `getPendingComments()`| `blog.service.ts` -> `getPendingComments()`| Lấy danh sách bình luận đang chờ duyệt. |
| `/api/v1/blog/comments/:id/approve`|`PUT` | `blog.controller.ts` -> `approveComment()` | `blog.service.ts` -> `approveComment()` | Quản trị viên duyệt hoặc từ chối hiển thị bình luận. |

---

### 7. Module Kiến Thức / Tài Liệu Giáo Dục (Education Module - `src/education`)
Quản lý các tài liệu hướng dẫn hiến máu, kiến thức y khoa, câu hỏi thường gặp.

| API Endpoint | HTTP Method | File Controller & Hàm Xử Lý | File Service & Hàm Logic | Mô Tả Chức Năng |
| --- | --- | --- | --- | --- |
| `/api/v1/education/categories` | `GET` | `education.controller.ts` -> `getCategories()` | `education.service.ts` -> `getCategories()` | Xem danh mục tài liệu. |
| `/api/v1/education/categories/:id` | `GET` | `education.controller.ts` -> `getCategoryById()` | `education.service.ts` -> `getCategoryById()` | Xem thông tin chi tiết một danh mục. |
| `/api/v1/education/documents` | `GET` | `education.controller.ts` -> `getPublicDocuments()`| `education.service.ts` -> `getDocuments()` | Lấy danh sách tài liệu kiến thức công khai. |
| `/api/v1/education/documents/:slug`| `GET` | `education.controller.ts` -> `getDocumentBySlug()`| `education.service.ts` -> `getDocumentByIdOrSlug()`| Xem nội dung chi tiết 1 bài học/tài liệu. |
| `/api/v1/education/documents/:slug/related`| `GET`| `education.controller.ts` -> `getRelatedDocuments()`| `education.service.ts` -> `getRelatedDocuments()`| Lấy các tài liệu liên quan. |
| **(Dành cho Admin/Staff)** | | | | |
| (Nhiều APIs quản trị Category) | `POST/PUT/DEL` | `education.controller.ts` -> `create/update/delete Category` | `education.service.ts` -> `create/update/delete Category`| Thêm/Sửa/Xóa danh mục kiến thức. |
| `/api/v1/education/admin/documents` | `GET` | `education.controller.ts` -> `getAllDocuments()` | `education.service.ts` -> `getDocuments()` | Lấy toàn bộ tài liệu (cả các tài liệu ẩn/chưa xuất bản). |
| (Nhiều APIs quản trị Document) | `POST/PUT/DEL` | `education.controller.ts` -> `create/update/delete Document` | `education.service.ts` -> `create/update/delete Document`| Thêm/Sửa/Xóa bài viết/tài liệu kiến thức. |

---

### 8. Module Dữ Liệu Gốc & Cấu Hình (Master Data Module - `src/master-data`)
Cung cấp các danh mục dữ liệu chuẩn cho Frontend render giao diện (Combobox, Dropdown).

| API Endpoint | HTTP Method | File Controller & Hàm Xử Lý | File Service & Hàm Logic | Mô Tả Chức Năng |
| --- | --- | --- | --- | --- |
| `/api/v1/master-data/blood-types` | `GET` | `master-data.controller.ts` -> `getBloodTypes()`| `master-data.service.ts` -> `getBloodTypes()` | Danh sách nhóm máu (A, B, O, AB...). |
| `/api/v1/master-data/provinces` | `GET` | `master-data.controller.ts` -> `getProvinces()` | `master-data.service.ts` -> `getProvinces()` | Danh sách Tỉnh/Thành phố. |
| `/api/v1/master-data/provinces/:id/districts` | `GET` | `master-data.controller.ts` -> `getDistricts()` | `master-data.service.ts` -> `getDistricts()` | Danh sách Quận/Huyện theo Tỉnh. |
| `/api/v1/master-data/districts/:id/wards`| `GET` | `master-data.controller.ts` -> `getWards()` | `master-data.service.ts` -> `getWards()` | Danh sách Phường/Xã theo Quận/Huyện. |
| `/api/v1/master-data/facilities` | `GET` | `master-data.controller.ts` -> `getFacilities()`| `master-data.service.ts` -> `getFacilities()` | Danh sách các cơ sở y tế / điểm hiến máu. |
| `/api/v1/master-data/roles` | `GET` | `master-data.controller.ts` -> `getRoles()` | `master-data.service.ts` -> `getRoles()` | Danh sách các Role trong hệ thống. |
| **(Dành cho Admin)** | | | | |
| `/api/v1/master-data/blood-types` | `POST/PUT`| `master-data.controller.ts` -> `create/updateBloodType()`| `master-data.service.ts` -> `create/updateBloodType()`| Thêm/Sửa thông tin loại máu. |
| `/api/v1/master-data/facilities` | `POST/PUT`| `master-data.controller.ts` -> `create/updateFacility()`| `master-data.service.ts` -> `create/updateFacility()`| Thêm/Sửa cơ sở y tế. |

---

### Các Module Hỗ Trợ (Không có API Controller, chỉ cung cấp Service)

1. **Mail Module (`src/mail`)**:
   - File: `mail.service.ts`
   - Chức năng: Chứa hàm cấu hình và gửi email (thường gọi qua thư viện `nodemailer`). Các module như AuthModule sẽ gọi `mail.service.ts` để gửi email chứa mã OTP hoặc thông báo đăng ký.

2. **Cloudinary Module (`src/cloudinary`)**:
   - File: `cloudinary.provider.ts`
   - Chức năng: Cung cấp kết nối tới dịch vụ lưu trữ ảnh Cloudinary. File `users.service.ts` sử dụng module này để đẩy file ảnh avatar của user lên cloud và nhận về đường link ảnh.
   
3. **Prisma Module (`src/prisma`)**:
   - Chức năng: Quản lý PrismaClient. Mọi service trong backend khi cần truy vấn vào Database (SQL) đều Inject Prisma Service để gọi đến các hàm như `prisma.user.findUnique()`, `prisma.bloodInventory.create()`...
