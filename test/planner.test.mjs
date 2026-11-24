import test from 'node:test'
import assert from 'node:assert/strict'
import {baseline,valid,initial} from '../lib/planner.mjs'
const hours=[{time:'2026-11-25T14:00',hour:14,pm:3},{time:'2026-11-25T16:00',hour:16,pm:62},{time:'2026-11-25T18:00',hour:18,pm:40}]
test('compares only feasible forecast hours',()=>{
 assert.match(baseline(initial,hours).timing,/18:00/)
 assert.match(baseline(initial,hours.slice(0,2)).timing,/16:00/)
})
test('handles missing data',()=>assert.match(baseline(initial,[]).timing,/No forecast/))
test('validates windows and locations',()=>{assert.equal(valid({...initial,start:20}),false);assert.equal(valid({...initial,city:'constructor'}),false)})
test('adapts community and indoor suggestions',()=>{const result=baseline({...initial,audience:'Community',indoor:'Dust'},hours);assert.match(result.travel,/shared/);assert.match(result.indoor,/damp/)})
