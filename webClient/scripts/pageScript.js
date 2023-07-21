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
                console.log(it);
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

removeIndexPage()

refresh.addEventListener('click', () => {
    getRoomList()
})

let isJoinRoom = false
let isJoinRoomLoading = false
SocketEvents.subscribe('join', (msg) => {
    console.log(msg);
    hideLoadinng()
    isJoinRoom = true
    isJoinRoomLoading = false
})
SocketEvents.subscribe('join_err', (msg) => {
    hideLoadinng()
    alert(msg)
    isJoinRoom = false
    isJoinRoomLoading = false
})
SocketEvents.subscribe('joined', (msg) => {
    console.log(msg, 'joined');
})

roomWrap.addEventListener('click', (e) => {
    if (e.target.parentElement.className === 'room-item' && !isJoinRoomLoading) {
        showLoading()
        isJoinRoomLoading = true
        MySocket.sendMsg(JSON.stringify({
            m_type: 'join',
            data: e.target.parentElement.dataset.id
        }))
    }
}, false)

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
            MySocket.sendMsg(JSON.stringify({
                m_type: 'join',
                data: data.data
            }))
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
