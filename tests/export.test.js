import test from 'node:test';
import assert from 'node:assert/strict';
import {compare} from '../src/core.js';
import {buildMarkdownExport,buildTextExport,buildCsvExport,exportEntries,exportFilename} from '../src/export.js';
const result=compare('Grüße\nPreis 450 €\nService Paket Standard\nEntfernt','Grüße\nPreis 520 €\nService Paket Plus\nGanz neu');
for(const [label,build] of [['Markdown',buildMarkdownExport],['Text',buildTextExport],['CSV',buildCsvExport]]) {
 test(`${label}: exports existing evidence and all changed block types`,()=>{
  const text=build(result);for(const expected of ['Betrag geändert','450 €','520 €','Text geändert','Service Paket Standard','Service Paket Plus','Text entfernt','Text hinzugefügt'])assert.ok(text.includes(expected),expected);
  assert.ok(!text.includes('Grüße'));assert.ok(text.includes('change-2'));
 });
 test(`${label}: Unicode, multiline and optional fields`,()=>{
  const r={rows:[{kind:'added',newText:'ÄÖ 世界\nzweite Zeile',oldText:null}],values:[]};
  const out=build(r);assert.ok(out.includes('ÄÖ 世界\nzweite Zeile'));assert.ok(!out.includes('undefined'));assert.ok(!out.includes('null'));
 });
 test(`${label}: unchanged-only has no entries`,()=>assert.equal(exportEntries(compare('gleich','gleich')).length,0));
}
test('entries follow diff row order, values before their block',()=>{
 const entries=exportEntries(result);assert.deepEqual(entries.map(e=>e.type),['Betrag geändert','Text geändert','Text geändert','Text entfernt','Text hinzugefügt']);
 assert.deepEqual(entries.map(e=>e.change_number),[1,2,3,4,5]);assert.ok(entries[0].context.includes('Preis 450 €'));assert.ok(entries[0].context.includes('Preis 520 €'));
});
test('CSV header and exact escaping',()=>{
 const r={rows:[{kind:'added',newText:'a,b;"c"\nGrüße',oldText:null}],values:[]};
 assert.equal(buildCsvExport(r),'change_number,type,old,new,context,change_id\r\n"1","Text hinzugefügt","","a,b;""c""\nGrüße","",""\r\n');
});
test('Markdown uses fences longer than embedded fences or HTML',()=>{
 const r={rows:[{kind:'removed',oldText:'```\n<script>x</script>\n```',newText:null}],values:[]};
 assert.ok(buildMarkdownExport(r).includes('````text\n```\n<script>x</script>\n```\n````'));
});
test('Text retains readable labels and multiline evidence',()=>{
 const out=buildTextExport({rows:[{kind:'modified',oldText:'A\nB',newText:'C\nD'}],values:[]});
 assert.ok(out.includes('1. Text geändert\n\nAlt:\nA\nB\n\nNeu:\nC\nD'));
});
test('stable filenames contain only date and supported extension',()=>{
 for(const ext of ['md','csv','txt'])assert.equal(exportFilename(ext,'2026-09-08'),`WhatChanged-Aenderungen-2026-09-08.${ext}`);
 assert.throws(()=>exportFilename('json','2026-09-08'));assert.throws(()=>exportFilename('md','document text'));
});
test('exports do not mutate or recompute the supplied result',()=>{
 const r={rows:[{kind:'modified',id:'original-id',oldText:'as supplied',newText:'as supplied'}],values:[]};
 const before=structuredClone(r);assert.ok(buildTextExport(r).includes('Text geändert'));assert.deepEqual(r,before);
});
