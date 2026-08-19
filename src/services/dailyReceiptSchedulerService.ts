/**
 * dailyReceiptSchedulerService.ts
 * Automatic Daily 11:59 PM Dispatcher for all approved transaction receipts.
 * Gathers all approved income and expense receipts generated on that date,
 * renders high-definition receipt cards, and sends a consolidated dossier
 * with all receipt copies attached directly to moryagroupdata@gmail.com and Google Drive.
 */

import { IncomeTransaction, ExpenseTransaction, CashSettlement } from '../types';
import { generateReceiptImageCanvas, formatMarathiDate, toMarathiDigits } from '../utils/receiptCanvasGenerator';
import { uploadAndEmailDailyReceiptsBatch, BatchReceiptItem } from './googleDriveService';

const STORAGE_KEY_LAST_1159_SENT = 'morya_last_1159_receipts_sent_date_v1';

/**
 * Checks if today's 11:59 PM daily receipt batch has already been sent
 */
export function isDaily1159ReportSentToday(): boolean {
  try {
    const lastSent = localStorage.getItem(STORAGE_KEY_LAST_1159_SENT);
    const todayStr = new Date().toISOString().split('T')[0];
    return lastSent === todayStr;
  } catch {
    return false;
  }
}

export function getLastDaily1159SentDate(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_LAST_1159_SENT);
  } catch {
    return null;
  }
}

/**
 * Marks today's 11:59 PM daily report as sent in localStorage
 */
export function markDaily1159ReportSentToday(dateStr?: string): void {
  try {
    const todayStr = dateStr || new Date().toISOString().split('T')[0];
    localStorage.setItem(STORAGE_KEY_LAST_1159_SENT, todayStr);
  } catch (err) {
    console.error('Failed to mark 11:59 PM batch sent:', err);
  }
}

export interface Daily1159DispatchResult {
  success: boolean;
  message: string;
  totalIncome: number;
  totalExpense: number;
  incomeCount: number;
  expenseCount: number;
  totalReceiptsCount: number;
  folderUrl?: string;
}

/**
 * Filters approved transactions matching a specific date (default: today)
 */
export function getApprovedTransactionsForDate(
  incomes: IncomeTransaction[],
  expenses: ExpenseTransaction[],
  targetDateStr?: string
) {
  const dateStr = targetDateStr || new Date().toISOString().split('T')[0];

  const approvedIncomes = incomes.filter(
    (i) => i.approvalStatus === 'मंजूर' && i.transactionDate === dateStr
  );

  const approvedExpenses = expenses.filter(
    (e) => e.approvalStatus === 'मंजूर' && e.expenseDate === dateStr
  );

  return {
    dateStr,
    approvedIncomes,
    approvedExpenses,
    totalIncome: approvedIncomes.reduce((s, i) => s + (i.amount || 0), 0),
    totalExpense: approvedExpenses.reduce((s, e) => s + (e.amount || 0), 0),
    count: approvedIncomes.length + approvedExpenses.length,
  };
}

/**
 * Builds pure Marathi HTML email content for the daily 11:59 PM batch dossier
 */
