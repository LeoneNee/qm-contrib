export type Locale = "zh" | "en";

export function parseLocale(cookieHeader: string | undefined): Locale {
  if (!cookieHeader) return "zh";
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== "portal_lang") continue;
    const value = part.slice(eq + 1).trim();
    if (value === "zh" || value === "en") return value;
  }
  return "zh";
}

const ZH: Record<string, string> = {
  "Sign-in failed": "登录失败",
  "We couldn't sign you in": "无法为你完成登录",
  "Your sign-in didn't complete. This is usually temporary — trying again resolves most cases.":
    "登录未能完成。这通常是暂时的问题，重试一般即可解决。",
  Details: "详情",
  "Try signing in again": "重新尝试登录",
  "Back to start": "返回首页",
  "Still stuck? Make sure you're a member of the approved workspace, then contact your admin.":
    "还是不行？请确认你是已获批工作区的成员，然后联系管理员。",
  "No admin access": "无管理员权限",
  "You don't have admin access": "你没有管理员权限",
  "The Admin area is limited to governance admins. Your account is signed in and verified — it just isn't granted admin rights.":
    "Admin 区域仅限治理管理员使用。你的账号已登录并通过验证，只是没有被授予管理员权限。",
  "Signed in as": "当前登录",
  "Admin rights come from your organization's admin grants. If you need access, ask an existing admin to grant it.":
    "管理员权限来自你所在组织的授权。如需访问，请让现有管理员为你授权。",
  "Back to your surfaces": "返回你的应用",
  "Try again": "重试",
  "Open the assistant instead": "改用助手",
  "You can keep using every surface available to your account.": "你可以继续使用账号可用的所有应用。",
  "Not set up yet": "尚未完成设置",
  "This deployment isn't set up yet": "此部署尚未完成设置",
  "An admin still needs to finish setup by adding a model API key. Until then the assistant can't answer.":
    "管理员还需要添加模型 API 密钥来完成设置。在此之前助手无法回答。",
  "Ask your admin to complete onboarding in the Admin area.": "请让管理员在 Admin 区域完成初始化设置。",
  "Admin temporarily unavailable": "Admin 暂时不可用",
  "Admin is temporarily unavailable": "Admin 暂时不可用",
  "We couldn't check your admin access right now. This is usually temporary — trying again resolves most cases.":
    "暂时无法校验你的管理员权限。这通常是暂时的问题，重试一般即可解决。",
  "If this keeps happening, the admin service may be down — contact your admin.":
    "如果持续出现，管理服务可能已宕机，请联系管理员。",
  "Can't connect": "无法连接",
  "this app": "此应用",
  "You've already connected {prov}": "你已连接 {prov}",
  "This link was meant for a different teammate, and your {prov} is already connected — there's nothing to do here.":
    "此链接是为其他同事生成的，而你的 {prov} 已连接，无需任何操作。",
  "Manage your connections": "管理你的连接",
  "This link was for someone else": "此链接属于其他人",
  "This connect link was created for a different teammate. Want to connect your own {prov} instead?":
    "此连接链接是为其他同事创建的。要改为连接你自己的 {prov} 吗？",
  "Connect my {prov}": "连接我的 {prov}",
  "We couldn't reach the connection service. Please try the link again in a moment.":
    "无法访问连接服务。请稍后重试该链接。",
  "The connection service returned an unexpected response.": "连接服务返回了意外的响应。",
  "This connect link has expired — ask the agent for a fresh one.": "此连接链接已过期，请向 agent 索要新链接。",
  "This connect link is invalid or was already used — ask the agent for a fresh one.":
    "此连接链接无效或已被使用，请向 agent 索要新链接。",
  "We couldn't start the connection. This app may not be configured.": "无法发起连接。该应用可能尚未配置。",
  "We couldn't reach the connection service. Please try again in a moment.": "无法访问连接服务，请稍后重试。",
  "Playground is busy": "体验区繁忙",
  "The playground is busy": "体验区当前繁忙",
  "We couldn't start a fresh playground session for you right now. Waiting a little while and reloading resolves most cases.":
    "暂时无法为你开启新的体验会话。稍等片刻后刷新一般即可解决。",
  "Playground sessions are limited per visitor to keep the demo responsive for everyone.":
    "为保证演示流畅，每位访客的体验会话数量有限。",
  "Not available in the playground": "体验区不支持此功能",
  "Connecting accounts and dropping secrets are disabled for anonymous playground sessions — clearing your cookie would orphan real credentials.":
    "匿名体验会话已禁用账号连接与密钥提交——清除 Cookie 会让真实凭据无人认领。",
  "Back to the playground": "返回体验区",
  "Sign in with a real account at /auth/login to use this link.": "请在 /auth/login 使用真实账号登录后再使用此链接。",
  "Service unavailable": "服务不可用",
  "Try the link again in a moment.": "请稍后重试该链接。",
};

export function t(locale: Locale, en: string, params?: Record<string, string>): string {
  let s = locale === "zh" ? (ZH[en] ?? en) : en;
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(v);
  }
  return s;
}
