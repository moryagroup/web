/**
 * transactionDispatchService.ts
 * Orchestrates automatic and manual email and Google Drive reporting for approved transactions.
 * Renders high-resolution receipt vouchers with payment proof and official signatures,
 * then dispatches them to moryagroupdata@gmail.com.
 */

import { IncomeTransaction, ExpenseTransaction } from '../types';
import { generateReceiptImageCanvas } from '../utils/receiptCanvasGenerator';
import { uploadAndEmailTransactionReceipt, TARGET_EMAIL } from './googleDriveService';

export interface DispatchResult {
  success: boolean;
  message: string;
  dataUrl?: string;
  driveUrl?: string;
}

/**
 * Builds clean HTML email body for Gmail dispatch
 */
function buildTransactionEmailHtml(
  txn: IncomeTransaction | ExpenseTransaction,
  type: 'INCOME' | 'EXPENSE'
): { subject: string; html: string } {
  const isIncome = type === 'INCOME';
  const inc = isIncome ? (txn as IncomeTransaction) : null;
  const exp = !isIncome ? (txn as ExpenseTransaction) : null;

  const dateStr = isIncome ? inc?.transactionDate : exp?.expenseDate;
  const receiptNo = inc?.receiptNumber ? `#${inc.receiptNumber}` : txn.transactionNo;
  const typeText = isIncome ? 'जमा पावती (Income)' : 'खर्च व्हाऊचर (Expense)';
  const personName = isIncome ? inc?.depositorName : exp?.recipientName;
  const categoryText = isIncome ? inc?.incomeType : exp?.expenseCategory;

  const subject = `[मोरया ग्रुप] अधिकृत ${typeText} (${receiptNo}) - ₹${Number(txn.amount || 0).toLocaleString('en-IN')}`;

  const html = `
    <div style="font-family: Arial, 'Noto Sans', sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #d97706; border-radius: 12px; overflow: hidden; background: #ffffff;">
      <div style="background: #78350f; color: #ffffff; padding: 20px; text-align: center;">
        <div style="font-size: 13px; color: #fde68a; font-weight: bold; margin-bottom: 4px;">॥ श्री गणेशाय नमः ॥</div>
        <h2 style="margin: 0; font-size: 24px; color: #ffffff;">मोरया ग्रुप मित्र मंडळ</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #fef3c7;">हडपसर गोंधळनगर, पुणे - ४११०२८</p>
      </div>

      <div style="background: ${isIncome ? '#059669' : '#dc2626'}; color: #ffffff; padding: 8px 16px; text-align: center; font-weight: bold; font-size: 15px;">
        ★ अधिकृत ${typeText} ★
      </div>

      <div style="padding: 20px; color: #1e293b; font-size: 14px; line-height: 1.6;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #475569; width: 40%;">पावती / व्हाऊचर क्र.:</td>
            <td style="padding: 10px; font-weight: bold; color: #0f172a;">${receiptNo}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #475569;">दिनांक:</td>
            <td style="padding: 10px;">${dateStr || '---'} (वर्ष: ${txn.financialYear || '2026-2027'})</td>
          </tr>
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #475569;">${isIncome ? 'जमादार नाव' : 'स्वीकारणार / Vendor'}:</td>
            <td style="padding: 10px; font-weight: bold;">${personName || '---'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #475569;">प्रकार / Category:</td>
            <td style="padding: 10px;">${categoryText || '---'}</td>
          </tr>
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #475569;">कारण / तपशील:</td>
            <td style="padding: 10px;">${txn.reason || 'मंडळ कामकाज'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #475569;">पेमेंट पद्धत:</td>
            <td style="padding: 10px;">${txn.paymentMethod || 'रोख'} ${txn.paymentReference ? `(Ref: ${txn.paymentReference})` : ''}</td>
          </tr>
          <tr style="background: #fef3c7; border-bottom: 2px solid #d97706;">
            <td style="padding: 12px; font-weight: bold; color: #92400e; font-size: 16px;">एकूण रक्कम:</td>
            <td style="padding: 12px; font-weight: 900; color: #059669; font-size: 20px;">₹ ${Number(txn.amount || 0).toLocaleString('en-IN')}/-</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #475569;">मंजुरी दर्जा:</td>
            <td style="padding: 10px; font-weight: bold; color: #059669;">
              मंजूर (Approved by ${txn.approvedBy || 'खजिनदार'}${txn.approvedByRole ? ` - ${txn.approvedByRole}` : ''})
            </td>
          </tr>
        </table>

        <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; border-left: 4px solid #d97706; font-size: 13px; color: #334155; margin-bottom: 16px;">
          📎 <strong>अधिकृत स्वाक्षरी व पेमेंट पुरावा:</strong> संपूर्ण अधिकृत पावती फोटो (खजिनदार व उपखजिनदार यांच्या स्वाक्षरीसह आणि पेमेंट पुराव्यासह) या ईमेलसोबत जोडली आहे.
        </div>
      </div>

      <div style="background: #f8fafc; padding: 14px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        हा ई-मेल मोरया ग्रुप वेब ॲप्लिकेशन प्रणालीद्वारे पाठवला आहे. (moryagroupdata@gmail.com)
      </div>
    </div>
  `;

  return { subject, html };
}

/**
 * Dispatches a transaction receipt to Google Drive & moryagroupdata@gmail.com
 */
export async function dispatchApprovedTransaction(
  transaction: IncomeTransaction | ExpenseTransaction,
  type: 'INCOME' | 'EXPENSE'
): Promise<DispatchResult> {
  try {
    // Only dispatch approved transactions
    if (transaction.approvalStatus !== 'मंजूर') {
      return {
        success: false,
        message: 'व्यवहार प्रलंबित आहे, केवळ मंजूर व्यवहारांची पावती ई-मेल/ड्राईव्हवर पाठवली जाते.',
      };
    }

    // 1. Generate receipt canvas with proof and signatures
    const { blob, dataUrl } = await generateReceiptImageCanvas({
      transaction,
      type,
    });

    const isIncome = type === 'INCOME';
    const txnCode = isIncome
      ? `INCOME_${(transaction as IncomeTransaction).receiptNumber || transaction.transactionNo}`
      : `EXPENSE_${transaction.transactionNo}`;
    const cleanFileName = `Morya_Receipt_${txnCode}_${Date.now()}.jpg`;

    // 2. Build email content
    const { subject, html } = buildTransactionEmailHtml(transaction, type);

    // 3. Dispatch to Google Apps Script (Drive + Gmail)
    const result = await uploadAndEmailTransactionReceipt({
      blob,
      fileName: cleanFileName,
      subject,
      htmlBody: html,
      financialYear: transaction.financialYear || '2026-2027',
    });

    return {
      success: result.success,
      message: result.message,
      dataUrl,
      driveUrl: result.driveUrl,
    };
  } catch (err: any) {
    console.error('Error dispatching transaction receipt:', err);
    return {
      success: false,
      message: `पावती तयार करण्यात किंवा पाठवण्यात त्रुटी: ${err?.message || ''}`,
    };
  }
}

/**
 * Directly downloads the high-res generated receipt image locally
 */
export async function downloadReceiptImage(
  transaction: IncomeTransaction | ExpenseTransaction,
  type: 'INCOME' | 'EXPENSE'
): Promise<void> {
  const { dataUrl } = await generateReceiptImageCanvas({ transaction, type });
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `Morya_Receipt_${transaction.transactionNo}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
