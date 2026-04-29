// AdvancedTab groups technical per-group policies and maintenance tools.
import { useTranslation } from "react-i18next";

import { BlueprintTab, type BlueprintTabProps } from "./BlueprintTab";
import { DeliveryTab, type DeliveryTabProps } from "./DeliveryTab";
import { TranscriptPolicySection, type TranscriptPolicySectionProps } from "./TranscriptTab";
import { settingsWorkspacePanelClass } from "./types";

interface AdvancedTabProps {
  isDark: boolean;
  delivery: DeliveryTabProps;
  transcript: TranscriptPolicySectionProps;
  blueprint: BlueprintTabProps;
}

export function AdvancedTab({ isDark, delivery, transcript, blueprint }: AdvancedTabProps) {
  const { t } = useTranslation("settings");

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">{t("advanced.title")}</h3>
        <p className="text-xs mt-1 text-[var(--color-text-muted)]">
          {t("advanced.description")}
        </p>
      </div>

      <section className={settingsWorkspacePanelClass(isDark)}>
        <DeliveryTab {...delivery} />
      </section>

      <section className={settingsWorkspacePanelClass(isDark)}>
        <TranscriptPolicySection {...transcript} />
      </section>

      <section className={settingsWorkspacePanelClass(isDark)}>
        <div className="mb-4">
          <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">{t("blueprint.title")}</h3>
          <p className="text-xs mt-1 text-[var(--color-text-muted)]">
            {t("blueprint.description")}
          </p>
        </div>
        <BlueprintTab {...blueprint} />
      </section>
    </div>
  );
}
