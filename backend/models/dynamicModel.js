const db = require("../config/dbConfig");

async function createTableIfNotExists(sheetName, columns) {
    const formattedTableName = sheetName.replace(/\s+/g, "_").toLowerCase();
    let sql = `CREATE TABLE IF NOT EXISTS \`${formattedTableName}\` (id INT AUTO_INCREMENT PRIMARY KEY, `;

    const columnDefinitions = Object.keys(columns).map((col) => {
        const firstValue = columns[col];
        let dataType = "VARCHAR(255)"; // Default type

        if (!isNaN(firstValue) && typeof firstValue === "number") {
            dataType = Number.isInteger(Number(firstValue)) ? "INT" : "FLOAT";
        } else if (/\d{2}-\d{2}-\d{4}/.test(firstValue)) {
            // Keep date as VARCHAR instead of DATE
            dataType = "VARCHAR(255)";
        }

        return `\`${col}\` ${dataType}`;
    });

    sql += columnDefinitions.join(", ") + ");";

    await db.execute(sql);
}


module.exports = { createTableIfNotExists };
