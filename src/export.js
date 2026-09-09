// Serialization only: consumes existing evidence without comparing input again.
const labels={currency:'Betrag geändert',duration:'Zeit-/Dauerangabe geändert',date:'Datumsangabe geändert',number:'Zahl geändert',modified:'Text geändert',added:'Text hinzugefügt',removed:'Text entfernt'};
export function exportEntries(result) {
  const entries=[];
  for(const row of result?.rows??[]) {
    if(!['modified','added','removed'].includes(row.kind))continue;
    for(const value of result.values??[]) {
      if(!row.id || value.changeId!==row.id || !labels[value.category])continue;
      const source=value.source;
      const context=[source?.oldText!==undefined?`Alt:\n${source.oldText}`:'',source?.newText!==undefined?`Neu:\n${source.newText}`:''].filter(Boolean).join('\n\n');
      entries.push({type:labels[value.category],old:value.oldValue??'',new:value.newValue??'',context,change_id:value.changeId??''});
    }
    const context=[row.oldLine!=null?`Alt: Zeile ${row.oldLine}`:'',row.newLine!=null?`Neu: Zeile ${row.newLine}`:''].filter(Boolean).join('\n');
    entries.push({type:labels[row.kind],old:row.oldText??'',new:row.newText??'',context,change_id:row.id??''});
  }
  return entries.map((entry,i)=>({change_number:i+1,...entry}));
}
const title='WhatChanged? – Änderungsbericht';
function fenced(text) {
  const longest=Math.max(2,...(text.match(/`+/g)??[]).map(s=>s.length));
  const fence='`'.repeat(longest+1);
  return `${fence}text\n${text}\n${fence}`;
}
export function buildMarkdownExport(result) {
  const sections=exportEntries(result).map(e=>[
    `## ${e.change_number}. ${e.type}`,
    `Alt:\n\n${fenced(e.old)}`,`Neu:\n\n${fenced(e.new)}`,
    ...(e.context?[`Kontext:\n\n${fenced(e.context)}`]:[]),
    ...(e.change_id?[`Änderungs-ID:\n\n${fenced(e.change_id)}`]:[])
  ].join('\n\n'));
  return `# ${title}\n\n${sections.join('\n\n---\n\n')}\n`;
}
export function buildTextExport(result) {
  return title+'\n\n'+exportEntries(result).map(e=>[
    `${e.change_number}. ${e.type}`,`Alt:\n${e.old}`,`Neu:\n${e.new}`,
    ...(e.context?[`Kontext:\n${e.context}`]:[]),...(e.change_id?[`Änderungs-ID: ${e.change_id}`]:[])
  ].join('\n\n')).join('\n\n────────────────────\n\n')+'\n';
}
export function buildCsvExport(result) {
  const columns=['change_number','type','old','new','context','change_id'];
  const formulaLike=/(?:^|[\r\n])[\u0000-\u0020]*[=+\-@]/;
  const neutralize=value=>formulaLike.test(value)?`'${value}`:value;
  const quote=value=>'"'+neutralize(String(value??'')).replaceAll('"','""')+'"';
  return columns.join(',')+'\r\n'+exportEntries(result).map(e=>columns.map(c=>quote(e[c])).join(',')+'\r\n').join('');
}
export function exportFilename(extension,date) {
  if(!['md','csv','txt'].includes(extension)||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Ungültiges Exportformat oder Datum.');
  return `WhatChanged-Aenderungen-${date}.${extension}`;
}
