// Connect to Socket.IO server
const socket = io();

// DOM Elements
const usernameInput = document.getElementById('username-input');
const connectButton = document.getElementById('connect-button');
const connectionStatus = document.getElementById('connection-text');
const connectionIndicator = document.querySelector('.connection-indicator');
const streamerAvatar = document.getElementById('streamer-avatar');
const streamerName = document.getElementById('streamer-name');
const streamTitle = document.getElementById('stream-title');
const viewerCount = document.getElementById('viewer-count');
const likeCount = document.getElementById('like-count');
const diamondCount = document.getElementById('diamond-count');
const earningsCount = document.getElementById('earnings-count');
const earningsValue = document.getElementById('earnings-value');
const chatMessages = document.getElementById('chat-messages');
const giftMessages = document.getElementById('gift-messages');
const chatInput = document.getElementById('chat-input');
const sendChatButton = document.getElementById('send-chat');
const likeButton = document.getElementById('like-button');
const giftButton = document.getElementById('gift-button');
const shareButton = document.getElementById('share-button');
const giftModal = document.getElementById('gift-modal');
const sessionModal = document.getElementById('session-modal');
const sessionIdInput = document.getElementById('session-id-input');
const saveSessionButton = document.getElementById('save-session-button');
const sendGiftButton = document.getElementById('send-gift-button');
const chatAutoScroll = document.getElementById('chat-auto-scroll');
const giftsAutoScroll = document.getElementById('gifts-auto-scroll');
const chatClear = document.getElementById('chat-clear');
const giftsClear = document.getElementById('gifts-clear');
const chatScrollBottom = document.getElementById('chat-scroll-bottom');
const giftsScrollBottom = document.getElementById('gifts-scroll-bottom');
const toastContainer = document.getElementById('toast-container');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const battleContainer = document.getElementById('battle-container');
const battleTimer = document.getElementById('battle-timer');
const hostAvatar = document.getElementById('host-avatar');
const hostName = document.getElementById('host-name');
const hostScore = document.getElementById('host-score');
const hostScoreBar = document.getElementById('host-score-bar');
const opponentAvatar = document.getElementById('opponent-avatar');
const opponentName = document.getElementById('opponent-name');
const opponentScore = document.getElementById('opponent-score');
const opponentScoreBar = document.getElementById('opponent-score-bar');

// State variables
let isConnected = false;
let sessionId = localStorage.getItem('tiktok-session-id') || '';
let selectedGiftId = null;
let isChatAutoScrollEnabled = true;
let isGiftsAutoScrollEnabled = true;
let totalDiamonds = 0;
let reconnectTimer = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 10;
let reconnectInterval = 5000; // 5 seconds
let lastHeartbeatTime = 0;
let heartbeatInterval = null;
let giftRegistry = new Map(); // Store gift data to prevent duplicates
let currentBattle = null; // Store current battle data
let battleTimerInterval = null; // Timer for battle countdown
let isDarkMode = localStorage.getItem('dark-mode') === 'true';

