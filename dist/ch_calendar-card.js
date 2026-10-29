/**
 * ch_calendar-card - 中国节假日日历卡片
 * 基于 Lit，适配 Home Assistant 2023.5+
 * 0.4.0：可手动调用 chineseholiday.get 拉取节假日；卡片内添加的公历纪念日只存在前端，不写入后端节假日。
 */

const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

const STATE_ICON = {
  工作日: "mdi:briefcase-outline",
  休息日: "mdi:sofa-outline",
  节假日: "mdi:beach",
};

const STATE_COLOR = {
  工作日: "var(--info-color, #039be5)",
  休息日: "var(--success-color, #4caf50)",
  节假日: "var(--warning-color, #ff9800)",
};

class ChineseCalendarCard extends LitElement {
  static get styles() {
    return css`
      :host {
        --card-radius: 20px;
        --spacing: 18px;
        --accent-color: var(--primary-color, #3b82f6);
        --accent-strong: color-mix(in srgb, var(--accent-color) 82%, #0f172a);
        --accent-soft: color-mix(in srgb, var(--accent-color) 16%, transparent);
        --surface-soft: color-mix(in srgb, var(--card-background-color, #fff) 92%, var(--accent-color));
        --hero-text: #ffffff;
        --hero-subtle: rgba(255, 255, 255, 0.82);
        --chip-bg: rgba(255, 255, 255, 0.14);
        --chip-border: rgba(255, 255, 255, 0.18);
      }

      ha-card {
        overflow: hidden;
        border-radius: var(--ha-card-border-radius, var(--card-radius));
        background:
          radial-gradient(circle at top right, color-mix(in srgb, var(--accent-color) 18%, transparent), transparent 34%),
          linear-gradient(180deg, color-mix(in srgb, var(--card-background-color, #fff) 96%, var(--accent-color)), var(--card-background-color, #fff) 38%);
        box-shadow:
          0 16px 40px rgba(15, 23, 42, 0.08),
          0 2px 10px rgba(15, 23, 42, 0.06);
      }

      .hero {
        position: relative;
        padding: 22px var(--spacing) 18px;
        background:
          radial-gradient(circle at top left, rgba(255, 255, 255, 0.16), transparent 28%),
          radial-gradient(circle at bottom right, rgba(15, 23, 42, 0.22), transparent 36%),
          linear-gradient(135deg, color-mix(in srgb, var(--accent-color) 72%, #0f172a), color-mix(in srgb, var(--accent-color) 88%, #38bdf8));
        color: var(--hero-text);
        cursor: pointer;
        user-select: none;
      }

      .hero::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0));
        pointer-events: none;
      }

      .hero-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        position: relative;
        z-index: 1;
      }

      .date-solar {
        font-size: clamp(30px, 7vw, 42px);
        font-weight: 700;
        line-height: 1.02;
        letter-spacing: -0.04em;
        text-shadow: 0 2px 12px rgba(15, 23, 42, 0.18);
      }

      .date-lunar {
        margin-top: 8px;
        font-size: 14px;
        font-weight: 500;
        color: var(--hero-subtle);
      }

      .date-week {
        margin-top: 4px;
        font-size: 14px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.96);
      }

      .time-block {
        text-align: right;
        padding: 10px 12px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.14);
        backdrop-filter: blur(10px);
        min-width: 104px;
      }

      .time-now {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 26px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.04em;
        line-height: 1;
        min-height: 1em;
      }

      .time-main {
        display: inline-flex;
        align-items: center;
        height: 1em;
      }

      .time-seconds {
        display: inline-flex;
        align-items: center;
        gap: 1px;
        min-width: 1.7em;
        height: 1em;
      }

      .time-odo-slot {
        position: relative;
        width: 0.68em;
        height: 1em;
        overflow: hidden;
        display: inline-block;
        line-height: 1;
        vertical-align: middle;
      }

      .time-odo-value,
      .time-odo-digit {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 1em;
      }

      .time-odo-value {
        position: absolute;
        inset: 0;
      }

      .time-odo-stack {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        animation: time-odo-slide 190ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }

      @keyframes time-odo-slide {
        0% {
          opacity: 1;
          transform: translateY(0);
        }
        100% {
          opacity: 1;
          transform: translateY(-1em);
        }
      }

      .week-num {
        margin-top: 6px;
        font-size: 12px;
        color: var(--hero-subtle);
        text-align: right;
      }

      .hero-bottom {
        position: relative;
        z-index: 1;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
        margin-top: 18px;
      }

      .state-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 34px;
        padding: 6px 12px 6px 10px;
        border-radius: 999px;
        background: var(--chip-bg);
        border: 1px solid var(--chip-border);
        font-size: 13px;
        font-weight: 600;
        line-height: 1;
        backdrop-filter: blur(10px);
      }

      .state-badge ha-icon {
        --mdc-icon-size: 16px;
      }

      .tomorrow-state {
        margin-left: 2px;
        padding-left: 8px;
        border-left: 1px solid rgba(255, 255, 255, 0.22);
        color: var(--hero-subtle);
        font-size: 12px;
        font-weight: 500;
      }

      .tomorrow-state-value {
        margin-left: 2px;
        padding: 2px 8px;
        border-radius: 999px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.96);
        background: rgba(255, 255, 255, 0.14);
      }

      .tomorrow-state-value.rest,
      .tomorrow-state-value.holiday {
        color: #0f5132;
        background: linear-gradient(135deg, rgba(187, 247, 208, 0.95), rgba(134, 239, 172, 0.92));
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12) inset;
      }

      .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .tag {
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.12);
        font-size: 12px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.96);
        backdrop-filter: blur(8px);
      }

      .countdown {
        margin: 14px var(--spacing) 0;
        padding: 14px;
        border: 1px solid color-mix(in srgb, var(--divider-color, rgba(0, 0, 0, 0.08)) 72%, transparent);
        border-radius: 18px;
        background:
          linear-gradient(180deg, color-mix(in srgb, var(--card-background-color, #fff) 84%, var(--accent-color)), var(--card-background-color, #fff));
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 18px;
      }

      .countdown-days {
        display: flex;
        align-items: baseline;
        gap: 4px;
        font-size: clamp(44px, 10vw, 58px);
        font-weight: 700;
        line-height: 1;
        color: var(--accent-strong);
        font-variant-numeric: tabular-nums;
        min-width: 96px;
        letter-spacing: -0.05em;
      }

      .countdown-unit {
        font-size: 18px;
        font-weight: 600;
        color: var(--primary-text-color);
      }

      .countdown-info {
        min-width: 0;
      }

      .countdown-label {
        font-size: 12px;
        color: var(--secondary-text-color);
        letter-spacing: 0.08em;
        margin-bottom: 6px;
      }

      .countdown-name {
        font-size: 22px;
        font-weight: 600;
        color: var(--primary-text-color);
        line-height: 1.2;
      }

      .countdown-date {
        margin-top: 6px;
        font-size: 14px;
        color: var(--secondary-text-color);
      }

      .list {
        padding: 14px var(--spacing) 4px;
        display: grid;
        gap: 10px;
      }

      .section {
        padding: 16px var(--spacing) 2px;
      }

      .section + .section {
        padding-top: 8px;
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
        padding: 0 2px;
      }

      .section-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--accent-color);
        box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent-color) 14%, transparent);
        animation: section-dot-pulse 1.8s ease-out infinite;
        transform-origin: center;
      }

      @keyframes section-dot-pulse {
        0% {
          transform: scale(0.92);
          box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent-color) 26%, transparent);
          opacity: 0.9;
        }
        70% {
          transform: scale(1.12);
          box-shadow: 0 0 0 9px color-mix(in srgb, var(--accent-color) 0%, transparent);
          opacity: 1;
        }
        100% {
          transform: scale(0.92);
          box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent-color) 0%, transparent);
          opacity: 0.9;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .section-dot {
          animation: none;
        }

        .time-odo-stack,
        .item-odo-stack {
          animation: none;
        }
      }

      .section-title {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--secondary-text-color);
      }

      .list-item {
        display: grid;
        grid-template-columns: 44px minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        padding: 14px;
        border-radius: 18px;
        background: color-mix(in srgb, var(--card-background-color, #fff) 94%, var(--accent-color));
        border: 1px solid color-mix(in srgb, var(--divider-color, rgba(0, 0, 0, 0.08)) 72%, transparent);
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
      }

      .item-icon {
        width: 44px;
        height: 44px;
        border-radius: 14px;
        background: var(--accent-soft);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .item-icon ha-icon {
        --mdc-icon-size: 18px;
        color: var(--primary-color);
      }

      .item-body {
        flex: 1;
        min-width: 0;
      }

      .item-name {
        font-size: 18px;
        font-weight: 600;
        color: var(--primary-text-color);
        line-height: 1.3;
        word-break: break-word;
      }

      .item-name-accent {
        color: color-mix(in srgb, var(--accent-color) 72%, #f59e0b);
        font-weight: 700;
      }

      .item-sub {
        margin-top: 6px;
        font-size: 13px;
        color: var(--secondary-text-color);
        line-height: 1.4;
        word-break: break-word;
      }

      .item-days {
        justify-self: end;
        max-width: min(38vw, 280px);
        padding: 8px 10px;
        border-radius: 14px;
        background: color-mix(in srgb, var(--accent-color) 10%, transparent);
        font-size: 13px;
        font-weight: 600;
        line-height: 1.35;
        color: var(--accent-strong);
        white-space: normal;
        text-align: right;
        flex-shrink: 0;
      }

      .item-days-main {
        display: block;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.25;
      }

      .item-days-detail {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 1px;
        margin-top: 4px;
        min-height: 1em;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.2;
        color: color-mix(in srgb, currentColor 72%, transparent);
        letter-spacing: 0.04em;
      }

      .item-days-detail-main {
        display: inline-block;
      }

      .item-days-detail-seconds {
        display: inline-flex;
        align-items: center;
        gap: 1px;
        min-width: 2.2em;
        height: 1em;
      }

      .item-odo-slot {
        position: relative;
        width: 0.62em;
        height: 1em;
        overflow: hidden;
        display: inline-block;
        line-height: 1;
        vertical-align: baseline;
      }

      .item-odo-value,
      .item-odo-digit {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 1em;
      }

      .item-odo-value {
        position: absolute;
        inset: 0;
      }

      .item-odo-stack {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        animation: item-odo-slide 180ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }

      @keyframes item-odo-slide {
        0% {
          opacity: 1;
          transform: translateY(0);
        }
        100% {
          opacity: 1;
          transform: translateY(-1em);
        }
      }

      .item-days.normal {
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
        color: var(--primary-text-color);
        font-weight: 500;
      }

      .holiday-info {
        margin: 10px var(--spacing) var(--spacing);
        padding: 16px 18px;
        border-radius: 18px;
        background:
          linear-gradient(180deg, color-mix(in srgb, var(--card-background-color, #fff) 90%, var(--accent-color)), var(--card-background-color, #fff));
        border: 1px solid color-mix(in srgb, var(--divider-color, rgba(0, 0, 0, 0.08)) 72%, transparent);
        font-size: 14px;
        color: var(--primary-text-color);
        line-height: 1.75;
        white-space: normal;
      }

      .holiday-info-title {
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--secondary-text-color);
      }

      .holiday-info-list {
        display: grid;
        gap: 12px;
      }

      .holiday-info-row {
        position: relative;
        display: grid;
        grid-template-columns: 120px minmax(0, 1fr);
        gap: 14px;
        align-items: start;
        padding: 14px 14px 14px 18px;
        border-radius: 16px;
        background: color-mix(in srgb, var(--card-background-color, #fff) 90%, var(--accent-color));
        border: 1px solid color-mix(in srgb, var(--divider-color, rgba(0, 0, 0, 0.08)) 72%, transparent);
        overflow: hidden;
      }

      .holiday-info-row::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background: linear-gradient(180deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 55%, #ffffff));
      }

      .holiday-info-label {
        display: inline-flex;
        align-items: center;
        align-self: center;
        justify-self: start;
        min-height: 32px;
        padding: 0 12px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 700;
        color: var(--accent-strong);
        background: color-mix(in srgb, var(--accent-color) 14%, transparent);
        white-space: nowrap;
      }

      .holiday-info-value {
        font-size: 14px;
        color: var(--primary-text-color);
        line-height: 1.75;
        word-break: break-word;
      }

      .holiday-info-row.full {
        grid-template-columns: 1fr;
        padding: 16px 16px 16px 18px;
        background:
          linear-gradient(135deg, color-mix(in srgb, var(--card-background-color, #fff) 76%, var(--accent-color)), color-mix(in srgb, var(--card-background-color, #fff) 92%, var(--accent-color)));
      }

      .holiday-info-row.full .holiday-info-value {
        font-size: 18px;
        font-weight: 700;
        line-height: 1.5;
      }

      .holiday-plan-list {
        box-sizing: border-box;
        min-width: 0;
        max-width: 100%;
        justify-self: start;
        padding: 14px;
        border-radius: 18px;
        background:
          linear-gradient(180deg, color-mix(in srgb, var(--card-background-color, #fff) 88%, var(--accent-color)), color-mix(in srgb, var(--card-background-color, #fff) 96%, var(--accent-color)));
        border: 1px solid color-mix(in srgb, var(--divider-color, rgba(0, 0, 0, 0.08)) 72%, transparent);
      }

      .holiday-plan-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 12px;
        min-width: 0;
      }

      .holiday-plan-label {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 0 12px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--accent-color) 14%, transparent);
        color: var(--accent-strong);
        font-size: 13px;
        font-weight: 700;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .holiday-plan-total {
        min-width: 0;
        font-size: 14px;
        font-weight: 700;
        color: var(--primary-text-color);
        white-space: normal;
        overflow-wrap: anywhere;
        word-break: break-word;
        text-align: right;
      }

      .holiday-plan-calendar {
        display: grid;
        gap: 14px;
        min-width: 0;
      }

      .holiday-plan-weekdays,
      .holiday-plan-days {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 10px;
        min-width: 0;
      }

      .holiday-plan-weekday {
        text-align: center;
        font-size: 12px;
        font-weight: 700;
        color: var(--secondary-text-color);
      }

      .holiday-plan-day {
        min-width: 0;
        min-height: 52px;
        padding: 8px 6px;
        border-radius: 14px;
        text-align: center;
        border: 1px solid transparent;
        position: relative;
        z-index: 1;
      }

      .holiday-plan-day.leave {
        background: color-mix(in srgb, var(--warning-color, #f59e0b) 16%, transparent);
        border-color: color-mix(in srgb, var(--warning-color, #f59e0b) 24%, transparent);
      }

      .holiday-plan-day.holiday {
        background: color-mix(in srgb, var(--success-color, #22c55e) 16%, transparent);
        border-color: color-mix(in srgb, var(--success-color, #22c55e) 24%, transparent);
      }

      .holiday-plan-day.rest {
        background: color-mix(in srgb, var(--accent-color) 12%, transparent);
        border-color: color-mix(in srgb, var(--accent-color) 18%, transparent);
      }

      .holiday-plan-day.work {
        background: color-mix(in srgb, var(--secondary-text-color) 8%, transparent);
        border-color: color-mix(in srgb, var(--secondary-text-color) 12%, transparent);
      }

      .holiday-plan-day-date {
        font-size: 15px;
        font-weight: 700;
        color: var(--primary-text-color);
      }

      .holiday-plan-day-tag {
        margin-top: 4px;
        font-size: 11px;
        font-weight: 700;
        color: var(--secondary-text-color);
      }

      .holiday-plan-summary {
        margin-top: 12px;
        font-size: 14px;
        color: var(--primary-text-color);
        line-height: 1.7;
        min-width: 0;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .holiday-plan-summary strong {
        color: var(--accent-strong);
      }

      .holiday-info-plain {
        font-size: 14px;
        color: var(--primary-text-color);
        line-height: 1.75;
        white-space: pre-wrap;
      }


      .fetch-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 34px;
        margin-left: auto;
        padding: 6px 12px;
        border: 1px solid var(--chip-border);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.16);
        color: #fff;
        font: inherit;
        font-size: 12px;
        font-weight: 700;
        line-height: 1;
        cursor: pointer;
      }

      .fetch-btn ha-icon {
        --mdc-icon-size: 16px;
        color: #fff;
      }

      .memorial-panel {
        margin: 14px var(--spacing) 0;
        padding: 14px;
        border-radius: 18px;
        border: 1px dashed color-mix(in srgb, var(--accent-color) 35%, var(--divider-color, rgba(0, 0, 0, 0.12)));
        background: color-mix(in srgb, var(--card-background-color, #fff) 94%, var(--accent-color));
      }

      .memorial-head {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .memorial-head .section-title {
        flex: 1;
      }

      .memorial-note,
      .memorial-message {
        margin: 8px 0 0;
        font-size: 12px;
        line-height: 1.55;
        color: var(--secondary-text-color);
      }

      .memorial-message {
        color: var(--primary-color);
      }

      .text-btn,
      .memorial-save,
      .memorial-delete {
        border: 0;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--primary-color);
        font: inherit;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
      }

      .text-btn,
      .memorial-save {
        min-height: 32px;
        padding: 6px 12px;
      }

      .memorial-form {
        display: grid;
        grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(140px, 1.2fr) auto;
        gap: 8px;
        margin-top: 12px;
      }

      .memorial-input,
      .memorial-select {
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
        min-height: 36px;
        padding: 6px 10px;
        border-radius: 12px;
        border: 1px solid color-mix(in srgb, var(--divider-color, rgba(0, 0, 0, 0.16)) 80%, transparent);
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color);
        font: inherit;
        font-size: 13px;
      }

      .memorial-list {
        display: grid;
        gap: 8px;
        margin-top: 12px;
      }

      .memorial-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        gap: 8px;
        align-items: center;
        padding: 10px 12px;
        border-radius: 14px;
        background: color-mix(in srgb, var(--card-background-color, #fff) 88%, var(--accent-color));
      }

      .memorial-name {
        font-size: 15px;
        font-weight: 650;
        color: var(--primary-text-color);
        word-break: break-word;
      }

      .memorial-sub {
        margin-top: 3px;
        font-size: 12px;
        color: var(--secondary-text-color);
        word-break: break-word;
      }

      .memorial-days {
        font-size: 13px;
        font-weight: 700;
        color: var(--accent-strong);
        text-align: right;
      }

      .memorial-delete {
        width: 28px;
        height: 28px;
        padding: 0;
      }

      .memorial-badge {
        display: inline-flex;
        margin-left: 6px;
        padding: 1px 6px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--primary-color);
        font-size: 11px;
        font-weight: 700;
        vertical-align: 1px;
      }

      @media (max-width: 480px) {
        :host {
          --spacing: 12px;
          --card-radius: 18px;
        }

        .hero {
          padding: 18px var(--spacing) 14px;
        }

        .hero-top {
          gap: 10px;
          align-items: center;
        }

        .date-solar {
          font-size: clamp(24px, 6.8vw, 30px);
        }

        .date-lunar,
        .date-week {
          font-size: 12px;
        }

        .time-block {
          padding: 8px 10px;
          min-width: 84px;
          border-radius: 14px;
        }

        .time-now {
          font-size: 21px;
          letter-spacing: 0.02em;
        }

        .week-num {
          margin-top: 4px;
          font-size: 11px;
        }

        .hero-bottom {
          margin-top: 14px;
          gap: 8px;
        }

        .state-badge,
        .tag {
          font-size: 12px;
        }

        .countdown {
          margin-top: 12px;
          padding: 12px;
          gap: 12px;
          align-items: center;
        }

        .countdown-days {
          min-width: 74px;
          font-size: clamp(34px, 9vw, 44px);
        }

        .countdown-unit {
          font-size: 15px;
        }

        .countdown-label {
          margin-bottom: 4px;
          font-size: 11px;
        }

        .countdown-name {
          font-size: 18px;
        }

        .countdown-date {
          margin-top: 4px;
          font-size: 12px;
        }

        .list-item {
          grid-template-columns: 38px minmax(0, 1fr) auto;
          gap: 10px;
          padding: 12px;
        }

        .item-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
        }

        .item-icon ha-icon {
          --mdc-icon-size: 16px;
        }

        .item-name {
          font-size: 16px;
        }

        .item-sub,
        .item-days {
          font-size: 12px;
        }

        .item-days {
          max-width: min(34vw, 120px);
          padding: 7px 8px;
        }

        .section {
          padding-left: var(--spacing);
          padding-right: var(--spacing);
        }

        .list {
          padding-left: 0;
          padding-right: 0;
        }

        .holiday-info-row {
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .holiday-info-label {
          min-height: 28px;
          padding: 0 10px;
        }

        .holiday-plan-top,
        .holiday-plan-calendar {
          display: grid;
        }

        .holiday-plan-list {
          padding: 12px;
        }

        .holiday-plan-top {
          justify-content: stretch;
        }

        .holiday-plan-total {
          font-size: 13px;
          line-height: 1.5;
          text-align: left;
        }

        .holiday-plan-weekdays,
        .holiday-plan-days {
          gap: 6px;
        }

        .holiday-plan-day {
          min-height: 46px;
          padding: 6px 4px;
        }

        .holiday-plan-day-date {
          font-size: 13px;
        }

        .fetch-btn {
          margin-left: 0;
        }

        .memorial-form,
        .memorial-row {
          grid-template-columns: 1fr;
        }

        .memorial-days {
          text-align: left;
        }

      }

      @media (max-width: 360px) {
        .hero-top,
        .countdown {
          flex-direction: column;
          align-items: flex-start;
        }

        .time-block,
        .countdown-days {
          min-width: 0;
        }

        .time-block,
        .week-num {
          text-align: left;
        }

        .list-item {
          grid-template-columns: 38px minmax(0, 1fr);
        }

        .item-days {
          grid-column: 1 / -1;
          justify-self: stretch;
          max-width: none;
          text-align: left;
        }
      }
    `;
  }

