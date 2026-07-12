const chunks = [];
process.stdin.on('data', (chunk) => chunks.push(chunk));
process.stdin.on('end', () => {
  const text = Buffer.concat(chunks).toString();
  const cleaned = text
    .split('\n')
    .filter((line) => !/Co-authored-by:\s*Cursor/i.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();

  process.stdout.write(`${cleaned}\n`);
});
