import fs from 'node:fs'
import path from 'node:path'

export function updateShellConfig(
    apiKey: string,
    kingModel: string, // Opus
    queenModel: string, // Sonnet
    jackModel: string, // Haiku
    configPath: string,
    isActive: boolean = true
) {
    let content = ''
    if (fs.existsSync(configPath)) {
        content = fs.readFileSync(configPath, 'utf-8')
    }

    const startMarker = '# CCPowerCore Start'
    const endMarker = '# CCPowerCore End'

    const newBlock = `${startMarker}
export ANTHROPIC_BASE_URL="https://openrouter.ai/api"
export ANTHROPIC_AUTH_TOKEN="${apiKey}"
export ANTHROPIC_API_KEY=""
export ANTHROPIC_DEFAULT_OPUS_MODEL="${kingModel}"
export ANTHROPIC_DEFAULT_SONNET_MODEL="${queenModel}"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="${jackModel}"
${endMarker}`

    const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}\\n?`, 'g')

    if (isActive) {
        // ACTIVATE: Update or Append
        // Ensure separation from previous content 
        const prefix = (content && !content.endsWith('\n')) ? '\n' : '';

        if (regex.test(content)) {
            // Replace existing block
            content = content.replace(regex, `${newBlock}\n`)
        } else {
            // Append to end
            content += `${prefix}${newBlock}\n`
        }
    } else {
        // DEACTIVATE: Remove block if exists
        if (regex.test(content)) {
            content = content.replace(regex, '')
        }
    }

    // Ensure directory exists
    const dir = path.dirname(configPath)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(configPath, content, 'utf-8')
    return true
}
