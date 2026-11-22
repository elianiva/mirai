import { Runtime } from 'foldkit'
import { init, Message, Model, update, view } from './app/main.ts'
import './styles.css'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: { Message },
})

Runtime.run(application)
