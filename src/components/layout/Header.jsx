export default function Header({ status }) {
  return (
    <header className="header">
      <h1>FunChat 2026 ✨</h1>
      <div className="status">Status: {status} ⚡</div>
    </header>
  );
}
