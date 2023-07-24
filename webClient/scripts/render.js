
class Render {
    constructor(fps, context) {

        this.cvs = context.cvs
        this.$ = context.pen

        this.fps = fps

        this.lastRenderTime = +new Date()
        this.fpsInterval = 1000 / this.fps

        this.sendSpeed = 1 // 
        this.lastSendTime = +new Date()
        this.snedInterval = 1000 / this.sendSpeed
    }

    run(instances) {

        this.frame = window.requestAnimationFrame(this.run.bind(this, instances))

        let renderTime = +new Date()
        let elapsed = renderTime - this.lastRenderTime

        let sendElapsed = renderTime - this.lastSendTime
        if (sendElapsed > this.snedInterval) {
            this.lastSendTime = renderTime - (sendElapsed % this.snedInterval)

            for (const key in instances) {
                if (Reflect.has(instances[key], 'behaviorSender')) {
                    instances[key].behaviorSender()
                }
            }
        }

        if (elapsed > this.fpsInterval) {
            this.lastRenderTime = renderTime - (elapsed % this.fpsInterval)

            this.$.clearRect(0, 0, this.cvs.width, this.cvs.height)

            for (const key in instances) {
                instances[key].draw()
            }
        }
    }

    clear() {
        window.cancelAnimationFrame(this.frame)
    }
}

export default Render