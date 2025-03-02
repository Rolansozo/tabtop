// Utility Functions
const getDomain = (url) => {
    try {
        return new URL(url).hostname;
    } catch {
        return 'other';
    }
};

// Check if two tabs are duplicates (same URL)
const areTabsDuplicate = (tab1, tab2) => {
    return tab1.url === tab2.url;
};

// DOM Elements Cache
const elements = {
    tabsList: document.getElementById('tabs-container'),
    searchInput: document.getElementById('search-input'),
    selectedCount: document.getElementById('selected-count'),
    selectedActions: document.getElementById('selected-actions'),
    clearSelectionBtn: document.getElementById('clear-selection-btn'),
    copySelectedBtn: document.getElementById('copy-selected-btn'),
    selectAllBtn: document.getElementById('select-all-btn'),
    shareSelectedBtn: document.getElementById('share-selected-btn'),
    organizeDomainBtn: document.getElementById('organize-domain-btn'),
    mergeWindowsBtn: document.getElementById('merge-windows-btn'),
    removeDuplicatesBtn: document.getElementById('remove-duplicates-btn'),
    duplicatesDropdown: document.getElementById('duplicates-dropdown'),
    removeDuplicatesCurrent: document.getElementById('remove-duplicates-current'),
    removeDuplicatesAll: document.getElementById('remove-duplicates-all'),
    loadingIndicator: document.getElementById('loading-indicator'),
    shareModal: document.getElementById('share-modal'),
    shareModalClose: document.getElementById('share-modal-close'),
    shareViaEmail: document.getElementById('share-via-email'),
    shareViaWhatsapp: document.getElementById('share-via-whatsapp'),
    mergeWindowsModal: document.getElementById('merge-windows-modal'),
    mergeModalClose: document.getElementById('merge-modal-close'),
    mergeWindowsList: document.getElementById('merge-windows-list'),
    shareViaSlack: document.getElementById('share-via-slack'),
    shareViaDiscord: document.getElementById('share-via-discord'),
    // New elements will be created dynamically
};

// State Management
const state = {
    tabs: [],
    windows: {},
    currentWindowId: null,
    selectedTabs: new Set(),
    searchQuery: '',
    tabsToShare: [],
    allGroupsCollapsed: false
};

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    // Event Listeners
    elements.searchInput.addEventListener('input', handleSearch);
    elements.clearSelectionBtn.addEventListener('click', clearSelection);
    elements.copySelectedBtn.addEventListener('click', () => copySelectedTabs());
    elements.selectAllBtn.addEventListener('click', selectAllTabs);
    elements.shareSelectedBtn.addEventListener('click', () => openShareModal(getSelectedTabs()));
    elements.organizeDomainBtn.addEventListener('click', organizeTabs);
    elements.mergeWindowsBtn.addEventListener('click', openMergeWindowsModal);

    // Duplicate tabs dropdown
    elements.removeDuplicatesBtn.addEventListener('click', toggleDuplicatesDropdown);
    elements.removeDuplicatesCurrent.addEventListener('click', () => {
        removeDuplicateTabs(true);
        toggleDuplicatesDropdown();
    });
    elements.removeDuplicatesAll.addEventListener('click', () => {
        removeDuplicateTabs(false);
        toggleDuplicatesDropdown();
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!elements.removeDuplicatesBtn.contains(e.target) && !elements.duplicatesDropdown.contains(e.target)) {
            elements.duplicatesDropdown.classList.add('hidden');
        }
    });

    // Share modal events
    elements.shareModalClose.addEventListener('click', closeShareModal);
    elements.shareViaEmail.addEventListener('click', shareViaEmail);
    elements.shareViaWhatsapp.addEventListener('click', shareViaWhatsapp);
    elements.shareViaSlack.addEventListener('click', shareViaSlack);
    elements.shareViaDiscord.addEventListener('click', shareViaDiscord);

    // Merge windows modal events
    elements.mergeModalClose.addEventListener('click', closeMergeWindowsModal);

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === elements.shareModal) {
            closeShareModal();
        }
        if (e.target === elements.mergeWindowsModal) {
            closeMergeWindowsModal();
        }
    });

    // Load tabs
    await loadTabs();

    // Add close selected button to the selected actions menu
    const closeSelectedBtn = document.createElement('button');
    closeSelectedBtn.id = 'close-selected-btn';
    closeSelectedBtn.className = 'text-sm text-red-600 hover:text-red-700';
    closeSelectedBtn.textContent = 'Close Selected';
    closeSelectedBtn.addEventListener('click', closeSelectedTabs);

    // Insert before the clear button
    elements.selectedActions.querySelector('div').appendChild(closeSelectedBtn);
});

