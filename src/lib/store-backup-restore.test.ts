import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  MAX_RESTORE_JSON_BYTES,
  normalizeStoreRestorePlan,
  readBoundedRestoreJson,
  restoreOptionsSchema,
  validateRestoreManifest,
} from "@/lib/store-backup-restore";
import { assertNormalizedRestorePlanConstraints } from "@/lib/store-backup-restore-plan-validation";

const TARGET="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACTOR="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OWNER="cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const MEMBER="dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const USER="eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const PRODUCT="11111111-1111-4111-8111-111111111111";
const CATEGORY="22222222-2222-4222-8222-222222222222";
const TYPE="33333333-3333-4333-8333-333333333333";
const ORDER="44444444-4444-4444-8444-444444444444";
const PAGE="66666666-6666-4666-8666-666666666666";
const PROFILE="77777777-7777-4777-8777-777777777777";
const THEME="88888888-8888-4888-8888-888888888888";
const OLD_MEDIA="https://source.example.test/media/product.jpg";

function manifest(){return validateRestoreManifest({
  version:"2026-07-26",exportedAt:"2026-08-30T08:00:00.000Z",
  source:{storeId:"foreign-installation-store",storeSlug:"source-shop",storeName:"Source Shop"},
  data:{
    store:{slug:"source-shop",custom_domain:"source.example.test",description:"Imported",currency_code:"BDT",locale:"en",plan:"pro",store_type:"general",logo_url:OLD_MEDIA,is_published:true},
    store_business_profiles:[{business_family:"commerce",catalog_mode:"multi_product",enabled_modules:[]}],
    store_themes:[{id:"12121212-1212-4212-8212-121212121212",preset_id:"default",mode:"dark",colors:{},typography:{},components:{},overrides:{},resolved_tokens:{},effects:{},theme_package_id:THEME}],
    product_categories:[{id:CATEGORY,name:"Category",parent_id:null,sort_order:0}],
    product_types:[{id:TYPE,name:"Type",sort_order:0,metric_schema:[]}],
    products:[{id:PRODUCT,name:"Product",price:1000,image_url:OLD_MEDIA,description:"Product",sizes:[],colors:[],category:"Category",type:"Type",featured:true,stock:3,is_available:true,images:[OLD_MEDIA],metric_values:{}}],
    blog_posts:[{id:"13131313-1313-4313-8313-131313131313",title:"Post",slug:"post",content:"Body",status:"published",embedded_product_ids:[PRODUCT]}],
    orders:[{id:ORDER,user_id:USER,order_number:"ORD-1",status:"pending",items:[{productId:PRODUCT,quantity:1}],subtotal:1000,delivery_fee:60,total:1060,customer_name:"Customer",customer_phone:"01700000000",shipping_address:"Address",shipping_city:"Dhaka",payment_method:"cod"}],
    product_reviews:[{id:"55555555-5555-4555-8555-555555555555",product_id:PRODUCT,user_id:USER,order_id:ORDER,author_name:"Customer",rating:5,review_text:"Great",status:"approved"}],
    customer_addresses:[{id:"14141414-1414-4414-8414-141414141414",user_id:USER,label:"Home",name:"Customer",phone:"01700000000",address:"Address",city:"Dhaka",is_default:true}],
    store_customer_profiles:[{id:PROFILE,user_id:USER,display_name:"Customer",status:"active",marketing_opt_in:false,tags:[]}],
    store_analytics_events:[{id:"15151515-1515-4515-8515-151515151515",order_id:ORDER,product_id:PRODUCT,event_name:"purchase_item",event_category:"commerce",order_number:"ORD-1",currency_code:"BDT",metadata:{productId:PRODUCT,orderId:ORDER}}],
    store_pages:[{id:PAGE,slug:"/",title:"Home",is_homepage:true}],
    store_page_blocks:[{id:"16161616-1616-4616-8616-161616161616",page_id:PAGE,block_type:"products",props:{productId:PRODUCT,pageId:PAGE},sort_order:0,is_visible:true,layout_variant:"grid",variant_options:{alignment:"left",mediaFit:"contain",rogue:"drop"},responsive_config:{hiddenOn:[]}}],
    store_page_revisions:[{id:"17171717-1717-4717-8717-171717171717",page_id:PAGE,blocks_snapshot:[{props:{productId:PRODUCT,pageId:PAGE},variantOptions:{alignment:"center",rogue:"drop"}}],revision_label:"Source"}],
    site_settings:[{id:"18181818-1818-4818-8818-181818181818",key:"media_library",value:[{id:"source-asset",url:OLD_MEDIA,resourceType:"image",folder:"source",publicId:"source/object",originalFilename:"product.jpg",createdAt:"2026-08-01T00:00:00.000Z"}]}],
    store_staff_invites:[{id:"19191919-1919-4919-8919-191919191919",invite_code:"SOURCE-CODE",email:"invitee@example.test",role:"owner",metadata:{}}],
    store_memberships:[{id:"20202020-2020-4020-8020-202020202020",user_id:ACTOR,role:"viewer"},{id:"21212121-2121-4121-8121-212121212121",user_id:MEMBER,role:"owner"}],
  },
  mediaFiles:[{originalUrl:OLD_MEDIA,fileName:"product.jpg",mimeType:"image/jpeg",resourceType:"image",folder:"products",declaredBytes:1234}],
});}

