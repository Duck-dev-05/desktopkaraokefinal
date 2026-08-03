import { useState } from "react";
import { Mic2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { start, onUrl, cancel, onInvalidUrl } from "@fabianlars/tauri-plugin-oauth";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useAuth } from "../context/AuthContext";
import { initDB, User } from "../db";
import "./Login.css";

// PLACEHOLDER CONSTANTS for the user to replace later.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID";
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || "YOUR_CLIENT_SECRET";
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || "http://localhost:8989";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const form = e.target as HTMLFormElement;
      const emailInput = form.querySelector('input[type="email"]') as HTMLInputElement;
      const nameInput = form.querySelector('input[placeholder="Enter your name"]') as HTMLInputElement;
      const db = await initDB();
      
      let username = "Local User";
      if (!isLogin && nameInput) username = nameInput.value;
      else if (emailInput) username = emailInput.value.split('@')[0];

      const existingUsers = await db.select('SELECT * FROM users WHERE username = $1', [username]) as User[];
      let dbUser: User;
      if (existingUsers.length > 0) {
        dbUser = existingUsers[0];
      } else {
        const role = username.toLowerCase() === 'admin' ? 'admin' : 'user';
        const result = await db.execute('INSERT INTO users (username, avatar_url, bio, followers_count, following_count, role) VALUES ($1, $2, $3, $4, $5, $6)', [username, `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`, 'New karaoke fan! 🎤', 0, 0, role]);
        dbUser = { id: result.lastInsertId as number, username, avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`, bio: 'New karaoke fan! 🎤', followers_count: 0, following_count: 0, role, created_at: new Date().toISOString() };
      }
      login(dbUser);
      navigate('/');
    } catch (err) {
      console.error(err);
      alert("Đăng nhập thất bại");
    }
  };

  const handleGoogleLogin = async () => {
    if (GOOGLE_CLIENT_ID === "YOUR_CLIENT_ID" || !GOOGLE_CLIENT_ID) {
      alert("Vui lòng cập nhật VITE_GOOGLE_CLIENT_ID và VITE_GOOGLE_CLIENT_SECRET trong file .env trước!");
      return;
    }

    try {
      setIsLoading(true);
      // 1. Start the local OAuth server on the port specified in redirect URI
      const portUrl = new URL(GOOGLE_REDIRECT_URI);
      const portNum = portUrl.port ? parseInt(portUrl.port, 10) : 8989;
      
      const successHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Đăng Nhập Thành Công - KaraokePro</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700&display=swap" rel="stylesheet">
        <style>
          body { margin: 0; padding: 0; background: #0a0a0a; color: #fff; font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; text-align: center; overflow: hidden; }
          .card { background: rgba(255, 255, 255, 0.03); padding: 3rem; border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.05); backdrop-filter: blur(20px); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); animation: fadein 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
          h1 { margin: 0 0 1rem 0; font-size: 2.5rem; background: linear-gradient(135deg, #a855f7, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          p { color: #a1a1aa; font-size: 1.1rem; margin-bottom: 2rem; }
          .icon { font-size: 64px; margin-bottom: 1.5rem; animation: bounce 2s infinite; }
          .progress { width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }
          .progress-bar { height: 100%; background: linear-gradient(90deg, #a855f7, #ec4899); animation: load 2s ease-in-out forwards; }
          @keyframes fadein { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
          @keyframes load { to { width: 100%; } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✨</div>
          <h1>Xác Thực Thành Công</h1>
          <p>Bạn có thể đóng cửa sổ này và quay lại ứng dụng.</p>
          <div class="progress"><div class="progress-bar"></div></div>
        </div>
        <script>setTimeout(() => window.close(), 3000);</script>
      </body>
      </html>
      `;

      const port = await start({
        ports: [portNum],
        response: successHtml
      });

      // 2. Set up a listener for the callback URL
      console.log("Setting up OAuth URL listener...");
      
      onInvalidUrl((err) => {
        console.error("Received invalid OAuth URL:", err);
      });

      let unlisten: (() => void) | undefined;
      unlisten = await onUrl(async (url) => {
        console.log("OAUTH CALLBACK FIRED WITH URL:", url);
        if (unlisten) unlisten(); // Stop listening
        try {
          await cancel(port); // Shutdown the local server
        } catch (e) {
          console.warn("Server might already be stopped:", e);
        }

        // Extract the code from the URL (e.g., http://localhost:port/?code=xyz...)
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');

        if (code) {
          try {
            // Exchange code for token
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code',
              }),
            });

            const tokenData = await tokenResponse.json();
            
            if (tokenData.access_token) {
              // Now we have the access token! We can fetch user info.
              const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
              });
              const userInfo = await userInfoResponse.json();

              console.log("Logged in as:", userInfo);
              
              const db = await initDB();
              const existingUsers = await db.select('SELECT * FROM users WHERE username = $1', [userInfo.name]) as User[];
              let dbUser: User;
              if (existingUsers.length > 0) {
                dbUser = existingUsers[0];
              } else {
                const role = userInfo.name.toLowerCase() === 'admin' ? 'admin' : 'user';
                const result = await db.execute('INSERT INTO users (username, avatar_url, bio, followers_count, following_count, role) VALUES ($1, $2, $3, $4, $5, $6)', [userInfo.name, userInfo.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userInfo.name}`, 'Vừa tham gia qua Google!', 0, 0, role]);
                dbUser = { id: result.lastInsertId as number, username: userInfo.name, avatar_url: userInfo.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userInfo.name}`, bio: 'Vừa tham gia qua Google!', followers_count: 0, following_count: 0, role, created_at: new Date().toISOString() };
              }
              login(dbUser);
              navigate('/');
            } else {
              console.error("Failed to get token:", tokenData);
              alert("Xác thực thất bại.");
            }
          } catch (err) {
            console.error("Token exchange error:", err);
            alert("Lỗi trao đổi token.");
          }
        }
        setIsLoading(false);
      });

      // 3. Open the user's browser to the Google OAuth page
      const redirectUri = encodeURIComponent(GOOGLE_REDIRECT_URI);
      const scope = encodeURIComponent('email profile openid');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline`;
      
      await openUrl(authUrl);

    } catch (error) {
      console.error("OAuth error:", error);
      setIsLoading(false);
      alert("Lỗi khởi tạo quá trình OAuth.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-visual bento-card">
        <div className="visual-overlay">
          <Mic2 size={64} color="white" className="login-logo-icon" />
          <h1>KaraokePro</h1>
          <p>Sân khấu đang chờ bạn. Hãy hát hết mình cùng thế giới.</p>
        </div>
      </div>

      <div className="login-form-container bento-card">
        <div className="form-header">
          <h2>{isLogin ? "Chào Mừng Trở Lại" : "Tạo Tài Khoản"}</h2>
          <p className="text-muted">
            {isLogin ? "Vui lòng nhập thông tin để đăng nhập." : "Đăng ký để bắt đầu ca hát!"}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label>Tên</label>
              <input type="text" placeholder="Nhập tên của bạn" required />
            </div>
          )}
          
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="Nhập email của bạn" required />
          </div>
          
          <div className="form-group">
            <label>Mật khẩu</label>
            <input type="password" placeholder="••••••••" required />
          </div>

          {isLogin && (
            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" /> Ghi nhớ đăng nhập
              </label>
              <a href="#" className="forgot-password">Quên mật khẩu?</a>
            </div>
          )}

          <button type="submit" className="btn btn-primary submit-btn">
            {isLogin ? "Đăng Nhập" : "Đăng Ký"}
          </button>

          <div className="auth-divider">
            <span>Hoặc</span>
          </div>

          <button 
            type="button" 
            className="btn btn-outline google-auth-btn"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              "Đang chờ trình duyệt..."
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Tiếp tục với Google
              </>
            )}
          </button>
        </form>

        <div className="auth-switch">
          <span className="text-muted">
            {isLogin ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
          </span>
          <button className="switch-btn text-main" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Đăng Ký" : "Đăng Nhập"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
