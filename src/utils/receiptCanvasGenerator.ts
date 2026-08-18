/**
 * receiptCanvasGenerator.ts
 * Generates an official, high-resolution Marathi receipt voucher card as a PNG/JPEG image
 * containing the official mandal logo, header details, complete transaction details, embedded payment proof,
 * and authorized digital signatures of the Treasurer (खजिनदार) and Vice Treasurer (उपखजिनदार).
 */

import { IncomeTransaction, ExpenseTransaction } from '../types';
import { getTreasurerSignature, getViceTreasurerSignature } from '../services/signatureService';
import { getStoredGroupLogo } from '../services/storageService';
import moryaLogoDefault from '../assets/morya_logo.jpg';

export interface GenerateReceiptOptions {
  transaction: IncomeTransaction | ExpenseTransaction;
  type: 'INCOME' | 'EXPENSE';
  groupLogo?: string;
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

  // Mandal Group Logo Source
  const logoSource = options.groupLogo || getStoredGroupLogo() || moryaLogoDefault;

  // Load images in parallel
  const [logoImg, proofImg, treasurerSigImg, viceTreasurerSigImg] = await Promise.all([
    loadImageSafe(logoSource),
    loadImageSafe(transaction.attachmentUrl),
    loadImageSafe(treasurerSigData?.signatureDataUrl),
    loadImageSafe(viceTreasurerSigData?.signatureDataUrl),
  ]);

  const width = 1200;
  const hasProof = Boolean(proofImg);
  // Calculate dynamic canvas height
  const height = hasProof ? 1560 : 1160;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create 2D canvas context');

  // 1. Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Decorative border
  ctx.strokeStyle = '#EA580C'; // Vibrant Orange / भगवा
  ctx.lineWidth = 12;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  ctx.strokeStyle = '#FED7AA'; // Soft orange border
  ctx.lineWidth = 3;
  ctx.strokeRect(32, 32, width - 64, height - 64);

  // 2. Header Banner
  const headerY = 36;
  const headerHeight = 195;
  ctx.fillStyle = '#7C2D12'; // Rich traditional deep maroon/amber
  ctx.fillRect(36, headerY, width - 72, headerHeight);

