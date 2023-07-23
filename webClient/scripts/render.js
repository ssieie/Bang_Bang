
class Render {
    constructor(fps, context) {

        this.cvs = context.cvs
        this.$ = context.pen

        this.fps = fps

        this.lastRenderTime = +new Date()
        this.fpsInterval = 1000 / this.fps
    }

    run(instances) {

        window.requestAnimationFrame(this.run.bind(this, instances))

        let renderTime = +new Date()
        let elapsed = renderTime - this.lastRenderTime
        if (elapsed > this.fpsInterval) {
            this.lastRenderTime = renderTime - (elapsed % this.fpsInterval)

            this.$.clearRect(0, 0, this.cvs.width, this.cvs.height)

            for (const key in instances) {
                instances[key].draw()
            }
        }
    }
}

export default Render