/**
 * receiptCanvasGenerator.ts
 * Generates an official, crystal-clear Marathi receipt voucher card sized specifically to print TWO receipts
 * on a single vertical A4 portrait page (Half-A4 Portrait ratio).
 * 
 * Features:
 * - High-resolution crisp rendering (imageSmoothingQuality: 'high')
 * - Left: High-Definition Mandal Group Logo (circular frame + gold border)
 * - Right: High-Definition Mirrored Chhatrapati Shivaji Maharaj Image (circular frame + gold border)
 * - Center: All headings and mandal details centered perfectly
 * - Split two-column row architecture with strict width budgeting so names never overlap
 * - Pure Marathi date formatting (e.g. १९/०७/२०२६ (दुपारी ०१:२५)) and Devanagari numerals
 * - Official Saffron/Orange theme for income receipts, Red theme for expense vouchers
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
 * Formats date string into Marathi Devanagari date (उदा. १९/०७/२०२६)
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
 * Formats time from ISO or date string into Marathi 12-hour format
 * e.g. "दुपारी ०१:२५" or "सकाळी १०:३०"
 */
export function formatMarathiTime(isoOrDateStr?: string): string {
  if (!isoOrDateStr) return '';
  try {
    const d = new Date(isoOrDateStr);
    if (isNaN(d.getTime())) return '';
    const hours = d.getHours();
    const minutes = d.getMinutes();
    let period = 'सकाळी';
    if (hours >= 12 && hours < 16) {
      period = 'दुपारी';
    } else if (hours >= 16 && hours < 20) {
      period = 'संध्याकाळी';
    } else if (hours >= 20 || hours < 6) {
      period = 'रात्री';
    }
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    const minStr = String(minutes).padStart(2, '0');
    return `${period} ${toMarathiDigits(displayHour)}:${toMarathiDigits(minStr)}`;
  } catch {
    return '';
  }
}

/**
 * Formats full Marathi Date with Time (e.g. १९/०७/२०२६ (दुपारी ०१:२५))
 */
export function formatMarathiDateTime(isoOrDateStr?: string): string {
  if (!isoOrDateStr) return '---';
  const dateFormatted = formatMarathiDate(isoOrDateStr);
  const timeFormatted = formatMarathiTime(isoOrDateStr);
  return timeFormatted ? `${dateFormatted} (${timeFormatted})` : dateFormatted;
}

/**
 * Loads an image safely from a URL or Base64 string with complete bitmap decoding
 */
function loadImageSafe(src?: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (typeof img.decode === 'function') {
        img.decode().then(() => resolve(img)).catch(() => resolve(img));
      } else {
        resolve(img);
      }
    };
    img.onerror = () => {
      console.warn('Failed to load image for receipt canvas:', src.substring(0, 50));
      resolve(null);
    };
    img.src = src;
  });
}

/**
 * Formats a currency number in Marathi Devanagari INR style
 */
function formatCurrencyMarathi(amount: number): string {
  const formattedEn = Number(amount || 0).toLocaleString('en-IN');
  return `₹ ${toMarathiDigits(formattedEn)}/-`;
}

/**
 * Truncates text if it exceeds maxWidth to prevent overlap
 */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 3 && ctx.measureText(truncated + '…').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '…';
}

