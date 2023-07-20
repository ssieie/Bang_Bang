class SocketEvents {
    constructor() {
        this.events = {}
    }

    /**
     * join 加入房间,
     * 2 ..
     */

    subscribe(evtName, fn) {
        if (!Reflect.has(this.events, evtName)) {
            this.events[evtName] = []
        }
        this.events[evtName].push(fn)
    }

    publish(evtName, msg) {
        if (!this.events[evtName]) return
        for (const fn of this.events[evtName]) {
            fn(msg)
        }
    }
}

export default new SocketEvents()