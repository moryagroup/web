/**
 * emailService.ts
 * Daily, Monthly & Yearly Transaction Email Reporting Engine for moryagroupdata@gmail.com
 * Formats daily itemized transactions, monthly summaries, and yearly totals.
 * Sends email ONLY if transactions occurred on that day.
 */

import { IncomeTransaction, ExpenseTransaction } from '../types';

export const TARGET_EMAIL = 'moryagroupdata@gmail.com';
const LAST_SENT_KEY = 'morya_last_email_sent_date_v1';

export interface DailyReportResult {
  success: boolean;
  reason?: 'NO_TRANSACTIONS' | 'ALREADY_SENT' | 'ERROR' | 'SENT';
  message: string;
  todayIncomeTotal: number;
  todayExpenseTotal: number;
  todayCount: number;
  monthIncomeTotal: number;
  monthExpenseTotal: number;
  yearIncomeTotal: number;
  yearExpenseTotal: number;
}

/**
 * Checks if a date string corresponds to today's local date (YYYY-MM-DD)
 */
export function isTodayDate(dateStr?: string): boolean {
  if (!dateStr) return false;
  const todayStr = new Date().toISOString().split('T')[0];
  return dateStr === todayStr;
}

/**
 * Calculates financial metrics for today, current month, and current calendar year.
 */
export function calculateReportMetrics(
  incomes: IncomeTransaction[],
  expenses: ExpenseTransaction[]
) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
  const currentYearStr = todayStr.substring(0, 4); // YYYY

  // Today's transactions
  const todayIncomes = incomes.filter((i) => i.transactionDate === todayStr);
  const todayExpenses = expenses.filter((e) => e.expenseDate === todayStr);

  const todayIncomeTotal = todayIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);
  const todayExpenseTotal = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const todayCount = todayIncomes.length + todayExpenses.length;

  // Current Month's transactions
  const monthIncomes = incomes.filter((i) => i.transactionDate && i.transactionDate.startsWith(currentMonthStr));
  const monthExpenses = expenses.filter((e) => e.expenseDate && e.expenseDate.startsWith(currentMonthStr));

  const monthIncomeTotal = monthIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);
  const monthExpenseTotal = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Current Calendar Year's transactions
  const yearIncomes = incomes.filter((i) => i.transactionDate && i.transactionDate.startsWith(currentYearStr));
  const yearExpenses = expenses.filter((e) => e.expenseDate && e.expenseDate.startsWith(currentYearStr));

  const yearIncomeTotal = yearIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);
  const yearExpenseTotal = yearExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return {
    todayStr,
    todayIncomes,
    todayExpenses,
    todayIncomeTotal,
    todayExpenseTotal,
    todayCount,
    monthIncomeTotal,
    monthExpenseTotal,
    yearIncomeTotal,
    yearExpenseTotal,
  };
}

/**
 * Checks if an email report has already been dispatched today.
 */
export function isReportAlreadySentToday(): boolean {
  try {
    const lastSent = localStorage.getItem(LAST_SENT_KEY);
    const todayStr = new Date().toISOString().split('T')[0];
    return lastSent === todayStr;
  } catch {
    return false;
  }
}

/**
 * Marks today's email report as dispatched in LocalStorage.
 */
export function markReportSentToday(): void {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem(LAST_SENT_KEY, todayStr);
  } catch (err) {
    console.error('Failed to save email sent date:', err);
  }
}

/**
 * Prepares formatted text body for daily email report.
 */
