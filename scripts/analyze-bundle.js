const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'bundle-report.json');
let buf = fs.readFileSync(p);
let txt;
function tryParse(str) {
  try { return JSON.parse(str); } catch (e) { return null; }
}

txt = buf.toString('utf8');
let j = tryParse(txt);
if (!j) {
  txt = buf.toString('utf16le');
  j = tryParse(txt);
}
if (!j) {
  // Try interpret as UTF-16BE by swapping bytes to LE
  const swapped = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i += 2) {
    if (i + 1 < buf.length) {
      swapped[i] = buf[i+1];
      swapped[i+1] = buf[i];
    } else {
      swapped[i] = buf[i];
    }
  }
  txt = swapped.toString('utf16le');
  j = tryParse(txt);
}
if (!j) {
  console.error('Failed to parse bundle-report.json with utf8/utf16le/utf16be heuristics');
  process.exit(2);
}
const res = j.results && j.results[0] ? j.results[0] : j;
const files = res.files || res;
const arr = Object.keys(files).map(k => ({ file: k, bytes: files[k].bytes || files[k].size || files[k] }));
arr.sort((a,b)=>b.bytes-a.bytes);
console.log('Top modules by size:\n');
arr.slice(0,40).forEach((x,i)=> console.log(`${i+1}. ${x.file} - ${Math.round(x.bytes/1024)} KB`));
