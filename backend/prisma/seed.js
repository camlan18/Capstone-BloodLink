"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Bắt đầu dọn dẹp dữ liệu cũ (Xóa từ bảng con đến bảng cha)...');
    await prisma.blog_comments.deleteMany();
    await prisma.blog_posts.deleteMany();
    await prisma.blog_categories.deleteMany();
    await prisma.inventory_transactions.deleteMany();
    await prisma.blood_request_inventory_allocations.deleteMany();
    await prisma.blood_inventory.deleteMany();
    await prisma.donations.deleteMany();
    await prisma.donation_reminders.deleteMany();
    await prisma.blood_request_donor_matches.deleteMany();
    await prisma.blood_request_status_history.deleteMany();
    await prisma.blood_requests.deleteMany();
    await prisma.donor_availability_slots.deleteMany();
    await prisma.facility_donation_schedules.deleteMany();
    await prisma.education_documents.deleteMany();
    await prisma.education_document_categories.deleteMany();
    await prisma.notifications.deleteMany();
    await prisma.user_otps.deleteMany();
    await prisma.donor_profiles.deleteMany();
    await prisma.blood_request_statuses.deleteMany();
    await prisma.urgency_levels.deleteMany();
    await prisma.users.deleteMany();
    await prisma.medical_facilities.deleteMany();
    await prisma.wards.deleteMany();
    await prisma.districts.deleteMany();
    await prisma.provinces.deleteMany();
    await prisma.blood_compatibility.deleteMany();
    await prisma.donation_interval_rules.deleteMany();
    await prisma.blood_components.deleteMany();
    await prisma.blood_types.deleteMany();
    await prisma.roles.deleteMany();
    console.log('Đã dọn dẹp xong. Bắt đầu seed Master Data...');
    const rolesData = [
        { role_code: 'ADMIN', role_name: 'Quản trị viên hệ thống' },
        { role_code: 'STAFF', role_name: 'Nhân viên hệ thống' },
        { role_code: 'MODERATOR', role_name: 'Người kiểm duyệt nội dung' },
        { role_code: 'HOSPITAL_STAFF', role_name: 'Nhân viên bệnh viện' },
        { role_code: 'USER', role_name: 'Người hiến máu (Donor)' }
    ];
    for (const r of rolesData) {
        await prisma.roles.create({ data: r });
    }
    const adminRole = await prisma.roles.findFirst({ where: { role_code: 'ADMIN' } });
    const staffRole = await prisma.roles.findFirst({ where: { role_code: 'STAFF' } });
    const hospitalRole = await prisma.roles.findFirst({ where: { role_code: 'HOSPITAL_STAFF' } });
    const userRole = await prisma.roles.findFirst({ where: { role_code: 'USER' } });
    const modRole = await prisma.roles.findFirst({ where: { role_code: 'MODERATOR' } });
    const bloodTypes = [
        { blood_type_code: 'A+', abo: 'A', rh_factor: '+', display_order: 1 },
        { blood_type_code: 'A-', abo: 'A', rh_factor: '-', display_order: 2 },
        { blood_type_code: 'B+', abo: 'B', rh_factor: '+', display_order: 3 },
        { blood_type_code: 'B-', abo: 'B', rh_factor: '-', display_order: 4 },
        { blood_type_code: 'AB+', abo: 'AB', rh_factor: '+', display_order: 5 },
        { blood_type_code: 'AB-', abo: 'AB', rh_factor: '-', display_order: 6 },
        { blood_type_code: 'O+', abo: 'O', rh_factor: '+', display_order: 7 },
        { blood_type_code: 'O-', abo: 'O', rh_factor: '-', display_order: 8 },
    ];
    for (const bt of bloodTypes) {
        await prisma.blood_types.create({ data: bt });
    }
    const components = [
        { component_code: 'WHOLE_BLOOD', component_name: 'Máu toàn phần', description: 'Máu toàn phần chưa tách' },
        { component_code: 'RED_CELLS', component_name: 'Hồng cầu khối', description: 'Hồng cầu đã tách' },
        { component_code: 'PLASMA', component_name: 'Huyết tương', description: 'Huyết tương tươi đông lạnh' },
        { component_code: 'PLATELETS', component_name: 'Tiểu cầu', description: 'Khối tiểu cầu' }
    ];
    for (const cp of components) {
        await prisma.blood_components.create({ data: cp });
    }
    const requestStatuses = [
        { status_code: 'PENDING', status_name: 'Chờ xử lý', sort_order: 1 },
        { status_code: 'APPROVED', status_name: 'Đã duyệt', sort_order: 2 },
        { status_code: 'ALLOCATED', status_name: 'Đã phân bổ', sort_order: 3 },
        { status_code: 'COMPLETED', status_name: 'Đã hoàn thành', sort_order: 4, is_terminal: true },
        { status_code: 'REJECTED', status_name: 'Từ chối', sort_order: 5, is_terminal: true }
    ];
    for (const rs of requestStatuses) {
        await prisma.blood_request_statuses.create({ data: rs });
    }
    const urgencies = [
        { urgency_code: 'NORMAL', urgency_name: 'Bình thường', priority_level: 1 },
        { urgency_code: 'HIGH', urgency_name: 'Khẩn cấp', priority_level: 2 },
        { urgency_code: 'CRITICAL', urgency_name: 'Tối khẩn', priority_level: 3 }
    ];
    for (const ug of urgencies) {
        await prisma.urgency_levels.create({ data: ug });
    }
    const facilities = [
        { facility_code: 'BCTM_HCM', facility_name: 'Bệnh viện Truyền máu Huyết học TP.HCM', address: '118 Hồng Bàng, Q.5, TP.HCM', is_primary: true },
        { facility_code: 'BV_CHORAY', facility_name: 'Bệnh viện Chợ Rẫy', address: '201B Nguyễn Chí Thanh, Q.5, TP.HCM', is_primary: false },
        { facility_code: 'BV_TUDU', facility_name: 'Bệnh viện Từ Dũ', address: '284 Cống Quỳnh, Q.1, TP.HCM', is_primary: false }
    ];
    for (const fc of facilities) {
        await prisma.medical_facilities.create({ data: fc });
    }
    const categories = [
        { category_name: 'Kiến thức hiến máu', slug: 'kien-thuc-hien-mau' },
        { category_name: 'Tin tức & Sự kiện', slug: 'tin-tuc-su-kien' },
        { category_name: 'Câu chuyện cảm động', slug: 'cau-chuyen-cam-dong' }
    ];
    for (const ct of categories) {
        await prisma.blog_categories.create({ data: ct });
    }
    console.log('Bắt đầu seed Người dùng (Users)...');
    const passwordHash = await bcrypt.hash('123456', 10);
    const users = [
        { email: 'admin@hienmau.vn', full_name: 'Quản Trị Viên', role_id: adminRole.role_id, password_hash: passwordHash, is_active: true, is_email_verified: true },
        { email: 'staff@hienmau.vn', full_name: 'Nhân viên A', role_id: staffRole.role_id, password_hash: passwordHash, is_active: true, is_email_verified: true },
        { email: 'hospital@choray.vn', full_name: 'Bác sĩ BV Chợ Rẫy', role_id: hospitalRole.role_id, password_hash: passwordHash, is_active: true, is_email_verified: true },
        { email: 'mod@hienmau.vn', full_name: 'Kiểm duyệt viên B', role_id: modRole.role_id, password_hash: passwordHash, is_active: true, is_email_verified: true },
        { email: 'nguyenvana@gmail.com', full_name: 'Nguyễn Văn A (Donor)', role_id: userRole.role_id, password_hash: passwordHash, is_active: true, is_email_verified: true, phone: '0901234567' },
        { email: 'tranvib@gmail.com', full_name: 'Trần Thị B (Donor)', role_id: userRole.role_id, password_hash: passwordHash, is_active: true, is_email_verified: true, phone: '0987654321' }
    ];
    for (const u of users) {
        await prisma.users.create({ data: u });
    }
    console.log('Bắt đầu seed Inventory, Donations, Requests...');
    const facility1 = await prisma.medical_facilities.findFirst({ where: { facility_code: 'BCTM_HCM' } });
    const facility2 = await prisma.medical_facilities.findFirst({ where: { facility_code: 'BV_CHORAY' } });
    const btO = await prisma.blood_types.findFirst({ where: { blood_type_code: 'O+' } });
    const btA = await prisma.blood_types.findFirst({ where: { blood_type_code: 'A+' } });
    const compWB = await prisma.blood_components.findFirst({ where: { component_code: 'WHOLE_BLOOD' } });
    await prisma.blood_inventory.create({
        data: {
            facility_id: facility1.facility_id,
            blood_type_id: btO.blood_type_id,
            component_id: compWB.component_id,
            bag_code: 'BAG-O-001',
            volume_ml: 350,
            collection_date: new Date(),
            expiry_date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
            status_code: 'AVAILABLE'
        }
    });
    await prisma.blood_inventory.create({
        data: {
            facility_id: facility1.facility_id,
            blood_type_id: btA.blood_type_id,
            component_id: compWB.component_id,
            bag_code: 'BAG-A-002',
            volume_ml: 250,
            collection_date: new Date(),
            expiry_date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
            status_code: 'AVAILABLE'
        }
    });
    const catKnowledge = await prisma.blog_categories.findFirst({ where: { slug: 'kien-thuc-hien-mau' } });
    const adminUser = await prisma.users.findFirst({ where: { email: 'admin@hienmau.vn' } });
    await prisma.blog_posts.create({
        data: {
            blog_category_id: catKnowledge.blog_category_id,
            author_user_id: adminUser.user_id,
            title: 'Lợi ích của việc hiến máu định kỳ',
            slug: 'loi-ich-cua-viec-hien-mau-dinh-ky',
            summary: 'Hiến máu không chỉ cứu người mà còn mang lại nhiều lợi ích sức khỏe.',
            content_html: '<p>Hiến máu định kỳ giúp tái tạo máu mới, giảm nguy cơ mắc bệnh tim mạch.</p>',
            is_published: true,
            published_at: new Date()
        }
    });
    console.log('Seeder chạy thành công! Dữ liệu mẫu đã được nạp.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map