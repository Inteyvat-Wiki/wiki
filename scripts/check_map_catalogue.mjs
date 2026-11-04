import assert from 'node:assert/strict';
import './check_map_heights.mjs';
import './check_map_task_dependencies.mjs';
import './check_map_mask_replay.mjs';
import './check_map_condition_scope.mjs';
import { createJiti } from 'jiti';
const jiti = createJiti(import.meta.url, { fsCache: false });
const { resolve_map_location, map_location_position } = await jiti.import('../shared/map_location.ts');
const linkScenes = [{ id: 'teyvat' }, { id: 'enkanomiya' }];
const linked = resolve_map_location({scene:'enkanomiya', x:'0', z:'-45.25'}, linkScenes);
assert.deepEqual(linked, { location:{scene:'enkanomiya',x:0,z:-45.25}, invalid:false });
assert.deepEqual(map_location_position(linked.location), {x:0,y:-45.25});
assert.deepEqual(resolve_map_location({}, linkScenes), {location:null, invalid:false});
for(const query of [{scene:'missing',x:'1',z:'2'}, {scene:'teyvat',x:'1'}, {scene:'teyvat',x:['1','2'],z:'3'}])
    assert.deepEqual(resolve_map_location(query, linkScenes), {location:null, invalid:true});
console.log('Map location links validate scene membership and project game x/z without using height');
const { select_map_records } = await jiti.import('../shared/map_catalogue.ts');
const item = index => ({ id: `point-3-${index}`, label: `Point ${index}`, kind: 'point', description: '',
    details: [], relations: [], texts: [{ label: 'Original', text: index === 41 ? '神的棋盘' : 'A scene point' }], issues: [] });
const catalogue = { schema: 1, items: Array.from({ length: 85 }, (_, index) => item(index)) };
assert.equal(select_map_records(catalogue, {}).items.length, 40);
assert.equal(select_map_records(catalogue, { offset: 80 }).items.length, 5);
assert.equal(select_map_records(catalogue, { search: '神的棋盘' }).items[0].id, 'point-3-41');
assert.equal(select_map_records(catalogue, { id: 'point-3-12' }).total, 1);
assert.equal(select_map_records(catalogue, { kind: 'floor' }).total, 0);
assert.throws(() => select_map_records(catalogue, { offset: NaN }), /offset/);
assert.throws(() => select_map_records({ schema: 1, items: [{ ...item(1), rawFields: {} }] }, {}), /Invalid/);
console.log('Map catalogue contract, filtering and pagination checks passed');
const { map_defaults, valid_map_selections, map_visible, map_layer_label, map_image_corners, image_affine, map_edge_mask, map_layer_context, map_overlay_bounds, map_group_centers, map_nearest_group } = await jiti.import('../shared/map_display.ts');
const { map_area_bounds } = await jiti.import('../shared/map_display.ts');
const { valid_map_condition_values } = await jiti.import('../shared/map_display.ts');
const { evaluate_task_conditions, evaluate_external_task_conditions, create_number_intervals } = await jiti.import('../app/utils/task_condition.ts');
const questCondition={id:'quest',title:'Quest',subtitle:'Original step',type:'step',task:null,step:123,state:'finished'};
const indexCondition={id:'index',title:'Mask',subtitle:'Group index',type:'number',value:2,comparison:'equal'};
const flagCondition={id:'flag',title:'Level state',subtitle:'Active',type:'boolean',value:true};
assert.equal(evaluate_external_task_conditions([questCondition],{}),undefined);
assert.equal(evaluate_external_task_conditions([questCondition],{quest:'ongoing'}),false);
assert.equal(evaluate_external_task_conditions([questCondition],{quest:'finished'}),true);
assert.equal(evaluate_external_task_conditions([questCondition,'not'],{quest:'failed'}),true);
assert.equal(evaluate_external_task_conditions([questCondition,flagCondition,'and'],{quest:'finished'}),undefined);
assert.equal(evaluate_external_task_conditions([questCondition,flagCondition,'and'],{quest:'ongoing'}),false);
assert.equal(evaluate_external_task_conditions([indexCondition],{index:2}),true);
assert.equal(evaluate_external_task_conditions([],{}),undefined);
// Existing task timelines keep their original implicit ordering.
assert.equal(evaluate_task_conditions([questCondition],124,[123,124],{}),true);
assert.equal(evaluate_task_conditions([questCondition],123,[123,124],{}),false);
const groups=[{rules:[{when:[questCondition,indexCondition,'and',flagCondition,'and']}]}];
assert.deepEqual(valid_map_condition_values(groups,{quest:'finished',index:2,flag:false,oldStory:'late'}),{quest:'finished',index:2,flag:false});
assert.deepEqual(valid_map_condition_values(groups,{quest:'invented',index:'2',flag:1}),{quest:'finished'});
assert.deepEqual(valid_map_condition_values(groups,undefined),{quest:'finished'});
assert.deepEqual(valid_map_condition_values(groups,{quest:'ongoing'}),{quest:'ongoing'});
assert(create_number_intervals([indexCondition]).some(interval=>interval.sample===2));
console.log('Mask source-condition controls retain unknowns, shared quest states and existing task timeline semantics');
const { resolve_map_mask_previews } = await jiti.import('../app/utils/map_mask_conditions.ts');
const maskRules=[{when:[indexCondition],previewOption:'second'},
    {when:[{...indexCondition,value:0}],previewOption:'first'},
    {when:[flagCondition],previewOption:'first'}, {when:[questCondition]}];
