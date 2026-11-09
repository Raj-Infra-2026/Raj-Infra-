/** Invoice chaining calculations. Reserving sequence numbers requires durable atomic storage.
 * Not an issuance ledger. DO NOT derive ICV from Google Sheets row count or localStorage.
 */
import {createHash} from 'node:crypto';
export const GENESIS_PIH=Buffer.from(createHash('sha256').update('0').digest('hex'),'utf8').toString('base64');
export function sequenceForNext(previous){
 if(previous===null||previous===undefined)return {icv:1,pih:GENESIS_PIH};
 if(!Number.isSafeInteger(previous.icv)||previous.icv<1)throw Error('Invalid previous ICV');
 const hash=String(previous.invoiceHash||'');
 if(!/^[A-Za-z0-9+/]{43}=$/.test(hash)||Buffer.from(hash,'base64').length!==32)throw Error('Verified previous invoice binary SHA-256 hash required');
 return {icv:previous.icv+1,pih:hash};
}
export class InMemoryChainForTestsOnly{
 constructor(){this.records=new Map();}
 append(egsId,entry){
  if(!egsId||!entry?.invoiceHash||!entry?.uuid)throw Error('EGS, hash, UUID required');
  const previous=this.records.get(egsId)?.at(-1)??null;
  const next=sequenceForNext(previous);
  if(entry.icv!==next.icv||entry.pih!==next.pih)throw Error('Chain mismatch');
  const record=Object.freeze({...entry});
  this.records.set(egsId,[...(this.records.get(egsId)||[]),record]);
  return record;
 }
}
