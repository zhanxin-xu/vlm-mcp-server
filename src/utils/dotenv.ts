import * as fs from 'fs';
import * as path from 'path';

/**
 * Minimal .env loader. Populates process.env with variables from a .env file
 * without overriding values already present in the real environment.
 *
 * Supports:
 *   - KEY=VALUE
 *   - quoted values: KEY="value" / KEY='value'
 *   - blank lines and # comments
 */
export function loadDotEnv(filePath?: string): void {
    const envPath = filePath || path.join(process.cwd(), '.env');
    let content: string;
    try {
        content = fs.readFileSync(envPath, 'utf8');
    }
    catch {
        // No .env file present — nothing to do.
        return;
    }
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) {
            continue;
        }
        const eqIndex = line.indexOf('=');
        if (eqIndex === -1) {
            continue;
        }
        const key = line.slice(0, eqIndex).trim();
        let value = line.slice(eqIndex + 1).trim();
        // Strip surrounding quotes (single or double) if both present.
        if ((value.startsWith('"') && value.endsWith('"'))
            || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        // Do not override real environment values.
        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
    console.info('Loaded .env file', { path: envPath });
}