const maskGroups=[{previewKey:'preview',rules:maskRules}];
const before={chapter:'late',preview:'second'};
const preview=values=>resolve_map_mask_previews(maskGroups,before,values);
assert.deepEqual(preview({}).states,{chapter:'late',preview:'hidden'});
assert.equal(preview({index:0}).states.preview,'first');
assert.equal(preview({index:2}).states.preview,'second');
assert.equal(preview({index:99}).states.preview,'hidden');
assert.equal(preview({flag:true}).states.preview,'first');
assert.equal(preview({flag:false}).states.preview,'hidden');
assert.equal(preview({quest:'finished'}).states.preview,'hidden');
assert.equal(preview({flag:true,index:0}).states.preview,'first');
assert.equal(preview({flag:true,index:2}).states.preview,'hidden');
assert.deepEqual([...preview({flag:true,index:2}).conflicts].sort(),['flag','index']);
assert.deepEqual(before,{chapter:'late',preview:'second'});
const visibleImage={op:'selected',key:'preview',values:['first']};
assert.equal(map_visible(visibleImage,preview({index:0}).states,true),true);
assert.equal(map_visible(visibleImage,preview({index:2}).states,true),false);
assert.equal(map_visible(visibleImage,preview({}).states,true),false);
console.log('Mask selectors change rendered image predicates; unknowns, conflicts and unbound quest actions never show masks');
const areaParts = [{points:[{x:1,y:2},{x:4,y:2},{x:1,y:5}],maximumHeight:190},
    {points:[{x:101,y:-2},{x:104,y:-2},{x:101,y:5}],minimumHeight:200,maximumHeight:217}];
