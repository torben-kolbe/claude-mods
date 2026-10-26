import type { EngineInterface, Register } from 'claude-code'

// Turns shorter than this end without a notification.
const MIN_SECONDS = 30

// Shows a Windows toast; title and body come in through the environment, escaped for the XML.
const TOAST_SCRIPT = [
  '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null',
  '[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null',
  '$t = [Security.SecurityElement]::Escape($env:TURN_NOTIFY_TITLE)',
  '$b = [Security.SecurityElement]::Escape($env:TURN_NOTIFY_BODY)',
  '$xml = New-Object Windows.Data.Xml.Dom.XmlDocument',
  `$xml.LoadXml("<toast><visual><binding template='ToastGeneric'><text>$t</text><text>$b</text></binding></visual></toast>")`,
  '$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)',
  "[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe').Show($toast)",
].join('; ')

function firstLine(answer: string) {
  const line = answer.split('\n').map(l => l.replace(/[#*`>_]/g, '').trim()).find(Boolean) ?? 'Done.'

  return line.length > 120 ? `${line.slice(0, 117)}...` : line
}

async function notify($: EngineInterface, title: string, body: string) {
  // The terminal's own channel (a bell on Windows Terminal), then a real toast on Windows.
  await $.ui.notify(body, { title })
  if ((await $.env.get('OS')) !== 'Windows_NT') {
    return
  }
  await $.process.run(['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', TOAST_SCRIPT], {
    env: { TURN_NOTIFY_TITLE: title, TURN_NOTIFY_BODY: body },
    timeoutMs: 15000,
  })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'notify-test',
      description: 'Send a test notification from turn-notify',
    })

    return next(e)
  })

  on('command.run', { command: 'notify-test' }, async $ => {
    await notify($, 'Claude Code', 'turn-notify works.')

    return { text: 'Test notification sent.' }
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    const seconds = Math.round(e.durationMs / 1000)
    if (e.agentId === undefined && !e.isAborted && seconds >= MIN_SECONDS) {
      const title = e.reason === 'answer' ? `Claude is done (${seconds}s)` : `Claude stopped (${e.reason})`
      void notify($, title, firstLine(e.answer)).catch(() => undefined)
    }

    return done
  })
}
