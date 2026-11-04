import assert from 'node:assert/strict';
import { createJiti } from 'jiti';
const jiti = createJiti(import.meta.url, {fsCache:false});
const {map_footprint_intersects, map_height_hits, map_height_axis} = await jiti.import('../shared/map_heights.ts');
const square={points:[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}]};
assert(map_footprint_intersects(square,{x:5,y:5},0));
assert(map_footprint_intersects(square,{x:10,y:5},0));
assert(map_footprint_intersects(square,{x:12,y:5},2));
assert(!map_footprint_intersects(square,{x:12,y:5},1.99));
assert(map_footprint_intersects(square,{x:13,y:14},5));
assert(!map_footprint_intersects(square,{x:13,y:14},4.99));
const concave={points:[{x:0,y:0},{x:10,y:0},{x:10,y:3},{x:3,y:3},{x:3,y:10},{x:0,y:10}]};
assert(!map_footprint_intersects(concave,{x:8,y:8},1)); // Within bounds, outside the actual footprint.
assert(map_footprint_intersects(concave,{x:1,y:8},0));
assert(map_footprint_intersects({...square,points:[...square.points].reverse()},{x:5,y:5},0));
assert.throws(()=>map_footprint_intersects(square,{x:0,y:0},-1),/Invalid/);
const areas=[{id:'area',level:2,label:'Area',polygons:[{...square,minimumHeight:10,maximumHeight:20},{...square,minimumHeight:40,maximumHeight:50},
    {...square,points:square.points.map(p=>({x:p.x+100,y:p.y})),minimumHeight:100,maximumHeight:200}]},
    {id:'parent',level:1,label:'Parent',polygons:[{...square,minimumHeight:0,maximumHeight:60}]},
    {id:'unknown',level:2,label:'Unknown',polygons:[{...square,maximumHeight:45},square]}];
const hits=map_height_hits(areas,{x:5,y:5},0,[2]);
assert.deepEqual(hits.map(h=>h.id),['area:0','area:1','unknown:0','unknown:1']);
assert.equal(hits[2].polygon.minimumHeight,undefined);
assert.equal(map_height_axis(hits).minimum,7.6); // Known limits only: 10..50 plus 6% padding.
assert.equal(map_height_axis(hits.slice(3)),null);
assert.equal(map_height_hits(areas,{x:5,y:5},0,[1]).length,1);
assert.equal(map_height_hits(areas,{x:50,y:50},0).length,0);
assert.equal(map_height_hits(areas,{x:5,y:5},0,[]).length,0);
const flat=map_height_axis([{polygon:{minimumHeight:0,maximumHeight:0}}]);assert(flat.minimum<0 && flat.maximum>0);
console.log('Height probes: containment, edge/corner contact, concavity, disjoint parts, levels and unknown heights passed.');
