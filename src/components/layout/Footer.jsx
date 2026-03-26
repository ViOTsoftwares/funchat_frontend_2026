import { BACKEND_URL } from "../lib/constants";

export default function Footer({ socketId }) {
  return (
    <footer className="footer">
      <div>Backend: {BACKEND_URL}</div>
      <div>My ID: {socketId}</div>
    </footer>
  );
}
