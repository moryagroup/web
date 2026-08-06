// Tier 3 Integration Tests: Authentication Flow & Login Validation Logic
import {
  TestGroup,
  assert,
  assertEqual,
  assertDeepEqual,
} from './test_helper';

import { CurrentUser, Member } from '../src/types';
import { INITIAL_MEMBERS } from '../src/mockData';

// Simulated Login Authentication Handler (mirroring LoginModal logic)
export function validateAdminLogin(password: string): { success: boolean; user?: CurrentUser; error?: string } {
  if (password.trim() !== 'Tom&jerry5633#') {
    return {
      success: false,
      error: 'चुकीचा ॲडमिन पासवर्ड! कृपया अचूक पासवर्ड प्रविष्ट करा.',
    };
  }
  return {
    success: true,
    user: {
      name: 'सिस्टम ॲडमिन',
      role: 'ॲडमिन',
      phone: '९८२२०१०१००',
      isLoggedIn: true,
    },
  };
}

export function validateMemberLogin(
  selectedMember: Member,
  passwordInput: string,
  currentUser?: CurrentUser
): { success: boolean; user?: CurrentUser; error?: string } {
  const isAdminLoggedIn = currentUser?.role === 'ॲडमिन' && currentUser?.isLoggedIn !== false;

  // If member has a set password and current user is NOT Admin
  if (!isAdminLoggedIn && selectedMember.password && selectedMember.password.trim() !== '') {
    if (!passwordInput.trim() || passwordInput.trim() !== selectedMember.password.trim()) {
      return {
        success: false,
        error: 'चुकीचा पासवर्ड! कृपया बरोबर पासवर्ड प्रविष्ट करा.',
      };
    }
  }

  return {
    success: true,
    user: {
      name: selectedMember.fullName,
      role: (selectedMember.designation as any) || 'सभासद',
      phone: selectedMember.phone,
      email: selectedMember.email,
      birthDate: selectedMember.birthDate,
      age: selectedMember.age,
      isLoggedIn: true,
    },
  };
}

export function performLogout(): CurrentUser {
  return {
    name: 'पाहुणा (Guest)',
    role: 'सभासद',
    isLoggedIn: false,
  };
}

export async function runTier3Tests() {
  const group = new TestGroup('Tier 3: Authentication Flow & Credential Validation');

  await group.test('R2.9 - Admin login succeeds with valid password Tom&jerry5633#', () => {
    const result = validateAdminLogin('Tom&jerry5633#');
    assert(result.success, 'Admin login should succeed with correct password');
    assertEqual(result.user?.role, 'ॲडमिन', 'Role should be ॲडमिन');
    assertEqual(result.user?.isLoggedIn, true, 'isLoggedIn should be true');
  });

  await group.test('R2.10 - Admin login fails with incorrect password', () => {
    const result = validateAdminLogin('WrongPassword123');
    assertEqual(result.success, false, 'Admin login should fail with wrong password');
    assert(result.error !== undefined, 'Error message should be set');
    assert(result.error!.includes('चुकीचा ॲडमिन पासवर्ड'), 'Error message should inform user');
  });

  await group.test('R2.11 - Admin login handles whitespace trimming correctly', () => {
    const result = validateAdminLogin('  Tom&jerry5633#  ');
    assert(result.success, 'Admin login should trim whitespace around valid password');
  });

  await group.test('R2.12 - Member login without password set allows direct login', () => {
    const memberNoPass: Member = {
      id: 'm-101',
      memberCode: 'M-101',
      fullName: 'राकेश पोटे',
      designation: 'अध्यक्ष',
      phone: '9822010101',
      annualTargetAmount: 6000,
      isActive: true,
    };
    const result = validateMemberLogin(memberNoPass, '');
    assert(result.success, 'Member without password should log in successfully');
    assertEqual(result.user?.name, 'राकेश पोटे');
    assertEqual(result.user?.isLoggedIn, true);
  });

  await group.test('R2.13 - Member login with password set requires exact password', () => {
    const memberWithPass: Member = {
      id: 'm-102',
      memberCode: 'M-102',
      fullName: 'विजय जगताप',
      designation: 'उपाध्यक्ष',
      phone: '9822010102',
      annualTargetAmount: 6000,
      isActive: true,
      password: 'MemberPass123!',
    };

    const wrongResult = validateMemberLogin(memberWithPass, 'WrongPass');
    assertEqual(wrongResult.success, false, 'Member login with wrong password should fail');
    assert(wrongResult.error!.includes('चुकीचा पासवर्ड'), 'Error message should indicate wrong password');

    const correctResult = validateMemberLogin(memberWithPass, 'MemberPass123!');
    assert(correctResult.success, 'Member login with correct password should succeed');
    assertEqual(correctResult.user?.isLoggedIn, true);
  });

  await group.test('R2.14 - Logged-in Admin bypasses member password check when switching accounts', () => {
    const adminUser: CurrentUser = {
      name: 'सिस्टम ॲडमिन',
      role: 'ॲडमिन',
      isLoggedIn: true,
    };
    const memberWithPass: Member = {
      id: 'm-102',
      memberCode: 'M-102',
      fullName: 'विजय जगताप',
      designation: 'उपाध्यक्ष',
      phone: '9822010102',
      annualTargetAmount: 6000,
      isActive: true,
      password: 'SecretMemberPass',
    };

    // Even with empty password input, if current user is Admin, login succeeds
    const result = validateMemberLogin(memberWithPass, '', adminUser);
    assert(result.success, 'Admin user should be able to switch to member account without password');
    assertEqual(result.user?.name, 'विजय जगताप');
  });

  await group.test('R1.10 - Logout resets authentication state cleanly to Guest user', () => {
    const loggedOutUser = performLogout();
    assertEqual(loggedOutUser.isLoggedIn, false, 'isLoggedIn must be false on logout');
    assertEqual(loggedOutUser.role, 'सभासद', 'Role should revert to guest default (सभासद)');
    assertEqual(loggedOutUser.name, 'पाहुणा (Guest)', 'Name should be Guest name');
  });

  return group.summary();
}
