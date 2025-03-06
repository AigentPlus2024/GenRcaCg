const chatContainer = document.getElementById("chat-container");
const chatBubble = document.getElementById("chat-bubble");
const chatBox = document.getElementById("chat-box");
//const innerChatbox = document.getElementById("inner-chatbox");
let processingAlert = false;
let errorIndex = 0;
let isMaximized = false;
// const errorCollection = [
//     { source: "OrderProcessingService", error: "Server failed to fulfill the request with status code 500", response: ["<b>Checking Recent Trends...</b>", "This error has occurred 5 times in the last hour, with a spike in failure rates.", "Looking at historical data, this type of failure is <b>85%</b> correlated with <b>database timeouts</b>.", "<b>Genix AI model predicts that...</b>", "If the database response time exceeds 3s, there is a <b>92% probability</b> of encountering more 500 errors in the next <b>30 minutes</b>."] },
//     { source: "PaymentGateway", error: "Transaction timeout error encountered", response: ["<b>Analyzing failure patterns...</b>", "Transaction timeout errors have <b>increased by 30%</b> in the <b>last 24 hours</b>.", "Historical data suggests a strong correlation with <b>payment processor delays</b>.", "<b>Genix AI model predicts that...</b>", "If API latency remains above 2s, there is a <b>78%</b> chance of continued <b>failures</b>."] }
// ];
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

//function showErrorAlert() {
//    if (processingAlert) return;
//    processingAlert = true;
//    openChat();
//
//    const errorData = errorCollection[errorIndex];
//    errorIndex = (errorIndex + 1) % errorCollection.length;
//    const alertId = `alert-${Date.now()}`;
//    const alertMessage = `<div class='chat-message' style="background-color: white;">
//        <span class='timestamp'>${new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
//        <span class='inner-logo'><img src="/static/images/sgx logo.png" alt="sgx log" height="10px" width="10px"></span><span id="inner-logo-text">Genix Support</span><br><br>
//        Source: ${errorData.source}<br>
//        <div class='error-box'>
//            Error: '${errorData.error}'
//        </div>
//    </div>`;
//
//    chatBox.innerHTML += alertMessage;
//    setTimeout(() => startAnalysis(errorData.response), 1000);
//}
//
//function startAnalysis(responseSteps) {
//    const responseBox = document.createElement("div");
//    responseBox.className = "response-box";
//    responseBox.innerHTML = `<span class='timestamp'>${new Date().toLocaleString()}</span>`;
//    responseBox.innerHTML = `<span class='inner-logo'><img src="static/images/sgx logo.png" alt="sgx log" height="10px" width="10px"></span><span id="inner-logo-text">Genix Support</span><br><br>`;
//    // `<div class="chat-icons">
//    //     <span class="icon"><i class="fa fa-thumbs-o-up" style="font-size:54px"></i></span>
//    //     <span class="icon"><i class="fa fa-thumbs-o-down" style="font-size:24px"></i></span>
//    // </div>`
//    const feedbackicons = document.createElement("div");
//    feedbackicons.className = "chat-icons";
//    feedbackicons.innerHTML = `<span class="icon"><i class="fa fa-thumbs-o-up" style="color:gray"></i></span>
//    <span class="icon"><i class="fa fa-thumbs-o-down" style="color:gray"></i></span>`;
//    // responseBox.appendChild(feedbackicons);
//    chatBox.appendChild(responseBox);
//    startTypingIndicator(responseBox);
//
//    let index = 0;
//    function streamResponse() {
//        if (index < responseSteps.length) {
//            responseBox.innerHTML += `<p>${responseSteps[index]}</p>`;
//            index++;
//            setTimeout(streamResponse, 2000);
//        } else {
//            responseBox.innerHTML += `<span class='timestamp'>${new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>`;
//            responseBox.appendChild(feedbackicons);
//            stopTypingIndicator(responseBox);
//            processingAlert = false;
//            setTimeout(showErrorAlert, 5000);
//        }
//    }
//    streamResponse();
//    }

