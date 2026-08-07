import {
  DESIGNATION_RANKS,
  getDesignationRank,
  hasFullFinancialAccess,
  isTreasurerRole,
  isCoreMemberRole,
  hasAdminPermissions,
  isBadgedMember,
  AUTHORIZED_FINANCIAL_ROLES,
} from '../src/utils/rbac';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${msg}`);
  }
}

function assertEqual(actual: any, expected: any, msg: string) {
  if (actual !== expected) {
    throw new Error(`ASSERTION FAILED: ${msg} | Expected: ${expected}, Got: ${actual}`);
  }
}

console.log('=== ADVERSARIAL STRESS TEST: RBAC & BOUNDARY CONDITIONS ===');

// 1. Designation Ranks Exhaustive Test
console.log('[1] Testing Designation Ranks Mapping...');
assertEqual(getDesignationRank('अध्यक्ष'), 1, 'अध्यक्ष rank');
assertEqual(getDesignationRank('कार्याध्यक्ष'), 2, 'कार्याध्यक्ष rank');
assertEqual(getDesignationRank('उपाध्यक्ष'), 3, 'उपाध्यक्ष rank');
assertEqual(getDesignationRank('सचिव'), 4, 'सचिव rank');
assertEqual(getDesignationRank('खजिनदार'), 5, 'खजिनदार rank');
assertEqual(getDesignationRank('उपखजिनदार'), 6, 'उपखजिनदार rank');
assertEqual(getDesignationRank('सभासद'), 7, 'सभासद rank');
assertEqual(getDesignationRank('उपसचिव'), 8, 'उपसचिव rank');
assertEqual(getDesignationRank('संघटक'), 9, 'संघटक rank');
assertEqual(getDesignationRank('सहसंघटक'), 10, 'सहसंघटक rank');
assertEqual(getDesignationRank('सल्लागार'), 11, 'सल्लागार rank');
assertEqual(getDesignationRank('कार्या सल्लागार'), 12, 'कार्या सल्लागार rank');

// Boundary/Edge Cases for getDesignationRank
assertEqual(getDesignationRank(undefined), 99, 'undefined role rank');
assertEqual(getDesignationRank(''), 99, 'empty string role rank');
assertEqual(getDesignationRank('  '), 10, 'spaces-only role rank default');
assertEqual(getDesignationRank('\t\n'), 10, 'whitespace control chars default');
assertEqual(getDesignationRank('  अध्यक्ष  '), 1, 'padded अध्यक्ष rank');
assertEqual(getDesignationRank('  सचिव  '), 4, 'padded सचिव rank');
assertEqual(getDesignationRank('Random Designation'), 10, 'unknown designation rank default');

// 2. Financial Access Control Boundary Tests
console.log('[2] Testing Financial Access Control Boundary Conditions...');
assert(hasFullFinancialAccess('अध्यक्ष'), 'अध्यक्ष has financial access');
assert(hasFullFinancialAccess('खजिनदार'), 'खजिनदार has financial access');
assert(hasFullFinancialAccess('उपखजिनदार'), 'उपखजिनदार has financial access');
assert(hasFullFinancialAccess('ॲडमिन'), 'ॲडमिन has financial access');
assert(hasFullFinancialAccess('Admin'), 'Admin has financial access');
assert(hasFullFinancialAccess('  खजिनदार  '), 'trimmed खजिनदार has financial access');
assert(hasFullFinancialAccess('  Admin  '), 'trimmed Admin has financial access');

assertEqual(hasFullFinancialAccess('सभासद'), false, 'सभासद denied financial access');
assertEqual(hasFullFinancialAccess('सचिव'), false, 'सचिव denied financial access');
assertEqual(hasFullFinancialAccess('admin'), false, 'lowercase admin (strict check)');
assertEqual(hasFullFinancialAccess(''), false, 'empty string financial access');
assertEqual(hasFullFinancialAccess(undefined), false, 'undefined financial access');
assertEqual(hasFullFinancialAccess('   '), false, 'whitespace financial access');

// 3. Treasurer Role Check Boundary Tests
console.log('[3] Testing Treasurer Role Check...');
assert(isTreasurerRole('खजिनदार'), 'खजिनदार is treasurer');
assert(isTreasurerRole('उपखजिनदार'), 'उपखजिनदार is treasurer');
assert(isTreasurerRole('  खजिनदार  '), 'padded खजिनदार is treasurer');
assertEqual(isTreasurerRole('अध्यक्ष'), false, 'अध्यक्ष is not treasurer');
assertEqual(isTreasurerRole('सभासद'), false, 'सभासद is not treasurer');
assertEqual(isTreasurerRole(undefined), false, 'undefined is not treasurer');
assertEqual(isTreasurerRole(''), false, 'empty string is not treasurer');

// 4. Core Member Role Boundary Tests
console.log('[4] Testing Core Member Role Check...');
assert(isCoreMemberRole('अध्यक्ष'), 'अध्यक्ष is core member');
assert(isCoreMemberRole('खजिनदार'), 'खजिनदार is core member');
assert(isCoreMemberRole('उपखजिनदार'), 'उपखजिनदार is core member');
assert(isCoreMemberRole('ॲडमिन'), 'ॲडमिन is core member');
assert(isCoreMemberRole('Admin'), 'Admin is core member');
assertEqual(isCoreMemberRole('सचिव'), false, 'सचिव is not core member');
assertEqual(isCoreMemberRole('सभासद'), false, 'सभासद is not core member');

// 5. Admin Permissions Boundary Tests
console.log('[5] Testing Admin Permissions Check...');
assert(hasAdminPermissions('ॲडमिन'), 'ॲडमिन has admin permissions');
assert(hasAdminPermissions('Admin'), 'Admin has admin permissions');
assert(hasAdminPermissions('अध्यक्ष'), 'अध्यक्ष has admin permissions');
assert(hasAdminPermissions('खजिनदार'), 'खजिनदार has admin permissions');
assert(hasAdminPermissions('उपखजिनदार'), 'उपखजिनदार has admin permissions');
assert(hasAdminPermissions('  Admin  '), 'padded Admin has admin permissions');
assertEqual(hasAdminPermissions('सचिव'), false, 'सचिव has no admin permissions');
assertEqual(hasAdminPermissions('सभासद'), false, 'सभासद has no admin permissions');
assertEqual(hasAdminPermissions(undefined), false, 'undefined has no admin permissions');
assertEqual(hasAdminPermissions(''), false, 'empty string has no admin permissions');

// 6. Badged Member Check Boundary Tests
console.log('[6] Testing Badged Member Check...');
assert(isBadgedMember('अध्यक्ष'), 'अध्यक्ष is badged');
assert(isBadgedMember('सचिव'), 'सचिव is badged');
assert(isBadgedMember('खजिनदार'), 'खजिनदार is badged');
assert(isBadgedMember('उपाध्यक्ष'), 'उपाध्यक्ष is badged');
assert(isBadgedMember('कार्याध्यक्ष'), 'कार्याध्यक्ष is badged');
assert(isBadgedMember('संघटक'), 'संघटक is badged');
assertEqual(isBadgedMember('सभासद'), false, 'सभासद is NOT badged');
assertEqual(isBadgedMember('  सभासद  '), false, 'padded सभासद is NOT badged');
assertEqual(isBadgedMember(''), false, 'empty string is NOT badged');
assertEqual(isBadgedMember('   '), false, 'whitespace is NOT badged');
assertEqual(isBadgedMember(undefined), false, 'undefined is NOT badged');

console.log('✅ ALL ADVERSARIAL RBAC STRESS TESTS PASSED SUCCESSFULLY!');