// Initialize
function init() {
    // Set up event listeners
    connectButton.addEventListener('click', connectToRoom);
    usernameInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') connectToRoom();
    });
    
    sendChatButton.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
    
    likeButton.addEventListener('click', sendLike);
    giftButton.addEventListener('click', openGiftModal);
    shareButton.addEventListener('click', shareStream);
    
    // Theme toggle
    themeToggleBtn.addEventListener('click', toggleDarkMode);
    
    // Auto-scroll toggles
    chatAutoScroll.addEventListener('click', () => {
        isChatAutoScrollEnabled = !isChatAutoScrollEnabled;
        chatAutoScroll.classList.toggle('active', isChatAutoScrollEnabled);
        if (isChatAutoScrollEnabled) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
            showToast('تم تفعيل التمرير التلقائي للتعليقات', 'info');
        } else {
            showToast('تم إيقاف التمرير التلقائي للتعليقات', 'info');
        }
    });
    
    giftsAutoScroll.addEventListener('click', () => {
        isGiftsAutoScrollEnabled = !isGiftsAutoScrollEnabled;
        giftsAutoScroll.classList.toggle('active', isGiftsAutoScrollEnabled);
        if (isGiftsAutoScrollEnabled) {
            giftMessages.scrollTop = giftMessages.scrollHeight;
            showToast('تم تفعيل التمرير التلقائي للهدايا', 'info');
        } else {
            showToast('تم إيقاف التمرير التلقائي للهدايا', 'info');
        }
    });
    
    // Clear buttons
    chatClear.addEventListener('click', () => {
        chatMessages.innerHTML = '';
        showToast('تم مسح التعليقات', 'info');
    });
    
    giftsClear.addEventListener('click', () => {
        giftMessages.innerHTML = '';
        showToast('تم مسح الهدايا', 'info');
    });
    
    // Scroll to bottom buttons
    chatScrollBottom.addEventListener('click', () => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
    
    giftsScrollBottom.addEventListener('click', () => {
        giftMessages.scrollTop = giftMessages.scrollHeight;
    });
    
    // Scroll event listeners to show/hide scroll to bottom buttons
    chatMessages.addEventListener('scroll', () => {
        const isScrolledToBottom = chatMessages.scrollHeight - chatMessages.clientHeight <= chatMessages.scrollTop + 50;
        chatScrollBottom.classList.toggle('visible', !isScrolledToBottom);
    });
    
    giftMessages.addEventListener('scroll', () => {
        const isScrolledToBottom = giftMessages.scrollHeight - giftMessages.clientHeight <= giftMessages.scrollTop + 50;
        giftsScrollBottom.classList.toggle('visible', !isScrolledToBottom);
    });
    
    // Gift modal
    document.querySelectorAll('.gift-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.gift-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            selectedGiftId = item.dataset.giftId;
        });
    });
    
    sendGiftButton.addEventListener('click', sendGift);
    
    // Session modal
    saveSessionButton.addEventListener('click', saveSessionId);
    
    // Close modals
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            giftModal.style.display = 'none';
            sessionModal.style.display = 'none';
        });
    });
    
    // Socket event listeners
    setupSocketListeners();
    
    // Load session ID from localStorage
    if (sessionId) {
        sessionIdInput.value = sessionId;
    }
    
    // Set initial connection status
    updateConnectionStatus('disconnected', 'غير متصل');
    
    // Apply dark mode if enabled
    applyTheme();
}

// Toggle dark mode
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('dark-mode', isDarkMode);
    applyTheme();
    
    showToast(isDarkMode ? 'تم تفعيل الوضع المظلم' : 'تم تفعيل الوضع الفاتح', 'info');
}

