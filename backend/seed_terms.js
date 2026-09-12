const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.system_settings.upsert({
    where: { setting_key: 'DONATION_TERMS_HTML' },
    update: {},
    create: {
      setting_key: 'DONATION_TERMS_HTML',
      setting_value: '<div><h3 style="color: #b91c1c; font-weight: bold; margin-bottom: 10px;">Tiêu chuẩn tham gia hiến máu</h3><ul style="list-style-type: disc; margin-left: 20px; line-height: 1.6;"><li>Người khỏe mạnh từ đủ 18 tuổi đến 60 tuổi.</li><li>Cân nặng ít nhất 42 kg đối với nữ và 45 kg đối với nam.</li><li>Không bị nhiễm hoặc không có các hành vi lây nhiễm bệnh HIV, viêm gan B, viêm gan C, và các bệnh lây truyền qua đường máu khác.</li><li>Thời gian tối thiểu giữa 2 lần hiến máu là 12 tuần (84 ngày).</li></ul><h3 style="color: #b91c1c; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">Lưu ý trước khi hiến máu</h3><ul style="list-style-type: disc; margin-left: 20px; line-height: 1.6;"><li>Không thức khuya, ngủ đủ giấc đêm trước ngày hiến máu.</li><li>Không uống rượu bia, không dùng chất kích thích.</li><li>Nên ăn nhẹ trước khi hiến (không ăn đồ nhiều dầu mỡ).</li><li>Mang theo CCCD/CMND khi đi hiến máu.</li></ul></div>',
      description: 'Nội dung quy định hiến máu (HTML) hiển thị ở popup đăng ký'
    }
  });
  console.log('Seeded terms HTML');
}
main().catch(console.error).finally(() => prisma.$disconnect());
