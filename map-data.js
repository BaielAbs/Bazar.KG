/* Основа — изображения пользователя. Все границы категорий, торговые точки,
   входы и проходы ниже — демонстрационные, без географической привязки. */
(() => {
  const categories = [
    {name:'Обувь', color:'#f4cf43'}, {name:'Одежда',color:'#4ba3ee'},
    {name:'Аксессуары',color:'#b375df'}, {name:'Ткани',color:'#5bbd7a'},
    {name:'Продукты',color:'#ef6975'}, {name:'Кафе',color:'#ef9b44'}
  ];
  const markets = {
    dordoi:{name:'Дордой',width:440,height:640,image:'assets/dordoi.jpg',prefix:'D',spines:[20,240,410],aisles:[64,232,610],marker:[770,165],
      regions:[
        {name:'Алкан',category:1,box:[128,88,98,121],side:240},
        {name:'Восток',category:2,box:[285,115,95,91],side:410},
        {name:'Кербен',category:0,box:[46,295,57,126],side:20},
        {name:'Европа',category:3,box:[124,295,81,126],side:240},
        {name:'Китай',category:1,box:[53,461,155,86],side:20},
        {name:'Мурас-Спорт',category:0,box:[262,260,116,282],side:410}
      ]},
    orto:{name:'Орто-Сай',width:1000,height:563,image:'assets/orto-sai.jpg',prefix:'S',spines:[210,450,815],aisles:[75,315,525],marker:[690,475],
      regions:[
        {name:'Павильоны',category:4,box:[245,109,175,155],side:210},
        {name:'Торговый двор',category:1,box:[481,125,140,138],side:450},
        {name:'Кафе',category:5,box:[660,198,118,83],side:815},
        {name:'Южные ряды',category:4,box:[245,354,165,119],side:210},
        {name:'Центральные ряды',category:2,box:[482,356,130,125],side:450},
        {name:'Восточные ряды',category:3,box:[662,358,114,125],side:815}
      ]},
    osh:{name:'Ошский базар',marker:[425,365]}
  };
  function compile(id) {
    const m=markets[id]; if(!m.regions)return null;
    const nodes={}, edges={}, stalls=[];
    const key=(x,y)=>`${x.toFixed(2)},${y.toFixed(2)}`;
    function point(x,y){const k=key(x,y);nodes[k]={x,y};edges[k]??=[];return k;}
    function link(a,b){const d=Math.hypot(nodes[a].x-nodes[b].x,nodes[a].y-nodes[b].y);edges[a].push({to:b,cost:d});edges[b].push({to:a,cost:d});}
    const rowYs=[...m.aisles];
    m.regions.forEach((region,ri)=>{
      const [x,y,w,h]=region.box; const rows=Math.max(1,Math.floor((h-24)/34)); const cols=Math.max(1,Math.min(5,Math.floor(w/25)));
      region.paths=[];
      for(let r=0;r<rows;r++){
        const py=y+34+r*34;rowYs.push(py);const access=point(region.side,py);let prev=access;
        const indices=Array.from({length:cols},(_,c)=>c);if(region.side>x)indices.reverse();
        region.paths.push([[region.side,py],[region.side>x?x+8:x+w-8,py]]);
        indices.forEach(c=>{
          const cx=x+8+(c+.5)*(w-16)/cols;const k=point(cx,py);link(prev,k);prev=k;
          stalls.push({id:`${m.prefix}-${String.fromCharCode(65+ri)}${r*cols+c+1}`,label:`${String.fromCharCode(65+ri)}${r*cols+c+1}`,x:cx-(w-16)/cols*.38,y:py-20,w:(w-16)/cols*.76,h:14,node:k,region:ri});
        });
      }
    });
    const ys=[...new Set(rowYs)].sort((a,b)=>a-b);
    m.spines.forEach(x=>{let prev=null;ys.forEach(y=>{const k=point(x,y);if(prev)link(prev,k);prev=k;});});
    m.aisles.forEach(y=>{for(let i=1;i<m.spines.length;i++)link(point(m.spines[i-1],y),point(m.spines[i],y));});
    return {nodes,edges,stalls,entrances:{north:point(m.spines[1],m.aisles[0]),west:point(m.spines[0],m.aisles[1]),south:point(m.spines[1],m.aisles.at(-1))}};
  }
  function shortestPath(graph,start,end){
    if(!graph?.nodes[start]||!graph.nodes[end])return [];
    const distance={[start]:0},previous={},todo=new Set(Object.keys(graph.nodes));
    while(todo.size){let best=null;for(const k of todo)if(best===null||(distance[k]??Infinity)<(distance[best]??Infinity))best=k;
      if(!Number.isFinite(distance[best]))break;todo.delete(best);if(best===end)break;
      for(const {to,cost} of graph.edges[best])if((distance[best]+cost)<(distance[to]??Infinity)){distance[to]=distance[best]+cost;previous[to]=best;}
    }
    if(distance[end]===undefined)return [];
    const path=[];for(let k=end;k;k=previous[k])path.unshift(k);return path;
  }
  window.BazarMapData={categories,markets,compile,shortestPath};
})();
