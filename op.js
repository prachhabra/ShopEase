class ShopEase {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        this.wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        this.orders = JSON.parse(localStorage.getItem('orders')) || [];
        this.stripe = Stripe('your_publishable_key'); // Replace with your Stripe publishable key
        this.elements = null;

        this.initializeEventListeners();
        this.updateCartCount();
        this.renderProducts();
    }

    initializeEventListeners() {
        // Navigation
        document.querySelectorAll('nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToSection(e.target.closest('a').getAttribute('href').substring(1));
            });
        });

        // Search functionality
        document.getElementById('search-bar').addEventListener('input', (e) => {
            this.searchProducts(e.target.value);
        });

        // Category filtering with active state
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filterByCategory(e.target.dataset.category);
            });
        });

        // Sorting
        document.getElementById('sort-select').addEventListener('change', (e) => {
            this.sortProducts(e.target.value);
        });

        // Add to cart event listener
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-cart')) {
                const card = e.target.closest('.product-card');
                const price = card.querySelector('p').textContent.replace(/[^0-9.]/g, '');
                this.addToCart({
                    id: Date.now(),
                    name: card.querySelector('h3').textContent,
                    price: parseFloat(price),
                    image: card.querySelector('img').src
                });
            }
        });

        // Wishlist event listener
        document.addEventListener('click', (e) => {
            if (e.target.closest('.wishlist-btn')) {
                const card = e.target.closest('.product-card');
                const price = card.querySelector('p').textContent.replace(/[^0-9.]/g, '');
                this.toggleWishlist({
                    id: Date.now(),
                    name: card.querySelector('h3').textContent,
                    price: parseFloat(price),
                    image: card.querySelector('img').src
                });
            }
        });

        // Checkout button
        document.getElementById('proceed-to-checkout').addEventListener('click', () => {
            this.initializeCheckout();
        });

        // Payment form
        document.getElementById('payment-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePayment(e);
        });
    }

    navigateToSection(sectionId) {
        document.querySelectorAll('section').forEach(section => {
            section.classList.add('hidden');
        });
        document.getElementById(sectionId).classList.remove('hidden');
    }

    searchProducts(query) {
        const products = document.querySelectorAll('.product-card');
        products.forEach(product => {
            const name = product.querySelector('h3').textContent.toLowerCase();
            if (name.includes(query.toLowerCase())) {
                product.style.display = 'block';
            } else {
                product.style.display = 'none';
            }
        });
    }

    filterByCategory(category) {
        const products = document.querySelectorAll('.product-card');
        products.forEach(product => {
            if (category === 'all') {
                product.style.display = 'block';
            } else {
                // Make category comparison case-insensitive
                if (product.dataset.category.toLowerCase() === category.toLowerCase()) {
                    product.style.display = 'block';
                } else {
                    product.style.display = 'none';
                }
            }
        });
    }

    sortProducts(criteria) {
        const productGrid = document.querySelector('.product-grid');
        const products = Array.from(document.querySelectorAll('.product-card'));

        products.sort((a, b) => {
            const priceA = parseFloat(a.querySelector('.price').textContent.replace('Rs ', ''));
            const priceB = parseFloat(b.querySelector('.price').textContent.replace('Rs ', ''));
            
            switch(criteria) {
                case 'price-low':
                    return priceA - priceB;
                case 'price-high':
                    return priceB - priceA;
                case 'name':
                    return a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent);
                default:
                    return 0;
            }
        });

        productGrid.innerHTML = '';
        products.forEach(product => productGrid.appendChild(product));
    }

    addToCart(product) {
        this.cart.push(product);
        localStorage.setItem('cart', JSON.stringify(this.cart));
        this.updateCartCount();
        this.renderCart();
        this.showNotification('Item added to cart!', 'success');
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        localStorage.setItem('cart', JSON.stringify(this.cart));
        this.updateCartCount();
        this.renderCart();
        this.showNotification('Item removed from cart!', 'info');
    }

    toggleWishlist(product) {
        const index = this.wishlist.findIndex(item => item.id === product.id);
        if (index === -1) {
            this.wishlist.push(product);
            this.showNotification('Item added to wishlist!', 'success');
        } else {
            this.wishlist.splice(index, 1);
            this.showNotification('Item removed from wishlist!', 'info');
        }
        localStorage.setItem('wishlist', JSON.stringify(this.wishlist));
        this.renderWishlist();
    }

    updateCartCount() {
        document.querySelector('.cart-count').textContent = this.cart.length;
    }

    renderCart() {
        const cartItems = document.getElementById('cart-items');
        cartItems.innerHTML = '';
        let total = 0;

        this.cart.forEach(item => {
            total += item.price;
            cartItems.innerHTML += `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.name}">
                    <div class="item-details">
                        <h4>${item.name}</h4>
                        <p>Rs ${item.price}</p>
                    </div>
                    <button onclick="shopEase.removeFromCart(${item.id})">Remove</button>
                </div>
            `;
        });

        document.getElementById('total-price').textContent = total.toFixed(2);
    }

    renderWishlist() {
        const wishlistContainer = document.getElementById('wishlist-items');
        if (!wishlistContainer) return;

        wishlistContainer.innerHTML = '';
        
        if (this.wishlist.length === 0) {
            wishlistContainer.innerHTML = `
                <div class="empty-wishlist">
                    <i class="fas fa-heart-broken"></i>
                    <p>Your wishlist is empty</p>
                </div>`;
            return;
        }

        this.wishlist.forEach(item => {
            wishlistContainer.innerHTML += `
                <div class="product-card">
                    <button class="wishlist-btn active" onclick="shopEase.toggleWishlist(${JSON.stringify(item)})">
                        <i class="fas fa-heart"></i>
                    </button>
                    <img src="${item.image}" alt="${item.name}">
                    <h3>${item.name}</h3>
                    <p class="price">Rs ${item.price}</p>
                    <button class="add-to-cart" onclick="shopEase.addToCart(${JSON.stringify(item)})">Add to Cart</button>
                </div>
            `;
        });
    }

    async initializeCheckout() {
        if (this.cart.length === 0) {
            this.showNotification('Your cart is empty!', 'error');
            return;
        }

        this.navigateToSection('checkout');
        
        // Initialize Stripe Elements
        this.elements = this.stripe.elements();
        const paymentElement = this.elements.create('payment');
        paymentElement.mount('#payment-element');
    }

    async handlePayment(e) {
        e.preventDefault();
        const form = document.getElementById('payment-form');
        const submitButton = document.getElementById('submit-payment');
        
        submitButton.disabled = true;
        submitButton.querySelector('#spinner').classList.remove('hidden');
        submitButton.querySelector('#button-text').classList.add('hidden');

        const { error } = await this.stripe.confirmPayment({
            elements: this.elements,
            confirmParams: {
                return_url: `${window.location.origin}/order-confirmation`,
            },
        });

        if (error) {
            submitButton.disabled = false;
            submitButton.querySelector('#spinner').classList.add('hidden');
            submitButton.querySelector('#button-text').classList.remove('hidden');
            this.showNotification(error.message, 'error');
        } else {
            // Payment successful
            const order = {
                id: Date.now(),
                items: this.cart,
                total: this.cart.reduce((sum, item) => sum + item.price, 0),
                date: new Date().toISOString(),
                shipping: {
                    name: document.getElementById('name').value,
                    email: document.getElementById('email').value,
                    address: document.getElementById('address').value,
                    phone: document.getElementById('phone').value
                }
            };

            this.orders.push(order);
            localStorage.setItem('orders', JSON.stringify(this.orders));
            this.cart = [];
            localStorage.setItem('cart', JSON.stringify(this.cart));
            this.updateCartCount();
            this.showNotification('Order placed successfully!', 'success');
            this.navigateToSection('orders');
        }
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize the application
const shopEase = new ShopEase();
// Global state management
let cart = [];
let wishlist = [];
let orders = [];

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Stripe
    const stripe = Stripe('your_publishable_key'); // Replace with your Stripe publishable key
    const elements = stripe.elements();
    const card = elements.create('card');
    card.mount('#card-element');

    // Event Listeners
    setupEventListeners();
    setupSortingAndFiltering();
});

