import { getRandomInt, arrChunk, getRandomFloat } from '../scripts/utils.js'

function clearFileName(params = '') {
    return params.split('/').pop()
}


class Block {

}

// const floor={

// }

class Map {
    constructor(w, h, canvas) {
        this.w = w // 1000
        this.h = h // 600

        this.$ = canvas.pen

        this.blockW = 20

        this.floorBlock = []
        this.cloudBlock = []

        this.imgs = {}

        this.init()

    }

    async init() {
        await this.loadAssets()

        this.generateFloor()

        this.gennerateCloud()
    }

    generateFloor() {
        // 基础底板
        const bY = this.h - this.blockW
        for (let i = 0; i < this.w; i += this.blockW) {
            this.floorBlock.push({
                x: i,
                y: bY,
                type: 0, // 0真实地板，1辅助地板
                img: this.imgs['GrassNGrass.png'],
            })
        }

        // 隆起地板
        for (let i = 0; i < 3; i++) {
            let numbers = []
            for (let i = 0; i < 4; i++) {
                const num = getRandomInt(1, 9)
                if (numbers.includes(num)) {
                    i--
                } else {
                    numbers.push(num)
                }
            }
            numbers = arrChunk(numbers.sort(), 2)

            for (const num of numbers) {
                for (let i = num[0] * 100; i <= num[1] * 100; i += 20) {
                    for (const floor of this.floorBlock) {
                        if (floor.x === i) {
                            floor.y = floor.y - 20
                        }
                    }
                    this.floorBlock.push({
                        x: i,
                        y: bY,
                        type: 1, // 0真实地板，1辅助地板
                        img: this.imgs['Grass.png'],
                    })
                }
            }

        }

    }

    gennerateCloud() {
        for (let i = 0; i < 5; i++) {
            const y = getRandomInt(10, 250)
            const x = getRandomInt(10, 990)

            this.cloudBlock.push({
                x, y,
                speed: getRandomFloat(0.08, 0.8),
                scale: getRandomFloat(1.5, 3),
                img: this.imgs[(getRandomInt(0, 1) === 0 ? 'Sky2.png' : 'Sky.png')],
            })
        }
    }

    floatCloud() {
        for (const it of this.cloudBlock) {
            if (it.x + it.img.width < 0) {
                it.x = 1000
                it.speed = getRandomFloat(0.08, 0.8),
                    it.y = getRandomInt(10, 300)
                it.img = this.imgs[(getRandomInt(0, 1) === 0 ? 'Sky2.png' : 'Sky.png')]
                it.scale = getRandomFloat(1.5, 3)
            }
            it.x -= it.speed
        }
    }


    stickCloud() {
        for (const cloudPoint of this.cloudBlock) {
            this.$.drawImage(cloudPoint.img, cloudPoint.x, cloudPoint.y, cloudPoint.img.width / cloudPoint.scale, cloudPoint.img.height / cloudPoint.scale);
        }
    }

    stickFloor() {
        for (const floorPoint of this.floorBlock) {
            this.$.drawImage(floorPoint.img, floorPoint.x, floorPoint.y, floorPoint.img.width / 3, floorPoint.img.height / (floorPoint.type === 1 ? 3 : 2.5));
        }
    }


    async loadAssets() {
        const imgs = await this.loadImg()
        for (const img of imgs) {
            this.imgs[img.name] = img.uri
        }
    }

    loadImg() {
        const loadTask = []

        for (const url of ["./resource/GrassNGrass.png", "./resource/Grass.png", "./resource/Sky2.png", "./resource/Sky.png"]) {
            loadTask.push(
                new Promise(res => {
                    const img = new Image();
                    img.src = url;
                    img.onload = function () {
                        res({
                            name: clearFileName(url),
                            uri: img
                        })
                    };
                })
            )
        }

        return Promise.all(loadTask)
    }

    draw() {
        this.stickFloor()

        this.floatCloud()
        this.stickCloud()
    }
}

export default Map