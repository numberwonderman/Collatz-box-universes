// treeRenderer.js (impure: canvas)
export function drawTree(canvas, {nodes, edges}) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Set up drawing styles
  ctx.strokeStyle = '#6B7280'; // gray-500
  ctx.lineWidth = 1;

  // Draw edges
  ctx.beginPath();
  edges.forEach(({u,v}) => {
    // Find the coordinates of the two nodes
    const fromNode = nodes.find(n => n.id === u);
    const toNode = nodes.find(n => n.id === v);
    if (fromNode && toNode) {
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);
    }
  });
  ctx.stroke();

  // Set up node styles
  ctx.fillStyle = '#10B981'; // emerald-500

  // Draw nodes
  nodes.forEach(({x,y}) => {
    ctx.beginPath();
    ctx.arc(x,y,5,0,2*Math.PI);
    ctx.fill();
  });
}