export default function Header({ status }) {
  return (
    <header className="header">
      <h1>FunChat Connect</h1>
      <div className="status">Service status: {status}</div>
    </header>
  );
}
