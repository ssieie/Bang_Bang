import Map from './map.js'
import Player from './player/player.js'
import Render from './render.js'
// import { singletonGenerate } from './utils.js'

let RenderInstace = null

const instances = {
    Map: null,
    Player: null
}

function initMap(w, h, canvas, mapData) {
    instances.Map = new Map(w, h, canvas, mapData)
}

function initPlayer(w, h, canvas, data) {
    instances.Player = new Player(w, h, canvas, data)
}


function initRender(fps = 30) {
    RenderInstace = new Render(fps, canvas)

    RenderInstace.run(instances)
}

const canvas = {
    cvs: null,
    pen: null
}
export function init(cvs, pen, w, h, fps, target, data) {
    canvas.cvs = cvs
    canvas.pen = pen

    canvas.cvs.width = w
    canvas.cvs.height = h
    canvas.cvs.style = `background-color:rgba(230,230,230,0)`
    target.appendChild(canvas.cvs)

    initMap(w, h, canvas, data.map)
    initPlayer(w, h, canvas, data.player)

    initRender(fps)

}

export function exit() {
    RenderInstace.clear()
    RenderInstace = null
    instances.Map = null
    instances.Player = null
}