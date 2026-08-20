import fs from 'fs';
import path from 'path';

const baseDir = 'src/app/api';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(baseDir, (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Remove the import for trackUsage and updateUserTierInSupabase
    content = content.replace(/import { trackUsage } from "@\/lib\/usage";\n?/g, '');
    content = content.replace(/import { updateUserTierInSupabase } from "@\/lib\/usage";\n?/g, '');
    content = content.replace(/import { trackUsage, updateUserTierInSupabase } from "@\/lib\/usage";\n?/g, '');

    // Remove the calls
    // Usually: if (userId) trackUsage(userId, "feature").catch(console.error);
    content = content.replace(/if \(userId\) trackUsage\(.*?\)\.catch\(.*?\);\n?/g, '');
    content = content.replace(/trackUsage\(.*?\)\.catch\(.*?\);\n?/g, '');

    // Remove the updateUserTierInSupabase calls
    content = content.replace(/await updateUserTierInSupabase\(.*?\);\n?/g, '');

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log(`Stripped legacy usage from ${filePath}`);
    }
  }
});
