'use client';
import React from 'react';
import QRCode from 'react-qr-code';
import { format } from 'date-fns';

export interface CertificateData {
  certificate_no: string;
  donation_id?: number;
  donor_name: string;
  donor_dob?: string | Date | null;
  donor_address?: string | null;
  donor_identity_card?: string | null;
  blood_type?: string | null;
  donation_date: string | Date;
  volume_ml: number;
  facility_id?: number;
  facility_name: string;
  facility_address?: string;
  facility_seal_url?: string | null;
  facility_signature_url?: string | null;
  director_name?: string | null;
  director_title?: string | null;
  issue_date?: string | Date | null;
  cert_status?: string;
  approved_by_name?: string | null;
  approved_at?: string | Date | null;
  seal_number?: string | null;
  reject_reason?: string | null;
}

interface Props {
  data: CertificateData;
  className?: string;
}

// Isolated Print Engine for A4 Landscape Certificate
export const printCertificate = (targetElementId: string = 'vietnamese-blood-certificate') => {
  if (typeof window === 'undefined') return;
  const target = document.getElementById(targetElementId);
  if (!target) {
    window.print();
    return;
  }

  // Remove stale print iframes
  const oldFrame = document.getElementById('certificate-print-iframe');
  if (oldFrame) {
    oldFrame.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'certificate-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.zIndex = '-1';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  // Collect active stylesheets
  const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(el => el.outerHTML)
    .join('\n');

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>Giấy Chứng Nhận Hiến Máu Tình Nguyện</title>
        ${headStyles}
        <style>
          @page {
            size: A4 landscape;
            margin: 6mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 100% !important;
            height: 100% !important;
          }
          .print-wrapper {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2mm 0;
          }
          #vietnamese-blood-certificate {
            width: 278mm !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background-color: #FFFDF9 !important;
          }
        </style>
      </head>
      <body>
        <div class="print-wrapper">
          ${target.outerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      iframe.remove();
    }, 2000);
  }, 400);
};

