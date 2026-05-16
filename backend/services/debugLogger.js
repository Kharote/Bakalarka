// Debug logger for Teams integration
import fs from 'fs-extra';
import path from 'path';

class DebugLogger {
  constructor() {
    this.debugDir = path.join(process.cwd(), 'teams-debug-logs');
  }

  async log(logName, data) {
    try {
      await fs.ensureDir(this.debugDir);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${logName}_${timestamp}.json`;
      const filepath = path.join(this.debugDir, filename);
      
      await fs.writeJSON(filepath, data, { spaces: 2 });
      console.log(`[DEBUG] Debug log written: ${filename}`);
      return filepath;
    } catch (error) {
      console.error('Failed to write debug log:', error.message);
    }
  }
}

export default new DebugLogger();
