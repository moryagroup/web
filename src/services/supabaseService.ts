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
} from '../types';
import {
  INITIAL_MEMBERS,
  INITIAL_OCCASIONS,
  INITIAL_EVENT_GALLERY,
} from '../mockData';

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
  return (data || []).map((row) => ({
    id: row.id,
    transactionNo: row.transaction_no,
    financialYear: row.financial_year,
    incomeType: row.income_type,
    depositorName: row.depositor_name,
    depositorType: row.depositor_type,
    linkedMemberId: row.linked_member_id,
    amount: Number(row.amount),
    transactionDate: row.transaction_date,
    paymentMethod: row.payment_method,
    paymentReference: row.payment_reference,
    receiptNumber: row.receipt_number,
    reason: row.reason,
    notes: row.notes,
    createdBy: row.recorded_by || 'ॲडमिन',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at,
  }));
}

export async function saveIncomeToSupabase(income: IncomeTransaction): Promise<void> {
  if (!isSupabaseConfigured) return;
  const row = {
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
    reason: income.reason,
    notes: income.notes || null,
    recorded_by: income.createdBy || 'ॲडमिन',
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('incomes').upsert(row);
  if (error) console.error('[Supabase] saveIncome error:', error);
}

export async function deleteIncomeFromSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('incomes').delete().eq('id', id);
  if (error) console.error('[Supabase] deleteIncome error:', error);
}

// ─── Expenses Table CRUD ────────────────────────────────────────────────────

export async function fetchExpensesFromSupabase(): Promise<ExpenseTransaction[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('[Supabase] fetchExpenses error:', error);
    return [];
  }
  return (data || []).map((row) => ({
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
    billNumber: row.bill_number,
    reason: row.reason,
    approvalStatus: row.approval_status || 'प्रलंबित',
    approvedBy: row.approved_by,
    approvedByRole: row.approved_by_role,
    approvedAt: row.approved_at,
    createdBy: row.recorded_by || 'ॲडमिन',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at,
  }));
}

export async function saveExpenseToSupabase(expense: ExpenseTransaction): Promise<void> {
  if (!isSupabaseConfigured) return;
  const row = {
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
    reason: expense.reason,
    approval_status: expense.approvalStatus,
    approved_by: expense.approvedBy || null,
    approved_by_role: expense.approvedByRole || null,
    approved_at: expense.approvedAt || null,
    recorded_by: expense.createdBy || 'ॲडमिन',
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('expenses').upsert(row);
  if (error) console.error('[Supabase] saveExpense error:', error);
}

export async function deleteExpenseFromSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) console.error('[Supabase] deleteExpense error:', error);
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
    if (row.details) {
      try {
        parsedDetails = typeof row.details === 'string' ? JSON.parse(row.details) : row.details;
      } catch (err) {
        console.warn('Failed to parse occasion details JSON:', err);
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
      year: row.year || parsedDetails.year || '२०२६-२७',
      startDate: row.start_date || row.event_date || parsedDetails.startDate,
      endDate: row.end_date || parsedDetails.endDate,
      description: row.description || parsedDetails.description,
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
    console.warn('[Supabase] saveOccasion error with details column:', error.message);
    const simpleRow = {
      id: occasion.id,
      title: occasion.name,
      description: occasion.description || '',
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
