/// <reference types="google.maps" />

// Basic type declarations for modules and dependencies

declare module "*.json" {
    const value: any;
    export default value;
}

// PDFMake type declarations for build paths
declare module 'pdfmake/build/pdfmake' {
    const pdfMake: any;
    export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
    const pdfFonts: any;
    export default pdfFonts;
} 
