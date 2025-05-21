class Navigation {
    constructor() {
        this.dots = document.querySelectorAll('.nav-dot');
        this.scrollHint = document.querySelector('.scroll-hint');
        this.currentIndex = 0;
        this.isScrollingEnabled = true;
        this.lastScrollTime = 0;
        
        this.init();
    }
    
    init() {
        // Add click handlers to dots
        this.dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const index = parseInt(dot.getAttribute('data-index'));
                this.navigateTo(index);
            });
        });
        
        this.showScrollHint();
        
        // Set initial active dot
        this.updateActiveDot(0);
    }
    
    updateActiveDot(index) {
        // Update current index
        this.currentIndex = index;
        
        // Remove active class from all dots
        this.dots.forEach(dot => {
            dot.classList.remove('active');
        });
        
        // Add active class to current dot
        const activeDot = document.querySelector(`.nav-dot[data-index="${index}"]`);
        if (activeDot) {
            activeDot.classList.add('active');
        }
    }
    
    navigateTo(index) {
        // Prevent rapid navigation
        if (Date.now() - this.lastScrollTime < 800) {
            return;
        }
        
        this.lastScrollTime = Date.now();
        
        // Update the active dot
        this.updateActiveDot(index);
        
        // Call the main.js moveToControlCenter function
        if (typeof window.moveToControlCenter === 'function') {
            window.moveToControlCenter(index);
        }
        
        // Hide scroll hint after first navigation
        this.hideScrollHint();
    }
    
    showScrollHint() {
        this.scrollHint.classList.add('visible');
        
        // Animate it out after a few seconds
        setTimeout(() => {
            //this.hideScrollHint();
        }, 4000);
    }
    
    hideScrollHint() {
        this.scrollHint.classList.remove('visible');
    }
    
    // Call this from main.js when scrolling happens
    handleScroll(direction) {
        if (!this.isScrollingEnabled) return;
        
        // Calculate new index
        const newIndex = Math.max(0, Math.min(2, this.currentIndex + direction));
        
        // Only update if changed
        if (newIndex !== this.currentIndex) {
            this.navigateTo(newIndex);
        }
    }
}

// Create and export the navigation instance
const navigation = new Navigation();
export { navigation };