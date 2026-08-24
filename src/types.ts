export type DepositorType =
  | 'सभासद'
  | 'माजी सभासद'
  | 'व्यक्ती / देणगीदार'
  | 'संस्था'
  | 'व्यवसाय / दुकान'
  | 'प्रायोजक'
  | 'अज्ञात / नाव न सांगणारे'
  | 'इतर';

export type IncomeType =
  | 'सभासद वर्गणी'
  | 'सभासदाकडून अतिरिक्त देणगी'
  | 'इतर व्यक्तीकडून देणगी'
  | 'संस्था देणगी / मदत'
  | 'दुकान / व्यवसाय प्रायोजक'
  | 'प्रायोजक'
  | 'कार्यक्रमातून जमा'
  | 'सार्वजनिक देणगी'
  | 'बँक व्याज'
  | 'इतर उत्पन्न'
  | string;

export type RecipientType =
  | 'सभासद'
  | 'व्यक्ती'
  | 'दुकान / Vendor'
  | 'संस्था'
  | 'सेवा पुरवठादार'
  | 'इतर';

export type ExpenseCategory =
  | 'मंडप व सजावट'
  | 'ध्वनी व प्रकाश'
  | 'महाप्रसाद व भोजन'
  | 'पूजा साहित्य व धार्मिक'
  | 'जाहिरात व बॅनर'
  | 'परवानग्या व शासकीय'
  | 'बक्षीस व सन्मान'
  | 'वीज व पाणी'
  | 'वाहतूक खर्च'
  | 'इतर खर्च'
  | string;

export type PaymentMethod =
  | 'रोख'
  | 'UPI'
  | 'बँक ट्रान्सफर'
  | 'चेक'
  | 'इतर';

export type ApprovalStatus = 'प्रलंबित' | 'मंजूर' | 'रद्द';

export type UserDesignation =
  | 'अध्यक्ष'
  | 'उपाध्यक्ष'
  | 'कार्याध्यक्ष'
  | 'सचिव'
  | 'उपसचिव'
  | 'खजिनदार'
  | 'उपखजिनदार'
  | 'संघटक'
  | 'सहसंघटक'
  | 'सल्लागार'
  | 'कार्या सल्लागार'
  | 'सभासद'
  | 'ॲडमिन'
  | string;

export interface Member {
  id: string;
  memberCode: string; // e.g. M-101
  fullName: string;
  designation?: string; // e.g. 'अध्यक्ष', 'उपाध्यक्ष', 'सचिव', 'खजिनदार', 'उपखजिनदार', 'सभासद'
  phone: string;
  annualTargetAmount: number; // Defaults to 6000
  address?: string;
  isActive: boolean;
  birthDate?: string; // जन्मतारीख YYYY-MM-DD
  email?: string; // ई-मेल आयडी
  age?: number; // वय
  password?: string; // सभासद / खात्याचा पासवर्ड
  photoUrl?: string; // Member profile photo URL
  createdAt?: string;
  updatedAt?: string;
}

export type TaskStatus = 'प्रलंबित' | 'प्रक्रियेत' | 'पूर्ण' | 'अडचण / समस्या';

export interface TaskSuggestion {
  id: string;
  memberName: string;
  memberRole?: string;
  suggestionText: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role?: string;
  phone?: string;
}

export interface TaskProgressUpdate {
  id: string;
  memberName: string;
  memberRole?: string;
  progressNote: string;
  createdAt: string;
}

export interface EventTask {
  id: string;
  taskTitle: string; // e.g. "मंडप व सजावट नियोजन"
  assignedMemberId?: string;
  assignedMemberName: string;
  assignedMemberRole?: string;
  assignedMemberPhone?: string;
  teamMembers?: TeamMember[]; // List of additional team members assigned under this task manager
  status: TaskStatus;
  notes?: string;
  obstacleDetails?: string; // Obstacle / Issue description when status is 'अडचण / समस्या'
  suggestions?: TaskSuggestion[]; // List of suggestions posted by committee members
  progressUpdates?: TaskProgressUpdate[]; // Chronological log of progress updates added by associated members
}

export interface OccasionEvent {
  id: string;
  name: string; // e.g., गणेशोत्सव २०२६
  year: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  bannerUrl?: string;
  workDetails?: string; // कामाचे स्वरूप / जबाबदारी
  responsiblePerson?: string; // प्रमुख / जबाबदार व्यक्ती
  tasks?: EventTask[]; // Multiple works/tasks per event
  createdAt?: string;
  updatedAt?: string;
}

