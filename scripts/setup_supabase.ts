import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://aqvwscvcmfrasqesgifw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxdndzY3ZjbWZyYXNxZXNnaWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2ODYyMzcsImV4cCI6MjEwMjI2MjIzN30.v6tRVT8Yq3a6ott-rRX3dgsmeopJ1ebWs8sjkjJTpvw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
  console.log('Testing Supabase connection...');
  
  // Test connection to members table
  const { data, error } = await supabase.from('members').select('*').limit(5);
  
  if (error) {
    console.log('Supabase table response:', error.message, error.code);
  } else {
    console.log('Successfully connected to Supabase members table! Existing count:', data?.length);
  }
}

setup().catch(console.error);
