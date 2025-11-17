/* Mizumo Marketplace App
    Contains logic for:
    1. Supabase Integration
    2. Product Loading
    3. Global Cart State
    4. Element Variables (NEW)
    5. Helper Functions
    6. Core App Logic (Mobile, Search, Modal, Cart, Checkout, Auth)
    7. Event Listeners
    8. App Initialization
*/

// --- THIS IS THE FIX ---
// We wrap all code in this event listener
document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. SUPABASE INTEGRATION
    // ==========================================

    // --- PASTE YOUR KEYS HERE ---
    const SUPABASE_URL = 'https://uzjxoandxfclcvpfmuun.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_FgLUWwf9LUxgvJtsI6vP4g_qIY5aqWz';

    let supabase = null;
    try {
      // Check if the variables exist and are not the placeholders
      if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_PROJECT_URL') {
        throw new Error('Supabase URL is not set. Please update app.js.');
      }
      if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_ANON_PUBLIC_KEY') {
        throw new Error('SupABASE Anon Key is not set. Please update app.js.');
      }
      // Note: The global 'supabase' object comes from the script tag in index.html
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('Mizumo App Initialized with Supabase!');

    } catch (error) {
        console.error(error.message);
        // We find the element here just for the error message
        const el = document.getElementById('featured-products-container');
        if(el) el.innerHTML = `<p style="color:red; text-align:center;">Error: Database not connected. Please check Supabase keys in app.js.</p>`;
    }

    // ==========================================
    // 2. PRODUCT LOADING
    // ==========================================
    let allProducts = []; // Store all products in a global array
    
    function createProductCardHTML(product) {
        const price = product.price ? formatPrice(product.price) : 'Free';
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
            <div class="product-image" style="background-image: url('${imageUrl}'); background-position: center; background-repeat: no-repeat; overflow: hidden;"></div>
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
    // 4. ELEMENT VARIABLES (NEW STRUCTURE)
    // ==========================================
    // We declare them here, but assign them inside a function
    let pageContent, hamburgerIcon, mobileMenu, mobileMenuClose, searchIcon, 
        searchPanel, searchInput, searchResultsContainer, modalOverlay, 
        modalCloseBtn, modalImage, modalTitle, modalCategory, modalPrice, 
        modalDescription, modalQuantityInput, modalAddToCartBtn, cartIconWrapper, 
        cartOverlay, cartCloseBtn, cartBody, cartEmpty, cartSubtotalEl, 
        cartNotificationBadge, checkoutBtn, checkoutModal, checkoutCloseBtn, 
        checkoutForm, checkoutTotalPriceEl, successPopup, authModal, 
        authCloseBtn, authToggleLink, authTitle, loginForm, signupForm, 
        authMessage, authButton, userProfile, userLabel, logoutButton,
        featuredContainer, allProductsContainer;

    /**
     * Finds all HTML elements and assigns them to variables.
     * This is the fix for the "null" error.
     */
    function initializeDOMElements() {
        pageContent = document.getElementById('page-content');
        hamburgerIcon = document.getElementById('hamburger-icon');
        mobileMenu = document.getElementById('mobile-menu');
        mobileMenuClose = document.getElementById('mobile-menu-close');
        searchIcon = document.getElementById('nav-search-icon');
        searchPanel = document.getElementById('search-slide-down');
        searchInput = document.getElementById('slide-search-input');
        searchResultsContainer = document.getElementById('search-results-container');
        modalOverlay = document.getElementById('product-modal-overlay');
        modalCloseBtn = document.getElementById('modal-close-btn');
        modalImage = document.getElementById('modal-image');
        modalTitle = document.getElementById('modal-title');
        modalCategory = document.getElementById('modal-category');
        modalPrice = document.getElementById('modal-price');
        modalDescription = document.getElementById('modal-description');
        modalQuantityInput = document.getElementById('modal-quantity');
        modalAddToCartBtn = document.querySelector('.modal-add-to-cart');
        cartIconWrapper = document.getElementById('cart-icon-wrapper');
        cartOverlay = document.getElementById('cart-overlay-container');
        cartCloseBtn = document.getElementById('cart-close-btn');
        cartBody = document.getElementById('cart-body');
        cartEmpty = document.getElementById('cart-empty');
        cartSubtotalEl = document.getElementById('cart-subtotal-price');
        cartNotificationBadge = document.getElementById('cart-notification-badge');
        checkoutBtn = document.getElementById('cart-checkout-btn');
        checkoutModal = document.getElementById('checkout-modal-overlay');
        checkoutCloseBtn = document.getElementById('checkout-close-btn');
        checkoutForm = document.getElementById('checkout-form');
        checkoutTotalPriceEl = document.getElementById('checkout-total-price');
        successPopup = document.getElementById('success-popup');
        authModal = document.getElementById('auth-modal-overlay');
        authCloseBtn = document.getElementById('auth-close-btn');
        authToggleLink = document.getElementById('auth-toggle-link');
        authTitle = document.getElementById('auth-title');
        loginForm = document.getElementById('login-form');
        signupForm = document.getElementById('signup-form');
        authMessage = document.getElementById('auth-message');
        authButton = document.getElementById('auth-button');
        userProfile = document.getElementById('user-profile');
        userLabel = document.getElementById('user-label');
        logoutButton = document.getElementById('logout-button');
        featuredContainer = document.getElementById('featured-products-container');
        allProductsContainer = document.getElementById('all-products-container');
    }


    // ==========================================
    // 5. HELPER FUNCTIONS
    // ==========================================
    function parsePrice(priceStr) {
        if (!priceStr) return 0;
        return parseInt(String(priceStr).replace('Rp.', '').replace(/,/g, '').trim());
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
        if (authModal) authModal.classList.remove('active');
        if (pageContent) pageContent.classList.remove('blur-active');
        if (searchResultsContainer) searchResultsContainer.innerHTML = '<p class="search-prompt">Start typing to see results...</p>';
        if (searchInput) searchInput.value = '';
        if (authMessage) {
            authMessage.textContent = '';
            authMessage.className = 'auth-message';
        }
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
        if (!cartBody || !cartEmpty || !cartSubtotalEl) return;
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

    // --- Auth Logic ---
    function toggleAuthView(e) {
        e.preventDefault();
        if (!authMessage || !loginForm || !signupForm || !authTitle || !authToggleLink) return;
        
        authMessage.textContent = '';
        authMessage.className = 'auth-message';
        
        if (loginForm.style.display === 'none') {
            loginForm.style.display = 'flex';
            signupForm.style.display = 'none';
            authTitle.textContent = 'Login';
            authToggleLink.innerHTML = 'Don\'t have an account? <strong>Sign Up</strong>';
        } else {
            loginForm.style.display = 'none';
            signupForm.style.display = 'flex';
            authTitle.textContent = 'Sign Up';
            authToggleLink.innerHTML = 'Already have an account? <strong>Login</strong>';
        }
    }

    function showAuthMessage(message, type = 'error') {
        if (!authMessage) return;
        authMessage.textContent = message;
        authMessage.className = `auth-message ${type}`;
    }

    async function handleSignUp(e) {
        e.preventDefault();
        showAuthMessage('Signing up...', 'success');
        
        const email = e.target.email.value;
        const password = e.target.password.value;
        const confirmPassword = e.target.confirmPassword.value;
        const username = e.target.username.value;

        if (password !== confirmPassword) {
            showAuthMessage('Passwords do not match.', 'error');
            return;
        }

        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username 
                }
            }
        });

        if (error) {
            showAuthMessage(error.message, 'error');
        } else if (data.user) {
            showAuthMessage('Sign up successful! Please log in.', 'success');
            setTimeout(() => {
                 toggleAuthView(new Event('click')); 
            }, 1000);
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        showAuthMessage('Logging in...', 'success');
        
        const email = e.target.email.value;
        const password = e.target.password.value;

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            showAuthMessage(error.message, 'error');
        } else if (data.user) {
            showAuthMessage('Login successful!', 'success');
            updateUIForUser(data.user);
            setTimeout(closeAllOverlays, 1000);
        }
    }

    async function handleLogout() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error logging out:', error.message);
        } else {
            updateUIForUser(null);
        }
    }

    function updateUIForUser(user) {
        // The guard clause is still here, but now it checks the variables
        // that were assigned in initializeDOMElements()
        if (!authButton || !userProfile || !userLabel) {
            console.warn('Auth UI elements not found. Skipping UI update.');
            return; 
        }

        if (user) {
            authButton.style.display = 'none';
            userProfile.style.display = 'flex';
            userLabel.textContent = user.user_metadata?.username || user.email;
        } else {
            authButton.style.display = 'block';
            userProfile.style.display = 'none';
            userLabel.textContent = '';
        }
    }

    async function checkUserSession() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            updateUIForUser(session.user);
        } else {
            updateUIForUser(null);
        }
    }


    // ==========================================
    // 7. EVENT LISTENERS
    // ==========================================

    function attachSearchResultListeners() {
        const searchResultItems = document.querySelectorAll('.search-result-item');
        searchResultItems.forEach(item => {
            item.addEventListener('click', () => {
                const productId = item.dataset.id;
                const product = allProducts.find(p => String(p.id) === String(productId));
                if (product) {
                    openModal(product);
                } else {
                    console.error("Could not find product with ID:", productId);
                }
            });
        });
    }

    function attachAllEventListeners() {
        const containers = [featuredContainer, allProductsContainer];
        
        containers.forEach(container => {
            if (!container) return;
            
            container.addEventListener('click', (e) => {
                const card = e.target.closest('.product-card');
                if (!card) return; 
                const isAddToCartButton = e.target.closest('.add-to-cart-btn');
                
                if (isAddToCartButton) {
                    e.stopPropagation();
                    const item = {
                        id: card.dataset.id,
                        title: card.dataset.title,
                        price: card.dataset.price,
                        imageUrl: card.dataset.imageUrl,
                        quantity: 1
                    };
                    addToCart(item);
                } else {
                    openModal(card);
                }
            });
        });
    }

    function attachStaticListeners() {
        // --- Mobile Menu ---
        if (hamburgerIcon) hamburgerIcon.addEventListener('click', toggleMobileMenu);
        if (mobileMenuClose) mobileMenuClose.addEventListener('click', closeAllOverlays);
        if (mobileMenu) {
            mobileMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', closeAllOverlays);
            });
        }

        // --- Search ---
        if (searchIcon) searchIcon.addEventListener('click', toggleSearch);
        if (searchInput) searchInput.addEventListener('input', filterProducts);

        // --- Product Modal ---
        if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeAllOverlays);
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) closeAllOverlays();
            });
        }
        if (modalAddToCartBtn) {
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
        }

        // --- Cart ---
        if (cartIconWrapper) cartIconWrapper.addEventListener('click', openCart);
        if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeAllOverlays);
        if (cartOverlay) {
            cartOverlay.addEventListener('click', (e) => {
                if (e.target === cartOverlay) closeAllOverlays();
            });
        }
        if (cartBody) {
            cartBody.addEventListener('click', (e) => {
                if (e.target.classList.contains('cart-item-remove')) {
                    removeFromCart(e.target.dataset.id);
                }
            });
        }

        // --- Checkout ---
        if (checkoutBtn) checkoutBtn.addEventListener('click', openCheckout);
        if (checkoutCloseBtn) checkoutCloseBtn.addEventListener('click', closeAllOverlays);
        if (checkoutModal) {
            checkoutModal.addEventListener('click', (e) => {
                if (e.target === checkoutModal) closeAllOverlays();
            });
        }
        if (checkoutForm) checkoutForm.addEventListener('submit', handlePurchase);

        // --- Auth ---
        if (authButton) {
            authButton.addEventListener('click', () => {
                closeAllOverlays();
                authModal.classList.add('active');
            });
        }
        if (authCloseBtn) authCloseBtn.addEventListener('click', closeAllOverlays);
        
        if (authToggleLink) authToggleLink.addEventListener('click', toggleAuthView);
        if (loginForm) loginForm.addEventListener('submit', handleLogin);
        if (signupForm) signupForm.addEventListener('submit', handleSignUp);
        if (logoutButton) logoutButton.addEventListener('click', handleLogout);

        // --- Global Listeners ---
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAllOverlays();
        });
        
        document.addEventListener('click', (e) => {
            if (searchPanel && searchPanel.classList.contains('active')) {
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
    
    // --- THIS IS THE NEW STRUCTURE ---
    
    // 1. Find all the elements on the page first.
    initializeDOMElements();
    
    // 2. Attach all listeners to those elements.
    attachStaticListeners();

    // 3. Connect to database and load dynamic content.
    if (supabase) {
        loadProducts(); // This will call attachAllEventListeners() when done
        checkUserSession();
    }
    
    // 4. Render the cart (to show "Rp. 0")
    renderCart();

}); // --- THIS IS THE END OF THE DOMContentLoaded WRAPPER ---