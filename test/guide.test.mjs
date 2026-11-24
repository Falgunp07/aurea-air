import test from 'node:test'
import assert from 'node:assert/strict'
import {compareHours,guideAnswer} from '../lib/guide.mjs'
import {initial} from '../lib/planner.mjs'
const now=Date.parse('2026-11-24T15:30:00+05:30')
const hours=[15,16,17].map((hour,i)=>({time:'2026-11-24T'+hour+':00',hour,pm:[2,50,20][i]}))
test('compares upcoming hours and excludes elapsed forecasts',()=>{const text=compareHours(initial,hours,now);assert.match(text,/16:00/);assert.match(text,/17:00/);assert.doesNotMatch(text,/15:00/)})
test('guide handles missing readings and fixed schedules',()=>{assert.match(guideAnswer('Check warnings',initial,null),/unavailable/);assert.match(guideAnswer('My time is fixed',initial,null),/Keep the appointment/);assert.match(compareHours(initial,[],now),/no upcoming/)})