  // Draw Mandal Group Logo with Circular Frame on Header
  if (logoImg) {
    const logoSize = 126;
    const logoX = 65;
    const logoY = headerY + (headerHeight - logoSize) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    ctx.restore();

    // Circular Gold/Amber Outline Border
    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Header Typography (Pure Marathi / Devanagari)
  const headerTextCenterX = logoImg ? (width + 65 + 126) / 2 - 20 : width / 2;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 22px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('॥ श्री गणेशाय नमः ॥', headerTextCenterX, headerY + 40);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 40px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('मोरया ग्रुप मित्र मंडळ (ट्रस्ट)', headerTextCenterX, headerY + 90);

  ctx.fillStyle = '#FFEDD5';
  ctx.font = '600 20px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('हडपसर गोंधळनगर, पुणे - ४११०२८', headerTextCenterX, headerY + 130);

  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 18px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('स्थापना - २०११ | (रजि. नं. रजि. पुणे / ०००११२२/२०२३)', headerTextCenterX, headerY + 168);

  // 3. Subheader Title Badge (Orange for Official Receipt)
  const badgeY = headerY + headerHeight + 25;
  const badgeColor = isIncome ? '#EA580C' : '#DC2626';
  ctx.fillStyle = badgeColor;
  ctx.beginPath();
  ctx.roundRect(width / 2 - 270, badgeY, 540, 52, 26);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px "Noto Sans Devanagari", "Mukta", sans-serif';
  const badgeTitle = isIncome
    ? '★ अधिकृत जमा पावती ★'
    : '★ अधिकृत खर्च पावती / व्हाऊचर ★';
  ctx.fillText(badgeTitle, width / 2, badgeY + 35);

  // 4. Metadata Strip (Receipt No, Date, Financial Year)
  const metaY = badgeY + 75;
  ctx.fillStyle = '#FFF7ED';
  ctx.fillRect(50, metaY, width - 100, 70);
  ctx.strokeStyle = '#FDBA74';
  ctx.lineWidth = 2;
  ctx.strokeRect(50, metaY, width - 100, 70);

  ctx.textAlign = 'left';
  ctx.font = 'bold 18px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillStyle = '#7C2D12';
  ctx.fillText(isIncome ? 'पावती क्र.:' : 'व्हाऊचर क्र.:', 70, metaY + 42);
  ctx.fillStyle = '#1E293B';
  ctx.font = '900 20px "Noto Sans Devanagari", "Mukta", monospace';
  const receiptNoStr = inc?.receiptNumber ? `#${inc.receiptNumber} (${inc.transactionNo})` : transaction.transactionNo;
  ctx.fillText(receiptNoStr, 220, metaY + 42);

  ctx.font = 'bold 18px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillStyle = '#7C2D12';
  ctx.fillText('दिनांक:', 670, metaY + 42);
  ctx.fillStyle = '#1E293B';
  const txnDate = isIncome ? inc?.transactionDate : exp?.expenseDate;
  ctx.fillText(txnDate || '---', 740, metaY + 42);

  ctx.fillStyle = '#7C2D12';
  ctx.fillText('आर्थिक वर्ष:', 910, metaY + 42);
  ctx.fillStyle = '#EA580C';
  ctx.font = 'bold 19px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText(transaction.financialYear || '२०२६-२०२७', 1010, metaY + 42);

  // 5. Details Section (Table style in pure Marathi)
  let currentY = metaY + 95;
  const rowHeight = 46;

  const drawDetailRow = (label: string, value: string, isHighlight: boolean = false) => {
    ctx.fillStyle = isHighlight ? '#FFF7ED' : '#F8FAFC';
    ctx.fillRect(50, currentY, width - 100, rowHeight);
    ctx.strokeStyle = isHighlight ? '#FB923C' : '#E2E8F0';
    ctx.lineWidth = isHighlight ? 2 : 1;
    ctx.strokeRect(50, currentY, width - 100, rowHeight);

    ctx.textAlign = 'left';
    ctx.font = 'bold 19px "Noto Sans Devanagari", "Mukta", sans-serif';
    ctx.fillStyle = isHighlight ? '#9A3412' : '#334155';
    ctx.fillText(label, 70, currentY + 30);

    ctx.font = isHighlight ? '900 26px "Noto Sans Devanagari", "Mukta", sans-serif' : '700 20px "Noto Sans Devanagari", "Mukta", sans-serif';
    ctx.fillStyle = isHighlight ? '#EA580C' : '#0F172A';
    ctx.fillText(value, 360, currentY + (isHighlight ? 32 : 30));

    currentY += rowHeight + 8;
  };

  const personLabel = isIncome ? 'जमादार / देणगीदाराचे नाव:' : 'स्वीकारणाऱ्याचे / खर्चाचे नाव:';
  const personValue = isIncome
    ? `${inc?.depositorName || 'अज्ञात'} (${inc?.depositorType || 'व्यक्ती'})`
    : `${exp?.recipientName || '---'} (${exp?.recipientType || 'व्यक्ती'})`;
  drawDetailRow(personLabel, personValue);

  const categoryLabel = isIncome ? 'जमा प्रकार / वर्गणी:' : 'खर्च वर्गवारी:';
  const categoryValue = isIncome ? (inc?.incomeType || 'सभासद वर्गणी') : (exp?.expenseCategory || 'इतर');
  drawDetailRow(categoryLabel, categoryValue);

  drawDetailRow('कारणाचे स्वरूप / तपशील:', transaction.reason || 'मंडळ कामकाज');

  const paymentDetailStr = `${transaction.paymentMethod || 'रोख'} ${
    transaction.paymentReference ? `(संदर्भ क्र.: ${transaction.paymentReference})` : ''
  }`;
  drawDetailRow('पेमेंट पद्धत / संदर्भ:', paymentDetailStr);

  drawDetailRow('एकूण रक्कम:', formatCurrency(transaction.amount), true);

  if (isIncome && (inc?.isPhysicalReceipt || inc?.receiptBookNo)) {
    drawDetailRow(
      'पावती पुस्तक संदर्भ:',
      `पुस्तक क्र. ${inc.receiptBookNo || '१'} (पावती अनुक्रमांक: #${inc.receiptSerialNo || '१'})`
    );
  }

  const approverStr = transaction.approvedBy
    ? `मंजूर (${transaction.approvedBy}${transaction.approvedByRole ? ` - ${transaction.approvedByRole}` : ''})`
    : 'मंजूर';
  drawDetailRow('मंजुरी दर्जा:', approverStr);

  // 6. Payment Proof Image Block (if attached)
  currentY += 15;
  if (hasProof && proofImg) {
    const proofBoxY = currentY;
    const proofBoxHeight = 360;

    ctx.fillStyle = '#FFF7ED';
    ctx.fillRect(50, proofBoxY, width - 100, proofBoxHeight);
    ctx.strokeStyle = '#FDBA74';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, proofBoxY, width - 100, proofBoxHeight);

    // Label on proof box (pure Marathi)
    ctx.fillStyle = '#7C2D12';
    ctx.font = 'bold 18px "Noto Sans Devanagari", "Mukta", sans-serif';
    ctx.fillText('📷 जोडलेला पेमेंट पुरावा / पावती प्रत:', 70, proofBoxY + 35);

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
    ctx.strokeStyle = '#EA580C';
    ctx.lineWidth = 2;
    ctx.strokeRect(drawX, drawY, drawW, drawH);

    currentY += proofBoxHeight + 20;
  } else {
    // No proof placeholder badge
    ctx.fillStyle = '#FFF7ED';
    ctx.fillRect(50, currentY, width - 100, 50);
    ctx.strokeStyle = '#FED7AA';
    ctx.lineWidth = 1;
    ctx.strokeRect(50, currentY, width - 100, 50);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#C2410C';
    ctx.font = '600 17px "Noto Sans Devanagari", "Mukta", sans-serif';
    ctx.fillText('ℹ️ ही थेट रोख / प्रत्यक्ष नोंद आहे (कोणताही डिजिटल पुरावा फोटो संलग्न नाही)', width / 2, currentY + 32);

    currentY += 65;
  }