assert.deepEqual(map_area_bounds({polygons:areaParts}), [{x:1,y:-2},{x:104,y:5}]);
assert.deepEqual(map_area_bounds({polygons:areaParts.map(part=>({points:part.points}))}), map_area_bounds({polygons:areaParts}));
assert.equal(map_area_bounds({polygons:[]}), undefined);
console.log('Area framing retains every polygon part and ignores height metadata');
const choices = [{ id: 'chapter', label: 'Chapter', default: 'early', evidence: 'source', options: [{ id: 'early', label: 'Early' }, { id: 'late', label: 'Late' }] }];
assert.deepEqual(map_defaults(choices), { chapter: 'early' });
assert.deepEqual(valid_map_selections(choices, { chapter: 'removed-value', unknown: 'late' }), { chapter: 'early' });
assert.deepEqual(valid_map_selections(choices, { chapter: null }), {});
assert.deepEqual(valid_map_selections(choices, { chapter: 'late' }), { chapter: 'late' });
const late = { op: 'selected', key: 'chapter', values: ['late'] };
assert.equal(map_visible(late, {}, false), false);
assert.equal(map_visible(late, {}, true), true);
assert.equal(map_visible(late, { chapter: 'early' }, true), false);
assert.equal(map_layer_label({ label: 'Original', labelVariants: [{ label: 'Renamed', condition: late }] }, {}), 'Original');
assert.equal(map_layer_label({ label: 'Original', labelVariants: [{ label: 'Renamed', condition: late }] }, { chapter: 'late' }), 'Renamed');
const corners = map_image_corners({ bounds: [{ x: -20, y: 10 }, { x: 30, y: 50 }] });
assert.deepEqual(corners, [{ x: 30, y: 50 }, { x: 30, y: 10 }, { x: -20, y: 10 }, { x: -20, y: 50 }]);
// CRS.Simple projects (latitude=x, longitude=-y) to screen (-y,-x).
assert.equal(image_affine(corners.map(p => ({ x: -p.y, y: -p.x }))), 'matrix(0.04,0,0,0.05,-50,-30)');
assert.equal(image_affine([{ x: 4, y: 8 }, { x: 4, y: 18 }, { x: -16, y: 18 }, { x: -16, y: 8 }], 10), 'matrix(0,1,-2,0,4,8)');
assert.throws(() => image_affine([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 11, y: 10 }, { x: 0, y: 10 }]), /Non-affine/);
assert.equal(map_edge_mask(), 'none');
assert.match(map_edge_mask({ horizontal: 0.125, vertical: 0.25 }), /#000 12.5%,#000 87.5%/);
assert.match(map_edge_mask({ horizontal: 0.125, vertical: 0.25 }), /#000 25%,#000 75%/);
console.log('Map display state, image orientation, affine projection and soft-edge checks passed');
const floors = [
    {id:'floor-a', groupId:'group-a', label:'Shared name', order:1},
    {id:'floor-b', groupId:'group-a', label:'Lower floor', order:0},
    {id:'floor-locked', groupId:'group-a', label:'Locked floor', order:-1, condition:late},
    {id:'floor-other', groupId:'group-b', label:'Shared name', order:1},
];
assert.deepEqual(map_layer_context(floors, 'floor-a', {chapter:'early'}, true).map(f=>f.id), ['floor-a','floor-b']);
assert.deepEqual(map_layer_context(floors, 'floor-b', {}, true).map(f=>f.id), ['floor-a','floor-b','floor-locked']);
assert.deepEqual(map_layer_context(floors, 'floor-a', {}, false).map(f=>f.id), ['floor-a','floor-b']);
assert.deepEqual(map_layer_context(floors, 'floor-locked', {chapter:'early'}, true), []);
assert.deepEqual(map_layer_context(floors, '', {}, true), []);
assert.deepEqual(map_layer_context(floors, 'missing-floor', {}, true), []);
// Group framing must include disconnected images, not just the first floor piece.
assert.deepEqual(map_overlay_bounds([{bounds:[{x:1,y:2},{x:3,y:4}]}, {bounds:[{x:30,y:40},{x:10,y:-5}]}]), [{x:1,y:-5},{x:30,y:40}]);
assert.equal(map_overlay_bounds([]), undefined);
console.log('Map floor-group context, condition filtering and full-group framing checks passed');
const groupCenters = map_group_centers({layers: [...floors, {id:'floor-unpositioned',groupId:'group-unpositioned'}], overlays:[
    {kind:'layer',layerId:'floor-a',bounds:[{x:0,y:0},{x:100,y:100}]},
    {kind:'layer',layerId:'floor-b',bounds:[{x:200,y:200},{x:300,y:300}]},
    {kind:'layer',layerId:'floor-other',bounds:[{x:2000,y:-100},{x:2200,y:100}]},
    {kind:'base',bounds:[{x:-10000,y:-10000},{x:10000,y:10000}]},
]});
assert.deepEqual(groupCenters, [{id:'group-a',position:{x:150,y:150}},{id:'group-b',position:{x:2100,y:0}}]);
assert.equal(map_nearest_group(groupCenters, null), null);
assert.equal(map_nearest_group(groupCenters, {x:150,y:150}), 'group-a');
assert.equal(map_nearest_group(groupCenters, {x:1800,y:0}), 'group-b');
assert.equal(map_nearest_group(groupCenters, {x:-2000,y:150}), null);
assert.equal(map_nearest_group(groupCenters.slice(0,1), {x:1174,y:150}), null);
assert.equal(map_nearest_group(groupCenters.slice(0,1), {x:1173.99,y:150}), 'group-a');
assert.equal(map_nearest_group(groupCenters.slice(0,1), {x:950,y:950}), null);
console.log('Map center-based picker checks passed: complete group bounds, nearest group, radius and missing geometry');
