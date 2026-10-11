"use client";
import { useAlumniWorkspace } from "../hooks/use-alumni-workspace";
import Icon from "./ui-icon";
import LoginScreen from "./login-screen";
import Sidebar from "./sidebar";
import DirectoryView from "./directory-view";
import ImportsView from "./imports-view";
import AccountsView from "./accounts-view";
export default function AlumniApp() {
  const {
    user,
    checking,
    tab,
    query,
    error,
    notice,
    busy,
    loading,
    directory,
    imports,
    users,
    file,
    preview,
    loginError,
    navigate,
    login,
    logout,
    filter,
    importCsv,
    createUser,
    setFile,
    setPreview,
    setError,
    loadDirectory,
  } = useAlumniWorkspace();
  const admin = user && user.role !== "user";
  if (!user)
    return (
      <LoginScreen
        checking={checking}
        busy={busy}
        error={error}
        login={login}
        loginError={loginError}
      />
    );
  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        busy={busy}
        tab={tab}
        query={query}
        navigate={navigate}
        logout={logout}
      />
      <div className="workspace">
        <header className="topbar">
          <span>
            Alumni relations <span className="crumb">/</span>
            <strong>
              {tab === "imports"
                ? "CSV imports"
                : tab === "users"
                  ? "Manage accounts"
                  : "Directory"}
            </strong>
          </span>
          <span className="workspace-label">
            WSU <span>•</span> Coug Connect
          </span>
        </header>
        <main id="main" className="main-content">
          <div className="page-heading">
            <div>
              <h1>
                {tab === "imports"
                  ? "Grow your network."
                  : tab === "users"
                    ? "Your workspace team."
                    : "Find your next connection."}
              </h1>
              <p>
                {tab === "imports"
                  ? "Bring alumni records together with a simple CSV import."
                  : tab === "users"
                    ? "Give your team the right access to the alumni network."
                    : "Turn a shared WSU experience into a new opportunity."}
              </p>
            </div>
            {admin && tab === "directory" ? (
              <button className="primary" onClick={() => navigate("imports")}>
                <Icon name="upload" />
                Import alumni
              </button>
            ) : null}
          </div>
          {error ? (
            <div className="error" role="alert">
              {error}
            </div>
          ) : null}
          {notice ? (
            <div className="notice" role="status">
              {notice}
            </div>
          ) : null}
          {tab === "directory" ? (
            <DirectoryView
              directory={directory}
              loading={loading}
              query={query}
              admin={Boolean(admin)}
              navigate={navigate}
              filter={filter}
              loadDirectory={loadDirectory}
            />
          ) : tab === "imports" && admin ? (
            <ImportsView
              file={file}
              preview={preview}
              imports={imports}
              busy={busy}
              setFile={setFile}
              setPreview={setPreview}
              setError={setError}
              importCsv={importCsv}
            />
          ) : tab === "users" && user.role === "super_admin" ? (
            <AccountsView users={users} busy={busy} createUser={createUser} />
          ) : (
            <div className="empty-state">
              <h2>This page is unavailable</h2>
              <p>Your account does not have access to this section.</p>
              <button className="primary" onClick={() => navigate("directory")}>
                Open directory
              </button>
            </div>
          )}
          <footer className="workspace-footer">
            <span>Coug Connect</span>
            <span>Built for the people who make WSU, WSU.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
