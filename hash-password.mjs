// Run: node scripts/hash-password.mjs
// Never paste your password into the source file or commit USERS_JSON.
import {randomBytes,pbkdf2Sync} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
const rl=createInterface({input:process.stdin,output:process.stdout});
const password=await rl.question('Enter password to hash (input is visible): ');rl.close();
if(password.length<12){console.error('Use at least 12 characters.');process.exit(1)}
const salt=randomBytes(24).toString('base64url');
const hash=pbkdf2Sync(password,salt,210000,32,'sha256').toString('base64url');
console.log(JSON.stringify({password_salt:salt,password_hash:hash},null,2));
console.log('Put these fields in the user object in USERS_JSON. Do not include a plaintext password.');
