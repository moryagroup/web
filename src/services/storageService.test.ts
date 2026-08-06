import { getStoredUser, saveUser, DEFAULT_USER } from './storageService';
import { CurrentUser } from '../types';

// Mock localStorage in Node
const store = new Map<string, string>();
(global as any).localStorage = {
  getItem: (k: string) => store.get(k) || null,
  setItem: (k: string, v: string) => store.set(k, String(v)),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
};

console.log('===============================================================');
console.log('       MILESTONE M1 ADVERSARIAL STRESS TEST SUITE RESULTS      ');
console.log('===============================================================');

// SCENARIO 1: Empty localStorage
store.clear();
const u1 = getStoredUser();
console.log('[SCENARIO 1] Empty localStorage:');
console.log('  Stored raw data:', store.get('morya_mandal_user_v2'));
console.log('  Parsed user object:', JSON.stringify(u1));
console.log('  Result:', u1?.isLoggedIn === false ? 'PASS' : 'FAIL');

// SCENARIO 2: Corrupted / Invalid JSON string
store.set('morya_mandal_user_v2', '{invalid_json_format: true,');
const u2 = getStoredUser();
console.log('\n[SCENARIO 2] Corrupted / Invalid JSON string:');
console.log('  Stored raw data:', store.get('morya_mandal_user_v2'));
console.log('  Parsed user object:', JSON.stringify(u2));
console.log('  Result:', u2?.isLoggedIn === false ? 'PASS' : 'FAIL');

// SCENARIO 3: Stored string "null"
store.set('morya_mandal_user_v2', 'null');
const u3 = getStoredUser() as CurrentUser;
console.log('\n[SCENARIO 3] Stored string "null":');
console.log('  Stored raw data:', store.get('morya_mandal_user_v2'));
console.log('  Parsed user object:', JSON.stringify(u3));
let crash3 = false;
let crashMessage3 = '';
try {
  const testAccess = u3.isLoggedIn;
} catch (e: any) {
  crash3 = true;
  crashMessage3 = e.message;
  console.log('  Component Execution Result: CRASH ->', e.message);
}
console.log('  Result:', crash3 ? 'FAIL (Uncaught null reference crash)' : 'PASS');

// SCENARIO 4: Stored Primitive Number 12345
store.set('morya_mandal_user_v2', '12345');
const u4 = getStoredUser() as any;
console.log('\n[SCENARIO 4] Stored Primitive Number 12345:');
console.log('  Stored raw data:', store.get('morya_mandal_user_v2'));
console.log('  Parsed user object:', JSON.stringify(u4));
let crash4 = false;
try {
  const nameSub = u4.name.substring(0, 2);
} catch (e: any) {
  crash4 = true;
  console.log('  Component Execution Result: CRASH ->', e.message);
}
console.log('  Result:', crash4 ? 'FAIL (Uncaught type error on non-object stored state)' : 'PASS');

// SCENARIO 5: Pre-existing User Data (without isLoggedIn property)
store.set('morya_mandal_user_v2', JSON.stringify({ name: 'संकेत कौले', role: 'खजिनदार', phone: '9822010104' }));
const u5 = getStoredUser();
const isLogged5 = u5 && u5.isLoggedIn !== false;
console.log('\n[SCENARIO 5] Pre-existing User Data without isLoggedIn property:');
console.log('  Stored raw data:', store.get('morya_mandal_user_v2'));
console.log('  Parsed user object:', JSON.stringify(u5));
console.log('  Evaluated isLoggedIn (currentUser.isLoggedIn !== false):', isLogged5);
console.log('  Result:', isLogged5 === false ? 'PASS' : 'FAIL (Old stored user incorrectly treated as Logged-In Admin/Treasurer)');

// SCENARIO 6: Stored User Object with null properties
store.set('morya_mandal_user_v2', JSON.stringify({ name: null, role: null, isLoggedIn: null }));
const u6 = getStoredUser() as any;
console.log('\n[SCENARIO 6] User object with null properties ({ name: null, role: null, isLoggedIn: null }):');
console.log('  Stored raw data:', store.get('morya_mandal_user_v2'));
console.log('  Parsed user object:', JSON.stringify(u6));
let crash6 = false;
try {
  const nameSub = u6.name.substring(0, 2);
} catch (e: any) {
  crash6 = true;
  console.log('  Component Execution Result: CRASH ->', e.message);
}
console.log('  Result:', crash6 ? 'FAIL (Uncaught null reference on user.name)' : 'PASS');

// SCENARIO 7: Logout Reset Consistency
saveUser(DEFAULT_USER);
const u7 = getStoredUser();
console.log('\n[SCENARIO 7] Logout Reset Consistency:');
console.log('  Stored raw data after saveUser(DEFAULT_USER):', store.get('morya_mandal_user_v2'));
console.log('  Parsed user object:', JSON.stringify(u7));
console.log('  Result:', u7?.isLoggedIn === false ? 'PASS' : 'FAIL');

console.log('===============================================================');
