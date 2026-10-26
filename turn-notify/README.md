# turn-notify

A desktop notification when Claude finishes a turn that took 30 seconds or more, so you can work on something else meanwhile.

- On Windows: a Windows toast with its sound, titled with the turn's duration and showing the first line of Claude's answer.
- Elsewhere: the terminal's own notification (or its bell).
- Subagents and interrupted turns don't notify.
- `/notify-test` sends a test notification.
