// ===== ENUMS bám sát DB CHECK constraints =====

export enum RoleCode {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  MODERATOR = 'MODERATOR',
  HOSPITAL_STAFF = 'HOSPITAL_STAFF',
  USER = 'USER',
}

export enum Gender {
  MALE = 'M',
  FEMALE = 'F',
  OTHER = 'O',
}

export enum InventoryStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  DISCARDED = 'DISCARDED',
}

export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
  RESERVE = 'RESERVE',
  RELEASE = 'RELEASE',
  ADJUST = 'ADJUST',
  EXPIRE = 'EXPIRE',
}

export enum DonationStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export enum MatchStatus {
  PENDING = 'PENDING',
  CONTACTED = 'CONTACTED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}



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

export enum DestinationType {
  EMAIL = 'email',
  PHONE = 'phone',
}

export enum SystemSettingKey {
  REMINDER_DAYS_BEFORE_ELIGIBLE = 'reminder_days_before_eligible',
  MAX_IMAGE_UPLOAD_SIZE_MB = 'max_image_upload_size_mb',
}
