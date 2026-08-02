import { spawn } from 'node:child_process';

const child = spawn(
  'vercel',
  ['dev', '--listen', '3000', '--yes'],
  { stdio: 'inherit', shell: true }
);

child.on('exit', (code) => process.exit(code ?? 1));
