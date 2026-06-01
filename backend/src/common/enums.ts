export enum RoleCode {
  GUEST = 'guest',
  MEMBER = 'member',
  STAFF = 'staff',
  MODERATOR = 'moderator',
  FACILITY_ADMIN = 'facility_admin',
  ADMIN = 'admin',
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

export enum RequestStatusCode {
  PENDING = 'pending',
  CHECKING_STOCK = 'checking_stock',
  ALLOCATED_STOCK = 'allocated_stock',
  MATCHING_DONORS = 'matching_donors',
  DONOR_CONTACTED = 'donor_contacted',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  PARTIALLY_FULFILLED = 'partially_fulfilled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
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
