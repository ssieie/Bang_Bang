
class MySocket {
    constructor() {
        this.socket = new WebSocket("ws://127.0.0.1:8889");

        this.socket.onopen = function name(params) {
            console.log("WebSocket opened.");
        }
    }

    onopen() {
        console.log("WebSocket opened.");
    }
}

export default MySocket


// socket.onopen = function (event) {
//     console.log("WebSocket opened.");
//     socket.send("Hello, WebSocket!");
// };

// socket.onmessage = function (event) {
//     console.log("Received message: " + event.data);
// };

// socket.onclose = function (event) {
//     console.log("WebSocket closed.");
// };

// socket.onerror = function (event) {
//     console.log("WebSocket error.");
// };