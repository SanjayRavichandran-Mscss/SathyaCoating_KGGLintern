import { useState, useEffect } from "react";
import axios from "axios";
import "./FileUpload.css";

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [sheetData, setSheetData] = useState([]);

  // Fetch all projects on initial load
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/projects");
      setProjects(response.data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const createProject = async () => {
    if (!projectName.trim()) {
      setMessage("Project name is required.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await axios.post("http://localhost:5000/api/projects", {
        project_name: projectName,
      });

      setMessage(response.data.message || "Project created successfully!");
      setProjectName("");
      fetchProjects(); // Refresh projects list
    } catch (error) {
      console.error("Error creating project:", error);
      setMessage("Error creating project.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file || !selectedProject) {
      setMessage("Please select a project and file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsLoading(true);
    setMessage("");

    try {
      const response = await axios.post(
        `http://localhost:5000/api/upload/${selectedProject.id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setMessage(response.data.message || "File uploaded successfully!");
      fetchSheets(selectedProject.id);
    } catch (error) {
      console.error("Error uploading file:", error);
      setMessage("Error uploading file.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSheets = async (projectId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/sheets/${projectId}`);
      setSheets(response.data);
    } catch (error) {
      console.error("Error fetching sheets:", error);
    }
  };

  // Fetch sheet data dynamically on click
  const fetchSheetData = async (sheetId) => {
    setSheetData([]); // Clear previous sheet data before loading new data
    setSelectedSheet(sheetId); // Set selected sheet

    try {
      const response = await axios.get(`http://localhost:5000/api/sheet/${sheetId}`);
      setSheetData(response.data);
    } catch (error) {
      console.error("Error fetching sheet data:", error);
    }
  };

  return (
    <div className="file-upload-container">
      <h2>Excel File Manager</h2>

      {/* Project Creation */}
      <div>
        <input
          type="text"
          placeholder="Enter Project Name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          disabled={isLoading}
        />
        <button onClick={createProject} disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Project"}
        </button>
      </div>

      {/* Project List */}
      <h3>Projects</h3>
      <ul>
        {projects.map((project) => (
          <li key={project.id} onClick={() => { setSelectedProject(project); fetchSheets(project.id); }}>
            {project.project_name}
          </li>
        ))}
      </ul>

      {/* File Upload Section */}
      {selectedProject && (
        <div>
          <h3>Upload Excel File for: {selectedProject.project_name}</h3>
          <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} disabled={isLoading} />
          <button onClick={handleUpload} disabled={isLoading}>
            {isLoading ? "Uploading..." : "Upload File"}
          </button>
        </div>
      )}

      {/* Sheets List */}
      {sheets.length > 0 && (
        <div>
          <h3>Sheets for {selectedProject.project_name}</h3>
          <ul>
            {sheets.map((sheet) => (
              <li key={sheet.sheet_id} onClick={() => fetchSheetData(sheet.sheet_id)}>
                {sheet.sheet_name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sheet Data Display */}
      {selectedSheet && (
        <div>
          <h3>Data from Sheet: {sheets.find(s => s.id === selectedSheet)?.sheet_name}</h3>
          {sheetData.length > 0 ? (
            <table border="1">
              <thead>
                <tr>
                  {Object.keys(sheetData[0])
                    .filter((key) => key !== "id") // Exclude "id" column
                    .map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {sheetData.map((row, index) => (
                  <tr key={index}>
                    {Object.keys(row)
                      .filter((key) => key !== "id") // Exclude "id" column
                      .map((key) => (
                        <td key={key}>{row[key]}</td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Loading data...</p>
          )}
        </div>
      )}

      {/* Message Display */}
      {message && <p>{message}</p>}
    </div>
  );
};

export default FileUpload;
