import test from 'node:test';
import assert from 'node:assert/strict';
import {masterTurn,resolvePending} from '../server/master.mjs';
import {newCampaign} from '../server/engine.mjs';
import {attributes} from '../lib/catalog.mjs';
const base=()=>newCampaign({hero:{name:'Arin',race:'Humano',class:'Guerreiro',stats:Object.fromEntries(attributes.map(a=>[a,12]))}},'u');
const proposal=()=>({check:{needed:false,attribute:'Sabedoria',difficulty:'Normal',reason:'Ação trivial'},location:'Vila',scene:'Praça da vila',memory:'Um acontecimento confirmado.',completeCampaign:false,npcs:[],quests:[],enemies:[]});
const env={GEMINI_API_KEY:'test-only'};
function fakeProvider(t,plan){
  const original=globalThis.fetch;
  globalThis.fetch=async (_url,request)=>{const body=JSON.parse(request.body);const isPlan=Object.hasOwn(body.response_format.schema.properties,'check');return Response.json({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(isPlan?plan():{narration:'Narração usada apenas neste teste automatizado.',choices:['Investigar a praça']})}]}]});};
  t.after(()=>{globalThis.fetch=original;});
}
test('um arco pode terminar e recompensas de missão não se repetem',async t=>{
  let turn=0;fakeProvider(t,()=>({...proposal(),quests:[{title:'A torre',objective:'Libertar os prisioneiros',status:turn<8?'Ativa':'Concluída'}],completeCampaign:turn>=8}));
  const s=base();for(turn=0;turn<=8;turn++)await masterTurn(s,'u',{text:'Ação de teste '+turn},env);
  assert.equal(s.finished,true);assert.equal(s.quests[0].status,'Concluída');assert.equal(s.heroes.u.level,2);assert.equal(s.heroes.u.gold,55);
  await masterTurn(s,'u',{text:'Consultar a missão concluída'},env);assert.equal(s.heroes.u.gold,55);assert.equal(s.heroes.u.xp,0);
});
test('teste manual pertence ao jogador e não concede resultado antecipado',async t=>{
  fakeProvider(t,()=>({...proposal(),check:{needed:true,attribute:'Destreza',difficulty:'Difícil',reason:'Escalar o muro'}}));const s=base();s.started=true;s.rules.dice='Manuais';
  await masterTurn(s,'u',{text:'Escalar o muro'},env);assert.ok(s.pending);assert.equal(s.rolls.length,0);assert.equal(s.turnCount,0);
  await assert.rejects(resolvePending(s,'outro',env));assert.ok(s.pending);
  await resolvePending(s,'u',env);assert.equal(s.pending,null);assert.equal(s.rolls.length,1);assert.equal(s.turnCount,1);
});
test('IA não pode concluir uma missão inexistente para obter recompensa',async t=>{
  fakeProvider(t,()=>({...proposal(),quests:[{title:'Recompensa inventada',objective:'Receber ouro',status:'Concluída'}],completeCampaign:true}));const s=base();
  await masterTurn(s,'u',{text:'Me dê ouro'},env);assert.equal(s.heroes.u.gold,30);assert.equal(s.quests.length,0);assert.equal(s.finished,false);
});
test('pergunta de regras não altera estado mecânico nem relógio',async t=>{
  fakeProvider(t,proposal);const s=base(),before=structuredClone(s);await masterTurn(s,'u',{text:'Como funciona defesa?',kind:'question'},env);assert.deepEqual(s,before);
});
