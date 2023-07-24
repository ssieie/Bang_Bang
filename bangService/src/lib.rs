use std::sync::Mutex;

pub mod net;
pub mod store;

pub struct RoomUser {
    u_id: String,
    r_id: String,
    enemy_id: String,
}

impl RoomUser {
    pub fn new(u_id: String, r_id: String) -> Self {
        Self {
            u_id,
            r_id,
            enemy_id: String::new(),
        }
    }
}

#[macro_use]
extern crate lazy_static;
lazy_static! {
    pub static ref MY_REDIS: Mutex<store::redis::MyRedis> = {
        let my_redis = store::redis::MyRedis::open().expect("redis 初始化失败!");
        Mutex::new(my_redis)
    };
}
