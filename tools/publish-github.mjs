import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const run = (cmd) => {
  console.log(`> ${cmd}`);
  return execSync(cmd, { cwd: root, stdio: 'inherit', encoding: 'utf8' });
};

try {
  run('git init -b main');
  run('git add .');
  run('git commit -m "Initial commit: Beso Game (لا تطلع يا بيسو) - 3D Horror & Comedy web game"');
  run('gh repo create beso-game --public --source=. --remote=origin --push --description "لعبة رعب وكوميديا ثلاثية الأبعاد بمنظور الشخص الأول — لا تطلع يا بيسو"');
  console.log('\nSuccessfully published beso-game to GitHub!');
} catch (err) {
  console.error('Error during publishing:', err);
  process.exit(1);
}