// Toggle duplicate tabs dropdown
const toggleDuplicatesDropdown = () => {
    elements.duplicatesDropdown.classList.toggle('hidden');
};

// Load all tabs from Chrome
const loadTabs = async () => {
    try {
        elements.loadingIndicator.classList.remove('hidden');

        // Get current window
        const currentWindow = await chrome.windows.getCurrent();
        state.currentWindowId = currentWindow.id;

        // Get all windows
        const windows = await chrome.windows.getAll();
        state.windows = windows.reduce((acc, win) => {
            acc[win.id] = win;
            return acc;
        }, {});

        // Get all tabs
        state.tabs = await chrome.tabs.query({});

        elements.loadingIndicator.classList.add('hidden');
        renderTabs();
    } catch (error) {
        console.error('Error loading tabs:', error);
        elements.loadingIndicator.classList.add('hidden');
        showNotification('Failed to load tabs', true);
    }
};

// Handle search input changes
const handleSearch = (e) => {
    state.searchQuery = e.target.value.toLowerCase();
    renderTabs();
};

// Clear all selected tabs
const clearSelection = () => {
    state.selectedTabs.clear();
    updateSelectedCounter();
    renderTabs();
};

// Select all tabs
const selectAllTabs = () => {
    const filteredTabs = getFilteredTabs();
    filteredTabs.forEach(tab => {
        state.selectedTabs.add(tab.id);
    });
    updateSelectedCounter();
    renderTabs();
};

// Close selected tabs
const closeSelectedTabs = async () => {
    const selectedTabs = getSelectedTabs();
    if (selectedTabs.length > 0) {
        await closeTabs(selectedTabs);
        state.selectedTabs.clear();
        updateSelectedCounter();
        await loadTabs();
    } else {
        showNotification('No tabs selected', true);
    }
};

// Get filtered tabs based on search query
const getFilteredTabs = () => {
    return state.tabs.filter(tab =>
        tab.title.toLowerCase().includes(state.searchQuery) ||
        tab.url.toLowerCase().includes(state.searchQuery)
    );
};

// Toggle tab selection
const toggleTabSelection = (tabId) => {
    if (state.selectedTabs.has(tabId)) {
        state.selectedTabs.delete(tabId);
    } else {
        state.selectedTabs.add(tabId);
    }
    updateSelectedCounter();
    renderTabs();
};

// Get selected tabs
const getSelectedTabs = () => {
    return state.tabs.filter(tab => state.selectedTabs.has(tab.id));
};

// Update the selected tabs counter
const updateSelectedCounter = () => {
    const count = state.selectedTabs.size;
    if (count > 0) {
        elements.selectedCount.textContent = `${count} tab${count === 1 ? '' : 's'} selected`;
        elements.selectedActions.classList.remove('hidden');
    } else {
        elements.selectedActions.classList.add('hidden');
    }
};

// Navigate to a specific tab
const activateTab = (tab) => {
    chrome.tabs.update(tab.id, { active: true });
    chrome.windows.update(tab.windowId, { focused: true });
};

// Copy URLs from tabs
const copyTabs = async (tabsToCopy) => {
    const links = tabsToCopy.map(tab => tab.url).join('\n');
    try {
        await navigator.clipboard.writeText(links);
        showNotification('Links copied!');
    } catch (error) {
        showNotification('Failed to copy links', true);
    }
};

// Copy selected tabs
const copySelectedTabs = () => {
    const selectedTabs = getSelectedTabs();
    if (selectedTabs.length > 0) {
        copyTabs(selectedTabs);
    } else {
        showNotification('No tabs selected', true);
    }
};

