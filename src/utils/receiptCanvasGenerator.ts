/**
 * receiptCanvasGenerator.ts
 * Generates an official Marathi receipt voucher card sized specifically to print TWO receipts
 * on a single vertical A4 portrait page.
 * 
 * Features:
 * - Left: Mandal Group Logo (circular frame + gold border)
 * - Right: Chhatrapati Shivaji Maharaj Image (circular frame + gold border)
 * - Center: All headings and mandal details centered
 * - Pure Marathi date formatting (e.g. १८/०८/२०२६) and Devanagari numerals
 * - Official Saffron/Orange theme for income receipts
 * - Signatures of Treasurer and Vice Treasurer with official mandal seal
 */

import { IncomeTransaction, ExpenseTransaction } from '../types';
import { getTreasurerSignature, getViceTreasurerSignature } from '../services/signatureService';
import { getStoredGroupLogo } from '../services/storageService';
import moryaLogoDefault from '../assets/morya_logo.jpg';
import shivajiMaharajDefault from '../assets/shivaji_maharaj.jpg';

export interface GenerateReceiptOptions {
  transaction: IncomeTransaction | ExpenseTransaction;
  type: 'INCOME' | 'EXPENSE';
  groupLogo?: string;
  shivajiLogo?: string;
  treasurerName?: string;
  viceTreasurerName?: string;
  watermarkText?: string;
}

/**
 * Converts English digits (0-9) to Marathi Devanagari digits (०-९)
 */
export function toMarathiDigits(numOrStr: string | number): string {
  const marathiDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return String(numOrStr).replace(/[0-9]/g, (d) => marathiDigits[parseInt(d, 10)]);
}

/**
 * Formats date string into Marathi Devanagari date (उदा. १८/०८/२०२६)
 */
export function formatMarathiDate(dateStr?: string): string {
  if (!dateStr) return '---';
  const clean = dateStr.trim();
  const parts = clean.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD -> DD/MM/YYYY
      const [year, month, day] = parts;
      return toMarathiDigits(`${day}/${month}/${year}`);
    } else {
      // DD/MM/YYYY
      const [day, month, year] = parts;
      return toMarathiDigits(`${day}/${month}/${year}`);
    }
  }
  return toMarathiDigits(clean);
}

/**
 * Formats a currency number in Marathi Devanagari INR style
 */
function formatCurrencyMarathi(amount: number): string {
  const formattedEn = Number(amount || 0).toLocaleString('en-IN');
  return `₹ ${toMarathiDigits(formattedEn)}/-`;
}

