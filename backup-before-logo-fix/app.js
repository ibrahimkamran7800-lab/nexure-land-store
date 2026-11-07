/* NEXURE&LAND — complete frontend preview.
   All customer, cart, product and order data is stored locally in this browser only.
   No authentication, payment processing, database or secure admin permissions exist yet.
*/
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
let currentCustomerEmail=sessionStorage.getItem(STORE.session)||"",activeCategory="All",searchTerm="",customerMode="signin",adminView="products",toastTimer;
function toast(message){let el=$("toast");if(!el){el=document.createElement("div");el.id="toast";el.className="toast-message";el.setAttribute("role","status");document.body.appendChild(el)}el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600)}
function currentCustomer(){return customers.find(c=>c.email.toLowerCase()===currentCustomerEmail.toLowerCase())||null}
function saveAll(){write(STORE.products,products);write(STORE.cart,cart);write(STORE.wishlist,wishlist);write(STORE.orders,orders);write(STORE.customers,customers)}
function countCart(){return cart.reduce((s,i)=>s+Number(i.qty||0),0)}
function subtotal(){return cart.reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||0),0)}
function cartKey(id,size,color){return `${id}::${size}::${color}`}
function stockFor(id){return Number(products.find(p=>String(p.id)===String(id))?.stock||0)}
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
 $("productGrid").innerHTML=list.length?list.map(p=>{const saved=wishlist.some(x=>String(x)===String(p.id)),sold=Number(p.stock)<=0;return `<article class="product-card"><div class="product-image-wrap" data-details="${esc(p.id)}" role="button" tabindex="0" aria-label="View ${esc(p.name)}"><img class="product-image" src="${esc(p.image_url||"")}" alt="${esc(p.name)}" loading="lazy"><span class="product-badge">${sold?"Sold out":"N&L EDIT"}</span><button class="wishlist-heart ${saved?"is-saved":""}" type="button" data-wish="${esc(p.id)}" aria-label="${saved?"Remove from":"Add to"} wishlist: ${esc(p.name)}" aria-pressed="${saved}">${saved?"♥":"♡"}</button></div><div class="product-info"><div class="product-category">${esc(p.category||"Collection")}</div><h3 class="product-name">${esc(p.name)}</h3><span class="product-price">${money(p.price)}</span><span class="stock-label">${sold?"Currently unavailable":`${p.stock} available`}</span><div class="product-actions"><button type="button" data-details="${esc(p.id)}">Quick view</button></div><button class="quick-add" type="button" data-add="${esc(p.id)}" ${sold?"disabled":""}>${sold?"Sold out":"Add to bag +"}</button></div></article>`}).join(""):'<div class="empty-state">No products found. Try another category or search.</div>';
 $("productGrid").querySelectorAll("img").forEach(img=>img.addEventListener("error",()=>{img.onerror=null;img.src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=700&q=80"}));
 $("productGrid").querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>addToCart(b.dataset.add));
 $("productGrid").querySelectorAll("[data-details]").forEach(b=>{b.onclick=()=>showProduct(b.dataset.details);b.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();showProduct(b.dataset.details)}}});
 $("productGrid").querySelectorAll("[data-wish]").forEach(b=>b.onclick=()=>toggleWishlist(b.dataset.wish));
}
function setCategory(category){activeCategory=category;$("filters").querySelectorAll("[data-category]").forEach(b=>b.classList.toggle("active",b.dataset.category===category));renderProducts()}
function addToCart(id,size="M",color="Black",qty=1){
 const p=products.find(x=>String(x.id)===String(id));if(!p)return toast("Product is unavailable.");
 const key=cartKey(id,size,color),item=cart.find(x=>x.key===key),next=(item?.qty||0)+Number(qty);
 if(next>Number(p.stock))return toast(`Only ${p.stock} item(s) are available.`);
 if(item)item.qty=next;else cart.push({key,id:p.id,name:p.name,price:Number(p.price),image_url:p.image_url||"",qty:Number(qty),size,color});
 write(STORE.cart,cart);renderCart();toast(`${p.name} added to your bag.`);
}
function renderCart(){
 $("bagCount").textContent=countCart();$("drawerCount").textContent=`(${countCart()})`;$("bagSubtotal").textContent=money(subtotal());$("checkoutTotal").textContent=money(subtotal());$("checkoutBtn").disabled=!cart.length;
 $("bagItems").innerHTML=cart.length?cart.map(i=>`<div class="bag-item"><img src="${esc(i.image_url)}" alt="${esc(i.name)}"><div class="bag-item-copy"><h4>${esc(i.name)}</h4><p>${money(i.price)}</p><small>Size: ${esc(i.size)} · Color: ${esc(i.color)}</small><div class="qty-controls"><button type="button" data-qty="${esc(i.key)}" data-delta="-1">−</button><span>${i.qty}</span><button type="button" data-qty="${esc(i.key)}" data-delta="1">+</button></div></div><button class="remove-item" type="button" data-remove="${esc(i.key)}">✕</button></div>`).join(""):'<div class="empty-state">Your bag is waiting for something good.</div>';
 $("bagItems").querySelectorAll("img").forEach(img=>img.addEventListener("error",()=>{img.onerror=null;img.src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=300&q=80"}));
 $("bagItems").querySelectorAll("[data-qty]").forEach(b=>b.onclick=()=>{const item=cart.find(x=>x.key===b.dataset.qty);if(!item)return;const n=item.qty+Number(b.dataset.delta);if(n<=0)cart=cart.filter(x=>x.key!==item.key);else if(n>stockFor(item.id))return toast("You have reached the available stock.");else item.qty=n;write(STORE.cart,cart);renderCart()});
 $("bagItems").querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{cart=cart.filter(x=>x.key!==b.dataset.remove);write(STORE.cart,cart);renderCart()});
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
 $("productDetailContent").innerHTML=`<div class="product-detail"><img src="${esc(p.image_url||"")}" alt="${esc(p.name)}"><div><p class="eyebrow">${esc(p.category)}</p><h2>${esc(p.name)}</h2><div class="product-detail-price">${money(p.price)}</div><p class="product-detail-description">${esc(p.description||"A considered NEXURE&LAND essential.")}</p><span class="stock-label">${p.stock} available</span><div class="detail-options"><label>Size<select id="detailSize"><option>S</option><option selected>M</option><option>L</option><option>XL</option><option>XXL</option></select></label><label>Color<select id="detailColor"><option>Black</option><option>White</option><option>Navy</option><option>Beige</option><option>Olive</option></select></label><label>Quantity<select id="detailQty">${Array.from({length:Math.max(1,Math.min(10,Number(p.stock)||1))},(_,i)=>`<option>${i+1}</option>`).join("")}</select></label></div><div class="detail-actions"><button class="button button-dark" id="detailAdd" type="button" ${Number(p.stock)<=0?"disabled":""}>Add to bag</button><button class="button button-outline" id="detailWish" type="button">${wishlist.some(x=>String(x)===String(p.id))?"♥ Saved":"♡ Save"}</button></div><p class="small-note">Options are saved with this browser's demo cart only.</p></div></div>`;
 const img=$("productDetailContent").querySelector("img");img.onerror=()=>{img.onerror=null;img.src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=700&q=80"};
 openModal("productModal");$("detailAdd").onclick=()=>{addToCart(p.id,$("detailSize").value,$("detailColor").value,Number($("detailQty").value));closeAll()};$("detailWish").onclick=()=>{toggleWishlist(p.id);$("detailWish").textContent=wishlist.some(x=>String(x)===String(p.id))?"♥ Saved":"♡ Save"};
}
function renderCustomerView(view="orders"){
 const host=$("customerView"),c=currentCustomer();if(!host)return;
 if(view==="orders"){
  const mine=orders.filter(o=>c&&o.customerEmail===c.email);
  host.innerHTML=mine.length?mine.slice().reverse().map(o=>`<article class="customer-view-card"><div class="order-preview-row"><strong>${esc(o.id)}</strong><span class="order-status">${esc(o.status)}</span></div><p class="small-note">${new Date(o.createdAt).toLocaleString()} · ${money(o.total)}</p><p>${o.items.map(i=>`${esc(i.name)} × ${i.qty} · ${esc(i.size)} / ${esc(i.color)}`).join("<br>")}</p></article>`).join(""):'<div class="account-empty">No demo orders yet. Your orders will appear here after checkout.</div>';
 }else if(view==="profile"){
  host.innerHTML=`<form id="profileForm" class="form-grid customer-view-card"><label class="span-2">Full name<input name="name" value="${esc(c?.name||"")}" required></label><label class="span-2">Email<input value="${esc(c?.email||"")}" disabled></label><label class="span-2">Phone<input name="phone" value="${esc(c?.phone||"")}" placeholder="03XX-XXXXXXX"></label><button class="button button-dark span-2" type="submit">Save demo profile</button></form><p class="small-note">Profile is stored in this browser only.</p>`;
  $("profileForm").onsubmit=e=>{e.preventDefault();const customer=currentCustomer();customer.name=e.currentTarget.elements.name.value.trim();customer.phone=e.currentTarget.elements.phone.value.trim();write(STORE.customers,customers);$("customerWelcome").textContent=`Hello, ${customer.name}`;toast("Demo profile updated.")};
 }else{
  const saved=products.filter(p=>wishlist.some(id=>String(id)===String(p.id)));
  host.innerHTML=saved.length?saved.map(p=>`<div class="inventory-preview-row"><span>${esc(p.name)} · ${money(p.price)}</span><div><button class="button button-outline" data-wish-view="${esc(p.id)}">View</button> <button class="button button-outline" data-wish-remove="${esc(p.id)}">Remove</button></div></div>`).join(""):'<div class="wishlist-empty">Your wishlist is empty. Save products you love.</div>';
  host.querySelectorAll("[data-wish-view]").forEach(b=>b.onclick=()=>showProduct(b.dataset.wishView));host.querySelectorAll("[data-wish-remove]").forEach(b=>b.onclick=()=>toggleWishlist(b.dataset.wishRemove));
 }
}
function renderCustomerModal(){const c=currentCustomer();$("customerForm").classList.toggle("hidden",!!c);$("customerPanel").classList.toggle("hidden",!c);if(c){$("customerWelcome").textContent=`Hello, ${c.name}`;renderCustomerView("orders")}}
function openCustomer(){openModal("customerModal");renderCustomerModal()}
function setCustomerMode(mode){customerMode=mode;document.querySelectorAll("[data-account-tab]").forEach(b=>b.classList.toggle("active",b.dataset.accountTab===mode));$("customerForm").elements.name.closest("label").classList.toggle("hidden",mode!=="signup");$("customerForm").elements.password.autocomplete=mode==="signup"?"new-password":"current-password";$("customerSubmit").textContent=mode==="signup"?"Create demo account":"Sign in (demo)";$("customerMessage").textContent=mode==="signup"?"Demo profile only. Do not reuse a real password; no password is stored.":"Enter the email used for your demo account. No password is stored."}
function adminStats(){$("adminDemoOrders").textContent=orders.length;$("adminDemoProducts").textContent=products.length;$("adminLowStock").textContent=products.filter(p=>Number(p.stock)<=5).length;$("adminDemoCustomers").textContent=customers.length}
function setAdminView(view){adminView=view;document.querySelectorAll("[data-admin-view]").forEach(b=>b.classList.toggle("active",b.dataset.adminView===view));$("adminProductsPanel").classList.toggle("hidden",view!=="products");$("adminOrdersPanel").classList.toggle("hidden",view!=="orders");$("adminCustomersPanel").classList.toggle("hidden",view!=="customers");renderAdminView()}
function renderAdminView(){
 adminStats();
 if(adminView==="products"){
  $("adminProductList").innerHTML=products.map(p=>`<div class="admin-row"><div><strong>${esc(p.name)}</strong><div class="small-note">${money(p.price)} · ${esc(p.category)} · Stock ${p.stock}</div></div><div class="admin-row-actions"><button class="button button-outline" type="button" data-edit="${esc(p.id)}">Edit</button><button class="button button-outline" type="button" data-delete="${esc(p.id)}">Delete</button></div></div>`).join("")||'<p class="small-note">No products yet. Add one above.</p>';
  $("adminProductList").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editProduct(b.dataset.edit));$("adminProductList").querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteProduct(b.dataset.delete));
 }else if(adminView==="orders"){
  $("adminOrdersList").innerHTML=orders.length?orders.slice().reverse().map(o=>`<article class="admin-view-card"><div class="order-preview-row"><strong>${esc(o.id)}</strong><span class="order-status">${esc(o.status)}</span></div><p class="small-note">${esc(o.customerName)} · ${esc(o.customerEmail)} · ${money(o.total)}</p><p class="small-note">${esc(o.phone)} · ${esc(o.city)}</p><p>${o.items.map(i=>`${esc(i.name)} × ${i.qty} (${esc(i.size)}, ${esc(i.color)})`).join("<br>")}</p><label class="admin-status-label">Update status<select data-status="${esc(o.id)}">${["Pending","Confirmed","Processing","Shipped","Delivered","Cancelled"].map(s=>`<option ${o.status===s?"selected":""}>${s}</option>`).join("")}</select></label></article>`).join(""):'<div class="account-empty">No demo orders yet.</div>';
  $("adminOrdersList").querySelectorAll("[data-status]").forEach(s=>s.onchange=()=>{const o=orders.find(x=>x.id===s.dataset.status);if(o){o.status=s.value;write(STORE.orders,orders);toast("Demo order status updated.");}});
 }else{
  $("adminCustomersList").innerHTML=customers.length?customers.map(c=>`<article class="admin-view-card"><strong>${esc(c.name)}</strong><p class="small-note">${esc(c.email)} · ${esc(c.phone||"No phone")}</p><p class="small-note">${orders.filter(o=>o.customerEmail===c.email).length} demo order(s)</p></article>`).join(""):'<div class="account-empty">No demo customer accounts yet.</div>';
 }
}
function resetProductForm(){const f=$("productForm");f.reset();f.elements.id.value="";$("saveProductBtn").textContent="Add product";$("productFormMessage").textContent=""}
function editProduct(id){const p=products.find(x=>String(x.id)===String(id));if(!p)return;const f=$("productForm");["id","name","price","stock","category","description","image_url"].forEach(k=>{if(f.elements[k])f.elements[k].value=p[k]??""});$("saveProductBtn").textContent="Update product";$("productFormMessage").textContent="Editing a local demo product.";f.scrollIntoView({behavior:"smooth",block:"center"})}
function deleteProduct(id){const p=products.find(x=>String(x.id)===String(id));if(!p||!confirm(`Delete "${p.name}" from this browser's demo catalog?`))return;products=products.filter(x=>String(x.id)!==String(id));wishlist=wishlist.filter(x=>String(x)!==String(id));cart=cart.filter(x=>String(x.id)!==String(id));saveAll();renderProducts();renderCart();renderAdminView();toast("Demo product deleted.")}
function fileAsDataURL(file){if(!file)return Promise.resolve("");if(!file.type.startsWith("image/"))return Promise.reject(new Error("Choose an image file."));if(file.size>1500000)return Promise.reject(new Error("Image must be smaller than 1.5 MB for this browser preview."));return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error("Image could not be read."));r.readAsDataURL(file)})}
async function saveProduct(e){
 e.preventDefault();const f=e.currentTarget,id=f.elements.id.value,old=products.find(p=>String(p.id)===String(id));let image=f.elements.image_url.value.trim()||old?.image_url||"";
 try{if(f.elements.image.files[0])image=await fileAsDataURL(f.elements.image.files[0])}catch(err){$("productFormMessage").textContent=err.message;return}
 const p={id:id||makeId("product"),name:f.elements.name.value.trim(),price:Number(f.elements.price.value),stock:Number(f.elements.stock.value),category:f.elements.category.value,description:f.elements.description.value.trim(),image_url:image||"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85"};
 if(!p.name||p.price<=0||!Number.isInteger(p.stock)||p.stock<0){$("productFormMessage").textContent="Enter a product name, valid price and whole-number stock.";return}
 products=old?products.map(x=>String(x.id)===String(id)?p:x):[p,...products];if(!write(STORE.products,products))return;renderProducts();renderAdminView();resetProductForm();toast(old?"Demo product updated.":"Demo product added.");
}
function checkout(e){
 e.preventDefault();if(!cart.length)return toast("Your bag is empty.");const f=e.currentTarget,c=currentCustomer();
 const order={id:`NL-${Date.now().toString().slice(-7)}`,customerName:f.elements.name.value.trim(),customerEmail:f.elements.email.value.trim().toLowerCase(),phone:f.elements.phone.value.trim(),address:f.elements.address.value.trim(),city:f.elements.city.value.trim(),payment:f.elements.payment.value,items:cart.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty,size:i.size,color:i.color})),total:subtotal(),status:"Pending",createdAt:new Date().toISOString()};
 orders.push(order);if(!write(STORE.orders,orders))return;
 cart.forEach(i=>{const p=products.find(x=>String(x.id)===String(i.id));if(p)p.stock=Math.max(0,Number(p.stock)-Number(i.qty))});
 write(STORE.products,products);cart=[];write(STORE.cart,cart);renderCart();renderProducts();adminStats();
 $("checkoutResult").classList.remove("hidden");$("checkoutResult").innerHTML=`<strong>Demo order ${esc(order.id)} saved in this browser.</strong><br>This is not a real order and has not been sent to NEXURE&amp;LAND. No payment has been processed.`;
 $("checkoutForm").classList.add("hidden");$("checkoutModal").querySelector("h2").textContent="Order preview saved";toast("Demo order created. No payment was taken.");
}
function resetCheckout(){$("checkoutForm").classList.remove("hidden");$("checkoutResult").classList.add("hidden");$("checkoutResult").textContent="";$("checkoutModal").querySelector("h2").textContent="Checkout"}
async function setup(){
 $("year").textContent=new Date().getFullYear();$("storeMessage").textContent="Connecting to the NEXURE&LAND catalogue…";
 await loadSupabaseProducts();
 $("bagBtn").onclick=openBag;$("wishlistBtn").onclick=openWishlist;$("checkoutBtn").onclick=()=>{if(!cart.length)return toast("Add a product to your bag first.");closeAll();resetCheckout();$("checkoutTotal").textContent=money(subtotal());$("checkoutModal").classList.remove("hidden");$("overlay").classList.remove("hidden");document.body.classList.add("no-scroll")};
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
 $("customerForm").onsubmit=e=>{
  e.preventDefault();const f=e.currentTarget,email=f.elements.email.value.trim().toLowerCase(),pass=f.elements.password.value;
  if(pass.length<8){$("customerMessage").textContent="Use at least 8 characters for this demo form.";return}
  let c=customers.find(x=>x.email.toLowerCase()===email);
  if(customerMode==="signup"){if(c){$("customerMessage").textContent="This email already has a demo account. Please sign in.";return}c={name:f.elements.name.value.trim(),email,phone:""};customers.push(c);write(STORE.customers,customers)}
  else if(!c){$("customerMessage").textContent="No demo account found. Choose Create account first.";return}
  currentCustomerEmail=email;sessionStorage.setItem(STORE.session,email);f.reset();renderCustomerModal();toast(`Welcome, ${c.name}.`);
 };
 $("customerSignOut").onclick=()=>{currentCustomerEmail="";sessionStorage.removeItem(STORE.session);renderCustomerModal();setCustomerMode("signin");toast("Signed out of demo account.")};
 $("adminFooter").onclick=e=>{e.preventDefault();setAdminView("products");openModal("adminModal")};
 document.querySelectorAll("[data-admin-view]").forEach(b=>b.onclick=()=>setAdminView(b.dataset.adminView));
 $("productForm").onsubmit=saveProduct;$("resetProductBtn").onclick=resetProductForm;
 $("newsletterForm").onsubmit=e=>{e.preventDefault();const input=e.currentTarget.querySelector('input[type="email"]'),email=input.value.trim().toLowerCase(),list=read(STORE.newsletter,[]);if(!list.includes(email)){list.push(email);write(STORE.newsletter,list)}e.currentTarget.reset();toast("Thanks for joining the N&L demo list.")};
 renderProducts();renderCart();renderWishlist();renderCustomerModal();setCustomerMode("signin");adminStats();resetProductForm();
}
document.addEventListener("DOMContentLoaded",setup);
