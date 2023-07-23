class KeyBoardEvents {
    constructor() {

        document.addEventListener('keydown', (event) => {
            this.publish(`${event.key}_down`)
        });

        document.addEventListener('keyup', (event) => {
            this.publish(`${event.key}_up`)
        });

        this.events = {}
    }

    subscribe(evtName, fn) {
        if (!Reflect.has(this.events, evtName)) {
            this.events[evtName] = []
        }
        this.events[evtName].push(fn)
    }

    publish(evtName) {
        if (!this.events[evtName]) return
        for (const fn of this.events[evtName]) {
            fn()
        }
    }
}

export default new KeyBoardEvents()