export const VietnameseBloodCertificate: React.FC<Props> = ({ data, className = '' }) => {
  const isApproved = data.cert_status === 'APPROVED';

  // Format dates
  const donationDateObj = data.donation_date ? new Date(data.donation_date) : new Date();
  const issueDateObj = data.approved_at ? new Date(data.approved_at) : (data.issue_date ? new Date(data.issue_date) : donationDateObj);
  
  const day = format(issueDateObj, 'dd');
  const month = format(issueDateObj, 'MM');
  const year = format(issueDateObj, 'yyyy');

  const dobFormatted = data.donor_dob 
    ? format(new Date(data.donor_dob), 'dd/MM/yyyy')
    : '.../.../......';

  const verificationUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/certificate/${data.donation_id || 1}`
    : `http://localhost:3001/certificate/${data.donation_id || 1}`;

  // Safe normalized Vietnamese strings to avoid accent separation
  const facilityNameNormalized = (data.facility_name || 'BỆNH VIỆN TIẾP NHẬN MÁU').normalize('NFC');
  const donorNameNormalized = (data.donor_name || 'NGƯỜI HIẾN MÁU').normalize('NFC');
  const directorTitleNormalized = (data.director_title || 'KT. GIÁM ĐỐC - PHÓ GIÁM ĐỐC').normalize('NFC');
  const directorNameNormalized = (data.director_name || data.approved_by_name || 'TS. BS. Nguyễn Tri Thức').normalize('NFC');

  return (
    <div className={`overflow-x-auto ${className}`}>
      {/* Set minimum width of 760px to prevent awkward column squeezing and text fragmentation */}
      <div 
        id="vietnamese-blood-certificate"
        className="w-[780px] max-w-full mx-auto bg-[#FFFDF9] p-3 sm:p-4 rounded-xl shadow-md border border-red-200/80 print:shadow-none print:p-0 print:border-none print:w-full blood-certificate-root"
        style={{ fontFamily: "'Times New Roman', Times, 'Merriweather', serif" }}
      >
        {/* 2-Column Song Bản Layout */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 print:grid-cols-2 print:gap-3 print:w-full">
          
          {/* ================= TRANG TRÁI: QUY ĐỊNH & Ý NGHĨA CAO ĐẸP ================= */}
          <div className="bg-[#FFFDF9] border-[3px] border-[#A8101E] p-1 rounded-sm print:border-[2px]">
            <div className="border border-[#A8101E] p-5 h-full flex flex-col justify-between print:p-4">
              
              {/* Top Section */}
              <div className="space-y-5">
                <div className="text-center pt-2">
                  <h2 className="text-xl sm:text-2xl font-black text-[#A8101E] uppercase leading-snug">
                    HIẾN MÁU CỨU NGƯỜI
                  </h2>
                  <h3 className="text-lg sm:text-xl font-bold text-[#A8101E] uppercase mt-1">
                    MỘT NGHĨA CỬ CAO ĐẸP
                  </h3>
                  <div className="w-16 h-0.5 bg-[#A8101E] mx-auto mt-2.5"></div>
                </div>

                <div className="space-y-3.5 text-slate-900 text-sm leading-relaxed">
                  <p className="font-semibold">
                    - Giấy chứng nhận này có giá trị sử dụng trên toàn quốc.
                  </p>
                  <div className="space-y-1.5">
                    <p>- Nếu không may bạn cần phải truyền máu tại các bệnh viện công lập:</p>
                    <p className="pl-4 italic font-medium">
                      + Bạn xuất trình Giấy chứng nhận này.
                    </p>
                    <p className="pl-4 italic font-medium text-[#A8101E]">
                      + Bạn sẽ được truyền máu miễn phí đúng bằng thể tích máu bạn đã hiến.
                    </p>
                  </div>
                  <p className="italic text-slate-800 pt-1">
                    - Nếu bạn khỏe mạnh hãy tiếp tục đến với chúng tôi, nhiều bệnh nhân đang rất cần những giọt máu quý giá của bạn.
                  </p>
                </div>
              </div>

              {/* Bottom Certification Box */}
              <div className="mt-6 pt-3 border-t-2 border-dashed border-[#A8101E]/40">
                <div className="text-center mb-2.5">
                  <h4 className="text-xs sm:text-sm font-bold text-[#A8101E] uppercase">
                    CHỨNG NHẬN CỦA CƠ SỞ Y TẾ
                  </h4>
                  <p className="text-xs font-semibold text-slate-800 uppercase">
                    ĐÃ TIẾP NHẬN TRUYỀN MÁU
                  </p>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-center justify-between border-b border-dotted border-slate-400 pb-1">
                    <span>Ngày ...... tháng ...... năm ......</span>
                    <span>Ký và ghi rõ họ tên</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-dotted border-slate-400 pb-1 pt-1">
                    <span>Số lượng máu: ................. ml</span>
                    <span>(Kèm con dấu)</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ================= TRANG PHẢI: GIẤY CHỨNG NHẬN CHÍNH THỨC ================= */}
          <div className="bg-[#FFFDF9] border-[3px] border-[#A8101E] p-1 rounded-sm relative overflow-hidden print:border-[2px]">
            
            {/* Watermark nếu chưa duyệt */}
            {!isApproved && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                <div className="border-4 border-amber-500/50 rounded-xl px-5 py-2 -rotate-12 bg-white/80 shadow-md">
                  <span className="text-amber-700 font-black text-xl uppercase">
                    {data.cert_status === 'REJECTED' ? 'TỪ CHỐI DUYỆT' : 'ĐANG CHỜ DUYỆT'}
                  </span>
                </div>
              </div>
            )}

            <div className="border border-[#A8101E] p-5 h-full flex flex-col justify-between relative print:p-4">
              
              {/* Header Quốc hiệu & Tiêu ngữ */}
              <div>
                <div className="text-center space-y-0.5 mb-3">
                  <p className="text-xs sm:text-[13px] font-bold text-slate-900 uppercase">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </p>
                  <p className="text-xs sm:text-[13px] font-bold text-slate-800">
                    Độc lập - Tự do - Hạnh phúc
                  </p>
                  <div className="w-20 h-0.5 bg-slate-800 mx-auto mt-1"></div>
                </div>

                {/* Tên Giấy & Cơ Sở */}
                <div className="text-center my-3 space-y-0.5">
                  <h1 className="text-lg sm:text-xl font-black text-[#A8101E] uppercase">
                    GIẤY CHỨNG NHẬN
                  </h1>
                  <h2 className="text-sm sm:text-base font-bold text-[#A8101E] uppercase">
                    HIẾN MÁU TÌNH NGUYỆN
                  </h2>
                  <h3 className="text-xs sm:text-sm font-bold text-[#1E3A8A] uppercase px-1 leading-snug">
                    {facilityNameNormalized}
                  </h3>
                </div>

                {/* Thông tin Người Hiến Máu */}
                <div className="my-4 text-xs sm:text-[13.5px] space-y-1.5 text-slate-800">
                  <div className="text-center font-bold italic mb-1 text-[#A8101E]">
                    Chứng nhận:
                  </div>

                  <div className="flex items-baseline gap-2 border-b border-dotted border-slate-400 pb-0.5">
                    <span className="font-semibold shrink-0">Ông/Bà:</span>
                    <span className="font-bold text-[#A8101E] uppercase text-sm sm:text-[15px]">
                      {donorNameNormalized}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 border-b border-dotted border-slate-400 pb-0.5">
                    <span className="font-semibold shrink-0">Sinh ngày:</span>
                    <span className="font-medium text-slate-900">{dobFormatted}</span>
                  </div>

                  <div className="flex items-baseline gap-2 border-b border-dotted border-slate-400 pb-0.5">
                    <span className="font-semibold shrink-0">Địa chỉ:</span>
                    <span className="font-medium text-slate-900 truncate" title={data.donor_address || ''}>
                      {data.donor_address || 'TP. Cần Thơ / TP. Hồ Chí Minh'}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 border-b border-dotted border-slate-400 pb-0.5">
                    <span className="font-semibold shrink-0">CMND/CCCD:</span>
                    <span className="font-mono font-medium text-slate-900">
                      {data.donor_identity_card || 'Chưa cập nhật'}
                    </span>
                  </div>

                  <div className="pt-1 text-center text-slate-900 font-semibold">
                    Đã hiến máu tình nguyện
                  </div>

                  <div className="border-b border-dotted border-slate-400 pb-0.5 flex items-baseline gap-2">
                    <span className="font-semibold shrink-0">Tại cơ sở:</span>
                    <span className="font-bold text-slate-900 truncate">{facilityNameNormalized}</span>
                  </div>

                  <div className="border-b border-dotted border-slate-400 pb-0.5 flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-semibold">Số lượng:</span>
                      <span className="font-black text-[#A8101E] text-sm sm:text-base">
                        {data.volume_ml} ml
                      </span>
                    </div>
                    {data.blood_type && (
                      <div className="flex items-baseline gap-1">
                        <span className="font-semibold text-slate-600">Nhóm máu:</span>
                        <span className="font-bold font-mono text-blood text-sm">
                          {data.blood_type}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-center italic text-xs text-slate-700 pt-1 font-medium">
                    Người bệnh luôn ghi ơn tấm lòng nhân ái của Ông/Bà.
                  </p>
                </div>
              </div>

              {/* ================= PHẦN KÝ TÊN, ĐÓNG DẤU & SỐ HIỆU ================= */}
              <div className="mt-3 pt-1">
                <div className="flex justify-between items-end">
                  
                  {/* Góc trái: Mã QR Code xác thực & Số văn bản */}
                  <div className="space-y-1 pb-1">
                    <div className="bg-white p-1 rounded border border-slate-300 inline-block shadow-sm">
                      <QRCode value={verificationUrl} size={62} />
                    </div>
                    <div className="font-bold text-[11px] text-slate-800">
                      Số: <span className="font-mono text-[10.5px] text-[#A8101E]">{data.seal_number || data.certificate_no}</span>
                    </div>
                    <div className="text-[9.5px] font-sans text-slate-400">
                      Quét để tra cứu
                    </div>
                  </div>

                  {/* Góc phải: Chức vụ, Dấu mộc đỏ & Chữ ký */}
                  <div className="text-center relative w-56 sm:w-60">
                    <p className="text-xs italic text-slate-700 mb-0.5">
                      Ngày {day} tháng {month} năm {year}
                    </p>
                    <p className="text-xs font-bold text-slate-900 uppercase">
                      {directorTitleNormalized}
                    </p>

                    {/* Vùng đóng dấu & Chữ ký với tỉ lệ nổi bật */}
                    <div className="h-28 relative flex items-center justify-center my-1">
                      
                      {/* Dấu mộc tròn đỏ */}
                      {isApproved ? (
                        data.facility_seal_url ? (
                          <img 
                            src={data.facility_seal_url} 
                            alt="Con dấu bệnh viện" 
                            className="w-32 h-32 object-contain absolute left-2 top-0 pointer-events-none drop-shadow-md z-0"
                          />
                        ) : (
                          /* SVG Dấu mộc tròn chuẩn Bộ Y Tế nếu chưa upload ảnh mộc riêng */
                          <div className="absolute left-2 top-0 w-32 h-32 pointer-events-none drop-shadow-sm select-none z-0">
                            <svg viewBox="0 0 120 120" className="w-full h-full">
                              {/* Vòng ngoài răng cưa bảo an */}
                              <circle cx="60" cy="60" r="57" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeDasharray="3,1" opacity="0.9" />
                              {/* Vòng tròn kép */}
                              <circle cx="60" cy="60" r="52" fill="none" stroke="#dc2626" strokeWidth="2.2" opacity="0.95" />
                              <circle cx="60" cy="60" r="34" fill="none" stroke="#dc2626" strokeWidth="1.2" opacity="0.8" />
                              {/* Ngôi sao trung tâm */}
                              <polygon points="60,49 62.5,56 70,56 64,60.5 66.5,68 60,63.5 53.5,68 56,60.5 50,56 57.5,56" fill="#dc2626" opacity="0.9" />
                              {/* Chữ uốn lượn */}
                              <defs>
                                <path id="sealTopArc" d="M 12 60 A 48 48 0 0 1 108 60" />
                                <path id="sealBottomArc" d="M 108 62 A 48 48 0 0 1 12 62" />
                              </defs>
                              <text fill="#dc2626" fontSize="7" fontWeight="bold" opacity="0.95">
                                <textPath href="#sealTopArc" startOffset="50%" textAnchor="middle">
                                  {facilityNameNormalized.length > 28 ? facilityNameNormalized.substring(0, 28) + '...' : facilityNameNormalized.toUpperCase()}
                                </textPath>
                              </text>
                              <text fill="#dc2626" fontSize="6.5" fontWeight="bold" opacity="0.9">
                                <textPath href="#sealBottomArc" startOffset="50%" textAnchor="middle">
                                  ★ ĐÃ CHỨNG NHẬN ★
                                </textPath>
                              </text>
                            </svg>
                          </div>
                        )
                      ) : null}

                      {/* Chữ ký số / Chữ ký Bác sĩ (lồng vào con dấu) */}
                      {isApproved ? (
                        data.facility_signature_url ? (
                          <img 
                            src={data.facility_signature_url} 
                            alt="Chữ ký bác sĩ" 
                            className="w-44 h-24 object-contain relative z-10 -rotate-3 filter drop-shadow-sm"
                          />
                        ) : (
                          /* SVG Chữ ký nghệ thuật mặc định */
                          <div className="relative z-10 -rotate-6 select-none">
                            <svg className="w-40 h-20 text-[#1E3A8A]" viewBox="0 0 160 70">
                              <path 
                                d="M 15 45 C 30 15, 45 60, 60 25 C 75 5, 80 50, 95 30 C 110 15, 120 40, 145 20" 
                                fill="none" 
                                stroke="#1e3a8a" 
                                strokeWidth="2.5" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                              />
                              <path 
                                d="M 40 55 C 70 58, 120 48, 150 50" 
                                fill="none" 
                                stroke="#1e3a8a" 
                                strokeWidth="1.8" 
                                strokeLinecap="round" 
                              />
                            </svg>
                          </div>
                        )
                      ) : null}
                    </div>

                    {/* Họ tên người ký */}
                    <p className="text-xs font-bold text-slate-900 mt-1">
                      {directorNameNormalized}
                    </p>
                  </div>

                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
export default VietnameseBloodCertificate;
