const BASE = 'http://localhost:4173';

async function main() {
  // 1. create with photo upload
  const fd = new FormData();
  fd.append('type', 'milestone');
  fd.append('date', '2026-08-06');
  fd.append('title', 'Test heartbeat');
  fd.append('note', 'A tiny flutter. Testing the flow.');
  fd.append('photoSize', 'large');
  fd.append('icon', '💗');
  fd.append('arrow', '1');
  fd.append('photo', new Blob(['fake-image-data'], { type: 'image/png' }), 'test.png');

  const created = await (await fetch(BASE + '/api/entries', { method: 'POST', body: fd })).json();
  console.log('created id:', created.id);
  console.log('created photo:', created.photo);

  // 2. fetch photo file
  const imgRes = await fetch(BASE + created.photo);
  console.log('photo served status:', imgRes.status, 'bytes:', (await imgRes.arrayBuffer()).byteLength);

  // 3. update without photo (replace)
  const fd2 = new FormData();
  fd2.append('type', 'memory');
  fd2.append('date', '2026-08-06');
  fd2.append('title', 'Updated title');
  fd2.append('note', 'Updated words.');
  fd2.append('photoSize', 'small');
  fd2.append('icon', '📷');
  fd2.append('arrow', '0');
  const updated = await (await fetch(BASE + '/api/entries/' + created.id, { method: 'PUT', body: fd2 })).json();
  console.log('updated title:', updated.title, '| photo kept:', updated.photo);

  // 4. remove photo via flag
  const fd3 = new FormData();
  fd3.append('type', 'memory');
  fd3.append('date', '2026-08-06');
  fd3.append('title', 'Updated title');
  fd3.append('note', 'Photo removed.');
  fd3.append('removePhoto', '1');
  const removed = await (await fetch(BASE + '/api/entries/' + created.id, { method: 'PUT', body: fd3 })).json();
  console.log('photo after removal:', removed.photo);

  // 5. delete
  const del = await (await fetch(BASE + '/api/entries/' + created.id, { method: 'DELETE' })).json();
  console.log('deleted:', JSON.stringify(del));

  // 6. final list
  const list = await (await fetch(BASE + '/api/entries')).json();
  console.log('entries remaining:', list.length);
}
main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
