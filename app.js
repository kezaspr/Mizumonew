/* Cyber-Core Marketplace App
    Contains logic for:
    1. Product Detail Modal
    2. Slide-Down Search
    2.5. Mobile Hamburger Menu (NEW)
    3. Shopping Cart Sidebar
    4. Global Listeners
*/

document.addEventListener('DOMContentLoaded', () => {

    console.log("Cyber-Core App Initialized");

    // ==========================================
    // 0. GLOBAL CART STATE
    // ==========================================
    let cart = [];


    // ==========================================
    // 1. PRODUCT DETAIL MODAL LOGIC
    // ==========================================
    
    const modalOverlay = document.getElementById('product-modal-overlay');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const productCards = document.querySelectorAll('.product-card');

    const modalImage = document.getElementById('modal-image');
    const modalTitle = document.getElementById('modal-title');
    const modalCategory = document.getElementById('modal-category');
    const modalPrice = document.getElementById('modal-price');
    const modalDescription = document.getElementById('modal-description');
    const modalQuantityInput = document.getElementById('modal-quantity');
    const modalAddToCartBtn = document.querySelector('.modal-add-to-cart');

    function openModal() {
        try {
            const card = this;
            // Populate modal
            if(modalImage) modalImage.src = card.dataset.imageUrl.replace('100x100', '600x600').replace('text=Katana', 'text=Neon+Katana').replace('text=Pet', 'text=Cyber+Pet').replace('text=VIP', 'text=VIP+Pass'); // Get large image
            if(modalTitle) modalTitle.textContent = card.dataset.title;
            if(modalCategory) modalCategory.textContent = card.dataset.category;
            if(modalPrice) modalPrice.textContent = card.dataset.price;
            if(modalDescription) modalDescription.textContent = card.dataset.description;
            if(modalQuantityInput) modalQuantityInput.value = 1; // Reset quantity

            // Store card data on the modal button for when "Add to Cart" is clicked
            if(modalAddToCartBtn) {
                modalAddToCartBtn.dataset.id = card.dataset.id;
                modalAddToCartBtn.dataset.title = card.dataset.title;
                modalAddToCartBtn.dataset.price = card.dataset.price;
                modalAddToCartBtn.dataset.image = card.dataset.imageUrl;
            }

            if(modalOverlay) modalOverlay.classList.add('active');
        } catch (error) {
            console.error("Error opening modal:", error);
        }
    }

    function closeModal() {
        if(modalOverlay) modalOverlay.classList.remove('active');
    }

    // --- Event Listeners for Modal ---
    productCards.forEach(card => {
        card.addEventListener('click', function(e) {
            if (!e.target.closest('.add-to-cart-btn')) {
                openModal.call(this); // 'this' is the card
            }
        });
    });

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
                image: itemData.image,
                quantity: quantity
            };
            
            addToCart(item);
            closeModal();
        });
    }


    // ==========================================
    // 2. SLIDE-DOWN SEARCH LOGIC
    // ==========================================

    const searchIcon = document.getElementById('nav-search-icon'); // This ID is now on the icon in .nav-icons
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
            closeModal();
            closeCart();
            closeMobileMenu(); // NEW
            searchPanel.classList.add('active');
            if(pageContent) pageContent.classList.add('blur-active');
            setTimeout(() => { if(searchInput) searchInput.focus(); }, 100);
        }
    }

    if(searchIcon) searchIcon.addEventListener('click', (e) => {
        e.preventDefault(); 
        toggleSearch();
    });


    // ==========================================
    // 2.5. MOBILE HAMBURGER MENU LOGIC (NEW)
    // ==========================================
    
    const hamburgerIcon = document.getElementById('hamburger-icon');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuClose = document.getElementById('mobile-menu-close');
    const mobileMenuLinks = document.querySelectorAll('.mobile-links a');

    function openMobileMenu() {
        closeModal();
        closeCart();
        if (searchPanel && searchPanel.classList.contains('active')) {
            toggleSearch(); // Close search if open
        }
        if (mobileMenu) mobileMenu.classList.add('active');
    }

    function closeMobileMenu() {
        if (mobileMenu) mobileMenu.classList.remove('active');
    }

    if (hamburgerIcon) hamburgerIcon.addEventListener('click', openMobileMenu);
    if (mobileMenuClose) mobileMenuClose.addEventListener('click', closeMobileMenu);
    
    // Close menu when a link is clicked
    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });


    // ==========================================
    // 3. SHOPPING CART LOGIC
    // ==========================================

    const cartIconWrapper = document.getElementById('cart-icon-wrapper');
    const cartOverlay = document.getElementById('cart-overlay-container');
    const cartCloseBtn = document.getElementById('cart-close-btn');
    const cartBody = document.getElementById('cart-body');
    const cartEmpty = document.getElementById('cart-empty');
    const cartSubtotalEl = document.getElementById('cart-subtotal-price');
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    const cartNotificationBadge = document.getElementById('cart-notification-badge');

    // --- Helper Functions ---
    function parsePrice(priceStr) {
        if (!priceStr) return 0;
        return parseInt(priceStr.replace('R$', '').replace(',', '').trim());
    }

    function formatPrice(priceNum) {
        return `R$ ${priceNum.toLocaleString()}`;
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
        closeModal();
        closeMobileMenu(); // NEW
        if (searchPanel && searchPanel.classList.contains('active')) {
            toggleSearch();
        }
        if(cartOverlay) cartOverlay.classList.add('active');
    }

    function closeCart() {
        if(cartOverlay) cartOverlay.classList.remove('active');
    }

    function addToCart(item) {
        const existingItem = cart.find(cartItem => cartItem.id === item.id);
        
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
        cart = cart.filter(item => item.id !== itemId);
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

    // IMPORTANT: Re-run the query to find the new buttons!
    const allAddToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    allAddToCartButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); 
            const card = e.target.closest('.product-card');
            const item = {
                id: card.dataset.id,
                title: card.dataset.title,
                price: card.dataset.price,
                image: card.dataset.imageUrl,
                quantity: 1
            };
            addToCart(item);
        });
    });

    if(cartBody) {
        cartBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('cart-item-remove')) {
                const itemId = e.target.dataset.id;
                removeFromCart(itemId);
            }
        });
    }
    
    // Initial render
    renderCart();
    updateCartNotification();


    // ==========================================
    // 4. GLOBAL "CLICKAWAY" & "ESCAPE" LISTENERS
    // ==========================================
    
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (mobileMenu && mobileMenu.classList.contains('active')) { // NEW
                closeMobileMenu();
            }
            else if (cartOverlay && cartOverlay.classList.contains('active')) {
                closeCart();
            }
            else if (modalOverlay && modalOverlay.classList.contains('active')) {
                closeModal();
            }
            else if (searchPanel && searchPanel.classList.contains('active')) {
                toggleSearch();
            }
        }
    });

    document.addEventListener('click', (event) => {
        if (!searchPanel || !searchIcon) return;
        if (!searchPanel.classList.contains('active')) return;

        // This selector is now just the icon, not the whole .nav-links
        const isClickOnIcon = searchIcon.contains(event.target);
        const isClickInPanel = searchPanel.contains(event.target);

        if (!isClickOnIcon && !isClickInPanel) {
            toggleSearch();
        }
    });

});