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
  | 'कार्याध्यक्ष'
  | 'उपाध्यक्ष'
  | 'सचिव'
  | 'खजिनदार'
  | 'उपखजिनदार'
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
}

export interface OccasionEvent {
  id: string;
  name: string; // e.g., गणेशोत्सव २०२६
  year: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface EventGalleryImage {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  dateStr?: string;
  description?: string;
  year?: string;
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
  paymentReference?: string; // UPI ID, Bank Ref, Cheque No
  receiptNumber?: string;
  attachmentUrl?: string; // Proof image or doc
  notes?: string;
  financialYear: string; // e.g., '2026-2027'
  createdBy: string; // Admin / Treasurer name
  createdAt: string; // Full system timestamp ISO or formatted
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
}

export interface CurrentUser {
  name: string;
  role: UserDesignation;
  phone?: string;
  isLoggedIn?: boolean;
  birthDate?: string;
  email?: string;
  age?: number;
}

export interface FinancialYearSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  totalSubscriptionsCollected: number;
  totalDonationsCollected: number;
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
}