export interface EventGalleryImage {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  dateStr?: string;
  description?: string;
  googleDriveUrl?: string; // Link to Google Drive folder containing more photos
  year?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IncomeTransaction {
  id: string;
  transactionNo: string; // MG-2026-001
  amount: number;
  transactionDate: string; // YYYY-MM-DD - Actual payment date
  depositorType: DepositorType;
  depositorName: string; // Defaults to 'अज्ञात देणगीदार' if anonymous
  linkedMemberId?: string; // Optional member reference
  linkedMemberName?: string;
  incomeType: IncomeType;
  occasionId?: string;
  occasionName?: string;
  reason: string;
  paymentMethod: PaymentMethod;
  cashReceiverMemberId?: string; // ID of member who received cash (when paymentMethod is 'रोख')
  cashReceiverName?: string; // Name of member who received cash
  paymentReference?: string; // UPI ID, Bank Ref, Cheque No
  receiptNumber?: string;
  receiptBookNo?: string; // e.g. "1", "2", "3" (पावती पुस्तक क्र.)
  receiptSerialNo?: string; // e.g. "1", "2", "3", "4" (पावती अनुक्रमांक)
  isPhysicalReceipt?: boolean; // true if entered from physical receipt book
  attachmentUrl?: string; // Proof image or doc
  notes?: string;
  financialYear: string; // e.g., '2026-2027'
  approvalStatus?: ApprovalStatus;
  approvedBy?: string; // Name of approver (Treasurer / Vice Treasurer / Admin)
  approvedByRole?: UserDesignation; // Role of approver
  approvedAt?: string; // Timestamp when approved
  createdBy: string; // Admin / Treasurer name
  createdAt: string; // Full system timestamp ISO or formatted
  updatedAt?: string;
}

export interface ExpenseTransaction {
  id: string;
  transactionNo: string; // EXP-2026-001
  amount: number;
  expenseDate: string; // YYYY-MM-DD - Actual expense date
  recipientType: RecipientType;
  recipientName: string; // Vendor / Person name
  linkedMemberId?: string;
  expenseCategory: ExpenseCategory;
  occasionId?: string;
  occasionName?: string;
  reason: string;
  description?: string;
  paymentMethod: PaymentMethod;
  paidByMemberId?: string; // ID of member who paid from their cash-in-hand
  paidByMemberName?: string; // Name of member who paid from cash-in-hand
  isPaidFromCashInHand?: boolean; // Flag indicating expense was paid directly from collected cash
  paymentReference?: string;
  billNumber?: string;
  attachmentUrl?: string;
  notes?: string;
  financialYear: string;
  approvalStatus: ApprovalStatus;
  approvedBy?: string; // Name of approver
  approvedByRole?: UserDesignation; // Role of approver (अध्यक्ष/खजिनदार/सचिव)
  approvedAt?: string; // Timestamp when approved
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CurrentUser {
  name: string;
  role: UserDesignation;
  phone?: string;
  isLoggedIn?: boolean;
  birthDate?: string;
  email?: string;
  age?: number;
  photoUrl?: string;
}

export interface FinancialYearSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  totalSubscriptionsCollected: number;
  totalDonationsCollected: number;
  totalOnlineIncome: number;
  totalCashIncome: number;
  pendingExpensesCount: number;
  approvedExpensesTotal: number;
}

export interface MemberSuggestion {
  id: string;
  suggestionNo: string;
  memberId?: string;
  memberName: string;
  memberPhone?: string;
  memberRole?: string;
  category: string;
  title: string;
  description: string;
  status: 'नवीन' | 'प्रक्रियेत' | 'स्वीकृत' | 'पूर्ण';
  recipientRoles: string[];
  adminReply?: string;
  repliedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StoredImageRecord {
  id: string;
  url: string; // Base64 data URL or remote cloud URL
  entityId?: string; // Reference to member ID, occasion ID, gallery item ID
  entityType: 'profile' | 'event' | 'gallery' | 'logo' | 'other';
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type CashSettlementDestination = 'ट्रस्ट बँक खाते' | 'खजिनदार / उपखजिनदार' | string;

export interface CashSettlement {
  id: string;
  settlementNo?: string;
  memberId: string;
  memberName: string;
  amount: number;
  depositDate: string; // YYYY-MM-DD
  destination: CashSettlementDestination;
  bankRefNo?: string;
  slipPhotoUrl?: string;
  notes?: string;
  financialYear: string;
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedByRole?: UserDesignation;
  approvedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export type PollTargetAudience = 'COMMITTEE_ONLY' | 'ALL_MEMBERS';

export type PollStatus = 'सक्रिय' | 'बंद' | 'निकाली';

export interface PollOption {
  id: string;
  text: string;
  color?: string;
}

export interface PollVote {
  memberId: string;
  memberName: string;
  memberRole?: string;
  optionId: string;
  votedAt: string;
  comment?: string;
}

export interface Poll {
  id: string;
  pollNo: string;
  title: string;
  description?: string;
  category: string; // 'निर्णय / ठराव' | 'नवीन चर्चा' | 'उत्सव नियोजन' | 'खर्च / अंदाजपत्रक' | 'इतर'
  targetAudience: PollTargetAudience; // 'COMMITTEE_ONLY' | 'ALL_MEMBERS'
  options: PollOption[];
  votes: PollVote[];
  status: PollStatus;
  createdByMemberId?: string;
  createdByName: string;
  createdByRole?: string;
  createdAt: string;
  expiresAt?: string; // Optional expiry date YYYY-MM-DD or ISO string
  allowChangeVote?: boolean;
  finalDecision?: string; // अधिकृत निर्णय / निकाल
  finalDecisionBy?: string;
  finalDecisionByRole?: string;
  finalDecisionAt?: string;
  updatedAt?: string;
}

