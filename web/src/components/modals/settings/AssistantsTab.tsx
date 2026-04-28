import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import * as api from "../../../services/api";
import type { GroupPromptInfo } from "../../../services/api";
import { parseHelpMarkdown, updatePetHelpNote } from "../../../utils/helpMarkdown";
import { getDefaultPetPersonaSeed } from "../../../utils/rolePresets";
import {
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  settingsWorkspaceBodyClass,
  settingsWorkspaceHeaderClass,
  settingsWorkspacePanelClass,
  settingsWorkspaceShellClass,
  settingsWorkspaceSoftPanelClass,
} from "./types";

interface AssistantsTabProps {
  isDark: boolean;
  groupId?: string;
  isActive: boolean;
  petEnabled: boolean;
  busy: boolean;
  onUpdatePetEnabled: (enabled: boolean) => Promise<boolean | void>;
}

function resolvePetPersonaDraft(savedPetPersona: string): string {
  const saved = String(savedPetPersona || "").trim();
  return saved || getDefaultPetPersonaSeed();
}

function StatusPill({ children, tone }: { children: ReactNode; tone: "on" | "off" | "info" }) {
  const toneClass =
    tone === "on"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : tone === "off"
        ? "bg-slate-500/12 text-[var(--color-text-muted)]"
        : "border border-black/10 bg-[rgb(245,245,245)] text-[rgb(35,36,37)] dark:border-white/12 dark:bg-white/[0.08] dark:text-white";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${toneClass}`}>
      {children}
    </span>
  );
}

function AssistantSwitch({
  checked,
  disabled,
  label,
  hint,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  hint?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`inline-flex select-none items-center justify-end gap-3 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
      <span className="min-w-0 text-right">
        <span className="block text-xs font-medium text-[var(--color-text-secondary)]">{label}</span>
        {hint ? <span className="mt-1 block text-[11px] leading-5 text-[var(--color-text-muted)]">{hint}</span> : null}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
          checked
            ? "border-emerald-500 bg-emerald-500"
            : "border-[var(--glass-border-subtle)] bg-[var(--color-bg-secondary)]"
        } ${disabled ? "opacity-50" : ""}`}
      >
        <span
          className={`absolute left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </label>
  );
}

