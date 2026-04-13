/**
 * lib/docusign.ts
 * Server-only. Provides an authenticated DocuSign ApiClient using JWT Grant.
 * Token is cached in-process for its lifetime minus a 60-second safety buffer.
 */
import docusign from 'docusign-esign'

type CachedToken = { token: string; expiresAt: number }
let _cached: CachedToken | null = null

const BASE_URL = process.env.DOCUSIGN_BASE_URL ?? 'https://demo.docusign.net/restapi'

// Sandbox OAuth host vs production
const OAUTH_HOST = BASE_URL.includes('demo.docusign')
  ? 'account-d.docusign.com'
  : 'account.docusign.com'

export function getAccountId(): string {
  const id = process.env.DOCUSIGN_ACCOUNT_ID
  if (!id) throw new Error('DOCUSIGN_ACCOUNT_ID is not set')
  return id
}

export async function getDocuSignClient(): Promise<docusign.ApiClient> {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY
  const userId         = process.env.DOCUSIGN_USER_ID
  const rawKey         = process.env.DOCUSIGN_PRIVATE_KEY ?? ''

  if (!integrationKey) throw new Error('DOCUSIGN_INTEGRATION_KEY is not set')
  if (!userId)         throw new Error('DOCUSIGN_USER_ID is not set')
  if (!rawKey)         throw new Error('DOCUSIGN_PRIVATE_KEY is not set')

  const apiClient = new docusign.ApiClient()
  apiClient.setBasePath(BASE_URL)
  apiClient.setOAuthBasePath(OAUTH_HOST)

  const now = Date.now()
  if (!_cached || now >= _cached.expiresAt - 60_000) {
    // Normalize the private key regardless of how it was stored in .env:
    //   - Strip surrounding quotes that some .env editors add
    //   - Convert escaped \n sequences to real newlines
    //   - If the key is one long line (no newlines), reformat it into 64-char lines
    let privateKey = rawKey
      .replace(/^["']|["']$/g, '')   // strip leading/trailing quotes
      .replace(/\\n/g, '\n')          // escaped \n → real newline

    // If still no newlines (entire key is one line), wrap the base64 body at 64 chars
    if (!privateKey.includes('\n')) {
      const headerMatch = privateKey.match(/^(-----[^-]+-----)(.+)(-----[^-]+-----)$/)
      if (headerMatch) {
        const header = headerMatch[1]
        const body   = headerMatch[2]
        const footer = headerMatch[3]
        const wrapped = body.match(/.{1,64}/g)!.join('\n')
        privateKey = `${header}\n${wrapped}\n${footer}`
      }
    }

    // Validate the key looks like a PEM before sending
    if (!privateKey.includes('-----BEGIN')) {
      throw new Error(
        'DOCUSIGN_PRIVATE_KEY does not look like a PEM key. ' +
        'It must start with -----BEGIN RSA PRIVATE KEY----- (or PRIVATE KEY-----). ' +
        'In .env.local use escaped \\n between lines, e.g.: ' +
        '"-----BEGIN RSA PRIVATE KEY-----\\nMIIE...\\n-----END RSA PRIVATE KEY-----"'
      )
    }

    const result = await apiClient.requestJWTUserToken(
      integrationKey,
      userId,
      ['signature', 'impersonation'],
      Buffer.from(privateKey),
      3600, // token lifetime in seconds
    )

    _cached = {
      token:     result.body.access_token as string,
      expiresAt: now + (result.body.expires_in as number) * 1000,
    }
  }

  apiClient.addDefaultHeader('Authorization', `Bearer ${_cached!.token}`)
  return apiClient
}