// Apply theme based on dark mode setting
function applyTheme() {
    const htmlElement = document.documentElement;
    
    if (isDarkMode) {
        htmlElement.classList.remove('light-theme');
        htmlElement.classList.add('dark-theme');
        themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        htmlElement.classList.remove('dark-theme');
        htmlElement.classList.add('light-theme');
        themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

// Connect to TikTok room
function connectToRoom() {
    const username = usernameInput.value.trim();
    if (!username) {
        showToast('يرجى إدخال اسم المستخدم', 'error');
        return;
    }
    
    // Clean username (remove @ if present)
    const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
    
    // Reset counters and state
    resetCounters();
    
    // Update connection status
    updateConnectionStatus('connecting', 'جاري الاتصال...');
    
    // Connect to room
    socket.emit('connect-to-room', cleanUsername, {
        enableExtendedGiftInfo: true,
        enableWebsocketUpgrade: true,
        requestPollingIntervalMs: 2000
    });
    
    // Store username in localStorage
    localStorage.setItem('tiktok-username', cleanUsername);
}

// Reset counters
function resetCounters() {
    totalDiamonds = 0;
    diamondCount.textContent = '0';
    earningsCount.textContent = '$0.00';
    earningsValue.textContent = '$0.00';
    likeCount.textContent = '0';
    viewerCount.textContent = '0';
    giftRegistry.clear();
    
    // Reset battle
    resetBattle();
}

// Reset battle display
function resetBattle() {
    currentBattle = null;
    battleContainer.classList.add('hidden');
    if (battleTimerInterval) {
        clearInterval(battleTimerInterval);
        battleTimerInterval = null;
    }
}

// Socket event listeners
function setupSocketListeners() {
    // Connection events
    socket.on('connection-success', (data) => {
        isConnected = true;
        reconnectAttempts = 0;
        updateConnectionStatus('connected', `متصل بالغرفة: ${data.roomId}`);
        showToast(`تم الاتصال بالغرفة: ${data.roomId}`, 'success');
        
        // Update streamer info
        if (data.streamerInfo) {
            streamerAvatar.src = data.streamerInfo.profilePictureUrl || 'https://via.placeholder.com/50';
            streamerName.textContent = data.streamerInfo.nickname || data.streamerInfo.uniqueId || 'اسم المستخدم';
            streamTitle.textContent = data.streamerInfo.bioDescription || 'بث مباشر';
        }
        
        // Start heartbeat to detect connection issues
        startHeartbeat();
    });
    
    socket.on('connection-error', (data) => {
        isConnected = false;
        updateConnectionStatus('disconnected', `خطأ في الاتصال: ${data.message}`);
        showToast(`خطأ في الاتصال: ${data.message}`, 'error');
        stopHeartbeat();
    });
    
    // Chat events
    socket.on('chat', (data) => {
        addChatMessage(data);
    });
    
    // Gift events
    socket.on('gift', (data) => {
        // Check if this is a duplicate gift (same user, gift, and timestamp within 5 seconds)
        const giftKey = `${data.userId}_${data.giftId}_${Math.floor(Date.now() / 5000)}`;
        
        // If this is a repeat of a streak gift, update the existing one
        if (data.repeatEnd === false && giftRegistry.has(giftKey)) {
            const existingGift = giftRegistry.get(giftKey);
            // Update the repeat count
            existingGift.repeatCount = data.repeatCount;
            // Update the DOM element
            updateGiftMessage(existingGift);
        } else {
            // New gift or end of streak
            giftRegistry.set(giftKey, data);
            addGiftMessage(data);
        }
        
        // Always update diamond count for accurate tracking
        updateDiamondCount(data);
        
        // Update last heartbeat time
        lastHeartbeatTime = Date.now();
    });
    
    // Room stats
    socket.on('roomUser', (data) => {
        if (data.viewerCount) {
            viewerCount.textContent = formatNumber(data.viewerCount);
        }
        
        // Update last heartbeat time
        lastHeartbeatTime = Date.now();
    });
    
    // Like events
    socket.on('like', (data) => {
        if (data.totalLikeCount) {
            likeCount.textContent = formatNumber(data.totalLikeCount);
        }
        
        // Update last heartbeat time
        lastHeartbeatTime = Date.now();
    });
    
    // Stream end
    socket.on('streamEnd', () => {
        isConnected = false;
        updateConnectionStatus('disconnected', 'انتهى البث');
        showToast('انتهى البث', 'info');
        stopHeartbeat();
        
        // Try to reconnect after a delay
        scheduleReconnect();
    });
    
    // Disconnect event
    socket.on('disconnect', () => {
        isConnected = false;
        updateConnectionStatus('disconnected', 'انقطع الاتصال');
        showToast('انقطع الاتصال', 'error');
        stopHeartbeat();
        
        // Try to reconnect
        scheduleReconnect();
    });
    
    // Message sent response
    socket.on('message-sent', (response) => {
        if (response.success) {
            chatInput.value = '';
            showToast('تم إرسال الرسالة', 'success');
        } else {
            showToast(`خطأ في إرسال الرسالة: ${response.error}`, 'error');
        }
    });
    
    // Like sent response
    socket.on('like-sent', (response) => {
        if (response.success) {
            showToast('تم إرسال الإعجاب', 'success');
        } else {
            showToast(`خطأ في إرسال الإعجاب: ${response.error}`, 'error');
        }
    });
    
    // Gift sent response
    socket.on('gift-sent', (response) => {
        giftModal.style.display = 'none';
        if (response.success) {
            showToast('تم إرسال الهدية', 'success');
        } else {
            showToast(`خطأ في إرسال الهدية: ${response.error}`, 'error');
        }
    });
    
    // Battle events
    socket.on('linkMicBattle', (data) => {
        handleBattleEvent(data);
    });
    
    socket.on('linkMicArmies', (data) => {
        updateBattleScores(data);
    });
}

// Handle battle events
function handleBattleEvent(data) {
    // If battle is starting
    if (data.battleStatus === 1) {
        currentBattle = {
            hostUserId: data.hostUserId,
            hostNickname: data.hostNickname || 'المضيف',
            hostAvatarUrl: data.hostAvatarUrl || 'https://via.placeholder.com/50',
            guestUserId: data.guestUserId,
            guestNickname: data.guestNickname || 'المنافس',
            guestAvatarUrl: data.guestAvatarUrl || 'https://via.placeholder.com/50',
            startTime: Date.now(),
            duration: data.battleDuration || 300, // Default 5 minutes in seconds
            hostScore: 0,
            guestScore: 0
        };
        
        // Update UI
        hostAvatar.src = currentBattle.hostAvatarUrl;
        hostName.textContent = currentBattle.hostNickname;
        hostScore.textContent = '0';
        hostScoreBar.style.width = '0%';
        
        opponentAvatar.src = currentBattle.guestAvatarUrl;
        opponentName.textContent = currentBattle.guestNickname;
        opponentScore.textContent = '0';
        opponentScoreBar.style.width = '0%';
        
        // Show battle container
        battleContainer.classList.remove('hidden');
        
        // Start battle timer
        startBattleTimer();
        
        // Show notification
        showToast('بدأت جولة جديدة!', 'info');
    } 
    // If battle is ending
    else if (data.battleStatus === 2) {
        if (currentBattle) {
            // Determine winner
            let winnerMessage = '';
            if (currentBattle.hostScore > currentBattle.guestScore) {
                winnerMessage = `${currentBattle.hostNickname} فاز بالجولة!`;
            } else if (currentBattle.guestScore > currentBattle.hostScore) {
                winnerMessage = `${currentBattle.guestNickname} فاز بالجولة!`;
            } else {
                winnerMessage = 'انتهت الجولة بالتعادل!';
            }
            
            // Show notification
            showToast(`انتهت الجولة! ${winnerMessage}`, 'info');
            
            // Hide battle container after a delay
            setTimeout(() => {
                resetBattle();
            }, 5000);
        }
    }
}

// Update battle scores
function updateBattleScores(data) {
    if (!currentBattle || !data.battleUsers) return;
    
    // Find host and guest in the battle users
    const hostData = data.battleUsers.find(user => user.userId === currentBattle.hostUserId);
    const guestData = data.battleUsers.find(user => user.userId === currentBattle.guestUserId);
    
    if (hostData) {
        currentBattle.hostScore = hostData.points || 0;
    }
    
    if (guestData) {
        currentBattle.guestScore = guestData.points || 0;
    }
    
    // Update UI
    updateBattleUI();
}

// Update battle UI
function updateBattleUI() {
    if (!currentBattle) return;
    
    // Update scores
    hostScore.textContent = formatNumber(currentBattle.hostScore);
    opponentScore.textContent = formatNumber(currentBattle.guestScore);
    
    // Calculate percentages for score bars
    const totalScore = currentBattle.hostScore + currentBattle.guestScore;
    if (totalScore > 0) {
        const hostPercent = (currentBattle.hostScore / totalScore) * 100;
        const guestPercent = (currentBattle.guestScore / totalScore) * 100;
        
        hostScoreBar.style.width = `${hostPercent}%`;
        opponentScoreBar.style.width = `${guestPercent}%`;
    } else {
        hostScoreBar.style.width = '50%';
        opponentScoreBar.style.width = '50%';
    }
}

// Start battle timer
function startBattleTimer() {
    if (battleTimerInterval) {
        clearInterval(battleTimerInterval);
    }
    
    battleTimerInterval = setInterval(() => {
        if (!currentBattle) {
            clearInterval(battleTimerInterval);
            return;
        }
        
        const now = Date.now();
        const elapsed = Math.floor((now - currentBattle.startTime) / 1000);
        const remaining = Math.max(0, currentBattle.duration - elapsed);
        
        // Format time as MM:SS
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        battleTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // If timer reaches zero, end the battle
        if (remaining <= 0) {
            clearInterval(battleTimerInterval);
        }
    }, 1000);
}

// Start heartbeat to detect connection issues
function startHeartbeat() {
    stopHeartbeat(); // Clear any existing interval
    
    lastHeartbeatTime = Date.now();
    
    heartbeatInterval = setInterval(() => {
        const now = Date.now();
        const timeSinceLastHeartbeat = now - lastHeartbeatTime;
        
        // If no heartbeat for 30 seconds, consider connection lost
        if (timeSinceLastHeartbeat > 30000 && isConnected) {
            console.log('No heartbeat detected for 30 seconds, reconnecting...');
            isConnected = false;
            updateConnectionStatus('disconnected', 'انقطع الاتصال (لا توجد استجابة)');
            showToast('انقطع الاتصال (لا توجد استجابة)', 'error');
            socket.disconnect();
            scheduleReconnect();
        }
    }, 10000); // Check every 10 seconds
}

// Stop heartbeat
function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

// Schedule reconnect
function scheduleReconnect() {
    // Clear any existing reconnect timer
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
    }
    
    // If max reconnect attempts reached, stop trying
    if (reconnectAttempts >= maxReconnectAttempts) {
        updateConnectionStatus('disconnected', 'فشل إعادة الاتصال بعد عدة محاولات');
        showToast('فشل إعادة الاتصال بعد عدة محاولات', 'error');
        return;
    }
    
    // Increment reconnect attempts
    reconnectAttempts++;
    
    // Calculate backoff time (exponential backoff with jitter)
    const backoff = Math.min(30000, reconnectInterval * Math.pow(1.5, reconnectAttempts - 1));
    const jitter = Math.random() * 0.5 + 0.75; // Random between 0.75 and 1.25
    const delay = Math.floor(backoff * jitter);
    
    updateConnectionStatus('connecting', `جاري إعادة الاتصال... (${reconnectAttempts}/${maxReconnectAttempts})`);
    showToast(`سيتم إعادة الاتصال خلال ${Math.round(delay / 1000)} ثوانٍ`, 'info');
    
    // Schedule reconnect
    reconnectTimer = setTimeout(() => {
        // Get username from input or localStorage
        const username = usernameInput.value.trim() || localStorage.getItem('tiktok-username');
        
        if (username) {
            updateConnectionStatus('connecting', 'جاري إعادة الاتصال...');
            socket.connect();
            socket.emit('connect-to-room', username, {
                enableExtendedGiftInfo: true,
                enableWebsocketUpgrade: true,
                requestPollingIntervalMs: 2000
            });
        } else {
            updateConnectionStatus('disconnected', 'لا يمكن إعادة الاتصال: اسم المستخدم غير متوفر');
            showToast('لا يمكن إعادة الاتصال: اسم المستخدم غير متوفر', 'error');
        }
    }, delay);
}

// Update connection status
function updateConnectionStatus(status, message) {
    connectionIndicator.className = 'connection-indicator ' + status;
    connectionStatus.textContent = message;
}

// Add chat message to the chat container
function addChatMessage(data) {
    const messageDiv = document.createElement('div');
    
    const profileImg = document.createElement('img');
    profileImg.className = 'miniprofilepicture';
    profileImg.src = data.profilePictureUrl || 'https://via.placeholder.com/30';
    profileImg.alt = 'صورة المستخدم';
    
    const messageContent = document.createElement('span');
    
    const username = document.createElement('a');
    username.href = `https://www.tiktok.com/@${data.uniqueId}`;
    username.target = '_blank';
    username.textContent = data.uniqueId;
    
    messageContent.appendChild(username);
    messageContent.appendChild(document.createTextNode(': ' + sanitize(data.comment)));
    
    messageDiv.appendChild(profileImg);
    messageDiv.appendChild(messageContent);
    
    chatMessages.appendChild(messageDiv);
    
    // Auto-scroll if enabled
    if (isChatAutoScrollEnabled) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
        // Show scroll to bottom button if not at bottom
        const isScrolledToBottom = chatMessages.scrollHeight - chatMessages.clientHeight <= chatMessages.scrollTop + 50;
        chatScrollBottom.classList.toggle('visible', !isScrolledToBottom);
    }
    
    // Limit the number of messages (keep more messages than before)
    if (chatMessages.children.length > 500) {
        chatMessages.removeChild(chatMessages.children[0]);
    }
}

