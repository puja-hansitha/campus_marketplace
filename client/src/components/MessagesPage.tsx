export default function MessagesPage() {
  return (
    <div>
      <h1>Messages</h1>
      
      <div className="messages-container">
        <div className="messages-list">
          <h3>Conversations</h3>
          <p style={{ color: '#999', textAlign: 'center', marginTop: '40px' }}>No conversations yet</p>
        </div>

        <div className="chat-area">
          <div className="no-chat-selected">
            <p>Select a conversation to start messaging</p>
          </div>
        </div>
      </div>
    </div>
  );
}
