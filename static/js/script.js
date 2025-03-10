const chatContainer = document.getElementById("chat-container");
const chatBubble = document.getElementById("chat-bubble");
const chatBox = document.getElementById("chat-box");
let processingAlert = false;
let errorIndex = 0;
let isMaximized = false;

const errorCollection = [
    { source: "OrderProcessingService", error: "Server failed to fulfill the request with status code 500", response: ["<b>Checking Recent Trends...</b>", "This error has occurred 5 times in the last hour, with a spike in failure rates.", "Looking at historical data, this type of failure is <b>85%</b> correlated with <b>database timeouts</b>.", "<div class='highlight-box'><b>Genix AI model predicts that</b></br><br>If the database response time exceeds <b>3s</b>, there is a <b>92% probability</b> of encountering more 500 errors in the next <b>30 minutes</b>.</div>"] },
    { source: "PaymentGateway", error: "Transaction timeout error encountered", response: ["<b>Analyzing failure patterns...</b>", "Transaction timeout errors have increased by <b>30%</b> in the last 24 hours.", "Historical data suggests a strong correlation with <b>payment processor delays</b>.", "<div class='highlight-box'><b>Genix AI model predicts that</b><br><br>If API latency remains above 2s, there is a <b>78%</b> chance of continued <b>failures</b>.</div>"] }
];
function openChat() {
    chatContainer.style.display = "flex";
    chatBubble.style.display = "none";
}

function closeChat() {
    if (chatContainer.style.display === "none") {
        chatContainer.style.display = "flex";
        chatBubble.style.display = "none";
    } else {
        chatContainer.style.display = "none";
        chatBubble.style.display = "block";
    }
}



const socket = new WebSocket("ws://localhost:8000/ws");
const searchSocket = new WebSocket("ws://localhost:8000/ws/search");

socket.onopen = () => {
    console.log("WebSocket connected.");
};

socket.onmessage = (event) => {

    try {
    const data = JSON.parse(event.data);
    console.log("📡 New data received:", data);

    openChat(); // Ensure this function is working
    const errorBox = document.createElement('span');
          errorBox.className = "inner-errorBox";
    // Display error alert
    const alertMessage = `
        <div class='chat-message' style="background-color: white;">
    <span class='timestamp'>${new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
    <span class='inner-logo'><img src="/static/images/sgx logo.png" alt="sgx log" height="10px" width="10px"></span><span id="inner-logo-text">Genix Support</span><br><br>
    Source: ${data.source}<br>
    <div class='error-box'>
        Error: '${data.error_description}'
    </div>
</div>`;

    errorBox.innerHTML = alertMessage;
    chatBox.appendChild(errorBox);
    setTimeout(() => startAnalysis(data.response), 1000);

} catch (error) {
    console.error("Error processing WebSocket message:", error);
}
};

socket.onclose = () => {
    console.log("WebSocket disconnected.");
};






function startAnalysis(responseSteps) {
    const responseBox = document.createElement("div");
    responseBox.className = "response-box";
    responseBox.innerHTML = `<span class='timestamp'>${new Date().toLocaleString()}</span>`;
    responseBox.innerHTML = `<span class='inner-logo'><img src="static/images/sgx logo.png" alt="sgx log" height="10px" width="10px"></span><span id="inner-logo-text">Genix Support</span><br><br>`;

    const feedbackicons = document.createElement("div");
    feedbackicons.className = "chat-icons";
    feedbackicons.innerHTML = `<span class="icon"><i class="fa fa-thumbs-o-up" style="color:gray"></i></span>
    <span class="icon"><i class="fa fa-thumbs-o-down" style="color:gray"></i></span>`;
    chatBox.appendChild(responseBox);
    startTypingIndicator(responseBox);


    function streamText(content) {
        let index = 0;

        // Use DOMParser to safely extract elements and text
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');

        // Convert NodeList to an array and flatten all child elements and text nodes
        const nodes = Array.from(doc.body.childNodes);

        // Function to append HTML progressively
        const interval = setInterval(() => {
            if (index < nodes.length) {
                const node = nodes[index];

                // Append elements or text while preserving structure
                if (node.nodeType === Node.ELEMENT_NODE) {
                    responseBox.appendChild(node.cloneNode(true));  // Clone to retain original
                } else if (node.nodeType === Node.TEXT_NODE) {
                    responseBox.innerHTML += node.textContent;  // Append raw text
                }

                index++;
                chatBox.scrollTop = chatBox.scrollHeight;  // Ensure auto-scroll
            } else {
                // Append timestamp when done
                responseBox.innerHTML += `<span class='timestamp'>
                    ${new Date().toLocaleString('en-US', {
                        month: '2-digit', day: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: true
                    })}
                </span>`;

                // Stop typing indicator & cleanup
                stopTypingIndicator(responseBox);
                chatBox.scrollTop = chatBox.scrollHeight;  // Final scroll
                clearInterval(interval);  // Stop the interval
            }
        }, 100); // Adjust speed for smooth typing effect
    }

    streamText(responseSteps);

    }





