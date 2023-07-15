// use futures::TryStreamExt as _;
use super::super::store::redis;
use hyper::{
    header::{HeaderValue, ACCESS_CONTROL_ALLOW_ORIGIN, CONTENT_TYPE},
    Body, Method, Request, Response, StatusCode,
};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, convert::Infallible, error::Error};
use uuid::Uuid;

enum ResCode {
    Ok,
    Err,
}

#[derive(Serialize, Deserialize)]
struct ResData<T> {
    status: u8,
    data: T,
}

fn res_message_handler(state: ResCode) -> String {
    match state {
        ResCode::Ok => {
            let res_data = ResData {
                status: 0,
                data: "操作成功".to_string(),
            };

            serde_json::to_string(&res_data).unwrap()
        }
        ResCode::Err => {
            let res_data = ResData {
                status: 1,
                data: "操作失败".to_string(),
            };

            serde_json::to_string(&res_data).unwrap()
        }
    }
}


pub async fn http_handler(req: Request<Body>) -> Result<Response<Body>, Infallible> {
    let mut response = Response::new(Body::empty());

    // 设置响应头
    let headers = response.headers_mut();

    headers.insert(CONTENT_TYPE, "application/json".parse().unwrap());
    headers.insert(ACCESS_CONTROL_ALLOW_ORIGIN, HeaderValue::from_static("*"));
    // headers.insert(
    //     HeaderName::from_static("Access-Control-Allow-Methods"),
    //     HeaderValue::from_static("GET, POST, OPTIONS"),
    // );
    // headers.insert(
    //     HeaderName::from_static("Access-Control-Allow-Headers"),
    //     HeaderValue::from_static("*"),
    // );

    match (req.method(), req.uri().path()) {
        (&Method::GET, "/getRooms") => {
            let result = get_rooms(req).await.unwrap();

            *response.body_mut() = Body::from(result);
        }
        (&Method::POST, "/addRoom") => {
            let result = add_room(req).await.unwrap();

            *response.body_mut() = Body::from(result);
        }
        _ => {
            *response.status_mut() = StatusCode::NOT_FOUND;
        }
    };

    Ok(response)
}

#[derive(Serialize, Deserialize)]
struct Room {
    name: String,
    size: u16,
    uuid: String,
    player: Vec<String>,
}

impl Room {
    fn new(name: String, size: u16, uuid: String) -> Self {
        Self {
            name,
            size,
            uuid,
            player: Vec::with_capacity(2),
        }
    }
}

async fn add_room(req: Request<Body>) -> Result<String, Box<dyn Error>> {
    let full_body = hyper::body::to_bytes(req.into_body()).await.unwrap();

    let body_str = String::from_utf8(full_body.to_vec()).unwrap();

    let body_obj: HashMap<_, _> = body_str
        .split(',')
        .map(|it| {
            let item: Vec<_> = it.split(':').collect();
            (item[0].to_string(), item[1].to_string())
        })
        .into_iter()
        .collect();

    if let None = body_obj.get("name") {
        return Ok(res_message_handler(ResCode::Err));
    }
    if let None = body_obj.get("size") {
        return Ok(res_message_handler(ResCode::Err));
    }

    let name = body_obj.get("name").unwrap();
    let size = body_obj.get("size").unwrap().parse::<u16>().unwrap();

    let uuid = Uuid::new_v4().to_string();

    let user_id = Uuid::new_v4().to_string();

    let mut room_list: Vec<Room> = Vec::new();

    if let Some(val) = redis::get("room_list") {
        room_list = serde_json::from_str(&val).unwrap();

        if room_list.len() > 0 {
            for it in &room_list {
                if it.name == *name {
                    let res_data = ResData {
                        status: 1,
                        data: "房间名已经存在".to_string(),
                    };

                    return Ok(serde_json::to_string(&res_data).unwrap());
                }
            }
        }

        let mut room: Room = Room::new(name.clone(), size, uuid);
        room.player.push(user_id.clone());
        room_list.push(room);
    } else {
        let mut room: Room = Room::new(name.clone(), size, uuid);
        room.player.push(user_id.clone());
        room_list.push(room);
    }
    redis::set("room_list", serde_json::to_string(&room_list).unwrap());

    let res_data = ResData {
        status: 0,
        data: user_id,
    };
    Ok(serde_json::to_string(&res_data).unwrap())
}

async fn get_rooms(_req: Request<Body>) -> Result<String, Box<dyn Error>> {
    let res_data: ResData<Vec<Room>>;

    if let Some(val) = redis::get("room_list") {
        res_data = ResData {
            status: 0,
            data: serde_json::from_str(&val).unwrap(),
        };
    } else {
        let empty: Vec<Room> = vec![];
        res_data = ResData {
            status: 0,
            data: empty,
        };
    }

    return Ok(serde_json::to_string(&res_data).unwrap());
}
