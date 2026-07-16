import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = fs.existsSync(path.join(currentDir, "..", "package.json"))
  ? path.resolve(currentDir, "..")
  : currentDir;
const crashReportPath = path.join(serverRoot, "CRASH_REPORT.txt");

/**
 * Appends an error log to the CRASH_REPORT.txt file.
 * @param {string} type - The type of error (e.g. "UncaughtException", "UnhandledRejection", "HTTP_500")
 * @param {Error|string} err - The error object or string to log
 * @param {Object} [context] - Additional context to log (like URL, method, etc)
 */
export function logToCrashReport(type, err, context = {}) {
  try {
    const timestamp = new Date().toISOString();
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "(no stack)";
    
    let logEntry = `\n[${timestamp}] [${type}] ${msg}\n`;
    if (Object.keys(context).length > 0) {
      logEntry += `Context: ${JSON.stringify(context)}\n`;
    }
    logEntry += `${stack}\n`;
    logEntry += `-`.repeat(80) + `\n`;

    fs.appendFileSync(crashReportPath, logEntry, "utf8");
  } catch (appendErr) {
    console.error("Failed to write to CRASH_REPORT.txt:", appendErr);
  }
}