function startTypingIndicator(container) {
    container.innerHTML += `<div class='typing-indicator'><span></span><span></span><span></span></div>`;
}
function maximizeChat() {
    isMaximized = !isMaximized;
    chatContainer.classList.toggle("maximized", isMaximized);
    const headerText = document.getElementById("header-text");
    const chatInputContainer = document.getElementById("chat-input-container");
    const maxAndMinIcons = document.getElementById("maximize-icon");
    const chatInput = document.getElementById("chat-input");
    if (isMaximized) {
        headerText.style.left = '-760px';
        // chatInput.style.position = 'absolute';
        chatInputContainer.style.width = '978px';
        chatInput.style.width = '920px';
        maxAndMinIcons.innerHTML = '<i class="fa fa-window-restore"></i>';
    } else {
        headerText.style.left = '-210px';
        chatInputContainer.style.width = '428px';
        chatInput.style.width = '370px';
        maxAndMinIcons.innerHTML = '🔳';
    }
}
function stopTypingIndicator(container) {
    const typingIndicator = container.querySelector(".typing-indicator");
    if (typingIndicator) typingIndicator.remove();
}


//Function to send user input (keyword) to WebSocket
function searchByKeyword() {
    const keywordInput = document.getElementById("chat-input").value.trim();

    if (keywordInput === "") {
        alert("Please enter a search term.");
        return;
    }

    if (searchSocket.readyState === WebSocket.OPEN) {
        console.log("Searching for:", keywordInput);
        searchSocket.send(keywordInput); // Send search keyword to backend
    } else {
        console.error("Search WebSocket not connected.");
    }
}

// Receive and display search results
searchSocket.onmessage = function (event) {
    try {
        let searchResults = JSON.parse(event.data);
        console.log("Search Results:", searchResults);

        if (!searchResults.results || searchResults.results.length === 0) {
            window.alert("No matching records found.");
            return;
        }

        if (searchResults.status === "success") {
            let promiseChain = Promise.resolve(); // Start with resolved promise

            searchResults.results.forEach(row => {
                promiseChain = promiseChain
                    .then(() => {
                        const errorBox = document.createElement('span');
                        errorBox.className = "inner-errorBox";

                        // Display error alert
                        const alertMessage = `
                            <div class='chat-message' style="background-color: white;">
                                <span class='timestamp'>${new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                <span class='inner-logo'><img src="/static/images/sgx logo.png" alt="sgx log" height="10px" width="10px"></span>
                                <span id="inner-logo-text">Genix Support</span><br><br>
                                Source: ${row.source}<br>
                                <div class='error-box'>
                                    Error: '${row.error_description}'
                                </div>
                            </div>`;

                        errorBox.innerHTML = alertMessage;
                        chatBox.appendChild(errorBox);

                        return new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
                    })
                    .then(() => startAnalysis(row.response)); // Call startAnalysis sequentially
            });
        } else {
            console.warn("No valid results found in response.");
            window.alert("No valid results found in response.");
        }
    } catch (error) {
        console.error("Error processing search WebSocket message:", error);
    }
};


