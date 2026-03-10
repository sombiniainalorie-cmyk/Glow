async function test() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NzMwODExMjF9.vmPaW1RCPZXaTWq_hIefJyfkduel6Du80simb7YNnUE';
  try {
    const res = await fetch('http://localhost:3000/api/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data:', data);
  } catch (e) {
    console.error('Fetch failed:', e);
  }
}
test();
