import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import "./App.css";

const API_BASE_URL = "http://localhost:3000";

const availableCountries = ["IL", "US", "FR"];
const MESSAGES_PER_PAGE = 8;

const emptyForm = {
  id: "",
  title: "",
  body: "",
  type: "POPUP",
  category: "PROMOTION",
  screenName: "",
  countries: ["IL"],
  minAndroidVersion: 28,
  maxAndroidVersion: 36,
  maxViewsPerUser: 3,
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  active: true,

  enableAbTesting: false,

  variantATitle: "",
  variantABody: "",
  variantAButtonText: "",

  variantBTitle: "",
  variantBBody: "",
  variantBButtonText: ""
};

function getSavedUser() {
  const savedUser = localStorage.getItem("notifyflow_user");

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch (error) {
    localStorage.removeItem("notifyflow_user");
    return null;
  }
}

function App() {
  const [currentUser, setCurrentUser] = useState(getSavedUser);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [authForm, setAuthForm] = useState({
    fullName: "",
    email: "",
    password: ""
  });

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [activePage, setActivePage] = useState("messages");
  const [analyticsData, setAnalyticsData] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedAnalyticsItem, setSelectedAnalyticsItem] = useState(null);
  const [selectedAbTestItem, setSelectedAbTestItem] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const [currentMessagesPage, setCurrentMessagesPage] = useState(1);

  function handleAuthInputChange(event) {
    const { name, value } = event.target;

    setAuthForm({
      ...authForm,
      [name]: value
    });
  }

  function switchAuthMode(mode) {
    setAuthMode(mode);
    setAuthError("");

    setAuthForm({
      fullName: "",
      email: "",
      password: ""
    });
  }

  async function submitAuthForm(event) {
    event.preventDefault();

    try {
      setAuthLoading(true);
      setAuthError("");

      const endpoint =
        authMode === "login"
          ? `${API_BASE_URL}/api/auth/login`
          : `${API_BASE_URL}/api/auth/register`;

      const payload =
        authMode === "login"
          ? {
              email: authForm.email,
              password: authForm.password
            }
          : {
              fullName: authForm.fullName,
              email: authForm.email,
              password: authForm.password
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      localStorage.setItem("notifyflow_user", JSON.stringify(data.user));
      setCurrentUser(data.user);
      setAuthError("");

      setAuthForm({
        fullName: "",
        email: "",
        password: ""
      });
    } catch (error) {
      console.error("Authentication failed", error.message);
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("notifyflow_user");

    setCurrentUser(null);
    setActivePage("messages");
    setSelectedAnalyticsItem(null);
    setSelectedAbTestItem(null);

    setAuthMode("login");
    setAuthError("");

    setAuthForm({
      fullName: "",
      email: "",
      password: ""
    });
  }

  async function loadMessages() {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/messages`);
      const data = await response.json();

      setMessages(data);
    } catch (error) {
      console.error("Failed to load messages", error);
      alert("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics() {
    try {
      setAnalyticsLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/messages`);
      const messagesData = await response.json();

      const statsResults = await Promise.all(
        messagesData.map(async (message) => {
          const statsResponse = await fetch(
            `${API_BASE_URL}/api/messages/${message.id}/stats`
          );

          const stats = await statsResponse.json();

          return {
            message,
            stats
          };
        })
      );

      setAnalyticsData(statsResults);
    } catch (error) {
      console.error("Failed to load analytics", error);
      alert("Failed to load analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  }

  function openMessagesPage() {
    setActivePage("messages");
    loadMessages();
  }

  function openAnalyticsPage() {
    setActivePage("analytics");
    loadAnalytics();
  }

  function openABTestingPage() {
    setActivePage("abTesting");
    loadAnalytics();
  }

  function openSettingsPage() {
  setActivePage("settings");
  }

  function openAnalyticsDetails(item) {
    setSelectedAnalyticsItem(item);
  }

  function closeAnalyticsDetails() {
    setSelectedAnalyticsItem(null);
  }

  function openAbTestDetails(item) {
    setSelectedAbTestItem(item);
  }

  function closeAbTestDetails() {
    setSelectedAbTestItem(null);
  }

  function openCreateModal() {
    setEditingMessageId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  }

  function openEditModal(message) {
    const variantA = message.variants?.find((variant) => variant.name === "A");
    const variantB = message.variants?.find((variant) => variant.name === "B");

    setEditingMessageId(message.id);

    setForm({
      id: message.id,
      title: message.title,
      body: message.body,
      type: message.type,
      category: message.category,
      screenName: message.screenName,
      countries: message.countries || [],
      minAndroidVersion: message.minAndroidVersion ?? 28,
      maxAndroidVersion: message.maxAndroidVersion ?? 36,
      maxViewsPerUser: message.maxViewsPerUser,
      startDate: message.startDate || "2026-01-01",
      endDate: message.endDate || "2026-12-31",
      active: message.active,
 
      enableAbTesting: (message.variants || []).length >= 2,

      variantATitle: variantA?.title || message.title,
      variantABody: variantA?.body || message.body,
      variantAButtonText: variantA?.buttonText || "Open",

      variantBTitle: variantB?.title || message.title,
      variantBBody: variantB?.body || message.body,
      variantBButtonText: variantB?.buttonText || "Open"
    });

    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingMessageId(null);
    setForm(emptyForm);
  }

  function handleInputChange(event) {
    const { name, value, type, checked } = event.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value
    });
  }
  
  function handleActiveChange(event) {
    setForm({
      ...form,
      active: event.target.value === "true"
    });
  }

  function handleCountryChange(country) {
    const isSelected = form.countries.includes(country);

    const updatedCountries = isSelected
      ? form.countries.filter((selectedCountry) => selectedCountry !== country)
      : [...form.countries, country];

    setForm({
      ...form,
      countries: updatedCountries
    });
  }

  async function submitMessage(event) {
    event.preventDefault();

    if (!form.id || !form.title || !form.body || !form.screenName) {
      alert("Please fill message id, title, body and screen name");
      return;
    }

    if (form.countries.length === 0) {
      alert("Please select at least one country");
      return;
    }

    if (Number(form.minAndroidVersion) < 1 || Number(form.maxAndroidVersion) < 1) {
      alert("Android versions must be positive numbers");
      return;
    }

    if (Number(form.minAndroidVersion) > Number(form.maxAndroidVersion)) {
      alert("Min Android version cannot be greater than Max Android version");
      return;
    }

    if (
      form.enableAbTesting &&
      (
        !form.variantATitle ||
        !form.variantABody ||
        !form.variantAButtonText ||
        !form.variantBTitle ||
        !form.variantBBody ||
        !form.variantBButtonText
      )
    ) {
      alert("Please fill all A/B variant fields or disable A/B Testing");
      return;
    }

    const variants = form.enableAbTesting
      ? [
          {
            id: `${form.id}_var_a`,
            name: "A",
            title: form.variantATitle,
            body: form.variantABody,
            buttonText: form.variantAButtonText
          },
          {
            id: `${form.id}_var_b`,
            name: "B",
            title: form.variantBTitle,
            body: form.variantBBody,
            buttonText: form.variantBButtonText
          }
        ]
      : [];

    const messageData = {
      projectId: "project_123",
      title: form.title,
      body: form.body,
      type: form.type,
      category: form.category,
      screenName: form.screenName,
      active: form.active,
      countries: form.countries,
      minAndroidVersion: Number(form.minAndroidVersion),
      maxAndroidVersion: Number(form.maxAndroidVersion),
      maxViewsPerUser: Number(form.maxViewsPerUser),
      startDate: form.startDate,
      endDate: form.endDate,
      variants: variants
    };

    try {
      let response;

      if (editingMessageId) {
        response = await fetch(`${API_BASE_URL}/api/messages/${editingMessageId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(messageData)
        });
      } else {
        const newMessage = {
          id: form.id,
          ...messageData
        };

        response = await fetch(`${API_BASE_URL}/api/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(newMessage)
        });
      }

      if (!response.ok) {
        throw new Error("Failed to save message");
      }

      closeModal();
      await loadMessages();

      if (activePage === "analytics" || activePage === "abTesting") {
        await loadAnalytics();
      }
    } catch (error) {
      console.error("Failed to save message", error);
      alert("Failed to save message. Check if message id already exists.");
    }
  }

  async function toggleMessageActive(message) {
    const nextActiveValue = !message.active;

    const previousMessages = messages;

    setMessages((currentMessages) =>
      currentMessages.map((currentMessage) =>
        currentMessage.id === message.id
          ? { ...currentMessage, active: nextActiveValue }
          : currentMessage
      )
    );

    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/${message.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...message,
          active: nextActiveValue
        })
      });

      if (!response.ok) {
        throw new Error("Failed to update message status");
      }
    } catch (error) {
      console.error("Failed to update message status", error);

      setMessages(previousMessages);

      alert("Failed to update message status. Please try again.");
    }
  }

  async function deleteMessage(message) {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${message.title}"?`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/${message.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Failed to delete message");
      }

      await loadMessages();

      if (activePage === "analytics" || activePage === "abTesting") {
        await loadAnalytics();
      }
    } catch (error) {
      console.error("Failed to delete message", error);
      alert("Failed to delete message");
    }
  }

  function getVariantDisplayName(message, variantId) {
    if (!variantId) {
      return "None";
    }

    const variant = message.variants?.find((item) => item.id === variantId);

    if (!variant) {
      return variantId;
    }

    return `Variant ${variant.name} - ${variant.title}`;
  }

  function getVariantShortName(message, variantId) {
    if (!variantId) {
      return "No winner";
    }

    const variant = message.variants?.find((item) => item.id === variantId);

    if (!variant) {
      return "Unknown";
    }

    return `Variant ${variant.name}`;
  }

  function getVariantShortLabel(message, variantId, emptyLabel = "None") {
  if (!variantId) {
    return emptyLabel;
  }

  const variant = message.variants?.find((item) => item.id === variantId);

  if (!variant) {
    return "Unknown";
  }

  return `Variant ${variant.name}`;
}

