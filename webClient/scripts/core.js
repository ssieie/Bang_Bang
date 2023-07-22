import Map from './map.js'
import Render from './render.js'
import { singletonGenerate } from './utils.js'

const GMap = singletonGenerate(Map)
const GRender = singletonGenerate(Render)

let RenderInstace = null

const instances = {
    Map: null,
}

function initMap(w, h, canvas) {
    instances.Map = new GMap(w, h, canvas)
}


function initRender(fps = 30) {
    RenderInstace = new GRender(fps, canvas)

    RenderInstace.run(instances)
}

const canvas = {
    cvs: null,
    pen: null
}
export function init(cvs, pen, w, h, fps) {
    canvas.cvs = cvs
    canvas.pen = pen

    canvas.cvs.width = w
    canvas.cvs.height = h
    canvas.cvs.style = `position: absolute;top: 50%;left: 50%;transform: translate(-50%,-50%);background-color:rgba(230,230,230,0)`
    document.body.insertBefore(canvas.cvs, null)

    initMap(w, h, canvas)

    initRender(fps)

}