export default function VideoGrid({ localVideoRef, remoteVideoRef }) {
  return (
    <div className="video-grid">
      <div className="video-box">
        <div className="label">You 😎</div>
        <video ref={localVideoRef} autoPlay playsInline muted />
      </div>
      <div className="video-box">
        <div className="label">Stranger 👋</div>
        <video ref={remoteVideoRef} autoPlay playsInline />
      </div>
    </div>
  );
}
