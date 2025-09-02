// treeRenderer.js (impure: canvas)
export function drawTree(canvas, {nodes, edges}) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // draw edges
  edges.forEach(({u,v}) => { /* ctx.moveTo(...); ctx.lineTo(...); */ });
  // draw nodes
  nodes.forEach(({x,y}) => { /* ctx.beginPath(); ctx.arc(x,y,5,0,2*Math.PI); ctx.fill(); */ });
}
