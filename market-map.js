(() => {
  const {markets,categories,compile,shortestPath}=window.BazarMapData;
  const $=id=>document.getElementById(id), svg=$('atlasSvg'), ns='http://www.w3.org/2000/svg';
  let scene='city', graph=null, camera={zoom:1,x:0,y:0}, selected=null, route=[], steps=[], stepIndex=-1, timer, focusMarket='dordoi', dragMoved=false;
  const dimensions=()=>scene==='city'?{width:1300,height:676}:markets[scene];
  function el(tag,attrs={},text){const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text!==undefined)e.textContent=text;return e;}
  function buttonAction(node,fn){node.setAttribute('tabindex','0');node.setAttribute('role','button');node.addEventListener('click',()=>{if(!dragMoved)fn();});node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}});}
  function message(text){$('mapMessage').textContent=text;clearTimeout(timer);timer=setTimeout(()=>$('mapMessage').textContent='',4200);}
  function entranceName(id){return {north:'Северный вход',west:'Западный вход',south:'Южный вход'}[id];}
  function clearNavigation(){stepIndex=-1;$('navigationControls').hidden=true;$('startNavigation').disabled=false;}
  function render(){
    const d=dimensions();svg.setAttribute('viewBox',`0 0 ${d.width} ${d.height}`);svg.setAttribute('aria-label',scene==='city'?'Обзор Бишкека с тремя базарами':markets[scene].name+' — демонстрационная схема');
    svg.replaceChildren();
    const g=el('g',{transform:`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`});svg.append(g);
    g.append(el('rect',{width:d.width,height:d.height,fill:scene==='city'?'#1f2f3e':'#eef2e9'}));
    if(scene==='city'||$('referenceToggle').checked)g.append(el('image',{href:scene==='city'?'assets/bishkek.png':d.image,width:d.width,height:d.height,opacity:scene==='city'?1:.7}));
    if(scene==='city'){
      Object.entries(markets).forEach(([id,m])=>{
        const [x,y]=m.marker;const pin=el('g',{class:'market-pin','aria-label':m.name+(m.regions?' — открыть схему':' — только обзор')});
        pin.append(el('circle',{cx:x,cy:y,r:31,fill:'#56d68a',opacity:.17}));pin.append(el('path',{d:`M ${x} ${y+25} L ${x-10} ${y+7} A 20 20 0 1 1 ${x+10} ${y+7} Z`,fill:m.regions?'#2aac71':'#8b9aa0',stroke:'#fff','stroke-width':2}));
        pin.append(el('circle',{cx:x,cy:y-10,r:5,fill:'#fff'}));
        const w=id==='osh'?156:120;pin.append(el('rect',{x:x-w/2,y:y+33,width:w,height:34,rx:10,fill:'#fff'}));pin.append(el('text',{x,y:y+55,'text-anchor':'middle',fill:'#183d29','font-size':16,'font-weight':700},m.name));
        buttonAction(pin,()=>openMarket(id));g.append(pin);
      });
    } else {
      const detailed=camera.zoom>=1.55 || route.length>0;
      d.regions.forEach((r,i)=>{
        const [x,y,w,h]=r.box, color=categories[r.category].color;
        if($('zonesToggle').checked){
          g.append(el('rect',{x:x-3,y:y-3,width:w+6,height:h+6,rx:5,fill:color,opacity:.12}));
          g.append(el('polygon',{points:`${x},${y} ${x+w-8},${y} ${x+w},${y+8} ${x+w},${y+h} ${x+8},${y+h} ${x},${y+h-8}`,fill:color,'fill-opacity':.38,stroke:color,'stroke-width':scene==='dordoi'?2:3,'stroke-linejoin':'round'}));
          const label=el('text',{x:x+w/2,y:y+14,'text-anchor':'middle','font-size':scene==='dordoi'?8:13,'font-weight':800,fill:'#193325','paint-order':'stroke',stroke:'#ffffffe0','stroke-width':2},r.name);g.append(label);
        }
        if(detailed)r.paths.forEach(p=>g.append(el('polyline',{points:p.map(a=>a.join(',')).join(' '),fill:'none',stroke:'#fff','stroke-width':scene==='dordoi'?3:5,opacity:.85})));
      });
      if(detailed){
        d.spines.forEach(x=>g.append(el('line',{x1:x,y1:d.aisles[0],x2:x,y2:d.aisles.at(-1),stroke:'#ffffffcc','stroke-width':scene==='dordoi'?4:7})));
        d.aisles.forEach(y=>g.append(el('line',{x1:d.spines[0],y1:y,x2:d.spines.at(-1),y2:y,stroke:'#ffffffcc','stroke-width':scene==='dordoi'?4:7})));
      }
      graph.stalls.forEach(s=>{
        const r=d.regions[s.region],color=categories[r.category].color;
        const rect=el('rect',{x:s.x,y:s.y,width:s.w,height:s.h,rx:2,fill:selected?.id===s.id?'#163e2d':detailed?'#fffdf0':'#ffffff6b',stroke:selected?.id===s.id?'#112e20':$('zonesToggle').checked?color:'#7e9588','stroke-width':selected?.id===s.id?2:1,class:'demo-stall','data-stall':s.id,'aria-label':'Демоконтейнер '+s.label});
        buttonAction(rect,()=>chooseStall(s));g.append(rect);
        if(detailed)g.append(el('text',{x:s.x+s.w/2,y:s.y+9.5,'text-anchor':'middle',fill:selected?.id===s.id?'#fff':'#284330','font-size':Math.min(7,s.w/2.4),'pointer-events':'none'},s.label));
      });
      Object.entries(graph.entrances).forEach(([id,k])=>{
        const p=graph.nodes[k],radius=scene==='dordoi'?6:10;
        g.append(el('circle',{cx:p.x,cy:p.y,r:radius,fill:$('entranceSelect').value===id?'#16794b':'#607a6b',stroke:'#fff','stroke-width':2}));
        g.append(el('text',{x:p.x,y:p.y-12,'text-anchor':id==='west'?'start':'middle','font-size':scene==='dordoi'?8:13,fill:'#163c27','font-weight':800,'paint-order':'stroke',stroke:'#fff','stroke-width':2},entranceName(id)));
      });
      if(route.length){
        const points=route.map(k=>graph.nodes[k]);const attrs={points:points.map(p=>`${p.x},${p.y}`).join(' '),fill:'none','stroke-linecap':'round','stroke-linejoin':'round'};
        g.append(el('polyline',{...attrs,stroke:'#fff','stroke-width':scene==='dordoi'?7:11}));
        g.append(el('polyline',{...attrs,stroke:'#1765da','stroke-width':scene==='dordoi'?4:6,class:'route-line'}));
        const end=points.at(-1);g.append(el('circle',{cx:end.x,cy:end.y,r:scene==='dordoi'?5:8,fill:'#1765da',stroke:'#fff','stroke-width':2}));
        if(stepIndex>=0){const p=graph.nodes[steps[Math.min(stepIndex,steps.length-1)].key];g.append(el('circle',{cx:p.x,cy:p.y,r:scene==='dordoi'?7:11,fill:'#17ad71',stroke:'#fff','stroke-width':3}));}
      }
    }
    $('zoomLabel').textContent=Math.round(camera.zoom*100)+'%';$('zoomIn').disabled=camera.zoom>=6;
    $('zoomOut').disabled=scene==='city'&&camera.zoom<=1;
    $('mapHint').textContent=scene==='city'?'Приблизьте базар или нажмите на маркер':camera.zoom<1.55?'Приблизьте, чтобы увидеть номера контейнеров':'Выберите контейнер · перемещение мышью или пальцем';
  }
  function selectScene(id){
    scene=id;camera={zoom:1,x:0,y:0};selected=null;route=[];steps=[];clearNavigation();
    graph=scene==='city'?null:compile(scene);
    $('sceneTitle').textContent=scene==='city'?'Бишкек':markets[scene].name;
    $('sceneDescription').textContent=scene==='city'?'Три базара на одной карте. Выберите маркер или приблизьте нужный базар.':'Цветные регионы по вашему референсу. Приблизьте схему и выберите демоконтейнер.';
    $('mapBreadcrumb').textContent=scene==='city'?'Бишкек · обзор':`Бишкек / ${markets[scene].name}`;
    $('detailTools').hidden=scene==='city';$('cityView').hidden=scene==='city';$('routeActions').hidden=true;$('buildRoute').disabled=true;$('routeSteps').replaceChildren();$('targetTitle').textContent='Выберите контейнер';$('targetDescription').textContent='Нажмите на контейнер на увеличенной схеме.';
    document.querySelectorAll('[data-market]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.market===scene)));
    $('regionLegend').replaceChildren();if(graph)[...new Set(markets[scene].regions.map(r=>r.category))].forEach(i=>{const span=document.createElement('span');span.style.setProperty('--zone',categories[i].color);span.textContent=categories[i].name;$('regionLegend').append(span);});
    render();
  }
  function openMarket(id){
    if(!markets[id]?.regions){focusMarket=id;message('Ошский базар отмечен на обзоре. Подробную схему добавим позже.');return;}
    focusMarket=id;selectScene(id);
    if(matchMedia('(max-width:620px)').matches)$('atlasSvg').scrollIntoView({behavior:'smooth',block:'center'});
  }
  function chooseStall(s){selected=s;route=[];steps=[];clearNavigation();$('targetTitle').textContent='Контейнер '+s.label;$('targetDescription').textContent=markets[scene].regions[s.region].name+' · '+categories[markets[scene].regions[s.region].category].name+' · демонстрационная точка';$('buildRoute').disabled=false;$('routeActions').hidden=true;$('routeSteps').replaceChildren();
    if(camera.zoom<1.55){const d=dimensions();camera.zoom=2;camera.x=d.width/2-(s.x+s.w/2)*2;camera.y=d.height/2-s.y*2;clamp();}
    render();message('Выбран '+s.label+'. Выберите вход и нажмите «Показать маршрут».');
  }
  function clamp(){const d=dimensions();camera.x=Math.max(d.width*(1-camera.zoom),Math.min(0,camera.x));camera.y=Math.max(d.height*(1-camera.zoom),Math.min(0,camera.y));}
  function zoomTo(value,anchor){
    const d=dimensions();if(scene!=='city'&&value<.92){selectScene('city');return;}
    const next=Math.max(1,Math.min(6,value));const p=anchor||{x:d.width/2,y:d.height/2};
    camera.x=p.x-(p.x-camera.x)*next/camera.zoom;camera.y=p.y-(p.y-camera.y)*next/camera.zoom;camera.zoom=next;clamp();
    if(scene==='city'&&next>=2.5){const center={x:(d.width/2-camera.x)/next,y:(d.height/2-camera.y)/next};let nearest=null,dist=Infinity;
      Object.entries(markets).forEach(([id,m])=>{const n=Math.hypot(center.x-m.marker[0],center.y-m.marker[1]);if(n<dist){dist=n;nearest=id;}});
      if(dist<90&&markets[nearest].regions){openMarket(nearest);return;}
      if(dist<90&&nearest==='osh')message('Ошский базар: подробная схема пока не добавлена.');
    }
    render();
  }
  function pathSteps(path){
    const result=[];if(!path.length)return result;
    result.push({key:path[0],text:'Начните от выбранного входа: '+entranceName($('entranceSelect').value)+'.'});
    for(let i=1;i<path.length;i++){
      const a=graph.nodes[path[i-1]],b=graph.nodes[path[i]],dx=b.x-a.x,dy=b.y-a.y;
      const direction=Math.abs(dx)>Math.abs(dy)?(dx>0?'вправо':'влево'):(dy>0?'вниз по схеме':'вверх по схеме');
      if(result.at(-1).direction===direction){result.at(-1).key=path[i];continue;}
      result.push({key:path[i],direction,text:'Пройдите по проходу '+direction+'.'});
    }
    result.push({key:path.at(-1),text:'Вы у контейнера '+selected.label+' · '+markets[scene].regions[selected.region].name+'.'});return result;
  }
  function buildRoute(){
    if(!selected||!graph)return;
    route=shortestPath(graph,graph.entrances[$('entranceSelect').value],selected.node);clearNavigation();
    if(!route.length){message('Нет доступного маршрута.');return;}
    steps=pathSteps(route);
    const points=route.map(k=>graph.nodes[k]), d=dimensions();
    const xs=points.map(p=>p.x), ys=points.map(p=>p.y), padding=scene==='dordoi'?60:100;
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    camera.zoom=Math.max(1,Math.min(4,d.width/(maxX-minX+padding),d.height/(maxY-minY+padding)));
    camera.x=d.width/2-(minX+maxX)/2*camera.zoom;camera.y=d.height/2-(minY+maxY)/2*camera.zoom;clamp();
    $('routeSteps').replaceChildren();steps.forEach(s=>{const li=document.createElement('li');li.textContent=s.text;$('routeSteps').append(li);});$('routeActions').hidden=false;render();
    message('Демомаршрут построен по графу проходов.');
  }
  function loadSaved(){try{const data=JSON.parse(localStorage.getItem('bazarSavedRoutes')||'[]');return Array.isArray(data)?data.filter(r=>r&&markets[r.market]?.regions&&['north','west','south'].includes(r.entrance)&&typeof r.stall==='string'&&typeof r.id==='string').slice(0,40):[];}catch{return [];}}
  function writeSaved(data){try{localStorage.setItem('bazarSavedRoutes',JSON.stringify(data));renderSaved();return true;}catch{message('Не удалось сохранить. Проверьте доступность хранилища браузера.');return false;}}
  function renderSaved(){const saved=loadSaved();$('savedCount').textContent=saved.length;$('savedList').replaceChildren();if(!saved.length)$('savedList').textContent='Пока нет сохранённых маршрутов.';
    saved.forEach(r=>{const box=document.createElement('div');box.className='saved-route';const title=document.createElement('strong');title.textContent=markets[r.market].name+' · '+r.stall;const text=document.createElement('p');text.textContent=entranceName(r.entrance)+' → контейнер · демо';const open=document.createElement('button');open.className='text-button';open.textContent='Открыть';open.onclick=()=>{selectScene(r.market);const s=graph.stalls.find(s=>s.id===r.stall);if(!s){message('Контейнер больше не доступен.');return;}chooseStall(s);$('entranceSelect').value=r.entrance;buildRoute();};const remove=document.createElement('button');remove.className='text-button';remove.textContent='Удалить';remove.onclick=()=>writeSaved(loadSaved().filter(item=>item.id!==r.id));box.append(title,text,open,remove);$('savedList').append(box);});}
  $('saveRoute').onclick=()=>{if(!route.length||!selected)return;const saved=loadSaved();if(saved.some(r=>r.market===scene&&r.stall===selected.id&&r.entrance===$('entranceSelect').value)){message('Этот маршрут уже сохранён.');return;}saved.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),market:scene,stall:selected.id,entrance:$('entranceSelect').value});if(writeSaved(saved.slice(0,40)))message('Маршрут сохранён в этом браузере.');};
  $('showSaved').onclick=()=>{$('savedPanel').hidden=!$('savedPanel').hidden;renderSaved();if(!$('savedPanel').hidden)$('savedPanel').scrollIntoView({behavior:'smooth',block:'nearest'});};
  $('buildRoute').onclick=buildRoute;
  $('entranceSelect').onchange=()=>{if(route.length)buildRoute();else render();};
  $('startNavigation').onclick=()=>{if(!steps.length)return;stepIndex=0;$('navigationControls').hidden=false;$('startNavigation').disabled=true;showStep();message('Пошаговый деморежим. Подтверждайте шаги вручную, GPS не используется.');};
  function showStep(){$('navigationStep').textContent=`${stepIndex+1}/${steps.length}: ${steps[stepIndex].text}`;$('nextStep').textContent=stepIndex===steps.length-1?'Готово':'Следующий шаг';render();}
  $('nextStep').onclick=()=>{if(stepIndex<steps.length-1){stepIndex++;showStep();}else{clearNavigation();render();message('Маршрут завершён.');}};
  $('stopNavigation').onclick=()=>{clearNavigation();render();};
  $('clearRoute').onclick=()=>{route=[];steps=[];clearNavigation();$('routeActions').hidden=true;$('routeSteps').replaceChildren();render();};
  $('stallSearch').onsubmit=e=>{e.preventDefault();const q=$('stallQuery').value.trim().toUpperCase();const s=graph?.stalls.find(s=>s.label===q||s.id===q);if(s)chooseStall(s);else message('Контейнер не найден. Используйте номер со схемы, например A1.');};
  $('cityView').onclick=()=>selectScene('city');$('zonesToggle').onchange=render;$('referenceToggle').onchange=render;
  document.querySelectorAll('[data-market]').forEach(b=>b.onclick=()=>openMarket(b.dataset.market));
  $('zoomIn').onclick=()=>zoomTo(camera.zoom*1.35);$('zoomOut').onclick=()=>zoomTo(camera.zoom/1.35);$('resetView').onclick=()=>{camera={zoom:1,x:0,y:0};render();};
  function rootPoint(clientX,clientY){return new DOMPoint(clientX,clientY).matrixTransform(svg.getScreenCTM().inverse());}
  svg.addEventListener('wheel',e=>{e.preventDefault();zoomTo(camera.zoom*(e.deltaY<0?1.16:1/1.16),rootPoint(e.clientX,e.clientY));},{passive:false});
  const pointers=new Map();let gesture=null;
  svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragMoved=false;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){gesture={x:e.clientX,y:e.clientY,camera:{...camera},scene};}else if(pointers.size===2){const [a,b]=[...pointers.values()];gesture={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:camera.zoom,scene};} });
  svg.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(gesture?.scene!==scene){gesture=null;return;}
    if(pointers.size===2){dragMoved=true;const [a,b]=[...pointers.values()];if(gesture?.distance){const next=gesture.zoom*Math.hypot(a.x-b.x,a.y-b.y)/gesture.distance;zoomTo(next,rootPoint((a.x+b.x)/2,(a.y+b.y)/2));}return;}
    if(!gesture?.camera)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(Math.hypot(dx,dy)<5&&!dragMoved)return;dragMoved=true;svg.setPointerCapture(e.pointerId);const matrix=svg.getScreenCTM();camera.x=gesture.camera.x+dx/matrix.a;camera.y=gesture.camera.y+dy/matrix.d;clamp();render();});
  function endPointer(e){pointers.delete(e.pointerId);gesture=null;if(pointers.size===1){const p=[...pointers.values()][0];gesture={...p,camera:{...camera},scene};}}
  svg.addEventListener('pointerup',endPointer);svg.addEventListener('pointercancel',endPointer);svg.addEventListener('lostpointercapture',e=>{if(pointers.has(e.pointerId))endPointer(e);});
  selectScene('city');renderSaved();
  const params=new URLSearchParams(location.search), requested=params.get('bazaar');
  if(markets[requested]?.regions)openMarket(requested);
  const productName=params.get('product'), stallId=params.get('stall');
  if(productName){
    $('productContext').hidden=false;$('productName').textContent=productName;
    const info=markets[requested]?.regions ? markets[requested].name+' · контейнер '+stallId+' · демонстрационная привязка' : 'Ошский базар · только обзор. Подробная точка пока не нанесена.';
    $('productLocation').textContent=info;
    const text='Здравствуйте! Хочу купить «'+productName+'»'+(params.get('price')?' за '+params.get('price')+' сом':'')+'. Нашёл товар на BAZAR KG. Есть ли он в наличии? Подскажите варианты и как забрать. '+info;
    $('productWhatsApp').href='https://wa.me/996506252828?text='+encodeURIComponent(text);
    if(graph&&stallId){const target=graph.stalls.find(s=>s.id===stallId);if(target){chooseStall(target);buildRoute();}}
  }

})();
