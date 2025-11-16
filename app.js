/* Mizumo Marketplace App
    Contains logic for:
    1. Supabase Integration
    2. Product Loading
    3. Global Cart State
    4. Overlay & Modal Elements
    5. Helper Functions
    6. Core App Logic (Menus, Search, Modals, Cart, Checkout)
    7. Event Listeners
    8. App Initialization
*/

// ==========================================
// 1. SUPABASE INTEGRATION
// ==========================================

const SUPABASE_URL = 'https://uzjxoandxfclcvpfmuun.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6anhvYW5keGZjbGN2cGZtdXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMjI4MzgsImV4cCI6MjA3ODc5ODgzOH0.bm-e14AYu3mBj_knLeigA4PIV5QJNLe68SDyuqwhNxs';

let supabase = null;
try {
  if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_PROJECT_URL') {
    throw new Error('Supabase URL is not set. Please update app.js.');
  }
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_ANON_PUBLIC_KEY') {
    throw new Error('Supabase Anon Key is not set. Please update app.js.');
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Mizumo App Initialized with Supabase!');

} catch (error) {
    console.error(error.message);
    const featuredContainer = document.getElementById('featured-products-container');
    if(featuredContainer) featuredContainer.innerHTML = `<p style="color:red; text-align:center;">Error: Database not connected. Please check Supabase keys in app.js.</p>`;
}

// ==========================================
// 2. PRODUCT LOADING
// ==========================================
let allProducts = []; // Store all products in a global array
const featuredContainer = document.getElementById('featured-products-container');
const allProductsContainer = document.getElementById('all-products-container');

function createProductCardHTML(product) {
    const price = product.price ? `Rp. ${product.price.toLocaleString()}` : 'Free';
    const imageUrl = product.image_url || `https://via.placeholder.com/300x250/8A2BE2/FFFFFF?text=${product.title.replace(' ', '+')}`;
    
    return `
    <div class="product-card" 
         data-id="${product.id}"
         data-title="${product.title}"
         data-category="${product.category}"
         data-price="${price}"
         data-image-url="${product.image_url}"
         data-description="${product.description}"
    >
        <div class="product-image" style="background-image: url('${imageUrl}');"></div>
        <div class="product-info">
            <h3 class="product-title">${product.title}</h3>
            <p class="product-category">${product.category}</p>
            <div class="product-footer">
                <span class="product-price">${price}</span>
                <button class="add-to-cart-btn">Add <i class="fas fa-shopping-cart"></i></button>
            </div>
        </div>
    </div>
    `;
}

