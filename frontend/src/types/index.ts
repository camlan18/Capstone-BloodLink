export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface User {
  user_id: number;
  username: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  blood_type_id?: number;
  role: {
    role_code: string;
    role_name: string;
  };
}

export interface DonorProfile {
  donor_id: number;
  user_id: number;
  blood_type_id: number;
  identity_card: string;
  date_of_birth: string;
  gender: 'M' | 'F' | 'O';
  phone_number: string;
  address: string;
  total_donations: number;
  last_donation_date?: string;
  is_eligible: boolean;
  weight_kg?: number;
  height_cm?: number;
  health_notes?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  blood_type?: {
    blood_type_id: number;
    blood_group: string;
    rh_factor: string;
  };
}

export interface EducationDocument {
  document_id: number;
  category_id: number;
  title: string;
  slug: string;
  summary: string;
  content_html: string;
  thumbnail_url?: string;
  view_count: number;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  category?: {
    category_id: number;
    category_name: string;
  };
}

export interface BloodRequest {
  request_id: number;
  facility_id: number;
  blood_type_id: number;
  quantity_ml: number;
  urgency_level: 'NORMAL' | 'URGENT' | 'CRITICAL';
  status: 'PENDING' | 'APPROVED' | 'FULFILLED' | 'CANCELLED';
  required_date: string;
  notes?: string;
  facility?: {
    facility_id: number;
    facility_name: string;
  };
  blood_type?: {
    blood_type_id: number;
    blood_group: string;
    rh_factor: string;
  };
}

export interface DonationSlot {
  slot_id: number;
  facility_id: number;
  date: string;
  start_time: string;
  end_time: string;
  max_donors: number;
  current_donors: number;
  status: string;
  facility?: {
    facility_id: number;
    facility_name: string;
    address: string;
  };
}

export interface DonationHistory {
  donation_id: number;
  donor_id: number;
  facility_id: number;
  donation_date: string;
  volume_ml: number;
  status: string;
  facility?: {
    facility_name: string;
  };
}

export interface BlogCategory {
  blog_category_id: number;
  category_name: string;
  slug: string;
}

export interface BlogPost {
  post_id: number;
  blog_category_id: number;
  author_user_id: number;
  title: string;
  slug: string;
  summary: string;
  content_html: string;
  thumbnail_url?: string;
  view_count: number;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  category?: BlogCategory;
  author?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface BlogComment {
  comment_id: number;
  post_id: number;
  user_id?: number;
  guest_name?: string;
  content: string;
  parent_comment_id?: number;
  is_approved: boolean;
  created_at: string;
  user?: {
    full_name: string;
    avatar_url?: string;
  };
  replies?: BlogComment[];
}
