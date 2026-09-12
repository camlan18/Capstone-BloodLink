# Hệ Thống Hiến Máu - AI Coding Guidelines & Synchronization Rules

Tài liệu này cung cấp toàn bộ các quy tắc (rules) cốt lõi dành cho AI hoặc Developer khi tham gia phát triển dự án **Hệ Thống Quản Lý Hiến Máu và Cấp Phát Máu Y Tế**. Mục tiêu tối thượng là đảm bảo **sự đồng bộ tuyệt đối** giữa các module (logic) và UI (giao diện) trên toàn hệ thống.

---

## 1. Kiến trúc & Cấu trúc Thư mục (Architecture & Structure)

Dự án sử dụng **Next.js (App Router)** + **React 19** + **TypeScript**. Tuân thủ nghiêm ngặt cấu trúc sau:

- **`app/`**: Chứa các routes của ứng dụng. Mỗi feature là một thư mục (VD: `app/donors` - Người hiến máu, `app/blood-requests` - Yêu cầu cấp máu). Logic trong `page.tsx` nên giữ ở mức tối giản, chủ yếu dùng để gọi các component con và hooks.
- **`components/`**:
  - `components/ui/`: Các component tái sử dụng cơ bản (nút, input, modal...) được build từ **shadcn/ui**. **KHÔNG** tự ý code lại các UI cơ bản nếu shadcn đã hỗ trợ.
  - `components/layout/`: Các component liên quan đến bố cục (Header, Sidebar, MainLayout, AuthLayout).
  - `components/[feature]/`: Các component đặc thù của từng chức năng (VD: `components/donors`, `components/blood-requests`, `components/campaigns`).
- **`lib/`**: Chứa các hàm tiện ích (`utils.ts`, `date.ts`) và cấu hình.
  - **`lib/services/`**: Mọi API call **bắt buộc** phải được định nghĩa ở đây (VD: `donorService`, `bloodRequestService`). Tuyệt đối không fetch API trực tiếp bằng `fetch` hay `axios` rải rác trong Component.
  - **`lib/stores.ts`**: Quản lý global state bằng **Zustand**.
- **`hooks/`**: Chứa các custom hooks tái sử dụng (VD: `useAuth.ts`, `useBloodInventory.ts`).
- **`types/`**: Định nghĩa toàn bộ các TypeScript interfaces, types và enums (VD: `BloodType`, `DonationStatus`).

---

## 2. Quy tắc Giao diện & Trải nghiệm Người dùng (UI/UX)

- **Framework**: Sử dụng **Tailwind CSS v4**. Không viết custom CSS trong file `.css` trừ phi thực sự cần thiết (sử dụng classes của Tailwind).
- **Màu sắc chủ đạo (Brand Colors)**: Hệ thống sử dụng sự kết hợp giữa **Đỏ Y Tế (Red)** và **Xanh Đậm (Dark Blue)** dựa trên logo hệ thống.
  - **Màu Đỏ (Primary/Action)**: Dùng cho các hành động chính, nút kêu gọi hiến máu, cảnh báo khẩn cấp, biểu tượng máu. (Mã màu Tailwind khuyên dùng: `text-red-600`, `bg-red-600` hoặc `#dc2626`).
  - **Màu Xanh Đậm (Secondary/Trust)**: Dùng cho nền header, sidebar, tiêu đề khối, các nút thao tác thứ cấp mang tính tin cậy. (Mã màu Tailwind khuyên dùng: `text-blue-800`, `bg-blue-800` hoặc `#1e40af`).
- **Icon**: Sử dụng thư viện **Lucide React** (`lucide-react`). Ưu tiên các icon phù hợp với y tế như `Droplet` (Giọt máu), `Heart` (Trái tim), `Activity` (Nhịp tim), `Ambulance` (Xe cứu thương).
- **Phản hồi người dùng (Feedback)**:
  - Hiển thị Toast Message qua **Sonner** (`import { toast } from 'sonner'`) cho mọi thao tác Thành công/Thất bại.
  - Các thao tác bất đồng bộ (tải dữ liệu, gửi form đăng ký hiến máu) luôn phải có trạng thái loading (Spinners hoặc Skeletons màu đỏ/xanh).
- **Định dạng dữ liệu**: 
  - Nhóm máu: Luôn hiển thị rõ ràng (VD: `O+`, `AB-`) và có thể dùng badge màu đỏ nhạt để làm nổi bật.
  - Ngày tháng: Định dạng chuẩn y tế (VD: `DD/MM/YYYY HH:mm`).

