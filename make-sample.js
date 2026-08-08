const fs = require('fs');
// 1x1 red PNG
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync('data/photos/sample-bump.png', png);
console.log('sample written');

(async () => {
  const fd = new FormData();
  fd.append('type', 'memory');
  fd.append('date', '2026-08-06');
  fd.append('title', 'The bump, so far');
  fd.append('note', 'Look at you, little bean. We are so in love already.');
  fd.append('photoSize', 'large');
  fd.append('photoCaption', 'you, at the beginning 💛');
  fd.append('icon', '👶');
  fd.append('arrow', '1');
  fd.append('photo', new Blob([fs.readFileSync('data/photos/sample-bump.png')], { type: 'image/png' }), 'sample-bump.png');
  const created = await (await fetch('http://localhost:4173/api/entries', { method: 'POST', body: fd })).json();
  console.log('created:', created.id, created.photo);
})();
