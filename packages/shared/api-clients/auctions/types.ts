/**
 * Tipos TypeScript para o Módulo de Leilões
 * FASE 1.2: Definições de tipos e interfaces
 */

export interface Auction {
  id: string;
  property_id: number;
  property: {
    id: number;
    title: string;
    location: string;
    city?: string;
    state?: string;
    images: string[];
    amenities: string[];
    bedrooms?: number;
    bathrooms?: number;
    max_guests?: number;
  };
  start_price: number;
  current_bid: number;
  min_increment: number;
  start_time: string;
  end_time: string;
  extended_time?: string;
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  winner_id?: number;
  winner?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
  bids_count: number;
  participants_count: number;
  check_in: string;
  check_out: string;
  max_guests: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Bid {
  id: string;
  auction_id: string;
  user_id: number;
  user: {
    id: number;
    name: string;
    avatar?: string;
  };
  amount: number;
  is_auto_bid: boolean;
  max_amount?: number;
  created_at: string;
}

export interface AuctionFilters {
  status?: 'scheduled' | 'active' | 'ended';
  city?: string;
  state?: string;
  min_price?: number;
  max_price?: number;
  check_in?: string;
  check_out?: string;
  page?: number;
  limit?: number;
  sort_by?: 'price' | 'time' | 'popularity';
  sort_order?: 'asc' | 'desc';
}

export interface CreateAuctionData {
  property_id: number;
  start_price: number;
  min_increment: number;
  start_time: string;
  end_time: string;
  check_in: string;
  check_out: string;
  max_guests: number;
  description?: string;
}

export interface PaymentData {
  payment_method: 'credit_card' | 'pix' | 'debit' | 'paypal';
  card_data?: {
    number: string;
    expiry: string;
    cvv: string;
    name: string;
    installments?: number;
  };
  pix_data?: {
    cpf?: string;
    email?: string;
  };
}

export interface PaymentResult {
  success: boolean;
  payment_id: string;
  booking_id?: string;
  message?: string;
}

export interface AuctionStats {
  total_auctions: number;
  active_auctions: number;
  ended_auctions: number;
  total_revenue: number;
  average_bid: number;
}

