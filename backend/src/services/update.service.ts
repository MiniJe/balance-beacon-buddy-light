import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import AdmZip from 'adm-zip';
import http from 'http';
import https from 'https';

interface VersionInfo {
  backendVersion: string;
  rootVersion?: string;
  git?: {
    branch?: string;
    commit?: string;
    dirty?: boolean;
    hasRemote?: boolean;
    ahead?: number;
    behind?: number;
  };
  timestamp: string;
  selfUpdateEnabled: boolean;
}

class UpdateService {
  private projectRoot = path.join(process.cwd(), '..');
  private lastCheck?: number;
  private cachedUpdate?: { updatesAvailable: boolean; git: VersionInfo['git']; reason?: string };
  private cacheTTLms = 5 * 60 * 1000; // 5 minute cache for summary endpoint
  private lockFile = path.join(process.cwd(), 'update.lock');
  private backupRoot = process.env.UPDATE_BACKUP_DIR || path.join(process.cwd(), 'backups');
  private maxBackups = parseInt(process.env.UPDATE_BACKUP_MAX || '10', 10); // păstrează ultimele N
  private ttlDays = parseInt(process.env.UPDATE_BACKUP_TTL_DAYS || '0', 10); // 0 = dezactivat TTL

  getVersionInfo(): VersionInfo {
    const backendPkgPath = path.join(process.cwd(), 'package.json');
    const rootPkgPath = path.join(this.projectRoot, 'package.json');
    let backendVersion = '0.0.0';
    let rootVersion: string | undefined;
    try {
      backendVersion = JSON.parse(fs.readFileSync(backendPkgPath, 'utf8')).version || backendVersion;
    } catch {}
    try {
      if (fs.existsSync(rootPkgPath)) {
        rootVersion = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8')).version;
      }
    } catch {}
    const selfUpdateEnabled = process.env.ALLOW_SELF_UPDATE === 'true';
    return {
      backendVersion,
      rootVersion,
      timestamp: new Date().toISOString(),
      selfUpdateEnabled
    };
  }

  async checkGitStatus(): Promise<VersionInfo['git']> {
    const isGitRepo = fs.existsSync(path.join(this.projectRoot, '.git'));
    if (!isGitRepo) return { hasRemote: false };
    const cmd = 'git rev-parse --abbrev-ref HEAD && git rev-parse --short HEAD && git status --porcelain && git remote';
    return new Promise(resolve => {
      exec(cmd, { cwd: this.projectRoot }, (err, stdout) => {
        if (err) { resolve({ hasRemote: false }); return; }
        const parts = stdout.split('\n').filter(Boolean);
        const branch = parts[0];
        const commit = parts[1];
        const dirty = parts.slice(2).some(l => l.startsWith('M ') || l.startsWith('A ') || l.startsWith('D '));
        const hasRemote = parts.some(p => p.startsWith('origin'));
        resolve({ branch, commit, dirty, hasRemote });
      });
    });
  }

  async checkForUpdates(): Promise<{ updatesAvailable: boolean; reason?: string; git: VersionInfo['git'] }> {
    const git = await this.checkGitStatus();
    if (!git || !git.hasRemote) return { updatesAvailable: false, reason: 'Nu există remote configurat', git };
    return new Promise(resolve => {
      exec('git remote update && git status -sb', { cwd: this.projectRoot }, (err, stdout) => {
        if (err) { resolve({ updatesAvailable: false, reason: 'Eroare git', git }); return; }
        const aheadMatch = stdout.match(/ahead (\d+)/);
        const behindMatch = stdout.match(/behind (\d+)/);
        const behind = behindMatch ? parseInt(behindMatch[1], 10) : 0;
        const ahead = aheadMatch ? parseInt(aheadMatch[1], 10) : 0;
        resolve({ updatesAvailable: behind > 0, git: { ...git, ahead, behind } });
      });
    });
  }

  async cachedCheck(force = false) {
    const now = Date.now();
    if (!force && this.lastCheck && (now - this.lastCheck) < this.cacheTTLms && this.cachedUpdate) {
      return this.cachedUpdate;
    }
    const result = await this.checkForUpdates();
    this.lastCheck = now;
    this.cachedUpdate = result;
    return result;
  }

