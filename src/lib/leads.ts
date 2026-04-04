import fs from 'node:fs/promises';
import path from 'node:path';

export type LeadKind = 'contact' | 'careers' | 'newsletter';

export type LeadPayloadValue = string | number | boolean | null;

type LeadRecord = {
  kind: LeadKind;
  createdAt: string;
  ip: string;
  payload: Record<string, LeadPayloadValue>;
};

type LeadsData = {
  contact: LeadRecord[];
  careers: LeadRecord[];
  newsletter: LeadRecord[];
};

const LEADS_FILE = process.env.LEADS_FILE_PATH ?? path.join(process.cwd(), 'data', 'leads.json');

const EMPTY_LEADS: LeadsData = {
  contact: [],
  careers: [],
  newsletter: [],
};

async function ensureLeadsFile() {
  try {
    await fs.access(LEADS_FILE);
  } catch {
    await fs.mkdir(path.dirname(LEADS_FILE), { recursive: true });
    await fs.writeFile(LEADS_FILE, JSON.stringify(EMPTY_LEADS, null, 2), 'utf-8');
  }
}

async function readLeadsData() {
  await ensureLeadsFile();
  const raw = await fs.readFile(LEADS_FILE, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<LeadsData>;
  return {
    contact: Array.isArray(parsed.contact) ? parsed.contact : [],
    careers: Array.isArray(parsed.careers) ? parsed.careers : [],
    newsletter: Array.isArray(parsed.newsletter) ? parsed.newsletter : [],
  } as LeadsData;
}

export async function saveLead(kind: LeadKind, payload: Record<string, LeadPayloadValue>, ip: string) {
  const data = await readLeadsData();
  const record: LeadRecord = {
    kind,
    createdAt: new Date().toISOString(),
    ip,
    payload,
  };
  data[kind].push(record);
  await fs.writeFile(LEADS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  return record;
}
