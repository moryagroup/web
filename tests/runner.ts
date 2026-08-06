// Master Test Runner for Morya Group Web App Authentication Test Suite
import { runTier1Tests } from './tier1_storage_default.test';
import { runTier2Tests } from './tier2_rbac.test';
import { runTier3Tests } from './tier3_auth_flow.test';
import { runTier4Tests } from './tier4_build_verification.test';

async function runTestSuite() {
  console.log('================================================================');
  console.log('  MORYA GROUP WEB APP - AUTHENTICATION REFACTORING TEST SUITE  ');
  console.log('================================================================\n');

  const startTime = Date.now();

  const tier1Summary = await runTier1Tests();
  console.log('');
  const tier2Summary = await runTier2Tests();
  console.log('');
  const tier3Summary = await runTier3Tests();
  console.log('');
  const tier4Summary = await runTier4Tests();
  console.log('');

  const summaries = [tier1Summary, tier2Summary, tier3Summary, tier4Summary];

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  console.log('----------------------------------------------------------------');
  console.log('                      TEST RESULTS SUMMARY                      ');
  console.log('----------------------------------------------------------------');

  for (const s of summaries) {
    totalTests += s.total;
    totalPassed += s.passed;
    totalFailed += s.failed;

    const statusSymbol = s.failed === 0 ? '✓ PASS' : '✗ FAIL';
    console.log(` ${statusSymbol.padEnd(8)} | ${s.name.padEnd(50)} | ${s.passed}/${s.total} passed`);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('----------------------------------------------------------------');
  console.log(` TOTAL    | ${totalPassed}/${totalTests} Passed | ${totalFailed} Failed | Duration: ${durationSec}s`);
  console.log('================================================================\n');

  if (totalFailed > 0) {
    console.error(`❌ TEST SUITE FAILED: ${totalFailed} test(s) failed.`);
    process.exit(1);
  } else {
    console.log('✅ ALL TEST TIERS PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Unhandled error during test execution:', err);
  process.exit(1);
});
