(() => {
  'use strict';
  const $ = id => document.getElementById(id), canvas = $('game'), ctx = canvas.getContext('2d');
  const W = 400, H = 700, clamp = (v,a,b)=>Math.max(a,Math.min(b,v)), rand=(a,b)=>a+Math.random()*(b-a);
  let state='ready', last=0, elapsed=0, score=0, spawn=0, shot=0, pickupClock=0, spread=0, slow=0, shield=false, invulnerable=0, toastTime=0;
  let rocks=[], bullets=[], particles=[], pickups=[], pointer=null, keys=new Set(), best=0, sound=false, audio;
  try { best=Number(localStorage.getItem('asteroid-alley-best'))||0; sound=localStorage.getItem('asteroid-alley-sound')==='true'; } catch {}
  const ship={x:W/2,y:H-105}, stars=Array.from({length:75},()=>({x:rand(0,W),y:rand(0,H),z:rand(.3,1.2)}));
  const format=n=>String(Math.floor(n)).padStart(5,'0');
  $('best').textContent=format(best);
  function soundLabel(){ $('sound').textContent=sound?'SOUND ON':'SOUND OFF'; $('sound').setAttribute('aria-pressed',String(sound)); $('sound').setAttribute('aria-label',sound?'Mute sound':'Enable sound'); }
  soundLabel();
  function beep(freq=440,duration=.08,type='square',volume=.04){if(!sound)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.5,audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}
  $('sound').onclick=()=>{sound=!sound;soundLabel();try{localStorage.setItem('asteroid-alley-sound',String(sound));}catch{}beep(700,.12,'sine');};
  function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);}
  new ResizeObserver(resize).observe(canvas);
  function announce(text){$('toast').textContent=text;toastTime=1.7;}
  function burst(x,y,color,count=14){for(let i=0;i<count;i++)particles.push({x,y,vx:rand(-120,120),vy:rand(-120,120),life:rand(.2,.65),color});}
  function asteroid(x=rand(25,W-25),y=-45,r=rand(22,36),vx=rand(-24,24),vy=rand(85,125)+elapsed*1.5){return{x,y,r,vx,vy,hp:r>21?2:1,rotation:rand(0,6),spin:rand(-1,1),shape:Array.from({length:9},()=>rand(.72,1))};}
  function start(){state='playing';elapsed=score=spawn=shot=pickupClock=spread=slow=invulnerable=toastTime=0;shield=false;rocks=[];bullets=[];particles=[];pickups=[];pointer=null;keys.clear();ship.x=W/2;ship.y=H-105;$('overlay').classList.add('hidden');$('pause').disabled=false;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause game');$('score').textContent=format(0);$('toast').textContent='';$('effects').replaceChildren();last=performance.now();beep(500,.18,'sine');}
  function overlay(kind){$('overlay').classList.remove('hidden');$('instructions').style.display='none';$('tip').textContent=kind==='paused'?'Your flight is waiting.':'Drag to dodge. Pickups turn the tide.';$('eyebrow').textContent=kind==='paused'?'FLIGHT ON HOLD':'SIGNAL LOST / TRY AGAIN';$('title').innerHTML=kind==='paused'?'TAKE A<br><em>BREATHER</em>':'NICE<br><em>FLIGHT.</em>';$('message').innerHTML=kind==='paused'?'Ready when you are.':`SCORE ${format(score)}<br>PERSONAL BEST ${format(best)}`;$('start').innerHTML=kind==='paused'?'RESUME FLIGHT <span>↗</span>':'FLY AGAIN <span>↗</span>';}
  function pause(){if(state!=='playing')return;state='paused';pointer=null;keys.clear();overlay('paused');$('pause').textContent='▶';$('pause').setAttribute('aria-label','Resume game');}
  function resume(){if(state!=='paused')return;state='playing';last=performance.now();$('overlay').classList.add('hidden');$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause game');}
  function end(){state='over';pointer=null;keys.clear();burst(ship.x,ship.y,'#b5fc6c',35);beep(110,.35,'sawtooth');if(score>best){best=Math.floor(score);try{localStorage.setItem('asteroid-alley-best',String(best));}catch{}$('best').textContent=format(best);}$('pause').disabled=true;overlay('over');}
  $('start').onclick=()=>state==='paused'?resume():start();$('pause').onclick=()=>state==='playing'?pause():resume();
  // Focus can change while a mobile page is still visible and being touched.
  // Only a genuine lifecycle transition should interrupt an active flight.
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  window.addEventListener('pagehide',pause);
  window.addEventListener('blur',()=>{keys.clear();});
  window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Escape','a','d','w','s'].includes(e.key)){e.preventDefault();if(e.key==='Escape'||e.key===' '){if(e.repeat)return;state==='playing'?pause():state==='paused'?resume():start();}else keys.add(e.key);}});window.addEventListener('keyup',e=>keys.delete(e.key));
  function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
  canvas.addEventListener('pointerdown',e=>{if(state!=='playing'||pointer)return;canvas.setPointerCapture(e.pointerId);const p=point(e);pointer={id:e.pointerId,x:p.x,y:p.y};});
  canvas.addEventListener('pointermove',e=>{if(state!=='playing'||!pointer||pointer.id!==e.pointerId)return;const p=point(e);ship.x=clamp(ship.x+p.x-pointer.x,18,W-18);ship.y=clamp(ship.y+p.y-pointer.y,115,H-35);pointer.x=p.x;pointer.y=p.y;});
  const release=e=>{if(pointer?.id===e.pointerId)pointer=null;};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
  function update(dt){
    for(const s of stars){s.y=(s.y+dt*22*s.z)%H;}
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0);
    if(state!=='playing')return;
    elapsed+=dt;score+=dt*5;spread=Math.max(0,spread-dt);slow=Math.max(0,slow-dt);invulnerable=Math.max(0,invulnerable-dt);toastTime=Math.max(0,toastTime-dt);if(!toastTime)$('toast').textContent='';
    const dx=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0),dy=(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0);ship.x=clamp(ship.x+dx*280*dt,18,W-18);ship.y=clamp(ship.y+dy*280*dt,115,H-35);
    spawn-=dt;if(spawn<=0){rocks.push(asteroid());spawn=Math.max(.25,1.05-elapsed*.008);}
    shot-=dt;if(shot<=0){for(const vx of spread>0?[-105,0,105]:[0])bullets.push({x:ship.x,y:ship.y-20,vx,vy:-550});shot=.18;beep(800,.025,'triangle',.015);}
    pickupClock+=dt;if(pickupClock>=9){pickupClock=0;pickups.push({x:rand(35,W-35),y:-20,type:['spread','shield','slow'][Math.floor(Math.random()*3)]});}
    const factor=slow>0?.42:1;
    for(const b of bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;}
    for(const a of rocks){a.x+=a.vx*dt*factor;a.y+=a.vy*dt*factor;a.rotation+=a.spin*dt*factor;if(a.x<a.r&&a.vx<0||a.x>W-a.r&&a.vx>0)a.vx*=-1;
      for(const b of bullets){if(b.dead||a.dead)continue;if(Math.hypot(a.x-b.x,a.y-b.y)<a.r+3){b.dead=true;a.hp--;burst(b.x,b.y,'#ffca83',4);if(a.hp<=0){a.dead=true;score+=a.r>21?35:20;burst(a.x,a.y,'#ffa76c');beep(150,.07,'sawtooth',.03);if(a.r>21){rocks.push(asteroid(a.x-8,a.y,13,-65,a.vy*1.15),asteroid(a.x+8,a.y,13,65,a.vy*1.15));}}}}
      if(!a.dead&&invulnerable<=0&&Math.hypot(a.x-ship.x,a.y-ship.y)<a.r+10){if(shield){shield=false;invulnerable=1.5;a.dead=true;burst(a.x,a.y,'#7fe7ef',22);announce('SHIELD SAVED YOU');beep(400,.2,'sine');}else{end();break;}}
    }
    bullets=bullets.filter(b=>!b.dead&&b.y>-20&&b.x>-20&&b.x<W+20);rocks=rocks.filter(a=>!a.dead&&a.y<H+60);
    for(const p of pickups){p.y+=85*dt*factor;if(Math.hypot(p.x-ship.x,p.y-ship.y)<29){p.dead=true;if(p.type==='spread'){spread=10;announce('SPREAD SHOT · 10 SECONDS');}if(p.type==='shield'){shield=true;announce('SHIELD · ONE FREE HIT');}if(p.type==='slow'){slow=5;announce('SLOW-TIME · 5 SECONDS');}beep(1000,.2,'sine');burst(p.x,p.y,'#7fe7ef');}}
    pickups=pickups.filter(p=>!p.dead&&p.y<H+30);$('score').textContent=format(score);
    $('effects').innerHTML=(shield?'<span>◇ SHIELD</span>':'')+(spread>0?`<span>✦ SPREAD ${Math.ceil(spread)}s</span>`:'')+(slow>0?`<span>◷ SLOW ${Math.ceil(slow)}s</span>`:'');
  }
  function draw(){ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.fillStyle='#0b1229';ctx.fillRect(0,0,W,H);for(const s of stars){ctx.fillStyle=`rgba(160,192,230,${s.z*.5})`;ctx.fillRect(s.x,s.y,s.z*1.5,s.z*3);}ctx.strokeStyle='#1b2b46';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(28,0);ctx.lineTo(28,H);ctx.moveTo(W-28,0);ctx.lineTo(W-28,H);ctx.stroke();
    for(const a of rocks){ctx.save();ctx.translate(a.x,a.y);ctx.rotate(a.rotation);ctx.beginPath();a.shape.forEach((v,i)=>{let t=i/9*Math.PI*2;ctx.lineTo(Math.cos(t)*a.r*v,Math.sin(t)*a.r*v);});ctx.closePath();ctx.fillStyle=a.hp===1&&a.r>21?'#503b42':'#26354b';ctx.strokeStyle='#a7b2c1';ctx.lineWidth=2;ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(-a.r*.2,-a.r*.1,a.r*.22,0,7);ctx.strokeStyle='#617087';ctx.stroke();ctx.restore();}
    for(const b of bullets){ctx.fillStyle='#b5fc6c';ctx.shadowColor='#b5fc6c';ctx.shadowBlur=8;ctx.fillRect(b.x-2,b.y-9,4,16);}ctx.shadowBlur=0;
    for(const p of pickups){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.sin(elapsed*3)*.1);ctx.fillStyle='#123643';ctx.strokeStyle='#7fe7ef';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-14,-14,28,28,6);ctx.fill();ctx.stroke();ctx.fillStyle='#b5fc6c';ctx.font='bold 20px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText({spread:'✦',shield:'◇',slow:'◷'}[p.type],0,1);ctx.restore();}
    for(const p of particles){ctx.globalAlpha=Math.min(1,p.life*3);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3);}ctx.globalAlpha=1;
    if(state!=='over'){ctx.save();ctx.translate(ship.x,ship.y);if(invulnerable>0&&Math.floor(elapsed*12)%2)ctx.globalAlpha=.35;if(shield){ctx.strokeStyle='#7fe7ef';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,26,0,7);ctx.stroke();}ctx.fillStyle='#ffac72';ctx.beginPath();ctx.moveTo(-6,13);ctx.lineTo(0,25+Math.sin(elapsed*35)*5);ctx.lineTo(6,13);ctx.fill();ctx.fillStyle='#ecf3ff';ctx.strokeStyle='#76a6c0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-20);ctx.lineTo(15,14);ctx.lineTo(0,9);ctx.lineTo(-15,14);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#7fe7ef';ctx.fillRect(-3,-7,6,10);ctx.restore();}
    if(slow>0){ctx.strokeStyle='#7fe7ef66';ctx.lineWidth=4;ctx.strokeRect(2,2,W-4,H-4);}
  }
  function frame(now){const dt=Math.min(.033,Math.max(0,(now-last)/1000));last=now;update(dt);draw();requestAnimationFrame(frame);}resize();requestAnimationFrame(frame);
  // Read-only diagnostics for automated lifecycle checks. No gameplay cheats.
  window.asteroidAlley=Object.freeze({snapshot:()=>({state,score:Math.floor(score),best,elapsed,ship:{...ship},rocks:rocks.length,bullets:bullets.length,pickups:pickups.length,spread,slow,shield})});
})();