function hasAbTesting(message) {
  return (message.variants || []).length >= 2;
}

function getAnalyticsVariantLabel(message, variantId, emptyLabel = "None") {
  if (!hasAbTesting(message)) {
    return "No A/B";
  }

  return getVariantShortLabel(message, variantId, emptyLabel);
}

function getAnalyticsVariantTitle(message, variantId) {
  if (!hasAbTesting(message)) {
    return "A/B Testing is disabled for this message";
  }

  return getVariantDisplayName(message, variantId);
}

function getAnalyticsVariantBadgeClass(message, variantId) {
  if (!hasAbTesting(message)) {
    return "no-ab-badge";
  }

  return variantId ? "winning-variant-badge" : "no-winner-badge";
}

function getBestCtrVariantId(stats) {
  if (stats?.bestCtrVariant) {
    return stats.bestCtrVariant;
  }

  if (stats?.winningVariant) {
    return stats.winningVariant;
  }

  const byVariant = stats?.byVariant || {};

  let bestCtrVariant = null;
  let bestCtr = -1;
  let bestClicks = -1;

  Object.keys(byVariant).forEach((variantId) => {
    const variantStats = byVariant[variantId];

    const ctr = Number(variantStats.ctr) || 0;
    const clicks = Number(variantStats.clicks) || 0;

    if (ctr > bestCtr || (ctr === bestCtr && clicks > bestClicks)) {
      bestCtr = ctr;
      bestClicks = clicks;
      bestCtrVariant = variantId;
    }
  });

  return bestCtrVariant;
}

