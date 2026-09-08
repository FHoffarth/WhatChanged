import {validateText, LIMITS} from './limits.js';

export function normalize(text) {
  return text.replace(/\r\n?/g,'\n').replace(/[\u00a0\u202f]/g,' ').replace(/[ \t]+$/gm,'');
}
const tokens = text => text.match(/[\p{L}\p{M}\p{N}_]+|\s+|[^\p{L}\p{M}\p{N}_\s]/gu) || [];

// Bounded LCS: budget checked before allocating any matrix. Tie breaks remove first.
function sequenceDiff(a,b,budget) {
  const cells=(a.length+1)*(b.length+1);
  budget.left-=cells;
  if (budget.left<0) throw new Error('Dieser Vergleich ist zu komplex. Bitte kleinere Textabschnitte vergleichen.');
  const width=b.length+1, dp=new Uint16Array(cells);
  for(let i=a.length-1;i>=0;i--) for(let j=b.length-1;j>=0;j--)
    dp[i*width+j]=a[i]===b[j]?1+dp[(i+1)*width+j+1]:Math.max(dp[(i+1)*width+j],dp[i*width+j+1]);
  const edits=[]; let i=0,j=0;
  while(i<a.length || j<b.length) {
    if(i<a.length && j<b.length && a[i]===b[j]) {edits.push({kind:'unchanged',a:a[i++],b:b[j++]});}
    else if(i<a.length && (j===b.length || dp[(i+1)*width+j]>=dp[i*width+j+1])) edits.push({kind:'removed',a:a[i++]});
    else edits.push({kind:'added',b:b[j++]});
  }
  return edits;
}

// Scan whole lines, longest structured forms first. Units are part of each value.
const number=String.raw`[+-]?\d+(?:[.,]\d+)*`;
const unit=String.raw`(?:€|EUR|USD|GBP|CHF|\$|£)`;
const duration=String.raw`(?:Sekunden?|Minuten?|Stunden?|Tage?|Tagen|Wochen?|Monate?|Monaten|Jahre?|Jahren)`;
const valuePattern=new RegExp(String.raw`(?<![\p{L}\p{N}_])(?:\d{4}-\d{2}-\d{2}|\d{2}\.\d{2}\.\d{4}|(?:\$|€|£)\s*${number}|${number}\s*${unit}|${number}\s+${duration}|${number})(?![\p{L}\p{N}_])`,'gu');
function scan(text) {
  const values=[]; let template='',cursor=0;
  for(const match of text.matchAll(valuePattern)) {
    const raw=match[0]; let category='number',shared='';
    if(/^\d{4}-\d{2}-\d{2}$|^\d{2}\.\d{2}\.\d{4}$/.test(raw)) category='date';
    else if(/€|EUR|USD|GBP|CHF|\$|£/.test(raw)) {category='currency'; shared=raw.match(/€|EUR|USD|GBP|CHF|\$|£/)[0];}
    else if(/\p{L}/u.test(raw)) {category='duration'; shared=raw.match(/\p{L}+/u)[0];}
    template+=text.slice(cursor,match.index)+`\u0000${category}:${shared}\u0000`;
    values.push({raw,category,start:match.index,end:match.index+raw.length}); cursor=match.index+raw.length;
  }
  return {template:template+text.slice(cursor),values};
}
export function detectValues(oldText,newText,changeId) {
  const a=scan(oldText),b=scan(newText);
  if(a.template!==b.template || a.values.length!==b.values.length) return [];
  return a.values.flatMap((v,i)=>v.raw===b.values[i].raw?[]:[{
    oldValue:v.raw,newValue:b.values[i].raw,category:v.category,changeId,
    source:{oldText,newText,oldRange:[v.start,v.end],newRange:[b.values[i].start,b.values[i].end]}
  }]);
}
function similarity(a,b) {
  if(!a.trim() || !b.trim()) return 0;
  const sa=scan(a),sb=scan(b);
  if(sa.values.length && sa.template===sb.template && sa.values.length===sb.values.length) return 1;
  const aw=a.match(/[\p{L}\p{M}\p{N}_]+/gu)||[],bw=b.match(/[\p{L}\p{M}\p{N}_]+/gu)||[];
  const counts=new Map(); for(const w of aw) counts.set(w,(counts.get(w)||0)+1);
  let common=0,letters=0;
  for(const w of bw) if(counts.get(w)>0) {common++;if(/\p{L}/u.test(w)) letters++;counts.set(w,counts.get(w)-1);}
  return letters?2*common/(aw.length+bw.length):0;
}
function pairHunk(removed,added) {
  if(removed.length>10 || added.length>10) return [];
  const scores=removed.map(a=>added.map(b=>similarity(a,b)));
  const pairs=[]; let last=-1;
  for(let i=0;i<removed.length;i++) {
    const best=Math.max(0,...scores[i]); if(best<0.6) continue;
    const candidates=scores[i].flatMap((s,j)=>s===best?[j]:[]); if(candidates.length!==1) continue;
    const j=candidates[0],column=scores.map(r=>r[j]);
    if(j<=last || Math.max(...column)!==best || column.filter(s=>s===best).length!==1) continue;
    pairs.push([i,j]); last=j;
  }
  return pairs;
}
export function compare(rawOld,rawNew) {
  validateText(rawOld); validateText(rawNew);
  const oldText=normalize(rawOld),newText=normalize(rawNew),budget={left:LIMITS.cells};
  const edits=sequenceDiff(oldText.split('\n'),newText.split('\n'),budget),rows=[];
  let oldLine=0,newLine=0;
  function row(kind,a=null,b=null) {
    const id=`change-${rows.length+1}`;
    const r={id,kind,oldText:a,newText:b,oldLine:a===null?null:++oldLine,newLine:b===null?null:++newLine};
    if(kind==='modified') {
      const parts=sequenceDiff(tokens(a),tokens(b),budget);
      r.oldTokens=parts.filter(p=>p.a!==undefined).map(p=>({text:p.a,changed:p.kind!=='unchanged'}));
      r.newTokens=parts.filter(p=>p.b!==undefined).map(p=>({text:p.b,changed:p.kind!=='unchanged'}));
    }
    rows.push(r);
  }
  for(let e=0;e<edits.length;) {
    if(edits[e].kind==='unchanged') {row('unchanged',edits[e].a,edits[e].b);e++;continue;}
    const removed=[],added=[];
    while(e<edits.length && edits[e].kind!=='unchanged') {const p=edits[e++];if(p.kind==='removed')removed.push(p.a);else added.push(p.b);}
    let i=0,j=0;
    for(const [pi,pj] of pairHunk(removed,added)) {
      while(i<pi)row('removed',removed[i++]);while(j<pj)row('added',null,added[j++]);
      row('modified',removed[i++],added[j++]);
    }
    while(i<removed.length)row('removed',removed[i++]);while(j<added.length)row('added',null,added[j++]);
  }
  const values=rows.filter(r=>r.kind==='modified').flatMap(r=>detectValues(r.oldText,r.newText,r.id));
  const counts={added:0,removed:0,modified:0}; for(const r of rows) if(r.kind!=='unchanged')counts[r.kind]++;
  return {rows,values,counts,normalizedEqual:oldText===newText};
}