// Close tabs
const closeTabs = async (tabsToClose) => {
    try {
        await chrome.tabs.remove(tabsToClose.map(tab => tab.id));
        showNotification('Tabs closed successfully');
        state.selectedTabs.clear(); // Clear selection after closing
        await loadTabs();
    } catch (error) {
        showNotification('Failed to close tabs', true);
    }
};

// Toggle domain group expansion
const toggleDomainExpansion = (domainElement) => {
    const content = domainElement.querySelector('.domain-content');
    content.classList.toggle('hidden');

    const toggleBtn = domainElement.querySelector('.toggle-btn');
    if (content.classList.contains('hidden')) {
        toggleBtn.textContent = '+';
    } else {
        toggleBtn.textContent = '−';
    }
};

// Toggle ALL domain groups expansion/collapse
const toggleAllDomains = () => {
    state.allGroupsCollapsed = !state.allGroupsCollapsed;

    // Get all domain contents and toggle buttons
    const domainContents = document.querySelectorAll('.domain-content');
    const toggleBtns = document.querySelectorAll('.toggle-btn');

    domainContents.forEach(content => {
        if (state.allGroupsCollapsed) {
            content.classList.add('hidden');
        } else {
            content.classList.remove('hidden');
        }
    });

    toggleBtns.forEach(btn => {
        btn.textContent = state.allGroupsCollapsed ? '+' : '−';
    });

    // Update the global toggle button text
    const globalToggleBtn = document.getElementById('toggle-all-domains-btn');
    if (globalToggleBtn) {
        globalToggleBtn.textContent = state.allGroupsCollapsed ? 'Expand All' : 'Collapse All';
    }
};

// Toggle window group expansion
const toggleWindowExpansion = (windowElement) => {
    const content = windowElement.querySelector('.window-content');
    content.classList.toggle('hidden');

    const toggleBtn = windowElement.querySelector('.window-toggle-btn');
    if (content.classList.contains('hidden')) {
        toggleBtn.textContent = '+';
    } else {
        toggleBtn.textContent = '−';
    }
};

// Show notification
const showNotification = (message, isError = false) => {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white ${
        isError ? 'bg-red-500' : 'bg-green-500'
    } fade-in`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
};

// Organize tabs by domain within the current window
const organizeTabs = async () => {
    try {
        elements.loadingIndicator.classList.remove('hidden');

        // Get the current window ID
        const currentWindow = await chrome.windows.getCurrent();

        // Only get tabs from the current window
        const currentWindowTabs = await chrome.tabs.query({ windowId: currentWindow.id });

        // Group tabs by domain
        const domainGroups = {};
        currentWindowTabs.forEach(tab => {
            const domain = getDomain(tab.url);
            if (!domainGroups[domain]) {
                domainGroups[domain] = [];
            }
            domainGroups[domain].push(tab.id);
        });

        // Calculate the new tab order
        let sortedTabIds = [];
        for (const domain in domainGroups) {
            sortedTabIds = sortedTabIds.concat(domainGroups[domain]);
        }

        // Move tabs to their new positions in order
        for (let i = 0; i < sortedTabIds.length; i++) {
            await chrome.tabs.move(sortedTabIds[i], { index: i });
        }

        elements.loadingIndicator.classList.add('hidden');
        showNotification('Tabs organized by domain');
        await loadTabs();
    } catch (error) {
        console.error('Error organizing tabs:', error);
        elements.loadingIndicator.classList.add('hidden');
        showNotification('Failed to organize tabs', true);
    }
};

// Share modal functions
const openShareModal = (tabs) => {
    if (tabs.length === 0) {
        showNotification('No tabs to share', true);
        return;
    }

    state.tabsToShare = tabs;
    elements.shareModal.style.display = 'block';
};

const closeShareModal = () => {
    elements.shareModal.style.display = 'none';
    state.tabsToShare = [];
};

const shareViaEmail = () => {
    const subject = 'Shared Tabs';
    const body = state.tabsToShare.map(tab => `${tab.title}: ${tab.url}`).join('\n\n');

    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    closeShareModal();
    showNotification('Opening email client...');
};

const shareViaWhatsapp = () => {
    const text = state.tabsToShare.map(tab => `${tab.title}: ${tab.url}`).join('\n\n');

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    closeShareModal();
    showNotification('Opening WhatsApp...');
};
const shareViaSlack = () => {
    const text = state.tabsToShare.map(tab => `${tab.title}: ${tab.url}`).join('\n\n');

    window.open(`https://slack.com/app_redirect?app=A027XN5PBA3&tab=messages&text=${encodeURIComponent(text)}`);
    closeShareModal();
    showNotification('Opening Slack...');
};

