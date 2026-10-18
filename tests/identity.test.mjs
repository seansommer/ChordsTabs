import test from 'node:test';
import assert from 'node:assert/strict';
import {credentials,normalizeNickname,messageKey,createMessageId,validateIdentity} from '../src/identity.js';
test('nickname normalization preserves meaningful distinctions',()=>{assert.equal(normalizeNickname('  SeAn  Music '),'sean music');assert.notEqual(normalizeNickname('Sean Music'),normalizeNickname('SeanMusic'));});
test('phrase accepts numbers, spaces, symbols and non-email values',()=>{for(const s of ['7','a','my music 123!','🎸 keep playing'])assert.doesNotThrow(()=>validateIdentity('Sean',s));assert.throws(()=>validateIdentity('Sean','   '));});
test('authentication is repeatable across apps; phrase case, spaces and project change the credential',async()=>{
 const a=await credentials('Sean','a private song 27!','demo-music');const b=await credentials(' SEAN ','a private song 27!','demo-music');assert.deepEqual(a,b);
 const c=await credentials('Sean','A private song 27!','demo-music');assert.equal(a.email,c.email);assert.notEqual(a.password,c.password);
 assert.notEqual(a.password,(await credentials('Sean','a private song 27! ','demo-music')).password);
 assert.notEqual(a.password,(await credentials('Sean','a private song 27!','another-project')).password);
 assert.match(a.email,/^[a-f0-9]{64}@users\.musiccenter\.invalid$/);assert.equal(a.password.length,68);
});
test('message IDs and recipient lookup keys are stable and separate',async()=>{const id=createMessageId();assert.match(id,/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16}$/);assert.equal(await messageKey(id,'Sean'),await messageKey(id.toLowerCase(),' SEAN '));assert.notEqual(await messageKey(id,'Sean'),await messageKey(id,'Sam'));});
