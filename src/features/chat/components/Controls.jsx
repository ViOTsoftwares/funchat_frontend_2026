export default function Controls({
  mode,
  onModeChange,
  onJoin,
  onNext,
  onReport,
  onStopVideo,
  isMatched,
  isVideo
}) {
  return (
    <div className="controls">
      <label>
        <input
          type="radio"
          name="mode"
          value="chat"
          checked={mode === "chat"}
          onChange={() => onModeChange("chat")}
        />
        Chat 💬
      </label>
      <label>
        <input
          type="radio"
          name="mode"
          value="video"
          checked={mode === "video"}
          onChange={() => onModeChange("video")}
        />
        Video 📹
      </label>
      <button onClick={onJoin}>Start 🚀</button>
      <button onClick={onNext} disabled={!isMatched}>Next ⏭️</button>
      <button onClick={onReport} disabled={!isMatched}>Report 🚩</button>
      {isVideo && (
        <button onClick={onStopVideo}>Stop Video ⛔</button>
      )}
    </div>
  );
}