// Add gift message to the gifts container
function addGiftMessage(data) {
    const messageDiv = document.createElement('div');
    
    const giftImg = document.createElement('img');
    giftImg.className = 'gifticon';
    giftImg.src = data.giftPictureUrl || 'https://via.placeholder.com/40';
    giftImg.alt = data.giftName || 'هدية';
    
    const messageContent = document.createElement('span');
    
    const username = document.createElement('a');
    username.href = `https://www.tiktok.com/@${data.uniqueId}`;
    username.target = '_blank';
    username.textContent = data.uniqueId;
    
    messageContent.appendChild(username);
    
    let giftText = ` أرسل ${data.giftName || 'هدية'}`;
    if (data.repeatCount > 1) {
        giftText += ` ×${data.repeatCount}`;
    }
    if (data.diamondCount > 0) {
        giftText += ` (${data.diamondCount * data.repeatCount} 💎)`;
    }
    
    messageContent.appendChild(document.createTextNode(giftText));
    
    messageDiv.appendChild(giftImg);
    messageDiv.appendChild(messageContent);
    
    // Store the message element in the gift data for later updates
    data.messageElement = messageDiv;
    
    giftMessages.appendChild(messageDiv);
    
    // Auto-scroll if enabled
    if (isGiftsAutoScrollEnabled) {
        giftMessages.scrollTop = giftMessages.scrollHeight;
    } else {
        // Show scroll to bottom button if not at bottom
        const isScrolledToBottom = giftMessages.scrollHeight - giftMessages.clientHeight <= giftMessages.scrollTop + 50;
        giftsScrollBottom.classList.toggle('visible', !isScrolledToBottom);
    }
    
    // Limit the number of messages
    if (giftMessages.children.length > 200) {
        giftMessages.removeChild(giftMessages.children[0]);
    }
}

