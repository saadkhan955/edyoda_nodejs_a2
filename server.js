const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

const clients = new Map(); // Store connected clients and their names

wss.on('connection', (ws) => {
  let name;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'join') {
        // Check if the special key is correct
        const specialKey = data.specialKey;
        if (specialKey !== undefined && specialKey.trim() !== '') {
          name = data.name;
          clients.set(name, { ws, specialKey });

          const onlineUsers = Array.from(clients.keys());
          broadcast({
            type: 'onlineUsers',
            users: onlineUsers,
          });
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Please enter a valid special key.' }));
          ws.close();
        }
      } else if (data.type === 'message') {
        // Handle incoming message
        const sender = data.sender;
        const content = data.content;
        broadcast({
          type: 'message',
          sender,
          content,
        });
      } else if (data.type === 'disconnect') {
        // Handle user disconnection
        if (name) {
          clients.delete(name);
          const onlineUsers = Array.from(clients.keys());
          broadcast({
            type: 'onlineUsers',
            users: onlineUsers,
          });
          broadcast({
            type: 'disconnect',
            user: name,
          });
        }
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    // Handle user disconnection
    if (name) {
      clients.delete(name);
      const onlineUsers = Array.from(clients.keys());
      broadcast({
        type: 'onlineUsers',
        users: onlineUsers,
      });
      broadcast({
        type: 'disconnect',
        user: name,
      });
    }
  });
});

function broadcast(data) {
  const jsonData = JSON.stringify(data);
  clients.forEach(({ ws }) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(jsonData, (error) => {
        if (error) {
          console.error('Error sending WebSocket data:', error);
        }
      });
    }
  });
}
