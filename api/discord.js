export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.send(`dh=067e705497fcc6d2817d3d9326c3c8defa766d50
dh=3f47de1af92af8152112b460b5987520007a42a0
dh=708d872d7307e55548f81d1aabfb211d64b5ee54
dh=fbe0feb01947bcc6d0be040fc0ca7f4395f52c36\n`);
}
