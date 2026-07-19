import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedLocations } from './seed-locations';

const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu dọn dẹp dữ liệu cũ (Xóa từ bảng con đến bảng cha)...');
  
  // Dọn dẹp dữ liệu cũ theo thứ tự để tránh lỗi khóa ngoại (Foreign Key Constraints)
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
  await prisma.provinces.deleteMany();
  
  await prisma.blood_compatibility.deleteMany();
  await prisma.donation_interval_rules.deleteMany();
  await prisma.blood_components.deleteMany();
  await prisma.blood_types.deleteMany();
  await prisma.roles.deleteMany();

  console.log('Đã dọn dẹp xong. Bắt đầu seed Master Data...');

  await seedLocations(prisma);

  // 1. Roles
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

  // 2. Blood Types
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

  // 3. Blood Components
  const components = [
    { component_code: 'WHOLE_BLOOD', component_name: 'Máu toàn phần', description: 'Máu toàn phần chưa tách' },
    { component_code: 'RED_CELLS', component_name: 'Hồng cầu khối', description: 'Hồng cầu đã tách' },
    { component_code: 'PLASMA', component_name: 'Huyết tương', description: 'Huyết tương tươi đông lạnh' },
    { component_code: 'PLATELETS', component_name: 'Tiểu cầu', description: 'Khối tiểu cầu' }
  ];
  for (const cp of components) {
    await prisma.blood_components.create({ data: cp });
  }

  // 4. Request Statuses
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

  // 5. Urgency Levels
  const urgencies = [
    { urgency_code: 'NORMAL', urgency_name: 'Bình thường', priority_level: 1 },
    { urgency_code: 'HIGH', urgency_name: 'Khẩn cấp', priority_level: 2 },
    { urgency_code: 'CRITICAL', urgency_name: 'Tối khẩn', priority_level: 3 }
  ];
  for (const ug of urgencies) {
    await prisma.urgency_levels.create({ data: ug });
  }

  // 6. Medical Facilities (with GPS for map)
  const facilities = [
    { facility_code: 'BCTM_HCM', facility_name: 'Bệnh viện Truyền máu Huyết học TP.HCM', short_name: 'BV Huyết học', address: '118 Hồng Bàng, Phường 12, Quận 5, TP.HCM', phone: '028 3957 1342', is_primary: true, latitude: 10.7548, longitude: 106.6612 },
    { facility_code: 'BV_CHORAY', facility_name: 'Bệnh viện Chợ Rẫy', short_name: 'Chợ Rẫy', address: '201B Nguyễn Chí Thanh, Phường 12, Quận 5, TP.HCM', phone: '028 3855 4137', is_primary: false, latitude: 10.7558, longitude: 106.6563 },
    { facility_code: 'BV_TUDU', facility_name: 'Bệnh viện Từ Dũ', short_name: 'Từ Dũ', address: '284 Cống Quỳnh, Phường Phạm Ngũ Lão, Quận 1, TP.HCM', phone: '028 3839 5117', is_primary: false, latitude: 10.7676, longitude: 106.6909 },
    { facility_code: 'BV_115', facility_name: 'Bệnh viện Nhân dân 115', short_name: 'BV 115', address: '527 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM', phone: '028 3865 4249', is_primary: false, latitude: 10.7734, longitude: 106.6681 },
    { facility_code: 'BV_NGOAIKHOAQT', facility_name: 'Bệnh viện Ngoại khoa Quốc tế', short_name: 'BV Ngoại khoa QT', address: '20 Điện Biên Phủ, Quận Bình Thạnh, TP.HCM', phone: '028 3512 0188', is_primary: false, latitude: 10.7918, longitude: 106.7050 },
    { facility_code: 'BV_THUDUC', facility_name: 'Bệnh viện Thành phố Thủ Đức', short_name: 'BV Thủ Đức', address: '29 Phú Châu, Phường Tam Phú, TP. Thủ Đức, TP.HCM', phone: '028 3729 6070', is_primary: false, latitude: 10.8536, longitude: 106.7535 },
  ];
  for (const fc of facilities) {
    await prisma.medical_facilities.create({ data: fc });
  }

  // 7. Blog Categories
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
    { email: 'admin@hienmau.vn', full_name: 'Quản Trị Viên', role_id: adminRole!.role_id, password_hash: passwordHash, is_active: true, is_email_verified: true },
    { email: 'staff@hienmau.vn', full_name: 'Nhân viên A', role_id: staffRole!.role_id, password_hash: passwordHash, is_active: true, is_email_verified: true },
    { email: 'hospital@choray.vn', full_name: 'Bác sĩ BV Chợ Rẫy', role_id: hospitalRole!.role_id, password_hash: passwordHash, is_active: true, is_email_verified: true },
    { email: 'mod@hienmau.vn', full_name: 'Kiểm duyệt viên B', role_id: modRole!.role_id, password_hash: passwordHash, is_active: true, is_email_verified: true },
    { email: 'nguyenvana@gmail.com', full_name: 'Nguyễn Văn A (Donor)', role_id: userRole!.role_id, password_hash: passwordHash, is_active: true, is_email_verified: true, phone: '0901234567' },
    { email: 'tranvib@gmail.com', full_name: 'Trần Thị B (Donor)', role_id: userRole!.role_id, password_hash: passwordHash, is_active: true, is_email_verified: true, phone: '0987654321' }
  ];
  for (const u of users) {
    await prisma.users.create({ data: u });
  }

  console.log('Bắt đầu seed Inventory, Donations, Requests...');
  const facility1 = await prisma.medical_facilities.findFirst({ where: { facility_code: 'BCTM_HCM' }});
  const facility2 = await prisma.medical_facilities.findFirst({ where: { facility_code: 'BV_CHORAY' }});
  const btO = await prisma.blood_types.findFirst({ where: { blood_type_code: 'O+' }});
  const btA = await prisma.blood_types.findFirst({ where: { blood_type_code: 'A+' }});
  const compWB = await prisma.blood_components.findFirst({ where: { component_code: 'WHOLE_BLOOD' }});

  // Inventory
  await prisma.blood_inventory.create({
    data: {
      facility_id: facility1!.facility_id,
      blood_type_id: btO!.blood_type_id,
      component_id: compWB!.component_id,
      bag_code: 'BAG-O-001',
      volume_ml: 350,
      collection_date: new Date(),
      expiry_date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), // 35 days
      status_code: 'AVAILABLE'
    }
  });

  await prisma.blood_inventory.create({
    data: {
      facility_id: facility1!.facility_id,
      blood_type_id: btA!.blood_type_id,
      component_id: compWB!.component_id,
      bag_code: 'BAG-A-002',
      volume_ml: 250,
      collection_date: new Date(),
      expiry_date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), // 35 days
      status_code: 'AVAILABLE'
    }
  });

  // Blood Requests (sample for map)
  const statusPending = await prisma.blood_request_statuses.findFirst({ where: { status_code: 'PENDING' }});
  const statusApproved = await prisma.blood_request_statuses.findFirst({ where: { status_code: 'APPROVED' }});
  const urgCritical = await prisma.urgency_levels.findFirst({ where: { urgency_code: 'CRITICAL' }});
  const urgHigh = await prisma.urgency_levels.findFirst({ where: { urgency_code: 'HIGH' }});
  const urgNormal = await prisma.urgency_levels.findFirst({ where: { urgency_code: 'NORMAL' }});
  const facility3 = await prisma.medical_facilities.findFirst({ where: { facility_code: 'BV_TUDU' }});
  const facility4 = await prisma.medical_facilities.findFirst({ where: { facility_code: 'BV_115' }});
  const facility5 = await prisma.medical_facilities.findFirst({ where: { facility_code: 'BV_NGOAIKHOAQT' }});
  const btB = await prisma.blood_types.findFirst({ where: { blood_type_code: 'B+' }});
  const btAB = await prisma.blood_types.findFirst({ where: { blood_type_code: 'AB-' }});
  const compRC = await prisma.blood_components.findFirst({ where: { component_code: 'RED_CELLS' }});
  const compPlatelets = await prisma.blood_components.findFirst({ where: { component_code: 'PLATELETS' }});

  const bloodRequestsData = [
    { request_code: 'REQ-2025-001', facility_id: facility1!.facility_id, patient_name: 'Nguyễn Thanh Hùng', patient_phone: '0901111222', blood_type_id: btO!.blood_type_id, component_id: compWB!.component_id, units_needed: 3, urgency_id: urgCritical!.urgency_id, status_id: statusPending!.status_id, is_emergency: true, hospital_name: 'BV Huyết học', ward_room: 'Khoa Cấp cứu, Tầng 1', required_before: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), clinical_notes: 'Bệnh nhân mất máu nặng do tai nạn giao thông, cần truyền máu khẩn cấp.' },
    { request_code: 'REQ-2025-002', facility_id: facility1!.facility_id, patient_name: 'Trần Minh Phát', patient_phone: '0902333444', blood_type_id: btA!.blood_type_id, component_id: compRC!.component_id, units_needed: 2, urgency_id: urgHigh!.urgency_id, status_id: statusApproved!.status_id, is_emergency: false, hospital_name: 'BV Huyết học', ward_room: 'Khoa Nội, Phòng 302', required_before: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), clinical_notes: 'Bệnh nhân thiếu máu mạn tính cần bổ sung hồng cầu.' },
    { request_code: 'REQ-2025-003', facility_id: facility2!.facility_id, patient_name: 'Lê Thị Hồng Nhung', patient_phone: '0905555666', blood_type_id: btB!.blood_type_id, component_id: compWB!.component_id, units_needed: 4, urgency_id: urgCritical!.urgency_id, status_id: statusPending!.status_id, is_emergency: true, hospital_name: 'Chợ Rẫy', ward_room: 'Khoa Hồi sức, Tầng 2', required_before: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), clinical_notes: 'Phẫu thuật tim khẩn, cần máu toàn phần nhóm B+ gấp.' },
    { request_code: 'REQ-2025-004', facility_id: facility2!.facility_id, patient_name: 'Phạm Quốc Bảo', patient_phone: '0908777888', blood_type_id: btO!.blood_type_id, component_id: compPlatelets!.component_id, units_needed: 2, urgency_id: urgNormal!.urgency_id, status_id: statusApproved!.status_id, is_emergency: false, hospital_name: 'Chợ Rẫy', ward_room: 'Khoa Ung bướu, Phòng 205', required_before: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), clinical_notes: 'Hóa trị liệu, cần bổ sung tiểu cầu.' },
    { request_code: 'REQ-2025-005', facility_id: facility3!.facility_id, patient_name: 'Võ Thị Mai Anh', patient_phone: '0909111222', blood_type_id: btAB!.blood_type_id, component_id: compWB!.component_id, units_needed: 2, urgency_id: urgHigh!.urgency_id, status_id: statusPending!.status_id, is_emergency: false, hospital_name: 'Từ Dũ', ward_room: 'Khoa Sản, Phòng 401', required_before: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), clinical_notes: 'Sản phụ sinh mổ dự kiến, cần dự trữ máu AB-.' },
    { request_code: 'REQ-2025-006', facility_id: facility4!.facility_id, patient_name: 'Đặng Văn Tài', patient_phone: '0912345678', blood_type_id: btA!.blood_type_id, component_id: compRC!.component_id, units_needed: 1, urgency_id: urgNormal!.urgency_id, status_id: statusPending!.status_id, is_emergency: false, hospital_name: 'BV 115', ward_room: 'Khoa Ngoại, Phòng 105', required_before: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), clinical_notes: 'Phẫu thuật thay khớp háng, cần dự phòng máu.' },
    { request_code: 'REQ-2025-007', facility_id: facility5!.facility_id, patient_name: 'Huỳnh Ngọc Trâm', patient_phone: '0918765432', blood_type_id: btO!.blood_type_id, component_id: compWB!.component_id, units_needed: 5, urgency_id: urgCritical!.urgency_id, status_id: statusPending!.status_id, is_emergency: true, hospital_name: 'BV Ngoại khoa QT', ward_room: 'Khoa Cấp cứu', required_before: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), clinical_notes: 'Xuất huyết nội do vỡ lách, tình trạng nguy kịch.' },
    { request_code: 'REQ-2025-008', facility_id: facility1!.facility_id, patient_name: 'Bùi Thanh Long', patient_phone: '0922334455', blood_type_id: btB!.blood_type_id, component_id: compPlatelets!.component_id, units_needed: 3, urgency_id: urgHigh!.urgency_id, status_id: statusApproved!.status_id, is_emergency: false, hospital_name: 'BV Huyết học', ward_room: 'Khoa Huyết học, Phòng 201', required_before: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), clinical_notes: 'Sốt xuất huyết nặng, tiểu cầu giảm nghiêm trọng.' },
  ];
  
  for (const req of bloodRequestsData) {
    await prisma.blood_requests.create({ data: req });
  }

  // Blogs
  const catKnowledge = await prisma.blog_categories.findFirst({ where: { slug: 'kien-thuc-hien-mau' }});
  const adminUser = await prisma.users.findFirst({ where: { email: 'admin@hienmau.vn' }});
  
  await prisma.blog_posts.create({
    data: {
      blog_category_id: catKnowledge!.blog_category_id,
      author_user_id: adminUser!.user_id,
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
