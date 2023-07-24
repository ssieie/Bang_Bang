
import { loadImg, throttle } from "../utils.js"
import keyboardEvents from "../utils/keyboardEvents.js"
import MySocket from '../net/socket.js'

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

        this.flag = lOrR

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
        this.jumpEndCall = null

        this.attackIng = false
        this.attackStep = 1
        this.wqW = this.flag === 1 ? 50 : 50
        this.wqH = this.flag === 1 ? 19 : 11
    }
    stop() {
        const img = this.lOrR === 'right' ? this.assets.p['1.png'] : this.assets.p['11.png']
        // console.log(img);
        this.$.drawImage(img, this.currentX, this.currentY, PLAYER_W, PLAYER_H)
        this.lifeLayer()
        this.nameLayer()
        this.weaponLayer()
    }
    moveLeft() {
        this.lOrR = 'left'
        const img = this.assets.p[`${this.leftStep}.png`]

        this.$.drawImage(img, this.currentX, this.currentY, PLAYER_W, PLAYER_H)

        if (this.currentX > 0) {
            this.currentX -= this.speed
        }
        this.lifeLayer()
        this.nameLayer()
        this.weaponLayer()
    }
    moveRight() {
        this.lOrR = 'right'

        const img = this.assets.p[`${this.rightStep}.png`]

        this.$.drawImage(img, this.currentX, this.currentY, PLAYER_W, PLAYER_H)

        if (this.currentX < this.cvs.width - PLAYER_W) {
            this.currentX += this.speed
        }
        this.lifeLayer()
        this.nameLayer()
        this.weaponLayer()
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
                if (this.jumpEndCall) {
                    this.jumpEndCall()
                    this.jumpEndCall = null
                }
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
    jumpEnd(call) {
        this.jumpEndCall = call
    }
    lifeLayer() {
        const posX = this.currentX
        const posY = this.currentY - 20
        this.$.strokeRect(posX, posY, PLAYER_W, 10);

        this.$.fillStyle = '#ff0000'
        this.$.fillRect(posX + 1, posY + 1, (PLAYER_W - 1) * (this.life / 100), 9);
    }
    nameLayer() {
        this.$.font = "15px KirangHaerang";
        this.$.fillStyle = '#0000ff'
        this.$.fillText(this.isSelf ? "Player1" : 'Player2', this.currentX, this.currentY - 30);
    }
    weaponLayer() {
        if (!this.attackIng) {
            if (this.lOrR === 'right') {
                const x = this.currentX + PLAYER_W - 25
                const y = this.currentY + 35 + this.rightStep
                this.$.drawImage(this.assets.wq['s-2.png'], x, y, this.wqW, this.wqH)
            } else {
                const x = this.currentX - 20
                const y = this.currentY + 35 + this.leftStep / 11
                this.$.drawImage(this.assets.wq['s-1.png'], x, y, this.wqW, this.wqH)
            }
        }
    }
    attackListen() {
        if (this.attackIng) {
            if (this.lOrR === 'right') {
                const imgU = `a-2-${this.attackStep}.png`
                const imgI = this.assets.wq[imgU]
                const x = this.currentX + PLAYER_W - 25
                const y = this.currentY + 20
                this.$.drawImage(imgI, x, y, imgI.width, imgI.height)

                const wImgU = `p-2-${this.attackStep}.png`
                const wImgI = this.assets.w[wImgU]

                const wx = this.currentX + PLAYER_W - 25 + this.wqW - 20
                const wy = this.currentY + 10
                this.$.drawImage(wImgI, wx, wy, wImgI.width, wImgI.height)
            } else {
                const imgU = `a-1-${this.attackStep}.png`
                const imgI = this.assets.wq[imgU]
                const x = this.currentX - 20
                const y = this.currentY + 20
                this.$.drawImage(imgI, x, y, imgI.width, imgI.height)

                const wImgU = `p-1-${this.attackStep}.png`
                const wImgI = this.assets.w[wImgU]

                const wx = this.currentX + PLAYER_W - 20 - this.wqW - 20
                const wy = this.currentY + 10
                this.$.drawImage(wImgI, wx, wy, wImgI.width, wImgI.height)
            }
        }
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

        this.sendQueue = {
            move: {
                state: false,
                self: null,
                handler: (x, y) => {
                    MySocket.sendMsg({
                        m_type: 'move',
                        data: [x, y]
                    })
                }
            }
        }

        this.playerFlag = 1 // p1 or p2

        this.$ = canvas.pen
        this.cvs = canvas.cvs

        this.player1Imgs = {}
        this.player2Imgs = {}

        this.p1WqImgs = {}
        this.p2WqImgs = {}

        this.p1WImgs = {}
        this.p2WImgs = {}

        this.playerMap = {}

        // attack
        this.attackTimer = null

        this.init()
    }

    async init() {
        await this.loadAssets()

        this.loadKeyboardListener()

        this.loadPlayer()
    }

    loadPlayer() {
        this.playerMap['player1'] = new Play(30, this.h - PLAYER_H - 20, this.playerFlag === 1, this.playerFlag, {
            p: this.player1Imgs,
            wq: this.p1WqImgs,
            w: this.p1WImgs
        }, this.cvs, this.$)
        this.playerMap['player2'] = new Play(this.w - 30 - PLAYER_W, this.h - PLAYER_H - 20, this.playerFlag === 2, this.playerFlag, {
            p: this.player2Imgs,
            wq: this.p2WqImgs,
            w: this.p2WImgs
        }, this.cvs, this.$)
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
        const bwu = "./resource/wq/1/"
        const p1wq = [bwu + 's-1.png', bwu + 's-2.png', bwu + 'a-1-1.png', bwu + 'a-1-2.png', bwu + 'a-1-3.png', bwu + 'a-2-1.png', bwu + 'a-2-2.png', bwu + 'a-2-3.png']
        const p1wqload = await loadImg(p1wq)
        for (const img of p1wqload) {
            this.p1WqImgs[img.name] = img.uri
        }
        const bwu2 = "./resource/wq/2/"
        const p2wq = [bwu2 + 's-1.png', bwu2 + 's-2.png', bwu2 + 'a-1-1.png', bwu2 + 'a-1-2.png', bwu2 + 'a-1-3.png', bwu2 + 'a-2-1.png', bwu2 + 'a-2-2.png', bwu2 + 'a-2-3.png']
        const p2wqload = await loadImg(p2wq)
        for (const img of p2wqload) {
            this.p2WqImgs[img.name] = img.uri
        }
        const p1w = [bwu + 'p-1-1.png', bwu + 'p-1-2.png', bwu + 'p-1-3.png', bwu + 'p-2-1.png', bwu + 'p-2-2.png', bwu + 'p-2-3.png']
        const p1wload = await loadImg(p1w)
        for (const img of p1wload) {
            this.p1WImgs[img.name] = img.uri
        }
        const p2w = [bwu2 + 'p-1-1.png', bwu2 + 'p-1-2.png', bwu2 + 'p-1-3.png', bwu2 + 'p-2-1.png', bwu2 + 'p-2-2.png', bwu2 + 'p-2-3.png']
        const p2wload = await loadImg(p2w)
        for (const img of p2wload) {
            this.p2WImgs[img.name] = img.uri
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
                this.sendQueue.move.state = true
                this.sendQueue.move.self = self
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
                this.sendQueue.move.state = false
                this.sendQueue.move.self = null
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
                this.sendQueue.move.state = true
                this.sendQueue.move.self = self
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
                this.sendQueue.move.state = false
                this.sendQueue.move.self = self
            }
            if (moveLeftTimer) {
                clearInterval(moveLeftTimer)
                moveLeftTimer = null
            }
        })

        const playerAttackHandler = throttle(this.playerAttack.bind(this), 300, { leading: true, trailing: false })
        keyboardEvents.subscribe('j_down', playerAttackHandler)

        keyboardEvents.subscribe('k_down', () => {
            const self = this.getSelfPlayer()
            if (!self.jumpIng) {
                self.jumpIng = true
                this.sendQueue.move.state = true
                this.sendQueue.move.self = self
                self.jumpEnd(() => {
                    if (!moveRightTimer && !moveLeftTimer) {
                        this.sendQueue.move.state = false
                        this.sendQueue.move.self = null
                    }
                })
            }
        })
    }

    playerAttack() {
        const self = this.getSelfPlayer()
        self.attackIng = true
        this.attackTimer = setInterval(() => {
            if (self.attackStep === 3) {
                self.attackIng = false
                self.attackStep = 1

                clearInterval(this.attackTimer)
                this.attackTimer = null
            } else {
                self.attackStep += 1
            }
        }, 95);
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

    behaviorSender() {
        for (const key in this.sendQueue) {
            if (this.sendQueue[key].state) {
                switch (key) {
                    case 'move':
                        const target = this.sendQueue[key]
                        target.handler(target.self.currentX, target.self.currentY)
                        break;

                    default:
                        break;
                }
            }
        }
    }

    draw() {
        // console.log(this.playerMap);
        for (const it in this.playerMap) {
            this.playerMap[it].moveCommand()
            this.playerMap[it].jumpListen()
            this.playerMap[it].attackListen()
        }

    }
}

export default Player