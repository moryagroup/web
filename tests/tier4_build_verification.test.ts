// Tier 4 Build & Typecheck Verification Tests
import { execSync } from 'child_process';
import { TestGroup, assert } from './test_helper';

export async function runTier4Tests() {
  const group = new TestGroup('Tier 4: Code Integrity & Build Check (R3)');

  // Ensure Node directory is in PATH for child process executions
  const nodeDir = 'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\MSBuild\\Microsoft\\VisualStudio\\NodeJs';
  const customEnv = {
    ...process.env,
    PATH: `${nodeDir};${process.env.PATH || ''}`,
  };

  await group.test('R3.1 - TypeScript type check compiles cleanly without errors (tsc --noEmit)', () => {
    try {
      const output = execSync('npx tsc --noEmit', {
        cwd: process.cwd(),
        env: customEnv,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      assert(true, 'TypeScript compilation passed');
    } catch (err: any) {
      const stdout = err.stdout?.toString() || '';
      const stderr = err.stderr?.toString() || '';
      throw new Error(`TypeScript check failed (tsc --noEmit):\n${stdout}\n${stderr}`);
    }
  });

  await group.test('R3.2 - Vite production build succeeds without errors (vite build)', () => {
    try {
      const output = execSync('npx vite build', {
        cwd: process.cwd(),
        env: customEnv,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      assert(output.includes('built in') || output.includes('dist'), 'Vite build succeeded');
    } catch (err: any) {
      const stdout = err.stdout?.toString() || '';
      const stderr = err.stderr?.toString() || '';
      throw new Error(`Vite build failed (npx vite build):\n${stdout}\n${stderr}`);
    }
  });

  return group.summary();
}
