const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fileRoutes = require("./routes/fileRoutes");
const uploadMiddleware = require("./middleware/uploadMiddleware");
const db = require("./config/dbConfig");

dotenv.config();
const app = express();

app.use(cors({ origin: "http://localhost:5173", methods: "POST" }));
app.use(express.json());
app.use(uploadMiddleware);

app.use("/api", fileRoutes);

// Start Server
db.query("SELECT 1")
  .then(() => {
      console.log("MySQL connected!");
      app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
  })
  .catch((err) => console.error("Database connection failed:", err.message));