/**
 * Generates official receipt sized to fit 2 receipts on a single vertical A4 portrait page.
 * Uses 2x Super-Sampling (2400 x 1680 Ultra-HD resolution) for crystal-clear logo, emblem, and typography.
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

  // Logo Sources (High-Resolution Assets)
  const logoSource = options.groupLogo || getStoredGroupLogo() || moryaLogoDefault;
  const shivajiSource = options.shivajiLogo || shivajiMaharajDefault;

  // Load images in parallel with full bitmap decode
  const [logoImg, shivajiImg, treasurerSigImg, viceTreasurerSigImg] = await Promise.all([
    loadImageSafe(logoSource),
    loadImageSafe(shivajiSource),
    loadImageSafe(treasurerSigData?.signatureDataUrl),
    loadImageSafe(viceTreasurerSigData?.signatureDataUrl),
  ]);

  // Logical Sizing for Half A4 Portrait Page (1200 x 840)
  const width = 1200;
  const height = 840;
  const scaleFactor = 2; // 2x Super-Sampling -> 2400 x 1680 Ultra-HD output

  const canvas = document.createElement('canvas');
  canvas.width = width * scaleFactor;
  canvas.height = height * scaleFactor;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create 2D canvas context');

  // Scale rendering context for ultra-high pixel density
  ctx.scale(scaleFactor, scaleFactor);

  // Enable maximum rendering sharpness & bicubic smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

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
  const headerHeight = 158;
  ctx.fillStyle = '#7C2D12'; // Deep traditional maroon/amber
  ctx.fillRect(26, headerY, width - 52, headerHeight);

  // Left Side: Mandal Group Logo with Circular Gold Frame
  const logoSize = 126;
  const logoX = 44;
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

  // Right Side: Chhatrapati Shivaji Maharaj Image with Circular Gold Frame (Mirrored portrait)
  const shivajiX = width - 44 - logoSize;
  const shivajiY = headerY + (headerHeight - logoSize) / 2;

  if (shivajiImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(shivajiX + logoSize / 2, shivajiY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const minDim = Math.min(shivajiImg.width, shivajiImg.height);
    const srcX = (shivajiImg.width - minDim) / 2;
    const srcY = Math.max(0, (shivajiImg.height - minDim) * 0.12);
    ctx.drawImage(shivajiImg, srcX, srcY, minDim, minDim, shivajiX, shivajiY, logoSize, logoSize);
    ctx.restore();

    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(shivajiX + logoSize / 2, shivajiY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Center Heading Block (Centered in the middle between the two emblems)
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
  ctx.font = 'bold 15px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('स्थापना - २०११ | (रजि. नं. रजि. पुणे / ०००११२२/२०२३)', centerX, headerY + 143);

  // 3. Subheader Title Badge (Official Orange / भगवा Theme)
  const badgeY = headerY + headerHeight + 14;
  const badgeColor = '#EA580C';
  ctx.fillStyle = badgeColor;
  ctx.beginPath();
  ctx.roundRect(centerX - 240, badgeY, 480, 40, 20);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px "Noto Sans Devanagari", "Mukta", sans-serif';
  const badgeTitle = isIncome ? '✿ जमा पावती ✿' : '✿ खर्च पावती / व्हाऊचर ✿';
  ctx.fillText(badgeTitle, centerX, badgeY + 27);

  // 4. Metadata Strip (Receipt No, Date & Time, Financial Year)
  const metaY = badgeY + 50;
  const metaHeight = 46;
  ctx.fillStyle = '#FFF7ED';
  ctx.fillRect(36, metaY, width - 72, metaHeight);
  ctx.strokeStyle = '#FDBA74';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(36, metaY, width - 72, metaHeight);

  // Left: Receipt / Voucher No
  ctx.textAlign = 'left';
  ctx.font = 'bold 16px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillStyle = '#7C2D12';
  ctx.fillText(isIncome ? 'पावती क्र.:' : 'व्हाऊचर क्र.:', 52, metaY + 29);

  ctx.fillStyle = '#0F172A';
  ctx.font = '900 18px "Noto Sans Devanagari", "Mukta", monospace';
  const rawReceiptNo = inc?.receiptNumber ? `#${inc.receiptNumber}` : transaction.transactionNo;
  const receiptNoStr = toMarathiDigits(rawReceiptNo);
  ctx.fillText(receiptNoStr, 165, metaY + 29);

  // Center: Date & Time in Marathi
  const txnDateRaw = isIncome ? inc?.transactionDate : exp?.expenseDate;
  const entryTimeStr = formatMarathiTime(transaction.createdAt);
  const dateTimeStr = formatMarathiDate(txnDateRaw) + (entryTimeStr ? ` (${entryTimeStr})` : '');
  ctx.font = 'bold 16px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillStyle = '#7C2D12';
  ctx.fillText('दिनांक:', 450, metaY + 29);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 17px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText(dateTimeStr, 515, metaY + 29);

  // Right: Financial Year
  const finYearStr = toMarathiDigits(transaction.financialYear || '2026-2027');
  ctx.font = 'bold 16px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillStyle = '#7C2D12';
  ctx.fillText('आर्थिक वर्ष:', 920, metaY + 29);
  ctx.fillStyle = '#EA580C';
  ctx.font = 'bold 18px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText(finYearStr, 1020, metaY + 29);

  // 5. Details Section (Clean, Independent Dual-Column Layout with zero overlap)
  let currentY = metaY + metaHeight + 10;
  const rowHeight = 38;
  const tableWidth = width - 72; // 1128px
  const colGap = 12;
  const halfColWidth = (tableWidth - colGap) / 2; // 558px

  /**
   * Draws a full-width single detail row (Clean, standard unhighlighted background)
   */
  const drawFullRow = (label: string, value: string) => {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(36, currentY, tableWidth, rowHeight);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.strokeRect(36, currentY, tableWidth, rowHeight);

    ctx.textAlign = 'left';
    ctx.font = 'bold 15px "Noto Sans Devanagari", "Mukta", sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(label, 50, currentY + 25);

    ctx.font = '700 18px "Noto Sans Devanagari", "Mukta", sans-serif';
    ctx.fillStyle = '#0F172A';
    const labelWidth = ctx.measureText(label).width;
    const valueStartX = Math.max(260, 50 + labelWidth + 15);
    const maxValWidth = tableWidth - (valueStartX - 36) - 15;
    ctx.fillText(fitText(ctx, value, maxValWidth), valueStartX, currentY + 25);

    currentY += rowHeight + 5;
  };

  /**
   * Draws a two-column row with dedicated independent boxes so texts NEVER collide
   */
  const drawTwoColumnRow = (
    leftLabel: string,
    leftValue: string,
    rightLabel: string,
    rightValue: string,
    leftValueColor: string = '#0F172A',
    rightValueColor: string = '#0F172A'
  ) => {
    // Left Box
    const leftX = 36;
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(leftX, currentY, halfColWidth, rowHeight);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.strokeRect(leftX, currentY, halfColWidth, rowHeight);

    ctx.textAlign = 'left';
    ctx.font = 'bold 15px "Noto Sans Devanagari", "Mukta", sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(leftLabel, leftX + 14, currentY + 25);

    const leftLabelW = ctx.measureText(leftLabel).width;
    const leftValX = leftX + 14 + leftLabelW + 10;
    const maxLeftValW = halfColWidth - (leftValX - leftX) - 10;
    ctx.font = '700 16px "Noto Sans Devanagari", "Mukta", sans-serif';
    ctx.fillStyle = leftValueColor;
    ctx.fillText(fitText(ctx, leftValue, maxLeftValW), leftValX, currentY + 25);

    // Right Box
    const rightX = 36 + halfColWidth + colGap;
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(rightX, currentY, halfColWidth, rowHeight);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.strokeRect(rightX, currentY, halfColWidth, rowHeight);

    ctx.font = 'bold 15px "Noto Sans Devanagari", "Mukta", sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(rightLabel, rightX + 14, currentY + 25);

    const rightLabelW = ctx.measureText(rightLabel).width;
    const rightValX = rightX + 14 + rightLabelW + 10;
    const maxRightValW = halfColWidth - (rightValX - rightX) - 10;
    ctx.font = '700 16px "Noto Sans Devanagari", "Mukta", sans-serif';
    ctx.fillStyle = rightValueColor;
    ctx.fillText(fitText(ctx, rightValue, maxRightValW), rightValX, currentY + 25);

    currentY += rowHeight + 5;
  };

  // Row 1: Depositor / Vendor Name (Full Row)
  const personLabel = isIncome ? 'जमादार / देणगीदाराचे नाव:' : 'स्वीकारणाऱ्याचे नाव:';
  const personValue = isIncome
    ? `${inc?.depositorName || 'अज्ञात'} (${inc?.depositorType || 'व्यक्ती'})`
    : `${exp?.recipientName || '---'} (${exp?.recipientType || 'व्यक्ती'})`;
  drawFullRow(personLabel, personValue);

  // Row 2: Category (Left) & Reason/Detail (Right)
  const categoryLabel = isIncome ? 'जमा प्रकार / वर्गणी:' : 'खर्च वर्गवारी:';
  const categoryValue = isIncome ? (inc?.incomeType || 'सभासद वर्गणी') : (exp?.expenseCategory || 'इतर');
  drawTwoColumnRow(
    categoryLabel,
    categoryValue,
    'तपशील / कारण:',
    transaction.reason || 'मंडळ कामकाज'
  );

  // Row 3: Payment Method (Left) & Reference / Cash Receiver (Right)
  const isPendingIncome = isIncome && inc?.paymentStatus === 'PENDING';
  const isCash = !isPendingIncome && transaction.paymentMethod === 'रोख';
  const paymentMethodStr = isPendingIncome
    ? '⏳ येणे बाकी (Pending)'
    : isCash
    ? 'रोख (Cash)'
    : (transaction.paymentMethod || 'रोख');
  const paymentRefLabel = isPendingIncome
    ? 'रक्कम स्थिती:'
    : isCash && isIncome && inc?.cashReceiverName
    ? 'रोख स्वीकारक सभासद:'
    : 'पेमेंट संदर्भ क्र.:';
  const paymentRefStr = isPendingIncome
    ? 'मिळणे बाकी (Pending Collection)'
    : isCash && isIncome && inc?.cashReceiverName 
    ? inc.cashReceiverName 
    : (transaction.paymentReference && transaction.paymentReference !== 'नमूद नाही' ? toMarathiDigits(transaction.paymentReference) : '---');
  drawTwoColumnRow(
    'पेमेंट पद्धत:',
    paymentMethodStr,
    paymentRefLabel,
    paymentRefStr
  );

  // Row 4: Total Amount (Clean Full Width Row)
  drawFullRow('एकूण रक्कम:', formatCurrencyMarathi(transaction.amount));

  // Row 5: Approval Status (Left Box) & Entry Maker (Right Box) - Completely Separated!
  const approverStr = transaction.approvedBy
    ? `मंजूर (${transaction.approvedBy})`
    : 'मंजूर';
  const entryMakerStr = transaction.createdBy || 'कार्यकर्ता';

  drawTwoColumnRow(
    'मंजुरी दर्जा:',
    approverStr,
    'नोंदणीकर्ता:',
    entryMakerStr,
    '#059669', // Emerald green for approved
    '#0F172A'  // Slate for entry maker
  );

  // Row 6 (Optional): Physical Receipt Book or Payment Proof Reference & Payment Collection Status
  if (isIncome && (inc?.isPhysicalReceipt || inc?.receiptBookNo)) {
    const isPending = inc.paymentStatus === 'PENDING';
    const statusText = isPending ? '⏳ रक्कम येणे बाकी (Pending)' : '✅ रक्कम जमा (Received)';
    const statusColor = isPending ? '#D97706' : '#059669';
    const bookRef = `पु. क्र. ${toMarathiDigits(inc.receiptBookNo || '1')} (पावती #${toMarathiDigits(inc.receiptSerialNo || '1')})`;
    drawTwoColumnRow(
      'पावती पुस्तक संदर्भ:',
      bookRef,
      'रक्कम स्थिती:',
      statusText,
      '#0F172A',
      statusColor
    );
  } else if (transaction.attachmentUrl) {
    drawFullRow('संलग्न पेमेंट पुरावा:', '📁 Google Drive वर मूळ पावती/पुरावा सुरक्षित जतन');
  }

  // 6. Signatures Section (Treasurer, Vice-Treasurer & Mandal Seal)
  const sigSectionY = currentY + 6;
  const sigHeight = 120;
  ctx.fillStyle = '#FFF7ED';
  ctx.fillRect(36, sigSectionY, tableWidth, sigHeight);
  ctx.strokeStyle = '#FDBA74';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(36, sigSectionY, tableWidth, sigHeight);

  // Center Mandal Stamp / Seal
  ctx.textAlign = 'center';
  ctx.fillStyle = '#EA580C';
  ctx.font = 'bold 14px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('॥ मोरया ग्रुप अधिकृत मोहोर ॥', centerX, sigSectionY + 60);
  ctx.strokeStyle = '#FB923C';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, sigSectionY + 56, 36, 0, Math.PI * 2);
  ctx.stroke();

  // Left: Treasurer Signature Block
  const leftSigX = 180;
  if (treasurerSigImg) {
    const sigW = 135;
    const sigH = 48;
    ctx.drawImage(treasurerSigImg, leftSigX - sigW / 2, sigSectionY + 12, sigW, sigH);
  } else {
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'italic 14px "Noto Sans Devanagari", "Mukta", sans-serif';
    ctx.fillText('[ डिजिटल स्वाक्षरी ]', leftSigX, sigSectionY + 45);
  }
  ctx.strokeStyle = '#7C2D12';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftSigX - 85, sigSectionY + 72);
  ctx.lineTo(leftSigX + 85, sigSectionY + 72);
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 15px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('खजिनदार स्वाक्षरी', leftSigX, sigSectionY + 92);
  if (treasurerSigData?.officerName && treasurerSigData.officerName.trim() !== '') {
    ctx.fillStyle = '#7C2D12';
    ctx.font = '600 13px "Noto Sans Devanagari", "Mukta", sans-serif';
    ctx.fillText(`(${treasurerSigData.officerName.trim()})`, leftSigX, sigSectionY + 110);
  }

  // Right: Vice Treasurer Signature Block
  const rightSigX = width - 180;
  if (viceTreasurerSigImg) {
    const sigW = 135;
    const sigH = 48;
    ctx.drawImage(viceTreasurerSigImg, rightSigX - sigW / 2, sigSectionY + 12, sigW, sigH);
  } else {
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'italic 14px "Noto Sans Devanagari", "Mukta", sans-serif';
    ctx.fillText('[ डिजिटल स्वाक्षरी ]', rightSigX, sigSectionY + 45);
  }
  ctx.strokeStyle = '#7C2D12';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rightSigX - 85, sigSectionY + 72);
  ctx.lineTo(rightSigX + 85, sigSectionY + 72);
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 15px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('उपखजिनदार स्वाक्षरी', rightSigX, sigSectionY + 92);
  if (viceTreasurerSigData?.officerName && viceTreasurerSigData.officerName.trim() !== '') {
    ctx.fillStyle = '#7C2D12';
    ctx.font = '600 13px "Noto Sans Devanagari", "Mukta", sans-serif';
    ctx.fillText(`(${viceTreasurerSigData.officerName.trim()})`, rightSigX, sigSectionY + 110);
  }

  // 7. Footer Note
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = '500 12px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.fillText('हा ई-पावती दस्तऐवज मोरया ग्रुप वेब प्रणालीद्वारे तयार करण्यात आला आहे. (moryagroupdata@gmail.com)', centerX, height - 16);

  // Convert to high quality DataURL and Blob (0.98 quality)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
  const blob: Blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.98);
  });

  return { canvas, dataUrl, blob };
}