function setupEventListeners() {
    // Wishlist functionality
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const productCard = e.target.closest('.product-card');
            toggleWishlistItem(productCard);
        });
    });

    // Cart functionality
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productCard = e.target.closest('.product-card');
            addToCart(productCard);
        });
    });

    // Navigation
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.getAttribute('href').substring(1);
            showSection(section);
        });
    });

    // Proceed to checkout button
    const checkoutBtn = document.getElementById('proceed-to-checkout');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length > 0) {
                showSection('checkout');
                updateCheckoutDisplay();
            } else {
                showNotification('Your cart is empty');
            }
        });
    }
}

// Cart Functions
function addToCart(productCard) {
    const productId = productCard.dataset.productId || Math.random().toString(36).substr(2, 9);
    productCard.dataset.productId = productId;

    const productInfo = {
        id: productId,
        name: productCard.querySelector('h3').textContent,
        price: parseFloat(productCard.querySelector('p').textContent.replace(/[^0-9.-]+/g, '')),
        image: productCard.querySelector('img').src,
        quantity: 1
    };

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity++;
        showNotification('Item quantity updated in cart');
    } else {
        cart.push(productInfo);
        showNotification('Item added to cart');
    }

    updateCartDisplay();
    updateCartCount();
}

function removeFromCart(productId) {
    const index = cart.findIndex(item => item.id === productId);
    if (index !== -1) {
        cart.splice(index, 1);
        updateCartDisplay();
        updateCartCount();
        showNotification('Item removed from cart');
    }
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    if (!cartItems) return;

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Your cart is empty</p>
                <a href="#products" class="continue-shopping">Continue Shopping</a>
            </div>
        `;
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item" data-product-id="${item.id}">
                <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="cart-item-details">
                    <h3>${item.name}</h3>
                    <p class="price">RS ${item.price}</p>
                    <div class="quantity-controls">
                        <button onclick="updateQuantity('${item.id}', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateQuantity('${item.id}', 1)">+</button>
                    </div>
                </div>
                <div class="cart-item-total">
                    <p>Total: RS ${(item.price * item.quantity).toFixed(2)}</p>
                    <button class="remove-btn" onclick="removeFromCart('${item.id}')">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateCartTotal();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        const newQuantity = item.quantity + change;
        if (newQuantity > 0) {
            item.quantity = newQuantity;
            updateCartDisplay();
            updateCartCount();
            showNotification('Cart updated');
        } else if (newQuantity === 0) {
            removeFromCart(productId);
        }
    }
}

function updateCartTotal() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalElement = document.getElementById('total-price');
    if (totalElement) {
        totalElement.textContent = total.toFixed(2);
    }
}

function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        cartCount.textContent = cart.reduce((total, item) => total + item.quantity, 0);
    }
}

// Wishlist Functions
function toggleWishlistItem(productCard) {
    const productId = productCard.dataset.productId || Math.random().toString(36).substr(2, 9);
    productCard.dataset.productId = productId;

    const productInfo = {
        id: productId,
        name: productCard.querySelector('h3').textContent,
        price: productCard.querySelector('p').textContent,
        image: productCard.querySelector('img').src
    };

    const index = wishlist.findIndex(item => item.id === productId);
    const wishlistBtn = productCard.querySelector('.wishlist-btn i');

    if (index === -1) {
        wishlist.push(productInfo);
        wishlistBtn.classList.remove('far');
        wishlistBtn.classList.add('fas');
        showNotification('Item added to wishlist');
    } else {
        removeFromWishlist(productId);
    }

    updateWishlistDisplay();
}

function removeFromWishlist(productId) {
    const index = wishlist.findIndex(item => item.id === productId);
    if (index !== -1) {
        wishlist.splice(index, 1);
        
        // Update heart icon in product grid
        const productCard = document.querySelector(`.product-card[data-product-id="${productId}"]`);
        if (productCard) {
            const wishlistBtn = productCard.querySelector('.wishlist-btn i');
            wishlistBtn.classList.remove('fas');
            wishlistBtn.classList.add('far');
        }
        
        updateWishlistDisplay();
        showNotification('Item removed from wishlist');
    }
}

function updateWishlistDisplay() {
    const wishlistContainer = document.getElementById('wishlist-items');
    if (!wishlistContainer) return;

    if (wishlist.length === 0) {
        wishlistContainer.innerHTML = `
            <div class="empty-wishlist">
                <i class="far fa-heart"></i>
                <p>Your wishlist is empty</p>
                <a href="#products" class="browse-products-btn">Browse Products</a>
            </div>
        `;
    } else {
        wishlistContainer.innerHTML = wishlist.map(item => `
            <div class="wishlist-item" data-product-id="${item.id}">
                <div class="wishlist-item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="wishlist-item-details">
                    <h3>${item.name}</h3>
                    <p class="price">${item.price}</p>
                    <div class="wishlist-item-actions">
                        <button class="add-to-cart-btn" onclick="moveToCart('${item.id}')">
                            <i class="fas fa-shopping-cart"></i> Add to Cart
                        </button>
                        <button class="remove-wishlist-btn" onclick="removeFromWishlist('${item.id}')">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function moveToCart(productId) {
    const item = wishlist.find(item => item.id === productId);
    if (item) {
        const productCard = document.querySelector(`.product-card[data-product-id="${productId}"]`);
        if (productCard) {
            addToCart(productCard);
            removeFromWishlist(productId);
            showNotification('Item moved to cart');
        }
    }
}

// Notification Function
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Navigation Function
function showSection(sectionId) {
    document.querySelectorAll('main > section').forEach(section => {
        section.classList.add('hidden');
    });
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
}
// Update the handlePaymentSubmission function
async function handlePaymentSubmission(e) {
    e.preventDefault();
    
    const submitButton = document.getElementById('submit-payment');
    const spinner = document.getElementById('spinner');
    const buttonText = document.getElementById('button-text');
    
    try {
        // Disable the button and show spinner
        submitButton.disabled = true;
        spinner.classList.remove('hidden');
        buttonText.classList.add('hidden');

        // Get form data
        const form = document.getElementById('payment-form');
        const orderDetails = {
            name: form.querySelector('#name').value,
            email: form.querySelector('#email').value,
            address: form.querySelector('#address').value,
            phone: form.querySelector('#phone').value,
            items: cart,
            total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        };

        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Add to orders
        addToOrders(orderDetails);

        // Clear cart
        cart = [];
        updateCartDisplay();
        updateCartCount();

        // Show success message
        showNotification('Payment successful! Your order has been placed.');
        
        // Redirect to orders page
        showSection('orders');

    } catch (error) {
        showNotification('Payment failed: ' + error.message);
    } finally {
        // Re-enable the button and hide spinner
        submitButton.disabled = false;
        spinner.classList.remove('hidden');
        buttonText.classList.remove('hidden');
    }
}

// Update the cart functions
function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    if (!cartItems) return;

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Your cart is empty</p>
                <a href="#products" class="continue-shopping">Continue Shopping</a>
            </div>
        `;
        updateCartTotal();
        return;
    }

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item" data-product-id="${item.id}">
            <div class="cart-item-image">
                <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="cart-item-details">
                <h3>${item.name}</h3>
                <p class="price">RS ${item.price}</p>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
            </div>
            <div class="cart-item-total">
                <p>Total: RS ${(item.price * item.quantity).toFixed(2)}</p>
                <button class="remove-btn" onclick="removeFromCart('${item.id}')">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        </div>
    `).join('');

    updateCartTotal();
}

