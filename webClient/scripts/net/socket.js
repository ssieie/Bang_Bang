import SocketEvents from '../utils/socketEvents.js'

class MySocket {

    constructor() {
        this.socket = new WebSocket("ws://127.0.0.1:8881");
        // this.socket = new WebSocket("ws://47.109.17.168:8881");

        this.socket.onopen = this.onopen
        this.socket.onmessage = this.onmessage
        this.socket.onclose = this.onclose
    }

    onopen() {
        console.log("WebSocket opened.");
    }

    onclose() {
        console.log("WebSocket closed.");
    }

    onmessage(event) {
        console.log("Received message: " + event.data);
        SocketEvents.publish('a', 'b')
    }

    sendMsg(msg) {
        this.socket.send(msg)
    }
}

export default new MySocket()
