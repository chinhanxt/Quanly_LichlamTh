import fs from 'fs';

async function testApiOcr() {
  const imagePath = '/home/chinhan/Downloads/download.jpeg';
  const fileBuffer = fs.readFileSync(imagePath);
  
  const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
  const formData = new FormData();
  formData.append('file', blob, 'download.jpeg');
  formData.append('employeeName', 'Thanh Hương');

  console.log("Sending POST to http://localhost:3000/api/ocr ...");
  const startTime = Date.now();
  const res = await fetch('http://localhost:3000/api/ocr', {
    method: 'POST',
    body: formData
  });

  const json = await res.json();
  console.log(`API Response (${Date.now() - startTime}ms):`, JSON.stringify(json, null, 2));
}

testApiOcr().catch(console.error);
