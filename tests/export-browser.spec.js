import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const old='Unveränderter Kontext\nPreis 450 €\nService Paket Standard\nEntfernt\nÄÖ Welt';
const newer='Unveränderter Kontext\nPreis 520 €\nService Paket Plus\nNeu hinzugefügt\nÄÖ Erde';
async function compare(page,a=old,b=newer){await page.locator('#text-old').fill(a);await page.locator('#text-new').fill(b);await page.locator('#compare').click();}
async function download(page,format){
 await page.locator('#export-toggle').click();const pending=page.waitForEvent('download');
 await page.locator(`[data-export="${format}"]`).click();const file=await pending;
 expect(await file.failure()).toBeNull();return {name:file.suggestedFilename(),text:await readFile(await file.path(),'utf8')};
}
test.beforeEach(async({page})=>{await page.goto('/');});
for(const format of ['md','csv','txt'])test(`download ${format}: content, Unicode, multiline context, filename`,async({page})=>{
 await compare(page);const {name,text}=await download(page,format);
 expect(name).toBe(`WhatChanged-Aenderungen-${new Date().toISOString().slice(0,10)}.${format}`);
 for(const expected of ['450 €','520 €','Betrag geändert','Text geändert','Text hinzugefügt','Text entfernt','ÄÖ','change-2'])expect(text).toContain(expected);
 expect(text).not.toContain('Unveränderter Kontext');expect(text).toContain('Alt:\nPreis 450 €\n\nNeu:\nPreis 520 €');
 if(format==='csv')expect(text).toMatch(/^change_number,type,old,new,context,change_id\r\n/);
 await expect(page.locator('#export-options')).toBeHidden();await expect(page.locator('#export-toggle')).toBeFocused();
});
test('export state: absent, identical, valid and invalidated inputs',async({page})=>{
 await expect(page.locator('#export-toggle')).toBeDisabled();await compare(page,'gleich','gleich');await expect(page.locator('#export-toggle')).toBeDisabled();
 await compare(page);await expect(page.locator('#export-toggle')).toBeEnabled();await page.locator('#export-toggle').click();
 await page.locator('#text-old').fill('Geändert');await expect(page.locator('#export-toggle')).toBeDisabled();await expect(page.locator('#export-options')).toBeHidden();
 await expect(page.locator('#results')).toBeHidden();await page.locator('#compare').click();await expect(page.locator('#export-toggle')).toBeEnabled();
 await page.locator('#clear-new').click();await expect(page.locator('#export-toggle')).toBeDisabled();
});
test('export is keyboard accessible with Escape and focus return',async({page})=>{
 await compare(page);await page.locator('#export-toggle').focus();await page.keyboard.press('Enter');await expect(page.locator('[data-export="md"]')).toBeFocused();
 expect(await page.locator('[data-export="md"]').evaluate(e=>getComputedStyle(e).outlineStyle)).not.toBe('none');
 await page.keyboard.press('Tab');await expect(page.locator('[data-export="csv"]')).toBeFocused();await page.keyboard.press('Escape');await expect(page.locator('#export-toggle')).toBeFocused();await expect(page.locator('#export-options')).toBeHidden();
 await page.keyboard.press('Enter');const pending=page.waitForEvent('download');await page.keyboard.press('Enter');expect((await pending).suggestedFilename()).toMatch(/\.md$/);
});
test('exports use and revoke local blobs without errors, network or storage',async({page,context})=>{
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.evaluate(()=>{
  window.exportAudit={created:[],revoked:[],storage:[]};
  const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  URL.createObjectURL=b=>{const url=create(b);window.exportAudit.created.push(url);return url;};URL.revokeObjectURL=url=>{window.exportAudit.revoked.push(url);revoke(url);};
  for(const method of ['getItem','setItem','removeItem','clear'])Storage.prototype[method]=()=>{window.exportAudit.storage.push(method);throw Error('Storage forbidden');};
  indexedDB.open=()=>{window.exportAudit.storage.push('idb');throw Error('IDB forbidden');};
 });
 await compare(page);context.on('request',r=>requests.push(r.url()));
 for(const format of ['md','csv','txt'])await download(page,format);
 await expect.poll(()=>page.evaluate(()=>window.exportAudit.revoked.length)).toBe(3);
 const audit=await page.evaluate(()=>window.exportAudit);expect(audit.revoked.sort()).toEqual(audit.created.sort());expect(audit.storage).toEqual([]);
 expect(requests.filter(url=>!url.startsWith('blob:'))).toEqual([]);expect(errors).toEqual([]);expect(await context.cookies()).toEqual([]);
 expect(await page.evaluate(()=>localStorage.length+sessionStorage.length)).toBe(0);
 expect(await page.evaluate(async()=>(await indexedDB.databases()).length)).toBe(0);
 expect(await page.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
});
for(const width of [375,320])test(`export menu fits ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await compare(page);await page.locator('#export-toggle').click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for(const selector of ['#export-toggle','#export-options']){const rect=await page.locator(selector).boundingBox();expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(width);}
});