function removeFromCart(productId) {
    console.log('Removing product:', productId); // Debug log
    const index = cart.findIndex(item => item.id === productId);
    if (index !== -1) {
        cart.splice(index, 1);
        updateCartDisplay();
        updateCartCount();
        showNotification('Item removed from cart');
    }
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        const newQuantity = item.quantity + change;
        if (newQuantity > 0) {
            item.quantity = newQuantity;
            updateCartDisplay();
            updateCartCount();
        } else if (newQuantity === 0) {
            removeFromCart(productId);
        }
    }
}

// Add this function to initialize event listeners
function initializeCartEventListeners() {
    // Add event listener for remove buttons
    document.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const productId = e.target.closest('.cart-item').dataset.productId;
            removeFromCart(productId);
        });
    });

    // Add event listener for quantity buttons
    document.querySelectorAll('.quantity-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const productId = e.target.closest('.cart-item').dataset.productId;
            const change = e.target.textContent === '+' ? 1 : -1;
            updateQuantity(productId, change);
        });
    });
}

// Update the setupEventListeners function
function setupEventListeners() {
    // ... existing event listeners ...

    // Add payment form submission listener
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        paymentForm.addEventListener('submit', handlePaymentSubmission);
    }

    // Initialize cart event listeners
    initializeCartEventListeners();

    // Add checkout button listener
    const checkoutBtn = document.getElementById('proceed-to-checkout');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length > 0) {
                showSection('checkout');
                updateCheckoutDisplay();
            } else {
                showNotification('Your cart is empty');
            }
        });
    }
}

