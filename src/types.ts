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
  referrerId?: string;
  referralChain?: string[]; // Up to 5 levels
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
  category: string;
  deliveryMethod: string;
  deliveryTime: string;
  status: 'active' | 'sold' | 'inactive';
  isFeatured: boolean;
  createdAt: string;
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
  status: 'pending' | 'delivered' | 'confirmed' | 'disputed' | 'refunded' | 'released';
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
  orderId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface Review {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  rating: number;
  comment: string;
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
}