// Update existing gift message (for streaks)
function updateGiftMessage(data) {
    if (!data.messageElement) return;
    
    // Find the text node and update it
    const messageContent = data.messageElement.querySelector('span');
    if (messageContent) {
        const username = messageContent.querySelector('a');
        
        // Clear existing text nodes
        while (messageContent.childNodes.length > 1) {
            messageContent.removeChild(messageContent.lastChild);
        }
        
        let giftText = ` أرسل ${data.giftName || 'هدية'}`;
        if (data.repeatCount > 1) {
            giftText += ` ×${data.repeatCount}`;
        }
        if (data.diamondCount > 0) {
            giftText += ` (${data.diamondCount * data.repeatCount} 💎)`;
        }
        
        messageContent.appendChild(document.createTextNode(giftText));
    }
}

// Update diamond count and earnings
function updateDiamondCount(gift) {
    // Calculate gift value
    const giftValue = gift.diamondCount * gift.repeatCount;
    
    // Add to total diamonds
    totalDiamonds += giftValue;
    
    // Update UI
    diamondCount.textContent = formatNumber(totalDiamonds);
    
    // Calculate earnings (5000 USD per 1M diamonds)
    const earnings = (totalDiamonds / 1000000) * 5000;
    earningsCount.textContent = `$${earnings.toFixed(2)}`;
    earningsValue.textContent = `$${earnings.toFixed(2)}`;
}

