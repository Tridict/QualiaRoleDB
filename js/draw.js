
const drag = simulation => {

  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
}

const linkArc = (d) => {
  // const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
  const r = 0;
  return `
    M${d.source.x},${d.source.y}
    A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
  `;
}

function drawSvg(data_, forces_=null, width=800, height=600) {

  const data = data_ ?? {
    links: [],
    nodes: [],
  };

  const forces = forces_ ?? {
    countLink: 1,
    countDiff: 1,
    countSame: 5,
    distanceLink: 3,
    distanceDiff: 50,
    distanceSame: 3,
    chargeStrength: -400,
    collideRadius: 12,
  };

  console.log(forces);

  const data_diffs = [];
  const data_sames = [];
  // for (let nd0 of data.nodes) {
  //   let nd0_fc = nd0.role ?? JSON.stringify(nd0.cats);
  //   for (let nd1 of data.nodes) {
  //     let nd1_fc = nd1.role ?? JSON.stringify(nd1.cats);
  //     let diff = {
  //       source: nd0.id,
  //       target: nd1.id,
  //       edge: {label: (nd0_fc==null||nd1_fc==null)?"@NULL":(nd0_fc==nd1_fc?"@SAME":"@DIFF")},
  //     };
  //     if (diff.edge.label=="@DIFF") {
  //       data_diffs.push(diff);
  //     } else if (diff.edge.label=="@SAME") {
  //       data_sames.push(diff);
  //     };
  //   };
  // };
  for (let lk0 of data.links) {
    let flk = {
      source: lk0.source,
      target: lk0.target,
      edge: {label: "@SAME"},
    };
    data_sames.push(flk);
    for (let lk1 of data.links) {
      let nosame = true;
      if (lk0.target==lk1.target) {
        let flk = {
          source: lk0.source,
          target: lk1.source,
          edge: {label: "@SAME"},
        };
        data_sames.push(flk);
        nosame = false;
      } else {
        let flk = {
          source: lk0.source,
          target: lk1.source,
          edge: {label: "@DIFF"},
        };
        data_diffs.push(flk);
      };
      if (lk0.source==lk1.source && lk0.node1.role == lk1.node1.role) {
        let flk = {
          source: lk0.target,
          target: lk1.target,
          edge: {label: "@SAME"},
        };
        data_sames.push(flk);
        nosame = false;
      } else {
        let flk = {
          source: lk0.target,
          target: lk1.target,
          edge: {label: "@DIFF"},
        };
        data_diffs.push(flk);
      };
      if (nosame) {
        let flk_a = {
          source: lk0.source,
          target: lk1.target,
          edge: {label: "@DIFF"},
        };
        data_diffs.push(flk_a);
        let flk_b = {
          source: lk1.source,
          target: lk0.target,
          edge: {label: "@DIFF"},
        };
        data_diffs.push(flk_b);
      };
    };
  };

  const links = data.links.map(lk => Object.create(lk));
  const nodes = data.nodes.map(nd => Object.create(nd));
  const diffs = data_diffs.map(df => Object.create(df));
  const sames = data_sames.map(sm => Object.create(sm));
  const types = Array.from(new Set(links.map(d => d?.edge.label)));
  const color = d3.scaleOrdinal(types, d3.schemeCategory10);

  const count2 = ()=> +forces.countLink;
  const count3 = ()=> +forces.countDiff;
  const count5 = ()=> +forces.countSame;

  const simulation = d3.forceSimulation(nodes)
      // .force("charge", d3.forceManyBody().strength(-200))
      .force("link", d3.forceLink(links)
        .id(d => d.id)
        .distance(d => +forces.distanceLink)
        .strength(lk => 1 / Math.min(count2(lk.source), count2(lk.target)))
      )
      .force("link", d3.forceLink(diffs)
        .id(d => d.id)
        .distance(d => +forces.distanceDiff)
        .strength(lk => 1 / Math.min(count3(lk.source), count3(lk.target)))
      )
      .force("link", d3.forceLink(sames)
        .id(d => d.id)
        .distance(d => +forces.distanceSame)
        .strength(lk => 1 / Math.min(count5(lk.source), count5(lk.target)))
      )
      // .force('center', d3.forceCenter(width / 2, height / 2))
      .force('charge', d3.forceManyBody().strength(+forces.chargeStrength))
      .force('collide',d3.forceCollide().radius(+forces.collideRadius).iterations(1))
      //
      .force("x", d3.forceX())
      .force("y", d3.forceY())
  ;

  const svg = d3.create("svg")
      .attr("viewBox", [-width/2, -height/2, width, height])
      .style("font", "10px")
  ;

  // Per-type markers, as they don't inherit styles.
  svg.append("defs").selectAll("marker")
    .data(types)
    .join("marker")
      .attr("id", d=>`arrow-${d}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", -0.5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
    .append("path")
      .attr("fill", label => color(label))
      .attr("d", "M0,-5L10,0L0,5")
  ;

  const link = svg.append("g")
      .attr("fill", "none")
      .attr("stroke-width", 1)
    .selectAll("path")
    .data(links)
    .join("path")
      .attr("stroke", d => color(d.edge.label))
      .attr("marker-end", d => `url(${new URL(`#arrow-${d?.edge.label}`, location)})`)
  ;

  const node = svg.append("g")
      .attr("fill", "currentColor")
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
    .selectAll("g")
    .data(nodes)
    .join("g")
      .call(drag(simulation))
  ;

  node.append("circle")
      .attr("stroke", "white")
      .attr("fill", d => d.cats?"black":color(`Item-Role[${d.role}]`))
      .attr("stroke-width", 1.5)
      .attr("r", d => (d.cats||d.role=="形式FOR")? 3 : 3)
  ;

  node.append("text")
      .text(d => d.word)
      .attr("font-size", d => (d.cats)?"1rem":(d.role=="形式FOR"?"0.86rem":"0.86rem"))
      .attr("fill", d => (d.cats)?"#000":color(`Item-Role[${d.role}]`))
    .clone(true).lower()
      .attr("fill", "none")
      .attr("stroke", d => (d.cats)?"#fff":"#fff")
      .attr("stroke-width", d => (d.cats)? 5 : 6)
  ;

  const zoomed = (e)=>{
    let t = e.transform;
    link
        .attr("transform", t)
        // .attr("transform-origin", `50% 50%`)
        // .attr("font-size", `${8/(t.k)+t.k*0.1}`)
    ;
    node
        .attr("transform", t)
        // .attr("transform-origin", `50% 50%`)
        // .attr("r", `${1/(t.k)}`)
        .attr("font-size", `${8/(t.k)+t.k*0.1}`)
    ;
  };

  const zoom = d3.zoom()
    // .extent([[0-margin.left, 0-margin.top], [width+margin.right, height+margin.bottom]])
    // .extent([[0, 0], [width, height]])
    // .scaleExtent([0.25, 4])
    .on("zoom", zoomed)
  ;

  svg.call(zoom).call(zoom.transform, d3.zoomIdentity);

  const simFn = () => {
    link.attr("d", linkArc);
    // node.attr("transform", d => `translate(${d.x},${d.y})`);
    // node.attr("dx", d => d.x);
    // node.attr("dy", d => d.y);
    node.selectAll('circle')
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
    ;
    node.selectAll('text')
      .attr("x", d => d.x+8)
      .attr("y", d => d.y+0.3*(d.cats?10:6.4))
    ;
  };

  // simulation.tick(120);
  simulation.on("tick", simFn);

  const legendWrap = svg.append("g");
  const legend = legendWrap.append("rect")
      .attr("x", -width/2)
      .attr("y", -height/2)
      .attr("width", width)
      .attr("height", height/20)
      .attr("stroke", "#eee")
      .attr("fill", "#eee")
      .attr("stroke-width", 0)
  ;
  let wStep = width/types.length;
  for (let ix=0; ix<types.length; ix++) {
    let tp = types[ix];
    let clr = color(tp);
    legendWrap.append("rect")
        .attr("x", -width/2 + ix*wStep)
        .attr("y", -height/2)
        .attr("width", wStep)
        .attr("height", height/20)
        .attr("stroke", clr)
        .attr("fill", clr)
        .attr("stroke-width", 0)
    ;
    legendWrap.append("text")
        .text(tp)
        .attr("font-size", "1rem")
        .attr("x", -width/2 + ix*wStep + 4)
        .attr("y", -height/2 + 20)
        .attr("fill", "#fff")
      .clone(true).lower()
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("stroke-width", 5)
    ;
  };

  // invalidation.then(() => simulation.stop());
  return svg.node();

};

// function drawCanvg(data_, width=600, height=600) {

//   const data = data_ ?? {
//     links: [],
//     nodes: [],
//   };

//   const links = data.links.map(lk => Object.create(lk));
//   const nodes = data.nodes.map(nd => Object.create(nd));
//   const types = Array.from(new Set(links.map(d => d?.edge.label)));
//   const color = d3.scaleOrdinal(types, d3.schemeCategory10);

//   const simulation = d3.forceSimulation(nodes)
//       .force("link", d3.forceLink(links)
//         .id(d => d.id)
//       )
//       .force("charge", d3.forceManyBody().strength(-200))
//       .force("x", d3.forceX())
//       .force("y", d3.forceY())
//   ;

//   const svg = d3.create("svg")
//       .attr("viewBox", [-width/2, -height/2, width, height])
//       .style("font", "10px")
//   ;
//   const canvas = d3.create("canvas")
//     .attr("width", width)
//     .attr("height", height)
//   ;
//   const ctx = canvas.node().getContext('2d');

//   // Per-type markers, as they don't inherit styles.
//   svg.append("defs").selectAll("marker")
//     .data(types)
//     .join("marker")
//       .attr("id", d=>`arrow-${d}`)
//       .attr("viewBox", "0 -5 10 10")
//       .attr("refX", 15)
//       .attr("refY", -0.5)
//       .attr("markerWidth", 6)
//       .attr("markerHeight", 6)
//       .attr("orient", "auto")
//     .append("path")
//       .attr("fill", d => color(d))
//       .attr("d", "M0,-5L10,0L0,5")
//   ;

//   const link = svg.append("g")
//       .attr("fill", "none")
//       .attr("stroke-width", 1)
//     .selectAll("path")
//     .data(links)
//     .join("path")
//       .attr("stroke", d => color(d.edge.label))
//       .attr("marker-end", d => `url(${new URL(`#arrow-${d?.edge.label}`, location)})`)
//   ;

//   const node = svg.append("g")
//       .attr("fill", "currentColor")
//       .attr("stroke-linecap", "round")
//       .attr("stroke-linejoin", "round")
//     .selectAll("g")
//     .data(nodes)
//     .join("g")
//       .call(drag(simulation))
//   ;

//   node.append("circle")
//       .attr("stroke", "white")
//       .attr("fill", d => d.cats?"black":color(`Item-Role[${d.role}]`))
//       .attr("stroke-width", 1.5)
//       .attr("r", d => (d.cats||d.role=="形式FOR")? 5 : 3)
//   ;

//   node.append("text")
//       .text(d => d.word)
//       .attr("font-size", d => (d.cats)?"1rem":(d.role=="形式FOR"?"0.8rem":"0.64rem"))
//       .attr("fill", d => (d.cats)?"#000":color(`Item-Role[${d.role}]`))
//     .clone(true).lower()
//       .attr("fill", "none")
//       .attr("stroke", d => (d.cats)?"#fffffa":"none")
//       .attr("stroke-width", d => (d.cats)? 5 : 1)
//   ;


//   let pen = canvg.Canvg.fromString(ctx, svg.node().outerHTML);
//   pen.start();

//   const zoomed = (e)=>{
//     let t = e.transform;
//     link
//         .attr("transform", t)
//         // .attr("transform-origin", `50% 50%`)
//         // .attr("font-size", `${8/(t.k)+t.k*0.1}`)
//     ;
//     node
//         .attr("transform", t)
//         // .attr("transform-origin", `50% 50%`)
//         // .attr("r", `${1/(t.k)}`)
//         .attr("font-size", `${8/(t.k)+t.k*0.1}`)
//     ;
//     pen = canvg.Canvg.fromString(ctx, svg.node().outerHTML);
//     pen.start();
//   };

//   const zoom = d3.zoom()
//     // .extent([[0-margin.left, 0-margin.top], [width+margin.right, height+margin.bottom]])
//     // .extent([[0, 0], [width, height]])
//     // .scaleExtent([0.25, 4])
//     .on("zoom", zoomed)
//   ;

//   svg.call(zoom).call(zoom.transform, d3.zoomIdentity);

//   simulation.on("tick", () => {
//     link.attr("d", linkArc);
//     // node.attr("transform", d => `translate(${d.x},${d.y})`);
//     // node.attr("dx", d => d.x);
//     // node.attr("dy", d => d.y);
//     node.selectAll('circle')
//       .attr("cx", d => d.x)
//       .attr("cy", d => d.y)
//     ;
//     node.selectAll('text')
//       .attr("x", d => d.x+8)
//       .attr("y", d => d.y+0.3*(d.cats?10:6.4))
//     ;
//     pen = canvg.Canvg.fromString(ctx, svg.node().outerHTML);
//     pen.start();
//   });

//   // invalidation.then(() => simulation.stop());
//   return canvas.node();

// };




// function drawCanvas(data_, width=2000, height=2000) {

//   const data = data_ ?? {
//     links: [],
//     nodes: [],
//   };

//   const links = data.links.map(lk => Object.create(lk));
//   const nodes = data.nodes.map(nd => Object.create(nd));

//   const simulation = d3.forceSimulation(nodes)
//       .force("link", d3.forceLink(links).id(d => d.id))
//       .force("charge", d3.forceManyBody().strength(-100))
//       .force("x", d3.forceX())
//       .force("y", d3.forceY())
//   ;
//   const types = Array.from(new Set(links.map(d => d?.edge.label)));
//   const color = d3.scaleOrdinal(types, d3.schemeCategory10);

//   // ================================================================================

//   const canvas = d3.create("canvas")
//     .attr("width", width)
//     .attr("height", height)
//   ;

//   function update() {
//     const ctx = canvas.node().getContext("2d");
//     ctx.save();
//     ctx.clearRect(0,0,width,height);

//     // window.requestAnimationFrame(update);
//   }

//   // // clear canvas
//   // ctx.fillStyle = "#fff";
//   // ctx.rect(0,0,width,height);
//   // ctx.fill();

//   // var elements = dataContainer.selectAll("custom.rect");
//   // elements.each(function(d) {
//   //   var node = d3.select(this);

//   //   ctx.beginPath();
//   //   ctx.fillStyle = node.attr("fillStyle");
//   //   ctx.rect(node.attr("x"), node.attr("y"), node.attr("size"), node.attr("size"));
//   //   ctx.fill();
//   //   ctx.closePath();

//   // });

//   const zoomed = (e)=>{
//     let t = e.transform;
//     //
//     //
//   };

//   const zoom = d3.zoom()
//     .on("zoom", zoomed)
//   ;

//   canvas.call(zoom).call(zoom.transform, d3.zoomIdentity);

//   simulation.on("tick", () => {
//     link.attr("d", linkArc);
//     // node.attr("transform", d => `translate(${d.x},${d.y})`);
//     // node.attr("dx", d => d.x);
//     // node.attr("dy", d => d.y);
//     node.selectAll('circle')
//       .attr("cx", d => d.x)
//       .attr("cy", d => d.y)
//     ;
//     node.selectAll('text')
//       .attr("x", d => d.x+8)
//       .attr("y", d => d.y+0.3*(d.cats?10:6.4))
//     ;
//   });

//   // invalidation.then(() => simulation.stop());
//   return canvas.node();

//   // ================================================================================

//   const svg = d3.create("svg")
//       .attr("viewBox", [-width/2, -height/2, width, height])
//       .style("font", "10px")
//   ;

//   // Per-type markers, as they don't inherit styles.
//   svg.append("defs").selectAll("marker")
//     .data(types)
//     .join("marker")
//       .attr("id", d=>`arrow-${d}`)
//       .attr("viewBox", "0 -5 10 10")
//       .attr("refX", 15)
//       .attr("refY", -0.5)
//       .attr("markerWidth", 6)
//       .attr("markerHeight", 6)
//       .attr("orient", "auto")
//     .append("path")
//       .attr("fill", "#f00")
//       .attr("d", "M0,-5L10,0L0,5")
//   ;

//   const link = svg.append("g")
//       .attr("fill", "none")
//       .attr("stroke-width", 1)
//     .selectAll("path")
//     .data(links)
//     .join("path")
//       .attr("stroke", d => color(d.edge.label))
//       .attr("marker-end", d => `url(${new URL(`#arrow-${d.edge.label}`, location)})`)
//   ;

//   const node = svg.append("g")
//       .attr("fill", "currentColor")
//       .attr("stroke-linecap", "round")
//       .attr("stroke-linejoin", "round")
//     .selectAll("g")
//     .data(nodes)
//     .join("g")
//       .call(drag(simulation))
//   ;

//   node.append("circle")
//       .attr("stroke", d => d.cats?"black":"white")
//       .attr("fill", d => d.cats?"yellow":"black")
//       .attr("stroke-width", 1.5)
//       .attr("r", 4)
//   ;

//   node.append("text")
//       .text(d => d.word)
//       .attr("font-size", d => d.cats?"1rem":"0.64rem")
//     .clone(true).lower()
//       .attr("fill", "none")
//       .attr("stroke", d => d.cats?"#ffa":"white")
//       .attr("stroke-width", d => d.cats? 3 : 1)
//   ;

//   const zoomed = (e)=>{
//     let t = e.transform;
//     link
//         .attr("transform", t)
//         // .attr("transform-origin", `50% 50%`)
//         // .attr("font-size", `${8/(t.k)+t.k*0.1}`)
//         ;
//     node
//         .attr("transform", t)
//         // .attr("transform-origin", `50% 50%`)
//         // .attr("r", `${1/(t.k)}`)
//         .attr("font-size", `${8/(t.k)+t.k*0.1}`)
//         ;
//   };

//   const zoom = d3.zoom()
//     // .extent([[0-margin.left, 0-margin.top], [width+margin.right, height+margin.bottom]])
//     // .extent([[0, 0], [width, height]])
//     // .scaleExtent([0.25, 4])
//     .on("zoom", zoomed)
//     ;

//   simulation.on("tick", () => {
//     link.attr("d", linkArc);
//     // node.attr("transform", d => `translate(${d.x},${d.y})`);
//     // node.attr("dx", d => d.x);
//     // node.attr("dy", d => d.y);
//     node.selectAll('circle')
//       .attr("cx", d => d.x)
//       .attr("cy", d => d.y)
//     ;
//     node.selectAll('text')
//       .attr("x", d => d.x+8)
//       .attr("y", d => d.y+0.3*(d.cats?10:6.4))
//     ;
//   });

//   svg.call(zoom).call(zoom.transform, d3.zoomIdentity);



//   // invalidation.then(() => simulation.stop());
//   return svg.node();

// };




function draw(links_, forces) {
  const links = Object.create(links_);
  links.forEach(link=>{
    link.source = JSON.stringify(link.node0);
    link.target = JSON.stringify(link.node1);
  });
  const data = ({
    nodes: Array.from(new Set(links.map(l => [l.source, l.target]).flat()), str => {
      let xx = JSON.parse(str);
      xx.id = str;
      return xx;
    }),
    links: links,
  });
  const d3wrap = d3.select("#d3wrap");
  d3wrap.selectAll("svg").remove();
  const svg = drawSvg(data, forces);
  d3wrap.node().append(svg);
  // const canvg = drawCanvg(data);
  // d3wrap.node().append(canvg);
};
