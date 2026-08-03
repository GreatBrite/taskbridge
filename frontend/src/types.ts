export type Role = 'customer' | 'contractor' | 'both' | 'admin';
export type JobStatus = 'draft' | 'published' | 'offer_received' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export type User = {
  id: number;
  telegram_id: number;
  username?: string | null;
  first_name?: string | null;
  language_code: string;
  role: Role;
  city: string;
  contractor_profile?: ContractorProfile | null;
};

export type ContractorProfile = {
  categories: string[];
  districts: string[];
  languages: string[];
  description: string;
  is_active: boolean;
  is_verified: boolean;
  rating: number;
  completed_jobs: number;
};

export type Job = {
  id: number;
  customer_id: number;
  category: string;
  title: string;
  description: string;
  city: string;
  district: string;
  time_window: string;
  budget: string;
  currency: string;
  status: JobStatus;
  structured_brief: Record<string, unknown>;
  missing_fields: string[];
  selected_offer_id: number | null;
  created_at: string;
};

export type Offer = {
  id: number;
  job_id: number;
  contractor_id: number;
  price: string;
  eta: string;
  text: string;
  translated_text: string;
  target_lang: string;
  status: 'pending' | 'selected' | 'declined';
  created_at: string;
};

export type Chat = {
  id: number;
  job_id: number;
  customer_id: number;
  contractor_id: number;
  created_at: string;
};

export type Message = {
  id: number;
  chat_id: number;
  sender_id: number;
  original_text: string;
  original_lang: string;
  translated_text: string;
  target_lang: string;
  created_at: string;
};
