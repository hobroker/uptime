import { parseTemplate } from "../../parseTemplate";
import { CheckResultList } from "../../../types";

export const telegramDowntimeTemplate = parseTemplate<{
  downtimeChecks: CheckResultList;
  statusPageUrl?: string;
}>(`{% assign checksCount = downtimeChecks | size %}
<b>⚠️ {{ checksCount }} {% if checksCount == 1 %}check is{% else %}checks are{% endif %} down.</b>
{% if statusPageUrl %}Status page: {{ statusPageUrl }}{% endif %}
{% for check in downtimeChecks %}
🔴 <a href="{{ check.target }}">{{ check.name }}</a>
{% if check.error %}<blockquote expandable>{{ check.error }}</blockquote>{% endif %}
{% endfor %}
`);

export const telegramRecoveryTemplate = parseTemplate<{
  statusPageUrl?: string;
}>(`✅ All checks are up and running!
{% if statusPageUrl %}Status page: {{ statusPageUrl }}{% endif %}
`);
