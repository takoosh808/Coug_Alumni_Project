"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { api } from "@/lib/client-api";
import type { User } from "@/lib/types";
import {
  number,
  type Directory,
  type ImportRecord,
  type Preview,
} from "@/lib/client-types";
export function useAlumniWorkspace() {
  const [user, setUser] = useState<User | null>(null),
    [checking, setChecking] = useState(true),
    [tab, setTab] = useState("directory");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const [directory, setDirectory] = useState<Directory | null>(null),
    [query, setQuery] = useState("");
  const [imports, setImports] = useState<ImportRecord[]>([]),
    [users, setUsers] = useState<User[]>([]);
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState<Preview | null>(null);
  const loginError = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const readUrl = () => {
      const p = new URLSearchParams(window.location.search);
      setTab(p.get("tab") ?? "directory");
      p.delete("tab");
      setQuery(p.toString());
      setLoading(true);
    };
    readUrl();
    api("/api/auth")
      .then((d) => setUser(d.user))
      .catch((e) => setError(e.message))
      .finally(() => setChecking(false));
    window.addEventListener("popstate", readUrl);
    return () => window.removeEventListener("popstate", readUrl);
  }, []);
  const loadDirectory = useCallback(
    (signal?: AbortSignal) =>
      api(`/api/alumni?${query}`, { signal })
        .then((data) => {
          setDirectory(data);
          setError("");
        })
        .catch((error) => {
          if (error.name !== "AbortError") setError(error.message);
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        }),
    [query],
  );
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    const handleError = (e: Error) => {
      if (e.name !== "AbortError") setError(e.message);
    };
    if (tab === "directory") void loadDirectory(controller.signal);
    else if (tab === "imports" && user.role !== "user")
      api("/api/imports", { signal: controller.signal })
        .then((d) => setImports(d.imports))
        .catch(handleError);
    else if (tab === "users" && user.role === "super_admin")
      api("/api/users", { signal: controller.signal })
        .then((d) => setUsers(d.users))
        .catch(handleError);
    return () => controller.abort();
  }, [user, tab, loadDirectory]);
  function navigate(nextTab: string, nextQuery = query) {
    const p = new URLSearchParams(nextQuery);
    if (nextTab !== "directory") p.set("tab", nextTab);
    window.history.pushState({}, "", p.size ? `/?${p}` : "/");
    setTab(nextTab);
    setQuery(nextQuery);
    setError("");
    setNotice("");
    if (nextTab === "directory") {
      setLoading(true);
      if (nextTab === tab && nextQuery === query) void loadDirectory();
    }
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      setLoading(true);
      setUser(
        (
          await api("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Object.fromEntries(form)),
          })
        ).user,
      );
    } catch (e) {
      setError((e as Error).message);
      requestAnimationFrame(() => loginError.current?.focus());
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await api("/api/auth", { method: "DELETE" });
      setUser(null);
      setDirectory(null);
      setUsers([]);
      setImports([]);
      setFile(null);
      setPreview(null);
      navigate("directory", "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function filter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const p = new URLSearchParams();
    new FormData(e.currentTarget).forEach((v, k) => {
      if ((k === "match" && v === "all") || (k === "sort" && v === "name"))
        return;
      if (String(v).trim()) p.append(k, String(v).trim());
    });
    navigate("directory", p.toString());
  }
  async function importCsv(commit: boolean) {
    if (!file) return;
    setBusy(true);
    setError("");
    setNotice("");
    const form = new FormData();
    form.set("file", file);
    form.set("preview", String(!commit));
    try {
      const result = await api("/api/imports", { method: "POST", body: form });
      if (!commit) setPreview(result);
      else {
        setNotice(
          `${number.format(result.count)} alumni imported successfully.`,
        );
        setPreview(null);
        setFile(null);
        setImports((await api("/api/imports")).imports);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function createUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      form.reset();
      setUsers((await api("/api/users")).users);
      setNotice(
        "Account created. Share the credentials with the new account holder.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return {
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
  };
}
