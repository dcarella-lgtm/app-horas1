const fs = require('fs');
const cp = require('child_process');
try {
    const output = cp.execSync('git show cecbfe8:js/ui.js', {encoding: 'utf-8', maxBuffer: 1024*1024*10});
    fs.writeFileSync('c:/Users/carellad/APPS/app-horas1/js/ui_old.js', output);
    console.log('Success');
} catch (e) {
    console.error(e);
}
