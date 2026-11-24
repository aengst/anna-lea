import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// Användning: npm run release "ditt meddelande"
// Eller:      npm run release minor "ditt meddelande"
const args = process.argv.slice(2);

let versionType = 'patch';
let message = '';

if (args.length === 0) {
  console.error('❌ Vänligen ange ett commit-meddelande.');
  console.error('Användning: npm run release "ditt meddelande"');
  console.error('Eller:      npm run release minor "ditt meddelande"');
  process.exit(1);
}

if (['patch', 'minor', 'major'].includes(args[0])) {
  versionType = args[0];
  message = args.slice(1).join(' ');
} else {
  message = args.join(' ');
}

if (!message) {
  console.error('❌ Vänligen ange ett commit-meddelande efter versions-typen.');
  process.exit(1);
}

try {
  console.log('📦 Förbereder ändringar (git add .)...');
  execSync('git add .', { stdio: 'inherit' });

  console.log(`\n⬆️  Höjer versionen (${versionType})...`);
  execSync(`npm.cmd version ${versionType} --no-git-tag-version`, { stdio: 'inherit' });

  const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
  const newVersion = packageJson.version;

  const isConventional = /^[a-z]+(\(.*\))?!?: /.test(message);
  const finalCommitMessage = isConventional
    ? `${message} (v${newVersion})`
    : `chore(release): v${newVersion} - ${message}`;

  execSync('git add package.json package-lock.json', { stdio: 'inherit' });

  console.log(`\n💾 Sparar commit: "${finalCommitMessage}"`);
  execSync(`git commit -m "${finalCommitMessage}"`, { stdio: 'inherit' });

  console.log(`\n🏷️  Skapar tagg: v${newVersion}`);
  execSync(`git tag -a v${newVersion} -m "${finalCommitMessage}"`, { stdio: 'inherit' });

  console.log('\n🚀 Pushar till GitHub...');
  execSync('git push --follow-tags', { stdio: 'inherit' });

  console.log(`\n✅ Klar! Version ${newVersion} är släppt och pushad.`);
  console.log('Du kan nu uppdatera din Portainer-stack!');
} catch (error) {
  console.error('\n❌ Ett fel uppstod under release-processen.');
  console.error(error.message);
  process.exit(1);
}
