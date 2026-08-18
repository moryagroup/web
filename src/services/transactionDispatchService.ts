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
 * Builds clean HTML email body for Gmail dispatch in pure Marathi
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
  const typeText = isIncome ? 'जमा पावती' : 'खर्च व्हाऊचर';
  const personName = isIncome ? inc?.depositorName : exp?.recipientName;
  const categoryText = isIncome ? inc?.incomeType : exp?.expenseCategory;

  const subject = `[मोरया ग्रुप] अधिकृत ${typeText} (${receiptNo}) - ₹${Number(txn.amount || 0).toLocaleString('en-IN')}`;

  const html = `
    <div style="font-family: 'Noto Sans Devanagari', Arial, 'Mukta', sans-serif; max-width: 620px; margin: 0 auto; border: 2px solid #ea580c; border-radius: 12px; overflow: hidden; background: #ffffff;">
      <div style="background: #7c2d12; color: #ffffff; padding: 20px; text-align: center;">
        <div style="font-size: 13px; color: #fde68a; font-weight: bold; margin-bottom: 4px;">॥ श्री गणेशाय नमः ॥</div>
        <h2 style="margin: 0; font-size: 24px; color: #ffffff;">मोरया ग्रुप मित्र मंडळ (ट्रस्ट)</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #ffedd5;">हडपसर गोंधळनगर, पुणे - ४११०२८</p>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #fde68a; font-weight: bold;">स्थापना - २०११ | (रजि. नं. रजि. पुणे / ०००११२२/२०२३)</p>
      </div>

      <div style="background: ${isIncome ? '#ea580c' : '#dc2626'}; color: #ffffff; padding: 10px 16px; text-align: center; font-weight: bold; font-size: 16px; letter-spacing: 0.5px;">
        ★ अधिकृत ${typeText} ★
      </div>

      <div style="padding: 20px; color: #1e293b; font-size: 14px; line-height: 1.6;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <tr style="background: #fff7ed; border-bottom: 1px solid #fed7aa;">
            <td style="padding: 10px; font-weight: bold; color: #7c2d12; width: 42%;">${isIncome ? 'पावती क्र.:' : 'व्हाऊचर क्र.:'}</td>
            <td style="padding: 10px; font-weight: 900; color: #0f172a;">${receiptNo}</td>
          </tr>
          <tr style="border-bottom: 1px solid #fed7aa;">
            <td style="padding: 10px; font-weight: bold; color: #7c2d12;">दिनांक:</td>
            <td style="padding: 10px;">${dateStr || '---'} (आर्थिक वर्ष: ${txn.financialYear || '२०२६-२०२७'})</td>
          </tr>
          <tr style="background: #fff7ed; border-bottom: 1px solid #fed7aa;">
            <td style="padding: 10px; font-weight: bold; color: #7c2d12;">${isIncome ? 'जमादार / देणगीदाराचे नाव:' : 'स्वीकारणाऱ्याचे नाव:'}</td>
            <td style="padding: 10px; font-weight: bold;">${personName || '---'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #fed7aa;">
            <td style="padding: 10px; font-weight: bold; color: #7c2d12;">${isIncome ? 'जमा प्रकार / वर्गणी:' : 'खर्च वर्गवारी:'}</td>
            <td style="padding: 10px;">${categoryText || '---'}</td>
          </tr>
          <tr style="background: #fff7ed; border-bottom: 1px solid #fed7aa;">
            <td style="padding: 10px; font-weight: bold; color: #7c2d12;">कारणाचे स्वरूप / तपशील:</td>
            <td style="padding: 10px;">${txn.reason || 'मंडळ कामकाज'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #fed7aa;">
            <td style="padding: 10px; font-weight: bold; color: #7c2d12;">पेमेंट पद्धत:</td>
            <td style="padding: 10px;">${txn.paymentMethod || 'रोख'} ${txn.paymentReference ? `(संदर्भ: ${txn.paymentReference})` : ''}</td>
          </tr>
          <tr style="background: #ffedd5; border-bottom: 2px solid #ea580c;">
            <td style="padding: 12px; font-weight: bold; color: #9a3412; font-size: 16px;">एकूण रक्कम:</td>
            <td style="padding: 12px; font-weight: 900; color: #c2410c; font-size: 22px;">₹ ${Number(txn.amount || 0).toLocaleString('en-IN')}/-</td>
          </tr>
          <tr style="border-bottom: 1px solid #fed7aa;">
            <td style="padding: 10px; font-weight: bold; color: #7c2d12;">मंजुरी दर्जा:</td>
            <td style="padding: 10px; font-weight: bold; color: #ea580c;">
              मंजूर (${txn.approvedBy || 'खजिनदार'}${txn.approvedByRole ? ` - ${txn.approvedByRole}` : ''})
            </td>
          </tr>
        </table>

        <div style="background: #fff7ed; padding: 12px; border-radius: 8px; border-left: 4px solid #ea580c; font-size: 13px; color: #7c2d12; margin-bottom: 16px;">
          📎 <strong>अधिकृत स्वाक्षरी व पावती पुरावा:</strong> संपूर्ण अधिकृत पावती फोटो (खजिनदार व उपखजिनदार यांच्या स्वाक्षरीसह व पेमेंट पुराव्यासह) या ईमेलसोबत जोडली आहे.
        </div>
      </div>

      <div style="background: #f8fafc; padding: 14px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #fed7aa;">
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
  type: 'INCOME' | 'EXPENSE',
  groupLogo?: string
): Promise<DispatchResult> {
  try {
    // Only dispatch approved transactions
    if (transaction.approvalStatus !== 'मंजूर') {
      return {
        success: false,
        message: 'व्यवहार प्रलंबित आहे, केवळ मंजूर व्यवहारांची पावती ई-मेल/ड्राईव्हवर पाठवली जाते.',
      };
    }

    // 1. Generate receipt canvas with proof, signatures, and group logo
    const { blob, dataUrl } = await generateReceiptImageCanvas({
      transaction,
      type,
      groupLogo,
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
  type: 'INCOME' | 'EXPENSE',
  groupLogo?: string
): Promise<void> {
  const { dataUrl } = await generateReceiptImageCanvas({ transaction, type, groupLogo });
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `Morya_Receipt_${transaction.transactionNo}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
