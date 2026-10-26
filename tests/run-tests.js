'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {PNG} = require('pngjs');
const jsQR = require('jsqr');
const analyzer = require('../js/analyzer.js');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }

test('normal-looking HTTPS URL has no configured warning signals', () => {
  const result=analyzer.analyzeUrl('https://example.com/account');
  assert.equal(result.error,undefined); assert.equal(result.score,0); assert.equal(result.key,'low');
});
test('HTTP URL flags an unencrypted connection', () => {
  const result=analyzer.analyzeUrl('http://example.com');
  assert.ok(result.signals.some(signal=>signal.key==='http')); assert.equal(result.score,18);
});
test('IP-address host and embedded @ both contribute signals', () => {
  const result=analyzer.analyzeUrl('http://login@192.0.2.4/sign-in');
  const keys=result.signals.map(signal=>signal.key); assert.ok(keys.includes('ip')); assert.ok(keys.includes('at')); assert.ok(keys.includes('http'));
});
test('message requesting an OTP is detected', () => {
  const result=analyzer.analyzeMessage('Please share the OTP verification code with support.');
  assert.ok(result.signals.some(signal=>signal.key==='otp')); assert.ok(result.score>=30);
});
test('urgent payment message flags pressure and payment', () => {
  const result=analyzer.analyzeMessage('Urgent: pay the invoice immediately or your account will be suspended.');
  const keys=result.signals.map(signal=>signal.key); assert.ok(keys.includes('urgency')); assert.ok(keys.includes('payment')); assert.ok(result.score>=25);
});
test('empty and invalid inputs return helpful errors', () => {
  assert.ok(analyzer.analyzeUrl('').error); assert.ok(analyzer.analyzeMessage('  ').error); assert.ok(analyzer.analyzeUrl('https://').error);
});
test('sample QR image decodes locally to its HTTPS URL', () => {
  const image=PNG.sync.read(fs.readFileSync(path.join(__dirname,'sample-url-qr.png')));
  const decoded=jsQR(new Uint8ClampedArray(image.data),image.width,image.height,{inversionAttempts:'attemptBoth'});
  assert.ok(decoded); assert.equal(decoded.data,'https://example.com/account');
  const result=analyzer.analyzeUrl(decoded.data); assert.equal(result.score,0);
});
console.log(`\n${passed} tests passed.`);
