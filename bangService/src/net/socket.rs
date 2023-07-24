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

        // 刷新浏览器
        match msg {
            Message::Close(_) => {
                if let Some(r_u) = room_user_guard.get(&addr) {
                    let mut my_redis = MY_REDIS.lock().unwrap();
                    if let Some(val) = my_redis.get("room_list") {
                        let mut room_list: Vec<Room> = serde_json::from_str(&val).unwrap();

                        if room_list.len() > 0 {
                            room_list.retain(|room| {
                                if room.player.len() == 1 && room.uuid == r_u.r_id {
                                    return false;
                                }
                                true
                            });

                            for it in &mut room_list {
                                if it.uuid == r_u.r_id {
                                    it.player.retain(|x| *x != r_u.u_id);
                                    break;
                                }
                            }
                        }

                        my_redis.set("room_list", serde_json::to_string(&room_list).unwrap());
                    }

                    if let Some(socket_addr) =
                        find_socket_addr_by_u_id(&room_user_guard, &r_u.enemy_id)
                    {
                        if let Some(tx) = peer_map.lock().unwrap().get(&socket_addr) {
                            m_q.push(MQTyper {
                                tx: tx.clone(),
                                send: MessageBody {
                                    m_type: String::from("exited"),
                                    data: String::from(r_u.u_id.clone()),
                                },
                            })
                        }

                        // 清楚对手的enemy_id(也就是自己)
                        if let Some(enemy) = room_user_guard.get_mut(&socket_addr) {
                            enemy.enemy_id = String::new();
                        }
                    }

                    room_user_guard.remove(&addr);
                }
            }
            _ => {}
        }

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
                            let mut is_join: bool = false;
                            if room_list.len() > 0 {
                                for room in &mut room_list {
                                    if room.uuid == msg_body.data {
                                        is_join = true;
                                        if room.player.len() < 2 {
                                            let mut enemy_id: String = String::new();
                                            if room.player.len() == 1 {
                                                // 为房间内其他人发送消息
                                                match room.player.get(0) {
                                                    Some(u) => {
                                                        enemy_id.push_str(u);
                                                        if let Some(socket_addr) =
                                                            find_socket_addr_by_u_id(
                                                                &room_user_guard,
                                                                u,
                                                            )
                                                        {
                                                            // 设置对手的enemy_id(也就是自己)
                                                            if let Some(enemy) = room_user_guard
                                                                .get_mut(&socket_addr)
                                                            {
                                                                enemy.enemy_id = user_uuid.clone();
                                                            }

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

                                            let mut room_user = RoomUser::new(
                                                user_uuid.clone(),
                                                msg_body.data.clone(),
                                            );
                                            room_user.enemy_id = enemy_id;

                                            room_user_guard.insert(addr, room_user);

                                            let player_flag = room
                                                .player
                                                .iter()
                                                .position(|x| x == &user_uuid)
                                                .unwrap();

                                            let m_data = (
                                                user_uuid.clone(),
                                                Room {
                                                    name: room.name.clone(),
                                                    size: room.size,
                                                    uuid: room.uuid.clone(),
                                                    player: room.player.clone(),
                                                },
                                                player_flag + 1,
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
                                        break;
                                    }
                                }
                            }
                            if !is_join {
                                m_q.push(MQTyper {
                                    tx: tx.clone(),
                                    send: MessageBody {
                                        m_type: String::from("join_err"),
                                        data: String::from("房间不存在!"),
                                    },
                                });
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
                                    it.player.retain(|x| {
                                        if *x == user.u_id {
                                            return false;
                                        }
                                        true
                                    });
                                    break;
                                }
                            }

                            if let Some(socket_addr) =
                                find_socket_addr_by_u_id(&room_user_guard, &user.enemy_id)
                            {
                                if let Some(tx) = peer_map.lock().unwrap().get(&socket_addr) {
                                    m_q.push(MQTyper {
                                        tx: tx.clone(),
                                        send: MessageBody {
                                            m_type: String::from("exited"),
                                            data: String::from(user.u_id.clone()),
                                        },
                                    })
                                }

                                // 清除对手的enemy_id(也就是自己)
                                if let Some(enemy) = room_user_guard.get_mut(&socket_addr) {
                                    enemy.enemy_id = String::new();
                                }
                            }
                        }
                    }

                    my_redis.set("room_list", serde_json::to_string(&room_list).unwrap());
                }
                room_user_guard.remove(&addr);
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
            "ping" => {
                m_q.push(MQTyper {
                    tx: tx.clone(),
                    send: MessageBody {
                        m_type: String::from("pong"),
                        data: String::from(""),
                    },
                });
            }
            "move" => {
                if let Some(user) = room_user_guard.get(&addr) {
                    if let Some(socket_addr) =
                        find_socket_addr_by_u_id(&room_user_guard, &user.enemy_id)
                    {
                        if let Some(tx) = peer_map.lock().unwrap().get(&socket_addr) {
                            m_q.push(MQTyper {
                                tx: tx.clone(),
                                send: MessageBody {
                                    m_type: String::from("moved"),
                                    data: msg_body.data,
                                },
                            })
                        }
                    }
                }
            }
            "attack" => {
                if let Some(user) = room_user_guard.get(&addr) {
                    if let Some(socket_addr) =
                        find_socket_addr_by_u_id(&room_user_guard, &user.enemy_id)
                    {
                        if let Some(tx) = peer_map.lock().unwrap().get(&socket_addr) {
                            m_q.push(MQTyper {
                                tx: tx.clone(),
                                send: MessageBody {
                                    m_type: String::from("attacked"),
                                    data: msg_body.data,
                                },
                            })
                        }
                    }
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
}

fn find_socket_addr_by_u_id(
    room_user_map: &std::sync::MutexGuard<'_, HashMap<SocketAddr, RoomUser>>,
    u_id: &str,
) -> Option<SocketAddr> {
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