// Send chat message
function sendChatMessage() {
    if (!isConnected) {
        showToast('يجب الاتصال بغرفة أولاً', 'error');
        return;
    }
    
    const message = chatInput.value.trim();
    if (!message) {
        return;
    }
    
    if (!sessionId) {
        openSessionModal();
        return;
    }
    
    socket.emit('send-chat', message, sessionId);
}

// Send like
function sendLike() {
    if (!isConnected) {
        showToast('يجب الاتصال بغرفة أولاً', 'error');
        return;
    }
    
    if (!sessionId) {
        openSessionModal();
        return;
    }
    
    socket.emit('send-like', 1, sessionId);
}

// Open gift modal
function openGiftModal() {
    if (!isConnected) {
        showToast('يجب الاتصال بغرفة أولاً', 'error');
        return;
    }
    
    if (!sessionId) {
        openSessionModal();
        return;
    }
    
    giftModal.style.display = 'flex';
}

// Send gift
function sendGift() {
    if (!selectedGiftId) {
        showToast('يرجى اختيار هدية', 'error');
        return;
    }
    
    socket.emit('send-gift', selectedGiftId, sessionId);
}

// Share stream
function shareStream() {
    if (!isConnected) {
        showToast('يجب الاتصال بغرفة أولاً', 'error');
        return;
    }
    
    const username = usernameInput.value.trim() || localStorage.getItem('tiktok-username');
    if (!username) return;
    
    const shareUrl = `https://www.tiktok.com/@${username}/live`;
    
    // Try to use Web Share API if available
    if (navigator.share) {
        navigator.share({
            title: `بث مباشر من ${username}`,
            text: 'شاهد هذا البث المباشر على TikTok!',
            url: shareUrl
        }).then(() => {
            showToast('تمت مشاركة البث', 'success');
        }).catch(err => {
            console.error('Error sharing:', err);
            copyToClipboard(shareUrl);
        });
    } else {
        copyToClipboard(shareUrl);
    }
}

// Copy text to clipboard
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        showToast('تم نسخ رابط البث إلى الحافظة', 'success');
    } catch (err) {
        console.error('Failed to copy:', err);
        showToast('فشل نسخ الرابط', 'error');
    }
    
    document.body.removeChild(textarea);
}

// Open session ID modal
function openSessionModal() {
    sessionModal.style.display = 'flex';
}

// Save session ID
function saveSessionId() {
    const newSessionId = sessionIdInput.value.trim();
    if (!newSessionId) {
        showToast('يرجى إدخال معرف الجلسة', 'error');
        return;
    }
    
    sessionId = newSessionId;
    localStorage.setItem('tiktok-session-id', sessionId);
    sessionModal.style.display = 'none';
    showToast('تم حفظ معرف الجلسة', 'success');
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-circle"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            break;
        default:
            icon = '<i class="fas fa-info-circle"></i>';
    }
    
    toast.innerHTML = `${icon} ${message}`;
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, 3000);
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Sanitize text to prevent XSS
function sanitize(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
