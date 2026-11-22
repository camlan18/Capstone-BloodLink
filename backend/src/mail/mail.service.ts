import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

/**
 * Service dựng template HTML và gửi email nghiệp vụ (OTP xác thực, mật khẩu, kêu gọi hiến máu, liên hệ).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  /**
   * Tạo khung giao diện HTML chuẩn BloodLink bao bọc nội dung và tiêu đề email.
   */
  private getBaseTemplate(title: string, content: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
            color: #334155;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          .header {
            background-color: #991b1b;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            letter-spacing: 0.5px;
          }
          .content {
            padding: 40px 30px;
            line-height: 1.6;
          }
          .otp-box {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
          }
          .otp-code {
            font-size: 32px;
            font-weight: 700;
            color: #991b1b;
            letter-spacing: 4px;
            margin: 0;
          }
          .footer {
            background-color: #f8fafc;
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
          }
          .footer p {
            margin: 0;
            font-size: 13px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>BloodLink System</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>Hệ thống kết nối và quản lý hiến máu thiện nguyện BloodLink</p>
            <p>Email này được tạo tự động, vui lòng không trả lời.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Gửi email chứa mã OTP xác thực tài khoản sau khi người dùng đăng ký.
   */
  async sendVerificationEmail(email: string, otpCode: string, name: string) {
    // Tạo nội dung HTML OTP xác thực 10 phút, bọc khung BloodLink và gửi SMTP (lỗi gửi chỉ ghi log)
    const content = `
      <p>Xin chào <strong>${name}</strong>,</p>
      <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>BloodLink</strong>. Để hoàn tất quá trình đăng ký, vui lòng sử dụng mã xác thực (OTP) dưới đây:</p>
      <div class="otp-box">
        <p class="otp-code">${otpCode}</p>
      </div>
      <p>Mã xác thực này có hiệu lực trong vòng 10 phút. Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.</p>
      <p>Trân trọng,<br>Đội ngũ BloodLink</p>
    `;

    const html = this.getBaseTemplate('Xác thực tài khoản BloodLink', content);

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Xác thực tài khoản đăng ký BloodLink',
        html,
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
    }
  }

  /**
   * Gửi email chứa mã OTP hỗ trợ người dùng đặt lại mật khẩu khi quên mật khẩu.
   */
  async sendForgotPasswordEmail(email: string, otpCode: string) {
    // Dựng template email khôi phục mật khẩu với mã OTP hiệu lực 10 phút và gửi tới người dùng
    const content = `
      <p>Xin chào,</p>
      <p>Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản liên kết với email này tại <strong>BloodLink</strong>. Vui lòng sử dụng mã xác thực (OTP) dưới đây để thiết lập lại mật khẩu:</p>
      <div class="otp-box">
        <p class="otp-code">${otpCode}</p>
      </div>
      <p>Mã xác thực này có hiệu lực trong vòng 10 phút. Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này để đảm bảo an toàn cho tài khoản của bạn.</p>
      <p>Trân trọng,<br>Đội ngũ BloodLink</p>
    `;

    const html = this.getBaseTemplate('Khôi phục mật khẩu BloodLink', content);

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Yêu cầu khôi phục mật khẩu BloodLink',
        html,
      });
      this.logger.log(`Forgot password email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send forgot password email to ${email}`, error);
    }
  }

  /**
   * Gửi email chứa mã OTP xác nhận khi người dùng yêu cầu đổi mật khẩu trong tài khoản.
   */
  async sendChangePasswordEmail(email: string, otpCode: string, name: string) {
    // Gửi email OTP xác nhận thao tác đổi mật khẩu từ trang tài khoản cá nhân
    const content = `
      <p>Xin chào <strong>${name}</strong>,</p>
      <p>Chúng tôi nhận được yêu cầu đổi mật khẩu cho tài khoản liên kết với email này tại <strong>BloodLink</strong>. Vui lòng sử dụng mã xác thực (OTP) dưới đây để thiết lập lại mật khẩu:</p>
      <div class="otp-box">
        <p class="otp-code">${otpCode}</p>
      </div>
      <p>Mã xác thực này có hiệu lực trong vòng 10 phút. Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này để đảm bảo an toàn cho tài khoản của bạn.</p>
      <p>Trân trọng,<br>Đội ngũ BloodLink</p>
    `;

    const html = this.getBaseTemplate('Yêu cầu đổi mật khẩu BloodLink', content);

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Yêu cầu đổi mật khẩu BloodLink',
        html,
      });
      this.logger.log(`Change password email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send change password email to ${email}`, error);
    }
  }
  /**
   * Gửi email kêu gọi người hiến máu phù hợp tham gia hiến máu cho yêu cầu khẩn cấp.
   */
  async sendDonorMatchEmail(email: string, name: string, patientName: string, bloodType: string, facilityName: string, facilityAddress: string) {
    // Gửi email thông báo ca cần máu khẩn kèm thông tin bệnh nhân, nhóm máu và địa chỉ bệnh viện
    const content = `
      <p>Xin chào <strong>${name}</strong>,</p>
      <p>Hệ thống <strong>BloodLink</strong> vừa ghi nhận một yêu cầu máu khẩn cấp và bạn là một trong những người hiến máu phù hợp nhất.</p>
      <div style="background-color: #f1f5f9; padding: 15px; border-left: 4px solid #991b1b; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Bệnh nhân:</strong> ${patientName}</p>
        <p style="margin: 0 0 10px 0;"><strong>Nhóm máu cần:</strong> <span style="color: #991b1b; font-weight: bold;">${bloodType}</span></p>
        <p style="margin: 0 0 10px 0;"><strong>Tại cơ sở:</strong> ${facilityName}</p>
        <p style="margin: 0;"><strong>Địa chỉ:</strong> ${facilityAddress}</p>
      </div>
      <p>Nếu bạn đủ điều kiện sức khỏe và có thể tham gia hiến máu lúc này, vui lòng đăng nhập vào ứng dụng để xác nhận.</p>
      <p>Trân trọng,<br>Đội ngũ BloodLink</p>
    `;

    const html = this.getBaseTemplate('Yêu cầu hiến máu khẩn cấp - BloodLink', content);

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Khẩn cấp: Có bệnh nhân đang cần sự giúp đỡ của bạn - BloodLink',
        html,
      });
      this.logger.log(`Donor match email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send donor match email to ${email}`, error);
    }
  }

  /**
   * Gửi email xác nhận đã tiếp nhận thông tin liên hệ từ người dùng.
   */
  async sendContactEmail(userEmail: string, name: string, subject: string, message: string) {
    // Chuyển đổi ký tự xuống dòng \n thành <br/> rồi gửi email xác nhận đã tiếp nhận liên hệ
    const userContent = `
      <p>Xin chào <strong>${name}</strong>,</p>
      <p>Cảm ơn bạn đã liên hệ với <strong>BloodLink</strong>. Chúng tôi đã nhận được tin nhắn của bạn với nội dung như sau:</p>
      <div style="background-color: #f1f5f9; padding: 15px; border-left: 4px solid #991b1b; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Chủ đề:</strong> ${subject}</p>
        <p style="margin: 0;"><strong>Nội dung:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>
      </div>
      <p>Đội ngũ của chúng tôi sẽ xem xét và phản hồi lại bạn sớm nhất thông qua email hoặc số điện thoại bạn đã cung cấp.</p>
      <p>Trân trọng,<br>Đội ngũ BloodLink</p>
    `;

    const userHtml = this.getBaseTemplate('Chúng tôi đã nhận được liên hệ của bạn - BloodLink', userContent);

    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: 'Xác nhận: Chúng tôi đã nhận được liên hệ của bạn - BloodLink',
        html: userHtml,
      });
      this.logger.log(`Contact confirmation email sent to user ${userEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send contact confirmation email to user ${userEmail}`, error);
    }
  }
}
