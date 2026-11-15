// ===== ENUMS bám sát DB CHECK constraints =====

/** Mã vai trò người dùng trong hệ thống phân quyền. */
export enum RoleCode {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  MODERATOR = 'MODERATOR',
  HOSPITAL_STAFF = 'HOSPITAL_STAFF',
  USER = 'USER',
}

/** Giới tính của người dùng / người hiến máu. */
export enum Gender {
  MALE = 'M',
  FEMALE = 'F',
  OTHER = 'O',
}

/** Trạng thái vòng đời của một túi máu trong kho. */
export enum InventoryStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  DISCARDED = 'DISCARDED',
}

/** Loại giao dịch biến động kho máu (nhập, xuất, giữ chỗ, giải phóng, điều chỉnh, hết hạn). */
export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
  RESERVE = 'RESERVE',
  RELEASE = 'RELEASE',
  ADJUST = 'ADJUST',
  EXPIRE = 'EXPIRE',
}

/** Trạng thái của lịch hẹn hoặc lượt hiến máu. */
export enum DonationStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

/** Trạng thái ghép nối người hiến máu với yêu cầu cần máu. */
export enum MatchStatus {
  PENDING = 'PENDING',
  CONTACTED = 'CONTACTED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}



/** Mã loại mục đích xác thực OTP trong bảng xác thực. */
export enum OtpTypeCode {
  REGISTER_VERIFY = 'register_verify',
  LOGIN_VERIFY = 'login_verify',
  RESET_PASSWORD = 'reset_password',
  CHANGE_PASSWORD = 'change_password',
  CHANGE_EMAIL = 'change_email',
  CHANGE_PHONE = 'change_phone',
  CONFIRM_EMERGENCY = 'confirm_emergency_request',
  CONFIRM_DONATION = 'confirm_donation',
  DELETE_ACCOUNT = 'delete_account',
}

/** Kênh nhận mã OTP (email hoặc số điện thoại). */
export enum DestinationType {
  EMAIL = 'email',
  PHONE = 'phone',
}

/** Các khóa cấu hình hệ thống động lưu trong `system_settings`. */
export enum SystemSettingKey {
  REMINDER_DAYS_BEFORE_ELIGIBLE = 'reminder_days_before_eligible',
  MAX_IMAGE_UPLOAD_SIZE_MB = 'max_image_upload_size_mb',
}
