const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'src', 'app', 'admin');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(fullPath));
        } else if (file.endsWith('page.tsx')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walkDir(adminDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('PageHeader')) return;

    // Pattern to match the header div
    // <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4...">
    //   <div>
    //     <h1 className="... flex items-center gap-2.5">
    //       <IconName className="..." />
    //       Title Text
    //     </h1>
    //     <p className="...">Description Text</p>
    //   </div>
    //   <Button ...>...</Button> // Or nothing
    // </div>

    // regex to capture:
    // 1: <IconName
    // 2: Title Text
    // 3: Description Text
    // 4: The whole action part (Button or div)

    const headerRegex = /<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4[^>]*>\s*<div>\s*<h1 className="[^"]*">\s*(?:<([A-Z][a-zA-Z0-9]*)\s+className="[^"]*"\s*\/>)?\s*([^<]+?)\s*<\/h1>\s*(?:<p className="[^"]*">([^<]+?)<\/p>)?\s*<\/div>\s*(?:(<div[^>]*>.*?<\/div>|<Button[^>]*>.*?<\/Button>))?\s*<\/div>/s;

    const match = headerRegex.exec(content);
    if (match) {
        const originalDiv = match[0];
        const iconName = match[1];
        const titleText = match[2].trim();
        const descText = match[3] ? match[3].trim() : '';
        const actionHtml = match[4] ? match[4].trim() : '';

        // Import PageHeader and Icon
        let newImports = `import { PageHeader } from '@/components/ui/PageHeader';\n`;
        // We already have icons imported from lucide-react usually, so we don't strictly need to import the icon if it's already there.

        let pageHeaderJSX = `      <PageHeader\n        title="${titleText}"\n`;
        if (descText) {
            pageHeaderJSX += `        description="${descText}"\n`;
        }
        if (iconName) {
            pageHeaderJSX += `        icon={${iconName}}\n`;
        }
        if (actionHtml) {
            // Need to properly indent actionHtml
            const indentedAction = actionHtml.split('\n').map((line, i) => i === 0 ? line : `        ${line.trim()}`).join('\n');
            pageHeaderJSX += `        action={\n          ${indentedAction}\n        }\n`;
        }
        pageHeaderJSX += `      />`;

        content = content.replace(originalDiv, pageHeaderJSX);

        // Add import
        const importRegex = /import\s+.*?;/g;
        let lastImportMatch;
        let lastImportIndex = 0;
        while ((lastImportMatch = importRegex.exec(content)) !== null) {
            lastImportIndex = lastImportMatch.index + lastImportMatch[0].length;
        }

        if (lastImportIndex > 0) {
            content = content.slice(0, lastImportIndex) + "\n" + newImports + content.slice(lastImportIndex);
        } else {
            content = newImports + content;
        }

        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    } else {
        console.log(`Regex did not match: ${file}`);
    }
});

console.log("Done updating headers.");
