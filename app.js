/* Browser controls and depth-tested paper lettering. No external dependencies. */
(() => {
  const $=s=>document.querySelector(s),canvas=$('#view'),ctx=canvas.getContext('2d');
  const time=$('#time'),play=$('#play'),stageSelect=$('#stage');
  const state={t:0,running:false,units:'in',zoom:1,rotation:[0,0,0,1],view:'top',last:0};
  const pointers=new Map();let gesture=null,replayEnd=null;
  const raster=document.createElement('canvas');
  const gl=raster.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:true});
  const labelNames=['MAIN BODY','FRONT / NOSE','REAR','RAIL','AIR FINS','AIR SCOOP','TAB'];
  const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=512;
  const ac=atlas.getContext('2d'),labelUV={};
  labelNames.forEach((text,i)=>{
    const top=i*64;ac.font='700 42px system-ui';ac.fillStyle='#fff';ac.textAlign='center';ac.textBaseline='middle';
    ac.fillText(text,512,top+32,980);const half=ac.measureText(text).width/2+5;labelUV[text]=[(512-half)/1024,top/512,(512+half)/1024,(top+64)/512];
  });
  let program,buffer,texture;
  function initGL(){
    const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
    program=gl.createProgram();
    gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec3 p;attribute vec3 c;attribute vec2 uv;varying vec3 color;varying vec2 tex;void main(){gl_Position=vec4(p,1.0);color=c;tex=uv;}'));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float;uniform sampler2D ink;varying vec3 color;varying vec2 tex;void main(){float a=tex.x<0.0?1.0:texture2D(ink,tex).a;if(a<0.02)discard;gl_FragColor=vec4(color,a);}'));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    buffer=gl.createBuffer();texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  }
  if(gl)initGL();
  raster.addEventListener('webglcontextlost',e=>{e.preventDefault();state.running=false;$('#graphicsStatus').textContent='Graphics paused. Waiting for the browser to restore the view.';updateUI();});
  raster.addEventListener('webglcontextrestored',()=>{initGL();$('#graphicsStatus').textContent='';render();});
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  function paint3D(pr,W,H,assemblyTime){
    if(!gl){paintFallback(pr);return;}
    if(gl.isContextLost())return;
    if(raster.width!==W||raster.height!==H){raster.width=W;raster.height=H;}
    gl.viewport(0,0,W,H);gl.clearColor(250/255,251/255,245/255,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
    for(const [name,size,offset] of [['p',3,0],['c',3,12],['uv',2,24]]){const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,32,offset);}
    const vertex=(p,c,uv=[-1,-1],bias=0)=>[p[0]/W*2-1,1-p[1]/H*2,-p[2]/60-bias,...c,...uv];
    const fill=[],edges=[],ink=[];
    for(const q of pr.polys){
      let col=rgb(q.color);
      if(q.id==='sheet')col=Skimmer.mix(col,[250/255,251/255,245/255],Skimmer.smooth(assemblyTime,5,7));
      for(let k=1;k<q.pts.length-1;k++)for(const p of [q.pts[0],q.pts[k],q.pts[k+1]])fill.push(...vertex(p,col));
      if(state.t>Skimmer.assemblyStart||q.id==='sheet')for(let k=0;k<q.pts.length;k++)for(const p of [q.pts[k],q.pts[(k+1)%q.pts.length]])edges.push(...vertex(p,q.id==='sheet'?[.66,.72,.68]:[.19,.32,.28],[-1,-1],.00002));
      for(const l of q.labels){
        const [u0,v0,u1,v1]=labelUV[l.text];
        const fit=Math.min(1,((u1-u0)*1024/64)*l.h/l.w);
        const p=[Skimmer.mix(l.pts[0],l.pts[1],(1-fit)/2),Skimmer.mix(l.pts[0],l.pts[1],(1+fit)/2),Skimmer.mix(l.pts[3],l.pts[2],(1+fit)/2),Skimmer.mix(l.pts[3],l.pts[2],(1-fit)/2)];
        // Print readable ink on both paper faces. The depth buffer hides covered lettering.
        const mirrored=(p[1][0]-p[0][0])*(p[3][1]-p[0][1])-(p[1][1]-p[0][1])*(p[3][0]-p[0][0])<0;
        const uv=mirrored?[[u0,v1],[u1,v1],[u1,v0],[u0,v0]]:[[u0,v0],[u1,v0],[u1,v1],[u0,v1]];
        for(const k of [0,1,2,0,2,3])ink.push(...vertex(p[k],[.10,.24,.21],uv[k],.000015));
      }
    }
    const draw=(vertices,mode)=>{gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);gl.drawArrays(mode,0,vertices.length/8);};
    draw(fill,gl.TRIANGLES);draw(edges,gl.LINES);draw(ink,gl.TRIANGLES);ctx.drawImage(raster,0,0);
  }
  function paintFallback(pr){
    $('#graphicsStatus').textContent='Basic 3D view · this browser has no WebGL.';
    for(const q of pr.polys){
      ctx.beginPath();q.pts.forEach((p,i)=>i?ctx.lineTo(...p.slice(0,2)):ctx.moveTo(...p.slice(0,2)));ctx.closePath();ctx.fillStyle=q.color;ctx.fill();ctx.strokeStyle=q.id==='sheet'?'#a8b8ad':'#476b5d';ctx.lineWidth=1;ctx.stroke();
      for(const l of q.labels){const [a,b,,d]=l.pts;ctx.save();ctx.transform((b[0]-a[0])/1024,(b[1]-a[1])/1024,(d[0]-a[0])/64,(d[1]-a[1])/64,a[0],a[1]);ctx.fillStyle='#193d34';ctx.font='700 42px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(l.text,512,32,980);ctx.restore();}
    }
  }
  function stroke(a,b,color,width=2,dashes=[]){ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dashes);ctx.stroke();ctx.setLineDash([]);}
  const dimensionInk='#9025e8',dimensionHalo='#fffdf7';
  function dimensionStroke(a,b,width,dpr){
    // A pale outline keeps the measurement distinct where it crosses drawn ink.
    stroke(a,b,dimensionHalo,(width+3)*dpr);
    stroke(a,b,dimensionInk,width*dpr);
  }
  function dimension(d,pr,dpr){
    const a=pr.point(d.a),b=pr.point(d.b),dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
    if(len<2*dpr)return;
    const u=[dx/len,dy/len],side=Math.sign(d.offset||28),n=[-u[1]*side,u[0]*side],offset=Math.abs(d.offset||28)*dpr;
    const aa=[a[0]+n[0]*offset,a[1]+n[1]*offset],bb=[b[0]+n[0]*offset,b[1]+n[1]*offset];
    // Leave room around the measured endpoints instead of painting over the ink.
    dimensionStroke([a[0]+n[0]*8*dpr,a[1]+n[1]*8*dpr],[aa[0]+n[0]*5*dpr,aa[1]+n[1]*5*dpr],1.6,dpr);
    dimensionStroke([b[0]+n[0]*8*dpr,b[1]+n[1]*8*dpr],[bb[0]+n[0]*5*dpr,bb[1]+n[1]*5*dpr],1.6,dpr);
    // On tiny offsets, put the arrowheads outside so they cannot merge together.
    const outside=len<18*dpr,extension=outside?12*dpr:0;
    dimensionStroke([aa[0]-u[0]*extension,aa[1]-u[1]*extension],[bb[0]+u[0]*extension,bb[1]+u[1]*extension],2.8,dpr);
    for(const [p,end] of [[aa,1],[bb,-1]]){
      const sign=end*(outside?-1:1);
      ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(p[0]+sign*u[0]*8*dpr+n[0]*4*dpr,p[1]+sign*u[1]*8*dpr+n[1]*4*dpr);ctx.lineTo(p[0]+sign*u[0]*8*dpr-n[0]*4*dpr,p[1]+sign*u[1]*8*dpr-n[1]*4*dpr);ctx.closePath();
      ctx.strokeStyle=dimensionHalo;ctx.lineWidth=3*dpr;ctx.stroke();ctx.fillStyle=dimensionInk;ctx.fill();
    }
    const text=Skimmer.measure(d.value,state.units);ctx.font=`700 ${13*dpr}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';
    const tw=ctx.measureText(text).width+14*dpr;
    const mx=Skimmer.clamp((aa[0]+bb[0])/2+n[0]*(tw/2+10*dpr),tw/2+4*dpr,canvas.width-tw/2-4*dpr),my=Skimmer.clamp((aa[1]+bb[1])/2+n[1]*18*dpr,18*dpr,canvas.height-35*dpr);
    return {text,mx,my,tw};
  }
  function dimensionLabel({text,mx,my,tw},dpr){
    ctx.font=`700 ${13*dpr}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle=dimensionHalo;ctx.beginPath();ctx.roundRect(mx-tw/2,my-12*dpr,tw,24*dpr,6*dpr);ctx.fill();ctx.fillStyle=dimensionInk;ctx.fillText(text,mx,my);
  }
  let cachedStage=-1,cachedUnits='';
  function updateUI(){
    const i=Skimmer.stageIndex(state.t),s=Skimmer.stages[i];
    if(i!==cachedStage||state.units!==cachedUnits){
      $('#stepNumber').textContent=`${s.group} · Step ${i+1} of ${Skimmer.stages.length}`;
      $('#stepTitle').textContent=s.title;$('#instruction').textContent=Skimmer.instruction(s,state.units);
      $('#measurement').replaceChildren(...(s.dimensions||[]).map(d=>{
        const row=document.createElement('div');row.className='measure-row';
        const label=document.createElement('span');label.className='measure-label';label.textContent=d.label;
        const value=document.createElement('strong');value.className='measure-value';value.textContent=Skimmer.measure(d.value,state.units);
        row.append(label,value);return row;
      }));
      stageSelect.value=i;cachedStage=i;cachedUnits=state.units;
      $('#drawChapter').classList.toggle('active',state.t<Skimmer.assemblyStart);$('#assembleChapter').classList.toggle('active',state.t>=Skimmer.assemblyStart);
      $('#drawChapter').setAttribute('aria-current',state.t<Skimmer.assemblyStart?'step':'false');$('#assembleChapter').setAttribute('aria-current',state.t>=Skimmer.assemblyStart?'step':'false');
    }
    time.value=state.t;$('#status').textContent=`${i+1} / ${Skimmer.stages.length}`;
    play.textContent=state.running?'Pause':'Play';$('#back').disabled=i===0;$('#next').disabled=i===Skimmer.stages.length-1;$('#replay').disabled=i===0;
    $('#zoomStatus').textContent=`${Math.round(state.zoom*100)}%`;
    $('#imperial').setAttribute('aria-pressed',state.units==='in');$('#metric').setAttribute('aria-pressed',state.units==='mm');
    $('#unitNote').textContent=state.units==='mm'?'Exact conversions · 1 in = 25.4 mm. The model stays the same size.':'Use the written dimensions, not the screen size.';
  }
  function render(){
    const bounds=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),W=Math.round(bounds.width*dpr),H=Math.round(bounds.height*dpr);
    if(!W||!H)return;
    if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
    ctx.fillStyle='#fafbf5';ctx.fillRect(0,0,W,H);
    const f=Skimmer.frame(state.t),s=Skimmer.stages[Skimmer.stageIndex(state.t)];
    const project=insetLeft=>Skimmer.projection(f.polys,{width:W,height:H,zoom:state.zoom,rotation:state.rotation,view:state.view,assemblyTime:f.assemblyTime,insetLeft});
    let pr=project(0);
    if(s.dimensions?.some(d=>d.gutter==='rear')){
      // Reserve actual text width outside the paper, including the wider metric label.
      ctx.font=`700 ${13*dpr}px system-ui`;
      const needed=ctx.measureText(Skimmer.measure(.5,state.units)).width+64*dpr;
      const left=p=>Math.min(...p.polys.flatMap(q=>q.pts.map(p=>p[0])));
      if(left(pr)<needed){
        // Find just enough room; keep as much paper visible as possible on laptops.
        let lo=0,hi=W*.45;
        for(let i=0;i<10;i++){
          const mid=(lo+hi)/2;
          if(left(project(mid))<needed)lo=mid;else hi=mid;
        }
        pr=project(hi);
      }
    }
    paint3D(pr,W,H,f.assemblyTime);
    const drawLine=l=>stroke(pr.point(l.a),pr.point(l.b),l.active?'#8655aa':'#294b40',(l.active?3.8:l.kind==='fold'?2.3:2.8)*dpr,l.kind==='fold'?[6*dpr,4*dpr]:[]);
    for(const l of f.lines)drawLine(l);
    // Paint all text last so another measurement cannot draw across a number.
    const dimensionLabels=(s.dimensions||[]).map(d=>dimension(d,pr,dpr)).filter(Boolean);
    const activeLine=f.lines.find(l=>l.active);
    if(activeLine)drawLine(activeLine);
    for(const label of dimensionLabels)dimensionLabel(label,dpr);
    if(activeLine){
      // The pencil tip remains visible even when a guide crosses a very short tab.
      const b=pr.point(activeLine.b);
      ctx.beginPath();ctx.arc(b[0],b[1],4.5*dpr,0,Math.PI*2);
      ctx.strokeStyle=dimensionHalo;ctx.lineWidth=3*dpr;ctx.stroke();ctx.fillStyle='#8655aa';ctx.fill();
    }
    updateUI();
  }
  function transitionView(next){if(state.t<=Skimmer.assemblyStart&&next>Skimmer.assemblyStart)state.view='iso';else if(state.t>Skimmer.assemblyStart&&next<Skimmer.assemblyStart)state.view='top';}
  function setTime(value){const next=Skimmer.clamp(Number(value)||0,0,Skimmer.duration);transitionView(next);state.t=next;render();}
  function stop(){state.running=false;replayEnd=null;}
  function seekStep(i){stop();setTime(Skimmer.stages[Skimmer.clamp(i,0,Skimmer.stages.length-1)].at);}
  function resetView(view){state.view=view;state.rotation=[0,0,0,1];state.zoom=1;render();}
  function setZoom(z){state.zoom=Skimmer.clamp(z,.45,4);render();}
  let group;
  Skimmer.stages.forEach((s,i)=>{if(!group||group.label!==s.group){group=document.createElement('optgroup');group.label=s.group;stageSelect.append(group);}const option=document.createElement('option');option.value=i;option.textContent=`${i+1} · ${s.title}`;group.append(option);});
  time.max=Skimmer.duration;
  play.onclick=()=>{if(state.t>=Skimmer.duration)state.t=0;state.running=!state.running;state.last=0;replayEnd=null;render();};
  time.oninput=()=>{stop();setTime(time.value);};stageSelect.onchange=()=>seekStep(Number(stageSelect.value));
  $('#next').onclick=()=>seekStep(Skimmer.stageIndex(state.t)+1);$('#back').onclick=()=>seekStep(Skimmer.stageIndex(state.t)-1);
  $('#replay').onclick=()=>{const i=Skimmer.stageIndex(state.t);if(!i)return;state.t=Skimmer.stages[i-1].at+1e-5;replayEnd=Skimmer.stages[i].at;state.running=true;state.last=0;render();};
  $('#reset').onclick=()=>{seekStep(0);resetView('top');};
  $('#camera').onclick=()=>resetView(state.t<=Skimmer.assemblyStart?'top':'iso');$('#top').onclick=()=>resetView('top');
  $('#drawChapter').onclick=()=>{seekStep(0);resetView('top');};$('#assembleChapter').onclick=()=>{seekStep(Skimmer.stages.findIndex(s=>s.type==='check'));resetView('iso');};
  $('#imperial').onclick=()=>{state.units='in';render();};$('#metric').onclick=()=>{state.units='mm';render();};
  $('#full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#app').requestFullscreen();}catch{$('#graphicsStatus').textContent='Use your browser’s full-screen option to enlarge the view.';}};
  document.addEventListener('fullscreenchange',()=>{$('#full').textContent=document.fullscreenElement?'Exit full screen ↙':'Full screen ↗';render();});
  const sphere=(x,y)=>{const b=canvas.getBoundingClientRect(),r=Math.min(b.width,b.height)*.48;let px=(x-b.left-b.width/2)/r,py=(y-b.top-b.height/2)/r;const d=px*px+py*py;return d<=1?[px,py,Math.sqrt(1-d)]:Skimmer.unit([px,py,0]);};
  const resetGesture=()=>{const p=[...pointers.values()];gesture=p.length===1?{point:sphere(p[0].x,p[0].y)}:p.length>=2?{distance:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y),zoom:state.zoom}:null;};
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;canvas.focus({preventScroll:true});pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);resetGesture();});
  canvas.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const p=[...pointers.values()];
    if(p.length>=2){const d=Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y);if(gesture.distance>0)setZoom(gesture.zoom*d/gesture.distance);}
    else if(gesture?.point){const point=sphere(e.clientX,e.clientY);state.rotation=Skimmer.unit(Skimmer.qmul(Skimmer.qbetween(gesture.point,point),state.rotation));gesture.point=point;render();}
  });
  function endPointer(e){pointers.delete(e.pointerId);resetGesture();}
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,endPointer);
  window.addEventListener('blur',()=>{pointers.clear();gesture=null;state.last=0;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();const factor=e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1;setZoom(state.zoom*Math.exp(-e.deltaY*factor*.0015));},{passive:false});
  canvas.addEventListener('keydown',e=>{
    const axes={ArrowLeft:[0,1,0],ArrowRight:[0,-1,0],ArrowUp:[1,0,0],ArrowDown:[-1,0,0]};
    if(axes[e.key]){e.preventDefault();const axis=axes[e.key],angle=.12;state.rotation=Skimmer.unit(Skimmer.qmul([...axis.map(v=>v*Math.sin(angle/2)),Math.cos(angle/2)],state.rotation));render();}
    else if(['+','=','-','_'].includes(e.key)){e.preventDefault();setZoom(state.zoom*(e.key==='-'||e.key==='_'?.9:1.1));}
    else if(e.key.toLowerCase()==='r'){e.preventDefault();$('#camera').click();}
  });
  document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','SELECT','BUTTON','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();play.click();}});
  document.addEventListener('visibilitychange',()=>{state.last=0;});
  function advance(seconds){
    let next=Math.min(Skimmer.duration,state.t+seconds*Number($('#speed').value));
    const boundary=Skimmer.stages.find(s=>s.at>state.t);
    if(replayEnd!==null&&next>=replayEnd){next=replayEnd;state.running=false;replayEnd=null;}
    else if($('#pauseSteps').checked&&boundary&&next>=boundary.at){next=boundary.at;state.running=false;}
    // The measurement check is a real stop even when continuous playback is selected.
    if(state.t<Skimmer.assemblyStart&&next>=Skimmer.assemblyStart){next=Skimmer.assemblyStart;state.running=false;}
    transitionView(next);state.t=next;if(state.t>=Skimmer.duration)state.running=false;render();
  }
  function tick(now){if(state.running&&state.last&&!document.hidden)advance(Math.min((now-state.last)/1000,.1));state.last=now;requestAnimationFrame(tick);}
  new ResizeObserver(render).observe(canvas);requestAnimationFrame(tick);render();
  window.setAnimationTime=value=>{stop();setTime(value);};window.renderAnimationFrame=window.setAnimationTime;
  // Deterministic inspection hooks for geometry/browser verification and classroom captures.
  window.SkimmerApp={state,seekStep,render,advance,resetView,getPointerCount:()=>pointers.size,hasWebGL:()=>!!gl&&!gl.isContextLost()};
})();
