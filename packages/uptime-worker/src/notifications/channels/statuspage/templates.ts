import { parseTemplate } from "../../../util/parseTemplate";
import { CheckResultList } from "../../../types";

export const statuspageDowntimeTitleTemplate = parseTemplate<{
  failedChecks: CheckResultList;
}>(`{% assign checksCount = failedChecks | size %}
⚠️ {{ checksCount }} {% if checksCount == 1 %}check is{% else %}checks are{% endif %} down
`);

export const statuspageDowntimeBodyTemplate = parseTemplate<{
  failedChecks: CheckResultList;
}>(`The following services are currently down:
{%- for check in failedChecks %}
🔴 {{ check.name }}
{% if check.error -%}<code>{{ check.error }}</code>{% endif -%}
{% endfor -%}
`);

export const statuspageRecoveryTemplate = parseTemplate(
  `All services have recovered.`,
);

export const statuspagePostmortemTemplate = parseTemplate<{
  incidentDetails: string;
  duration?: string;
}>(`## Issue
{{ incidentDetails }}
{% if duration -%}
## Duration
The incident lasted {{ duration }}.
{% endif -%}
## Resolution
All services are back up and running and the incident has been resolved.
`);
