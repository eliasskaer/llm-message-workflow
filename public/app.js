// Frontend JavaScript for AI Email Classifier Dashboard

const API_BASE_URL = 'http://localhost:3000';
let currentResults = [];
let emailWatcherActive = false;
let pollingInterval = null;
let lastResultCount = 0;
let activityPollingInterval = null;
let lastActivityTimestamp = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Attach event listeners to buttons
    document.getElementById('runWorkflow')?.addEventListener('click', runWorkflow);
    document.getElementById('viewResults')?.addEventListener('click', viewResults);
    document.getElementById('toggleEmailWatcher')?.addEventListener('click', toggleEmailWatcher);
    
    // Check email watcher status on load
    checkEmailWatcherStatus();
});

// Check email watcher status on load and start if not running
async function checkEmailWatcherStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/email/status`);
        const data = await response.json();
        
        // Update the button state based on the actual isRunning status
        emailWatcherActive = data.status.isRunning;
        updateEmailWatcherButton();
        
        // Auto-start email watcher if not running
        if (!emailWatcherActive) {
            console.log('Email watcher not running. Starting automatically...');
            await toggleEmailWatcher();
        } else {
            // Email watcher is already running, start polling
            console.log('Email watcher already running. Starting auto-refresh...');
            const resultsResponse = await fetch(`${API_BASE_URL}/workflow/results`);
            const resultsData = await resultsResponse.json();
            lastResultCount = resultsData.results ? resultsData.results.length : 0;
            startPolling();
            startActivityPolling();
        }
    } catch (error) {
        console.error('Error checking email watcher status:', error);
    }
}

// Run Workflow
async function runWorkflow() {
    const progressBar = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const messagesContainer = document.getElementById('feedContainer');
    const resultsSection = document.getElementById('resultsSection');
    
    // Reset UI
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
    messagesContainer.innerHTML = '<div class="loading">Starting workflow...</div>';
    resultsSection.innerHTML = '';
    
    // Reset workflow steps
    document.querySelectorAll('.workflow-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show progress section
    document.getElementById('progressSection').style.display = 'block';
    document.getElementById('messagesFeed').style.display = 'block';
    document.getElementById('workflowViz').style.display = 'block';
    
    try {
        // Start workflow animation
        updateProgress(10, 'Starting workflow...');
        displayMessagesFeed(['🚀 Starting workflow process...']);
        
        // Step 1: Classifying
        updateProgress(20, 'Classifying messages...');
        await animateWorkflowStep(1);
        displayMessagesFeed(['🔍 Classifying messages with AI...']);
        
        // Step 2: Enriching
        updateProgress(40, 'Enriching data...');
        await animateWorkflowStep(2);
        displayMessagesFeed(['🔬 Enriching data with insights...']);
        
        // Step 3: Routing
        updateProgress(60, 'Routing messages...');
        await animateWorkflowStep(3);
        displayMessagesFeed(['🚦 Routing to destinations...']);
        
        // Step 4: Checking escalation
        updateProgress(75, 'Checking escalation criteria...');
        await animateWorkflowStep(4);
        displayMessagesFeed(['⚠️ Checking escalation criteria...']);
        
        // Run the actual workflow
        const response = await fetch(`${API_BASE_URL}/workflow/run`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Workflow response:', data);
        
        if (!data.success) {
            throw new Error(data.error || 'Workflow failed');
        }
        
        // Step 5: Output - Save results
        updateProgress(90, 'Saving results...');
        await animateWorkflowStep(5);
        displayMessagesFeed(['💾 Saving results to file and Google Sheets...']);
        
        // Complete
        updateProgress(100, 'Workflow completed!');
        
        const processedCount = data.results?.length || 0;
        displayMessagesFeed([`✅ Workflow completed! Processed ${processedCount} messages.`]);
        displayMessagesFeed(['📊 Results saved successfully']);
        
        // Fetch full results from the results endpoint
        try {
            const resultsResponse = await fetch(`${API_BASE_URL}/workflow/results`);
            if (!resultsResponse.ok) {
                throw new Error(`Failed to fetch results: ${resultsResponse.status}`);
            }
            const resultsData = await resultsResponse.json();
            console.log('Full results data:', resultsData);
            
            if (resultsData.results && resultsData.results.length > 0) {
                currentResults = resultsData.results;
                lastResultCount = resultsData.results.length;
                console.log('Displaying results:', currentResults.length, 'items');
                displayResults(currentResults);
            } else {
                displayMessagesFeed(['⚠️ Results processed but could not load detailed view']);
            }
        } catch (fetchError) {
            console.error('Error fetching results:', fetchError);
            displayMessagesFeed(['⚠️ Results may be available - try clicking "View Results" button']);
        }
        
    } catch (error) {
        console.error('Workflow error:', error);
        messagesContainer.innerHTML += `<div class="message-card error">❌ Error: ${error.message}</div>`;
        updateProgress(0, 'Workflow failed');
    }
}

// Update progress bar
function updateProgress(percentage, text) {
    const progressBar = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}% - ${text}`;
}

