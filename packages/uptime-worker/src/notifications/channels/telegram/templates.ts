import { parseTemplate } from "../../../util/parseTemplate";
import { CheckResultList } from "../../../types";

export const telegramDowntimeTemplate = parseTemplate<{
  failedChecks: CheckResultList;
  statuspageUrl?: string;
}>(`{% assign checksCount = failedChecks | size %}
<b>⚠️ {{ checksCount }} {% if checksCount == 1 %}check is{% else %}checks are{% endif %} down.</b>
{% if statuspageUrl %}Status page: {{ statuspageUrl }}{% endif %}
{% for check in failedChecks %}
🔴 <a href="{{ check.target }}">{{ check.name }}</a>
{% if check.error %}<blockquote expandable>{{ check.error }}</blockquote>{% endif %}
{% endfor %}
`);

export const telegramRecoveryTemplate = parseTemplate<{
  statuspageUrl?: string;
  duration?: string;
}>(`✅ All checks are up and running!
{% if duration %}The incident lasted {{ duration }}.{% endif %}
{% if statuspageUrl %}Status page: {{ statuspageUrl }}{% endif %}
`);
