/**
 * receiptCanvasGenerator.ts
 * Generates an official, high-resolution Marathi receipt voucher card as a PNG/JPEG image
 * containing the official mandal header, complete transaction details, embedded payment proof,
 * and authorized digital signatures of the Treasurer (खजिनदार) and Vice Treasurer (उपखजिनदार).
 */

import { IncomeTransaction, ExpenseTransaction } from '../types';
import { getTreasurerSignature, getViceTreasurerSignature } from '../services/signatureService';

export interface GenerateReceiptOptions {
  transaction: IncomeTransaction | ExpenseTransaction;
  type: 'INCOME' | 'EXPENSE';
  treasurerName?: string;
  viceTreasurerName?: string;
  watermarkText?: string;
}

/**
 * Loads an image from a URL or Base64 string safely
 */
function loadImageSafe(src?: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn('Failed to load image for receipt canvas:', src.substring(0, 50));
      resolve(null);
    };
    img.src = src;
  });
}

/**
 * Formats a currency number in INR Marathi style
 */
function formatCurrency(amount: number): string {
  return `₹ ${Number(amount || 0).toLocaleString('en-IN')}/-`;
}

/**
 * Generates official high-definition canvas receipt
 */
export async function generateReceiptImageCanvas(
  options: GenerateReceiptOptions
): Promise<{ canvas: HTMLCanvasElement; dataUrl: string; blob: Blob }> {
  const { transaction, type } = options;
  const isIncome = type === 'INCOME';
  const inc = isIncome ? (transaction as IncomeTransaction) : null;
  const exp = !isIncome ? (transaction as ExpenseTransaction) : null;

  // Signatures
  const treasurerSigData = getTreasurerSignature();
  const viceTreasurerSigData = getViceTreasurerSignature();

  // Load images in parallel
  const [proofImg, treasurerSigImg, viceTreasurerSigImg] = await Promise.all([
    loadImageSafe(transaction.attachmentUrl),
    loadImageSafe(treasurerSigData?.signatureDataUrl),
    loadImageSafe(viceTreasurerSigData?.signatureDataUrl),
  ]);

  const width = 1200;
  const hasProof = Boolean(proofImg);
  // Calculate dynamic canvas height
  const height = hasProof ? 1500 : 1100;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create 2D canvas context');

  // 1. Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Decorative border
  ctx.strokeStyle = '#D97706'; // Amber 600
  ctx.lineWidth = 12;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  ctx.strokeStyle = '#FDE68A'; // Amber 200
  ctx.lineWidth = 3;
  ctx.strokeRect(32, 32, width - 64, height - 64);

  // 2. Header Banner
  ctx.fillStyle = '#78350F'; // Dark amber
  ctx.fillRect(36, 36, width - 72, 170);

  // Header Text
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 22px "Noto Sans Devanagari", sans-serif';
  ctx.fillText('॥ श्री गणेशाय नमः ॥', width / 2, 72);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 42px "Noto Sans Devanagari", sans-serif';
  ctx.fillText('मोरया ग्रुप मित्र मंडळ (ट्रस्ट)', width / 2, 125);

  ctx.fillStyle = '#FEF3C7';
  ctx.font = '600 20px "Noto Sans Devanagari", sans-serif';
  ctx.fillText('हडपसर गोंधळनगर, पुणे - ४११०२८ | स्थापना: २०१५ | नोंदणी क्र. महा/१२३/पुणे', width / 2, 165);

  // 3. Subheader Title Badge (Income / Expense)
  const badgeY = 230;
  const badgeColor = isIncome ? '#059669' : '#DC2626';
  ctx.fillStyle = badgeColor;
  ctx.beginPath();
  ctx.roundRect(width / 2 - 260, badgeY, 520, 52, 26);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px "Noto Sans Devanagari", sans-serif';
  const badgeTitle = isIncome
    ? '★ अधिकृत जमा पावती (OFFICIAL RECEIPT) ★'
    : '★ अधिकृत खर्च व्हाऊचर (EXPENSE VOUCHER) ★';
  ctx.fillText(badgeTitle, width / 2, badgeY + 35);

  // 4. Metadata Strip (Receipt No, Date, Financial Year, Status)
  const metaY = 320;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(50, metaY, width - 100, 70);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.strokeRect(50, metaY, width - 100, 70);

  ctx.textAlign = 'left';
  ctx.font = 'bold 18px "Noto Sans Devanagari", sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('पावती / व्हाऊचर क्र.:', 70, metaY + 42);
  ctx.fillStyle = '#0F172A';
  ctx.font = '900 20px "Noto Sans Devanagari", monospace';
  const receiptNoStr = inc?.receiptNumber ? `#${inc.receiptNumber} (${inc.transactionNo})` : transaction.transactionNo;
  ctx.fillText(receiptNoStr, 250, metaY + 42);

  ctx.font = 'bold 18px "Noto Sans Devanagari", sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('दिनांक:', 680, metaY + 42);
  ctx.fillStyle = '#0F172A';
  const txnDate = isIncome ? inc?.transactionDate : exp?.expenseDate;
  ctx.fillText(txnDate || '---', 750, metaY + 42);

  ctx.fillStyle = '#475569';
  ctx.fillText('वर्ष:', 930, metaY + 42);
  ctx.fillStyle = '#D97706';
  ctx.fillText(transaction.financialYear || '2026-2027', 980, metaY + 42);

  // 5. Details Section (Table style)
  let currentY = 430;
  const rowHeight = 46;

  const drawDetailRow = (label: string, value: string, isHighlight: boolean = false) => {
    ctx.fillStyle = isHighlight ? '#FEF3C7' : '#F8FAFC';
    ctx.fillRect(50, currentY, width - 100, rowHeight);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.strokeRect(50, currentY, width - 100, rowHeight);

    ctx.textAlign = 'left';
    ctx.font = 'bold 19px "Noto Sans Devanagari", sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(label, 70, currentY + 30);

    ctx.font = isHighlight ? '900 26px "Noto Sans Devanagari", sans-serif' : '700 20px "Noto Sans Devanagari", sans-serif';
    ctx.fillStyle = isHighlight ? '#059669' : '#0F172A';
    ctx.fillText(value, 360, currentY + (isHighlight ? 32 : 30));

    currentY += rowHeight + 8;
  };

  const personLabel = isIncome ? 'जमादार / देणगीदार नाव:' : 'स्वीकारणार / Vendor नाव:';
  const personValue = isIncome
    ? `${inc?.depositorName || 'अज्ञात'} (${inc?.depositorType || 'व्यक्ती'})`
    : `${exp?.recipientName || '---'} (${exp?.recipientType || 'व्यक्ती'})`;
  drawDetailRow(personLabel, personValue);

  const categoryLabel = isIncome ? 'जमा प्रकार / वर्गणी:' : 'खर्च वर्गवारी (Category):';
  const categoryValue = isIncome ? (inc?.incomeType || 'सभासद वर्गणी') : (exp?.expenseCategory || 'इतर');
  drawDetailRow(categoryLabel, categoryValue);

  drawDetailRow('कारणाचे स्वरूप / तपशील:', transaction.reason || 'मंडळ कामकाज');

  const paymentDetailStr = `${transaction.paymentMethod || 'रोख'} ${
    transaction.paymentReference ? `(Ref/Txn No: ${transaction.paymentReference})` : ''
  }`;
  drawDetailRow('पेमेंट पद्धत / तपशील:', paymentDetailStr);

  drawDetailRow('एकूण रक्कम (Amount):', formatCurrency(transaction.amount), true);

  const approverStr = transaction.approvedBy
    ? `मंजूर (${transaction.approvedBy}${transaction.approvedByRole ? ` - ${transaction.approvedByRole}` : ''})`
    : 'मंजूर (Approved)';
  drawDetailRow('मंजुरी दर्जा (Approval Status):', approverStr);

  // 6. Payment Proof Image Block (if attached)
  currentY += 15;
  if (hasProof && proofImg) {
    const proofBoxY = currentY;
    const proofBoxHeight = 360;

    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(50, proofBoxY, width - 100, proofBoxHeight);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, proofBoxY, width - 100, proofBoxHeight);

    // Label on proof box
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 18px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('📷 जोडलेला पेमेंट पुरावा / पावती प्रत (Attached Payment Proof Copy):', 70, proofBoxY + 35);

    // Draw scaled image inside box
    const maxImgW = width - 140;
    const maxImgH = proofBoxHeight - 60;
    let drawW = proofImg.width;
    let drawH = proofImg.height;

    const scale = Math.min(maxImgW / drawW, maxImgH / drawH, 1);
    drawW = drawW * scale;
    drawH = drawH * scale;

    const drawX = width / 2 - drawW / 2;
    const drawY = proofBoxY + 50 + (maxImgH - drawH) / 2;

    ctx.drawImage(proofImg, drawX, drawY, drawW, drawH);

    // Border around proof image
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2;
    ctx.strokeRect(drawX, drawY, drawW, drawH);

    currentY += proofBoxHeight + 20;
  } else {
    // No proof placeholder badge
    ctx.fillStyle = '#FEF2F2';
    ctx.fillRect(50, currentY, width - 100, 50);
    ctx.strokeStyle = '#FECACA';
    ctx.lineWidth = 1;
    ctx.strokeRect(50, currentY, width - 100, 50);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#991B1B';
    ctx.font = '600 17px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('ℹ️ ही थेट रोख / प्रत्यक्ष नोंद आहे (कोणताही डिजिटल पुरावा फोटो संलग्न केलेला नाही)', width / 2, currentY + 32);

    currentY += 65;
  }

  // 7. Official Signatures Section (Treasurer & Vice Treasurer)
  const sigSectionY = currentY + 10;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(50, sigSectionY, width - 100, 160);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(50, sigSectionY, width - 100, 160);

  // Center Mandal Stamp / Seal
  ctx.textAlign = 'center';
  ctx.fillStyle = '#D97706';
  ctx.font = 'bold 15px "Noto Sans Devanagari", sans-serif';
  ctx.fillText('॥ मोरया ग्रुप अधिकृत मोहोर ॥', width / 2, sigSectionY + 80);
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(width / 2, sigSectionY + 75, 45, 0, Math.PI * 2);
  ctx.stroke();

  // Left: Treasurer Signature Block
  const leftSigX = 180;
  if (treasurerSigImg) {
    const sigW = 160;
    const sigH = 65;
    ctx.drawImage(treasurerSigImg, leftSigX - sigW / 2, sigSectionY + 25, sigW, sigH);
  } else {
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'italic 16px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('[ डिजिटल स्वाक्षरी ]', leftSigX, sigSectionY + 65);
  }
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftSigX - 100, sigSectionY + 105);
  ctx.lineTo(leftSigX + 100, sigSectionY + 105);
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 18px "Noto Sans Devanagari", sans-serif';
  ctx.fillText('खजिनदार स्वाक्षरी', leftSigX, sigSectionY + 130);
  ctx.fillStyle = '#64748B';
  ctx.font = '600 14px "Noto Sans Devanagari", sans-serif';
  ctx.fillText(`(${treasurerSigData?.officerName || 'अधिकृत खजिनदार'})`, leftSigX, sigSectionY + 150);

  // Right: Vice Treasurer Signature Block
  const rightSigX = width - 180;
  if (viceTreasurerSigImg) {
    const sigW = 160;
    const sigH = 65;
    ctx.drawImage(viceTreasurerSigImg, rightSigX - sigW / 2, sigSectionY + 25, sigW, sigH);
  } else {
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'italic 16px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('[ डिजिटल स्वाक्षरी ]', rightSigX, sigSectionY + 65);
  }
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rightSigX - 100, sigSectionY + 105);
  ctx.lineTo(rightSigX + 100, sigSectionY + 105);
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 18px "Noto Sans Devanagari", sans-serif';
  ctx.fillText('उपखजिनदार स्वाक्षरी', rightSigX, sigSectionY + 130);
  ctx.fillStyle = '#64748B';
  ctx.font = '600 14px "Noto Sans Devanagari", sans-serif';
  ctx.fillText(`(${viceTreasurerSigData?.officerName || 'अधिकृत उपखजिनदार'})`, rightSigX, sigSectionY + 150);

  // Footer Note
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = '500 13px "Noto Sans Devanagari", sans-serif';
  ctx.fillText('हा ई-पावती दस्तऐवज मोरया ग्रुप वेब प्रणालीद्वारे आपोआप तयार करण्यात आला आहे. (moryagroupdata@gmail.com)', width / 2, height - 32);

  // Convert to DataURL and Blob
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const blob: Blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.92);
  });

  return { canvas, dataUrl, blob };
}
