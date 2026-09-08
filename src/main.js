import './style.css';
import {compare} from './core.js';
import {validateText} from './limits.js';
import {extractPdf} from './pdf.js';
const $=id=>document.getElementById(id);
const sides={};let changes=[],active=0;
const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
function invalidate() {
  $('results').hidden=true;$('diff').replaceChildren();$('values').replaceChildren();changes=[];$('error').hidden=true;
}
function readiness() {
  const valid=Object.values(sides).length===2 && Object.values(sides).every(s=>!s.busy && !s.error && s.text.value.trim());
  $('compare').disabled=!valid;
  $('ready').textContent=valid?'Beide Versionen sind bereit.':Object.values(sides).some(s=>s.busy)?'PDF-Text wird lokal extrahiert …':'Zwei Versionen eingeben, dann vergleichen.';
}
for(const key of ['old','new']) {
  const side=sides[key]={text:$(`text-${key}`),file:$(`file-${key}`),status:$(`status-${key}`),busy:false,error:false,version:0,controller:null};
  function status(message,error=false) {side.status.textContent=message;side.error=error;side.status.classList.toggle('invalid',error);side.text.setAttribute('aria-invalid',String(error));}
  function clear() {
    side.version++;side.controller?.abort();side.controller=null;side.busy=false;side.error=false;side.text.value='';side.text.readOnly=false;side.file.value='';
    status('Text oder eine PDF');invalidate();readiness();side.text.focus();
  }
  $(`clear-${key}`).addEventListener('click',clear);
  side.text.addEventListener('input',()=>{
    invalidate();try {validateText(side.text.value);status(side.text.value?`${side.text.value.length.toLocaleString('de-DE')} Zeichen · Texteingabe`:'Text oder eine PDF');}
    catch(error){status(error.message,true);}readiness();
  });
  async function load(files) {
    if(files.length!==1){status('Bitte genau eine PDF pro Seite auswählen.',true);invalidate();readiness();return;}
    side.controller?.abort();const version=++side.version;side.controller=new AbortController();
    side.busy=true;side.error=false;side.text.value='';side.text.readOnly=true;invalidate();status('PDF-Text wird lokal extrahiert …');readiness();
    try {
      const result=await extractPdf(files[0],side.controller.signal);if(side.version!==version)return;
      side.text.value=result.text;status(`${files[0].name} · ${result.pages} ${result.pages===1?'Seite':'Seiten'} · Extrahierter Text. Zum Bearbeiten zuerst leeren.`);
    } catch(error){if(side.version!==version)return;side.text.value='';side.text.readOnly=false;status(error.message,true);}
    finally {if(side.version===version){side.busy=false;side.file.value='';readiness();}}
  }
  side.file.addEventListener('change',()=>{if(side.file.files.length)load([...side.file.files]);});
  const region=$(`side-${key}`);
  region.addEventListener('dragover',event=>{if(event.dataTransfer.types.includes('Files')){event.preventDefault();region.classList.add('dragging');}});
  region.addEventListener('dragleave',()=>region.classList.remove('dragging'));
  region.addEventListener('drop',event=>{event.preventDefault();region.classList.remove('dragging');load([...event.dataTransfer.files]);});
}
// Avoid navigating away if a file is dropped outside the input workspace.
window.addEventListener('dragover',event=>{if(event.dataTransfer.types.includes('Files'))event.preventDefault();});
window.addEventListener('drop',event=>event.preventDefault());
function move(delta,focus=true) {
  if(!changes.length)return;active=(active+delta+changes.length)%changes.length;
  changes.forEach((el,i)=>{el.classList.toggle('current',i===active);if(i===active)el.setAttribute('aria-current','true');else el.removeAttribute('aria-current');});
  $('position').textContent=`${active+1} / ${changes.length}`;
  if(focus){changes[active].focus({preventScroll:true});changes[active].scrollIntoView({block:'center',behavior:'instant'});}
}
$('next').addEventListener('click',()=>move(1));$('previous').addEventListener('click',()=>move(-1));
document.addEventListener('keydown',event=>{
  if(event.ctrlKey||event.metaKey||event.altKey||event.isComposing||$('results').hidden)return;
  if(event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))return;
  if(event.key.toLowerCase()==='j'){event.preventDefault();move(1);}if(event.key.toLowerCase()==='k'){event.preventDefault();move(-1);}
});
const categoryLabels={currency:'Betrag geändert',duration:'Zeit-/Dauerangabe geändert',date:'Datumsangabe geändert',number:'Zahl geändert'};
function cell(row,side) {
  const old=side==='old',text=row[`${side}Text`],line=row[`${side}Line`],el=node('div',undefined,`diff-cell ${side}`);
  const label=old?'Alt':'Neu';el.append(node('span',`${label}${line===null?'':` · ${line}`}`, 'line-label'));
  const content=node('div',undefined,'line-text');
  if(text===null){content.append(node('span','—','absent'));el.setAttribute('aria-label',`${label}: kein Textblock`);}
  else if(row.kind==='modified') for(const token of row[`${side}Tokens`])content.append(node(token.changed?(old?'del':'ins'):'span',token.text));
  else if(row.kind==='removed'||row.kind==='added') content.append(node(old?'del':'ins',text||'↵'));
  else content.textContent=text||'↵';
  el.append(content);return el;
}
$('compare').addEventListener('click',()=>{
  invalidate();
  try {
    const result=compare(sides.old.text.value,sides.new.text.value);
    const {counts,values}=result;const labels=[];
    if(values.length)labels.push(`${values.length} geänderte Zahlen-/Wertangaben`);
    if(counts.modified)labels.push(`${counts.modified} geänderte Textblöcke`);
    if(counts.added)labels.push(`${counts.added} hinzugefügte Textblöcke`);
    if(counts.removed)labels.push(`${counts.removed} entfernte Textblöcke`);
    $('summary').textContent=labels.length?labels.join(' · '):'Keine Unterschiede nach technischer Normalisierung.';
    const fragment=document.createDocumentFragment();
    for(const row of result.rows) {
      const el=node('article',undefined,`diff-row ${row.kind}`);el.id=row.id;
      const label={modified:'~ Geändert',removed:'− Entfernt',added:'+ Hinzugefügt',unchanged:'= Unverändert'}[row.kind];
      el.setAttribute('aria-label',`${label}, Alt ${row.oldLine??'–'}, Neu ${row.newLine??'–'}`);
      el.append(node('span',label,'change-label'),cell(row,'old'),cell(row,'new'));
      if(row.kind!=='unchanged'){el.tabIndex=-1;changes.push(el);}fragment.append(el);
    }
    $('diff').append(fragment);
    for(const value of values) {
      const li=node('li');const button=node('button',`${value.oldValue} → ${value.newValue}`);
      button.title=`Alt: ${value.source.oldText}\nNeu: ${value.source.newText}`;
      button.addEventListener('click',()=>{const target=changes.findIndex(el=>el.id===value.changeId);if(target>=0)move(target-active);});
      li.append(node('span',categoryLabels[value.category]),button);$('values').append(li);
    }
    $('previous').disabled=$('next').disabled=!changes.length;$('position').textContent=changes.length?'':'0 / 0';
    active=0;$('results').hidden=false;move(0,false);
  }catch(error){$('error').textContent=error.message;$('error').hidden=false;}
});
readiness();
