pub mod redis {
    extern crate redis;
    use redis::Commands;
    use std::{error::Error, fs};

    pub struct MyRedis {
        pub connection: redis::Connection,
    }
    impl MyRedis {
        pub fn open() -> Result<Self, Box<dyn Error>> {
            let user = fs::read_to_string("user.txt")?;
            let client = redis::Client::open(user)?;

            let connection = client.get_connection()?;

            Ok(Self { connection })
        }

        pub fn set(&mut self, key: &str, val: String) {
            let _: () = self.connection.set(key, val).unwrap();
        }

        pub fn get(&mut self, key: &str) -> Option<String> {
            match self.connection.get(key) {
                Ok(val) => Some(val),
                Err(_) => None,
            }
        }
    }

    // pub fn open() -> Result<redis::Connection, Box<dyn Error>> {
    //     let user = fs::read_to_string("user.txt")?;
    //     let client = redis::Client::open(user)?;
    //     let con: redis::Connection = client.get_connection()?;
    //     Ok(con)
    // }

    // pub fn set(key: &str, val: String) {
    //     let mut con = open().unwrap();

    //     let _: () = con.set(key, val).unwrap();
    // }

    // pub fn get(key: &str) -> Option<String> {
    //     let mut con = open().unwrap();

    //     match con.get(key) {
    //         Ok(val) => Some(val),
    //         Err(_) => None,
    //     }
    // }
}
