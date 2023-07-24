import MySocket from './net/socket.js'
import fetchJson from './net/http.js'
import { getRandomNumber } from './utils.js'
import SocketEvents from './utils/socketEvents.js'
import { showLoading, hideLoadinng } from './utils/pageLoading.js'

const waitFun = (time) => {
    return new Promise(res => {
        setTimeout(() => {
            res()
        }, time);
    })
}

const gameIndexPage = document.getElementById('gameIndexPage')
const gameRoom = document.getElementById('gameRoom')
const newGameRoomDialog = document.getElementById('newGameRoomDialog')
const addRoom = document.getElementById('addRoom')
const refresh = document.getElementById('refresh')
const newAddRoomCancel = document.getElementById('newAddRoomCancel')
const newAddRoomConfirm = document.getElementById('newAddRoomConfirm')

gameIndexPage.children[0].addEventListener('click', removeIndexPage)

async function removeIndexPage() {
    window.localStorage.clear()
    gameIndexPage.children[0].classList.add('start-closed')

    await waitFun(600)
    gameIndexPage.children[0].style.display = 'none'

    gameIndexPage.classList.add('game-index-closed')
    await waitFun(500)
    gameIndexPage.style.display = 'none'

    gameRoom.classList.add('game-room-show')

    gameIndexPage.children[0].removeEventListener('click', removeIndexPage)

    getRoomList()

    loadAudio()
}

const roomWrap = document.getElementById('roomWrap')
function getRoomList() {
    showLoading()
    // const roomIds = Array.from(document.querySelectorAll('.room-item')).map(v => v.dataset.id)

    fetchJson('/getRooms').then(data => {
        if (data.status === 0) {
            roomWrap.innerHTML = ''

            // if (roomIds.length !== data.data) {
            //     let diff
            //     if (roomIds.length > data.data) {
            //         diff = roomIds.filter(item => !data.data.includes(item));
            //     } else {
            //         diff = data.data.filter(item => !roomIds.includes(item));
            //     }
            //     for (const dom of document.querySelectorAll('.room-item')) {
            //         if (diff.includes(dom.dataset.id)) {
            //             dom.remove()
            //         }
            //     }
            // }

            for (const it of data.data) {

                // if (roomIds.includes(it.uuid)) continue

                const roomItem = document.createElement('div')
                roomItem.className = 'room-item'
                roomItem.dataset.id = it.uuid

                const roomState = document.createElement('div')
                roomState.className = 'status'
                // todo 添加人数标识
                roomState.innerText = it.player.length
                roomItem.appendChild(roomState)

                const roomIcon = document.createElement('div')
                roomIcon.className = 'icon'
                roomIcon.style.backgroundImage = `url(../resource/home_icon/${getRandomNumber(1, 12)}.png)`
                roomIcon.style.backgroundSize = 'contain'
                roomItem.appendChild(roomIcon)

                const roomName = document.createElement('div')
                roomName.className = 'name'
                roomName.innerText = it.name
                roomItem.appendChild(roomName)

                roomWrap.appendChild(roomItem)
                // console.log(it);
            }
        } else {
            alert(data.data)
        }
    }).catch(err => {
        console.log(err);
    }).finally(() => {
        hideLoadinng()
    })
}

// removeIndexPage()

refresh.addEventListener('click', () => {
    getRoomList()
})

let isJoinRoom = false
let isJoinRoomLoading = false
SocketEvents.subscribe('join', (msg) => {
    console.log(msg);
    // msg 为长度为3的数组0是userId, 1是房间信息, 2是玩家人数够了后返回的地图信息, 3是玩家人数够了后返回的玩家信息
    window.sessionStorage.setItem('userId', msg[0])
    hideLoadinng()
    isJoinRoom = true
    isJoinRoomLoading = false
    checkRoomPage(msg[1], {}, msg[2])
})
SocketEvents.subscribe('join_err', (msg) => {
    hideLoadinng()
    alert(msg)
    isJoinRoom = false
    isJoinRoomLoading = false
})
SocketEvents.subscribe('joined', (msg) => {
    if (isJoinRoom) {
        if (player1.innerText === '') {
            player1.innerText = msg
        } else {
            player2.innerText = msg
        }
        playerList.push(msg)
    }
    console.log(msg, 'joined');
})
SocketEvents.subscribe('exited', (msg) => {
    console.log(msg, 'exited');

    const index = playerList.indexOf(msg);
    if (index !== -1) {
        playerList.splice(index, 1);
    }

    if (player1.innerText === msg) {
        player1.innerText = ''
    } else {
        player2.innerText = ''
    }
})

roomWrap.addEventListener('click', (e) => {
    if (e.target.parentElement.className === 'room-item' && !isJoinRoomLoading) {
        showLoading()
        isJoinRoomLoading = true
        MySocket.sendMsg({
            m_type: 'join',
            data: e.target.parentElement.dataset.id
        })
    }
}, false)

