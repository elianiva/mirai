import { Runtime } from 'foldkit'
import { ApiRpc } from './app/chat/rpc.ts'
import { init, Message, Model, subscriptions, update, view } from './app/main.ts'
import './styles.css'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
  resources: ApiRpc.layer,
  devTools: { Message },
})

Runtime.run(application)
