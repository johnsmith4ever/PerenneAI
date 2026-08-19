const fs = require('fs');
const path = require('path');

const files = [
  'src/app/(app)/debate/page.tsx',
  'src/app/(app)/essay/page.tsx',
  'src/app/(app)/explore/note-summarizer/page.tsx',
  'src/app/(app)/math-solver/page.tsx',
  'src/app/(app)/quiz/page.tsx',
  'src/app/(app)/quiz/exam-sim/page.tsx'
];

files.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${file}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Replace alerts
  const alertRegex = /alert\(['"]([^'"]*(?:credit|Credits|daily)[^'"]*)['"]\);?/gi;
  if (alertRegex.test(content)) {
    content = content.replace(alertRegex, (match, msg) => {
      return `openUpgradeModal("${msg}", "Upgrade Plan", "/subscriptions");`;
    });
    modified = true;
  }
  
  if (modified) {
    // Inject import
    if (!content.includes('useUpgradeModal')) {
      content = content.replace(
        /(import .+ from ["']lucide-react["'];?)/,
        `$1\nimport { useUpgradeModal } from "@/components/upgrade-modal";`
      );
      
      // If lucide-react not found, just put it after the first import
      if (!content.includes('import { useUpgradeModal }')) {
        content = content.replace(
          /(import .+;\n)/,
          `$1import { useUpgradeModal } from "@/components/upgrade-modal";\n`
        );
      }
      
      // Inject hook inside the main component
      // We can look for `export default function` or `export function`
      const hookInjectionRegex = /(export default function \w+\(\) {\n)/;
      if (hookInjectionRegex.test(content)) {
        content = content.replace(hookInjectionRegex, `$1  const { openUpgradeModal } = useUpgradeModal();\n`);
      } else {
        const altRegex = /(export function \w+\(\) {\n)/;
        content = content.replace(altRegex, `$1  const { openUpgradeModal } = useUpgradeModal();\n`);
      }
    }
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Patched ${file}`);
  }
});
