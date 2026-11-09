#!/usr/bin/env node
/** Manual operator gateway, deliberately separated from browser/client application.
 * Do not place keys, CSIDs, passwords or signed XML in the frontend, Git or Google Sheets.
 */
import {readFile, writeFile} from 'node:fs/promises';
import {ZatcaClient, summarizeResponse} from './api-client.mjs';
const [action, payloadFile, outputFile] = process.argv.slice(2);
const allowed=['compliance-csid','compliance-check','production-csid','clearance','reporting'];
function usage() {console.error('Usage: node zatca/cli.mjs <'+allowed.join('|')+'> <input.json> <output.json>');process.exitCode=2;}
if (!allowed.includes(action) || !payloadFile || !outputFile) {usage();}
else {
 try {
  const environment=process.env.ZATCA_ENVIRONMENT || 'sandbox';
  const productionConfirmation=environment!=='production' || process.env.ZATCA_PRODUCTION_CONFIRMED === 'I_UNDERSTAND_THIS_SENDS_TO_ZATCA';
  const client = new ZatcaClient({environment,token:process.env.ZATCA_CSID_TOKEN,secret:process.env.ZATCA_CSID_SECRET,productionConfirmation});
  const input = JSON.parse(await readFile(payloadFile,'utf8'));
  // Caller must generate, sign, validate, and hash the UBL document with the official SDK.
  const result= action==='compliance-csid' ? await client.requestComplianceCsid(input)
    : action==='compliance-check' ? await client.complianceCheck(input)
    : action==='production-csid' ? await client.requestProductionCsid(input)
    : action==='clearance' ? await client.clearance(input)
    : await client.reporting(input);
  const summary={environment,...summarizeResponse(action,result)};
  // Onboarding responses contain security credentials: do not save them in general-purpose output files.
  if (action==='compliance-csid' || action==='production-csid') {
    summary.response={redacted:true,requestID:result.data?.requestID,disposition:result.ok?'Credentials returned; capture in a dedicated secret vault':'Request not accepted',errors:result.data?.errors};
    console.error('NOTE: Certificate and secret values are deliberately redacted in output. Store them via a dedicated secure vault, not source files.');
  }
  await writeFile(outputFile,JSON.stringify(summary,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(`ZATCA ${action}: HTTP ${result.httpStatus}; accepted=${summary.accepted}; environment=${environment}; result=${outputFile}`);
  if (!summary.accepted) process.exitCode=1;
 } catch(err) {console.error('ZATCA operation not completed:',err.message);process.exitCode=1;}
}
