# 🩸 Hướng Dẫn Cài Đặt & Chạy Dự Án BloodLink

## 📋 Yêu cầu hệ thống

| Phần mềm | Phiên bản tối thiểu |
|---|---|
| **Node.js** | v20.x trở lên (khuyến nghị v22) |
| **npm** | v10.x trở lên |
| **SQL Server** | 2019 trở lên (hoặc SQL Server Express) |
| **Git** | v2.x |

---

## 🚀 Hướng dẫn từng bước

### Bước 1: Clone dự án

```bash
git clone <repository-url>
cd donate-blood
```

### Bước 2: Tạo Database

Mở **SQL Server Management Studio (SSMS)** và chạy:

```sql
CREATE DATABASE BloodDonationDB;
GO
```

### Bước 3: Cấu hình Backend

```bash
cd backend
npm install
```

Copy file `.env.example` thành `.env` và cập nhật thông tin database:

```bash
cp .env.example .env
```

Mở file `.env` và sửa theo thông tin SQL Server của bạn:

```env
DATABASE_URL="sqlserver://localhost:1433;database=BloodDonationDB;user=sa;password=YOUR_PASSWORD;trustServerCertificate=true"
```

### Bước 4: Tạo bảng trong Database (Migration)

```bash
npx prisma db push
```

Lệnh này sẽ:
- Đọc file `prisma/schema.prisma`
- Tạo tất cả các bảng trong database
- Generate Prisma Client

> **Lưu ý**: Nếu muốn reset database và tạo lại từ đầu, chạy:
> ```bash
> npx prisma db push --force-reset
> ```

### Bước 5: Nạp dữ liệu mẫu (Seed)

```bash
npm run seed
```

Lệnh này sẽ tạo:
- **Roles**: ADMIN, STAFF, HOSPITAL_STAFF, MODERATOR, USER
- **Nhóm máu**: A+, A-, B+, B-, AB+, AB-, O+, O- (8 nhóm)
- **Thành phần máu**: Máu toàn phần, Hồng cầu, Huyết tương, Tiểu cầu
- **6 cơ sở y tế** tại TP.HCM (có tọa độ GPS cho bản đồ)
- **6 tài khoản mẫu** (xem bên dưới)
- **8 yêu cầu máu mẫu** (CRITICAL, HIGH, NORMAL)
- **Blog mẫu** và danh mục

### Bước 6: Chạy Backend (NestJS)

```bash
npm run start:dev
```

Backend sẽ chạy tại: **http://localhost:3000**

> 📄 **Swagger API Docs**: http://localhost:3000/api/docs

### Bước 7: Cấu hình & Chạy Frontend

```bash
cd ../frontend
npm install
```

Kiểm tra file `.env.local` (hoặc tạo mới):

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

Chạy frontend:

```bash
npm run dev
```

Frontend sẽ chạy tại: **http://localhost:3001**

---

## 👤 Tài khoản mẫu

Tất cả tài khoản có **mật khẩu**: `123456`

| Email | Vai trò | Mô tả |
|-------|---------|-------|
| `admin@hienmau.vn` | Quản trị viên | Quản lý toàn bộ hệ thống |
| `staff@hienmau.vn` | Nhân viên | Quản lý đăng ký, ghi nhận hiến máu |
| `hospital@choray.vn` | Nhân viên BV | Nhân viên Bệnh viện Chợ Rẫy |
| `mod@hienmau.vn` | Kiểm duyệt viên | Duyệt bài viết blog |
| `nguyenvana@gmail.com` | Người hiến | Donor mẫu |
| `tranvib@gmail.com` | Người hiến | Donor mẫu |

---

## 📁 Cấu trúc thư mục

```
donate-blood/
├── backend/                  # NestJS API Server
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema (models)
│   │   ├── seed.ts           # Dữ liệu mẫu
│   │   └── seed-locations.ts # Dữ liệu tỉnh/huyện/xã
│   ├── src/
│   │   ├── auth/             # Authentication (JWT + OTP)
│   │   ├── donor/            # Quản lý hiến máu
│   │   ├── admin/            # Admin module
│   │   ├── blood-request/    # Yêu cầu máu
│   │   ├── notifications/    # Thông báo
│   │   ├── blog/             # Bài viết
│   │   └── common/           # Guards, DTOs, Utils
│   └── .env                  # Biến môi trường
│
├── frontend/                 # Next.js Frontend
│   ├── src/
│   │   ├── app/              # Pages (App Router)
│   │   ├── components/       # UI Components
│   │   ├── lib/services/     # API Services
│   │   └── types/            # TypeScript types
│   └── .env.local            # Frontend env
│
└── SETUP_GUIDE.md            # File này
```

---

## 🔧 Lệnh thường dùng

### Backend

```bash
cd backend

npm run start:dev       # Chạy dev server (hot reload)
npm run build           # Build production
npm run seed            # Nạp dữ liệu mẫu
npx prisma db push      # Đồng bộ schema → database
npx prisma studio       # Mở Prisma Studio (GUI quản lý DB)
npx prisma generate     # Regenerate Prisma Client
```

### Frontend

```bash
cd frontend

npm run dev             # Chạy dev server
npm run build           # Build production
npm run lint            # Kiểm tra lỗi code
```

---

## ❓ Troubleshooting

### Lỗi kết nối Database
- Kiểm tra SQL Server đang chạy
- Kiểm tra thông tin `DATABASE_URL` trong `.env`
- Đảm bảo port 1433 không bị firewall chặn
- Nếu dùng SQL Server Authentication, đảm bảo đã bật Mixed Mode

### Lỗi Prisma
```bash
npx prisma generate     # Regenerate client
npx prisma db push      # Đẩy lại schema
```

### Lỗi CORS
- Backend mặc định cho phép frontend từ `http://localhost:3001`
- Nếu frontend chạy ở port khác, sửa `FRONTEND_URL` trong backend `.env`
