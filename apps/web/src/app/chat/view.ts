import { Option } from 'effect'
import type { Document, HtmlBuilder } from 'foldkit/html'
import type { ThreadSummary } from '@mirai/rpc'
import { css, cx } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import { Message } from './message.ts'
import { Model } from './model.ts'

const sans = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'

const shell = css({
  display: 'grid',
  gridTemplateColumns: { base: '1fr', md: '260px minmax(0, 1fr)' },
  height: '100dvh',
  backgroundColor: token('colors.paper'),
  color: token('colors.ink'),
  fontFamily: sans,
})

const sidebar = css({
  display: { base: 'none', md: 'flex' },
  flexDirection: 'column',
  gap: '12px',
  minHeight: 0,
  padding: '16px',
  backgroundColor: token('colors.surface'),
  borderRightWidth: '1px',
  borderRightStyle: 'solid',
  borderRightColor: token('colors.line'),
})

const brand = css({
  fontSize: '16px',
  fontWeight: 600,
  letterSpacing: '-0.02em',
})

const newChat = css({
  width: '100%',
  padding: '8px 12px',
  borderWidth: 0,
  borderRadius: '8px',
  backgroundColor: token('colors.ink'),
  color: 'white',
  cursor: 'pointer',
  fontFamily: sans,
  fontSize: '13px',
  fontWeight: 500,
  textAlign: 'left',
  _hover: { backgroundColor: token('colors.accent') },
  _disabled: { opacity: 0.4, cursor: 'not-allowed' },
})

const newChatAuto = css({ width: 'auto' })

const threadList = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  minHeight: 0,
  marginTop: '4px',
  overflowY: 'auto',
})

const threadButton = css({
  width: '100%',
  padding: '7px 10px',
  borderWidth: 0,
  borderRadius: '6px',
  backgroundColor: 'transparent',
  color: token('colors.ink'),
  cursor: 'pointer',
  fontFamily: sans,
  fontSize: '13px',
  textAlign: 'left',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  _hover: { backgroundColor: token('colors.accentSoft') },
})

const threadActive = css({
  backgroundColor: token('colors.accentSoft'),
  color: token('colors.accent'),
})

const sidebarEmpty = css({
  margin: 0,
  padding: '6px 10px',
  color: token('colors.muted'),
  fontSize: '12px',
})

const main = css({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  height: '100dvh',
})

const topBar = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '12px 20px',
  backgroundColor: token('colors.surface'),
  borderBottomWidth: '1px',
  borderBottomStyle: 'solid',
  borderBottomColor: token('colors.line'),
})

const topHeading = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1px',
  minWidth: 0,
})

const topTitle = css({
  overflow: 'hidden',
  fontSize: '14px',
  fontWeight: 500,
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const topStatus = css({
  color: token('colors.muted'),
  fontSize: '11px',
})

const reconnect = css({
  padding: '5px 10px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: token('colors.line'),
  borderRadius: '6px',
  backgroundColor: token('colors.surface'),
  color: token('colors.ink'),
  cursor: 'pointer',
  fontFamily: sans,
  fontSize: '12px',
  _hover: { backgroundColor: token('colors.accentSoft') },
})

const mobileBar = css({
  display: { base: 'flex', md: 'none' },
  gap: '6px',
  padding: '8px 16px',
  overflowX: 'auto',
  backgroundColor: token('colors.surface'),
  borderBottomWidth: '1px',
  borderBottomStyle: 'solid',
  borderBottomColor: token('colors.line'),
})

const mobileNewChat = css({
  flexShrink: 0,
  padding: '5px 10px',
  borderWidth: 0,
  borderRadius: '6px',
  backgroundColor: token('colors.ink'),
  color: 'white',
  cursor: 'pointer',
  fontFamily: sans,
  fontSize: '12px',
})

const mobileChip = css({
  flexShrink: 0,
  maxWidth: '180px',
  padding: '5px 10px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: token('colors.line'),
  borderRadius: '6px',
  backgroundColor: token('colors.surface'),
  color: token('colors.ink'),
  cursor: 'pointer',
  fontFamily: sans,
  fontSize: '12px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const transcript = css({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minHeight: 0,
  padding: '20px',
  overflowY: 'auto',
})

const messageList = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  width: '100%',
  maxWidth: '820px',
  marginInline: 'auto',
  marginTop: 'auto',
})