const shareViaDiscord = () => {
    // Discord doesn't have a direct sharing URL scheme
    // Instead, we'll copy to clipboard and suggest pasting in Discord
    const text = state.tabsToShare.map(tab => `${tab.title}: ${tab.url}`).join('\n\n');

    navigator.clipboard.writeText(text).then(() => {
        showNotification('Links copied for Discord! Paste them in Discord.');
        closeShareModal();
    }).catch(err => {
        showNotification('Failed to copy links', true);
    });
};

// Merge windows functions
const openMergeWindowsModal = async () => {
    // Clear previous content
    elements.mergeWindowsList.innerHTML = '';

    // Get all windows
    const windows = Object.values(state.windows);

    // Sort windows to show current window first
    const sortedWindows = windows.sort((a, b) => {
        if (a.id === state.currentWindowId) return -1;
        if (b.id === state.currentWindowId) return 1;
        return 0;
    });

    // Add window options
    sortedWindows.forEach((window, index) => {
        const isCurrent = window.id === state.currentWindowId;
        const windowNumber = isCurrent ? 1 : index + 1;

        const button = document.createElement('button');
        button.className = 'w-full py-2 px-4 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors text-left';
        button.textContent = `Window #${windowNumber}${isCurrent ? ' (Current)' : ''}`;
        button.addEventListener('click', () => mergeWindows(window.id));

        elements.mergeWindowsList.appendChild(button);
    });

    // Show modal
    elements.mergeWindowsModal.style.display = 'block';
};

const closeMergeWindowsModal = () => {
    elements.mergeWindowsModal.style.display = 'none';
};

const mergeWindows = async (targetWindowId) => {
    try {
        elements.loadingIndicator.classList.remove('hidden');
        closeMergeWindowsModal();

        // Get all tabs except those in the target window
        const tabsToMove = state.tabs.filter(tab => tab.windowId !== targetWindowId);

        // Move tabs to target window
        for (const tab of tabsToMove) {
            await chrome.tabs.move(tab.id, { windowId: targetWindowId, index: -1 });
        }

        elements.loadingIndicator.classList.add('hidden');
        showNotification('Windows merged successfully');
        await loadTabs();
    } catch (error) {
        console.error('Error merging windows:', error);
        elements.loadingIndicator.classList.add('hidden');
        showNotification('Failed to merge windows', true);
    }
};

// Remove duplicate tabs
const removeDuplicateTabs = async (currentWindowOnly) => {
    try {
        elements.loadingIndicator.classList.remove('hidden');

        // Get tabs, either from current window or all windows
        let tabsToCheck = [];
        if (currentWindowOnly) {
            tabsToCheck = state.tabs.filter(tab => tab.windowId === state.currentWindowId);
        } else {
            tabsToCheck = [...state.tabs];
        }

        // Track unique URLs and duplicates
        const uniqueUrls = new Map();
        const duplicateTabs = [];

        // Find duplicates
        tabsToCheck.forEach(tab => {
            if (uniqueUrls.has(tab.url)) {
                duplicateTabs.push(tab);
            } else {
                uniqueUrls.set(tab.url, tab);
            }
        });

        // Close duplicates if found
        if (duplicateTabs.length > 0) {
            await closeTabs(duplicateTabs);
            showNotification(`Removed ${duplicateTabs.length} duplicate tab(s)`);
        } else {
            showNotification('No duplicate tabs found');
        }

        elements.loadingIndicator.classList.add('hidden');
    } catch (error) {
        console.error('Error removing duplicates:', error);
        elements.loadingIndicator.classList.add('hidden');
        showNotification('Failed to remove duplicates', true);
    }
};

