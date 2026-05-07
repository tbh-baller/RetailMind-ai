import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "../../..");

/**
 * GET /api/forecast
 * Generate demand forecast using Python Prophet ML model
 * 
 * Returns:
 * {
 *   data: [
 *     { sku: "FRT001", forecast_7_days: 84 },
 *     ...
 *   ]
 * }
 * 
 * Error responses:
 * - 500: Python execution failure or invalid JSON parsing
 * - 503: No forecast data available
 */
export async function getForecast(req, res) {
  return new Promise((resolve, reject) => {
    // Execute Python forecast model
    // Use absolute path to ml/model.py from project root
    const scriptPath = path.join(projectRoot, "ml", "model.py");
    const pythonPath = path.join(projectRoot, "venv", "Scripts", "python.exe");

    const cmd = `"${pythonPath}" "${scriptPath}"`;
    
    // Pass environment variables including DATABASE_URL to Python process
    const env = {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
      PYTHONUNBUFFERED: "1"
    };
    
    // maxBuffer increased to handle large outputs
    exec(cmd, { maxBuffer: 10 * 1024 * 1024, cwd: projectRoot, env }, (error, stdout, stderr) => {
      if (error) {
        console.error("Forecast API: Python execution error");
        console.error("Command:", cmd);
        console.error("Error:", error.message);
        console.error("Stderr:", stderr);
        const err = new Error(`ML model execution failed: ${stderr || error.message}`);
        err.statusCode = 500;
        return reject(err);
      }

      try {
        // Parse JSON output from Python script
        const output = stdout.trim();
        
        if (!output) {
          console.warn("Forecast API: No output from Python script");
          const err = new Error("No forecast data generated");
          err.statusCode = 503;
          return reject(err);
        }

        // Extract JSON array from output
        // Python may print other content, so extract just the JSON
        const jsonMatch = output.match(/\[\s*{[\s\S]*}\s*\]/);
        
        if (!jsonMatch) {
          console.error("Forecast API: JSON parsing failed");
          console.error("Output received:", output.substring(0, 500)); // Log first 500 chars
          const err = new Error("Invalid forecast output format: JSON array not found");
          err.statusCode = 500;
          return reject(err);
        }

        const forecasts = JSON.parse(jsonMatch[0]);
        console.log("Forecast API: Parsed forecast data for", forecasts.length, "SKUs");

        // Validate forecast data structure
        if (!Array.isArray(forecasts)) {
          const err = new Error("Forecast must be an array");
          err.statusCode = 500;
          return reject(err);
        }

        if (forecasts.length === 0) {
          const err = new Error("No SKUs met minimum data requirements for forecasting");
          err.statusCode = 503;
          return reject(err);
        }

        // Validate each forecast entry
        const validForecasts = forecasts.filter((item) => {
          return (
            item &&
            typeof item === "object" &&
            typeof item.sku === "string" &&
            typeof item.forecast_7_days === "number" &&
            item.forecast_7_days >= 0
          );
        });

        if (validForecasts.length === 0) {
          console.error("Forecast API: No valid forecasts after validation");
          const err = new Error("Invalid forecast data structure");
          err.statusCode = 500;
          return reject(err);
        }

        // Return success response
        console.log("Forecast API: Returning", validForecasts.length, "valid forecasts");
        res.json({
          data: validForecasts,
        });

        resolve();
      } catch (parseError) {
        console.error("Forecast API: JSON parsing error:", parseError.message);
        const err = new Error(`Failed to parse forecast JSON: ${parseError.message}`);
        err.statusCode = 500;
        reject(err);
      }
    });
  });
}
