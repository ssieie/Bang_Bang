
import { loadImg, throttle } from "../utils.js"
import keyboardEvents from "../utils/keyboardEvents.js"

class Play {
    constructor(x, y, isSelf, lOrR, assets, cvs, pen) {
        this.speed = 4.5
        this.currentX = x
        this.currentY = y
        this.basicY = y
        this.isSelf = isSelf
        this.assets = assets

        this.cvs = cvs
        this.$ = pen

        this.lOrR = lOrR === 1 ? 'right' : 'left'

        this.life = 100

        this.moveCommand = this.stop // stop:静止

        this.init()
    }
    init() {
        this.leftStep = 11
        this.rightStep = 1

        this.jumpIng = false
        this.jumpFlag = true
        this.jumpH = 0
        this.jumpMax = 160
    }
    stop() {
        const img = this.lOrR === 'right' ? this.assets['1.png'] : this.assets['11.png']
        // console.log(img);
        this.$.drawImage(img, this.currentX, this.currentY, PLAYER_W, PLAYER_H)
        this.lifeLayer()
        this.nameLayer()
    }
    moveLeft() {
        this.lOrR = 'left'


        const img = this.assets[`${this.leftStep}.png`]

        this.$.drawImage(img, this.currentX, this.currentY, PLAYER_W, PLAYER_H)

        if (this.currentX > 0) {
            this.currentX -= this.speed
        }
        this.lifeLayer()
        this.nameLayer()
    }
    moveRight() {
        this.lOrR = 'right'

        const img = this.assets[`${this.rightStep}.png`]

        this.$.drawImage(img, this.currentX, this.currentY, PLAYER_W, PLAYER_H)

        if (this.currentX < this.cvs.width - PLAYER_W) {
            this.currentX += this.speed
        }
        this.lifeLayer()
        this.nameLayer()
    }
    jumpListen() {
        if (this.jumpIng) {
            if (this.jumpH > this.jumpMax) {
                this.jumpFlag = false
            }
            if (!this.jumpFlag && (this.currentY + this.speed >= this.basicY)) {
                this.jumpIng = false
                this.jumpFlag = true
                this.jumpH = 0
                this.currentY = this.basicY
                return
            }
            if (this.jumpFlag) {
                this.currentY -= this.speed * (1 - this.jumpH / this.jumpMax) * 0.9 + 2.1
            } else {
                this.currentY += this.speed * (this.jumpH / this.jumpMax) + 1
            }

            this.jumpH += this.speed
        }
    }
    lifeLayer() {
        const posX = this.currentX
        const posY = this.currentY - 20
        this.$.strokeRect(posX, posY, PLAYER_W, 10);

        this.$.fillStyle = '#ff0000'
        this.$.fillRect(posX + 1, posY + 1, (PLAYER_W - 1) * (this.life / 100), 9);
    }
    nameLayer() {
        this.$.font = "15px Hanalei Fill";
        this.$.fillStyle = '#0000ff'
        this.$.fillText(this.isSelf ? "Player1" : 'Player2', this.currentX, this.currentY - 30);
    }
}

const PLAYER_W = 50
const PLAYER_H = 64
class Player {
    constructor(w, h, canvas, playerData) {
        console.log(playerData);

        this.playerData = playerData

        this.w = w
        this.h = h // 600

        this.playerFlag = 1 // p1 or p2

        this.$ = canvas.pen
        this.cvs = canvas.cvs

        this.player1Imgs = {}
        this.player2Imgs = {}

        this.playerMap = {}

        this.init()
    }

    async init() {
        await this.loadAssets()

        this.loadKeyboardListener()

        this.loadPlayer()
    }

    loadPlayer() {
        this.playerMap['player1'] = new Play(30, this.h - PLAYER_H - 20, this.playerFlag === 1, this.playerFlag, this.player1Imgs, this.cvs, this.$)
        this.playerMap['player2'] = new Play(this.w - 30 - PLAYER_W, this.h - PLAYER_H - 20, this.playerFlag === 2, this.playerFlag, this.player2Imgs, this.cvs, this.$)
    }

    async loadAssets() {
        const player1 = ["./resource/player1/1.png", "./resource/player1/2.png", "./resource/player1/3.png", "./resource/player1/11.png", "./resource/player1/22.png", "./resource/player1/33.png"]
        const player2 = ["./resource/player2/1.png", "./resource/player2/2.png", "./resource/player2/3.png", "./resource/player2/11.png", "./resource/player2/22.png", "./resource/player2/33.png"]
        const imgs1 = await loadImg(player1)
        const imgs2 = await loadImg(player2)
        for (const img of imgs1) {
            this.player1Imgs[img.name] = img.uri
        }
        for (const img of imgs2) {
            this.player2Imgs[img.name] = img.uri
        }
    }

    loadKeyboardListener() {
        let dIsDown = false
        let lIsDown = false
        let moveLeftTimer = null
        let moveRightTimer = null
        keyboardEvents.subscribe('d_down', () => {
            if (!dIsDown) {
                const self = this.getSelfPlayer()
                self.moveCommand = self.moveRight

                moveRightTimer = setInterval(() => {
                    if (self.rightStep === 3) {
                        self.rightStep = 1
                    } else {
                        self.rightStep += 1
                    }
                }, 100);
            }
            dIsDown = true
        })
        keyboardEvents.subscribe('d_up', () => {
            dIsDown = false
            const self = this.getSelfPlayer()
            if (!moveLeftTimer) {
                self.moveCommand = self.stop
            }
            if (moveRightTimer) {
                clearInterval(moveRightTimer)
                moveRightTimer = null
            }
        })
        keyboardEvents.subscribe('a_down', () => {
            if (!lIsDown) {
                const self = this.getSelfPlayer()
                self.moveCommand = self.moveLeft
                moveLeftTimer = setInterval(() => {
                    if (self.leftStep === 33) {
                        self.leftStep = 11
                    } else {
                        self.leftStep += 11
                    }
                }, 100);
            }
            lIsDown = true
        })
        keyboardEvents.subscribe('a_up', () => {
            lIsDown = false
            const self = this.getSelfPlayer()
            if (!moveRightTimer) {
                self.moveCommand = self.stop
            }
            if (moveLeftTimer) {
                clearInterval(moveLeftTimer)
                moveLeftTimer = null
            }
        })

        const playerAttackHandler = throttle(this.playerAttack, 300, { leading: true, trailing: false })
        keyboardEvents.subscribe('j_down', playerAttackHandler)

        keyboardEvents.subscribe('k_down', () => {
            const self = this.getSelfPlayer()
            self.jumpIng = true
        })
    }

    playerAttack() {
        const attackAudio = document.createElement('audio')
        attackAudio.src = './resource/attack.mp3'
        attackAudio.play()
    }

    getSelfPlayer() {
        for (const it in this.playerMap) {
            if (this.playerMap[it].isSelf) {
                return this.playerMap[it]
            }
        }
    }

    draw() {
        // console.log(this.playerMap);
        for (const it in this.playerMap) {
            this.playerMap[it].moveCommand()
            this.playerMap[it].jumpListen()
        }

    }
}

export default Player