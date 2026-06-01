import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

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

  async sendVerificationEmail(email: string, otpCode: string, name: string) {
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

  async sendForgotPasswordEmail(email: string, otpCode: string) {
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

  async sendChangePasswordEmail(email: string, otpCode: string, name: string) {
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
}
