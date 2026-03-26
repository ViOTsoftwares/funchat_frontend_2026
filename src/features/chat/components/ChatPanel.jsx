const QUICK_EMOJIS = ["😀", "😂", "😍", "😎", "😭", "👍", "🙏", "🔥", "💯", "✨"];

export default function ChatPanel({ messages, input, onInputChange, onSend, onEmojiClick, isMatched }) {
  return (
    <div className="chat">
      <div className="messages">
        {messages.map((m, i) => (
          <div key={i} className={m.from === "me" ? "msg me" : "msg"}>
            <span className="sender">{m.from === "me" ? "Me" : "Stranger"}</span>
            <span className="text">{m.text}</span>
          </div>
        ))}
      </div>
      <div className="composer">
        <div className="emoji-bar">
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className="emoji-btn"
              onClick={() => onEmojiClick(e)}
              aria-label={`emoji ${e}`}
              title={e}
            >
              {e}
            </button>
          ))}
        </div>
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Type a message 💭"
        />
        <button onClick={onSend} disabled={!isMatched}>Send ✉️</button>
      </div>
    </div>
  );
}
