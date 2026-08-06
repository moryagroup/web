export const DESIGNATION_RANKS: Record<string, number> = {
  'अध्यक्ष': 1,
  'कार्याध्यक्ष': 2,
  'उपाध्यक्ष': 3,
  'सचिव': 4,
  'खजिनदार': 5,
  'उपखजिनदार': 6,
  'सभासद': 7,
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

export const getDesignationRank = (designation?: string): number => {
  if (!designation) return 99;
  return DESIGNATION_RANKS[designation.trim()] || 10;
};
