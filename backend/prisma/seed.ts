import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedLocations } from './seed-locations';

const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu dọn dẹp dữ liệu cũ (Xóa từ bảng con đến bảng cha)...');
  
  await prisma.blog_comments.deleteMany();
  await prisma.blog_posts.deleteMany();
  await prisma.blog_categories.deleteMany();
  
  await prisma.inventory_transactions.deleteMany();
  await prisma.blood_request_inventory_allocations.deleteMany();
  await prisma.blood_inventory.deleteMany();
  
  await prisma.donation_certificates.deleteMany();
  await prisma.donation_reminders.deleteMany();
  await prisma.donations.deleteMany();
  await prisma.blood_request_donor_matches.deleteMany();
  await prisma.blood_request_status_history.deleteMany();
  await prisma.blood_requests.deleteMany();
  await prisma.donor_availability_slots.deleteMany();
  await prisma.facility_donation_schedules.deleteMany();
  await prisma.education_documents.deleteMany();
  await prisma.education_document_categories.deleteMany();
  await prisma.notifications.deleteMany();
  await prisma.user_otps.deleteMany();
  await prisma.otp_types.deleteMany();
  await prisma.donor_profiles.deleteMany();
  await prisma.system_settings.deleteMany();
  
  await prisma.blood_request_statuses.deleteMany();
  await prisma.urgency_levels.deleteMany();
  
  await prisma.user_sessions.deleteMany();
  await prisma.users.deleteMany();
  
  await prisma.medical_facilities.deleteMany();
  await prisma.wards.deleteMany();
  await prisma.provinces.deleteMany();
  
  await prisma.blood_compatibility.deleteMany();
  await prisma.donation_interval_rules.deleteMany();
  await prisma.blood_components.deleteMany();
  await prisma.blood_types.deleteMany();
  await prisma.roles.deleteMany();

  console.log('Đã dọn dẹp xong. Bắt đầu seed Master Data...');

  await seedLocations(prisma);

  // 1. Tìm các tỉnh thành trọng điểm
  const provHCM = await prisma.provinces.findFirst({ where: { province_name: { contains: 'Hồ Chí Minh' } } });
  const provCanTho = await prisma.provinces.findFirst({ where: { province_name: { contains: 'Cần Thơ' } } });
  const provDaNang = await prisma.provinces.findFirst({ where: { province_name: { contains: 'Đà Nẵng' } } });
  const provHaNoi = await prisma.provinces.findFirst({ where: { province_name: { contains: 'Hà Nội' } } });

  // 2. Roles
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

  // 3. Blood Types
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

  const allBt = await prisma.blood_types.findMany();
  const btMap = new Map<string, number>();
  allBt.forEach(b => btMap.set(b.blood_type_code, b.blood_type_id));

  // 4. Blood Components
  const components = [
    { component_code: 'WHOLE_BLOOD', component_name: 'Máu toàn phần', description: 'Máu toàn phần chưa tách' },
    { component_code: 'RED_CELLS', component_name: 'Hồng cầu khối', description: 'Hồng cầu đã tách' },
    { component_code: 'PLASMA', component_name: 'Huyết tương', description: 'Huyết tương tươi đông lạnh' },
    { component_code: 'PLATELETS', component_name: 'Tiểu cầu', description: 'Khối tiểu cầu' }
  ];
  for (const cp of components) {
    await prisma.blood_components.create({ data: cp });
  }

  const allComp = await prisma.blood_components.findMany();
  const compMap = new Map<string, number>();
  allComp.forEach(c => compMap.set(c.component_code, c.component_id));

  // 5. Blood Compatibility Matrix
  const compatibilityRules: Record<string, string[]> = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+'],
  };

  const wholeBloodId = compMap.get('WHOLE_BLOOD')!;
  const redCellsId = compMap.get('RED_CELLS')!;

  for (const compId of [wholeBloodId, redCellsId]) {
    for (const [donorCode, recipientCodes] of Object.entries(compatibilityRules)) {
      const donorId = btMap.get(donorCode)!;
      for (const recCode of recipientCodes) {
        const recipientId = btMap.get(recCode)!;
        await prisma.blood_compatibility.create({
          data: {
            component_id: compId,
            donor_blood_type_id: donorId,
            recipient_blood_type_id: recipientId,
            is_compatible: true,
            notes: `${donorCode} tương thích truyền cho ${recCode}`,
          }
        });
      }
    }
  }

  // 6. Donation Interval Rules
  const intervalRules = [
    { component_id: compMap.get('WHOLE_BLOOD')!, min_interval_days: 84, max_donations_per_year: 4, description: 'Hiến máu toàn phần cách nhau tối thiểu 12 tuần (84 ngày)' },
    { component_id: compMap.get('RED_CELLS')!, min_interval_days: 84, max_donations_per_year: 4, description: 'Hiến hồng cầu khối cách nhau tối thiểu 12 tuần (84 ngày)' },
    { component_id: compMap.get('PLASMA')!, min_interval_days: 14, max_donations_per_year: 24, description: 'Hiến huyết tương cách nhau tối thiểu 2 tuần (14 ngày)' },
    { component_id: compMap.get('PLATELETS')!, min_interval_days: 14, max_donations_per_year: 24, description: 'Hiến gạn tiểu cầu cách nhau tối thiểu 2 tuần (14 ngày)' },
  ];
  for (const rule of intervalRules) {
    await prisma.donation_interval_rules.create({ data: rule });
  }

  // 7. Request Statuses & Urgencies
  const requestStatuses = [
    { status_code: 'PENDING', status_name: 'Chờ xử lý', sort_order: 1 },
    { status_code: 'APPROVED', status_name: 'Đã duyệt', sort_order: 2 },
    { status_code: 'ALLOCATED', status_name: 'Đã phân bổ', sort_order: 3 },
    { status_code: 'COMPLETED', status_name: 'Đã hoàn thành', sort_order: 4, is_terminal: true },
    { status_code: 'REJECTED', status_name: 'Từ chối', sort_order: 5, is_terminal: true },
    { status_code: 'CLOSED', status_name: 'Đã đóng', sort_order: 6, is_terminal: true }
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

  // 8. Medical Facilities (20 cơ sở y tế thực tế tại Cần Thơ, TP.HCM, Đà Nẵng, Hà Nội)
  console.log('Bắt đầu seed 20 Cơ sở Y tế (TP.HCM, Cần Thơ, Đà Nẵng, Hà Nội)...');
  const facilitiesData = [
    // --- TP. CẦN THƠ ---
    { facility_code: 'BCTM_CANTHO', facility_name: 'Bệnh viện Huyết học - Truyền máu Cần Thơ', short_name: 'BV Huyết học Cần Thơ', address: '317 Nguyễn Văn Linh, Phường An Khánh, Quận Ninh Kiều, TP. Cần Thơ', phone: '0292 3899 532', is_primary: true, latitude: 10.0272, longitude: 105.7585, province_id: provCanTho?.province_id, director_name: 'BS. CKII. Huỳnh Quốc Dũng', director_title: 'KT. GIÁM ĐỐC - PHÓ GIÁM ĐỐC' },
    { facility_code: 'BV_DKTW_CANTHO', facility_name: 'Bệnh viện Đa khoa Trung ương Cần Thơ', short_name: 'BV ĐK TW Cần Thơ', address: '315 Nguyễn Văn Linh, Phường An Khánh, Quận Ninh Kiều, TP. Cần Thơ', phone: '0292 3820 071', is_primary: false, latitude: 10.0278, longitude: 105.7580, province_id: provCanTho?.province_id, director_name: 'BS. CKII. Nguyễn Minh Vũ', director_title: 'GIÁM ĐỐC BỆNH VIỆN' },
    { facility_code: 'BV_DKTP_CANTHO', facility_name: 'Bệnh viện Đa khoa Thành phố Cần Thơ', short_name: 'BV ĐK Cần Thơ', address: '04 Châu Văn Liêm, Phường An Lạc, Quận Ninh Kiều, TP. Cần Thơ', phone: '0292 3821 236', is_primary: false, latitude: 10.0336, longitude: 105.7865, province_id: provCanTho?.province_id, director_name: 'BS. CKII. Trần Quốc Luận', director_title: 'GIÁM ĐỐC BỆNH VIỆN' },
    { facility_code: 'BV_NHIDONG_CANTHO', facility_name: 'Bệnh viện Nhi Đồng Cần Thơ', short_name: 'Nhi Đồng Cần Thơ', address: '345 Nguyễn Văn Cừ, Phường An Bình, Quận Ninh Kiều, TP. Cần Thơ', phone: '0292 3748 350', is_primary: false, latitude: 10.0163, longitude: 105.7522, province_id: provCanTho?.province_id, director_name: 'BS. CKII. Trần Văn Dễ', director_title: 'GIÁM ĐỐC BỆNH VIỆN' },
    { facility_code: 'BV_PHUSAN_CANTHO', facility_name: 'Bệnh viện Phụ sản TP. Cần Thơ', short_name: 'Phụ sản Cần Thơ', address: '106 Cách Mạng Tháng 8, Phường Cái Khế, Quận Ninh Kiều, TP. Cần Thơ', phone: '0292 3762 336', is_primary: false, latitude: 10.0468, longitude: 105.7788, province_id: provCanTho?.province_id, director_name: 'BS. CKII. Nguyễn Thụy Thúy Ái', director_title: 'PHÓ GIÁM ĐỐC' },
    { facility_code: 'BV_DHYD_CANTHO', facility_name: 'Bệnh viện Trường Đại học Y Dược Cần Thơ', short_name: 'BV ĐH Y Dược Cần Thơ', address: '179 Nguyễn Văn Cừ, Phường An Khánh, Quận Ninh Kiều, TP. Cần Thơ', phone: '0292 3899 444', is_primary: false, latitude: 10.0352, longitude: 105.7601, province_id: provCanTho?.province_id, director_name: 'PGS. TS. BS. Lại Văn Nông', director_title: 'GIÁM ĐỐC BỆNH VIỆN' },

    // --- TP. HỒ CHÍ MINH ---
    { facility_code: 'BCTM_HCM', facility_name: 'Bệnh viện Truyền máu Huyết học TP.HCM', short_name: 'BV Huyết học TP.HCM', address: '118 Hồng Bàng, Phường 12, Quận 5, TP.HCM', phone: '028 3957 1342', is_primary: true, latitude: 10.7548, longitude: 106.6612, province_id: provHCM?.province_id, director_name: 'BS. CKII. Phù Chí Dũng', director_title: 'GIÁM ĐỐC BỆNH VIỆN' },
    { facility_code: 'BV_CHORAY', facility_name: 'Bệnh viện Chợ Rẫy', short_name: 'Chợ Rẫy', address: '201B Nguyễn Chí Thanh, Phường 12, Quận 5, TP.HCM', phone: '028 3855 4137', is_primary: false, latitude: 10.7558, longitude: 106.6563, province_id: provHCM?.province_id, director_name: 'TS. BS. CKII. Nguyễn Tri Thức', director_title: 'GIÁM ĐỐC BỆNH VIỆN' },
    { facility_code: 'BV_TUDU', facility_name: 'Bệnh viện Từ Dũ', short_name: 'Từ Dũ', address: '284 Cống Quỳnh, Phường Phạm Ngũ Lão, Quận 1, TP.HCM', phone: '028 3839 5117', is_primary: false, latitude: 10.7676, longitude: 106.6909, province_id: provHCM?.province_id, director_name: 'BS. CKII. Trần Ngọc Hải', director_title: 'KT. GIÁM ĐỐC - PHÓ GIÁM ĐỐC' },
    { facility_code: 'BV_115', facility_name: 'Bệnh viện Nhân dân 115', short_name: 'BV 115', address: '527 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM', phone: '028 3865 4249', is_primary: false, latitude: 10.7734, longitude: 106.6681, province_id: provHCM?.province_id, director_name: 'TS. BS. Phan Văn Báu', director_title: 'GIÁM ĐỐC BỆNH VIỆN' },
    { facility_code: 'BV_BINHDAN', facility_name: 'Bệnh viện Bình Dân', short_name: 'Bình Dân', address: '371 Điện Biên Phủ, Phường 4, Quận 3, TP.HCM', phone: '028 3839 4747', is_primary: false, latitude: 10.7712, longitude: 106.6801, province_id: provHCM?.province_id, director_name: 'PGS. TS. BS. Trần Vĩnh Hưng', director_title: 'GIÁM ĐỐC BỆNH VIỆN' },
    { facility_code: 'BV_NHIDONG1', facility_name: 'Bệnh viện Nhi Đồng 1', short_name: 'Nhi Đồng 1', address: '341 Sư Vạn Hạnh, Phường 10, Quận 10, TP.HCM', phone: '028 3927 1119', is_primary: false, latitude: 10.7698, longitude: 106.6675, province_id: provHCM?.province_id, director_name: 'PGS. TS. BS. Nguyễn Thanh Hùng', director_title: 'GIÁM ĐỐC BỆNH VIỆN' },
    { facility_code: 'BV_GIADINH', facility_name: 'Bệnh viện Nhân dân Gia Định', short_name: 'Gia Định', address: '01 Nơ Trang Long, Phường 7, Quận Bình Thạnh, TP.HCM', phone: '028 3841 2692', is_primary: false, latitude: 10.8038, longitude: 106.6934, province_id: provHCM?.province_id, director_name: 'TS. BS. Nguyễn Anh Dũng', director_title: 'GIÁM ĐỐC BỆNH VIỆN' },
    { facility_code: 'BV_UNGBUOU', facility_name: 'Bệnh viện Ung Bướu TP.HCM', short_name: 'Ung Bướu', address: '47 Hoa Thám, Phường 7, Quận Bình Thạnh, TP.HCM', phone: '028 3843 3021', is_primary: false, latitude: 10.8062, longitude: 106.6948, province_id: provHCM?.province_id, director_name: 'TS. BS. Phạm Xuân Dũng', director_title: 'GIÁM ĐỐC BỆNH VIỆN' },
    { facility_code: 'BV_DHYD', facility_name: 'Bệnh viện Đại học Y Dược TP.HCM', short_name: 'ĐH Y Dược', address: '215 Hồng Bàng, Phường 11, Quận 5, TP.HCM', phone: '028 3855 4269', is_primary: false, latitude: 10.7552, longitude: 106.6601, province_id: provHCM?.province_id, director_name: 'PGS. TS. BS. Nguyễn Hoàng Bắc', director_title: 'GIÁM ĐỐC BỆNH VIỆN' },
    { facility_code: 'BV_THUDUC', facility_name: 'Bệnh viện Thành phố Thủ Đức', short_name: 'BV Thủ Đức', address: '29 Phú Châu, Phường Tam Phú, TP. Thủ Đức, TP.HCM', phone: '028 3729 6070', is_primary: false, latitude: 10.8536, longitude: 106.7535, province_id: provHCM?.province_id, director_name: 'BS. CKII. Vũ Trí Thanh', director_title: 'GIÁM ĐỐC BỆNH VIỆN' },

    // --- ĐÀ NẴNG ---
    { facility_code: 'BV_DANANG', facility_name: 'Bệnh viện Đà Nẵng', short_name: 'BV Đà Nẵng', address: '124 Hải Phòng, Phường Thạch Thang, Quận Hải Châu, TP. Đà Nẵng', phone: '0236 3821 118', is_primary: true, latitude: 16.0733, longitude: 108.2145, province_id: provDaNang?.province_id, director_name: 'TS. BS. Lê Đức Nhân', director_title: 'GIÁM ĐỐC BỆNH VIỆN' },
    { facility_code: 'BV_PSNHI_DANANG', facility_name: 'Bệnh viện Phụ sản - Nhi Đà Nẵng', short_name: 'Phụ sản - Nhi ĐN', address: '402 Lê Văn Hiến, Phường Khuê Mỹ, Quận Ngũ Hành Sơn, TP. Đà Nẵng', phone: '0236 3957 777', is_primary: false, latitude: 16.0350, longitude: 108.2435, province_id: provDaNang?.province_id, director_name: 'TS. BS. Trần Đình Vinh', director_title: 'GIÁM ĐỐC BỆNH VIỆN' },

    // --- HÀ NỘI ---
    { facility_code: 'VIEN_HUYETHOC_TW', facility_name: 'Viện Huyết học - Truyền máu Trung ương', short_name: 'Viện Huyết học TW', address: 'Phố Phạm Văn Bạch, Phường Yên Hòa, Quận Cầu Giấy, Hà Nội', phone: '024 3782 1898', is_primary: true, latitude: 21.0185, longitude: 105.7876, province_id: provHaNoi?.province_id, director_name: 'PGS. TS. BS. Nguyễn Hà Thanh', director_title: 'VIỆN TRƯỞNG' },
    { facility_code: 'BV_BACHMAI', facility_name: 'Bệnh viện Bạch Mai', short_name: 'Bạch Mai', address: '78 Giải Phóng, Phường Phương Mai, Quận Đống Đa, Hà Nội', phone: '024 3869 3731', is_primary: false, latitude: 20.9996, longitude: 105.8415, province_id: provHaNoi?.province_id, director_name: 'PGS. TS. BS. Đào Xuân Cơ', director_title: 'GIÁM ĐỐC BỆNH VIỆN' },
  ];

  for (const fc of facilitiesData) {
    await prisma.medical_facilities.create({ data: fc });
  }

  const allFacilities = await prisma.medical_facilities.findMany();
  const facMap = new Map<string, number>();
  allFacilities.forEach(f => facMap.set(f.facility_code, f.facility_id));

  // 9. OTP Types & Settings
  const otpTypesData = [
    { otp_type_code: 'VERIFY_EMAIL', otp_type_name: 'Xác thực Email tài khoản', expiry_minutes: 15, max_attempts: 5, description: 'Mã xác thực gửi qua email khi đăng ký mới' },
    { otp_type_code: 'RESET_PASSWORD', otp_type_name: 'Đặt lại mật khẩu', expiry_minutes: 10, max_attempts: 3, description: 'Mã OTP để xác nhận đặt lại mật khẩu' },
    { otp_type_code: 'LOGIN_2FA', otp_type_name: 'Xác thực hai bước (2FA)', expiry_minutes: 5, max_attempts: 3, description: 'Mã OTP đăng nhập an toàn hai lớp' },
  ];
  for (const ot of otpTypesData) {
    await prisma.otp_types.create({ data: ot });
  }

  const settingsData = [
    { setting_key: 'SITE_NAME', setting_value: 'BloodLink - Nền tảng kết nối hiến máu tình nguyện', description: 'Tên hệ thống' },
    { setting_key: 'CONTACT_HOTLINE', setting_value: '1900 1234', description: 'Tổng đài hỗ trợ người hiến máu' },
    { setting_key: 'CONTACT_EMAIL', setting_value: 'support@hienmau.vn', description: 'Email liên hệ chính thức' },
    { setting_key: 'CERTIFICATE_AUTO_APPROVE', setting_value: 'false', description: 'Tự động duyệt chứng nhận (true/false)' },
    { setting_key: 'MAX_DONATION_SLOTS_PER_DAY', setting_value: '100', description: 'Số lượt đăng ký tối đa mỗi ngày trên cơ sở' },
    { setting_key: 'EMERGENCY_NOTIFICATION_RADIUS_KM', setting_value: '15', description: 'Bán kính quét người hiến máu khẩn cấp (km)' },
  ];
  for (const st of settingsData) {
    await prisma.system_settings.create({ data: st });
  }

  // 10. Education & Blog Categories
  const catKnowledge = await prisma.blog_categories.create({
    data: { category_name: 'Kiến thức hiến máu', slug: 'kien-thuc-hien-mau' }
  });
  const catNews = await prisma.blog_categories.create({
    data: { category_name: 'Tin tức & Sự kiện', slug: 'tin-tuc-su-kien' }
  });
  const catStories = await prisma.blog_categories.create({
    data: { category_name: 'Câu chuyện cảm động', slug: 'cau-chuyen-cam-dong' }
  });

  const eduCat1 = await prisma.education_document_categories.create({
    data: { category_name: 'Trước khi hiến máu', description: 'Lời khuyên và chuẩn bị kỹ lưỡng trước khi tham gia hiến máu', sort_order: 1 }
  });
  const eduCat2 = await prisma.education_document_categories.create({
    data: { category_name: 'Sau khi hiến máu', description: 'Chế độ nghỉ ngơi, phục hồi và chế độ dinh dưỡng tối ưu', sort_order: 2 }
  });
  const eduCat3 = await prisma.education_document_categories.create({
    data: { category_name: 'Quyền lợi người hiến máu', description: 'Chứng nhận, bồi dưỡng dinh dưỡng, tôn vinh và thẻ hiến máu', sort_order: 3 }
  });

  // 11. Users (24 Người dùng thực tế: Cần Thơ + TP.HCM + Staff)
  console.log('Bắt đầu seed 24 Tài khoản người dùng (Cần Thơ, TP.HCM)...');
  const passwordHash = await bcrypt.hash('123456', 10);

  const rawUsers = [
    // Staff / Admin
    { email: 'admin@hienmau.vn', full_name: 'Quản Trị Viên', role_id: adminRole!.role_id, phone: '0900000001', address: 'Quận 1, TP.HCM' },
    { email: 'staff@hienmau.vn', full_name: 'Nguyễn Văn Minh (Điều phối TP.HCM)', role_id: staffRole!.role_id, phone: '0900000002', address: 'Quận 5, TP.HCM' },
    { email: 'hospital@choray.vn', full_name: 'BS. Lê Thị Mai Hương', role_id: hospitalRole!.role_id, phone: '0900000003', facility_id: facMap.get('BV_CHORAY'), address: 'Quận 5, TP.HCM' },
    { email: 'hospital@cantho.vn', full_name: 'BS. Huỳnh Quốc Dũng (BV Huyết học Cần Thơ)', role_id: hospitalRole!.role_id, phone: '0900000004', facility_id: facMap.get('BCTM_CANTHO'), address: 'Ninh Kiều, Cần Thơ' },
    { email: 'mod@hienmau.vn', full_name: 'Trần Tuấn Anh (Kiểm duyệt)', role_id: modRole!.role_id, phone: '0900000005', address: 'Quận 3, TP.HCM' },

    // --- Donors Cần Thơ ---
    { email: 'nguyenthanhduoc@gmail.com', full_name: 'Nguyễn Thành Được', role_id: userRole!.role_id, phone: '0918112233', blood: 'O+', gender: 'M', dob: '1996-05-18', cccd: '092096001234', address: '88 Đường 30 Tháng 4, Phường An Phú, Quận Ninh Kiều, TP. Cần Thơ' },
    { email: 'huynhtrucmai@gmail.com', full_name: 'Huỳnh Trúc Mai', role_id: userRole!.role_id, phone: '0939223344', blood: 'A+', gender: 'F', dob: '1999-08-22', cccd: '092199002345', address: '120 Nguyễn Văn Cừ, Phường An Khánh, Quận Ninh Kiều, TP. Cần Thơ' },
    { email: 'phanvanhau@gmail.com', full_name: 'Phan Văn Hậu', role_id: userRole!.role_id, phone: '0949334455', blood: 'B+', gender: 'M', dob: '1993-11-09', cccd: '092093003456', address: '45 Đường 3 Tháng 2, Phường Xuân Khánh, Quận Ninh Kiều, TP. Cần Thơ' },
    { email: 'lethikieuoanh@gmail.com', full_name: 'Lê Thị Kiều Oanh', role_id: userRole!.role_id, phone: '0979445566', blood: 'O-', gender: 'F', dob: '2001-02-14', cccd: '092301004567', address: '67 Mậu Thân, Phường An Hòa, Quận Ninh Kiều, TP. Cần Thơ' },
    { email: 'tranhoangkhang@gmail.com', full_name: 'Trần Hoàng Khang', role_id: userRole!.role_id, phone: '0919556677', blood: 'AB+', gender: 'M', dob: '1990-07-28', cccd: '092090005678', address: '14 Võ Văn Kiệt, Phường An Hòa, Quận Ninh Kiều, TP. Cần Thơ' },
    { email: 'dangkimngan@gmail.com', full_name: 'Đặng Kim Ngân', role_id: userRole!.role_id, phone: '0938667788', blood: 'A-', gender: 'F', dob: '1997-09-18', cccd: '092197006789', address: '228 Trần Hưng Đạo, Phường An Nghiệp, Quận Ninh Kiều, TP. Cần Thơ' },
    { email: 'vothanhsang@gmail.com', full_name: 'Võ Thanh Sang', role_id: userRole!.role_id, phone: '0948778899', blood: 'B-', gender: 'M', dob: '1994-03-30', cccd: '092094007890', address: '55 CMT8, Phường Cái Khế, Quận Ninh Kiều, TP. Cần Thơ' },
    { email: 'buicamptien@gmail.com', full_name: 'Bùi Cẩm Tiên', role_id: userRole!.role_id, phone: '0988889900', blood: 'AB-', gender: 'F', dob: '2002-12-09', cccd: '092302008901', address: '19 Lý Tự Trọng, Phường An Cư, Quận Ninh Kiều, TP. Cần Thơ' },

    // --- Donors TP.HCM ---
    { email: 'nguyenvana@gmail.com', full_name: 'Nguyễn Văn An', role_id: userRole!.role_id, phone: '0901234567', blood: 'O+', gender: 'M', dob: '1995-04-12', cccd: '079095001234', address: '124 Nguyễn Trãi, Phường 3, Quận 5, TP.HCM' },
    { email: 'tranvib@gmail.com', full_name: 'Trần Thị Bích', role_id: userRole!.role_id, phone: '0987654321', blood: 'A+', gender: 'F', dob: '1998-08-20', cccd: '079198002345', address: '45 Điện Biên Phủ, Phường 15, Quận Bình Thạnh, TP.HCM' },
    { email: 'lehoangnam@gmail.com', full_name: 'Lê Hoàng Nam', role_id: userRole!.role_id, phone: '0912345678', blood: 'B+', gender: 'M', dob: '1992-11-05', cccd: '079092003456', address: '89 Cách Mạng Tháng 8, Phường 7, Quận Tân Bình, TP.HCM' },
    { email: 'phamthicam@gmail.com', full_name: 'Phạm Thị Cẩm Tú', role_id: userRole!.role_id, phone: '0933445566', blood: 'O-', gender: 'F', dob: '2000-02-14', cccd: '079300004567', address: '210 Hai Bà Trưng, Phường Tân Định, Quận 1, TP.HCM' },
    { email: 'vovanphuc@gmail.com', full_name: 'Võ Văn Phúc', role_id: userRole!.role_id, phone: '0944556677', blood: 'AB+', gender: 'M', dob: '1989-07-28', cccd: '079089005678', address: '56 Lý Thường Kiệt, Phường 7, Quận 10, TP.HCM' },
    { email: 'dangmyduyen@gmail.com', full_name: 'Đặng Mỹ Duyên', role_id: userRole!.role_id, phone: '0966778899', blood: 'A-', gender: 'F', dob: '1997-09-18', cccd: '079197006789', address: '178 Hoàng Văn Thụ, Phường 9, Quận Phú Nhuận, TP.HCM' },
    { email: 'buitheanh@gmail.com', full_name: 'Bùi Thế Anh', role_id: userRole!.role_id, phone: '0977889900', blood: 'B-', gender: 'M', dob: '1994-03-30', cccd: '079094007890', address: '33 Tô Hiến Thành, Phường 13, Quận 10, TP.HCM' },
    { email: 'hoangthuytien@gmail.com', full_name: 'Hoàng Thủy Tiên', role_id: userRole!.role_id, phone: '0988990011', blood: 'AB-', gender: 'F', dob: '2001-12-09', cccd: '079301008901', address: '78 Nguyễn Đình Chiểu, Phường Đa Kao, Quận 1, TP.HCM' },
    { email: 'ngodangquang@gmail.com', full_name: 'Ngô Đăng Quang', role_id: userRole!.role_id, phone: '0922334455', blood: 'O+', gender: 'M', dob: '1991-05-15', cccd: '079091009012', address: '12 Võ Văn Tần, Phường 6, Quận 3, TP.HCM' },
    { email: 'duongthuhuong@gmail.com', full_name: 'Dương Thu Hương', role_id: userRole!.role_id, phone: '0933557799', blood: 'A+', gender: 'F', dob: '1996-10-22', cccd: '079196010123', address: '99 Cộng Hòa, Phường 4, Quận Tân Bình, TP.HCM' },
    { email: 'lyvankiet@gmail.com', full_name: 'Lý Văn Kiệt', role_id: userRole!.role_id, phone: '0944668800', blood: 'B+', gender: 'M', dob: '1993-01-08', cccd: '079093011234', address: '145 Bạch Đằng, Phường 2, Quận Tân Bình, TP.HCM' },
  ];

  for (const u of rawUsers) {
    const createdUser = await prisma.users.create({
      data: {
        email: u.email,
        full_name: u.full_name,
        role_id: u.role_id,
        password_hash: passwordHash,
        phone: u.phone,
        address: u.address,
        gender: (u as any).gender || 'M',
        date_of_birth: (u as any).dob ? new Date((u as any).dob) : undefined,
        identity_card: (u as any).cccd || undefined,
        blood_type_id: (u as any).blood ? btMap.get((u as any).blood) : undefined,
        facility_id: (u as any).facility_id || undefined,
        is_active: true,
        is_email_verified: true,
        is_donor_registered: !!(u as any).blood,
      }
    });

    if ((u as any).blood) {
      await prisma.donor_profiles.create({
        data: {
          user_id: createdUser.user_id,
          blood_type_id: btMap.get((u as any).blood)!,
          weight_kg: (u as any).gender === 'M' ? 68.0 : 52.0,
          height_cm: (u as any).gender === 'M' ? 172 : 160,
          total_donations: Math.floor(Math.random() * 5),
          last_donation_date: new Date(Date.now() - (40 + Math.floor(Math.random() * 60)) * 24 * 60 * 60 * 1000),
          next_eligible_date: new Date(Date.now() - (40 + Math.floor(Math.random() * 60) - 84) * 24 * 60 * 60 * 1000),
          emergency_contact_name: 'Người thân ' + u.full_name,
          emergency_contact_phone: '0909998877',
        }
      });
    }
  }

  const allUsers = await prisma.users.findMany();
  const userMap = new Map<string, any>();
  allUsers.forEach(u => userMap.set(u.email, u));
  const adminUser = userMap.get('admin@hienmau.vn')!;

  // 12. Blood Requests (26 Yêu cầu máu thực tế từ hôm nay đến tương lai: Cần Thơ + TP.HCM + Đà Nẵng + Hà Nội)
  console.log('Bắt đầu seed 26 Yêu cầu Máu thực tế (Cần Thơ, TP.HCM, Đà Nẵng, Hà Nội)...');
  const statusPending = await prisma.blood_request_statuses.findFirst({ where: { status_code: 'PENDING' } });
  const statusApproved = await prisma.blood_request_statuses.findFirst({ where: { status_code: 'APPROVED' } });
  const urgCritical = await prisma.urgency_levels.findFirst({ where: { urgency_code: 'CRITICAL' } });
  const urgHigh = await prisma.urgency_levels.findFirst({ where: { urgency_code: 'HIGH' } });
  const urgNormal = await prisma.urgency_levels.findFirst({ where: { urgency_code: 'NORMAL' } });

  const rawBloodRequests = [
    // --- CẦN THƠ (10 ca cấp cứu thực tế) ---
    {
      code: 'REQ-2026-CT01', fac: 'BCTM_CANTHO', patient: 'Huỳnh Văn Khải', phone: '0939112233', bt: 'O+', comp: 'WHOLE_BLOOD', units: 3, urg: urgCritical, status: statusApproved, emergency: true,
      hosp: 'BV Huyết học Cần Thơ', ward: 'Khoa Cấp cứu, Tầng trệt, Giường 03', daysAfter: 2, notes: 'Bệnh nhân tan máu bẩm sinh Thalassemia thể nặng đợt cấp, hemoglobin tụt sâu dưới 5.5 g/dL, cần truyền máu O+ khẩn cấp.', provId: provCanTho?.province_id
    },
    {
      code: 'REQ-2026-CT02', fac: 'BV_DKTW_CANTHO', patient: 'Trần Văn Tám (62 tuổi)', phone: '0918223344', bt: 'A+', comp: 'RED_CELLS', units: 4, urg: urgCritical, status: statusApproved, emergency: true,
      hosp: 'BV ĐK TW Cần Thơ', ward: 'Khoa Phẫu thuật Tim mạch - Lồng ngực, Phòng Mổ 3', daysAfter: 1, notes: 'Mổ tim hở bắc cầu mạch vành khẩn cấp, bệnh nhân mất máu nhiều trong mổ, rất cần 4 đơn vị hồng cầu khối A+.', provId: provCanTho?.province_id
    },
    {
      code: 'REQ-2026-CT03', fac: 'BV_PHUSAN_CANTHO', patient: 'Nguyễn Thị Bích Trâm', phone: '0949334455', bt: 'O-', comp: 'WHOLE_BLOOD', units: 2, urg: urgCritical, status: statusApproved, emergency: true,
      hosp: 'Phụ sản Cần Thơ', ward: 'Khoa Cấp cứu Hồi sức Tích cực, Giường 01', daysAfter: 1, notes: 'Băng huyết sau sinh do đờ tử cung kèm nhau cài răng lược, nhóm máu hiếm O-, tình trạng nguy kịch cần truyền máu khẩn.', provId: provCanTho?.province_id
    },
    {
      code: 'REQ-2026-CT04', fac: 'BV_NHIDONG_CANTHO', patient: 'Bé Lê Hoàng Phúc (4 tuổi)', phone: '0979445566', bt: 'B+', comp: 'PLATELETS', units: 2, urg: urgHigh, status: statusApproved, emergency: false,
      hosp: 'Nhi Đồng Cần Thơ', ward: 'Khoa Huyết học Ung bướu Nhi, Giường 12', daysAfter: 3, notes: 'Bệnh nhi bạch cầu cấp dòng lympho đang hóa trị liệu, tiểu cầu giảm nghiêm trọng dưới 15.000/uL có xuất huyết niêm mạc.', provId: provCanTho?.province_id
    },
    {
      code: 'REQ-2026-CT05', fac: 'BV_DKTP_CANTHO', patient: 'Phan Quốc Cường', phone: '0989556677', bt: 'AB+', comp: 'WHOLE_BLOOD', units: 2, urg: urgNormal, status: statusPending, emergency: false,
      hosp: 'BV ĐK Cần Thơ', ward: 'Khoa Ngoại Chấn thương, Phòng 204', daysAfter: 6, notes: 'Chuẩn bị phẫu thuật kết hợp xương đùi do tai nạn giao thông xe máy tại đường 30/4, dự trù 2 đơn vị máu AB+.', provId: provCanTho?.province_id
    },
    {
      code: 'REQ-2026-CT06', fac: 'BV_DHYD_CANTHO', patient: 'Võ Thị Kim Hoa', phone: '0919667788', bt: 'A-', comp: 'RED_CELLS', units: 2, urg: urgHigh, status: statusApproved, emergency: false,
      hosp: 'BV ĐH Y Dược Cần Thơ', ward: 'Khoa Ngoại Tiêu hóa, Phòng 402', daysAfter: 4, notes: 'Xuất huyết dạ dày mạn tính, thiếu máu nhược sắc nặng, nhóm máu hiếm A- cần tìm người hiến trước ngày phẫu thuật nội soi.', provId: provCanTho?.province_id
    },
    {
      code: 'REQ-2026-CT07', fac: 'BV_DKTW_CANTHO', patient: 'Đặng Thanh Tùng', phone: '0939778899', bt: 'O+', comp: 'PLASMA', units: 3, urg: urgHigh, status: statusApproved, emergency: false,
      hosp: 'BV ĐK TW Cần Thơ', ward: 'Khoa Hồi sức Tích cực & Chống độc (ICU)', daysAfter: 3, notes: 'Sốc nhiễm trùng suy đa tạng do viêm tụy cấp hoại tử, rối loạn đông máu tiêu thụ cần truyền bù huyết tương tươi.', provId: provCanTho?.province_id
    },
    {
      code: 'REQ-2026-CT08', fac: 'BCTM_CANTHO', patient: 'Lâm Văn Tài', phone: '0949889900', bt: 'B-', comp: 'WHOLE_BLOOD', units: 2, urg: urgCritical, status: statusPending, emergency: true,
      hosp: 'BV Huyết học Cần Thơ', ward: 'Phòng Lưu Cấp cứu', daysAfter: 2, notes: 'Tai nạn ghe tàu trên sông Hậu va chạm gãy xương sườn chọc thủng phổi, nhóm máu hiếm B- trong ngân hàng máu đang thiếu.', provId: provCanTho?.province_id
    },
    {
      code: 'REQ-2026-CT09', fac: 'BV_NHIDONG_CANTHO', patient: 'Bé Mai Ánh Dương (9 tháng)', phone: '0979990011', bt: 'O+', comp: 'RED_CELLS', units: 1, urg: urgNormal, status: statusApproved, emergency: false,
      hosp: 'Nhi Đồng Cần Thơ', ward: 'Khoa Sơ sinh Hồi sức, Lồng ấp 05', daysAfter: 8, notes: 'Trẻ sinh non thiếu máu do giảm sản xuất hồng cầu, chỉ định truyền 1 đơn vị hồng cầu lọc bạch cầu.', provId: provCanTho?.province_id
    },
    {
      code: 'REQ-2026-CT10', fac: 'BV_PHUSAN_CANTHO', patient: 'Dương Kiều My', phone: '0989001122', bt: 'AB-', comp: 'WHOLE_BLOOD', units: 2, urg: urgHigh, status: statusApproved, emergency: false,
      hosp: 'Phụ sản Cần Thơ', ward: 'Khoa Sản Bệnh, Phòng 301', daysAfter: 5, notes: 'Song thai 37 tuần tiền sản giật nặng, dự kiến mổ chủ động đầu tuần tới, nhóm máu hiếm AB- cần dự phòng sẵn.', provId: provCanTho?.province_id
    },

    // --- TP. HỒ CHÍ MINH (12 ca cấp cứu thực tế) ---
    {
      code: 'REQ-2026-HCM01', fac: 'BCTM_HCM', patient: 'Nguyễn Thanh Hùng', phone: '0901111222', bt: 'O+', comp: 'WHOLE_BLOOD', units: 3, urg: urgCritical, status: statusApproved, emergency: true,
      hosp: 'BV Huyết học TP.HCM', ward: 'Khoa Cấp cứu, Tầng 1, Giường 05', daysAfter: 2, notes: 'Bệnh nhân mất máu nặng do tai nạn giao thông trên QL1A, hemoglobin giảm dưới 6g/dL, cần truyền máu khẩn.', provId: provHCM?.province_id
    },
    {
      code: 'REQ-2026-HCM02', fac: 'BV_CHORAY', patient: 'Trần Minh Phát', phone: '0902333444', bt: 'A+', comp: 'RED_CELLS', units: 2, urg: urgHigh, status: statusApproved, emergency: false,
      hosp: 'Chợ Rẫy', ward: 'Khoa Ngoại Tiêu Hóa, Phòng 302', daysAfter: 4, notes: 'Xuất huyết tiêu hóa do loét dạ dày tá tràng tái phát, đã nội soi kẹp clip, cần truyền 2 đơn vị hồng cầu khối.', provId: provHCM?.province_id
    },
    {
      code: 'REQ-2026-HCM03', fac: 'BV_CHORAY', patient: 'Lê Thị Hồng Nhung', phone: '0905555666', bt: 'B+', comp: 'WHOLE_BLOOD', units: 4, urg: urgCritical, status: statusPending, emergency: true,
      hosp: 'Chợ Rẫy', ward: 'Khoa Hồi sức Tim mạch (ICU 1), Giường 02', daysAfter: 1, notes: 'Phẫu thuật bắc cầu mạch vành khẩn cấp, bệnh nhân huyết áp tụt, cần máu toàn phần B+ lập tức.', provId: provHCM?.province_id
    },
    {
      code: 'REQ-2026-HCM04', fac: 'BV_CHORAY', patient: 'Phạm Quốc Bảo', phone: '0908777888', bt: 'O+', comp: 'PLATELETS', units: 2, urg: urgNormal, status: statusApproved, emergency: false,
      hosp: 'Chợ Rẫy', ward: 'Khoa Ung bướu, Phòng 205', daysAfter: 7, notes: 'Bệnh nhân bạch cầu cấp đang vào hóa chất chu kỳ 3, tiểu cầu giảm dưới 20.000/uL, có nguy cơ xuất huyết não.', provId: provHCM?.province_id
    },
    {
      code: 'REQ-2026-HCM05', fac: 'BV_TUDU', patient: 'Võ Thị Mai Anh', phone: '0909111222', bt: 'AB-', comp: 'WHOLE_BLOOD', units: 2, urg: urgHigh, status: statusApproved, emergency: false,
      hosp: 'Từ Dũ', ward: 'Khoa Sanh Cấp cứu, Phòng Mổ 4', daysAfter: 3, notes: 'Sản phụ mang thai 38 tuần ngôi ngang kèm nhau tiền đạo trung tâm, nhóm máu hiếm AB- cần dự trù máu cho ca mổ.', provId: provHCM?.province_id
    },
    {
      code: 'REQ-2026-HCM06', fac: 'BV_115', patient: 'Đặng Văn Tài', phone: '0912345678', bt: 'A+', comp: 'RED_CELLS', units: 2, urg: urgNormal, status: statusApproved, emergency: false,
      hosp: 'BV 115', ward: 'Khoa Ngoại Chấn thương, Phòng 105', daysAfter: 6, notes: 'Dự kiến phẫu thuật thay toàn bộ khớp háng nhân tạo cho cụ ông 72 tuổi, cần chuẩn bị sẵn 2 đơn vị hồng cầu.', provId: provHCM?.province_id
    },
    {
      code: 'REQ-2026-HCM07', fac: 'BV_NHIDONG1', patient: 'Bé Nguyễn Minh Khang (5 tuổi)', phone: '0918765432', bt: 'O-', comp: 'RED_CELLS', units: 1, urg: urgCritical, status: statusApproved, emergency: true,
      hosp: 'Nhi Đồng 1', ward: 'Khoa Hồi sức Tích cực Nhi, Giường 08', daysAfter: 2, notes: 'Bệnh nhi thiếu máu tan máu bẩm sinh cấp thể nặng, nhóm máu hiếm O-, huyết sắc tố tụt sâu.', provId: provHCM?.province_id
    },
    {
      code: 'REQ-2026-HCM08', fac: 'BCTM_HCM', patient: 'Bùi Thanh Long', phone: '0922334455', bt: 'B+', comp: 'PLATELETS', units: 3, urg: urgHigh, status: statusApproved, emergency: false,
      hosp: 'BV Huyết học TP.HCM', ward: 'Khoa Huyết học Người lớn, Phòng 201', daysAfter: 5, notes: 'Bệnh nhân sốt xuất huyết Dengue cảnh báo ngày thứ 5, tiểu cầu giảm đột ngột còn 15.000/uL.', provId: provHCM?.province_id
    },
    {
      code: 'REQ-2026-HCM09', fac: 'BV_BINHDAN', patient: 'Trần Văn Hoàng', phone: '0933221144', bt: 'O+', comp: 'PLASMA', units: 2, urg: urgNormal, status: statusPending, emergency: false,
      hosp: 'Bình Dân', ward: 'Khoa Ngoại Tiết Niệu, Phòng 412', daysAfter: 8, notes: 'Chuẩn bị phẫu thuật nội soi cắt u bàng quang, bệnh nhân có rối loạn đông máu nhẹ cần bù huyết tương tươi.', provId: provHCM?.province_id
    },
    {
      code: 'REQ-2026-HCM10', fac: 'BV_GIADINH', patient: 'Phan Thị Diễm Hương', phone: '0944332211', bt: 'A-', comp: 'WHOLE_BLOOD', units: 2, urg: urgCritical, status: statusApproved, emergency: true,
      hosp: 'Gia Định', ward: 'Khoa Cấp Cứu Tổng Hợp', daysAfter: 1, notes: 'Thai ngoài tử cung vỡ gây tràn máu ổ bụng lượng nhiều, sinh hiệu dao động, cần máu A- gấp để tiến hành mổ hở cầm máu.', provId: provHCM?.province_id
    },
    {
      code: 'REQ-2026-HCM11', fac: 'BV_UNGBUOU', patient: 'Lâm Quốc Dũng', phone: '0955443322', bt: 'B-', comp: 'RED_CELLS', units: 2, urg: urgHigh, status: statusApproved, emergency: false,
      hosp: 'Ung Bướu', ward: 'Khoa Xạ Trị 2, Phòng 108', daysAfter: 5, notes: 'Bệnh nhân ung thư vòm họng suy kiệt nặng, thiếu máu hồng cầu nhỏ nhược sắc, cần truyền máu nâng đỡ thể trạng.', provId: provHCM?.province_id
    },
    {
      code: 'REQ-2026-HCM12', fac: 'BV_DHYD', patient: 'Huỳnh Thị Mỹ Lệ', phone: '0966554433', bt: 'O+', comp: 'WHOLE_BLOOD', units: 3, urg: urgHigh, status: statusPending, emergency: false,
      hosp: 'ĐH Y Dược', ward: 'Khoa Gan Mật Tụy, Phòng 501', daysAfter: 4, notes: 'Xơ gan Child-Pugh C kèm giãn tĩnh mạch thực quản vỡ đã thắt vòng cao su, cần truyền máu duy trì huyết động.', provId: provHCM?.province_id
    },

    // --- ĐÀ NẴNG & HÀ NỘI (4 ca) ---
    {
      code: 'REQ-2026-DN01', fac: 'BV_DANANG', patient: 'Hoàng Quốc Việt', phone: '0977881122', bt: 'O+', comp: 'WHOLE_BLOOD', units: 2, urg: urgCritical, status: statusApproved, emergency: true,
      hosp: 'BV Đà Nẵng', ward: 'Khoa Cấp cứu Đa khoa', daysAfter: 2, notes: 'Tai nạn lao động ngã từ giàn giáo cao, chấn thương vỡ lách độ IV, cần máu O+ truyền khẩn cấp trong mổ cắt lách.', provId: provDaNang?.province_id
    },
    {
      code: 'REQ-2026-DN02', fac: 'BV_PSNHI_DANANG', patient: 'Sản phụ Trương Mỹ Lan', phone: '0988992233', bt: 'A+', comp: 'RED_CELLS', units: 2, urg: urgHigh, status: statusApproved, emergency: false,
      hosp: 'Phụ sản - Nhi ĐN', ward: 'Khoa Hồi sức Hậu phẫu, Giường 06', daysAfter: 3, notes: 'Mổ bắt con ở tuần thai thứ 39 do suy thai cấp, mất máu trung bình sau sinh mổ, cần bù 2 đơn vị hồng cầu.', provId: provDaNang?.province_id
    },
    {
      code: 'REQ-2026-HN01', fac: 'VIEN_HUYETHOC_TW', patient: 'Đỗ Hữu Trọng', phone: '0911224466', bt: 'O-', comp: 'RED_CELLS', units: 3, urg: urgCritical, status: statusApproved, emergency: true,
      hosp: 'Viện Huyết học TW', ward: 'Khoa Điều trị Hóa chất, Phòng 303', daysAfter: 1, notes: 'Bệnh nhân suy tủy xương toàn bộ, thiếu máu nặng đe dọa ngừng tim, nhóm máu O- rất khẩn cấp.', provId: provHaNoi?.province_id
    },
    {
      code: 'REQ-2026-HN02', fac: 'BV_BACHMAI', patient: 'Nguyễn Văn Định', phone: '0922335577', bt: 'B+', comp: 'PLASMA', units: 4, urg: urgHigh, status: statusApproved, emergency: false,
      hosp: 'Bạch Mai', ward: 'Trung tâm Hồi sức Tích cực (A9)', daysAfter: 4, notes: 'Viêm tụy cấp thể hoại tử nặng do tăng triglyceride máu, lọc máu liên tục và thay huyết tương cấp cứu.', provId: provHaNoi?.province_id
    }
  ];

  for (const r of rawBloodRequests) {
    const requiredBeforeDate = new Date(Date.now() + r.daysAfter * 24 * 60 * 60 * 1000);
    await prisma.blood_requests.create({
      data: {
        request_code: r.code,
        facility_id: facMap.get(r.fac)!,
        patient_name: r.patient,
        patient_phone: r.phone,
        blood_type_id: btMap.get(r.bt)!,
        component_id: compMap.get(r.comp)!,
        units_needed: r.units,
        urgency_id: r.urg!.urgency_id,
        status_id: r.status!.status_id,
        is_emergency: r.emergency,
        hospital_name: r.hosp,
        ward_room: r.ward,
        required_before: requiredBeforeDate,
        clinical_notes: r.notes,
        province_id: r.provId,
        requester_user_id: adminUser.user_id,
      }
    });
  }

  // 13. Facility Donation Schedules (20 Lịch hiến máu tại Cần Thơ & TP.HCM từ ngày mai đến 60 ngày tới)
  console.log('Bắt đầu seed 20 Lịch hiến máu tại cơ sở (Cần Thơ, TP.HCM)...');
  const rawSchedules = [
    // Lịch tại Cần Thơ
    { fac: 'BCTM_CANTHO', days: 0, session: 'morning', max: 80, donors: 10, terms: 'Tiếp nhận hiến máu tình nguyện trong ngày tại Bệnh viện Huyết học Cần Thơ. Mang theo CCCD.' },
    { fac: 'BCTM_CANTHO', days: 1, session: 'morning', max: 80, donors: 18, terms: 'Tiếp nhận hiến máu tình nguyện tại sảnh tầng trệt BV Huyết học Cần Thơ. Mang theo CCCD.' },
    { fac: 'BV_DKTW_CANTHO', days: 2, session: 'morning', max: 100, donors: 25, terms: 'Điểm tiếp nhận hiến máu Hội trường Bệnh viện Đa khoa Trung ương Cần Thơ.' },
    { fac: 'BV_DHYD_CANTHO', days: 3, session: 'morning', max: 70, donors: 12, terms: 'Ngày hội Hiến máu Giọt hồng Blouse trắng tại Trường ĐH Y Dược Cần Thơ.' },
    { fac: 'BV_DKTP_CANTHO', days: 4, session: 'morning', max: 50, donors: 8, terms: 'Phòng tiếp nhận hiến máu cố định, số 04 Châu Văn Liêm, Ninh Kiều.' },
    { fac: 'BV_NHIDONG_CANTHO', days: 6, session: 'morning', max: 60, donors: 15, terms: 'Chương trình Hiến máu tình nguyện Tiếp sức bệnh nhi Cần Thơ.' },
    { fac: 'BCTM_CANTHO', days: 8, session: 'afternoon', max: 80, donors: 10, terms: 'Tiếp nhận buổi chiều từ 13h30 đến 16h30 tại BV Huyết học Cần Thơ.' },
    { fac: 'BV_PHUSAN_CANTHO', days: 12, session: 'morning', max: 50, donors: 5, terms: 'Điểm hiến máu nhân đạo BV Phụ sản TP. Cần Thơ.' },
    { fac: 'BV_DKTW_CANTHO', days: 15, session: 'morning', max: 90, donors: 20, terms: 'Chiến dịch Giọt hồng sông Hậu đợt 1.' },

    // Lịch tại TP.HCM
    { fac: 'BCTM_HCM', days: 0, session: 'morning', max: 100, donors: 15, terms: 'Tiếp nhận hiến máu tình nguyện trong ngày tại Trung tâm Truyền máu TP.HCM.' },
    { fac: 'BCTM_HCM', days: 1, session: 'morning', max: 100, donors: 35, terms: 'Vui lòng mang theo CCCD và thẻ hiến máu (nếu có). Nghỉ ngơi tốt đêm trước.' },
    { fac: 'BV_CHORAY', days: 2, session: 'morning', max: 120, donors: 40, terms: 'Tiếp nhận hiến máu tại Trung tâm Truyền máu Chợ Rẫy, Lầu 1.' },
    { fac: 'BV_TUDU', days: 3, session: 'morning', max: 60, donors: 14, terms: 'Phục vụ tiếp nhận tại Hội trường A Bệnh viện Từ Dũ.' },
    { fac: 'BV_115', days: 4, session: 'afternoon', max: 70, donors: 20, terms: 'Đến đúng giờ hẹn để quy trình khám sàng lọc diễn ra nhanh chóng.' },
    { fac: 'BV_BINHDAN', days: 5, session: 'morning', max: 50, donors: 10, terms: 'Địa điểm: Sảnh nhà B Bệnh viện Bình Dân.' },
    { fac: 'BV_NHIDONG1', days: 7, session: 'morning', max: 60, donors: 18, terms: 'Chương trình Hiến giọt máu đào - Tiếp sức bệnh nhi.' },
    { fac: 'BV_GIADINH', days: 9, session: 'morning', max: 70, donors: 12, terms: 'Phòng tiếp nhận hiến máu tầng trệt khoa Huyết học.' },
    { fac: 'BV_UNGBUOU', days: 11, session: 'afternoon', max: 50, donors: 6, terms: 'Cơ sở 1 Bình Thạnh, phòng tư vấn sức khỏe người hiến máu.' },
    { fac: 'BV_DHYD', days: 14, session: 'morning', max: 80, donors: 28, terms: 'Khu tiếp nhận hiến máu tình nguyện Khoa Truyền máu Đại học Y Dược.' },
    { fac: 'BV_THUDUC', days: 18, session: 'morning', max: 60, donors: 9, terms: 'Điểm hiến máu cố định TP. Thủ Đức, 29 Phú Châu.' },
    { fac: 'BCTM_HCM', days: 25, session: 'morning', max: 100, donors: 0, terms: 'Chiến dịch Giọt hồng tình nguyện tháng mới.' },
    { fac: 'BV_CHORAY', days: 35, session: 'morning', max: 120, donors: 0, terms: 'Lễ hội Xuân Hồng hiến máu nhân đạo năm 2026.' },
  ];

  const createdSchedules: any[] = [];
  for (const s of rawSchedules) {
    const schedDate = new Date(Date.now() + s.days * 24 * 60 * 60 * 1000);
    const startTime = s.session === 'morning' ? new Date('1970-01-01T07:30:00Z') : new Date('1970-01-01T13:30:00Z');
    const endTime = s.session === 'morning' ? new Date('1970-01-01T11:30:00Z') : new Date('1970-01-01T16:30:00Z');

    const created = await prisma.facility_donation_schedules.create({
      data: {
        facility_id: facMap.get(s.fac)!,
        date: schedDate,
        start_time: startTime,
        end_time: endTime,
        max_donors: s.max,
        current_donors: s.donors,
        status: 'OPEN',
        terms_html: `<p>${s.terms}</p>`,
      }
    });
    createdSchedules.push(created);
  }

  // 14. Donor Availability Slots (20 Lượt đăng ký hiến máu mẫu)
  console.log('Bắt đầu seed 20 Lượt Đăng Ký Hiến Máu (Slots)...');
  const donorUserList = allUsers.filter(u => u.role_id === userRole!.role_id);
  const slotStatuses = ['PENDING', 'CONFIRMED', 'ARRIVED', 'COMPLETED', 'PENDING', 'CONFIRMED', 'ARRIVED', 'COMPLETED', 'PENDING', 'CONFIRMED'];
  
  for (let i = 0; i < 20; i++) {
    const user = donorUserList[i % donorUserList.length];
    const sched = createdSchedules[i % createdSchedules.length];
    const status = slotStatuses[i % slotStatuses.length];
    const hoursAgo = (20 - i) * 3;

    await prisma.donor_availability_slots.create({
      data: {
        user_id: user.user_id,
        schedule_id: sched.schedule_id,
        specific_date: sched.date,
        start_time: sched.start_time,
        end_time: sched.end_time,
        status: status,
        notes: status === 'COMPLETED' ? 'COMPLETED' : `Đăng ký hiến máu ca ngày ${new Date(sched.date).toLocaleDateString('vi-VN')}`,
        is_active: true,
        created_at: new Date(Date.now() - hoursAgo * 3600 * 1000),
      }
    });
  }

  // 15. Donations & Certificates (18 Ca hiến & 18 Chứng chỉ: 8 PENDING để Admin test duyệt, 10 APPROVED có dấu mộc)
  console.log('Bắt đầu seed 18 Ca Hiến Máu & Chứng Nhận (Donations & Certificates)...');
  const donationFacs = ['BCTM_CANTHO', 'BV_DKTW_CANTHO', 'BCTM_HCM', 'BV_CHORAY', 'BV_TUDU', 'BV_115'];

  for (let i = 0; i < 18; i++) {
    const user = donorUserList[i % donorUserList.length];
    const facCode = donationFacs[i % donationFacs.length];
    const daysAgo = (i + 1) * 5;
    const donDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const volume = i % 3 === 0 ? 450 : i % 2 === 0 ? 350 : 250;
    const donCode = `DN-2026-${String(1001 + i).padStart(5, '0')}`;

    const don = await prisma.donations.create({
      data: {
        donation_code: donCode,
        facility_id: facMap.get(facCode)!,
        donor_user_id: user.user_id,
        blood_type_id: user.blood_type_id || btMap.get('O+')!,
        component_id: compMap.get('WHOLE_BLOOD')!,
        volume_ml: volume,
        donation_date: donDate,
        health_check_passed: true,
        status_code: 'COMPLETED',
        result_notes: 'Hiến máu tình nguyện thành công tốt đẹp, thể trạng người hiến hoàn toàn ổn định.',
        next_eligible_date: new Date(donDate.getTime() + 84 * 24 * 60 * 60 * 1000),
      }
    });

    await prisma.donor_profiles.update({
      where: { user_id: user.user_id },
      data: {
        last_donation_date: donDate,
        next_eligible_date: new Date(donDate.getTime() + 84 * 24 * 60 * 60 * 1000),
      }
    }).catch(() => {});

    const isPending = i < 8; // 8 chứng chỉ chờ duyệt để test
    const certCode = `BL-${donDate.getFullYear()}-${String(1001 + i).padStart(5, '0')}`;

    await prisma.donation_certificates.create({
      data: {
        donation_id: don.donation_id,
        certificate_code: certCode,
        status: isPending ? 'PENDING' : 'APPROVED',
        approved_by: isPending ? undefined : adminUser.user_id,
        approved_at: isPending ? undefined : new Date(donDate.getTime() + 2 * 3600 * 1000),
        seal_number: isPending ? undefined : `SEAL-2026-${String(8800 + i)}`,
        issued_at: isPending ? undefined : new Date(donDate.getTime() + 2 * 3600 * 1000),
      }
    });
  }

  // 16. Blood Inventory (24 Túi máu tại các ngân hàng máu Cần Thơ & TP.HCM)
  console.log('Bắt đầu seed 24 Túi máu trong Kho (Inventory)...');
  const inventoryBloodTypes = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'O+', 'B+', 'O+', 'A+'];
  const inventoryFacilities = ['BCTM_CANTHO', 'BV_DKTW_CANTHO', 'BCTM_HCM', 'BV_CHORAY', 'BV_115'];

  for (let i = 0; i < 24; i++) {
    const btCode = inventoryBloodTypes[i % inventoryBloodTypes.length];
    const facCode = inventoryFacilities[i % inventoryFacilities.length];
    const bagCode = `BAG-${btCode.replace('+', 'P').replace('-', 'N')}-${String(200 + i)}`;
    const collectionDate = new Date(Date.now() - (i % 8) * 24 * 60 * 60 * 1000);
    const expiryDate = new Date(collectionDate.getTime() + 35 * 24 * 60 * 60 * 1000);

    await prisma.blood_inventory.create({
      data: {
        facility_id: facMap.get(facCode)!,
        blood_type_id: btMap.get(btCode)!,
        component_id: compMap.get(i % 4 === 0 ? 'RED_CELLS' : i % 3 === 0 ? 'PLATELETS' : 'WHOLE_BLOOD')!,
        bag_code: bagCode,
        volume_ml: i % 2 === 0 ? 350 : 250,
        collection_date: collectionDate,
        expiry_date: expiryDate,
        status_code: 'AVAILABLE'
      }
    });
  }

  // 17. Education Documents
  console.log('Bắt đầu seed Tài liệu Giáo Dục & Blog...');
  await prisma.education_documents.create({
    data: {
      category_id: eduCat1.category_id,
      title: 'Những điều cần chuẩn bị trước khi tham gia hiến máu tình nguyện',
      slug: 'nhung-dieu-can-chuan-bi-truoc-khi-tham-gia-hien-mau-tinh-nguyen',
      summary: 'Ngủ đủ giấc ít nhất 6 tiếng, ăn nhẹ không dầu mỡ, uống nhiều nước và mang theo CCCD.',
      content_html: '<p>Để đảm bảo an toàn cao nhất cho người hiến và chất lượng túi máu, bạn cần ngủ đủ ít nhất 6 tiếng vào đêm hôm trước, ăn nhẹ và tuyệt đối không uống rượu bia hay nước tăng lực.</p>',
      is_published: true,
      published_at: new Date(),
      created_by: adminUser.user_id,
    }
  });

  await prisma.education_documents.create({
    data: {
      category_id: eduCat2.category_id,
      title: 'Chế độ nghỉ ngơi và dinh dưỡng phục hồi tối ưu sau hiến máu',
      slug: 'che-do-nghi-ngoi-va-dinh-duong-phuc-hoi-toi-uu-sau-hien-mau',
      summary: 'Nghỉ tại chỗ 15-20 phút, uống nhiều nước lọc và bổ sung thực phẩm giàu chất sắt trong 48 giờ.',
      content_html: '<p>Sau khi hiến máu, hãy giữ băng dính ít nhất 4-6 tiếng, tránh mang vác nặng bên tay vừa lấy máu, ăn đủ các thực phẩm giàu chất sắt như thịt bò, gan động vật, rau bina và trứng.</p>',
      is_published: true,
      published_at: new Date(),
      created_by: adminUser.user_id,
    }
  });

  await prisma.education_documents.create({
    data: {
      category_id: eduCat3.category_id,
      title: 'Quyền lợi tôn vinh và giá trị bồi hoàn của Giấy Chứng Nhận Hiến Máu',
      slug: 'quyen-loi-ton-vinh-va-gia-tri-boi-hoan-cua-giay-chung-nhan-hien-mau',
      summary: 'Được cấp giấy chứng nhận có giá trị bồi hoàn lượng máu đã hiến miễn phí trên toàn quốc.',
      content_html: '<p>Theo Thông tư của Bộ Y tế, người hiến máu tình nguyện được cấp Giấy chứng nhận hiến máu tình nguyện có giá trị bồi hoàn lượng máu đã hiến miễn phí tại tất cả các bệnh viện công lập trên toàn quốc khi bản thân cần truyền máu.</p>',
      is_published: true,
      published_at: new Date(),
      created_by: adminUser.user_id,
    }
  });

  // 18. Blog Posts
  await prisma.blog_posts.create({
    data: {
      blog_category_id: catKnowledge.blog_category_id,
      author_user_id: adminUser.user_id,
      title: 'Lợi ích bất ngờ của việc hiến máu định kỳ đối với sức khỏe tim mạch',
      slug: 'loi-ich-bat-ngo-cua-viec-hien-mau-dinh-ky-doi-voi-suc-khoe-tim-mach',
      summary: 'Hiến máu giúp giảm lượng sắt dư thừa trong máu, kích thích tủy xương sản sinh tế bào máu mới khỏe mạnh.',
      content_html: '<p>Nhiều nghiên cứu y khoa chỉ ra rằng việc hiến máu định kỳ mỗi 3 tháng giúp điều hòa lượng sắt dự trữ, giảm nguy cơ xơ vữa động mạch và đột quỵ tim.</p>',
      is_published: true,
      published_at: new Date()
    }
  });

  await prisma.blog_posts.create({
    data: {
      blog_category_id: catStories.blog_category_id,
      author_user_id: adminUser.user_id,
      title: 'Chuyến xe cứu người trong đêm: Khi giọt máu O- kết nối hai đầu thành phố',
      slug: 'chuyen-xe-cuu-nguoi-trong-dem-khi-giot-mau-o-ket-noi-hai-dau-thanh-pho',
      summary: 'Câu chuyện xúc động về hành trình hiến máu khẩn cấp cứu sống sản phụ nguy kịch tại BV Từ Dũ.',
      content_html: '<p>Lúc 2 giờ sáng, nhận được tín hiệu khẩn cấp từ BloodLink, anh Phúc đã lập tức chạy xe máy hơn 12km trong mưa để có mặt tại bệnh viện hiến 2 đơn vị máu O- cứu sống mẹ con sản phụ.</p>',
      is_published: true,
      published_at: new Date()
    }
  });

  console.log('✅ SEEDER HOÀN TẤT THÀNH CÔNG RỰC RỠ!');
  console.log('📊 Thống kê dữ liệu đã nạp:');
  console.log('- 20 Cơ sở y tế: 6 Cần Thơ, 10 TP.HCM, 2 Đà Nẵng, 2 Hà Nội');
  console.log('- 24 Tài khoản người dùng (Admin, Bác sĩ Chợ Rẫy, BS Cần Thơ, Donors đa dạng)');
  console.log('- 26 Yêu cầu máu thực tế (10 Cần Thơ, 12 TP.HCM, 4 Đà Nẵng & Hà Nội)');
  console.log('- 20 Lịch hiến máu tại Cần Thơ và TP.HCM (từ ngày mai đến 60 ngày tới)');
  console.log('- 20 Lượt đăng ký hiến máu mẫu (PENDING, CONFIRMED, ARRIVED, COMPLETED)');
  console.log('- 18 Ca hiến máu & 18 Chứng chỉ (8 PENDING để test duyệt, 10 APPROVED có mộc đỏ)');
  console.log('- 24 Túi máu lưu kho hạn dùng 35 ngày');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi chạy Seeder:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
