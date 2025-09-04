declare module "*.json" {
    const value: any;
    export default value;
}

// Fallback type declarations for pdfmake build paths used in Angular
declare module 'pdfmake/build/pdfmake' {
    const pdfMake: any;
    export default pdfMake;
}
declare module 'pdfmake/build/vfs_fonts' {
    const pdfFonts: any;
    export default pdfFonts;
}