// Get window display name (simple numbering with current window as #1)
const getWindowDisplayName = (windowId) => {
    // If this is the current window, always show as #1
    if (windowId === state.currentWindowId) {
        return 'Window #1 (Current)';
    }

    // Get all window IDs and sort them (current window first, others by ID)
    const windowIds = Object.keys(state.windows).map(Number);
    const sortedWindowIds = windowIds.sort((a, b) => {
        if (a === state.currentWindowId) return -1;
        if (b === state.currentWindowId) return 1;
        return a - b;
    });

    // Find the index of the current window ID in the sorted list
    const windowIndex = sortedWindowIds.indexOf(windowId);

    // Return window number (add 1 to make it 1-based, and if it's after the current window, add 1 more)
    const windowNumber = windowIndex + 1;

    return `Window #${windowNumber}`;
};

// Render the tabs list grouped by window then domain
const renderTabs = () => {
    // Filter tabs based on search query
    const filteredTabs = getFilteredTabs();

    // Group tabs by window
    const windowGroups = filteredTabs.reduce((acc, tab) => {
        if (!acc[tab.windowId]) {
            acc[tab.windowId] = [];
        }
        acc[tab.windowId].push(tab);
        return acc;
    }, {});

    // Clear current tabs list
    elements.tabsList.innerHTML = '';

    // Create global toggle button
    const globalActionsContainer = document.createElement('div');
    globalActionsContainer.className = 'flex justify-between items-center mb-4 px-2';

    const globalToggleBtn = document.createElement('button');
    globalToggleBtn.id = 'toggle-all-domains-btn';
    globalToggleBtn.className = 'px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors';
    globalToggleBtn.textContent = state.allGroupsCollapsed ? 'Expand All' : 'Collapse All';
    globalToggleBtn.addEventListener('click', toggleAllDomains);

    globalActionsContainer.appendChild(globalToggleBtn);
    elements.tabsList.appendChild(globalActionsContainer);

    // Sort window IDs to make the current window appear first, then others by ID
    const sortedWindowIds = Object.keys(windowGroups).sort((a, b) => {
        a = Number(a);
        b = Number(b);
        if (a === state.currentWindowId) return -1;
        if (b === state.currentWindowId) return 1;
        return a - b;
    });

    // Render each window group
    sortedWindowIds.forEach((windowId, windowIndex) => {
        const windowTabs = windowGroups[windowId];
        windowId = Number(windowId);

        // Create window container
        const windowElement = document.createElement('div');
        windowElement.className = 'mb-6 bg-white rounded-lg shadow-md overflow-hidden fade-in';

        // Create window header
        const windowHeader = document.createElement('div');
        windowHeader.className = 'flex items-center justify-between p-3 bg-gray-100 border-b';

        // Window title and toggle
        const windowTitleContainer = document.createElement('div');
        windowTitleContainer.className = 'flex items-center';

        const windowToggleBtn = document.createElement('button');
        windowToggleBtn.className = 'mr-2 text-gray-500 hover:text-gray-700 window-toggle-btn';
        windowToggleBtn.textContent = '−';
        windowToggleBtn.addEventListener('click', () => toggleWindowExpansion(windowElement));

        const windowTitle = document.createElement('h2');
        windowTitle.className = 'font-medium text-gray-900';
        const windowName = getWindowDisplayName(windowId);
        windowTitle.innerHTML = `${windowName} <span class="text-gray-500 text-sm">(${windowTabs.length} tabs)</span>`;

        windowTitleContainer.appendChild(windowToggleBtn);
        windowTitleContainer.appendChild(windowTitle);

        windowHeader.appendChild(windowTitleContainer);
        windowElement.appendChild(windowHeader);

        // Create window content container
        const windowContent = document.createElement('div');
        windowContent.className = 'window-content p-3';

        // Group tabs by domain within this window
        const domainGroups = windowTabs.reduce((acc, tab) => {
            const domain = getDomain(tab.url);
            if (!acc[domain]) acc[domain] = [];
            acc[domain].push(tab);
            return acc;
        }, {});

        // Render domain groups within this window
        Object.entries(domainGroups).forEach(([domain, domainTabs]) => {
            const domainElement = document.createElement('div');
            domainElement.className = 'mb-4 bg-white rounded-lg shadow-sm overflow-hidden fade-in';

            // Create domain header
            const header = document.createElement('div');
            header.className = 'flex items-center justify-between p-3 bg-gray-50 border-b';

            // Domain title and toggle
            const titleContainer = document.createElement('div');
            titleContainer.className = 'flex items-center';

            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'mr-2 text-gray-500 hover:text-gray-700 toggle-btn';
            toggleBtn.textContent = state.allGroupsCollapsed ? '+' : '−';
            toggleBtn.addEventListener('click', () => toggleDomainExpansion(domainElement));

            const title = document.createElement('h3');
            title.className = 'font-medium text-gray-900';
            title.textContent = `${domain} (${domainTabs.length})`;

            titleContainer.appendChild(toggleBtn);
            titleContainer.appendChild(title);


            // Add domain action buttons
            const domainActions = document.createElement('div');
            domainActions.className = 'flex space-x-2';

            const shareDomainBtn = document.createElement('button');
            shareDomainBtn.className = 'text-blue-600 hover:text-blue-800 text-sm';
            shareDomainBtn.textContent = 'Share';
            shareDomainBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openShareModal(domainTabs);
            });

            const closeDomainBtn = document.createElement('button');
            closeDomainBtn.className = 'text-red-600 hover:text-red-800 text-sm';
            closeDomainBtn.textContent = 'Close All';
            closeDomainBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeTabs(domainTabs);
            });

            domainActions.appendChild(shareDomainBtn);
            domainActions.appendChild(closeDomainBtn);

            header.appendChild(domainActions);


            header.appendChild(titleContainer);
            domainElement.appendChild(header);

            // Create domain content
            const content = document.createElement('div');
            content.className = `domain-content ${state.allGroupsCollapsed ? 'hidden' : ''}`;

            // Render tabs in this domain
            domainTabs.forEach(tab => {
                const tabElement = document.createElement('div');
                tabElement.className = `
                    flex items-center justify-between p-3 border-b last:border-0
                    ${state.selectedTabs.has(tab.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}
                    cursor-pointer transition-colors
                `;

                // Create checkbox for selection
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 rounded';
                checkbox.checked = state.selectedTabs.has(tab.id);
                checkbox.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleTabSelection(tab.id);
                });

                // Tab favicon
                const favicon = document.createElement('img');
                favicon.src = tab.favIconUrl || 'icon.png';
                favicon.className = 'w-4 h-4 mr-3';
                favicon.onerror = () => favicon.src = 'icon.png';

                // Tab title
                const title = document.createElement('div');
                title.className = 'flex-1 truncate mr-3';
                title.textContent = tab.title;

                // Tab actions
                const actions = document.createElement('div');
                actions.className = 'flex space-x-2';

                const copyBtn = document.createElement('button');
                copyBtn.className = 'text-gray-500 hover:text-gray-700';
                copyBtn.textContent = 'Copy';
                copyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    copyTabs([tab]);
                });

                const closeBtn = document.createElement('button');
                closeBtn.className = 'text-gray-500 hover:text-red-700';
                closeBtn.textContent = '✕';
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeTabs([tab]);
                });

                actions.appendChild(copyBtn);
                actions.appendChild(closeBtn);

                // Combine all elements
                tabElement.appendChild(checkbox);
                tabElement.appendChild(favicon);
                tabElement.appendChild(title);
                tabElement.appendChild(actions);

                // Make entire tab row clickable
                tabElement.addEventListener('click', () => activateTab(tab));

                content.appendChild(tabElement);
            });

            domainElement.appendChild(content);
            windowContent.appendChild(domainElement);
        });

        windowElement.appendChild(windowContent);
        elements.tabsList.appendChild(windowElement);
    });

    // Show "no results" message if no tabs match search
    if (filteredTabs.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'text-center py-8 text-gray-500';
        noResults.textContent = state.searchQuery
            ? 'No tabs match your search'
            : 'No tabs found';
        elements.tabsList.appendChild(noResults);
    }
};