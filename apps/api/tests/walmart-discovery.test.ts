import {test} from "node:test";
import assert from "node:assert/strict";
import {normalizeWalmart,discoverWalmart} from "../src/retailers/walmart-discovery.js";
const query={retailer:"walmart",category:"all",kind:"all",page:1,zip:"33511",radiusMiles:25} as const;
const fixture=():any=>({search_metadata:{status:"Success"},search_parameters:{engine:"walmart",query:"clearance",store_id:"3463",page:"1"},
 search_information:{location:{postal_code:"33511",store_id:"3463"}},
 organic_results:[{us_item_id:"123456789",title:"Test",seller_name:"Walmart.com",primary_offer:{offer_price:5,was_price:10,currency:"USD"}}]});
test("Walmart-sold markdowns normalize without claiming shelf stock",()=>{
 const r=normalizeWalmart(fixture(),query);assert.equal(r.deals[0].kind,"sale");assert.equal(r.deals[0].quantity,null);
 assert.equal(r.retailer,"Walmart");assert.equal(r.deals[0].savings,5);
});
test("third-party sellers, keywords and missing comparison prices do not imply store clearance",()=>{
 const f=fixture();f.organic_results[0].seller_name="Other";assert.equal(normalizeWalmart(f,query).deals.length,0);
 f.organic_results[0].seller_name="Walmart.com";delete f.organic_results[0].primary_offer.was_price;
 f.organic_results[0].title="Clearance test";assert.equal(normalizeWalmart(f,query).deals.length,0);
});
test("mismatched Walmart store context fails and unsupported ZIP makes no request",async()=>{
 const f=fixture();f.search_information.location.store_id="1234";
 assert.throws(()=>normalizeWalmart(f,query),/CONTEXT_MISMATCH/);
 let calls=0;
 await assert.rejects(discoverWalmart({...query,zip:"10001"},async()=>{calls++;return fixture();}),/LOCATION_UNSUPPORTED/);
 assert.equal(calls,0);
});
