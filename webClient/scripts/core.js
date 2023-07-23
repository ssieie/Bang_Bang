import Map from './map.js'
import Player from './player/player.js'
import Render from './render.js'
import { singletonGenerate } from './utils.js'

const GMap = singletonGenerate(Map)
const GPlayer = singletonGenerate(Player)
const GRender = singletonGenerate(Render)

let RenderInstace = null

const instances = {
    Map: null,
    Player: null
}

function initMap(w, h, canvas, mapData) {
    instances.Map = new GMap(w, h, canvas, mapData)
}

function initPlayer(w, h, canvas, data) {
    instances.Player = new GPlayer(w, h, canvas, data)
}


function initRender(fps = 30) {
    RenderInstace = new GRender(fps, canvas)

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