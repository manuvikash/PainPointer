import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Shared progress tracking service
interface ProgressState {
  stage: string;
  message: string;
  progress: number;
  details?: string;
  timestamp: number;
}

class ProgressTracker {
  private progressDir: string;

  constructor() {
    // Use temp directory for progress files
    this.progressDir = path.join(os.tmpdir(), 'painpointer-progress');
    // Ensure directory exists
    if (!fs.existsSync(this.progressDir)) {
      fs.mkdirSync(this.progressDir, { recursive: true });
    }
  }

  private getFilePath(id: string): string {
    return path.join(this.progressDir, `${id}.json`);
  }

  updateProgress(id: string, stage: string, message: string, progress: number, details?: string) {
    const state: ProgressState = { 
      stage, 
      message, 
      progress, 
      details,
      timestamp: Date.now()
    };
    
    try {
      fs.writeFileSync(this.getFilePath(id), JSON.stringify(state));
      console.log(`📊 [${progress}%] ${stage}: ${message}${details ? ` - ${details}` : ''}`);
    } catch (error) {
      console.error('Failed to write progress file:', error);
    }
  }

  getProgress(id: string): ProgressState | undefined {
    try {
      const filePath = this.getFilePath(id);
      if (!fs.existsSync(filePath)) {
        return undefined;
      }
      
      const data = fs.readFileSync(filePath, 'utf8');
      const state = JSON.parse(data) as ProgressState;
      
      // Clean up old progress files (older than 5 minutes)
      if (Date.now() - state.timestamp > 5 * 60 * 1000) {
        this.cleanup(id);
        return undefined;
      }
      
      return state;
    } catch (error) {
      console.error('Failed to read progress file:', error);
      return undefined;
    }
  }

  cleanup(id: string) {
    try {
      const filePath = this.getFilePath(id);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Failed to cleanup progress file:', error);
    }
  }

  // Clean up old progress entries (older than 5 minutes)
  cleanupOld() {
    try {
      if (!fs.existsSync(this.progressDir)) return;
      
      const files = fs.readdirSync(this.progressDir);
      const now = Date.now();
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.progressDir, file);
          try {
            const data = fs.readFileSync(filePath, 'utf8');
            const state = JSON.parse(data) as ProgressState;
            
            // Delete files older than 5 minutes
            if (now - state.timestamp > 5 * 60 * 1000) {
              fs.unlinkSync(filePath);
            }
          } catch (error) {
            // If we can't parse the file, delete it
            fs.unlinkSync(filePath);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old progress files:', error);
    }
  }
}

// Export a singleton instance
export const progressTracker = new ProgressTracker();