// Animate workflow visualization steps
async function animateWorkflowStep(stepNumber) {
    const step = document.querySelector(`.workflow-step[data-step="${stepNumber}"]`);
    if (step) {
        step.classList.add('active');
        await new Promise(resolve => setTimeout(resolve, 800)); // Increased from 500ms to make it more visible
    }
}

// Display messages in the feed
function displayMessagesFeed(messages) {
    const container = document.getElementById('feedContainer');
    
    messages.forEach(message => {
        const messageCard = document.createElement('div');
        messageCard.className = 'message-card';
        messageCard.innerHTML = `
            <div class="message-header">
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="message-body">${message}</div>
        `;
        container.appendChild(messageCard);
    });
    
    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Simulate message processing animation with real data
async function simulateMessageProcessing(results) {
    const container = document.getElementById('feedContainer');
    
    for (let i = 0; i < Math.min(results.length, 5); i++) {
        const result = results[i];
        // Support both old nested structure and new flat structure
        const category = result.category || result.classification?.category || 'Unknown';
        const priority = result.priority || result.classification?.priority || 'Unknown';
        const from = result.from || result.email?.from || 'Unknown sender';
        
        const messageCard = document.createElement('div');
        messageCard.className = 'message-card processing';
        messageCard.innerHTML = `
            <div class="message-header">
                <span class="message-status">Processing...</span>
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="message-body">
                <strong>From:</strong> ${from}<br>
                <strong>Category:</strong> ${category}<br>
                <strong>Priority:</strong> ${priority}
            </div>
        `;
        container.appendChild(messageCard);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        messageCard.classList.remove('processing');
        messageCard.classList.add('completed');
        messageCard.querySelector('.message-status').textContent = '✅ Completed';
    }
    
    if (results.length > 5) {
        const remainingCard = document.createElement('div');
        remainingCard.className = 'message-card';
        remainingCard.innerHTML = `
            <div class="message-body">
                ...and ${results.length - 5} more emails processed
            </div>
        `;
        container.appendChild(remainingCard);
    }
}

// Display results
function displayResults(results) {
    console.log('displayResults called with:', results);
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.style.display = 'block';
    
    // Create summary cards
    const categories = {};
    const priorities = {};
    
    results.forEach(result => {
        // Support both old nested structure and new flat structure
        const category = result.category || result.classification?.category || 'Unknown';
        const priority = result.priority || result.classification?.priority || 'Unknown';
        
        categories[category] = (categories[category] || 0) + 1;
        priorities[priority] = (priorities[priority] || 0) + 1;
    });
    
    const summaryHTML = `
        <div class="results-header">
            <h2>📊 Workflow Results</h2>
            <p>Processed ${results.length} emails</p>
        </div>
        
        <div class="summary-cards">
            <div class="summary-card">
                <h3>Categories</h3>
                ${Object.entries(categories).map(([cat, count]) => 
                    `<div class="summary-item">${cat}: <strong>${count}</strong></div>`
                ).join('')}
            </div>
            
            <div class="summary-card">
                <h3>Priorities</h3>
                ${Object.entries(priorities).map(([pri, count]) => 
                    `<div class="summary-item">${pri}: <strong>${count}</strong></div>`
                ).join('')}
            </div>
        </div>
        
        <div class="results-actions">
            <a href="https://docs.google.com/spreadsheets/d/1dgDT_Xbf7SDvT-PPLGbOFn-Fz5vJIwculuj_4va-bEo" 
               target="_blank" 
               class="btn btn-primary">
                📊 Open Google Sheets
            </a>
        </div>
        
        <div class="results-table-container">
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Request ID</th>
                        <th>Source</th>
                        <th>Category</th>
                        <th>Priority</th>
                        <th>Confidence</th>
                        <th>Destination</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map(result => {
                        // Support both structures
                        const requestId = result.requestId || result.id || 'N/A';
                        const source = result.source || 'N/A';
                        const category = result.category || result.classification?.category || 'N/A';
                        const priority = result.priority || result.classification?.priority || 'N/A';
                        const confidence = result.confidence !== undefined ? result.confidence : 
                                          (result.classification?.confidence !== undefined ? result.classification.confidence : 'N/A');
                        const destination = result.destinationQueue || result.routing?.destinationQueue || 'N/A';
                        const escalated = result.escalationFlag ? ' 🚨' : '';
                        
                        return `
                            <tr>
                                <td>${requestId}</td>
                                <td>${source}</td>
                                <td>${category}</td>
                                <td>${priority}</td>
                                <td>${typeof confidence === 'number' ? confidence.toFixed(2) : confidence}</td>
                                <td>${destination}${escalated}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    resultsSection.innerHTML = summaryHTML;
}

// View Results from file
async function viewResults() {
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.style.display = 'block';
    resultsSection.innerHTML = '<div class="loading">Loading results...</div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/workflow/results`);
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            resultsSection.innerHTML = '<div class="message-card warning">⚠️ No results found. Run the workflow first.</div>';
            return;
        }
        
        currentResults = data.results;
        lastResultCount = data.results.length;
        displayResults(data.results);
        
    } catch (error) {
        console.error('Error loading results:', error);
        resultsSection.innerHTML = `<div class="message-card error">❌ Error loading results: ${error.message}</div>`;
    }
}