const row = css({ display: 'flex', width: '100%' })
const rowUser = css({ justifyContent: 'flex-end' })
const rowAssistant = css({ justifyContent: 'flex-start' })

const bubble = css({
  maxWidth: '82%',
  padding: '9px 13px',
  borderRadius: '12px',
  fontSize: '14px',
  lineHeight: 1.55,
  overflowWrap: 'anywhere',
  whiteSpace: 'pre-wrap',
})

const bubbleUser = css({
  backgroundColor: token('colors.accent'),
  color: 'white',
  borderBottomRightRadius: '4px',
})

const bubbleAssistant = css({
  backgroundColor: token('colors.surface'),
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: token('colors.line'),
  borderBottomLeftRadius: '4px',
})

const thinking = css({ color: token('colors.muted'), fontStyle: 'italic' })

const emptyState = css({
  display: 'grid',
  placeItems: 'center',
  gap: '12px',
  height: '100%',
  padding: '24px',
  color: token('colors.muted'),
  textAlign: 'center',
})

const emptyTitle = css({
  margin: 0,
  color: token('colors.ink'),
  fontSize: '24px',
  fontWeight: 600,
  letterSpacing: '-0.03em',
})

const emptyText = css({ margin: 0, fontSize: '14px' })

const errorWrap = css({ padding: '0 20px 8px' })

const errorBanner = css({
  maxWidth: '820px',
  marginInline: 'auto',
  padding: '8px 12px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: token('colors.dangerLine'),
  borderRadius: '8px',
  backgroundColor: token('colors.dangerSoft'),
  color: token('colors.danger'),
  fontSize: '12px',
})

const composer = css({
  padding: '12px 20px 18px',
  backgroundColor: token('colors.surface'),
  borderTopWidth: '1px',
  borderTopStyle: 'solid',
  borderTopColor: token('colors.line'),
})

const composerInner = css({
  display: 'flex',
  alignItems: 'flex-end',
  gap: '8px',
  width: '100%',
  maxWidth: '820px',
  marginInline: 'auto',
})

const input = css({
  flex: 1,
  minHeight: '44px',
  maxHeight: '160px',
  padding: '11px 12px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: token('colors.line'),
  borderRadius: '10px',
  backgroundColor: token('colors.paper'),
  color: token('colors.ink'),
  fontFamily: sans,
  fontSize: '14px',
  lineHeight: 1.4,
  resize: 'none',
  outline: 'none',
  _placeholder: { color: token('colors.muted') },
  _focus: { borderColor: token('colors.accent') },
})

const send = css({
  height: '44px',
  padding: '0 18px',
  borderWidth: 0,
  borderRadius: '10px',
  backgroundColor: token('colors.accent'),
  color: 'white',
  cursor: 'pointer',
  fontFamily: sans,
  fontSize: '13px',
  fontWeight: 500,
  _disabled: { opacity: 0.4, cursor: 'not-allowed' },
})

const statusText = (model: Model): string => {
  if (model.activeThreadId === null) return 'Ready'
  if (!model.connected) return 'Reconnecting'
  if (model.status === 'loading') return 'Loading'
  if (model.status === 'thinking') return 'Thinking'
  if (model.status === 'streaming') return 'Streaming'
  if (model.status === 'error') return 'Error'
  return 'Ready'
}

