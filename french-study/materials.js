'use strict';
/* Private files stay on this device. Read ZIP directories and inflate only a selected entry. */
(() => {
  const collections = new Map();
  const indexes = new WeakMap();
  let database;
  const db = () => {
    if (!('indexedDB' in window)) return Promise.reject(new Error('Device storage is unavailable.'));
    if (!database) database = new Promise((resolve, reject) => {
      const request = indexedDB.open('carnet-francais-local-v1',1);
      request.onupgradeneeded = () => {
        for (const s of ['archives','recordings']) request.result.createObjectStore(s);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {database=null;reject(request.error);};
    });
    return database;
  };
  async function transaction(store, mode, run) {
    const d=await db();
    return new Promise((resolve,reject)=>{
      const tx=d.transaction(store,mode);
      const request=run(tx.objectStore(store));
      tx.oncomplete=()=>resolve(request.result);
      tx.onerror=()=>reject(tx.error||request.error);
      tx.onabort=()=>reject(tx.error||new Error('Storage was interrupted.'));
    });
  }
  const text=new TextDecoder('utf-8');
  const cp437='ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';
  const decodeName=(bytes,utf)=>utf?text.decode(bytes):Array.from(bytes,b=>b<128?String.fromCharCode(b):cp437[b-128]).join('');
  async function directory(file) {
    if(indexes.has(file))return indexes.get(file);
    const tail=await file.slice(Math.max(0,file.size-65557)).arrayBuffer(), dv=new DataView(tail);
    let end=-1;
    for(let p=dv.byteLength-22;p>=0;p--)if(dv.getUint32(p,true)===0x06054b50 && p+22+dv.getUint16(p+20,true)===dv.byteLength){end=p;break;}
    if(end<0)throw Error('Choose the original ZIP archive.');
    const offset=dv.getUint32(end+16,true),size=dv.getUint32(end+12,true);
    if(size>12000000||offset+size>file.size)throw Error('This archive has an unsupported directory.');
    const buf=await file.slice(offset,offset+size).arrayBuffer(), dir=new DataView(buf), names=new Map();
    let p=0;
    while(p+46<=dir.byteLength && dir.getUint32(p,true)===0x02014b50) {
      const flags=dir.getUint16(p+8,true),method=dir.getUint16(p+10,true),compressed=dir.getUint32(p+20,true),bytes=dir.getUint32(p+24,true);
      const n=dir.getUint16(p+28,true),x=dir.getUint16(p+30,true),c=dir.getUint16(p+32,true),start=dir.getUint32(p+42,true);
      if(p+46+n+x+c>dir.byteLength)throw Error('The ZIP directory is incomplete.');
      const path=decodeName(new Uint8Array(buf,p+46,n),!!(flags&2048));
      if(!path.endsWith('/'))names.set(path.normalize('NFC'),{start,compressed,bytes,method});
      p+=46+n+x+c;
    }
    indexes.set(file,names);return names;
  }
  async function attach(key,file,expectedPath) {
    const entries=await directory(file);
    if(!entries.has(expectedPath.normalize('NFC')))throw Error('This ZIP does not contain the selected course book. Choose its matching archive.');
    collections.set(key,file);
    try {await transaction('archives','readwrite',s=>s.put(file,key));return true;}catch{return false;}
  }
  async function restore(){
    try {
      const keys=await transaction('archives','readonly',s=>s.getAllKeys());
      await Promise.all(keys.map(async k=>{const f=await transaction('archives','readonly',s=>s.get(k));if(f instanceof Blob)collections.set(k,f);}));
    }catch{/* Reading and temporary imports still work. */}
  }
  async function member(key,path) {
    const file=collections.get(key);
    if(!file)throw Error('Attach this course archive first.');
    const entry=(await directory(file)).get(path.normalize('NFC'));
    if(!entry)throw Error('This file is missing from the attached ZIP.');
    const view=new DataView(await file.slice(entry.start,entry.start+30).arrayBuffer());
    if(view.getUint32(0,true)!==0x04034b50)throw Error('The ZIP entry is damaged.');
    const offset=entry.start+30+view.getUint16(26,true)+view.getUint16(28,true);
    const data=file.slice(offset,offset+entry.compressed);
    const mime=/\.pdf$/i.test(path)?'application/pdf':'audio/mpeg';
    let blob;
    if(entry.method===0)blob=data;
    else if(entry.method===8 && typeof DecompressionStream!=='undefined'){
      try {blob=await new Response(data.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();}
      catch {blob=null;}
    }
    if(!blob && entry.method===8 && window.pako)blob=new Blob([window.pako.inflateRaw(new Uint8Array(await data.arrayBuffer()))]);
    if(!blob)throw Error('This browser cannot open the ZIP entry. Use the extracted PDF or MP3 directly.');
    if(blob.size!==entry.bytes)throw Error('This ZIP entry is incomplete.');
    return new Blob([blob],{type:mime});
  }
  window.BookFiles={restore,attach,member,has:key=>collections.has(key),
      remove:async key=>{await transaction('archives','readwrite',s=>s.delete(key));collections.delete(key);},
      saveRecording:(id,blob)=>transaction('recordings','readwrite',s=>s.put(blob,id)),
      getRecording:id=>transaction('recordings','readonly',s=>s.get(id))};
})();
