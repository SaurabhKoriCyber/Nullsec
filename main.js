(function () {
  'use strict';

  const CART_KEY = 'nullsec-cart-v1';
  const THEME_KEY = 'nullsec-theme';
  const defaultCart = [
    { id: 'phantom-cable-elite', name: 'Phantom Cable Elite', type: 'Keystroke Injector / C2', price: 139.99, quantity: 2, team: 'Red Team', image: 'https://storage.googleapis.com/banani-generated-images/generated-images/d0f5b3f7-3acb-4fdd-9009-ff327b18d4b5.jpg' },
    { id: 'aegis-fido2-key', name: 'Aegis FIDO2 Key', type: 'Hardware Authentication', price: 55, quantity: 1, team: 'Blue Team', image: 'https://storage.googleapis.com/banani-generated-images/generated-images/b75a2801-73ea-495b-8ee6-e62d6ce01fce.jpg' }
  ];
  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const html = document.documentElement;
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  let toastTimer;

  function getCart() {
    try {
      const stored = JSON.parse(localStorage.getItem(CART_KEY));
      return Array.isArray(stored) ? stored : defaultCart;
    } catch (_) { return defaultCart; }
  }
  function cartCount(cart = getCart()) { return cart.reduce((total, item) => total + item.quantity, 0); }
  function updateCartBadge(cart = getCart()) {
    const count = cartCount(cart);
    document.querySelectorAll('.cart-badge').forEach((badge) => {
      badge.textContent = count;
      badge.setAttribute('aria-label', `${count} items in cart`);
      badge.hidden = count === 0;
    });
  }
  function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCartBadge(cart); }
  function showToast(message) {
    if (!toast || !toastMessage) return;
    toastMessage.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }
  function getProductFromCard(card) {
    const name = card.querySelector('.product-name')?.textContent.trim();
    const type = card.querySelector('.product-type')?.textContent.trim() || 'Security hardware';
    const price = Number.parseFloat((card.querySelector('.product-price')?.textContent || '0').replace(/[^0-9.]/g, '')) || 0;
    const image = card.querySelector('.product-img');
    const badge = card.querySelector('.product-badge');
    return { id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), name, type, price, quantity: 1, team: badge?.classList.contains('badge-red') ? 'Red Team' : 'Blue Team', image: image?.currentSrc || image?.src || '' };
  }
  function addToCart(card) {
    const product = getProductFromCard(card);
    if (!product.name) return;
    const cart = getCart();
    const existing = cart.find((item) => item.id === product.id);
    if (existing) existing.quantity += 1; else cart.push(product);
    saveCart(cart);
    showToast(`${product.name} added to cart.`);
  }

  function setupTheme() {
    const toggle = document.querySelector('.theme-toggle');
    html.setAttribute('data-theme', localStorage.getItem(THEME_KEY) || 'light');
    const updateIcon = () => {
      const dark = html.getAttribute('data-theme') === 'dark';
      document.querySelectorAll('.sun-icon').forEach((icon) => { icon.style.display = dark ? 'none' : 'block'; });
      document.querySelectorAll('.moon-icon').forEach((icon) => { icon.style.display = dark ? 'block' : 'none'; });
    };
    updateIcon();
    toggle?.addEventListener('click', () => {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next); localStorage.setItem(THEME_KEY, next); updateIcon();
    });
  }
  function setupMobileNav() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.mobile-nav');
    if (!toggle || !nav) return;
    const close = () => { nav.classList.remove('active'); toggle.setAttribute('aria-expanded', 'false'); toggle.querySelector('iconify-icon')?.setAttribute('icon', 'lucide:menu'); };
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('active');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('iconify-icon')?.setAttribute('icon', open ? 'lucide:x' : 'lucide:menu');
    });
    document.addEventListener('click', (event) => { if (!toggle.contains(event.target) && !nav.contains(event.target)) close(); });
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
  }
  function setupSearch() {
    const trigger = document.querySelector('.icon-btn[aria-label="Search products"]');
    if (!trigger) return;
    const panel = document.createElement('form');
    panel.className = 'search-panel';
    panel.innerHTML = '<label class="sr-only" for="catalog-search">Search products</label><input id="catalog-search" type="search" placeholder="Search hardware…" autocomplete="off"><button type="button" class="search-close" aria-label="Close search">×</button>';
    document.body.append(panel);
    const input = panel.querySelector('input');
    const count = document.querySelector('.results-count, .store-toolbar-text');
    const originalCount = count?.textContent;
    const close = () => {
      panel.classList.remove('open');
      input.value = '';
      document.querySelectorAll('.product-card').forEach((card) => { card.hidden = false; });
      if (count) count.textContent = originalCount;
    };
    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase(); let matches = 0;
      document.querySelectorAll('.product-card').forEach((card) => { const match = !query || card.textContent.toLowerCase().includes(query); card.hidden = !match; if (match) matches += 1; });
      if (count && query) count.textContent = `${matches} matching product${matches === 1 ? '' : 's'}`;
    });
    trigger.addEventListener('click', () => { panel.classList.add('open'); input.focus(); });
    panel.addEventListener('submit', (event) => event.preventDefault());
    panel.querySelector('.search-close').addEventListener('click', close);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  }

  function renderCart() {
    const cartItems = document.querySelector('.cart-items');
    const summary = document.querySelector('.order-summary');
    if (!cartItems || !summary) return;
    const cart = getCart();
    const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
    const shipping = cart.length ? 15 : 0;
    const discount = Number(sessionStorage.getItem('nullsec-discount')) || 0;
    const tax = Math.max(0, (subtotal - discount) * 0.073);
    const total = subtotal + shipping + tax - discount;
    cartItems.innerHTML = cart.length ? cart.map((item) => `
      <article class="cart-item" data-cart-id="${item.id}">
        <img class="item-img" src="${item.image}" alt="${item.name}" loading="lazy">
        <div class="item-details"><h3 class="item-title">${item.name}</h3><p class="item-type">${item.type}</p><div class="item-badge"><span class="${item.team === 'Red Team' ? 'badge-red' : 'badge-blue'}">${item.team}</span></div></div>
        <div class="qty-control" aria-label="Quantity for ${item.name}"><button class="qty-btn" type="button" data-cart-action="decrease" aria-label="Decrease quantity">−</button><span class="qty-value">${item.quantity}</span><button class="qty-btn" type="button" data-cart-action="increase" aria-label="Increase quantity">+</button></div>
        <div class="item-price">${currency.format(item.price * item.quantity)}</div><button class="item-remove" type="button" data-cart-action="remove" aria-label="Remove ${item.name}"><iconify-icon icon="lucide:trash-2"></iconify-icon></button>
      </article>`).join('') : '<div class="empty-cart"><iconify-icon icon="lucide:shopping-bag"></iconify-icon><h2>Your cart is clear</h2><p>Add approved hardware to begin your order.</p><a class="btn btn-primary" href="index.html">Explore the catalog</a></div>';
    summary.innerHTML = `
      <h2 class="summary-title">Order Summary</h2>
      <div class="summary-row"><span>Subtotal (${cartCount(cart)} items)</span><span class="summary-val">${currency.format(subtotal)}</span></div>
      <div class="summary-row"><span>Shipping</span><span class="summary-val">${shipping ? currency.format(shipping) : '—'}</span></div>
      <div class="summary-row"><span>Estimated tax</span><span class="summary-val">${currency.format(tax)}</span></div>
      ${discount ? `<div class="summary-row discount-row"><span>Operator discount</span><span>−${currency.format(discount)}</span></div>` : ''}
      <div class="discount-code"><input id="discount-code" aria-label="Discount code" placeholder="Discount code or operator ID"><button class="btn-outline" type="button" id="apply-discount">Apply</button></div>
      <div class="summary-row total"><span>Total</span><span>${currency.format(total)}</span></div>
      <button class="btn btn-primary checkout-btn" type="button" ${cart.length ? '' : 'disabled'}>Proceed to Checkout</button><div class="secure-checkout"><iconify-icon icon="lucide:lock"></iconify-icon> Secure encrypted checkout</div>`;
    updateCartBadge(cart);
  }
  function setupCart() {
    renderCart();
    document.addEventListener('click', (event) => {
      const addButton = event.target.closest('.btn-sm, .btn-add');
      if (addButton) { const card = addButton.closest('.product-card'); if (card) { event.preventDefault(); addToCart(card); } return; }
      const action = event.target.closest('[data-cart-action]');
      if (action) {
        const id = action.closest('[data-cart-id]')?.dataset.cartId; let cart = getCart(); const item = cart.find((entry) => entry.id === id);
        if (!item) return;
        if (action.dataset.cartAction === 'increase') item.quantity += 1;
        if (action.dataset.cartAction === 'decrease') item.quantity -= 1;
        if (action.dataset.cartAction === 'remove' || item.quantity < 1) cart = cart.filter((entry) => entry.id !== id);
        saveCart(cart); renderCart(); return;
      }
      if (event.target.closest('#apply-discount')) {
        const code = document.getElementById('discount-code').value.trim().toUpperCase();
        const subtotal = getCart().reduce((total, item) => total + item.price * item.quantity, 0);
        const discount = code === 'NULLSEC10' ? subtotal * 0.1 : code === 'OPERATOR15' ? subtotal * 0.15 : 0;
        sessionStorage.setItem('nullsec-discount', discount.toFixed(2)); showToast(discount ? 'Operator discount applied.' : 'That code is not recognized.'); renderCart(); return;
      }
      if (event.target.closest('.checkout-btn')) showToast('Checkout is ready to connect to your payment provider.');
    });
  }
  function setupCatalogControls() {
    const categoryGroup = document.querySelector('.store-sidebar .filter-group:first-child');
    if (!categoryGroup) return;
    categoryGroup.querySelectorAll('.filter-item').forEach((item) => {
      item.tabIndex = 0;
      const activate = () => {
        categoryGroup.querySelectorAll('.filter-item').forEach((entry) => entry.classList.remove('active')); item.classList.add('active');
        const label = item.textContent.toLowerCase(); const terms = label.includes('all') ? [] : label.match(/[a-z]+/g).filter((term) => !['gear', 'devices', 'keys', 'defense', 'access'].includes(term)); let visible = 0;
        document.querySelectorAll('.product-card').forEach((card) => { const match = !terms.length || terms.some((term) => card.textContent.toLowerCase().includes(term)); card.hidden = !match; if (match) visible += 1; });
        const count = document.querySelector('.results-count, .store-toolbar-text'); if (count) count.textContent = `${visible} product${visible === 1 ? '' : 's'} shown`;
      };
      item.addEventListener('click', activate); item.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); } });
    });
    document.querySelectorAll('.filter-checkbox, .filter-item').forEach((item) => {
      if (!item.querySelector('.checkbox-box, .checkbox')) return;
      item.tabIndex = 0;
      const toggle = () => item.querySelector('.checkbox-box, .checkbox')?.classList.toggle('checked');
      item.addEventListener('click', toggle); item.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); } });
    });
  }
  function setupScrollAnimations() {
    if (!('IntersectionObserver' in window)) { document.querySelectorAll('.animate-on-scroll').forEach((element) => element.classList.add('visible')); return; }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: 0.1 });
    document.querySelectorAll('.animate-on-scroll').forEach((element) => observer.observe(element));
  }

  setupTheme(); setupMobileNav(); setupSearch(); setupCart(); setupCatalogControls(); setupScrollAnimations(); updateCartBadge();
}());
