/**
 * TikTok Live Connection Manager
 * Handles connection to TikTok Live via Socket.IO
 * Features:
 * - Auto-reconnect for long streams
 * - Connection health monitoring
 * - Gift tracking and deduplication
 * - Earnings calculation
 */

class TikTokConnectionManager {
    constructor(socket) {
        this.socket = socket;
        this.isConnected = false;
        this.username = '';
        this.roomId = '';
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectInterval = 5000; // 5 seconds
        this.lastHeartbeatTime = 0;
        this.heartbeatInterval = null;
        this.totalDiamonds = 0;
        this.giftRegistry = new Map();
        this.connectionListeners = [];
        this.autoReconnect = true;
        
        // Bind methods
        this.connect = this.connect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.startHeartbeat = this.startHeartbeat.bind(this);
        this.stopHeartbeat = this.stopHeartbeat.bind(this);
        this.scheduleReconnect = this.scheduleReconnect.bind(this);
        this.processGift = this.processGift.bind(this);
        this.calculateEarnings = this.calculateEarnings.bind(this);
        this.addConnectionListener = this.addConnectionListener.bind(this);
        this.notifyListeners = this.notifyListeners.bind(this);
    }
    
    /**
     * Connect to TikTok Live room
     * @param {string} username - TikTok username
     * @param {Object} options - Connection options
     * @returns {Promise} - Resolves when connected
     */
    connect(username, options = {}) {
        return new Promise((resolve, reject) => {
            if (!username) {
                reject(new Error('Username is required'));
                return;
            }
            
            // Clean username (remove @ if present)
            this.username = username.startsWith('@') ? username.substring(1) : username;
            
            // Default options
            const defaultOptions = {
                enableExtendedGiftInfo: true,
                enableWebsocketUpgrade: true,
                requestPollingIntervalMs: 2000
            };
            
            // Merge options
            const mergedOptions = { ...defaultOptions, ...options };
            
            // Update connection status
            this.notifyListeners('connecting', { username: this.username });
            
            // Connect to room
            this.socket.emit('connect-to-room', this.username, mergedOptions);
            
            // Set up one-time event listeners for this connection attempt
            const onSuccess = (data) => {
                this.socket.off('connection-success', onSuccess);
                this.socket.off('connection-error', onError);
                
                this.isConnected = true;
                this.roomId = data.roomId;
                this.reconnectAttempts = 0;
                
                // Start heartbeat
                this.startHeartbeat();
                
                // Notify listeners
                this.notifyListeners('connected', {
                    username: this.username,
                    roomId: this.roomId,
                    streamerInfo: data.streamerInfo
                });
                
                resolve(data);
            };
            
            const onError = (data) => {
                this.socket.off('connection-success', onSuccess);
                this.socket.off('connection-error', onError);
                
                this.isConnected = false;
                
                // Notify listeners
                this.notifyListeners('error', {
                    message: data.message
                });
                
                reject(new Error(data.message));
            };
            
            this.socket.once('connection-success', onSuccess);
            this.socket.once('connection-error', onError);
        });
    }
    
    /**
     * Disconnect from TikTok Live room
     */
    disconnect() {
        if (this.isConnected) {
            this.socket.emit('disconnect-from-room');
            this.isConnected = false;
            this.stopHeartbeat();
            
            // Notify listeners
            this.notifyListeners('disconnected', {
                username: this.username,
                roomId: this.roomId
            });
        }
    }
    
    /**
     * Start heartbeat to detect connection issues
     */
    startHeartbeat() {
        this.stopHeartbeat(); // Clear any existing interval
        
        this.lastHeartbeatTime = Date.now();
        
        this.heartbeatInterval = setInterval(() => {
            const now = Date.now();
            const timeSinceLastHeartbeat = now - this.lastHeartbeatTime;
            
            // If no heartbeat for 30 seconds, consider connection lost
            if (timeSinceLastHeartbeat > 30000 && this.isConnected) {
                console.log('No heartbeat detected for 30 seconds, reconnecting...');
                this.isConnected = false;
                
                // Notify listeners
                this.notifyListeners('timeout', {
                    username: this.username,
                    roomId: this.roomId,
                    timeSinceLastHeartbeat
                });
                
                // Disconnect and reconnect
                this.disconnect();
                
                if (this.autoReconnect) {
                    this.scheduleReconnect();
                }
            }
        }, 10000); // Check every 10 seconds
    }
    
    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    
    /**
     * Schedule reconnect with exponential backoff
     */
    scheduleReconnect() {
        // Clear any existing reconnect timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        
        // If max reconnect attempts reached, stop trying
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            // Notify listeners
            this.notifyListeners('reconnect-failed', {
                username: this.username,
                attempts: this.reconnectAttempts
            });
            return;
        }
        
        // Increment reconnect attempts
        this.reconnectAttempts++;
        
