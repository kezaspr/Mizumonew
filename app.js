/* Mizumo Marketplace App
    Contains logic for:
    1. Supabase Integration (NEW)
    2. Product Detail Modal
    3. Slide-Down Search
    4. Mobile Hamburger Menu
    5. Shopping Cart Sidebar
    6. Checkout Modal
    7. Global Listeners
*/

// ==========================================
// 1. SUPABASE INTEGRATION (NEW)
// ==========================================

// --- PASTE YOUR KEYS HERE ---
const SUPABASE_URL = 'https://uzjxoandxfclcvpfmuun.supabase.co'; // <--- PASTE YOUR URL HERE
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6anhvYW5keGZjbGN2cGZtdXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMjI4MzgsImV4cCI6MjA3ODc5ODgzOH0.bm-e14AYu3mBj_knLeigA4PIV5QJNLe68SDyuqwhNxs'; // <--- PASTE YOUR ANON KEY HERE

// --- Initialize Supabase Client ---
let supabase = null;
try {
  // Check if the variables exist and are not the placeholders
  if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_PROJECT_URL') {
    throw new Error('Supabase URL is not set. Please update app.js.');
  }
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_ANON_PUBLIC_KEY') {
    throw new Error('Supabase Anon Key is not set. Please update app.js.');
  }
  // Note: The global 'supabase' object comes from the script tag in index.html
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Mizumo App Initialized with Supabase!');

} catch (error) {
    console.error(error.message);
    // Alert the user if the keys are not set
    const featuredContainer = document.getElementById('featured-products-container');
    if(featuredContainer) featuredContainer.innerHTML = `<p style="color:red; text-align:center;">Error: Database not connected. Please check Supabase keys in app.js.</p>`;
}

// ==========================================
// 2. PRODUCT LOADING (NEW)
// ==========================================
let allProducts = []; // Store all products in a global array
const featuredContainer = document.getElementById('featured-products-container');
const allProductsContainer = document.getElementById('all-products-container');

/**
 * Creates the HTML for a single product card
 * @param {object} product - The product data from Supabase
 * @returns {string} - The HTML string for the product card
 */
function createProductCardHTML(product) {
    // Set default values in case data is missing
    const price = product.price ? `R$ ${product.price.toLocaleString()}` : 'Free';
    const imageUrl = product.image_url || `https://via.placeholder.com/300x250/8A2BE2/FFFFFF?text=${product.title.replace(' ', '+')}`;
    
    // We use data- attributes to store all product info on the card itself
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

/**
 * Fetches products from Supabase and renders them to the page
 */
async function loadProducts() {
    if (!supabase) return; // Don't run if Supabase isn't connected

    try {
        // Fetch all products from the 'products' table
        const { data, error } = await supabase
            .from('products') // Make sure your table is named 'products'
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            // This will throw the specific Supabase error
            throw new Error(`Supabase fetch failed: ${error.message}`);
        }

        // Clear loading spinners
        featuredContainer.innerHTML = '';
        allProductsContainer.innerHTML = '';

        // Render products
        allProducts = data; // Save all products
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

        // IMPORTANT: Attach listeners *after* products are on the page
        attachAllEventListeners();

    } catch (error) {
        console.error(error.message);
        // UPDATED: This will now show the REAL error message on your page
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
    return parseInt(String(priceStr).replace('R$', '').replace(',', '').trim());
}

function formatPrice(priceNum) {
    return `R$ ${priceNum.toLocaleString()}`;
}

function closeAllOverlays() {
    if (mobileMenu) mobileMenu.classList.remove('active');
    if (searchPanel) searchPanel.classList.remove('active');
    if (cartOverlay) cartOverlay.classList.remove('active');
    if (modalOverlay) modalOverlay.classList.remove('active');
    if (checkoutModal) checkoutModal.classList.remove('active');
    if (pageContent) pageContent.classList.remove('blur-active');
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

function filterProducts() {
    const searchTerm = searchInput.value.toLowerCase();
    let productsFound = 0;

    allProductsContainer.innerHTML = ''; // Clear the grid

    allProducts.forEach(product => {
        if (product.title.toLowerCase().includes(searchTerm)) {
            allProductsContainer.innerHTML += createProductCardHTML(product);
            productsFound++;
        }
    });

    if (productsFound === 0) {
        allProductsContainer.innerHTML = `<p style="text-align:center;">No products found matching "${searchTerm}".</p>`;
    }

    // Re-attach listeners to the new cards
    attachProductCardListeners();
}

// --- Product Modal Logic ---
function openModal(card) {
    closeAllOverlays();
    // Get data from the card's data-attributes
    const data = card.dataset;
    modalImage.src = data.imageUrl || `https://via.placeholder.com/600x600/8A2BE2/FFFFFF?text=${data.title.replace(' ', '+')}`;
    modalTitle.textContent = data.title;
    modalCategory.textContent = data.category;
    modalPrice.textContent = data.price;
    modalDescription.textContent = data.description;
    modalQuantityInput.value = 1;

    // Store card data on the modal button
    modalAddToCartBtn.dataset.id = data.id;
    modalAddToCartBtn.dataset.title = data.title;
    modalAddToCartBtn.dataset.price = data.price;
    modalAddToCartBtn.dataset.imageUrl = data.imageUrl; // Use the small image for cart

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
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
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
 * Attaches listeners to all product cards and their buttons.
 * Must be called *after* products are rendered.
 */
function attachProductCardListeners() {
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't open modal if "Add to Cart" was clicked
            if (!e.target.closest('.add-to-cart-btn')) {
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

/**
 * Attaches all static listeners (nav, overlays, etc.)
 */
function attachAllEventListeners() {
    // --- Attach Product Listeners ---
    attachProductCardListeners(); // For products loaded initially

    // --- Mobile Menu ---
    hamburgerIcon.addEventListener('click', toggleMobileMenu);
    mobileMenuClose.addEventListener('click', closeAllOverlays);
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeAllOverlays);
    });

    // --- Search ---
    searchIcon.addEventListener('click', toggleSearch);
    searchInput.addEventListener('input', filterProducts); // Filter as you type

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
// Only run the app if Supabase was initialized
if (supabase) {
    loadProducts(); // Load products on page load
}