function options(){return restoreOptionsSchema.parse({targetStoreId:TARGET,replaceTargetContent:false,preserveTargetSlug:true,preserveTargetDomain:true,keepImportedStoreDraft:true,includeOperationalData:true,accessImportMode:"memberships_and_invites",replaceSubscription:false,format:"zip"});}
function context(){let n=0;const stagedAsset={id:"new-asset",url:"https://target.example.test/storage/product.jpg",resourceType:"image" as const,folder:"restore/op",bytes:1234,format:"jpg",publicId:`stores/${TARGET}/restore/op/product.jpg`,originalFilename:"product.jpg",createdAt:"2026-08-30T08:30:00.000Z",uploadedBy:ACTOR};return{operationId:"abababab-abab-4bab-8bab-abababababab",actorId:ACTOR,actorExistingRole:"admin" as const,target:{id:TARGET,owner_id:OWNER,name:"Target",slug:"target-shop",custom_domain:"target.example.test",description:null,currency_code:"BDT",locale:"en",plan:"basic",store_type:"general",logo_url:null,is_published:true},authUserIds:new Set([ACTOR,MEMBER,USER,OWNER]),validThemePackageIds:new Set([THEME]),existingSubscription:null,targetHasHomepage:true,stagedMedia:[{originalUrl:OLD_MEDIA,path:stagedAsset.publicId,declaredBytes:1234,asset:stagedAsset}],now:"2026-08-30T08:30:00.000Z",makeId:()=>`00000000-0000-4000-8000-${(++n).toString(16).padStart(12,"0")}`};}

test("unknown backup tables are rejected before server mutation",()=>{const m=manifest();assert.throws(()=>validateRestoreManifest({...m,data:{...m.data,unknown_table:[]}}),/Unsupported backup table/);});

test("oversized JSON is rejected from content-length before parsing",async()=>{const req=new Request("https://example.test/restore",{method:"POST",headers:{"content-length":String(MAX_RESTORE_JSON_BYTES+1)},body:"{}"});await assert.rejects(()=>readBoundedRestoreJson(req),/3 MiB JSON limit/);});

