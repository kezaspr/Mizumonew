// ==========================================
// 1. SUPABASE INTEGRATION
// ==========================================

const SUPABASE_URL = 'https://uzjxoandxfclcvpfmuun.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FgLUWwf9LUxgvJtsI6vP4g_qIY5aqWz';

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
// 3. GLOBAL APP STATE
// ==========================================
let cart = [];
let currentUser = null; //To store user data

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
const searchResultsContainer = document.getElementById('search-results-container');

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

//Auth Elements
const loginBtn = document.getElementById('login-btn');
const userProfileMenu = document.getElementById('user-profile-menu');
const userEmailDisplay = document.getElementById('user-email-display');
const logoutBtn = document.getElementById('logout-btn');
const authModal = document.getElementById('auth-modal-overlay');
const authCloseBtn = document.getElementById('auth-close-btn');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupFormBtn = document.getElementById('show-signup-form');
const showLoginFormBtn = document.getElementById('show-login-form');
const loginErrorMsg = document.getElementById('login-error-msg');
const signupErrorMsg = document.getElementById('signup-error-msg');

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
    if (authModal) authModal.classList.remove('active'); // NEW
    if (pageContent) pageContent.classList.remove('blur-active');
    
    // Clear search results when closing
    if (searchResultsContainer) searchResultsContainer.innerHTML = '<p class="search-prompt">Start typing to see results...</p>';
    if (searchInput) searchInput.value = '';

    // Clear auth errors
    if(loginErrorMsg) loginErrorMsg.classList.remove('active');
    if(signupErrorMsg) signupErrorMsg.classList.remove('active');
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
        attachSearchResultListeners();
    }
}

// --- Product Modal Logic ---
function openModal(productOrCard) {
    closeAllOverlays();
    
    let productData;

    if (productOrCard.dataset) {
        productData = productOrCard.dataset;
    } else {
        productData = {
            id: productOrCard.id,
            title: productOrCard.title,
            category: productOrCard.category,
            price: formatPrice(productOrCard.price),
            imageUrl: productOrCard.image_url,
            description: productOrCard.description
        };
    }

    modalImage.src = productData.imageUrl || `https://via.placeholder.com/600x600/8A2BE2/FFFFFF?text=${productData.title.replace(' ', '+')}`;
    modalTitle.textContent = productData.title;
    modalCategory.textContent = productData.category;
    modalPrice.textContent = productData.price;
    modalDescription.textContent = productData.description;
    modalQuantityInput.value = 1;

    modalAddToCartBtn.dataset.id = productData.id;
    modalAddToCartBtn.dataset.title = productData.title;
    modalAddToCartBtn.dataset.price = productData.price;
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
    
    //Check for login
    if (!currentUser) {
        alert("Please log in to proceed to checkout."); // You can make this a custom popup
        openAuthModal();
        return;
    }
    
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
// 7. NEW: AUTH LOGIC
// ==========================================

function openAuthModal() {
    closeAllOverlays();
    authModal.classList.add('active');
    // Default to login form
    loginForm.style.display = 'flex';
    signupForm.style.display = 'none';
}

function updateUIForUser(user) {
    currentUser = user;
    loginBtn.style.display = 'none';
    userProfileMenu.style.display = 'flex';
    userEmailDisplay.textContent = user.email;
}

function updateUIForGuest() {
    currentUser = null;
    loginBtn.style.display = 'block';
    userProfileMenu.style.display = 'none';
    userEmailDisplay.textContent = '';
}

async function handleLogin(e) {
    e.preventDefault();
    const email = loginForm.querySelector('#login-email').value;
    const password = loginForm.querySelector('#login-password').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        loginErrorMsg.textContent = error.message;
        loginErrorMsg.classList.add('active');
    } else {
        updateUIForUser(data.user);
        closeAllOverlays();
        loginForm.reset();
    }
}

async function handleSignUp(e) {
    e.preventDefault();
    const email = signupForm.querySelector('#signup-email').value;
    const password = signupForm.querySelector('#signup-password').value;

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        signupErrorMsg.textContent = error.message;
        signupErrorMsg.classList.add('active');
    } else {
        // If email confirmation is disabled, user is logged in immediately
        if (data.user) {
            updateUIForUser(data.user);
            closeAllOverlays();
            signupForm.reset();
        } else {
            // If email confirmation is ON
            alert("Sign up successful! Please check your email to confirm.");
            closeAllOverlays();
            signupForm.reset();
        }
    }
}

async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Error logging out:", error.message);
    } else {
        updateUIForGuest();
    }
}

async function checkUserSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
        console.error("Error getting session:", error.message);
        updateUIForGuest();
    } else if (data.session) {
        updateUIForUser(data.session.user);
    } else {
        updateUIForGuest();
    }
    loadProducts();
}


// ==========================================
// 8. EVENT LISTENERS
// ==========================================

function attachSearchResultListeners() {
    const searchResultItems = document.querySelectorAll('.search-result-item');
    searchResultItems.forEach(item => {
        item.addEventListener('click', () => {
            const productId = item.dataset.id;
            const product = allProducts.find(p => String(p.id) === String(productId));
            if (product) {
                openModal(product);
            }
        });
    });
}

function attachProductCardListeners() {
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.addEventListener('click', (e) => {
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
    searchInput.addEventListener('input', filterProducts);

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
    
    // Auth Listeners ---
    loginBtn.addEventListener('click', openAuthModal);
    logoutBtn.addEventListener('click', handleLogout);
    authCloseBtn.addEventListener('click', closeAllOverlays);
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) closeAllOverlays();
    });
    
    // Auth form toggling
    showSignupFormBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        signupForm.style.display = 'flex';
    });
    showLoginFormBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'flex';
        signupForm.style.display = 'none';
    });

    // Auth form submissions
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignUp);

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
// 9. APP INITIALIZATION
// ==========================================
if (supabase) {
    checkUserSession();
}