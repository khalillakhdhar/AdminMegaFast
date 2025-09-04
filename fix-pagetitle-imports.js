const fs = require('fs');
const path = require('path');

// List of files that need PageTitleComponent imports removed
const filesToFix = [
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\ui\\tabs\\tabs.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\ui\\general\\general.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\ui\\rating\\rating.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\ui\\progressbar\\progressbar.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\ui\\notification\\notification.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\ui\\modals\\modals.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\ui\\lightbox\\lightbox.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\ui\\imagecropper\\imagecropper.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\ui\\dropdowns\\dropdowns.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\ui\\cards\\cards.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\ui\\carousel\\carousel.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\ui\\alerts\\alerts.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\tasks\\list\\list.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\tasks\\kanbanboard\\kanbanboard.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\tables\\basic\\basic.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\tables\\advancedtable\\advancedtable.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\maps\\amcharts\\amcharts.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\maps\\leaflet\\leaflet.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\maps\\google\\google.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\icons\\materialdesign\\materialdesign.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\icons\\fontawesome\\fontawesome.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\icons\\dripicons\\dripicons.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\icons\\boxicons\\boxicons.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\form\\elements\\elements.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\form\\layouts\\layouts.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\form\\wizard\\wizard.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\form\\validation\\validation.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\form\\uploads\\uploads.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\form\\mask\\mask.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\form\\repeater\\repeater.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\form\\editor\\editor.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\form\\advancedform\\advancedform.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\filemanager\\filemanager.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\email\\basic\\basic.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\email\\billing\\billing.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\email\\alert\\alert.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\dashboards\\default\\default.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\dashboards\\saas\\saas.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\dashboards\\crypto\\crypto.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\dashboards\\jobs\\jobs.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\crypto\\exchange\\exchange.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\crypto\\wallet\\wallet.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\dashboards\\blog\\blog.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\contacts\\usergrid\\usergrid.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\contacts\\profile\\profile.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\contacts\\userlist\\userlist.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\chat\\chat.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\crypto\\buysell\\buysell.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\calendar\\calendar.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\blog\\detail\\detail.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\blog\\bloglist\\bloglist.component.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\blog\\bloggrid\\bloggrid.component.ts"
];

// List of module files to fix as well
const moduleFiles = [
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\projects\\projects.module.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\jobs\\jobs.module.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\invoices\\invoices.module.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\ecommerce\\ecommerce.module.ts",
    "e:\\megafast\\mega app\\Admin\\src\\app\\pages\\crypto\\crypto.module.ts"
];

function removePageTitleComponent(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`⚠ File not found: ${filePath}`);
            return false;
        }

        let content = fs.readFileSync(filePath, 'utf8');
        
        // Remove the PageTitleComponent import line
        content = content.replace(/import \{ PageTitleComponent \} from .*?;\r?\n/g, '');
        
        // Remove PageTitleComponent from imports array (with surrounding commas)
        content = content.replace(/,?\s*PageTitleComponent\s*,?/g, '');
        
        // Clean up empty imports array or trailing commas
        content = content.replace(/imports:\s*\[\s*,/g, 'imports:[');
        content = content.replace(/,\s*\]/g, ']');
        content = content.replace(/imports:\s*\[\s*\]/g, 'imports:[]');
        
        // Clean up multiple commas
        content = content.replace(/,,+/g, ',');
        
        fs.writeFileSync(filePath, content);
        return true;
    } catch (error) {
        console.log(`❌ Error processing ${filePath}: ${error.message}`);
        return false;
    }
}

console.log(`Starting to fix ${filesToFix.length + moduleFiles.length} TypeScript files...`);

let processedFiles = 0;
let totalFiles = filesToFix.length + moduleFiles.length;

// Fix component files
filesToFix.forEach(file => {
    if (removePageTitleComponent(file)) {
        processedFiles++;
        console.log(`✓ Fixed component ${processedFiles}/${totalFiles}: ${path.basename(file)}`);
    }
});

// Fix module files
moduleFiles.forEach(file => {
    if (removePageTitleComponent(file)) {
        processedFiles++;
        console.log(`✓ Fixed module ${processedFiles}/${totalFiles}: ${path.basename(file)}`);
    }
});

console.log(`\n✅ PageTitleComponent cleanup completed! Fixed ${processedFiles}/${totalFiles} files.`);
console.log("All unused PageTitleComponent imports have been removed from TypeScript files outside the features folder.");
