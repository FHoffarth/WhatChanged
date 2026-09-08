import {test,expect} from '@playwright/test';
import {pdf} from './pdf-fixture.js';
const old='Der Text ist alt.\nPreis 450 €\nLaufzeit 14 Tage\nDatum 01.10.2026\nEin alter Absatz\nEnde';
const newer='Der Text ist neu.\nPreis 520 €\nLaufzeit 30 Tage\nDatum 15.10.2026\nRaketen fliegen hoch\nEnde';
async function fill(page,a=old,b=newer) {await page.locator('#text-old').fill(a);await page.locator('#text-new').fill(b);await page.locator('#compare').click();}
test.beforeEach(async({page})=>{await page.goto('/');});
test('text, values, added/removed, word highlighting and navigation',async({page})=>{
 await fill(page);await expect(page.locator('#values')).toContainText('450 € → 520 €');
 await expect(page.locator('#values')).toContainText('14 Tage → 30 Tage');await expect(page.locator('#values')).toContainText('01.10.2026 → 15.10.2026');
 await expect(page.locator('#diff del').first()).toHaveText('alt');await expect(page.locator('#diff ins').first()).toHaveText('neu');
 await expect(page.locator('.diff-row.removed')).toHaveCount(1);await expect(page.locator('.diff-row.added')).toHaveCount(1);
 await expect(page.locator('#position')).toHaveText('1 / 6');await page.locator('#next').click();await expect(page.locator('#position')).toHaveText('2 / 6');
 await page.keyboard.press('j');await expect(page.locator('#position')).toHaveText('3 / 6');await page.keyboard.press('k');await expect(page.locator('#position')).toHaveText('2 / 6');
 await page.locator('#previous').click();await expect(page.locator('#position')).toHaveText('1 / 6');
 await page.locator('#text-old').focus();await page.keyboard.press('j');await expect(page.locator('#results')).toBeHidden();await expect(page.locator('#text-old')).toBeFocused();
});
test('HTML input creates no executable DOM',async({page})=>{
 const attack='<img src="https://evil.invalid/x" onerror="window.hacked=1"><script>window.hacked=1</script>';
 await fill(page,attack,attack+'!');await expect(page.locator('#diff')).toContainText(attack);
 await expect(page.locator('#diff img, #diff script')).toHaveCount(0);expect(await page.evaluate(()=>window.hacked)).toBeUndefined();
});
test('local PDF A/B, page order, locked source, clear and extraction notice',async({page})=>{
 await page.locator('#file-old').setInputFiles({name:'old.pdf',mimeType:'application/pdf',buffer:pdf([['Price 450 EUR','14 Tage'],['2026-10-01']])});
 await page.locator('#file-new').setInputFiles({name:'new.pdf',mimeType:'application/pdf',buffer:pdf([['Price 520 EUR','30 Tage'],['2026-10-15']])});
 await expect(page.locator('#compare')).toBeEnabled();await expect(page.locator('#text-old')).toHaveAttribute('readonly','');
 expect(await page.locator('#text-old').inputValue()).toMatch(/Price 450 EUR[\s\S]*14 Tage[\s\S]*2026-10-01/);
 await page.locator('#compare').click();await expect(page.locator('#values li')).toHaveCount(3);
 await expect(page.getByText(/Layout und Lesereihenfolge/)).toBeVisible();await page.locator('#clear-old').click();await expect(page.locator('#text-old')).toBeEditable();
 await expect(page.locator('#results')).toBeHidden();
});
test('invalid, empty, non-PDF, oversize and page limit errors',async({page})=>{
 for(const [name,buffer,message] of [['broken.pdf',Buffer.from('not a pdf'),/gültige PDF/],['empty.pdf',pdf([[]]),/Kein nutzbarer Text/],['text.txt',Buffer.from('x'),/PDF-Datei/],['huge.pdf',Buffer.alloc(10*1024*1024+1),/10 MiB/],['pages.pdf',pdf(Array.from({length:51},()=>['Text'])),/50 Seiten/]]) {
  await page.locator('#file-old').setInputFiles({name,mimeType:'application/pdf',buffer});await expect(page.locator('#status-old')).toContainText(message);
  await expect(page.locator('#compare')).toBeDisabled();
 }
});
for(const width of [1280,375,320])test(`layout ${width}px, long word and enlarged text`,async({page})=>{
 await page.setViewportSize({width,height:900});await fill(page,'Wort '+ 'a'.repeat(900),'Wort '+ 'b'.repeat(900));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/layout-${width}.png`,fullPage:true});
});
test('visible keyboard focus and text limit',async({page})=>{
 await page.locator('#text-old').focus();expect(await page.locator('#text-old').evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none');
 await page.locator('#text-old').fill('x'.repeat(1001));await expect(page.locator('#status-old')).toContainText('1.000');await expect(page.locator('#compare')).toBeDisabled();
});
test('no console errors, content transmission or storage during text and PDF flows',async({page,context})=>{
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 context.on('request',r=>requests.push({url:r.url(),method:r.method(),body:r.postData()}));
 await page.addInitScript(()=>{
  window.storageCalls=[];
  for(const method of ['getItem','setItem','removeItem','clear']) Storage.prototype[method]=function(){window.storageCalls.push(method);throw Error('Storage forbidden');};
  indexedDB.open=()=>{window.storageCalls.push('idb');throw Error('IDB forbidden');};
  navigator.sendBeacon=()=>{window.storageCalls.push('beacon');throw Error('Beacon forbidden');};
 });
 await page.reload();await fill(page);
 await page.locator('#file-old').setInputFiles({name:'privacy.pdf',mimeType:'application/pdf',buffer:pdf([['Price 450 EUR']])});await expect(page.locator('#status-old')).toContainText('privacy.pdf');
 expect(errors).toEqual([]);expect(requests.every(r=>r.url.startsWith('http://127.0.0.1:48173/') && r.method==='GET' && !r.body)).toBe(true);
 expect(await page.evaluate(()=>window.storageCalls)).toEqual([]);expect(await context.cookies()).toEqual([]);
 expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}))).toEqual({local:0,session:0});
 expect(await page.evaluate(async()=> (await indexedDB.databases()).length)).toBe(0);
 expect(await page.evaluate(async()=> (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
});

test('drop accepts one PDF and rejects a batch',async({page})=>{
 const bytes=[...pdf([['Dropped document']])];
 const data=await page.evaluateHandle(bytes=>{const d=new DataTransfer();d.items.add(new File([new Uint8Array(bytes)],'drop.pdf',{type:'application/pdf'}));return d;},bytes);
 await page.locator('#side-old').dispatchEvent('drop',{dataTransfer:data});await expect(page.locator('#text-old')).toHaveValue('Dropped document');
 const batch=await page.evaluateHandle(()=>{const d=new DataTransfer();d.items.add(new File(['a'],'a.pdf'));d.items.add(new File(['b'],'b.pdf'));return d;});
 await page.locator('#side-new').dispatchEvent('drop',{dataTransfer:batch});await expect(page.locator('#status-new')).toContainText('genau eine PDF');
});
test('clearing an in-flight PDF cannot restore stale content',async({page})=>{
 let release;const gate=new Promise(r=>release=r);
 await page.route('**/pdf.worker*.mjs',async route=>{await gate;await route.continue().catch(()=>{});});
 await page.locator('#file-old').setInputFiles({name:'pending.pdf',mimeType:'application/pdf',buffer:pdf([['Stale content']])});
 await expect(page.locator('#status-old')).toContainText('wird lokal extrahiert');await page.locator('#clear-old').click();release();
 await page.locator('#text-old').fill('Fresh text');await page.locator('#text-new').fill('Fresh text updated');await page.locator('#compare').click();
 await expect(page.locator('#text-old')).toHaveValue('Fresh text');await expect(page.locator('#results')).toBeVisible();
});
