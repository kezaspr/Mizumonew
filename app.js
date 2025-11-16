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
const SUPABASE_URL = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6anhvYW5keGZjbGN2cGZtdXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMjI4MzgsImV4cCI6MjA3ODc5ODgzOH0.bm-e14AYu3mBj_knLeigA4PIV5QJNLe68SDyuqwhNxs'; // Get this from Supabase > Project Settings > API > Project URL
const SUPABASE_ANON_KEY = 'sb_publishable_FgLUWwf9LUxgvJtsI6vP4g_qIY5aqWz'; // Get this from Supabase > Project Settings > API > Project API Keys

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
    console.log('Mizumo App Initialized with Supabase');
} catch (error) {
    console.error(error.message);
    // Alert the user if the keys are not set
    const featuredContainer = document.getElementById('featured-products-container');
    if(featuredContainer) featuredContainer.innerHTML = `<p style="color:red; text-align:center;">Error: Database not connected. Please check Supabase keys in app.js.</p>`;
    const allProductsContainer = document.getElementById('all-products-container');
    if(allProductsContainer) allProductsContainer.innerHTML = '';
}


document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 0. GLOBAL CART STATE
    // ==========================================
    let cart = []; // This will be loaded from localStorage (or Supabase auth) later
    let allProducts = []; // NEW: Cache for all products


    // ==========================================
    // 1.5. DYNAMIC PRODUCT LOADING (NEW)
    // ==========================================

    const featuredContainer = document.getElementById('featured-products-container');
    const allProductsContainer = document.getElementById('all-products-container');

    /**
     * Creates the HTML for a single product card.
     */
    function createProductCardHTML(product) {
        // Use placeholder images if database image_url is missing
        const placeholderImg = `https://via.placeholder.com/300x250/${product.featured ? '8A2BE2' : '39FF14'}/FFFFFF?text=${product.title.replace(' ', '+')}`;
        const imageUrl = product.image_url ? `url('${product.image_url}')` : `url('${placeholderImg}')`;
        const smallImageUrl = product.image_url ? product.image_url.replace('/300x250/', '/100x100/') : placeholderImg.replace('/300x250/', '/100x100/');


        return `
        <div class="product-card" 
             data-id="${product.id}" 
             data-title="${product.title}"
             data-category="${product.category}"
             data-price="${formatPrice(product.price)}"
             data-image-url="${product.image_url || placeholderImg}"
             data-small-image-url="${smallImageUrl}" 
             data-description="${product.description || 'No description available.'}">
            
            <div class="product-image" style="background-image: ${imageUrl}; background-size: cover;"></div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <p class="product-category">${product.category}</p>
                <div class="product-footer">
                    <span class="product-price">${formatPrice(product.price)}</span>
                    <button class="add-to-cart-btn">Add <i class="fas fa-shopping-cart"></i></button>
                </div>
            </div>
        </div>
        `;
    }

    /**
     * Fetches all products from Supabase and populates the page.
     */
    async function loadProducts() {
        if (!supabase) return; // Stop if Supabase isn't initialized

        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });


        if (error) {
            console.error('Error fetching products:', error);
            if(featuredContainer) featuredContainer.innerHTML = `<p style="color:red; text-align:center;">Error loading products. Check RLS or API Keys.</p>`;
            if(allProductsContainer) allProductsContainer.innerHTML = ``;
            return;
        }

        allProducts = data; // Cache all products
        
        let featuredHTML = '';
        let allItemsHTML = '';

        for (const product of data) {
            const cardHTML = createProductCardHTML(product);
            
            if (product.featured) {
                featuredHTML += cardHTML;
            }
            allItemsHTML += cardHTML;
        }

        // Populate containers
        if(featuredContainer) featuredContainer.innerHTML = featuredHTML || '<p>No featured items found.</p>';
        if(allProductsContainer) allProductsContainer.innerHTML = allItemsHTML || '<p>No items found.</p>';
    
        // --- IMPORTANT ---
        // Now that products are loaded, attach all event listeners
        attachAllEventListeners();
    }


    // ==========================================
    // 2. PRODUCT DETAIL MODAL LOGIC
    // ==========================================
    
    const modalOverlay = document.getElementById('product-modal-overlay');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    
    // productCards query is now inside attachAllEventListeners

    const modalImage = document.getElementById('modal-image');
    const modalTitle = document.getElementById('modal-title');
    const modalCategory = document.getElementById('modal-category');
    const modalPrice = document.getElementById('modal-price');
    const modalDescription = document.getElementById('modal-description');
    const modalQuantityInput = document.getElementById('modal-quantity');
    const modalAddToCartBtn = document.querySelector('.modal-add-to-cart');

    function openModal() {
        closeAllOverlays();
        try {
            const card = this; // 'this' is the .product-card that was clicked
            if(modalImage) modalImage.src = card.dataset.imageUrl;
            if(modalTitle) modalTitle.textContent = card.dataset.title;
            if(modalCategory) modalCategory.textContent = card.dataset.category;
            if(modalPrice) modalPrice.textContent = card.dataset.price;
            if(modalDescription) modalDescription.textContent = card.dataset.description;
            if(modalQuantityInput) modalQuantityInput.value = 1;

            if(modalAddToCartBtn) {
                // Store data on the button
                modalAddToCartBtn.dataset.id = card.dataset.id;
                modalAddToCartBtn.dataset.title = card.dataset.title;
                modalAddToCartBtn.dataset.price = card.dataset.price;
                modalAddToCartBtn.dataset.image = card.dataset.smallImageUrl; // Use small image for cart
            }

            if(modalOverlay) modalOverlay.classList.add('active');
        } catch (error) {
            console.error("Error opening modal:", error, this);
        }
    }

    function closeModal() {
        if(modalOverlay) modalOverlay.classList.remove('active');
    }

    // --- Event Listeners for Modal (base listeners) ---
    if(modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if(modalOverlay) modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    if (modalAddToCartBtn) {
        modalAddToCartBtn.addEventListener('click', () => {
            const itemData = modalAddToCartBtn.dataset;
            const quantity = parseInt(modalQuantityInput.value) || 1;
            
            const item = {
                id: itemData.id,
                title: itemData.title,
                price: itemData.price,
                image: itemData.image, // Use the small image
                quantity: quantity
            };
            
            addToCart(item);
            closeModal();
        });
    }


    // ==========================================
    // 3. SLIDE-DOWN SEARCH LOGIC
    // ==========================================

    const searchIcon = document.getElementById('nav-search-icon');
    const searchPanel = document.getElementById('search-slide-down');
    const searchInput = document.getElementById('slide-search-input');
    const pageContent = document.getElementById('page-content');

    function toggleSearch() {
        if (!searchPanel) return;
        const isActive = searchPanel.classList.contains('active');
        if (isActive) {
            searchPanel.classList.remove('active');
            if(pageContent) pageContent.classList.remove('blur-active');
        } else {
            closeAllOverlays();
            searchPanel.classList.add('active');
            if(pageContent) pageContent.classList.add('blur-active');
            setTimeout(() => { if(searchInput) searchInput.focus(); }, 100);
        }
    }

    if(searchIcon) searchIcon.addEventListener('click', (e) => {
        e.preventDefault(); 
        toggleSearch();
    });
    
    // NEW: Search Filtering Logic
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            let filteredHTML = '';

            if (searchTerm.length > 0) {
                // Filter the 'allProducts' cache
                const filteredProducts = allProducts.filter(p => p.title.toLowerCase().includes(searchTerm));
                filteredHTML = filteredProducts.map(createProductCardHTML).join('') || '<p style="color:white; text-align:center;">No items match your search.</p>';
            } else {
                // Show all products if search is empty
                filteredHTML = allProducts.map(createProductCardHTML).join('');
            }
            
            if(allProductsContainer) allProductsContainer.innerHTML = filteredHTML;
            // RE-ATTACH listeners to the new cards
            attachProductCardListeners();
        });
    }


    // ==========================================
    // 4. MOBILE HAMBURGER MENU LOGIC
    // ==========================================
    
    const hamburgerIcon = document.getElementById('hamburger-icon');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuClose = document.getElementById('mobile-menu-close');
    const mobileMenuLinks = document.querySelectorAll('.mobile-links a');

    function openMobileMenu() {
        closeAllOverlays();
        if (mobileMenu) mobileMenu.classList.add('active');
    }

    function closeMobileMenu() {
        if (mobileMenu) mobileMenu.classList.remove('active');
    }

    if (hamburgerIcon) hamburgerIcon.addEventListener('click', openMobileMenu);
    if (mobileMenuClose) mobileMenuClose.addEventListener('click', closeMobileMenu);
    
    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });


    // ==========================================
    // 5. SHOPPING CART LOGIC
    // ==========================================

    const cartIconWrapper = document.getElementById('cart-icon-wrapper');
    const cartOverlay = document.getElementById('cart-overlay-container');
    const cartCloseBtn = document.getElementById('cart-close-btn');
    const cartBody = document.getElementById('cart-body');
    const cartEmpty = document.getElementById('cart-empty');
    const cartSubtotalEl = document.getElementById('cart-subtotal-price');
    const cartNotificationBadge = document.getElementById('cart-notification-badge');
    // addtoCartButtons query is now inside attachAllEventListeners

    // --- Helper Functions ---
    function parsePrice(priceStr) {
        if (!priceStr) return 0;
        return parseInt(String(priceStr).replace('R$', '').replace(',', '').trim());
    }

    function formatPrice(priceNum) {
        return `R$ ${Number(priceNum).toLocaleString()}`;
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

    // --- Core Cart Functions ---
    function openCart() {
        closeAllOverlays();
        if(cartOverlay) cartOverlay.classList.add('active');
    }

    function closeCart() {
        if(cartOverlay) cartOverlay.classList.remove('active');
    }

    function addToCart(item) {
        const existingItem = cart.find(cartItem => String(cartItem.id) === String(item.id));
        
        if (existingItem) {
            existingItem.quantity += item.quantity || 1;
        } else {
            cart.push({ ...item, quantity: item.quantity || 1 });
        }
        
        console.log('Cart updated:', cart);
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
                    <img src="${item.image}" alt="${item.title}" class="cart-item-image">
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

    // --- Event Listeners for Cart ---
    if(cartIconWrapper) cartIconWrapper.addEventListener('click', openCart);
    if(cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
    if(cartOverlay) cartOverlay.addEventListener('click', (e) => {
        if (e.target === cartOverlay) closeCart();
    });

    if(cartBody) {
        cartBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('cart-item-remove')) {
                const itemId = e.target.dataset.id;
                removeFromCart(itemId);
            }
        });
    }

    // ==========================================
    // 6. CHECKOUT LOGIC
    // ==========================================
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    const checkoutOverlay = document.getElementById('checkout-modal-overlay');
    const checkoutCloseBtn = document.getElementById('checkout-close-btn');
    const checkoutTotalEl = document.getElementById('checkout-total-price');
    const checkoutForm = document.getElementById('checkout-form');
    const successPopup = document.getElementById('success-popup');

    function openCheckout() {
        if (cart.length === 0) {
            // Use a custom popup/modal later, for now, alert is fine
            alert('Your cart is empty!'); 
            return;
        }
        closeAllOverlays();
        
        if (cartSubtotalEl && checkoutTotalEl) {
            checkoutTotalEl.textContent = cartSubtotalEl.textContent;
        }
        
        if (checkoutOverlay) checkoutOverlay.classList.add('active');
    }

    function closeCheckout() {
        if (checkoutOverlay) checkoutOverlay.classList.remove('active');
    }

    function showSuccessMessage() {
        if (successPopup) {
            successPopup.classList.add('active');
            setTimeout(() => {
                successPopup.classList.remove('active');
            }, 3000);
        }
    }

    if (checkoutBtn) checkoutBtn.addEventListener('click', openCheckout);
    if (checkoutCloseBtn) checkoutCloseBtn.addEventListener('click', closeCheckout);
    if (checkoutOverlay) checkoutOverlay.addEventListener('click', (e) => {
        if (e.target === checkoutOverlay) closeCheckout();
    });

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showSuccessMessage();
            closeCheckout();
            cart = []; // Clear cart
            renderCart();
            updateCartNotification();
            checkoutForm.reset();
        });
    }

    
    // ==========================================
    // 7. GLOBAL LISTENERS & INITIALIZATION
    // ==========================================
    
    /**
     * Helper to close all overlays.
     */
    function closeAllOverlays() {
        closeModal();
        closeCart();
        closeMobileMenu();
        closeCheckout();
        if (searchPanel && searchPanel.classList.contains('active')) {
            // This is toggleSearch, which also handles blur
            const isActive = searchPanel.classList.contains('active');
            if (isActive) {
                searchPanel.classList.remove('active');
                if(pageContent) pageContent.classList.remove('blur-active');
            }
        }
    }

    /**
     * NEW: Attaches listeners to dynamically loaded product cards
     */
    function attachProductCardListeners() {
        // Find all cards (in featured and all items)
        const allProductCards = document.querySelectorAll('.product-card');
        allProductCards.forEach(card => {
            // Click card to open modal (but not if 'add to cart' clicked)
            card.addEventListener('click', function(e) {
                if (!e.target.closest('.add-to-cart-btn')) {
                    openModal.call(this); // 'this' is the card
                }
            });
        });

        // Find all "Add to Cart" buttons
        const allAddToCartButtons = document.querySelectorAll('.add-to-cart-btn');
        allAddToCartButtons.forEach(button => {
            // Remove old listener to prevent duplicates
            button.replaceWith(button.cloneNode(true));
        });
        // Re-query and add new listeners
        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); 
                const card = e.target.closest('.product-card');
                const item = {
                    id: card.dataset.id,
                    title: card.dataset.title,
                    price: card.dataset.price,
                    image: card.dataset.smallImageUrl, // Use small image
                    quantity: 1
                };
                addToCart(item);
            });
        });
    }

    /**
     * NEW: A single function to attach all NON-PRODUCT listeners
     */
    function attachAllEventListeners() {
        // This is now called *after* products load
        attachProductCardListeners(); 
    }

    // --- Global Key/Click Listeners ---
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeAllOverlays();
        }
    });

    document.addEventListener('click', (event) => {
        if (!searchPanel || !searchIcon) return;
        if (!searchPanel.classList.contains('active')) return;

        const isClickOnIcon = searchIcon.contains(event.target);
        const isClickInPanel = searchPanel.contains(event.target);

        if (!isClickOnIcon && !isClickInPanel) {
            toggleSearch();
        }
    });
    
    // ==========================================
    // 8. INITIAL PAGE LOAD
    // ==========================================
    
    renderCart(); // Render empty cart
    updateCartNotification(); // Update badge (to 0)
    
    // Load products if Supabase is connected
    if (supabase) {
        loadProducts(); // Fetch products and *then* attach listeners
    }
    
});