  static get properties() {
    return {
      config: { type: Object },
      _hass: { type: Object },
      _time: { type: String },
      _nowMs: { type: Number },
      _timeSecondSlots: { type: Array },
      _itemSecondRolling: { type: Boolean },
      _prevTime: { type: String },
      _prevNowMs: { type: Number },
      _rollPhase: { type: String },
      _fetching: { type: Boolean },
      _fetchMessage: { type: String },
      _memorialOpen: { type: Boolean },
      _userAnniversaries: { type: Array },
      _memorialMessage: { type: String },
      _draftMode: { type: String },
    };
  }

  constructor() {
    super();
    this._ticker = null;
    this._timeRollCleanup = null;
    this._nowMs = Date.now();
    this._time = this._formatNowTime(this._nowMs);
    this._timeSecondSlots = this._buildTimeSecondSlots(this._time, this._time);
    this._itemSecondRolling = false;
    this._prevNowMs = this._nowMs;
    this._prevTime = this._time;
    this._rollPhase = "phase-a";
    this._fetching = false;
    this._fetchMessage = "";
    this._memorialOpen = false;
    this._userAnniversaries = [];
    this._userData = { itemsByEntity: {} };
    this._userDataLoadedKey = "";
    this._memorialMessage = "";
    this._draftName = "";
    this._draftDate = "";
    this._draftTime = "09:00";
    this._draftMode = "yearly_count";
  }

