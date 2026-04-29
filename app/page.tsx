"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
  image?: string; // base64, memory only — never persisted
};

const STORAGE_KEY = "raunak_chat_v2";

function getTime() {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"}`;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-[6px] px-2 py-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </div>
  );
}

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
    </svg>
  );
}

function PoemIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

function StarField() {
  const stars = Array.from({ length: 60 }).map((_, i) => ({
    id: i,
    x: ((i * 137.508) % 100),
    y: ((i * 97.3) % 100),
    size: 1 + (i % 3),
    delay: (i * 0.3) % 8,
    duration: 3 + (i % 5),
  }));
  return (
    <div className="bg-stars">
      {stars.map((s) => (
        <div
          key={s.id}
          className="star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

function FloatingParticles() {
  const items = [
    { sym: "🌸", l: 8,  d: 0,   dur: 18 },
    { sym: "✦",  l: 18, d: 3,   dur: 22 },
    { sym: "·",  l: 28, d: 7,   dur: 15 },
    { sym: "🌹", l: 40, d: 1.5, dur: 25 },
    { sym: "✿",  l: 52, d: 9,   dur: 20 },
    { sym: "°",  l: 63, d: 4,   dur: 17 },
    { sym: "🌸", l: 74, d: 11,  dur: 23 },
    { sym: "✦",  l: 83, d: 6,   dur: 19 },
    { sym: "·",  l: 92, d: 2,   dur: 16 },
    { sym: "✿",  l: 35, d: 13,  dur: 21 },
    { sym: "°",  l: 58, d: 8,   dur: 14 },
    { sym: "🌸", l: 70, d: 5,   dur: 26 },
  ];
  return (
    <div className="particles-container" aria-hidden="true">
      {items.map((p, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${p.l}%`,
            animationDelay: `${p.d}s`,
            animationDuration: `${p.dur}s`,
            fontSize: `${11 + (i % 5)}px`,
            opacity: 0.22 + (i % 4) * 0.07,
          }}
        >
          {p.sym}
        </div>
      ))}
    </div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [timestamps, setTimestamps] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingImageName, setPendingImageName] = useState<string>("");
  const [poemMode, setPoemMode] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const safeMessages = (parsed.messages || []).map((m: Message) => ({ ...m, image: undefined }));
        setMessages(safeMessages);
        setTimestamps(parsed.timestamps || []);
        if (safeMessages.length > 0) setShowWelcome(false);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const complete = messages.filter((m) => m.content !== "");
    if (complete.length === 0) return;
    try {
      const safeMessages = complete.map((m) => ({ role: m.role, content: m.content }));
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: safeMessages, timestamps }));
    } catch {}
  }, [messages, timestamps]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const clear = () => sessionStorage.removeItem(STORAGE_KEY);
    window.addEventListener("beforeunload", clear);
    return () => window.removeEventListener("beforeunload", clear);
  }, []);

  const newChat = () => {
    setMessages([]); setTimestamps([]); setPendingImage(null);
    setPendingImageName(""); setPoemMode(false); setShowWelcome(true);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) { alert("Keep it under 5MB missy 🌸"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPendingImage(ev.target?.result as string);
      setPendingImageName(file.name);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  const removePendingImage = () => { setPendingImage(null); setPendingImageName(""); };

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, []);

  const sendMessage = async () => {
    if ((!input.trim() && !pendingImage) || loading) return;
    const userText = input.trim();
    const userTime = getTime();
    const imageToSend = pendingImage;
    setInput(""); setPendingImage(null); setPendingImageName(""); setPoemMode(false);
    setShowWelcome(false); setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: Message = {
      role: "user",
      content: userText || "(shared a photo)",
      ...(imageToSend ? { image: imageToSend } : {}),
    };
    setMessages((prev) => [...prev.filter((m) => m.content !== ""), userMsg, { role: "assistant", content: "" }]);
    setTimestamps((prev) => [...prev, userTime, ""]);

    try {
      const historyForApi = messages.filter((m) => m.content !== "").map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText || "(She shared a photo with you — describe it like only you can)",
          history: historyForApi,
          image: imageToSend || undefined,
          poemMode,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: fullText }; return u; });
      }
      const aiTime = getTime();
      setTimestamps((prev) => { const u = [...prev]; u[u.length - 1] = aiTime; return u; });
    } catch (e) {
      console.error(e);
      setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: "something went sideways... give me a sec 🌸" }; return u; });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Lora:ital,wght@0,400;0,500;1,400&family=Dancing+Script:wght@500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Lora',Georgia,serif;overflow:hidden;}

        .chat-root{display:flex;flex-direction:column;height:100dvh;position:relative;overflow:hidden;background:#120608;}

        .bg-layer-base{position:fixed;inset:0;z-index:0;background:radial-gradient(ellipse at 25% 15%,#2a0c18 0%,#160709 45%,#0c0405 100%);}

        .bg-aurora{position:fixed;inset:0;z-index:1;pointer-events:none;overflow:hidden;}
        .aurora-orb{position:absolute;border-radius:50%;filter:blur(90px);animation:auroraFloat linear infinite;mix-blend-mode:screen;}
        .ao1{width:520px;height:520px;top:-130px;left:-90px;background:radial-gradient(circle,rgba(170,35,65,0.2) 0%,transparent 70%);animation-duration:24s;animation-delay:0s;}
        .ao2{width:420px;height:420px;top:25%;right:-110px;background:radial-gradient(circle,rgba(110,25,75,0.16) 0%,transparent 70%);animation-duration:30s;animation-delay:-9s;}
        .ao3{width:620px;height:320px;bottom:-90px;left:5%;background:radial-gradient(circle,rgba(190,70,50,0.1) 0%,transparent 70%);animation-duration:38s;animation-delay:-16s;}
        .ao4{width:280px;height:280px;top:45%;left:35%;background:radial-gradient(circle,rgba(240,130,90,0.07) 0%,transparent 70%);animation-duration:22s;animation-delay:-6s;}
        @keyframes auroraFloat{0%{transform:translate(0,0) scale(1);}25%{transform:translate(45px,-35px) scale(1.09);}50%{transform:translate(-25px,55px) scale(0.94);}75%{transform:translate(65px,25px) scale(1.06);}100%{transform:translate(0,0) scale(1);}}

        .bg-stars{position:fixed;inset:0;z-index:2;pointer-events:none;}
        .star{position:absolute;border-radius:50%;background:rgba(255,215,195,0.55);animation:twinkle ease-in-out infinite;}
        @keyframes twinkle{0%,100%{opacity:0.08;transform:scale(0.7);}50%{opacity:0.85;transform:scale(1.3);}}

        .particles-container{position:fixed;inset:0;z-index:3;pointer-events:none;overflow:hidden;}
        .particle{position:absolute;bottom:-20px;animation:riseUp linear infinite;user-select:none;}
        @keyframes riseUp{0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:0;}10%{opacity:1;}90%{opacity:0.5;}100%{transform:translateY(-108vh) translateX(25px) rotate(360deg);opacity:0;}}

        .bg-vignette{position:fixed;inset:0;z-index:4;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,transparent 50%,rgba(8,2,6,0.6) 100%);}

        /* HEADER */
        .header{position:relative;z-index:20;display:flex;align-items:center;gap:14px;padding:14px 20px;background:rgba(22,6,14,0.72);backdrop-filter:blur(28px);border-bottom:1px solid rgba(190,70,70,0.16);flex-shrink:0;box-shadow:0 2px 30px rgba(130,25,45,0.18);}
        .avatar-wrap{position:relative;flex-shrink:0;}
        .avatar{width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#b04535 0%,#7a2030 50%,#5a1020 100%);display:flex;align-items:center;justify-content:center;font-family:'Dancing Script',cursive;font-size:18px;color:#ffd0c0;font-weight:600;box-shadow:0 4px 20px rgba(160,45,45,0.45),0 0 35px rgba(180,70,55,0.12);}
        .avatar-ring{position:absolute;inset:-3px;border-radius:50%;border:1.5px solid rgba(190,110,90,0.45);animation:avatarPulse 3.5s ease-in-out infinite;}
        @keyframes avatarPulse{0%,100%{box-shadow:0 0 0 0 rgba(190,90,70,0);}50%{box-shadow:0 0 0 7px rgba(190,90,70,0.07);}}
        .online-dot{position:absolute;bottom:1px;right:1px;width:11px;height:11px;border-radius:50%;background:#55b880;border:2px solid #120608;animation:breathDot 2.8s ease-in-out infinite;}
        @keyframes breathDot{0%,100%{box-shadow:0 0 0 0 rgba(85,184,128,0);}50%{box-shadow:0 0 0 4px rgba(85,184,128,0.18);}}
        .header-info{flex:1;}
        .header-name{font-family:'Dancing Script',cursive;font-size:22px;font-weight:600;color:#f0bca8;line-height:1;}
        .header-status{font-family:'Lora',serif;font-size:11px;color:rgba(190,130,110,0.65);margin-top:2px;font-style:italic;}
        .new-chat-btn{font-family:'Lora',serif;font-size:12px;color:rgba(210,140,120,0.8);background:rgba(185,70,55,0.1);border:1px solid rgba(190,90,70,0.2);border-radius:20px;padding:6px 14px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:5px;}
        .new-chat-btn:hover{background:rgba(185,70,55,0.2);color:#f0aca8;}

        /* MESSAGES */
        .messages-area{flex:1;overflow-y:auto;padding:24px 16px 16px;display:flex;flex-direction:column;gap:16px;position:relative;z-index:10;scroll-behavior:smooth;}
        .messages-area::-webkit-scrollbar{width:3px;}
        .messages-area::-webkit-scrollbar-track{background:transparent;}
        .messages-area::-webkit-scrollbar-thumb{background:rgba(190,80,60,0.2);border-radius:2px;}

        /* WELCOME */
        .welcome{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;text-align:center;padding:40px 20px;animation:fadeUp 0.9s ease;}
        .welcome-rose{font-size:52px;margin-bottom:20px;animation:float 4s ease-in-out infinite;filter:drop-shadow(0 0 22px rgba(190,60,55,0.45));}
        .welcome-title{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:300;color:#efbba5;line-height:1.2;margin-bottom:8px;text-shadow:0 0 35px rgba(190,60,55,0.25);}
        .welcome-sub{font-family:'Lora',serif;font-size:14px;color:rgba(195,140,125,0.75);font-style:italic;max-width:280px;line-height:1.8;}
        .welcome-hints{display:flex;flex-direction:column;gap:8px;margin-top:32px;width:100%;max-width:320px;}
        .hint-chip{background:rgba(255,255,255,0.04);border:1px solid rgba(190,90,70,0.2);border-radius:12px;padding:10px 16px;font-family:'Lora',serif;font-size:13px;color:rgba(210,150,130,0.85);cursor:pointer;transition:all 0.25s;text-align:left;backdrop-filter:blur(12px);}
        .hint-chip:hover{background:rgba(185,70,55,0.12);border-color:rgba(190,90,70,0.4);transform:translateX(5px);color:#efbba5;}

        /* MSG ROWS */
        .msg-row{display:flex;animation:fadeUp 0.3s ease;}
        .msg-row.user{justify-content:flex-end;}
        .msg-row.assistant{justify-content:flex-start;}
        .msg-bubble-wrap{max-width:78%;display:flex;flex-direction:column;}
        .msg-row.user .msg-bubble-wrap{align-items:flex-end;}
        .msg-row.assistant .msg-bubble-wrap{align-items:flex-start;}
        .msg-bubble{padding:12px 16px;border-radius:20px;font-family:'Lora',serif;font-size:14px;line-height:1.85;position:relative;word-break:break-word;white-space:pre-wrap;}
        .msg-bubble.user{background:linear-gradient(135deg,#a84030 0%,#7e2020 100%);color:#ffe5d8;border-bottom-right-radius:6px;box-shadow:0 4px 20px rgba(140,28,28,0.38);}
        .msg-bubble.assistant{background:rgba(255,255,255,0.065);color:#f0d5c8;border-bottom-left-radius:6px;box-shadow:0 4px 20px rgba(0,0,0,0.3);border:1px solid rgba(190,95,75,0.16);backdrop-filter:blur(18px);}
        .msg-image{max-width:220px;border-radius:14px;margin-bottom:8px;object-fit:cover;box-shadow:0 4px 20px rgba(0,0,0,0.35);}
        .msg-time{font-family:'Lora',serif;font-size:10px;color:rgba(170,110,90,0.55);margin-top:4px;font-style:italic;}

        /* TYPING */
        .typing-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,#b85848,#985038);animation:typingBounce 1.2s ease-in-out infinite;}

        /* INPUT AREA */
        .input-area{position:relative;z-index:20;padding:12px 16px 16px;background:rgba(16,5,10,0.72);backdrop-filter:blur(26px);border-top:1px solid rgba(190,75,55,0.14);flex-shrink:0;}
        .pending-image-preview{display:flex;align-items:center;gap:10px;background:rgba(185,70,55,0.1);border:1px solid rgba(190,95,75,0.22);border-radius:12px;padding:8px 12px;margin-bottom:10px;}
        .pending-thumb{width:40px;height:40px;object-fit:cover;border-radius:8px;flex-shrink:0;}
        .pending-name{flex:1;font-family:'Lora',serif;font-size:12px;color:rgba(210,145,125,0.85);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-style:italic;}
        .pending-remove{background:none;border:none;color:rgba(195,95,75,0.75);cursor:pointer;font-size:18px;line-height:1;padding:2px;flex-shrink:0;}
        .poem-mode-badge{display:flex;align-items:center;gap:6px;background:rgba(170,75,35,0.11);border:1px solid rgba(195,115,75,0.22);border-radius:8px;padding:6px 12px;margin-bottom:10px;font-family:'Lora',serif;font-size:12px;color:rgba(215,155,115,0.85);font-style:italic;}

        /* KEY FIX: align-items:center centers the textarea vertically */
        .input-row{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.055);border:1.5px solid rgba(190,95,75,0.22);border-radius:28px;padding:6px 8px 6px 14px;transition:border-color 0.2s,box-shadow 0.2s;}
        .input-row:focus-within{border-color:rgba(190,75,55,0.48);box-shadow:0 0 0 3px rgba(190,75,55,0.07),0 4px 22px rgba(140,28,28,0.14);}

        .chat-textarea{flex:1;background:transparent;border:none;outline:none;font-family:'Lora',serif;font-size:14px;color:#f0cebc;resize:none;line-height:1.6;max-height:120px;min-height:22px;padding:0;display:block;align-self:center;}
        .chat-textarea::placeholder{color:rgba(170,110,90,0.48);font-style:italic;}

        .icon-btn{background:none;border:none;cursor:pointer;color:rgba(190,110,90,0.65);display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;transition:background 0.2s,color 0.2s,transform 0.15s;flex-shrink:0;}
        .icon-btn:hover{background:rgba(185,70,55,0.14);color:#efaaa0;transform:scale(1.1);}
        .icon-btn.active{background:rgba(185,95,55,0.2);color:#efaaa0;}
        .send-btn{background:linear-gradient(135deg,#b05535 0%,#8a2525 100%);border:none;cursor:pointer;color:#ffe8d8;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;transition:transform 0.15s,box-shadow 0.2s;flex-shrink:0;box-shadow:0 4px 16px rgba(140,35,25,0.42);}
        .send-btn:hover{transform:scale(1.1) rotate(-5deg);box-shadow:0 6px 22px rgba(160,42,32,0.52);}
        .send-btn:disabled{opacity:0.28;cursor:not-allowed;transform:none;}
        .input-hint{text-align:center;font-family:'Lora',serif;font-size:10px;color:rgba(155,95,75,0.48);margin-top:8px;font-style:italic;}

        .date-divider{display:flex;align-items:center;gap:10px;margin:4px 0;}
        .date-divider::before,.date-divider::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(190,95,75,0.18),transparent);}
        .date-text{font-family:'Lora',serif;font-size:10px;color:rgba(170,105,85,0.48);font-style:italic;}

        @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
        @keyframes float{0%,100%{transform:translateY(0) rotate(-2deg);}50%{transform:translateY(-10px) rotate(2deg);}}
        @keyframes typingBounce{0%,60%,100%{transform:translateY(0);opacity:0.4;}30%{transform:translateY(-6px);opacity:1;}}
      `}</style>

      <div className="chat-root">
        <div className="bg-layer-base" />
        <div className="bg-aurora">
          <div className="aurora-orb ao1" />
          <div className="aurora-orb ao2" />
          <div className="aurora-orb ao3" />
          <div className="aurora-orb ao4" />
        </div>
        <StarField />
        <FloatingParticles />
        <div className="bg-vignette" />

        {/* HEADER */}
        <div className="header">
          <div className="avatar-wrap">
            <div className="avatar">R</div>
            <div className="avatar-ring" />
            <div className="online-dot" />
          </div>
          <div className="header-info">
            <div className="header-name">Raunak</div>
            <div className="header-status">always here for you... 🌸</div>
          </div>
          <button className="new-chat-btn" onClick={newChat}>
            <HeartIcon /> New
          </button>
        </div>

        {/* MESSAGES */}
        <div className="messages-area">
          {showWelcome && messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-rose">🌹</div>
              <div className="welcome-title">Hey Soumya...</div>
              <div className="welcome-sub">
                Tell me what's on your mind!.
              </div>
              <div className="welcome-hints">
                {[
                  "✍🏼 Shall I write a poem for you...",
                  "📸 Do you want me to describe you?",
                  "💬 I'm feeling a little lonely today, Raunak!",
                  "🌙 Tell me something beautiful",
                ].map((hint) => (
                  <button
                    key={hint}
                    className="hint-chip"
                    onClick={() => {
                      if (hint.includes("poem")) { setPoemMode(true); setInput("Write me a poem"); }
                      else { setInput(hint.replace(/^[^\s]+\s/, "")); }
                      textareaRef.current?.focus();
                    }}
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="date-divider">
                <span className="date-text">
                  {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
                </span>
              </div>
              {messages.map((msg, i) => {
                const isUser = msg.role === "user";
                const ts = timestamps[i];
                return (
                  <div key={i} className={`msg-row ${isUser ? "user" : "assistant"}`}>
                    <div className="msg-bubble-wrap">
                      {msg.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={msg.image} alt="shared" className="msg-image" />
                      )}
                      <div className={`msg-bubble ${isUser ? "user" : "assistant"}`}>
                        {msg.content === "" && !isUser ? <TypingDots /> : msg.content}
                      </div>
                      <div className="msg-time">
                        {ts || ""}
                        {!isUser && msg.content && <span style={{ marginLeft: 6, opacity: 0.45 }}>🌸</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div className="input-area">
          {pendingImage && (
            <div className="pending-image-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingImage} alt="preview" className="pending-thumb" />
              <span className="pending-name">{pendingImageName}</span>
              <button className="pending-remove" onClick={removePendingImage} title="Remove">×</button>
            </div>
          )}
          {poemMode && (
            <div className="poem-mode-badge">
              <PoemIcon /> poem mode on... writing just for you 🌹
            </div>
          )}
          <div className="input-row">
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSelect} />
            <button className="icon-btn" title="Share a photo" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon />
            </button>
            <button className={`icon-btn ${poemMode ? "active" : ""}`} title="Write me a poem" onClick={() => setPoemMode((p) => !p)}>
              <PoemIcon />
            </button>
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              placeholder={poemMode ? "what shall I write about..." : pendingImage ? "say something about this photo..." : "say something to me..."}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button className="send-btn" onClick={sendMessage} disabled={loading || (!input.trim() && !pendingImage)}>
              <SendIcon />
            </button>
          </div>
          <div className="input-hint">your words are safe here ✦ always</div>
        </div>
      </div>
    </>
  );
}
