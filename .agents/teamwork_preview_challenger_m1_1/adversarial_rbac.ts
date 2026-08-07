import {
  DESIGNATION_RANKS,
  AUTHORIZED_FINANCIAL_ROLES,
  hasFullFinancialAccess,
  isTreasurerRole,
  isCoreMemberRole,
  hasAdminPermissions,
  isBadgedMember,
  getDesignationRank,
} from '../../src/utils/rbac';

console.log('================================================================');
console.log('  ADVERSARIAL STRESS-TEST FOR RBAC UTILITIES (rbac.ts)          ');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function assertTest(name: string, condition: boolean, message?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${name} ${message ? `(${message})` : ''}`);
    failed++;
  }
}

// 1. Whitespace & Empty/Falsy Inputs
console.log('--- 1. Whitespace & Missing Inputs ---');

assertTest(
  'getDesignationRank("") returns 99',
  getDesignationRank('') === 99,
  `Got ${getDesignationRank('')}`
);

assertTest(
  'getDesignationRank(undefined) returns 99',
  getDesignationRank(undefined) === 99,
  `Got ${getDesignationRank(undefined)}`
);

assertTest(
  'getDesignationRank("   ") returns 99',
  getDesignationRank('   ') === 99,
  `Got ${getDesignationRank('   ')} (Expected 99, but got ${getDesignationRank('   ')})`
);

assertTest(
  'hasFullFinancialAccess("   ") returns false',
  hasFullFinancialAccess('   ') === false
);

assertTest(
  'hasAdminPermissions("   ") returns false',
  hasAdminPermissions('   ') === false
);

assertTest(
  'isBadgedMember("   ") returns false',
  isBadgedMember('   ') === false
);

assertTest(
  'isTreasurerRole("   ") returns false',
  isTreasurerRole('   ') === false
);

assertTest(
  'isCoreMemberRole("   ") returns false',
  isCoreMemberRole('   ') === false
);

// 2. Whitespace Trimming Validation
console.log('\n--- 2. Whitespace Trimming for Valid Roles ---');

assertTest(
  'hasFullFinancialAccess("  अध्यक्ष  ") returns true',
  hasFullFinancialAccess('  अध्यक्ष  ') === true
);

assertTest(
  'hasFullFinancialAccess("   खजिनदार \\n ") returns true',
  hasFullFinancialAccess('   खजिनदार \n ') === true
);

assertTest(
  'hasFullFinancialAccess(" \\t Admin \\t ") returns true',
  hasFullFinancialAccess(' \t Admin \t ') === true
);

assertTest(
  'hasAdminPermissions("  ॲडमिन  ") returns true',
  hasAdminPermissions('  ॲडमिन  ') === true
);

assertTest(
  'isBadgedMember("  सचिव  ") returns true',
  isBadgedMember('  सचिव  ') === true
);

assertTest(
  'isBadgedMember("  सभासद  ") returns false',
  isBadgedMember('  सभासद  ') === false
);

assertTest(
  'getDesignationRank("  कार्याध्यक्ष  ") returns 2',
  getDesignationRank('  कार्याध्यक्ष  ') === 2,
  `Got ${getDesignationRank('  कार्याध्यक्ष  ')}`
);

// 3. Case Sensitivity & Case Variations
console.log('\n--- 3. Case Sensitivity ---');

assertTest(
  'hasFullFinancialAccess("admin") returns false (strict case expected unless handled)',
  hasFullFinancialAccess('admin') === false,
  `Got ${hasFullFinancialAccess('admin')}`
);

assertTest(
  'hasFullFinancialAccess("ADMIN") returns false',
  hasFullFinancialAccess('ADMIN') === false,
  `Got ${hasFullFinancialAccess('ADMIN')}`
);

assertTest(
  'hasAdminPermissions("admin") returns false',
  hasAdminPermissions('admin') === false,
  `Got ${hasAdminPermissions('admin')}`
);

// 4. Object Prototype Injection & Malicious Inputs
console.log('\n--- 4. Prototype & Injection Inputs ---');

assertTest(
  'hasFullFinancialAccess("toString") returns false',
  hasFullFinancialAccess('toString') === false
);

assertTest(
  'hasFullFinancialAccess("__proto__") returns false',
  hasFullFinancialAccess('__proto__') === false
);

assertTest(
  'hasAdminPermissions("constructor") returns false',
  hasAdminPermissions('constructor') === false
);

assertTest(
  'getDesignationRank("toString") returns 10 (unknown default)',
  getDesignationRank('toString') === 10,
  `Got ${getDesignationRank('toString')}`
);

assertTest(
  'getDesignationRank("__proto__") returns 10 (unknown default)',
  getDesignationRank('__proto__') === 10,
  `Got ${getDesignationRank('__proto__')}`
);

assertTest(
  'hasFullFinancialAccess("\'<script>alert(1)</script>\'") returns false',
  hasFullFinancialAccess('<script>alert(1)</script>') === false
);

// 5. Unexpected Types at Runtime (Defensive JS behavior)
console.log('\n--- 5. Defensive Non-String Types (Runtime JS) ---');

try {
  assertTest('hasFullFinancialAccess(null as any) returns false', hasFullFinancialAccess(null as any) === false);
} catch (e: any) {
  assertTest('hasFullFinancialAccess(null as any) does not crash', false, e.message);
}

try {
  assertTest('hasAdminPermissions(null as any) returns false', hasAdminPermissions(null as any) === false);
} catch (e: any) {
  assertTest('hasAdminPermissions(null as any) does not crash', false, e.message);
}

try {
  assertTest('getDesignationRank(null as any) returns 99', getDesignationRank(null as any) === 99);
} catch (e: any) {
  assertTest('getDesignationRank(null as any) does not crash', false, e.message);
}

try {
  assertTest('isBadgedMember(null as any) returns false', isBadgedMember(null as any) === false);
} catch (e: any) {
  assertTest('isBadgedMember(null as any) does not crash', false, e.message);
}

try {
  // Pass non-string object (should fail gracefully or throw if unsafe)
  const nonStringObj: any = { toString: () => 'अध्यक्ष' };
  // If role.trim is not a function, role.trim() will throw TypeError if not checked!
  let threw = false;
  try {
    hasFullFinancialAccess(123 as any);
  } catch {
    threw = true;
  }
  console.log(`  Note: Passing number 123 to hasFullFinancialAccess threw error? ${threw}`);
} catch (e: any) {
  console.log(`  Note: ${e.message}`);
}

// 6. Unknown and Arbitrary Roles Security Check
console.log('\n--- 6. Arbitrary & Invalid Roles ---');

assertTest(
  'isBadgedMember("Guest") check behavior',
  isBadgedMember('Guest') === true,
  'Note: arbitrary string returns true in current implementation'
);

assertTest(
  'isBadgedMember("Unassigned") check behavior',
  isBadgedMember('Unassigned') === true,
  'Note: arbitrary string returns true in current implementation'
);

console.log('\n----------------------------------------------------------------');
console.log(`  ADVERSARIAL SUMMARY: ${passed} Passed | ${failed} Failed`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}
