use crate::RoomUser;
use crate::MY_REDIS;
use futures_channel::mpsc::{unbounded, UnboundedSender};
use futures_util::{future, pin_mut, stream::TryStreamExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use std::sync::Mutex;
use tokio::net::TcpStream;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::protocol::Message;
use uuid::Uuid;

type Tx = UnboundedSender<Message>;
type PeerMap = Arc<Mutex<HashMap<SocketAddr, Tx>>>;

type RoomUserMap = Arc<Mutex<HashMap<SocketAddr, RoomUser>>>;

#[derive(Serialize, Deserialize)]
struct MessageBody<T = String> {
    m_type: String,
    data: T,
}

impl MessageBody {
    fn empty() -> Self {
        Self {
            m_type: String::from(""),
            data: String::from(""),
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
struct Room {
    name: String,
    size: u16,
    uuid: String,
    player: Vec<String>,
}

type MessageQueue<T = String> = Vec<MQTyper<T>>;
struct MQTyper<T> {
    tx: Tx,
    send: MessageBody<T>,
}

pub async fn socket_handler(
    peer_map: PeerMap,
    room_user: RoomUserMap,
    stream: TcpStream,
    addr: SocketAddr,
) {
    println!("来自: {} TCP连接", addr);

    let ws_stream = accept_async(stream)
        .await
        .expect("在websocket握手过程中发生错误");

    println!("已建立WebSocket连接: {}", addr);

    let (tx, rx) = unbounded();

    peer_map.lock().unwrap().insert(addr, tx.clone());

    let (outgoing, incoming) = ws_stream.split();

    let broadcast_incoming = incoming.try_for_each(|msg: Message| {
        println!("收到来自{}的消息: {}", addr, msg.to_text().unwrap());

        let msg_body: MessageBody<String> =
            serde_json::from_str(&msg.to_text().unwrap()).unwrap_or(MessageBody::empty());

        // 获取房间用户锁
        let mut room_user_guard: std::sync::MutexGuard<'_, HashMap<SocketAddr, RoomUser>> =
            room_user.lock().unwrap();

        // 待发消息的客户端
        let mut m_q: MessageQueue = vec![];
        match msg_body.m_type.as_str() {
            "join" => {
                match room_user_guard.get(&addr) {
                    Some(_) => m_q.push(MQTyper {
                        tx: tx.clone(),
                        send: MessageBody {
                            m_type: String::from("join_err"),
                            data: String::from("错误的消息,当前userID已在别的房间!"),
                        },
                    }),
                    None => {
                        // 加入房间，发放uuid,加入room_user
                        let user_uuid = Uuid::new_v4().to_string();

                        let mut my_redis = MY_REDIS.lock().unwrap();
                        if let Some(val) = my_redis.get("room_list") {
                            let mut room_list: Vec<Room> = serde_json::from_str(&val).unwrap();

                            if room_list.len() > 0 {
                                for room in &mut room_list {
                                    if room.uuid == msg_body.data {
                                        if room.player.len() < 2 {
                                            if room.player.len() == 1 {
                                                // 为房间内其他人发送消息
                                                match room.player.get(0) {
                                                    Some(u) => {
                                                        if let Some(socket_addr) =
                                                            find_socket_addr_by_u_id(
                                                                &room_user_guard,
                                                                u,
                                                            )
                                                        {
                                                            if let Some(tx) = peer_map
                                                                .lock()
                                                                .unwrap()
                                                                .get(&socket_addr)
                                                            {
                                                                m_q.push(MQTyper {
                                                                    tx: tx.clone(),
                                                                    send: MessageBody {
                                                                        m_type: String::from(
                                                                            "joined",
                                                                        ),
                                                                        data: user_uuid.clone(),
                                                                    },
                                                                })
                                                            }
                                                        }
                                                    }
                                                    None => {}
                                                }
                                            }

                                            room.player.push(user_uuid.clone());

                                            room_user_guard.insert(
                                                addr,
                                                RoomUser::new(
                                                    user_uuid.clone(),
                                                    msg_body.data.clone(),
                                                ),
                                            );

                                            let m_data = (
                                                user_uuid.clone(),
                                                Room {
                                                    name: room.name.clone(),
                                                    size: room.size,
                                                    uuid: room.uuid.clone(),
                                                    player: room.player.clone(),
                                                },
                                            );

                                            m_q.push(MQTyper {
                                                tx: tx.clone(),
                                                send: MessageBody {
                                                    m_type: String::from("join"),
                                                    data: serde_json::to_string(&m_data).unwrap(),
                                                },
                                            });

                                            my_redis.set(
                                                "room_list",
                                                serde_json::to_string(&room_list).unwrap(),
                                            );
                                            break;
                                        } else {
                                            m_q.push(MQTyper {
                                                tx: tx.clone(),
                                                send: MessageBody {
                                                    m_type: String::from("join_err"),
                                                    data: String::from("房间人数已满!"),
                                                },
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            "exit" => {
                let mut my_redis = MY_REDIS.lock().unwrap();
                if let Some(val) = my_redis.get("room_list") {
                    let mut room_list: Vec<Room> = serde_json::from_str(&val).unwrap();

                    if room_list.len() > 0 {
                        if let Some(user) = room_user_guard.get(&addr) {
                            room_list.retain(|room| {
                                if room.player.len() == 1 && room.uuid == user.r_id {
                                    return false;
                                }
                                true
                            });

                            for it in &mut room_list {
                                if it.uuid == user.r_id {
                                    let mut is_exit = false;
                                    it.player.retain(|x| {
                                        if *x == user.u_id {
                                            is_exit = true;
                                            return false;
                                        }
                                        true
                                    });
                                    if it.player.len() == 1 && is_exit {
                                        // 通知别的玩家退出
                                        match it.player.get(0) {
                                            Some(u) => {
                                                if let Some(socket_addr) =
                                                    find_socket_addr_by_u_id(&room_user_guard, u)
                                                {
                                                    if let Some(tx) =
                                                        peer_map.lock().unwrap().get(&socket_addr)
                                                    {
                                                        m_q.push(MQTyper {
                                                            tx: tx.clone(),
                                                            send: MessageBody {
                                                                m_type: String::from("exited"),
                                                                data: String::from(u),
                                                            },
                                                        })
                                                    }
                                                }
                                            }
                                            None => {}
                                        }
                                    }
                                }
                            }
                        }
                    }

                    my_redis.set("room_list", serde_json::to_string(&room_list).unwrap());
                }
            }
            "test" => {
                let peer_map_guard = peer_map.lock().unwrap();
                for (_, tx) in peer_map_guard.iter() {
                    m_q.push(MQTyper {
                        tx: tx.clone(),
                        send: MessageBody {
                            m_type: String::from("test"),
                            data: String::from("性能测试!"),
                        },
                    })
                }
            }
            _ => {}
        }

        for msg_it in m_q {
            msg_it
                .tx
                .unbounded_send(Message::Text(serde_json::to_string(&msg_it.send).unwrap()))
                .unwrap();
        }

        future::ok(())
    });

    let receive_from_others = rx.map(Ok).forward(outgoing);

    pin_mut!(broadcast_incoming, receive_from_others);

    future::select(broadcast_incoming, receive_from_others).await;

    println!("{} 断开!", &addr);
    peer_map.lock().unwrap().remove(&addr);

    // 断开连接，从房间中移除，并对redis数据进行处理
    let mut my_redis = MY_REDIS.lock().unwrap();
    // 获取房间用户锁
    let mut room_user_guard = room_user.lock().unwrap();
    if let Some(val) = my_redis.get("room_list") {
        let mut room_list: Vec<Room> = serde_json::from_str(&val).unwrap();

        if room_list.len() > 0 {
            if let Some(user) = room_user_guard.get(&addr) {
                room_list.retain(|room| {
                    if room.player.len() == 1 && room.uuid == user.r_id {
                        return false;
                    }
                    true
                });

                for it in &mut room_list {
                    if it.uuid == user.r_id {
                        it.player.retain(|x| *x != user.u_id);
                    }
                }
            }
        }

        my_redis.set("room_list", serde_json::to_string(&room_list).unwrap());
    }

    room_user_guard.remove(&addr);
}

fn find_socket_addr_by_u_id(
    room_user_map: &std::sync::MutexGuard<'_, HashMap<SocketAddr, RoomUser>>,
    u_id: &str,
) -> Option<SocketAddr> {
    // 获取 RoomUserMap 的共享锁
    // let user_map = room_user_map.lock().unwrap();
    // 使用 HashMap::iter() 方法遍历 RoomUserMap 中的键值对
    for (socket_addr, room_user) in room_user_map.iter() {
        if room_user.u_id == u_id {
            // 找到匹配的 RoomUser，返回对应的 SocketAddr
            return Some(*socket_addr);
        }
    }
    // 没有找到匹配的 RoomUser，返回 None
    None
}