async function loadProducts() {
    if (!supabase) return;

    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Supabase fetch failed: ${error.message}`);
        }

        featuredContainer.innerHTML = '';
        allProductsContainer.innerHTML = '';

        allProducts = data;
        const featuredProducts = data.filter(product => product.featured === true);

        if (featuredProducts.length > 0) {
            featuredProducts.forEach(product => {
                featuredContainer.innerHTML += createProductCardHTML(product);
            });
        } else {
            featuredContainer.innerHTML = '<p style="text-align:center;">No featured products found.</p>';
        }

        if (allProducts.length > 0) {
            allProducts.forEach(product => {
                allProductsContainer.innerHTML += createProductCardHTML(product);
            });
        } else {
            allProductsContainer.innerHTML = '<p style="text-align:center;">No products found.</p>';
        }

        attachAllEventListeners();

    } catch (error) {
        console.error(error.message);
        featuredContainer.innerHTML = `<p style="color:red; text-align:center;">Error: ${error.message}</p>`;
        allProductsContainer.innerHTML = `<p style="color:red; text-align:center;">Error: ${error.message}</p>`;
    }
}


// ==========================================
// 3. GLOBAL CART STATE
// ==========================================
let cart = [];

// ==========================================
// 4. OVERLAY & MODAL ELEMENTS
// ==========================================
const pageContent = document.getElementById('page-content');

// Mobile Menu
const hamburgerIcon = document.getElementById('hamburger-icon');
const mobileMenu = document.getElementById('mobile-menu');
const mobileMenuClose = document.getElementById('mobile-menu-close');

// Search
const searchIcon = document.getElementById('nav-search-icon');
const searchPanel = document.getElementById('search-slide-down');
const searchInput = document.getElementById('slide-search-input');
const searchResultsContainer = document.getElementById('search-results-container'); // NEW

// Product Modal
const modalOverlay = document.getElementById('product-modal-overlay');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalImage = document.getElementById('modal-image');
const modalTitle = document.getElementById('modal-title');
const modalCategory = document.getElementById('modal-category');
const modalPrice = document.getElementById('modal-price');
const modalDescription = document.getElementById('modal-description');
const modalQuantityInput = document.getElementById('modal-quantity');
const modalAddToCartBtn = document.querySelector('.modal-add-to-cart');

// Cart Sidebar
const cartIconWrapper = document.getElementById('cart-icon-wrapper');
const cartOverlay = document.getElementById('cart-overlay-container');
const cartCloseBtn = document.getElementById('cart-close-btn');
const cartBody = document.getElementById('cart-body');
const cartEmpty = document.getElementById('cart-empty');
const cartSubtotalEl = document.getElementById('cart-subtotal-price');
const cartNotificationBadge = document.getElementById('cart-notification-badge');

// Checkout Modal
const checkoutBtn = document.getElementById('cart-checkout-btn');
const checkoutModal = document.getElementById('checkout-modal-overlay');
const checkoutCloseBtn = document.getElementById('checkout-close-btn');
const checkoutForm = document.getElementById('checkout-form');
const checkoutTotalPriceEl = document.getElementById('checkout-total-price');
const successPopup = document.getElementById('success-popup');

// ==========================================
// 5. HELPER FUNCTIONS
// ==========================================
function parsePrice(priceStr) {
    if (!priceStr) return 0;
    return parseInt(String(priceStr).replace('Rp.', '').replace(',', '').trim());
}

function formatPrice(priceNum) {
    return `Rp. ${priceNum.toLocaleString()}`;
}

function closeAllOverlays() {
    if (mobileMenu) mobileMenu.classList.remove('active');
    if (searchPanel) searchPanel.classList.remove('active');
    if (cartOverlay) cartOverlay.classList.remove('active');
    if (modalOverlay) modalOverlay.classList.remove('active');
    if (checkoutModal) checkoutModal.classList.remove('active');
    if (pageContent) pageContent.classList.remove('blur-active');
    // Clear search results when closing
    if (searchResultsContainer) searchResultsContainer.innerHTML = '<p class="search-prompt">Start typing to see results...</p>';
    if (searchInput) searchInput.value = '';
}

// ==========================================
// 6. CORE APP LOGIC
// ==========================================

// --- Mobile Menu Logic ---
function toggleMobileMenu() {
    if (mobileMenu.classList.contains('active')) {
        closeAllOverlays();
    } else {
        closeAllOverlays();
        mobileMenu.classList.add('active');
        pageContent.classList.add('blur-active');
    }
}

// --- Search Logic ---
function toggleSearch() {
    if (searchPanel.classList.contains('active')) {
        closeAllOverlays();
    } else {
        closeAllOverlays();
        searchPanel.classList.add('active');
        pageContent.classList.add('blur-active');
        setTimeout(() => { searchInput.focus(); }, 400);
    }
}

/**
 * NEW: Creates HTML for a single search result item.
 * @param {object} product - The product object
 * @returns {string} - HTML string for the search result
 */
function createSearchResultHTML(product) {
    const price = product.price ? formatPrice(product.price) : 'Free';
    const imageUrl = product.image_url || `https://via.placeholder.com/100x100/8A2BE2/FFFFFF?text=${product.title.replace(' ', '+')}`;

    return `
    <div class="search-result-item" data-id="${product.id}">
        <img src="${imageUrl}" alt="${product.title}" class="search-result-image">
        <div class="search-result-info">
            <div class="search-result-title">${product.title}</div>
            <div class="search-result-category">${product.category}</div>
        </div>
        <div class="search-result-price">${price}</div>
    </div>
    `;
}

