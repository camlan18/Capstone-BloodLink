import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

export async function seedLocations(prisma: PrismaClient) {
  const dataPath = path.join(__dirname, 'provinces-data-v2.json');
  let data: any = null;

  if (fs.existsSync(dataPath)) {
    console.log('Đọc dữ liệu địa giới hành chính từ file local provinces-data-v2.json...');
    data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } else {
    console.log('Tải dữ liệu địa giới hành chính từ API v2 (chỉ chạy 1 lần)...');
    data = await new Promise((resolve, reject) => {
      https.get('https://provinces.open-api.vn/api/v2/?depth=2', (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(rawData);
            fs.writeFileSync(dataPath, rawData, 'utf8');
            resolve(parsedData);
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', (e) => reject(e));
    });
  }

  console.log('Bắt đầu seed Tỉnh/Thành phố, Phường/Xã (Vui lòng đợi vài phút)...');
  
  for (const p of data) {
    const province = await prisma.provinces.create({
      data: {
        province_code: p.code.toString(),
        province_name: p.name,
      }
    });

    if (p.wards && p.wards.length > 0) {
      const wardsData = p.wards.map((w: any) => ({
        province_id: province.province_id,
        ward_name: w.name,
      }));
      await prisma.wards.createMany({
        data: wardsData
      });
    }
  }
  console.log('Hoàn thành seed dữ liệu địa giới hành chính.');
}
