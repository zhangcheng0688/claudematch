import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  siteName?: string
  confirmationUrl?: string
  token?: string
}

export const MagicLinkEmail = ({ token = '------' }: MagicLinkEmailProps) => (
  <Html lang="zh" dir="ltr">
    <Head />
    <Preview>您的 linQ 登录验证码</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>您的登录验证码</Heading>
        <Text style={text}>
          您好，欢迎使用 linQ AI 智能匹配平台！
        </Text>
        <Text style={text}>本次登录验证码：</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={text}>
          验证码 5 分钟内有效，请勿向他人泄露。若非本人操作，请忽略本邮件。
        </Text>
        <Text style={footer}>
          linQ 官网 ·{' '}
          <Link href="https://claudematch.com" style={link}>
            claudematch.com
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '32px',
  letterSpacing: '8px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 25px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
