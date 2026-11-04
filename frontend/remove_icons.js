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
    
    // Check if PageHeader is used
    if (content.includes('<PageHeader')) {
        // Replace icon={Something} with empty string
        const oldContent = content;
        content = content.replace(/\s*icon=\{[^}]+\}/g, '');
        
        if (content !== oldContent) {
            fs.writeFileSync(file, content);
            console.log(`Removed icon from ${file}`);
        }
    }
});

console.log("Done removing icons.");