---

## 3. Quy tắc Code & Xử lý Logic (State & Logic)

- **Ngôn ngữ**: 100% **TypeScript**. Không dùng `any`. Định nghĩa rõ type cho Props, State, và API Responses.
- **State Management**:
  - Global State: Dùng **Zustand** (VD: Quy trình điền form đăng ký hiến máu nhiều bước, trạng thái User đăng nhập/Bác sĩ).
  - Local State / Form: Dùng `useState` hoặc `useReducer` thông thường.
  - Tách logic phức tạp: Đưa các logic rườm rà ra khỏi UI component bằng cách tạo Custom Hooks (VD: `const { donors, loading, error, fetch } = useGetDonors()`).
- **Xử lý Form**:
  - Bắt buộc sử dụng **React Hook Form**.
  - Bắt buộc dùng **Zod** để validate dữ liệu đầu vào (Đặc biệt quan trọng với thông tin y tế, số điện thoại, CCCD).
- **Xử lý Error**: Bắt `catch` ở các thao tác gọi API và show `toast.error('Thông báo lỗi phù hợp')`.
- **Naming Conventions**:
  - Component, Interface, Type: `PascalCase` (VD: `DonorList`, `BloodRequestPayload`).
  - Hàm, Biến, Custom Hook: `camelCase` (VD: `fetchBloodRequests`, `urgentRequests`, `useAuth`).
  - Tên file: `kebab-case.ts` cho utilities/hooks (VD: `use-mobile.ts`), nhưng component file thường dùng `PascalCase.tsx` hoặc `kebab-case.tsx` tuân theo chuẩn hiện tại của folder.

---

## 4. Checklist Đồng bộ (Dành cho AI khi sinh code mới)

Khi AI được yêu cầu tạo một module mới (VD: Quản lý Người Hiến Máu - `Donor`), cần đi qua checklist sau:

1. **Type Definition**: Đã tạo file `types/donor.ts` định nghĩa `Donor`, `DonorPayload`, enum `BloodGroup` chưa?
2. **Service Layer**: Đã tạo `lib/services/donor.ts` (chứa các hàm CRUD API) chưa?
3. **UI Components**: 
   - Đã tạo `components/donors/DonorList.tsx`, `DonorForm.tsx` chưa?
   - Form có dùng `react-hook-form` + `zod` để validate chỉ số y tế/thông tin cá nhân không?
   - Các nút bấm, input có dùng component chuẩn từ `components/ui/` (shadcn) không?
4. **Page Component**: 
   - File `app/donors/page.tsx` đã được tạo đúng chuẩn chưa? Đã bọc `MainLayout` chưa?
   - Page có check quyền (Auth) của Nhân viên y tế/Admin và trạng thái Loading không?
5. **Styling Consistency**: 
   - Có tuân thủ tone màu **Đỏ (Primary)** và **Xanh đậm (Secondary)** không? 
   - Nút Hành động chính (VD: Thêm người hiến) có dùng màu `bg-red-600` không? 
   - Đã dùng icon của `lucide-react` (VD: `Droplet`) chưa?

---

## 5. Ví dụ Mẫu (Pattern Example)

**Gọi dữ liệu ở Page (Danh sách Yêu cầu máu):**
```tsx
'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { bloodRequestService } from '@/lib/services/bloodRequest';
import { Plus, Activity, Droplet } from 'lucide-react';

export default function BloodRequestsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bloodRequestService.getUrgentRequests()
      .then(res => setData(res.data))
      .catch(() => toast.error('Lỗi tải dữ liệu yêu cầu máu'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <MainLayout>
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-3">
            <Activity className="text-red-600" size={28} /> 
            Danh sách Yêu cầu Cấp máu
          </h1>
          <button className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors">
            <Droplet size={18} /> 
            Tạo yêu cầu mới
          </button>
        </div>
        
        {/* Content Table/Cards */}
        {loading ? (
          <div className="text-blue-800 animate-pulse">Đang tải dữ liệu y tế...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {/* Render data here */}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
```

Việc tuân thủ tài liệu này là BẮT BUỘC để giữ cho mã nguồn Hệ thống Hiến máu sạch, dễ bảo trì và mang lại trải nghiệm UI/UX chuyên nghiệp, tin cậy tuyệt đối trong môi trường y tế.
