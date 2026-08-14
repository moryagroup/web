export const DESIGNATION_RANKS: Record<string, number> = {
  'अध्यक्ष': 1,
  'कार्याध्यक्ष': 2,
  'उपाध्यक्ष': 3,
  'सचिव': 4,
  'खजिनदार': 5,
  'उपखजिनदार': 6,
  'सभासद': 7,
  'उपसचिव': 8,
  'संघटक': 9,
  'सहसंघटक': 10,
  'सल्लागार': 11,
  'कार्या सल्लागार': 12,
};

// Authorized roles for full financial & admin access
export const AUTHORIZED_FINANCIAL_ROLES = [
  'अध्यक्ष',
  'खजिनदार',
  'उपखजिनदार',
  'ॲडमिन',
  'Admin',
];

export const hasFullFinancialAccess = (role?: string): boolean => {
  if (!role) return false;
  return AUTHORIZED_FINANCIAL_ROLES.includes(role.trim());
};

export const isTreasurerRole = (role?: string): boolean => {
  if (!role) return false;
  const trimmed = role.trim();
  return ['खजिनदार', 'उपखजिनदार'].includes(trimmed);
};

export const isCoreMemberRole = (role?: string): boolean => {
  if (!role) return false;
  const trimmed = role.trim();
  return ['अध्यक्ष', 'खजिनदार', 'उपखजिनदार', 'ॲडमिन', 'Admin'].includes(trimmed);
};

export const hasAdminPermissions = (role?: string): boolean => {
  if (!role) return false;
  return ['ॲडमिन', 'Admin', 'अध्यक्ष', 'खजिनदार', 'उपखजिनदार'].includes(role.trim());
};

export const isBadgedMember = (role?: string): boolean => {
  if (!role) return false;
  const trimmed = role.trim();
  if (!trimmed || trimmed === 'सभासद') return false;
  return true;
};

// Regular members see only their own transactions. Core members & Admin see group transactions.
export const canViewRecentGroupTransactions = (role?: string): boolean => {
  if (!role) return false;
  const trimmed = role.trim();
  if (trimmed === 'ॲडमिन' || trimmed === 'Admin') return true;
  return isBadgedMember(trimmed);
};

export const canViewAllTransactions = (role?: string): boolean => {
  return canViewRecentGroupTransactions(role);
};

export const getDesignationRank = (designation?: string): number => {
  if (!designation) return 99;
  const trimmed = designation.trim();
  if (trimmed === '') return 99;
  if (Object.prototype.hasOwnProperty.call(DESIGNATION_RANKS, trimmed)) {
    return DESIGNATION_RANKS[trimmed];
  }
  return 99;
};