/**
 * Loads an image safely from a URL or Base64 string
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
 * Generates official receipt sized to fit 2 receipts on a single vertical A4 portrait page.
 * Canvas Dimensions: 1200 x 820 (Standard half-A4 ratio: ~1.46:1)
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

  // Logo Sources
  const logoSource = options.groupLogo || getStoredGroupLogo() || moryaLogoDefault;
  const shivajiSource = options.shivajiLogo || shivajiMaharajDefault;

  // Load images in parallel
  const [logoImg, shivajiImg, treasurerSigImg, viceTreasurerSigImg] = await Promise.all([
    loadImageSafe(logoSource),
    loadImageSafe(shivajiSource),
    loadImageSafe(treasurerSigData?.signatureDataUrl),
    loadImageSafe(viceTreasurerSigData?.signatureDataUrl),
  ]);

  // Sizing for Half A4 Portrait Page
  const width = 1200;
  const height = 820;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create 2D canvas context');

  // 1. Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Decorative Border
  ctx.strokeStyle = '#EA580C'; // Vibrant Orange / भगवा
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, width - 28, height - 28);

  ctx.strokeStyle = '#FED7AA'; // Soft orange border
  ctx.lineWidth = 2.5;
  ctx.strokeRect(22, 22, width - 44, height - 44);

  // 2. Header Banner
  const headerY = 26;
  const headerHeight = 160;
  ctx.fillStyle = '#7C2D12'; // Deep traditional maroon/amber
  ctx.fillRect(26, headerY, width - 52, headerHeight);

  // Left Side: Mandal Group Logo with Circular Frame
  const logoSize = 120;
  const logoX = 45;
  const logoY = headerY + (headerHeight - logoSize) / 2;

  if (logoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const minDim = Math.min(logoImg.width, logoImg.height);
    const srcX = (logoImg.width - minDim) / 2;
    const srcY = (logoImg.height - minDim) / 2;
    ctx.drawImage(logoImg, srcX, srcY, minDim, minDim, logoX, logoY, logoSize, logoSize);
    ctx.restore();

    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Right Side: Chhatrapati Shivaji Maharaj Image with Circular Frame (Mirrored portrait)
  const shivajiX = width - 45 - logoSize;
  const shivajiY = headerY + (headerHeight - logoSize) / 2;

  if (shivajiImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(shivajiX + logoSize / 2, shivajiY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const minDim = Math.min(shivajiImg.width, shivajiImg.height);
    const srcX = (shivajiImg.width - minDim) / 2;
    // Focus on head/turban and face
    const srcY = Math.max(0, (shivajiImg.height - minDim) * 0.15);
    ctx.drawImage(shivajiImg, srcX, srcY, minDim, minDim, shivajiX, shivajiY, logoSize, logoSize);
    ctx.restore();

    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(shivajiX + logoSize / 2, shivajiY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Center Heading Block (Centered exactly in the middle of the canvas)
  const centerX = width / 2;
  ctx.textAlign = 'center';

  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 20px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('॥ श्री गणेशाय नमः ॥', centerX, headerY + 34);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 36px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('मोरया ग्रुप मित्र मंडळ (ट्रस्ट)', centerX, headerY + 76);

  ctx.fillStyle = '#FFEDD5';
  ctx.font = '600 18px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('हडपसर गोंधळनगर, पुणे - ४११०२८', centerX, headerY + 112);

  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 16px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('स्थापना - २०११ | (रजि. नं. रजि. पुणे / ०००११२२/२०२३)', centerX, headerY + 144);

  // 3. Subheader Title Badge (Orange for Income, Red for Expense)
  const badgeY = headerY + headerHeight + 14;
  const badgeColor = isIncome ? '#EA580C' : '#DC2626';
  ctx.fillStyle = badgeColor;
  ctx.beginPath();
  ctx.roundRect(centerX - 240, badgeY, 480, 42, 21);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px "Noto Sans Devanagari", "Mukta", sans-serif';
  const badgeTitle = isIncome ? '★ अधिकृत जमा पावती ★' : '★ अधिकृत खर्च पावती / व्हाऊचर ★';
  ctx.fillText(badgeTitle, centerX, badgeY + 28);

  // 4. Metadata Strip (Receipt No, Date in Marathi, Financial Year)
  const metaY = badgeY + 54;
  const metaHeight = 48;
  ctx.fillStyle = '#FFF7ED';
  ctx.fillRect(36, metaY, width - 72, metaHeight);
  ctx.strokeStyle = '#FDBA74';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(36, metaY, width - 72, metaHeight);

  // Left: Receipt No
  ctx.textAlign = 'left';
  ctx.font = 'bold 16px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillStyle = '#7C2D12';
  ctx.fillText(isIncome ? 'पावती क्र.:' : 'व्हाऊचर क्र.:', 52, metaY + 30);

  ctx.fillStyle = '#0F172A';
  ctx.font = '900 18px "Noto Sans Devanagari", "Mukta", monospace';
  const rawReceiptNo = inc?.receiptNumber ? `#${inc.receiptNumber}` : transaction.transactionNo;
  const receiptNoStr = toMarathiDigits(rawReceiptNo);
  ctx.fillText(receiptNoStr, 170, metaY + 30);

  // Center: Date in Marathi
  const txnDateRaw = isIncome ? inc?.transactionDate : exp?.expenseDate;
  const marathiDateStr = formatMarathiDate(txnDateRaw);
  ctx.font = 'bold 16px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillStyle = '#7C2D12';
  ctx.fillText('दिनांक:', 550, metaY + 30);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 18px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText(marathiDateStr, 615, metaY + 30);

  // Right: Financial Year
  const finYearStr = toMarathiDigits(transaction.financialYear || '2026-2027');
  ctx.font = 'bold 16px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillStyle = '#7C2D12';
  ctx.fillText('आर्थिक वर्ष:', 920, metaY + 30);
  ctx.fillStyle = '#EA580C';
  ctx.font = 'bold 18px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText(finYearStr, 1025, metaY + 30);

  // 5. Details Section (Clean, Compact, High-Legibility Table)
  let currentY = metaY + metaHeight + 12;
  const rowHeight = 40;

  const drawDetailRow = (
    label: string,
    value: string,
    isHighlight: boolean = false,
    secondaryLabel?: string,
    secondaryValue?: string
  ) => {
    ctx.fillStyle = isHighlight ? '#FFF7ED' : '#F8FAFC';
    ctx.fillRect(36, currentY, width - 72, rowHeight);
    ctx.strokeStyle = isHighlight ? '#FB923C' : '#E2E8F0';
    ctx.lineWidth = isHighlight ? 2 : 1;
    ctx.strokeRect(36, currentY, width - 72, rowHeight);

    ctx.textAlign = 'left';
    ctx.font = 'bold 16px "Noto Sans Devanagari", "Mukta", sans-serif';
    ctx.fillStyle = isHighlight ? '#9A3412' : '#475569';
    ctx.fillText(label, 52, currentY + 26);

    ctx.font = isHighlight ? '900 23px "Noto Sans Devanagari", "Mukta", sans-serif' : '700 17px "Noto Sans Devanagari", "Mukta", sans-serif';
    ctx.fillStyle = isHighlight ? '#EA580C' : '#0F172A';
    ctx.fillText(value, 300, currentY + 26);

    if (secondaryLabel && secondaryValue) {
      ctx.font = 'bold 16px "Noto Sans Devanagari", "Mukta", sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(secondaryLabel, 680, currentY + 26);

      ctx.font = '700 17px "Noto Sans Devanagari", "Mukta", sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.fillText(secondaryValue, 820, currentY + 26);
    }

    currentY += rowHeight + 6;
  };

  // Row 1: Depositor / Vendor Name
  const personLabel = isIncome ? 'जमादार / देणगीदार नाव:' : 'स्वीकारणाऱ्याचे नाव:';
  const personValue = isIncome
    ? `${inc?.depositorName || 'अज्ञात'} (${inc?.depositorType || 'व्यक्ती'})`
    : `${exp?.recipientName || '---'} (${exp?.recipientType || 'व्यक्ती'})`;
  drawDetailRow(personLabel, personValue);

  // Row 2: Category & Purpose
  const categoryLabel = isIncome ? 'जमा प्रकार / वर्गणी:' : 'खर्च वर्गवारी:';
  const categoryValue = isIncome ? (inc?.incomeType || 'सभासद वर्गणी') : (exp?.expenseCategory || 'इतर');
  drawDetailRow(categoryLabel, categoryValue, false, 'तपशील / कारण:', transaction.reason || 'मंडळ कामकाज');

  // Row 3: Payment Method
  const paymentRefStr = transaction.paymentReference ? `(संदर्भ: ${toMarathiDigits(transaction.paymentReference)})` : '';
  const paymentDetailStr = `${transaction.paymentMethod || 'रोख'} ${paymentRefStr}`.trim();
  drawDetailRow('पेमेंट पद्धत / संदर्भ:', paymentDetailStr);

  // Row 4: Total Amount (Vibrant Highlight)
  drawDetailRow('एकूण रक्कम:', formatCurrencyMarathi(transaction.amount), true);

  // Row 5: Approval Status & Entry Maker Name
  const approverStr = transaction.approvedBy
    ? `मंजूर (${transaction.approvedBy})`
    : 'मंजूर';
  const entryMakerStr = transaction.createdBy || 'कार्यकर्ता / ॲडमिन';

  drawDetailRow('मंजुरी दर्जा:', approverStr, false, 'नोंदणीकर्ता (Entry By):', entryMakerStr);

  // Row 6 (Optional): Physical Receipt Book or Payment Proof Reference
  if (isIncome && (inc?.isPhysicalReceipt || inc?.receiptBookNo)) {
    const bookRef = `पुस्तक क्र. ${toMarathiDigits(inc.receiptBookNo || '1')} (पावती अनुक्रमांक: #${toMarathiDigits(inc.receiptSerialNo || '1')})`;
    drawDetailRow('पावती पुस्तक संदर्भ:', bookRef);
  } else if (transaction.attachmentUrl) {
    drawDetailRow('संलग्न पेमेंट पुरावा:', '📁 Google Drive वर मूळ पावती/पुरावा जतन');
  }

  // 6. Signatures Section (Treasurer, Vice-Treasurer & Mandal Seal)
  const sigSectionY = currentY + 8;
  const sigHeight = 125;
  ctx.fillStyle = '#FFF7ED';
  ctx.fillRect(36, sigSectionY, width - 72, sigHeight);
  ctx.strokeStyle = '#FDBA74';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(36, sigSectionY, width - 72, sigHeight);

  // Center Mandal Stamp / Seal
  ctx.textAlign = 'center';
  ctx.fillStyle = '#EA580C';
  ctx.font = 'bold 14px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('॥ मोरया ग्रुप अधिकृत मोहोर ॥', centerX, sigSectionY + 62);
  ctx.strokeStyle = '#FB923C';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, sigSectionY + 58, 38, 0, Math.PI * 2);
  ctx.stroke();

  // Left: Treasurer Signature Block
  const leftSigX = 180;
  if (treasurerSigImg) {
    const sigW = 140;
    const sigH = 50;
    ctx.drawImage(treasurerSigImg, leftSigX - sigW / 2, sigSectionY + 12, sigW, sigH);
  } else {
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'italic 14px "Noto Sans Devanagari", "Mukta", sans-serif';
    ctx.fillText('[ डिजिटल स्वाक्षरी ]', leftSigX, sigSectionY + 45);
  }
  ctx.strokeStyle = '#7C2D12';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftSigX - 85, sigSectionY + 74);
  ctx.lineTo(leftSigX + 85, sigSectionY + 74);
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 15px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('खजिनदार स्वाक्षरी', leftSigX, sigSectionY + 95);
  ctx.fillStyle = '#7C2D12';
  ctx.font = '600 13px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText(`(${treasurerSigData?.officerName || 'अधिकृत खजिनदार'})`, leftSigX, sigSectionY + 114);

  // Right: Vice Treasurer Signature Block
  const rightSigX = width - 180;
  if (viceTreasurerSigImg) {
    const sigW = 140;
    const sigH = 50;
    ctx.drawImage(viceTreasurerSigImg, rightSigX - sigW / 2, sigSectionY + 12, sigW, sigH);
  } else {
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'italic 14px "Noto Sans Devanagari", "Mukta", sans-serif';
    ctx.fillText('[ डिजिटल स्वाक्षरी ]', rightSigX, sigSectionY + 45);
  }
  ctx.strokeStyle = '#7C2D12';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rightSigX - 85, sigSectionY + 74);
  ctx.lineTo(rightSigX + 85, sigSectionY + 74);
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 15px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('उपखजिनदार स्वाक्षरी', rightSigX, sigSectionY + 95);
  ctx.fillStyle = '#7C2D12';
  ctx.font = '600 13px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText(`(${viceTreasurerSigData?.officerName || 'अधिकृत उपखजिनदार'})`, rightSigX, sigSectionY + 114);

  // 7. Footer Note
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = '500 12px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('हा ई-पावती दस्तऐवज मोरया ग्रुप वेब प्रणालीद्वारे तयार करण्यात आला आहे. (moryagroupdata@gmail.com)', centerX, height - 16);

  // Convert to DataURL and Blob
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const blob: Blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.92);
  });

  return { canvas, dataUrl, blob };
}
