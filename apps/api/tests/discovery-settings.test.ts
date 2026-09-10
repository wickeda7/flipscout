import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultDiscoverySettings, restoreSettings, searchSettingsParams } from "../../web/src/lib/discovery-settings.js";

test("saved settings restore without any query execution state",()=>{
  const settings={zip:"00501",radiusMiles:10,category:"all",kind:"penny",sort:"price"} as const;
  assert.deepEqual(restoreSettings("",JSON.stringify(settings)),settings);
  assert.equal("page" in restoreSettings("",JSON.stringify(settings)),false);
});
test("explicit shared links override local preferences and preserve leading ZIP zeros",()=>{
  const settings={zip:"00501",radiusMiles:15,category:"all",kind:"sale",sort:"discount"} as const;
  assert.deepEqual(restoreSettings("?"+searchSettingsParams(settings),JSON.stringify(defaultDiscoverySettings)),settings);
});
test("malformed storage and untrusted link settings safely fall back",()=>{
  assert.deepEqual(restoreSettings("", "{broken"),defaultDiscoverySettings);
  assert.deepEqual(restoreSettings("?zip=../&radiusMiles=26&category=__proto__&kind=unknown&sort=bad",null),defaultDiscoverySettings);
  assert.deepEqual(restoreSettings("?zip=10001&zip=33511&radiusMiles=10&radiusMiles=25",null),defaultDiscoverySettings);
});
test("share links exclude credentials, page numbers and execution flags",()=>{
  const params=searchSettingsParams({...defaultDiscoverySettings,api_key:"secret",page:9,run:true} as any);
  assert.doesNotMatch(params,/secret|api_key|page|run/);
  assert.deepEqual(restoreSettings("?"+params,null),defaultDiscoverySettings);
});
test("unrelated URL parameters do not discard device preferences",()=>{
  assert.equal(restoreSettings("?utm_source=example",JSON.stringify({...defaultDiscoverySettings,zip:"10001"})).zip,"10001");
});

test("legacy category links restore location but never restrict the new search",()=>{
  const r=restoreSettings("?zip=10001&category=tools&radiusMiles=10",null);
  assert.equal(r.category,"all");assert.equal(r.zip,"10001");
  assert.doesNotMatch(searchSettingsParams(r),/category/);
});
