/* NEXURE&LAND Customer Dashboard Add-on
   Loads after app.js. It reuses the existing Supabase auth, order and wishlist functions.
*/
(function () {
  "use strict";

  function safeText(value) {
    return typeof window.esc === "function"
      ? window.esc(value == null ? "" : value)
      : String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
          return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
        });
  }
  function getAddressKey() {
    return "nl_customer_addresses_v1_" + (authUser && authUser.id ? authUser.id : "guest");
  }
  function readAddresses() {
    try { return JSON.parse(localStorage.getItem(getAddressKey()) || "[]"); }
    catch (_) { return []; }
  }
  function writeAddresses(items) {
    localStorage.setItem(getAddressKey(), JSON.stringify(items));
  }

  function buildDashboard() {
    var panel = document.getElementById("customerPanel");
    if (!panel || panel.dataset.dashboardReady === "yes") return;
    var welcome = panel.querySelector(".customer-welcome");
    var oldTabs = panel.querySelector(".account-tabs");
    var view = document.getElementById("customerView");
    if (!welcome || !view) return;

    panel.dataset.dashboardReady = "yes";
    welcome.classList.add("dashboard-top");
    var label = document.createElement("div");
    label.innerHTML = '<p class="eyebrow">NEXURE&LAND MEMBER AREA</p><strong id="dashboardGreeting">Your account</strong><p class="small-note">Manage your personal shopping account.</p>';
    welcome.insertBefore(label, welcome.firstChild);

    if (oldTabs) oldTabs.remove();

    var layout = document.createElement("div");
    layout.className = "customer-dashboard-layout";
    var sidebar = document.createElement("aside");
    sidebar.className = "customer-sidebar";
    sidebar.innerHTML =
      '<p class="dashboard-menu-title">MY ACCOUNT</p>' +
      '<button type="button" class="customer-menu-item active" data-dashboard-view="orders"><span>▤</span> My Orders</button>' +
      '<button type="button" class="customer-menu-item" data-dashboard-view="profile"><span>♙</span> My Profile</button>' +
      '<button type="button" class="customer-menu-item" data-dashboard-view="wishlist"><span>♡</span> My Wishlist</button>' +
      '<button type="button" class="customer-menu-item" data-dashboard-view="addresses"><span>⌖</span> My Addresses</button>' +
      '<button type="button" class="customer-menu-item logout" data-dashboard-logout><span>↪</span> Sign Out</button>';
    var content = document.createElement("main");
    content.className = "customer-dashboard-content";
    content.appendChild(view);
    layout.appendChild(sidebar);
    layout.appendChild(content);
    panel.appendChild(layout);

    sidebar.querySelectorAll("[data-dashboard-view]").forEach(function (button) {
      button.addEventListener("click", function () {
        sidebar.querySelectorAll("[data-dashboard-view]").forEach(function (item) {
          item.classList.toggle("active", item === button);
        });
        window.renderCustomerView(button.dataset.dashboardView);
      });
    });
    sidebar.querySelector("[data-dashboard-logout]").addEventListener("click", function () {
      var signOut = document.getElementById("customerSignOut");
      if (signOut) signOut.click();
    });
  }

  function setHeading(view) {
    var headings = {
      orders: ["My Orders", "Track your purchases and check their latest status."],
      profile: ["My Profile", "Keep your account details up to date."],
      wishlist: ["My Wishlist", "Your saved NEXURE&LAND pieces."],
      addresses: ["My Addresses", "Save delivery details on this device for quicker checkout."]
    };
    var host = document.getElementById("customerView");
    if (!host) return;
    var item = headings[view] || headings.orders;
    host.innerHTML = '<h3>' + item[0] + '</h3><p class="dashboard-section-note">' + item[1] + '</p>';
  }

  async function dashboardRender(view) {
    view = view || "orders";
    var host = document.getElementById("customerView");
    if (!host) return;
    setHeading(view);
    if (!authUser) {
      host.insertAdjacentHTML("beforeend", '<div class="dashboard-empty">Please sign in to view your account.</div>');
      return;
    }

    if (view === "orders") {
      host.insertAdjacentHTML("beforeend", '<div class="dashboard-empty">Loading your orders…</div>');
      var loading = host.lastElementChild;
      try {
        var result = await supabaseClient.from("orders").select("*")
          .eq("user_id", authUser.id).order("created_at", {ascending:false});
        if (result.error) throw result.error;
        var rows = result.data || [];
        var items = [];
        if (rows.length) {
          var itemResult = await supabaseClient.from("order_items").select("*")
            .in("order_id", rows.map(function (order) { return order.id; }));
          if (itemResult.error) throw itemResult.error;
          items = itemResult.data || [];
        }
        if (loading) loading.remove();
        if (!rows.length) {
          host.insertAdjacentHTML("beforeend", '<div class="dashboard-empty">No orders yet. Your orders will appear here after checkout.</div>');
          return;
        }
        rows.forEach(function (order) {
          var orderItems = items.filter(function (item) { return item.order_id === order.id; });
          var card = document.createElement("article");
          card.className = "customer-view-card";
          card.innerHTML =
            '<div class="order-preview-row"><strong>' + safeText(order.order_number || order.id) +
            '</strong><span class="order-status">' + safeText(order.status || "pending") + '</span></div>' +
            '<p class="small-note">' + safeText(new Date(order.created_at).toLocaleString()) +
            ' · ' + safeText(money(order.total_amount)) + '</p>' +
            '<p>' + orderItems.map(function (item) {
              return safeText(item.product_name) + ' × ' + safeText(item.quantity) +
                ' · ' + safeText(item.size || "-") + ' / ' + safeText(item.color || "-");
            }).join("<br>") + '</p>';
          host.appendChild(card);
        });
      } catch (error) {
        if (loading) loading.remove();
        host.insertAdjacentHTML("beforeend", '<div class="dashboard-empty">Could not load orders: ' +
          safeText(error.message || "Please try again.") + '</div>');
      }
      return;
    }

    if (view === "profile") {
      var customer = currentCustomer();
      host.insertAdjacentHTML("beforeend",
        '<form id="dashboardProfileForm" class="form-grid dashboard-form">' +
        '<label class="span-2">Full name<input name="name" required value="' + safeText(customer.name) + '"></label>' +
        '<label class="span-2">Email address<input value="' + safeText(customer.email) + '" disabled></label>' +
        '<label class="span-2">Phone number<input name="phone" value="' + safeText(customer.phone) + '" placeholder="03XX-XXXXXXX"></label>' +
        '<button class="button button-dark span-2" type="submit">Save profile</button></form>');
      document.getElementById("dashboardProfileForm").addEventListener("submit", async function (event) {
        event.preventDefault();
        var form = event.currentTarget;
        var button = form.querySelector('[type="submit"]');
        button.disabled = true;
        try {
          var update = await supabaseClient.auth.updateUser({
            data: {full_name: form.elements.name.value.trim(), phone: form.elements.phone.value.trim()}
          });
          if (update.error) throw update.error;
          authUser = update.data.user;
          var welcome = document.getElementById("customerWelcome");
          if (welcome) welcome.textContent = "Hello, " + form.elements.name.value.trim();
          var greeting = document.getElementById("dashboardGreeting");
          if (greeting) greeting.textContent = "Hello, " + form.elements.name.value.trim();
          toast("Profile updated.");
        } catch (error) {
          toast("Profile could not be saved: " + (error.message || "Please try again."));
        } finally { button.disabled = false; }
      });
      return;
    }

    if (view === "wishlist") {
      var saved = (products || []).filter(function (product) {
        return (wishlist || []).some(function (id) { return String(id) === String(product.id); });
      });
      if (!saved.length) {
        host.insertAdjacentHTML("beforeend", '<div class="dashboard-empty">Your wishlist is empty. Tap the heart on a product to save it here.</div>');
        return;
      }
      saved.forEach(function (product) {
        var row = document.createElement("div");
        row.className = "dashboard-wishlist-row";
        row.innerHTML = '<img src="' + safeText(product.image_url || "") + '" alt="' + safeText(product.name) + '">' +
          '<div><strong>' + safeText(product.name) + '</strong><small>' + safeText(money(product.price)) + '</small></div>' +
          '<div class="dashboard-wishlist-actions"><button type="button" data-view-product="' + safeText(product.id) + '">View</button>' +
          '<button type="button" data-remove-product="' + safeText(product.id) + '">Remove</button></div>';
        host.appendChild(row);
      });
      host.querySelectorAll("[data-view-product]").forEach(function (button) {
        button.addEventListener("click", function () { showProduct(button.dataset.viewProduct); });
      });
      host.querySelectorAll("[data-remove-product]").forEach(function (button) {
        button.addEventListener("click", function () { toggleWishlist(button.dataset.removeProduct); });
      });
      return;
    }

    if (view === "addresses") {
      var addresses = readAddresses();
      host.insertAdjacentHTML("beforeend",
        '<form id="dashboardAddressForm" class="form-grid dashboard-form">' +
        '<label>Address label<input name="label" required placeholder="Home, Office"></label>' +
        '<label>Full name<input name="name" required value="' + safeText(currentCustomer().name) + '"></label>' +
        '<label>Phone number<input name="phone" required placeholder="03XX-XXXXXXX"></label>' +
        '<label>City<input name="city" required></label>' +
        '<label class="span-2">Delivery address<textarea name="address" rows="3" required></textarea></label>' +
        '<button class="button button-dark span-2" type="submit">Save address</button></form>');
      var list = document.createElement("div");
      list.id = "dashboardAddressList";
      host.appendChild(list);
      function paintAddresses() {
        var current = readAddresses();
        list.innerHTML = current.length ? current.map(function (address, index) {
          return '<article class="dashboard-address-card"><div><strong>' + safeText(address.label) +
            ' · ' + safeText(address.name) + '</strong><p>' + safeText(address.phone) + '<br>' +
            safeText(address.address) + ', ' + safeText(address.city) + '</p></div>' +
            '<button type="button" data-delete-address="' + index + '">Remove</button></article>';
        }).join("") : '<div class="dashboard-empty">No saved addresses yet.</div>';
        list.querySelectorAll("[data-delete-address]").forEach(function (button) {
          button.addEventListener("click", function () {
            var next = readAddresses();
            next.splice(Number(button.dataset.deleteAddress), 1);
            writeAddresses(next);
            paintAddresses();
          });
        });
      }
      document.getElementById("dashboardAddressForm").addEventListener("submit", function (event) {
        event.preventDefault();
        var form = event.currentTarget;
        var current = readAddresses();
        current.push({
          label: form.elements.label.value.trim(),
          name: form.elements.name.value.trim(),
          phone: form.elements.phone.value.trim(),
          city: form.elements.city.value.trim(),
          address: form.elements.address.value.trim()
        });
        writeAddresses(current);
        form.reset();
        paintAddresses();
        toast("Address saved on this device.");
      });
      paintAddresses();
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildDashboard();
    window.renderCustomerView = dashboardRender;
    if (authUser) {
      var greeting = document.getElementById("dashboardGreeting");
      if (greeting && currentCustomer) greeting.textContent = "Hello, " + currentCustomer().name;
      dashboardRender("orders");
    }
  });
})();