const playerList = new Proxy([], {
    get(target, prop, receiver) {
        return Reflect.get(target, prop, receiver)
    },
    set(target, prop, value, receiver) {
        const result = Reflect.set(target, prop, value, receiver);

        if (prop !== 'length') {
            console.log(`玩家 ${prop} 加入:`, target);
        }
        return result;
    },
    deleteProperty(target, prop) {
        const result = Reflect.deleteProperty(target, prop);
        console.log(`玩家 ${prop} 退出:`, target);
        return result;
    }
})

const joinRoom = document.getElementById('joinRoom')
const roomName = document.getElementById('roomName')
const player1 = document.getElementById('player1')
const player2 = document.getElementById('player2')
const quitBtn = document.getElementById('quitBtn')
async function checkRoomPage(roomInfo = {}, mapInfo = null, playData = null) {
    gameRoom.classList.remove('game-room-show')
    gameRoom.classList.add('game-room-hide')
    await waitFun(500)
    joinRoom.classList.add('join-room-ac')

    if (Array.isArray(roomInfo.player)) {
        if (roomInfo.player.length === 1) {
            player1.innerText = roomInfo.player[0]
            playerList.push(roomInfo.player[0])
        } else {
            player1.innerText = roomInfo.player[0]
            player2.innerText = roomInfo.player[1]
            playerList.push(roomInfo.player[0])
            playerList.push(roomInfo.player[1])
        }
    }

    await waitFun(800)
    roomName.innerText = '房间名称:' + roomInfo.name
    roomName.classList.add('room-name-ac')

    if (playData) {
        generateGameContent(roomInfo.size, mapInfo, playData)
    }
}
quitBtn.addEventListener('click', async () => {
    getRoomList()
    gameRoom.classList.remove('game-room-hide')
    joinRoom.classList.remove('join-room-ac')
    roomName.classList.remove('room-name-ac')
    joinRoom.classList.add('join-room-hide')
    await waitFun(800)
    roomName.innerText = ''
    joinRoom.classList.remove('join-room-hide')
    gameRoom.classList.add('game-room-show')

    MySocket.sendMsg({
        m_type: 'exit',
        data: window.sessionStorage.getItem('userId')
    })

    if (playerList.length === 2) {
        Reflect.set(playerList, 'length', 0);
    } else if (playerList.length === 1) {
        const index = playerList.indexOf(window.sessionStorage.getItem('userId'));
        if (index !== -1) {
            playerList.splice(index, 1);
        }
    }

    exit()
    gameContent.innerHTML = ''
})

addRoom.addEventListener('click', () => {
    newGameRoomDialog.showModal()
})

newAddRoomCancel.addEventListener('click', () => {
    newGameRoomDialog.close();
})

let mapSizeNum = 800

const mapSizeChanger = document.getElementById('mapSizeChanger')
const roomNameInputer = document.getElementById('roomNameInputer')
const mapSize = document.getElementById('mapSize')

mapSizeChanger.addEventListener('input', (e) => {
    mapSizeNum = e.target.value
    mapSize.innerText = e.target.value
})


let isConfirm = false
newAddRoomConfirm.addEventListener('click', () => {
    if (isConfirm || isJoinRoomLoading) return
    if (!roomNameInputer.value) {
        alert('非法名称')
        return
    }

    isConfirm = true
    fetchJson('/addRoom', {
        method: 'post',
        body: `name:${roomNameInputer.value},size:${mapSizeNum}`
    }).then(data => {
        console.log(data);
        isConfirm = false
        if (data.status === 0) {
            // data.data房间ID，根据房间ID加入房间
            isJoinRoomLoading = true
            MySocket.sendMsg({
                m_type: 'join',
                data: data.data
            })
            // success
            getRoomList()
            roomNameInputer.value = ''
            mapSizeChanger.value = 800
            mapSize.innerText = 800
            mapSizeNum = 800
            newGameRoomDialog.close();
        } else {
            alert(data.data)
        }
    }).catch(err => {
        isConfirm = false
        console.log(err);
    })
})

// function currentUserFlag() {
//     const uid = window.sessionStorage.getItem('userId')

//     if (player1.innerText === uid) {
//         return 'player1'
//     }
//     if (player2.innerText === uid) {
//         return 'player2'
//     }
//     return 'error'
// }

import { init, exit } from './core.js'
const gameContent = document.getElementById('gameContent')
const GAME_HEIGTH = 600
function generateGameContent(size = 1200, mapData, playerData) {

    gameContent.innerHTML = ''

    gameContent.style.width = size + 'px'
    gameContent.style.height = GAME_HEIGTH + 'px'

    const canvasEl = document.createElement('canvas')
    const $ = canvasEl.getContext('2d')

    init(canvasEl, $, size, GAME_HEIGTH, 60, gameContent, {
        map: mapData,
        player: {
            flag: playerData,
        }
    })
}

const audio = document.createElement('audio')
audio.src = './resource/bg.mp3'
audio.loop = true

function loadAudio() {
    audio.play()
}