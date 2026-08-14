import { createClient } from '@supabase/supabase-js';
import { INITIAL_MEMBERS, INITIAL_OCCASIONS } from '../src/mockData';

const supabaseUrl = 'https://aqvwscvcmfrasqesgifw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxdndzY3ZjbWZyYXNxZXNnaWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2ODYyMzcsImV4cCI6MjEwMjI2MjIzN30.v6tRVT8Yq3a6ott-rRX3dgsmeopJ1ebWs8sjkjJTpvw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding Supabase dataset...');

  // Seed Members
  const memberRows = INITIAL_MEMBERS.map((m) => ({
    id: m.id,
    member_code: m.memberCode,
    full_name: m.fullName,
    designation: m.designation,
    phone: m.phone,
    annual_target_amount: m.annualTargetAmount,
    address: m.address || null,
    is_active: m.isActive,
    birth_date: m.birthDate || null,
    email: m.email || null,
    age: m.age || null,
    photo_url: m.photoUrl || null,
    password: m.password || null,
  }));

  const { error: memErr } = await supabase.from('members').upsert(memberRows);
  if (memErr) {
    console.error('Members seeding error:', memErr.message);
  } else {
    console.log(`Successfully seeded ${memberRows.length} members!`);
  }

  // Seed Occasions
  const occasionRows = INITIAL_OCCASIONS.map((o) => ({
    id: o.id,
    title: o.name,
    description: o.description || '',
    event_date: o.startDate || new Date().toISOString().split('T')[0],
    location: 'हडपसर, पुणे',
    banner_url: o.bannerUrl || null,
  }));

  const { error: occErr } = await supabase.from('occasions').upsert(occasionRows);
  if (occErr) {
    console.error('Occasions seeding error:', occErr.message);
  } else {
    console.log(`Successfully seeded ${occasionRows.length} occasions!`);
  }
}

seed().catch(console.error);