  connectedCallback() {
    super.connectedCallback();
    this._startTicker();
  }

  disconnectedCallback() {
    this._stopTicker();
    if (this._timeRollCleanup !== null) {
      window.clearTimeout(this._timeRollCleanup);
      this._timeRollCleanup = null;
    }
    super.disconnectedCallback();
  }

  _startTicker() {
    this._stopTicker();
    this._tick();
    this._ticker = window.setInterval(() => this._tick(), 1000);
  }

  _stopTicker() {
    if (this._ticker !== null) {
      window.clearInterval(this._ticker);
      this._ticker = null;
    }
  }

  _tick() {
    const previousTime = this._time;
    this._prevNowMs = this._nowMs;
    this._prevTime = this._time;
    this._nowMs = Date.now();
    this._time = this._formatNowTime(this._nowMs);
    this._timeSecondSlots = this._buildTimeSecondSlots(previousTime, this._time);
    this._itemSecondRolling = true;
    this._rollPhase = this._rollPhase === "phase-a" ? "phase-b" : "phase-a";
    if (this._timeRollCleanup !== null) {
      window.clearTimeout(this._timeRollCleanup);
    }
    this._timeRollCleanup = window.setTimeout(() => {
      this._timeSecondSlots = this._buildTimeSecondSlots(this._time, this._time);
      this._itemSecondRolling = false;
      this._timeRollCleanup = null;
      this.requestUpdate();
    }, 220);
    this.requestUpdate();
  }