test("normalization remaps dependent identities and preserves target authority/identity",()=>{const c=context();const plan=normalizeStoreRestorePlan(manifest(),options(),c);assertNormalizedRestorePlanConstraints(plan as Record<string,unknown>);const product=plan.products[0]!,order=plan.orders[0]!,review=plan.product_reviews[0]!,analytics=plan.store_analytics_events[0]!,post=plan.blog_posts[0]!,page=plan.store_pages[0]!,profile=plan.store_customer_profiles[0]!,setting=plan.site_settings[0]!;assert.notEqual(product.id,PRODUCT);assert.equal(product.image_url,c.stagedMedia[0]!.asset.url);assert.equal(post.embedded_product_ids[0],product.id);assert.equal((order.items as Array<Record<string,unknown>>)[0]?.productId,product.id);assert.equal(review.product_id,product.id);assert.equal(review.order_id,order.id);assert.equal(analytics.product_id,product.id);assert.equal(analytics.order_id,order.id);assert.equal(analytics.order_number,order.order_number);assert.equal(page.is_homepage,false);assert.notEqual(profile.id,PROFILE);assert.deepEqual(setting.value,[c.stagedMedia[0]!.asset]);assert.equal(plan.store_memberships.find(r=>r.user_id===ACTOR)?.role,"admin");assert.equal(plan.store_memberships.find(r=>r.user_id===MEMBER)?.role,"admin");assert.equal(plan.store.slug,"target-shop");assert.equal(plan.store.custom_domain,"target.example.test");assert.equal(plan.store.is_published,false);assert.deepEqual(plan.store_subscriptions,[]);assert.equal(plan.store_themes[0]?.radius_scale,0.55);assert.equal(plan.store_themes[0]?.density_scale,0.5);assert.deepEqual(plan.store_page_blocks[0]?.variant_options,{alignment:"left",mediaFit:"contain"});assert.deepEqual((plan.store_page_revisions[0]?.blocks_snapshot as Array<Record<string,unknown>>)[0]?.variantOptions,{alignment:"center"});});

test("required destination users fail closed",()=>{const c=context();c.authUserIds.delete(USER);assert.throws(()=>normalizeStoreRestorePlan(manifest(),options(),c),/does not exist on the destination platform/);});

test("plan validator catches database-invalid analytics",()=>{const p=normalizeStoreRestorePlan(manifest(),options(),context()) as Record<string,any>;p.store_analytics_events[0].event_name="not-real";assert.throws(()=>assertNormalizedRestorePlanConstraints(p),/event_name is not supported/);});


test("restore plan rejects non-canonical Section Studio options after normalization",()=>{const p=normalizeStoreRestorePlan(manifest(),options(),context()) as Record<string,any>;p.store_page_blocks[0].variant_options={alignment:"left",rogue:"bad"};assert.throws(()=>assertNormalizedRestorePlanConstraints(p),/canonical R4 options/);});

test("R4 migration extends the atomic restore recordset with variant_options",()=>{const migration=readFileSync(resolve(process.cwd(),"supabase/migrations/20260914161500_r4_section_studio_variant_options.sql"),"utf8");assert.match(migration,/ADD COLUMN IF NOT EXISTS variant_options jsonb NULL/);assert.match(migration,/layout_variant,variant_options,custom_html/);assert.match(migration,/layout_variant text,variant_options jsonb,custom_html text/);});

test("#169 static contract uses actual applied migrations and removes legacy destructive browser helpers",()=>{const component=readFileSync(resolve(process.cwd(),"src/components/admin/StoreBackupManager.tsx"),"utf8");const base=readFileSync(resolve(process.cwd(),"supabase/migrations/20260830091030_atomic_store_restore_169.sql"),"utf8");const recovery=readFileSync(resolve(process.cwd(),"supabase/migrations/20260830091130_atomic_store_restore_recovery_169.sql"),"utf8");const acl=readFileSync(resolve(process.cwd(),"supabase/migrations/20260830091228_harden_store_restore_trigger_acl_169.sql"),"utf8");assert.doesNotMatch(component,/clearTargetStore|ensureCurrentUserMembership/);assert.match(component,/useMerchantConfirm/);assert.match(base,/store_backup_events_one_active_restore_per_target/);assert.match(base,/set_config\('app\.store_restore_mode', 'on', true\)/);assert.match(base,/restore_store_backup_transactional/);assert.match(recovery,/actor_user_id = p_actor_id/);assert.match(recovery,/request_digest = p_request_digest/);assert.match(acl,/dispatch_storefront_search_sync/);assert.match(acl,/from public, anon, authenticated/);});
