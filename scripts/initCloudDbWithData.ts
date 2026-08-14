import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { INITIAL_MEMBERS, INITIAL_OCCASIONS, INITIAL_EVENT_GALLERY, INITIAL_SUGGESTIONS } from '../src/mockData';

const GIST_ID = 'a0b48ee9a7270a04fb05557f1aa3922a';

async function initDb() {
  const pat = process.env.GITHUB_PAT;
  console.log('[Cloud DB Init] Initializing Gist Database', GIST_ID);

  const timestamp = new Date().toISOString();

  const membersWithTimestamps = INITIAL_MEMBERS.map((m) => ({
    ...m,
    createdAt: m.createdAt || timestamp,
    updatedAt: timestamp,
  }));

  const occasionsWithTimestamps = INITIAL_OCCASIONS.map((o) => ({
    ...o,
    createdAt: o.createdAt || timestamp,
    updatedAt: timestamp,
  }));

  const galleryWithTimestamps = INITIAL_EVENT_GALLERY.map((g) => ({
    ...g,
    createdAt: g.createdAt || timestamp,
    updatedAt: timestamp,
  }));

  const suggestionsWithTimestamps = INITIAL_SUGGESTIONS.map((s) => ({
    ...s,
    createdAt: s.createdAt || timestamp,
    updatedAt: timestamp,
  }));

  const initialDb = {
    version: '1.0.0',
    lastUpdated: timestamp,
    incomes: [],
    expenses: [],
    members: membersWithTimestamps,
    occasions: occasionsWithTimestamps,
    gallery: galleryWithTimestamps,
    suggestions: suggestionsWithTimestamps,
    settings: {
      groupLogo: '',
      customIncomeTypes: [],
    },
    images: [],
  };

  const payload = {
    description: 'Morya Group ERP Central Production Database Store',
    files: {
      'morya_group_db.json': {
        content: JSON.stringify(initialDb, null, 2),
      },
    },
  };

  try {
    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: {
        Authorization: `token ${pat}`,
        'Content-Type': 'application/json',
        'User-Agent': 'morya-group-web',
      },
      body: JSON.stringify(payload),
    });

    console.log('[Cloud DB Init] PATCH Status:', res.status);
    if (res.ok) {
      console.log('[Cloud DB Init] Successfully seeded central Gist Database with initial domain records!');
    } else {
      const errText = await res.text();
      console.error('[Cloud DB Init] Failed to patch gist:', errText);
    }
  } catch (err) {
    console.error('[Cloud DB Init Error]:', err);
  }
}

initDb();
