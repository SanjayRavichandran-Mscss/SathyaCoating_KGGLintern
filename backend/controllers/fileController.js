const path = require("path");
const xlsx = require("xlsx");
const db = require("../config/dbConfig");
const { createTableIfNotExists } = require("../models/dynamicModel");

// Function to create the `projects` table if it does not exist
const createProjectsTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS projects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_name VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await db.execute(createTableQuery);
  console.log("Projects table ensured to exist");
};

// Function to create the `sheets` table dynamically if it does not exist
const createSheetsTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS sheets (
      sheet_id INT AUTO_INCREMENT PRIMARY KEY,
      sheet_name VARCHAR(255) NOT NULL,
      project_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `;
  await db.execute(createTableQuery);
  console.log("Sheets table ensured to exist");
};

// Create a new project
exports.createProject = async (req, res) => {
  try {
    console.log("Creating a new project...");
    await createProjectsTable(); // Ensure `projects` table exists

    const { project_name } = req.body;
    if (!project_name) {
      return res.status(400).json({ message: "Project name is required" });
    }

    // Insert new project if it doesn't already exist
    const insertQuery = `INSERT INTO projects (project_name) VALUES (?);`;
    await db.execute(insertQuery, [project_name]);
    console.log(`Project '${project_name}' created successfully`);

    res.json({ message: "Project created successfully" });
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get all projects
exports.getProjects = async (req, res) => {
  try {
    console.log("Fetching all projects...");
    await createProjectsTable(); // Ensure `projects` table exists

    const [projects] = await db.execute("SELECT * FROM projects;");
    console.log("Projects fetched successfully:", projects);
    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// date formating and storing in sheets table
exports.uploadFile = async (req, res) => {
  try {
      if (!req.files || !req.files.file) {
          return res.status(400).json({ message: "No file uploaded" });
      }

      const { projectId } = req.params;
      if (!projectId) {
          return res.status(400).json({ message: "Project ID is required" });
      }

      // Ensure `sheets` table exists
    await createSheetsTable();

      const file = req.files.file;
      const filePath = path.join(__dirname, "../uploads", file.name);
      await file.mv(filePath);

          await file.mv(filePath); // Move file to uploads folder
    console.log("File moved to uploads folder");

      const workbook = xlsx.readFile(filePath);
      const sheets = workbook.SheetNames;
      console.log("Sheets found:", sheets);

      // Delete existing sheets for the project from the `sheets` table
    const deleteSheetsQuery = `DELETE FROM sheets WHERE project_id = ?;`;
    await db.execute(deleteSheetsQuery, [projectId]);
    console.log("Existing sheets deleted from database");

    // Drop all tables associated with this project
    const getAllTablesQuery = `SHOW TABLES;`;
    const [tables] = await db.execute(getAllTablesQuery);

    for (const table of tables) {
            const tableName = table[`Tables_in_${process.env.DB_DATABASE}`]; // Adjust for your DB name
            if (tableName.includes(`_${projectId}_`)) {
              const dropTableQuery = `DROP TABLE IF EXISTS \`${tableName}\`;`;
              await db.execute(dropTableQuery);
              console.log(`Dropped table: ${tableName}`);
            }
          }

          // Process the uploaded sheets
      for (const sheetName of sheets) {
              console.log(`Processing sheet: ${sheetName}`);
          const worksheet = workbook.Sheets[sheetName];
          // Read sheet data and ensure dates are formatted as strings
          const jsonData = xlsx.utils.sheet_to_json(worksheet, { raw: false, dateNF: "dd-mm-yyyy" });

          if (jsonData.length > 0) {
              const firstRow = jsonData[0]; // Get column headers dynamically
              await createTableIfNotExists(sheetName, firstRow);

              const tableName = sheetName.replace(/\s+/g, "_").toLowerCase();

              for (const row of jsonData) {
                  // const columns = Object.keys(row);
                  // const values = columns.map(col => row[col]);
                  const columns = Object.keys(row);
                  const values = Object.values(row);

                  // Construct WHERE condition dynamically
         const whereClause = columns.map(col => `\`${col}\` = ?`).join(" AND ");
           const checkQuery = `SELECT 1 FROM \`${tableName}\` WHERE ${whereClause} LIMIT 1;`;


           const [existingRows] = await db.execute(checkQuery, values);
                     if (existingRows.length === 0) {
                       // Insert only if no duplicate exists
                       const insertQuery = `INSERT INTO \`${tableName}\` (${columns.map(col => `\`${col}\``).join(", ")}) VALUES (${columns.map(() => "?").join(", ")});`;
                       await db.execute(insertQuery, values);
                       console.log(`Inserted new row into table ${tableName}`);
                     }
                    // Insert sheet name into `sheets` table if not exists
        const checkSheetQuery = `SELECT * FROM sheets WHERE sheet_name = ? AND project_id = ? LIMIT 1;`;
        const [existingSheets] = await db.execute(checkSheetQuery, [sheetName, projectId]);


        if (existingSheets.length === 0) {
                    const insertSheetQuery = `INSERT INTO sheets (sheet_name, project_id) VALUES (?, ?);`;
                    await db.execute(insertSheetQuery, [sheetName, projectId]);
                    console.log(`Inserted sheet name '${sheetName}' into sheets table`);
                  }

                  // Insert into table
                  const insertQuery = `
                      INSERT INTO \`${tableName}\` (${columns.map(col => `\`${col}\``).join(", ")})
                      VALUES (${columns.map(() => "?").join(", ")});
                  `;
                  await db.execute(insertQuery, values);
              }
          }
      }

      res.json({ message: "File uploaded and data inserted successfully" });
  } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get all sheets (without filtering by projectId)
exports.getAllSheets = async (req, res) => {
  try {
    console.log("Fetching all sheets...");
    await createSheetsTable(); // Ensure `sheets` table exists

    const [sheets] = await db.execute("SELECT * FROM sheets;");
    console.log("All sheets:", sheets);
    
    res.json(sheets);
  } catch (error) {
    console.error("Error fetching all sheets:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get all sheets by `projectId`
exports.getSheetsByProject = async (req, res) => {
  try {
    console.log("Fetching sheets for project...");
    await createSheetsTable(); // Ensure `sheets` table exists
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required" });
    }

    const [sheets] = await db.execute("SELECT * FROM sheets WHERE project_id = ?;", [projectId]);
    console.log(`Sheets for project ${projectId}:`, sheets);
    res.json(sheets);
  } catch (error) {
    console.error("Error fetching sheets:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get sheet data by `sheetId`
exports.getSheetById = async (req, res) => {
  try {
    console.log("Fetching sheet data...");
    await createSheetsTable(); // Ensure `sheets` table exists

    const { sheetId } = req.params;
    if (!sheetId) {
      return res.status(400).json({ message: "Sheet ID is required" });
    }

    // Fetch the sheet name using sheetId
    const [sheet] = await db.execute("SELECT sheet_name FROM sheets WHERE sheet_id = ?;", [sheetId]);

    if (sheet.length === 0) {
      return res.status(404).json({ message: "Sheet not found" });
    }

    const sheetName = sheet[0].sheet_name.replace(/\s+/g, "_").toLowerCase(); // Normalize sheet name
    console.log(`Fetching data from sheet: ${sheetName}`);

    // Fetch all data from the corresponding sheet table, excluding the primary key (id)
    const [data] = await db.execute(`SELECT * FROM \`${sheetName}\`;`);

    if (data.length === 0) {
      return res.json({ message: "No data found in this sheet." });
    }

    // Remove 'id' field from each row before sending the response
    const filteredData = data.map(row => {
      const { id, ...rest } = row; // Exclude `id` field
      return rest;
    });

    console.log(`Data fetched from sheet ${sheetName}:`, filteredData);
    res.json(filteredData);
  } catch (error) {
    console.error("Error fetching sheet data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
