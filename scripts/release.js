import { execFileSync, execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';

// Användning:
//   npm run release "feat: kort beskrivning"
//   npm run release "feat: kort beskrivning" "Detaljerad releasenote..."
//   npm run release minor "feat: ny större funktion"
//   npm run release minor "feat: ny större funktion" "Detaljerad releasenote..."
const args = process.argv.slice(2);

let versionType = 'patch';
let title = '';
let body = '';

if (args.length === 0) {
  console.error('❌ Vänligen ange ett commit-meddelande.');
  console.error('Användning: npm run release "feat: ditt meddelande"');
  console.error('Eller:      npm run release minor "feat: ditt meddelande" "valfri detaljerad text"');
  process.exit(1);
}

let rest = args;
if (['patch', 'minor', 'major'].includes(args[0])) {
  versionType = args[0];
  rest = args.slice(1);
}

if (rest.length === 0 || !rest[0].trim()) {
  console.error('❌ Vänligen ange en rubrik / ett commit-meddelande.');
  process.exit(1);
}

title = rest[0].trim();
body = rest.slice(1).join('\n\n').trim();

const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';

try {
  // 1. Lägg till alla aktuella ändringar
  console.log('📦 Förbereder ändringar (git add .)...');
  execFileSync('git', ['add', '.'], { stdio: 'inherit' });

  // 2. Höj versionen i rotens package.json (Source of Truth)
  console.log(`\n⬆️  Höjer versionen (${versionType})...`);
  execSync(`${npmBin} version ${versionType} --no-git-tag-version`, { stdio: 'inherit' });

  const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
  const newVersion = packageJson.version;

  const isConventional = /^[a-z]+(\([^)]+\))?!?: /.test(title);
  const commitSubject = isConventional
    ? `v${newVersion} ${title}`
    : `v${newVersion} chore(release): ${title}`;

  const toStage = ['package.json'];
  if (existsSync('./package-lock.json')) toStage.push('package-lock.json');
  execFileSync('git', ['add', ...toStage], { stdio: 'inherit' });

  // 3. Skapa commit (execFileSync hanterar svenska tecken och citattecken säkert)
  console.log(`\n💾 Sparar commit: "${commitSubject}"`);
  const commitArgs = ['commit', '-m', commitSubject];
  if (body) commitArgs.push('-m', body);
  execFileSync('git', commitArgs, { stdio: 'inherit' });

  // 4. Skapa annoterad Git-tagg
  const tagName = `v${newVersion}`;
  const tagMessage = body ? `${commitSubject}\n\n${body}` : commitSubject;
  console.log(`\n🏷️  Skapar tagg: ${tagName}`);
  execFileSync('git', ['tag', '-a', tagName, '-m', tagMessage], { stdio: 'inherit' });

  // 5. Pusha både commits och taggar till GitHub
  console.log('\n🚀 Pushar till GitHub...');
  execFileSync('git', ['push', '--follow-tags'], { stdio: 'inherit' });

  console.log(`\n✅ Klar! Version ${tagName} är släppt och pushad till GitHub.`);
  console.log('👉 Gå till Portainer → stacken "anna-lea" → Pull and redeploy (slå PÅ "Re-pull image and redeploy").');
} catch (error) {
  console.error('\n❌ Ett fel uppstod under release-processen.');
  console.error(error.message);
  process.exit(1);
}
