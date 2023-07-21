class SocketEvents {
    constructor() {
        this.events = {}
    }

    /**
     * join 加入房间(自己),
     * joined 加入房间(别人)
     * join_err 加入房间错误
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