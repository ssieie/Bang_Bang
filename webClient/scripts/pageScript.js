
import fetchJson from './net/http.js'
import { getRandomNumber } from './utils.js'

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
    const roomIds = Array.from(document.querySelectorAll('.room-item')).map(v => v.dataset.id)

    fetchJson('/getRooms').then(data => {
        if (data.status === 0) {
            for (const it of data.data) {

                if (roomIds.includes(it.uuid)) continue

                const roomItem = document.createElement('div')
                roomItem.className = 'room-item'
                roomItem.dataset.id = it.uuid

                const roomState = document.createElement('div')
                roomState.className = 'status'
                // todo 添加人数标识
                roomState.innerText = 1
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
    })
}

removeIndexPage()

refresh.addEventListener('click', () => {
    getRoomList()
})

roomWrap.addEventListener('click', (e) => {
    if (e.target.parentElement.className === 'room-item') {
        console.log(e.target.parentElement.dataset.id);
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
    if (isConfirm) return
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