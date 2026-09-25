/* DM Skimmer Studio. Geometry uses inches; display units never change the model. */
const Skimmer = (() => {
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const ease = v => (v = clamp(v), v * v * (3 - 2 * v));
  const smooth = (t, a, b) => ease((t - a) / (b - a));
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const mul = (a, k) => a.map(v => v * k);
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const dot = (a, b) => a.reduce((s, v, i) => s + v*b[i], 0);
  const unit = a => mul(a, 1 / (Math.hypot(...a) || 1));
  const rx = (p, a) => [p[0],p[1]*Math.cos(a)-p[2]*Math.sin(a),p[1]*Math.sin(a)+p[2]*Math.cos(a)];
  const ry = (p, a) => [p[0]*Math.cos(a)+p[2]*Math.sin(a),p[1],-p[0]*Math.sin(a)+p[2]*Math.cos(a)];
  const rect = (x0, x1, y0, y1, z = 0) => [[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z]];
  const colors = {body:'#72c9c1',fin:'#f1c476',scoop:'#bba1df',sheet:'#fffdf5'};
  function measure(n, units = 'in') {
    if (units === 'mm') return `${Number((n * 25.4).toFixed(3))} mm`;
    const whole = Math.floor(n), eighths = Math.round((n - whole) * 8);
    const fractions = ['', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8'];
    if (eighths === 8) return `${whole + 1} in`;
    return `${whole || !eighths ? whole : ''}${whole && eighths ? ' ' : ''}${fractions[eighths]} in`;
  }
  const drawing = [];
  function line(group, title, a, b, kind, instruction, dimensions) {
    drawing.push({group, title, a:[...a,0], b:[...b,0], kind, instruction,
      dimensions: dimensions || [{a:[...a,0], b:[...b,0], value:Math.hypot(a[0]-b[0],a[1]-b[1])}]});
  }
  const M = n => `{${n}}`;
  const dimension = (label, a, b, offset = 28) => ({label,a:[...a,0],b:[...b,0],
    value:Math.hypot(a[0]-b[0],a[1]-b[1]),offset});
  const bodyDimensions = () => [
    dimension('Body length',[0,-2],[11,-2],-30),
    dimension('Body width',[11,-2],[11,2],-30)
  ];
  line('Main body','Draw the first long edge',[0,-2],[11,-2],'cut',`Start at ruler zero. Draw ${M(11)} along a straight edge of the paper.`,bodyDimensions());
  line('Main body','Draw the front edge',[11,-2],[11,2],'cut',`Make a square corner. Draw ${M(4)} across the paper.`,bodyDimensions());
  line('Main body','Draw the other long edge',[11,2],[0,2],'cut',`Draw ${M(11)} parallel to the first line. Keep the body ${M(4)} wide.`,bodyDimensions());
  line('Main body','Close the rear edge',[0,2],[0,-2],'cut',`Join the two long edges with a ${M(4)} line. This short end is the REAR.`,bodyDimensions());
  for (const side of [-1,1]) {
    const y=side*1.5;
    const railInset = () => ({...dimension('From long edge',[0,side*2],[0,y],-side*28),gutter:'rear'});
    line('Main body',`Mark ${side<0?'first':'second'} rear slit`,[0,y],[3,y],'cut',`At the REAR, measure ${M(.5)} inward from this long edge. From that mark, draw a solid line ${M(3)} long toward the front. This short section will be cut.`,[dimension('Slit length',[0,y],[3,y],-side*32),railInset()]);
    line('Main body',`Mark ${side<0?'first':'second'} rail fold`,[3,y],[11,y],'fold',`From the end of the rear slit, continue straight toward the front with a dashed fold line ${M(8)} long. Keep it ${M(.5)} from the long edge.`,[
      railInset(),
      dimension('From rear',[0,y],[3,y],-side*32),
      dimension('Fold line length',[3,y],[11,y],-side*32)
    ]);
  }
  line('Main body','Mark the rear panel hinge',[3,-1.5],[3,1.5],'fold',`Join the ends of the two slits with a dashed line. This is a fold, not another cut.`,[dimension('From rear',[0,-1.5],[3,-1.5],-32),dimension('Panel width',[3,-1.5],[3,1.5],-32)]);
  const fp=[[0,0,0],[3,0,0],[3,.5,0],[.5,3,0],[0,3,0]];
  for (const j of [0,1]) {
    const x=j*3.4,y=2.6, group=`Air fins ${j+1} of 2`;
    const base = () => dimension('Base length',[x,y],[x+3,y],-28);
    const height = () => dimension('Height from base',[x,y],[x,y+3],28);
    const front = () => dimension('Short front edge',[x+3,y],[x+3,y+.5],-28);
    const top = () => dimension('Short top edge',[x,y+3],[x+.5,y+3],28);
    line(group,'Draw the air fin base',[x,y],[x+3,y],'cut',`Leave a little space beside the body. Draw a ${M(3)} base.`,[base(),height()]);
    line(group,'Draw the short front edge',[x+3,y],[x+3,y+.5],'cut',`At the FRONT end of this air fin, draw a perpendicular ${M(.5)} line.`,[front(),base()]);
    line(group,'Draw the tall rear edge',[x,y],[x,y+3],'cut',`At the other end of the base, draw a perpendicular ${M(3)} line.`,[height(),base()]);
    line(group,'Draw the short top edge',[x,y+3],[x+.5,y+3],'cut',`From the tall edge, draw ${M(.5)} parallel to the base.`,[top(),height()]);
    line(group,'Join the two short edges',[x+.5,y+3],[x+3,y+.5],'cut','Join the ends with a diagonal. Use the two measured endpoints; do not guess the slope.',[top(),front()]);
  }
  const centerDimensions = () => [
    dimension('Center length',[8,3],[11,3],-28),
    dimension('Center width',[8,3],[8,6],28)
  ];
  line('Air scoop','Draw the air scoop front',[11,3],[11,6],'cut',`In the remaining space, draw ${M(3)}. This is the narrow FRONT end of the air scoop center.`,centerDimensions());
  line('Air scoop','Draw the first center fold',[11,6],[8,6],'fold',`Draw a perpendicular dashed line ${M(3)} long. This edge will fold; it will not be cut.`,centerDimensions());
  line('Air scoop','Draw the air scoop rear',[8,6],[8,3],'cut',`Draw ${M(3)} parallel to the front edge.`,centerDimensions());
  line('Air scoop','Close the center square',[8,3],[11,3],'fold',`Close the ${M(3)} by ${M(3)} center with a dashed fold line.`,centerDimensions());
  for (const side of [-1,1]) {
    const y=4.5+side*1.5;
    const length = () => dimension('Center length',[8,y],[11,y],side*46);
    const frontOffset = () => dimension('Front offset',[11,y],[11,y+side*.125],-side*28);
    const rearOffset = () => dimension('Rear offset',[8,y],[8,y+side*.375],side*28);
    line('Air scoop',`Extend ${side<0?'first':'second'} front corner`,[11,y],[11,y+side*.125],'cut',`Extend the FRONT line ${M(.125)} outside this corner. Keep it straight.`,[frontOffset(),length()]);
    line('Air scoop',`Extend ${side<0?'first':'second'} rear corner`,[8,y],[8,y+side*.375],'cut',`Extend the REAR line ${M(.375)} outside this corner.`,[rearOffset(),length()]);
    line('Air scoop',`Join ${side<0?'first':'second'} tab edge`,[8,y+side*.375],[11,y+side*.125],'cut','Connect the two offset marks. This sloping outer edge is a cut; the inner dashed edge is a fold.',[frontOffset(),rearOffset(),length()]);
  }
  const stages=[{at:0,group:'Start',title:'Start with whole, blank paper',instruction:'Use one flat file-folder half. Keep your ruler, pencil, and a square corner ready. The drawing uses an 11 in × 8 1/2 in area; your paper may be larger.',type:'blank'}];
  const lineSeconds=1.4;
  drawing.forEach((d,i)=>stages.push({...d,at:(i+1)*lineSeconds,type:'line',line:i}));
  const colorStart=stages.at(-1).at, colorEnd=colorStart+1.6;
  stages.push({at:colorEnd,group:'Check',title:'Find the four colored parts',instruction:'One main body, two matching air fins, and one air scoop. The colors help you follow each part; you do not have to color your paper.',type:'color'});
  const assemblyStart=colorEnd+1;
  stages.push({at:assemblyStart,group:'Check',title:'Check before cutting',instruction:'Have your teacher check the measurements. Solid lines are cuts; dashed lines are folds. Keep every tab and rail connected.',type:'check'});
  const assemblySteps=[
    [10,'Separate the four parts','Cut the outlines and both {3} rear slits. Keep the rails, air scoop tabs, and rear panel attached.'],
    [17,'Fold the body rails','Fold both {0.5} rails DOWN. The rails are the folded sides of the body.'],
    [23,'Fold the air scoop tabs','Fold both air scoop tabs to the same side along the dashed lines.'],
    [31,'Attach the two air fins','Place the tall edges at the REAR. Overlap each lower strip with a rear rail.'],
    [36,'Set the rear panel','Lower the rear center panel slightly. Attach its side edges to the air fins.'],
    [43,'Turn the skimmer over','Look inside the underside channel. The air scoop belongs under the FRONT.'],
    [51,'Fit the air scoop under the nose','Carry the air scoop around the nose, then slide it under the body. Narrow end flush with the nose; tabs INSIDE the rails.'],
    [59,'Look closely at the joint','Attach the air scoop TAB faces to the INNER RAIL faces. Leave the broad air scoop center unglued. Rotate or zoom to inspect.'],
    [65,'Return upright','The air scoop stays under the front. The air fins stay at the rear.'],
    [72,'Check before testing','Let the glue dry. Have your teacher check the shape and demonstrate the launcher.']
  ];
  assemblySteps.forEach(([source,title,instruction],i)=>stages.push({at:assemblyStart+source/4,group:'Assemble',title,instruction,type:'assembly',source,assemblyNumber:i+1}));
  const duration=stages.at(-1).at;
  const stageIndex=t=>Math.max(0,stages.findIndex(s=>s.at>=t-1e-7));
  const instruction=(s,units)=>s.instruction.replace(/\{([\d.]+)\}/g,(_,n)=>measure(Number(n),units)).replace('11 in × 8 1/2 in',`${measure(11,units)} × ${measure(8.5,units)}`);
  function scoopPose(t,cut=1) {
    const q=clamp((t-43)/8), start=[8,4.5+.55*cut,0];
    const tilt=Math.asin(.25/3), end=[8+3-3*Math.cos(tilt),0,-.375];
    // Stay outside the side rail, clear the nose, lower, then slide inside the channel.
    const waypoints=[start,[12.2,5.05,1.1],[12.2,0,1.1],[12.2,0,-.375],end];
    const segment=Math.min(3,Math.floor(q*4)),local=ease(q*4-segment);
    return {position:mix(waypoints[segment],waypoints[segment+1],local),tilt:tilt*smooth(q,0,.5),squeeze:1-.01*smooth(q,0,.5)};
  }
  function scene(t,{flipOverride=null,finExplode=0,scoopExplode=0}={}) {
    const polys=[];
    const put=(id,part,p,transform=p=>p,labels=[])=>{
      polys.push({id,part,color:colors[part],p:p.map(transform),labels:labels.map(l=>({...l,p:rect(l.x-l.w/2,l.x+l.w/2,l.y-l.h/2,l.y+l.h/2).map(transform)}))});
    };
    const label=(text,x,y,w,h)=>({text,x,y,w,h});
    const fold=smooth(t,10,17)*Math.PI/2;
    put('deck','body',rect(3,11,-1.5,1.5),p=>p,[label('MAIN BODY',6.1,0,2.5,.6),label('FRONT / NOSE',10,0,1.7,.32)]);
    const rear=smooth(t,31,36)*Math.asin(.5/3);
    put('rear_panel','body',rect(0,3,-1.5,1.5),p=>add(ry(add(p,[-3,0,0]),-rear),[3,0,0]),[label('REAR',1.5,0,1.1,.4)]);
    for(const side of [-1,1]){
      const y=side*1.5;
      put('rail_'+side,'body',rect(0,11,Math.min(y,side*2),Math.max(y,side*2)),p=>add(rx(add(p,[0,-y,0]),-side*fold),[0,y,0]),[label('RAIL',5,side*1.75,1.2,.32)]);
    }
    const fa=smooth(t,23,31),cut=smooth(t,5,10);
    for(const [j,side] of [[0,-1],[1,1]]){
      const start=[j*3.4-.25*cut,2.6+.45*cut,.1*cut],end=[0,side*(1.53+finExplode),-.5];
      put('fin_'+side,'fin',fp,p=>add(rx(p,fa*Math.PI/2),mix(start,end,fa)),[label('AIR FINS',1.05,.9,1.65,.42)]);
    }
    const sf=smooth(t,17,23),pose=scoopPose(t,cut);
    const scoop=p=>add(ry([p[0],p[1]*pose.squeeze,p[2]],-pose.tilt),add(pose.position,[0,0,-scoopExplode]));
    put('scoop_center','scoop',rect(0,3,-1.5,1.5),scoop,[label('AIR SCOOP',1.5,0,2.2,.52)]);
    for(const side of [-1,1]){
      const y=side*1.5,p=[[0,y,0],[3,y,0],[3,y+side*.125,0],[0,y+side*.375,0]];
      put('scoop_tab_'+side,'scoop',p,p=>scoop(add(rx(add(p,[0,-y,0]),side*sf*Math.PI/2),[0,y,0])),[label('TAB',.8,y+side*.13,.65,.16)]);
    }
    if(t<7)put('sheet','sheet',rect(0,11,-2,6.5,-.025));
    const flip=flipOverride===null?Math.PI*smooth(t,36,43)*(1-smooth(t,59,65)):flipOverride;
    for(const q of polys){q.p=q.p.map(p=>rx(p,flip));for(const l of q.labels)l.p=l.p.map(p=>rx(p,flip));}
    return polys;
  }
  function frame(t) {
    if(t>assemblyStart)return {polys:scene((t-assemblyStart)*4),lines:[],assemblyTime:(t-assemblyStart)*4};
    const color=smooth(t,colorStart,colorEnd);
    const polys=color>0?scene(0):[{id:'sheet',part:'sheet',color:colors.sheet,p:rect(0,11,-2,6.5,-.025),labels:[]}];
    for(const p of polys)if(p.part!=='sheet'){
      const a=[1,3,5].map(i=>parseInt(colors.sheet.slice(i,i+2),16)),b=[1,3,5].map(i=>parseInt(p.color.slice(i,i+2),16));
      p.color='#'+a.map((v,i)=>Math.round(v+(b[i]-v)*color).toString(16).padStart(2,'0')).join('');
      if(color<.4)p.labels=[];
    }
    return {polys,assemblyTime:0,lines:drawing.flatMap((d,i)=>{
      const q=clamp((t-i*lineSeconds)/lineSeconds);
      return q>0?[{...d,b:mix(d.a,d.b,ease(q)),active:stageIndex(t)===i+1}]:[];
    })};
  }
  const qmul=(a,b)=>[
    a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
    a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
    a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
    a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
  const qrotate=(p,q)=>{const u=q.slice(0,3),v=cross(u,p);return add(p,add(mul(v,2*q[3]),mul(cross(u,v),2)));};
  const qbetween=(a,b)=>{
    const d=dot(a,b);if(d<-.999999){const axis=unit(cross(a,Math.abs(a[0])<.9?[1,0,0]:[0,1,0]));return [...axis,0];}
    return unit([...cross(a,b),1+d]);
  };
  function projection(polys,{width=1200,height=670,zoom=1,rotation=[0,0,0,1],view='iso',assemblyTime=72,insetLeft=0}={}) {
    const center=[5.5,2.25*(1-smooth(assemblyTime,0,10)),0];
    const yaw=view==='top'?0:.38,elevation=view==='top'?Math.PI/2:.72;
    const transform=p=>{const [x,y,z]=sub(p,center),u=x*Math.cos(yaw)-y*Math.sin(yaw),v=x*Math.sin(yaw)+y*Math.cos(yaw);return qrotate([u,v*Math.sin(elevation)-z*Math.cos(elevation),v*Math.cos(elevation)+z*Math.sin(elevation)],rotation);};
    const route= smooth(assemblyTime,40,43)*(1-smooth(assemblyTime,51,54));
    const scale=Math.min((width-insetLeft)/(14.7+4.8*route),height/11.2)*zoom;
    const point=p=>{const a=transform(p);return [a[0]*scale+(width+insetLeft)/2,a[1]*scale+height/2,a[2]];};
    const raw=polys.map(p=>({...p,pts:p.p.map(point),labels:p.labels.map(l=>({...l,pts:l.p.map(point)}))}));
    raw.forEach(p=>p.depth=p.pts.reduce((s,p)=>s+p[2],0)/p.pts.length);raw.sort((a,b)=>a.depth-b.depth);
    return {polys:raw,point,scale};
  }
  return {clamp,ease,smooth,add,sub,mul,mix,cross,dot,unit,rx,ry,rect,colors,measure,drawing,stages,lineSeconds,colorStart,colorEnd,assemblyStart,duration,stageIndex,instruction,scoopPose,scene,frame,projection,qmul,qrotate,qbetween};
})();
if(typeof module!=='undefined')module.exports=Skimmer;
