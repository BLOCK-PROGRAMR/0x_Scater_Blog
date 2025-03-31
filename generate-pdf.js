const fs = require('fs');
const markdownpdf = require("markdown-pdf");

const docsFolder = "./docs";

fs.readdirSync(docsFolder).forEach(file => {
    if (file.endsWith(".md")) {
        const inputFile = docsFolder + file;
        const outputFile = docsFolder + file.replace(".md", ".pdf");

        fs.createReadStream(inputFile)
            .pipe(markdownpdf())
            .pipe(fs.createWriteStream(outputFile))
            .on('finish', () => console.log(`✅ PDF Created: ${outputFile}`));
    }
});
