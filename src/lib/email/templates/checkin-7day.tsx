// src/lib/email/templates/checkin-7day.tsx
//
// 漏洞 G：用户注册满 7 天发送的回访邮件。3 个问题：
//   1. 总体感受怎么样？
//   2. linQ 给你的匹配感觉如何？
//   3. 你会继续用吗？
// 走 NPS（净推荐值）+ 体验反馈双指标。回复邮件正文即可，
// 任何文字都会被 Supabase email_inbound 收到（如果有配）。

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

interface CheckinEmailProps {
  recipientName?: string;
  /** Pre-filled survey link. Uses a Resend-compatible survey
   *  form (Tally / Formbricks / etc.) — we set this in env. */
  surveyUrl: string;
  /** NPS micro-question: 0-10 quick click buttons. Returns a fully
   *  signed URL for the given score. The signer lives in the email
   *  server module (render-checkin-7day.ts) so the template
   *  doesn't need the HMAC secret. */
  npsButton: (score: number) => string;
  /** Unsubscribe link — also signed. */
  unsubscribeUrl: string;
}

export const Checkin7DayEmail = ({
  recipientName,
  surveyUrl,
  npsButton,
  unsubscribeUrl,
}: CheckinEmailProps) => (
  <Html lang="zh">
    <Head />
    <Preview>用 linQ 一周了，想听你的想法</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>用 linQ 一周了 👋</Heading>
        <Text style={text}>
          {recipientName ? `${recipientName}，` : ""}你加入 linQ 已经 7 天了。
          想问你几个问题 —— 不会超过 1 分钟。
        </Text>

        <Heading style={h2}>1. 你有多大概率会向朋友推荐 linQ？</Heading>
        <Text style={muted}>（0=绝对不会，10=强烈推荐）</Text>
        <Section style={npsRow}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <Button key={n} href={npsButton(n)} style={npsBtn}>
              {n}
            </Button>
          ))}
        </Section>

        <Heading style={h2}>2. 那次 AI 见面方案你用了吗？</Heading>
        <Text style={text}>
          如果去了 ——
          对方感觉如何？
          如果没去 ——
          缺什么？
        </Text>

        <Section style={ctaRow}>
          <Button href={surveyUrl} style={primaryBtn}>
            回答 3 个问题（1 分钟）→
          </Button>
        </Section>

        <Text style={muted}>
          你的回答会直接影响我们做什么、不做什么。1 分钟顶 100 个 PR。
        </Text>

        <Text style={subtle}>
          <Link href={unsubscribeUrl}>不想再收到这类邮件</Link>
        </Text>
      </Container>
    </Body>
  </Html>
);

// ── styles ──
const main = { backgroundColor: "#0a0a0a", color: "#fafafa", fontFamily: "system-ui, -apple-system, sans-serif" };
const container = { padding: "32px 24px", maxWidth: 560 };
const h1 = { fontSize: 22, fontWeight: 600, marginBottom: 16 };
const h2 = { fontSize: 16, fontWeight: 600, marginTop: 24, marginBottom: 8 };
const text = { fontSize: 15, lineHeight: 1.7, marginBottom: 14 };
const muted = { fontSize: 12, color: "#a1a1aa", marginBottom: 10 };
const npsRow = { marginTop: 8, marginBottom: 24 };
const npsBtn = {
  backgroundColor: "#27272a",
  color: "#fafafa",
  padding: "10px 14px",
  margin: "0 2px",
  borderRadius: 4,
  fontWeight: 500,
  textDecoration: "none",
  display: "inline-block",
  minWidth: 36,
  textAlign: "center" as const,
};
const ctaRow = { marginTop: 20, marginBottom: 24 };
const primaryBtn = {
  backgroundColor: "#facc15",
  color: "#0a0a0a",
  padding: "12px 22px",
  borderRadius: 4,
  fontWeight: 600,
  textDecoration: "none",
  display: "inline-block",
};
const subtle = { fontSize: 12, color: "#71717a", marginTop: 28, lineHeight: 1.6 };