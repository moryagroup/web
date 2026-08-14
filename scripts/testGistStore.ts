import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGistDatabase() {
  const pat = process.env.GITHUB_PAT;
  console.log('Testing Gist Database creation for moryagroup...');

  const payload = {
    description: 'Morya Group ERP Central Database Store',
    public: true,
    files: {
      'morya_group_db.json': {
        content: JSON.stringify(
          {
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            incomes: [],
            expenses: [],
            members: [],
            occasions: [],
            gallery: [],
            suggestions: [],
            settings: { groupLogo: '', customIncomeTypes: [] },
            images: [],
          },
          null,
          2
        ),
      },
    },
  };

  try {
    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Authorization: `token ${pat}`,
        'Content-Type': 'application/json',
        'User-Agent': 'morya-group-web',
      },
      body: JSON.stringify(payload),
    });

    console.log('Create Gist Status:', res.status);
    const data = await res.json();
    console.log('Gist ID:', data.id);
    console.log('Gist raw_url:', data.files?.['morya_group_db.json']?.raw_url);
  } catch (err) {
    console.error('Error:', err);
  }
}

testGistDatabase();
