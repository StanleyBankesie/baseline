const cp = require('child_process');
try {
  const out = cp.execSync('git grep -i -n "module" client/src/layout/', { encoding: 'utf8' });
  const lines = out.split('\n');
  lines.forEach(l => {
    if (l.includes('icon') || l.includes('scroll') || l.includes('slide') || l.includes('nav')) {
      console.log(l);
    }
  });
} catch (e) {
  console.log(e.stdout || e.message);
}