  _formatNowTime(nowMs) {
    return new Date(nowMs).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  _splitTime(value) {
    if (!value) return ["00:00", "00"];
    const parts = String(value).split(":");
    if (parts.length < 3) return [String(value), "00"];
    return [`${parts[0]}:${parts[1]}`, parts[2]];
  }

  _buildTimeSecondSlots(previousTime, currentTime) {
    const [, prevSeconds = "00"] = this._splitTime(previousTime);
    const [, currSeconds = "00"] = this._splitTime(currentTime);
    return [0, 1].map(index => ({
      previous: prevSeconds[index],
      current: currSeconds[index],
      animating: prevSeconds[index] !== currSeconds[index],
    }));
  }

  _renderTimeSecondSlots() {
    return html`
      ${(this._timeSecondSlots || []).map(slot => html`
        <span class="time-odo-slot">
          ${slot.animating ? html`
            <span class="time-odo-stack">
              <span class="time-odo-digit">${slot.previous}</span>
              <span class="time-odo-digit">${slot.current}</span>
            </span>
          ` : html`<span class="time-odo-value">${slot.current}</span>`}
        </span>
      `)}
    `;
  }

  _buildItemSecondSlots(previousSeconds, currentSeconds) {
    const prev = String(previousSeconds ?? currentSeconds ?? "00").padStart(2, "0").slice(-2);
    const curr = String(currentSeconds ?? previousSeconds ?? "00").padStart(2, "0").slice(-2);
    return [0, 1].map(index => ({
      previous: prev[index],
      current: curr[index],
      animating: this._itemSecondRolling && prev[index] !== curr[index],
    }));
  }

  _renderItemSecondSlots(previousSeconds, currentSeconds) {
    const slots = this._buildItemSecondSlots(previousSeconds, currentSeconds);
    return html`
      ${slots.map(slot => html`
        <span class="item-odo-slot">
          ${slot.animating ? html`
            <span class="item-odo-stack">
              <span class="item-odo-digit">${slot.previous}</span>
              <span class="item-odo-digit">${slot.current}</span>
            </span>
          ` : html`<span class="item-odo-value">${slot.current}</span>`}
        </span>
      `)}
    `;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('请在卡片配置中指定 "entity" 字段');
    }
    const previous = this.config?.entity;
    this.config = config;
    if (previous && previous !== config.entity && this._hass) {
      this._userDataLoadedKey = this._anniversaryStorageKey();
      this._loadUserAnniversaries();
    }
  }

  set hass(hass) {
    this._hass = hass;
    const key = this._anniversaryStorageKey();
    if (hass && key && this._userDataLoadedKey !== key) {
      this._userDataLoadedKey = key;
      this._loadUserAnniversaries();
    }
  }

  get _entity() {
    return this._hass?.states[this.config?.entity];
  }

  get _attrs() {
    const attributes = this._entity?.attributes;
    if (!attributes || typeof attributes !== "object") {
      return {};
    }

    // The companion integration can omit the nested `data` object when
    // show_detail is disabled. In that case its useful fields remain at the
    // entity's top level, so render from those attributes instead.
    if (attributes.data && typeof attributes.data === "object") {
      return attributes.data;
    }
    return attributes;
  }

  render() {
    if (!this._entity) {
      return html`<ha-card><div style="padding:16px;color:var(--error-color)">找不到实体：${this.config?.entity}</div></ha-card>`;
    }

    const attrs = this._attrs;
    const state = this._entity.state;
    const [timeMain] = this._splitTime(this._time);

    // 标签（节气 / 节日 / 纪念日）
    const tags = [];
    if (attrs.term) tags.push(attrs.term);
    if (attrs.festival) tags.push(attrs.festival);
    if (attrs.anniversary) tags.push(attrs.anniversary);
    const localMemorials = this._localMemorials();
    for (const item of localMemorials) {
      if (item.isToday && item.label && !tags.includes(item.label)) tags.push(item.label);
    }

    // 最近倒计时。卡片纪念日只参与展示，不回写后端节假日。
    const latestReminder = this._getLatestReminder(attrs, localMemorials);

    // 分组事件列表
    const sections = this._buildSections(attrs);

    return html`
      <ha-card>
        <!-- 顶部 Hero -->
        <div class="hero" @click=${this._moreInfo}>
          <div class="hero-top">
            <div class="date-block">
              <div class="date-solar">${attrs.solar || ""}</div>
              <div class="date-lunar">${attrs.lunar || ""}</div>
              <div class="date-week">${attrs.week || ""}</div>
            </div>
            <div class="time-block">
              <div class="time-now">
                <span class="time-main">${timeMain}:</span>
                <span class="time-seconds">${this._renderTimeSecondSlots()}</span>
              </div>
              <div class="week-num">第 ${attrs.week_number || "--"} 周</div>
            </div>
          </div>

          <div class="hero-bottom">
            <div class="state-badge">
              <ha-icon icon="${this._stateIcon(state)}"></ha-icon>
              <span>${state}</span>
              ${attrs.tomorrow_state ? html`
                <span class="tomorrow-state">
                  明天
                  <span class="tomorrow-state-value ${this._tomorrowStateClass(attrs.tomorrow_state)}">${attrs.tomorrow_state}</span>
                </span>
              ` : ""}
            </div>

            ${this._showRefresh() ? html`
              <button class="fetch-btn" type="button" @click=${this._fetchHolidays} title="调用动作 chineseholiday.get，立即重新拉取节假日">
                <ha-icon icon="mdi:cloud-download-outline"></ha-icon>
                <span>${this._fetching ? "拉取中" : (this._fetchMessage || "拉取节假日")}</span>
              </button>
            ` : ""}

            ${tags.length ? html`
              <div class="tags">
                ${tags.map(t => html`<span class="tag">${t}</span>`)}
              </div>
            ` : ""}
          </div>
        </div>

        <!-- 倒计时主区 -->
        ${latestReminder ? html`
          <div class="countdown" @click=${this._moreInfo}>
            <div class="countdown-days">
              ${latestReminder.days}<span class="countdown-unit">天</span>
            </div>
            <div class="countdown-info">
              <div class="countdown-label">距离</div>
              <div class="countdown-name">${latestReminder.name}</div>
              <div class="countdown-date">${this._fmtDate(latestReminder.date)}</div>
            </div>
          </div>
        ` : ""}

        <!-- 分组事件列表 -->
        ${sections.map(section => this._renderSection(section))}

        ${this._renderMemorialSection(localMemorials)}

        <!-- 假期安排详情 -->
        ${attrs.holiday_info_details || attrs.holiday_info_detail || attrs.holiday_info ? html`
          <div class="holiday-info">
            <div class="holiday-info-title">${this._getHolidayInfoTitle(attrs)}</div>
            ${this._renderHolidayInfo(attrs.holiday_info_details || attrs.holiday_info_detail || attrs.holiday_info)}
          </div>
        ` : ""}
      </ha-card>
    `;
  }