export function formatEmailReportContent(
  incomes: IncomeTransaction[],
  expenses: ExpenseTransaction[]
) {
  const metrics = calculateReportMetrics(incomes, expenses);
  const dateFormatted = new Date().toLocaleDateString('mr-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const subject = `[मोरया ग्रुप] दैनिक जमा-खर्च अहवाल (${metrics.todayStr}) - ${dateFormatted}`;

  let body = `नमस्कार,\n\nमोरया ग्रुप मित्र मंडळ (ट्रस्ट) - दैनिक जमा व खर्च अहवाल\nदिनांक: ${dateFormatted} (${metrics.todayStr})\n\n`;

  body += `=========================================\n`;
  body += `१. आजचा दैनिक जमा-खर्च (Daily Summary)\n`;
  body += `=========================================\n`;
  body += `• आजचा जमा: ₹${metrics.todayIncomeTotal.toLocaleString('en-IN')}\n`;
  body += `• आजचा खर्च: ₹${metrics.todayExpenseTotal.toLocaleString('en-IN')}\n`;
  body += `• आजची शिल्लक/फरक: ₹${(metrics.todayIncomeTotal - metrics.todayExpenseTotal).toLocaleString('en-IN')}\n`;
  body += `• आजच्या एकूण नोंदी: ${metrics.todayCount}\n\n`;

  if (metrics.todayIncomes.length > 0) {
    body += `--- आजच्या जमा नोंदी ---\n`;
    metrics.todayIncomes.forEach((i, idx) => {
      body += `${idx + 1}. ${i.payerName} | ₹${i.amount} | ${i.incomeType} | ${i.paymentMode || 'रोख'}${
        i.receiptNo ? ` (पावती #${i.receiptNo})` : ''
      }\n`;
    });
    body += `\n`;
  }

  if (metrics.todayExpenses.length > 0) {
    body += `--- आजच्या खर्च नोंदी ---\n`;
    metrics.todayExpenses.forEach((e, idx) => {
      body += `${idx + 1}. ${e.title} | ₹${e.amount} | श्रेणी: ${e.category} | दर्जा: ${e.approvalStatus}\n`;
    });
    body += `\n`;
  }

  body += `=========================================\n`;
  body += `२. या चालू महिन्याचा जमा-खर्च (Monthly Total)\n`;
  body += `=========================================\n`;
  body += `• या महिन्यातील एकूण जमा: ₹${metrics.monthIncomeTotal.toLocaleString('en-IN')}\n`;
  body += `• या महिन्यातील एकूण खर्च: ₹${metrics.monthExpenseTotal.toLocaleString('en-IN')}\n`;
  body += `• चालू महिन्याची शिल्लक: ₹${(metrics.monthIncomeTotal - metrics.monthExpenseTotal).toLocaleString('en-IN')}\n\n`;

  body += `=========================================\n`;
  body += `३. या संपूर्ण वर्षाचा जमा-खर्च (Yearly Total)\n`;
  body += `=========================================\n`;
  body += `• या वर्षातील एकूण जमा: ₹${metrics.yearIncomeTotal.toLocaleString('en-IN')}\n`;
  body += `• या वर्षातील एकूण खर्च: ₹${metrics.yearExpenseTotal.toLocaleString('en-IN')}\n`;
  body += `• वर्षाची निव्वळ शिल्लक: ₹${(metrics.yearIncomeTotal - metrics.yearExpenseTotal).toLocaleString('en-IN')}\n\n`;

  body += `-----------------------------------------\n`;
  body += `हा ई-मेल मोरया ग्रुप वेब ॲप्लिकेशनवरून आपोआप तयार केला आहे.\n`;
  body += `ट्रस्ट: मोरया ग्रुप मित्र मंडळ (हडपसर गोंधळनगर, पुणे)\n`;

  return { subject, body, metrics };
}

/**
 * Triggers dispatch of daily email report to moryagroupdata@gmail.com
 * Only sends email if transactions occurred today.
 */
export async function sendDailyEmailReport(
  incomes: IncomeTransaction[],
  expenses: ExpenseTransaction[],
  forceManual: boolean = false
): Promise<DailyReportResult> {
  const metrics = calculateReportMetrics(incomes, expenses);

  if (metrics.todayCount === 0) {
    return {
      success: false,
      reason: 'NO_TRANSACTIONS',
      message: 'आज (Today) कोणताही जमा किंवा खर्च व्यवहार झालेला नाही. त्यामुळे ई-मेल पाठवला नाही.',
      ...metrics,
    };
  }

  if (!forceManual && isReportAlreadySentToday()) {
    return {
      success: true,
      reason: 'ALREADY_SENT',
      message: 'आजचा दैनिक जमा-खर्च ई-मेल अहवाल आधीच पाठवला गेला आहे.',
      ...metrics,
    };
  }

  const { subject, body } = formatEmailReportContent(incomes, expenses);

  // Trigger web mailto client as standard direct fallback
  const mailtoUrl = `mailto:${TARGET_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailtoUrl, '_blank');

  markReportSentToday();

  return {
    success: true,
    reason: 'SENT',
    message: `आजचा दैनिक अहवाल (${metrics.todayCount} व्यवहार) moryagroupdata@gmail.com वर पाठवला आहे.`,
    ...metrics,
  };
}
