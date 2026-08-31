(function () {
"use strict";
const CONTENT_AAD="cabinet:maria-creative-path:content:v1";
const DRAFT_AAD="cabinet:maria-creative-path:draft:v1";
const encode = value => new TextEncoder().encode(value);
const decode64 = value => Uint8Array.from(atob(value),ch=>ch.charCodeAt(0));
function encode64(bytes) {
  let binary="";
  for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(binary);
}
async function openContent(password,payload,subtle) {
  if(payload.version!==1 || payload.algorithm!=="AES-256-GCM" ||
     payload.kdf!=="PBKDF2-SHA256" || payload.iterations!==600000 ||
     payload.aad!==CONTENT_AAD)throw new Error("Invalid payload");
  const salt=decode64(payload.salt),iv=decode64(payload.iv),data=decode64(payload.ciphertext);
  if(salt.length!==32 || iv.length!==12 || data.length<16)throw new Error("Invalid payload");
  const material=await subtle.importKey("raw",encode(password),"PBKDF2",false,["deriveKey"]);
  const key=await subtle.deriveKey({name:"PBKDF2",salt,iterations:payload.iterations,hash:"SHA-256"},
    material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
  const clear=await subtle.decrypt({name:"AES-GCM",iv,additionalData:encode(CONTENT_AAD),tagLength:128},key,data);
  const client=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(clear));
  if(client.id!=="maria-creative-path" || !Array.isArray(client.sections))throw new Error("Invalid content");
  return {key,client};
}
function createVault(key,cryptoApi,storage) {
  let writing=Promise.resolve();
  return Object.freeze({
    saveDraft(storageKey,text) {
      const operation=writing.catch(()=>{}).then(async()=>{
        const iv=cryptoApi.getRandomValues(new Uint8Array(12));
        const data=await cryptoApi.subtle.encrypt({name:"AES-GCM",iv,additionalData:encode(DRAFT_AAD),tagLength:128},key,encode(text));
        storage.setItem(storageKey,JSON.stringify({v:1,iv:encode64(iv),data:encode64(new Uint8Array(data))}));
      });
      writing=operation;
      return operation;
    },
    async clearDraft(storageKey) {
      await writing.catch(()=>{});
      storage.removeItem(storageKey);
    },
    async loadDraft(storageKey) {
      await writing.catch(()=>{});
      const raw=storage.getItem(storageKey);
      if(!raw)return null;
      const draft=JSON.parse(raw);
      if(draft.v!==1)throw new Error("Invalid draft");
      const iv=decode64(draft.iv);
      if(iv.length!==12)throw new Error("Invalid draft");
      const clear=await cryptoApi.subtle.decrypt({name:"AES-GCM",iv,additionalData:encode(DRAFT_AAD),tagLength:128},key,decode64(draft.data));
      return new TextDecoder("utf-8",{fatal:true}).decode(clear);
    }
  });
}
if(typeof document==="undefined") {
  window.cabinetTestHelpers={openContent,createVault};
  return;
}
const form=document.getElementById("unlock-form");
const input=document.getElementById("cabinet-password");
const button=document.getElementById("unlock-button");
const status=document.getElementById("unlock-status");
let busy=false;
form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(busy)return;
  if(!window.crypto || !window.crypto.subtle){status.textContent="Нужен современный браузер и безопасное соединение HTTPS.";return;}
  busy=true;button.disabled=true;input.disabled=true;
  status.textContent="Открываем кабинет…";
  let password=input.value;
  input.value="";
  try {
    const response=await fetch("./content.enc.json",{credentials:"omit",cache:"no-store"});
    if(!response.ok)throw new Error("Download failed");
    const payload=await response.json();
    const result=await openContent(password,payload,window.crypto.subtle);
    password="";
    window.clientData=result.client;
    window.cabinetVault=createVault(result.key,window.crypto,{
      setItem:(...args)=>window.localStorage.setItem(...args),
      getItem:(...args)=>window.localStorage.getItem(...args),
      removeItem:(...args)=>window.localStorage.removeItem(...args)
    });
    const script=document.createElement("script");
    script.src="./single-client.js?v=profile-2";
    await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=reject;document.body.appendChild(script);});
    document.getElementById("login-screen").remove();
    document.querySelector("h1")?.focus();
  } catch {
    delete window.clientData;
    delete window.cabinetVault;
    status.textContent="Не удалось открыть кабинет. Проверьте пароль и соединение с интернетом.";
    input.disabled=false;input.focus();
  } finally {
    password="";input.value="";busy=false;button.disabled=false;input.disabled=false;
  }
});
window.addEventListener("pageshow",event=>{if(event.persisted)window.location.reload();});
}());
