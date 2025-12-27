/**
 * 🏆 Top Hosts Types
 * FASE 4.1: Types TypeScript para Top Hosts
 */

export interface HostLeaderboard {
  host_id: number;
  avg_rating: number;
  total_bookings: number;
  total_revenue: number;
  total_properties: number;
  host?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface HostRating {
  average_rating: number;
  total_properties: number;
  total_bookings?: number;
  total_revenue?: number;
}

export interface HostBadge {
  id: number;
  host_id: number;
  badge_name: string;
  awarded_by?: number;
  awarded_at: string;
  badge?: {
    name: string;
    description: string;
    icon?: string;
  };
}

export interface HostMetrics {
  host_id: number;
  property_id: number;
  average_rating: number;
  total_bookings: number;
  total_revenue: number;
  occupancy_rate?: number;
  response_time?: number;
  cancellation_rate?: number;
  last_updated: string;
}

export interface HostProfile {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  rating: HostRating;
  badges: HostBadge[];
  metrics: HostMetrics[];
  properties_count: number;
  total_bookings: number;
  total_revenue: number;
  joined_at: string;
}

// DTOs
export interface AwardBadgeDTO {
  badge_name: string;
  awarded_by?: number;
}