function getMostClickedVariantId(stats) {
  if (stats?.mostClickedVariant) {
    return stats.mostClickedVariant;
  }

  const byVariant = stats?.byVariant || {};

  let mostClickedVariant = null;
  let bestClicks = -1;
  let bestCtr = -1;

  Object.keys(byVariant).forEach((variantId) => {
    const variantStats = byVariant[variantId];

    const clicks = Number(variantStats.clicks) || 0;
    const ctr = Number(variantStats.ctr) || 0;

    if (clicks > bestClicks || (clicks === bestClicks && ctr > bestCtr)) {
      bestClicks = clicks;
      bestCtr = ctr;
      mostClickedVariant = variantId;
    }
  });

  return mostClickedVariant;
}
  
  function getVariantStats(stats, variantId) {
    if (!variantId) {
      return {
        impressions: 0,
        clicks: 0,
        ctr: 0
      };
    }

    return stats?.byVariant?.[variantId] || {
      impressions: 0,
      clicks: 0,
      ctr: 0
    };
  }

  function getAbComparisonChartData(item) {
    if (!item) {
      return [];
    }

    const variants = item.message.variants || [];

    const variantA =
      variants.find((variant) => variant.name === "A") || variants[0];

    const variantB =
      variants.find((variant) => variant.name === "B") || variants[1];

    const variantAStats = getVariantStats(item.stats, variantA?.id);
    const variantBStats = getVariantStats(item.stats, variantB?.id);

    return [
      {
        metric: "Impressions",
        variantA: Number(variantAStats.impressions) || 0,
        variantB: Number(variantBStats.impressions) || 0
      },
      {
        metric: "Clicks",
        variantA: Number(variantAStats.clicks) || 0,
        variantB: Number(variantBStats.clicks) || 0
      },
      {
        metric: "CTR (%)",
        variantA: Number(variantAStats.ctr) || 0,
        variantB: Number(variantBStats.ctr) || 0
      }
    ];
  }

  function getCategoryDisplayName(category) {
    if (category === "PROMOTION") {
      return "Promotion";
    }

    if (category === "FEATURE_ANNOUNCEMENT") {
      return "Feature";
    }

    return category || "Unknown";
  }

  function renderCategoryBadge(category) {
    return (
      <span className="category-badge" title={category}>
        {getCategoryDisplayName(category)}
      </span>
    );
  }

  function renderStatusBadge(isActive) {
    return (
      <span className={isActive ? "status-badge on" : "status-badge off"}>
        {isActive ? "ON" : "OFF"}
      </span>
    );
  }

  const filteredMessages = messages.filter((message) => {
    const normalizedSearch = searchTerm.toLowerCase();

    const matchesSearch =
      message.title?.toLowerCase().includes(normalizedSearch) ||
      message.id?.toLowerCase().includes(normalizedSearch) ||
      message.screenName?.toLowerCase().includes(normalizedSearch);

    const matchesType = typeFilter === "ALL" || message.type === typeFilter;

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && message.active) ||
      (statusFilter === "INACTIVE" && !message.active);

    const matchesCategory =
      categoryFilter === "ALL" || message.category === categoryFilter;

    return matchesSearch && matchesType && matchesStatus && matchesCategory;
  });

  const totalMessagesPages = Math.max(
  1,
  Math.ceil(filteredMessages.length / MESSAGES_PER_PAGE)
);

const messagesStartIndex = (currentMessagesPage - 1) * MESSAGES_PER_PAGE;
const messagesEndIndex = messagesStartIndex + MESSAGES_PER_PAGE;

const paginatedMessages = filteredMessages.slice(
  messagesStartIndex,
  messagesEndIndex
);

const displayedMessagesStart =
  filteredMessages.length === 0 ? 0 : messagesStartIndex + 1;

