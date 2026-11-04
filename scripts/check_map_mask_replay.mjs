import assert from 'node:assert/strict';
import { createJiti } from 'jiti';
const jiti = createJiti(import.meta.url, {fsCache:false});
const {resolve_map_mask_previews:resolve} = await jiti.import('../app/utils/map_mask_conditions.ts');
const graph={schema:1,sameTaskOrder:'ascending',edges:[{from:{task:'middle',step:51},to:{task:'last',step:1}}]};
const event=(id,task,step,visible,order=0,state='finished')=>({id,kind:'event',when:[{id,task,step,type:'step',state,title:'',subtitle:''}],write:{visible,order}});
const group=(rules,initial=false)=>({id:'area',previewKey:'preview',rules,replay:{initialVisible:initial,visibleOption:'index-0',evidence:'inferred'}});
const first=event('first','middle',13,true), second=event('second','last',6,false);
const run=(rules,values,initial=false)=>resolve([group(rules,initial)],{preview:'index-99'},values,graph);
assert.equal(run([] ,{},true).states.preview,'index-0');
assert.equal(run([] ,{},false).states.preview,'hidden');
assert.equal(run([first,second],{first:'finished',second:'unstarted'}).states.preview,'index-0');
assert.equal(run([second,first],{first:'finished',second:'finished'}).states.preview,'hidden');
assert.equal(run([first,second],{second:'finished'}).states.preview,'hidden'); // implied predecessor is replayed first
assert.equal(run([first,second],{first:'unstarted',second:'finished'}).states.preview,'hidden');
assert(run([first,second],{first:'unstarted',second:'finished'}).conflicts.has('first'));
const third=event('third','last',20,true);
assert.equal(run([second,third],{second:'finished',third:'ongoing'}).states.preview,'hidden');
assert.equal(run([second,third],{second:'finished',third:'finished'}).states.preview,'index-0');
const a=event('a','same',1,true,1), b=event('b','same',1,false,7);
assert.equal(run([b,a],{a:'finished',b:'finished'}).states.preview,'hidden'); // action-list order, not export array order
const fail=event('failure','last',6,true,0,'failed');
assert.equal(run([second,fail],{second:'failed',failure:'failed'}).states.preview,'index-0');
const unrelated=event('other','unrelated',1,false);
assert(run([first,unrelated],{first:'finished',other:'finished'}).conflicts.has('first'));
assert.equal(run([first,{...unrelated,write:{visible:true,order:0}}],{first:'finished',other:'finished'}).states.preview,'index-0');
assert(run([first,unrelated],{first:'finished'}).unresolved.has('area'));
// An unknown earlier action is dominated by a known later write even without inference.
assert.equal(resolve([group([first,second])],{}, {second:'finished'},graph).states.preview,'hidden');
const input={first:'finished',second:'unstarted'};run([first,second],input);assert.deepEqual(input,{first:'finished',second:'unstarted'});
const task='fontaine_research_institute_stagnating_in_the_rubble';
const institute=[0,1,2].map((phase)=>({...group([event('middle',task,40,phase===1,4),event('end',task,59,phase===2,4)],phase===0),
    id:`phase-${phase}`,previewKey:`phase-${phase}`}));
for(const [values,expected] of [[{middle:'unstarted',end:'unstarted'},0],[{middle:'finished',end:'unstarted'},1],[{middle:'finished',end:'finished'},2]]) {
    const result=resolve(institute,{},values,graph);assert.equal(result.conflicts.size,0);
    assert.deepEqual(Object.values(result.states).map(value=>value==='index-0'),[0,1,2].map(phase=>phase===expected));
}
assert(resolve(institute,{}, {middle:'unstarted',end:'finished'},graph).conflicts.has('middle'));
console.log('Map state replay: defaults, ordered writes, failures, conflicts and three Fontaine phases passed');

// Layer flags have no proven initial value: absence of a write must not invent one.
const layerTask='ripe_for_trouble';
const opened=event('open',layerTask,14,true), closed=event('close',layerTask,22,false);
const layerGroup=group([opened,closed],null);
let result=resolve([layerGroup],{preview:'index-99'},{open:'unstarted',close:'unstarted'},graph);
assert.equal(result.states.preview,'hidden'); assert(result.unresolved.has('area'));
assert.equal(resolve([layerGroup],{}, {open:'finished',close:'unstarted'},graph).states.preview,'index-0');
assert.equal(resolve([layerGroup],{}, {open:'finished',close:'finished'},graph).states.preview,'hidden');
const failureClose=event('close',layerTask,22,false,0,'failed');
assert.equal(resolve([group([opened,failureClose],null)],{}, {open:'finished',close:'failed'},graph).states.preview,'hidden');
const nameBinding={id:'floor-name',taskCondition:{id:'name',type:'step',task:layerTask,step:21,state:'finished',title:'Task',subtitle:'Talk'}};
result=resolve([layerGroup],{'floor-name':'stale'}, {open:'finished',name:'finished',close:'unstarted'},graph,[nameBinding]);
assert.equal(result.states['floor-name'],'fulfilled');assert.equal(result.states.preview,'index-0');
result=resolve([layerGroup],{'floor-name':'fulfilled'}, {open:'finished',name:'unstarted',close:'unstarted'},graph,[nameBinding]);
assert.equal(result.states['floor-name'],'unfulfilled');
result=resolve([layerGroup],{}, {open:'finished',name:'unstarted',close:'finished'},graph,[nameBinding]);
assert(result.conflicts.has('name'));assert.equal(Object.hasOwn(result.states,'floor-name'),false);
console.log('Layer replay preserves unknown initial flags, applies completion/failure writes and synchronizes floor names');
