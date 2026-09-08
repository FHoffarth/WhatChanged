// Small valid, uncompressed PDF fixtures. Text is ASCII to keep byte offsets exact.
export function pdf(pages) {
  const objects=['<< /Type /Catalog /Pages 2 0 R >>',''];
  const kids=[];
  for(const lines of pages) {
    const pageId=objects.length+1,contentId=pageId+1;
    kids.push(`${pageId} 0 R`);
    const content='BT /F1 12 Tf 50 750 Td '+lines.map((line,i)=>`${i?'0 -20 Td ':''}(${line.replace(/[\\()]/g,'\\$&')}) Tj`).join('\n')+' ET';
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
  }
  objects[1]=`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`;
  let out='%PDF-1.4\n',offsets=[0];
  objects.forEach((obj,i)=>{offsets.push(Buffer.byteLength(out));out+=`${i+1} 0 obj\n${obj}\nendobj\n`;});
  const start=Buffer.byteLength(out);out+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(const offset of offsets.slice(1))out+=`${String(offset).padStart(10,'0')} 00000 n \n`;
  out+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(out);
}
