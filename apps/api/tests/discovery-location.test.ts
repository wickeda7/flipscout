import {test} from "node:test";
import assert from "node:assert/strict";
import {locateZip,distanceMiles,pilotStore} from "../src/retailers/discovery-location.js";
test("distance uses miles and is zero at the store",()=>{
  assert.equal(distanceMiles(pilotStore),0);
  assert.ok(distanceMiles({latitude:pilotStore.latitude+1,longitude:pilotStore.longitude})>69);
  assert.ok(distanceMiles({latitude:pilotStore.latitude+1,longitude:pilotStore.longitude})<70);
});
test("ZIP lookup validates identity and coordinate data",async()=>{
  const fixture={"post code":"33511","country abbreviation":"US",places:[{latitude:"27.9",longitude:"-82.3"}]};
  assert.deepEqual(await locateZip("33511",(async url=>{
    assert.equal(String(url),"https://api.zippopotam.us/us/33511");
    return Response.json(fixture);
  }) as typeof fetch),{latitude:27.9,longitude:-82.3});
  await assert.rejects(locateZip("33511",(async()=>Response.json({...fixture,"post code":"10001"})) as typeof fetch),/ZIP_LOOKUP_UNAVAILABLE/);
  await assert.rejects(locateZip("33511",(async()=>new Response("",{status:404})) as typeof fetch),/ZIP code was not found/);
  await assert.rejects(locateZip("33511",(async()=>{throw Error("private details");}) as typeof fetch),/ZIP_LOOKUP_UNAVAILABLE/);
});
