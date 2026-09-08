import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize, compare, detectValues} from '../src/core.js';
import {validateText, validatePdf, LIMITS} from '../src/limits.js';

for (const [name,input,expected] of [
 ['empty','',''],['line endings','a\r\nb\rc\n','a\nb\nc\n'],
 ['Unicode','Grüße 世界 👋','Grüße 世界 👋'],['trailing','a \t\nb\t','a\nb'],
 ['internal','a  b\tc','a  b\tc'],['structure','a\n\nb-\nc','a\n\nb-\nc'],
 ['known spaces','4\u00a0€\u202fjetzt','4 € jetzt'],
]) test(`normalization: ${name}`,()=>assert.equal(normalize(input),expected));
const kinds=(a,b)=>compare(a,b).rows.filter(r=>r.kind!=='unchanged').map(r=>r.kind);
test('identical',()=>assert.deepEqual(kinds('Hallo','Hallo'),[]));
test('technical whitespace equivalent',()=>assert.deepEqual(kinds('a \r\nb','a\nb'),[]));
test('token boundaries preserved',()=>assert.notDeepEqual(kinds('ab c','a bc'),[]));
for(const [name,a,b,expected] of [
 ['word','Das ist alt.','Das ist neu.',['modified']],
 ['added line','a','a\nb',['added']],['removed line','a\nb','a',['removed']],
 ['added paragraph','a','a\n\nneuer Absatz',['added','added']],
 ['removed paragraph','a\n\nneuer Absatz','a',['removed','removed']],
 ['unrelated','Katze schläft draußen','Raketen fliegen hoch',['removed','added']],
 ['similar','Die schöne Straße bleibt.','Die breite Straße bleibt.',['modified']],
 ['punctuation','Hallo, Welt!','Hallo, Welt?',['modified']],
 ['German','Grüße aus Köln','Grüße aus Berlin',['modified']],
]) test(`diff: ${name}`,()=>assert.deepEqual(kinds(a,b),expected));
test('repeated text reconstructs both originals',()=>{
 const a='x\nx\ny',b='x\ny\nx'; const r=compare(a,b);
 assert.equal(r.rows.filter(x=>x.oldText!==null).map(x=>x.oldText).join('\n'),a);
 assert.equal(r.rows.filter(x=>x.newText!==null).map(x=>x.newText).join('\n'),b);
});
test('moved text is removal and addition',()=>assert.deepEqual(kinds('alpha\nbeta','beta\nalpha').sort(),['added','removed']));
test('ambiguous equal similarity is not paired',()=>assert.equal(compare('Text alt eins\nText alt zwei','Text neu drei\nText neu vier').rows.some(x=>x.kind==='modified'),false));
test('token highlights reconstruct unchanged spacing and punctuation',()=>{
 const r=compare('Das kostet 450,00 EUR.','Das kostet 520,00 EUR.').rows[0];
 assert.equal(r.oldTokens.map(t=>t.text).join(''),r.oldText);
 assert.equal(r.newTokens.map(t=>t.text).join(''),r.newText);
 assert.ok(r.oldTokens.some(t=>t.changed)); assert.ok(r.newTokens.some(t=>t.changed));
});
for(const [a,b,category] of [
 ['450 €','520 €','currency'],['450,00 EUR','520,00 EUR','currency'],
 ['$100','$125','currency'],['14 Tage','30 Tage','duration'],['12 Monate','24 Monate','duration'],
 ['01.10.2026','15.10.2026','date'],['2026-10-01','2026-10-15','date'],['Version 12','Version 13','number'],
 ['Preis 450 € pro Jahr','Preis 520 € pro Jahr','currency'],['14','30','number'],
]) test(`value: ${a} → ${b}`,()=>{
 const result=compare(a,b); assert.equal(result.values.length,1);
 const v=result.values[0]; assert.equal(v.category,category);
 assert.equal(v.oldValue,a.startsWith('Version')?'12':a.startsWith('Preis')?'450 €':a);
 assert.equal(v.newValue,b.startsWith('Version')?'13':b.startsWith('Preis')?'520 €':b);
 assert.equal(v.source.oldText,normalize(a)); assert.equal(v.source.newText,normalize(b));
 assert.ok(result.rows.some(r=>r.id===v.changeId));
});
test('unproven currency/duration is not inferred',()=>{
 assert.deepEqual(detectValues('Preis 14','Menge 30','c1'),[]);
 assert.deepEqual(detectValues('14 Tage','30 Monate','c1'),[]);
 assert.deepEqual(detectValues('450 €','520 USD','c1'),[]);
});
test('multiple contextual values retain separate evidence',()=>{
 const r=compare('Preis 450 € für 14 Tage.','Preis 520 € für 30 Tage.');
 assert.deepEqual(r.values.map(v=>v.category),['currency','duration']);
});
test('inserted value cannot shift numeric pairing',()=>assert.deepEqual(detectValues('Werte 1 und 2','Werte 3, 1 und 2','x'),[]));
test('HTML stays literal in core',()=>assert.equal(compare('<script>1</script>','<img src=x>').rows[0].oldText,'<script>1</script>'));
for(const [name,text] of [['total','x\n'.repeat(25001)],['lines','x\n'.repeat(500)],['line','x'.repeat(1001)]])
 test(`limit: ${name}`,()=>assert.throws(()=>validateText(text),/maximal/));
test('oversize comparison rejected',()=>assert.throws(()=>compare('x'.repeat(50001),'y'),/maximal/));
test('oversize PDF rejected from metadata',()=>assert.throws(()=>validatePdf({name:'x.pdf',size:LIMITS.pdfBytes+1}),/10 MiB/));
test('non-PDF rejected',()=>assert.throws(()=>validatePdf({name:'x.txt',size:10}),/PDF/));
test('comparison work budget rejects pathological token differences',()=>{
 const a=Array.from({length:8},(_,i)=>'a!'.repeat(440)+` old ${i}\nanchor ${i}`).join('\n');
 const b=Array.from({length:8},(_,i)=>'a?'.repeat(440)+` new ${i}\nanchor ${i}`).join('\n');
 assert.throws(()=>compare(a,b),/zu komplex/);
});
test('large unpaired hunk stays added and removed',()=>{
 const a=Array.from({length:11},(_,i)=>`Alter Text ${i}`).join('\n');
 const b=Array.from({length:11},(_,i)=>`Neuer Text ${i}`).join('\n');
 assert.equal(compare(a,b).counts.modified,0);
});
test('deterministic reconstruction across repeated short documents',()=>{
 let seed=17;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed;};
 const vocabulary=['','Text eins','Text zwei','42 €','43 €','Grüße','<b>x</b>'];
 for(let i=0;i<100;i++) {
  const a=Array.from({length:1+random()%12},()=>vocabulary[random()%vocabulary.length]).join('\n');
  const b=Array.from({length:1+random()%12},()=>vocabulary[random()%vocabulary.length]).join('\n');
  const r=compare(a,b);
  assert.equal(r.rows.filter(x=>x.oldText!==null).map(x=>x.oldText).join('\n'),a);
  assert.equal(r.rows.filter(x=>x.newText!==null).map(x=>x.newText).join('\n'),b);
  assert.deepEqual(compare(a,b),r);
 }
});
