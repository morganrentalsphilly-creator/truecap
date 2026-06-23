import postcss from 'postcss';
import tw from '@tailwindcss/postcss';
import fs from 'fs';
const css = fs.readFileSync('styles/globals.css','utf8');
try {
  const res = await postcss([tw()]).process(css, { from: 'styles/globals.css' });
  const hasRule = /\.overflow-x-auto\s*\{[^}]*position:\s*relative/.test(res.css);
  console.log('COMPILE_OK length=' + res.css.length);
  console.log('OUR_RULE_PRESENT=' + hasRule);
} catch (e) {
  console.error('COMPILE_FAILED:', e.message);
  process.exit(1);
}