// Toggle Email Watcher
async function toggleEmailWatcher() {
    const button = document.getElementById('toggleEmailWatcher');
    
    try {
        if (!emailWatcherActive) {
            // Start email watcher
            const response = await fetch(`${API_BASE_URL}/email/start`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                emailWatcherActive = true;
                updateEmailWatcherButton();
                displayMessagesFeed(['✅ Email monitoring started']);
                
                // Initialize result count and start polling
                const resultsResponse = await fetch(`${API_BASE_URL}/workflow/results`);
                const resultsData = await resultsResponse.json();
                lastResultCount = resultsData.results ? resultsData.results.length : 0;
                startPolling();
                startActivityPolling();
            } else {
                throw new Error(data.error || 'Failed to start email watcher');
            }
        } else {
            // Stop email watcher
            const response = await fetch(`${API_BASE_URL}/email/stop`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                emailWatcherActive = false;
                updateEmailWatcherButton();
                displayMessagesFeed(['⏸️ Email monitoring stopped']);
                stopPolling();
                stopActivityPolling();
            } else {
                throw new Error(data.error || 'Failed to stop email watcher');
            }
        }
    } catch (error) {
        console.error('Error toggling email watcher:', error);
        displayMessagesFeed([`❌ Error: ${error.message}`]);
    }
}

