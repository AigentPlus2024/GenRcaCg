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
//    chatBubble.style.display = "none";
}

function closeChat() {
    if (chatContainer.style.display === "none") {
        chatContainer.style.display = "flex";
//        chatBubble.style.display = "none";
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
        console.log("New data received:", data);

        openChat(); // Ensure this function is working
        const errorBox = document.createElement('span');
        errorBox.className = "inner-errorBox";

        // Determine the button text based on the source value
        let buttonText = "";
        if (data.source.includes("Health")) {
            buttonText = "<button id='health-btn'>Healthy</button><br><br>";
        } else if (data.source.includes("Incident")) {
            buttonText = "<button id='alert-btn'>Alert</button><br><br>";
        }

        let sourceStyle = null;
        if (data.search_keyword === null || data.search_keyword.trim() === ""){
            sourceStyle =`Source: ${data.source}`
        }else{
            sourceStyle =`<span style="font-weight: 649; color: #1B1C1F;">${data.source}</span>`
        }

        let errorBoxStyle = null;
        if (data.search_keyword === null || data.search_keyword.trim() === ""){
            errorBoxStyle = `<div class='error-box'>${data.error_description}</div>`
        }else {
            errorBoxStyle = `<div class='error-box-keywords'>${data.error_description}</div>`
        }



        // Display error alert
        const alertMessage = `
            <div class='chat-message' style="background-color: white;">
                <span class='timestamp'>${new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                <span class='inner-logo'><img src="/static/images/sgx logo.png" alt="sgx log" height="10px" width="10px"></span>
                <span id="inner-logo-text">Genix Support</span><br><br>
                ${sourceStyle}
                ${buttonText}
                ${errorBoxStyle}
                <div class='analysis-box' id="analysis-box-${data.id}"></div>
            </div>`;

        errorBox.innerHTML = alertMessage;
        chatBox.appendChild(errorBox);

        //  Add the if-else condition here
        setTimeout(() => {
            const analysisBox = document.getElementById(`analysis-box-${data.id}`);
            if (data.search_keyword === null || data.search_keyword.trim() === "") {
                // If search_keyword is null or empty, call startAnalysisWithKeyword
                startAnalysis(data.response);
            } else {
                // Otherwise, call startAnalysis normally
                startAnalysisWithKeyword(data.response, analysisBox);
            }
        }, 1000);

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


async function startAnalysisWithKeyword(responseSteps, analysisBox) {
//    const responseBox = document.createElement("div");
//    responseBox.className = "response-box";
//    responseBox.innerHTML = `<span class='timestamp'>${new Date().toLocaleString()}</span>`;
//    responseBox.innerHTML = `<span class='inner-logo'><img src="static/images/sgx logo.png" alt="sgx logo" height="10px" width="10px"></span><span id="inner-logo-text">Genix Support</span><br><br>`;
//
//    const feedbackicons = document.createElement("div");
//    feedbackicons.className = "chat-icons";
//    feedbackicons.innerHTML = `<span class="icon"><i class="fa fa-thumbs-o-up" style="color:gray"></i></span>
//    <span class="icon"><i class="fa fa-thumbs-o-down" style="color:gray"></i></span>`;
//    chatBox.appendChild(responseBox);
    startTypingIndicator(analysisBox);

    async function streamText(content) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');

        // Extract images separately
        const images = doc.querySelectorAll("img"); // Get all images
        // Remove images from the document so they won't be added directly to the responseBox
        images.forEach(img => img.remove());

        // Convert NodeList to an array of child nodes and text
        const nodes = Array.from(doc.body.childNodes);

        // Streaming the text progressively
        for (const node of nodes) {
            // Append elements or text while preserving structure
            if (node.nodeType === Node.ELEMENT_NODE) {
                analysisBox.appendChild(node.cloneNode(true));  // Clone to retain original elements
            } else if (node.nodeType === Node.TEXT_NODE) {
                analysisBox.innerHTML += node.textContent;  // Append raw text
            }

            chatBox.scrollTop = chatBox.scrollHeight;  // Ensure auto-scroll

            // Add a small delay for smooth text typing effect
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Append timestamp when done
//        responseBox.innerHTML += `<span class='timestamp'>
//            ${new Date().toLocaleString('en-US', {
//                month: '2-digit', day: '2-digit', year: 'numeric',
//                hour: '2-digit', minute: '2-digit', hour12: true
//            })}
//        </span>`;

        // Stop typing indicator & cleanup
        stopTypingIndicator(analysisBox);
        chatBox.scrollTop = chatBox.scrollHeight;  // Final scroll

        // Now append images after text streaming is done
        await appendImages(images);
    }

    // Function to append images to chatBox after text has finished streaming
    function appendImages(images) {
        return new Promise((resolve) => {
            if (images.length > 0) {
                images.forEach(img => {
                    const wrapper = document.createElement("div"); // Create a wrapper div
                    wrapper.style.textAlign = "center"; // Center the image
                    wrapper.style.marginBottom = "10px"; // Add spacing between images

                    img.style.maxWidth = "100%"; // Ensure responsiveness

                    // Clone and append image inside wrapper
                    wrapper.appendChild(img.cloneNode(true)); // Clone to avoid modifying the original
                    chatBox.appendChild(wrapper); // Append to chatBox
                });
            }
            resolve(); // Resolve the promise after images are appended
        });
    }

    // Start streaming the text and images
    await streamText(responseSteps);
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
        maxAndMinIcons.innerHTML = '<i class="fa fa-square-o" style="font-size:16px"></i>';

    }
}

// Ensure refreshChat is defined globally
window.refreshChat = function () {
    console.log("Refreshing Chat UI...");
    const chatBox = document.getElementById("chat-box");
    if (!chatBox) {
        console.error("chatBox element not found!");
        return;
    }

    // Clear all child nodes from chatBox
    while (chatBox.firstChild) {
        chatBox.removeChild(chatBox.firstChild);
    }

    console.log("Chat UI cleared successfully!");
};

function stopTypingIndicator(container) {
    const typingIndicator = container.querySelector(".typing-indicator");
    if (typingIndicator) typingIndicator.remove();
}


document.addEventListener("DOMContentLoaded", function () {
    const inputBox = document.getElementById("chat-input");
    const sendButton = document.getElementById("send-icon"); // Send button is now a span

    // Function to send user input to WebSocket
    function searchByKeyword() {
        const keywordInput = inputBox.value.trim();

        if (keywordInput === "") {
            alert("Please enter a search term.");
            return;
        }

        // Assuming WebSocket is open, send the message (you need to ensure WebSocket is properly initialized)
        console.log("Searching for:", keywordInput);
        // If WebSocket is ready, send it to the backend
        if (searchSocket && searchSocket.readyState === WebSocket.OPEN) {
            searchSocket.send(keywordInput); // Send the search term to backend
        } else {
            console.error("WebSocket not connected.");
        }

        inputBox.value = ""; // Clear input after sending
    }

    // Event listener for button click (send button)
    sendButton.addEventListener("click", function() {
        console.log("Button clicked!"); // Debug log
        searchByKeyword();
    });

    // Event listener for Enter key
    inputBox.addEventListener("keydown", function(event) {
        console.log("Key pressed:", event.key); // Debug log
        if (event.key === "Enter") {
            event.preventDefault(); // Prevent form submission
            searchByKeyword(); // Trigger search on Enter key
        }
    });

    // Ensure input box is focused to test event
    inputBox.focus();
});



searchSocket.onmessage = function (event) {
    try {
        let searchResults = JSON.parse(event.data);
        console.log("Search Results:", searchResults);

        if (!searchResults.results || searchResults.results.length === 0) {
            return; // No matching records found
        }

        if (searchResults.status === "success") {
            let promiseChain = Promise.resolve(); // Start with resolved promise

            searchResults.results.forEach(row => {
                // Declare uniqueId before using it in promise chain
                const uniqueId = `${row.id}-${Date.now()}`; // Unique id for each analysis box

                promiseChain = promiseChain
                    .then(() => {
                        const errorBox = document.createElement("span");
                        errorBox.className = "inner-errorBox";

                        // Determine button text based on source value
                        let buttonText = "";
                        if (row.source.includes("Health")) {
                            buttonText = "<button id='health-btn'>Healthy</button>";
                        } else if (row.source.includes("Incident")) {
                            buttonText = "<button id='alert-btn'>Alert</button>";
                        }

                        // Apply style based on search_keyword
                        let errorBoxStyle = null;
                        if (row.search_keyword === null || row.search_keyword.trim() === "") {
                            errorBoxStyle = `<div class='error-box'>${row.error_description}</div>`;
                        } else {
                            errorBoxStyle = `<div class='error-box-keywords'>${row.error_description}</div>`;
                        }

                        // Display error alert with unique analysis box id
                        const alertMessage = `
                            <div class='chat-message' style="background-color: white;">
                                <span class='timestamp'>${new Date().toLocaleString('en-US', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                })}</span>
                                <span class='inner-logo'><img src="/static/images/sgx logo.png" alt="sgx log" height="10px" width="10px"></span>
                                <span id="inner-logo-text">Genix Support</span><br><br>
                                <b>${row.source}</b>
                                ${buttonText}<br><br>
                                ${errorBoxStyle}
                                <div class='analysis-box' id="analysis-box-${uniqueId}"></div> <!-- Unique analysis box -->
                            </div>`;

                        errorBox.innerHTML = alertMessage;
                        chatBox.appendChild(errorBox);

                        return new Promise(resolve => setTimeout(resolve, 1000)); // Delay for 1s
                    })
                    .then(() => {
                        // Corrected: Get the unique analysis box after declaring uniqueId
                        const analysisBox = document.getElementById(`analysis-box-${uniqueId}`);

                        if (row.search_keyword === null || row.search_keyword.trim() === "") {
                            // Call startAnalysis for plain responses
                            startAnalysis(row.response);
                        } else {
                            // Call startAnalysisWithKeyword for keyword-based responses
                            startAnalysisWithKeyword(row.response, analysisBox);
                        }
                    });
            });
        } else {
            console.warn("No valid results found in response.");
        }
    } catch (error) {
        console.error("Error processing search WebSocket message:", error);
    }
};



