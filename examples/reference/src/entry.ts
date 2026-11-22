import { Runtime } from 'foldkit'
import { ApiRpc } from './platform/rpc.ts'
import { init, Message, Model, update, view } from './query-example.ts'
import './styles.css'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  resources: ApiRpc.layer,
  container: document.getElementById('root'),
  devTools: { Message },
})

Runtime.run(application)