//
//
//
//
//function startTypingIndicator(container) {
//    container.innerHTML += `<div class='typing-indicator'><span></span><span></span><span></span></div>`;
//}
//
//function stopTypingIndicator(container) {
//    const typingIndicator = container.querySelector(".typing-indicator");
//    if (typingIndicator) typingIndicator.remove();
//}
//
//    setTimeout(showErrorAlert, 3000);








const socket = new WebSocket("ws://localhost:8000/ws");

    socket.onopen = () => {
        console.log("✅ WebSocket connected.");
    };

    socket.onmessage = (event) => {

        try {
        const data = JSON.parse(event.data);
        console.log("📡 New data received:", data);

        openChat(); // Ensure this function is working
//        const chatBox = document.getElementById("chat-box");
//        const innerChatbox = document.getElementById("inner-chatbox");
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
        console.error("❌ Error processing WebSocket message:", error);
    }
    };

    socket.onclose = () => {
        console.log("❌ WebSocket disconnected.");
    };



function startAnalysis(responseSteps) {
    const responseBox = document.createElement("div");
    responseBox.className = "response-box";
    responseBox.innerHTML = `<span class='timestamp'>${new Date().toLocaleString()}</span>`;
    responseBox.innerHTML = `<span class='inner-logo'><img src="static/images/sgx logo.png" alt="sgx log" height="10px" width="10px"></span><span id="inner-logo-text">Genix Support</span><br><br>`;
    // `<div class="chat-icons">
    //     <span class="icon"><i class="fa fa-thumbs-o-up" style="font-size:54px"></i></span>
    //     <span class="icon"><i class="fa fa-thumbs-o-down" style="font-size:24px"></i></span>
    // </div>`
    const feedbackicons = document.createElement("div");
    feedbackicons.className = "chat-icons";
    feedbackicons.innerHTML = `<span class="icon"><i class="fa fa-thumbs-o-up" style="color:gray"></i></span>
    <span class="icon"><i class="fa fa-thumbs-o-down" style="color:gray"></i></span>`;
    // responseBox.appendChild(feedbackicons);
    chatBox.appendChild(responseBox);
    startTypingIndicator(responseBox);
//    responseBox.innerHTML = responseSteps;


    function streamText(content) {
    let index = 0;

    // Regex to split while keeping full <div> blocks intact
    const pattern = /(<div[^>]*>[\s\S]*?<\/div>)|(<[^>]+>[^<]*<\/[^>]+>)|(<[^>]+>)|([^<>]+)/g;
    const splitContent = content.match(pattern) || [];

    // Function to append HTML progressively
    const interval = setInterval(() => {
        if (index < splitContent.length) {
            responseBox.innerHTML += splitContent[index];  // Append the whole chunk
            index++;
        } else {
            responseBox.innerHTML += `<span class='timestamp'>${new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>`;
            responseBox.appendChild(feedbackicons);
            stopTypingIndicator(responseBox);
            chatBox.scrollTop = chatBox.scrollHeight;
            clearInterval(interval);  // Stop when done
        }
    }, 100); // Adjust speed for typing effect
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
    const chatInput = document.getElementById("chat-input-container");
    const maxAndMinIcons = document.getElementById("maximize-icon");
    if (isMaximized) {
        headerText.style.left = '-760px';
        // chatInput.style.position = 'absolute';
        chatInput.style.width = '950px';
        maxAndMinIcons.innerHTML = '<i class="fa fa-window-restore"></i>';
    } else {
        headerText.style.left = '-210px';
        chatInput.style.width = '400px';
        maxAndMinIcons.innerHTML = '🔳';
    }
}
function stopTypingIndicator(container) {
    const typingIndicator = container.querySelector(".typing-indicator");
    if (typingIndicator) typingIndicator.remove();
}