  // 7. Official Signatures Section (Treasurer & Vice Treasurer)
  const sigSectionY = currentY + 10;
  ctx.fillStyle = '#FFF7ED';
  ctx.fillRect(50, sigSectionY, width - 100, 160);
  ctx.strokeStyle = '#FDBA74';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(50, sigSectionY, width - 100, 160);

  // Center Mandal Stamp / Seal
  ctx.textAlign = 'center';
  ctx.fillStyle = '#EA580C';
  ctx.font = 'bold 15px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('॥ मोरया ग्रुप अधिकृत मोहोर ॥', width / 2, sigSectionY + 80);
  ctx.strokeStyle = '#FB923C';
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
    ctx.font = 'italic 16px "Noto Sans Devanagari", "Mukta", sans-serif';
    ctx.fillText('[ डिजिटल स्वाक्षरी ]', leftSigX, sigSectionY + 65);
  }
  ctx.strokeStyle = '#7C2D12';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftSigX - 100, sigSectionY + 105);
  ctx.lineTo(leftSigX + 100, sigSectionY + 105);
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 18px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('खजिनदार स्वाक्षरी', leftSigX, sigSectionY + 130);
  ctx.fillStyle = '#7C2D12';
  ctx.font = '600 14px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText(`(${treasurerSigData?.officerName || 'अधिकृत खजिनदार'})`, leftSigX, sigSectionY + 150);

  // Right: Vice Treasurer Signature Block
  const rightSigX = width - 180;
  if (viceTreasurerSigImg) {
    const sigW = 160;
    const sigH = 65;
    ctx.drawImage(viceTreasurerSigImg, rightSigX - sigW / 2, sigSectionY + 25, sigW, sigH);
  } else {
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'italic 16px "Noto Sans Devanagari", "Mukta", sans-serif';
    ctx.fillText('[ डिजिटल स्वाक्षरी ]', rightSigX, sigSectionY + 65);
  }
  ctx.strokeStyle = '#7C2D12';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rightSigX - 100, sigSectionY + 105);
  ctx.lineTo(rightSigX + 100, sigSectionY + 105);
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 18px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('उपखजिनदार स्वाक्षरी', rightSigX, sigSectionY + 130);
  ctx.fillStyle = '#7C2D12';
  ctx.font = '600 14px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText(`(${viceTreasurerSigData?.officerName || 'अधिकृत उपखजिनदार'})`, rightSigX, sigSectionY + 150);

  // Footer Note (Pure Marathi)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = '500 13px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('हा ई-पावती दस्तऐवज मोरया ग्रुप वेब प्रणालीद्वारे आपोआप तयार करण्यात आला आहे. (moryagroupdata@gmail.com)', width / 2, height - 32);

  // Convert to DataURL and Blob
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const blob: Blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.92);
  });

  return { canvas, dataUrl, blob };
}