// Update email watcher button state
function updateEmailWatcherButton() {
    const button = document.getElementById('toggleEmailWatcher');
    const buttonText = document.getElementById('emailButtonText');
    const statusText = document.getElementById('emailStatusText');
    const emailStatus = document.getElementById('emailStatus');
    
    if (emailWatcherActive) {
        buttonText.textContent = 'Stop Email Watcher';
        button.classList.add('active');
        
        // Update status indicator
        if (statusText) {
            statusText.textContent = 'Email Watcher Active - Monitoring for new emails';
        }
        if (emailStatus) {
            emailStatus.classList.add('active');
            emailStatus.classList.remove('inactive');
        }
    } else {
        buttonText.textContent = 'Start Email Watcher';
        button.classList.remove('active');
        
        // Update status indicator
        if (statusText) {
            statusText.textContent = 'Email Watcher Inactive';
        }
        if (emailStatus) {
            emailStatus.classList.remove('active');
            emailStatus.classList.add('inactive');
        }
    }
}

// Start auto-refresh polling for new results
function startPolling() {
    if (pollingInterval) return; // Already polling
    
    console.log('🔄 Starting auto-refresh polling...');
    pollingInterval = setInterval(pollForNewResults, 3000); // Check every 3 seconds
}

// Stop auto-refresh polling
function stopPolling() {
    if (pollingInterval) {
        console.log('⏸️ Stopping auto-refresh polling');
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

// Start activity polling for real-time processing updates
function startActivityPolling() {
    if (activityPollingInterval) return; // Already polling
    
    console.log('🔄 Starting activity polling...');
    activityPollingInterval = setInterval(pollForActivity, 1000); // Check every second for faster updates
}

// Stop activity polling
function stopActivityPolling() {
    if (activityPollingInterval) {
        console.log('⏸️ Stopping activity polling');
        clearInterval(activityPollingInterval);
        activityPollingInterval = null;
    }
}

// Poll for processing activity
async function pollForActivity() {
    try {
        const response = await fetch(`${API_BASE_URL}/processing/activity?limit=10`);
        if (!response.ok) return;
        
        const data = await response.json();
        if (!data.activity || data.activity.length === 0) return;
        
        // Get latest activity
        const latestActivity = data.activity[0];
        
        // Only show new activity (not already displayed)
        if (!lastActivityTimestamp || new Date(latestActivity.timestamp) > new Date(lastActivityTimestamp)) {
            // Display new activities
            const newActivities = data.activity.filter(activity => 
                !lastActivityTimestamp || new Date(activity.timestamp) > new Date(lastActivityTimestamp)
            ).reverse(); // Show in chronological order
            
            newActivities.forEach(activity => {
                displayActivityUpdate(activity);
            });
            
            lastActivityTimestamp = latestActivity.timestamp;
        }
    } catch (error) {
        console.error('Activity polling error:', error);
    }
}

// Handle workflow animation based on processing activity
function handleWorkflowAnimation(activity) {
    const workflowViz = document.getElementById('workflowViz');
    const progressSection = document.getElementById('progressSection');
    const messagesFeed = document.getElementById('messagesFeed');
    
    // Show workflow visualization when email processing starts
    if (activity.type === 'email_received') {
        // Show sections
        if (workflowViz) workflowViz.style.display = 'block';
        if (progressSection) progressSection.style.display = 'block';
        if (messagesFeed) messagesFeed.style.display = 'block';
        
        // Reset workflow steps
        document.querySelectorAll('.workflow-step').forEach(step => {
            step.classList.remove('active');
        });
        
        // Initialize progress
        updateProgress(10, 'Email received - Starting processing...');
    }
    
    // Map activity steps to workflow visualization
    const stepMapping = {
        'classify': { step: 1, progress: 20, text: 'Classifying message...' },
        'classify_complete': { step: 1, progress: 30, text: 'Classification complete' },
        'enrich': { step: 2, progress: 40, text: 'Enriching data...' },
        'enrich_complete': { step: 2, progress: 50, text: 'Enrichment complete' },
        'route': { step: 3, progress: 60, text: 'Routing message...' },
        'route_complete': { step: 3, progress: 70, text: 'Routing complete' },
        'escalation_check': { step: 4, progress: 80, text: 'Checking escalation...' },
        'escalation_complete': { step: 4, progress: 85, text: 'Escalation check complete' },
        'save_results': { step: 5, progress: 90, text: 'Saving results...' },
        'complete': { step: 5, progress: 100, text: 'Processing complete!' },
        'processing_complete': { step: 5, progress: 100, text: 'Processing complete!' }
    };
    
    if (activity.step && stepMapping[activity.step]) {
        const mapping = stepMapping[activity.step];
        
        // Animate workflow step
        const workflowStep = document.querySelector(`.workflow-step[data-step="${mapping.step}"]`);
        if (workflowStep) {
            workflowStep.classList.add('active');
        }
        
        // Update progress bar
        updateProgress(mapping.progress, mapping.text);
    }
}

// Display activity update in the feed
function displayActivityUpdate(activity) {
    const messagesContainer = document.getElementById('feedContainer');
    if (!messagesContainer) return;
    
    // Handle workflow visualization for email processing
    handleWorkflowAnimation(activity);
    
    const activityCard = document.createElement('div');
    activityCard.className = 'message-card activity-update';
    
    // Style based on activity type
    let bgColor = '#f5f5f5';
    if (activity.type === 'processing_complete') bgColor = '#4CAF50';
    if (activity.type === 'error') bgColor = '#f44336';
    if (activity.type === 'email_received') bgColor = '#2196F3';
    
    activityCard.style.borderLeft = `4px solid ${bgColor}`;
    activityCard.style.animation = 'slideIn 0.3s ease-out';
    
    activityCard.innerHTML = `
        <div class="message-header">
            <span class="message-time">${new Date(activity.timestamp).toLocaleTimeString()}</span>
            ${activity.messageId ? `<span class="message-id" style="font-size: 0.85em; color: #666;">${activity.messageId}</span>` : ''}
        </div>
        <div class="message-body">
            <strong>${activity.message}</strong>
            ${activity.details ? `<br><span style="color: #666; font-size: 0.9em;">${activity.details}</span>` : ''}
        </div>
    `;
    
    messagesContainer.appendChild(activityCard);
    
    // Auto-scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Keep only last 50 messages
    while (messagesContainer.children.length > 50) {
        messagesContainer.removeChild(messagesContainer.firstChild);
    }
}

// Poll for new results and update display
async function pollForNewResults() {
    try {
        const response = await fetch(`${API_BASE_URL}/workflow/results`);
        if (!response.ok) return;
        
        const data = await response.json();
        if (!data.results) return;
        
        // Check if we have new results
        if (data.results.length > lastResultCount) {
            console.log(`✨ New results detected: ${data.results.length - lastResultCount} new items`);
            lastResultCount = data.results.length;
            currentResults = data.results;
            
            // Update display if results section is visible
            const resultsSection = document.getElementById('resultsSection');
            if (resultsSection && resultsSection.style.display !== 'none' && resultsSection.innerHTML !== '') {
                displayResults(currentResults);
            }
            
            // Show toast notification with action
            showToast(`📧 New email processed! Total: ${data.results.length} - Click "View Results" to see details`);
        }
    } catch (error) {
        console.error('Polling error:', error);
    }
}

// Show toast notification
function showToast(message) {
    const messagesContainer = document.getElementById('feedContainer');
    if (messagesContainer) {
        const toast = document.createElement('div');
        toast.className = 'message-card';
        toast.style.backgroundColor = '#4CAF50';
        toast.style.color = 'white';
        toast.style.fontWeight = 'bold';
        toast.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.4)';
        toast.innerHTML = `<div class="message-body">${message}</div>`;
        messagesContainer.appendChild(toast);
        
        // Auto-scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Remove after 5 seconds
        setTimeout(() => toast.remove(), 5000);
    }
}


// Clear results
async function clearResults() {
    if (!confirm('Are you sure you want to clear all results?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/workflow/clear`, {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            currentResults = [];
            lastResultCount = 0;
            document.getElementById('resultsSection').innerHTML = '';
            document.getElementById('feedContainer').innerHTML = '';
            displayMessagesFeed(['✅ Results cleared']);
        } else {
            throw new Error(data.error || 'Failed to clear results');
        }
    } catch (error) {
        console.error('Error clearing results:', error);
        displayMessagesFeed([`❌ Error: ${error.message}`]);
    }
}