function buildDailyBatchEmailHtml(
  dateStr: string,
  approvedIncomes: IncomeTransaction[],
  approvedExpenses: ExpenseTransaction[],
  totalIncome: number,
  totalExpense: number
): { subject: string; html: string } {
  const marathiDateFormatted = formatMarathiDate(dateStr);
  const totalCount = approvedIncomes.length + approvedExpenses.length;
  const netBalance = totalIncome - totalExpense;

  const subject = `[मोरया ग्रुप] दैनिक सर्व मंजूर पावत्या संग्रह (${marathiDateFormatted}) - एकूण ${toMarathiDigits(totalCount)} पावत्या`;

  let incomeRows = '';
  if (approvedIncomes.length > 0) {
    incomeRows = approvedIncomes
      .map(
        (i, idx) => `
        <tr style="background: ${idx % 2 === 0 ? '#fff7ed' : '#ffffff'}; border-bottom: 1px solid #fed7aa;">
          <td style="padding: 8px; font-weight: bold; color: #7c2d12;">${toMarathiDigits(idx + 1)}</td>
          <td style="padding: 8px; font-weight: bold;">${toMarathiDigits(i.receiptNumber ? `#${i.receiptNumber}` : i.transactionNo)}</td>
          <td style="padding: 8px;">${i.depositorName}</td>
          <td style="padding: 8px;">${i.incomeType}</td>
          <td style="padding: 8px;">${i.paymentMethod || 'रोख'}</td>
          <td style="padding: 8px; font-weight: 900; color: #ea580c; text-align: right;">₹${toMarathiDigits(Number(i.amount).toLocaleString('en-IN'))}/-</td>
          <td style="padding: 8px; color: #059669; font-weight: bold;">मंजूर (${i.approvedBy || 'खजिनदार'})</td>
          <td style="padding: 8px; color: #475569;">${i.createdBy || 'कार्यकर्ता'}</td>
        </tr>
      `
      )
      .join('');
  }

  let expenseRows = '';
  if (approvedExpenses.length > 0) {
    expenseRows = approvedExpenses
      .map(
        (e, idx) => `
        <tr style="background: ${idx % 2 === 0 ? '#fef2f2' : '#ffffff'}; border-bottom: 1px solid #fecaca;">
          <td style="padding: 8px; font-weight: bold; color: #991b1b;">${toMarathiDigits(idx + 1)}</td>
          <td style="padding: 8px; font-weight: bold;">${toMarathiDigits(e.transactionNo)}</td>
          <td style="padding: 8px;">${e.recipientName || '---'}</td>
          <td style="padding: 8px;">${e.expenseCategory} (${e.reason || ''})</td>
          <td style="padding: 8px;">${e.paymentMethod || 'रोख'}</td>
          <td style="padding: 8px; font-weight: 900; color: #dc2626; text-align: right;">₹${toMarathiDigits(Number(e.amount).toLocaleString('en-IN'))}/-</td>
          <td style="padding: 8px; color: #059669; font-weight: bold;">मंजूर (${e.approvedBy || 'खजिनदार'})</td>
          <td style="padding: 8px; color: #475569;">${e.createdBy || 'कार्यकर्ता'}</td>
        </tr>
      `
      )
      .join('');
  }

  const html = `
    <div style="font-family: 'Noto Sans Devanagari', Arial, 'Mukta', sans-serif; max-width: 750px; margin: 0 auto; border: 2px solid #ea580c; border-radius: 12px; overflow: hidden; background: #ffffff;">
      <!-- Header Banner -->
      <div style="background: #7c2d12; color: #ffffff; padding: 22px; text-align: center;">
        <div style="font-size: 13px; color: #fde68a; font-weight: bold; margin-bottom: 4px;">॥ श्री गणेशाय नमः ॥</div>
        <h2 style="margin: 0; font-size: 24px; color: #ffffff;">मोरया ग्रुप मित्र मंडळ (ट्रस्ट)</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #ffedd5;">हडपसर गोंधळनगर, पुणे - ४११०२८</p>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #fde68a; font-weight: bold;">स्थापना - २०११ | (रजि. नं. रजि. पुणे / ०००११२२/२०२३)</p>
      </div>

      <!-- Badge Title -->
      <div style="background: #ea580c; color: #ffffff; padding: 12px 16px; text-align: center; font-weight: bold; font-size: 16px; letter-spacing: 0.5px;">
        ★ दैनिक सर्व मंजूर पावत्या संग्रह (Daily 11:59 PM Auto Report) ★
      </div>

      <div style="padding: 20px; color: #1e293b; font-size: 14px; line-height: 1.6;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-weight: bold; color: #7c2d12; background: #fff7ed; padding: 10px 14px; border-radius: 8px; border: 1px solid #fed7aa;">
          <span>📅 अहवाल दिनांक: <strong>${marathiDateFormatted} (${dateStr})</strong></span>
          <span>⏰ वेळ: <strong>११:५९ PM (दैनिक ऑटो-सिंक)</strong></span>
        </div>

        <!-- Summary Metric Cards -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="width: 33.33%; padding: 12px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px 0 0 8px; text-align: center;">
              <span style="font-size: 11px; color: #9a3412; font-weight: bold; display: block;">आजचा एकूण मंजूर जमा</span>
              <strong style="font-size: 18px; color: #ea580c;">₹${toMarathiDigits(totalIncome.toLocaleString('en-IN'))}/-</strong>
              <span style="font-size: 10px; color: #7c2d12; display: block;">(${toMarathiDigits(approvedIncomes.length)} पावत्या)</span>
            </td>
            <td style="width: 33.33%; padding: 12px; background: #fef2f2; border: 1px solid #fecaca; text-align: center;">
              <span style="font-size: 11px; color: #991b1b; font-weight: bold; display: block;">आजचा एकूण मंजूर खर्च</span>
              <strong style="font-size: 18px; color: #dc2626;">₹${toMarathiDigits(totalExpense.toLocaleString('en-IN'))}/-</strong>
              <span style="font-size: 10px; color: #991b1b; display: block;">(${toMarathiDigits(approvedExpenses.length)} व्हाऊचर्स)</span>
            </td>
            <td style="width: 33.33%; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0 8px 8px 0; text-align: center;">
              <span style="font-size: 11px; color: #475569; font-weight: bold; display: block;">आजचा निव्वळ फरक/शिल्लक</span>
              <strong style="font-size: 18px; color: ${netBalance >= 0 ? '#059669' : '#dc2626'};">₹${toMarathiDigits(netBalance.toLocaleString('en-IN'))}/-</strong>
              <span style="font-size: 10px; color: #64748b; display: block;">(एकूण ${toMarathiDigits(totalCount)} नोंदी)</span>
            </td>
          </tr>
        </table>

        ${
          approvedIncomes.length > 0
            ? `
          <h3 style="color: #7c2d12; margin: 16px 0 8px 0; font-size: 15px; border-bottom: 2px solid #ea580c; padding-bottom: 4px;">
            १. आजच्या सर्व मंजूर जमा पावत्या (${toMarathiDigits(approvedIncomes.length)})
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
            <thead>
              <tr style="background: #ea580c; color: #ffffff; text-align: left;">
                <th style="padding: 8px;">#</th>
                <th style="padding: 8px;">पावती क्र.</th>
                <th style="padding: 8px;">जमादार</th>
                <th style="padding: 8px;">प्रकार</th>
                <th style="padding: 8px;">पद्धत</th>
                <th style="padding: 8px; text-align: right;">रक्कम</th>
                <th style="padding: 8px;">मंजुरी</th>
                <th style="padding: 8px;">नोंदणीकर्ता</th>
              </tr>
            </thead>
            <tbody>
              ${incomeRows}
            </tbody>
          </table>
        `
            : ''
        }

        ${
          approvedExpenses.length > 0
            ? `
          <h3 style="color: #991b1b; margin: 16px 0 8px 0; font-size: 15px; border-bottom: 2px solid #dc2626; padding-bottom: 4px;">
            २. आजचे सर्व मंजूर खर्च व्हाऊचर्स (${toMarathiDigits(approvedExpenses.length)})
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
            <thead>
              <tr style="background: #dc2626; color: #ffffff; text-align: left;">
                <th style="padding: 8px;">#</th>
                <th style="padding: 8px;">व्हाऊचर क्र.</th>
                <th style="padding: 8px;">स्वीकारणार</th>
                <th style="padding: 8px;">तपशील</th>
                <th style="padding: 8px;">पद्धत</th>
                <th style="padding: 8px; text-align: right;">रक्कम</th>
                <th style="padding: 8px;">मंजुरी</th>
                <th style="padding: 8px;">नोंदणीकर्ता</th>
              </tr>
            </thead>
            <tbody>
              ${expenseRows}
            </tbody>
          </table>
        `
            : ''
        }

        <div style="background: #fff7ed; padding: 14px; border-radius: 8px; border-left: 4px solid #ea580c; font-size: 13px; color: #7c2d12; margin-top: 16px;">
          📎 <strong>सर्व मूळ पावती प्रती (Receipt Attachments):</strong> आजच्या सर्व ${toMarathiDigits(totalCount)} मंजूर पावत्यांचे अधिकृत फोटो (खजिनदार व उपखजिनदार यांच्या स्वाक्षरीसह आणि पेमेंट पुराव्यासह) या ईमेलसोबत स्वतंत्रपणे जोडले आहेत.
        </div>
      </div>

      <div style="background: #f8fafc; padding: 14px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #fed7aa;">
        हा दैनिक अहवाल मोरया ग्रुप वेब प्रणालीद्वारे रोज रात्री ११:५९ वाजता आपोआप पाठवला जातो. (moryagroupdata@gmail.com)
      </div>
    </div>
  `;

  return { subject, html };
}

/**
 * Dispatches all approved receipts for a specific date (default: today)
 * to Google Drive and moryagroupdata@gmail.com
 */
export async function dispatchDaily1159ApprovedReceipts(
  incomes: IncomeTransaction[],
  expenses: ExpenseTransaction[],
  options?: {
    force?: boolean;
    dateStr?: string;
    groupLogo?: string;
  }
): Promise<Daily1159DispatchResult> {
  const targetDateStr = options?.dateStr || new Date().toISOString().split('T')[0];
  const { approvedIncomes, approvedExpenses, totalIncome, totalExpense, count } =
    getApprovedTransactionsForDate(incomes, expenses, targetDateStr);

  if (count === 0) {
    return {
      success: true,
      message: `आज (${targetDateStr}) कोणताही मंजूर व्यवहार झालेला नाही.`,
      totalIncome: 0,
      totalExpense: 0,
      incomeCount: 0,
      expenseCount: 0,
      totalReceiptsCount: 0,
    };
  }

  if (!options?.force && isDaily1159ReportSentToday()) {
    return {
      success: true,
      message: `आजचा ११:५९ PM चा मंजूर पावत्या अहवाल आधीच पाठवला गेला आहे.`,
      totalIncome,
      totalExpense,
      incomeCount: approvedIncomes.length,
      expenseCount: approvedExpenses.length,
      totalReceiptsCount: count,
    };
  }

  try {
    const receiptsItems: BatchReceiptItem[] = [];

    // 1. Generate Income Receipts Canvas
    for (const inc of approvedIncomes) {
      try {
        const { blob } = await generateReceiptImageCanvas({
          transaction: inc,
          type: 'INCOME',
          groupLogo: options?.groupLogo,
        });

        const receiptNo = inc.receiptNumber || inc.transactionNo;
        receiptsItems.push({
          blob,
          fileName: `Morya_Pavti_INCOME_${receiptNo}_${targetDateStr}.jpg`,
          proofUrlOrBase64: inc.attachmentUrl,
          proofFileName: `Proof_INCOME_${receiptNo}_${targetDateStr}.jpg`,
        });
      } catch (err) {
        console.warn(`Failed generating canvas for income ${inc.transactionNo}:`, err);
      }
    }

    // 2. Generate Expense Vouchers Canvas
    for (const exp of approvedExpenses) {
      try {
        const { blob } = await generateReceiptImageCanvas({
          transaction: exp,
          type: 'EXPENSE',
          groupLogo: options?.groupLogo,
        });

        receiptsItems.push({
          blob,
          fileName: `Morya_Voucher_EXPENSE_${exp.transactionNo}_${targetDateStr}.jpg`,
          proofUrlOrBase64: exp.attachmentUrl,
          proofFileName: `Proof_EXPENSE_${exp.transactionNo}_${targetDateStr}.jpg`,
        });
      } catch (err) {
        console.warn(`Failed generating canvas for expense ${exp.transactionNo}:`, err);
      }
    }

    // 3. Build unified HTML body
    const { subject, html } = buildDailyBatchEmailHtml(
      targetDateStr,
      approvedIncomes,
      approvedExpenses,
      totalIncome,
      totalExpense
    );

    // 4. Dispatch batch to Google Apps Script
    const result = await uploadAndEmailDailyReceiptsBatch({
      receipts: receiptsItems,
      subject,
      htmlBody: html,
      financialYear: approvedIncomes[0]?.financialYear || approvedExpenses[0]?.financialYear || '2026-2027',
      dateStr: targetDateStr,
    });

    markDaily1159ReportSentToday(targetDateStr);

    return {
      success: result.success,
      message: result.message,
      totalIncome,
      totalExpense,
      incomeCount: approvedIncomes.length,
      expenseCount: approvedExpenses.length,
      totalReceiptsCount: count,
      folderUrl: result.folderUrl,
    };
  } catch (err: any) {
    console.error('Error dispatching daily 11:59 PM approved receipts:', err);
    return {
      success: false,
      message: `दैनिक पावत्या पाठवण्यात त्रुटी: ${err?.message || 'अज्ञात त्रुटी'}`,
      totalIncome,
      totalExpense,
      incomeCount: approvedIncomes.length,
      expenseCount: approvedExpenses.length,
      totalReceiptsCount: count,
    };
  }
}

/**
 * Starts an in-app background scheduler that checks every 30 seconds
 * and triggers daily dispatch automatically when local time reaches 23:59 (11:59 PM).
 */
export function startDaily1159Scheduler(
  getData: () => {
    incomes: IncomeTransaction[];
    expenses: ExpenseTransaction[];
    cashSettlements?: CashSettlement[];
    groupLogo?: string;
  }
): () => void {
  const checkAndRun = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Check if it's 11:59 PM (23:59)
    if (hours === 23 && minutes === 59) {
      if (!isDaily1159ReportSentToday()) {
        const { incomes, expenses, groupLogo } = getData();
        console.log('[Daily1159Scheduler] ⏰ Triggering automatic 11:59 PM approved transactions dispatch to Drive & Email...');
        dispatchDaily1159ApprovedReceipts(incomes, expenses, { groupLogo }).then((res) => {
          console.log('[Daily1159Scheduler] Result:', res.message);
        });
      }
    }
  };

  // Run check every 30 seconds
  const intervalId = setInterval(checkAndRun, 30000);
  checkAndRun(); // Initial check

  return () => clearInterval(intervalId);
}
