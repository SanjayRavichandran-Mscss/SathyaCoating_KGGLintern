const xlsx = require("xlsx");

exports.parseExcel = async (file) => {
    try {
        const workbook = xlsx.readFile(file.path || file.tempFilePath);
        const sheetNames = workbook.SheetNames;
        const data = {};

        for (const sheetName of sheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const sheetData = xlsx.utils.sheet_to_json(worksheet, { raw: false, dateNF: "dd-mm-yyyy" });

            // Format date fields explicitly (if necessary)
            sheetData.forEach((row) => {
                Object.keys(row).forEach((key) => {
                    if (row[key] instanceof Date) {
                        const date = new Date(row[key]);
                        row[key] = date.toLocaleDateString("en-GB"); // "dd/mm/yyyy"
                    }
                });
            });

            if (sheetData.length > 0) {
                data[sheetName] = sheetData;
            }
        }

        console.log("Parsed Excel Data:", JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error("Error parsing Excel file:", error);
        throw new Error(`Error parsing Excel file: ${error.message}`);
    }
};
