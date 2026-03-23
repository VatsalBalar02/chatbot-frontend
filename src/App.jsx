import React, { useState, useRef, useEffect } from "react";
import "./App.css";

// ─── Report Download Button ────────────────────────────────────────────────
// Detects [Download Report](/api/reports/xxx.pdf) in the message content
// and renders a proper <a download> tag so the browser saves the file
// instead of navigating to a new page.
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

// ─── Strip the markdown download link from the visible text ───────────────
// We don't want "[Download Report](/api/reports/xxx.pdf)" to also appear
// as a plain clickable link rendered by formatMarkdown — the button handles it.
function stripReportLink(text = "") {
  return text.replace(/\[([^\]]+)\]\((\/api\/reports\/[^)]+)\)/g, "").trim();
}

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
  const [apiUrl, setApiUrl] = useState("http://192.168.1.145:3001");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();

      const assistantMessage = {
        role: "assistant",
        content: data.answer,
        type: data.type,
        responseTime: data.response_time_ms,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ **Error**: ${error.message}\n\nPlease check that your backend server is running at ${apiUrl}`,
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      await fetch(`${apiUrl}/api/reset`, { method: "POST" });
      setMessages([
        {
          role: "assistant",
          content:
            "🔄 **Conversation reset**\n\nHistory cleared. How can I help you?",
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Reset error:", error);
    }
  };

  const formatMarkdown = (text) => {
    if (!text) return "";

    let html = text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // Normal links (non-report) still rendered as anchors
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
  };

  const quickQuestions = [
    "How many candidates are in the database?",
    "Show me all open job positions",
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
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2L2 7L12 12L22 7L12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 17L12 22L22 17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 12L12 17L22 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="logo-text">
                <h1>RecruitAI</h1>
                <p>Intelligent Hiring Assistant</p>
              </div>
            </div>
            <div className="header-actions">
              <button className="btn-secondary" onClick={handleReset}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M12 8V12L15 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
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
              <div key={index} className={`message-block ${message.role}`}>
                <div className="message-avatar">
                  {message.role === "user" ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle
                        cx="12"
                        cy="8"
                        r="4"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M6 21V19C6 16.2386 8.23858 14 11 14H13C15.7614 14 18 16.2386 18 19V21"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <circle cx="9" cy="10" r="1" fill="currentColor" />
                      <circle cx="15" cy="10" r="1" fill="currentColor" />
                      <path
                        d="M8 15C8.5 16 10 17 12 17C14 17 15.5 16 16 15"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </div>
                <div className="message-content-wrapper">
                  <div
                    className={`message-bubble ${message.isError ? "error" : ""}`}
                  >
                    <div
                      className="message-text"
                      dangerouslySetInnerHTML={{
                        // Strip the raw markdown link before rendering —
                        // the <ReportDownloadButton> below renders it as a proper button
                        __html: formatMarkdown(
                          stripReportLink(message.content),
                        ),
                      }}
                    />

                    {/* ── Download button shown only for REPORT type messages ── */}
                    {message.type === "REPORT" && (
                      <ReportDownloadButton
                        content={message.content}
                        apiUrl={apiUrl}
                      />
                    )}

                    {message.responseTime && (
                      <div className="message-meta">
                        <span className="response-badge">{message.type}</span>
                        <span className="response-time">
                          {message.responseTime}ms
                        </span>
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
            ))}

            {isLoading && (
              <div className="message-block assistant">
                <div className="message-avatar">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle cx="9" cy="10" r="1" fill="currentColor" />
                    <circle cx="15" cy="10" r="1" fill="currentColor" />
                    <path
                      d="M8 15C8.5 16 10 17 12 17C14 17 15.5 16 16 15"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
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
            )}

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
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22 2L11 13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M22 2L15 22L11 13L2 9L22 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </form>
          <div className="input-footer">
            <p>API: {apiUrl}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
