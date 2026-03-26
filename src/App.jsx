import React, { useState, useRef, useEffect } from "react";
import "./App.css";

// ─── Report Download Button ────────────────────────────────────────────────
function ReportDownloadButton({ content, apiUrl }) {
  const match = content?.match(/\[([^\]]+)\]\((\/api\/reports\/[^)]+)\)/);
  if (!match) return null;

  const label = match[1];
  const path = match[2];
  const fullUrl = `${apiUrl}${path}`;

  return (
    <a
      href={fullUrl}
      download
      rel="noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        marginTop: "10px",
        padding: "8px 16px",
        backgroundColor: "#1E3A5F",
        color: "#ffffff",
        borderRadius: "6px",
        textDecoration: "none",
        fontSize: "13px",
        fontWeight: 600,
      }}
    >
      ⬇ {label}
    </a>
  );
}

// ─── Strip the markdown download link from visible text ───────────────────
function stripReportLink(text = "") {
  return text.replace(/\[([^\]]+)\]\((\/api\/reports\/[^)]+)\)/g, "").trim();
}

// ─── Markdown → HTML formatter ────────────────────────────────────────────
function formatMarkdown(text) {
  if (!text) return "";

  let html = text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    )
    .replace(/\n/g, "<br/>");

  if (html.includes("|")) {
    const lines = html.split("<br/>");
    let inTable = false;
    let tableHtml = "";
    let processedLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith("|") && line.endsWith("|")) {
        if (!inTable) {
          inTable = true;
          tableHtml = '<div class="table-container"><table>';
        }
        if (line.match(/^\|[\s:-]+\|/)) continue;

        const cells = line
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());

        if (!tableHtml.includes("<thead>")) {
          tableHtml += "<thead><tr>";
          cells.forEach((cell) => {
            tableHtml += `<th>${cell}</th>`;
          });
          tableHtml += "</tr></thead><tbody>";
        } else {
          tableHtml += "<tr>";
          cells.forEach((cell) => {
            tableHtml += `<td>${cell}</td>`;
          });
          tableHtml += "</tr>";
        }
      } else {
        if (inTable) {
          tableHtml += "</tbody></table></div>";
          processedLines.push(tableHtml);
          tableHtml = "";
          inTable = false;
        }
        if (line) processedLines.push(line);
      }
    }

    if (inTable) {
      tableHtml += "</tbody></table></div>";
      processedLines.push(tableHtml);
    }

    html = processedLines.join("<br/>");
  }

  return html;
}

// ─── Avatar SVG: Assistant ────────────────────────────────────────────────
const AssistantAvatar = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <circle cx="9" cy="10" r="1" fill="currentColor" />
    <circle cx="15" cy="10" r="1" fill="currentColor" />
    <path
      d="M8 15C8.5 16 10 17 12 17C14 17 15.5 16 16 15"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// ─── Avatar SVG: User ─────────────────────────────────────────────────────
const UserAvatar = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
    <path
      d="M6 21V19C6 16.2386 8.23858 14 11 14H13C15.7614 14 18 16.2386 18 19V21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// ─── Single message bubble ────────────────────────────────────────────────
