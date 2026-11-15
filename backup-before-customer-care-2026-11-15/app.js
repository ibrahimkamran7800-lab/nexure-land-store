/* NEXURE&LAND — Supabase email OTP, per-user cloud cart, live checkout and role-protected admin dashboard. */
"use strict";
const $ = id => document.getElementById(id);
const STORE = {products:"nl_products_v2",cart:"nl_cart_v2",wishlist:"nl_wishlist_v2",orders:"nl_orders_v2",customers:"nl_customers_v2",session:"nl_customer_session_v2",newsletter:"nl_newsletter_v2"};
// Supabase browser connection: publishable keys are designed for frontend use. Never add a secret key here.
const SUPABASE_URL = "https://dllqxqwfzzearcywhvxu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ehnNF5KFVivvAanoeIinag_a1VSwvvb";
const supabaseClient = window.supabase?.createClient ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;
const seedProducts = [
{id:"demo1",name:"Classic Oxford Shirt",price:3990,category:"Men",image_url:"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=85",description:"A clean Oxford shirt for smart everyday wear.",stock:12},
{id:"demo2",name:"Premium Cotton T-Shirt",price:2190,category:"Men",image_url:"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85",description:"Soft cotton with a modern, relaxed fit.",stock:20},
{id:"demo3",name:"Men's Casual Overshirt",price:4590,category:"Casual",image_url:"https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=900&q=85",description:"A versatile layer for everyday outfits.",stock:8},
{id:"demo4",name:"Slim Fit Black Trousers",price:4990,category:"Formal",image_url:"https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=85",description:"Tailored trousers with a sharp silhouette.",stock:14},
{id:"demo5",name:"Relaxed Fit Denim Jeans",price:5290,category:"Men",image_url:"https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=85",description:"Easy denim for daily wear.",stock:6},
{id:"demo6",name:"Men's Minimal Hoodie",price:4290,category:"Casual",image_url:"https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85",description:"A comfortable layer with a clean look.",stock:5},
{id:"demo7",name:"Formal White Shirt",price:3790,category:"Formal",image_url:"https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=85",description:"A crisp shirt for formal occasions.",stock:10},
{id:"demo8",name:"Men's Polo Shirt",price:3290,category:"Men",image_url:"https://images.unsplash.com/photo-1625910513413-5fc2c2f7f8b5?auto=format&fit=crop&w=900&q=85",description:"A polished casual staple.",stock:11},
{id:"shoe1",name:"Men's Everyday Sneakers",price:5990,category:"Shoes",image_url:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85",description:"Comfortable sneakers for everyday movement.",stock:12}
];
function read(key,fallback){try{const v=localStorage.getItem(key);return v?JSON.parse(v):fallback}catch{return fallback}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{toast("Browser storage is full. Remove a large product image and try again.");return false}}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function money(v){return new Intl.NumberFormat("en-PK",{style:"currency",currency:"PKR",maximumFractionDigits:0}).format(Number(v)||0)}
function makeId(prefix="nl"){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`}
let products=read(STORE.products,null)||seedProducts,cart=read(STORE.cart,[]),wishlist=read(STORE.wishlist,[]),orders=read(STORE.orders,[]),customers=read(STORE.customers,[]);
let authUser=null, otpSent=false, customerRecoveryMode=false, activeCategory="All",searchTerm="",customerMode="signin",adminView="products",toastTimer,cartSyncBusy=false,storeAdmin=false;
function toast(message){let el=$("toast");if(!el){el=document.createElement("div");el.id="toast";el.className="toast-message";el.setAttribute("role","status");document.body.appendChild(el)}el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600)}
function currentCustomer(){return authUser?{name:authUser.user_metadata?.full_name||authUser.email?.split("@")[0]||"Customer",email:authUser.email||"",phone:authUser.user_metadata?.phone||""}:null}
function saveAll(){write(STORE.products,products);write(STORE.cart,cart);write(STORE.wishlist,wishlist);write(STORE.orders,orders);write(STORE.customers,customers)}
function countCart(){return cart.reduce((s,i)=>s+Number(i.qty||0),0)}
function subtotal(){return cart.reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||0),0)}
function cartKey(id,size,color){return `${id}::${size}::${color}`}
function stockFor(id){return Number(products.find(p=>String(p.id)===String(id))?.stock||0)}

async function getSignedInUser(){const {data:{user},error}=await supabaseClient.auth.getUser();if(error)throw error;authUser=user;return user;}
async function loadCloudCart(){
 if(!supabaseClient)throw new Error("Supabase client is unavailable. Refresh the page and try again.");
 if(!authUser)return;
 const {data,error}=await supabaseClient.from("cart_items").select("item_key,product_id,product_name,unit_price,image_url,quantity,size,color").eq("user_id",authUser.id);
 if(error)throw error;
 cart=(data||[]).map(r=>({key:r.item_key,id:r.product_id,name:r.product_name,price:Number(r.unit_price)||0,image_url:r.image_url||"",qty:Number(r.quantity)||1,size:r.size||"M",color:r.color||"Black"}));
 write(STORE.cart,cart);renderCart();
}
async function saveCloudCartItem(item){
 if(!supabaseClient)throw new Error("Online cart is unavailable because Supabase did not load.");
 if(!authUser)throw new Error("Please sign in to save your bag online.");
 if(!item?.key||!item?.id||!item?.name)throw new Error("This product cannot be saved. Refresh and try again.");
 if(!Number.isInteger(Number(item.qty))||Number(item.qty)<1)throw new Error("Choose a valid item quantity.");
 const row={user_id:authUser.id,item_key:item.key,product_id:String(item.id),product_name:item.name,unit_price:Number(item.price)||0,image_url:item.image_url||"",quantity:Number(item.qty),size:item.size||"M",color:item.color||"Black",updated_at:new Date().toISOString()};
 const {error}=await supabaseClient.from("cart_items").upsert(row,{onConflict:"user_id,item_key"});if(error)throw error;
}
async function deleteCloudCartItem(key){if(!supabaseClient)throw new Error("Online cart is unavailable because Supabase did not load.");if(!authUser)throw new Error("Please sign in first.");const {error}=await supabaseClient.from("cart_items").delete().eq("user_id",authUser.id).eq("item_key",key);if(error)throw error;}
async function syncCartToCloud(){if(!supabaseClient||!authUser)throw new Error("Sign in to sync your online bag.");const {error}=await supabaseClient.from("cart_items").delete().eq("user_id",authUser.id);if(error)throw error;for(const item of cart)await saveCloudCartItem(item);}
async function refreshAdminRole(){
 storeAdmin=false;
 if(!supabaseClient||!authUser)return false;
 try{
  const {data,error}=await supabaseClient.from("profiles").select("role").eq("id",authUser.id).maybeSingle();
  if(error)throw error;
  storeAdmin=data?.role==="admin";
 }catch(error){console.error("Could not verify store admin role:",error);}
 return storeAdmin;
}
function isStoreAdmin(){return !!(authUser&&storeAdmin);}
async function handleAuthChange(user){
 authUser=user||null;
 if(authUser){
  await refreshAdminRole();
  try{await loadCloudCart();toast("Signed in. Your online bag is ready.");}catch(e){console.error(e);toast("Signed in, but online bag could not load. Check cart_items table and RLS.");}
 }else{storeAdmin=false;cart=[];write(STORE.cart,cart);renderCart();}
 renderCustomerModal();
}

async function loadSupabaseProducts(){
 if(!supabaseClient){
  $("storeMessage").textContent="Supabase library could not load. Showing the existing local preview collection.";
  return;
 }
 try{
  const {data,error}=await supabaseClient.from("products").select("*").order("name",{ascending:true});
  if(error)throw error;
  if(Array.isArray(data)&&data.length){
   products=data.map(p=>({
    id:p.id,
    name:p.name||"Untitled product",
    price:Number(p.price)||0,
    category:p.category||"Men",
    image_url:p.image_url||"",
    description:p.description||"",
    stock:Number(p.stock??p.quantity??99)
   }));
   write(STORE.products,products);
   $("storeMessage").textContent="Showing products from the NEXURE&LAND Supabase catalogue.";
  }else{
   products=seedProducts;
   $("storeMessage").textContent="Supabase is connected, but the products table is empty. Showing preview items until you add real products.";
  }
 }catch(error){
  console.error("Supabase products could not be loaded:",error);
  $("storeMessage").textContent="Could not load the Supabase catalogue. Check products table permissions (RLS) and try again; the existing preview collection is shown for now.";
 }
}
function renderProducts(){
 let list=products.filter(p=>(activeCategory==="All"||String(p.category).toLowerCase()===activeCategory.toLowerCase())&&(`${p.name} ${p.category} ${p.description||""}`).toLowerCase().includes(searchTerm.toLowerCase()));
 const sort=$("sortSelect").value;if(sort==="low")list.sort((a,b)=>a.price-b.price);if(sort==="high")list.sort((a,b)=>b.price-a.price);
 $("productGrid").innerHTML=list.length?list.map(p=>{const saved=wishlist.some(x=>String(x)===String(p.id)),online=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(p.id)),sold=Number(p.stock)<=0||!online;return `<article class="product-card"><div class="product-image-wrap" data-details="${esc(p.id)}" role="button" tabindex="0" aria-label="View ${esc(p.name)}"><img class="product-image" src="${esc(p.image_url||"")}" alt="${esc(p.name)}" loading="lazy"><span class="product-badge">${sold?"Sold out":"N&L EDIT"}</span><button class="wishlist-heart ${saved?"is-saved":""}" type="button" data-wish="${esc(p.id)}" aria-label="${saved?"Remove from":"Add to"} wishlist: ${esc(p.name)}" aria-pressed="${saved}">${saved?"♥":"♡"}</button></div><div class="product-info"><div class="product-category">${esc(p.category||"Collection")}</div><h3 class="product-name">${esc(p.name)}</h3><span class="product-price">${money(p.price)}</span><span class="stock-label">${sold?"Currently unavailable":`${p.stock} available`}</span><div class="product-actions"><button type="button" data-details="${esc(p.id)}">Quick view</button></div><button class="quick-add" type="button" data-add="${esc(p.id)}" ${sold?"disabled":""}>${sold?"Sold out":"Add to bag +"}</button></div></article>`}).join(""):'<div class="empty-state">No products found. Try another category or search.</div>';
 $("productGrid").querySelectorAll("img").forEach(img=>img.addEventListener("error",()=>{img.onerror=null;img.src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=700&q=80"}));
 $("productGrid").querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>addToCart(b.dataset.add));
 $("productGrid").querySelectorAll("[data-details]").forEach(b=>{b.onclick=()=>showProduct(b.dataset.details);b.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();showProduct(b.dataset.details)}}});
 $("productGrid").querySelectorAll("[data-wish]").forEach(b=>b.onclick=()=>toggleWishlist(b.dataset.wish));
}
function setCategory(category){activeCategory=category;$("filters").querySelectorAll("[data-category]").forEach(b=>b.classList.toggle("active",b.dataset.category===category));renderProducts()}
async function addToCart(id,size="M",color="Black",qty=1){
 const p=products.find(x=>String(x.id)===String(id));if(!p)return toast("Product is unavailable.");
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(p.id)))return toast("This is a preview item. Only products saved in the online catalogue can be ordered.");
 if(!authUser){openCustomer();toast("Create an account or sign in to save your bag online across devices.");return;}
 const requestedQty=Number(qty),availableStock=Number(p.stock);if(!Number.isInteger(requestedQty)||requestedQty<1)return toast("Please choose a valid quantity.");
 const key=cartKey(p.id,size,color),existing=cart.find(x=>x.key===key),next=(Number(existing?.qty)||0)+requestedQty;
 if(!Number.isFinite(availableStock)||availableStock<1||next>availableStock)return toast(`Only ${availableStock} item(s) are available.`);
 const item=existing||{key,id:p.id,name:p.name,price:Number(p.price)||0,image_url:p.image_url||"",qty:0,size,color};item.qty=next;item.name=p.name;item.price=Number(p.price)||0;item.image_url=p.image_url||"";
 try{await saveCloudCartItem(item);if(existing)Object.assign(existing,item);else cart.push(item);write(STORE.cart,cart);renderCart();toast(`${p.name} saved to your online bag.`);}catch(e){console.error(e);toast(`Could not save bag online: ${e.message||"check Supabase cart table"}`);}
}

function renderCart(){
 $("bagCount").textContent=countCart();$("drawerCount").textContent=`(${countCart()})`;$("bagSubtotal").textContent=money(subtotal());$("checkoutTotal").textContent=money(subtotal());$("checkoutBtn").disabled=!cart.length;
 $("bagItems").innerHTML=cart.length?cart.map(i=>`<div class="bag-item"><img src="${esc(i.image_url)}" alt="${esc(i.name)}"><div class="bag-item-copy"><h4>${esc(i.name)}</h4><p>${money(i.price)}</p><small>Size: ${esc(i.size)} · Color: ${esc(i.color)}</small><div class="qty-controls"><button type="button" data-qty="${esc(i.key)}" data-delta="-1">−</button><span>${i.qty}</span><button type="button" data-qty="${esc(i.key)}" data-delta="1">+</button></div></div><button class="remove-item" type="button" data-remove="${esc(i.key)}">✕</button></div>`).join(""):'<div class="empty-state">Your bag is waiting for something good.</div>';
 $("bagItems").querySelectorAll("img").forEach(img=>img.addEventListener("error",()=>{img.onerror=null;img.src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=300&q=80"}));
 $("bagItems").querySelectorAll("[data-qty]").forEach(b=>b.onclick=()=>{
  const item=cart.find(x=>x.key===b.dataset.qty);if(!item)return;
  const delta=Number(b.dataset.delta);if(delta!==1&&delta!==-1)return;
  const next=(Number(item.qty)||0)+delta;
  if(!authUser)return toast("Please sign in to update your online bag.");
  if(next>stockFor(item.id))return toast("You have reached the available stock.");
  (async()=>{try{if(next<=0){await deleteCloudCartItem(item.key);cart=cart.filter(x=>x.key!==item.key);}else{item.qty=next;await saveCloudCartItem(item);}write(STORE.cart,cart);renderCart();}catch(err){toast("Could not update online bag: "+err.message);try{await loadCloudCart();}catch(_){}}})();
 });
 $("bagItems").querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{const key=b.dataset.remove;if(!authUser)return toast("Please sign in first.");(async()=>{try{await deleteCloudCartItem(key);cart=cart.filter(x=>x.key!==key);write(STORE.cart,cart);renderCart()}catch(e){toast("Could not remove item online: "+e.message)}})()});
}
function closeAll(){document.querySelectorAll(".modal").forEach(m=>m.classList.add("hidden"));$("bagDrawer").classList.remove("open");$("overlay").classList.add("hidden");document.body.classList.remove("no-scroll");document.querySelector(".main-nav").classList.remove("mobile-nav")}
function openModal(id){closeAll();$(id).classList.remove("hidden");$("overlay").classList.remove("hidden");document.body.classList.add("no-scroll")}
function openBag(){closeAll();$("bagDrawer").classList.add("open");$("overlay").classList.remove("hidden");document.body.classList.add("no-scroll")}
function toggleWishlist(id){wishlist=wishlist.some(x=>String(x)===String(id))?wishlist.filter(x=>String(x)!==String(id)):[...wishlist,id];write(STORE.wishlist,wishlist);renderProducts();renderWishlist();if(!$("customerModal").classList.contains("hidden"))renderCustomerView("wishlist")}
function renderWishlist(){
 const saved=products.filter(p=>wishlist.some(id=>String(id)===String(p.id)));
 $("wishlistCount").textContent=wishlist.length;
 $("wishlistHeadingCount").textContent=String(saved.length);
 $("wishlistItems").innerHTML=saved.length?saved.map(p=>`<article class="wishlist-product"><img src="${esc(p.image_url||"")}" alt="${esc(p.name)}" loading="lazy"><div class="wishlist-product-copy"><span class="product-category">${esc(p.category||"Collection")}</span><h3>${esc(p.name)}</h3><strong>${money(p.price)}</strong><div class="wishlist-product-actions"><button type="button" data-wish-view="${esc(p.id)}">Quick view</button><button type="button" data-wish-add="${esc(p.id)}" ${Number(p.stock)<=0?"disabled":""}>Add to bag</button><button type="button" data-wish-remove="${esc(p.id)}">Remove</button></div></div></article>`).join(""):'<div class="wishlist-empty-state">Your wishlist is waiting for something good.<br>Tap the ♡ on any product to save it here.</div>';
 $("wishlistItems").querySelectorAll("img").forEach(img=>img.addEventListener("error",()=>{img.onerror=null;img.src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=300&q=80"}));
 $("wishlistItems").querySelectorAll("[data-wish-view]").forEach(b=>b.onclick=()=>showProduct(b.dataset.wishView));
 $("wishlistItems").querySelectorAll("[data-wish-add]").forEach(b=>b.onclick=()=>{const p=products.find(x=>String(x.id)===String(b.dataset.wishAdd));if(p)addToCart(p.id);});
 $("wishlistItems").querySelectorAll("[data-wish-remove]").forEach(b=>b.onclick=()=>toggleWishlist(b.dataset.wishRemove));
}
function openWishlist(){openModal("wishlistModal");renderWishlist()}
function showProduct(id){
 const p=products.find(x=>String(x.id)===String(id));if(!p)return;
 $("productDetailContent").innerHTML=`<div class="product-detail"><img src="${esc(p.image_url||"")}" alt="${esc(p.name)}"><div><p class="eyebrow">${esc(p.category)}</p><h2>${esc(p.name)}</h2><div class="product-detail-price">${money(p.price)}</div><p class="product-detail-description">${esc(p.description||"A considered NEXURE&LAND essential.")}</p><span class="stock-label">${p.stock} available</span><div class="detail-options"><label>Size<select id="detailSize"><option>S</option><option selected>M</option><option>L</option><option>XL</option><option>XXL</option></select></label><label>Color<select id="detailColor"><option>Black</option><option>White</option><option>Navy</option><option>Beige</option><option>Olive</option></select></label><label>Quantity<select id="detailQty">${Array.from({length:Math.max(1,Math.min(10,Number(p.stock)||1))},(_,i)=>`<option>${i+1}</option>`).join("")}</select></label></div><div class="detail-actions"><button class="button button-dark" id="detailAdd" type="button" ${Number(p.stock)<=0?"disabled":""}>Add to bag</button><button class="button button-outline" id="detailWish" type="button">${wishlist.some(x=>String(x)===String(p.id))?"♥ Saved":"♡ Save"}</button></div><p class="small-note">Sign in to save your bag securely to your account.</p></div></div>`;
 const img=$("productDetailContent").querySelector("img");img.onerror=()=>{img.onerror=null;img.src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=700&q=80"};
 openModal("productModal");$("detailAdd").onclick=()=>{addToCart(p.id,$("detailSize").value,$("detailColor").value,Number($("detailQty").value));closeAll()};$("detailWish").onclick=()=>{toggleWishlist(p.id);$("detailWish").textContent=wishlist.some(x=>String(x)===String(p.id))?"♥ Saved":"♡ Save"};
}
async function renderCustomerView(view="orders"){
 const host=$("customerView"),c=currentCustomer();if(!host)return;
 if(view==="orders"){
  if(!authUser||!supabaseClient){host.innerHTML='<div class="account-empty">Sign in to view your orders.</div>';return;}
  host.innerHTML='<div class="account-empty">Loading your orders…</div>';
  try{
   const {data,error}=await supabaseClient.from("orders").select("*, order_items(*)").eq("user_id",authUser.id).order("created_at",{ascending:false});
   if(error)throw error;
   const mine=data||[];
   host.innerHTML=mine.length?mine.map(o=>`<article class="customer-view-card"><div class="order-preview-row"><strong>${esc(o.order_number||o.id)}</strong><span class="order-status">${esc(o.status||"pending")}</span></div><p class="small-note">${new Date(o.created_at).toLocaleString()} · ${money(o.total_amount)}</p><p>${(o.order_items||[]).map(i=>`${esc(i.product_name)} × ${i.quantity} · ${esc(i.size||"-")} / ${esc(i.color||"-")}`).join("<br>")}</p></article>`).join(""):'<div class="account-empty">You have no orders yet. Your confirmed orders will appear here.</div>';
  }catch(error){console.error("Customer orders could not load:",error);host.innerHTML=`<div class="account-empty">Could not load orders: ${esc(error.message||"Please try again.")}</div>`;}
 }else if(view==="profile"){
  host.innerHTML=`<form id="profileForm" class="form-grid customer-view-card"><label class="span-2">Full name<input name="name" value="${esc(c?.name||"")}" required></label><label class="span-2">Email<input value="${esc(c?.email||"")}" disabled></label><label class="span-2">Phone<input name="phone" value="${esc(c?.phone||"")}" placeholder="03XX-XXXXXXX"></label><button class="button button-dark span-2" type="submit">Save profile</button></form><p class="small-note">Your account identity is managed securely by Supabase.</p>`;
  $("profileForm").onsubmit=async e=>{e.preventDefault();const customer=currentCustomer(),name=e.currentTarget.elements.name.value.trim(),phone=e.currentTarget.elements.phone.value.trim();try{const {error}=await supabaseClient.auth.updateUser({data:{full_name:name,phone}});if(error)throw error;authUser=(await supabaseClient.auth.getUser()).data.user;$("customerWelcome").textContent=`Hello, ${name}`;toast("Profile updated.");}catch(error){toast("Could not update profile: "+error.message);}};
 }else{
  const saved=products.filter(p=>wishlist.some(id=>String(id)===String(p.id)));
  host.innerHTML=saved.length?saved.map(p=>`<div class="inventory-preview-row"><span>${esc(p.name)} · ${money(p.price)}</span><div><button class="button button-outline" data-wish-view="${esc(p.id)}">View</button> <button class="button button-outline" data-wish-remove="${esc(p.id)}">Remove</button></div></div>`).join(""):'<div class="wishlist-empty">Your wishlist is empty. Save products you love.</div>';
  host.querySelectorAll("[data-wish-view]").forEach(b=>b.onclick=()=>showProduct(b.dataset.wishView));host.querySelectorAll("[data-wish-remove]").forEach(b=>b.onclick=()=>toggleWishlist(b.dataset.wishRemove));
 }
}
function renderCustomerModal(){const c=currentCustomer();$("customerForm").classList.toggle("hidden",!!c&&!customerRecoveryMode);$("customerPanel").classList.toggle("hidden",!c||customerRecoveryMode);if(c&&!customerRecoveryMode){$("customerWelcome").textContent=`Hello, ${c.name}`;renderCustomerView("orders")}}
function openCustomer(){openModal("customerModal");renderCustomerModal()}
function setCustomerMode(mode){customerMode=mode;customerRecoveryMode=false;otpSent=false;document.querySelectorAll("[data-account-tab]").forEach(b=>b.classList.toggle("active",b.dataset.accountTab===mode));const f=$("customerForm");$("customerNameLabel").classList.toggle("hidden",mode!=="signup");$("customerPasswordLabel").classList.remove("hidden");$("customerNewPasswordLabel").classList.add("hidden");$("customerConfirmPasswordLabel").classList.add("hidden");f.elements.confirmPassword.required=false;f.elements.confirmPassword.value="";$("customerOtpLabel").classList.add("hidden");$("resendSignupOtpBtn").classList.add("hidden");$("forgotPasswordBtn").classList.toggle("hidden",mode!=="signin");f.elements.name.disabled=false;f.elements.email.disabled=false;f.elements.email.closest("label").classList.remove("hidden");f.elements.email.required=true;f.elements.password.disabled=false;f.elements.otp.disabled=false;f.elements.otp.value="";f.elements.otp.required=false;f.elements.password.value="";f.elements.name.required=mode==="signup";f.elements.password.autocomplete=mode==="signup"?"new-password":"current-password";$("customerSubmit").textContent=mode==="signup"?"CREATE ACCOUNT":"SIGN IN";$("customerMessage").textContent=mode==="signup"?"Enter your name, email and password. We will send a 6-digit verification code to your email.":"Sign in with your registered email and password."}
function showPasswordRecovery(){customerRecoveryMode=true;customerMode="recovery";authUser=null;renderCustomerModal();document.querySelectorAll("[data-account-tab]").forEach(b=>b.classList.remove("active"));const f=$("customerForm");$("customerNameLabel").classList.add("hidden");f.elements.name.required=false;$("customerPasswordLabel").classList.add("hidden");f.elements.password.required=false;$("customerOtpLabel").classList.add("hidden");f.elements.otp.required=false;$("customerNewPasswordLabel").classList.remove("hidden");f.elements.newPassword.required=true;$("customerConfirmPasswordLabel").classList.remove("hidden");f.elements.confirmPassword.required=true;f.elements.email.required=false;f.elements.email.disabled=true;f.elements.email.closest("label").classList.add("hidden");$("forgotPasswordBtn").classList.add("hidden");$("customerSubmit").textContent="UPDATE PASSWORD";$("customerMessage").textContent="Enter your new password twice. Use at least 8 characters.";openModal("customerModal")}

function adminStats(){
 $("adminDemoOrders").textContent=orders.length;
 $("adminDemoProducts").textContent=products.length;
 $("adminLowStock").textContent=products.filter(p=>Number(p.stock)<=5).length;
 $("adminDemoCustomers").textContent=customers.length;
}
async function loadAdminData(){
 if(!isStoreAdmin())throw new Error("This account does not have the admin role in profiles.");
 const [orderResult,profileResult]=await Promise.all([
  supabaseClient.from("orders").select("*, order_items(*)").order("created_at",{ascending:false}),
  supabaseClient.from("profiles").select("*")
 ]);
 if(orderResult.error)throw orderResult.error;
 if(profileResult.error)throw profileResult.error;
 orders=orderResult.data||[];customers=profileResult.data||[];
 adminStats();
}
function setAdminView(view){adminView=view;document.querySelectorAll("[data-admin-view]").forEach(b=>b.classList.toggle("active",b.dataset.adminView===view));$("adminProductsPanel").classList.toggle("hidden",view!=="products");$("adminOrdersPanel").classList.toggle("hidden",view!=="orders");$("adminCustomersPanel").classList.toggle("hidden",view!=="customers");renderAdminView();}
async function renderAdminView(){
 if(!isStoreAdmin())return;
 try{await loadAdminData();}catch(error){console.error("Admin data could not load:",error);if(adminView==="orders")$("adminOrdersList").innerHTML=`<p class="small-note">Could not load orders: ${esc(error.message||"Check database permissions.")}</p>`;return;}
 if(adminView==="products"){
  $("adminProductList").innerHTML=products.map(p=>`<div class="admin-row"><div><strong>${esc(p.name)}</strong><div class="small-note">${money(p.price)} · ${esc(p.category)} · Stock ${p.stock}</div></div><div class="admin-row-actions"><button class="button button-outline" type="button" data-edit="${esc(p.id)}">Edit</button><button class="button button-outline" type="button" data-delete="${esc(p.id)}">Delete</button></div></div>`).join("")||'<p class="small-note">No products yet. Add one above.</p>';
  $("adminProductList").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editProduct(b.dataset.edit));$("adminProductList").querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteProduct(b.dataset.delete));
 }else if(adminView==="orders"){
  $("adminOrdersList").innerHTML=orders.length?orders.map(o=>`<article class="admin-view-card"><div class="order-preview-row"><strong>${esc(o.order_number||o.id)}</strong><span class="order-status">${esc(o.status||"pending")}</span></div><p class="small-note">${esc(o.customer_name||"Customer")} · ${esc(o.customer_email||"")} · ${money(o.total_amount)}</p><p class="small-note">${esc(o.phone||"")} · ${esc(o.city||"")} · ${esc(o.payment_method||"")}</p><p class="small-note">${esc(o.shipping_address||"")}</p><p>${(o.order_items||[]).map(i=>`${esc(i.product_name)} × ${i.quantity} (${esc(i.size||"-" )}, ${esc(i.color||"-")})`).join("<br>")}</p><label class="admin-status-label">Update status<select data-status="${esc(o.id)}">${["pending","confirmed","processing","shipped","delivered","cancelled"].map(st=>`<option value="${st}" ${String(o.status).toLowerCase()===st?"selected":""}>${st[0].toUpperCase()+st.slice(1)}</option>`).join("")}</select></label></article>`).join(""):'<div class="account-empty">No online orders yet.</div>';
  $("adminOrdersList").querySelectorAll("[data-status]").forEach(sel=>sel.onchange=async()=>{sel.disabled=true;try{const {data,error}=await supabaseClient.from("orders").update({status:sel.value}).eq("id",sel.dataset.status).select("id,status").single();if(error)throw error;if(!data)throw new Error("No order was updated. Check admin permissions.");toast("Order status updated online.");await renderAdminView();}catch(error){toast("Could not update order: "+error.message);sel.disabled=false;}});
 }else{
  $("adminCustomersList").innerHTML=customers.length?customers.map(c=>`<article class="admin-view-card"><strong>${esc(c.full_name||c.email||"Customer")}</strong><p class="small-note">${esc(c.email||"")} · ${esc(c.role||"customer")}</p><p class="small-note">${orders.filter(o=>o.user_id===c.id).length} order(s)</p></article>`).join(""):'<div class="account-empty">No customer profiles found.</div>';
 }
}
function resetProductForm(){const f=$("productForm");f.reset();f.elements.id.value="";$("saveProductBtn").textContent="Add product";$("productFormMessage").textContent=""}
function editProduct(id){const p=products.find(x=>String(x.id)===String(id));if(!p)return;const f=$("productForm");["id","name","price","stock","category","description","image_url"].forEach(k=>{if(f.elements[k])f.elements[k].value=p[k]??""});$("saveProductBtn").textContent="Update product";$("productFormMessage").textContent="Editing an online catalogue product.";f.scrollIntoView({behavior:"smooth",block:"center"})}
async function deleteProduct(id){
 const p=products.find(x=>String(x.id)===String(id));if(!p)return;
 if(!supabaseClient||!authUser||!isStoreAdmin()){toast("Admin access is required for this action.");return;}
 if(String(id).startsWith("demo")||String(id).startsWith("shoe")){toast("This is a preview item, not a saved Supabase product.");return;}
 if(!confirm(`Delete "${p.name}" from the online catalogue?`))return;
 try{
  const {data,error}=await supabaseClient.from("products").delete().eq("id",id).select("id");
  if(error)throw error;
  if(!data||!data.length)throw new Error("No product was deleted. Check that this account has admin permission in Supabase RLS.");
  wishlist=wishlist.filter(x=>String(x)!==String(id));cart=cart.filter(x=>String(x.id)!==String(id));
  await loadSupabaseProducts();write(STORE.wishlist,wishlist);write(STORE.cart,cart);
  renderProducts();renderCart();renderWishlist();renderAdminView();toast("Online product deleted.");
 }catch(err){console.error("Supabase product delete failed:",err);toast("Could not delete online product: "+(err.message||"Check Supabase RLS permissions."));}
}
function fileAsDataURL(file){if(!file)return Promise.resolve("");if(!file.type.startsWith("image/"))return Promise.reject(new Error("Choose an image file."));if(file.size>1500000)return Promise.reject(new Error("Image must be smaller than 1.5 MB for this browser preview."));return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error("Image could not be read."));r.readAsDataURL(file)})}
async function saveProduct(e){
 e.preventDefault();
 const f=e.currentTarget,id=f.elements.id.value,old=products.find(p=>String(p.id)===String(id));
 if(!supabaseClient||!authUser||!isStoreAdmin()){$("productFormMessage").textContent="Sign in with the authorised store admin account first.";return;}
 let image=f.elements.image_url.value.trim()||old?.image_url||"";
 try{if(f.elements.image.files[0])image=await fileAsDataURL(f.elements.image.files[0]);}
 catch(err){$("productFormMessage").textContent=err.message;return;}
 const row={name:f.elements.name.value.trim(),price:Number(f.elements.price.value),stock:Number(f.elements.stock.value),category:f.elements.category.value,description:f.elements.description.value.trim(),image_url:image||"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85"};
 if(!row.name||!Number.isFinite(row.price)||row.price<=0||!Number.isInteger(row.stock)||row.stock<0){$("productFormMessage").textContent="Enter a product name, valid price and whole-number stock.";return;}
 if(id&&(String(id).startsWith("demo")||String(id).startsWith("shoe"))){$("productFormMessage").textContent="Preview items cannot be edited. Add this item as a new online product instead.";return;}
 const btn=$("saveProductBtn");btn.disabled=true;
 try{
  let result;
  if(id){result=await supabaseClient.from("products").update(row).eq("id",id).select("*").single();}
  else{result=await supabaseClient.from("products").insert(row).select("*").single();}
  if(result.error)throw result.error;
  if(!result.data)throw new Error("Supabase did not return the saved product. Check the products table and admin RLS policies.");
  await loadSupabaseProducts();
  renderProducts();renderAdminView();resetProductForm();
  toast(id?"Online product updated.":"Online product added.");
 }catch(err){
  console.error("Supabase product save failed:",err);
  $("productFormMessage").textContent="Could not save online product: "+(err.message||"Check Supabase RLS permissions.");
 }finally{btn.disabled=false;}
}
async function checkout(e){
 e.preventDefault();
 if(!supabaseClient||!authUser)return toast("Please sign in before placing an order.");
 if(!cart.length)return toast("Your bag is empty.");
 const f=e.currentTarget,btn=f.querySelector('button[type="submit"]');
 const name=f.elements.name.value.trim(),phone=f.elements.phone.value.trim(),address=f.elements.address.value.trim(),city=f.elements.city.value.trim();
 const email=f.elements.email.value.trim().toLowerCase();
 if(!name||!phone||!address||!city||!email)return toast("Please complete all checkout fields.");
 if(email!==(authUser.email||"").toLowerCase())return toast("Use the same email address as your signed-in account.");
 const items=cart.map(i=>({id:String(i.id),qty:Number(i.qty),size:i.size||"M",color:i.color||"Black"}));
 if(items.some(i=>!i.id||!Number.isInteger(i.qty)||i.qty<1))return toast("Your bag contains an invalid item. Please refresh and try again.");
 btn.disabled=true;const oldText=btn.textContent;btn.textContent="PLACING ORDER…";
 try{
  const paymentLabels={cod:"Cash on Delivery",easypaisa:"EasyPaisa (manual payment)",jazzcash:"JazzCash (manual payment)"};
  const {error:metadataError}=await supabaseClient.auth.updateUser({data:{full_name:name,phone}});if(metadataError)throw metadataError;
  const {data,error}=await supabaseClient.rpc("place_store_order",{
   p_phone:phone,p_shipping_address:address,p_city:city,
   p_payment_method:paymentLabels[f.elements.payment.value]||"Cash on Delivery",p_items:items
  });
  if(error)throw error;
  if(!data?.id)throw new Error("The database did not confirm the order.");
  let cartClearWarning="";
  const {error:cartError}=await supabaseClient.from("cart_items").delete().eq("user_id",authUser.id);
  if(cartError){console.error("Order placed but cart cleanup failed:",cartError);cartClearWarning=" Your order was saved, but please clear your bag manually if items remain.";}
  cart=[];write(STORE.cart,cart);renderCart();
  await loadSupabaseProducts();renderProducts();
  await renderCustomerView("orders");
  $("checkoutResult").classList.remove("hidden");
  $("checkoutResult").innerHTML=`<strong>Order ${esc(data.order_number||data.id)} placed successfully.</strong><br>Total: ${money(data.total)} · Status: Pending.<br>Payment method: ${esc(paymentLabels[f.elements.payment.value]||"Cash on Delivery")}. Payment is not processed online; our team will confirm manual payment details.${esc(cartClearWarning)}`;
  f.classList.add("hidden");$("checkoutModal").querySelector("h2").textContent="Order placed";
  toast("Your order has been saved online.");
 }catch(error){console.error("Online checkout failed:",error);toast("Order could not be placed: "+(error.message||"Please try again."));}
 finally{btn.disabled=false;btn.textContent=oldText;}
}
function resetCheckout(){$("checkoutForm").classList.remove("hidden");$("checkoutResult").classList.add("hidden");$("checkoutResult").textContent="";$("checkoutModal").querySelector("h2").textContent="Checkout"}
async function setup(){
 // Bind account tabs immediately so they are ready even during recovery.
 document.querySelectorAll("[data-account-tab]").forEach(b=>{
  b.type="button";
  b.onclick=()=>setCustomerMode(b.dataset.accountTab);
 });

 $("year").textContent=new Date().getFullYear();
 $("storeMessage").textContent="Connecting to the NEXURE&LAND catalogue…";

 if(!supabaseClient){
  $("storeMessage").textContent="Supabase library unavailable. Online account and bag are disabled.";
 }else{
  // Supabase puts the recovery type in the URL hash. Detect it before
  // restoring a normal signed-in customer view.
  const recoveryInUrl=new URLSearchParams(location.hash.slice(1)).get("type")==="recovery";
  if(recoveryInUrl) customerRecoveryMode=true;

  // Register this listener BEFORE any awaited network request.
  supabaseClient.auth.onAuthStateChange((event,session)=>{
   if(event==="PASSWORD_RECOVERY"){
    customerRecoveryMode=true;
    authUser=session?.user||null;
    setTimeout(()=>showPasswordRecovery(),0);
    return;
   }
   if(customerRecoveryMode){
    if(session?.user) authUser=session.user;
    return;
   }
   setTimeout(()=>handleAuthChange(session?.user||null),0);
  });

  try{
   const {data:{session},error}=await supabaseClient.auth.getSession();
   if(error) throw error;
   if(recoveryInUrl||customerRecoveryMode){
    authUser=session?.user||null;
    customerRecoveryMode=true;
    showPasswordRecovery();
   }else{
    await handleAuthChange(session?.user||null);
   }
  }catch(e){
   console.error(e);
   toast("Could not restore your account session.");
  }
 }

 // Product loading happens only after the auth recovery listener is active.
 await loadSupabaseProducts();
 $("bagBtn").onclick=openBag;$("wishlistBtn").onclick=openWishlist;$("checkoutBtn").onclick=()=>{if(!authUser){openCustomer();return toast("Sign in to continue with your online bag.");}if(!cart.length)return toast("Add a product to your bag first.");closeAll();resetCheckout();$("checkoutTotal").textContent=money(subtotal());$("checkoutModal").classList.remove("hidden");$("overlay").classList.remove("hidden");document.body.classList.add("no-scroll")};
 $("searchToggle").onclick=()=>{$("searchPanel").classList.toggle("hidden");if(!$("searchPanel").classList.contains("hidden"))$("searchInput").focus()};
 $("searchClose").onclick=()=>{$("searchPanel").classList.add("hidden");$("searchInput").value="";searchTerm="";renderProducts()};
 $("searchInput").oninput=e=>{searchTerm=e.target.value;renderProducts()};$("sortSelect").onchange=renderProducts;
 $("filters").querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>setCategory(b.dataset.category));
 document.querySelectorAll(".collection-card").forEach(b=>b.onclick=()=>{setCategory(b.dataset.category);location.hash="#shop"});
 $("menuToggle").onclick=()=>{const nav=document.querySelector(".main-nav");nav.classList.toggle("mobile-nav");$("menuToggle").setAttribute("aria-expanded",nav.classList.contains("mobile-nav"))};
 document.querySelectorAll(".main-nav a").forEach(a=>a.onclick=()=>document.querySelector(".main-nav").classList.remove("mobile-nav"));
 document.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeAll);$("overlay").onclick=closeAll;document.onkeydown=e=>{if(e.key==="Escape")closeAll()};
 $("checkoutForm").onsubmit=checkout;
 $("accountBtn").onclick=openCustomer;
 document.querySelectorAll("[data-account-tab]").forEach(b=>b.onclick=()=>setCustomerMode(b.dataset.accountTab));
 document.querySelectorAll("[data-customer-view]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-customer-view]").forEach(x=>x.classList.toggle("active",x===b));renderCustomerView(b.dataset.customerView)});
 $("customerForm").onsubmit=async e=>{
  e.preventDefault();const f=e.currentTarget,email=f.elements.email.value.trim().toLowerCase();
  if(!supabaseClient){$("customerMessage").textContent="Supabase could not load. Please refresh and try again.";return;}
  const btn=$("customerSubmit"),originalText=customerRecoveryMode?"Update password":(customerMode==="signup"?"CREATE ACCOUNT":"SIGN IN");btn.disabled=true;
  try{
   if(customerRecoveryMode){
    const password=f.elements.newPassword.value,confirmPassword=f.elements.confirmPassword.value;
    if(password.length<8)throw new Error("Password must be at least 8 characters.");
    if(password!==confirmPassword)throw new Error("New password and confirmation do not match.");
    const {error}=await supabaseClient.auth.updateUser({password});if(error)throw error;
    customerRecoveryMode=false;f.reset();await handleAuthChange((await supabaseClient.auth.getUser()).data.user);
    $("customerMessage").textContent="Your password has been updated successfully.";toast("Password updated successfully.");
   }else if(customerMode==="signin"){
    const password=f.elements.password.value;if(!password)throw new Error("Enter your password.");
    const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});if(error)throw error;
    f.reset();await handleAuthChange(data.user);toast("You are signed in.");
   }else if(customerMode==="signup"&&otpSent){
    const token=f.elements.otp.value.trim();
    if(!/^\d{6}$/.test(token))throw new Error("Enter the 6-digit code sent to your email.");
    const {data,error}=await supabaseClient.auth.verifyOtp({email,token,type:"signup"});if(error)throw error;
    f.reset();otpSent=false;$("resendSignupOtpBtn").classList.add("hidden");await handleAuthChange(data.user);$("customerMessage").textContent="Email verified. Your NEXURE&LAND account is ready.";toast("Account verified successfully.");
   }else{
    const name=f.elements.name.value.trim(),password=f.elements.password.value;
    if(!name)throw new Error("Enter your full name.");if(password.length<8)throw new Error("Password must be at least 8 characters.");
    const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{full_name:name}}});if(error)throw error;
    if(data.session&&data.user){
     await supabaseClient.auth.signOut({scope:"local"});
     throw new Error("Email OTP is not enabled in the Supabase project. Turn ON Confirm email in Supabase Authentication settings, then test signup with a new email address.");
    }
    if(!data.user)throw new Error("Supabase did not create the account. Please try again.");
    otpSent=true;f.elements.name.disabled=true;f.elements.email.disabled=true;f.elements.password.disabled=true;f.elements.otp.disabled=false;f.elements.otp.required=true;$("customerOtpLabel").classList.remove("hidden");$("resendSignupOtpBtn").classList.remove("hidden");$("customerSubmit").textContent="VERIFY EMAIL CODE";$("customerMessage").textContent="A 6-digit verification code has been sent to "+email+". Enter it below to finish creating your account.";f.elements.otp.focus();$("customerOtpLabel").scrollIntoView({behavior:"smooth",block:"nearest"});toast("Email verification code sent.");
   }
  }catch(err){
   console.error("Customer authentication error:",err);let msg=err.message||"Authentication failed. Please try again.";
   if(/user already registered/i.test(msg))msg="An account with this email already exists. Choose SIGN IN instead.";
   if(/email not confirmed/i.test(msg)){$("forgotPasswordBtn").classList.remove("hidden");msg="Please confirm your email using the link we sent, then sign in.";}
   $("customerMessage").textContent=msg;
   if(customerMode==="signin"&&/invalid login credentials|invalid credentials|email not confirmed/i.test(err.message||""))$("forgotPasswordBtn").classList.remove("hidden");
  }finally{btn.disabled=false;btn.textContent=(customerMode==="signup"&&otpSent)?"VERIFY EMAIL CODE":originalText;}
 };
 $("customerForm").elements.otp.addEventListener("input",e=>{e.target.value=e.target.value.replace(/\D/g,"").slice(0,6);});
 $("resendSignupOtpBtn").onclick=async()=>{const email=$("customerForm").elements.email.value.trim().toLowerCase();if(!email)return;const b=$("resendSignupOtpBtn");b.disabled=true;try{const {error}=await supabaseClient.auth.resend({type:"signup",email});if(error)throw error;$("customerMessage").textContent="A new 6-digit code has been sent to "+email+".";toast("New verification code sent.");}catch(e){$("customerMessage").textContent=e.message||"Could not resend the code. Please wait and try again.";}finally{b.disabled=false;}};
 $("forgotPasswordBtn").onclick=async()=>{const email=$("customerForm").elements.email.value.trim().toLowerCase();if(!email){$("customerMessage").textContent="Enter your email address first.";return;}try{const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)throw error;$("customerMessage").textContent="Password reset link sent to "+email+". Open the email link to choose a new password.";toast("Password reset email sent.");}catch(e){$("customerMessage").textContent=e.message||"Could not send password reset email.";}};
 $("customerSignOut").onclick=async()=>{try{const {error}=await supabaseClient.auth.signOut();if(error)throw error;authUser=null;cart=[];write(STORE.cart,cart);renderCart();renderCustomerModal();setCustomerMode("signin");toast("You have signed out.");}catch(e){toast("Sign out failed: "+e.message);}};

 $("adminFooter").onclick=async e=>{e.preventDefault();if(!authUser){toast("Please sign in with the admin account first.");openCustomer();return;}if(!await refreshAdminRole()){toast("This account is not authorised as a store admin.");return;}setAdminView("products");openModal("adminModal")};
 document.querySelectorAll("[data-admin-view]").forEach(b=>b.onclick=()=>setAdminView(b.dataset.adminView));
 $("productForm").onsubmit=saveProduct;$("resetProductBtn").onclick=resetProductForm;
 $("newsletterForm").onsubmit=e=>{e.preventDefault();const input=e.currentTarget.querySelector('input[type="email"]'),email=input.value.trim().toLowerCase(),list=read(STORE.newsletter,[]);if(!list.includes(email)){list.push(email);write(STORE.newsletter,list)}e.currentTarget.reset();toast("Thanks for joining the N&L demo list.")};
 renderProducts();renderCart();renderWishlist();renderCustomerModal();if(customerRecoveryMode){showPasswordRecovery();}else{setCustomerMode("signin");}adminStats();resetProductForm();
}
document.addEventListener("DOMContentLoaded",setup);