const threadTitle = (model: Model): string =>
  model.threads.find((thread) => thread.id === model.activeThreadId)?.title ?? 'New chat'

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const title = threadTitle(model)
  const canSend = model.activeThreadId !== null && model.draft.trim() !== ''

  const threadButtonFor = (thread: ThreadSummary, mobile: boolean) =>
    h.button(
      [
        h.Class(
          cx(
            threadButton,
            mobile ? mobileChip : '',
            thread.id === model.activeThreadId ? threadActive : '',
          ),
        ),
        h.Type('button'),
        h.Title(thread.title),
        h.OnClick(Message.SelectedThread({ id: thread.id })),
      ],
      [thread.title],
    )

  const messages = model.messages.map((message) =>
    h.div(
      [
        h.Class(cx(row, message.role === 'user' ? rowUser : rowAssistant)),
        h.DataAttribute('role', message.role),
      ],
      [
        h.div(
          [h.Class(cx(bubble, message.role === 'user' ? bubbleUser : bubbleAssistant))],
          [message.text],
        ),
      ],
    ),
  )

  const live =
    model.live === null
      ? []
      : [
          h.div(
            [h.Class(cx(row, rowAssistant))],
            [h.div([h.Class(cx(bubble, bubbleAssistant))], [model.live])],
          ),
        ]

  const waiting =
    model.live === null && (model.status === 'thinking' || model.status === 'loading')
      ? [
          h.div(
            [h.Class(cx(row, rowAssistant))],
            [h.div([h.Class(cx(bubble, bubbleAssistant, thinking))], ['Thinking…'])],
          ),
        ]
      : []

  const empty =
    model.activeThreadId === null
      ? h.div(
          [h.Class(emptyState)],
          [
            h.h1([h.Class(emptyTitle)], ['Mirai']),
            h.p([h.Class(emptyText)], ['A small chat with a durable memory.']),
            h.button(
              [
                h.Class(cx(newChat, newChatAuto)),
                h.Type('button'),
                h.OnClick(Message.NewThreadClicked()),
                h.Disabled(model.status === 'loading'),
              ],
              ['New chat'],
            ),
          ],
        )
      : model.messages.length === 0 && model.live === null
        ? h.div([h.Class(emptyState)], [h.p([h.Class(emptyText)], ['Say something to start.'])])
        : null

  return {
    title: model.activeThreadId === null ? 'Mirai' : `${title} · Mirai`,
    body: h.div(
      [h.Class(shell)],
      [
        h.aside(
          [h.Class(sidebar)],
          [
            h.div([h.Class(brand)], ['Mirai']),
            h.button(
              [
                h.Class(newChat),
                h.Type('button'),
                h.OnClick(Message.NewThreadClicked()),
                h.Disabled(model.status === 'loading'),
              ],
              ['New chat'],
            ),
            h.div(
              [h.Class(threadList)],
              model.threads.length === 0
                ? [h.p([h.Class(sidebarEmpty)], ['No chats yet.'])]
                : model.threads.map((thread) => threadButtonFor(thread, false)),
            ),
          ],
        ),
        h.div(
          [h.Class(main)],
          [
            h.header(
              [h.Class(topBar)],
              [
                h.div(
                  [h.Class(topHeading)],
                  [
                    h.span([h.Class(topTitle)], [title]),
                    h.span(
                      [h.Class(topStatus), h.Role('status'), h.AriaLive('polite')],
                      [statusText(model)],
                    ),
                  ],
                ),
                model.activeThreadId !== null && !model.connected
                  ? h.button(
                      [h.Class(reconnect), h.Type('button'), h.OnClick(Message.Reconnect())],
                      ['Reconnect'],
                    )
                  : null,
              ],
            ),
            h.div(
              [h.Class(mobileBar)],
              [
                h.button(
                  [
                    h.Class(mobileNewChat),
                    h.Type('button'),
                    h.OnClick(Message.NewThreadClicked()),
                    h.Disabled(model.status === 'loading'),
                  ],
                  ['New'],
                ),
                ...model.threads.map((thread) => threadButtonFor(thread, true)),
              ],
            ),
            h.div(
              [h.Class(transcript)],
              [empty ?? h.div([h.Class(messageList)], [...messages, ...live, ...waiting])],
            ),
            model.error === null
              ? null
              : h.div(
                  [h.Class(errorWrap)],
                  [
                    h.div(
                      [h.Class(errorBanner), h.Role('status'), h.AriaLive('polite')],
                      [model.error],
                    ),
                  ],
                ),
            h.form(
              [h.Class(composer), h.OnSubmit(Message.Submitted())],
              [
                h.div(
                  [h.Class(composerInner)],
                  [
                    h.textarea([
                      h.Class(input),
                      h.Value(model.draft),
                      h.Placeholder(
                        model.activeThreadId === null ? 'Start a chat first.' : 'Message Mirai',
                      ),
                      h.Rows(2),
                      h.OnInput((value) => Message.DraftChanged({ value })),
                      h.OnKeyDownPreventDefault((key, modifiers) =>
                        key === 'Enter' && !modifiers.shiftKey && canSend
                          ? Option.some(Message.Submitted())
                          : Option.none(),
                      ),
                    ]),
                    h.button([h.Class(send), h.Type('submit'), h.Disabled(!canSend)], ['Send']),
                  ],
                ),
              ],
            ),
          ],
        ),
      ],
    ),
  }
}
