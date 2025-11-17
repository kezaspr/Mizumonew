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
    // 3. GLOBAL CART & USER STATE (NEW)
    // ==========================================
    let cart = []; 
    let currentUser = null;
    let userCartRowId = null; // This will store the 'id' of the user's cart row in the db

    // ==========================================
    // 4. ELEMENT VARIABLES
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
        const imageUrl = product.image_url || `https::via.placeholder.com/100x100/8A2BE2/FFFFFF?text=${product.title.replace(' ', '+')}`;

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

    // --- Cart Logic (HEAVILY UPDATED) ---
    function openCart() {
        closeAllOverlays();
        cartOverlay.classList.add('active');
    }

    function updateCartNotification() {
        if (!cartNotificationBadge) return;
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
            // Ensure we are adding all necessary fields, especially 'id'
            cart.push({ 
                id: item.id,
                title: item.title,
                price: item.price,
                imageUrl: item.imageUrl,
                quantity: item.quantity || 1 
            });
        }
        renderCart();
        updateCartNotification();
        saveCart(); // NEW: Save cart on change
    }

    function removeFromCart(itemId) {
        cart = cart.filter(item => String(item.id) !== String(itemId));
        renderCart();
        updateCartNotification();
        saveCart(); // NEW: Save cart on change
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

    // --- NEW: Persistent Cart Functions ---

    /**
     * Saves the cart to Supabase (if logged in) or localStorage (if guest).
     */
    async function saveCart() {
        // Sanitize cart data before saving, ensure 'id' is present
        const sanitizedCart = cart.map(item => ({
            id: item.id,
            title: item.title,
            price: item.price,
            imageUrl: item.imageUrl,
            quantity: item.quantity
        }));

        if (currentUser) {
            // User is logged in, save to Supabase
            if (userCartRowId) {
                // User already has a cart row, UPDATE it
                console.log("Saving (update) cart to Supabase:", sanitizedCart);
                const { error } = await supabase
                    .from('user_carts')
                    .update({ cart_data: sanitizedCart })
                    .eq('id', userCartRowId);
                if (error) console.error('Error updating cart:', error.message);
            } else {
                // User does not have a cart row, INSERT one
                console.log("Saving (insert) cart to Supabase:", sanitizedCart);
                const { data, error } = await supabase
                    .from('user_carts')
                    .insert({ user_id: currentUser.id, cart_data: sanitizedCart })
                    .select('id')
                    .single(); // Get the new row ID back
                if (error) {
                    console.error('Error creating cart:', error.message);
                } else if (data) {
                    userCartRowId = data.id; // Save the new row ID
                    console.log("Created new cart row with id:", userCartRowId);
                }
            }
        } else {
            // User is a guest, save to localStorage
            console.log("Saving cart to localStorage:", sanitizedCart);
            localStorage.setItem('guestCart', JSON.stringify(sanitizedCart));
        }
    }

    /**
     * Loads the cart from Supabase (if logged in) or localStorage (if guest).
     */
    async function loadCart() {
        if (currentUser) {
            // User is logged in, load from Supabase
            console.log("Loading cart from Supabase for user:", currentUser.id);
            const { data, error } = await supabase
                .from('user_carts')
                .select('id, cart_data')
                .eq('user_id', currentUser.id)
                .single(); // Get the user's single cart row

            if (data && data.cart_data) {
                cart = data.cart_data;
                userCartRowId = data.id;
                console.log("Cart loaded from Supabase. Row ID:", userCartRowId, "Cart:", cart);
            } else if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                console.error('Error loading cart:', error.message);
                cart = [];
            } else {
                // No row found, user has an empty cart
                console.log("No cart row found for user. Setting empty cart.");
                cart = [];
                userCartRowId = null;
            }
        } else {
            // User is a guest, load from localStorage
            console.log("Loading cart from localStorage for guest.");
            try {
                const guestCart = localStorage.getItem('guestCart');
                cart = guestCart ? JSON.parse(guestCart) : [];
                console.log("Guest cart loaded:", cart);
            } catch (e) {
                console.error('Error parsing guest cart:', e);
                cart = [];
            }
        }
        // Render the loaded cart
        renderCart();
        updateCartNotification();
    }

    /**
     * Merges the guest cart (localStorage) with the user's cart (Supabase) on login.
     */
    async function mergeAndLoadCarts() {
        let guestCart = [];
        try {
            const guestCartData = localStorage.getItem('guestCart');
            guestCart = guestCartData ? JSON.parse(guestCartData) : [];
            console.log("Merging guest cart:", guestCart);
        } catch (e) {
            console.error('Error parsing guest cart for merge:', e);
        }

        // Load the user's saved cart from the database
        // This populates the global 'cart' array
        await loadCart(); 

        if (guestCart.length > 0) {
            console.log("Guest cart has items. Merging with user cart:", cart);
            // If the guest had items, merge them
            guestCart.forEach(guestItem => {
                const existingItem = cart.find(userItem => String(userItem.id) === String(guestItem.id));
                if (existingItem) {
                    existingItem.quantity += guestItem.quantity; // Add quantities
                } else {
                    cart.push(guestItem); // Add new item
                }
            });

            // Clear the local storage guest cart
            localStorage.removeItem('guestCart');
            // Save the newly merged cart to the database
            await saveCart();
            // Re-render
            renderCart();
            updateCartNotification();
            console.log("Merge complete. New cart:", cart);
        }
    }


    // --- Checkout Logic ---
    function openCheckout() {
        if (cart.length === 0) return;
        closeAllOverlays();
        checkoutTotalPriceEl.textContent = cartSubtotalEl.textContent;
        checkoutModal.classList.add('active');
    }

    async function handlePurchase(e) {
        e.preventDefault(); 
        closeAllOverlays();
        cart = []; // Empty the cart
        await saveCart(); // NEW: Save the empty cart
        renderCart();
        updateCartNotification();
        checkoutForm.reset();
        
        successPopup.classList.add('active');
        setTimeout(() => {
            successPopup.classList.remove('active');
        }, 3000);
    }

    // --- Auth Logic (UPDATED) ---
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
        
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const username = document.getElementById('signup-username').value;

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
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            showAuthMessage(error.message, 'error');
        } else if (data.user) {
            showAuthMessage('Login successful!', 'success');
            currentUser = data.user; // NEW: Set current user
            await mergeAndLoadCarts(); // NEW: Load and merge cart
            updateUIForUser(data.user);
            setTimeout(closeAllOverlays, 1000);
        }
    }

    async function handleLogout() {
        await saveCart(); // NEW: Save cart before logging out
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error logging out:', error.message);
        } else {
            currentUser = null; // NEW: Clear user
            userCartRowId = null;
            await loadCart(); // NEW: Load guest cart (which might be empty)
            updateUIForUser(null);
        }
    }

    function updateUIForUser(user) {
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
            currentUser = session.user; // NEW: Set current user
            updateUIForUser(session.user);
        } else {
            currentUser = null; // NEW: Ensure user is null
            updateUIForUser(null);
        }
        await loadCart(); // NEW: Load cart AFTER checking session
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
        if (hamburgerIcon) hamburgerIcon.addEventListener('click', toggleMobileMenu);
        if (mobileMenuClose) mobileMenuClose.addEventListener('click', closeAllOverlays);
        if (mobileMenu) {
            mobileMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', closeAllOverlays);
            });
        }
        if (searchIcon) searchIcon.addEventListener('click', toggleSearch);
        if (searchInput) searchInput.addEventListener('input', filterProducts);
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
        if (checkoutBtn) checkoutBtn.addEventListener('click', openCheckout);
        if (checkoutCloseBtn) checkoutCloseBtn.addEventListener('click', closeAllOverlays);
        if (checkoutModal) {
            checkoutModal.addEventListener('click', (e) => {
                if (e.target === checkoutModal) closeAllOverlays();
            });
        }
        if (checkoutForm) checkoutForm.addEventListener('submit', handlePurchase);
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
    
    initializeDOMElements();
    attachStaticListeners();

    if (supabase) {
        loadProducts(); // This will call attachAllEventListeners()
        checkUserSession(); // This will call loadCart()
    } else {
        loadCart(); // Load guest cart even if Supabase fails
    }

});