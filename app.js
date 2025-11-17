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
        const featuredContainer = document.getElementById('featured-products-container');
        if(featuredContainer) featuredContainer.innerHTML = `<p style="color:red; text-align:center;">Error: Database not connected. Please check Supabase keys in app.js.</p>`;
    }

    // ==========================================
    // 2. PRODUCT LOADING
    // ==========================================
    let allProducts = []; // Store all products in a global array
    const featuredContainer = document.getElementById('featured-products-container');
    const allProductsContainer = document.getElementById('all-products-container');

    /**
     * Creates HTML for a single product card.
     * @param {object} product - The product object from Supabase.
     * @returns {string} - The HTML string for the product card.
     */
    function createProductCardHTML(product) {
        // Use 'price' from product, format it, default to 'Free'
        const price = product.price ? formatPrice(product.price) : 'Free';
        // Use 'image_url' or a placeholder
        const imageUrl = product.image_url || `https://via.placeholder.com/300x250/8A2BE2/FFFFFF?text=${product.title.replace(' ', '+')}`;
        
        // Use the product's database 'id' for the data-id attribute
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

    /**
     * Fetches products from Supabase and renders them.
     */
    async function loadProducts() {
        if (!supabase) return;

        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                // This is the error message I added to help debug
                throw new Error(`Supabase fetch failed: ${error.message}`);
            }

            // Clear loaders
            featuredContainer.innerHTML = '';
            allProductsContainer.innerHTML = '';

            allProducts = data; // Store all products
            const featuredProducts = data.filter(product => product.featured === true);

            // Render Featured Products
            if (featuredProducts.length > 0) {
                featuredProducts.forEach(product => {
                    featuredContainer.innerHTML += createProductCardHTML(product);
                });
            } else {
                featuredContainer.innerHTML = '<p style="text-align:center;">No featured products found.</p>';
            }

            // Render All Products
            if (allProducts.length > 0) {
                allProducts.forEach(product => {
                    allProductsContainer.innerHTML += createProductCardHTML(product);
                });
            } else {
                allProductsContainer.innerHTML = '<p style="text-align:center;">No products found.</p>';
            }

            // Now that products are loaded, attach listeners to them
            attachAllEventListeners(); 

        } catch (error) {
            // Show the specific error on the page
            console.error(error.message);
            featuredContainer.innerHTML = `<p style="color:red; text-align:center;">Error: ${error.message}</p>`;
            allProductsContainer.innerHTML = `<p style="color:red; text-align:center;">Error: ${error.message}</p>`;
        }
    }


    // ==========================================
    // 3. GLOBAL CART STATE
    // ==========================================
    let cart = []; // Stores cart items { id, title, price, imageUrl, quantity }

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

    // Auth Modal
    const authModal = document.getElementById('auth-modal-overlay');
    const authCloseBtn = document.getElementById('auth-close-btn');
    const authToggleLink = document.getElementById('auth-toggle-link');
    const authTitle = document.getElementById('auth-title');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const authMessage = document.getElementById('auth-message');
    const authButton = document.getElementById('auth-button');
    const userProfile = document.getElementById('user-profile');
    const userLabel = document.getElementById('user-label');
    const logoutButton = document.getElementById('logout-button');


    // ==========================================
    // 5. HELPER FUNCTIONS
    // ==========================================
    /**
     * Parses a price string (e.g., "Rp. 300,000") into a number (300000).
     * @param {string} priceStr 
     * @returns {number}
     */
    function parsePrice(priceStr) {
        if (!priceStr) return 0;
        // Remove "Rp.", commas, and whitespace
        return parseInt(String(priceStr).replace('Rp.', '').replace(/,/g, '').trim());
    }

    /**
     * Formats a number (300000) into a price string (e.g., "Rp. 300,000").
     * @param {number} priceNum 
     * @returns {string}
     */
    function formatPrice(priceNum) {
        return `Rp. ${priceNum.toLocaleString()}`;
    }

    /**
     * Closes all open modals and overlays.
     */
    function closeAllOverlays() {
        if (mobileMenu) mobileMenu.classList.remove('active');
        if (searchPanel) searchPanel.classList.remove('active');
        if (cartOverlay) cartOverlay.classList.remove('active');
        if (modalOverlay) modalOverlay.classList.remove('active');
        if (checkoutModal) checkoutModal.classList.remove('active');
        if (authModal) authModal.classList.remove('active');
        if (pageContent) pageContent.classList.remove('blur-active');
        
        // Clear search results when closing
        if (searchResultsContainer) searchResultsContainer.innerHTML = '<p class="search-prompt">Start typing to see results...</p>';
        if (searchInput) searchInput.value = '';
        
        // Clear auth messages
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
            // Use a short timeout to ensure focus works after transition
            setTimeout(() => { searchInput.focus(); }, 400);
        }
    }

    /**
     * Creates HTML for a single search result item.
     * @param {object} product 
     * @returns {string}
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
     * Filters products based on search input and renders results in the search panel.
     */
    function filterProducts() {
        const searchTerm = searchInput.value.toLowerCase();
        
        if (searchTerm.length === 0) {
            searchResultsContainer.innerHTML = '<p class="search-prompt">Start typing to see results...</p>';
            return;
        }

        let productsFound = 0;
        let resultsHTML = '';

        // Search the globally stored 'allProducts' array
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
     * Opens the product detail modal with the correct data.
     * @param {HTMLElement | object} productOrCard - The card element (from grid) or a product object (from search).
     */
    function openModal(productOrCard) {
        closeAllOverlays();
        
        let productData;

        // Check if it's an object (from search results) or an element (from card click)
        if (productOrCard.dataset) {
            // It's a card element, get data from data-attributes
            productData = productOrCard.dataset;
        } else {
            // It's a product object from search
            productData = {
                id: productOrCard.id,
                title: productOrCard.title,
                category: productOrCard.category,
                price: formatPrice(productOrCard.price), // Format the price
                imageUrl: productOrCard.image_url,
                description: productOrCard.description
            };
        }

        // Populate the modal
        modalImage.src = productData.imageUrl || `https://via.placeholder.com/600x600/8A2BE2/FFFFFF?text=${productData.title.replace(' ', '+')}`;
        modalTitle.textContent = productData.title;
        modalCategory.textContent = productData.category;
        modalPrice.textContent = productData.price;
        modalDescription.textContent = productData.description;
        modalQuantityInput.value = 1;

        // Store data on the modal's "Add to Cart" button
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

    /**
     * Updates the notification badge on the cart icon.
     */
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

    /**
     * Adds an item to the cart array and updates the UI.
     * @param {object} item - The item to add.
     */
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

    /**
     * Removes an item from the cart array by its ID and updates the UI.
     * @param {string} itemId 
     */
    function removeFromCart(itemId) {
        cart = cart.filter(item => String(item.id) !== String(itemId));
        renderCart();
        updateCartNotification();
    }

    /**
     * Re-draws the cart sidebar based on the 'cart' array.
     */
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
        if (cart.length === 0) return; // Don't open if cart is empty
        closeAllOverlays();
        checkoutTotalPriceEl.textContent = cartSubtotalEl.textContent;
        checkoutModal.classList.add('active');
    }

    /**
     * Handles the "Confirm Purchase" button click.
     * @param {Event} e 
     */
    function handlePurchase(e) {
        e.preventDefault(); // Stop form from reloading the page
        closeAllOverlays();
        cart = []; // Empty the cart
        renderCart();
        updateCartNotification();
        checkoutForm.reset();
        
        // Show success popup
        successPopup.classList.add('active');
        setTimeout(() => {
            successPopup.classList.remove('active');
        }, 3000);
    }

    // --- Auth Logic ---
    /**
     * Toggles the Auth modal between Login and Sign Up views.
     * @param {Event} e 
     */
    function toggleAuthView(e) {
        e.preventDefault();
        authMessage.textContent = '';
        authMessage.className = 'auth-message';
        
        if (loginForm.style.display === 'none') {
            // Switch to Login view
            loginForm.style.display = 'flex';
            signupForm.style.display = 'none';
            authTitle.textContent = 'Login';
            authToggleLink.innerHTML = 'Don\'t have an account? <strong>Sign Up</strong>';
        } else {
            // Switch to Sign Up view
            loginForm.style.display = 'none';
            signupForm.style.display = 'flex';
            authTitle.textContent = 'Sign Up';
            authToggleLink.innerHTML = 'Already have an account? <strong>Login</strong>';
        }
    }

    /**
     * Shows an error or success message in the auth modal.
     * @param {string} message 
     * @param {'error' | 'success'} type 
     */
    function showAuthMessage(message, type = 'error') {
        authMessage.textContent = message;
        authMessage.className = `auth-message ${type}`;
    }

    /**
     * Handles the sign-up form submission.
     * @param {Event} e 
     */
    async function handleSignUp(e) {
        e.preventDefault();
        showAuthMessage('Signing up...', 'success');
        
        const email = e.target.email.value;
        const password = e.target.password.value;
        const confirmPassword = e.target.confirmPassword.value;
        const username = e.target.username.value;

        // Password validation
        if (password !== confirmPassword) {
            showAuthMessage('Passwords do not match.', 'error');
            return;
        }

        // --- THIS IS THE FIXED LINE (underscore removed) ---
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username // Store username in metadata
                }
            }
        });
        // --- END OF FIX ---

        if (error) {
            showAuthMessage(error.message, 'error');
        } else if (data.user) {
            showAuthMessage('Sign up successful! Please log in.', 'success');
            // Switch to login view
            setTimeout(() => {
                 toggleAuthView(new Event('click')); // Simulate click to switch
            }, 1000);
        }
    }

    /**
     * Handles the login form submission.
     * @param {Event} e 
     */
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

    /**
     * Handles the logout button click.
     */
    async function handleLogout() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error logging out:', error.message);
        } else {
            updateUIForUser(null);
        }
    }

    /**
     * Updates the navbar to show user info or the login button.
     * @param {object | null} user - The Supabase user object or null.
     */
    function updateUIForUser(user) {
        if (user) {
            authButton.style.display = 'none';
            userProfile.style.display = 'flex';
            // Use username from metadata, fall back to email
            userLabel.textContent = user.user_metadata?.username || user.email;
        } else {
            authButton.style.display = 'block';
            userProfile.style.display = 'none';
            userLabel.textContent = '';
        }
    }

    /**
     * Checks for an existing user session on page load.
     */
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

    /**
     * Attaches listeners to the dynamic search result items.
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

    /**
     * Attaches listeners to all static and dynamic product cards.
     * This is now the main function to call after products are loaded.
     */
    function attachAllEventListeners() {
        // We select the containers and delegate events
        const containers = [featuredContainer, allProductsContainer];
        
        containers.forEach(container => {
            if (!container) return;
            
            container.addEventListener('click', (e) => {
                const card = e.target.closest('.product-card');
                if (!card) return; // Click wasn't on a card

                const isAddToCartButton = e.target.closest('.add-to-cart-btn');
                
                if (isAddToCartButton) {
                    // "Add to Cart" button was clicked
                    e.stopPropagation(); // Prevent modal from opening
                    const item = {
                        id: card.dataset.id,
                        title: card.dataset.title,
                        price: card.dataset.price,
                        imageUrl: card.dataset.imageUrl,
                        quantity: 1
                    };
                    addToCart(item);
                } else {
                    // The card itself was clicked
                    openModal(card);
                }
            });
        });
    }

    /**
     * Attaches all static event listeners on page load.
     */
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
        
        // This is the listener that was removed to prevent clickaway
        // if (authModal) {
        //     authModal.addEventListener('click', (e) => {
        //         if (e.target === authModal) closeAllOverlays();
        //     });
        // }
        
        if (authToggleLink) authToggleLink.addEventListener('click', toggleAuthView);
        if (loginForm) loginForm.addEventListener('submit', handleLogin);
        if (signupForm) signupForm.addEventListener('submit', handleSignUp);
        if (logoutButton) logoutButton.addEventListener('click', handleLogout);

        // --- Global Listeners ---
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAllOverlays();
        });
        
        // --- THIS IS THE FIXED LINE ---
        // This listener closes the search panel, but not other modals
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
    // First, attach all static listeners
    attachStaticListeners();
    // Then, if Supabase is connected, load products (which attaches dynamic listeners)
    if (supabase) {
        loadProducts();
        checkUserSession(); // Check for a logged-in user
    }
    // Initial render for cart (to show 0)
    renderCart();

});