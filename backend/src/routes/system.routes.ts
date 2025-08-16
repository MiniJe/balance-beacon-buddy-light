import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { authMiddleware } from '../middleware/auth.middleware';
import { updateService } from '../services/update.service';
import { folderSettingsService } from '../services/folder.settings.service';

const router = Router();

async function getHealth(): Promise<{ ok: boolean; status?: number }> {
  try {
    const url = process.env.HEALTHCHECK_URL || `http://127.0.0.1:${process.env.PORT || 5000}/ready`;
    const mod = url.startsWith('https') ? https : http;
    return await new Promise((resolve) => {
      const req = mod.get(url, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true, status: res.statusCode });
        } else {
          resolve({ ok: false, status: res.statusCode });
        }
      });
      req.on('error', () => resolve({ ok: false }));
      req.setTimeout(1000, () => { try { req.destroy(); } catch {} resolve({ ok: false }); });
    });
  } catch {
    return { ok: false };
  }
}

async function getLastBackupInfo(): Promise<{ lastBackupAt: string | null; backupsCount: number }> {
  try {
    const folderSettings = await folderSettingsService.getFolderSettings();
    const backupPath = folderSettings.backupPath as string;
    if (!backupPath || !fs.existsSync(backupPath)) return { lastBackupAt: null, backupsCount: 0 };

    const items = fs.readdirSync(backupPath, { withFileTypes: true });
    const backupDirs = items.filter((d) => d.isDirectory() && (d.name.startsWith('backup-') || d.name.includes('SQL') || d.name.includes('FIȘIERE') || d.name.includes('GENERAL')));
    let latest: number = 0;
    for (const dir of backupDirs) {
      const full = path.join(backupPath, dir.name);
      try {
        const st = fs.statSync(full);
        const t = Math.max(st.mtime.getTime(), (st as any).birthtime?.getTime?.() || 0);
        if (t > latest) latest = t;
      } catch {}
    }
    return { lastBackupAt: latest ? new Date(latest).toISOString() : null, backupsCount: backupDirs.length };
  } catch {
    return { lastBackupAt: null, backupsCount: 0 };
  }
}

// Aggregated system overview for Dashboard mini-indicators
router.get('/overview', authMiddleware, async (_req, res) => {
  try {
    const version = updateService.getVersionInfo();
    const git = await updateService.checkGitStatus();
    const health = await getHealth();
    const backups = await getLastBackupInfo();
    res.json({ success: true, data: { version, git, health, lastBackupAt: backups.lastBackupAt, backupsCount: backups.backupsCount } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'Eroare sistem overview' });
  }
});

export default router;