/**
 * UPDATED: Filters products and shows results IN the search panel.
 */
function filterProducts() {
    const searchTerm = searchInput.value.toLowerCase();
    
    if (searchTerm.length === 0) {
        searchResultsContainer.innerHTML = '<p class="search-prompt">Start typing to see results...</p>';
        return;
    }

    let productsFound = 0;
    let resultsHTML = '';

    allProducts.forEach(product => {
        if (product.title.toLowerCase().includes(searchTerm)) {
            resultsHTML += createSearchResultHTML(product);
            productsFound++;
        }
    });

    if (productsFound === 0) {
        searchResultsContainer.innerHTML = `<p class="search-prompt">No products found matching "${searchTerm}".</p>`;
    } else {
        searchResultsContainer.innerHTML = resultsHTML;
        // Attach listeners to the new search results
        attachSearchResultListeners();
    }
}

// --- Product Modal Logic ---
/**
 * UPDATED: Can now be called with a product *object* or a card *element*.
 * @param {HTMLElement | object} productOrCard - The card element or a product object
 */
function openModal(productOrCard) {
    closeAllOverlays();
    
    let productData;

    // Check if it's an object (from search results) or an element (from card click)
    if (productOrCard.dataset) {
        // It's a card element
        productData = productOrCard.dataset;
    } else {
        // It's a product object
        productData = {
            id: productOrCard.id,
            title: productOrCard.title,
            category: productOrCard.category,
            price: formatPrice(productOrCard.price),
            imageUrl: productOrCard.image_url,
            description: productOrCard.description
        };
    }

    // Get data from the data-attributes
    modalImage.src = productData.imageUrl || `https://via.placeholder.com/600x600/8A2BE2/FFFFFF?text=${productData.title.replace(' ', '+')}`;
    modalTitle.textContent = productData.title;
    modalCategory.textContent = productData.category;
    modalPrice.textContent = productData.price;
    modalDescription.textContent = productData.description;
    modalQuantityInput.value = 1;

    // Store card data on the modal button
    modalAddToCartBtn.dataset.id = productData.id;
    modalAddToCartBtn.dataset.title = productData.title;
    modalAddToCartBtn.dataset.price = productData.price;
    // Use the small image for cart
    modalAddToCartBtn.dataset.imageUrl = productData.imageUrl; 

    modalOverlay.classList.add('active');
}

// --- Cart Logic ---
function openCart() {
    closeAllOverlays();
    cartOverlay.classList.add('active');
}

function updateCartNotification() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems > 0) {
        cartNotificationBadge.textContent = totalItems;
        cartNotificationBadge.classList.add('active');
    } else {
        cartNotificationBadge.textContent = '';
        cartNotificationBadge.classList.remove('active');
    }
}

function addToCart(item) {
    const existingItem = cart.find(cartItem => String(cartItem.id) === String(item.id));
    if (existingItem) {
        existingItem.quantity += item.quantity || 1;
    } else {
        cart.push({ ...item, quantity: item.quantity || 1 });
    }
    renderCart();
    updateCartNotification();
}

function removeFromCart(itemId) {
    cart = cart.filter(item => String(item.id) !== String(itemId));
    renderCart();
    updateCartNotification();
}

function renderCart() {
    cartBody.innerHTML = '';
    if (cart.length === 0) {
        cartEmpty.classList.add('active');
        cartSubtotalEl.textContent = formatPrice(0);
    } else {
        cartEmpty.classList.remove('active');
        let subtotal = 0;
        cart.forEach(item => {
            const itemPriceNumber = parsePrice(item.price);
            const itemTotal = itemPriceNumber * item.quantity;
            subtotal += itemTotal;

            const cartItemHTML = `
            <div class="cart-item">
                <img src="${item.imageUrl}" alt="${item.title}" class="cart-item-image">
                <div class="cart-item-info">
                    <span class="cart-item-title">${item.title}</span>
                    <span class="cart-item-price">${formatPrice(itemPriceNumber)}</span>
                    <span class="cart-item-quantity">Qty: ${item.quantity}</span>
                </div>
                <i class="fas fa-trash cart-item-remove" data-id="${item.id}"></i>
            </div>
            `;
            cartBody.innerHTML += cartItemHTML;
        });
        cartSubtotalEl.textContent = formatPrice(subtotal);
    }
}

