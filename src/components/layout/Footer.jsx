import { ENV } from "../../config/env.js";

export default function Footer({ socketId }) {
  return (
    <footer className="footer">
      <div>Connected service: {ENV.API_URL}</div>
      <div>Session ID: {socketId}</div>
    </footer>
  );
}
