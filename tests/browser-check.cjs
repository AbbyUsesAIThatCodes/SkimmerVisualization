const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES].filter(Boolean)}));
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const qaDir=path.join(__dirname,'..','test-output');fs.mkdirSync(qaDir,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.SKIMMER_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1366,height:768},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,'..','index.html')).href);
  assert.equal(await page.evaluate(()=>SkimmerApp.hasWebGL()),true);
  assert.equal(await page.locator('#stepTitle').innerText(),'Start with whole, blank paper');
  await page.locator('#play').click();await page.waitForFunction(()=>SkimmerApp.state.t>0&&!SkimmerApp.state.running);assert.equal(await page.locator('#status').innerText(),'2 / 42');
  await page.evaluate(()=>{SkimmerApp.state.t=Skimmer.stages[1].at-1e-10;SkimmerApp.state.running=true;SkimmerApp.advance(.02);});
  assert.ok(await page.evaluate(()=>SkimmerApp.state.t===Skimmer.stages[1].at&&!SkimmerApp.state.running));
  const prior=await page.evaluate(()=>SkimmerApp.state.t);await page.locator('#replay').click();await page.waitForFunction(()=>!SkimmerApp.state.running);assert.equal(await page.evaluate(()=>SkimmerApp.state.t),prior);
  await page.locator('#stage').selectOption('24');assert.match(await page.locator('#measurement').innerText(),/1\/8 in/);
  await page.locator('#metric').click();assert.deepEqual(await page.locator('.measure-value').allTextContents(),['3.175 mm','76.2 mm']);assert.match(await page.locator('#instruction').innerText(),/3.175 mm/);
  await page.screenshot({path:path.join(qaDir,'metric-tab.png')});
  await page.locator('#imperial').click();await page.locator('#stage').selectOption('6');await page.screenshot({path:path.join(qaDir,'rail-drawing.png')});
  for(const [step,name] of [[1,'drawn-paper-edge'],[8,'second-rail-dimensions'],[13,'air-fin-dimensions'],[26,'air-scoop-dimensions']]){
    await page.locator('#stage').selectOption(String(step));await page.screenshot({path:path.join(qaDir,`${name}.png`)});
  }
  await page.locator('#stage').selectOption('31');await page.screenshot({path:path.join(qaDir,'colored.png')});
  await page.locator('#next').click();assert.equal(await page.evaluate(()=>SkimmerApp.state.view),'iso');
  await page.locator('#stage').selectOption('41');await page.screenshot({path:path.join(qaDir,'assembled.png')});
  const box=await page.locator('#view').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
  await page.mouse.move(cx,cy);await page.mouse.wheel(0,-300);assert.ok(await page.evaluate(()=>SkimmerApp.state.zoom>1.4));
  await page.locator('#camera').click();assert.equal(await page.evaluate(()=>SkimmerApp.state.zoom),1);
  await page.mouse.move(cx,cy-100);await page.mouse.down();await page.mouse.move(cx+150,cy+100,{steps:12});await page.mouse.up();assert.ok(await page.evaluate(()=>Math.abs(SkimmerApp.state.rotation[3]-1)>.01));assert.equal(await page.evaluate(()=>SkimmerApp.getPointerCount()),0);
  // Native touch input exercises the real pointer capture + pinch handlers.
  const cdp=await page.context().newCDPSession(page);const point=(id,x,y)=>({id,x,y,radiusX:2,radiusY:2,force:1});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(1,cx-35,cy),point(2,cx+35,cy)]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(1,cx-85,cy),point(2,cx+85,cy)]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(await page.evaluate(()=>SkimmerApp.state.zoom>1.8));assert.equal(await page.evaluate(()=>SkimmerApp.getPointerCount()),0);
  await page.locator('#camera').click();await page.locator('#view').focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('+');assert.ok(await page.evaluate(()=>SkimmerApp.state.zoom>1));await page.keyboard.press('r');assert.equal(await page.evaluate(()=>SkimmerApp.state.zoom),1);
  // Continuous play must stop before cutting; a deliberate second Play continues.
  await page.evaluate(()=>{SkimmerApp.state.t=Skimmer.assemblyStart-.05;SkimmerApp.state.running=true;});await page.locator('#pauseSteps').uncheck();
  await page.waitForFunction(()=>!SkimmerApp.state.running);assert.ok(await page.evaluate(()=>Math.abs(SkimmerApp.state.t-Skimmer.assemblyStart)<1e-8));
  await page.locator('#play').click();await page.waitForFunction(()=>SkimmerApp.state.t>Skimmer.assemblyStart+.2);await page.locator('#play').click();assert.equal(await page.evaluate(()=>SkimmerApp.state.running),false);
  await page.locator('#reset').click();assert.equal(await page.evaluate(()=>SkimmerApp.state.t),0);assert.equal(await page.locator('#back').isDisabled(),true);
  // Review every stage for missing geometry/invalid points through the rendered app.
  const result=await page.evaluate(()=>Skimmer.stages.map((s,i)=>{SkimmerApp.seekStep(i);return {i,width:document.querySelector('canvas').width,title:document.querySelector('#stepTitle').textContent,expected:(s.dimensions||[]).length,shown:document.querySelectorAll('.measure-row').length};}));assert.equal(result.length,42);result.forEach(s=>assert.equal(s.shown,s.expected));
  await page.evaluate(()=>{SkimmerApp.seekStep(38);SkimmerApp.resetView('iso');});await page.screenshot({path:path.join(qaDir,'underside.png')});
  await page.locator('#full').click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.locator('#full').click();await page.waitForFunction(()=>!document.fullscreenElement);
  for(const [width,height] of [[1280,720],[1024,768],[390,844]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>SkimmerApp.seekStep(24));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`horizontal overflow at ${width}`);
    if(width>660)assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),`desktop vertical overflow at ${width}`);
    await page.screenshot({path:path.join(qaDir,`layout-${width}.png`),fullPage:true});
  }
  assert.deepEqual(errors,[]);console.log('PASS: 42 stages, replay, unit conversion, auto-pause/checkpoint, wheel, drag, native touch pinch, keyboard, full screen, 3 viewport sizes; no browser errors.');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