function MessageBubble({ message, apiUrl }) {
  const isStreaming = message.streaming === true;
  const displayContent = stripReportLink(message.content || "");

  return (
    <div className={`message-block ${message.role}`}>
      <div className="message-avatar">
        {message.role === "user" ? <UserAvatar /> : <AssistantAvatar />}
      </div>
      <div className="message-content-wrapper">
        <div className={`message-bubble ${message.isError ? "error" : ""}`}>
          <div
            className="message-text"
            dangerouslySetInnerHTML={{
              __html: formatMarkdown(displayContent),
            }}
          />

          {/* Blinking cursor while streaming */}
          {isStreaming && (
            <span
              style={{
                display: "inline-block",
                width: "2px",
                height: "1em",
                backgroundColor: "currentColor",
                marginLeft: "2px",
                verticalAlign: "text-bottom",
                animation: "blink 1s step-end infinite",
              }}
            />
          )}

          {/* Download button for REPORT messages */}
          {message.type === "REPORT" && (
            <ReportDownloadButton
              content={message.content}
              apiUrl={apiUrl}
            />
          )}

          {message.responseTime && (
            <div className="message-meta">
              <span className="response-badge">{message.type}</span>
              <span className="response-time">{message.responseTime}ms</span>
            </div>
          )}
        </div>
        <div className="message-timestamp">
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Typing indicator (shown only before first token arrives) ─────────────
function TypingIndicator() {
  return (
    <div className="message-block assistant">
      <div className="message-avatar">
        <AssistantAvatar />
      </div>
      <div className="message-content-wrapper">
        <div className="message-bubble">
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────
if (!sessionStorage.getItem("chatSessionId")) {
  sessionStorage.setItem("chatSessionId", crypto.randomUUID());
}
const SESSION_ID = sessionStorage.getItem("chatSessionId");

function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "👋 Welcome to the **Recruitment Management AI Assistant**!\n\nI can help you with:\n- **Database queries** — candidates, jobs, applications, interviews, skills, and more\n- **Policy questions** — recruitment procedures and guidelines\n- **Report generation** — downloadable PDF reports\n\nWhat would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // showTyping: true = show the three-dot bubble BEFORE any token arrives
  const [showTyping, setShowTyping] = useState(false);
  const [apiUrl] = useState("http://192.168.1.187:3001");
  const messagesEndRef = useRef(null);
  // Keep a ref to the streaming message id so we can update it in place
  const streamingIdRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showTyping]);

  // ── Core streaming fetch ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const question = input.trim();

    // 1. Add user message
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question, timestamp: new Date() },
    ]);
    setInput("");
    setIsLoading(true);
    setShowTyping(true); // show three-dot bubble while waiting for first token

    const startTime = Date.now();

    try {
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          // Tell backend we want SSE streaming
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ question, sessionId: SESSION_ID }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // 2. Create a placeholder assistant message in state
      const msgId = Date.now();
      streamingIdRef.current = msgId;

      setShowTyping(false); // hide three-dot bubble — first token imminent
      setMessages((prev) => [
        ...prev,
        {
          id: msgId,
          role: "assistant",
          content: "",
          streaming: true,  // triggers blinking cursor
          timestamp: new Date(),
        },
      ]);

      // 3. Read the SSE stream token by token
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalType = null;
      let finalDataframe = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by double newline
        const events = buffer.split("\n\n");
        buffer = events.pop(); // last chunk may be incomplete — keep it

        for (const event of events) {
          const line = event.trim();
          if (!line.startsWith("data:")) continue;

          const raw = line.slice(5).trim();
          if (raw === "[DONE]") break;

          try {
            const parsed = JSON.parse(raw);

            if (parsed.type === "token" && parsed.text) {
              // Append token to the streaming message
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msgId
                    ? { ...m, content: m.content + parsed.text }
                    : m,
                ),
              );
            }

            if (parsed.type === "done") {
              finalType = parsed.routeType;
              finalDataframe = parsed.dataframe;
            }

            if (parsed.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msgId
                    ? {
                        ...m,
                        content: "⚠️ An error occurred. Please try again.",
                        streaming: false,
                        isError: true,
                      }
                    : m,
                ),
              );
            }
          } catch {
            // malformed JSON chunk — ignore
          }
        }
      }

      // 4. Finalise the message — remove streaming cursor, add metadata
      const elapsed = Date.now() - startTime;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                streaming: false,
                type: finalType,
                dataframe: finalDataframe,
                responseTime: elapsed,
              }
            : m,
        ),
      );
    } catch (error) {
      console.error("Streaming error:", error);
      setShowTyping(false);

      // If a placeholder was created, update it with the error
      if (streamingIdRef.current) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingIdRef.current
              ? {
                  ...m,
                  content: `⚠️ **Error**: ${error.message}\n\nPlease check that your backend server is running at ${apiUrl}`,
                  streaming: false,
                  isError: true,
                }
              : m,
          ),
        );
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ **Error**: ${error.message}\n\nPlease check that your backend server is running at ${apiUrl}`,
            timestamp: new Date(),
            isError: true,
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      streamingIdRef.current = null;
    }
  };

  const handleReset = async () => {
    try {
     await fetch(`${apiUrl}/api/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: SESSION_ID }),
      });
      setMessages([
        {
          role: "assistant",
          content: "🔄 **Conversation reset**\n\nHistory cleared. How can I help you?",
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Reset error:", error);
    }
  };

  const quickQuestions = [
    "How many candidates are in the database?",
    "List recent interviews",
    "What is the recruitment process?",
  ];

  return (
    <div className="app">
      <div className="app-container">
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <div className="logo-section">
              <div className="logo-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="logo-text">
                <h1>RecruitAI</h1>
                <p>Intelligent Hiring Assistant</p>
              </div>
            </div>
            <div className="header-actions">
              <button className="btn-secondary" onClick={handleReset}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12Z" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Reset
              </button>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="messages-container">
          <div className="messages-wrapper">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id || index}
                message={message}
                apiUrl={apiUrl}
              />
            ))}

            {/* Three-dot typing bubble — only shown before first token */}
            {showTyping && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Questions */}
        {messages.length === 1 && (
          <div className="quick-questions">
            <p className="quick-questions-label">Try asking:</p>
            <div className="quick-questions-grid">
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  className="quick-question-btn"
                  onClick={() => setInput(question)}
                  disabled={isLoading}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="input-container">
          <form onSubmit={handleSubmit} className="input-form">
            <div className="input-wrapper">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about candidates, jobs, interviews, or recruitment policies..."
                disabled={isLoading}
                className="message-input"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="send-button"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </form>
          <div className="input-footer">
            <p>API: {apiUrl}</p>
          </div>
        </div>
      </div>

      {/* Blinking cursor keyframe — injected once globally */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default App;