  _renderSection(section) {
    return html`
      <div class="section">
        <div class="section-header">
          <span class="section-dot"></span>
          <div class="section-title">${section.title}</div>
        </div>
        <div class="list">
          ${section.items.map((item, index) => this._renderItem(item, index))}
        </div>
      </div>
    `;
  }

  _renderItem(item, index) {
    const icons = [
      "mdi:calendar-star",
      "mdi:cake-variant-outline",
      "mdi:heart-outline",
      "mdi:gift-outline",
      "mdi:party-popper",
      "mdi:calendar-check-outline",
      "mdi:bell-outline",
      "mdi:star-outline",
    ];
    const icon = item.icon || icons[index % icons.length];

    return html`
      <div class="list-item">
        <div class="item-icon">
          <ha-icon icon="${icon}"></ha-icon>
        </div>
        <div class="item-body">
          <div class="item-name">${this._renderDecoratedName(item.name)}</div>
          ${item.sub ? html`<div class="item-sub">${item.sub}</div>` : ""}
        </div>
        ${item.days !== undefined ? html`
          <div class="item-days ${item.highlight ? "" : "normal"}">${this._renderItemDays(item)}</div>
        ` : ""}
      </div>
    `;
  }

  _getLatestReminder(attrs, localMemorials = []) {
    const candidates = [];
    const add = (name, date, days) => {
      const value = Number(days);
      if (!name || !Number.isFinite(value)) return;
      candidates.push({ name, date, days: value });
    };
    if (attrs.nearest_holiday) {
      add(attrs.nearest_holiday, attrs.nearest_holiday_date, attrs.nearest_holiday_days);
    }
    if (attrs.nearest_anniversary) {
      add(attrs.nearest_anniversary, attrs.nearest_anniversary_date, attrs.nearest_anniversary_days);
    }
    for (const item of localMemorials) {
      if (item.kind === "yearly") add(item.label, item.date, item.days);
    }
    candidates.sort((a, b) => a.days - b.days);
    return candidates[0] || null;
  }

  _buildSections(attrs) {
    const upcoming = [];
    const countdowning = [];
    const elapsed = [];

    // 次要倒计时（另一个比最近倒计时远的）
    if (attrs.nearest_holiday && attrs.nearest_anniversary) {
      const hDays = attrs.nearest_holiday_days;
      const aDays = attrs.nearest_anniversary_days;
      if (hDays > aDays) {
        upcoming.push({
          icon: "mdi:calendar-blank-outline",
          name: attrs.nearest_holiday,
          sub: this._fmtDate(attrs.nearest_holiday_date),
          days: attrs.nearest_holiday_days + " 天",
          highlight: true,
        });
      } else if (aDays > hDays) {
        upcoming.push({
          icon: "mdi:cake-variant-outline",
          name: attrs.nearest_anniversary,
          sub: this._fmtDate(attrs.nearest_anniversary_date),
          days: attrs.nearest_anniversary_days + " 天",
          highlight: true,
        });
      }
    }

    // 接下来的纪念日
    if (Array.isArray(attrs.next_anniversaries)) {
      attrs.next_anniversaries.forEach(a => {
        upcoming.push({
          icon: "mdi:cake-variant-outline",
          name: a.name,
          sub: this._fmtDate(a.date),
          days: a.days + " 天",
          highlight: true,
        });
      });
    }

    // 未来纪念日（calculate_age）
    if (Array.isArray(attrs.future_dates)) {
      attrs.future_dates.forEach(d => {
        countdowning.push({
          icon: "mdi:timer-sand",
          name: d.name,
          sub: this._fmtDate(d.date),
          days: this._describeRelativeTime(d.date, "future") || d.description,
          date: d.date,
          timerType: "future",
          highlight: true,
        });
      });
    }

    // 已过去纪念日（calculate_age）
    if (Array.isArray(attrs.past_dates)) {
      attrs.past_dates.forEach(d => {
        elapsed.push({
          icon: "mdi:history",
          name: d.name,
          sub: this._fmtDate(d.date),
          days: this._describeRelativeTime(d.date, "past") || d.description,
          date: d.date,
          timerType: "past",
          highlight: false,
        });
      });
    }

    return [
      { title: "即将到来", items: upcoming },
      { title: "未来时刻", items: countdowning },
      { title: "已过纪念", items: elapsed },
    ].filter(section => section.items.length);
  }

  _renderHolidayInfo(text) {
    if (Array.isArray(text)) {
      return html`
        <div class="holiday-info-list">
          ${text.map(detail => this._renderHolidayInfoDetail(detail))}
        </div>
      `;
    }

    if (text && typeof text === "object" && !Array.isArray(text)) {
      return this._renderHolidayInfoDetail(text);
    }

    const rows = this._parseHolidayInfo(text);
    if (!rows.length) {
      return html`<div class="holiday-info-plain">${text}</div>`;
    }

    return html`
      <div class="holiday-info-list">
        ${rows.map(row => html`
          <div class="holiday-info-row ${row.full ? "full" : ""}">
            ${row.full ? "" : html`<div class="holiday-info-label">${row.label}</div>`}
            <div class="holiday-info-value">${row.value}</div>
          </div>
        `)}
      </div>
    `;
  }

  _renderHolidayInfoDetail(detail) {
    const beforeRow = (detail.rows || []).find(row => row.label === "向前拼");
    const afterRow = (detail.rows || []).find(row => row.label === "向后拼");
    const holidayDays = this._buildDateRange(detail.start, detail.end).map(day => ({
      ...day,
      type: "holiday",
      tag: "休息",
    }));
    const beforeDays = beforeRow ? this._buildPlanCalendarDays(beforeRow) : [];
    const afterDays = afterRow ? this._buildPlanCalendarDays(afterRow) : [];
    const allDays = [...beforeDays, ...holidayDays, ...afterDays];
    const calendar = this._buildHolidayCalendar(allDays);

    return html`
      <div class="holiday-info-list">
        ${detail.title ? html`
          <div class="holiday-info-row full">
            <div class="holiday-info-value">${detail.title}</div>
          </div>
        ` : ""}
        ${(detail.rows || []).length ? html`
          <div class="holiday-plan-list">
            <div class="holiday-plan-top">
              <div class="holiday-plan-label">拼假日历</div>
              <div class="holiday-plan-total">${beforeRow ? `前拼连休 ${beforeRow.total_days} 天` : ""}${beforeRow && afterRow ? " / " : ""}${afterRow ? `后拼连休 ${afterRow.total_days} 天` : ""}</div>
            </div>
            <div class="holiday-plan-calendar">
              <div class="holiday-plan-weekdays">
                ${["一", "二", "三", "四", "五", "六", "日"].map(day => html`<div class="holiday-plan-weekday">周${day}</div>`)}
              </div>
              <div>
                <div class="holiday-plan-days">
                  ${calendar.cells.map(day => html`
                    <div class="holiday-plan-day ${day.type || "empty"}">
                      ${day.label ? html`
                        <div class="holiday-plan-day-date">${day.label}</div>
                        <div class="holiday-plan-day-tag">${day.tag || ""}</div>
                      ` : ""}
                    </div>
                  `)}
                </div>
              </div>
            </div>
            <div class="holiday-plan-summary">
              ${beforeRow ? html`<strong>向前拼</strong>：请假 ${beforeRow.days} 天，可从 ${beforeRow.range} 接上 ${detail.name}，连休 ${beforeRow.total_days} 天。` : ""}
              ${beforeRow && afterRow ? html`<br />` : ""}
              ${afterRow ? html`<strong>向后拼</strong>：请假 ${afterRow.days} 天，可从 ${detail.range} 后接 ${afterRow.range}，连休 ${afterRow.total_days} 天。` : ""}
            </div>
          </div>
        ` : ""}
      </div>
    `;
  }

  _getHolidayInfoTitle(attrs) {
    if (Array.isArray(attrs.holiday_info_details) && attrs.holiday_info_details.length > 1) {
      return "最近两个假期安排";
    }
    const holidayName = attrs.holiday_info_detail?.name || attrs.holiday_info_details?.[0]?.name || attrs.nearest_holiday;
    return holidayName ? `${holidayName}假期安排` : "假期安排";
  }

