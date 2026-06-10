// src/lib/email/templates/visit-confirm.tsx
//
// 漏洞 B：24h 二次确认邮件。用户点 "我去了" 后 24 小时发送。
// 点 "Yes, I really went" → metadata.email_confirmed = true →
// attribution row 升级为 valid_visit，进入返点计算。
// 点 "Didn't go" → metadata.email_confirmed = false → 排除返点。
// 不点 → 7 天后从 v_pending_confirmations 视为 past_due，
// founder 在 admin 后台清理（这一步是 founder 手动核对）。

import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface VisitConfirmEmailProps {
  venueName: string;
  venueCity?: string;
  /** Token embedded in the confirm/deny URLs — the endpoint
   *  validates this and updates meetup_attributions.metadata. */
  confirmUrl: string;
  denyUrl: string;
  recipientName?: string;
}

export const VisitConfirmEmail = ({
  venueName,
  venueCity,
  confirmUrl,
  denyUrl,
  recipientName,
}: VisitConfirmEmailProps) => (
  <Html lang="zh">
    <Head />
    <Preview>{`昨天在 ${venueName} 怎么样？`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>昨天去 {venueName} 了吗？</Heading>
        <Text style={text}>
          {recipientName ? `${recipientName}，` : ""}昨天你在 linQ 上标记了「我去了 {venueName}{venueCity ? `（${venueCity}）` : ""}」。
        </Text>
        <Text style={text}>
          方便确认一下吗？这次见面会帮助我们给你推荐更准的匹配 ——
          而且餐厅侧的返点对账依赖这个信号。
        </Text>

        <Section style={ctaRow}>
          <Button href={confirmUrl} style={primaryBtn}>
            ✅ 是的，我去了
          </Button>
          <span style={{ width: 12, display: "inline-block" }} />
          <Button href={denyUrl} style={secondaryBtn}>
            ❌ 这次没去
          </Button>
        </Section>

        <Text style={subtle}>
          链接 7 天内有效。如果你没看到这个邮件，是说明你最近 24h 内
          没有 "我去了" 的标记 ——
          <Link href="https://claudematch.com/match">回到 linQ</Link> 查看你的见面记录。
        </Text>
      </Container>
    </Body>
  </Html>
);

// ── styles ──
const main = { backgroundColor: "#0a0a0a", color: "#fafafa", fontFamily: "system-ui, -apple-system, sans-serif" };
const container = { padding: "32px 24px", maxWidth: 560 };
const h1 = { fontSize: 22, fontWeight: 600, marginBottom: 16 };
const text = { fontSize: 15, lineHeight: 1.7, marginBottom: 14 };
const ctaRow = { marginTop: 24, marginBottom: 24 };
const primaryBtn = {
  backgroundColor: "#facc15",
  color: "#0a0a0a",
  padding: "12px 22px",
  borderRadius: 4,
  fontWeight: 600,
  textDecoration: "none",
  display: "inline-block",
};
const secondaryBtn = {
  backgroundColor: "transparent",
  color: "#a1a1aa",
  padding: "12px 22px",
  borderRadius: 4,
  border: "1px solid #3f3f46",
  fontWeight: 500,
  textDecoration: "none",
  display: "inline-block",
};
const subtle = { fontSize: 12, color: "#71717a", marginTop: 28, lineHeight: 1.6 };