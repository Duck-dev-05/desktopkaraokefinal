use futures_util::{SinkExt, StreamExt};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, Mutex};
use tokio_tungstenite::tungstenite::protocol::Message;

type Tx = mpsc::UnboundedSender<Message>;
type PeerMap = Arc<Mutex<HashMap<SocketAddr, Tx>>>;

pub async fn start_signaling_server(port: u16) {
    let addr = format!("0.0.0.0:{}", port);
    let listener = match TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("Failed to bind signaling server to {}: {}", addr, e);
            return;
        }
    };
    println!("Signaling server listening on: {}", addr);

    let state = PeerMap::new(Mutex::new(HashMap::new()));

    while let Ok((stream, addr)) = listener.accept().await {
        tokio::spawn(handle_connection(state.clone(), stream, addr));
    }
}

async fn handle_connection(peer_map: PeerMap, raw_stream: TcpStream, addr: SocketAddr) {
    println!("Incoming TCP connection from: {}", addr);

    let ws_stream = match tokio_tungstenite::accept_async(raw_stream).await {
        Ok(ws) => ws,
        Err(e) => {
            eprintln!("Error during the websocket handshake for {}: {}", addr, e);
            return;
        }
    };

    println!("WebSocket connection established: {}", addr);
    let (tx, mut rx) = mpsc::unbounded_channel();
    peer_map.lock().await.insert(addr, tx);

    let (mut outgoing, mut incoming) = ws_stream.split();

    let broadcast_incoming = incoming.map(move |msg| {
        let msg = msg.unwrap_or_else(|_| Message::Ping(Default::default()));
        (addr, msg)
    });

    let receive_from_others = async move {
        while let Some(msg) = rx.recv().await {
            if outgoing.send(msg).await.is_err() {
                break;
            }
        }
    };

    let peer_map_clone = peer_map.clone();
    let broadcast_to_others = async move {
        let mut broadcast_incoming = broadcast_incoming;
        while let Some((sender_addr, msg)) = broadcast_incoming.next().await {
            if msg.is_text() {
                if let Ok(text) = msg.to_text() {
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(text) {
                        let peers = peer_map_clone.lock().await;

                        // If the message specifies a target, try to route it
                        if let Some(target_addr_str) = json.get("to").and_then(|v| v.as_str()) {
                            if let Ok(target_addr) = target_addr_str.parse::<SocketAddr>() {
                                if let Some(target_tx) = peers.get(&target_addr) {
                                    let _ = target_tx.send(msg.clone());
                                }
                                continue;
                            }
                        }

                        // Otherwise broadcast to everyone else
                        let broadcast_recipients = peers
                            .iter()
                            .filter(|(peer_addr, _)| peer_addr != &&sender_addr)
                            .map(|(_, ws_sink)| ws_sink);

                        for recp in broadcast_recipients {
                            let _ = recp.send(msg.clone());
                        }
                    }
                }
            }
        }
    };

    tokio::select! {
        _ = receive_from_others => (),
        _ = broadcast_to_others => (),
    }

    println!("{} disconnected", &addr);
    peer_map.lock().await.remove(&addr);
}
