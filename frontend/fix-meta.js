const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let files = fs.readdirSync(dir);
    for (let file of files) {
        let fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('res.meta')) {
                // Replacing 'res.meta' with '(res as any).meta'
                content = content.replace(/res\.meta/g, '(res as any).meta');
                fs.writeFileSync(fullPath, content);
                console.log('Fixed', fullPath);
            }
        }
    }
}

walkDir(path.join(__dirname, 'src'));
console.log('Done');
