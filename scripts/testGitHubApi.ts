import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGitHubApi() {
  const pat = process.env.GITHUB_PAT;
  console.log('Testing GitHub PAT API with token starting with:', pat ? pat.slice(0, 10) : 'NONE');

  if (!pat) {
    console.error('No GITHUB_PAT found in .env.local!');
    return;
  }

  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${pat}`,
        'User-Agent': 'morya-group-web',
      },
    });

    console.log('GitHub API Status:', res.status);
    const data = await res.json();
    console.log('User login:', data.login);
  } catch (err) {
    console.error('GitHub API error:', err);
  }
}

testGitHubApi();
