export type UserRole = 'buyer' | 'seller' | 'influencer' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  availableBalance: number;
  escrowBalance: number;
  withdrawableBalance: number;
  isSuspended: boolean;
  isVerified: boolean;
  trustScore: number; // 0-100
  responseTime?: string; // e.g. "2 hours"
  referrerId?: string;
  referralChain?: string[]; // Up to 5 levels
  image_url?: string;
  createdAt: string;
  lastSeen?: string;
  fcmToken?: string | null;
}

export interface PublicProfile {
  uid: string;
  displayName: string;
  role: UserRole;
  isVerified: boolean;
  trustScore: number;
  responseTime?: string;
  image_url?: string;
  createdAt: string;
  lastSeen?: string;
  fcmToken?: string | null;
}

// ... existing interfaces ...

export interface Dispute {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  reason: 'seller_not_delivered' | 'wrong_account' | 'refund_not_processed' | 'buyer_scam' | 'work_not_completed' | 'access_revoked' | 'other';
  status: 'open' | 'resolved' | 'closed';
  adminDecision?: 'release' | 'refund' | 'split' | 'cancel';
  adminReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  disputeId: string;
  userId: string;
  type: 'screenshot' | 'login_proof' | 'video_proof' | 'transaction_proof' | 'refund_proof' | 'appeal';
  url: string;
  description?: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  orderId: string;
  type: string;
  description: string;
  userId?: string;
  createdAt: string;
}

export interface InfluencerProfile {
  uid: string;
  username: string;
  totalReferrals: number;
  totalSales: number;
  totalVolume: number;
  totalEarnings: number;
  pendingEarnings: number;
  withdrawnBalance: number;
  clicks: number;
  rank: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'VIP';
  levelEarnings: {
    [key: string]: number; // Level 1, 2, 3, 4, 5
  };
}

export interface Referral {
  id: string;
  influencerId: string;
  referredUserId: string;
  referredUserEmail: string;
  level: number;
  createdAt: string;
}

export interface Commission {
  id: string;
  orderId: string;
  influencerId: string;
  amount: number;
  level: number;
  status: 'pending' | 'approved' | 'paid';
  createdAt: string;
}

export interface VideoPromotion {
  id: string;
  influencerId: string;
  influencerName: string;
  url: string;
  title: string;
  platform: 'YouTube' | 'TikTok' | 'Instagram' | 'Twitter' | 'Facebook';
  description: string;
  views: number;
  bonusEarned: number;
  referralSales: number;
  status: 'pending' | 'approved' | 'rejected';
  bonusStatus: 'locked' | 'unlocked' | 'paid';
  createdAt: string;
  updatedAt: string;
}

export interface Listing {
  id: string;
  sellerId: string;
  sellerName?: string;
  sellerIsVerified?: boolean;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  discountedPrice?: number;
  isFlashSale?: boolean;
  flashSaleEndsAt?: string;
  image_url?: string;
  category: string;
  deliveryMethod: string;
  deliveryTime: string;
  status: 'active' | 'sold' | 'inactive';
  isFeatured: boolean;
  createdAt: string;
  serviceType: 'fixed' | 'percentage' | 'refund_percentage' | 'va_service' | 'security_deposit';
  percentageRate?: number;
  minRefundAmount?: number;
  maxRefundAmount?: number;
  securityDepositAmount?: number;
  requireSellerApproval?: boolean;
  vaMonthlyPrice?: number;
  vaSalesPercentage?: number;
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  listingTitle: string;
  amount: number;
  escrowFee: number;
  featuredFee?: number;
  status: 'pending_payment' | 'pending_seller_approval' | 'active' | 'in_progress' | 'delivered' | 'completed' | 'cancelled' | 'disputed';
  orderType: 'fixed' | 'percentage_refund' | 'percentage_work' | 'security_deposit' | 'va_service';
  deliveryDetails?: string;
  disputeReason?: string;
  adminDecision?: string;
  commissionDistributed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Deposit {
  id: string;
  userId: string;
  userEmail?: string;
  amount: number;
  txid: string;
  network: 'TRC20' | 'ERC20' | 'BEP20';
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  userEmail?: string;
  amount: number;
  walletAddress: string;
  network: 'TRC20' | 'ERC20' | 'BEP20';
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
}

export interface Message {
  id: string;
  orderId?: string;
  listingId?: string;
  senderId: string;
  text?: string;
  type: 'text' | 'image' | 'video' | 'file' | 'voice';
  url?: string;
  audio?: string;
  createdAt: string;
  participants: string[];
  status?: 'sent' | 'delivered' | 'seen';
}

export interface Review {
  id: string;
  orderId: string;
  fromId: string;
  toId: string;
  fromName?: string;
  rating: number;
  comment: string;
  type: 'buyer_to_seller' | 'seller_to_buyer';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'message' | 'order' | 'listing' | 'system';
  relatedId?: string;
  read: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  lastMessage: string;
  status: 'open' | 'closed';
  unreadByAdmin: boolean;
  unreadByUser: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface PlatformSettings {
  adminWalletTRC20: string;
  adminWalletERC20: string;
  adminWalletBEP20: string;
  marketplaceFeePercent: number;
  announcement: string;
  minWithdrawal: number;
  referralCommissionLevels: {
    [level: number]: number;
  };
  videoBonusStructure: {
    [views: number]: number;
  };
  bannerTitle?: string;
  bannerSubtitle?: string;
  bannerImageUrl?: string;
}
