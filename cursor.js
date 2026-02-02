const cursorConfig = {
    '#exhibit-submit': {
        image: 'assets/cursor/submit-cursor.svg',
        hotspot: [10, 10] // Optional: cursor hotspot coordinates [x, y]
    }
    // Add more elements here as needed
    // Example:
    // '.another-button': {
    //     image: 'assets/cursor/another-cursor.svg'
    // }
};

class CustomCursorManager {
    constructor(config) {
        this.config = config;
        this.activeCursor = null;
        this.elements = new Map();
        
        this.init();
    }

    /**
     * Initialize the cursor manager
     * Sets up event listeners for all configured elements
     */
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupCursors());
        } else {
            this.setupCursors();
        }
    }

    /**
     * Setup cursors for all configured elements
     */
    setupCursors() {
        Object.entries(this.config).forEach(([selector, options]) => {
            const elements = document.querySelectorAll(selector);
            
            if (elements.length === 0) {
                console.warn(`CustomCursorManager: No elements found for selector "${selector}"`);
                return;
            }

            elements.forEach(element => {
                this.attachCursor(element, options);
            });
        });
    }

    /**
     * Attach custom cursor to a single element
     * @param {HTMLElement} element - The element to attach cursor to
     * @param {Object} options - Cursor configuration options
     */
    attachCursor(element, options) {
        const { image, hotspot = [0, 0] } = options;
        
        // Build cursor CSS value
        const cursorValue = this.buildCursorValue(image, hotspot);
        
        // Store original cursor style
        const originalCursor = element.style.cursor || 'default';
        
        // Create event handlers
        const handleMouseEnter = () => {
            element.style.cursor = cursorValue;
            this.activeCursor = element;
        };
        
        const handleMouseLeave = () => {
            element.style.cursor = originalCursor;
            if (this.activeCursor === element) {
                this.activeCursor = null;
            }
        };

        // Attach event listeners
        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);

        // Store cleanup function
        this.elements.set(element, {
            handleMouseEnter,
            handleMouseLeave,
            originalCursor
        });
    }

    /**
     * Build CSS cursor value from image path and hotspot
     * @param {string} imagePath - Path to cursor image
     * @param {number[]} hotspot - [x, y] coordinates for hotspot
     * @returns {string} CSS cursor value
     */
    buildCursorValue(imagePath, hotspot) {
        const [x, y] = hotspot;
        return `url('${imagePath}') ${x} ${y}, auto`;
    }

    /**
     * Add a new element to the cursor configuration
     * Useful for dynamically added elements
     * @param {string} selector - CSS selector
     * @param {Object} options - Cursor configuration options
     */
    addCursor(selector, options) {
        this.config[selector] = options;
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            // Check if already attached
            if (!this.elements.has(element)) {
                this.attachCursor(element, options);
            }
        });
    }

    /**
     * Remove cursor from an element
     * @param {string} selector - CSS selector
     */
    removeCursor(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            const handlers = this.elements.get(element);
            if (handlers) {
                element.removeEventListener('mouseenter', handlers.handleMouseEnter);
                element.removeEventListener('mouseleave', handlers.handleMouseLeave);
                element.style.cursor = handlers.originalCursor;
                this.elements.delete(element);
            }
        });
        delete this.config[selector];
    }

    /**
     * Cleanup all cursors and event listeners
     */
    destroy() {
        this.elements.forEach((handlers, element) => {
            element.removeEventListener('mouseenter', handlers.handleMouseEnter);
            element.removeEventListener('mouseleave', handlers.handleMouseLeave);
            element.style.cursor = handlers.originalCursor;
        });
        this.elements.clear();
        this.config = {};
    }
}

// Create and export the cursor manager instance
const customCursorManager = new CustomCursorManager(cursorConfig);

// Export for use in other modules
export default customCursorManager;
export { cursorConfig };