  _parseHolidayInfo(text) {
    if (!text || typeof text !== "string") return [];

    return text
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        if (!line.includes("：") && !line.includes(":")) {
          return { full: true, value: line };
        }
        const match = line.match(/^(.+?)([:：]\s*|\s+)(.+)$/);
        if (match) {
          return {
            label: match[1].trim(),
            value: match[3].trim(),
          };
        }
        return { label: "说明", value: line };
      });
  }

  _buildDateRange(start, end) {
    if (!start || !end) return [];
    const result = [];
    const current = new Date(`${start}T00:00:00`);
    const last = new Date(`${end}T00:00:00`);

    while (current <= last) {
      result.push({
        // Keep keys in local time so they stay aligned with the rendered label.
        key: this._dateKey(current),
        label: `${current.getMonth() + 1}/${current.getDate()}`,
      });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  _buildPlanCalendarDays(row) {
    if (Array.isArray(row?.calendar_days) && row.calendar_days.length) {
      return row.calendar_days.map(day => ({
        ...day,
        key: day.key || this._fmtDate(day.date),
      }));
    }
    if (!row?.start || !row?.end) {
      return [];
    }
    return this._buildDateRange(row.start, row.end).map(day => ({
      ...day,
      type: "leave",
      tag: "请假",
    }));
  }

  _buildHolidayCalendar(days) {
    if (!days.length) {
      return { cells: [] };
    }

    const cells = [];
    const first = new Date(`${days[0].key}T00:00:00`);
    const last = new Date(`${days[days.length - 1].key}T00:00:00`);
    const start = new Date(first);
    const end = new Date(last);

    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    end.setDate(end.getDate() + (6 - ((end.getDay() + 6) % 7)));

    const dayMap = new Map(days.map(day => [day.key, day]));
    const current = new Date(start);

    while (current <= end) {
      const key = this._dateKey(current);
      const existing = dayMap.get(key);
      if (existing) {
        cells.push(existing);
      } else {
        cells.push({
          key,
          label: `${current.getMonth() + 1}/${current.getDate()}`,
          tag: "上班",
          type: "work",
        });
      }
      current.setDate(current.getDate() + 1);
    }

    return { cells };
  }

  _dateKey(date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  _stateIcon(state) {
    return STATE_ICON[state] || "mdi:calendar-today";
  }

  _stateColor(state) {
    return STATE_COLOR[state] || "var(--primary-color)";
  }

  _fmtDate(str) {
    if (!str) return "";
    // YYYYMMDD → YYYY-MM-DD
    if (/^\d{8}$/.test(str)) {
      return str.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");
    }
    return str;
  }

  _renderDecoratedName(name) {
    if (!name) return "";
    const text = String(name);
    const match = text.match(/^(.*?)(\([^()]+\)|\s+\d+(?:周岁|周年))$/);
    if (!match) return text;
    return html`${match[1]}<span class="item-name-accent">${match[2]}</span>`;
  }

  _tomorrowStateClass(state) {
    if (state === "休息日") return "rest";
    if (state === "节假日") return "holiday";
    return "";
  }

  _parseDateTime(value) {
    if (!value || typeof value !== "string") return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T00:00:00`);
    }
    const normalized = value.replace(" ", "T");
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  _describeRelativeTime(value, direction) {
    const target = this._parseDateTime(value);
    if (!target) return "";

    const diffSeconds = Math.floor((target.getTime() - this._nowMs) / 1000);
    if (direction === "future") {
      return this._formatDuration(Math.max(diffSeconds, 0));
    }
    return this._formatDuration(Math.max(-diffSeconds, 0));
  }

  _formatDuration(totalSeconds) {
    return this._formatDurationParts(totalSeconds).full;
  }

  _formatDurationParts(totalSeconds) {
    const years = Math.floor(totalSeconds / (86400 * 365));
    let remainder = totalSeconds % (86400 * 365);
    const days = Math.floor(remainder / 86400);
    remainder %= 86400;
    const hours = Math.floor(remainder / 3600);
    remainder %= 3600;
    const minutes = Math.floor(remainder / 60);
    const seconds = remainder % 60;

    const majorParts = [
      [years, "年"],
      [days, "天"],
    ];
    const firstNonZeroIndex = majorParts.findIndex(([value]) => value > 0);
    const visibleMajorParts = (firstNonZeroIndex === -1 ? [] : majorParts.slice(firstNonZeroIndex))
      .map(([value, unit]) => `${value}${unit}`);
    const detailParts = [
      [hours, "时"],
      [minutes, "分"],
      [seconds, "秒"],
    ];
    const firstDetailIndex = detailParts.findIndex(([value]) => value > 0);
    const visibleDetailParts = (firstDetailIndex === -1 ? detailParts.slice(-1) : detailParts.slice(firstDetailIndex))
      .map(([value, unit]) => `${value}${unit}`);

    return {
      main: visibleMajorParts.join("") || "0天",
      detail: visibleDetailParts.join(""),
      full: `${years}年${days}天${hours}小时${minutes}分钟${seconds}秒`,
    };
  }

  _renderItemDays(item) {
    const days = item?.days;
    const unit = item?.unit || "";
    if (typeof days !== "string") {
      return `${days}${unit || ""}`;
    }

    const durationMatch = days.match(/^(?:(\d+)年)?(?:(\d+)天)?(?:(\d+)小时)?(?:(\d+)分钟)?(?:(\d+)秒)?$/);
    if (!durationMatch) {
      return `${days}${unit || ""}`;
    }

    const totalSeconds =
      (Number(durationMatch[1] || 0) * 365 * 86400) +
      (Number(durationMatch[2] || 0) * 86400) +
      (Number(durationMatch[3] || 0) * 3600) +
      (Number(durationMatch[4] || 0) * 60) +
      Number(durationMatch[5] || 0);
    const parts = this._formatDurationParts(totalSeconds);
    const prevSeconds = this._getItemDetailSeconds(item, this._prevNowMs);
    const currSeconds = this._getItemDetailSeconds(item, this._nowMs);
    const detailMatch = parts.detail.match(/^(.*?)(\d+秒)$/);
    const detailMain = detailMatch ? detailMatch[1] : "";
    const detailSeconds = detailMatch ? detailMatch[2] : parts.detail;

    return html`
      <span class="item-days-main">${parts.main}${unit || ""}</span>
      <span class="item-days-detail">
        ${detailMain ? html`<span class="item-days-detail-main">${detailMain}</span>` : ""}
        <span class="item-days-detail-seconds">
          ${this._renderItemSecondSlots(prevSeconds, currSeconds || detailSeconds.replace("秒", ""))}
          <span>秒</span>
        </span>
      </span>
    `;
  }

  _getItemDetailSeconds(item, nowMs) {
    if (!item?.date || !item?.timerType || !nowMs) return null;
    const target = this._parseDateTime(item.date);
    if (!target) return null;
    const diffSeconds = Math.floor((target.getTime() - nowMs) / 1000);
    const seconds = item.timerType === "future"
      ? Math.max(diffSeconds, 0)
      : Math.max(-diffSeconds, 0);
    return String(seconds % 60).padStart(2, "0");
  }

  _moreInfo() {
    const e = new Event("hass-more-info", { bubbles: true, composed: true });
    e.detail = { entityId: this.config.entity };
    this.dispatchEvent(e);
  }


  _showRefresh() {
    return this.config?.show_refresh !== false;
  }

  _showMemorials() {
    return this.config?.show_memorials !== false;
  }

  _anniversaryStorageKey() {
    return `chineseholiday_card:${this.config?.entity || "default"}`;
  }

  async _fetchHolidays(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this._hass || this._fetching) return;
    this._fetching = true;
    this._fetchMessage = "";
    try {
      await this._hass.callService("chineseholiday", "get", { force: true }, {}, false, true);
      this._fetchMessage = "已拉取";
    } catch (err) {
      console.error("chineseholiday.get failed", err);
      this._fetchMessage = "拉取失败";
    } finally {
      this._fetching = false;
    }
  }

  async _loadUserAnniversaries() {
    if (!this._hass) return;
    const storageKey = "chineseholiday_card_anniversaries";
    try {
      const res = await this._hass.callWS({
        type: "frontend/get_user_data",
        key: storageKey,
      });
      const value = res?.value && typeof res.value === "object" ? res.value : { itemsByEntity: {} };
      this._userData = value.itemsByEntity ? value : { itemsByEntity: {} };
    } catch (err) {
      let fallback = { itemsByEntity: {} };
      try {
        const parsed = JSON.parse(localStorage.getItem(storageKey) || "");
        if (parsed && typeof parsed === "object") fallback = parsed.itemsByEntity ? parsed : { itemsByEntity: {} };
      } catch (parseErr) {
        fallback = { itemsByEntity: {} };
      }
      this._userData = fallback;
    }
    const items = this._userData.itemsByEntity?.[this.config?.entity];
    this._userAnniversaries = Array.isArray(items) ? items : [];
    this.requestUpdate();
  }

  async _saveUserAnniversaries(items) {
    const entity = this.config?.entity;
    if (!entity || !this._hass) return;
    this._userAnniversaries = items;
    this._userData = this._userData && typeof this._userData === "object" ? this._userData : { itemsByEntity: {} };
    this._userData.itemsByEntity = this._userData.itemsByEntity || {};
    this._userData.itemsByEntity[entity] = items;
    const storageKey = "chineseholiday_card_anniversaries";
    try {
      await this._hass.callWS({
        type: "frontend/set_user_data",
        key: storageKey,
        value: this._userData,
      });
      this._memorialMessage = "已保存在当前用户的前端数据中，没有写入后端节假日。";
    } catch (err) {
      localStorage.setItem(storageKey, JSON.stringify(this._userData));
      this._memorialMessage = "当前无法写入 HA 用户数据，已暂存在本浏览器。没有写入后端节假日。";
    }
    this.requestUpdate();
  }

  _addMemorial() {
    const name = String(this._draftName || "").trim();
    const date = String(this._draftDate || "").trim();
    const mode = this._draftMode || "yearly_count";
    if (!name || !date) {
      this._memorialMessage = "请填写名称和日期。";
      this.requestUpdate();
      return;
    }
    const time = this._draftTime || "09:00";
    const storedDate = mode === "timer"
      ? `${date} ${time.length === 5 ? `${time}:00` : time}`
      : date;
    if (!this._parseMemorialInput(storedDate)) {
      this._memorialMessage = "日期格式无效。";
      this.requestUpdate();
      return;
    }
    const items = Array.isArray(this._userAnniversaries) ? [...this._userAnniversaries] : [];
    items.push({ id: `${Date.now()}`, name, date: storedDate, mode });
    this._draftName = "";
    this._draftDate = "";
    this._saveUserAnniversaries(items);
  }

  _deleteMemorial(item) {
    const items = (this._userAnniversaries || []).filter(row => {
      if (item.id && row.id) return row.id !== item.id;
      return !(row.name === item.name && row.date === item.date && (row.mode || "yearly_count") === item.mode);
    });
    this._saveUserAnniversaries(items);
  }

  _normalizeMemorials(list, source) {
    if (!Array.isArray(list)) return [];
    return list.map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const name = String(item.name || "").trim();
      const date = String(item.date || "").trim();
      if (!name || !date) return null;
      const mode = ["yearly", "yearly_count", "timer"].includes(item.mode)
        ? item.mode
        : (item.timer ? "timer" : "yearly_count");
      return {
        id: item.id || `${source}-${index}-${name}-${date}`,
        name,
        date,
        mode,
        source,
      };
    }).filter(Boolean);
  }

  _localMemorials() {
    const seen = new Set();
    const merged = [];
    for (const item of [
      ...this._normalizeMemorials(this.config?.anniversaries, "config"),
      ...this._normalizeMemorials(this._userAnniversaries, "card"),
    ]) {
      const key = `${item.mode}|${item.name}|${item.date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const decorated = this._decorateMemorial(item);
      if (decorated) merged.push(decorated);
    }
    merged.sort((a, b) => {
      const aPast = a.sortDays < 0;
      const bPast = b.sortDays < 0;
      if (aPast !== bPast) return aPast ? 1 : -1;
      return aPast ? b.sortDays - a.sortDays : a.sortDays - b.sortDays;
    });
    return merged;
  }

  _parseMemorialInput(value) {
    const text = String(value || "").trim();
    const full = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (full) return this._memorialParts(full[1], full[2], full[3], full[4], full[5], full[6]);
    const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (compact) return this._memorialParts(compact[1], compact[2], compact[3]);
    const monthDay = text.match(/^(\d{1,2})-(\d{1,2})$/) || text.match(/^(\d{2})(\d{2})$/);
    if (monthDay) return this._memorialParts(null, monthDay[1], monthDay[2]);
    return null;
  }

  _memorialParts(year, month, day, hour, minute, second) {
    const parts = {
      year: year === null || year === undefined || year === "" ? null : Number(year),
      month: Number(month),
      day: Number(day),
      hour: hour === undefined || hour === null || hour === "" ? null : Number(hour),
      minute: minute === undefined || minute === null || minute === "" ? null : Number(minute),
      second: second === undefined || second === null || second === "" ? 0 : Number(second),
    };
    if (!Number.isInteger(parts.month) || parts.month < 1 || parts.month > 12) return null;
    if (!Number.isInteger(parts.day) || parts.day < 1 || parts.day > 31) return null;
    if (parts.year !== null && (!Number.isInteger(parts.year) || parts.year < 1900 || parts.year > 2100)) return null;
    if (parts.hour !== null && (parts.hour < 0 || parts.hour > 23 || parts.minute < 0 || parts.minute > 59 || parts.second < 0 || parts.second > 59)) return null;
    parts.hasTime = parts.hour !== null;
    return parts;
  }

  _safeDate(year, month, day, hour = 0, minute = 0, second = 0) {
    const date = new Date(year, month - 1, day, hour, minute, second, 0);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return new Date(year, month, 0, hour, minute, second, 0);
    }
    return date;
  }

  _dateOnly(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  _isoDate(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }

  _isoDateTime(date) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${this._isoDate(date)} ${hours}:${minutes}:${seconds}`;
  }

  _nextAnnualDate(month, day, now) {
    const today = this._dateOnly(now);
    let candidate = this._safeDate(today.getFullYear(), month, day);
    if (candidate < today) candidate = this._safeDate(today.getFullYear() + 1, month, day);
    return candidate;
  }

  _dayDistance(target, now) {
    return Math.round((this._dateOnly(target).getTime() - this._dateOnly(now).getTime()) / 86400000);
  }

  _decorateMemorial(item) {
    const parts = this._parseMemorialInput(item.date);
    if (!parts) return null;
    const now = new Date(this._nowMs || Date.now());
    if (item.mode === "timer") {
      const target = this._safeDate(
        parts.year || now.getFullYear(),
        parts.month,
        parts.day,
        parts.hour || 0,
        parts.minute || 0,
        parts.second || 0,
      );
      const future = target.getTime() >= now.getTime();
      const stamp = this._isoDateTime(target);
      return {
        ...item,
        kind: "timer",
        label: item.name,
        sub: `${this._fmtDate(stamp)} · ${item.source === "config" ? "卡片配置" : "仅前端"}`,
        date: stamp,
        daysText: this._describeRelativeTime(stamp, future ? "future" : "past"),
        timerType: future ? "future" : "past",
        isToday: this._dateOnly(target).getTime() === this._dateOnly(now).getTime(),
        sortDays: this._dayDistance(target, now),
      };
    }

    const next = this._nextAnnualDate(parts.month, parts.day, now);
    const days = this._dayDistance(next, now);
    let label = item.name;
    if (parts.year !== null && item.mode === "yearly_count") {
      let age = next.getFullYear() - parts.year;
      const anniversaryThisYear = this._safeDate(next.getFullYear(), parts.month, parts.day);
      if (next < anniversaryThisYear) age -= 1;
      if (age >= 0) label = item.name.includes("生日") ? `${item.name}(${age}岁)` : `${item.name}(${age}周年)`;
    }
    return {
      ...item,
      kind: "yearly",
      label,
      sub: `${this._isoDate(next)} · ${item.source === "config" ? "卡片配置" : "仅前端"}`,
      date: this._isoDate(next),
      days,
      daysText: days === 0 ? "今天" : `${days} 天`,
      isToday: days === 0,
      sortDays: days,
    };
  }

  _renderMemorialSection(items) {
    if (!this._showMemorials()) return "";
    return html`
      <div class="memorial-panel">
        <div class="memorial-head">
          <span class="section-dot"></span>
          <div class="section-title">我的纪念日</div>
          <button class="text-btn" type="button" @click=${() => { this._memorialOpen = !this._memorialOpen; }}>
            ${this._memorialOpen ? "收起" : "添加"}
          </button>
        </div>
        <div class="memorial-note">只保存在这张卡片的前端，不会写入后端节假日，也不会触发集成里的通知规则。农历纪念日仍在集成配置中维护。</div>
        ${this._memorialMessage ? html`<div class="memorial-message">${this._memorialMessage}</div>` : ""}
        ${this._memorialOpen ? html`
          <div class="memorial-form">
            <input class="memorial-input" placeholder="名称，例如妈妈生日" .value=${this._draftName || ""} @input=${(e) => { this._draftName = e.target.value; }} />
            <input class="memorial-input" type="date" .value=${this._draftDate || ""} @input=${(e) => { this._draftDate = e.target.value; }} />
            <select class="memorial-select" .value=${this._draftMode || "yearly_count"} @change=${(e) => { this._draftMode = e.target.value; }}>
              <option value="yearly_count">每年，计算周岁/周年</option>
              <option value="yearly">每年重复，不计算周年</option>
              <option value="timer">精确计时</option>
            </select>
            ${this._draftMode === "timer" ? html`
              <input class="memorial-input" type="time" .value=${this._draftTime || "09:00"} @input=${(e) => { this._draftTime = e.target.value; }} />
            ` : ""}
            <button class="memorial-save" type="button" @click=${this._addMemorial}>保存</button>
          </div>
        ` : ""}
        ${items.length ? html`
          <div class="memorial-list">
            ${items.map(item => html`
              <div class="memorial-row">
                <div>
                  <div class="memorial-name">
                    ${this._renderDecoratedName(item.label)}
                    <span class="memorial-badge">${item.source === "config" ? "配置" : "前端"}</span>
                  </div>
                  <div class="memorial-sub">${item.sub}</div>
                </div>
                <div class="memorial-days">${item.kind === "timer" ? this._renderItemDays({ days: item.daysText, date: item.date, timerType: item.timerType }) : item.daysText}</div>
                ${item.source === "card" ? html`
                  <button class="memorial-delete" type="button" title="删除这个前端纪念日" @click=${() => this._deleteMemorial(item)}>×</button>
                ` : html`<span></span>`}
              </div>
            `)}
          </div>
        ` : html`<div class="memorial-note">还没有卡片纪念日。公历日期可以在这里添加，不需要改后端节假日。</div>`}
      </div>
    `;
  }

  getCardSize() {
    return 4;
  }

  getGridOptions() {
    return {
      columns: 12,
      rows: 4,
      min_columns: 6,
      min_rows: 3,
    };
  }

  static getConfigElement() {
    return document.createElement("ch-calendar-card-editor");
  }

  static getStubConfig() {
    return {
      entity: "sensor.chinese_holiday",
      show_refresh: true,
      show_memorials: true,
      anniversaries: [],
    };
  }
}

customElements.define("ch_calendar-card", ChineseCalendarCard);

class ChineseCalendarCardEditor extends LitElement {
  static get properties() {
    return {
      hass: {},
      _config: { type: Object },
    };
  }

  setConfig(config) {
    this._config = {
      show_refresh: config.show_refresh !== false,
      show_memorials: config.show_memorials !== false,
      anniversaries: [],
      ...config,
    };
  }

  _commit(config) {
    this._config = config;
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config },
      bubbles: true,
      composed: true,
    }));
  }

  _updateAnniversary(index, patch) {
    const anniversaries = [...(this._config.anniversaries || [])];
    anniversaries[index] = { ...anniversaries[index], ...patch };
    this._commit({ ...this._config, anniversaries });
  }

  render() {
    const config = this._config || {};
    const anniversaries = Array.isArray(config.anniversaries) ? config.anniversaries : [];
    const entities = Object.keys(this.hass?.states || {}).filter(id => id.startsWith("sensor."));
    return html`
      <div class="editor">
        <label>
          <span>实体</span>
          <input list="ch-calendar-entities" .value=${config.entity || ""} @change=${(e) => this._commit({ ...config, entity: e.target.value.trim() })} />
          <datalist id="ch-calendar-entities">
            ${entities.map(id => html`<option value=${id}></option>`)}
          </datalist>
        </label>
        <label class="check">
          <input type="checkbox" .checked=${config.show_refresh !== false} @change=${(e) => this._commit({ ...config, show_refresh: e.target.checked })} />
          <span>显示“拉取节假日”按钮</span>
        </label>
        <label class="check">
          <input type="checkbox" .checked=${config.show_memorials !== false} @change=${(e) => this._commit({ ...config, show_memorials: e.target.checked })} />
          <span>显示纪念日添加区</span>
        </label>
        <p>下面这些纪念日保存在卡片配置里，只给这张卡片展示。它们不会写入后端节假日，也不会出现在集成的节假日缓存中。卡片上临时添加的纪念日另外保存在前端用户数据里。</p>
        ${anniversaries.map((item, index) => html`
          <div class="row">
            <input placeholder="名称" .value=${item.name || ""} @change=${(e) => this._updateAnniversary(index, { name: e.target.value.trim() })} />
            <input placeholder="03-21、2020-02-20 或 2024-05-01 09:30:00" .value=${item.date || ""} @change=${(e) => this._updateAnniversary(index, { date: e.target.value.trim() })} />
            <select .value=${item.mode || "yearly_count"} @change=${(e) => this._updateAnniversary(index, { mode: e.target.value })}>
              <option value="yearly_count">每年并计算周年</option>
              <option value="yearly">每年重复</option>
              <option value="timer">精确计时</option>
            </select>
            <button type="button" @click=${() => this._commit({ ...config, anniversaries: anniversaries.filter((_, i) => i !== index) })}>删除</button>
          </div>
        `)}
        <button type="button" @click=${() => this._commit({ ...config, anniversaries: [...anniversaries, { name: "", date: "", mode: "yearly_count" }] })}>添加一条卡片纪念日</button>
      </div>
    `;
  }

  static get styles() {
    return css`
      .editor {
        display: grid;
        gap: 12px;
        padding: 8px 0 16px;
      }

      label {
        display: grid;
        gap: 6px;
        font-size: 13px;
        color: var(--primary-text-color);
      }

      .check {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      input, select, button {
        min-height: 36px;
        box-sizing: border-box;
        border-radius: 10px;
        border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.16));
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color);
        font: inherit;
        font-size: 13px;
      }

      input, select {
        width: 100%;
        padding: 6px 10px;
      }

      button {
        padding: 6px 12px;
        cursor: pointer;
      }

      .row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) minmax(120px, 0.8fr) auto;
        gap: 8px;
      }

      p {
        margin: 0;
        font-size: 12px;
        line-height: 1.55;
        color: var(--secondary-text-color);
      }

      @media (max-width: 700px) {
        .row {
          grid-template-columns: 1fr;
        }
      }
    `;
  }
}

customElements.define("ch-calendar-card-editor", ChineseCalendarCardEditor);


window.customCards = window.customCards || [];
window.customCards.push({
  type: "ch_calendar-card",
  name: "中国节假日日历",
  description: "显示中国法定节假日、农历、节气、纪念日倒计时，并可在卡片中添加前端纪念日",
  documentationURL: "https://github.com/studentLcc/chineseholiday_card",
  preview: true,
});
