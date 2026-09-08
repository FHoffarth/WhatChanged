import {getDocument, GlobalWorkerOptions} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {LIMITS,validatePdf,validateText} from './limits.js';
GlobalWorkerOptions.workerSrc=workerUrl;

export async function extractPdf(file,signal) {
  validatePdf(file); // Before reading bytes or starting PDF.js.
  let task,timer,abort;
  const cancelled=new Promise((_,reject)=>{
    abort=()=>reject(new Error('PDF-Verarbeitung abgebrochen.'));
    signal.addEventListener('abort',abort,{once:true});
    timer=setTimeout(()=>reject(new Error('Die PDF-Verarbeitung dauert länger als 20 Sekunden. Bitte eine kleinere PDF verwenden.')),LIMITS.pdfMs);
  });
  async function extract() {
    if(signal.aborted) throw new Error('PDF-Verarbeitung abgebrochen.');
    const data=new Uint8Array(await file.arrayBuffer());
    if(signal.aborted) throw new Error('PDF-Verarbeitung abgebrochen.');
    const base=new URL(`${import.meta.env.BASE_URL}pdfjs/`,location.href).href;
    task=getDocument({data,isEvalSupported:false,useSystemFonts:true,disableFontFace:true,
      cMapUrl:base+'cmaps/',cMapPacked:true,standardFontDataUrl:base+'standard_fonts/',wasmUrl:base+'wasm/',
      stopAtErrors:true});
    task.onPassword=()=>{task.destroy();};
    const doc=await task.promise;
    if(doc.numPages>LIMITS.pages) throw new Error('Eine PDF darf maximal 50 Seiten enthalten.');
    let text='';
    for(let n=1;n<=doc.numPages;n++) {
      if(signal.aborted) throw new Error('PDF-Verarbeitung abgebrochen.');
      const page=await doc.getPage(n),reader=page.streamTextContent({disableNormalization:true}).getReader();
      let pageText='',count=0,previous=null;
      while(true) {
        const {done,value}=await reader.read();if(done)break;
        for(const item of value.items) {
          if(++count>LIMITS.items) throw new Error('Diese PDF-Seite ist zu komplex (maximal 20.000 Textelemente).');
          if(typeof item.str!=='string')continue;
          const y=item.transform[5],x=item.transform[4];
          if(previous && !pageText.endsWith('\n')) {
            if(Math.abs(y-previous.y)>Math.max(1,Math.abs(item.height)*0.25)) pageText+='\n';
            else if(x-previous.end>Math.max(1,Math.abs(item.height)*0.2) && !/\s$/.test(pageText) && !/^\s/.test(item.str)) pageText+=' ';
          }
          pageText+=item.str;
          if(item.hasEOL)pageText+='\n';
          previous={y,end:x+item.width};
          if(text.length+pageText.length>LIMITS.text) throw new Error('Pro Seite sind maximal 50.000 Zeichen erlaubt.');
        }
        validateText(text+pageText);
      }
      // A page boundary is always a line boundary. No paragraph or hyphen joining.
      text+=pageText+(n<doc.numPages?'\n':'');validateText(text);page.cleanup();
    }
    if(!text.trim()) throw new Error('Kein nutzbarer Text in dieser PDF gefunden. Gescannte Seiten benötigen OCR; WhatChanged? bietet kein OCR.');
    return {text,pages:doc.numPages};
  }
  try {return await Promise.race([extract(),cancelled]);}
  catch(error) {
    if(error.name==='PasswordException' || /password|worker was destroyed/i.test(error.message)) throw new Error('Passwortgeschützte PDFs werden nicht unterstützt.');
    if(/InvalidPDF|UnknownError|MissingPDF/.test(error.name)) throw new Error('Diese PDF konnte nicht gelesen werden. Bitte eine gültige PDF mit Text verwenden.');
    throw error;
  } finally {clearTimeout(timer);signal.removeEventListener('abort',abort);if(task)await task.destroy();}
}
