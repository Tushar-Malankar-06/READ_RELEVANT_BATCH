const { execSync } = require('child_process');
const path = require('path');

const scripts = [
  'ai_breakfast.js',
  'alphasignal.js',
  'batch.js',
  'mediumdailydigest.js',
  'ai_valley.js',
  'rundown_daily.js',
  'rundown_tech.js',
  'simple_ai.js',
  'unwind.js',
  'mindstream.js',
];

for (const script of scripts) {
  const scriptPath = path.join(__dirname, script);
  console.log(`\nRunning: ${script}`);
  try {
    execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
  } catch (e) {
    console.error(`Error running ${script}:`, e.message);
  }
}

console.log('\nAll newsletter extraction scripts have finished.'); 