function SettingsBlock({
  isDark,
  title,
  hint,
  children,
}: {
  isDark: boolean;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className={settingsWorkspacePanelClass(isDark)}>
      <div>
        <div className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</div>
        {hint ? <p className="mt-1 text-[11px] leading-5 text-[var(--color-text-muted)]">{hint}</p> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function AssistantsTab({
  isDark,
  groupId,
  isActive,
  petEnabled,
  busy,
  onUpdatePetEnabled,
}: AssistantsTabProps) {
  const { t } = useTranslation("settings");
  const [promptInfo, setPromptInfo] = useState<GroupPromptInfo | null>(null);
  const [savedPetPersona, setSavedPetPersona] = useState("");
  const [petPersonaDraft, setPetPersonaDraft] = useState(() => resolvePetPersonaDraft(""));
  const [loaded, setLoaded] = useState(false);
  const [loadBusy, setLoadBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const normalizedSavedPersona = useMemo(() => resolvePetPersonaDraft(savedPetPersona), [savedPetPersona]);
  const hasUnsavedPersona = petPersonaDraft !== normalizedSavedPersona;
  const disabled = busy || loadBusy || saveBusy || toggleBusy;

  const loadPetPersona = useCallback(async () => {
    const gid = String(groupId || "").trim();
    if (!gid) return null;
    setLoadBusy(true);
    setError("");
    setNotice("");
    try {
      const resp = await api.fetchGroupPrompts(gid);
      if (!resp.ok) {
        setError(resp.error?.message || t("assistants.errors.loadPersona", { defaultValue: "Failed to load assistant persona." }));
        return null;
      }
      const help = resp.result.help;
      const parsed = parseHelpMarkdown(String(help.content || ""));
      const nextPersona = String(parsed.pet || "").trim();
      setPromptInfo(help);
      setSavedPetPersona(nextPersona);
      setPetPersonaDraft(resolvePetPersonaDraft(nextPersona));
      setLoaded(true);
      return help;
    } catch {
      setError(t("assistants.errors.loadPersona", { defaultValue: "Failed to load assistant persona." }));
      return null;
    } finally {
      setLoadBusy(false);
    }
  }, [groupId, t]);

  useEffect(() => {
    if (!isActive || !groupId || loaded || loadBusy) return;
    void loadPetPersona();
  }, [groupId, isActive, loadBusy, loadPetPersona, loaded]);

  const handleTogglePet = useCallback(async (enabled: boolean) => {
    setToggleBusy(true);
    setError("");
    setNotice("");
    try {
      await onUpdatePetEnabled(enabled);
      setNotice(
        enabled
          ? t("assistants.petEnabled", { defaultValue: "Web Pet enabled for this group." })
          : t("assistants.petDisabled", { defaultValue: "Web Pet disabled for this group." }),
      );
    } catch {
      setError(t("assistants.errors.updatePet", { defaultValue: "Failed to update Web Pet setting." }));
    } finally {
      setToggleBusy(false);
    }
  }, [onUpdatePetEnabled, t]);

  const handleSavePetPersona = useCallback(async () => {
    const gid = String(groupId || "").trim();
    if (!gid) return;
    setSaveBusy(true);
    setError("");
    setNotice("");
    try {
      const currentHelp = promptInfo ?? await loadPetPersona();
      if (!currentHelp) return;
      const currentContent = String(currentHelp.content || "");
      const actorOrder = Object.keys(parseHelpMarkdown(currentContent).actorNotes);
      const nextContent = updatePetHelpNote(currentContent, petPersonaDraft, actorOrder);
      const resp = await api.updateGroupPrompt(gid, "help", nextContent, {
        editorMode: "structured",
        changedBlocks: ["pet"],
      });
      if (!resp.ok) {
        setError(resp.error?.message || t("assistants.errors.savePersona", { defaultValue: "Failed to save assistant persona." }));
        return;
      }
      const nextSaved = String(parseHelpMarkdown(String(resp.result.content || "")).pet || "").trim();
      setPromptInfo(resp.result);
      setSavedPetPersona(nextSaved);
      setPetPersonaDraft(resolvePetPersonaDraft(nextSaved));
      setLoaded(true);
      setNotice(t("assistants.personaSaved", { defaultValue: "Assistant persona saved." }));
    } catch {
      setError(t("assistants.errors.savePersona", { defaultValue: "Failed to save assistant persona." }));
    } finally {
      setSaveBusy(false);
    }
  }, [groupId, loadPetPersona, petPersonaDraft, promptInfo, t]);

  const handleDiscardPetPersona = useCallback(() => {
    setPetPersonaDraft(normalizedSavedPersona);
    setError("");
    setNotice("");
  }, [normalizedSavedPersona]);

  if (!groupId) {
    return (
      <div className={settingsWorkspaceShellClass(isDark)}>
        <div className={settingsWorkspaceHeaderClass(isDark)}>
          <div>
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">{t("tabs.assistants", { defaultValue: "Assistant" })}</div>
            <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
              {t("assistants.requireGroup", { defaultValue: "Open settings from a group to configure assistants." })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${settingsWorkspaceShellClass(isDark)} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={settingsWorkspaceHeaderClass(isDark)}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
              {t("assistants.title", { defaultValue: "Assistant" })}
            </h3>
            <StatusPill tone={petEnabled ? "on" : "off"}>
              {petEnabled
                ? t("assistants.status.enabled", { defaultValue: "Web Pet On" })
                : t("assistants.status.disabled", { defaultValue: "Web Pet Off" })}
            </StatusPill>
            <StatusPill tone="info">
              {t("assistants.status.lightweight", { defaultValue: "Prompt-backed" })}
            </StatusPill>
          </div>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--color-text-muted)]">
            {t("assistants.description", {
              defaultValue: "Configure the group assistant surfaces that already exist on main: Web Pet visibility and its @pet persona prompt.",
            })}
          </p>
        </div>
        <AssistantSwitch
          checked={petEnabled}
          disabled={busy || toggleBusy}
          label={t("assistants.webPet", { defaultValue: "Web Pet" })}
          hint={t("assistants.webPetHint", { defaultValue: "Group scoped" })}
          onChange={handleTogglePet}
        />
      </div>

      <div className={settingsWorkspaceBodyClass}>
        <SettingsBlock
          isDark={isDark}
          title={t("assistants.webPetTitle", { defaultValue: "Web Pet assistant" })}
          hint={t("assistants.webPetDescription", {
            defaultValue: "This keeps main's existing Web Pet feature while adopting the worktree settings layout.",
          })}
        >
          <div className={settingsWorkspaceSoftPanelClass(isDark)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--color-text-primary)]">
                  {t("assistants.petToggleTitle", { defaultValue: "Show Web Pet for this group" })}
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                  {t("assistants.petToggleHint", {
                    defaultValue: "Uses desktop_pet_enabled from group settings; no Voice Secretary backend is required.",
                  })}
                </p>
              </div>
              <AssistantSwitch
                checked={petEnabled}
                disabled={busy || toggleBusy}
                label={petEnabled ? t("common:on", { defaultValue: "On" }) : t("common:off", { defaultValue: "Off" })}
                onChange={handleTogglePet}
              />
            </div>
          </div>
        </SettingsBlock>

        <SettingsBlock
          isDark={isDark}
          title={t("assistants.personaTitle", { defaultValue: "@pet persona" })}
          hint={t("assistants.personaDescription", {
            defaultValue: "Edit the ## @pet block in this group's help prompt. Guidance, role notes, and actor notes are preserved.",
          })}
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--color-text-muted)]">
              <span>{promptInfo?.path || promptInfo?.filename || t("assistants.helpPrompt", { defaultValue: "help prompt" })}</span>
              {hasUnsavedPersona ? <StatusPill tone="info">{t("assistants.unsaved", { defaultValue: "Unsaved changes" })}</StatusPill> : null}
            </div>
            <textarea
              value={petPersonaDraft}
              onChange={(event) => setPetPersonaDraft(event.target.value)}
              className={`${inputClass(isDark)} min-h-[260px] resize-y font-mono text-xs leading-5`}
              placeholder={t("assistants.personaPlaceholder", { defaultValue: "Describe how the Web Pet should help this group..." })}
              disabled={disabled}
            />
            {error ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                {error}
              </div>
            ) : null}
            {notice ? (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                {notice}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button type="button" className={secondaryButtonClass("sm")} disabled={disabled} onClick={() => void loadPetPersona()}>
                {loadBusy ? t("common:loading", { defaultValue: "Loading..." }) : t("assistants.reload", { defaultValue: "Reload" })}
              </button>
              <button type="button" className={secondaryButtonClass("sm")} disabled={disabled || !hasUnsavedPersona} onClick={handleDiscardPetPersona}>
                {t("assistants.discard", { defaultValue: "Discard" })}
              </button>
              <button type="button" className={primaryButtonClass(saveBusy)} disabled={disabled || !hasUnsavedPersona} onClick={() => void handleSavePetPersona()}>
                {saveBusy ? t("common:saving") : t("assistants.savePersona", { defaultValue: "Save persona" })}
              </button>
            </div>
          </div>
        </SettingsBlock>
      </div>
    </div>
  );
}
