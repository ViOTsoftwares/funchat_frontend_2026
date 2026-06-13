import { BACKEND_URL } from "../lib/constants";

export default function Footer({ socketId }) {
  return (
    <footer className="footer">
      <div>Connected service: {BACKEND_URL}</div>
      <div>Session ID: {socketId}</div>
    </footer>
  );
}