  async startupCheck(enabled: boolean) {
    if (!enabled) return;
    try {
      await this.cachedCheck(true);
    } catch (e) {
      // silent
    }
  }

  async applyUpdate(): Promise<{ success: boolean; log: string }> {
    if (process.env.ALLOW_SELF_UPDATE !== 'true') {
      return { success: false, log: 'Self update dezactivat (setează ALLOW_SELF_UPDATE=true)' };
    }
    return new Promise(resolve => {
      const script = 'git pull && npm install --no-audit --no-fund && npm run build';
      exec(script, { cwd: this.projectRoot, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          resolve({ success: false, log: stderr || err.message });
          return;
        }
        resolve({ success: true, log: stdout });
      });
    });
  }

  private async acquireLock(): Promise<{ ok: boolean; reason?: string }> {
    if (fs.existsSync(this.lockFile)) return { ok: false, reason: 'Update deja în curs (lock file prezent)' };
    try {
      fs.writeFileSync(this.lockFile, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }, null, 2), { flag: 'wx' });
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: 'Nu pot crea lock file' };
    }
  }

  private releaseLock() {
    try { if (fs.existsSync(this.lockFile)) fs.unlinkSync(this.lockFile); } catch {}
  }

  private ensureBackupDir(dir: string) { fs.mkdirSync(dir, { recursive: true }); }

  private findDatabaseFiles(): string[] {
    // Permite explicit prin env SQLITE_DB_PATH (csv) altfel caută *.db în ./data sau ./backend/data
    if (process.env.SQLITE_DB_PATH) return process.env.SQLITE_DB_PATH.split(',').map(s => s.trim()).filter(Boolean);
    const candidates: string[] = [];
    const dataDirs = [path.join(process.cwd(), 'data'), path.join(process.cwd(), 'backend', 'data')];
    for (const d of dataDirs) {
      if (!fs.existsSync(d)) continue;
      for (const f of fs.readdirSync(d)) {
        if (f.endsWith('.db')) candidates.push(path.join(d, f));
      }
    }
    return candidates;
  }

  private async backupDatabases(targetDir: string, dbFiles: string[]): Promise<string[]> {
    const saved: string[] = [];
    for (const file of dbFiles) {
      try {
        const base = path.basename(file);
        const dest = path.join(targetDir, base);
        fs.copyFileSync(file, dest);
        saved.push(dest);
      } catch (e) {
        throw new Error(`Eroare backup DB ${file}: ${(e as Error).message}`);
      }
    }
    return saved;
  }

  private async backupUploads(targetDir: string): Promise<string | null> {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) return null;
    const zipPath = path.join(targetDir, 'uploads.zip');
    const zip = new AdmZip();
    zip.addLocalFolder(uploadsDir);
    zip.writeZip(zipPath);
    return zipPath;
  }

  private async restoreDatabases(backupFiles: string[], originalPaths: string[]) {
    for (let i = 0; i < backupFiles.length; i++) {
      try { fs.copyFileSync(backupFiles[i], originalPaths[i]); } catch (e) { /* log silent */ }
    }
  }

  private async healthCheck(): Promise<{ ok: boolean; status?: number; error?: string }> {
    const url = process.env.HEALTHCHECK_URL || `http://127.0.0.1:${process.env.PORT || 5000}/ready`;
    const retries = parseInt(process.env.HEALTHCHECK_RETRIES || '5', 10);
    const interval = parseInt(process.env.HEALTHCHECK_INTERVAL_MS || '1000', 10);
    const mod = url.startsWith('https') ? https : http;
    const attempt = (n: number): Promise<{ ok: boolean; status?: number; error?: string }> => new Promise(resolve => {
      const req = mod.get(url, res => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true, status: res.statusCode });
        } else {
          if (n >= retries - 1) resolve({ ok: false, status: res.statusCode, error: 'Status non-2xx' });
          else setTimeout(() => attempt(n + 1).then(resolve), interval);
        }
      });
      req.on('error', err => {
        if (n >= retries - 1) resolve({ ok: false, error: err.message });
        else setTimeout(() => attempt(n + 1).then(resolve), interval);
      });
      req.setTimeout(interval - 100, () => { req.destroy(new Error('Timeout')); });
    });
    return attempt(0);
  }

  private cleanupOldBackups(): void {
    try {
      if (!fs.existsSync(this.backupRoot)) return;
      const entries = fs.readdirSync(this.backupRoot)
        .filter(d => d.startsWith('update-'))
        .map(name => {
          const full = path.join(this.backupRoot, name);
          const stat = fs.statSync(full);
          return { name, full, mtime: stat.mtime };
        })
        .sort((a,b) => b.mtime.getTime() - a.mtime.getTime());
      // TTL cleanup
      if (this.ttlDays > 0) {
        const cutoff = Date.now() - this.ttlDays * 86400000;
        for (const e of entries) {
          if (e.mtime.getTime() < cutoff) {
            this.safeRemoveDir(e.full);
          }
        }
      }
      // Count-based cleanup
      if (entries.length > this.maxBackups) {
        const excess = entries.slice(this.maxBackups);
        for (const e of excess) this.safeRemoveDir(e.full);
      }
    } catch {}
  }

  private safeRemoveDir(dir: string) {
    try {
      if (fs.existsSync(dir)) {
        // remove files first
        for (const entry of fs.readdirSync(dir)) {
          const p = path.join(dir, entry);
          const st = fs.statSync(p);
            if (st.isDirectory()) this.safeRemoveDir(p); else fs.unlinkSync(p);
        }
        fs.rmdirSync(dir);
      }
    } catch {}
  }

  async applyUpdateWithBackup(): Promise<{ success: boolean; log: string; backupDir?: string; rollback?: boolean; health?: { ok: boolean; status?: number } }> {
    if (process.env.ALLOW_SELF_UPDATE !== 'true') {
      return { success: false, log: 'Self update dezactivat (setează ALLOW_SELF_UPDATE=true)' };
    }
    const lock = await this.acquireLock();
    if (!lock.ok) return { success: false, log: lock.reason || 'Lock failure' };
    const startCommit = await new Promise<string>(resolve => {
      exec('git rev-parse HEAD', { cwd: this.projectRoot }, (e, stdout) => resolve(e ? '' : stdout.trim()));
    });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.backupRoot, `update-${timestamp}`);
    try {
      this.ensureBackupDir(backupDir);
      const dbFiles = this.findDatabaseFiles();
      const dbBackups = await this.backupDatabases(backupDir, dbFiles);
      const uploadsZip = await this.backupUploads(backupDir);
      const script = 'git pull && npm install --no-audit --no-fund && npm run build';
  const updateResult = await new Promise<{ ok: boolean; out: string; err?: string }>(resolve => {
        exec(script, { cwd: this.projectRoot, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
          resolve({ ok: !err, out: stdout, err: stderr });
        });
      });
      if (!updateResult.ok) {
        // rollback
        if (startCommit) {
          await new Promise(r => exec(`git reset --hard ${startCommit}`, { cwd: this.projectRoot }, () => r(null)));
        }
        await this.restoreDatabases(dbBackups, dbFiles);
        this.releaseLock();
        return { success: false, log: `Eșec update: ${updateResult.err || updateResult.out}`, backupDir, rollback: true };
      }
      // Health check
      const health = await this.healthCheck();
      if (!health.ok) {
        if (startCommit) {
          await new Promise(r => exec(`git reset --hard ${startCommit}`, { cwd: this.projectRoot }, () => r(null)));
        }
        await this.restoreDatabases(dbBackups, dbFiles);
        this.releaseLock();
        return { success: false, log: `Health check failed după update: ${health.error || health.status}`, backupDir, rollback: true, health };
      }
      this.releaseLock();
      this.cleanupOldBackups();
      return { success: true, log: updateResult.out, backupDir, health };
    } catch (e:any) {
      // best-effort rollback git
      if (startCommit) {
        await new Promise(r => exec(`git reset --hard ${startCommit}`, { cwd: this.projectRoot }, () => r(null)));
      }
      this.releaseLock();
      return { success: false, log: `Eroare neprevăzută: ${e.message}`, backupDir, rollback: true };
    }
  }
}

export const updateService = new UpdateService();
