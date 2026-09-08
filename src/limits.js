export const LIMITS = Object.freeze({text:50_000, lines:500, line:1_000, cells:2_000_000, pdfBytes:10*1024*1024, pages:50, items:20_000, pdfMs:20_000});
export function validateText(text) {
  if (text.length > LIMITS.text) throw new Error('Pro Seite sind maximal 50.000 Zeichen erlaubt.');
  const lines=text.split(/\r\n|\r|\n/);
  if (lines.length > LIMITS.lines) throw new Error('Pro Seite sind maximal 500 Zeilen erlaubt.');
  if (lines.some(line=>line.length>LIMITS.line)) throw new Error('Eine Zeile darf maximal 1.000 Zeichen enthalten.');
}
export function validatePdf(file) {
  if (!/\.pdf$/i.test(file.name)) throw new Error('Bitte eine PDF-Datei auswählen.');
  if (file.size>LIMITS.pdfBytes) throw new Error('Eine PDF darf maximal 10 MiB groß sein.');
  if (!file.size) throw new Error('Diese PDF-Datei ist leer.');
}
