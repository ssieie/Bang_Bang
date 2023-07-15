use bang_service::net::http::http_handler;
use bang_service::net::socket::socket_handler;
use futures_channel::mpsc::UnboundedSender;
use hyper::service::{make_service_fn, service_fn};
use hyper::Server;
use std::collections::HashMap;
use std::convert::Infallible;
use std::net::SocketAddr;
use std::sync::Arc;
use std::sync::Mutex;
use tokio::net::TcpListener;
use tokio_tungstenite::tungstenite::protocol::Message;

type Tx = UnboundedSender<Message>;
type PeerMap = Arc<Mutex<HashMap<SocketAddr, Tx>>>;

#[tokio::main]
async fn main() {
    let addr: SocketAddr = SocketAddr::from(([0, 0, 0, 0], 8880));

    // 创建 HTTP 服务器
    let make_svc = make_service_fn(|_conn| async {
        // service_fn converts our function into a `Service`
        Ok::<_, Infallible>(service_fn(http_handler))
    });

    let server = Server::bind(&addr).serve(make_svc);

    // let graceful = server.with_graceful_shutdown(shutdown_signal());
    println!("Http server running on ws://{}", addr);

    // 创建 WebSocket 服务器
    let ws_addr: SocketAddr = SocketAddr::from(([0, 0, 0, 0], 8881));
    
    let state = PeerMap::new(Mutex::new(HashMap::new()));

    let ws_listener: TcpListener = TcpListener::bind(&ws_addr)
        .await
        .expect("Couldn't bind WebSocket server");

    println!("WebSocket server running on ws://{}", ws_addr);

    tokio::spawn(async move {
        while let Ok((stream, addr)) = ws_listener.accept().await {
            tokio::spawn(socket_handler(state.clone(), stream, addr));
        }
    });

    if let Err(e) = server.await {
        eprintln!("server error: {}", e);
    }
}