// Add this function to update the checkout display
function updateCheckoutDisplay() {
    const checkoutItems = document.getElementById('checkout-items');
    const checkoutTotal = document.getElementById('checkout-total');
    
    if (checkoutItems && checkoutTotal) {
        checkoutItems.innerHTML = cart.map(item => `
            <div class="checkout-item">
                <span>${item.name} x ${item.quantity}</span>
                <span>RS ${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        `).join('');
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        checkoutTotal.textContent = `RS ${total.toFixed(2)}`;
    }
}
// API Configuration
const API_URL = 'http://localhost:5000/api';
let token = localStorage.getItem('token');

// Authentication Functions
async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (data.token) {
            token = data.token;
            localStorage.setItem('token', token);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Login error:', error);
        return false;
    }
}

// Product Functions
async function fetchProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

// Cart Functions
async function addToCart(productId) {
    try {
        const response = await fetch(`${API_URL}/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId })
        });
        return await response.json();
    } catch (error) {
        console.error('Error adding to cart:', error);
        throw error;
    }
}

async function removeFromCart(productId) {
    try {
        await fetch(`${API_URL}/cart/remove/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        updateCartDisplay();
    } catch (error) {
        console.error('Error removing from cart:', error);
    }
}

// Wishlist Functions
async function toggleWishlist(productId) {
    try {
        const response = await fetch(`${API_URL}/wishlist/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId })
        });
        return await response.json();
    } catch (error) {
        console.error('Error toggling wishlist:', error);
        throw error;
    }
}

// Order Functions
async function createOrder(orderData) {
    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });
        return await response.json();
    } catch (error) {
        console.error('Error creating order:', error);
        throw error;
    }
}

// Payment Processing
async function processPayment(paymentData) {
    try {
        const response = await fetch(`${API_URL}/orders/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(paymentData)
        });
        return await response.json();
    } catch (error) {
        console.error('Error processing payment:', error);
        throw error;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    if (token) {
        try {
            // Verify token and load user data
            const response = await fetch(`${API_URL}/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                localStorage.removeItem('token');
                token = null;
            }
        } catch (error) {
            console.error('Auth verification error:', error);
            localStorage.removeItem('token');
            token = null;
        }
    }

    // Load products
    const products = await fetchProducts();
    updateProductDisplay(products);

    // Setup event listeners
    setupEventListeners();
});