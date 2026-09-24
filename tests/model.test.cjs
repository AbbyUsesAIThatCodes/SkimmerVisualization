const test=require('node:test');
const assert=require('node:assert/strict');
const S=require('../model.js');
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} ≈ ${b}`);
test('reference dimensions and exact imperial/metric conversions',()=>{
  assert.equal(S.measure(.125),'1/8 in');assert.equal(S.measure(.375),'3/8 in');assert.equal(S.measure(3.25),'3 1/4 in');
  assert.equal(S.measure(.125,'mm'),'3.175 mm');assert.equal(S.measure(.375,'mm'),'9.525 mm');assert.equal(S.measure(11,'mm'),'279.4 mm');
  const p=S.scene(0),bounds=q=>[0,1].map(i=>Math.max(...q.p.map(p=>p[i]))-Math.min(...q.p.map(p=>p[i])));
  assert.deepEqual(bounds(p.find(q=>q.id==='sheet')),[11,8.5]);
  for(const id of ['fin_-1','fin_1','scoop_center'])bounds(p.find(q=>q.id===id)).forEach(v=>near(v,3));
  for(const id of ['rail_-1','rail_1'])assert.deepEqual(bounds(p.find(q=>q.id===id)),[11,.5]);
});
test('blank paper, measured strokes, then color and unchanged assembly dimensions',()=>{
  assert.deepEqual(S.frame(0).polys.map(q=>q.id),['sheet']);assert.equal(S.frame(0).lines.length,0);
  for(let i=0;i<S.drawing.length;i++){
    const t=(i+.5)*S.lineSeconds,f=S.frame(t);assert.equal(f.lines.length,i+1);
    assert.notDeepEqual(f.lines.at(-1).b,S.drawing[i].b);
    const done=S.frame((i+1)*S.lineSeconds).lines.at(-1);done.b.forEach((v,k)=>near(v,S.drawing[i].b[k]));
    assert.ok(S.drawing[i].dimensions.length>0);
  }
  assert.equal(S.frame(S.colorEnd).polys.filter(p=>p.part==='fin').length,2);
  const before=JSON.stringify(S.scene(0));S.stages.forEach(s=>S.instruction(s,'mm'));assert.equal(JSON.stringify(S.scene(0)),before);
});
test('normal assembly duration and all timeline boundaries',()=>{
  near(S.duration-S.assemblyStart,18);
  S.stages.forEach((s,i)=>{assert.equal(S.stageIndex(s.at),i);if(i)assert.equal(S.stageIndex(s.at-1e-5),i);});
  for(let t=0;t<=S.duration;t+=.1){
    const f=S.frame(t);for(const q of f.polys)assert.ok(q.p.flat().every(Number.isFinite));
    for(const view of ['top','iso']){const p=S.projection(f.polys,{view,assemblyTime:f.assemblyTime});assert.ok(p.polys.flatMap(q=>q.pts.flat()).every(Number.isFinite));}
  }
});
test('air scoop travels outside the body, then enters below the deck inside both rails',()=>{
  // Conservative clear-space test independent of the motion control points.
  for(let t=43;t<=51.00001;t+=.005){
    const qs=S.scene(t,{flipOverride:0}).filter(p=>p.part==='scoop');
    const pts=qs.flatMap(q=>q.p),lo=[0,1,2].map(i=>Math.min(...pts.map(p=>p[i]))),hi=[0,1,2].map(i=>Math.max(...pts.map(p=>p[i])));
    const clear=lo[0]>11||hi[0]<0||lo[1]>2||hi[1]<-2||lo[2]>0||hi[2]<-.5||
      (lo[0]>=3&&lo[1]>-1.5&&hi[1]<1.5&&hi[2]<0);
    assert.ok(clear,`air scoop intersects body space at ${t}: ${lo} to ${hi}`);
  }
  const front=S.scene(51,{flipOverride:0}).find(q=>q.id==='scoop_center').p.slice(1,3);
  front.forEach(p=>near(p[0],11));
});
test('paper labels stay coplanar with their own folded parts',()=>{
  for(let t=0;t<=72;t+=.25)for(const q of S.scene(t)){
    const normal=S.unit(S.cross(S.sub(q.p[1],q.p[0]),S.sub(q.p[2],q.p[0])));
    for(const l of q.labels)for(const p of l.p)near(S.dot(S.sub(p,q.p[0]),normal),0);
  }
});
test('trackball rotation reaches an inverted view and stays normalized',()=>{
  let q=[0,0,0,1];
  for(let i=0;i<60;i++){const a=i*.07,b=(i+1)*.07;q=S.unit(S.qmul(S.qbetween([Math.sin(a),0,Math.cos(a)],[Math.sin(b),0,Math.cos(b)]),q));}
  near(Math.hypot(...q),1);const p=S.qrotate([0,0,1],q);assert.ok(p[2]<0);
  const opposite=S.qbetween([0,0,1],[0,0,-1]);near(S.qrotate([0,0,1],opposite)[2],-1);
});

test('every drawing step has accurate measurements on both paper axes',()=>{
  for(const d of S.drawing){
    assert.ok(d.dimensions.length>=2,d.title);
    const axes=new Set();
    for(const m of d.dimensions){
      const delta=S.sub(m.b,m.a);const axis=Math.abs(delta[0])>1e-8?0:1;
      assert.ok(Math.abs(delta[1-axis])<1e-8,`${d.title}: dimension must follow a paper axis`);
      assert.ok(m.value>0);near(Math.hypot(...delta),m.value);assert.ok(m.label);axes.add(axis);
    }
    assert.equal(axes.size,2,d.title);
  }
  for(const n of [4,6]){
    const dims=S.drawing[n].dimensions;
    assert.deepEqual(dims.map(d=>d.value),[.5,3]);
    assert.equal(dims[1].a[0],0);assert.equal(dims[1].b[0],3);
  }
  for(const n of [12,17])S.drawing[n].dimensions.forEach((d,i)=>near(d.value,[.5,3][i]));
  for(const n of [25,28])assert.deepEqual(S.drawing[n].dimensions.map(d=>d.value),[.125,.375,3]);
});
