import { loadImg, getRandomInt, arrChunk, getRandomFloat, singletonGenerate, getRandColorRange } from '../scripts/utils.js'


function getParabolaBaseA(x, y, vX, vY) {
    // y= a*(x-vX)^2-vY
    return (y - vY) / Math.pow(x - vX, 2)
}

class Start {
    constructor(pen, w) {
        this.$ = pen
        this.w = w
        this.x = getRandomInt(0, w)
        this.y = getRandomInt(0, 200)
        this.size = getRandomFloat(2, 4)
        this.speed = getRandomFloat(0.1, 0.5)
        this.color = getRandColorRange(200, 255)
    }

    move() {
        if (this.x <= 0) {
            this.x = getRandomInt(0, this.w)
            this.y = getRandomInt(0, 200)
            this.size = getRandomFloat(2, 4)
            this.speed = getRandomFloat(0.1, 1)
            this.color = getRandColorRange(230, 255)
        }
        this.x -= this.speed

        this.draw()
    }

    draw() {
        this.$.beginPath()
        this.$.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
        this.$.fillStyle = this.color.cS
        this.$.fill()
        this.$.closePath()
    }
}

class Weather {
    // 根据抛物线顶点公式 y = a(x - h)^2 + k
    // 已知y:-600,x:0,(h,k)顶点坐标为（500，-10）得到-600 = a(0 - 500)^2 - 10
    // 求得a：-0.0024 因为canvas坐标系跟正常坐标系的区别取0.0024
    constructor(cvs, pen, w) {
        this.w = w
        this.type = true // sun or moon
        this.vertex = [w / 2, 10] // 顶点

        this.a = getParabolaBaseA(0, 600, w / 2, 10)

        this.currentX = w
        this.currentY = -600

        this.duration = 30 * 1000 // s
        // 1s,33

        this.weatherChangeSpeed = 0.2

        this.$ = pen
        this.cvs = cvs

        this.startList = []
    }

    run(sun, moon) {
        const currentSchedule = this.currentX / this.w
        const s = (currentSchedule - 0.5) * 2
        if (this.type) {
            let color = 0
            color = 255 - Math.floor(Math.abs(s) * 127.5)
            this.$.fillStyle = `rgba(${color}, ${color}, ${color}, 1)`;
            this.$.fillRect(0, 0, this.cvs.width, this.cvs.height);
            this.$.drawImage(sun, this.currentX - 30, this.currentY - 15, 60, 60);
        } else {
            if (!this.startList.length) {
                for (let i = 0; i < getRandomInt(10, 30); i++) {
                    this.startList.push(new Start(this.$, this.w))
                }
            }

            let color = 0
            color = Math.floor(Math.abs(s) * 127.5)
            this.$.fillStyle = `rgba(${color}, ${color}, ${color}, 1)`;
            this.$.fillRect(0, 0, this.cvs.width, this.cvs.height);

            for (let i = 0, len = this.startList.length; i < len; i++) {
                this.startList[i].move()
            }

            this.$.drawImage(moon, this.currentX - 30, this.currentY - 15, 60, 60);
        }

        if (this.currentX > 0) {
            // y = a(x - h)^2 + k
            // y = 0.0024(1000-500)^2+0
            // y = 600
            this.currentX -= this.weatherChangeSpeed
            this.currentY = this.a * Math.pow((this.currentX - this.vertex[0]), 2) + this.vertex[1]
        } else {
            this.type = !this.type
            this.currentX = this.w
        }

        // console.log();
    }

}

const GWeather = singletonGenerate(Weather)

class Map {
    constructor(w, h, canvas, mapData) {
        this.w = w // 1000
        this.h = h // 600

        this.$ = canvas.pen
        this.cvs = canvas.cvs

        this.blockW = 20

        this.floorBlock = []
        this.cloudBlock = []

        this.imgs = {}

        this.init(mapData)

    }

    async init(mapData) {
        await this.loadAssets()

        this.generateFloor(mapData)

        this.gennerateCloud()

        this.weather = new GWeather(this.cvs, this.$, this.w)
    }

    generateFloor(mapData) {
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
        // for (let i = 0; i < 3; i++) {
        //     let numbers = []
        //     for (let i = 0; i < 4; i++) {
        //         const num = getRandomInt(1, 9)
        //         if (numbers.includes(num)) {
        //             i--
        //         } else {
        //             numbers.push(num)
        //         }
        //     }
        //     numbers = arrChunk(numbers.sort(), 2)

        //     for (const num of numbers) {
        //         for (let i = num[0] * 100; i <= num[1] * 100; i += 20) {
        //             for (const floor of this.floorBlock) {
        //                 if (floor.x === i) {
        //                     floor.y = floor.y - 20
        //                 }
        //             }
        //             this.floorBlock.push({
        //                 x: i,
        //                 y: bY,
        //                 type: 1, // 0真实地板，1辅助地板
        //                 img: this.imgs['Grass.png'],
        //             })
        //         }
        //     }

        // }

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
            // this.$.drawImage(floorPoint.img, floorPoint.x, floorPoint.y, floorPoint.img.width / 3, floorPoint.img.height / (floorPoint.type === 1 ? 3 : 2.5));
            this.$.drawImage(floorPoint.img, floorPoint.x, floorPoint.y, 20, 20);
        }
    }

    async loadAssets() {
        const imgList = ["./resource/GrassNGrass.png", "./resource/Grass.png", "./resource/Sky2.png", "./resource/Sky.png", "./resource/sun.png", "./resource/moon.png"]
        const imgs = await loadImg(imgList)
        for (const img of imgs) {
            this.imgs[img.name] = img.uri
        }
    }


    draw() {
        this.weather && this.weather.run(this.imgs['sun.png'], this.imgs['moon.png'])

        this.stickFloor()

        this.floatCloud()
        this.stickCloud()

    }
}

export default Map