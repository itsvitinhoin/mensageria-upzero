import fs from 'fs'
import path from 'path'
import type { WhatsAppState } from './types'

const DEFAULT_DATA_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT
    ? '/tmp/.data'
    : path.join(process.cwd(), '.data')

const DATA_DIR = process.env.WA_DATA_DIR ?? DEFAULT_DATA_DIR
const DATA_FILE = path.join(DATA_DIR, 'whatsapp.json')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function loadFromDisk(): unknown | null {
  try {
    ensureDir()
    if (!fs.existsSync(DATA_FILE)) return null
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
  } catch (error) {
    console.error('[whatsapp] Failed to load persisted data:', error)
    return null
  }
}

export function saveToDisk(data: WhatsAppState): void {
  ensureDir()
  const tmp = `${DATA_FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmp, DATA_FILE)
}
