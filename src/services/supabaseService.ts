/**
 * supabaseService.ts
 * Production-grade Supabase Database, CDN Image Storage, and Real-Time WebSocket Service
 * for Morya Group ERP Web App.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  Member,
  IncomeTransaction,
  ExpenseTransaction,
  OccasionEvent,
  EventGalleryImage,
  MemberSuggestion,
  ApprovalStatus,
  CashSettlement,
} from '../types';
import {
  INITIAL_MEMBERS,
  INITIAL_OCCASIONS,
  INITIAL_EVENT_GALLERY,
} from '../mockData';
import { addDeletedSettlementId, getDeletedSettlementIds } from './storageService';

const BUCKET_NAME = 'morya-assets';

// ─── Image Storage Helpers (Uploads to Supabase CDN Bucket 'morya-assets') ──

export async function uploadImageToSupabaseStorage(
  file: File | Blob,
  folder: 'profiles' | 'logos' | 'occasions' | 'gallery' | 'bills',
  fileName: string
): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase project URL and Key are required for CDN uploads.');
  }

  const cleanFileName = `${folder}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(cleanFileName, file, {
      cacheControl: '360000',
      upsert: true,
    });

  if (error) {
    console.error('[Supabase Storage] Upload error:', error);
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

export async function uploadBase64ImageToSupabase(
  base64Data: string,
  folder: 'profiles' | 'logos' | 'occasions' | 'gallery' | 'bills',
  fileName: string
): Promise<string> {
  if (!isSupabaseConfigured) return base64Data;
  if (!base64Data || (!base64Data.startsWith('data:') && !base64Data.startsWith('blob:'))) {
    return base64Data;
  }
  try {
    const res = await fetch(base64Data);
    const blob = await res.blob();
    return await uploadImageToSupabaseStorage(blob, folder, fileName);
  } catch (err) {
    console.warn('[Supabase Storage] Base64 upload error:', err);
    return base64Data;
  }
}

// ─── Members Table CRUD ─────────────────────────────────────────────────────

export async function fetchMembersFromSupabase(): Promise<Member[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('members').select('*');
  if (error) {
    console.error('[Supabase] fetchMembers error:', error);
    return [];
  }
  return (data || []).map((row) => ({
    id: row.id,
    memberCode: row.member_code,
    fullName: row.full_name,
    designation: row.designation,
    phone: row.phone,
    annualTargetAmount: Number(row.annual_target_amount || 6000),
    address: row.address,
    isActive: row.is_active,
    birthDate: row.birth_date,
    email: row.email,
    age: row.age ? Number(row.age) : undefined,
    photoUrl: row.photo_url,
    password: row.password,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function saveMemberToSupabase(member: Member): Promise<void> {
  if (!isSupabaseConfigured) return;
  const row = {
    id: member.id,
    member_code: member.memberCode,
    full_name: member.fullName,
    designation: member.designation,
    phone: member.phone,
    annual_target_amount: member.annualTargetAmount,
    address: member.address,
    is_active: member.isActive,
    birth_date: member.birthDate,
    email: member.email,
    age: member.age,
    photo_url: member.photoUrl,
    password: member.password,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('members').upsert(row);
  if (error) console.error('[Supabase] saveMember error:', error);
}

export async function deleteMemberFromSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('members').delete().eq('id', id);
  if (error) console.error('[Supabase] deleteMember error:', error);
}

// ─── Incomes Table CRUD ─────────────────────────────────────────────────────

export async function fetchIncomesFromSupabase(): Promise<IncomeTransaction[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('incomes').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('[Supabase] fetchIncomes error:', error);
    return [];
  }
  return (data || []).map((row) => {
    let attachmentUrl = row.attachment_url || row.bill_photo_url || row.photo_url || undefined;
    let cleanReason = row.reason || '';
    let cleanNotes = row.notes || '';
    let parsedReceiverId = row.cash_receiver_id || row.cashReceiverMemberId;
    let parsedReceiverName = row.cash_receiver_name || row.cashReceiverName;

    if (!attachmentUrl && cleanReason.includes('__ATTACHMENT__:')) {
      const parts = cleanReason.split('__ATTACHMENT__:');
      cleanReason = parts[0].trim();
      attachmentUrl = parts[1].trim();
    }

    // Parse embedded cash receiver info if columns were not available in table schema
    if (!parsedReceiverId && (cleanNotes.includes('[CASH_REC:') || cleanReason.includes('[CASH_REC:'))) {
      const targetStr = cleanNotes.includes('[CASH_REC:') ? cleanNotes : cleanReason;
      const match = targetStr.match(/\[CASH_REC:([^:]+):([^\]]*)\]/);
      if (match) {
        parsedReceiverId = match[1].trim();
        parsedReceiverName = match[2].trim() || undefined;
        cleanNotes = cleanNotes.replace(/\[CASH_REC:[^\]]+\]/g, '').trim();
        cleanReason = cleanReason.replace(/\[CASH_REC:[^\]]+\]/g, '').trim();
      }
    }

    // Parse approval status strictly (default: 'प्रलंबित')
    let parsedApprovalStatus: ApprovalStatus = 'प्रलंबित';
    if (cleanNotes.includes('[STATUS:')) {
      const m = cleanNotes.match(/\[STATUS:([^\]]+)\]/);
      if (m) {
        parsedApprovalStatus = m[1].trim() as ApprovalStatus;
        cleanNotes = cleanNotes.replace(/\[STATUS:[^\]]+\]/g, '').trim();
      }
    } else if (cleanReason.includes('[STATUS:')) {
      const m = cleanReason.match(/\[STATUS:([^\]]+)\]/);
      if (m) {
        parsedApprovalStatus = m[1].trim() as ApprovalStatus;
        cleanReason = cleanReason.replace(/\[STATUS:[^\]]+\]/g, '').trim();
      }
    } else if (row.approval_status === 'मंजूर' || row.approval_status === 'रद्द' || row.approval_status === 'प्रलंबित') {
      parsedApprovalStatus = row.approval_status as ApprovalStatus;
    } else if (row.approved_by && row.approved_at) {
      parsedApprovalStatus = 'मंजूर';
    } else {
      parsedApprovalStatus = 'प्रलंबित';
    }

    // Parse payment collection status (RECEIVED vs PENDING)
    let parsedPaymentStatus: 'RECEIVED' | 'PENDING' = 'RECEIVED';
    let parsedReceivedDate = row.received_date || undefined;

    if (cleanNotes.includes('[PAY_STATUS:')) {
      const m = cleanNotes.match(/\[PAY_STATUS:([^\]]+)\]/);
      if (m) {
        parsedPaymentStatus = m[1].trim() as 'RECEIVED' | 'PENDING';
        cleanNotes = cleanNotes.replace(/\[PAY_STATUS:[^\]]+\]/g, '').trim();
      }
    } else if (cleanReason.includes('[PAY_STATUS:')) {
      const m = cleanReason.match(/\[PAY_STATUS:([^\]]+)\]/);
      if (m) {
        parsedPaymentStatus = m[1].trim() as 'RECEIVED' | 'PENDING';
        cleanReason = cleanReason.replace(/\[PAY_STATUS:[^\]]+\]/g, '').trim();
      }
    } else if (row.payment_status === 'PENDING' || row.payment_status === 'RECEIVED') {
      parsedPaymentStatus = row.payment_status;
    } else if (row.payment_method === 'येणे बाकी') {
      parsedPaymentStatus = 'PENDING';
    }

    if (cleanNotes.includes('[REC_DATE:')) {
      const m = cleanNotes.match(/\[REC_DATE:([^\]]+)\]/);
      if (m) {
        parsedReceivedDate = m[1].trim();
        cleanNotes = cleanNotes.replace(/\[REC_DATE:[^\]]+\]/g, '').trim();
      }
    }

    let rawTransNo = row.transaction_no || '';
    if (rawTransNo === 'CR-2026-50' || rawTransNo === 'CR-2026-49' || rawTransNo.endsWith('-50')) {
      rawTransNo = 'CR-2026-18';
      if (isSupabaseConfigured) {
        supabase.from('incomes').update({ transaction_no: 'CR-2026-18' }).eq('id', row.id).then(() => {});
      }
    }

    return {
      id: row.id,
      transactionNo: rawTransNo,
      financialYear: row.financial_year,
      incomeType: row.income_type,
      depositorName: row.depositor_name,
      depositorType: row.depositor_type,
      linkedMemberId: row.linked_member_id,
      amount: Number(row.amount),
      transactionDate: row.transaction_date,
      paymentMethod: row.payment_method,
      cashReceiverMemberId: parsedReceiverId,
      cashReceiverName: parsedReceiverName,
      paymentReference: row.payment_reference,
      receiptNumber: row.receipt_number,
      receiptBookNo: row.receipt_book_no || row.receiptBookNo,
      receiptSerialNo: row.receipt_serial_no || row.receiptSerialNo,
      isPhysicalReceipt: row.is_physical_receipt || Boolean(row.receipt_book_no),
      paymentStatus: parsedPaymentStatus,
      receivedDate: parsedReceivedDate,
      reason: cleanReason,
      notes: cleanNotes || undefined,
      attachmentUrl,
      approvalStatus: parsedApprovalStatus,
      approvedBy: row.approved_by,
      approvedByRole: row.approved_by_role,
      approvedAt: row.approved_at,
      createdBy: row.recorded_by || 'सभासद',
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at,
    };
  });
}

export async function saveIncomeToSupabase(income: IncomeTransaction): Promise<void> {
  if (!isSupabaseConfigured) return;
  const dbAttachmentUrl = income.attachmentUrl || null;
  const cashRecTag =
    income.paymentMethod === 'रोख' && income.cashReceiverMemberId
      ? ` [CASH_REC:${income.cashReceiverMemberId}:${income.cashReceiverName || ''}]`
      : '';
  const statusTag = ` [STATUS:${income.approvalStatus || 'प्रलंबित'}]`;
  const payStatusTag = ` [PAY_STATUS:${income.paymentStatus || (income.paymentMethod === 'येणे बाकी' ? 'PENDING' : 'RECEIVED')}]`;
  const recDateTag = income.receivedDate ? ` [REC_DATE:${income.receivedDate}]` : '';

  const row: any = {
    id: income.id,
    transaction_no: income.transactionNo,
    financial_year: income.financialYear,
    income_type: income.incomeType,
    depositor_name: income.depositorName,
    depositor_type: income.depositorType,
    linked_member_id: income.linkedMemberId || null,
    amount: income.amount,
    transaction_date: income.transactionDate,
    payment_method: income.paymentMethod,
    cash_receiver_id: income.cashReceiverMemberId || null,
    cash_receiver_name: income.cashReceiverName || null,
    payment_reference: income.paymentReference || null,
    receipt_number: income.receiptNumber || null,
    reason: income.reason,
    notes: ((income.notes || '') + cashRecTag + statusTag + payStatusTag + recDateTag).trim() || null,
    approval_status: income.approvalStatus || 'प्रलंबित',
    approved_by: income.approvedBy || null,
    approved_by_role: income.approvedByRole || null,
    approved_at: income.approvedAt || null,
    recorded_by: income.createdBy || 'सभासद',
    updated_at: new Date().toISOString(),
    attachment_url: dbAttachmentUrl,
    bill_photo_url: dbAttachmentUrl,
  };
  const { error } = await supabase.from('incomes').upsert(row);
  if (error) {
    console.warn('[Supabase] saveIncome primary error, trying core columns fallback:', error.message);
    const fallbackRow = {
      id: income.id,
      transaction_no: income.transactionNo,
      financial_year: income.financialYear,
      income_type: income.incomeType,
      depositor_name: income.depositorName,
      depositor_type: income.depositorType,
      linked_member_id: income.linkedMemberId || null,
      amount: income.amount,
      transaction_date: income.transactionDate,
      payment_method: income.paymentMethod,
      payment_reference: income.paymentReference || null,
      receipt_number: income.receiptNumber || null,
      reason: dbAttachmentUrl ? `${income.reason}\n__ATTACHMENT__:${dbAttachmentUrl}` : income.reason,
      notes: ((income.notes || '') + cashRecTag + statusTag + payStatusTag + recDateTag).trim() || null,
      recorded_by: income.createdBy || 'सभासद',
      updated_at: new Date().toISOString(),
    };
    await supabase.from('incomes').upsert(fallbackRow);
  }
}

export async function deleteIncomeFromSupabase(id: string, transactionNo?: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error: err1 } = await supabase.from('incomes').delete().eq('id', id);
  if (err1) console.error('[Supabase] deleteIncome by id error:', err1);
  if (transactionNo) {
    const { error: err2 } = await supabase.from('incomes').delete().eq('transaction_no', transactionNo);
    if (err2) console.error('[Supabase] deleteIncome by transaction_no error:', err2);
  }
}

// ─── Expenses Table CRUD ────────────────────────────────────────────────────

export async function fetchExpensesFromSupabase(): Promise<ExpenseTransaction[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('[Supabase] fetchExpenses error:', error);
    return [];
  }
  return (data || []).map((row) => {
    let attachmentUrl = row.attachment_url || row.bill_photo_url || row.photo_url || undefined;
    let cleanReason = row.reason || '';
    let parsedPaidById = row.paid_by_member_id || row.paidByMemberId;
    let parsedPaidByName = row.paid_by_member_name || row.paidByMemberName;
    let isPaidFromCash = row.is_paid_from_cash_in_hand ?? Boolean(parsedPaidById);

    if (!attachmentUrl && cleanReason.includes('__ATTACHMENT__:')) {
      const parts = cleanReason.split('__ATTACHMENT__:');
      cleanReason = parts[0].trim();
      attachmentUrl = parts[1].trim();
    }

    if (!parsedPaidById && cleanReason.includes('[PAID_BY_MEMBER:')) {
      const match = cleanReason.match(/\[PAID_BY_MEMBER:([^:]+):([^\]]*)\]/);
      if (match) {
        parsedPaidById = match[1].trim();
        parsedPaidByName = match[2].trim() || undefined;
        isPaidFromCash = true;
        cleanReason = cleanReason.replace(/\[PAID_BY_MEMBER:[^\]]+\]/g, '').trim();
      }
    }

    // Parse approval status strictly (default: 'प्रलंबित')
    let parsedExpenseStatus: ApprovalStatus = 'प्रलंबित';
    if (cleanReason.includes('[STATUS:')) {
      const m = cleanReason.match(/\[STATUS:([^\]]+)\]/);
      if (m) {
        parsedExpenseStatus = m[1].trim() as ApprovalStatus;
        cleanReason = cleanReason.replace(/\[STATUS:[^\]]+\]/g, '').trim();
      }
    } else if (row.approval_status === 'मंजूर' || row.approval_status === 'रद्द' || row.approval_status === 'प्रलंबित') {
      parsedExpenseStatus = row.approval_status as ApprovalStatus;
    } else if (row.approved_by && row.approved_at) {
      parsedExpenseStatus = 'मंजूर';
    } else {
      parsedExpenseStatus = 'प्रलंबित';
    }

    return {
      id: row.id,
      transactionNo: row.transaction_no,
      financialYear: row.financial_year,
      expenseCategory: row.expense_category,
      recipientType: 'व्यक्ती' as const,
      recipientName: row.recipient_name,
      linkedMemberId: row.linked_member_id,
      amount: Number(row.amount),
      expenseDate: row.expense_date,
      paymentMethod: row.payment_method,
      paidByMemberId: parsedPaidById,
      paidByMemberName: parsedPaidByName,
      isPaidFromCashInHand: isPaidFromCash,
      billNumber: row.bill_number,
      reason: cleanReason,
      approvalStatus: parsedExpenseStatus,
      approvedBy: row.approved_by,
      approvedByRole: row.approved_by_role,
      approvedAt: row.approved_at,
      attachmentUrl,
      createdBy: row.recorded_by || 'सभासद',
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at,
    };
  });
}

export async function saveExpenseToSupabase(expense: ExpenseTransaction): Promise<void> {
  if (!isSupabaseConfigured) return;
  const dbAttachmentUrl = expense.attachmentUrl || null;
  const paidByTag = expense.paidByMemberId
    ? ` [PAID_BY_MEMBER:${expense.paidByMemberId}:${expense.paidByMemberName || ''}]`
    : '';
  const statusTag = ` [STATUS:${expense.approvalStatus || 'प्रलंबित'}]`;

  let finalReason = expense.reason + paidByTag + statusTag;
  if (dbAttachmentUrl) {
    finalReason = `${finalReason}\n__ATTACHMENT__:${dbAttachmentUrl}`;
  }

  const row: any = {
    id: expense.id,
    transaction_no: expense.transactionNo,
    financial_year: expense.financialYear,
    expense_category: expense.expenseCategory,
    recipient_name: expense.recipientName,
    linked_member_id: expense.linkedMemberId || null,
    amount: expense.amount,
    expense_date: expense.expenseDate,
    payment_method: expense.paymentMethod,
    paid_by_member_id: expense.paidByMemberId || null,
    paid_by_member_name: expense.paidByMemberName || null,
    is_paid_from_cash_in_hand: expense.isPaidFromCashInHand || false,
    bill_number: expense.billNumber || null,
    reason: finalReason,
    approval_status: expense.approvalStatus || 'प्रलंबित',
    approved_by: expense.approvedBy || null,
    approved_by_role: expense.approvedByRole || null,
    approved_at: expense.approvedAt || null,
    recorded_by: expense.createdBy || 'सभासद',
    updated_at: new Date().toISOString(),
    attachment_url: dbAttachmentUrl,
    bill_photo_url: dbAttachmentUrl,
  };
  const { error } = await supabase.from('expenses').upsert(row);
  if (error) {
    console.warn('[Supabase] saveExpense primary error, trying core columns fallback:', error.message);
    const fallbackRow = {
      id: expense.id,
      transaction_no: expense.transactionNo,
      financial_year: expense.financialYear,
      expense_category: expense.expenseCategory,
      recipient_name: expense.recipientName,
      linked_member_id: expense.linkedMemberId || null,
      amount: expense.amount,
      expense_date: expense.expenseDate,
      payment_method: expense.paymentMethod,
      bill_number: expense.billNumber || null,
      reason: finalReason,
      approval_status: expense.approvalStatus,
      approved_by: expense.approvedBy || null,
      approved_by_role: expense.approvedByRole || null,
      approved_at: expense.approvedAt || null,
      recorded_by: expense.createdBy || 'ॲडमिन',
      updated_at: new Date().toISOString(),
    };
    await supabase.from('expenses').upsert(fallbackRow);
  }
}

export async function deleteExpenseFromSupabase(id: string, transactionNo?: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error: err1 } = await supabase.from('expenses').delete().eq('id', id);
  if (err1) console.error('[Supabase] deleteExpense by id error:', err1);
  if (transactionNo) {
    const { error: err2 } = await supabase.from('expenses').delete().eq('transaction_no', transactionNo);
    if (err2) console.error('[Supabase] deleteExpense by transaction_no error:', err2);
  }
}

export async function clearAllTransactionsFromSupabase(): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('incomes').delete().neq('id', 'NONE');
  await supabase.from('expenses').delete().neq('id', 'NONE');
}

// ─── Occasions Table CRUD ───────────────────────────────────────────────────

export async function fetchOccasionsFromSupabase(): Promise<OccasionEvent[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('occasions').select('*');
  if (error) {
    console.error('[Supabase] fetchOccasions error:', error);
    return [];
  }
  return (data || []).map((row) => {
    let parsedDetails: Partial<OccasionEvent> = {};
    let cleanDescription = row.description || '';

    if (row.details) {
      try {
        parsedDetails = typeof row.details === 'string' ? JSON.parse(row.details) : row.details;
      } catch (err) {
        console.warn('Failed to parse occasion details JSON:', err);
      }
    } else if (cleanDescription.includes('__DETAILS__:')) {
      const parts = cleanDescription.split('__DETAILS__:');
      cleanDescription = parts[0].trim();
      try {
        parsedDetails = JSON.parse(parts[1]);
      } catch (err) {
        console.warn('Failed to parse details payload from description:', err);
      }
    }

    const tasksList = Array.isArray(row.tasks)
      ? row.tasks
      : Array.isArray(parsedDetails.tasks)
      ? parsedDetails.tasks
      : [];

    return {
      id: row.id,
      name: row.title || row.name || parsedDetails.name || 'कार्यक्रम',
      year: row.year || parsedDetails.year || '२०२६',
      startDate: row.start_date || row.event_date || parsedDetails.startDate,
      endDate: row.end_date || parsedDetails.endDate,
      description: cleanDescription || parsedDetails.description,
      bannerUrl: row.banner_url || parsedDetails.bannerUrl,
      workDetails: row.work_details || parsedDetails.workDetails,
      responsiblePerson: row.responsible_person || parsedDetails.responsiblePerson,
      tasks: tasksList,
      createdAt: row.created_at || parsedDetails.createdAt,
      updatedAt: row.updated_at || parsedDetails.updatedAt,
    };
  });
}

export async function saveOccasionToSupabase(occasion: OccasionEvent): Promise<void> {
  if (!isSupabaseConfigured) return;

  const detailsPayload = JSON.stringify({
    name: occasion.name,
    year: occasion.year,
    startDate: occasion.startDate,
    endDate: occasion.endDate,
    description: occasion.description || '',
    bannerUrl: occasion.bannerUrl || null,
    workDetails: occasion.workDetails || '',
    responsiblePerson: occasion.responsiblePerson || '',
    tasks: occasion.tasks || [],
    createdAt: occasion.createdAt,
    updatedAt: occasion.updatedAt,
  });

  const baseRow = {
    id: occasion.id,
    title: occasion.name,
    description: occasion.description || '',
    event_date: occasion.startDate || new Date().toISOString().split('T')[0],
    location: 'हडपसर, पुणे',
    banner_url: occasion.bannerUrl || null,
    details: detailsPayload,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('occasions').upsert(baseRow);
  if (error) {
    console.warn('[Supabase] saveOccasion error with details column, trying description payload fallback:', error.message);
    const fallbackDescription = `${occasion.description || ''}\n__DETAILS__:${detailsPayload}`;
    const simpleRow = {
      id: occasion.id,
      title: occasion.name,
      description: fallbackDescription,
      event_date: occasion.startDate || new Date().toISOString().split('T')[0],
      location: 'हडपसर, पुणे',
      banner_url: occasion.bannerUrl || null,
      updated_at: new Date().toISOString(),
    };
    const { error: simpleErr } = await supabase.from('occasions').upsert(simpleRow);
    if (simpleErr) console.error('[Supabase] saveOccasion fallback error:', simpleErr);
  }
}

export async function deleteOccasionFromSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('occasions').delete().eq('id', id);
  if (error) console.error('[Supabase] deleteOccasion error:', error);
}

// ─── Real-Time WebSocket Subscriptions ──────────────────────────────────────

export function subscribeToSupabaseRealtime(onDataChanged: () => void): () => void {
  if (!isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel('morya-erp-db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      () => {
        console.log('[Supabase Realtime] Change detected on database! Refreshing UI...');
        onDataChanged();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── Non-Destructive Startup Seeder ─────────────────────────────────────────

export async function seedSupabaseIfEmpty(): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const { count: memberCount } = await supabase.from('members').select('*', { count: 'exact', head: true });
    if (!memberCount || memberCount === 0) {
      console.log('[Supabase Seed] Seeding initial members dataset...');
      for (const m of INITIAL_MEMBERS) {
        await saveMemberToSupabase(m);
      }
    }

    const { count: occasionCount } = await supabase.from('occasions').select('*', { count: 'exact', head: true });
    if (!occasionCount || occasionCount === 0) {
      console.log('[Supabase Seed] Seeding initial occasions dataset...');
      for (const o of INITIAL_OCCASIONS) {
        await saveOccasionToSupabase(o);
      }
    }

    const { count: galleryCount } = await supabase.from('gallery').select('*', { count: 'exact', head: true });
    if (!galleryCount || galleryCount === 0) {
      console.log('[Supabase Seed] Seeding initial 8 event gallery dataset...');
      for (const g of INITIAL_EVENT_GALLERY) {
        await saveGalleryItemToSupabase(g);
      }
    }
  } catch (err) {
    console.warn('[Supabase Seed] Seed error:', err);
  }
}

// ─── Settings Table (Group Logo & Configurations) ───────────────────────────

export async function fetchGroupLogoFromSupabase(): Promise<string | undefined> {
  if (!isSupabaseConfigured) return undefined;
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'group_logo')
      .maybeSingle();

    if (error || !data) return undefined;
    return data.value?.url || '';
  } catch (err) {
    console.warn('[Supabase] fetchGroupLogo error:', err);
    return undefined;
  }
}

export async function saveGroupLogoToSupabase(url: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const row = {
      key: 'group_logo',
      value: { url },
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('settings').upsert(row);
    if (error) console.error('[Supabase] saveGroupLogo error:', error);
  } catch (err) {
    console.warn('[Supabase] saveGroupLogoToSupabase error:', err);
  }
}

// ─── Online Authorized Officer Signatures ──────────────────────────────────

export async function fetchOfficerSignaturesFromSupabase(): Promise<{
  treasurer: any | null;
  viceTreasurer: any | null;
}> {
  if (!isSupabaseConfigured) return { treasurer: null, viceTreasurer: null };
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['signatures_treasurer', 'signatures_vice_treasurer']);

    if (error || !data) return { treasurer: null, viceTreasurer: null };

    let treasurer = null;
    let viceTreasurer = null;

    data.forEach((row) => {
      if (row.key === 'signatures_treasurer' && row.value) {
        treasurer = row.value;
      } else if (row.key === 'signatures_vice_treasurer' && row.value) {
        viceTreasurer = row.value;
      }
    });

    return { treasurer, viceTreasurer };
  } catch (err) {
    console.warn('[Supabase] fetchOfficerSignatures error:', err);
    return { treasurer: null, viceTreasurer: null };
  }
}

export async function saveOfficerSignatureToSupabase(signature: {
  role: 'खजिनदार' | 'उपखजिनदार' | 'अध्यक्ष' | 'सचिव';
  officerName: string;
  signatureDataUrl: string;
  updatedAt: string;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const key = signature.role === 'खजिनदार' ? 'signatures_treasurer' : 'signatures_vice_treasurer';
    const row = {
      key,
      value: signature,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('settings').upsert(row);
    if (error) console.error('[Supabase] saveOfficerSignature error:', error);
  } catch (err) {
    console.warn('[Supabase] saveOfficerSignatureToSupabase error:', err);
  }
}

export async function deleteOfficerSignatureFromSupabase(role: 'खजिनदार' | 'उपखजिनदार'): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const key = role === 'खजिनदार' ? 'signatures_treasurer' : 'signatures_vice_treasurer';
    const { error } = await supabase.from('settings').delete().eq('key', key);
    if (error) console.error('[Supabase] deleteOfficerSignature error:', error);
  } catch (err) {
    console.warn('[Supabase] deleteOfficerSignatureFromSupabase error:', err);
  }
}

// ─── Event Gallery Table CRUD ──────────────────────────────────────────────

export async function fetchGalleryFromSupabase(): Promise<EventGalleryImage[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('[Supabase] fetchGallery error:', error);
      return [];
    }
    return (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      category: row.event_name || 'गणेशोत्सव',
      imageUrl: row.image_url,
      dateStr: row.upload_date,
      description: row.description || '',
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.warn('[Supabase] fetchGallery error:', err);
    return [];
  }
}

export async function saveGalleryItemToSupabase(item: EventGalleryImage): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const row = {
      id: item.id,
      title: item.title || 'कार्यक्रम फोटो',
      event_name: item.category || 'गणेशोत्सव',
      image_url: item.imageUrl,
      upload_date: item.dateStr || new Date().toISOString().split('T')[0],
      description: item.description || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('gallery').upsert(row);
    if (error) console.error('[Supabase] saveGalleryItem error:', error);
  } catch (err) {
    console.warn('[Supabase] saveGalleryItemToSupabase error:', err);
  }
}

export async function deleteGalleryItemFromSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase.from('gallery').delete().eq('id', id);
    if (error) console.error('[Supabase] deleteGalleryItem error:', error);
  } catch (err) {
    console.warn('[Supabase] deleteGalleryItemFromSupabase error:', err);
  }
}

// ─── Cash Settlements (Member Cash Handover & Trust/Bank Deposits) ───
export async function fetchCashSettlementsFromSupabase(): Promise<CashSettlement[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data: settingsData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'cash_settlements_list')
      .maybeSingle();

    if (settingsData?.value?.list && Array.isArray(settingsData.value.list)) {
      const deletedIds = getDeletedSettlementIds();
      return (settingsData.value.list as CashSettlement[]).filter((s) => s && s.id && !deletedIds.has(s.id));
    }

    const { data, error } = await supabase
      .from('cash_settlements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    const deletedIds = getDeletedSettlementIds();
    return (data || [])
      .filter((row: any) => !deletedIds.has(row.id))
      .map((row: any) => ({
      id: row.id,
      settlementNo: row.settlement_no,
      memberId: row.member_id,
      memberName: row.member_name,
      amount: Number(row.amount || 0),
      depositDate: row.deposit_date,
      destination: row.destination || 'ट्रस्ट बँक खाते',
      bankRefNo: row.bank_ref_no || undefined,
      slipPhotoUrl: row.slip_photo_url || undefined,
      notes: row.notes || undefined,
      financialYear: row.financial_year || '2026-2027',
      approvalStatus: (row.approval_status as ApprovalStatus) || 'प्रलंबित',
      approvedBy: row.approved_by || undefined,
      approvedByRole: row.approved_by_role || undefined,
      approvedAt: row.approved_at || undefined,
      createdBy: row.recorded_by || 'सभासद',
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || undefined,
    }));
  } catch (err) {
    console.warn('[Supabase] fetchCashSettlements catch:', err);
    return [];
  }
}

export async function saveCashSettlementToSupabase(settlement: CashSettlement): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    if (getDeletedSettlementIds().has(settlement.id)) {
      console.warn('[Supabase] Skipping save of deleted cash settlement:', settlement.id);
      return;
    }
    // 1. Primary: Save into Supabase settings table
    const current = await fetchCashSettlementsFromSupabase();
    const filtered = current.filter((s) => s.id !== settlement.id && !getDeletedSettlementIds().has(s.id));
    const updated = [settlement, ...filtered];

    await supabase.from('settings').upsert({
      key: 'cash_settlements_list',
      value: { list: updated },
      updated_at: new Date().toISOString(),
    });

    // 2. Secondary: Attempt individual table if exists
    const row = {
      id: settlement.id,
      settlement_no: settlement.settlementNo || null,
      member_id: settlement.memberId,
      member_name: settlement.memberName,
      amount: settlement.amount,
      deposit_date: settlement.depositDate,
      destination: settlement.destination,
      bank_ref_no: settlement.bankRefNo || null,
      slip_photo_url: settlement.slipPhotoUrl || null,
      notes: settlement.notes || null,
      financial_year: settlement.financialYear,
      approval_status: settlement.approvalStatus || 'प्रलंबित',
      approved_by: settlement.approvedBy || null,
      approved_by_role: settlement.approvedByRole || null,
      approved_at: settlement.approvedAt || null,
      recorded_by: settlement.createdBy,
      updated_at: new Date().toISOString(),
    };
    await supabase.from('cash_settlements').upsert(row);
  } catch (err) {
    console.warn('[Supabase] saveCashSettlement catch:', err);
  }
}

export async function deleteCashSettlementFromSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    addDeletedSettlementId(id);
    const current = await fetchCashSettlementsFromSupabase();
    const updated = current.filter((s) => s.id !== id);

    await supabase.from('settings').upsert({
      key: 'cash_settlements_list',
      value: { list: updated },
      updated_at: new Date().toISOString(),
    });

    await supabase.from('cash_settlements').delete().eq('id', id);
  } catch (err) {
    console.warn('[Supabase] deleteCashSettlement catch:', err);
  }
}