const displayedMessagesEnd = Math.min(
  messagesEndIndex,
  filteredMessages.length
);

  const totalImpressions = analyticsData.reduce(
    (total, item) => total + (item.stats.impressions || 0),
    0
  );

  const totalClicks = analyticsData.reduce(
    (total, item) => total + (item.stats.clicks || 0),
    0
  );

  const overallCtr =
    totalImpressions === 0
      ? 0
      : ((totalClicks / totalImpressions) * 100).toFixed(2);

  const analyticsChartData = analyticsData.map((item) => ({
    name: item.message.title,
    impressions: item.stats.impressions || 0,
    clicks: item.stats.clicks || 0,
    ctr: item.stats.ctr || 0
  }));

  const abTestItems = analyticsData.filter(
    (item) => (item.message.variants || []).length >= 2
  );

  const activeAbTests = abTestItems.filter((item) => item.message.active).length;

  const totalAbVariants = abTestItems.reduce(
    (total, item) => total + (item.message.variants?.length || 0),
    0
  );

  const testsWithResultsCount = abTestItems.filter(
  (item) =>
    getBestCtrVariantId(item.stats) || getMostClickedVariantId(item.stats)
).length;

  const averageAbCtr =
    abTestItems.length === 0
      ? 0
      : (
          abTestItems.reduce(
            (total, item) => total + (Number(item.stats.ctr) || 0),
            0
          ) / abTestItems.length
        ).toFixed(2);

  useEffect(() => {
    if (currentUser) {
      loadMessages();
    }
  }, [currentUser]);

  useEffect(() => {
  setCurrentMessagesPage(1);
}, [searchTerm, typeFilter, statusFilter, categoryFilter]);

  if (!currentUser) {
    return (
      <div className="auth-page">
        <section className="auth-hero">
          <div className="auth-logo">🔔</div>

          <h1>NotifyFlow</h1>
          <p>
            Admin portal for managing in-app notifications, targeting and
            analytics.
          </p>

          <div className="auth-feature-list">
            <div>
              <span>01</span>
              <strong>Create targeted messages</strong>
              <p>
                Manage popup and banner notifications from one dashboard.
              </p>
            </div>

            <div>
              <span>02</span>
              <strong>Track analytics</strong>
              <p>
                Monitor impressions, clicks, CTR and campaign performance.
              </p>
            </div>

            <div>
              <span>03</span>
              <strong>Optimize with A/B testing</strong>
              <p>
                Compare Variant A and Variant B to improve engagement.
              </p>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-header">
            <span className="auth-pill">
              {authMode === "login" ? "Welcome back" : "Create account"}
            </span>

            <h2>
              {authMode === "login" ? "Login to portal" : "Register admin user"}
            </h2>

            <p>
              {authMode === "login"
                ? "Enter your email and password to access NotifyFlow."
                : "Create an admin account to manage your notification campaigns."}
            </p>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={authMode === "login" ? "active" : ""}
              onClick={() => switchAuthMode("login")}
            >
              Login
            </button>

            <button
              type="button"
              className={authMode === "register" ? "active" : ""}
              onClick={() => switchAuthMode("register")}
            >
              Register
            </button>
          </div>

          <form className="auth-form" onSubmit={submitAuthForm}>
            {authMode === "register" && (
              <label>
                Full Name
                <input
                  name="fullName"
                  value={authForm.fullName}
                  onChange={handleAuthInputChange}
                  placeholder="User Name"
                  autoComplete="off"
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                name="email"
                value={authForm.email}
                onChange={handleAuthInputChange}
                placeholder="user@example.com"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                name="password"
                value={authForm.password}
                onChange={handleAuthInputChange}
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
              />
            </label>

            {authError && <div className="auth-error">{authError}</div>}

            <button
              type="submit"
              className="primary-button auth-submit-button"
              disabled={authLoading}
            >
              {authLoading
                ? "Please wait..."
                : authMode === "login"
                ? "Login"
                : "Create Account"}
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-icon">🔔</div>
            <span>NotifyFlow</span>
          </div>

          <nav className="side-nav">
            <button
              className={activePage === "messages" ? "nav-item active" : "nav-item"}
              onClick={openMessagesPage}
            >
              <span className="nav-icon">✉</span>
              <span>Messages</span>
            </button>

            <button
              className={activePage === "analytics" ? "nav-item active" : "nav-item"}
              onClick={openAnalyticsPage}
            >
              <span className="nav-icon">▥</span>
              <span>Analytics</span>
            </button>

            <button
              className={activePage === "abTesting" ? "nav-item active" : "nav-item"}
              onClick={openABTestingPage}
            >
              <span className="nav-icon">A/B</span>
              <span>A/B Testing</span>
            </button>

            <button
              className={activePage === "settings" ? "nav-item active" : "nav-item"}
              onClick={openSettingsPage}
            >
              <span className="nav-icon">⚙</span>
              <span>Settings</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span>Logged in as</span>
            <strong>{currentUser.fullName}</strong>
            <small>{currentUser.email}</small>
          </div>

          <button className="nav-item" onClick={logout}>
            <span className="nav-icon">↪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        {activePage === "messages" && (
          <>
            <header className="topbar clean-topbar">
              <div>
                <h1>Messages Management</h1>
                <p>Create, edit and control in-app notification messages</p>
              </div>

              <div className="topbar-actions">
                <button className="primary-button" onClick={openCreateModal}>
                  + Create New Message
                </button>
              </div>
            </header>

            <section className="summary-grid">
              <div className="summary-card">
                <span>Total Messages</span>
                <strong>{messages.length}</strong>
              </div>

              <div className="summary-card">
                <span>Active Messages</span>
                <strong>{messages.filter((message) => message.active).length}</strong>
              </div>

              <div className="summary-card">
                <span>Popup Messages</span>
                <strong>
                  {messages.filter((message) => message.type === "POPUP").length}
                </strong>
              </div>

              <div className="summary-card">
                <span>Banner Messages</span>
                <strong>
                  {messages.filter((message) => message.type === "BANNER").length}
                </strong>
              </div>
            </section>

            <section className="table-card">
              <div className="messages-toolbar">
                <div className="search-box">
                  <span>⌕</span>
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search messages..."
                  />
                </div>

                <select
                  className="toolbar-select"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                >
                  <option value="ALL">All Types</option>
                  <option value="POPUP">Popup</option>
                  <option value="BANNER">Banner</option>
                </select>

                <select
                  className="toolbar-select"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">ON</option>
                  <option value="INACTIVE">OFF</option>
                </select>

                <select
                  className="toolbar-select"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="ALL">All Categories</option>
                  <option value="PROMOTION">Promotion</option>
                  <option value="FEATURE_ANNOUNCEMENT">Feature</option>
                </select>

                <button className="toolbar-icon-button" onClick={loadMessages}>
                  ⟳
                </button>
              </div>

              {loading ? (
                <p className="loading-text">Loading messages...</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Message</th>
                        <th>Type</th>
                        <th>Category</th>
                        <th>Screen</th>
                        <th>Countries</th>
                        <th>Android</th>
                        <th>Dates</th>
                        <th>Max Views</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedMessages.map((message) => (
                        <tr key={message.id}>
                          <td>
                            <div className="message-title-cell">
                              <strong>{message.title}</strong>
                              <span>{message.id}</span>
                            </div>
                          </td>

                          <td>
                            <span className="type-pill">{message.type}</span>
                          </td>

                          <td>{renderCategoryBadge(message.category)}</td>
                          <td>{message.screenName}</td>

                          <td>{message.countries?.join(", ")}</td>
                          <td>
                            {message.minAndroidVersion} - {message.maxAndroidVersion}
                          </td>
                          <td>
                            <div className="dates-cell">
                              <span>{message.startDate}</span>
                              <span>{message.endDate}</span>
                            </div>
                          </td>

                          <td>{message.maxViewsPerUser}</td>

                          <td>
                            <button
                              type="button"
                              className={
                                message.active
                                  ? "status-switch active"
                                  : "status-switch inactive"
                              }
                              onClick={() => toggleMessageActive(message)}
                              title={message.active ? "Click to turn message off" : "Click to turn message on"}
                              aria-label={message.active ? "Message is on" : "Message is off"}
                              aria-pressed={message.active}
                            >
                              <span className="status-switch-text">
                                {message.active ? "ON" : "OFF"}
                              </span>

                              <span className="status-switch-knob"></span>
                            </button>
                          </td>

                          <td>
                            <div className="row-actions">
                              <button
                                type="button"
                                className="row-action-button edit"
                                onClick={() => openEditModal(message)}
                              >
                                <span>✎</span>
                                Edit
                              </button>

                              <button
                                type="button"
                                className="row-action-button delete"
                                onClick={() => deleteMessage(message)}
                              >
                                <span>🗑</span>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="table-footer">
                    <span>
                      Showing {displayedMessagesStart}-{displayedMessagesEnd} of{" "}
                      {filteredMessages.length} messages
                    </span>

                    <div className="pagination">
                      <button
                        type="button"
                        disabled={currentMessagesPage === 1}
                        onClick={() =>
                          setCurrentMessagesPage((currentPage) => Math.max(1, currentPage - 1))
                        }
                      >
                        ‹
                      </button>

                      {Array.from({ length: totalMessagesPages }, (_, index) => {
                        const pageNumber = index + 1;

                        return (
                          <button
                            type="button"
                            key={pageNumber}
                            className={currentMessagesPage === pageNumber ? "active" : ""}
                            onClick={() => setCurrentMessagesPage(pageNumber)}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        disabled={currentMessagesPage === totalMessagesPages}
                        onClick={() =>
                          setCurrentMessagesPage((currentPage) =>
                            Math.min(totalMessagesPages, currentPage + 1)
                          )
                        }
                      >
                        ›
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {activePage === "analytics" && (
          <>
            <header className="topbar clean-topbar">
              <div>
                <h1>Analytics Dashboard</h1>
                <p>
                  Track impressions, clicks and CTR using efficient aggregated statistics
                </p>
              </div>

              <div className="topbar-actions">
                <button className="secondary-button" onClick={loadAnalytics}>
                  Refresh Analytics
                </button>
              </div>
            </header>

            <section className="summary-grid">
              <div className="summary-card">
                <span>Total Impressions</span>
                <strong>{totalImpressions}</strong>
              </div>

              <div className="summary-card">
                <span>Total Clicks</span>
                <strong>{totalClicks}</strong>
              </div>

              <div className="summary-card">
                <span>Overall CTR</span>
                <strong>{overallCtr}%</strong>
              </div>

              <div className="summary-card">
                <span>Tracked Messages</span>
                <strong>{analyticsData.length}</strong>
              </div>
            </section>

            <section className="charts-grid">
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Impressions by Message</h3>
                  <p>Total views for each notification</p>
                </div>

                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={false} />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="impressions"
                        fill="#7C3AED"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <h3>Clicks by Message</h3>
                  <p>Total button clicks for each notification</p>
                </div>

                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={false} />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="clicks"
                        fill="#6D5DF7"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card wide-chart">
                <div className="chart-header">
                  <h3>CTR by Message</h3>
                  <p>Click-through rate comparison between messages</p>
                </div>

                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={false} />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="ctr"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="table-card">
              <div className="table-header">
                <div>
                  <h2>Message Performance</h2>
                  <p>Analytics calculated from aggregated MessageStats counters</p>
                </div>
              </div>

              {analyticsLoading ? (
                <p className="loading-text">Loading analytics...</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Message</th>
                        <th>Type</th>
                        <th>Category</th>
                        <th>Impressions</th>
                        <th>Clicks</th>
                        <th>CTR</th>
                        <th>Best CTR</th>
                        <th>Most Clicked</th>
                        <th>Details</th>
                      </tr>
                    </thead>

                    <tbody>
                      {analyticsData.map((item) => (
                        <tr key={item.message.id}>
                          <td>
                            <div className="message-title-cell">
                              <strong>{item.message.title}</strong>
                              <span>{item.message.id}</span>
                            </div>
                          </td>

                          <td>
                            <span className="type-pill">{item.message.type}</span>
                          </td>

                          <td>{renderCategoryBadge(item.message.category)}</td>
                          <td>{item.stats.impressions}</td>
                          <td>{item.stats.clicks}</td>
                          <td>{item.stats.ctr}%</td>

                          <td>
                            <span
                              title={getAnalyticsVariantTitle(
                                item.message,
                                getBestCtrVariantId(item.stats)
                              )}
                              className={getAnalyticsVariantBadgeClass(
                                item.message,
                                getBestCtrVariantId(item.stats)
                              )}
                            >
                              {getAnalyticsVariantLabel(
                                item.message,
                                getBestCtrVariantId(item.stats),
                                "None"
                              )}
                            </span>
                          </td>

                          <td>
                            <span
                              title={getAnalyticsVariantTitle(
                                item.message,
                                getMostClickedVariantId(item.stats)
                              )}
                              className={getAnalyticsVariantBadgeClass(
                                item.message,
                                getMostClickedVariantId(item.stats)
                              )}
                            >
                              {getAnalyticsVariantLabel(
                                item.message,
                                getMostClickedVariantId(item.stats),
                                "None"
                              )}
                            </span>
                          </td>

                          <td>
                            <button
                              className="view-details-button"
                              onClick={() => openAnalyticsDetails(item)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {activePage === "abTesting" && (
          <>
            <header className="topbar clean-topbar">
              <div>
                <h1>A/B Testing</h1>
                <p>
                  Compare variants using aggregated impressions, clicks and CTR
                </p>
              </div>

              <div className="topbar-actions">
                <button className="secondary-button" onClick={loadAnalytics}>
                  Refresh A/B Data
                </button>
              </div>
            </header>

            <section className="summary-grid">
              <div className="summary-card ab-summary-card">
                <span>Active A/B Tests</span>
                <strong>{activeAbTests}</strong>
              </div>

              <div className="summary-card ab-summary-card">
                <span>Total Variants</span>
                <strong>{totalAbVariants}</strong>
              </div>

              <div className="summary-card ab-summary-card">
                <span>Tests With Results</span>
                <strong>{testsWithResultsCount}</strong>
              </div>

              <div className="summary-card ab-summary-card">
                <span>Average CTR</span>
                <strong>{averageAbCtr}%</strong>
              </div>
            </section>

            <section className="ab-tests-section">
              <div className="ab-section-header">
                <div>
                  <h2>A/B Tests Performance</h2>
                  <p>
                    Review each test and compare Variant A and Variant B using aggregated counters
                  </p>
                </div>
              </div>

              {abTestItems.length === 0 ? (
                <div className="ab-empty-state">
                  <div className="ab-info-badge">A/B</div>

                  <div>
                    <h3>No A/B tests yet</h3>
                    <p>
                      Create a message with Variant A and Variant B to see test
                      results here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="ab-compact-grid">
                  {abTestItems.map((item) => (
                    <article className="ab-compact-card" key={item.message.id}>
                      <div className="ab-compact-header">
                        <div>
                          <h3>{item.message.title}</h3>
                          <p>{item.message.id}</p>
                        </div>

                        <div className="ab-test-badges">
                          {renderStatusBadge(item.message.active)}
                          {renderCategoryBadge(item.message.category)}
                        </div>
                      </div>

                      <div className="ab-test-meta">
                        <span>Screen: {item.message.screenName}</span>
                        <span>
                          Countries: {item.message.countries?.join(", ") || "None"}
                        </span>
                        <span>
                          Android: {item.message.minAndroidVersion} - {item.message.maxAndroidVersion}
                        </span>
                        <span>
                          Best CTR:{" "}
                          <strong>
                            {getVariantShortLabel(
                              item.message,
                              getBestCtrVariantId(item.stats),
                              "None"
                            )}
                          </strong>
                        </span>

                        <span>
                          Most Clicked:{" "}
                          <strong>
                            {getVariantShortLabel(
                              item.message,
                              getMostClickedVariantId(item.stats),
                              "None"
                            )}
                          </strong>
                        </span>
                      </div>

                      <div className="ab-compact-actions">
                        <button
                          className="view-details-button"
                          onClick={() => openAbTestDetails(item)}
                        >
                          View Details
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
        {activePage === "settings" && (
          <>
            <header className="topbar clean-topbar">
              <div>
                <h1>Project Settings</h1>
                <p>All configuration details and SDK integration information</p>
              </div>
            </header>

            <section className="settings-top-grid">
              <div className="settings-card">
                <div className="settings-card-header">
                  <div>
                    <h2>Project Configuration</h2>
                    <p>Basic configuration used by the NotifyFlow demo project</p>
                  </div>
                </div>

                <div className="settings-list">
                  <div className="settings-row">
                    <span>Project ID</span>
                    <strong>project_123</strong>
                  </div>

                  <div className="settings-row">
                    <span>Demo API Key</span>
                    <strong>demo_api_key</strong>
                  </div>

                  <div className="settings-row">
                    <span>Portal Backend URL</span>
                    <strong>{API_BASE_URL}</strong>
                  </div>

                  <div className="settings-row">
                    <span>Supported Countries</span>
                    <strong>{availableCountries.join(", ")}</strong>
                  </div>

                  <div className="settings-row">
                    <span>Default Android Range</span>
                    <strong>28 - 36</strong>
                  </div>
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <div>
                    <h2>Demo Screen Keys</h2>
                    <p>Screen names used by the Android demo app</p>
                  </div>
                </div>

                <div className="screen-keys-list">
                  <span>home_screen</span>
                  <span>profile_screen</span>
                  <span>cart_screen</span>
                </div>

                <div className="settings-note-box">
                  <span className="settings-note-icon">i</span>
                  <div>
                    <strong>Note:</strong>
                    <p>
                      These are logical screen names. Developers can use their own
                      naming convention in the host app.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="settings-middle-grid">
              <div className="settings-card settings-sdk-card">
                <div className="settings-card-header">
                  <div>
                    <h2>Android SDK Integration</h2>
                    <p>Example of how an external Android developer integrates NotifyFlow</p>
                  </div>
                </div>

                <pre className="code-block settings-code-block">{`NotifyFlow.init(
            context = this,
            apiKey = "demo_api_key",
            userId = "user_1",
            country = "IL",
            baseUrl = "https://your-backend-url.com/"
        )

        NotifyFlow.fetchMessages()
        NotifyFlow.checkAndShow(this, "home_screen")`}</pre>
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <div>
                    <h2>Supported Message Types</h2>
                    <p>Notification formats supported by the Android SDK</p>
                  </div>
                </div>

                <div className="message-types-list">
                  <div className="message-type-card">

                    <div>
                      <strong>POPUP</strong>
                      <p>Full screen popup dialog</p>
                    </div>
                  </div>

                  <div className="message-type-card">                
                    <div>
                      <strong>BANNER</strong>
                      <p>Top banner notification</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="settings-three-grid">
              <div className="settings-card">
                <div className="settings-card-header">
                  <div>
                    <h2>A/B Testing Mode</h2>
                    <p>A/B Testing is optional for each message</p>
                  </div>
                </div>

                <div className="settings-list compact">
                  <div className="settings-row">
                    <span>A/B Disabled</span>
                    <strong>Use regular title/body</strong>
                  </div>

                  <div className="settings-row">
                    <span>A/B Enabled</span>
                    <strong>Variant A + Variant B</strong>
                  </div>

                  <div className="settings-row">
                    <span>Variant Selection</span>
                    <strong>Stable by userId + messageId</strong>
                  </div>
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <div>
                    <h2>Targeting Rules</h2>
                    <p>Conditions that must match before displaying a message</p>
                  </div>
                </div>

                <div className="settings-check-grid">
                  <span>Screen name</span>
                  <span>Country</span>
                  <span>Android version</span>
                  <span>Active ON/OFF</span>
                  <span>Start date / End date</span>
                  <span>Max views per user</span>
                  <span>Session per user/country/screen</span>
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <div>
                    <h2>Analytics Efficiency</h2>
                    <p>Aggregated counters for fast and efficient analytics</p>
                  </div>
                </div>

                <div className="settings-check-grid">
                  <span>Aggregated MessageStats</span>
                  <span>Impressions counter</span>
                  <span>Clicks counter</span>
                  <span>CTR calculation</span>
                  <span>Breakdown by country</span>
                  <span>Breakdown by variant</span>
                  <span>A/B performance chart</span>
                </div>
              </div>
            </section>

            <section className="settings-card full-width-card">
              <div className="settings-card-header">
                <div>
                  <h2>SDK Responsibilities</h2>
                  <p>Logic handled internally by the SDK after integration</p>
                </div>
              </div>

              <div className="settings-responsibilities-grid">
                <span>REST API communication</span>
                <span>Network-first message loading</span>
                <span>Offline cache fallback</span>
                <span>Popup / Banner display</span>
                <span>Screen targeting</span>
                <span>Country targeting</span>
                <span>Android version targeting</span>
                <span>Date range validation</span>
                <span>Max views per user</span>
                <span>Session handling</span>
                <span>A/B variant selection</span>
                <span>Impression / Click reporting</span>
              </div>
            </section>
          </>
        )}
      </main>

      {selectedAnalyticsItem && (
        <div className="drawer-overlay" onClick={closeAnalyticsDetails}>
          <aside
            className="analytics-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <span className="drawer-label">Analytics Details</span>
                <h2>{selectedAnalyticsItem.message.title}</h2>
                <p>{selectedAnalyticsItem.message.id}</p>
              </div>

              <button className="drawer-close-button" onClick={closeAnalyticsDetails}>
                ✕
              </button>
            </div>

            <div className="drawer-meta">
              {renderStatusBadge(selectedAnalyticsItem.message.active)}

              <span className="drawer-pill">
                {selectedAnalyticsItem.message.type}
              </span>

              {renderCategoryBadge(selectedAnalyticsItem.message.category)}
            </div>

            <div className="drawer-kpi-grid">
              <div>
                <span>Impressions</span>
                <strong>{selectedAnalyticsItem.stats.impressions}</strong>
              </div>

              <div>
                <span>Clicks</span>
                <strong>{selectedAnalyticsItem.stats.clicks}</strong>
              </div>

              <div>
                <span>CTR</span>
                <strong>{selectedAnalyticsItem.stats.ctr}%</strong>
              </div>

              <div>
                <span>Best CTR</span>
                <strong>
                  {getAnalyticsVariantLabel(
                    selectedAnalyticsItem.message,
                    getBestCtrVariantId(selectedAnalyticsItem.stats),
                    "None"
                  )}
                </strong>
              </div>

              <div>
                <span>Most Clicked</span>
                <strong>
                  {getAnalyticsVariantLabel(
                    selectedAnalyticsItem.message,
                    getMostClickedVariantId(selectedAnalyticsItem.stats),
                    "None"
                  )}
                </strong>
              </div>
            </div>

            <div className="drawer-section">
              <h3>By Variant</h3>

              {(selectedAnalyticsItem.message.variants || []).length === 0 ? (
                <p className="empty-state">No variants configured for this message</p>
              ) : (
                <div className="drawer-list">
                  {(selectedAnalyticsItem.message.variants || []).map((variant) => {
                    const variantId = variant.id;

                    const stats = selectedAnalyticsItem.stats.byVariant?.[variantId] || {
                      impressions: 0,
                      clicks: 0,
                      ctr: 0
                    };

                    const isBestCtr =
                      getBestCtrVariantId(selectedAnalyticsItem.stats) === variantId;

                    const isMostClicked =
                      getMostClickedVariantId(selectedAnalyticsItem.stats) === variantId;

                    const hasData =
                      Number(stats.impressions) > 0 || Number(stats.clicks) > 0;

                    let variantLabel = hasData ? "Variant performance" : "No data yet";

                    if (isBestCtr && isMostClicked) {
                      variantLabel = "Best CTR + Most Clicked";
                    } else if (isBestCtr) {
                      variantLabel = "Best CTR";
                    } else if (isMostClicked) {
                      variantLabel = "Most Clicked";
                    }

                    return (
                      <div className="drawer-list-row" key={variantId}>
                        <div>
                          <strong>
                            {getVariantDisplayName(
                              selectedAnalyticsItem.message,
                              variantId
                            )}
                          </strong>
                          <span>{variantLabel}</span>
                        </div>

                        <p>
                          {stats.impressions} impressions · {stats.clicks} clicks ·{" "}
                          {stats.ctr}% CTR
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="drawer-section">
              <h3>By Country</h3>

              {Object.keys(selectedAnalyticsItem.stats.byCountry || {}).length ===
              0 ? (
                <p className="empty-state">No country data yet</p>
              ) : (
                <div className="drawer-list">
                  {Object.entries(selectedAnalyticsItem.stats.byCountry || {}).map(
                    ([country, stats]) => (
                      <div className="drawer-list-row" key={country}>
                        <div>
                          <strong>{country}</strong>
                          <span>Country targeting result</span>
                        </div>

                        <p>
                          {stats.impressions} impressions · {stats.clicks} clicks ·{" "}
                          {stats.ctr}% CTR
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            <div className="drawer-section">
              <h3>Message Targeting</h3>

              <div className="targeting-box">
                <div>
                  <span>Screen</span>
                  <strong>{selectedAnalyticsItem.message.screenName}</strong>
                </div>

                <div>
                  <span>Countries</span>
                  <strong>
                    {selectedAnalyticsItem.message.countries?.join(", ") || "None"}
                  </strong>
                </div>

                <div>
                  <span>Android Version</span>
                  <strong>
                    {selectedAnalyticsItem.message.minAndroidVersion} -{" "}
                    {selectedAnalyticsItem.message.maxAndroidVersion}
                  </strong>
                </div>

                <div>
                  <span>Date Range</span>
                  <strong>
                    {selectedAnalyticsItem.message.startDate} →{" "}
                    {selectedAnalyticsItem.message.endDate}
                  </strong>
                </div>

                <div>
                  <span>Max Views Per User</span>
                  <strong>{selectedAnalyticsItem.message.maxViewsPerUser}</strong>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {selectedAbTestItem && (
        <div className="drawer-overlay" onClick={closeAbTestDetails}>
          <aside
            className="analytics-drawer ab-details-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <span className="drawer-label">A/B Test Details</span>
                <h2>{selectedAbTestItem.message.title}</h2>
                <p>{selectedAbTestItem.message.id}</p>
              </div>

              <button className="drawer-close-button" onClick={closeAbTestDetails}>
                ✕
              </button>
            </div>

            <div className="drawer-meta">
              {renderStatusBadge(selectedAbTestItem.message.active)}

              {renderCategoryBadge(selectedAbTestItem.message.category)}

              <span className="drawer-pill">
                Best CTR:{" "}
                {getVariantShortLabel(
                  selectedAbTestItem.message,
                  getBestCtrVariantId(selectedAbTestItem.stats),
                  "None"
                )}
              </span>

              <span className="drawer-pill">
                Most Clicked:{" "}
                {getVariantShortLabel(
                  selectedAbTestItem.message,
                  getMostClickedVariantId(selectedAbTestItem.stats),
                  "None"
                )}
              </span>
            </div>

            <div className="ab-details-variants">
              {(selectedAbTestItem.message.variants || []).map((variant) => {
                const variantStats =
                  selectedAbTestItem.stats.byVariant?.[variant.id] || {
                    impressions: 0,
                    clicks: 0,
                    ctr: 0
                  };

                const isBestCtr =
                  getBestCtrVariantId(selectedAbTestItem.stats) === variant.id;

                const isMostClicked =
                  getMostClickedVariantId(selectedAbTestItem.stats) === variant.id;

                let variantLabel = "Variant";

                if (isBestCtr && isMostClicked) {
                  variantLabel = "Best CTR + Most Clicked";
                } else if (isBestCtr) {
                  variantLabel = "Best CTR";
                } else if (isMostClicked) {
                  variantLabel = "Most Clicked";
                }

                return (
                  <div
                    className={isBestCtr ? "ab-variant-card winner" : "ab-variant-card"}
                    key={variant.id}
                  >
                    <div className="ab-variant-title">
                      <div>
                        <h4>Variant {variant.name}</h4>
                        <p>{variantLabel}</p>
                      </div>

                      {isBestCtr && <span>★</span>}
                    </div>

                    <div className="ab-variant-content">
                      <strong>{variant.title}</strong>
                      <p>{variant.body}</p>
                    </div>

                    <div className="ab-variant-stats">
                      <div>
                        <span>Impressions</span>
                        <strong>{variantStats.impressions}</strong>
                      </div>

                      <div>
                        <span>Clicks</span>
                        <strong>{variantStats.clicks}</strong>
                      </div>

                      <div>
                        <span>CTR</span>
                        <strong>{variantStats.ctr}%</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="drawer-section">
              <h3>Test Performance</h3>

              <div className="ab-comparison-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getAbComparisonChartData(selectedAbTestItem)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name, props) => {
                        const isCtr = props?.payload?.metric === "CTR (%)";

                        const label =
                          props?.dataKey === "variantA"
                            ? "Variant A"
                            : props?.dataKey === "variantB"
                            ? "Variant B"
                            : name;

                        return [isCtr ? `${value}%` : value, label];
                      }}
                    />
                    <Legend />

                    <Bar
                      dataKey="variantA"
                      name="Variant A"
                      fill="#4F7CFF"
                      radius={[8, 8, 0, 0]}
                    />

                    <Bar
                      dataKey="variantB"
                      name="Variant B"
                      fill="#7C3AED"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </aside>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>{editingMessageId ? "Edit Message" : "Create New Message"}</h2>
                <p>
                  {editingMessageId
                    ? "Update message targeting and display settings"
                    : "Create a new in-app notification message"}
                </p>
              </div>

              <button className="icon-button" onClick={closeModal}>
                ✕
              </button>
            </div>

            <form className="message-form" onSubmit={submitMessage}>
              <div className="form-row">
                <label>
                  Message ID
                  <input
                    name="id"
                    value={form.id}
                    onChange={handleInputChange}
                    placeholder="msg_new_offer"
                    disabled={editingMessageId !== null}
                  />
                </label>

                <label>
                  Title
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleInputChange}
                    placeholder="Special Offer"
                  />
                </label>
              </div>

              <label>
                Body
                <textarea
                  name="body"
                  value={form.body}
                  onChange={handleInputChange}
                  placeholder="Write notification body..."
                />
              </label>

              <div className="form-row">
                <label>
                  Type
                  <select name="type" value={form.type} onChange={handleInputChange}>
                    <option value="POPUP">POPUP</option>
                    <option value="BANNER">BANNER</option>
                  </select>
                </label>

                <label>
                  Category
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleInputChange}
                  >
                    <option value="PROMOTION">PROMOTION</option>
                    <option value="FEATURE_ANNOUNCEMENT">
                      FEATURE_ANNOUNCEMENT
                    </option>
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Screen Name
                  <input
                    name="screenName"
                    value={form.screenName}
                    onChange={handleInputChange}
                    placeholder="home_screen"
                  />
                </label>

                <label>
                  Max Views Per User
                  <input
                    type="number"
                    name="maxViewsPerUser"
                    value={form.maxViewsPerUser}
                    onChange={handleInputChange}
                    min="1"
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Min Android Version
                  <input
                    type="number"
                    name="minAndroidVersion"
                    value={form.minAndroidVersion}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="28"
                  />
                </label>

                <label>
                  Max Android Version
                  <input
                    type="number"
                    name="maxAndroidVersion"
                    value={form.maxAndroidVersion}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="36"
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Status
                  <select value={form.active} onChange={handleActiveChange}>
                    <option value="true">ON</option>
                    <option value="false">OFF</option>
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Start Date
                  <input
                    type="date"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleInputChange}
                  />
                </label>

                <label>
                  End Date
                  <input
                    type="date"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleInputChange}
                  />
                </label>
              </div>

              <div className="countries-field">
                <p>Target Countries</p>

                <div className="countries-options">
                  {availableCountries.map((country) => (
                    <label className="country-option" key={country}>
                      <input
                        type="checkbox"
                        checked={form.countries.includes(country)}
                        onChange={() => handleCountryChange(country)}
                      />
                      {country}
                    </label>
                  ))}
                </div>
              </div>

              <div className="variants-section">
                <div className="section-title">
                  <h3>A/B Testing</h3>
                  <p>
                    Optional: compare two message versions and track which one performs better
                  </p>
                </div>

                <label className="ab-toggle-field">
                  <input
                    type="checkbox"
                    name="enableAbTesting"
                    checked={form.enableAbTesting}
                    onChange={handleInputChange}
                  />
                  <span>Enable A/B Testing for this message</span>
                </label>

                {!form.enableAbTesting ? (
                  <p className="ab-disabled-note">
                    A/B Testing is disabled. The SDK will use the regular message title and body.
                  </p>
                ) : (
                  <div className="variants-grid">
                    <div className="variant-card">
                      <h4>Variant A</h4>

                      <label>
                        Variant A Title
                        <input
                          name="variantATitle"
                          value={form.variantATitle}
                          onChange={handleInputChange}
                          placeholder="20% Discount"
                        />
                      </label>

                      <label>
                        Variant A Body
                        <textarea
                          name="variantABody"
                          value={form.variantABody}
                          onChange={handleInputChange}
                          placeholder="Special promotion for users in Israel"
                        />
                      </label>

                      <label>
                        Variant A Button Text
                        <input
                          name="variantAButtonText"
                          value={form.variantAButtonText}
                          onChange={handleInputChange}
                          placeholder="Buy Now"
                        />
                      </label>
                    </div>

                    <div className="variant-card">
                      <h4>Variant B</h4>

                      <label>
                        Variant B Title
                        <input
                          name="variantBTitle"
                          value={form.variantBTitle}
                          onChange={handleInputChange}
                          placeholder="Free Shipping"
                        />
                      </label>

                      <label>
                        Variant B Body
                        <textarea
                          name="variantBBody"
                          value={form.variantBBody}
                          onChange={handleInputChange}
                          placeholder="Today only - free shipping"
                        />
                      </label>

                      <label>
                        Variant B Button Text
                        <input
                          name="variantBButtonText"
                          value={form.variantBButtonText}
                          onChange={handleInputChange}
                          placeholder="Use Benefit"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="secondary-button" onClick={closeModal}>
                  Cancel
                </button>

                <button type="submit" className="primary-button">
                  {editingMessageId ? "Save Changes" : "Create Message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;