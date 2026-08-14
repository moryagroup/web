async function testFirestoreRest() {
  console.log('Testing Firestore REST API...');
  const url = 'https://firestore.googleapis.com/v1/projects/morya-group-352ad/databases/(default)/documents/incomes';
  try {
    const res = await fetch(url);
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data).slice(0, 300));
  } catch (err) {
    console.error('Fetch error:', err);
  }

  console.log('\nTesting Firebase Realtime Database REST API...');
  const rtdbUrl = 'https://morya-group-352ad-default-rtdb.firebaseio.com/test.json';
  try {
    const res = await fetch(rtdbUrl);
    console.log('RTDB Status:', res.status);
    const data = await res.json();
    console.log('RTDB Response:', data);
  } catch (err) {
    console.error('RTDB Fetch error:', err);
  }
}

testFirestoreRest();
