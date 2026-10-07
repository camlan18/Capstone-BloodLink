const fs = require('fs');

const filesToFix = [
  "d:\\FPT\\SP_SU_26\\HieuMaiGit\\NewRepo\\donate-blood\\frontend\\src\\app\\admin\\donations\\page.tsx",
  "d:\\FPT\\SP_SU_26\\HieuMaiGit\\NewRepo\\donate-blood\\frontend\\src\\app\\admin\\certificates\\page.tsx",
  "d:\\FPT\\SP_SU_26\\HieuMaiGit\\NewRepo\\donate-blood\\frontend\\src\\app\\admin\\requests\\page.tsx",
  "d:\\FPT\\SP_SU_26\\HieuMaiGit\\NewRepo\\donate-blood\\frontend\\src\\app\\admin\\inventory\\page.tsx",
  "d:\\FPT\\SP_SU_26\\HieuMaiGit\\NewRepo\\donate-blood\\frontend\\src\\app\\admin\\facilities\\page.tsx"
];

filesToFix.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/description="\{meta\?\.total \|\| 0\} (.*?)"/g, 'description={`\\${meta?.total || 0} $1`}');
  fs.writeFileSync(file, content);
  console.log(`Fixed ${file}`);
});