// --- Checkout Logic ---
function openCheckout() {
    if (cart.length === 0) return;
    closeAllOverlays();
    checkoutTotalPriceEl.textContent = cartSubtotalEl.textContent;
    checkoutModal.classList.add('active');
}

function handlePurchase(e) {
    e.preventDefault();
    closeAllOverlays();
    cart = [];
    renderCart();
    updateCartNotification();
    checkoutForm.reset();
    
    successPopup.classList.add('active');
    setTimeout(() => {
        successPopup.classList.remove('active');
    }, 3000);
}

// ==========================================
// 7. EVENT LISTENERS
// ==========================================

/**
 * NEW: Attaches listeners to the dynamic search result items.
 */
function attachSearchResultListeners() {
    const searchResultItems = document.querySelectorAll('.search-result-item');
    searchResultItems.forEach(item => {
        item.addEventListener('click', () => {
            // Find the full product object from the 'allProducts' array
            const productId = item.dataset.id;
            const product = allProducts.find(p => String(p.id) === String(productId));
            if (product) {
                // Pass the *object* to openModal
                openModal(product);
            } else {
                console.error("Could not find product with ID:", productId);
            }
        });
    });
}

function attachProductCardListeners() {
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.add-to-cart-btn')) {
                // Pass the *card element* to openModal
                openModal(card);
            }
        });
    });

    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = e.target.closest('.product-card');
            const item = {
                id: card.dataset.id,
                title: card.dataset.title,
                price: card.dataset.price,
                imageUrl: card.dataset.imageUrl,
                quantity: 1
            };
            addToCart(item);
        });
    });
}

function attachAllEventListeners() {
    attachProductCardListeners();

    // --- Mobile Menu ---
    hamburgerIcon.addEventListener('click', toggleMobileMenu);
    mobileMenuClose.addEventListener('click', closeAllOverlays);
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeAllOverlays);
    });

    // --- Search ---
    searchIcon.addEventListener('click', toggleSearch);
    searchInput.addEventListener('input', filterProducts); // UPDATED

    // --- Product Modal ---
    modalCloseBtn.addEventListener('click', closeAllOverlays);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeAllOverlays();
    });
    modalAddToCartBtn.addEventListener('click', () => {
        const item = {
            id: modalAddToCartBtn.dataset.id,
            title: modalAddToCartBtn.dataset.title,
            price: modalAddToCartBtn.dataset.price,
            imageUrl: modalAddToCartBtn.dataset.imageUrl,
            quantity: parseInt(modalQuantityInput.value) || 1
        };
        addToCart(item);
        closeAllOverlays();
    });

    // --- Cart ---
    cartIconWrapper.addEventListener('click', openCart);
    cartCloseBtn.addEventListener('click', closeAllOverlays);
    cartOverlay.addEventListener('click', (e) => {
        if (e.target === cartOverlay) closeAllOverlays();
    });
    cartBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('cart-item-remove')) {
            removeFromCart(e.target.dataset.id);
        }
    });

    // --- Checkout ---
    checkoutBtn.addEventListener('click', openCheckout);
    checkoutCloseBtn.addEventListener('click', closeAllOverlays);
    checkoutModal.addEventListener('click', (e) => {
        if (e.target === checkoutModal) closeAllOverlays();
    });
    checkoutForm.addEventListener('submit', handlePurchase);

    // --- Global Listeners ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllOverlays();
    });
    document.addEventListener('click', (e) => {
        if (searchPanel.classList.contains('active')) {
            const isClickOnIcon = searchIcon.contains(e.target);
            const isClickInPanel = searchPanel.contains(e.target);
            if (!isClickOnIcon && !isClickInPanel) {
                closeAllOverlays();
            }
        }
    });
}


// ==========================================
// 8. APP INITIALIZATION
// ==========================================
if (supabase) {
    loadProducts();
}