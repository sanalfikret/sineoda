import assert from 'node:assert/strict'
import {buildBrowseRows} from '../../src/utils/browse.ts'
const items=Array.from({length:25},(_,i)=>({id:String(i),title:String(i),rating:'Genel',genres:[],type:'belgesel',program:i===0?'student_cinema':null,videoFormat:i===1?'vertical':'standard'}))
const get=id=>items.find(item=>item.id===id)
const categories=[{id:'docs',title:'Belgeseller',itemIds:items.map(item=>item.id)},{id:'chosen',title:'Seçki',itemIds:['8','2','0']},{id:'hidden',title:'Gizli',hidden:true,itemIds:['1']}]
const rows=buildBrowseRows(items,{},categories,get,{categoryOrder:['chosen','docs']})
assert.deepEqual(rows.map(row=>row.id),['chosen','docs'])
assert.deepEqual(rows[0].items.map(item=>item.id),['8','2','0'])
assert.equal(rows[1].items.length,25)
const winners=buildBrowseRows(items,{},categories,get,{studentCinemaMonthlyWinners:items})
assert.equal(winners.find(row=>row.id==='student-monthly-winners').items.length,25)
assert.equal(buildBrowseRows(items,{},[...categories,{id:'student-monthly-winners',hidden:true,itemIds:[]}],get,{studentCinemaMonthlyWinners:items}).some(row=>row.id==='student-monthly-winners'),false)
items[0].rating='18+'
assert.equal(buildBrowseRows(items,{kidsSafe:true},categories,get)[0].items.some(item=>item.id==='0'),false)
assert.equal(buildBrowseRows(items,{studentOnly:true,kidsSafe:true},categories,get).length,0)
console.log('PASS: exact selection, order without winners, 25 items, hidden categories/winners, child profile filtering')
