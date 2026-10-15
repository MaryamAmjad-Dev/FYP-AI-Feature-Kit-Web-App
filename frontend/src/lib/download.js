import { extractErrorMessage } from './api';

/**
 * Ek hi jagah: browser download trigger karne ka tareeqa.
 *
 * data  : Blob, string, ya ArrayBuffer — jo bhi file banna hai
 * name  : suggested filename (browser override kar sakta hai)
 */
export function downloadBlob(data, name) {
  const file = data instanceof Blob ? data : new Blob([data]);
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Memory: the object URL is released the moment the click is dispatched.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * AI endpoints blob return karte hain; agar download se pehle error ho
 * (blob ke andar JSON hota hai) to ye useful message nikaal kar deta hai.
 * Normal success path par kuch nahi karta.
 */
export async function downloadAiBlob(promise, name) {
  try {
    downloadBlob(await promise, name);
  } catch (error) {
    alert(await extractErrorMessage(error));
  }
}
