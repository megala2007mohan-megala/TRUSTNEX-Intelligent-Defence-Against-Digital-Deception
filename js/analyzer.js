/* TRUSTNEX rule-based engine. It never fetches, opens or submits an analyzed URL. */
(function (root) {
  'use strict';
  const SHORTENERS = new Set(['bit.ly','t.co','tinyurl.com','is.gd','ow.ly','buff.ly','rebrand.ly','cutt.ly','shorturl.at','lnkd.in','rb.gy']);
  const SIGNALS = {
    http: {label:'Unencrypted HTTP connection', weight:18, why:'The connection is not encrypted in transit, so information exchanged with the site may be exposed.'},
    ip: {label:'IP address used instead of a domain', weight:22, why:'Direct IP links are less typical for public services and can make the destination harder to verify.'},
    at: {label:'@ symbol in the address', weight:24, why:'Browsers interpret text before @ as sign-in information; it can disguise the host that follows.'},
    punycode: {label:'Punycode domain encoding', weight:20, why:'Encoded domain names can visually resemble another language’s characters or a familiar brand.'},
    longhost: {label:'Unusually long hostname', weight:12, why:'A long hostname is harder to read and inspect, though length alone does not prove abuse.'},
    subdomains: {label:'Several nested subdomains', weight:12, why:'Extra subdomain layers can bury the actual registered domain in a link.'},
    shortener: {label:'Known link-shortening service', weight:16, why:'Shortened links conceal their final destination until opened.'},
    port: {label:'Unusual destination port', weight:12, why:'A nonstandard web port is less common and deserves extra scrutiny.'},
    longurl: {label:'Very long URL', weight:8, why:'Long addresses can hide paths or make the true destination difficult to review.'},
    urgency: {label:'Urgent or threatening language', weight:18, why:'Artificial deadlines and threats are commonly used to pressure people into acting quickly.'},
    credential: {label:'Password or sign-in request', weight:25, why:'Unexpected requests to enter passwords can be an attempt to steal account credentials.'},
    otp: {label:'One-time passcode requested', weight:30, why:'A legitimate support agent should not ask you to share an OTP or verification code.'},
    payment: {label:'Payment or money transfer requested', weight:20, why:'Unexpected payment demands, especially with a deadline, are a common scam pattern.'},
    reward: {label:'Prize, reward or unexpected refund', weight:17, why:'Unsolicited rewards are often used to lure people into sharing information or paying fees.'},
    verify: {label:'Account verification pressure', weight:17, why:'An unexpected account warning may lead to a fake login page or credential request.'},
    attachment: {label:'Unexpected attachment or download prompt', weight:14, why:'Unsolicited files can contain malware or lead to unsafe downloads.'},
    contact: {label:'Requests secrecy or unusual contact', weight:14, why:'Scammers may isolate you from trusted people or direct replies to an unverified channel.'}
  };
  function risk(score) {
    if (score >= 55) return {key:'high', label:'High Risk Signals', advice:'Avoid clicking, replying, downloading or paying. Verify independently using a contact method you already trust.'};
    if (score >= 25) return {key:'medium', label:'Suspicious Signals', advice:'Pause before acting. Check the sender and destination through an official channel you find independently.'};
    return {key:'low', label:'Fewer Warning Signs', advice:'No strong signals from these limited checks. This is not proof that the content or sender is safe; continue to verify.'};
  }
  function scoreSignals(signals) {
    const score = Math.min(100, signals.reduce((sum, signal) => sum + signal.weight, 0));
    return {score, ...risk(score), signals};
  }
  function add(list, key) { if (!list.some(item => item.key === key)) list.push({key, ...SIGNALS[key]}); }
  function analyzeUrl(input) {
    const raw = String(input ?? '').trim();
    if (!raw) return {error:'Enter a URL to check.'};
    if (raw.length > 2048) return {error:'This URL is too long. Please enter one under 2,048 characters.'};
    if(/[\u0000-\u0020\u007f]/.test(raw)) return {error:'The URL contains spaces or control characters. Copy the link address and try again.'};
    const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : 'https://' + raw;
    let url;
    try { url = new URL(candidate); } catch (_) { return {error:'That does not look like a valid web address. Check it and try again.'}; }
    if (!['http:','https:'].includes(url.protocol)) return {error:'Only HTTP and HTTPS web addresses can be checked.'};
    if (!url.hostname || url.hostname.includes('%')) return {error:'We could not read the hostname. Check the address and try again.'};
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    const signals = [];
    if (url.protocol === 'http:') add(signals,'http');
    if (url.username || url.password || raw.includes('@')) add(signals,'at');
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || /^\[[\da-f:]+\]$/i.test(host)) add(signals,'ip');
    if (host.split('.').some(part => part.startsWith('xn--'))) add(signals,'punycode');
    if (host.length > 40) add(signals,'longhost');
    const labels = host.split('.');
    if (!/^\[[\da-f:]+\]$/i.test(host) && labels.length > 4) add(signals,'subdomains');
    if (SHORTENERS.has(host)) add(signals,'shortener');
    if (url.port && !['80','443'].includes(url.port)) add(signals,'port');
    if (raw.length > 120) add(signals,'longurl');
    const result = scoreSignals(signals);
    result.normalizedUrl = url.href;
    return result;
  }
  function analyzeMessage(input) {
    const text = String(input ?? '').trim();
    if (!text) return {error:'Paste a message to check.'};
    if (text.length > 12000) return {error:'This message is too long. Please keep it under 12,000 characters.'};
    const rules = [
      ['urgency',/\b(urgent|immediately|act now|final warning|last chance|expire[sd]? today|within\s+\d+\s+hours?|suspended|locked|legal action|limited time|asap|right away)\b/i],
      ['otp',/\b(otp|one[- ]time (?:password|passcode|code)|verification code|security code|2fa code)\b/i],
      ['credential',/\b(password|passphrase|login credentials|sign[ -]?in details|enter your credentials|reset your password)\b/i],
      ['payment',/\b(pay(?:ment)?|wire transfer|bank transfer|gift cards?|crypto(?:currency)?|bitcoin|transfer (?:the )?money|pay the fee|processing fee|invoice|refund fee)\b/i],
      ['reward',/\b(prize|winner|won|reward|free gift|claim your|cashback|lottery|inheritance|unexpected refund)\b/i],
      ['verify',/\b(verify your (?:account|identity|details)|account (?:suspended|locked|on hold)|confirm your (?:account|identity)|unusual sign[ -]?in|security alert)\b/i],
      ['attachment',/\b(open|download|enable macros?|install)\b.{0,40}\b(attachment|file|document|app|software)\b|\b(attachment|file)\b.{0,35}\b(open|download|enable)\b/i],
      ['contact',/\b(keep this (?:secret|confidential)|don't tell|do not tell|reply only to|whatsapp me|telegram me|personal account)\b/i]
    ];
    const signals=[];
    rules.forEach(([key,pattern]) => { if(pattern.test(text)) add(signals,key); });
    return scoreSignals(signals);
  }
  const api = {analyzeUrl, analyzeMessage, risk, signals:SIGNALS};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TrustnexAnalyzer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
