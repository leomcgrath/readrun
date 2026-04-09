"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type User = "Leo" | "Selma";
type ActivityType = "pages" | "km";

interface ActivityRow {
  id: string;
  user_name: string;
  activity_type: ActivityType;
  amount: number;
  logged_at: string;
}

interface Totals {
  pages: number;
  km: number;
}

const PASSWORDS: Record<User, string> = { Leo: "leo123", Selma: "selma456" };

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const logDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (logDay.getTime() === today.getTime()) return "Today";
  if (logDay.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function fmtPages(n: number): string {
  return Math.round(n).toLocaleString("en");
}

function fmtKm(n: number): string {
  if (n === 0) return "0";
  const v = Math.round(n * 10) / 10;
  return v % 1 === 0 ? v.toString() : v.toFixed(1);
}

export default function Page() {
  const [session, setSession] = useState<{ user: User } | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Login
  const [selectedUser, setSelectedUser] = useState<User>("Leo");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Data
  const [leoTotals, setLeoTotals] = useState<Totals>({ pages: 0, km: 0 });
  const [selmaTotals, setSelmaTotals] = useState<Totals>({ pages: 0, km: 0 });
  const [recentLogs, setRecentLogs] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(false);

  // Log form
  const [logType, setLogType] = useState<ActivityType>("pages");
  const [logAmount, setLogAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Reset
  const [showReset, setShowReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("readrun_session");
      if (stored) setSession(JSON.parse(stored));
    } catch {
      // ignore
    }
    setSessionLoaded(true);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setDataError(false);
    try {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*");

      if (error) throw error;

      if (data) {
        const calcTotal = (user: string, type: ActivityType) =>
          data
            .filter((r) => r.user_name === user && r.activity_type === type)
            .reduce((s, r) => s + Number(r.amount), 0);

        setLeoTotals({
          pages: calcTotal("Leo", "pages"),
          km: calcTotal("Leo", "km"),
        });
        setSelmaTotals({
          pages: calcTotal("Selma", "pages"),
          km: calcTotal("Selma", "km"),
        });

        const sorted = [...data].sort(
          (a, b) =>
            new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
        );
        setRecentLogs(sorted.slice(0, 10));
      }
    } catch {
      setDataError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) fetchData();
  }, [session, fetchData]);

  function login() {
    if (password === PASSWORDS[selectedUser]) {
      const s = { user: selectedUser };
      setSession(s);
      localStorage.setItem("readrun_session", JSON.stringify(s));
      setLoginError("");
    } else {
      setLoginError("Wrong password. Try again.");
    }
  }

  function logout() {
    setSession(null);
    localStorage.removeItem("readrun_session");
  }

  async function submitLog() {
    if (!session || !logAmount || Number(logAmount) <= 0) return;
    setSubmitting(true);
    setSubmitError("");
    const { error } = await supabase.from("activity_log").insert({
      user_name: session.user,
      activity_type: logType,
      amount: Number(logAmount),
    });
    setSubmitting(false);
    if (error) {
      setSubmitError("Failed to log. Try again.");
    } else {
      setLogAmount("");
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 1800);
      fetchData();
    }
  }

  async function resetData() {
    if (!session) return;
    setResetting(true);
    await supabase
      .from("activity_log")
      .delete()
      .eq("user_name", session.user);
    setResetting(false);
    setShowReset(false);
    fetchData();
  }

  // Blank while loading session to avoid flash
  if (!sessionLoaded) {
    return <div style={{ minHeight: "100svh", background: "#0c0c13" }} />;
  }

  // ── Login screen ───────────────────────────────────────────
  if (!session) {
    return (
      <div className="login">
        <div className="login-logo">ReadRun</div>
        <div className="login-tagline">Pages read. Kilometers run.</div>

        <div className="login-card">
          <span className="login-label">Who are you?</span>
          <div className="user-grid">
            {(["Leo", "Selma"] as User[]).map((u) => (
              <button
                key={u}
                className={`user-btn ${
                  selectedUser === u
                    ? u === "Leo"
                      ? "selected-leo"
                      : "selected-selma"
                    : ""
                }`}
                onClick={() => {
                  setSelectedUser(u);
                  setPassword("");
                  setLoginError("");
                }}
              >
                <span className="user-btn-emoji">
                  {u === "Leo" ? "🦁" : "🦊"}
                </span>
                <span className="user-btn-name">{u}</span>
              </button>
            ))}
          </div>

          <span className="login-label">Password</span>
          <input
            className="input"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            autoFocus
          />

          <button className="btn-primary" onClick={login}>
            Let&apos;s Go →
          </button>

          {loginError && <div className="login-error">{loginError}</div>}
        </div>
      </div>
    );
  }

  // ── Main app ───────────────────────────────────────────────
  const leoColor = "var(--leo)";
  const selmaColor = "var(--selma)";
  const userColor = session.user === "Leo" ? leoColor : selmaColor;

  const pagesLeader =
    leoTotals.pages > selmaTotals.pages
      ? "Leo"
      : selmaTotals.pages > leoTotals.pages
      ? "Selma"
      : null;
  const kmLeader =
    leoTotals.km > selmaTotals.km
      ? "Leo"
      : selmaTotals.km > leoTotals.km
      ? "Selma"
      : null;

  function HeroStat({
    label,
    value,
    unit,
    isLeading,
    userKey,
  }: {
    label: string;
    value: string;
    unit?: string;
    isLeading: boolean;
    userKey: User;
  }) {
    const color = userKey === "Leo" ? leoColor : selmaColor;
    const badgeBg =
      userKey === "Leo"
        ? "rgba(77,166,255,0.15)"
        : "rgba(255,140,66,0.15)";
    return (
      <div className="hero-stat">
        <div className="hero-stat-label">{label}</div>
        <div className="hero-stat-row">
          <span
            className="hero-stat-value"
            style={{ color: isLeading ? color : "var(--text)" }}
          >
            {loading ? (
              <span
                className="skeleton"
                style={{ width: "4rem", height: "2.6rem" }}
              />
            ) : (
              value
            )}
          </span>
          {unit && <span className="hero-stat-unit">{unit}</span>}
          {!loading && isLeading && (
            <span
              className="hero-lead-badge"
              style={{ background: badgeBg, color }}
            >
              ▲ lead
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <span className="header-brand">ReadRun</span>
        <div className="header-right">
          <span className="header-user" style={{ color: userColor }}>
            {session.user === "Leo" ? "🦁" : "🦊"} {session.user}
          </span>
          <button className="logout-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      {/* Hero comparison */}
      <div className="hero">
        {/* Leo */}
        <div
          className="hero-col"
          style={{ borderTop: `3px solid ${leoColor}` }}
        >
          <div className="hero-username" style={{ color: leoColor }}>
            🦁 Leo
          </div>
          <HeroStat
            label="📚 Pages"
            value={fmtPages(leoTotals.pages)}
            isLeading={pagesLeader === "Leo"}
            userKey="Leo"
          />
          <HeroStat
            label="🏃 Kilometers"
            value={fmtKm(leoTotals.km)}
            unit="km"
            isLeading={kmLeader === "Leo"}
            userKey="Leo"
          />
        </div>

        {/* Selma */}
        <div
          className="hero-col"
          style={{ borderTop: `3px solid ${selmaColor}` }}
        >
          <div className="hero-username" style={{ color: selmaColor }}>
            🦊 Selma
          </div>
          <HeroStat
            label="📚 Pages"
            value={fmtPages(selmaTotals.pages)}
            isLeading={pagesLeader === "Selma"}
            userKey="Selma"
          />
          <HeroStat
            label="🏃 Kilometers"
            value={fmtKm(selmaTotals.km)}
            unit="km"
            isLeading={kmLeader === "Selma"}
            userKey="Selma"
          />
        </div>
      </div>

      {dataError && (
        <div
          style={{
            margin: "1rem 1.25rem 0",
            padding: "0.75rem 1rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "0.75rem",
            fontSize: "0.82rem",
            color: "var(--danger)",
            textAlign: "center",
          }}
        >
          Could not load data.{" "}
          <button
            onClick={fetchData}
            style={{
              background: "none",
              border: "none",
              color: "var(--danger)",
              textDecoration: "underline",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "inherit",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Log activity */}
      <div className="section">
        <div className="section-title">Log Activity</div>
        <div className="type-grid">
          {(["pages", "km"] as ActivityType[]).map((t) => (
            <button
              key={t}
              className={`type-btn${logType === t ? " active" : ""}`}
              onClick={() => setLogType(t)}
            >
              <span className="type-btn-emoji">
                {t === "pages" ? "📚" : "🏃"}
              </span>
              <span className="type-btn-label">
                {t === "pages" ? "Pages" : "Kilometers"}
              </span>
            </button>
          ))}
        </div>

        <div className="amount-wrap">
          <input
            className="amount-input"
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={logAmount}
            onChange={(e) =>
              setLogAmount(
                e.target.value.replace(/[^0-9.,]/g, "").replace(/,/g, ".")
              )
            }
            onKeyDown={(e) => e.key === "Enter" && submitLog()}
          />
          <span className="amount-unit-label">
            {logType === "pages" ? "pages" : "km"}
          </span>
        </div>

        {submitError && (
          <div
            style={{
              color: "var(--danger)",
              fontSize: "0.8rem",
              marginBottom: "0.75rem",
            }}
          >
            {submitError}
          </div>
        )}

        <button
          className={`btn-log${submitSuccess ? " success" : ""}`}
          onClick={submitLog}
          disabled={submitting || !logAmount || Number(logAmount) <= 0}
        >
          {submitting
            ? "Logging..."
            : submitSuccess
            ? "✓  Logged!"
            : `Log for ${session.user} →`}
        </button>
      </div>

      {/* Recent logs */}
      <div className="section">
        <div className="section-title">Recent Activity</div>
        <div className="log-list">
          {loading ? (
            <div className="empty-state">Loading...</div>
          ) : recentLogs.length === 0 ? (
            <div className="empty-state">
              No activity yet — start logging!
            </div>
          ) : (
            recentLogs.map((log) => {
              const color =
                log.user_name === "Leo" ? leoColor : selmaColor;
              const amt =
                log.activity_type === "pages"
                  ? fmtPages(log.amount)
                  : fmtKm(log.amount);
              return (
                <div key={log.id} className="log-item">
                  <div className="log-item-left">
                    <div className="log-item-icon">
                      {log.activity_type === "pages" ? "📚" : "🏃"}
                    </div>
                    <div>
                      <div className="log-item-user" style={{ color }}>
                        {log.user_name}
                      </div>
                      <div className="log-item-date">
                        {formatDate(log.logged_at)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="log-item-amount">
                      {amt}
                    </div>
                    <div className="log-item-type">
                      {log.activity_type === "pages" ? "pages" : "km"}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reset */}
      <div className="reset-zone">
        {!showReset ? (
          <button
            className="reset-link"
            onClick={() => setShowReset(true)}
          >
            Reset my data
          </button>
        ) : (
          <div className="reset-confirm-box">
            <div className="reset-confirm-text">
              Delete all entries for{" "}
              <strong>{session.user}</strong>? This cannot be undone.
            </div>
            <div className="reset-btn-row">
              <button
                className="btn-ghost"
                onClick={() => setShowReset(false)}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={resetData}
                disabled={resetting}
              >
                {resetting ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
