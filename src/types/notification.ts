/**
 * notification.ts
 * Type definitions for in-app, audio, push, and WhatsApp notifications.
 */

export type NotificationType =
  | 'transaction_income'   // ₹ जमा (Income / Subscription / Donation) - GPay style
  | 'transaction_expense'  // ₹ खर्च (Expense)
  | 'task_assigned'        // 📋 नवीन जबाबदारी / काम
  | 'task_obstacle'        // ⚠️ कामात अडचण / समस्या
  | 'task_status'          // 🔄 कामाचा दर्जा बदल
  | 'profile_update'       // 👤 प्रोफाइल बदल / नवीन पावती प्रोफाइलवर
  | 'settlement'           // 🏦 कॅश सेटलमेंट / भरणा
  | 'suggestion'           // 💡 सूचना / प्रतिसाद
  | 'poll_created'         // 🗳️ नवीन मतदान / चर्चा पोल
  | 'poll_decided'         // 🏆 मतदानाचा अंतिम निर्णय
  | 'system'               // ⚙️ प्रणाली / वैशिष्ट्ये बदल सूचना
  | 'general';             // 📢 सर्वसाधारण सूचना

export type NotificationFilter = 'all' | 'transactions' | 'tasks' | 'profile';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  amount?: number;
  depositorName?: string;
  recipientName?: string;
  memberId?: string;
  memberName?: string;
  memberPhone?: string;
  transactionId?: string;
  receiptNo?: string;
  occasionId?: string;
  occasionName?: string;
  taskId?: string;
  taskTitle?: string;
  targetTab?: string;
  isRead: boolean;
  createdAt: string; // ISO string
  whatsAppMessage?: string; // Pre-formatted WhatsApp text
  priority?: 'high' | 'normal' | 'low';
}
