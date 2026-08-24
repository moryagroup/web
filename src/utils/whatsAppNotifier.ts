/**
 * whatsAppNotifier.ts
 * Formats official Marathi WhatsApp notification messages and provides 1-tap WhatsApp sharing.
 */

import { NativeService } from '../services/nativeService';
import { toMarathiDigits, formatMarathiDate } from './receiptCanvasGenerator';

export const WhatsAppNotifier = {
  /**
   * Format income / subscription / donation WhatsApp message
   */
  formatIncomeReceiptMessage(params: {
    receiptNo?: string;
    transactionNo: string;
    memberName?: string;
    depositorName: string;
    amount: number;
    incomeType: string;
    paymentMethod: string;
    dateStr: string;
    financialYear?: string;
    receiverName?: string;
  }): string {
    const rawNo = params.receiptNo ? `#${params.receiptNo}` : params.transactionNo;
    const marathiNo = toMarathiDigits(rawNo);
    const marathiAmount = toMarathiDigits(Number(params.amount || 0).toLocaleString('en-IN'));
    const marathiDate = formatMarathiDate(params.dateStr);

    let msg = `🚩 *मोरया ग्रुप मित्र मंडळ (ट्रस्ट)* 🚩\n`;
    msg += `हडपसर गोंधळनगर, पुणे - ४११०२८\n\n`;
    msg += `॥ श्री गणेशाय नमः ॥\n\n`;
    msg += `📄 *अधिकृत जमा पावती पावती क्र.:* ${marathiNo}\n`;
    msg += `👤 *जमादार / देणगीदार:* ${params.depositorName || params.memberName || '---'}\n`;
    msg += `💰 *जमा रक्कम:* ₹ ${marathiAmount}/-\n`;
    msg += `🏷️ *प्रकार:* ${params.incomeType}\n`;
    msg += `💳 *पेमेंट पद्धत:* ${params.paymentMethod}\n`;
    if (params.receiverName) {
      msg += `🤝 *रोख स्वीकारक:* ${params.receiverName}\n`;
    }
    msg += `📅 *दिनांक:* ${marathiDate}\n`;
    msg += `🗓️ *आर्थिक वर्ष:* ${toMarathiDigits(params.financialYear || '2026-2027')}\n\n`;
    msg += `✨ *आपल्या सहकार्याबद्दल मनःपूर्वक धन्यवाद!* ✨\n`;
    msg += `_मोरया ग्रुप डिजिटल प्रणालीद्वारे नोंदणीकृत._`;

    return msg;
  },

  /**
   * Format task assignment WhatsApp message
   */
  formatTaskAssignmentMessage(params: {
    occasionName: string;
    taskTitle: string;
    assignedMemberName: string;
    assignedMemberRole?: string;
    teamMembersCount?: number;
    notes?: string;
  }): string {
    let msg = `🚩 *मोरया ग्रुप - नवीन जबाबदारी नियुक्त* 🚩\n\n`;
    msg += `🎉 *उत्सव / कार्यक्रम:* ${params.occasionName}\n`;
    msg += `📋 *जबाबदारीचे काम:* ${params.taskTitle}\n`;
    msg += `👤 *प्रमुख जबाबदार सभासद:* ${params.assignedMemberName}${params.assignedMemberRole ? ` (${params.assignedMemberRole})` : ''}\n`;
    if (params.teamMembersCount && params.teamMembersCount > 0) {
      msg += `👥 *सहकारी टीम सदस्य:* ${toMarathiDigits(params.teamMembersCount)} सदस्य नियुक्त\n`;
    }
    if (params.notes) {
      msg += `📝 *कामाचा तपशील / सूचना:* ${params.notes}\n`;
    }
    msg += `\n⚡ कृपया वेळेत नियोजन पूर्ण करावे ही नम्र विनंती. गणपती बाप्पा मोरया! 🚩`;

    return msg;
  },

  /**
   * Format task obstacle / issue WhatsApp message
   */
  formatTaskObstacleMessage(params: {
    occasionName: string;
    taskTitle: string;
    assignedMemberName: string;
    obstacleDetails: string;
  }): string {
    let msg = `⚠️ *मोरया ग्रुप - कामात तातडीची अडचण / समस्या* ⚠️\n\n`;
    msg += `🎉 *कार्यक्रम:* ${params.occasionName}\n`;
    msg += `📋 *काम:* ${params.taskTitle}\n`;
    msg += `👤 *नोंदवणारे सभासद:* ${params.assignedMemberName}\n`;
    msg += `🛑 *अडचणीचा तपशील:* ${params.obstacleDetails}\n\n`;
    msg += `⚡ सर्व प्रमुख पदाधिकाऱ्यांनी व ॲडमिनने तातडीने लक्ष द्यावे.`;

    return msg;
  },

  /**
   * Format cash settlement WhatsApp message
   */
  formatSettlementMessage(params: {
    memberName: string;
    amount: number;
    destination: string;
    dateStr: string;
    bankRefNo?: string;
  }): string {
    const marathiAmount = toMarathiDigits(Number(params.amount || 0).toLocaleString('en-IN'));
    const marathiDate = formatMarathiDate(params.dateStr);

    let msg = `🏦 *मोरया ग्रुप - रोख रक्कम भरणा / सेटलमेंट* 🏦\n\n`;
    msg += `👤 *सभासद:* ${params.memberName}\n`;
    msg += `💰 *जमा केलेली रक्कम:* ₹ ${marathiAmount}/-\n`;
    msg += `🏛️ *जमा ठिकाण:* ${params.destination}\n`;
    if (params.bankRefNo) {
      msg += `🔢 *बँक संदर्भ क्र.:* ${params.bankRefNo}\n`;
    }
    msg += `📅 *दिनांक:* ${marathiDate}\n\n`;
    msg += `_खजिनदार व ॲडमिन पडताळणीसाठी पाठवले._`;

    return msg;
  },

  /**
   * Format generic profile update WhatsApp message
   */
  formatProfileUpdateMessage(params: {
    memberName: string;
    updateType: string;
    details: string;
  }): string {
    let msg = `👤 *मोरया ग्रुप - सभासद प्रोफाइल अपडेट* 👤\n\n`;
    msg += `नाव: *${params.memberName}*\n`;
    msg += `अपडेट: *${params.updateType}*\n`;
    msg += `तपशील: ${params.details}\n\n`;
    msg += `_मोरया ग्रुप डिजिटल प्रणाली._`;
    return msg;
  },

  /**
   * Open WhatsApp with text (via URL or Web/Native share)
   */
  async shareToWhatsApp(text: string, phone?: string): Promise<boolean> {
    try {
      // Clean phone number if provided
      let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
      if (cleanPhone.length === 10) {
        cleanPhone = `91${cleanPhone}`;
      }

      const encoded = encodeURIComponent(text);
      const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;

      // If running on native mobile or desktop browser
      if (window && window.open) {
        window.open(url, '_blank');
        return true;
      }

      return await NativeService.shareReceipt('मोरया ग्रुप सूचना', text);
    } catch (e) {
      console.error('[WhatsAppNotifier] Error opening WhatsApp:', e);
      return false;
    }
  },
};