        // Calculate backoff time (exponential backoff with jitter)
        const backoff = Math.min(30000, this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1));
        const jitter = Math.random() * 0.5 + 0.75; // Random between 0.75 and 1.25
        const delay = Math.floor(backoff * jitter);
        
        // Notify listeners
        this.notifyListeners('reconnecting', {
            username: this.username,
            attempt: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts,
            delay
        });
        
        // Schedule reconnect
        this.reconnectTimer = setTimeout(() => {
            // Attempt to reconnect
            this.connect(this.username)
                .catch(err => {
                    console.error(`Reconnect attempt ${this.reconnectAttempts} failed:`, err);
                    // If still not connected, schedule another reconnect
                    if (!this.isConnected && this.autoReconnect) {
                        this.scheduleReconnect();
                    }
                });
        }, delay);
    }
    
    /**
     * Process gift event with deduplication
     * @param {Object} gift - Gift data from TikTok
     * @returns {Object} Processed gift data
     */
    processGift(gift) {
        // Create a unique key for this gift to detect duplicates
        // Use a 5-second window for deduplication
        const giftKey = `${gift.userId}_${gift.giftId}_${Math.floor(Date.now() / 5000)}`;
        
        // Check if this is a repeat/streak gift
        if (gift.repeatEnd === false && this.giftRegistry.has(giftKey)) {
            // Update existing gift with new repeat count
            const existingGift = this.giftRegistry.get(giftKey);
            existingGift.repeatCount = gift.repeatCount;
            
            // Calculate the difference in diamonds since last update
            const previousDiamonds = existingGift.processedDiamondCount || 0;
            const currentDiamonds = gift.diamondCount * gift.repeatCount;
            const diamondDifference = currentDiamonds - previousDiamonds;
            
            // Update the total diamonds only with the difference
            if (diamondDifference > 0) {
                this.totalDiamonds += diamondDifference;
                existingGift.processedDiamondCount = currentDiamonds;
            }
            
            // Mark as processed
            gift.isProcessed = true;
            
            return existingGift;
        } else {
            // New gift or end of streak
            // Add to registry
            this.giftRegistry.set(giftKey, gift);
            
            // Add to total diamonds
            const giftValue = gift.diamondCount * gift.repeatCount;
            this.totalDiamonds += giftValue;
            
            // Mark the processed diamond count
            gift.processedDiamondCount = giftValue;
            
            // Mark as processed
            gift.isProcessed = true;
            
            return gift;
        }
    }
    
    /**
     * Calculate earnings based on diamond count
     * @param {number} rate - USD per million diamonds (default: 5000)
     * @returns {number} Earnings in USD
     */
    calculateEarnings(rate = 5000) {
        return (this.totalDiamonds / 1000000) * rate;
    }
    
    /**
     * Get total diamond count
     * @returns {number} Total diamonds
     */
    getTotalDiamonds() {
        return this.totalDiamonds;
    }
    
    /**
     * Reset diamond counter
     */
    resetDiamonds() {
        this.totalDiamonds = 0;
        this.giftRegistry.clear();
    }
    
    /**
     * Add connection status listener
     * @param {Function} listener - Callback function
     */
    addConnectionListener(listener) {
        if (typeof listener === 'function') {
            this.connectionListeners.push(listener);
        }
    }
    
    /**
     * Notify all connection listeners
     * @param {string} status - Connection status
     * @param {Object} data - Additional data
     */
    notifyListeners(status, data = {}) {
        this.connectionListeners.forEach(listener => {
            try {
                listener(status, data);
            } catch (err) {
                console.error('Error in connection listener:', err);
            }
        });
    }
    
    /**
     * Update heartbeat time
     * Call this when any event is received from TikTok
     */
    updateHeartbeat() {
        this.lastHeartbeatTime = Date.now();
    }
    
    /**
     * Set auto reconnect option
     * @param {boolean} enabled - Whether to auto reconnect
     */
    setAutoReconnect(enabled) {
        this.autoReconnect = enabled;
    }
    
    /**
     * Set max reconnect attempts
     * @param {number} attempts - Max number of reconnect attempts
     */
    setMaxReconnectAttempts(attempts) {
        this.maxReconnectAttempts = attempts;
    }
    
    /**
     * Set reconnect interval
     * @param {number} interval - Base interval in milliseconds
     */
    setReconnectInterval(interval) {
        this.reconnectInterval = interval;
    }
    
    /**
     * Check if connected
     * @returns {boolean} - Whether connected to TikTok Live
     */
    isActive() {
        return this.isConnected;
    }
    
    /**
     * Get current username
     * @returns {string} - Current username
     */
    getCurrentUsername() {
        return this.username;
    }
    
    /**
     * Get current room ID
     * @returns {string} - Current room ID
     */
    getCurrentRoomId() {
        return this.roomId;
    }
}

// Create connection manager instance when script loads
const connectionManager = new TikTokConnectionManager(io());
