/* Browser interface: submitted content stays in memory and is never added to history. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const resultEl = $('result');
  const STORAGE_KEY = 'trustnex-summary-v1';
  const labels = {url:'Link check', qr:'QR check', message:'Message check'};
  const riskAdvice = [
    'If this claims to be from a company, visit its official website by typing the address yourself.',
    'Contact the person or organization using a number or address you already know is genuine.',
    'Do not provide passwords, one-time codes or payment details in response to an unexpected request.'
  ];
  function getHistory() {
    try { const rows = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(rows) ? rows.slice(0,50) : []; }
    catch (_) { return []; }
  }
  function saveSummary(type, result) {
    const rows = getHistory();
    rows.unshift({type,score:result.score,category:result.key,time:Date.now()});
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0,50))); } catch (_) { /* Storage can be disabled; checking still works. */ }
    renderDashboard();
  }
  function renderDashboard() {
    const rows=getHistory();
    $('total-checks').textContent=rows.length;
    $('low-count').textContent=rows.filter(row=>row.category==='low').length;
    $('medium-count').textContent=rows.filter(row=>row.category==='medium').length;
    $('high-count').textContent=rows.filter(row=>row.category==='high').length;
    const list=$('history-list');
    if (!rows.length) { list.innerHTML='<div class="empty-state"><span>◷</span><p>Your recent check summaries will appear here.</p></div>'; return; }
    list.replaceChildren();
    rows.slice(0,8).forEach(row=>{
      const line=document.createElement('div'); line.className='history-row';
      const title=document.createElement('span');title.className='history-type';title.textContent=labels[row.type]||'Check';
      const score=document.createElement('span');score.className='history-score';score.textContent=`${Number(row.score)||0}/100`;
      const time=document.createElement('span');time.className='history-time';time.textContent=new Date(row.time).toLocaleString();
      const pill=document.createElement('span');pill.className=`history-pill pill-${row.category}`;pill.textContent=({low:'Fewer signs',medium:'Suspicious',high:'High risk'})[row.category]||'Summary';
      line.append(title,time,score,pill);list.append(line);
    });
  }
  function renderResult(result, type, extra) {
    resultEl.hidden=false;
    if (result.error) { resultEl.innerHTML=''; const message=document.createElement('p');message.className='error-text';message.setAttribute('role','alert');message.textContent=result.error;resultEl.append(message);return; }
    saveSummary(type,result);
    resultEl.innerHTML='';
    const head=document.createElement('div');head.className='result-head';
    const score=document.createElement('div');score.className=`result-score ${result.key}`;score.textContent=result.score;score.setAttribute('aria-label',`Risk score ${result.score} out of 100`);
    const title=document.createElement('div'); const heading=document.createElement('h3');heading.textContent=result.label;const sub=document.createElement('p');sub.textContent=`${labels[type]} · heuristic score ${result.score} / 100`;title.append(heading,sub);head.append(score,title);resultEl.append(head);
    if(extra){const found=document.createElement('div');found.className='qr-found';found.textContent=extra;resultEl.append(found);}
    const note=document.createElement('p');note.className='result-note';note.textContent=`${result.advice} This is an estimate based on visible patterns, not proof.`;resultEl.append(note);
    const signalTitle=document.createElement('p');signalTitle.className='result-actions';signalTitle.textContent=result.signals.length?'Signals that contributed to this score':'No configured warning patterns were detected';resultEl.append(signalTitle);
    if(result.signals.length){const ul=document.createElement('ul');ul.className='signal-list';result.signals.forEach(signal=>{const li=document.createElement('li');const b=document.createElement('b');b.textContent=`${signal.label} (+${signal.weight})`;const why=document.createElement('span');why.textContent=signal.why;li.append(b,why);ul.append(li);});resultEl.append(ul);}
    const actionTitle=document.createElement('p');actionTitle.className='result-actions';actionTitle.textContent='Practical next steps';resultEl.append(actionTitle);
    const steps=document.createElement('ol');steps.className='result-steps';riskAdvice.forEach(text=>{const li=document.createElement('li');li.textContent=text;steps.append(li);});resultEl.append(steps);
  }
  document.querySelectorAll('.tool-tab').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('.tool-tab').forEach(tab=>{const active=tab===button;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
    document.querySelectorAll('.tool-panel').forEach(panel=>{const active=panel.id===`panel-${button.dataset.panel}`;panel.hidden=!active;panel.classList.toggle('active',active);});
    resultEl.hidden=true;
  }));
  $('url-form').addEventListener('submit',event=>{event.preventDefault();const result=TrustnexAnalyzer.analyzeUrl($('url-input').value);$('url-error').textContent=result.error||'';if(!result.error)renderResult(result,'url');else {resultEl.hidden=true;}});
  $('message-form').addEventListener('submit',event=>{event.preventDefault();const result=TrustnexAnalyzer.analyzeMessage($('message-input').value);$('message-error').textContent=result.error||'';if(!result.error)renderResult(result,'message');else resultEl.hidden=true;});
  $('url-input').addEventListener('input',event=>{$('url-count').textContent=`${event.target.value.length} / 2048`; if(event.target.value.length>2048)event.target.value=event.target.value.slice(0,2048);});
  $('message-input').addEventListener('input',event=>{$('message-count').textContent=`${event.target.value.length} / 12000`;});
  document.querySelectorAll('[data-clear]').forEach(button=>button.addEventListener('click',()=>{$(button.dataset.clear).value='';$(button.dataset.clear).focus();$('url-count').textContent='0 / 2048';$('url-error').textContent='';resultEl.hidden=true;}));
  async function decodeFile(file) {
    $('qr-error').textContent='';
    if(!file)return;
    if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type)){ $('qr-error').textContent='Choose a PNG, JPG, WEBP or GIF image.';return; }
    if(file.size>10*1024*1024){$('qr-error').textContent='That image is over 10 MB. Choose a smaller image.';return;}
    try {
      const bitmap=await createImageBitmap(file);
      if(bitmap.width>5000||bitmap.height>5000){bitmap.close();$('qr-error').textContent='This image is very large. Resize it and try again.';return;}
      const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
      const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(bitmap,0,0);bitmap.close();
      const pixels=context.getImageData(0,0,canvas.width,canvas.height);
      const decoded=typeof jsQR==='function'?jsQR(pixels.data,pixels.width,pixels.height,{inversionAttempts:'attemptBoth'}):null;
      if(!decoded){$('qr-error').textContent='No readable QR code found. Try a sharper, well-lit image with the full code visible.';return;}
      const value=decoded.data.trim();
      if(/^https?:\/\//i.test(value)||/^[\w.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(value)){
        const analysis=TrustnexAnalyzer.analyzeUrl(value);
        $('qr-error').textContent=analysis.error||'';
        if(!analysis.error)renderResult(analysis,'qr',`Decoded address (not opened): ${value}`);
      } else {
        renderResult({score:0,key:'low',label:'QR code decoded',advice:'This QR code does not contain a web link. Review the decoded text carefully before using it.',signals:[]},'qr',`Decoded content (not executed): ${value.slice(0,1000)}`);
      }
    } catch (_) { $('qr-error').textContent='We could not read that image. Try another image format or a smaller file.'; }
  }
  $('qr-input').addEventListener('change',event=>decodeFile(event.target.files[0]));
  const drop=$('dropzone');
  ['dragenter','dragover'].forEach(name=>drop.addEventListener(name,event=>{event.preventDefault();drop.classList.add('dragover');}));
  ['dragleave','drop'].forEach(name=>drop.addEventListener(name,event=>{event.preventDefault();drop.classList.remove('dragover');}));
  drop.addEventListener('drop',event=>decodeFile(event.dataTransfer.files[0]));
  $('clear-history').addEventListener('click',()=>{try{localStorage.removeItem(STORAGE_KEY);}catch(_){}renderDashboard();});
  const toggle=$('menu-toggle'),nav=$('main-nav');
  toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open);});
  nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');}));
  renderDashboard();
})();
